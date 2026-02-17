/**
 * Service Architecture Monitoring Implementation
 * Implements unified error monitoring for the Service Architecture system
 */

import { createError, ErrorDomain as CoreErrorDomain, ErrorSeverity as CoreErrorSeverity } from '@client/core/error';
import { CrossSystemErrorAnalytics } from '@client/lib/infrastructure/monitoring/cross-system-error-analytics';
import { ErrorAggregationService } from '@client/lib/infrastructure/monitoring/error-aggregation-service';
import {
  UnifiedErrorMonitoring,
  ErrorMonitoringMiddleware,
  ClientSystem,
  ErrorContext,
  PerformanceMetrics,
  ErrorAnalytics,
  SystemHealth,
  AppError,
  ErrorDomain,
  ErrorSeverity
} from '@client/lib/infrastructure/monitoring/unified-error-monitoring-interface';

class ServiceArchitectureMonitoring implements UnifiedErrorMonitoring {
  private static instance: ServiceArchitectureMonitoring;
  private aggregationService: ErrorAggregationService;
  private analyticsService: CrossSystemErrorAnalytics;
  private coreOperationStats: Map<string, {
    totalCalls: number;
    errors: number;
    avgExecutionTime: number;
    lastExecutionTime: number;
  }> = new Map();
  private errorPatterns: Map<string, { threshold: number; count: number; lastTriggered: number }> = new Map();
  private monitoringEnabled: boolean = true;
  private enabledOperations: Set<string> = new Set(['*']);

  static getInstance(): ServiceArchitectureMonitoring {
    if (!ServiceArchitectureMonitoring.instance) {
      ServiceArchitectureMonitoring.instance = new ServiceArchitectureMonitoring();
    }
    return ServiceArchitectureMonitoring.instance;
  }

  constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
  }

  async reportError(error: AppError | Error, context: ErrorContext): Promise<void> {
    if (!this.monitoringEnabled) return;

    const appError = error instanceof Error && !(error as any).type
      ? createError(
          CoreErrorDomain.SYSTEM,
          CoreErrorSeverity.HIGH,
          error.message,
          {
            details: { originalError: error, coreOperation: context.operation },
            context: {
              component: context.component,
              operation: context.operation,
              userId: context.userId,
              sessionId: context.sessionId
            }
          }
        )
      : error as AppError;

    // Add system-specific context
    const enhancedContext = {
      ...context,
      system: ClientSystem.SERVICE_ARCHITECTURE,
      coreComponent: context.component || 'unknown',
      coreOperation: context.operation
    };

    // Track core-specific error
    this.trackCoreError(context.operation || 'unknown', appError as AppError);

    // Report to aggregation service
    this.aggregationService.addError(ClientSystem.SERVICE_ARCHITECTURE, appError as AppError, enhancedContext);

    // Check error patterns
    this.checkErrorPatterns(appError);
  }

  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    if (!this.monitoringEnabled) return;

    // Track performance in analytics service
    this.analyticsService.registerPerformanceMetrics(
      ClientSystem.SERVICE_ARCHITECTURE,
      metrics.operation,
      metrics.duration,
      metrics.success
    );

    // Update core operation stats
    this.updateCoreStats(metrics.operation, metrics.duration, metrics.success);

    // Check for performance issues specific to core operations
    if (metrics.duration > 1000 && (metrics.operation.includes('API') || metrics.operation.includes('State'))) {
      const perfError = createError(
        CoreErrorDomain.PERFORMANCE,
        CoreErrorSeverity.MEDIUM,
        `Slow core operation: ${metrics.operation}`,
        {
          details: { ...metrics },
          context: {
            component: 'ServiceArchitectureMonitoring',
            operation: 'core_performance_tracking'
          }
        }
      );

      await this.reportError(perfError, {
        system: ClientSystem.SERVICE_ARCHITECTURE,
        component: 'ServiceArchitectureMonitoring',
        operation: metrics.operation
      });
    }
  }

  async getErrorAnalytics(timeRange?: { start: number; end: number }): Promise<ErrorAnalytics[]> {
    const systemErrors = this.aggregationService.getSystemErrors(ClientSystem.SERVICE_ARCHITECTURE, timeRange);

    // Group errors by core operation
    const operationGroups: Map<string, {
      errors: typeof systemErrors;
      recoveryCount: number;
      totalImpact: number;
    }> = new Map();

    systemErrors.forEach(err => {
      const operationName = err.context.operation || 'unknown';
      const existing = operationGroups.get(operationName) || {
        errors: [],
        recoveryCount: 0,
        totalImpact: 0
      };

      existing.errors.push(err);
      if (err.error.recovered) {
        existing.recoveryCount++;
      }
      existing.totalImpact += this.calculateErrorImpact(err.error);

      operationGroups.set(operationName, existing);
    });

    const analytics: ErrorAnalytics[] = [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    operationGroups.forEach((group, operationName) => {
      const recentErrors = group.errors.filter(e => e.timestamp > oneDayAgo);
      const olderErrors = group.errors.filter(e => e.timestamp <= oneDayAgo && e.timestamp > oneDayAgo - 24 * 60 * 60 * 1000);

      const trend = this.calculateTrend(recentErrors.length, olderErrors.length);

      analytics.push({
        errorId: `core-${operationName}-${Date.now()}`,
        pattern: `Core operation error: ${operationName}`,
        frequency: group.errors.length,
        trend,
        impact: Math.min(100, (group.totalImpact / group.errors.length) * 10),
        recoveryRate: group.errors.length > 0 ? (group.recoveryCount / group.errors.length) * 100 : 0,
        affectedUsers: new Set(group.errors.map(e => e.context.userId).filter(Boolean)).size
      });
    });

    return analytics.sort((a, b) => b.frequency - a.frequency);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const analytics = await this.getCrossSystemAnalytics();
    const coreHealth = analytics.systems.find(s => s.system === ClientSystem.SERVICE_ARCHITECTURE);

    if (coreHealth) {
      return coreHealth;
    }

    // Fallback calculation
    const recentErrors = this.aggregationService.getSystemErrors(
      ClientSystem.SERVICE_ARCHITECTURE,
      { start: Date.now() - 60 * 60 * 1000, end: Date.now() }
    );

    const errorRate = recentErrors.length;
    const performanceScore = this.calculateAverageCorePerformance();

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 10 || performanceScore < 70) status = 'critical';
    else if (errorRate > 5 || performanceScore < 85) status = 'degraded';

    return {
      system: ClientSystem.SERVICE_ARCHITECTURE as ClientSystem,
      status,
      errorRate,
      performanceScore,
      lastUpdated: Date.now()
    };
  }

  registerErrorPattern(pattern: string, threshold: number): void {
    this.errorPatterns.set(pattern, {
      threshold,
      count: 0,
      lastTriggered: 0
    });
  }

  setMonitoringEnabled(enabled: boolean, operations?: string[]): void {
    this.monitoringEnabled = enabled;
    if (operations) {
      this.enabledOperations = new Set(operations);
    } else {
      this.enabledOperations = new Set(['*']);
    }
  }

  async getAggregatedMetrics(period: 'hour' | 'day' | 'week'): Promise<{
    totalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
    performanceImpact: number;
  }> {
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const startTime = Date.now() - periodMs[period];
    const errors = this.aggregationService.getSystemErrors(ClientSystem.SERVICE_ARCHITECTURE, {
      start: startTime,
      end: Date.now()
    });

    const totalErrors = errors.length;
    const errorRate = period === 'hour' ? totalErrors : totalErrors / (periodMs[period] / (60 * 60 * 1000));

    // Top errors
    const errorCounts: Map<string, number> = new Map();
    errors.forEach(err => {
      const msg = err.error.message;
      errorCounts.set(msg, (errorCounts.get(msg) || 0) + 1);
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Performance impact based on core performance
    const performanceImpact = 100 - this.calculateAverageCorePerformance();

    return {
      totalErrors,
      errorRate,
      topErrors,
      performanceImpact
    };
  }

  private trackCoreError(operationName: string, error: AppError): void {
    const stats = this.coreOperationStats.get(operationName) || {
      totalCalls: 0,
      errors: 0,
      avgExecutionTime: 0,
      lastExecutionTime: 0
    };

    stats.errors++;
    this.coreOperationStats.set(operationName, stats);
  }

  private updateCoreStats(operationName: string, duration: number, success: boolean): void {
    const stats = this.coreOperationStats.get(operationName) || {
      totalCalls: 0,
      errors: 0,
      avgExecutionTime: 0,
      lastExecutionTime: 0
    };

    stats.totalCalls++;
    stats.lastExecutionTime = duration;

    // Update rolling average
    const alpha = 0.1; // Smoothing factor
    stats.avgExecutionTime = stats.avgExecutionTime * (1 - alpha) + duration * alpha;

    this.coreOperationStats.set(operationName, stats);
  }

  private calculateAverageCorePerformance(): number {
    const operationStats = Array.from(this.coreOperationStats.values());
    if (operationStats.length === 0) return 100;

    const avgExecutionTime = operationStats.reduce((sum, stat) => sum + stat.avgExecutionTime, 0) / operationStats.length;
    const errorRate = operationStats.reduce((sum, stat) => sum + (stat.errors / stat.totalCalls), 0) / operationStats.length;

    // Performance score based on execution time and error rate
    const timeScore = Math.max(0, 100 - (avgExecutionTime / 5)); // Penalize slow core operations
    const errorScore = Math.max(0, 100 - (errorRate * 1000)); // Penalize high error rates

    return (timeScore + errorScore) / 2;
  }

  private async getCrossSystemAnalytics() {
    return this.analyticsService.getCrossSystemAnalytics();
  }

  private checkErrorPatterns(error: AppError): void {
    const normalizedMessage = this.normalizeErrorPattern(error.message);

    this.errorPatterns.forEach((patternData, pattern) => {
      if (normalizedMessage.includes(pattern) || pattern === '*') {
        patternData.count++;

        const now = Date.now();
        const timeSinceLastTrigger = now - patternData.lastTriggered;

        // Reset count if more than an hour has passed
        if (timeSinceLastTrigger > 60 * 60 * 1000) {
          patternData.count = 1;
        }

        if (patternData.count >= patternData.threshold) {
          // Trigger alert
          this.triggerErrorAlert(pattern, patternData.count, error);
          patternData.lastTriggered = now;
          patternData.count = 0; // Reset after alert
        }
      }
    });
  }

  private triggerErrorAlert(pattern: string, count: number, error: AppError): void {
    const alertError = createError(
      CoreErrorDomain.SYSTEM,
      CoreErrorSeverity.CRITICAL,
      `Service Architecture error pattern threshold exceeded: ${pattern}`,
      {
        details: {
          pattern,
          count,
          threshold: this.errorPatterns.get(pattern)?.threshold,
          lastError: error.message
        },
        context: {
          component: 'ServiceArchitectureMonitoring',
          operation: 'error_pattern_alert'
        }
      }
    );

    this.reportError(alertError, {
      system: ClientSystem.SERVICE_ARCHITECTURE,
      component: 'ServiceArchitectureMonitoring',
      operation: 'error_pattern_monitoring'
    });
  }

  private normalizeErrorPattern(message: string): string {
    return message
      .toLowerCase()
      .replace(/\d+/g, 'X')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .trim();
  }

  private calculateErrorImpact(error: AppError): number {
    const severityMultiplier = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4,
      [ErrorSeverity.BLOCKER]: 5
    };

    return severityMultiplier[error.severity] || 1;
  }

  private calculateTrend(current: number, previous: number): 'increasing' | 'decreasing' | 'stable' {
    if (previous === 0) return current > 0 ? 'increasing' : 'stable';
    const change = (current - previous) / previous;
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  // Core-specific monitoring methods
  getCoreOperationStats(): Array<{
    operationName: string;
    totalCalls: number;
    errors: number;
    avgExecutionTime: number;
    errorRate: number;
  }> {
    return Array.from(this.coreOperationStats.entries()).map(([operationName, stats]) => ({
      operationName,
      totalCalls: stats.totalCalls,
      errors: stats.errors,
      avgExecutionTime: stats.avgExecutionTime,
      errorRate: stats.totalCalls > 0 ? (stats.errors / stats.totalCalls) * 100 : 0
    }));
  }

  monitorCoreOperation(operationName: string, executionTime: number, success: boolean): void {
    this.updateCoreStats(operationName, executionTime, success);

    if (!success) {
      const error = createError(
        CoreErrorDomain.SYSTEM,
        CoreErrorSeverity.MEDIUM,
        `Core operation failed: ${operationName}`,
        {
          details: { executionTime, operationName },
          context: {
            component: 'ServiceArchitectureMonitoring',
            operation: operationName
          }
        }
      );

      this.reportError(error, {
        system: ClientSystem.SERVICE_ARCHITECTURE,
        component: 'CoreOperationMonitor',
        operation: operationName
      });
    }
  }

  // Core system health checks
  async performSystemHealthCheck(): Promise<{
    apiConnectivity: boolean;
    stateManagement: boolean;
    errorHandling: boolean;
    performance: number;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    // This would perform actual health checks
    // For now, return mock data based on recent errors
    const recentErrors = this.aggregationService.getSystemErrors(
      ClientSystem.SERVICE_ARCHITECTURE,
      { start: Date.now() - 5 * 60 * 1000, end: Date.now() } // Last 5 minutes
    );

    const errorRate = recentErrors.length;
    const performance = this.calculateAverageCorePerformance();

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 5 || performance < 70) overallHealth = 'critical';
    else if (errorRate > 2 || performance < 85) overallHealth = 'degraded';

    return {
      apiConnectivity: errorRate < 3,
      stateManagement: performance > 80,
      errorHandling: errorRate < 5,
      performance,
      overallHealth
    };
  }
}

