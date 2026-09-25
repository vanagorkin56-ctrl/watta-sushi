import {test,expect} from '@playwright/test';

test('favourites toggle in every category, persist and have a useful empty state',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('watta-language'))localStorage.setItem('watta-language','en');});
 await page.goto('/menu');
 await page.locator('.filter-tabs').getByRole('button',{name:'Favourites',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'No favourites yet'})).toBeVisible();
 await expect(page.locator('.product-card')).toHaveCount(0);
 await page.locator('.empty-category').getByRole('button',{name:'All',exact:true}).click();
 const sections=page.locator('.category-section');
 const count=await sections.count();
 expect(count).toBe(8);
 for(const section of await sections.all())await section.locator('.favourite-toggle').first().click();
 await page.reload();
 await expect(page.locator('.favourite-toggle[aria-pressed=true]')).toHaveCount(count);
 await page.locator('.filter-tabs').getByRole('button',{name:'Favourites',exact:true}).click();
 await expect(page.locator('.product-card')).toHaveCount(count);
 await expect(page.locator('.category-section')).toHaveCount(count);
 await page.getByRole('textbox',{name:'Find your favourite sushi...'}).fill('no-matching-sushi');
 await expect(page.getByText('No dishes found. Try a different search.')).toBeVisible();
 await page.locator('.search-input button').click();
 await expect(page.locator('.product-card')).toHaveCount(count);
 for(let index=0;index<count;index++)await page.locator('.favourite-toggle').first().click();
 await expect(page.getByText('No favourites yet. Tap a heart to save a dish.')).toBeVisible();
 await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('favourites')||'[]'))).toEqual([]);
});

test('malformed favourites storage does not break the basket or catalog',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('favourites','broken JSON'));
 await page.goto('/menu');
 await expect(page.locator('.product-card')).toHaveCount(83);
 await expect(page.locator('.favourite-toggle[aria-pressed=true]')).toHaveCount(0);
});
