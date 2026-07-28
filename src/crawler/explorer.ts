import { PlaywrightCrawler, enqueueLinks } from 'crawlee';
import { Config } from '../config/schema';
import { Logger } from '../recorder/logger';
import { takeSnapshot, waitForStabilization } from '../recorder/snapshot';
import { classifyTransition } from '../recorder/classifier';
import { closeModal } from './modal_handler';
import { injectOverlay } from './inject-overlay';
import crypto from 'node:crypto';
import * as readline from 'node:readline/promises';

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if (parsed.pathname.endsWith('/index.html')) {
      parsed.pathname = parsed.pathname.replace(/\/index\.html$/, '/');
    }
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function generateId(url: string, triggerSelector?: string): string {
  const normUrl = normalizeUrl(url);
  const data = triggerSelector ? `${normUrl}|${triggerSelector}` : normUrl;
  return crypto.createHash('md5').update(data).digest('hex');
}

export async function runExplorer(config: Config, logger: Logger, manualLogin = false) {
  const crawler = new PlaywrightCrawler({
    headless: !manualLogin,
    maxRequestsPerCrawl: 50,
    maxCrawlDepth: config.navigation_rules.max_depth,
    maxRequestRetries: 2,
    navigationTimeoutSecs: 30,
    launchContext: {
      launchOptions: {
        args: ['--window-size=1920,1080']
      }
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        if (config.inspect) {
          await injectOverlay(page);
        }
      }
    ],
    
    async requestHandler({ request, page, enqueueLinks: crawleeEnqueue, log }) {
      const depth = request.userData.depth || 0;
      const parentId = request.userData.parent_id || null;
      const trigger = request.userData.trigger || null;
      const nodeId = generateId(request.url, trigger?.selector);

      if (logger.hasNode(nodeId)) {
        log.info(`Skipping already visited node: ${request.url}`);
        return;
      }

      log.info(`Visiting: ${request.url} at depth ${depth}`);

      if (manualLogin && depth === 0) {
        log.info('--- MANUAL LOGIN MODE ---');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await rl.question('Please perform any manual actions (e.g. login) in the browser, then press Enter to continue...');
        rl.close();
      }

      await waitForStabilization(page);
      
      const screenshotPath = await takeSnapshot(
        page, 
        config.output.screenshots_dir, 
        nodeId
      );

      logger.addNode({
        id: nodeId,
        type: 'navigation',
        url: request.url,
        parent_id: parentId,
        trigger,
        screenshot_path: screenshotPath,
        depth,
        visited_at: new Date().toISOString()
      });

      // Handle interactive elements that might trigger modals
      const interactableSelectors = config.navigation_rules.include_selectors
        .filter(sel => sel !== 'a[href]')
        .join(', ');

      if (interactableSelectors) {
        const interactablesCount = await page.locator(interactableSelectors).count();
        
        for (let i = 0; i < Math.min(interactablesCount, 20); i++) {
          try {
            const el = page.locator(interactableSelectors).nth(i);
            if (await el.isVisible()) {
              const previousUrl = page.url();
              const triggerSelector = `${interactableSelectors}:nth-child(${i})`;
              
              // Try to click
              await el.click({ timeout: 3000 }).catch(() => {});
              await waitForStabilization(page);
              
              const transition = await classifyTransition(page, previousUrl, config);
              
              if (transition.type === 'modal') {
                const modalId = generateId(request.url, triggerSelector);
                
                if (logger.hasNode(modalId)) {
                  await closeModal(page, config);
                  continue;
                }

                const modalScreenshot = await takeSnapshot(page, config.output.screenshots_dir, modalId);
                
                const closedVia = await closeModal(page, config);
                
                logger.addNode({
                  id: modalId,
                  type: 'modal',
                  url: null,
                  parent_id: nodeId,
                  trigger: {
                    text: await el.textContent().catch(() => 'Unknown') || 'Unknown',
                    selector: triggerSelector
                  },
                  screenshot_path: modalScreenshot,
                  closes_via: closedVia ? [closedVia] : [],
                  depth: depth + 1,
                  visited_at: new Date().toISOString()
                });
              } else if (transition.type === 'navigation') {
                // Page navigated. We should let crawlee know if it's a new URL, but for now we just go back.
                await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
                await waitForStabilization(page);
              }
            }
          } catch (error) {
            log.debug(`Error interacting with element ${i}: ${error}`);
          }
        }
      }

      // Enqueue links found on this page via hrefs
      if (depth < config.navigation_rules.max_depth) {
        await crawleeEnqueue({
          selector: 'a[href]', // Focus specifically on links
          strategy: config.target.same_domain_only ? 'same-domain' : 'all',
          userData: {
            depth: depth + 1,
            parent_id: nodeId
          },
        });
      }
    },
  });

  await crawler.run([config.target.base_url]);
  await logger.save();
}
