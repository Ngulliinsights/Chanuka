/**
 * Monitoring Domain - Analytics Types
 * 
 * Types for analytics, time-series data, and engagement metrics.
 * Migrated from server/features/analytics/types/
 * 
 * @module shared/types/domains/monitoring/analytics-types
 */

// ============================================================================
// Time Series and Data Points
// ============================================================================

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: Date | number;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
  total?: number;
}

// ============================================================================
// Engagement Metrics
// ============================================================================

/**
 * User engagement metrics
 */
export interface UserEngagementMetrics {
  user_id: string;
  sessionCount: number;
  totalEngagementTime: number;
  lastEngagementDate: Date;
  engagementScore: number;
  favoriteActions: Array<{ action: string; count: number }>;
  completedActions: number;
  abandonedActions: number;
  conversionRate: number;
}

// ============================================================================
// Alerts and Monitoring
// ============================================================================

/**
 * Alert notification channel
 */
export interface AlertNotificationChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty';
  config: Record<string, unknown>;
  enabled: boolean;
}

/**
 * Alert notification
 */
export interface AlertNotification {
  id: string;
  alertId: string;
  channel: AlertNotificationChannel['type'];
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  failureReason?: string;
}

// ============================================================================
// Feature Analytics
// ============================================================================

/**
 * Feature usage metrics
 */
export interface FeatureUsageMetrics {
  featureId: string;
  usageCount: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  adoptionRate: number;
  retentionRate: number;
  errorRate: number;
}

/**
 * Feature performance metrics
 */
export interface FeaturePerformanceMetrics {
  featureId: string;
  avgLoadTime: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  successRate: number;
}

/**
 * Feature health status
 */
export interface FeatureHealthStatus {
  featureId: string;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastChecked: Date;
  uptime: number;
  metrics: {
    responseTime: number;
    errorRate: number;
    usageCount: number;
  };
}
