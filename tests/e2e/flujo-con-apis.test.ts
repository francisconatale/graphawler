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
  logger = new Logger('http://localhost:3000', './output/flujo-con-apis.json');
});

afterAll(async () => {
  await logger.save();
  await generateHtmlReport(logger.getResult(), './output/flujo-con-apis_report.html');
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

test('flujo-con-apis', async () => {
  let lastStepId: string | null = null;

  // --- Navigation Start ---
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  lastStepId = await recordStep('navigation', page.url(), null, 'Flow Start', 'manual_start', 0, undefined);

  // --- Click: Iniciar Sesión ---
  await page.click('a.text-xs.font-semibold.text-on-surface-variant.transition-colors');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, 'Iniciar Sesión', 'a.text-xs.font-semibold.text-on-surface-variant.transition-colors', 1, undefined);

  // --- Click: ¿Olvidaste tu contraseña? ---
  await page.click('a.text-xs.font-bold.text-primary.hidden');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, '¿Olvidaste tu contraseña?', 'a.text-xs.font-bold.text-primary.hidden', 1, undefined);

  // --- Click: Click ---
  await page.click('input.w-full.bg-on-surface/5.border.border-outline-variant/20.rounded-2xl.pl-12.pr-6.py-4.text-base.font-semibold.text-on-surface.outline-none.transition-colors');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('modal', page.url(), lastStepId, 'Click', 'input.w-full.bg-on-surface/5.border.border-outline-variant/20.rounded-2xl.pl-12.pr-6.py-4.text-base.font-semibold.text-on-surface.outline-none.transition-colors', 1, undefined);

  // --- Click: Enviar correo de recuperación ---
  await page.click('button.w-full.py-4.rounded-2xl.bg-primary.text-white.font-bold.text-sm.shadow-lg.shadow-primary/25.transition-transform.flex.items-center.justify-center.gap-3');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, 'Enviar correo de recuperación', 'button.w-full.py-4.rounded-2xl.bg-primary.text-white.font-bold.text-sm.shadow-lg.shadow-primary/25.transition-transform.flex.items-center.justify-center.gap-3', 2, undefined);

  // --- Click: Registrate acá ---
  await page.click('a.text-sm.font-bold.text-primary');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, 'Registrate acá', 'a.text-sm.font-bold.text-primary', 2, undefined);

  // --- Click: Registrate acá ---
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('http://localhost:3000/register') && res.status() === 200),
    page.click('a.text-sm.font-bold.text-primary')
  ]);
  expect(response.ok()).toBeTruthy();
  lastStepId = await recordStep('modal', page.url(), lastStepId, 'Registrate acá', 'a.text-sm.font-bold.text-primary', 2, [{"method":"GET","url":"http://localhost:3000/register?_rsc=YUQMU60-FXRHYOgF","status":200}]);

}, 120000);