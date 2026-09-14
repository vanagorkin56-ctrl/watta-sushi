import {expect,test,type Page} from '@playwright/test';

const cart=JSON.stringify([{productId:21,quantity:2}]);

async function useEnglish(page:Page){
 await page.addInitScript(()=>{if(!localStorage.getItem('watta-language'))localStorage.setItem('watta-language','en');});
}

test('menu controls, navigation, search and language switch are functional',async({page})=>{
 await useEnglish(page);
 const errors:string[]=[];
 const consoleErrors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 await page.goto('/menu');

 await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/brand/mascot.png');
 await expect(page.locator('.product-card')).toHaveCount(83);
 await expect(page.locator('.category-sidebar nav button')).toHaveCount(9);
 await expect(page.getByRole('button',{name:/Sauces|Sauzen|Соуси/})).toHaveCount(0);

 for(const button of await page.locator('.category-sidebar nav button').all()){
  await expect(button).toBeEnabled();
  await button.click();
 }

 const search=page.getByRole('textbox',{name:'Find your favourite sushi...'});
 await search.fill('Philadelphia with shrimp');
 await expect(page.locator('.product-card')).toHaveCount(3);
 await expect(page.getByRole('button',{name:'Add to basket Philadelphia with shrimp'})).toBeVisible();
 await page.getByRole('button',{name:'Close'}).click();
 await expect(page.locator('.product-card')).toHaveCount(83);

 await page.getByRole('combobox',{name:'Language / Taal / Мова'}).click();
 await page.getByRole('option',{name:'Українська'}).click();
 await expect(page.getByRole('heading',{name:'Чого вам хочеться?'})).toBeVisible();
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','uk');

 for(const href of ['/','/menu','/delivery','/contacts','/privacy']){
  const response=await page.request.get(href);
  expect(response.ok(),`${href} should open successfully`).toBeTruthy();
 }
 for(const link of await page.locator('a[href^="http"]').all()){
  await expect(link).toHaveAttribute('target','_blank');
  await expect(link).toHaveAttribute('rel',/noopener|noreferrer/);
 }
 expect(errors).toEqual([]);
 expect(consoleErrors).toEqual([]);
});

test('every product can be added and removed from the cart',async({page})=>{
 await useEnglish(page);
 await page.goto('/menu');
 const addButtons=page.locator('.product-card .add-button');
 await expect(addButtons).toHaveCount(83);
 for(const button of await addButtons.all()){
  await expect(button).toBeEnabled();
  await button.click();
 }
 await expect(page.locator('.cart-count').first()).toHaveText('83');
 await page.getByRole('button',{name:'Your basket: 83'}).click();
 const removeButtons=page.getByRole('button',{name:/^Remove /});
 await expect(removeButtons).toHaveCount(83);
 while(await removeButtons.count())await removeButtons.first().click();
 await expect(page.locator('.cart-count').first()).toHaveText('0');
 await expect(page.locator('.empty-cart h3')).toBeVisible();
});

test('delivery quote, stale-address protection and pickup checkout work',async({page})=>{
 await useEnglish(page);
 const checkoutPayloads:Record<string,any>[]=[];
 await page.route('**/api/delivery-quote',async route=>{
  const payload=route.request().postDataJSON();
  if(payload.street==='Unknown 1')return route.fulfill({status:400,json:{error:'invalidArea'}});
  return route.fulfill({json:{distanceMeters:4200,deliveryFee:336,formattedAddress:'Damrak 1, 1012 LG Amsterdam',quoteId:'00000000-0000-4000-8000-000000000001',expiresAt:Date.now()+900_000}});
 });
 await page.route('**/api/checkout',async route=>{
  checkoutPayloads.push(route.request().postDataJSON());
  const id=String(checkoutPayloads.length).padStart(16,'a');
  await route.fulfill({json:{url:`/success?session_id=cs_test_${id}`}});
 });
 await page.route('**/api/orders/status?**',route=>route.fulfill({json:{number:'E2E00001',status:'paid',total:3536}}));
 await page.addInitScript(value=>localStorage.setItem('watta-cart',value),cart);
 await page.goto('/checkout');

 const pay=page.getByRole('button',{name:'Continue to payment'});
 await expect(pay).toBeDisabled();
 await page.getByLabel('Full name').fill('Test Customer');
 await page.getByLabel('Email address').fill('customer@example.test');
 await page.getByLabel('Phone number').fill('+31600000000');
 await page.getByLabel('Street and house number').fill('Unknown 1');
 await page.getByLabel('Postcode').fill('1012 LG');
 await page.getByRole('button',{name:'Calculate delivery'}).click();
 await expect(page.locator('p[role="alert"]')).toContainText('outside our configured Amsterdam delivery area');

 await page.getByLabel('Street and house number').fill('Damrak 1');
 await page.getByRole('button',{name:'Calculate delivery'}).click();
 await expect(page.getByText('Road distance: 4.20 km',{exact:false})).toBeVisible();
 await expect(page.getByText('€35.36',{exact:true})).toBeVisible();
 await page.getByLabel('Street and house number').fill('Damrak 2');
 await expect(page.getByText('Road distance: 4.20 km',{exact:false})).toHaveCount(0);
 await expect(pay).toBeDisabled();
 await page.getByRole('button',{name:'Calculate delivery'}).click();
 await page.getByRole('checkbox').check();
 await expect(pay).toBeEnabled();
 await pay.click();
 await expect(page).toHaveURL(/\/success\?session_id=/);
 await expect(page.getByRole('heading',{name:'Thanks for your order!'})).toBeVisible();
 expect(checkoutPayloads[0].quoteId).toBe('00000000-0000-4000-8000-000000000001');
 expect(checkoutPayloads[0].customer.fulfillment).toBe('delivery');
 await expect(page.locator('.cart-count').first()).toHaveText('0');

 await page.evaluate(value=>localStorage.setItem('watta-cart',value),cart);
 await page.goto('/checkout');
 await page.getByLabel('Full name').fill('Pickup Customer');
 await page.getByLabel('Email address').fill('pickup@example.test');
 await page.getByLabel('Phone number').fill('+31600000001');
 await page.getByRole('button',{name:'Pickup'}).click();
 await expect(page.getByText('Helicopterstraat 20',{exact:true})).toBeVisible();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Continue to payment'}).click();
 await expect(page).toHaveURL(/\/success\?session_id=/);
 expect(checkoutPayloads[1].customer.fulfillment).toBe('pickup');
 expect(checkoutPayloads[1].quoteId).toBeUndefined();
});
