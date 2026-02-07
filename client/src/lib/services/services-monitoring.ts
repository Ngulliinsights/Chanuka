/**
 * Library Services Monitoring Implementation
 * Implements unified error monitoring for the Library Services system
 * Optimized version with improved type safety and performance
 */

import { createError } from '@/core/error';
import { CrossSystemErrorAnalytics } from '../infrastructure/monitoring/cross-system-error-analytics';
import { ErrorAggregationService } from '../infrastructure/monitoring/error-aggregation-service';
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
} from '../infrastructure/monitoring/unified-error-monitoring-interface';

// Type definitions for internal state management
interface ServiceStats {
  totalCalls: number;
  errors: number;
  avgExecutionTime: number;
  lastExecutionTime: number;
}

interface ErrorPatternData {
  threshold: number;
  count: number;
  lastTriggered: number;
}

interface ServiceGroup {
  errors: Array<{ error: AppError; context: ErrorContext; timestamp: number }>;
  recoveryCount: number;
  totalImpact: number;
}

interface AggregatedMetrics {
  totalErrors: number;
  errorRate: number;
  topErrors: Array<{ message: string; count: number }>;
  performanceImpact: number;
}

class LibraryServicesMonitoring implements UnifiedErrorMonitoring {
  private static instance: LibraryServicesMonitoring;
  private readonly aggregationService: ErrorAggregationService;
  private readonly analyticsService: CrossSystemErrorAnalytics;
  private readonly serviceCallStats: Map<string, ServiceStats> = new Map();
  private readonly errorPatterns: Map<string, ErrorPatternData> = new Map();
  private monitoringEnabled: boolean = true;
  private enabledOperations: Set<string> = new Set(['*']);

  // Performance optimization constants
  private static readonly SLOW_THRESHOLD_MS = 2000;
  private static readonly SMOOTHING_FACTOR = 0.1;
  private static readonly PATTERN_RESET_MS = 60 * 60 * 1000;
  private static readonly RECENT_ERRORS_WINDOW_MS = 24 * 60 * 60 * 1000;

  static getInstance(): LibraryServicesMonitoring {
    if (!LibraryServicesMonitoring.instance) {
      LibraryServicesMonitoring.instance = new LibraryServicesMonitoring();
    }
    return LibraryServicesMonitoring.instance;
  }

