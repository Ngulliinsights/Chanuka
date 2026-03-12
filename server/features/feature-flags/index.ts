// ============================================================================
// FEATURE FLAGS - Module Exports
// ============================================================================

export { FeatureFlagService } from './domain/service';
export { FeatureFlagController } from './presentation/http/controller';
export { FeatureFlagRepository } from './infrastructure/repository';
export type {
  FeatureFlagConfig,
  UserTargeting,
  ABTestConfig,
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagMetrics
} from './domain/types';

import routes from './presentation/http/routes';
export { routes as featureFlagRoutes };
