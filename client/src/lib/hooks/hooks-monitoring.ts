/**
 * Hooks System Monitoring Implementation
 * Implements unified error monitoring for the Hooks system
 */

import { createError } from '@client/infrastructure/error';
import { CrossSystemErrorAnalytics } from '@client/infrastructure/monitoring/cross-system-error-analytics';
import { ErrorAggregationService } from '@client/infrastructure/monitoring/error-aggregation-service';
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
} from '@client/infrastructure/monitoring/unified-error-monitoring-interface';

class HooksMonitoring implements UnifiedErrorMonitoring {
  private static instance: HooksMonitoring;
  private aggregationService: ErrorAggregationService;
  private analyticsService: CrossSystemErrorAnalytics;
  private hookExecutionStats: Map<string, {
    totalCalls: number;
    errors: number;
    avgExecutionTime: number;
    lastExecutionTime: number;
  }> = new Map();
  private errorPatterns: Map<string, { threshold: number; count: number; lastTriggered: number }> = new Map();
  private monitoringEnabled: boolean = true;
  private enabledOperations: Set<string> = new Set(['*']);

  static getInstance(): HooksMonitoring {
    if (!HooksMonitoring.instance) {
      HooksMonitoring.instance = new HooksMonitoring();
    }
    return HooksMonitoring.instance;
  }

  constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
  }

  async reportError(error: AppError | Error, context: ErrorContext): Promise<void> {
    if (!this.monitoringEnabled) return;

    const appError = error instanceof Error && !(error as any).type
      ? createError(
          ErrorDomain.SYSTEM,
          ErrorSeverity.HIGH,
          error.message,
          {
            details: { originalError: error, hookName: context.operation },
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
      system: ClientSystem.HOOKS,
      hookComponent: context.component || 'unknown',
      hookName: context.operation
    };

    // Track hook-specific error
    this.trackHookError(context.operation || 'unknown', appError);

    // Report to aggregation service
    this.aggregationService.addError(ClientSystem.HOOKS, appError, enhancedContext);

    // Check error patterns
    this.checkErrorPatterns(appError);
  }

  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    if (!this.monitoringEnabled) return;

    // Track performance in analytics service
    this.analyticsService.registerPerformanceMetrics(
      ClientSystem.HOOKS,
      metrics.operation,
      metrics.duration,
      metrics.success
    );

    // Update hook execution stats
    this.updateHookStats(metrics.operation, metrics.duration, metrics.success);

    // Check for performance issues specific to hooks
    if (metrics.duration > 100 && metrics.operation.includes('use')) {
      const perfError = createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.MEDIUM,
        `Slow hook execution: ${metrics.operation}`,
        {
          details: { ...metrics },
          context: {
            component: 'HooksMonitoring',
            operation: 'hook_performance_tracking'
          }
        }
      );

      await this.reportError(perfError, {
        system: ClientSystem.HOOKS,
        component: 'HooksMonitoring',
        operation: metrics.operation
      });
    }
  }

  async getErrorAnalytics(timeRange?: { start: number; end: number }): Promise<ErrorAnalytics[]> {
    const systemErrors = this.aggregationService.getSystemErrors(ClientSystem.HOOKS, timeRange);

    // Group errors by hook
    const hookGroups: Map<string, {
      errors: typeof systemErrors;
      recoveryCount: number;
      totalImpact: number;
    }> = new Map();

    systemErrors.forEach(err => {
      const hookName = err.context.operation || 'unknown';
      const existing = hookGroups.get(hookName) || {
        errors: [],
        recoveryCount: 0,
        totalImpact: 0
      };

      existing.errors.push(err);
      if (err.error.recovered) {
        existing.recoveryCount++;
      }
      existing.totalImpact += this.calculateErrorImpact(err.error);

      hookGroups.set(hookName, existing);
    });

    const analytics: ErrorAnalytics[] = [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    hookGroups.forEach((group, hookName) => {
      const recentErrors = group.errors.filter(e => e.timestamp > oneDayAgo);
      const olderErrors = group.errors.filter(e => e.timestamp <= oneDayAgo && e.timestamp > oneDayAgo - 24 * 60 * 60 * 1000);

      const trend = this.calculateTrend(recentErrors.length, olderErrors.length);

      analytics.push({
        errorId: `hooks-${hookName}-${Date.now()}`,
        pattern: `Hook error: ${hookName}`,
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
    const hooksHealth = analytics.systems.find(s => s.system === ClientSystem.HOOKS);

    if (hooksHealth) {
      return hooksHealth;
    }

    // Fallback calculation
    const recentErrors = this.aggregationService.getSystemErrors(
      ClientSystem.HOOKS,
      { start: Date.now() - 60 * 60 * 1000, end: Date.now() }
    );

    const errorRate = recentErrors.length;
    const performanceScore = this.calculateAverageHookPerformance();

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 10 || performanceScore < 70) status = 'critical';
    else if (errorRate > 5 || performanceScore < 85) status = 'degraded';

    return {
      system: ClientSystem.HOOKS,
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
    const errors = this.aggregationService.getSystemErrors(ClientSystem.HOOKS, {
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

    // Performance impact based on hook performance
    const performanceImpact = 100 - this.calculateAverageHookPerformance();

    return {
      totalErrors,
      errorRate,
      topErrors,
      performanceImpact
    };
  }

  private trackHookError(hookName: string, error: AppError): void {
    const stats = this.hookExecutionStats.get(hookName) || {
      totalCalls: 0,
      errors: 0,
      avgExecutionTime: 0,
      lastExecutionTime: 0
    };

    stats.errors++;
    this.hookExecutionStats.set(hookName, stats);
  }

  private updateHookStats(hookName: string, duration: number, success: boolean): void {
    const stats = this.hookExecutionStats.get(hookName) || {
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

    this.hookExecutionStats.set(hookName, stats);
  }

  private calculateAverageHookPerformance(): number {
    const hookStats = Array.from(this.hookExecutionStats.values());
    if (hookStats.length === 0) return 100;

    const avgExecutionTime = hookStats.reduce((sum, stat) => sum + stat.avgExecutionTime, 0) / hookStats.length;
    const errorRate = hookStats.reduce((sum, stat) => sum + (stat.errors / stat.totalCalls), 0) / hookStats.length;

    // Performance score based on execution time and error rate
    const timeScore = Math.max(0, 100 - (avgExecutionTime / 10)); // Penalize slow hooks
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
      ErrorDomain.SYSTEM,
      ErrorSeverity.CRITICAL,
      `Hooks error pattern threshold exceeded: ${pattern}`,
      {
        details: {
          pattern,
          count,
          threshold: this.errorPatterns.get(pattern)?.threshold,
          lastError: error.message
        },
        context: {
          component: 'HooksMonitoring',
          operation: 'error_pattern_alert'
        }
      }
    );

    this.reportError(alertError, {
      system: ClientSystem.HOOKS,
      component: 'HooksMonitoring',
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
    const severityMultiplier: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4,
      [ErrorSeverity.BLOCKER]: 5,
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

  // Hook-specific monitoring methods
  getHookStats(): Array<{
    hookName: string;
    totalCalls: number;
    errors: number;
    avgExecutionTime: number;
    errorRate: number;
  }> {
    return Array.from(this.hookExecutionStats.entries()).map(([hookName, stats]) => ({
      hookName,
      totalCalls: stats.totalCalls,
      errors: stats.errors,
      avgExecutionTime: stats.avgExecutionTime,
      errorRate: stats.totalCalls > 0 ? (stats.errors / stats.totalCalls) * 100 : 0
    }));
  }

  monitorHookExecution(hookName: string, executionTime: number, success: boolean): void {
    this.updateHookStats(hookName, executionTime, success);

    if (!success) {
      const error = createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.MEDIUM,
        `Hook execution failed: ${hookName}`,
        {
          details: { executionTime, hookName },
          context: {
            component: 'HooksMonitoring',
            operation: hookName
          }
        }
      );

      this.reportError(error, {
        system: ClientSystem.HOOKS,
        component: 'HookExecutionMonitor',
        operation: hookName
      });
    }
  }
}

class HooksMonitoringMiddleware implements ErrorMonitoringMiddleware {
  private monitoring: HooksMonitoring;

  constructor() {
    this.monitoring = HooksMonitoring.getInstance();
  }

  wrap<T extends (...args: unknown[]) => any>(fn: T, context: ErrorContext): T {
    return ((...args: Parameters<T>) => {
      if (!this.isOperationEnabled(context.operation || 'unknown')) {
        return fn(...args);
      }

      const startTime = performance.now();

      try {
        const result = fn(...args);

        // Handle promises (some hooks might return promises)
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
    const monitoring = HooksMonitoring.getInstance() as unknown;
    return monitoring.enabledOperations.has('*') || monitoring.enabledOperations.has(operation);
  }
}

// Export instances
export const hooksMonitoring = HooksMonitoring.getInstance();
export const hooksMonitoringMiddleware = new HooksMonitoringMiddleware();

// Export classes for testing
export { HooksMonitoring, HooksMonitoringMiddleware };
