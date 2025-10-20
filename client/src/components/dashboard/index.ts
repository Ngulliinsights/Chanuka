/**
 * Dashboard component barrel exports
 * Following navigation component export patterns
 */

// Main components
export { ActivitySummary } from './activity-summary';
export { ActionItems } from './action-items';
export { TrackedTopics } from './tracked-topics';

// Types
export type {
  DashboardSection,
  ActionPriority,
  TopicCategory,
  ActionItem,
  ActivitySummary as ActivitySummaryType,
  TrackedTopic,
  DashboardData,
  DashboardConfig,
  DashboardComponentProps,
  UseDashboardResult
} from './types';

// Hooks
export {
  useDashboard,
  useDashboardActions,
  useDashboardTopics,
  useDashboardConfig
} from './hooks';

// Validation utilities
export {
  validateActionItem,
  validateActivitySummary,
  validateTrackedTopic,
  validateDashboardConfig,
  validateDashboardData,
  safeValidateActionItem,
  safeValidateTrackedTopic,
  safeValidateDashboardConfig
} from './validation';

// Error classes
export {
  DashboardError,
  DashboardDataFetchError,
  DashboardValidationError,
  DashboardConfigurationError,
  DashboardActionError,
  DashboardTopicError,
  DashboardErrorType
} from './errors';

// Recovery utilities
export {
  getRecoveryStrategy,
  executeRecovery,
  formatRecoverySuggestions
} from './recovery';