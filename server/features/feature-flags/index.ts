// ============================================================================
// FEATURE FLAGS - Module Exports
// ============================================================================

export { FeatureFlagService } from './domain/service';
export { FeatureFlagController } from './application/controller';
export { FeatureFlagRepository } from './infrastructure/repository';
export type {
  FeatureFlagConfig,
  UserTargeting,
  ABTestConfig,
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagMetrics
} from './domain/types';

import routes from './application/routes';
export { routes as featureFlagRoutes };
