/**
 * Error Aggregation Service
 * Aggregates errors from all client systems for centralized monitoring
 */

import {
  ErrorAggregationService as IErrorAggregationService,
  ClientSystem,
  AppError,
  ErrorDomain,
  ErrorSeverity,
  ErrorContext
} from './unified-error-monitoring-interface';
import { CrossSystemErrorAnalytics } from './cross-system-error-analytics';

interface AggregatedError {
  id: string;
  system: ClientSystem;
  error: AppError;
  context: ErrorContext;
  timestamp: number;
  aggregated: boolean;
}

class ErrorAggregationService implements IErrorAggregationService {
  private static instance: ErrorAggregationService;
  private aggregatedErrors: AggregatedError[] = [];
  private errorStreamSubscribers: Array<(error: AggregatedError) => void> = [];
  private aggregationInterval: NodeJS.Timeout | null = null;
  private analyticsService: CrossSystemErrorAnalytics;

  static getInstance(): ErrorAggregationService {
    if (!ErrorAggregationService.instance) {
      ErrorAggregationService.instance = new ErrorAggregationService();
    }
    return ErrorAggregationService.instance;
  }

  constructor() {
    this.analyticsService = CrossSystemErrorAnalytics.getInstance();
    this.startAggregation();
  }

  /**
   * Add an error to the aggregation pool
   */
  addError(system: ClientSystem, error: AppError, context: ErrorContext): void {
    const aggregatedError: AggregatedError = {
      id: error.id,
      system,
      error,
      context,
      timestamp: Date.now(),
      aggregated: false
    };

    this.aggregatedErrors.push(aggregatedError);

    // Notify analytics service
    this.analyticsService.registerSystemError(system, error, context);

    // Notify stream subscribers
    this.errorStreamSubscribers.forEach(subscriber => {
      try {
        subscriber(aggregatedError);
      } catch (err) {
        console.error('Error in stream subscriber:', err);
      }
    });

    // Keep buffer manageable
    if (this.aggregatedErrors.length > 5000) {
      this.aggregatedErrors = this.aggregatedErrors.slice(-2500);
    }
  }

