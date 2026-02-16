/**
 * Dashboard Metrics Types - Standardized metrics and statistics
 *
 * Defines all metrics-related types used across dashboard implementations.
 *
 * @module shared/types/dashboard/dashboard-metrics
 */

/**
 * Time range for metrics filtering
 *
 * @example
 * const range: DateRange = {
 *   start: new Date('2026-01-01'),
 *   end: new Date('2026-01-13')
 * };
 */
export interface DateRange {
  /** Start date (inclusive) */
  start: Date;
  /** End date (inclusive) */
  end: Date;
}

/**
 * Basic metric with label and value
 *
 * @example
 * const metric: Metric = {
 *   label: 'Total Users',
 *   value: 1234,
 *   unit: 'users'
 * };
 */
export interface Metric {
  /** Metric identifier */
  id?: string;
  /** Display label */
  label: string;
  /** Metric value */
  value: number | string;
  /** Unit of measurement */
  unit?: string;
  /** Comparison to previous period */
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  /** Trend indicator (up, down, stable) */
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Time-series data point
 *
 * @example
 * const point: TimeSeriesPoint = {
 *   timestamp: new Date(),
 *   value: 100,
 *   label: '2026-01-13'
 * };
 */
export interface TimeSeriesPoint {
  /** Timestamp of the data point */
  timestamp: Date;
  /** Numeric value */
  value: number;
  /** Optional label */
  label?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Time series data with metadata
 *
 * @example
 * const series: TimeSeries = {
 *   id: 'revenue',
 *   label: 'Revenue',
 *   points: [ ... ],
 *   unit: 'USD'
 * };
 */
export interface TimeSeries {
  /** Series identifier */
  id: string;
  /** Display label */
  label: string;
  /** Data points */
  points: TimeSeriesPoint[];
  /** Unit of measurement */
  unit?: string;
  /** Color for visualization */
  color?: string;
  /** Aggregation method */
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

/**
 * Category-based metric data
 *
 * @example
 * const category: CategoryMetric = {
 *   label: 'Product A',
 *   value: 500,
 *   percentage: 25
 * };
 */
export interface CategoryMetric {
  /** Category identifier */
  id?: string;
  /** Category label */
  label: string;
  /** Metric value */
  value: number;
  /** Percentage of total */
  percentage?: number;
  /** Color for visualization */
  color?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Demographic breakdown data
 *
 * @example
 * const demo: DemographicData = {
 *   ageGroups: { '18-25': 100, '26-35': 200 },
 *   locations: { 'US': 500, 'UK': 250 }
 * };
 */
export interface DemographicData {
  /** Age group distribution */
  ageGroups?: Record<string, number>;
  /** Geographic distribution */
  locations?: Record<string, number>;
  /** Gender distribution */
  gender?: Record<string, number>;
  /** Device type distribution */
  devices?: Record<string, number>;
  /** Custom demographic fields */
  custom?: Record<string, Record<string, number>>;
}

/**
 * Engagement metrics
 *
 * @example
 * const engagement: EngagementMetrics = {
 *   activeUsers: 500,
 *   sessions: 1000,
 *   avgSessionDuration: 300,
 *   bounceRate: 25
 * };
 */
export interface EngagementMetrics {
  /** Number of active users */
  activeUsers: number;
  /** Number of sessions */
  sessions: number;
  /** Average session duration in seconds */
  avgSessionDuration: number;
  /** Bounce rate percentage */
  bounceRate: number;
  /** Click-through rate */
  clickThroughRate?: number;
  /** Conversion metrics */
  conversions?: {
    count: number;
    rate: number;
    value?: number;
  };
}

/**
 * Performance metrics
 *
 * @example
 * const perf: PerformanceMetrics = {
 *   pageLoadTime: 1500,
 *   firstContentfulPaint: 800,
 *   timeToInteractive: 2000
 * };
 */
export interface PerformanceMetrics {
  /** Page load time in milliseconds */
  pageLoadTime: number;
  /** First contentful paint time */
  firstContentfulPaint?: number;
  /** Time to interactive */
  timeToInteractive?: number;
  /** Cumulative layout shift */
  cumulativeLayoutShift?: number;
  /** Core web vitals scores */
  coreWebVitals?: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  /** API response time in milliseconds */
  apiResponseTime?: number;
  /** Error rate percentage */
  errorRate?: number;
}

/**
 * Comparison data for before/after analysis
 *
 * @example
 * const comparison: MetricsComparison = {
 *   current: { label: 'This Month', value: 1000 },
 *   previous: { label: 'Last Month', value: 900 },
 *   change: { value: 100, percentage: 11.1, direction: 'up' }
 * };
 */
export interface MetricsComparison {
  /** Current period metrics */
  current: Metric;
  /** Previous period metrics for comparison */
  previous: Metric;
  /** Change between periods */
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

/**
 * Aggregated metrics summary
 *
 * @example
 * const summary: MetricsSummary = {
 *   period: { ... },
 *   metrics: [ ... ],
 *   totals: { ... },
 *   trends: [ ... ]
 * };
 */
export interface MetricsSummary {
  /** Reporting period */
  period: DateRange;
  /** Key metrics */
  metrics: Metric[];
  /** Aggregated totals */
  totals: Record<string, number>;
  /** Trends data */
  trends?: TimeSeries[];
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * KPI (Key Performance Indicator) definition
 *
 * @example
 * const kpi: KPIDefinition = {
 *   id: 'revenue',
 *   label: 'Monthly Revenue',
 *   unit: 'USD',
 *   target: 100000,
 *   warning: 80000,
 *   critical: 50000
 * };
 */
export interface KPIDefinition {
  /** KPI identifier */
  id: string;
  /** Display label */
  label: string;
  /** Unit of measurement */
  unit?: string;
  /** Target value */
  target?: number;
  /** Warning threshold */
  warning?: number;
  /** Critical threshold */
  critical?: number;
  /** Current value */
  current?: number;
  /** Status (ok, warning, critical) */
  status?: 'ok' | 'warning' | 'critical';
}

/**
 * Type guard for TimeSeries
 *
 * @example
 * if (isTimeSeries(obj)) {
 *   // obj is TimeSeries
 * }
 */
export function isTimeSeries(value: unknown): value is TimeSeries {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.label === 'string' &&
    Array.isArray(obj.points)
  );
}

/**
 * Type guard for AnalyticsMetrics
 *
 * @example
 * if (isAnalyticsMetrics(obj)) {
 *   // obj is AnalyticsMetrics
 * }
 */
export function isAnalyticsMetrics(value: unknown): value is AnalyticsMetrics {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.period !== undefined &&
    typeof obj.totalUsers === 'number' &&
    typeof obj.activeUsers === 'number'
  );
}
