/**
 * Analytics Sub-module
 * 
 * Provides user behavior tracking and analytics event collection.
 * 
 * Requirements: 3.1, 11.4
 */

// Re-export from analytics module for now
// These will be gradually migrated to the new structure
export {
  ComprehensiveAnalyticsTracker,
  AnalyticsProvider,
  useAnalyticsContext,
  withAnalytics,
  AnalyticsStatus,
  initializeAnalytics,
  ANALYTICS_CONFIG,
} from '@client/infrastructure/analytics';

export type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsDashboardData,
  PagePerformanceMetrics,
  UserEngagementMetrics,
} from '@client/infrastructure/analytics/comprehensive-tracker';

/**
 * Track an analytics event
 * Requirements: 11.4
 */
export function trackEvent(event: {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}): void {
  const tracker = ComprehensiveAnalyticsTracker.getInstance();
  
  tracker.trackEvent({
    type: 'custom' as any,
    name: event.name,
    timestamp: event.timestamp || new Date(),
    properties: event.properties,
    userId: event.userId,
    sessionId: event.sessionId,
  });
}

/**
 * Initialize analytics with configuration
 */
export function initializeAnalyticsTracking(config: {
  enabled?: boolean;
  debugMode?: boolean;
  flushInterval?: number;
  enablePerformanceTracking?: boolean;
  enableErrorTracking?: boolean;
  enableJourneyTracking?: boolean;
}): void {
  if (!config.enabled) {
    return;
  }

  initializeAnalytics(config);
}
