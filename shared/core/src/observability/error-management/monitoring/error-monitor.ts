/**
 * Real-time Error Monitoring and Aggregation
 *
 * Provides comprehensive error monitoring with real-time aggregation,
 * trend analysis, and alerting capabilities.
 */

import { EventEmitter } from 'events';
import { BaseError, ErrorSeverity, ErrorDomain } from '../errors/base-error.js';
import { logger } from '../../logging/index.js';
import {
  ErrorMonitor,
  ErrorMetrics,
  ErrorAggregation,
  ErrorContext,
  ErrorAnalytics
} from '../types.js';

export interface ErrorMonitorConfig {
  aggregationWindow: number; // in milliseconds
  maxStoredErrors: number;
  enableMetrics: boolean;
  alertThresholds: {
    errorRate: number;
    criticalErrors: number;
    timeWindow: number;
  };
}

export class RealTimeErrorMonitor extends EventEmitter implements ErrorMonitor {
  private errors: Array<{ error: BaseError; context: ErrorContext; timestamp: Date }> = [];
  private metrics: ErrorMetrics;
  private config: ErrorMonitorConfig;
  private aggregationTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<ErrorMonitorConfig> = {}) {
    super();

    this.config = {
      aggregationWindow: config.aggregationWindow ?? 60000, // 1 minute
      maxStoredErrors: config.maxStoredErrors ?? 10000,
      enableMetrics: config.enableMetrics ?? true,
      alertThresholds: config.alertThresholds ?? {
        errorRate: 10, // errors per minute
        criticalErrors: 5,
        timeWindow: 300000 // 5 minutes
      }
    };

    this.metrics = this.initializeMetrics();
  }

  /**
   * Start the error monitor
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Start aggregation timer
    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
    }, this.config.aggregationWindow);

    logger.info('Error monitor started', {
      component: 'ErrorMonitor',
      aggregationWindow: this.config.aggregationWindow
    });
  }

  /**
   * Stop the error monitor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }

    logger.info('Error monitor stopped', { component: 'ErrorMonitor' });
  }

  /**
   * Register an error event handler
   */
  onError(callback: (error: BaseError, context: ErrorContext) => void): void {
    this.on('error', callback);
  }

  /**
   * Track a new error
   */
  async trackError(error: BaseError, context: ErrorContext = {}): Promise<void> {
    if (!this.isRunning) return;

    const timestamp = new Date();
    const errorEntry = { error, context, timestamp };

    // Add to error store
    this.errors.push(errorEntry);

    // Maintain size limit
    if (this.errors.length > this.config.maxStoredErrors) {
      this.errors.shift();
    }

    // Update metrics
    this.updateMetrics(error);

    // Emit error event
    this.emit('error', error, context);

    // Check for alerts
    await this.checkAlerts(error, context);

    // Record metrics if enabled
    if (this.config.enableMetrics) {
      this.recordMetrics(error, context);
    }

    logger.debug('Error tracked', {
      component: 'ErrorMonitor',
      errorId: error.errorId,
      code: error.code,
      severity: error.metadata.severity
    });
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get error aggregation for a time window
   */
  getAggregation(timeWindow?: number): ErrorAggregation {
    const window = timeWindow ?? this.config.aggregationWindow;
    const cutoff = new Date(Date.now() - window);

    const windowErrors = this.errors.filter(entry => entry.timestamp >= cutoff);

    // Count errors by type
    const errorCounts = new Map<string, number>();
    const uniqueErrors = new Set<string>();

    windowErrors.forEach(({ error }) => {
      const key = `${error.code}:${error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      uniqueErrors.add(key);
    });

    // Get top errors
    const topErrors = Array.from(errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({
        error,
        count,
        lastSeen: windowErrors
          .filter(e => `${e.error.code}:${e.error.message}` === error)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || new Date()
      }));

    // Calculate trends (simple comparison with previous window)
    const previousWindowErrors = this.errors.filter(
      entry => entry.timestamp >= new Date(cutoff.getTime() - window) && entry.timestamp < cutoff
    );

    const currentRate = windowErrors.length / (window / 60000); // errors per minute
    const previousRate = previousWindowErrors.length / (window / 60000);

    return {
      timeWindow: window,
      errorCount: windowErrors.length,
      uniqueErrors: uniqueErrors.size,
      topErrors,
      trends: {
        increasing: currentRate > previousRate,
        rate: currentRate,
        period: `${window / 1000}s`
      }
    };
  }

  /**
   * Get comprehensive error analytics
   */
  getAnalytics(): ErrorAnalytics {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    // Calculate total errors
    const totalErrors = this.errors.length;

    // Calculate error rate (errors per minute over last hour)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp >= lastHour);
    const errorRate = recentErrors.length;

    // Error distribution by severity
    const errorDistribution = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    this.errors.forEach(({ error }) => {
      errorDistribution[error.metadata.severity]++;
    });

    // Generate trend data
    const trends = {
      daily: this.generateTrendData(oneDay, 24),
      weekly: this.generateTrendData(oneWeek, 7).map(item => ({ week: item.date, count: item.count })),
      monthly: this.generateTrendData(oneMonth, 30).map(item => ({ month: item.date, count: item.count }))
    };

    // Top error types
    const errorTypeCounts = new Map<string, number>();
    this.errors.forEach(({ error }) => {
      const type = error.code;
      errorTypeCounts.set(type, (errorTypeCounts.get(type) || 0) + 1);
    });

    const topErrorTypes = Array.from(errorTypeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / totalErrors) * 100
      }));

    // Calculate recovery success rate (simplified)
    const recoverySuccessRate = 0.75; // This would be calculated from actual recovery attempts

    // User impact metrics (simplified)
    const uniqueUsers = new Set(this.errors.map(e => e.context.user_id).filter(Boolean));
    const uniqueSessions = new Set(this.errors.map(e => e.context.metadata?.session_id).filter(Boolean));

    return {
      totalErrors,
      errorRate,
      errorDistribution,
      errorTrends: trends,
      topErrorTypes,
      recoverySuccessRate,
      userImpact: {
        affectedUsers: uniqueUsers.size,
        sessionsWithErrors: uniqueSessions.size,
        errorPerSession: uniqueSessions.size > 0 ? totalErrors / uniqueSessions.size : 0
      }
    };
  }

  private initializeMetrics(): ErrorMetrics {
    return {
      errorCount: 0,
      errorRate: 0,
      lastError: undefined,
      errorsByType: {},
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      }
    };
  }

  private updateMetrics(error: BaseError): void {
    this.metrics.errorCount++;
    this.metrics.lastError = new Date();

    // Update by type
    this.metrics.errorsByType[error.code] = (this.metrics.errorsByType[error.code] || 0) + 1;

    // Update by severity
    this.metrics.errorsBySeverity[error.metadata.severity]++;

    // Calculate error rate (errors per minute over last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp >= fiveMinutesAgo);
    this.metrics.errorRate = recentErrors.length / 5;
  }

  private async checkAlerts(error: BaseError, context: ErrorContext): Promise<void> {
    const now = new Date();
    const timeWindow = this.config.alertThresholds.timeWindow;
    const cutoff = new Date(now.getTime() - timeWindow);

    const windowErrors = this.errors.filter(e => e.timestamp >= cutoff);

    // Check error rate
    const errorRate = windowErrors.length / (timeWindow / 60000); // errors per minute
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.emit('alert', {
        type: 'high_error_rate',
        message: `Error rate exceeded threshold: ${errorRate.toFixed(2)} errors/minute`,
        severity: 'warning',
        data: { errorRate, threshold: this.config.alertThresholds.errorRate }
      });
    }

    // Check critical errors
    const criticalErrors = windowErrors.filter(e => e.error.metadata.severity === ErrorSeverity.CRITICAL);
    if (criticalErrors.length >= this.config.alertThresholds.criticalErrors) {
      this.emit('alert', {
        type: 'critical_errors',
        message: `${criticalErrors.length} critical errors in ${timeWindow / 60000} minutes`,
        severity: 'critical',
        data: { criticalCount: criticalErrors.length, threshold: this.config.alertThresholds.criticalErrors }
      });
    }
  }

  private recordMetrics(error: BaseError, context: ErrorContext): void {
    // For now, just log metrics - can be extended to integrate with actual metrics collector
    logger.debug('Recording error metrics', {
      component: 'ErrorMonitor',
      errorId: error.errorId,
      severity: error.metadata.severity,
      domain: error.metadata.domain,
      code: error.code,
      errorRate: this.metrics.errorRate
    });
  }

  private performAggregation(): void {
    if (!this.isRunning) return;

    const aggregation = this.getAggregation();

    // Emit aggregation event
    this.emit('aggregation', aggregation);

    logger.debug('Error aggregation performed', {
      component: 'ErrorMonitor',
      errorCount: aggregation.errorCount,
      uniqueErrors: aggregation.uniqueErrors
    });
  }

  private generateTrendData(timeRange: number, periods: number): Array<{ date: string; count: number }> {
    const now = new Date();
    const periodLength = timeRange / periods;
    const data: Array<{ date: string; count: number }> = [];

    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = new Date(now.getTime() - (i + 1) * periodLength);
      const periodEnd = new Date(now.getTime() - i * periodLength);

      const count = this.errors.filter(
        e => e.timestamp >= periodStart && e.timestamp < periodEnd
      ).length;

      data.push({
        date: periodStart.toISOString().split('T')[0], // YYYY-MM-DD format
        count
      });
    }

    return data;
  }
}

/**
 * Create a new error monitor instance
 */
export function createErrorMonitor(
  config?: Partial<ErrorMonitorConfig>
): ErrorMonitor {
  return new RealTimeErrorMonitor(config);
}


