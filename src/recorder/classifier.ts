import type { Page } from 'playwright';
import type { NodeType } from '../models/types';
import { Config } from '../config/schema';

export async function classifyTransition(
  page: Page,
  previousUrl: string,
  config: Config
): Promise<{ type: NodeType; selector?: string }> {
  const currentUrl = page.url();
  
  if (currentUrl !== previousUrl) {
    return { type: 'navigation' };
  }

  // Check for modals
  for (const selector of config.modal_rules.selectors) {
    // A simplified check: is there a modal matching the selector that is visible?
    const modals = await page.locator(selector).all();
    for (const modal of modals) {
      if (await modal.isVisible()) {
        return { type: 'modal', selector };
      }
    }
  }

  return { type: 'sin_efecto' };
}
