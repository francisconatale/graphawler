import type { Page } from 'playwright';
import { Config } from '../config/schema';

export async function closeModal(page: Page, config: Config): Promise<string | undefined> {
  for (const strategy of config.modal_rules.close_strategies) {
    try {
      if (strategy === 'Escape') {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500); // Wait for animation
        return 'Escape';
      } else if (strategy === 'backdrop_click') {
        // Fallback or rough strategy for backdrop click:
        // Try clicking at coordinate 0,0 or finding the topmost element that is not the modal
        await page.mouse.click(5, 5);
        await page.waitForTimeout(500);
        return 'backdrop_click';
      } else {
        // Selector strategy
        const btn = page.locator(strategy).first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(500);
          return strategy;
        }
      }
    } catch (e) {
      // Ignore and try the next strategy
    }
  }
  return undefined;
}
