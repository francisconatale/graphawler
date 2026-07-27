import { chromium } from 'playwright';
import { Config } from '../config/schema';
import { Logger } from '../recorder/logger';
import { takeSnapshot } from '../recorder/snapshot';
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

export async function runManualExplorer(config: Config, logger: Logger, testName?: string) {
  console.log('Starting manual exploration flow...');
  
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1920,1080'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  let currentDepth = 0;
  let previousNodeId: string | null = null;
  let actionTimeout: NodeJS.Timeout | null = null;
  let lastActionTrigger: any = null;
  let isCapturing = false;
  let activeRequests = 0;
  let domIsLoading = false;
  let hasCapturedLoadingForCurrentAction = false;
  let pendingApiCalls: { method: string; url: string; status: number }[] = [];

  let recordingEnabled = false;
  const generatedTestLines: string[] = [];

  function initTestGeneration() {
    generatedTestLines.push(`import { test, expect, beforeAll, afterAll } from 'vitest';`);
    generatedTestLines.push(`import { chromium, Browser, Page } from 'playwright';`);
    generatedTestLines.push(`import { Logger } from '../../src/recorder/logger';`);
    generatedTestLines.push(`import { generateHtmlReport } from '../../src/reporter/html_generator';`);
    generatedTestLines.push(`import crypto from 'node:crypto';\n`);
    generatedTestLines.push(`function generateId(url: string, stepName: string): string {`);
    generatedTestLines.push(`  return crypto.createHash('md5').update(\`\${url}|\${stepName}\`).digest('hex');`);
    generatedTestLines.push(`}\n`);
    generatedTestLines.push(`let browser: Browser;`);
    generatedTestLines.push(`let page: Page;`);
    generatedTestLines.push(`let logger: Logger;\n`);
    generatedTestLines.push(`beforeAll(async () => {`);
    generatedTestLines.push(`  browser = await chromium.launch({ headless: false, args: ['--window-size=1920,1080'] });`);
    generatedTestLines.push(`  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });`);
    generatedTestLines.push(`  page = await context.newPage();`);
    generatedTestLines.push(`  logger = new Logger('${config.target.base_url}', './output/${testName || 'test'}.json');`);
    generatedTestLines.push(`});\n`);
    generatedTestLines.push(`afterAll(async () => {`);
    generatedTestLines.push(`  await logger.save();`);
    generatedTestLines.push(`  await generateHtmlReport(logger.getResult(), './output/${testName || 'test'}_report.html');`);
    generatedTestLines.push(`  await browser.close();`);
    generatedTestLines.push(`});\n`);
    generatedTestLines.push(`async function recordStep(type: 'navigation' | 'modal' | 'loading', url: string | null, parentId: string | null, text: string, selector: string, depth: number, apiCalls?: any[]) {`);
    generatedTestLines.push(`  const stepId = generateId(page.url(), selector);`);
    generatedTestLines.push(`  const screenshotPath = \`./output/screenshots/\${stepId}.png\`;`);
    generatedTestLines.push(`  await page.screenshot({ path: screenshotPath, fullPage: true });`);
    generatedTestLines.push(`  logger.addNode({`);
    generatedTestLines.push(`    id: stepId,`);
    generatedTestLines.push(`    type,`);
    generatedTestLines.push(`    url: type === 'modal' ? null : page.url(),`);
    generatedTestLines.push(`    parent_id: parentId,`);
    generatedTestLines.push(`    trigger: { text, selector, api_calls: apiCalls },`);
    generatedTestLines.push(`    screenshot_path: screenshotPath,`);
    generatedTestLines.push(`    depth,`);
    generatedTestLines.push(`    visited_at: new Date().toISOString()`);
    generatedTestLines.push(`  });`);
    generatedTestLines.push(`  return stepId;`);
    generatedTestLines.push(`}\n`);
    generatedTestLines.push(`test('${testName || 'Auto-generated flow'}', async () => {`);
    generatedTestLines.push(`  let lastStepId: string | null = null;\n`);
  }

  async function captureState(triggerInfo: any = { text: 'Navigation', selector: 'auto' }, type: 'navigation' | 'modal' | 'loading' = 'navigation') {
    if (!recordingEnabled) return;
    if (isCapturing) return;
    isCapturing = true;
    try {
      const currentUrl = page.url();
      
      let selectorForId = undefined;
      if (type !== 'navigation') {
        selectorForId = `${type}_${triggerInfo.selector}`;
      }
      
      const nodeId = generateId(currentUrl, selectorForId);

      if (logger.hasNode(nodeId)) {
        console.log(`\n[Auto-detect] Re-visited node: ${currentUrl} (ID: ${nodeId})`);
        previousNodeId = nodeId;
        return;
      }
      
      console.log(`\n[Auto-detect] Capturing ${type} state at ${currentUrl}...`);
      
      const screenshotPath = await takeSnapshot(
        page, 
        config.output.screenshots_dir, 
        nodeId
      ).catch((err) => {
        console.error(`[Auto-detect] Error taking screenshot: ${err.message}`);
        return null;
      });

      if (screenshotPath) {
        logger.addNode({
          id: nodeId,
          type: type,
          url: currentUrl,
          parent_id: previousNodeId,
          trigger: { 
            text: triggerInfo.text || 'Unknown', 
            selector: triggerInfo.selector || 'auto',
            api_calls: pendingApiCalls.length > 0 && type !== 'loading' ? [...pendingApiCalls] : undefined
          },
          screenshot_path: screenshotPath,
          depth: currentDepth,
          visited_at: new Date().toISOString()
        });
        
        // --- Test Code Generation ---
        const cleanUrl = currentUrl.replace(/'/g, "\\'");
        const cleanSelector = (triggerInfo.selector || 'auto').replace(/'/g, "\\'");
        const cleanText = (triggerInfo.text || '').replace(/'/g, "\\'");
        
        if (triggerInfo.selector === 'manual_start') {
          generatedTestLines.push(`  // --- Navigation Start ---`);
          generatedTestLines.push(`  await page.goto('${cleanUrl}');`);
          generatedTestLines.push(`  await page.waitForTimeout(2000);`);
          generatedTestLines.push(`  lastStepId = await recordStep('navigation', page.url(), null, 'Flow Start', 'manual_start', 0, undefined);\n`);
        } else if (triggerInfo.selector && triggerInfo.selector !== 'auto') {
          generatedTestLines.push(`  // --- Click: ${cleanText} ---`);
          
          if (pendingApiCalls.length > 0 && type !== 'loading') {
            const mainCall = pendingApiCalls[0];
            const cleanApiUrl = mainCall.url.split('?')[0].replace(/'/g, "\\'");
            generatedTestLines.push(`  const [response] = await Promise.all([`);
            generatedTestLines.push(`    page.waitForResponse(res => res.url().includes('${cleanApiUrl}') && res.status() === ${mainCall.status}),`);
            generatedTestLines.push(`    page.click('${cleanSelector}')`);
            generatedTestLines.push(`  ]);`);
            generatedTestLines.push(`  expect(response.ok()).toBeTruthy();`);
          } else {
            generatedTestLines.push(`  await page.click('${cleanSelector}');`);
            generatedTestLines.push(`  await page.waitForTimeout(1500);`);
          }
          
          const apiCallsStr = pendingApiCalls.length > 0 && type !== 'loading' ? JSON.stringify(pendingApiCalls) : 'undefined';
          generatedTestLines.push(`  lastStepId = await recordStep('${type}', page.url(), lastStepId, '${cleanText}', '${cleanSelector}', ${currentDepth}, ${apiCallsStr});\n`);
        } else {
          // Navigations not triggered by a specific element (e.g. page loads)
          generatedTestLines.push(`  // --- Auto-detected state ---`);
          generatedTestLines.push(`  await page.waitForTimeout(1500);`);
          const apiCallsStr = pendingApiCalls.length > 0 && type !== 'loading' ? JSON.stringify(pendingApiCalls) : 'undefined';
          generatedTestLines.push(`  lastStepId = await recordStep('${type}', page.url(), lastStepId, '${cleanText}', '${cleanSelector}', ${currentDepth}, ${apiCallsStr});\n`);
        }
        
        console.log(`[Auto-detect] Captured ${type} state. Node ID: ${nodeId}`);
        previousNodeId = nodeId;
        if (type !== 'loading') {
          currentDepth++;
        }
      }
    } finally {
      isCapturing = false;
    }
  }

  // Network request tracking
  page.on('request', (req) => {
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      activeRequests++;
      checkIfLoading();
    }
  });
  page.on('requestfinished', (req) => {
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      activeRequests = Math.max(0, activeRequests - 1);
      checkIfFinishedLoading();
    }
  });
  page.on('requestfailed', (req) => {
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      activeRequests = Math.max(0, activeRequests - 1);
      checkIfFinishedLoading();
    }
  });
  page.on('response', (res) => {
    const req = res.request();
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      const url = req.url();
      if (!url.includes('_next/') && !url.includes('.js') && !url.includes('.css')) {
        pendingApiCalls.push({
          method: req.method(),
          url: url,
          status: res.status()
        });
      }
    }
  });

  async function checkIfLoading() {
    if (!recordingEnabled) return;
    if ((activeRequests > 0 || domIsLoading) && lastActionTrigger && !hasCapturedLoadingForCurrentAction) {
      hasCapturedLoadingForCurrentAction = true;
      if (actionTimeout) clearTimeout(actionTimeout);
      await captureState(lastActionTrigger, 'loading');
    }
  }

  function checkIfFinishedLoading() {
    if (!recordingEnabled) return;
    if (activeRequests === 0 && !domIsLoading && lastActionTrigger) {
      if (actionTimeout) clearTimeout(actionTimeout);
      actionTimeout = setTimeout(() => {
        captureState(lastActionTrigger, 'modal');
        lastActionTrigger = null;
        hasCapturedLoadingForCurrentAction = false;
      }, 3000); // Esperar 3s después de que termine la carga para asegurar que el DOM esté listo
    }
  }

  // Expose function to track DOM loading states
  await page.exposeFunction('recordDomLoadingState', (isLoading: boolean) => {
    if (!recordingEnabled) return;
    domIsLoading = isLoading;
    if (isLoading) {
      checkIfLoading();
    } else {
      checkIfFinishedLoading();
    }
  });

  // Expose function to track assertions
  await page.exposeFunction('recordAssertion', (info: { selector: string, expectedValue: string }) => {
    if (!recordingEnabled) return;
    console.log(`\n[Event] Assertion recorded: expect(${info.selector}) to contain '${info.expectedValue}'`);
    const cleanSelector = info.selector.replace(/'/g, "\\'");
    const cleanValue = info.expectedValue.replace(/'/g, "\\'");
    
    const varName = 'val_' + Math.random().toString(36).substring(2, 7);
    generatedTestLines.push(`  // --- Assertion Manual ---`);
    generatedTestLines.push(`  const ${varName} = await page.locator('${cleanSelector}').textContent();`);
    generatedTestLines.push(`  expect(${varName}).toContain('${cleanValue}');\n`);
  });

  // Expose function to track clicks
  await page.exposeFunction('recordUserAction', (info: any) => {
    if (!recordingEnabled) return;
    console.log(`\n[Event] Clicked: ${info.text} (selector: ${info.selector}) - Waiting for stabilization...`);
    pendingApiCalls = []; // reset for the new action
    lastActionTrigger = info;
    hasCapturedLoadingForCurrentAction = false;
    if (actionTimeout) clearTimeout(actionTimeout);
    
    // Wait briefly. If no loading is detected, we capture it as a normal modal/state change
    actionTimeout = setTimeout(() => {
      if (activeRequests === 0 && !domIsLoading) {
        captureState(info, 'modal');
        lastActionTrigger = null;
      } else {
        console.log(`[Event] Network/DOM still busy, forcing capture...`);
        captureState(info, 'modal');
        lastActionTrigger = null;
      }
    }, 1500); 
  });

  await page.addInitScript(`
    // Visual feedback for clicks
    function showToast(msg) {
      const toast = document.createElement('div');
      toast.textContent = msg;
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.right = '20px';
      toast.style.background = '#ff00ff';
      toast.style.color = '#fff';
      toast.style.padding = '10px';
      toast.style.borderRadius = '5px';
      toast.style.zIndex = '9999999';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1500);
    }

    // Click listener
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Ignorar clicks dentro de nuestro propio prompt modal
      if (target && target.id && target.id.startsWith('crawlker-prompt-')) return;
      if (target && target.closest && target.closest('#crawlker-custom-prompt')) return;

      console.log('[Crawlker] Click intercepted!');
      const clickable = target.closest('button, a, [role="button"], input, select, textarea');
      
      function getSelector(el) {
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.id) return '#' + el.id;
        if (el.getAttribute('name')) return '[name="' + el.getAttribute('name') + '"]';
        
        // Improve selector generation
        let selector = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !c.includes(':')).join('.');
          if (classes) selector += '.' + classes;
        }
        return selector;
      }

      // Alt+Click para registrar un expect manual
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Si no hay un target específico, usamos el general
        const elParaLeer = clickable || target;
        const selector = getSelector(elParaLeer);
        const currentValue = elParaLeer.innerText || elParaLeer.value || elParaLeer.textContent || '';
        
        // Crear un modal HTML custom porque Playwright auto-descarta window.prompt
        const customPrompt = document.createElement('div');
        customPrompt.id = 'crawlker-custom-prompt';
        customPrompt.style.position = 'fixed';
        customPrompt.style.top = '50%';
        customPrompt.style.left = '50%';
        customPrompt.style.transform = 'translate(-50%, -50%)';
        customPrompt.style.background = 'white';
        customPrompt.style.padding = '20px';
        customPrompt.style.border = '2px solid black';
        customPrompt.style.zIndex = '9999999';
        customPrompt.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        customPrompt.innerHTML = 
          '<p style="margin-top: 0; color: black; font-family: sans-serif;">Ingresa el valor esperado para este campo:</p>' +
          '<input type="text" id="crawlker-prompt-input" style="width: 100%; margin-bottom: 10px; padding: 5px;" />' +
          '<div style="text-align: right;">' +
            '<button id="crawlker-prompt-cancel" style="margin-right: 10px;">Cancelar</button>' +
            '<button id="crawlker-prompt-ok">OK</button>' +
          '</div>';
        document.body.appendChild(customPrompt);
        
        const input = document.getElementById('crawlker-prompt-input');
        input.value = currentValue.trim();
        input.focus();
        
        document.getElementById('crawlker-prompt-ok').onclick = function(ev) {
          ev.stopPropagation();
          const expectedValue = input.value;
          customPrompt.remove();
          showToast('Assertion: ' + expectedValue);
          window.recordAssertion({ selector: selector, expectedValue: expectedValue }).catch(console.error);
        };
        
        document.getElementById('crawlker-prompt-cancel').onclick = function(ev) {
          ev.stopPropagation();
          customPrompt.remove();
        };
        return;
      }

      if (clickable) {
        const text = clickable.innerText || clickable.value || 'Click';
        const selector = getSelector(clickable);
        showToast('Recorded: ' + text);
        window.recordUserAction({ text, selector }).catch(console.error);
      } else {
        const selector = target.tagName ? target.tagName.toLowerCase() : 'unknown';
        showToast('Recorded: ' + selector);
        window.recordUserAction({ text: 'Click', selector }).catch(console.error);
      }
    }, { capture: true });
  `);

  await page.addInitScript(`
    // Loading state observer
    const isLoader = (el) => {
      const cls = el.className;
      if (typeof cls === 'string' && /loader|loading|spinner|skeleton/i.test(cls)) return true;
      if (el.getAttribute('aria-busy') === 'true') return true;
      if (el.getAttribute('role') === 'progressbar') return true;
      return false;
    };

    let wasLoading = false;
    const observer = new MutationObserver(() => {
      const loaders = document.querySelectorAll('[class*="loader"], [class*="loading"], [class*="spinner"], [role="progressbar"], [aria-busy="true"]');
      const isCurrentlyLoading = loaders.length > 0;
      
      if (isCurrentlyLoading !== wasLoading) {
        wasLoading = isCurrentlyLoading;
        window.recordDomLoadingState(isCurrentlyLoading);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-busy'] });
  `);

  // Listen for full page loads
  page.on('load', async () => {
    if (!recordingEnabled) return;
    if (actionTimeout) clearTimeout(actionTimeout);
    hasCapturedLoadingForCurrentAction = false;
    await captureState(lastActionTrigger || { text: 'Page Load', selector: 'navigation' }, 'navigation');
    lastActionTrigger = null;
  });

  // Forward browser console logs to terminal
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error] ${msg.text()}`);
    } else if (msg.text().includes('[Crawlker]')) {
      console.log(`[Browser Log] ${msg.text()}`);
    }
  });

  // Inject script to listen for clicks and DOM mutations (loaders)
  await page.addInitScript(() => {
    function initOverlay() {
      if (document.getElementById('crawlker-style')) return;
      
      const style = document.createElement('style');
      style.id = 'crawlker-style';
      style.innerHTML = `
        .crawlker-highlight-overlay {
          position: absolute;
          pointer-events: none;
          z-index: 999998;
          border: 2px dashed #ff00ff;
          background-color: rgba(255, 0, 255, 0.1);
        }
        .crawlker-tooltip {
          position: absolute;
          pointer-events: none;
          z-index: 999999;
          background-color: #ff00ff;
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 11px;
          white-space: nowrap;
          transform: translateY(-100%);
          margin-top: -2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(style);

      const overlay = document.createElement('div');
      overlay.className = 'crawlker-highlight-overlay';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);

      const tooltip = document.createElement('div');
      tooltip.className = 'crawlker-tooltip';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);

      function getSelector(el: HTMLElement) {
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
        return el.tagName.toLowerCase();
      }

      document.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        const clickable = target.closest('button, a, [role="button"], input, select, textarea') as HTMLElement;
        
        if (clickable) {
          const rect = clickable.getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset;
          const scrollY = window.scrollY || window.pageYOffset;
          
          overlay.style.top = `${rect.top + scrollY}px`;
          overlay.style.left = `${rect.left + scrollX}px`;
          overlay.style.width = `${rect.width}px`;
          overlay.style.height = `${rect.height}px`;
          overlay.style.display = 'block';

          tooltip.textContent = getSelector(clickable);
          tooltip.style.top = `${rect.top + scrollY}px`;
          tooltip.style.left = `${rect.left + scrollX}px`;
          tooltip.style.display = 'block';
        } else {
          overlay.style.display = 'none';
          tooltip.style.display = 'none';
        }
      }, { capture: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOverlay);
    } else {
      initOverlay();
    }
  });

  await page.goto(config.target.base_url);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n--- MANUAL FLOW INSTRUCTIONS ---');
  console.log('1. Navigate to the page where you want to start recording.');
  console.log('2. Type "start" or "s" and press Enter to begin capturing.');
  console.log('3. Navigate and click through your flow.');
  console.log('4. Type "finish" or "f" and press Enter to save and exit.\n');

  while (true) {
    const prompt = recordingEnabled ? 'Action [f=finish]: ' : 'Action [s=start, f=finish]: ';
    const answer = await rl.question(prompt);
    
    if (!recordingEnabled && (answer.toLowerCase() === 's' || answer.toLowerCase() === 'start')) {
      recordingEnabled = true;
      initTestGeneration();
      console.log('\n[Recording Started] Now capturing your navigation and clicks...');
      await captureState({ text: 'Flow Start', selector: 'manual_start' }, 'navigation');
      continue;
    }

    if (answer.toLowerCase() === 'f' || answer.toLowerCase() === 'finish') {
      break;
    }
  }

  rl.close();
  await browser.close();
  await logger.save();
  
  if (generatedTestLines.length > 0) {
    generatedTestLines.push(`}, 120000);`);
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const fileName = testName ? `${testName.replace(/[^a-z0-9-]/gi, '-')}.test.ts` : 'generated-flow.test.ts';
    const testFilePath = path.join(process.cwd(), 'tests', 'e2e', fileName);
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, generatedTestLines.join('\n'), 'utf8');
    console.log(`\n[Success] Generated test saved to: ${testFilePath}`);
  }
}
