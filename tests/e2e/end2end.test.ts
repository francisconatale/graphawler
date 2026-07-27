import { test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { Logger } from '../../src/recorder/logger';
import { generateHtmlReport } from '../../src/reporter/html_generator';
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
  logger = new Logger('http://localhost:3000', './output/end2end.json');
});

afterAll(async () => {
  await logger.save();
  await generateHtmlReport(logger.getResult(), './output/end2end_report.html');
  await browser.close();
});

async function recordStep(type: 'navigation' | 'modal' | 'loading', url: string | null, parentId: string | null, text: string, selector: string, depth: number, apiCalls?: any[]) {
  const stepId = generateId(page.url(), selector);
  const screenshotPath = `./output/screenshots/${stepId}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logger.addNode({
    id: stepId,
    type,
    url: type === 'modal' ? null : page.url(),
    parent_id: parentId,
    trigger: { text, selector, api_calls: apiCalls },
    screenshot_path: screenshotPath,
    depth,
    visited_at: new Date().toISOString()
  });
  return stepId;
}

test('end2end', async () => {
  let lastStepId: string | null = null;

  // --- Navigation Start ---
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  lastStepId = await recordStep('navigation', page.url(), null, 'Flow Start', 'manual_start', 0, undefined);

  // --- Assertion Manual ---
  const counter_initial = await page.locator('[data-testid="counter-value"]').textContent();
  expect(counter_initial).toContain('0');

  // --- Click: Incrementar Contador ---
  await page.click('[data-testid="increment-btn"]');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('modal', page.url(), lastStepId, 'Incrementar Contador', '[data-testid="increment-btn"]', 1, undefined);

  // --- Assertion Manual ---
  const counter_final = await page.locator('[data-testid="counter-value"]').textContent();
  expect(counter_final).toContain('1');

}, 120000);