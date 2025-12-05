/**
 * Performance System Types
 * 
 * Comprehensive type definitions for the performance monitoring system including
 * metrics, budgets, Web Vitals, alerts, and optimization suggestions.
 */

/**
 * Performance metric measurement
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  url?: string;
  category: 'loading' | 'interactivity' | 'visual-stability' | 'custom' | 'network' | 'memory';
  metadata?: Record<string, unknown>;
}

/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
  metric: string;
  budget: number;
  warning: number;
  description?: string;
  category?: string;
}

/**
 * Web Vitals metric with rating
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: Date;
  url?: string;
  metadata?: {
    element?: string;
    attribution?: Record<string, unknown>;
  };
}

/**
 * Performance alert with severity classification
 */
export interface PerformanceAlert {
  id: string;
  type: 'budget-exceeded' | 'slow-metric' | 'memory-leak' | 'network-slow' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  url?: string;
  resolved?: boolean;
  resolvedAt?: Date;
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  id: string;
  type: 'image' | 'script' | 'style' | 'network' | 'memory' | 'cache' | 'bundle' | 'lazy-loading';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement?: string;
  resources?: string[];
  applied?: boolean;
  appliedAt?: Date;
}

/**
 * Budget check result
 */
export interface BudgetCheckResult {
  status: 'pass' | 'warning' | 'fail';
  budget?: PerformanceBudget;
  message: string;
  exceedancePercentage?: number;
  recommendations?: string[];
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enabled: boolean;
  webVitals: {
    enabled: boolean;
    reportingThreshold: number;
    sampleRate: number;
  };
  budgets: {
    enabled: boolean;
    checkInterval: number;
  };
  alerts: {
    enabled: boolean;
    maxAlerts: number;
    retentionMs: number;
    externalReporting: boolean;
  };
  optimization: {
    enabled: boolean;
    autoAnalysis: boolean;
    analysisInterval: number;
  };
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  totalMetrics: number;
  totalAlerts: number;
  totalSuggestions: number;
  averageLoadTime: number;
  webVitalsScores: {
    lcp: { value: number; rating: string };
    fid: { value: number; rating: string };
    cls: { value: number; rating: string };
    fcp: { value: number; rating: string };
    ttfb: { value: number; rating: string };
    inp: { value: number; rating: string };
  };
  budgetCompliance: {
    passing: number;
    warning: number;
    failing: number;
  };
  lastAnalysis?: Date;
}

/**
 * Resource timing information
 */
export interface ResourceTiming {
  name: string;
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'other';
  size: number;
  duration: number;
  startTime: number;
  endTime: number;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: Date;
}

/**
 * Network information
 */
export interface NetworkInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  timestamp: Date;
}

/**
 * Performance observer configuration
 */
export interface ObserverConfig {
  type: 'navigation' | 'resource' | 'paint' | 'largest-contentful-paint' | 'first-input' | 'layout-shift' | 'longtask';
  buffered?: boolean;
  entryTypes?: string[];
}

/**
 * Performance event listener
 */
export type PerformanceEventListener = (metric: PerformanceMetric) => void;

/**
 * Alert event listener
 */
export type AlertEventListener = (alert: PerformanceAlert) => void;

/**
 * Optimization event listener
 */
export type OptimizationEventListener = (suggestion: OptimizationSuggestion) => void;

/**
 * Performance monitoring events
 */
export interface PerformanceEvents {
  'metric-recorded': PerformanceMetric;
  'alert-created': PerformanceAlert;
  'budget-exceeded': { metric: PerformanceMetric; budget: PerformanceBudget };
  'suggestion-generated': OptimizationSuggestion;
  'web-vital-measured': WebVitalsMetric;
  'analysis-completed': { suggestions: OptimizationSuggestion[]; timestamp: Date };
}

/**
 * Performance error types
 */
export type PerformanceErrorCode = 
  | 'OBSERVER_NOT_SUPPORTED'
  | 'METRIC_COLLECTION_FAILED'
  | 'BUDGET_VALIDATION_FAILED'
  | 'ALERT_CREATION_FAILED'
  | 'ANALYSIS_FAILED'
  | 'EXTERNAL_REPORTING_FAILED';

/**
 * Performance error with context
 */
export interface PerformanceError extends Error {
  code: PerformanceErrorCode;
  context?: Record<string, unknown>;
  recoverable?: boolean;
}

/**
 * Long task information
 */
export interface LongTask {
  name: string;
  duration: number;
  startTime: number;
  attribution?: Array<{
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }>;
}

/**
 * Paint timing information
 */
export interface PaintTiming {
  name: 'first-paint' | 'first-contentful-paint';
  startTime: number;
  timestamp: Date;
}

/**
 * Navigation timing information
 */
export interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToFirstByte: number;
}

/**
 * Performance monitoring session
 */
export interface PerformanceSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  url: string;
  userAgent: string;
  metrics: PerformanceMetric[];
  webVitals: WebVitalsMetric[];
  alerts: PerformanceAlert[];
  suggestions: OptimizationSuggestion[];
  navigationTiming?: NavigationTiming;
  resourceTimings: ResourceTiming[];
  memoryUsage: MemoryUsage[];
  networkInfo?: NetworkInfo;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  sessionId: string;
  timestamp: Date;
  url: string;
  summary: {
    overallScore: number;
    loadTime: number;
    interactivityScore: number;
    visualStabilityScore: number;
  };
  webVitals: WebVitalsMetric[];
  budgetResults: BudgetCheckResult[];
  suggestions: OptimizationSuggestion[];
  alerts: PerformanceAlert[];
  recommendations: string[];
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enabled: true,
  webVitals: {
    enabled: true,
    reportingThreshold: 0.1, // Report 10% of sessions
    sampleRate: 1.0 // Sample 100% of eligible sessions
  },
  budgets: {
    enabled: true,
    checkInterval: 5000 // Check every 5 seconds
  },
  alerts: {
    enabled: true,
    maxAlerts: 100,
    retentionMs: 60 * 60 * 1000, // 1 hour
    externalReporting: false
  },
  optimization: {
    enabled: true,
    autoAnalysis: true,
    analysisInterval: 30000 // Analyze every 30 seconds
  }
};