class ServiceArchitectureMonitoringMiddleware implements ErrorMonitoringMiddleware {
  private monitoring: ServiceArchitectureMonitoring;

  constructor() {
    this.monitoring = ServiceArchitectureMonitoring.getInstance();
  }

  wrap<T extends (...args: unknown[]) => any>(fn: T, context: ErrorContext): T {
    return ((...args: Parameters<T>) => {
      if (!this.isOperationEnabled(context.operation || 'unknown')) {
        return fn(...args);
      }

      const startTime = performance.now();

      try {
        const result = fn(...args);

        // Handle promises (core operations are often async)
        if (result instanceof Promise) {
          return result
            .then((value) => {
              const duration = performance.now() - startTime;
              this.monitoring.trackPerformance({
                operation: context.operation || 'unknown',
                duration,
                success: true,
                timestamp: Date.now(),
                context
              });
              return value;
            })
            .catch((error) => {
              const duration = performance.now() - startTime;
              this.monitoring.trackPerformance({
                operation: context.operation || 'unknown',
                duration,
                success: false,
                timestamp: Date.now(),
                context
              });

              this.monitoring.reportError(error as Error, context);
              throw error;
            }) as unknown as T;
        }

        // Handle synchronous functions
        const duration = performance.now() - startTime;
        this.monitoring.trackPerformance({
          operation: context.operation || 'unknown',
          duration,
          success: true,
          timestamp: Date.now(),
          context
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.monitoring.trackPerformance({
          operation: context.operation || 'unknown',
          duration,
          success: false,
          timestamp: Date.now(),
          context
        });

        this.monitoring.reportError(error as Error, context);
        throw error;
      }
    }) as T;
  }

  wrapAsync<T extends (...args: unknown[]) => Promise<any>>(fn: T, context: ErrorContext): T {
    return this.wrap(fn, context);
  }

  createBoundary(context: ErrorContext) {
    return {
      onError: (error: Error) => {
        this.monitoring.reportError(error, context);
      },
      trackPerformance: (operation: string, duration: number, success: boolean) => {
        this.monitoring.trackPerformance({
          operation,
          duration,
          success,
          timestamp: Date.now(),
          context: { ...context, operation }
        });
      }
    };
  }

  private isOperationEnabled(operation: string): boolean {
    const monitoring = ServiceArchitectureMonitoring.getInstance() as unknown;
    return monitoring.enabledOperations.has('*') || monitoring.enabledOperations.has(operation);
  }
}

// Export instances
export const serviceArchitectureMonitoring = ServiceArchitectureMonitoring.getInstance();
export const serviceArchitectureMonitoringMiddleware = new ServiceArchitectureMonitoringMiddleware();

// Export classes for testing
export { ServiceArchitectureMonitoring, ServiceArchitectureMonitoringMiddleware };
