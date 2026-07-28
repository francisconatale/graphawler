import { chromium } from 'playwright';
import { injectOverlay } from './inject-overlay';

export async function runInspector(url: string) {
  console.log(`Starting inspector mode for ${url}...`);
  console.log('Close the browser window to exit.');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[INSPECTOR]')) {
      console.log(text);
    } else if (msg.type() === 'error') {
      console.error('[BROWSER ERROR]', text);
    }
  });

  page.on('pageerror', err => {
    console.error('[PAGE EXCEPTION]', err.message);
  });

  await injectOverlay(page);
  await page.goto(url);

  await new Promise<void>((resolve) => {
    browser.on('disconnected', () => resolve());
  });
}
