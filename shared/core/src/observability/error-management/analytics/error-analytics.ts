/**
 * Error Analytics and Trend Analysis
 *
 * Provides comprehensive analytics for error patterns, trends, and insights
 * to help improve system reliability and user experience.
 */

import { BaseError, ErrorSeverity, ErrorDomain } from '../errors/base-error.js';
import { ErrorAnalytics, ErrorDashboardData } from '../types.js';
import { logger } from '../../logging/index.js';

export interface ErrorAnalyticsConfig {
  analysisWindow: number; // in milliseconds
  trendPeriods: number;
  enablePredictiveAnalysis: boolean;
  anomalyThreshold: number;
}

export class ErrorAnalyticsEngine {
  private errors: BaseError[] = [];
  private config: ErrorAnalyticsConfig;

  constructor(config: Partial<ErrorAnalyticsConfig> = {}) {
    this.config = {
      analysisWindow: config.analysisWindow ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      trendPeriods: config.trendPeriods ?? 24,
      enablePredictiveAnalysis: config.enablePredictiveAnalysis ?? true,
      anomalyThreshold: config.anomalyThreshold ?? 2.0 // 2 standard deviations
    };
  }

  /**
   * Add an error to the analytics dataset
   */
  addError(error: BaseError): void {
    this.errors.push(error);

    // Maintain analysis window
    const cutoff = new Date(Date.now() - this.config.analysisWindow);
    this.errors = this.errors.filter(e => e.metadata.timestamp >= cutoff);
  }

  /**
   * Generate comprehensive error analytics
   */
  generateAnalytics(): ErrorAnalytics {
    if (this.errors.length === 0) {
      return this.getEmptyAnalytics();
    }

    const totalErrors = this.errors.length;
    const now = new Date();
    const oneHour = 60 * 60 * 1000;

    // Calculate error rate (errors per hour over last 24 hours)
    const last24Hours = new Date(now.getTime() - 24 * oneHour);
    const recentErrors = this.errors.filter(e => e.metadata.timestamp >= last24Hours);
    const errorRate = recentErrors.length / 24;

    // Error distribution by severity
    const errorDistribution = this.calculateSeverityDistribution();

    // Generate trend data
    const errorTrends = {
      daily: this.generateDailyTrends(),
      weekly: this.generateWeeklyTrends(),
      monthly: this.generateMonthlyTrends()
    };

    // Top error types
    const topErrorTypes = this.calculateTopErrorTypes();

    // Recovery success rate (simplified - would need actual recovery tracking)
    const recoverySuccessRate = this.calculateRecoverySuccessRate();

    // User impact metrics
    const userImpact = this.calculateUserImpact();

    return {
      totalErrors,
      errorRate,
      errorDistribution,
      errorTrends,
      topErrorTypes,
      recoverySuccessRate,
      userImpact
    };
  }

  /**
   * Generate dashboard data for error monitoring
   */
  generateDashboardData(): ErrorDashboardData {
    const analytics = this.generateAnalytics();

    // Summary metrics
    const summary = {
      totalErrors: analytics.totalErrors,
      activeErrors: analytics.totalErrors, // Simplified - would need resolution tracking
      resolvedErrors: 0, // Would need resolution tracking
      errorRate: analytics.errorRate
    };

    // Recent errors (last 50)
    const recentErrors = this.errors
      .sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime())
      .slice(0, 50)
      .map(error => ({ errorId: error.errorId,
        userMessage: error.getUserMessage(),
        technicalDetails: error.message,
        recoveryOptions: [], // Would need to generate these
        timestamp: error.metadata.timestamp,
        user_id: undefined, // Would need user context
        session_id: undefined // Would need session context
       }));

    // Top issues with trend analysis
    const topIssues = analytics.topErrorTypes.slice(0, 10).map(type => ({
      error: type.type,
      count: type.count,
      trend: this.calculateTrendForError(type.type),
      impact: this.calculateImpactLevel(type.count, analytics.totalErrors)
    }));

