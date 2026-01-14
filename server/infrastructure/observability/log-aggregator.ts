/**
 * Log Aggregation and Monitoring Utilities
 *
 * Provides advanced log analysis, aggregation, alerting, and monitoring capabilities
 * for comprehensive observability and debugging.
 */

import { logger } from '@shared/core';

import { loggingConfig } from './logging-config';

export interface LogAggregationResult {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByComponent: Record<string, number>;
  logsByOperation: Record<string, number>;
  errorRate: number;
  performanceMetrics: {
    averageResponseTime: number;
    slowRequests: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalErrors: number;
  };
  topErrors: Array<{
    message: string;
    count: number;
    component: string;
    lastSeen: Date;
  }>;
  securityEvents: Array<{
    type: string;
    severity: string;
    count: number;
    lastSeen: Date;
  }>;
}

export interface AlertCondition {
  id: string;
  name: string;
  type: 'error_rate' | 'slow_requests' | 'security_events' | 'log_volume';
  threshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
  lastTriggered?: Date;
  cooldown: number; // minutes
}

export interface AlertRule {
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actions: Array<{
    type: 'log' | 'email' | 'webhook' | 'slack';
    target: string;
    template?: string;
  }>;
}

export class LogAggregator {
  private alertRules: Map<string, AlertRule> = new Map();
  private lastAggregation: LogAggregationResult | null = null;
  private aggregationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultAlertRules();
    this.startPeriodicAggregation();
  }

  /**
   * Aggregate logs over a time window with comprehensive analysis
   */
  aggregateLogs(timeWindowMs: number = 3600000): LogAggregationResult { // 1 hour default
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindowMs);

    // Get logs from the logger's in-memory storage
    const logs = logger.queryLogs?.({
      timeRange: { start: startTime, end: endTime }
    }) || [];

    // Initialize aggregation structure
    const aggregation: LogAggregationResult = {
      timeRange: { start: startTime, end: endTime },
      totalLogs: logs.length,
      logsByLevel: {},
      logsByComponent: {},
      logsByOperation: {},
      errorRate: 0,
      performanceMetrics: {
        averageResponseTime: 0,
        slowRequests: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalErrors: 0
      },
      topErrors: [],
      securityEvents: []
    };

    if (logs.length === 0) {
      this.lastAggregation = aggregation;
      return aggregation;
    }

    // Aggregate logs
    const responseTimes: number[] = [];
    const errorMap = new Map<string, { count: number; component: string; lastSeen: Date }>();
    const securityMap = new Map<string, { count: number; severity: string; lastSeen: Date }>();

    for (const log of logs) {
      // Count by level
      aggregation.logsByLevel[log.level] = (aggregation.logsByLevel[log.level] || 0) + 1;

      // Count by component
      if (log.component) {
        aggregation.logsByComponent[log.component] = (aggregation.logsByComponent[log.component] || 0) + 1;
      }

      // Count by operation
      if (log.operation) {
        aggregation.logsByOperation[log.operation] = (aggregation.logsByOperation[log.operation] || 0) + 1;
      }

      // Track errors
      if (['error', 'fatal', 'critical'].includes(log.level)) {
        aggregation.performanceMetrics.totalErrors++;

        const errorKey = `${log.component || 'unknown'}:${log.message}`;
        const existing = errorMap.get(errorKey);
        if (existing) {
          existing.count++;
          if (log.timestamp > existing.lastSeen) {
            existing.lastSeen = log.timestamp;
          }
        } else {
          errorMap.set(errorKey, {
            count: 1,
            component: log.component || 'unknown',
            lastSeen: log.timestamp
          });
        }
      }

      // Track security events
      if (log.context?.audit || log.operation === 'security_event') {
        const eventType = log.operation || 'unknown';
        const severity = log.context?.severity || 'medium';
        const existing = securityMap.get(eventType);
        if (existing) {
          existing.count++;
          if (log.timestamp > existing.lastSeen) {
            existing.lastSeen = log.timestamp;
          }
        } else {
          securityMap.set(eventType, {
            count: 1,
            severity,
            lastSeen: log.timestamp
          });
        }
      }

      // Collect response times
      if (typeof log.duration === 'number') {
        responseTimes.push(log.duration);
        if (log.duration > loggingConfig.slowRequestThreshold) {
          aggregation.performanceMetrics.slowRequests++;
        }
      }
    }

    // Calculate error rate
    aggregation.errorRate = (aggregation.performanceMetrics.totalErrors / logs.length) * 100;

    // Calculate response time metrics
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      aggregation.performanceMetrics.averageResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      aggregation.performanceMetrics.p95ResponseTime = this.calculatePercentile(responseTimes, 95);
      aggregation.performanceMetrics.p99ResponseTime = this.calculatePercentile(responseTimes, 99);
    }

    // Process top errors
    aggregation.topErrors = Array.from(errorMap.entries())
      .map(([key, data]) => ({
        message: key.split(':').slice(1).join(':'), // Remove component prefix
        count: data.count,
        component: data.component,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Process security events
    aggregation.securityEvents = Array.from(securityMap.entries())
      .map(([type, data]) => ({
        type,
        severity: data.severity,
        count: data.count,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count);

    this.lastAggregation = aggregation;
    return aggregation;
  }

  /**
   * Check alert conditions and trigger alerts if needed
   */
  checkAlerts(): void {
    const aggregation = this.lastAggregation;
    if (!aggregation) return;

    const now = new Date();

    for (const [, rule] of this.alertRules) {
      if (!rule.condition.enabled) continue;

      // Check cooldown
      if (rule.condition.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - rule.condition.lastTriggered.getTime();
        const cooldownMs = rule.condition.cooldown * 60 * 1000;
        if (timeSinceLastTrigger < cooldownMs) continue;
      }

      let shouldTrigger = false;
      let actualValue = 0;

      switch (rule.condition.type) {
        case 'error_rate':
          actualValue = aggregation.errorRate;
          shouldTrigger = actualValue > rule.condition.threshold;
          break;

        case 'slow_requests':
          actualValue = aggregation.performanceMetrics.slowRequests;
          shouldTrigger = actualValue > rule.condition.threshold;
          break;

        case 'security_events':
          actualValue = aggregation.securityEvents.length;
          shouldTrigger = actualValue > rule.condition.threshold;
          break;

        case 'log_volume':
          actualValue = aggregation.totalLogs;
          shouldTrigger = actualValue > rule.condition.threshold;
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(rule, actualValue);
        rule.condition.lastTriggered = now;
      }
    }
  }

  /**
   * Generate comprehensive monitoring report
   */
  generateMonitoringReport(): {
    summary: LogAggregationResult;
    alerts: Array<{ rule: AlertRule; triggered: boolean; value: number }>;
    recommendations: string[];
    healthScore: number;
  } {
    const summary = this.aggregateLogs();
    const alerts: Array<{ rule: AlertRule; triggered: boolean; value: number }> = [];

    // Check each alert rule
    for (const rule of this.alertRules.values()) {
      let value = 0;

      switch (rule.condition.type) {
        case 'error_rate':
          value = summary.errorRate;
          break;
        case 'slow_requests':
          value = summary.performanceMetrics.slowRequests;
          break;
        case 'security_events':
          value = summary.securityEvents.length;
          break;
        case 'log_volume':
          value = summary.totalLogs;
          break;
      }

      alerts.push({
        rule,
        triggered: rule.condition.lastTriggered ? true : false,
        value
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary);

    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore(summary);

    return {
      summary,
      alerts,
      recommendations,
      healthScore
    };
  }

  /**
   * Export aggregated data for external monitoring systems
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const aggregation = this.lastAggregation || this.aggregateLogs();

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(aggregation);
    }

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      ...aggregation,
      metadata: {
        version: '1.0.0',
        config: loggingConfig
      }
    }, null, 2);
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        condition: {
          id: 'high_error_rate',
          name: 'High Error Rate',
          type: 'error_rate',
          threshold: 5.0, // 5%
          timeWindow: 60, // 1 hour
          enabled: true,
          cooldown: 30 // 30 minutes
        },
        severity: 'high',
        message: 'Error rate has exceeded 5% in the last hour',
        actions: [{ type: 'log', target: 'error' }]
      },
      {
        condition: {
          id: 'excessive_slow_requests',
          name: 'Excessive Slow Requests',
          type: 'slow_requests',
          threshold: 100,
          timeWindow: 60,
          enabled: true,
          cooldown: 15
        },
        severity: 'medium',
        message: 'More than 100 slow requests detected in the last hour',
        actions: [{ type: 'log', target: 'warn' }]
      },
      {
        condition: {
          id: 'security_events',
          name: 'Security Events Detected',
          type: 'security_events',
          threshold: 10,
          timeWindow: 60,
          enabled: true,
          cooldown: 5
        },
        severity: 'critical',
        message: 'Multiple security events detected',
        actions: [{ type: 'log', target: 'error' }]
      }
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.condition.id, rule);
    }
  }

  private startPeriodicAggregation(): void {
    if (loggingConfig.enableMetrics) {
      this.aggregationInterval = setInterval(() => {
        try {
          this.aggregateLogs();
          this.checkAlerts();
        } catch (error) {
          logger.error('Failed to perform periodic log aggregation', {
            component: 'log-aggregator',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, loggingConfig.metricsReportInterval);
    }
  }

  private triggerAlert(rule: AlertRule, actualValue: number): void {
    const message = `${rule.message} (actual: ${actualValue}, threshold: ${rule.condition.threshold})`;

    logger.error(`ALERT: ${message}`, {
      component: 'log-aggregator',
      alert: {
        ruleId: rule.condition.id,
        severity: rule.severity,
        type: rule.condition.type,
        actualValue,
        threshold: rule.condition.threshold
      },
      tags: ['alert', rule.severity]
    });

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'log':
            // Already logged above
            break;
          case 'email':
            // Would integrate with email service
            logger.info(`Would send email alert to: ${action.target}`, {
              component: 'log-aggregator',
              alert: rule.condition.id
            });
            break;
          case 'webhook':
            // Would send HTTP request to webhook
            logger.info(`Would send webhook alert to: ${action.target}`, {
              component: 'log-aggregator',
              alert: rule.condition.id
            });
            break;
          case 'slack':
            // Would send Slack message
            logger.info(`Would send Slack alert to: ${action.target}`, {
              component: 'log-aggregator',
              alert: rule.condition.id
            });
            break;
        }
      } catch (error) {
        logger.error(`Failed to execute alert action: ${action.type}`, {
          component: 'log-aggregator',
          action: action.type,
          target: action.target,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private generateRecommendations(aggregation: LogAggregationResult): string[] {
    const recommendations: string[] = [];

    if (aggregation.errorRate > 5) {
      recommendations.push('High error rate detected. Review error logs and consider implementing circuit breakers.');
    }

    if (aggregation.performanceMetrics.slowRequests > 50) {
      recommendations.push('High number of slow requests. Consider query optimization and caching strategies.');
    }

    if (aggregation.performanceMetrics.p95ResponseTime > 2000) {
      recommendations.push('P95 response time is high. Investigate bottlenecks in critical paths.');
    }

    if (aggregation.securityEvents.length > 0) {
      recommendations.push('Security events detected. Review security logs and consider additional monitoring.');
    }

    const topComponents = Object.entries(aggregation.logsByComponent)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topComponents.length > 0) {
      recommendations.push(`Focus monitoring on high-activity components: ${topComponents.map(([comp]) => comp).join(', ')}`);
    }

    return recommendations;
  }

  private calculateHealthScore(aggregation: LogAggregationResult): number {
    let score = 100;

    // Deduct points for error rate
    score -= Math.min(50, aggregation.errorRate * 2);

    // Deduct points for slow requests
    score -= Math.min(30, aggregation.performanceMetrics.slowRequests / 10);

    // Deduct points for security events
    score -= Math.min(20, aggregation.securityEvents.length * 2);

    // Bonus for good performance
    if (aggregation.performanceMetrics.p95ResponseTime < 1000) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile / 100) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] || 0;
  }

  private formatPrometheusMetrics(aggregation: LogAggregationResult): string {
    const lines: string[] = [];

    lines.push(`# HELP log_aggregator_total_logs Total number of logs`);
    lines.push(`# TYPE log_aggregator_total_logs gauge`);
    lines.push(`log_aggregator_total_logs ${aggregation.totalLogs}`);

    lines.push(`# HELP log_aggregator_error_rate Error rate percentage`);
    lines.push(`# TYPE log_aggregator_error_rate gauge`);
    lines.push(`log_aggregator_error_rate ${aggregation.errorRate}`);

    lines.push(`# HELP log_aggregator_average_response_time Average response time in milliseconds`);
    lines.push(`# TYPE log_aggregator_average_response_time gauge`);
    lines.push(`log_aggregator_average_response_time ${aggregation.performanceMetrics.averageResponseTime}`);

    // Add more metrics as needed

    return lines.join('\n');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
  }
}

// Export singleton instance
export const logAggregator = new LogAggregator();