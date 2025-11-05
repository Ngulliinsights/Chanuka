/**
 * Unified Performance Monitoring System
 *
 * Combines client-side Web Vitals, server-side method timing, and cross-environment insights
 * into a comprehensive performance monitoring solution.
 */

import { EventEmitter } from 'events';
import { PerformanceMonitoringService, PerformanceMetric, BudgetViolation, PerformanceReport } from './monitoring';
import { MethodTimingService, MethodTimingData, MethodTimingStats } from './method-timing';
import { logger } from '../observability/logging';

export interface UnifiedPerformanceMetric extends PerformanceMetric {
  /** Source of the metric (client/server) */
  source: 'client' | 'server';
  /** Environment where metric was collected */
  environment: string;
  /** Instance identifier */
  instanceId: string;
  /** User session ID (client-side) */
  session_id?: string;
  /** Request ID (server-side) */
  requestId?: string;
}

export interface EnvironmentPerformanceReport {
  /** Environment name */
  environment: string;
  /** Report timestamp */
  timestamp: number;
  /** Client-side metrics */
  clientMetrics: UnifiedPerformanceMetric[];
  /** Server-side metrics */
  serverMetrics: UnifiedPerformanceMetric[];
  /** Method timing statistics */
  methodStats: MethodTimingStats[];
  /** Budget violations */
  violations: BudgetViolation[];
  /** Overall health score (0-100) */
  healthScore: number;
  /** Performance insights */
  insights: PerformanceInsight[];
  /** Recommendations */
  recommendations: string[];
}

export interface PerformanceInsight {
  /** Insight type */
  type: 'bottleneck' | 'improvement' | 'trend' | 'anomaly';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Insight title */
  title: string;
  /** Detailed description */
  description: string;
  /** Affected components */
  affectedComponents: string[];
  /** Suggested actions */
  suggestedActions: string[];
  /** Supporting data */
  data: Record<string, any>;
}

export interface CrossEnvironmentComparison {
  /** Comparison timestamp */
  timestamp: number;
  /** Environments compared */
  environments: string[];
  /** Key performance indicators */
  kpis: {
    /** Average response time by environment */
    avgResponseTime: Record<string, number>;
    /** Error rate by environment */
    errorRate: Record<string, number>;
    /** Throughput by environment */
    throughput: Record<string, number>;
    /** Resource utilization by environment */
    resourceUtilization: Record<string, number>;
  };
  /** Performance differences */
  differences: {
    /** Best performing environment */
    bestEnvironment: string;
    /** Worst performing environment */
    worstEnvironment: string;
    /** Performance gaps */
    gaps: Record<string, number>;
  };
  /** Recommendations for optimization */
  recommendations: string[];
}

export interface UnifiedMonitoringConfig {
  /** Whether unified monitoring is enabled */
  enabled: boolean;
  /** Performance monitoring service config */
  performanceConfig?: Partial<import('./monitoring').AlertConfig>;
  /** Method timing service config */
  methodTimingConfig?: Partial<import('./method-timing').MethodTimingConfig>;
  /** Environment identification */
  environment: string;
  /** Instance identification */
  instanceId: string;
  /** Cross-environment sync interval (ms) */
  syncIntervalMs: number;
  /** Data retention period (ms) */
  retentionPeriodMs: number;
  /** Alert thresholds */
  alertThresholds: {
    /** Health score threshold for alerts */
    healthScoreThreshold: number;
    /** Response time threshold (ms) */
    responseTimeThreshold: number;
    /** Error rate threshold (percentage) */
    errorRateThreshold: number;
  };
}

export class UnifiedPerformanceMonitoringService extends EventEmitter {
  private config: UnifiedMonitoringConfig;
  private performanceMonitor: PerformanceMonitoringService;
  private methodTimingService: MethodTimingService;
  private metrics: UnifiedPerformanceMetric[] = [];
  private environmentReports: Map<string, EnvironmentPerformanceReport> = new Map();
  private syncTimer?: NodeJS.Timeout;

  constructor(config?: Partial<UnifiedMonitoringConfig>) {
    super();

    this.config = {
      enabled: true,
      environment: process.env.NODE_ENV || 'development',
      instanceId: process.env.INSTANCE_ID || `instance-${Date.now()}`,
      syncIntervalMs: 5 * 60 * 1000, // 5 minutes
      retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        healthScoreThreshold: 70,
        responseTimeThreshold: 1000,
        errorRateThreshold: 5,
      },
      ...config,
    };

