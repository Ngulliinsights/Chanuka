/**
 * Analytics Feature
 *
 * Business logic layer for analytics - dashboards, reports, scoring, and analysis
 * For core tracking infrastructure, see @client/infrastructure/analytics
 */

// Business logic models
export * from './model';

// Analytics hooks
export {
  useComprehensiveAnalytics,
  useInteractionTracking,
  useFormTracking,
  useSearchTracking,
} from './hooks/use-comprehensive-analytics';

export {
  useAnalyticsDashboard,
  useAnalyticsSummary,
  useBillAnalytics,
  useEngagementReport,
  useConflictReport,
  useTopBills,
  useUserActivity,
  useAnalyticsAlerts,
  useTrendingTopics,
  useStakeholderAnalysis,
  useRealtimeAnalytics,
  useAnalyticsExport,
} from './hooks/use-analytics';

export {
  useJourneyTracker,
  useJourneyAnalytics,
} from './hooks/use-journey-tracker';

export {
  useWebVitals,
  getPerformanceRating,
  usePerformanceBudget,
} from './hooks/use-web-vitals';

export { useErrorAnalytics } from './hooks/use-error-analytics';
export { useRenderTracker } from './hooks/use-render-tracker';

// Services
export * from './services';
export { analyticsApiService } from './services/api';

// Analytics UI components
export { default as AnalyticsDashboard } from './ui/dashboard/AnalyticsDashboard';
export { default as EngagementAnalyticsDashboard } from './ui/dashboard/EngagementAnalyticsDashboard';

// Analytics types (re-export from lib for convenience)
export type {
  BillAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  EngagementReport,
  ConflictReport,
  UserActivity,
  AnalyticsAlert,
} from '@client/lib/types/analytics';

export type {
  JourneyStep,
  UserJourney,
  JourneyAnalytics,
  PathAnalytics,
  DropOffPoint,
  ConversionFunnel,
} from './model/user-journey-tracker';

export type {
  WebVitalsMetrics,
  WebVitalsHookOptions,
} from './hooks/use-web-vitals';
