// ============================================================================
// CONSTITUTIONAL ANALYSIS - Router Test
// ============================================================================
// Simple test to verify the router compiles and works

import { constitutionalAnalysisRouter } from '@server/features/constitutional-analysis/presentation/constitutional-analysis-router.ts';

console.log('✅ Constitutional analysis router loaded successfully');
console.log('Router has', Object.keys(constitutionalAnalysisRouter.stack || []).length, 'routes');

// Test that the router is properly exported
if (typeof constitutionalAnalysisRouter === 'function') {
  console.log('✅ Router is a valid Express router');
} else {
  console.log('❌ Router is not a valid Express router');
}

export { constitutionalAnalysisRouter };


