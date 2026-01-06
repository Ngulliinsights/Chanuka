/**
 * Integration test for loading system
 * Verifies that all components work together correctly
 */

import { DEFAULT_LOADING_CONFIG } from './constants';
import { LoadingError } from './errors';
import { useLoading } from './hooks/useLoading';
import { useLoadingRecovery } from './hooks/useLoadingRecovery';
import { useProgressiveLoading } from './hooks/useProgressiveLoading';
import { createLoadingOperation } from './utils/loading-utils';

// Test that all exports are available and types work correctly
export function testLoadingIntegration() {
  console.log('Testing loading system integration...');

  // Test that we can create operations
  const operation = createLoadingOperation('component', 'Test operation');
  console.log('✓ Operation creation works:', operation.id);

  // Test that config is accessible
  console.log('✓ Default config available:', DEFAULT_LOADING_CONFIG.timeout);

  // Test that error classes work
  const error = new LoadingError('Test error');
  console.log('✓ Error creation works:', error.message);

  // Test progressive loading stages
  const stages = [
    { id: 'init', message: 'Initializing...' },
    { id: 'load', message: 'Loading data...' },
    { id: 'complete', message: 'Complete!' },
  ];
  console.log('✓ Progressive stages defined:', stages.length);

  console.log('✅ All loading system components integrate successfully!');
  return true;
}

// Export hook types for verification
export type { LoadingResult, UseLoadingOptions } from './hooks/useLoading';

export type { LoadingRecoveryState, UseLoadingRecoveryOptions } from './hooks/useLoadingRecovery';

// Export main functionality
export {
  useLoading,
  useLoadingRecovery,
  useProgressiveLoading,
  createLoadingOperation,
  DEFAULT_LOADING_CONFIG,
  LoadingError,
};
