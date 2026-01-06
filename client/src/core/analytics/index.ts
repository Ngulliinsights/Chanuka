/**
 * Core Analytics Module
 *
 * Comprehensive analytics tracking system for user journey tracking,
 * performance monitoring, and engagement analytics across all personas
 *
 * Requirements: 11.1, 11.2, 11.3
 */

// Main analytics tracker
export { ComprehensiveAnalyticsTracker } from './comprehensive-tracker';
export { useComprehensiveAnalytics } from '@client/features/analytics/hooks/use-comprehensive-analytics';
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsDashboardData,
  PagePerformanceMetrics,
  UserEngagementMetrics,
} from './comprehensive-tracker';

// Analytics provider
export {
  AnalyticsProvider,
  useAnalyticsContext,
  withAnalytics,
  AnalyticsStatus,
} from './AnalyticsProvider';

// Re-export existing analytics infrastructure
export { analyticsApiService } from '@client/core/api/analytics';
export { UserJourneyTracker } from '@client/services/UserJourneyTracker';
export { PerformanceMonitor } from '@client/core/performance/monitor';
export { ErrorAnalyticsService } from '@client/core/error/analytics';

// Re-export analytics hooks
export {
  useComprehensiveAnalytics,
  useInteractionTracking,
  useFormTracking,
  useSearchTracking,
} from '@client/features/analytics/hooks/use-comprehensive-analytics';

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
} from '@client/features/analytics/hooks/useAnalytics';

export {
  useJourneyTracker,
  useJourneyAnalytics,
} from '@client/features/analytics/hooks/use-journey-tracker';

export {
  useWebVitals,
  getPerformanceRating,
  usePerformanceBudget,
} from '@client/features/analytics/hooks/use-web-vitals';

// Analytics UI components
export { default as AnalyticsDashboard } from '@client/features/analytics/ui/dashboard/AnalyticsDashboard';

// Analytics types
export type {
  BillAnalytics,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  EngagementReport,
  ConflictReport,
  UserActivity,
  AnalyticsAlert,
} from '@client/features/analytics/types';

export type {
  JourneyStep,
  UserJourney,
  JourneyAnalytics,
  PathAnalytics,
  DropOffPoint,
  ConversionFunnel,
  JourneyOptimization,
} from '@client/services/UserJourneyTracker';

export type {
  WebVitalsMetrics,
  WebVitalsHookOptions,
} from '@client/features/analytics/hooks/use-web-vitals';

export type {
  PerformanceMetric,
  WebVitalsMetric,
  PerformanceStats,
  PerformanceAlert,
  PerformanceConfig,
} from '@client/core/performance/types';

/**
 * Analytics initialization utility
 *
 * Provides a simple way to initialize the comprehensive analytics system
 * with default configuration suitable for most use cases
 */
export const initializeAnalytics = (config?: {
  enabled?: boolean;
  debugMode?: boolean;
  flushInterval?: number;
  enablePerformanceTracking?: boolean;
  enableErrorTracking?: boolean;
  enableJourneyTracking?: boolean;
}) => {
  const tracker = ComprehensiveAnalyticsTracker.getInstance();

  if (config?.enabled !== undefined) {
    tracker.setEnabled(config.enabled);
  }

  return tracker;
};

/**
 * Analytics configuration constants
 */
export const ANALYTICS_CONFIG = {
  DEFAULT_FLUSH_INTERVAL: 30000, // 30 seconds
  MAX_EVENTS_IN_MEMORY: 1000,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  PERFORMANCE_THRESHOLDS: {
    PAGE_LOAD_TIME: 3000, // 3 seconds
    FIRST_CONTENTFUL_PAINT: 1800, // 1.8 seconds
    LARGEST_CONTENTFUL_PAINT: 2500, // 2.5 seconds
    FIRST_INPUT_DELAY: 100, // 100ms
    CUMULATIVE_LAYOUT_SHIFT: 0.1,
  },
  PERSONA_CONFIGS: {
    PUBLIC: {
      trackingEnabled: true,
      detailedMetrics: false,
      realTimeUpdates: false,
    },
    CITIZEN: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
    },
    EXPERT: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
    },
    ADMIN: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
    },
  },
} as const;
