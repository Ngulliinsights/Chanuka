/**
 * Playwright Global Setup
 * Configures the test environment before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Verify the app is loaded
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 30000 });
    console.log('✅ Development server is ready');

    // Set up test data if needed
    console.log('📊 Setting up test data...');
    
    // You could make API calls here to set up test data
    // For now, we'll just verify the API is accessible
    const response = await page.request.get('http://localhost:3001/api/health');
    if (response.ok()) {
      console.log('✅ API server is ready');
    } else {
      console.warn('⚠️ API server may not be ready');
    }

    // Clear any existing data that might interfere with tests
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;