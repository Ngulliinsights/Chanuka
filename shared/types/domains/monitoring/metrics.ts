/**
 * Monitoring Domain - Metrics Types
 * Standardized monitoring types following the exemplary pattern from loading.ts
 *
 * Key features:
 * - Comprehensive metrics interfaces with proper validation
 * - Branded IDs for type safety
 * - Discriminated unions for state management
 * - Immutable data structures for safety
 */

// ============================================================================
// Core Branded Types for Monitoring
// ============================================================================

/**
 * Branded types for monitoring domain to prevent accidental type mixing
 */
export type MetricId = string & { readonly __brand: 'MetricId' };
export type MonitoringSessionId = string & { readonly __brand: 'MonitoringSessionId' };
export type PerformanceTraceId = string & { readonly __brand: 'PerformanceTraceId' };
export type ErrorEventId = string & { readonly __brand: 'ErrorEventId' };

/**
 * Utility to create branded monitoring IDs
 */
export function createBrandedMonitoringId<T extends string>(
  value: string,
  _brand: T
): string & { readonly __brand: T } {
  return value as string & { readonly __brand: T };
}

// ============================================================================
// Core Enums and Type Definitions
// ============================================================================

export type MetricType =
  | 'performance'
  | 'error'
  | 'usage'
  | 'resource'
  | 'custom'
  | 'business';

export type MetricCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'network'
  | 'cache'
  | 'queue'
  | 'external';

export type MonitoringLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type DataPointType = 'gauge' | 'counter' | 'histogram' | 'summary' | 'distribution';
export type TimeUnit = 'milliseconds' | 'seconds' | 'minutes' | 'hours';
export type SizeUnit = 'bytes' | 'kilobytes' | 'megabytes' | 'gigabytes';

// ============================================================================
// Metrics Data Interfaces with Validation
// ============================================================================

/**
 * Base interface for all metrics with common audit fields
 */
