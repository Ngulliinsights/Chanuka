import { errorTracker } from '@server/infrastructure/observability/monitoring/error-tracker';
import { logger } from '@server/infrastructure/observability';

// ---------------------------------------------------------------------------
// APM metrics shape — derived from the properties accessed in this file.
// Replace with the canonical import once @shared/monitoring exposes its types.
// ---------------------------------------------------------------------------
interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external?: number;
  rss?: number;
}

interface RequestMetrics {
  p95ResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  totalRequests?: number;
}

interface SystemMetrics {
  memoryUsage: MemoryMetrics;
  eventLoopDelay: number;
  cpuUsage?: number;
}

interface BusinessMetrics {
  activeUsers: number;
  [key: string]: unknown;
}

interface APMMetrics {
  requestMetrics: RequestMetrics;
  systemMetrics: SystemMetrics;
  businessMetrics: BusinessMetrics;
}

interface ErrorStats {
  errorsByCategory: Record<string, number>;
  totalErrors?: number;
  [key: string]: unknown;
}

/**
 * Minimal APM service contract.
 * TODO: replace with `import { apmService } from '@shared/monitoring'` once
 * that package is available and exports a compatible interface.
 */
interface IApmService {
  getAPMMetrics(): APMMetrics;
}

// Stub implementation — swap for the real singleton when the module is ready.
const apmService: IApmService = {
  getAPMMetrics(): APMMetrics {
    const mem = process.memoryUsage();
    return {
      requestMetrics: { p95ResponseTime: 0, errorRate: 0, requestsPerSecond: 0 },
      systemMetrics:  { memoryUsage: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal }, eventLoopDelay: 0 },
      businessMetrics: { activeUsers: 0 },
    };
  },
};

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    timeWindow: number; // minutes
  }[];
  actions: AlertAction[];
  cooldown: number; // minutes
  lastTriggered?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'slack';
  target: string;
  template?: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