  private constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
  }

  async reportError(error: AppError | Error, context: ErrorContext): Promise<void> {
    if (!this.monitoringEnabled) return;

    const appError = this.ensureAppError(error, context);
    const enhancedContext = this.enhanceContext(context);

    this.trackServiceError(context.operation || 'unknown', appError);
    this.aggregationService.addError(ClientSystem.LIBRARY_SERVICES, appError, enhancedContext);
    this.checkErrorPatterns(appError);
  }

  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    if (!this.monitoringEnabled) return;

    this.analyticsService.registerPerformanceMetrics(
      ClientSystem.LIBRARY_SERVICES,
      metrics.operation,
      metrics.duration,
      metrics.success
    );

    this.updateServiceStats(metrics.operation, metrics.duration, metrics.success);

    if (this.isSlowServiceCall(metrics)) {
      await this.reportSlowServiceCall(metrics);
    }
  }

  async getErrorAnalytics(timeRange?: { start: number; end: number }): Promise<ErrorAnalytics[]> {
    const systemErrors = this.aggregationService.getSystemErrors(ClientSystem.LIBRARY_SERVICES, timeRange);
    const serviceGroups = this.groupErrorsByService(systemErrors);
    
    return this.calculateAnalytics(serviceGroups);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const analytics = await this.getCrossSystemAnalytics();
    const servicesHealth = analytics.systems.find((s: any) => s.system === ClientSystem.LIBRARY_SERVICES);

    return servicesHealth || this.calculateFallbackHealth();
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
    this.enabledOperations = operations 
      ? new Set(operations) 
      : new Set(['*']);
  }

  async getAggregatedMetrics(period: 'hour' | 'day' | 'week'): Promise<AggregatedMetrics> {
    const timeRange = this.getTimeRange(period);
    const errors = this.aggregationService.getSystemErrors(ClientSystem.LIBRARY_SERVICES, timeRange);

    return {
      totalErrors: errors.length,
      errorRate: this.calculateErrorRate(errors.length, period),
      topErrors: this.getTopErrors(errors),
      performanceImpact: 100 - this.calculateAverageServicePerformance()
    };
  }

  getServiceStats(): Array<{
    serviceName: string;
    totalCalls: number;
    errors: number;
    avgExecutionTime: number;
    errorRate: number;
  }> {
    return Array.from(this.serviceCallStats.entries()).map(([serviceName, stats]) => ({
      serviceName,
      totalCalls: stats.totalCalls,
      errors: stats.errors,
      avgExecutionTime: stats.avgExecutionTime,
      errorRate: this.calculateServiceErrorRate(stats)
    }));
  }

  monitorServiceCall(serviceName: string, executionTime: number, success: boolean): void {
    this.updateServiceStats(serviceName, executionTime, success);

    if (!success) {
      this.reportFailedServiceCall(serviceName, executionTime);
    }
  }

  // Private helper methods
  private ensureAppError(error: AppError | Error, context: ErrorContext): AppError {
    if (error instanceof Error && !(error as any).type) {
      return createError(
        ErrorDomain.SYSTEM,
        ErrorSeverity.HIGH,
        error.message,
        {
          details: { originalError: error, serviceName: context.operation },
          context: {
            component: context.component,
            operation: context.operation,
            userId: context.userId,
            sessionId: context.sessionId
          }
        }
      );
    }
    return error as AppError;
  }

  private enhanceContext(context: ErrorContext): ErrorContext {
    return {
      ...context,
      system: ClientSystem.LIBRARY_SERVICES,
      serviceComponent: context.component || 'unknown',
      serviceName: context.operation
    };
  }

  private isSlowServiceCall(metrics: PerformanceMetrics): boolean {
    return metrics.duration > LibraryServicesMonitoring.SLOW_THRESHOLD_MS 
      && metrics.operation.includes('Service');
  }

  private async reportSlowServiceCall(metrics: PerformanceMetrics): Promise<void> {
    const perfError = createError(
      ErrorDomain.SYSTEM,
      ErrorSeverity.MEDIUM,
      `Slow service call: ${metrics.operation}`,
      {
        details: { ...metrics },
        context: {
          component: 'LibraryServicesMonitoring',
          operation: 'service_performance_tracking'
        }
      }
    );

    await this.reportError(perfError, {
      system: ClientSystem.LIBRARY_SERVICES,
      component: 'LibraryServicesMonitoring',
      operation: metrics.operation
    });
  }

  private trackServiceError(serviceName: string, error: AppError): void {
    const stats = this.getOrCreateServiceStats(serviceName);
    stats.errors++;
  }

  private updateServiceStats(serviceName: string, duration: number, success: boolean): void {
    const stats = this.getOrCreateServiceStats(serviceName);
    
    stats.totalCalls++;
    stats.lastExecutionTime = duration;
    stats.avgExecutionTime = this.calculateRollingAverage(
      stats.avgExecutionTime, 
      duration
    );
  }

  private getOrCreateServiceStats(serviceName: string): ServiceStats {
    if (!this.serviceCallStats.has(serviceName)) {
      this.serviceCallStats.set(serviceName, {
        totalCalls: 0,
        errors: 0,
        avgExecutionTime: 0,
        lastExecutionTime: 0
      });
    }
    return this.serviceCallStats.get(serviceName)!;
  }

  private calculateRollingAverage(current: number, newValue: number): number {
    return current * (1 - LibraryServicesMonitoring.SMOOTHING_FACTOR) 
      + newValue * LibraryServicesMonitoring.SMOOTHING_FACTOR;
  }

  private groupErrorsByService(
    systemErrors: Array<{ error: AppError; context: ErrorContext; timestamp: number }>
  ): Map<string, ServiceGroup> {
    const serviceGroups = new Map<string, ServiceGroup>();

    systemErrors.forEach(err => {
      const serviceName = err.context.operation || 'unknown';
      const group = serviceGroups.get(serviceName) || {
        errors: [],
        recoveryCount: 0,
        totalImpact: 0
      };

      group.errors.push(err);
      if (err.error.recovered) {
        group.recoveryCount++;
      }
      group.totalImpact += this.calculateErrorImpact(err.error);

      serviceGroups.set(serviceName, group);
    });

    return serviceGroups;
  }

  private calculateAnalytics(serviceGroups: Map<string, ServiceGroup>): ErrorAnalytics[] {
    const analytics: ErrorAnalytics[] = [];
    const now = Date.now();
    const oneDayAgo = now - LibraryServicesMonitoring.RECENT_ERRORS_WINDOW_MS;
    const twoDaysAgo = oneDayAgo - LibraryServicesMonitoring.RECENT_ERRORS_WINDOW_MS;

    serviceGroups.forEach((group, serviceName) => {
      const recentErrors = group.errors.filter(e => e.timestamp > oneDayAgo);
      const olderErrors = group.errors.filter(
        e => e.timestamp <= oneDayAgo && e.timestamp > twoDaysAgo
      );

      analytics.push({
        errorId: `services-${serviceName}-${now}`,
        pattern: `Service error: ${serviceName}`,
        frequency: group.errors.length,
        trend: this.calculateTrend(recentErrors.length, olderErrors.length),
        impact: Math.min(100, (group.totalImpact / group.errors.length) * 10),
        recoveryRate: this.calculateRecoveryRate(group),
        affectedUsers: this.countAffectedUsers(group.errors)
      });
    });

    return analytics.sort((a, b) => b.frequency - a.frequency);
  }

  private calculateRecoveryRate(group: ServiceGroup): number {
    return group.errors.length > 0 
      ? (group.recoveryCount / group.errors.length) * 100 
      : 0;
  }

  private countAffectedUsers(errors: Array<{ context: ErrorContext }>): number {
    return new Set(
      errors.map(e => e.context.userId).filter(Boolean)
    ).size;
  }

  private calculateFallbackHealth(): SystemHealth {
    const recentErrors = this.aggregationService.getSystemErrors(
      ClientSystem.LIBRARY_SERVICES,
      { start: Date.now() - 60 * 60 * 1000, end: Date.now() }
    );

    const errorRate = recentErrors.length;
    const performanceScore = this.calculateAverageServicePerformance();

    return {
      system: ClientSystem.LIBRARY_SERVICES,
      status: this.determineHealthStatus(errorRate, performanceScore),
      errorRate,
      performanceScore,
      lastUpdated: Date.now()
    };
  }

  private determineHealthStatus(
    errorRate: number, 
    performanceScore: number
  ): 'healthy' | 'degraded' | 'critical' {
    if (errorRate > 10 || performanceScore < 70) return 'critical';
    if (errorRate > 5 || performanceScore < 85) return 'degraded';
    return 'healthy';
  }

  private calculateAverageServicePerformance(): number {
    const serviceStats = Array.from(this.serviceCallStats.values());
    if (serviceStats.length === 0) return 100;

    const avgExecutionTime = this.calculateAverageExecutionTime(serviceStats);
    const avgErrorRate = this.calculateAverageErrorRate(serviceStats);

    const timeScore = Math.max(0, 100 - (avgExecutionTime / 10));
    const errorScore = Math.max(0, 100 - (avgErrorRate * 1000));

    return (timeScore + errorScore) / 2;
  }

  private calculateAverageExecutionTime(stats: ServiceStats[]): number {
    return stats.reduce((sum, stat) => sum + stat.avgExecutionTime, 0) / stats.length;
  }

  private calculateAverageErrorRate(stats: ServiceStats[]): number {
    return stats.reduce(
      (sum, stat) => sum + (stat.totalCalls > 0 ? stat.errors / stat.totalCalls : 0), 
      0
    ) / stats.length;
  }

  private async getCrossSystemAnalytics() {
    return this.analyticsService.getCrossSystemAnalytics();
  }

  private checkErrorPatterns(error: AppError): void {
    const normalizedMessage = this.normalizeErrorPattern(error.message);
    const now = Date.now();

    this.errorPatterns.forEach((patternData, pattern) => {
      if (this.matchesPattern(normalizedMessage, pattern)) {
        this.processPatternMatch(pattern, patternData, error, now);
      }
    });
  }

  private matchesPattern(message: string, pattern: string): boolean {
    return message.includes(pattern) || pattern === '*';
  }

  private processPatternMatch(
    pattern: string, 
    patternData: ErrorPatternData, 
    error: AppError, 
    now: number
  ): void {
    patternData.count++;

    const timeSinceLastTrigger = now - patternData.lastTriggered;
    if (timeSinceLastTrigger > LibraryServicesMonitoring.PATTERN_RESET_MS) {
      patternData.count = 1;
    }

    if (patternData.count >= patternData.threshold) {
      this.triggerErrorAlert(pattern, patternData.count, error);
      patternData.lastTriggered = now;
      patternData.count = 0;
    }
  }

  private triggerErrorAlert(pattern: string, count: number, error: AppError): void {
    const alertError = createError(
      ErrorDomain.SYSTEM,
      ErrorSeverity.CRITICAL,
      `Library Services error pattern threshold exceeded: ${pattern}`,
      {
        details: {
          pattern,
          count,
          threshold: this.errorPatterns.get(pattern)?.threshold,
          lastError: error.message
        },
        context: {
          component: 'LibraryServicesMonitoring',
          operation: 'error_pattern_alert'
        }
      }
    );

    this.reportError(alertError, {
      system: ClientSystem.LIBRARY_SERVICES,
      component: 'LibraryServicesMonitoring',
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
    const impactMap: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4
    };
    return impactMap[error.severity] ?? 2;
  }

  private calculateTrend(current: number, previous: number): 'increasing' | 'decreasing' | 'stable' {
    if (previous === 0) return current > 0 ? 'increasing' : 'stable';
    
    const change = (current - previous) / previous;
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private getTimeRange(period: 'hour' | 'day' | 'week'): { start: number; end: number } {
    const periodMs: Record<typeof period, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    return {
      start: Date.now() - periodMs[period],
      end: Date.now()
    };
  }

  private calculateErrorRate(errorCount: number, period: 'hour' | 'day' | 'week'): number {
    if (period === 'hour') return errorCount;
    
    const periodHours = period === 'day' ? 24 : 168;
    return errorCount / periodHours;
  }

  private getTopErrors(
    errors: Array<{ error: AppError }>
  ): Array<{ message: string; count: number }> {
    const errorCounts = new Map<string, number>();
    
    errors.forEach(({ error }) => {
      const msg = error.message;
      errorCounts.set(msg, (errorCounts.get(msg) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateServiceErrorRate(stats: ServiceStats): number {
    return stats.totalCalls > 0 
      ? (stats.errors / stats.totalCalls) * 100 
      : 0;
  }

  private reportFailedServiceCall(serviceName: string, executionTime: number): void {
    const error = createError(
      ErrorDomain.SYSTEM,
      ErrorSeverity.MEDIUM,
      `Service call failed: ${serviceName}`,
      {
        details: { executionTime, serviceName },
        context: {
          component: 'LibraryServicesMonitoring',
          operation: serviceName
        }
      }
    );

    this.reportError(error, {
      system: ClientSystem.LIBRARY_SERVICES,
      component: 'ServiceCallMonitor',
      operation: serviceName
    });
  }
}

class LibraryServicesMonitoringMiddleware implements ErrorMonitoringMiddleware {
  private readonly monitoring: LibraryServicesMonitoring;

  constructor() {
    this.monitoring = LibraryServicesMonitoring.getInstance();
  }

  wrap<T extends (...args: any[]) => any>(fn: T, context: ErrorContext): T {
    return ((...args: Parameters<T>) => {
      if (!this.isOperationEnabled(context.operation || 'unknown')) {
        return fn(...args);
      }

      const startTime = performance.now();

      try {
        const result = fn(...args);

        if (result instanceof Promise) {
          return this.handleAsyncResult(result, startTime, context);
        }

        this.trackSuccessfulExecution(startTime, context);
        return result;
      } catch (error) {
        this.handleError(error as Error, startTime, context);
        throw error;
      }
    }) as T;
  }

  wrapAsync<T extends (...args: any[]) => Promise<any>>(fn: T, context: ErrorContext): T {
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

  private handleAsyncResult<T>(
    result: Promise<T>, 
    startTime: number, 
    context: ErrorContext
  ): Promise<T> {
    return result
      .then((value) => {
        this.trackSuccessfulExecution(startTime, context);
        return value;
      })
      .catch((error: Error) => {
        this.handleError(error, startTime, context);
        throw error;
      });
  }

  private trackSuccessfulExecution(startTime: number, context: ErrorContext): void {
    const duration = performance.now() - startTime;
    this.monitoring.trackPerformance({
      operation: context.operation || 'unknown',
      duration,
      success: true,
      timestamp: Date.now(),
      context
    });
  }

  private handleError(error: Error, startTime: number, context: ErrorContext): void {
    const duration = performance.now() - startTime;
    this.monitoring.trackPerformance({
      operation: context.operation || 'unknown',
      duration,
      success: false,
      timestamp: Date.now(),
      context
    });

    this.monitoring.reportError(error, context);
  }

  private isOperationEnabled(operation: string): boolean {
    const monitoring = LibraryServicesMonitoring.getInstance() as any;
    return monitoring.enabledOperations.has('*') 
      || monitoring.enabledOperations.has(operation);
  }
}

// Export instances
export const libraryServicesMonitoring = LibraryServicesMonitoring.getInstance();
export const libraryServicesMonitoringMiddleware = new LibraryServicesMonitoringMiddleware();

// Export classes for testing
export { LibraryServicesMonitoring, LibraryServicesMonitoringMiddleware };