export interface BaseMetric {
  readonly id: MetricId;
  readonly type: MetricType;
  readonly category: MetricCategory;
  readonly name: string;
  readonly description?: string;
  readonly timestamp: number; // Unix timestamp in milliseconds
  readonly tags?: Readonly<Record<string, string>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Performance metric with timing data
 */
export interface PerformanceMetric extends BaseMetric {
  readonly type: 'performance';
  readonly duration: number; // in milliseconds
  readonly startTime: number;
  readonly endTime: number;
  readonly unit: TimeUnit;
  readonly operation?: string;
  readonly success: boolean;
  readonly retryCount?: number;
}

/**
 * Error metric with detailed error information
 */
export interface ErrorMetric extends BaseMetric {
  readonly type: 'error';
  readonly errorType: string;
  readonly errorCode?: string;
  readonly severity: MonitoringLevel;
  readonly stackTrace?: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly isRecoverable: boolean;
  readonly affectedUsers?: number;
}

/**
 * Resource utilization metric
 */
export interface ResourceMetric extends BaseMetric {
  readonly type: 'resource';
  readonly resourceType: 'cpu' | 'memory' | 'disk' | 'network' | 'connection';
  readonly usage: number;
  readonly maxCapacity?: number;
  readonly unit: SizeUnit | 'percent' | 'count';
  readonly threshold?: number;
  readonly isAboveThreshold?: boolean;
}

/**
 * Usage metric for tracking feature adoption
 */
export interface UsageMetric extends BaseMetric {
  readonly type: 'usage';
  readonly feature: string;
  readonly action: string;
  readonly count: number;
  readonly uniqueUsers: number;
  readonly sessionDuration?: number; // in milliseconds
}

/**
 * Business metric for KPI tracking
 */
export interface BusinessMetric extends BaseMetric {
  readonly type: 'business';
  readonly kpiName: string;
  readonly currentValue: number;
  readonly targetValue?: number;
  readonly unit: string;
  readonly trend?: 'up' | 'down' | 'stable';
  readonly percentageChange?: number;
}

/**
 * Custom metric for flexible tracking
 */
export interface CustomMetric extends BaseMetric {
  readonly type: 'custom';
  readonly dataType: DataPointType;
  readonly value: number | string | boolean;
  readonly customProperties?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Metrics Data Collection Interface
// ============================================================================

/**
 * Metrics data collection with validation
 */
export interface MetricsData<T extends BaseMetric = BaseMetric> {
  readonly metrics: readonly T[];
  readonly collectionId: MonitoringSessionId;
  readonly collectionStart: number;
  readonly collectionEnd: number;
  readonly source: string;
  readonly environment: 'development' | 'staging' | 'production' | 'test';
  readonly version: string;
  readonly validation?: {
    readonly isValid: boolean;
    readonly errors?: readonly string[];
    readonly warnings?: readonly string[];
  };
}

/**
 * Performance metrics collection
 */
export interface PerformanceMetricsData extends MetricsData<PerformanceMetric> {
  readonly metrics: readonly PerformanceMetric[];
  readonly performanceScore?: number;
  readonly baselineComparison?: {
    readonly current: number;
    readonly baseline: number;
    readonly improvement: number;
    readonly regression?: number;
  };
}

/**
 * Error metrics collection
 */
export interface ErrorMetricsData extends MetricsData<ErrorMetric> {
  readonly metrics: readonly ErrorMetric[];
  readonly errorRate: number;
  readonly criticalErrorCount: number;
  readonly recoverableErrorCount: number;
}

/**
 * Resource metrics collection
 */
export interface ResourceMetricsData extends MetricsData<ResourceMetric> {
  readonly metrics: readonly ResourceMetric[];
  readonly overallHealth: 'healthy' | 'warning' | 'critical';
  readonly criticalResources?: readonly string[];
}

// ============================================================================
// Metric Validation Interface
// ============================================================================

/**
 * Metric validation result
 */
export interface MetricValidationResult {
  readonly metricId: MetricId;
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly timestamp: number;
}

/**
 * Metrics validation summary
 */
export interface MetricsValidationSummary {
  readonly sessionId: MonitoringSessionId;
  readonly totalMetrics: number;
  readonly validMetrics: number;
  readonly invalidMetrics: number;
  readonly validationTime: number; // in milliseconds
  readonly individualResults: readonly MetricValidationResult[];
}

// ============================================================================
// Discriminated Union for Metric Actions
// ============================================================================

/**
 * Payload types for metric actions
 */
export interface CreateMetricPayload {
  readonly metric: Omit<BaseMetric, 'id' | 'timestamp'> & {
    readonly timestamp?: number;
  };
}

export interface UpdateMetricPayload {
  readonly metricId: MetricId;
  readonly updates: Partial<Omit<BaseMetric, 'id' | 'type' | 'timestamp'>>;
}

export interface DeleteMetricPayload {
  readonly metricId: MetricId;
  readonly reason?: string;
}

export interface ValidateMetricPayload {
  readonly metric: BaseMetric;
  readonly strict?: boolean;
}

/**
 * Metric action discriminated union
 */
export type MetricAction =
  | { type: 'CREATE_METRIC'; payload: CreateMetricPayload }
  | { type: 'UPDATE_METRIC'; payload: UpdateMetricPayload }
  | { type: 'DELETE_METRIC'; payload: DeleteMetricPayload }
  | { type: 'VALIDATE_METRIC'; payload: ValidateMetricPayload }
  | { type: 'COLLECT_METRICS'; payload: { sessionId: MonitoringSessionId } }
  | { type: 'EXPORT_METRICS'; payload: { format: 'json' | 'csv' | 'prometheus' } };

// ============================================================================
// Metric Error Classes
// ============================================================================

export class MetricValidationError extends Error {
  constructor(
    public readonly metricId: MetricId,
    message: string,
    public readonly field?: string,
    public readonly validationErrors?: readonly string[]
  ) {
    super(message);
    this.name = 'MetricValidationError';
    Object.setPrototypeOf(this, MetricValidationError.prototype);
  }
}

export class MetricCollectionError extends Error {
  constructor(
    public readonly sessionId: MonitoringSessionId,
    message: string,
    public readonly failedMetrics: number,
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'MetricCollectionError';
    Object.setPrototypeOf(this, MetricCollectionError.prototype);
  }
}

export class PerformanceThresholdError extends Error {
  constructor(
    public readonly metricId: MetricId,
    message: string,
    public readonly threshold: number,
    public readonly actualValue: number,
    public readonly metricName: string
  ) {
    super(message);
    this.name = 'PerformanceThresholdError';
    Object.setPrototypeOf(this, PerformanceThresholdError.prototype);
  }
}