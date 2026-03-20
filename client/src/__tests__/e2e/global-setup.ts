/**
 * Global Setup for E2E Tests
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Wait for the dev server to be ready
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  
  try {
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Dev server is ready');
  } catch (error) {
    console.error('❌ Failed to connect to dev server:', error);
    throw error;
  }

  await browser.close();
  console.log('✅ Global setup complete');
}

export default globalSetup;