    // Initialize sub-services
    this.performanceMonitor = new PerformanceMonitoringService(undefined, this.config.performanceConfig);
    this.methodTimingService = new MethodTimingService(this.config.methodTimingConfig);

    this.setupEventListeners();
    this.startSyncTimer();
  }

  /**
   * Start unified monitoring
   */
  startMonitoring(): void {
    if (!this.config.enabled) return;

    this.performanceMonitor.startMonitoring();
    logger.info('Unified performance monitoring started', {
      component: 'unified-monitoring',
      environment: this.config.environment,
      instanceId: this.config.instanceId,
    });

    this.emit('monitoring-started');
  }

  /**
   * Stop unified monitoring
   */
  stopMonitoring(): void {
    this.performanceMonitor.stopMonitoring();

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    logger.info('Unified performance monitoring stopped', {
      component: 'unified-monitoring',
    });

    this.emit('monitoring-stopped');
  }

  /**
   * Record a client-side performance metric
   */
  recordClientMetric(metric: Omit<PerformanceMetric, 'timestamp'>, session_id?: string): void {
    const unifiedMetric: UnifiedPerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
      source: 'client',
      environment: this.config.environment,
      instanceId: this.config.instanceId,
      session_id,
    };

    this.metrics.push(unifiedMetric);
    this.checkAlertThresholds(unifiedMetric);

    this.emit('client-metric-recorded', unifiedMetric);
  }

  /**
   * Record a server-side method timing
   */
  recordServerMetric(timingData: MethodTimingData): void {
    const unifiedMetric: UnifiedPerformanceMetric = {
      name: timingData.methodName,
      value: timingData.duration,
      unit: 'ms',
      timestamp: timingData.endTime,
      source: 'server',
      environment: timingData.environment,
      instanceId: timingData.instanceId,
      requestId: timingData.metadata?.requestId,
      metadata: {
        className: timingData.className,
        success: timingData.success,
        error: timingData.error,
        ...timingData.metadata,
      },
    };

    this.metrics.push(unifiedMetric);
    this.checkAlertThresholds(unifiedMetric);

    this.emit('server-metric-recorded', unifiedMetric);
  }

  /**
   * Generate environment performance report
   */
  generateEnvironmentReport(environment?: string): EnvironmentPerformanceReport {
    const targetEnvironment = environment || this.config.environment;
    const recentMetrics = this.getRecentMetrics(24 * 60 * 60 * 1000, targetEnvironment); // Last 24 hours

    const clientMetrics = recentMetrics.filter(m => m.source === 'client');
    const serverMetrics = recentMetrics.filter(m => m.source === 'server');
    const methodStats = this.methodTimingService.getAllStats();

    // Get budget violations from performance monitor
    const performanceReport = this.performanceMonitor.generateReport();
    const violations = performanceReport.violations;

    const healthScore = this.calculateHealthScore(clientMetrics, serverMetrics, violations);
    const insights = this.generateInsights(clientMetrics, serverMetrics, methodStats);
    const recommendations = this.generateRecommendations(insights);

    const report: EnvironmentPerformanceReport = {
      environment: targetEnvironment,
      timestamp: Date.now(),
      clientMetrics,
      serverMetrics,
      methodStats,
      violations,
      healthScore,
      insights,
      recommendations,
    };

    this.environmentReports.set(targetEnvironment, report);
    return report;
  }

  /**
   * Generate cross-environment comparison
   */
  generateCrossEnvironmentComparison(environments: string[]): CrossEnvironmentComparison {
    const reports = environments.map(env => this.generateEnvironmentReport(env));

    const avgResponseTime: Record<string, number> = {};
    const errorRate: Record<string, number> = {};
    const throughput: Record<string, number> = {};
    const resourceUtilization: Record<string, number> = {};

    reports.forEach(report => {
      const env = report.environment;

      // Calculate average response time from server metrics
      const responseTimes = report.serverMetrics
        .filter(m => m.name.includes('response') || m.name.includes('duration'))
        .map(m => m.value);
      avgResponseTime[env] = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Calculate error rate from method stats
      const totalCalls = report.methodStats.reduce((sum, stat) => sum + stat.totalCalls, 0);
      const failedCalls = report.methodStats.reduce((sum, stat) => sum + stat.failedCalls, 0);
      errorRate[env] = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;

      // Calculate throughput (calls per minute)
      const timeSpanMinutes = 60; // Assume last hour
      throughput[env] = totalCalls / timeSpanMinutes;

      // Calculate resource utilization from health score
      resourceUtilization[env] = report.healthScore;
    });

    // Find best and worst environments
    const healthScores = Object.entries(resourceUtilization);
    const bestEnvironment = healthScores.reduce((best, [env, score]) =>
      score > (resourceUtilization[best] || 0) ? env : best, healthScores[0][0]
    );
    const worstEnvironment = healthScores.reduce((worst, [env, score]) =>
      score < (resourceUtilization[worst] || 100) ? env : worst, healthScores[0][0]
    );

    // Calculate performance gaps
    const gaps: Record<string, number> = {};
    environments.forEach(env => {
      gaps[env] = resourceUtilization[bestEnvironment] - resourceUtilization[env];
    });

    const recommendations = this.generateCrossEnvironmentRecommendations(
      bestEnvironment,
      worstEnvironment,
      gaps,
      reports
    );

    return {
      timestamp: Date.now(),
      environments,
      kpis: {
        avgResponseTime,
        errorRate,
        throughput,
        resourceUtilization,
      },
      differences: {
        bestEnvironment,
        worstEnvironment,
        gaps,
      },
      recommendations,
    };
  }

  /**
   * Get recent metrics for an environment
   */
  private getRecentMetrics(timeWindowMs: number, environment?: string): UnifiedPerformanceMetric[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter(m =>
      m.timestamp >= cutoff &&
      (!environment || m.environment === environment)
    );
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(
    clientMetrics: UnifiedPerformanceMetric[],
    serverMetrics: UnifiedPerformanceMetric[],
    violations: BudgetViolation[]
  ): number {
    let score = 100;

    // Penalize for violations
    score -= violations.filter(v => v.severity === 'error').length * 10;
    score -= violations.filter(v => v.severity === 'warning').length * 5;

    // Penalize for slow server response times
    const avgServerResponse = serverMetrics
      .filter(m => m.name.includes('response') || m.name.includes('duration'))
      .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);

    if (avgServerResponse > this.config.alertThresholds.responseTimeThreshold) {
      score -= 15;
    }

    // Penalize for high error rates
    const errorRate = this.calculateErrorRate(serverMetrics);
    if (errorRate > this.config.alertThresholds.errorRateThreshold) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance insights
   */
  private generateInsights(
    clientMetrics: UnifiedPerformanceMetric[],
    serverMetrics: UnifiedPerformanceMetric[],
    methodStats: MethodTimingStats[]
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Check for slow methods
    const slowMethods = methodStats.filter(stat =>
      stat.averageDuration > this.config.alertThresholds.responseTimeThreshold
    );

    if (slowMethods.length > 0) {
      insights.push({
        type: 'bottleneck',
        severity: 'high',
        title: 'Slow Method Performance',
        description: `${slowMethods.length} methods are performing slower than the threshold`,
        affectedComponents: slowMethods.map(m => m.methodName),
        suggestedActions: [
          'Profile slow methods with detailed tracing',
          'Consider caching results for expensive operations',
          'Review database queries and indexes',
          'Implement async processing for heavy computations',
        ],
        data: { slowMethods: slowMethods.map(m => ({ name: m.methodName, avgDuration: m.averageDuration })) },
      });
    }

    // Check for high error rates
    const highErrorMethods = methodStats.filter(stat =>
      stat.totalCalls > 0 && (stat.failedCalls / stat.totalCalls) * 100 > this.config.alertThresholds.errorRateThreshold
    );

    if (highErrorMethods.length > 0) {
      insights.push({
        type: 'anomaly',
        severity: 'critical',
        title: 'High Error Rates Detected',
        description: `${highErrorMethods.length} methods have error rates above threshold`,
        affectedComponents: highErrorMethods.map(m => m.methodName),
        suggestedActions: [
          'Review error logs for root causes',
          'Implement circuit breakers for failing services',
          'Add retry logic with exponential backoff',
          'Monitor external service dependencies',
        ],
        data: { highErrorMethods: highErrorMethods.map(m => ({
          name: m.methodName,
          errorRate: (m.failedCalls / m.totalCalls) * 100
        })) },
      });
    }

    // Check for Core Web Vitals issues
    const poorLCP = clientMetrics.filter(m => m.name === 'lcp' && m.value > 2500);
    if (poorLCP.length > 0) {
      insights.push({
        type: 'improvement',
        severity: 'medium',
        title: 'Poor Largest Contentful Paint',
        description: 'LCP performance is below recommended thresholds',
        affectedComponents: ['frontend'],
        suggestedActions: [
          'Optimize image loading and compression',
          'Remove render-blocking resources',
          'Implement critical CSS inlining',
          'Consider using a CDN for static assets',
        ],
        data: { poorLCPCount: poorLCP.length, averageLCP: poorLCP.reduce((sum, m) => sum + m.value, 0) / poorLCP.length },
      });
    }

    return insights;
  }

  /**
   * Generate recommendations based on insights
   */
  private generateRecommendations(insights: PerformanceInsight[]): string[] {
    const recommendations: string[] = [];

    insights.forEach(insight => {
      recommendations.push(...insight.suggestedActions);
    });

    // Remove duplicates and limit to top 5
    return Array.from(new Set(recommendations)).slice(0, 5);
  }

  /**
   * Generate cross-environment recommendations
   */
  private generateCrossEnvironmentRecommendations(
    bestEnvironment: string,
    worstEnvironment: string,
    gaps: Record<string, number>,
    reports: EnvironmentPerformanceReport[]
  ): string[] {
    const recommendations: string[] = [];

    if (gaps[worstEnvironment] > 20) {
      recommendations.push(
        `Investigate performance issues in ${worstEnvironment} environment`,
        `Apply successful optimizations from ${bestEnvironment} to ${worstEnvironment}`,
        'Consider infrastructure upgrades for underperforming environments',
        'Implement environment-specific performance budgets'
      );
    }

    return recommendations;
  }

  /**
   * Calculate error rate from server metrics
   */
  private calculateErrorRate(serverMetrics: UnifiedPerformanceMetric[]): number {
    const errorMetrics = serverMetrics.filter(m => m.metadata?.error);
    return serverMetrics.length > 0 ? (errorMetrics.length / serverMetrics.length) * 100 : 0;
  }

  /**
   * Check alert thresholds and emit alerts if needed
   */
  private checkAlertThresholds(metric: UnifiedPerformanceMetric): void {
    if (metric.source === 'server' && metric.value > this.config.alertThresholds.responseTimeThreshold) {
      this.emit('alert', {
        type: 'slow-response',
        metric,
        threshold: this.config.alertThresholds.responseTimeThreshold,
      });
    }

    if (metric.metadata?.error) {
      this.emit('alert', {
        type: 'error',
        metric,
        message: metric.metadata.error,
      });
    }
  }

  /**
   * Setup event listeners for sub-services
   */
  private setupEventListeners(): void {
    // Listen to performance monitor events
    this.performanceMonitor.on('metric-recorded', (metric: PerformanceMetric) => {
      this.recordClientMetric(metric);
    });

    this.performanceMonitor.on('budget-violation', (violation: BudgetViolation) => {
      this.emit('budget-violation', violation);
    });

    // Listen to method timing events
    this.methodTimingService.on('timing-recorded', (timingData: MethodTimingData) => {
      this.recordServerMetric(timingData);
    });
  }

  /**
   * Start periodic sync timer
   */
  private startSyncTimer(): void {
    if (this.config.syncIntervalMs > 0) {
      this.syncTimer = setInterval(() => {
        this.syncEnvironmentData();
      }, this.config.syncIntervalMs);
    }
  }

  /**
   * Sync environment data (placeholder for distributed systems)
   */
  private syncEnvironmentData(): void {
    // In a distributed system, this would sync data across instances/environments
    // For now, just clean up old data
    this.cleanupOldData();
  }

  /**
   * Clean up old data based on retention period
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);

    logger.info('Old performance data cleaned up', {
      component: 'unified-monitoring',
      remainingMetrics: this.metrics.length,
    });
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    enabled: boolean;
    environment: string;
    instanceId: string;
    metricsCount: number;
    reportsCount: number;
    healthScore: number;
  } {
    const report = this.generateEnvironmentReport();

    return {
      enabled: this.config.enabled,
      environment: this.config.environment,
      instanceId: this.config.instanceId,
      metricsCount: this.metrics.length,
      reportsCount: this.environmentReports.size,
      healthScore: report.healthScore,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<UnifiedMonitoringConfig>): void {
    this.config = { ...this.config, ...config };

    // Update sub-service configs
    if (config.performanceConfig) {
      // Note: PerformanceMonitoringService doesn't have updateConfig method
      // Would need to be added if dynamic config updates are required
    }

    if (config.methodTimingConfig) {
      this.methodTimingService.updateConfig(config.methodTimingConfig);
    }

    logger.info('Unified monitoring configuration updated', {
      component: 'unified-monitoring',
      config: this.config,
    });
  }
}

// Export singleton instance
export const unifiedPerformanceMonitor = new UnifiedPerformanceMonitoringService();
