const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.exposeFunction('recordUserAction', (info) => console.log('Action:', info));
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    await page.addInitScript(() => {
      function showToast(msg) { console.log('Toast:', msg); }
      document.addEventListener('click', (e) => {
        const target = e.target;
        const clickable = target.closest('button, a, [role="button"], input, select, textarea');
        function getSelector(el) {
          if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
          if (el.id) return `#${el.id}`;
          if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
          let selector = el.tagName.toLowerCase();
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').filter(c => c && !c.includes(':')).join('.');
            if (classes) selector += `.${classes}`;
          }
          return selector;
        }
        if (clickable) {
          const text = clickable.innerText || clickable.value || 'Click';
          const selector = getSelector(clickable);
          showToast(`Recorded: ${text}`);
          window.recordUserAction({ text, selector }).catch(console.error);
        } else {
          const selector = target.tagName ? target.tagName.toLowerCase() : 'unknown';
          showToast(`Recorded: ${selector}`);
          window.recordUserAction({ text: 'Click', selector }).catch(console.error);
        }
      }, { capture: true });
    });
    
    await page.goto('http://localhost:3000');
    await page.click('body');
    await page.waitForTimeout(500);
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
