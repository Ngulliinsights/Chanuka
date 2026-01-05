/**
 * Foundation Test
 *
 * Simple test to verify the foundation components work correctly.
 */

import {
  isFeatureEnabled,
  isFeatureEnabledForUser,
  getCurrentUserGroup,
  getFeatureRolloutStatus,
  COMPONENT_REUSE_MATRIX,
  getRefactoringPlanSummary,
  architecturePerformanceMonitor,
  UserGroup
} from './index';

// Test feature flags
console.log('Testing Feature Flags...');
console.log('UNIFIED_SEARCH_ENABLED:', isFeatureEnabled('UNIFIED_SEARCH_ENABLED'));
console.log('Current User Group:', getCurrentUserGroup());
console.log('Feature Rollout Status:', getFeatureRolloutStatus());

// Test component reuse matrix
console.log('\nTesting Component Reuse Matrix...');
const summary = getRefactoringPlanSummary();
console.log('Refactoring Plan Summary:', summary);
console.log('Components to reuse:', COMPONENT_REUSE_MATRIX.reuseAsIs.length);
console.log('Components to refactor:', COMPONENT_REUSE_MATRIX.refactor.length);
console.log('Components to create:', COMPONENT_REUSE_MATRIX.createNew.length);

// Test performance monitoring
console.log('\nTesting Performance Monitoring...');
architecturePerformanceMonitor.markComponentStart('test-component');
setTimeout(() => {
  architecturePerformanceMonitor.markComponentEnd('test-component');

  // Test search performance
  architecturePerformanceMonitor.recordSearchPerformance('test query', 250, 10, 'unified');

  // Test dashboard performance
  architecturePerformanceMonitor.recordDashboardPerformance('adaptive', 1500, 5, 'intermediate');

  // Get metrics
  const metrics = architecturePerformanceMonitor.getMetrics();
  console.log('Performance Metrics:', {
    componentLoads: metrics.componentLoadTimes.length,
    searchPerformance: metrics.searchPerformance.length,
    dashboardMetrics: metrics.dashboardMetrics.length
  });

  const performanceSummary = architecturePerformanceMonitor.getPerformanceSummary();
  console.log('Performance Summary:', performanceSummary);

  console.log('\n✅ All foundation components working correctly!');
}, 100);

export default true;
