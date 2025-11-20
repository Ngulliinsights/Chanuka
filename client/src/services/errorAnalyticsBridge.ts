/**
 * Error Analytics Bridge Service
 *
 * Provides a bridge between the Error Analytics Dashboard and the core error handler,
 * transforming core error data into analytics-ready format and providing analytics
 * methods that integrate with the existing error management system.
 */

import { coreErrorHandler } from '@client/core/error/handler';
import { ErrorDomain, ErrorSeverity } from '@client/core/error/types';

// Import analytics types
interface TimeRange {
  start: number;
  end: number;
  preset?: '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
}

interface DashboardFilters {
  timeRange: TimeRange;
  severity: string[];
  domain: string[];
  component: string[];
  userId?: string;
  sessionId?: string;
}

interface ErrorOverviewMetrics {
  totalErrors: number;
  errorRate: number;
  uniqueErrors: number;
  affectedUsers: number;
  averageResolutionTime: number;
  severityDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
  timeRange: TimeRange;
  lastUpdated: number;
}

interface ErrorTrendData {
  timeSeries: any[];
  growthRate: number;
  seasonality: any;
  anomalies: any[];
  projections: any;
  period: string;
}

interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: number;
  severity: string;
  domain: string;
  cluster: any;
  impact: any;
  recommendations: string[];
}

interface RecoveryAnalytics {
  overallSuccessRate: number;
  strategyEffectiveness: any[];
  recoveryTimeDistribution: any;
  failureAnalysis: any[];
  automatedRecoveryRate: number;
  manualInterventionRate: number;
}

interface RealTimeMetrics {
  currentErrorRate: number;
  activeAlerts: any[];
  liveStream: any[];
  systemHealth: any;
  performanceMetrics: any;
}

class ErrorAnalyticsBridge {
  private static instance: ErrorAnalyticsBridge;

  private constructor() {}

  static getInstance(): ErrorAnalyticsBridge {
    if (!ErrorAnalyticsBridge.instance) {
      ErrorAnalyticsBridge.instance = new ErrorAnalyticsBridge();
    }
    return ErrorAnalyticsBridge.instance;
  }

