/**
 * Simple test to verify loading system works
 */

import { DEFAULT_LOADING_CONFIG } from './constants';
import { createLoadingOperation } from './utils/loading-utils';

// Test basic functionality
export function testLoadingSystem() {
  console.log('Testing loading system...');

  // Test constants
  console.log('Default config:', DEFAULT_LOADING_CONFIG);

  // Test operation creation
  const operation = createLoadingOperation('component', 'Test loading');
  console.log('Created operation:', operation);

  console.log('Loading system test completed successfully!');
}
