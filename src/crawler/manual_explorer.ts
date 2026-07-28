import { chromium } from 'playwright';
import { Config } from '../config/schema';
import { Logger } from '../recorder/logger';
import { injectOverlay } from './inject-overlay';
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
      const appFrame = page.frames().find(f => f.name() === 'app-frame');
      const currentUrl = appFrame ? appFrame.url() : page.url();
      
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

  await page.addInitScript(() => {
    console.log('[Graphawler-Debug] InitScript injected');

    const topWin = window.top || window;

    function showToast(msg: string) {
      const toast = document.createElement('div');
      toast.textContent = msg;
      toast.style.position = 'fixed';
      toast.style.bottom = '80px';
      toast.style.right = '20px';
      toast.style.background = '#000';
      toast.style.color = '#fff';
      toast.style.padding = '12px 16px';
      toast.style.borderRadius = '8px';
      toast.style.zIndex = '2147483647';
      toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      toast.style.fontFamily = 'sans-serif';
      toast.style.fontSize = '14px';
      (topWin.document.body || document.body).appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }

    document.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.closest !== 'function') return;
      
      if (target.closest('#graphawler-toolbar-container')) return;
      if (target.id && target.id.startsWith('crawlker-prompt-')) return;
      if (target.closest('#crawlker-custom-prompt')) return;

      e.preventDefault();
      e.stopPropagation();

      const clickable = target.closest('button, a, [role="button"], input, select, textarea') as HTMLElement;
      
      const elParaLeer = clickable || target;
      
      function getSelector(el: HTMLElement) {
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.id) return '#' + el.id;
        if (el.getAttribute('name')) return '[name="' + el.getAttribute('name') + '"]';
        
        let selector = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !c.includes(':')).join('.');
          if (classes) selector += '.' + classes;
        }
        return selector;
      }

      const selector = getSelector(elParaLeer);
      const currentValue = (elParaLeer.innerText || (elParaLeer as HTMLInputElement).value || elParaLeer.textContent || '').trim();
      
      showToast('Aserción registrada: ' + selector + ' = "' + currentValue + '"');
      (topWin as any).recordAssertion({ selector: selector, expectedValue: currentValue }).catch(console.error);
    }, { capture: true });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.closest !== 'function') return;
      
      if (target.closest('#graphawler-toolbar-container')) return;
      if (target.id && target.id.startsWith('crawlker-prompt-')) return;
      if (target.closest('#crawlker-custom-prompt')) return;

      console.log('[Graphawler] Click intercepted!');
      const clickable = target.closest('button, a, [role="button"], input, select, textarea') as HTMLElement;
      
      function getSelector(el: HTMLElement) {
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.id) return '#' + el.id;
        if (el.getAttribute('name')) return '[name="' + el.getAttribute('name') + '"]';
        
        let selector = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !c.includes(':')).join('.');
          if (classes) selector += '.' + classes;
        }
        return selector;
      }

      if (clickable) {
        const text = clickable.innerText || (clickable as HTMLInputElement).value || 'Click';
        const selector = getSelector(clickable);
        showToast('Acción registrada: ' + text);
        (topWin as any).recordUserAction({ text, selector }).catch(console.error);
      } else {
        const selector = target.tagName ? target.tagName.toLowerCase() : 'unknown';
        showToast('Acción registrada: ' + selector);
        (topWin as any).recordUserAction({ text: 'Click', selector }).catch(console.error);
      }
    }, { capture: true });
  });

  await page.addInitScript(`
    const topWin = window.top || window;

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
        topWin.recordDomLoadingState(isCurrentlyLoading);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-busy'] });
  `);

  // Listen for iframe full page loads
  page.on('framenavigated', async (frame) => {
    if (!recordingEnabled) return;
    if (frame.name() === 'app-frame') {
      if (actionTimeout) clearTimeout(actionTimeout);
      hasCapturedLoadingForCurrentAction = false;
      await captureState(lastActionTrigger || { text: 'Page Load', selector: 'navigation' }, 'navigation');
      lastActionTrigger = null;
    }
  });

  // Forward browser console logs to terminal
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error] ${msg.text()}`);
    } else {
      console.log(`[Browser Log] ${msg.text()}`);
    }
  });

  await injectOverlay(page);

  let finishRecordingResolve: () => void;
  const finishRecordingPromise = new Promise<void>(resolve => {
    finishRecordingResolve = resolve;
  });

  page.on('close', () => {
    if (finishRecordingResolve) finishRecordingResolve();
  });

  await page.exposeFunction('isRecordingEnabled', () => {
    return recordingEnabled;
  });

  await page.exposeFunction('triggerStartRecording', async () => {
    if (!recordingEnabled) {
      recordingEnabled = true;
      initTestGeneration();
      console.log('\n[Recording Started] Now capturing your navigation and clicks...');
      await captureState({ text: 'Flow Start', selector: 'manual_start' }, 'navigation');
    }
  });

  await page.exposeFunction('triggerFinishRecording', () => {
    finishRecordingResolve();
  });

  // Intercept requests to remove X-Frame-Options and CSP headers so we can frame the app
  await page.route('**/*', async route => {
    try {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      
      // Remove security headers that prevent framing
      const headersToRemove = ['x-frame-options', 'content-security-policy'];
      for (const key of Object.keys(headers)) {
        if (headersToRemove.includes(key.toLowerCase())) {
          delete headers[key];
        }
      }
      
      await route.fulfill({ response, headers });
    } catch (e) {
      await route.continue().catch(() => {});
    }
  });

  const wrapperHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Graphawler Recorder</title>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #000; font-family: -apple-system, system-ui, sans-serif; }
        #app-frame { width: 100%; height: calc(100vh - 60px); border: none; background: #fff; display: block; margin-top: 60px; }
        #graphawler-toolbar-container {
          height: 60px; width: 100%; background: #000; display: flex; align-items: center; justify-content: center;
          border-bottom: 1px solid #333; position: fixed; top: 0; left: 0; z-index: 2147483647;
        }
        .btn { padding: 8px 16px; border-radius: 24px; cursor: pointer; font-size: 14px; font-weight: 600; border: none; transition: all 0.2s; }
        #crawlker-ui-start { background: #10b981; color: #fff; }
        #crawlker-ui-separator { display: none; width: 1px; height: 24px; background: #333; margin: 0 4px; }
        #crawlker-ui-finish { display: none; background: #ef4444; color: #fff; }
      </style>
    </head>
    <body>
      <div id="graphawler-toolbar-container">
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="crawlker-ui-start" class="btn">▶️ Iniciar Grabación</button>
          <span style="color: #ccc; font-size: 14px; margin-left: 8px;">(🖱 Click izq = Navegar | 🖱 Click derecho = Validar valor)</span>
          <div id="crawlker-ui-separator"></div>
          <button id="crawlker-ui-finish" class="btn">⏹️ Finalizar</button>
        </div>
      </div>
      <iframe id="app-frame" name="app-frame" src="${config.target.base_url}"></iframe>
      <script>
        const btnStart = document.getElementById('crawlker-ui-start');
        const separator = document.getElementById('crawlker-ui-separator');
        const btnFinish = document.getElementById('crawlker-ui-finish');

        window.isRecordingEnabled().then(isRecording => {
          if (isRecording) {
            btnStart.style.display = 'none';
            separator.style.display = 'block';
            btnFinish.style.display = 'block';
          }
        });

        btnStart.onclick = async () => {
          btnStart.style.display = 'none';
          separator.style.display = 'block';
          btnFinish.style.display = 'block';
          if (window.triggerStartRecording) await window.triggerStartRecording();
        };

        btnFinish.onclick = async () => {
          btnFinish.innerText = 'Guardando...';
          if (window.triggerFinishRecording) await window.triggerFinishRecording();
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(wrapperHtml);

  console.log('\n--- MANUAL FLOW INSTRUCTIONS ---');
  console.log('Use the Graphawler floating toolbar in the browser to start and finish your recording.\n');

  await finishRecordingPromise;
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
