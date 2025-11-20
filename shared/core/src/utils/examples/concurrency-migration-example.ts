/**
 * Example usage of the new concurrency utilities with migration support
 * 
 * This example demonstrates how to use the ConcurrencyAdapter and migration router
 * to gradually migrate from legacy to new implementations.
 */

import { ConcurrencyAdapter } from '../concurrency-adapter';
import { getConcurrencyRouter } from '../concurrency-migration-router';
import { globalMutex, apiSemaphore } from '../race-condition-prevention';
import { MockFeatureFlagsService } from '../../types/feature-flags';

// Example 1: Direct usage of new concurrency utilities
export async function directUsageExample() {
  console.log('=== Direct Usage Example ===');
  
  // Create a concurrency adapter
  const adapter = new ConcurrencyAdapter(5);
  
  // Use mutex for exclusive access
  const result1 = await adapter.withLock(async () => {
    console.log('Executing with mutex lock');
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'mutex-result';
  });
  
  console.log('Mutex result:', result1);
  
  // Use concurrency limiter
  const result2 = await adapter.withLimit(async () => {
    console.log('Executing with concurrency limit');
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'limit-result';
  });
  
  console.log('Limit result:', result2);
  
  // Use global instances
  const result3 = await globalMutex.withLock(async () => {
    console.log('Using global mutex');
    return 'global-mutex-result';
  });
  
  console.log('Global mutex result:', result3);
  
  const result4 = await apiSemaphore.withPermit(async () => {
    console.log('Using API semaphore');
    return 'api-semaphore-result';
  });
  
  console.log('API semaphore result:', result4);
}

// Example 2: Migration router usage with feature flags
export async function migrationRouterExample() {
  console.log('\n=== Migration Router Example ===');
  
  // Setup feature flags service
  const featureFlagsService = new MockFeatureFlagsService();
  
  // Get the migration router
  const router = getConcurrencyRouter(featureFlagsService);
  
  // Enable gradual rollout (50% of users get new implementation)
  await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 50);
  
  // Simulate different users
  const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
  
  for (const user_id of users) {
    const result = await router.withMutexLock(async () => {
      console.log(`Processing for ${user_id}`);
      await new Promise(resolve => setTimeout(resolve, 10));
      return `processed-${ user_id }`;
    }, 'global', user_id);
    
    console.log(`Result for ${user_id}:`, result);
  }
  
  // Get performance summary
  const summary = router.getPerformanceSummary();
  console.log('Performance Summary:', summary);
}

// Example 3: Gradual rollout simulation
export async function gradualRolloutExample() {
  console.log('\n=== Gradual Rollout Example ===');
  
  const featureFlagsService = new MockFeatureFlagsService();
  const router = getConcurrencyRouter(featureFlagsService);
  
  // Simulate gradual rollout phases
  const phases = [
    { percentage: 1, description: '1% rollout' },
    { percentage: 5, description: '5% rollout' },
    { percentage: 10, description: '10% rollout' },
    { percentage: 25, description: '25% rollout' },
    { percentage: 50, description: '50% rollout' },
    { percentage: 100, description: '100% rollout' }
  ];
  
  for (const phase of phases) {
    console.log(`\n--- ${phase.description} ---`);
    
    // Update rollout percentage
    await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', phase.percentage);
    
    // Test with multiple users
    const testUsers = Array.from({ length: 20 }, (_, i) => `test-user-${i}`);
    let newImplementationCount = 0;
    
    for (const user_id of testUsers) {
      await router.withMutexLock(async () => {
        return `test-${ user_id }`;
      }, 'global', user_id);
    }
    
    const metrics = router.getMetrics();
    const recentMetrics = metrics.slice(-20); // Last 20 operations
    newImplementationCount = recentMetrics.filter(m => m.implementation === 'new').length;
    
    console.log(`New implementation usage: ${newImplementationCount}/20 (${(newImplementationCount/20*100).toFixed(1)}%)`);
    
    // Clear metrics for next phase
    router.clearMetrics();
  }
}

// Example 4: Error handling and rollback
export async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const featureFlagsService = new MockFeatureFlagsService();
  const router = getConcurrencyRouter(featureFlagsService);
  
  // Enable new implementation
  await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 100);
  
  try {
    // Simulate an operation that might fail
    await router.withMutexLock(async () => {
      console.log('Attempting risky operation...');
      
      // Simulate random failure
      if (Math.random() < 0.3) {
        throw new Error('Simulated operation failure');
      }
      
      return 'success';
    }, 'global', 'error-test-user');
    
    console.log('Operation succeeded');
  } catch (error) {
    console.log('Operation failed:', (error as Error).message);
    
    // Rollback to legacy implementation
    console.log('Rolling back to legacy implementation...');
    await featureFlagsService.rollbackFeature('utilities-concurrency-adapter');
    
    // Retry with legacy implementation
    const retryResult = await router.withMutexLock(async () => {
      console.log('Retrying with legacy implementation');
      return 'legacy-retry-success';
    }, 'global', 'error-test-user');
    
    console.log('Retry result:', retryResult);
  }
  
  // Show metrics
  const metrics = router.getMetrics();
  console.log('Error handling metrics:', metrics.map(m => ({
    implementation: m.implementation,
    success: m.success,
    operation: m.operation
  })));
}

// Example 5: Performance comparison
export async function performanceComparisonExample() {
  console.log('\n=== Performance Comparison Example ===');
  
  const featureFlagsService = new MockFeatureFlagsService();
  const router = getConcurrencyRouter(featureFlagsService);
  
  // Test legacy implementation
  console.log('Testing legacy implementation...');
  await featureFlagsService.rollbackFeature('utilities-concurrency-adapter');
  
  const legacyStart = Date.now();
  const legacyPromises = Array.from({ length: 100 }, (_, i) =>
    router.withMutexLock(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return i;
    }, 'global', `legacy-user-${i}`)
  );
  await Promise.all(legacyPromises);
  const legacyDuration = Date.now() - legacyStart;
  
  // Clear metrics
  router.clearMetrics();
  
  // Test new implementation
  console.log('Testing new implementation...');
  await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 100);
  
  const newStart = Date.now();
  const newPromises = Array.from({ length: 100 }, (_, i) =>
    router.withMutexLock(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return i;
    }, 'global', `new-user-${i}`)
  );
  await Promise.all(newPromises);
  const newDuration = Date.now() - newStart;
  
  console.log(`Legacy implementation: ${legacyDuration}ms`);
  console.log(`New implementation: ${newDuration}ms`);
  console.log(`Performance improvement: ${((legacyDuration - newDuration) / legacyDuration * 100).toFixed(1)}%`);
  
  // Get detailed performance summary
  const summary = router.getPerformanceSummary();
  console.log('Detailed performance summary:', summary);
}

// Run all examples
export async function runAllExamples() {
  try {
    await directUsageExample();
    await migrationRouterExample();
    await gradualRolloutExample();
    await errorHandlingExample();
    await performanceComparisonExample();
    
    console.log('\n=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for use in other modules
export {
  ConcurrencyAdapter,
  getConcurrencyRouter,
  globalMutex,
  apiSemaphore,
  MockFeatureFlagsService
};

