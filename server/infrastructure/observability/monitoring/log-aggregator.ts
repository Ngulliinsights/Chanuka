/**
 * Log Aggregator
 *
 * Responsibility: aggregate buffered log entries, evaluate alert rules,
 * and produce monitoring reports. It reads from the shared LogBuffer,
 * never writes to it, and never modifies logger configuration.
 */

import { logBuffer } from '../core/logger';
import { logger } from '../core/logger';
import { loggingConfig } from '../config/logging-config';
import {
  ALERT_DEFAULTS,
} from './monitoring-policy';
import type {
  AlertRule,
  LogAggregationResult,
} from '../core/types';

// ─── Log Aggregator ───────────────────────────────────────────────────────────

export class LogAggregator {
  private readonly alertRules = new Map<string, AlertRule>();
  private lastAggregation: LogAggregationResult | null = null;
  private aggregationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.registerDefaultAlertRules();
    this.startPeriodicAggregation();
  }

  // ─── Aggregation ────────────────────────────────────────────────────────────

  aggregateLogs(timeWindowMs = 3_600_000): LogAggregationResult {
    const end   = new Date();
    const start = new Date(end.getTime() - timeWindowMs);
    const logs  = logBuffer.query({ start, end });

    const result: LogAggregationResult = {
      timeRange: { start, end },
      totalLogs: logs.length,
      logsByLevel:     {},
      logsByComponent: {},
      logsByOperation: {},
      errorRate: 0,
      performanceMetrics: {
        averageResponseTime: 0,
        slowRequests:        0,
        p95ResponseTime:     0,
        p99ResponseTime:     0,
        totalErrors:         0,
      },
      topErrors:      [],
      securityEvents: [],
    };

    if (logs.length === 0) {
      this.lastAggregation = result;
      return result;
    }

    const responseTimes: number[] = [];
    const errorMap    = new Map<string, { count: number; component: string; lastSeen: Date }>();
    const securityMap = new Map<string, { count: number; severity: string; lastSeen: Date }>();

    for (const log of logs) {
      // Level counts
      const level = String(log['level'] ?? 'unknown');
      result.logsByLevel[level] = (result.logsByLevel[level] ?? 0) + 1;

      // Component counts
      if (log['component']) {
        const comp = String(log['component']);
        result.logsByComponent[comp] = (result.logsByComponent[comp] ?? 0) + 1;
      }

      // Operation counts
      if (log['operation']) {
        const op = String(log['operation']);
        result.logsByOperation[op] = (result.logsByOperation[op] ?? 0) + 1;
      }

      // Error accumulation
      if (['error', 'fatal', 'critical'].includes(level)) {
        result.performanceMetrics.totalErrors++;
        const key  = `${log['component'] ?? 'unknown'}:${log['message'] ?? ''}`;
        const prev = errorMap.get(key);
        if (prev) {
          prev.count++;
          if (log.timestamp > prev.lastSeen) prev.lastSeen = log.timestamp;
        } else {
          errorMap.set(key, { count: 1, component: String(log['component'] ?? 'unknown'), lastSeen: log.timestamp });
        }
      }

      // Security events
      if (log['type'] === 'security' || log['operation'] === 'security_event') {
        const eventType = String(log['operation'] ?? 'unknown');
        const severity  = String(log['severity'] ?? 'medium');
        const prev      = securityMap.get(eventType);
        if (prev) {
          prev.count++;
          if (log.timestamp > prev.lastSeen) prev.lastSeen = log.timestamp;
        } else {
          securityMap.set(eventType, { count: 1, severity, lastSeen: log.timestamp });
        }
      }

      // Response times
      if (typeof log['duration'] === 'number') {
        responseTimes.push(log['duration']);
        if (log['duration'] > loggingConfig.slowRequestThreshold) {
          result.performanceMetrics.slowRequests++;
        }
      }
    }

    result.errorRate = (result.performanceMetrics.totalErrors / logs.length) * 100;

    if (responseTimes.length) {
      responseTimes.sort((a, b) => a - b);
      result.performanceMetrics.averageResponseTime =
        responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;
      result.performanceMetrics.p95ResponseTime = calcPercentile(responseTimes, 95);
      result.performanceMetrics.p99ResponseTime = calcPercentile(responseTimes, 99);
    }

    result.topErrors = Array.from(errorMap.entries())
      .map(([key, d]) => ({
        message:   key.split(':').slice(1).join(':'),
        count:     d.count,
        component: d.component,
        lastSeen:  d.lastSeen,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    result.securityEvents = Array.from(securityMap.entries())
      .map(([type, d]) => ({
        type,
        severity: d.severity,
        count:    d.count,
        lastSeen: d.lastSeen,
      }))
      .sort((a, b) => b.count - a.count);

    this.lastAggregation = result;
    return result;
  }

  // ─── Alerts ──────────────────────────────────────────────────────────────────

  checkAlerts(): void {
    if (!this.lastAggregation) return;
    const now = new Date();

    for (const rule of this.alertRules.values()) {
      if (!rule.condition.enabled) continue;

      if (rule.condition.lastTriggered) {
        const cooldownMs = rule.condition.cooldown * 60_000;
        if (now.getTime() - rule.condition.lastTriggered.getTime() < cooldownMs) continue;
      }

      const value    = this.extractMetricValue(rule.condition.type);
      const exceeded = value > rule.condition.threshold;

      if (exceeded) {
        this.fireAlert(rule, value);
        rule.condition.lastTriggered = now;
      }
    }
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  generateMonitoringReport(): {
    summary: LogAggregationResult;
    alerts: Array<{ rule: AlertRule; triggered: boolean; value: number }>;
    recommendations: string[];
    healthScore: number;
  } {
    const summary = this.aggregateLogs();

    const alerts = Array.from(this.alertRules.values()).map((rule) => ({
      rule,
      triggered: !!rule.condition.lastTriggered,
      value:     this.extractMetricValue(rule.condition.type),
    }));

    return {
      summary,
      alerts,
      recommendations: this.buildRecommendations(summary),
      healthScore:      this.calcHealthScore(summary),
    };
  }

  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const agg = this.lastAggregation ?? this.aggregateLogs();
    if (format === 'prometheus') return toPrometheus(agg);
    return JSON.stringify({ timestamp: new Date().toISOString(), ...agg }, null, 2);
  }

  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private extractMetricValue(type: AlertRule['condition']['type']): number {
    if (!this.lastAggregation) return 0;
    switch (type) {
      case 'error_rate':      return this.lastAggregation.errorRate;
      case 'slow_requests':   return this.lastAggregation.performanceMetrics.slowRequests;
      case 'security_events': return this.lastAggregation.securityEvents.length;
      case 'log_volume':      return this.lastAggregation.totalLogs;
    }
  }

  private fireAlert(rule: AlertRule, actualValue: number): void {
    const msg = `${rule.message} (actual: ${actualValue}, threshold: ${rule.condition.threshold})`;

    logger.error({
      component: 'log-aggregator',
      alert: {
        ruleId:      rule.condition.id,
        severity:    rule.severity,
        type:        rule.condition.type,
        actualValue,
        threshold:   rule.condition.threshold,
      },
      tags: ['alert', rule.severity],
    }, `ALERT: ${msg}`);
  }

  private startPeriodicAggregation(): void {
    if (!loggingConfig.enableMetrics) return;
    this.aggregationTimer = setInterval(() => {
      try {
        this.aggregateLogs();
        this.checkAlerts();
      } catch (err) {
        logger.error({
          component: 'log-aggregator',
          error: err instanceof Error ? err.message : String(err),
        }, 'Periodic log aggregation failed');
      }
    }, loggingConfig.metricsReportInterval);
  }

  private registerDefaultAlertRules(): void {
    const defaults: AlertRule[] = [
      {
        condition: {
          id: 'high_error_rate', name: 'High Error Rate',
          type: 'error_rate', threshold: ALERT_DEFAULTS.ERROR_RATE_THRESHOLD,
          timeWindow: 60, enabled: true, cooldown: ALERT_DEFAULTS.ERROR_RATE_COOLDOWN_MIN,
        },
        severity: 'high',
        message:  'Error rate has exceeded 5% in the last hour',
        actions:  [{ type: 'log', target: 'error' }],
      },
      {
        condition: {
          id: 'excessive_slow_requests', name: 'Excessive Slow Requests',
          type: 'slow_requests', threshold: ALERT_DEFAULTS.SLOW_REQUEST_THRESHOLD,
          timeWindow: 60, enabled: true, cooldown: ALERT_DEFAULTS.SLOW_REQUEST_COOLDOWN_MIN,
        },
        severity: 'medium',
        message:  'More than 100 slow requests in the last hour',
        actions:  [{ type: 'log', target: 'warn' }],
      },
      {
        condition: {
          id: 'security_events', name: 'Security Events Detected',
          type: 'security_events', threshold: ALERT_DEFAULTS.SECURITY_EVENT_THRESHOLD,
          timeWindow: 60, enabled: true, cooldown: ALERT_DEFAULTS.SECURITY_EVENT_COOLDOWN_MIN,
        },
        severity: 'critical',
        message:  'Multiple security events detected',
        actions:  [{ type: 'log', target: 'error' }],
      },
    ];
    for (const rule of defaults) this.alertRules.set(rule.condition.id, rule);
  }

  private buildRecommendations(agg: LogAggregationResult): string[] {
    const recs: string[] = [];
    if (agg.errorRate > 5)
      recs.push('High error rate. Review logs and consider circuit breakers.');
    if (agg.performanceMetrics.slowRequests > 50)
      recs.push('High slow-request count. Optimise queries and caching.');
    if (agg.performanceMetrics.p95ResponseTime > 2000)
      recs.push('P95 response time high. Investigate critical path bottlenecks.');
    if (agg.securityEvents.length)
      recs.push('Security events detected. Review security logs.');
    const top = Object.entries(agg.logsByComponent)
      .sort(([, a], [, b]) => b - a).slice(0, 3).map(([c]) => c);
    if (top.length)
      recs.push(`High-activity components to monitor: ${top.join(', ')}.`);
    return recs;
  }

  private calcHealthScore(agg: LogAggregationResult): number {
    let score = 100;
    score -= Math.min(50, agg.errorRate * 2);
    score -= Math.min(30, agg.performanceMetrics.slowRequests / 10);
    score -= Math.min(20, agg.securityEvents.length * 2);
    if (agg.performanceMetrics.p95ResponseTime < 1000) score += 5;
    return Math.max(0, Math.min(100, score));
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function calcPercentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0;
}

function toPrometheus(agg: LogAggregationResult): string {
  return [
    '# HELP log_aggregator_total_logs Total number of logs',
    '# TYPE log_aggregator_total_logs gauge',
    `log_aggregator_total_logs ${agg.totalLogs}`,
    '# HELP log_aggregator_error_rate Error rate percentage',
    '# TYPE log_aggregator_error_rate gauge',
    `log_aggregator_error_rate ${agg.errorRate}`,
    '# HELP log_aggregator_avg_response_time Average response time ms',
    '# TYPE log_aggregator_avg_response_time gauge',
    `log_aggregator_avg_response_time ${agg.performanceMetrics.averageResponseTime}`,
  ].join('\n');
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const logAggregator = new LogAggregator();