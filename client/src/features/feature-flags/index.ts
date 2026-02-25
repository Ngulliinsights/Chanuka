// ============================================================================
// FEATURE FLAGS - Public API
// ============================================================================

export { FeatureFlagsPage } from './pages/feature-flags';
export { FlagList } from './ui/FlagList';
export { FlagEditor } from './ui/FlagEditor';
export { RolloutControls } from './ui/RolloutControls';
export { FlagAnalyticsDashboard } from './ui/FlagAnalyticsDashboard';

export {
  useFeatureFlags,
  useFeatureFlag,
  useFlagAnalytics,
  useCreateFlag,
  useUpdateFlag,
  useDeleteFlag,
  useToggleFlag,
  useUpdateRollout,
} from './hooks/useFeatureFlags';

export type {
  FeatureFlag,
  UserTargeting,
  ABTestConfig,
  FlagAnalytics,
  CreateFlagRequest,
  UpdateFlagRequest,
} from './types';