  /**
   * Start periodic aggregation processing
   */
  private startAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.processAggregatedErrors();
    }, 60000); // Process every minute
  }

  /**
   * Process and aggregate errors
   */
  private processAggregatedErrors(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Mark old errors as aggregated
    this.aggregatedErrors.forEach(err => {
      if (err.timestamp < oneHourAgo && !err.aggregated) {
        err.aggregated = true;
      }
    });

    // Clean up very old errors (keep last 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    this.aggregatedErrors = this.aggregatedErrors.filter(err => err.timestamp > oneDayAgo);
  }

  async aggregateErrors(): Promise<{
    totalErrors: number;
    bySystem: Record<ClientSystem, number>;
    byDomain: Record<ErrorDomain, number>;
    bySeverity: Record<ErrorSeverity, number>;
    trends: Array<{
      period: string;
      errorCount: number;
      change: number;
    }>;
  }> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentErrors = this.aggregatedErrors.filter(err => err.timestamp > oneDayAgo);

    // Count by system
    const bySystem: Record<ClientSystem, number> = {
      [ClientSystem.SECURITY]: 0,
      [ClientSystem.HOOKS]: 0,
      [ClientSystem.LIBRARY_SERVICES]: 0,
      [ClientSystem.SERVICE_ARCHITECTURE]: 0
    };

    recentErrors.forEach(err => {
      bySystem[err.system]++;
    });

    // Count by domain
    const byDomain: Record<ErrorDomain, number> = {
      [ErrorDomain.SYSTEM]: 0,
      [ErrorDomain.NETWORK]: 0,
      [ErrorDomain.AUTH]: 0,
      [ErrorDomain.VALIDATION]: 0,
      [ErrorDomain.BUSINESS]: 0,
      [ErrorDomain.SECURITY]: 0,
      [ErrorDomain.PERFORMANCE]: 0,
      [ErrorDomain.INTEGRATION]: 0
    };

    recentErrors.forEach(err => {
      byDomain[err.error.type]++;
    });

    // Count by severity
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    recentErrors.forEach(err => {
      bySeverity[err.error.severity]++;
    });

    // Calculate trends (hourly for last 24 hours)
    const trends = this.calculateTrends();

    return {
      totalErrors: recentErrors.length,
      bySystem,
      byDomain,
      bySeverity,
      trends
    };
  }

  private calculateTrends(): Array<{
    period: string;
    errorCount: number;
    change: number;
  }> {
    const now = Date.now();
    const trends = [];

    for (let i = 23; i >= 0; i--) {
      const periodStart = now - (i + 1) * 60 * 60 * 1000;
      const periodEnd = now - i * 60 * 60 * 1000;

      const periodErrors = this.aggregatedErrors.filter(
        err => err.timestamp >= periodStart && err.timestamp < periodEnd
      );

      const previousPeriodStart = now - (i + 2) * 60 * 60 * 1000;
      const previousPeriodEnd = now - (i + 1) * 60 * 60 * 1000;

      const previousPeriodErrors = this.aggregatedErrors.filter(
        err => err.timestamp >= previousPeriodStart && err.timestamp < previousPeriodEnd
      );

      const change = previousPeriodErrors.length > 0
        ? ((periodErrors.length - previousPeriodErrors.length) / previousPeriodErrors.length) * 100
        : 0;

      trends.push({
        period: new Date(periodStart).toISOString().slice(0, 13) + ':00', // Hour format
        errorCount: periodErrors.length,
        change: Math.round(change * 100) / 100
      });
    }

    return trends.reverse(); // Most recent first
  }

  async *getErrorStream(): AsyncIterable<{
    system: ClientSystem;
    error: AppError;
    context: ErrorContext;
  }> {
    let lastIndex = 0;

    while (true) {
      // Wait for new errors
      await new Promise(resolve => {
        const checkForNewErrors = () => {
          if (this.aggregatedErrors.length > lastIndex) {
            resolve(void 0);
          } else {
            setTimeout(checkForNewErrors, 100);
          }
        };
        checkForNewErrors();
      });

      // Yield new errors
      while (lastIndex < this.aggregatedErrors.length) {
        const aggregatedError = this.aggregatedErrors[lastIndex];
        lastIndex++;

        yield {
          system: aggregatedError.system,
          error: aggregatedError.error,
          context: aggregatedError.context
        };
      }
    }
  }

  /**
   * Subscribe to real-time error stream
   */
  subscribeToErrorStream(callback: (error: AggregatedError) => void): () => void {
    this.errorStreamSubscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorStreamSubscribers.indexOf(callback);
      if (index > -1) {
        this.errorStreamSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get errors for a specific system
   */
  getSystemErrors(system: ClientSystem, timeRange?: { start: number; end: number }): AggregatedError[] {
    let errors = this.aggregatedErrors.filter(err => err.system === system);

    if (timeRange) {
      errors = errors.filter(err =>
        err.timestamp >= timeRange.start && err.timestamp <= timeRange.end
      );
    }

    return errors;
  }

  /**
   * Get error patterns across systems
   */
  getErrorPatterns(): Array<{
    pattern: string;
    systems: ClientSystem[];
    count: number;
    lastSeen: number;
  }> {
    const patterns: Map<string, {
      systems: Set<ClientSystem>;
      count: number;
      lastSeen: number;
    }> = new Map();

    this.aggregatedErrors.forEach(err => {
      const normalizedMessage = this.normalizeErrorMessage(err.error.message);
      const existing = patterns.get(normalizedMessage) || {
        systems: new Set<ClientSystem>(),
        count: 0,
        lastSeen: 0
      };

      existing.systems.add(err.system);
      existing.count++;
      existing.lastSeen = Math.max(existing.lastSeen, err.timestamp);

      patterns.set(normalizedMessage, existing);
    });

    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        systems: Array.from(data.systems),
        count: data.count,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count);
  }

  private normalizeErrorMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/\d+/g, 'X')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .trim();
  }

  /**
   * Get error statistics for dashboard
   */
  getErrorStatistics(): {
    totalErrors: number;
    activeErrors: number;
    resolvedErrors: number;
    errorRatePerHour: number;
    topErrorTypes: Array<{ type: ErrorDomain; count: number }>;
    systemHealth: Record<ClientSystem, 'healthy' | 'warning' | 'critical'>;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentErrors = this.aggregatedErrors.filter(err => err.timestamp > oneHourAgo);

    const totalErrors = this.aggregatedErrors.length;
    const activeErrors = this.aggregatedErrors.filter(err => !err.aggregated).length;
    const resolvedErrors = totalErrors - activeErrors;
    const errorRatePerHour = recentErrors.length;

    // Top error types
    const typeCounts: Record<ErrorDomain, number> = {
      [ErrorDomain.SYSTEM]: 0,
      [ErrorDomain.NETWORK]: 0,
      [ErrorDomain.AUTH]: 0,
      [ErrorDomain.VALIDATION]: 0,
      [ErrorDomain.BUSINESS]: 0,
      [ErrorDomain.SECURITY]: 0,
      [ErrorDomain.PERFORMANCE]: 0,
      [ErrorDomain.INTEGRATION]: 0
    };

    this.aggregatedErrors.forEach(err => {
      typeCounts[err.error.type]++;
    });

    const topErrorTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({ type: type as ErrorDomain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // System health based on recent errors
    const systemHealth: Record<ClientSystem, 'healthy' | 'warning' | 'critical'> = {
      [ClientSystem.SECURITY]: 'healthy',
      [ClientSystem.HOOKS]: 'healthy',
      [ClientSystem.LIBRARY_SERVICES]: 'healthy',
      [ClientSystem.SERVICE_ARCHITECTURE]: 'healthy'
    };

    Object.values(ClientSystem).forEach(system => {
      const systemErrors = recentErrors.filter(err => err.system === system);
      const errorRate = systemErrors.length;

      if (errorRate > 10) {
        systemHealth[system] = 'critical';
      } else if (errorRate > 5) {
        systemHealth[system] = 'warning';
      }
    });

    return {
      totalErrors,
      activeErrors,
      resolvedErrors,
      errorRatePerHour,
      topErrorTypes,
      systemHealth
    };
  }

  destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    this.errorStreamSubscribers = [];
  }
}

export { ErrorAggregationService };
export default ErrorAggregationService;
