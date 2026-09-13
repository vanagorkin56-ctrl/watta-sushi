import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = 'screenshots';

await mkdir(`${output}/categories`, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});

await context.addInitScript(() => {
  localStorage.setItem('watta-language', 'en');
  localStorage.removeItem('watta-cart');
});

const page = await context.newPage();
page.on('pageerror', error => console.error(`Browser error: ${error.message}`));

async function open(path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('*').forEach(element => {
      if (element instanceof HTMLElement) element.style.animationDelay = '0s';
    });
  });
}

async function shot(path, fullPage = false) {
  await page.waitForTimeout(350);
  await page.screenshot({ path, type: 'jpeg', quality: 88, fullPage });
  console.log(path);
}

await open('/');
await shot(`${output}/01-home.jpg`);

await open('/menu');
await shot(`${output}/02-menu-overview.jpg`);
await page.locator('.language-trigger').click();
await page.locator('.language-popup').waitFor();
await shot(`${output}/03-language-selector.jpg`);
await page.keyboard.press('Escape');

const categories = [
  [1, 'rolls'],
  [2, 'sushi'],
  [3, 'sets'],
  [4, 'soups'],
  [5, 'poke-bowls'],
  [6, 'sides'],
  [7, 'drinks'],
  [8, 'sauces'],
  [35, 'desserts'],
];

for (const [id, slug] of categories) {
  await page.evaluate(categoryId => {
    const section = document.querySelector(`#category-${categoryId}`);
    if (section instanceof HTMLElement) window.scrollTo(0, section.offsetTop - 165);
  }, id);
  await page.waitForTimeout(650);
  await shot(`${output}/categories/${String(id).padStart(2, '0')}-${slug}.jpg`);
}

await open('/delivery');
await shot(`${output}/04-delivery-and-payment.jpg`, true);

await open('/contacts');
await shot(`${output}/05-contacts.jpg`, true);

await open('/menu');
await page.locator('#category-3').scrollIntoViewIfNeeded();
await page.locator('#category-3 .add-button').first().click();
await page.locator('.cart-button').click();
await page.getByRole('dialog').waitFor();
await shot(`${output}/06-cart.jpg`);
await page.getByRole('link', { name: 'Checkout', exact: true }).click();
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: 'Pickup', exact: true }).click();
await shot(`${output}/07-checkout.jpg`, true);

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${baseUrl}/menu`, { waitUntil: 'networkidle' });
await mobile.screenshot({ path: `${output}/08-mobile-menu.jpg`, type: 'jpeg', quality: 88 });
console.log(`${output}/08-mobile-menu.jpg`);

await browser.close();
