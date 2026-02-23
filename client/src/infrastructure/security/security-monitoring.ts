/**
 * Security System Monitoring Implementation
 * Implements unified error monitoring for the Security system
 */

import { createError, ErrorDomain as CoreErrorDomain, ErrorSeverity as CoreErrorSeverity } from '@client/infrastructure/error';
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

class SecurityMonitoring implements UnifiedErrorMonitoring {
  private static instance: SecurityMonitoring;
  private aggregationService: ErrorAggregationService;
  private analyticsService: CrossSystemErrorAnalytics;
  private errorPatterns: Map<string, { threshold: number; count: number; lastTriggered: number }> = new Map();
  private monitoringEnabled: boolean = true;
  private enabledOperations: Set<string> = new Set(['*']); // * means all operations

  static getInstance(): SecurityMonitoring {
    if (!SecurityMonitoring.instance) {
      SecurityMonitoring.instance = new SecurityMonitoring();
    }
    return SecurityMonitoring.instance;
  }

  constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
  }

  async reportError(error: AppError | Error, context: ErrorContext): Promise<void> {
    if (!this.monitoringEnabled) return;

    // Type guard to check if error is AppError
    const isAppError = (err: unknown): err is AppError => {
      return err !== null && typeof err === 'object' && 'type' in err;
    };

    const appError = isAppError(error)
      ? error
      : createError(
          CoreErrorDomain.SECURITY,
          CoreErrorSeverity.HIGH,
          error instanceof Error ? error.message : String(error),
          {
            context: context,
            details: { originalError: error }
          }
        );

    // Add system-specific context
    const enhancedContext = {
      ...context,
      system: ClientSystem.SECURITY,
      securityComponent: context.component || 'unknown'
    };

    // Report to aggregation service
    this.aggregationService.addError(ClientSystem.SECURITY, appError as AppError, enhancedContext);

    // Check error patterns
    this.checkErrorPatterns(appError);
  }

  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    if (!this.monitoringEnabled) return;

    // Track performance in analytics service
    this.analyticsService.registerPerformanceMetrics(
      ClientSystem.SECURITY,
      metrics.operation,
      metrics.duration,
      metrics.success
    );

    // Check for performance issues specific to security operations
    if (metrics.duration > 5000 && metrics.operation.includes('scan')) {
      const perfError = createError(
        CoreErrorDomain.PERFORMANCE,
        CoreErrorSeverity.MEDIUM,
        `Slow security operation: ${metrics.operation}`,
        {
          details: metrics as unknown as Record<string, unknown>,
          context: {
            component: 'SecurityMonitoring',
            operation: 'performance_tracking'
          }
        }
      );

      await this.reportError(perfError, {
        system: ClientSystem.SECURITY,
        component: 'SecurityMonitoring',
        operation: metrics.operation
      });
    }
  }

  async getErrorAnalytics(timeRange?: { start: number; end: number }): Promise<ErrorAnalytics[]> {
    const systemErrors = this.aggregationService.getSystemErrors(ClientSystem.SECURITY, timeRange);

    // Group errors by pattern
    const patternGroups: Map<string, {
      errors: typeof systemErrors;
      recoveryCount: number;
      totalImpact: number;
    }> = new Map();

    systemErrors.forEach(err => {
      const pattern = this.normalizeErrorPattern(err.error.message);
      const existing = patternGroups.get(pattern) || {
        errors: [],
        recoveryCount: 0,
        totalImpact: 0
      };

      existing.errors.push(err);
      // Check if error has recovery success property
      const errorWithRecovery = err.error as AppError & { recoverySuccess?: boolean };
      if (errorWithRecovery.recoverySuccess) {
        existing.recoveryCount++;
      }
      existing.totalImpact += this.calculateErrorImpact(err.error);

      patternGroups.set(pattern, existing);
    });

    const analytics: ErrorAnalytics[] = [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    patternGroups.forEach((group, pattern) => {
      const recentErrors = group.errors.filter(e => e.timestamp > oneDayAgo);
      const olderErrors = group.errors.filter(e => e.timestamp <= oneDayAgo && e.timestamp > oneDayAgo - 24 * 60 * 60 * 1000);

      const trend = this.calculateTrend(recentErrors.length, olderErrors.length);

      analytics.push({
        errorId: `security-${pattern}-${Date.now()}`,
        pattern,
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
    const securityHealth = analytics.systems.find(s => s.system === ClientSystem.SECURITY);

    if (securityHealth) {
      return securityHealth;
    }

    // Fallback calculation
    const recentErrors = this.aggregationService.getSystemErrors(
      ClientSystem.SECURITY,
      { start: Date.now() - 60 * 60 * 1000, end: Date.now() }
    );

    const errorRate = recentErrors.length;
    const performanceScore = Math.max(0, 100 - errorRate * 2);

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 10) status = 'critical';
    else if (errorRate > 5) status = 'degraded';

    return {
      system: ClientSystem.SECURITY as ClientSystem,
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
    const errors = this.aggregationService.getSystemErrors(ClientSystem.SECURITY, {
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

    // Performance impact (simplified calculation)
    const performanceImpact = Math.min(100, totalErrors * 5);

    return {
      totalErrors,
      errorRate,
      topErrors,
      performanceImpact
    };
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
      CoreErrorDomain.SECURITY,
      CoreErrorSeverity.CRITICAL,
      `Security error pattern threshold exceeded: ${pattern}`,
      {
        details: {
          pattern,
          count,
          threshold: this.errorPatterns.get(pattern)?.threshold,
          lastError: error.message
        },
        context: {
          component: 'SecurityMonitoring',
          operation: 'error_pattern_alert'
        }
      }
    );

    this.reportError(alertError, {
      system: ClientSystem.SECURITY,
      component: 'SecurityMonitoring',
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
}

class SecurityMonitoringMiddleware implements ErrorMonitoringMiddleware {
  private monitoring: SecurityMonitoring;

  constructor() {
    this.monitoring = SecurityMonitoring.getInstance();
  }

  wrap<T extends (...args: unknown[]) => any>(fn: T, context: ErrorContext): T {
    return ((...args: Parameters<T>) => {
      if (!this.isOperationEnabled(context.operation || 'unknown')) {
        return fn(...args);
      }

      const startTime = performance.now();

      try {
        const result = fn(...args);

        // Handle promises
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
    const monitoring = SecurityMonitoring.getInstance();
    return monitoring.enabledOperations.has('*') || monitoring.enabledOperations.has(operation);
  }
}

// Export instances
export const securityMonitoring = SecurityMonitoring.getInstance();
export const securityMonitoringMiddleware = new SecurityMonitoringMiddleware();

// Export classes for testing
export { SecurityMonitoring, SecurityMonitoringMiddleware };
