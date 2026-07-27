import { test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { Logger } from '../../src/recorder/logger';
import crypto from 'node:crypto';

function generateId(url: string, stepName: string): string {
  return crypto.createHash('md5').update(`${url}|${stepName}`).digest('hex');
}

let browser: Browser;
let page: Page;
let logger: Logger;

beforeAll(async () => {
  browser = await chromium.launch({ headless: false, args: ['--window-size=1920,1080'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  page = await context.newPage();
  logger = new Logger('http://localhost:3000', './output/generated-flow.json');
});

afterAll(async () => {
  await logger.save();
  await browser.close();
});

test('unauthenticated', async () => {
  // --- Navigation Start ---
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  {
    const stepId = generateId(page.url(), 'manual_start');
    const screenshotPath = `./output/screenshots/${stepId}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logger.addNode({
      id: stepId,
      type: 'navigation',
      url: page.url(),
      parent_id: null,
      trigger: { text: 'Flow Start', selector: 'manual_start' },
      screenshot_path: screenshotPath,
      depth: 0,
      visited_at: new Date().toISOString()
    });
  }

});