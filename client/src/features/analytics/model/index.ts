/**
 * Analytics Model Layer
 *
 * Centralized exports for analytics domain models and services
 */

export { errorAnalyticsBridge } from './error-analytics-bridge';
export { privacyAnalyticsService } from './privacy-analytics';
export { offlineAnalyticsManager } from './offline-analytics';
export { userJourneyTracker } from './user-journey-tracker';

export type {
  CoreError,
  DashboardFilters,
  ErrorOverviewMetrics,
  TimeSeriesDataPoint,
  ErrorPattern,
  RecoveryAnalytics,
  RealTimeMetrics,
  Alert,
  TimeRange,
  ErrorTrendData,
} from './error-analytics-bridge';

export type {
  AnalyticsEvent,
  AnalyticsConfig,
  UserConsent,
  AnalyticsMetrics,
  ExportedUserData,
  DeleteResult,
} from './privacy-analytics';

export type {
  OfflineEvent,
  OfflineAnalyticsReport,
} from './offline-analytics';

export type {
  UserRole,
  NavigationSection,
  JourneyStep,
  UserJourney,
  JourneyAnalytics,
  PathAnalytics,
  DropOffPoint,
  ConversionFunnel,
} from './user-journey-tracker';
