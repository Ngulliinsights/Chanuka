/**
 * Playwright Global Teardown
 * Cleans up after all E2E tests have completed
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...');

  try {
    // Clean up any test data or resources
    console.log('📊 Cleaning up test data...');
    
    // You could make API calls here to clean up test data
    // For example, delete test users, reset database state, etc.
    
    // Clear any temporary files or caches
    console.log('🗑️ Clearing temporary files...');
    
    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here as it would fail the entire test run
  }
}

export default globalTeardown;