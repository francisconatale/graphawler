import type { Page } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function takeSnapshot(
  page: Page,
  screenshotsDir: string,
  nodeId: string
): Promise<string> {
  const fileName = `${nodeId}.png`;
  const filePath = path.join(screenshotsDir, fileName);

  await fs.mkdir(screenshotsDir, { recursive: true });
  await page.screenshot({ path: filePath });

  return filePath;
}

export async function waitForStabilization(page: Page): Promise<void> {
  // Simple heuristic: wait for network idle or timeout
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  // Brief pause for animations
  await page.waitForTimeout(500);
}
