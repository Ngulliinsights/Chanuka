const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[pageerror] ${err.message}`));
  
  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Navigation failed or timed out:', e.message);
  }
  
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  console.log('Page title:', await page.title());
  
  console.log('\n--- CONSOLE LOGS ---');
  consoleLogs.forEach(log => console.log(log));
  console.log('--------------------\n');
  
  await page.screenshot({ path: 'local-test.png' });
  console.log('Screenshot saved to local-test.png');
  
  await browser.close();
})();
