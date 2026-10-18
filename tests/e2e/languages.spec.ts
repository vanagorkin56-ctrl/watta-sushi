import {test,expect} from '@playwright/test';
import {copy} from '../../lib/copy';
import {products} from '../../lib/catalog';

for(const width of [1280,390]){
 test(`all pages and checkout controls switch language at ${width}px`,async({page})=>{
  test.setTimeout(120_000);
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('watta-cart',JSON.stringify([{productId:21,quantity:2}])));
  for(const path of ['/','/menu','/delivery','/contacts','/privacy','/checkout','/success','/missing-page']){
   await page.goto(path);
   for(const [locale,label] of [['en','English'],['nl','Nederlands'],['uk','Українська']] as const){
    const t=copy(locale);
    await page.getByRole('combobox',{name:'Language / Taal / Мова'}).click();
    await page.getByRole('option',{name:label,exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    const expected=path==='/'?t.heroTop:path==='/menu'?t.menuTitle:path==='/delivery'?t.deliveryTitle:path==='/contacts'?t.contactTitle:path==='/privacy'?t.privacyTitle:path==='/checkout'?t.checkoutTitle:path==='/success'?t.waitingTitle:t.pageNotFound;
    await expect(page.locator('main')).toContainText(expected);
    await expect(page.locator('footer')).toContainText(t.location);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path+' '+locale).toBe(true);
    if(path==='/menu'){
     await expect(page.locator('.product-card')).toHaveCount(products.length);
     for(const product of products)await expect(page.locator('.product-card h3').filter({hasText:product.name[locale]}).first()).toBeAttached();
    }
    if(path==='/checkout'){
     await page.getByRole('combobox',{name:`${t.phone}: ${t.countryCode}`,exact:true}).click();
     await expect(page.locator('.phone-country-heading')).toHaveText(t.phoneCountries);
     await page.getByRole('option').first().focus();
     await page.keyboard.press('Escape');
     await expect(page.locator('.phone-country-popup')).toBeHidden();
     await page.getByRole('button',{name:t.pickup,exact:true}).click();
     await expect(page.locator('.form-panel')).toContainText(t.pickupFree);
    }
   }
   await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','uk');
  }
  expect(errors).toEqual([]);
 });
}
