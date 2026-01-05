/**
 * Client Architecture Foundation
 *
 * Exports all foundation components and utilities for the client architecture refinement.
 */

// Feature Flags
export {
  FEATURE_FLAGS,
  ROLLOUT_CONFIG,
  UserGroup,
  isFeatureEnabled,
  isFeatureEnabledForUser,
  getCurrentUserGroup,
  getAllFeatureFlags,
  getFeatureRolloutStatus,
  type FeatureFlagKey,
  type RolloutConfigKey
} from '../../config/feature-flags';

// Component Reuse Matrix
export {
  COMPONENT_REUSE_MATRIX,
  getComponentsByStatus,
  getComponentsByQuality,
  findComponentByPath,
  getRefactoringPlanSummary,
  type ComponentReuseEntry,
  type ComponentReuseMatrix
} from './component-reuse-matrix';

// Performance Monitoring
export {
  default as ArchitecturePerformanceMonitor,
  architecturePerformanceMonitor,
  type ArchitectureMetrics,
  type RouteTransitionMetric,
  type ComponentLoadMetric,
  type UserJourneyMetric,
  type SearchPerformanceMetric,
  type DashboardMetric,
  type NavigationMetric,
  type PerformanceThresholds
} from '../performance/architecture-performance-monitor';

// Performance Hooks
export {
  useArchitecturePerformance,
  useRoutePerformance,
  useSearchPerformance,
  useDashboardPerformance,
  useUserJourney,
  useNavigationPerformance
} from '../../hooks/use-architecture-performance';

// Demo Component (for development and testing) - commented out due to JSX compilation issues
// export { FoundationDemo } from './foundation-demo';
