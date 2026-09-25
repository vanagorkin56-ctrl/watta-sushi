import {defineConfig,devices} from '@playwright/test';

const port=3100;
const baseURL=process.env.PLAYWRIGHT_BASE_URL||`http://127.0.0.1:${port}`;

export default defineConfig({
 testDir:'./tests/e2e',
 fullyParallel:false,
 workers:1,
 retries:process.env.CI?1:0,
 reporter:process.env.CI?'github':'line',
 use:{...devices['Desktop Chrome'],baseURL,trace:'retain-on-failure',screenshot:'only-on-failure',
  launchOptions:process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{},
 },
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{
  command:`npm run start -- --port ${port}`,
  url:baseURL,
  reuseExistingServer:!process.env.CI,
  timeout:120_000,
  env:{
   ...process.env,
   APP_URL:'https://watta.test',
   STRIPE_SECRET_KEY:'sk_test_playwright',
   STRIPE_WEBHOOK_SECRET:'whsec_playwright',
   SMTP_HOST:'127.0.0.1',
   SMTP_FROM:'playwright@example.test',
   MAPBOX_ACCESS_TOKEN:'playwright',
   DELIVERY_QUOTE_SECRET:'playwright-quote-secret-at-least-32-characters',
   DATABASE_PATH:'/tmp/watta-playwright.sqlite',
  },
 },
});
