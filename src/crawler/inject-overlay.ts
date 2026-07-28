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
        .crawlker-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.4); z-index: 2147483646;
          display: flex; align-items: center; justify-content: center;
        }
        .crawlker-modal {
          background: #fff; border-radius: 12px; padding: 24px;
          min-width: 400px; max-width: 500px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          font-family: system-ui, -apple-system, sans-serif;
          color: #111;
        }
        .crawlker-modal h3 { margin: 0 0 16px; font-size: 16px; }
        .crawlker-modal label { display: block; font-size: 12px; font-weight: 600; color: #555; margin: 12px 0 4px; }
        .crawlker-modal .crawlker-sel { background: #f5f5f5; padding: 8px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; }
        .crawlker-modal input, .crawlker-modal select {
          width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px;
          font-size: 14px; box-sizing: border-box; outline: none;
        }
        .crawlker-modal input:focus, .crawlker-modal select:focus { border-color: #ff00ff; }
        .crawlker-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
        .crawlker-modal-actions button {
          padding: 8px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .crawlker-modal-actions .crawlker-btn-cancel { background: #eee; color: #555; }
        .crawlker-modal-actions .crawlker-btn-confirm { background: #ff00ff; color: #fff; }
      \`;

      document.documentElement.appendChild(style);

      const overlay = document.createElement('div');
      overlay.className = 'crawlker-highlight-overlay';
      overlay.style.display = 'none';
      document.documentElement.appendChild(overlay);

      const tooltip = document.createElement('div');
      tooltip.className = 'crawlker-tooltip';
      tooltip.style.display = 'none';
      document.documentElement.appendChild(tooltip);

      const isClickable = (el) => el && typeof el.closest === 'function' && el.closest('button, a, [role="button"], input, select, textarea');
      let isAssertionModalOpen = false;

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

      function getElementValue(el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          return el.value || '';
        }
        if (el.tagName === 'SELECT') {
          return el.options[el.selectedIndex]?.text || '';
        }
        return (el.textContent || '').trim().substring(0, 80);
      }

      function showAssertionModal(selector, currentValue) {
        if (isAssertionModalOpen) return;
        isAssertionModalOpen = true;

        var modalOverlay = document.createElement('div');
        modalOverlay.className = 'crawlker-modal-overlay';
        modalOverlay.id = 'crawlker-assertion-modal';

        modalOverlay.innerHTML =
          '<div class="crawlker-modal">' +
            '<h3>🔍 Assertion</h3>' +
            '<label>Selector</label>' +
            '<div class="crawlker-sel">' + selector.replace(/</g, '&lt;') + '</div>' +
            '<label>Tipo de aserción</label>' +
            '<select id="crawlker-assert-type">' +
              '<option value="toContain">toContain (contiene)</option>' +
              '<option value="toEqual">toEqual (igual)</option>' +
              '<option value="toBe">toBe (estricto)</option>' +
              '<option value="toMatch">toMatch (regex)</option>' +
              '<option value="toBeGreaterThan">toBeGreaterThan (mayor que)</option>' +
              '<option value="toBeLessThan">toBeLessThan (menor que)</option>' +
            '</select>' +
            '<label>Valor esperado</label>' +
            '<input id="crawlker-assert-value" type="text" value="' + currentValue.replace(/"/g, '&quot;') + '" />' +
            '<div class="crawlker-modal-actions">' +
              '<button class="crawlker-btn-cancel" id="crawlker-assert-cancel">Cancel</button>' +
              '<button class="crawlker-btn-confirm" id="crawlker-assert-confirm">✓ Assert</button>' +
            '</div>' +
          '</div>';

        document.body.appendChild(modalOverlay);

        modalOverlay.onclick = function(ev) {
          if (ev.target === modalOverlay) {
            modalOverlay.remove();
            isAssertionModalOpen = false;
          }
        };

        document.getElementById('crawlker-assert-cancel').onclick = function() {
          modalOverlay.remove();
          isAssertionModalOpen = false;
        };

        document.getElementById('crawlker-assert-confirm').onclick = function() {
          var assertType = document.getElementById('crawlker-assert-type').value;
          var expectedValue = document.getElementById('crawlker-assert-value').value;
          modalOverlay.remove();
          isAssertionModalOpen = false;

          if (typeof recordAssertion !== 'undefined') {
            recordAssertion({ selector: selector, expectedValue: expectedValue, assertType: assertType });
          } else {
            console.log('[INSPECTOR] Assertion: expect(' + selector + ').' + assertType + '("' + expectedValue + '")');
          }
        };

        document.getElementById('crawlker-assert-value').focus();
        document.getElementById('crawlker-assert-value').select();
      }

      document.addEventListener('mouseover', function(e) {
        if (isAssertionModalOpen) return;
        var target = e.target;
        var clickable = isClickable(target);

        if (clickable) {
          var rect = clickable.getBoundingClientRect();
          overlay.style.top = (rect.top + window.scrollY) + 'px';
          overlay.style.left = (rect.left + window.scrollX) + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          overlay.style.display = 'block';
        } else {
          overlay.style.display = 'none';
        }

        var sel = getSelector(target);
        var val = getElementValue(target);
        tooltip.textContent = val ? sel + ' = "' + val + '"' : sel;
        tooltip.style.top = (target.getBoundingClientRect().top + window.scrollY) + 'px';
        tooltip.style.left = (target.getBoundingClientRect().left + window.scrollX) + 'px';
        tooltip.style.display = 'block';
      }, { capture: true });

      document.addEventListener('click', function(e) {
        if (isAssertionModalOpen) return;
        if (e.target.closest && e.target.closest('#crawlker-assertion-modal, .crawlker-modal-overlay')) return;

        var target = e.target;
        var clickable = isClickable(target);
        var sel = getSelector(target);
        var val = getElementValue(target);

        if (clickable) {
          var selector = getSelector(clickable);
          console.log('[INSPECTOR] Clicked element: ' + selector);
        } else if (val) {
          e.stopPropagation();
          e.preventDefault();
          showAssertionModal(sel, val);
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
