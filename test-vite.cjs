const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let logOutput = 'Starting Playwright...\n';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => { logOutput += `[${msg.type()}] ${msg.text()}\n`; });
  page.on('pageerror', err => { logOutput += `[pageerror] ${err.message}\n`; });
  
  logOutput += 'Navigating to http://localhost:5173...\n';
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    logOutput += `Navigation failed or timed out: ${e.message}\n`;
  }
  
  await page.waitForTimeout(3000);
  
  logOutput += `Page title: ${await page.title()}\n`;
  logOutput += '\n--- CONSOLE LOGS START ---\n';
  
  await page.screenshot({ path: 'local-test.png' });
  logOutput += 'Screenshot saved to local-test.png\n';
  
  fs.writeFileSync('test-results.txt', logOutput);
  await browser.close();
})();
