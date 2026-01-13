/**
 * Monitoring Domain - Performance Monitoring Types
 * Specialized performance monitoring types with branded IDs and comprehensive tracking
 *
 * Key features:
 * - Performance trace types with branded IDs
 * - Web Vitals and RUM (Real User Monitoring) types
 * - Performance threshold and SLA tracking
 * - Historical performance analysis
 */

// ============================================================================
// Performance Monitoring Branded Types
// ============================================================================

/**
 * Branded types for performance monitoring
 */
export type PerformanceTraceId = string & { readonly __brand: 'PerformanceTraceId' };
export type WebVitalsId = string & { readonly __brand: 'WebVitalsId' };
export type SLAMetricId = string & { readonly __brand: 'SLAMetricId' };
export type PerformanceSessionId = string & { readonly __brand: 'PerformanceSessionId' };

/**
 * Performance trace context
 */
export interface PerformanceTraceContext {
  readonly traceId: PerformanceTraceId;
  readonly parentSpanId?: string;
  readonly spanId: string;
  readonly name: string;
  readonly startTime: number; // Unix timestamp in milliseconds
  readonly endTime?: number;
  readonly duration?: number; // in milliseconds
  readonly status?: 'started' | 'completed' | 'failed' | 'cancelled';
  readonly error?: string;
  readonly tags?: Readonly<Record<string, string>>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Web Vitals and RUM Types
// ============================================================================

export type WebVitalsMetric =
  | 'LCP' // Largest Contentful Paint
  | 'FID' // First Input Delay
  | 'CLS' // Cumulative Layout Shift
  | 'FCP' // First Contentful Paint
  | 'TTFB' // Time to First Byte
  | 'INP' // Interaction to Next Paint
  | 'TBT' // Total Blocking Time;

export interface WebVitalsData {
  readonly id: WebVitalsId;
  readonly metric: WebVitalsMetric;
  readonly value: number; // in milliseconds
  readonly rating: 'good' | 'needs-improvement' | 'poor';
  readonly timestamp: number;
  readonly pageUrl: string;
  readonly deviceType?: 'mobile' | 'desktop' | 'tablet';
  readonly connectionType?: '4g' | '3g' | '2g' | 'wifi' | 'offline';
  readonly navigationType?: 'navigate' | 'reload' | 'back-forward' | 'prerender';
  readonly userId?: string;
  readonly sessionId?: string;
}

export interface WebVitalsCollection {
  readonly sessionId: PerformanceSessionId;
  readonly pageUrl: string;
  readonly pageLoadId: string;
  readonly timestamp: number;
  readonly metrics: Readonly<Record<WebVitalsMetric, WebVitalsData>>;
  readonly overallScore: number; // 0-100
  readonly performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly userExperience: 'good' | 'moderate' | 'poor';
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export interface PerformanceMonitoringConfig {
  readonly enabled: boolean;
  readonly sampleRate: number; // 0-1 (1 = 100%)
  readonly trackWebVitals: boolean;
  readonly trackLongTasks: boolean;
  readonly trackNavigation: boolean;
  readonly trackResourceLoading: boolean;
  readonly trackMemory: boolean;
  readonly reportInterval: number; // in milliseconds
  readonly maxBatchSize: number;
  readonly endpoint?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface PerformanceThreshold {
  readonly metric: WebVitalsMetric | string;
  readonly threshold: number;
  readonly comparison: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly notification?: {
    readonly channels: ('email' | 'slack' | 'pagerduty' | 'sms')[];
    readonly messageTemplate?: string;
  };
}

export interface PerformanceSLA {
  readonly id: SLAMetricId;
  readonly name: string;
  readonly description: string;
  readonly metric: WebVitalsMetric | string;
  readonly target: number;
  readonly timeWindow: '1h' | '6h' | '12h' | '24h' | '7d' | '30d';
  readonly complianceThreshold: number; // percentage (0-100)
  readonly currentCompliance: number; // percentage (0-100)
  readonly status: 'meeting' | 'at-risk' | 'violating';
  readonly lastUpdated: number;
  readonly nextReview: number;
}

// ============================================================================
// Real User Monitoring (RUM) Types
// ============================================================================

export interface RUMSession {
  readonly sessionId: PerformanceSessionId;
  readonly userId?: string;
  readonly anonymousId: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly duration?: number; // in milliseconds
  readonly pageViews: number;
  readonly interactions: number;
  readonly errors: number;
  readonly device: {
    readonly type: 'mobile' | 'desktop' | 'tablet' | 'other';
    readonly os?: string;
    readonly browser?: string;
    readonly screenResolution?: string;
  };
  readonly network: {
    readonly effectiveType?: string;
    readonly rtt?: number; // round-trip time
    readonly downlink?: number; // in Mbps
  };
  readonly location?: {
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
  };
}

export interface RUMInteraction {
  readonly interactionId: string;
  readonly sessionId: PerformanceSessionId;
  readonly type: 'click' | 'scroll' | 'form' | 'navigation' | 'custom';
  readonly target: string;
  readonly timestamp: number;
  readonly duration: number; // in milliseconds
  readonly success: boolean;
  readonly error?: string;
  readonly customData?: Readonly<Record<string, unknown>>;
}

export interface RUMPageView {
  readonly viewId: string;
  readonly sessionId: PerformanceSessionId;
  readonly pageUrl: string;
  readonly referrer?: string;
  readonly timestamp: number;
  readonly loadTime: number; // in milliseconds
  readonly domContentLoadedTime: number; // in milliseconds
  readonly timeToFirstByte: number; // in milliseconds
  readonly resourcesLoaded: number;
  readonly resourceLoadTime: number; // in milliseconds
  readonly isBounce: boolean;
  readonly bounceDuration?: number; // in milliseconds
}

// ============================================================================
// Performance Analysis Types
// ============================================================================

export interface PerformanceTrendAnalysis {
  readonly metric: WebVitalsMetric | string;
  readonly timeRange: '7d' | '30d' | '90d' | '180d' | '365d';
  readonly dataPoints: readonly {
    readonly timestamp: number;
    readonly value: number;
    readonly sampleSize: number;
  }[];
  readonly trend: 'improving' | 'declining' | 'stable' | 'volatile';
  readonly percentageChange: number;
  readonly averageValue: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly standardDeviation: number;
}

export interface PerformanceComparison {
  readonly metric: WebVitalsMetric | string;
  readonly currentPeriod: {
    readonly start: number;
    readonly end: number;
    readonly average: number;
    readonly median: number;
    readonly p90: number;
    readonly sampleSize: number;
  };
  readonly previousPeriod: {
    readonly start: number;
    readonly end: number;
    readonly average: number;
    readonly median: number;
    readonly p90: number;
    readonly sampleSize: number;
  };
  readonly improvement: number; // percentage
  readonly regression?: number; // percentage
  readonly statisticalSignificance: 'high' | 'medium' | 'low' | 'none';
}

export interface PerformanceAnomaly {
  readonly anomalyId: string;
  readonly metric: WebVitalsMetric | string;
  readonly detectedAt: number;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly expectedRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly actualValue: number;
  readonly deviation: number; // standard deviations from mean
  readonly duration: number; // in milliseconds
  readonly affectedUsers: number;
  readonly rootCause?: string;
  readonly resolved?: boolean;
  readonly resolvedAt?: number;
  readonly resolvedBy?: string;
}

// ============================================================================
// Performance Monitoring Actions
// ============================================================================

export interface StartPerformanceTracePayload {
  readonly traceId: PerformanceTraceId;
  readonly name: string;
  readonly parentSpanId?: string;
  readonly tags?: Readonly<Record<string, string>>;
}

export interface EndPerformanceTracePayload {
  readonly traceId: PerformanceTraceId;
  readonly spanId: string;
  readonly endTime: number;
  readonly status?: 'completed' | 'failed' | 'cancelled';
  readonly error?: string;
}

export interface ReportWebVitalsPayload {
  readonly sessionId: PerformanceSessionId;
  readonly pageUrl: string;
  readonly metrics: Readonly<Record<WebVitalsMetric, WebVitalsData>>;
  readonly userId?: string;
}

export interface CheckPerformanceSLAPayload {
  readonly slaId: SLAMetricId;
  readonly currentValue: number;
  readonly timestamp: number;
}

/**
 * Performance monitoring action discriminated union
 */
export type PerformanceMonitoringAction =
  | { type: 'START_TRACE'; payload: StartPerformanceTracePayload }
  | { type: 'END_TRACE'; payload: EndPerformanceTracePayload }
  | { type: 'REPORT_WEB_VITALS'; payload: ReportWebVitalsPayload }
  | { type: 'START_RUM_SESSION'; payload: { sessionId: PerformanceSessionId; userId?: string } }
  | { type: 'END_RUM_SESSION'; payload: { sessionId: PerformanceSessionId; endTime: number } }
  | { type: 'RECORD_INTERACTION'; payload: RUMInteraction }
  | { type: 'RECORD_PAGE_VIEW'; payload: RUMPageView }
  | { type: 'CHECK_SLA'; payload: CheckPerformanceSLAPayload }
  | { type: 'ANALYZE_TRENDS'; payload: { metric: WebVitalsMetric | string; timeRange: string } };

// ============================================================================
// Performance Error Classes
// ============================================================================

export class PerformanceSLAViolationError extends Error {
  constructor(
    public readonly slaId: SLAMetricId,
    message: string,
    public readonly metric: WebVitalsMetric | string,
    public readonly target: number,
    public readonly actual: number,
    public readonly compliance: number
  ) {
    super(message);
    this.name = 'PerformanceSLAViolationError';
    Object.setPrototypeOf(this, PerformanceSLAViolationError.prototype);
  }
}

export class PerformanceThresholdBreachError extends Error {
  constructor(
    public readonly traceId: PerformanceTraceId,
    message: string,
    public readonly metric: WebVitalsMetric | string,
    public readonly threshold: number,
    public readonly actualValue: number,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(message);
    this.name = 'PerformanceThresholdBreachError';
    Object.setPrototypeOf(this, PerformanceThresholdBreachError.prototype);
  }
}

export class RUMSessionError extends Error {
  constructor(
    public readonly sessionId: PerformanceSessionId,
    message: string,
    public readonly errorType: 'tracking_failed' | 'data_loss' | 'sampling_error' | 'configuration_error',
    public readonly metadata?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = 'RUMSessionError';
    Object.setPrototypeOf(this, RUMSessionError.prototype);
  }
}