/**
 * Analytics Types
 * Complete type definitions for analytics feature
 */

/**
 * Bill analytics data
 */
export interface BillAnalytics {
  billId: string;
  views: number;
  engagements: number;
  shares: number;
  comments: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  trendingScore: number;
}

/**
 * Filters for analytics queries
 */
export interface AnalyticsFilters {
  dateRange?: { start: Date; end: Date };
  billIds?: string[];
  userIds?: string[];
  eventTypes?: string[];
}

/**
 * Summary of analytics data
 */
export interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  topBills: BillAnalytics[];
  engagementRate: number;
  period: { start: Date; end: Date };
}

/**
 * Dashboard data containing all analytics information
 */
export interface DashboardData {
  summary: AnalyticsSummary;
  charts: ChartData[];
  metrics: MetricData[];
  alerts: AnalyticsAlert[];
}

/**
 * Chart data for visualizations
 */
export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
    }>;
  };
  options?: Record<string, unknown>;
}

/**
 * Metric data for display
 */
export interface MetricData {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  changePercentage?: number;
  icon?: string;
  color?: string;
}

/**
 * Engagement report for a specific user and bill
 */
export interface EngagementReport {
  userId: string;
  billId: string;
  engagementType: 'view' | 'comment' | 'share' | 'vote';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Conflict report for bills
 */
export interface ConflictReport {
  billId: string;
  conflictType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
}

/**
 * Generic analytics response wrapper
 */
export interface AnalyticsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * User activity tracking
 */
export interface UserActivity {
  userId: string;
  activityType: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * Analytics alert for anomalies and thresholds
 */
export interface AnalyticsAlert {
  id: string;
  type: 'anomaly' | 'threshold' | 'trend';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Page view data
 */
export interface PageViewData {
  path: string;
  title: string;
  userId?: string;
  timestamp: Date;
  referrer?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * User action tracking
 */
export interface UserAction {
  actionType: string;
  actionName: string;
  userId?: string;
  targetId?: string;
  targetType?: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
}

/**
 * Performance metrics for tracking
 */
export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  loadTime?: number;
  timestamp: Date;
  page?: string;
}

/**
 * Error data for tracking
 */
export interface ErrorData {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  userId?: string;
  page?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

/**
 * User properties for analytics
 */
export interface UserProperties {
  userId: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Session properties for analytics
 */
export interface SessionProperties {
  sessionId: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Tracking result from analytics operations
 */
export interface TrackingResult {
  tracked: boolean;
  eventId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update result from analytics operations
 */
export interface UpdateResult {
  updated: boolean;
  timestamp: number;
}
