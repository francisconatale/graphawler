import type { Page } from 'playwright';

export function getOverlayScript(): string {
  return `
    function initOverlay() {
      if (document.getElementById('crawlker-style')) return;

      const style = document.createElement('style');
      style.id = 'crawlker-style';
      style.textContent = \`
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
      \`;

      const overlay = document.createElement('div');
      overlay.className = 'crawlker-highlight-overlay';
      overlay.style.display = 'none';

      const tooltip = document.createElement('div');
      tooltip.className = 'crawlker-tooltip';
      tooltip.style.display = 'none';

      function ensureElements() {
        if (!document.getElementById('crawlker-style')) {
          document.documentElement.appendChild(style);
        }
        if (!document.documentElement.contains(overlay)) {
          document.documentElement.appendChild(overlay);
        }
        if (!document.documentElement.contains(tooltip)) {
          document.documentElement.appendChild(tooltip);
        }
      }

      ensureElements();

      function getSelector(el) {
        if ((el.tagName === 'BUTTON' || el.tagName === 'A') && el.textContent && el.textContent.trim()) {
          const text = el.textContent.trim().replace(/\\s+/g, ' ');
          if (text.length > 0 && text.length < 50) {
            return 'text="' + text + '"';
          }
        }
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.getAttribute('placeholder')) {
            return '[placeholder="' + el.getAttribute('placeholder') + '"]';
          }
          if (el.getAttribute('aria-label')) {
            return '[aria-label="' + el.getAttribute('aria-label') + '"]';
          }
          if (el.getAttribute('value') && (el.type === 'submit' || el.type === 'button')) {
            return 'text="' + el.getAttribute('value') + '"';
          }
        }
        if (el.getAttribute('name')) return '[name="' + el.getAttribute('name') + '"]';
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.id) return '#' + el.id;
        return el.tagName.toLowerCase();
      }

      document.addEventListener('mouseover', (e) => {
        ensureElements();
        const target = e.target;
        const clickable = target.closest('button, a, [role="button"], input, select, textarea');

        if (clickable) {
          const rect = clickable.getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset;
          const scrollY = window.scrollY || window.pageYOffset;

          overlay.style.top = (rect.top + scrollY) + 'px';
          overlay.style.left = (rect.left + scrollX) + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          overlay.style.display = 'block';

          tooltip.textContent = getSelector(clickable);
          tooltip.style.top = (rect.top + scrollY) + 'px';
          tooltip.style.left = (rect.left + scrollX) + 'px';
          tooltip.style.display = 'block';
        } else {
          overlay.style.display = 'none';
          tooltip.style.display = 'none';
        }
      }, { capture: true });

      document.addEventListener('click', (e) => {
        const target = e.target;
        const clickable = target.closest('button, a, [role="button"], input, select, textarea');
        if (clickable) {
          const selector = getSelector(clickable);
          console.log('[INSPECTOR] Clicked element: ' + selector);
        }
      }, { capture: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOverlay);
    } else {
      initOverlay();
    }
  `;
}

export async function injectOverlay(page: Page): Promise<void> {
  await page.addInitScript(getOverlayScript());
}