class AlertingService {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private readonly MAX_HISTORY = 10_000;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Add a new alert rule. Returns the generated rule ID. */
  addAlertRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const alertRule: AlertRule = { ...rule, id: ruleId, created_at: now, updated_at: now };
    this.alertRules.set(ruleId, alertRule);
    console.log(`[Alerting] Added alert rule: ${rule.name}`);
    return ruleId;
  }

  /** Update an existing alert rule. */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates, { updated_at: new Date() });
    console.log(`[Alerting] Updated alert rule: ${rule.name}`);
    return true;
  }

  /** Delete an alert rule. */
  deleteAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    this.alertRules.delete(ruleId);
    console.log(`[Alerting] Deleted alert rule: ${rule.name}`);
    return true;
  }

  /** Return all configured alert rules. */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /** Return active alerts sorted by severity then recency. */
  getActiveAlerts(): Alert[] {
    const severityOrder: Record<Alert['severity'], number> = {
      critical: 4, high: 3, medium: 2, low: 1,
    };

    return Array.from(this.activeAlerts.values()).sort((a, b) => {
      const diff = severityOrder[b.severity] - severityOrder[a.severity];
      return diff !== 0 ? diff : b.triggeredAt.getTime() - a.triggeredAt.getTime();
    });
  }

  /** Return recent alert history (newest first). */
  getAlertHistory(limit = 100): Alert[] {
    return [...this.alertHistory]
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /** Mark an alert as acknowledged. */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    alert.status = 'acknowledged';

    console.log(`[Alerting] Alert acknowledged: ${alert.message}`);
    return true;
  }

  /** Resolve and archive an active alert. */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.status = 'resolved';

    this.alertHistory.push(alert);
    this.activeAlerts.delete(alertId);

    if (this.alertHistory.length > this.MAX_HISTORY) {
      this.alertHistory = this.alertHistory.slice(-(this.MAX_HISTORY / 2));
    }

    console.log(`[Alerting] Alert resolved: ${alert.message}`);
    return true;
  }

  /** Return aggregate statistics over the given time window (hours). */
  getAlertStatistics(timeWindow = 24): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByRule: Record<string, number>;
    averageResolutionTime: number;
    acknowledgedRate: number;
  } {
    const cutoff = new Date(Date.now() - timeWindow * 3_600_000);
    const recent = this.alertHistory.filter((a) => a.triggeredAt > cutoff);
    const total = recent.length;

    const alertsBySeverity: Record<string, number> = {};
    const alertsByRule: Record<string, number> = {};

    for (const alert of recent) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] ?? 0) + 1;
      alertsByRule[alert.ruleName]     = (alertsByRule[alert.ruleName] ?? 0) + 1;
    }

    const resolved = recent.filter((a) => a.resolvedAt);
    const averageResolutionTime = resolved.length > 0
      ? resolved.reduce((sum, a) => sum + (a.resolvedAt!.getTime() - a.triggeredAt.getTime()), 0)
        / resolved.length / 60_000 // → minutes
      : 0;

    const acknowledgedRate = total > 0
      ? (recent.filter((a) => a.acknowledged).length / total) * 100
      : 0;

    return { totalAlerts: total, alertsBySeverity, alertsByRule, averageResolutionTime, acknowledgedRate };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private initializeDefaultRules(): void {
    const rules: Array<Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>> = [
      {
        name: 'High Response Time',
        description: 'Alert when 95th percentile response time exceeds threshold',
        enabled: true,
        severity: 'high',
        conditions: [{ metric: 'p95ResponseTime', operator: 'gt', threshold: 2000, timeWindow: 5 }],
        actions: [{ type: 'log', target: 'console', enabled: true }],
        cooldown: 15,
      },
      {
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        enabled: true,
        severity: 'critical',
        conditions: [{ metric: 'errorRate', operator: 'gt', threshold: 10, timeWindow: 5 }],
        actions: [{ type: 'log', target: 'console', enabled: true }],
        cooldown: 10,
      },
      {
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds threshold',
        enabled: true,
        severity: 'medium',
        conditions: [{ metric: 'memoryUsage', operator: 'gt', threshold: 80, timeWindow: 10 }],
        actions: [{ type: 'log', target: 'console', enabled: true }],
        cooldown: 30,
      },
      {
        name: 'Event Loop Delay',
        description: 'Alert when event loop delay is high',
        enabled: true,
        severity: 'medium',
        conditions: [{ metric: 'eventLoopDelay', operator: 'gt', threshold: 50, timeWindow: 5 }],
        actions: [{ type: 'log', target: 'console', enabled: true }],
        cooldown: 20,
      },
      {
        name: 'Database Connection Issues',
        description: 'Alert when database errors spike',
        enabled: true,
        severity: 'critical',
        conditions: [{ metric: 'databaseErrors', operator: 'gt', threshold: 5, timeWindow: 5 }],
        actions: [{ type: 'log', target: 'console', enabled: true }],
        cooldown: 5,
      },
    ];

    for (const rule of rules) this.addAlertRule(rule);
  }

  private startMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkAlertConditions();
      } catch (err) {
        logger.error(`[Alerting] Error checking alert conditions: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 60_000);

    logger.info('[Alerting] Started monitoring with alert rules');
  }

  private async checkAlertConditions(): Promise<void> {
    const metrics    = apmService.getAPMMetrics();
    const errorStats = errorTracker.getErrorStats(60) as ErrorStats;

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      if (rule.lastTriggered) {
        const elapsed = Date.now() - rule.lastTriggered.getTime();
        if (elapsed < rule.cooldown * 60_000) continue;
      }

      const conditionsMet = rule.conditions.every((condition) => {
        const value = this.getMetricValue(metrics, errorStats, condition.metric);
        return this.evaluateCondition(value, condition.operator, condition.threshold);
      });

      if (conditionsMet) {
        this.triggerAlert(rule, metrics, errorStats);
        rule.lastTriggered = new Date();
      }
    }
  }

  private getMetricValue(metrics: APMMetrics, errorStats: ErrorStats, metricName: string): number {
    switch (metricName) {
      case 'p95ResponseTime':  return metrics.requestMetrics.p95ResponseTime;
      case 'errorRate':        return metrics.requestMetrics.errorRate;
      case 'requestsPerSecond': return metrics.requestMetrics.requestsPerSecond;
      case 'memoryUsage':
        return (metrics.systemMetrics.memoryUsage.heapUsed /
                metrics.systemMetrics.memoryUsage.heapTotal) * 100;
      case 'eventLoopDelay':   return metrics.systemMetrics.eventLoopDelay;
      case 'databaseErrors':   return errorStats.errorsByCategory['database'] ?? 0;
      case 'activeUsers':      return metrics.businessMetrics.activeUsers;
      default:                 return 0;
    }
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt':  return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt':  return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq':  return value === threshold;
      default:    return false;
    }
  }

  private triggerAlert(rule: AlertRule, metrics: APMMetrics, errorStats: ErrorStats): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, metrics, errorStats),
      details: {
        rule: rule.name,
        conditions: rule.conditions,
        metrics: this.extractRelevantMetrics(rule, metrics, errorStats),
      },
      triggeredAt: new Date(),
      acknowledged: false,
      status: 'active',
    };

    this.activeAlerts.set(alertId, alert);
    this.executeAlertActions(rule, alert);

    console.warn(`[Alerting] ALERT TRIGGERED: ${alert.message}`, {
      alertId,
      severity: alert.severity,
      rule: rule.name,
    });
  }

  private generateAlertMessage(rule: AlertRule, metrics: APMMetrics, errorStats: ErrorStats): string {
    const condition = rule.conditions[0];
    if (!condition) return `${rule.name}: condition triggered`;

    const value = this.getMetricValue(metrics, errorStats, condition.metric);
    return `${rule.name}: ${condition.metric} is ${value.toFixed(2)} (threshold: ${condition.threshold})`;
  }

  private extractRelevantMetrics(
    rule: AlertRule,
    metrics: APMMetrics,
    errorStats: ErrorStats,
  ): Record<string, number> {
    return Object.fromEntries(
      rule.conditions.map((c) => [c.metric, this.getMetricValue(metrics, errorStats, c.metric)]),
    );
  }

  private executeAlertActions(rule: AlertRule, alert: Alert): void {
    for (const action of rule.actions) {
      if (!action.enabled) continue;

      switch (action.type) {
        case 'log':
          console.error(`[ALERT] ${alert.message}`, alert.details);
          break;
        case 'email':
          // TODO: wire up email provider
          console.log(`[Alerting] Would send email to: ${action.target}`);
          break;
        case 'webhook':
          // TODO: wire up HTTP client
          console.log(`[Alerting] Would POST webhook to: ${action.target}`);
          break;
        case 'slack':
          // TODO: wire up Slack SDK
          console.log(`[Alerting] Would send Slack message to: ${action.target}`);
          break;
      }
    }
  }
}

// Export singleton instance
export const alertingService = new AlertingService();