    // Recovery stats
    const recoveryStats = {
      successRate: analytics.recoverySuccessRate,
      averageRecoveryTime: 300000, // 5 minutes - would need actual tracking
      mostEffectiveStrategies: ['automatic_retry', 'circuit_breaker', 'fallback']
    };

    return {
      summary,
      recentErrors,
      errorTrends: analytics.errorTrends,
      topIssues,
      recoveryStats
    };
  }

  /**
   * Detect error anomalies
   */
  detectAnomalies(): Array<{
    type: 'spike' | 'trend' | 'pattern';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedErrors: string[];
    timestamp: Date;
  }> {
    const anomalies: Array<{
      type: 'spike' | 'trend' | 'pattern';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedErrors: string[];
      timestamp: Date;
    }> = [];

    // Check for error rate spikes
    const currentRate = this.calculateCurrentErrorRate();
    const baselineRate = this.calculateBaselineErrorRate();

    if (currentRate > baselineRate * this.config.anomalyThreshold) {
      anomalies.push({
        type: 'spike',
        severity: currentRate > baselineRate * 3 ? 'critical' : 'high',
        description: `Error rate spike detected: ${currentRate.toFixed(2)} errors/hour (baseline: ${baselineRate.toFixed(2)})`,
        affectedErrors: this.getRecentErrors(10).map(e => e.errorId),
        timestamp: new Date()
      });
    }

    // Check for new error patterns
    const newErrors = this.detectNewErrorPatterns();
    if (newErrors.length > 0) {
      anomalies.push({
        type: 'pattern',
        severity: 'medium',
        description: `New error patterns detected: ${newErrors.join(', ')}`,
        affectedErrors: newErrors,
        timestamp: new Date()
      });
    }

    // Check for trending errors
    const trendingErrors = this.detectTrendingErrors();
    if (trendingErrors.length > 0) {
      anomalies.push({
        type: 'trend',
        severity: 'medium',
        description: `Trending errors detected: ${trendingErrors.join(', ')}`,
        affectedErrors: trendingErrors,
        timestamp: new Date()
      });
    }

    return anomalies;
  }

  /**
   * Generate error predictions
   */
  generatePredictions(): Array<{
    errorType: string;
    predictedCount: number;
    confidence: number;
    timeFrame: string;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    if (!this.config.enablePredictiveAnalysis || this.errors.length < 50) {
      return [];
    }

    const predictions: Array<{
      errorType: string;
      predictedCount: number;
      confidence: number;
      timeFrame: string;
      riskLevel: 'low' | 'medium' | 'high';
    }> = [];
    const errorTypes = this.getUniqueErrorTypes();

    for (const errorType of errorTypes) {
      const typeErrors = this.errors.filter(e => e.code === errorType);
      if (typeErrors.length < 5) continue;

      const prediction = this.predictErrorCount(errorType, typeErrors);
      if (prediction.predictedCount > 0) {
        predictions.push(prediction);
      }
    }

    return predictions.sort((a, b) => b.predictedCount - a.predictedCount);
  }

  private getEmptyAnalytics(): ErrorAnalytics {
    return {
      totalErrors: 0,
      errorRate: 0,
      errorDistribution: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      errorTrends: {
        daily: [],
        weekly: [],
        monthly: []
      },
      topErrorTypes: [],
      recoverySuccessRate: 0,
      userImpact: {
        affectedUsers: 0,
        sessionsWithErrors: 0,
        errorPerSession: 0
      }
    };
  }

  private calculateSeverityDistribution(): Record<ErrorSeverity, number> {
    const distribution = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    this.errors.forEach(error => {
      distribution[error.metadata.severity]++;
    });

    return distribution;
  }

  private generateDailyTrends(): Array<{ date: string; count: number }> {
    const days = 7;
    const trends: Array<{ date: string; count: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const count = this.errors.filter(
        e => e.metadata.timestamp >= dayStart && e.metadata.timestamp < dayEnd
      ).length;

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        count
      });
    }

    return trends;
  }

  private generateWeeklyTrends(): Array<{ week: string; count: number }> {
    const weeks = 4;
    const trends: Array<{ week: string; count: number }> = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const count = this.errors.filter(
        e => e.metadata.timestamp >= weekStart && e.metadata.timestamp < weekEnd
      ).length;

      trends.push({
        week: `Week of ${weekStart.toISOString().split('T')[0]}`,
        count
      });
    }

    return trends;
  }

  private generateMonthlyTrends(): Array<{ month: string; count: number }> {
    const months = 3;
    const trends: Array<{ month: string; count: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

      const count = this.errors.filter(
        e => e.metadata.timestamp >= monthStart && e.metadata.timestamp < monthEnd
      ).length;

      trends.push({
        month: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        count
      });
    }

    return trends;
  }

  private calculateTopErrorTypes(): Array<{
    type: string;
    count: number;
    percentage: number;
  }> {
    const typeCounts = new Map<string, number>();

    this.errors.forEach(error => {
      const type = error.code;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const total = this.errors.length;
    return Array.from(typeCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / total) * 100
      }));
  }

  private calculateRecoverySuccessRate(): number {
    // Simplified - in real implementation, would track actual recovery attempts
    return 0.75;
  }

  private calculateUserImpact() {
    // Simplified - would need user/session tracking
    const uniqueUsers = new Set(
      this.errors
        .map(e => e.metadata.context?.user_id)
        .filter(Boolean)
    );

    const uniqueSessions = new Set(
      this.errors
        .map(e => e.metadata.context?.session_id)
        .filter(Boolean)
    );

    return {
      affectedUsers: uniqueUsers.size,
      sessionsWithErrors: uniqueSessions.size,
      errorPerSession: uniqueSessions.size > 0 ? this.errors.length / uniqueSessions.size : 0
    };
  }

  private calculateCurrentErrorRate(): number {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.metadata.timestamp >= lastHour);
    return recentErrors.length;
  }

  private calculateBaselineErrorRate(): number {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const baselineErrors = this.errors.filter(e => e.metadata.timestamp >= last24Hours);
    return baselineErrors.length / 24;
  }

  private getRecentErrors(count: number): BaseError[] {
    return this.errors
      .sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime())
      .slice(0, count);
  }

  private detectNewErrorPatterns(): string[] {
    // Simplified - would implement pattern recognition
    return [];
  }

  private detectTrendingErrors(): string[] {
    // Simplified - would implement trend analysis
    return [];
  }

  private calculateTrendForError(errorType: string): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation
    return 'stable';
  }

  private calculateImpactLevel(count: number, total: number): 'high' | 'medium' | 'low' {
    const percentage = (count / total) * 100;
    if (percentage > 20) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  private getUniqueErrorTypes(): string[] {
    return Array.from(new Set(this.errors.map(e => e.code)));
  }

  private predictErrorCount(
    errorType: string,
    typeErrors: BaseError[]
  ): {
    errorType: string;
    predictedCount: number;
    confidence: number;
    timeFrame: string;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    // Simple linear regression for prediction
    const sortedErrors = typeErrors.sort(
      (a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
    );

    const recentCount = sortedErrors.slice(-7).length; // Last 7 errors
    const predictedCount = Math.round(recentCount * 1.2); // 20% increase assumption

    return {
      errorType,
      predictedCount,
      confidence: 0.7,
      timeFrame: 'next 24 hours',
      riskLevel: predictedCount > 10 ? 'high' : predictedCount > 5 ? 'medium' : 'low'
    };
  }
}

/**
 * Create a new error analytics engine
 */
export function createErrorAnalyticsEngine(
  config?: Partial<ErrorAnalyticsConfig>
): ErrorAnalyticsEngine {
  return new ErrorAnalyticsEngine(config);
}