  /**
   * Get overview metrics from core error handler
   */
  async getOverviewMetrics(filters: DashboardFilters): Promise<ErrorOverviewMetrics> {
    const coreStats = coreErrorHandler.getErrorStats();
    const recentErrors = coreErrorHandler.getRecentErrors(1000);

    // Filter errors based on dashboard filters
    const filteredErrors = this.filterErrors(recentErrors, filters);

    return {
      totalErrors: filteredErrors.length,
      errorRate: this.calculateErrorRate(filteredErrors, filters.timeRange),
      uniqueErrors: this.calculateUniqueErrors(filteredErrors),
      affectedUsers: this.calculateAffectedUsers(filteredErrors),
      averageResolutionTime: this.calculateAverageResolutionTime(filteredErrors),
      severityDistribution: this.buildSeverityDistribution(filteredErrors),
      domainDistribution: this.buildDomainDistribution(filteredErrors),
      timeRange: filters.timeRange,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get trend data from core error handler
   */
  async getTrendData(period: string, filters: DashboardFilters): Promise<ErrorTrendData> {
    const recentErrors = coreErrorHandler.getRecentErrors(2000);
    const filteredErrors = this.filterErrors(recentErrors, filters);

    const timeSeries = this.buildTimeSeries(filteredErrors, period, filters);

    return {
      timeSeries,
      growthRate: this.calculateGrowthRate(timeSeries),
      seasonality: this.detectSeasonality(timeSeries),
      anomalies: this.detectAnomalies(timeSeries),
      projections: this.calculateProjections(timeSeries),
      period,
    };
  }

  /**
   * Get error patterns from core error handler
   */
  async getPatterns(filters: DashboardFilters): Promise<ErrorPattern[]> {
    const recentErrors = coreErrorHandler.getRecentErrors(2000);
    const filteredErrors = this.filterErrors(recentErrors, filters);

    return this.detectErrorPatterns(filteredErrors, filters);
  }

  /**
   * Get recovery analytics from core error handler
   */
  async getRecoveryAnalytics(filters: DashboardFilters): Promise<RecoveryAnalytics> {
    const recentErrors = coreErrorHandler.getRecentErrors(1000);
    const filteredErrors = this.filterErrors(recentErrors, filters);
    const recoveredErrors = filteredErrors.filter(e => e.recovered);

    return {
      overallSuccessRate: filteredErrors.length > 0 ? recoveredErrors.length / filteredErrors.length : 0,
      strategyEffectiveness: this.calculateStrategyEffectiveness(recoveredErrors),
      recoveryTimeDistribution: this.calculateRecoveryTimeDistribution(recoveredErrors),
      failureAnalysis: this.calculateRecoveryFailures(filteredErrors.filter(e => !e.recovered)),
      automatedRecoveryRate: recoveredErrors.length > 0 ? recoveredErrors.filter(e => e.recoveryStrategy).length / recoveredErrors.length : 0,
      manualInterventionRate: recoveredErrors.length > 0 ? recoveredErrors.filter(e => !e.recoveryStrategy).length / recoveredErrors.length : 0,
    };
  }

  /**
   * Get real-time metrics from core error handler
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const recentErrors = coreErrorHandler.getRecentErrors(50);

    return {
      currentErrorRate: this.calculateCurrentErrorRate(recentErrors),
      activeAlerts: this.generateActiveAlerts(recentErrors),
      liveStream: recentErrors.slice(0, 20).map(this.transformToErrorEvent),
      systemHealth: this.getSystemHealthStatus(),
      performanceMetrics: this.getPerformanceMetrics(),
    };
  }

  /**
   * Filter errors based on dashboard filters
   */
  private filterErrors(errors: any[], filters: DashboardFilters): any[] {
    return errors.filter(error => {
      // Time range filter
      if (error.timestamp < filters.timeRange.start || error.timestamp > filters.timeRange.end) {
        return false;
      }

      // Severity filter
      if (filters.severity.length > 0 && !filters.severity.includes(error.severity)) {
        return false;
      }

      // Domain filter
      if (filters.domain.length > 0 && !filters.domain.includes(error.type)) {
        return false;
      }

      // Component filter
      if (filters.component.length > 0 && !filters.component.includes(error.context?.component)) {
        return false;
      }

      // User ID filter
      if (filters.userId && error.context?.userId !== filters.userId) {
        return false;
      }

      // Session ID filter
      if (filters.sessionId && error.context?.sessionId !== filters.sessionId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate error rate for time range
   */
  private calculateErrorRate(errors: any[], timeRange: TimeRange): number {
    const durationMs = timeRange.end - timeRange.start;
    const durationMinutes = durationMs / (60 * 1000);
    return durationMinutes > 0 ? errors.length / durationMinutes : 0;
  }

  /**
   * Calculate current error rate (last 5 minutes)
   */
  private calculateCurrentErrorRate(errors: any[]): number {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentErrors = errors.filter(e => e.timestamp > fiveMinutesAgo);
    return recentErrors.length / 5; // per minute
  }

  /**
   * Calculate unique errors
   */
  private calculateUniqueErrors(errors: any[]): number {
    const messages = new Set(errors.map(e => e.message));
    return messages.size;
  }

  /**
   * Calculate affected users
   */
  private calculateAffectedUsers(errors: any[]): number {
    const users = new Set(errors.map(e => e.context?.userId).filter(Boolean));
    return users.size;
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(errors: any[]): number {
    const resolvedErrors = errors.filter(e => e.recovered && e.recoveryTime);
    if (resolvedErrors.length === 0) return 0;

    const totalTime = resolvedErrors.reduce((sum, e) => sum + e.recoveryTime, 0);
    return totalTime / resolvedErrors.length;
  }

  /**
   * Build severity distribution
   */
  private buildSeverityDistribution(errors: any[]): Record<string, number> {
    const distribution = {
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.LOW]: 0,
    };

    errors.forEach(error => {
      if (distribution.hasOwnProperty(error.severity)) {
        distribution[error.severity]++;
      }
    });

    return distribution;
  }

  /**
   * Build domain distribution
   */
  private buildDomainDistribution(errors: any[]): Record<string, number> {
    const distribution = {
      [ErrorDomain.NETWORK]: 0,
      [ErrorDomain.AUTHENTICATION]: 0,
      [ErrorDomain.VALIDATION]: 0,
      [ErrorDomain.SYSTEM]: 0,
      [ErrorDomain.UNKNOWN]: 0,
    };

    errors.forEach(error => {
      if (distribution.hasOwnProperty(error.type)) {
        distribution[error.type]++;
      }
    });

    return distribution;
  }

  /**
   * Build time series data
   */
  private buildTimeSeries(errors: any[], period: string, filters: DashboardFilters): any[] {
    const intervalMs = this.getIntervalMs(period);
    const intervals: { [key: number]: any[] } = {};

    errors.forEach(error => {
      const interval = Math.floor(error.timestamp / intervalMs) * intervalMs;
      if (!intervals[interval]) intervals[interval] = [];
      intervals[interval].push(error);
    });

    return Object.entries(intervals)
      .map(([timestamp, intervalErrors]) => ({
        timestamp: parseInt(timestamp),
        totalErrors: intervalErrors.length,
        errorRate: intervalErrors.length / (intervalMs / (60 * 1000)),
        severityBreakdown: this.buildSeverityDistribution(intervalErrors),
        domainBreakdown: this.buildDomainDistribution(intervalErrors),
        uniqueErrors: new Set(intervalErrors.map(e => e.message)).size,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get interval in milliseconds for period
   */
  private getIntervalMs(period: string): number {
    switch (period) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 24 * 60 * 60 * 1000; // 1 day
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Calculate growth rate from time series
   */
  private calculateGrowthRate(timeSeries: any[]): number {
    if (timeSeries.length < 2) return 0;

    const recent = timeSeries.slice(-10);
    const earlier = timeSeries.slice(-20, -10);

    const recentAvg = recent.reduce((sum, point) => sum + point.totalErrors, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, point) => sum + point.totalErrors, 0) / earlier.length;

    return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  }

  /**
   * Detect seasonality in time series
   */
  private detectSeasonality(timeSeries: any[]): any {
    // Simple seasonality detection - in real implementation would use statistical analysis
    return {
      detected: false,
      pattern: null,
      confidence: 0,
      peakHours: [],
    };
  }

  /**
   * Detect anomalies in time series
   */
  private detectAnomalies(timeSeries: any[]): any[] {
    if (timeSeries.length < 10) return [];

    const values = timeSeries.map(p => p.totalErrors);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    return timeSeries
      .filter(point => Math.abs(point.totalErrors - mean) > 2 * stdDev)
      .map(point => ({
        timestamp: point.timestamp,
        value: point.totalErrors,
        expectedValue: mean,
        deviation: Math.abs(point.totalErrors - mean),
        severity: point.totalErrors > mean + 3 * stdDev ? 'critical' : 'high',
        description: `Anomalous error count: ${point.totalErrors} (expected: ${mean.toFixed(1)})`,
      }));
  }

  /**
   * Calculate trend projections
   */
  private calculateProjections(timeSeries: any[]): any {
    if (timeSeries.length < 5) return { nextHour: 0, nextDay: 0, nextWeek: 0, confidence: 0 };

    const recent = timeSeries.slice(-5);
    const trend = recent.reduce((acc, point, i) => {
      if (i === 0) return acc;
      return acc + (point.totalErrors - recent[i-1].totalErrors);
    }, 0) / (recent.length - 1);

    const lastValue = recent[recent.length - 1].totalErrors;

    return {
      nextHour: Math.max(0, lastValue + trend),
      nextDay: Math.max(0, lastValue + trend * 24),
      nextWeek: Math.max(0, lastValue + trend * 168),
      confidence: 0.7,
    };
  }

  /**
   * Detect error patterns
   */
  private detectErrorPatterns(errors: any[], filters: DashboardFilters): ErrorPattern[] {
    const patternMap: { [key: string]: any[] } = {};

    errors.forEach(error => {
      const key = `${error.message}-${error.context?.component || 'unknown'}`;
      if (!patternMap[key]) patternMap[key] = [];
      patternMap[key].push(error);
    });

    return Object.entries(patternMap)
      .filter(([, errors]) => errors.length > 1)
      .map(([key, patternErrors]) => ({
        id: key,
        name: patternErrors[0].message,
        description: `Pattern detected in ${patternErrors[0].context?.component || 'unknown component'}`,
        frequency: patternErrors.length,
        firstSeen: Math.min(...patternErrors.map(e => e.timestamp)),
        lastSeen: Math.max(...patternErrors.map(e => e.timestamp)),
        affectedUsers: new Set(patternErrors.map(e => e.context?.userId).filter(Boolean)).size,
        severity: patternErrors[0].severity,
        domain: patternErrors[0].type,
        cluster: {
          centroid: {
            message: patternErrors[0].message,
            stackTrace: patternErrors[0].stack || '',
            component: patternErrors[0].context?.component || '',
            userAgent: patternErrors[0].context?.userAgent || '',
            url: patternErrors[0].context?.url || '',
          },
          members: patternErrors.map(e => ({
            id: e.id,
            timestamp: e.timestamp,
            userId: e.context?.userId || '',
            sessionId: e.context?.sessionId || '',
            context: e.context,
          })),
          similarity: 0.9,
          radius: 0.1,
        },
        impact: {
          userExperience: patternErrors[0].severity === ErrorSeverity.CRITICAL ? 'critical' : 'high',
          businessImpact: patternErrors.length > 10 ? 'high' : 'medium',
          frequency: patternErrors.length > 50 ? 'persistent' : patternErrors.length > 10 ? 'frequent' : 'occasional',
          scope: 'widespread',
        },
        recommendations: this.generateRecommendations(patternErrors[0]),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  /**
   * Generate recommendations for error patterns
   */
  private generateRecommendations(error: any): string[] {
    const recommendations = [];

    if (error.type === ErrorDomain.NETWORK) {
      recommendations.push('Implement retry logic with exponential backoff');
      recommendations.push('Add network status monitoring');
    }

    if (error.severity === ErrorSeverity.CRITICAL) {
      recommendations.push('Implement circuit breaker pattern');
      recommendations.push('Add comprehensive error boundaries');
    }

    recommendations.push('Add detailed logging for debugging');
    recommendations.push('Implement user-friendly error messages');

    return recommendations;
  }

  /**
   * Calculate strategy effectiveness
   */
  private calculateStrategyEffectiveness(recoveredErrors: any[]): any[] {
    const strategies: { [key: string]: any[] } = {};

    recoveredErrors.forEach(error => {
      const strategy = error.recoveryStrategy || 'manual';
      if (!strategies[strategy]) strategies[strategy] = [];
      strategies[strategy].push(error);
    });

    return Object.entries(strategies).map(([strategyId, errors]) => ({
      strategyId,
      strategyName: strategyId,
      successRate: 1, // All these are successful by definition
      averageRecoveryTime: errors.reduce((sum, e) => sum + (e.recoveryTime || 300000), 0) / errors.length,
      usageCount: errors.length,
      failureReasons: [],
      improvementSuggestions: [],
    }));
  }

  /**
   * Calculate recovery time distribution
   */
  private calculateRecoveryTimeDistribution(recoveredErrors: any[]): any {
    const times = recoveredErrors.map(e => e.recoveryTime || 300000).sort((a, b) => a - b);

    return {
      p50: times[Math.floor(times.length * 0.5)] || 0,
      p95: times[Math.floor(times.length * 0.95)] || 0,
      p99: times[Math.floor(times.length * 0.99)] || 0,
      average: times.reduce((sum, t) => sum + t, 0) / times.length || 0,
      min: times[0] || 0,
      max: times[times.length - 1] || 0,
    };
  }

  /**
   * Calculate recovery failures
   */
  private calculateRecoveryFailures(failedErrors: any[]): any[] {
    return failedErrors.slice(0, 10).map(error => ({
      strategyId: error.recoveryStrategy || 'none',
      errorId: error.id,
      reason: 'Recovery strategy failed or not available',
      timestamp: error.timestamp,
      context: error.context,
      alternativeStrategies: ['manual_intervention', 'page_reload', 'cache_clear'],
    }));
  }

  /**
   * Generate active alerts
   */
  private generateActiveAlerts(recentErrors: any[]): any[] {
    const alerts = [];

    // High error rate alert
    if (recentErrors.length > 10) {
      alerts.push({
        id: 'high-error-rate',
        type: 'threshold',
        severity: 'warning',
        title: 'High Error Rate Detected',
        description: `${recentErrors.length} errors in the last 5 minutes`,
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false,
        threshold: { metric: 'error_rate', operator: 'gt', value: 10, duration: 5 },
      });
    }

    // Critical errors alert
    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL);
    if (criticalErrors.length > 0) {
      alerts.push({
        id: 'critical-errors',
        type: 'threshold',
        severity: 'critical',
        title: 'Critical Errors Detected',
        description: `${criticalErrors.length} critical errors require immediate attention`,
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false,
      });
    }

    return alerts;
  }

  /**
   * Transform error to event format
   */
  private transformToErrorEvent(error: any): any {
    return {
      id: error.id,
      timestamp: error.timestamp,
      type: error.type,
      severity: error.severity,
      message: error.message,
      userId: error.context?.userId || '',
      sessionId: error.context?.sessionId || '',
      component: error.context?.component || '',
      recoverable: error.recoverable,
      recovered: error.recovered,
    };
  }

  /**
   * Get system health status
   */
  private getSystemHealthStatus(): any {
    return {
      overall: 'healthy',
      components: [{
        name: 'Error Handler',
        status: 'healthy',
        responseTime: 10,
        errorRate: 0,
        lastCheck: Date.now(),
      }],
      uptime: Date.now() - (window.performance.timing.navigationStart || Date.now()),
      lastIncident: null,
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): any {
    return {
      averageResponseTime: 150,
      errorProcessingTime: 5,
      memoryUsage: (performance as any).memory?.usedJSHeapSize / (performance as any).memory?.totalJSHeapSize * 100 || 0,
      cpuUsage: 0,
      throughput: 0,
    };
  }
}

// Export singleton instance
export const errorAnalyticsBridge = ErrorAnalyticsBridge.getInstance();
export { ErrorAnalyticsBridge };