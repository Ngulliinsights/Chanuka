/**
 * Unified Error Monitoring Interface
 * Standardized interface for error monitoring across all client systems
 */

import { AppError, ErrorDomain, ErrorSeverity } from '@client/core/error';

// Re-export core error types for convenience
export type { AppError };
export { ErrorDomain, ErrorSeverity };

export interface ErrorContext {
  system: ClientSystem;
  component: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  context?: ErrorContext;
}

export interface ErrorAnalytics {
  errorId: string;
  pattern: string;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: number; // 0-100
  recoveryRate: number;
  affectedUsers: number;
}

export interface SystemHealth {
  system: ClientSystem;
  status: 'healthy' | 'degraded' | 'critical';
  errorRate: number;
  performanceScore: number;
  lastUpdated: number;
}

export enum ClientSystem {
  SECURITY = 'security',
  HOOKS = 'hooks',
  LIBRARY_SERVICES = 'library_services',
  SERVICE_ARCHITECTURE = 'service_architecture'
}

export interface UnifiedErrorMonitoring {
  /**
   * Report an error with standardized context
   */
  reportError(error: AppError | Error, context: ErrorContext): Promise<void>;

  /**
   * Track performance metrics for operations
   */
  trackPerformance(metrics: PerformanceMetrics): Promise<void>;

  /**
   * Get error analytics for the system
   */
  getErrorAnalytics(timeRange?: { start: number; end: number }): Promise<ErrorAnalytics[]>;

  /**
   * Get system health status
   */
  getSystemHealth(): Promise<SystemHealth>;

  /**
   * Register error patterns for proactive monitoring
   */
  registerErrorPattern(pattern: string, threshold: number): void;

  /**
   * Enable/disable monitoring for specific operations
   */
  setMonitoringEnabled(enabled: boolean, operations?: string[]): void;

  /**
   * Get aggregated error metrics across time periods
   */
  getAggregatedMetrics(period: 'hour' | 'day' | 'week'): Promise<{
    totalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
    performanceImpact: number;
  }>;
}

export interface ErrorMonitoringMiddleware {
  /**
   * Wrap a function with error monitoring
   */
  wrap<T extends (...args: any[]) => any>(
    fn: T,
    context: ErrorContext
  ): T;

  /**
   * Wrap an async function with error monitoring
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: ErrorContext
  ): T;

  /**
   * Create a monitoring boundary for components
   */
  createBoundary(context: ErrorContext): {
    onError: (error: Error) => void;
    trackPerformance: (operation: string, duration: number, success: boolean) => void;
  };
}

export interface CrossSystemAnalytics {
  /**
   * Get analytics across all systems
   */
  getCrossSystemAnalytics(): Promise<{
    systems: SystemHealth[];
    correlations: Array<{
      systemA: ClientSystem;
      systemB: ClientSystem;
      correlation: number;
      commonErrors: string[];
    }>;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  }>;

  /**
   * Identify error patterns that span multiple systems
   */
  identifyCrossSystemPatterns(): Promise<Array<{
    pattern: string;
    affectedSystems: ClientSystem[];
    severity: ErrorSeverity;
    frequency: number;
  }>>;

  /**
   * Track error propagation across systems
   */
  trackErrorPropagation(errorId: string): Promise<Array<{
    system: ClientSystem;
    timestamp: number;
    error: string;
  }>>;
}

export interface ErrorAggregationService {
  /**
   * Aggregate errors from all systems
   */
  aggregateErrors(): Promise<{
    totalErrors: number;
    bySystem: Record<ClientSystem, number>;
    byDomain: Record<ErrorDomain, number>;
    bySeverity: Record<ErrorSeverity, number>;
    trends: Array<{
      period: string;
      errorCount: number;
      change: number;
    }>;
  }>;

  /**
   * Get real-time error stream
   */
  getErrorStream(): AsyncIterable<{
    system: ClientSystem;
    error: AppError;
    context: ErrorContext;
  }>;
}

export interface TrendAnalysisService {
  /**
   * Analyze error trends
   */
  analyzeTrends(timeRange: { start: number; end: number }): Promise<{
    trends: Array<{
      pattern: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      confidence: number;
      prediction: number;
    }>;
    alerts: Array<{
      type: 'threshold_exceeded' | 'anomaly_detected' | 'trend_shift';
      message: string;
      severity: ErrorSeverity;
      affectedSystems: ClientSystem[];
    }>;
  }>;

  /**
   * Predict potential issues
   */
  predictIssues(horizon: number): Promise<Array<{
    system: ClientSystem;
    issue: string;
    probability: number;
    impact: number;
    recommendedActions: string[];
  }>>;
}
