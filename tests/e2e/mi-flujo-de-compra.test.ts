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

async function recordStep(type: 'navigation' | 'modal' | 'loading', url: string | null, parentId: string | null, text: string, selector: string, depth: number) {
  const stepId = generateId(page.url(), selector);
  const screenshotPath = `./output/screenshots/${stepId}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logger.addNode({
    id: stepId,
    type,
    url: type === 'modal' ? null : page.url(),
    parent_id: parentId,
    trigger: { text, selector },
    screenshot_path: screenshotPath,
    depth,
    visited_at: new Date().toISOString()
  });
  return stepId;
}

test('mi-flujo-de-compra', async () => {
  let lastStepId: string | null = null;

  // --- Navigation Start ---
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  lastStepId = await recordStep('navigation', page.url(), null, 'Flow Start', 'manual_start', 0);

  // --- Click: Iniciar Sesión ---
  await page.click('a.text-xs.font-semibold.text-on-surface-variant.transition-colors');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, 'Iniciar Sesión', 'a.text-xs.font-semibold.text-on-surface-variant.transition-colors', 1);

  // --- Click: Iniciar Sesión ---
  await page.click('a.text-xs.font-semibold.text-on-surface-variant.transition-colors');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('modal', page.url(), lastStepId, 'Iniciar Sesión', 'a.text-xs.font-semibold.text-on-surface-variant.transition-colors', 1);

  // --- Click: ¿Olvidaste tu contraseña? ---
  await page.click('a.text-xs.font-bold.text-primary.hidden');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, '¿Olvidaste tu contraseña?', 'a.text-xs.font-bold.text-primary.hidden', 2);

  // --- Click: ¿Olvidaste tu contraseña? ---
  await page.click('a.text-xs.font-bold.text-primary.hidden');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('modal', page.url(), lastStepId, '¿Olvidaste tu contraseña?', 'a.text-xs.font-bold.text-primary.hidden', 2);

  // --- Click: Registrate acá ---
  await page.click('a.text-sm.font-bold.text-primary');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('loading', page.url(), lastStepId, 'Registrate acá', 'a.text-sm.font-bold.text-primary', 3);

  // --- Click: Registrate acá ---
  await page.click('a.text-sm.font-bold.text-primary');
  await page.waitForTimeout(1500);
  lastStepId = await recordStep('modal', page.url(), lastStepId, 'Registrate acá', 'a.text-sm.font-bold.text-primary', 3);

});