import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Setup test database if needed
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
  }

  // Wait for server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Health check
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Server is ready');
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed');
}

export default globalSetup;





































