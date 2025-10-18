import { apmService } from '../monitoring/apm-service.js';
import { performanceMonitor } from '../monitoring/performance-monitor.js';
import { errorTracker } from '../../core/errors/error-tracker.js';
import { logger } from '@shared/core/src/observability/logging';

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
  createdAt: Date;
  updatedAt: Date;
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
  details: Record<string, any>;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

class AlertingService {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private readonly MAX_HISTORY = 10000;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Add a new alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const alertRule: AlertRule = {
      ...rule,
      id: ruleId,
      createdAt: now,
      updatedAt: now
    };

    this.alertRules.set(ruleId, alertRule);
    console.log(`[Alerting] Added alert rule: ${rule.name}`);
    return ruleId;
  }

  /**
   * Update an existing alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates, { updatedAt: new Date() });
    console.log(`[Alerting] Updated alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Delete an alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    this.alertRules.delete(ruleId);
    console.log(`[Alerting] Deleted alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => {
        // Sort by severity, then by triggered time
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.triggeredAt.getTime() - a.triggeredAt.getTime();
      });
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
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

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.status = 'resolved';

    // Move to history and remove from active
    this.alertHistory.push(alert);
    this.activeAlerts.delete(alertId);

    // Cleanup history if too large
    if (this.alertHistory.length > this.MAX_HISTORY) {
      this.alertHistory = this.alertHistory.slice(-this.MAX_HISTORY / 2);
    }

    console.log(`[Alerting] Alert resolved: ${alert.message}`);
    return true;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeWindow: number = 24): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByRule: Record<string, number>;
    averageResolutionTime: number;
    acknowledgedRate: number;
  } {
    const cutoffTime = new Date(Date.now() - timeWindow * 3600000);
    const recentAlerts = this.alertHistory.filter(alert => 
      alert.triggeredAt > cutoffTime
    );

    const totalAlerts = recentAlerts.length;
    
    // Group by severity
    const alertsBySeverity: Record<string, number> = {};
    recentAlerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    // Group by rule
    const alertsByRule: Record<string, number> = {};
    recentAlerts.forEach(alert => {
      alertsByRule[alert.ruleName] = (alertsByRule[alert.ruleName] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedAlerts = recentAlerts.filter(alert => alert.resolvedAt);
    const averageResolutionTime = resolvedAlerts.length > 0 
      ? resolvedAlerts.reduce((sum, alert) => {
          const resolutionTime = alert.resolvedAt!.getTime() - alert.triggeredAt.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedAlerts.length / 1000 / 60 // Convert to minutes
      : 0;

    // Calculate acknowledged rate
    const acknowledgedAlerts = recentAlerts.filter(alert => alert.acknowledged);
    const acknowledgedRate = totalAlerts > 0 
      ? (acknowledgedAlerts.length / totalAlerts) * 100 
      : 0;

    return {
      totalAlerts,
      alertsBySeverity,
      alertsByRule,
      averageResolutionTime,
      acknowledgedRate
    };
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High response time alert
    this.addAlertRule({
      name: 'High Response Time',
      description: 'Alert when 95th percentile response time exceeds threshold',
      enabled: true,
      severity: 'high',
      conditions: [{
        metric: 'p95ResponseTime',
        operator: 'gt',
        threshold: 2000, // 2 seconds
        timeWindow: 5
      }],
      actions: [{
        type: 'log',
        target: 'console',
        enabled: true
      }],
      cooldown: 15
    });

    // High error rate alert
    this.addAlertRule({
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds threshold',
      enabled: true,
      severity: 'critical',
      conditions: [{
        metric: 'errorRate',
        operator: 'gt',
        threshold: 10, // 10%
        timeWindow: 5
      }],
      actions: [{
        type: 'log',
        target: 'console',
        enabled: true
      }],
      cooldown: 10
    });

    // High memory usage alert
    this.addAlertRule({
      name: 'High Memory Usage',
      description: 'Alert when memory usage exceeds threshold',
      enabled: true,
      severity: 'medium',
      conditions: [{
        metric: 'memoryUsage',
        operator: 'gt',
        threshold: 80, // 80%
        timeWindow: 10
      }],
      actions: [{
        type: 'log',
        target: 'console',
        enabled: true
      }],
      cooldown: 30
    });

    // Event loop delay alert
    this.addAlertRule({
      name: 'Event Loop Delay',
      description: 'Alert when event loop delay is high',
      enabled: true,
      severity: 'medium',
      conditions: [{
        metric: 'eventLoopDelay',
        operator: 'gt',
        threshold: 50, // 50ms
        timeWindow: 5
      }],
      actions: [{
        type: 'log',
        target: 'console',
        enabled: true
      }],
      cooldown: 20
    });

    // Database connection alert
    this.addAlertRule({
      name: 'Database Connection Issues',
      description: 'Alert when database errors spike',
      enabled: true,
      severity: 'critical',
      conditions: [{
        metric: 'databaseErrors',
        operator: 'gt',
        threshold: 5,
        timeWindow: 5
      }],
      actions: [{
        type: 'log',
        target: 'console',
        enabled: true
      }],
      cooldown: 5
    });
  }

  /**
   * Start monitoring and checking alert conditions
   */
  private startMonitoring(): void {
    // Check alert conditions every minute
    setInterval(async () => {
      try {
        await this.checkAlertConditions();
      } catch (error) {
        logger.error('[Alerting] Error checking alert conditions:', { component: 'Chanuka' }, error);
      }
    }, 60000);

    logger.info('[Alerting] Started monitoring with alert rules', { component: 'Chanuka' });
  }

  /**
   * Check all alert conditions
   */
  private async checkAlertConditions(): Promise<void> {
    const metrics = await apmService.getAPMMetrics();
    const errorStats = errorTracker.getErrorStats(60);

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastAlert = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastAlert < rule.cooldown * 60 * 1000) {
          continue; // Still in cooldown
        }
      }

      // Check if conditions are met
      const conditionsMet = rule.conditions.every(condition => {
        const value = this.getMetricValue(metrics, errorStats, condition.metric);
        return this.evaluateCondition(value, condition.operator, condition.threshold);
      });

      if (conditionsMet) {
        this.triggerAlert(rule, metrics, errorStats);
        rule.lastTriggered = new Date();
      }
    }
  }

  /**
   * Get metric value from APM metrics
   */
  private getMetricValue(metrics: any, errorStats: any, metricName: string): number {
    switch (metricName) {
      case 'p95ResponseTime':
        return metrics.requestMetrics.p95ResponseTime;
      case 'errorRate':
        return metrics.requestMetrics.errorRate;
      case 'memoryUsage':
        return (metrics.systemMetrics.memoryUsage.heapUsed / metrics.systemMetrics.memoryUsage.heapTotal) * 100;
      case 'eventLoopDelay':
        return metrics.systemMetrics.eventLoopDelay;
      case 'databaseErrors':
        return errorStats.errorsByCategory.database || 0;
      case 'requestsPerSecond':
        return metrics.requestMetrics.requestsPerSecond;
      case 'activeUsers':
        return metrics.businessMetrics.activeUsers;
      default:
        return 0;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, metrics: any, errorStats: any): void {
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
        metrics: this.extractRelevantMetrics(rule, metrics, errorStats)
      },
      triggeredAt: new Date(),
      acknowledged: false,
      status: 'active'
    };

    this.activeAlerts.set(alertId, alert);

    // Execute alert actions
    this.executeAlertActions(rule, alert);

    console.warn(`[Alerting] ALERT TRIGGERED: ${alert.message}`, {
      alertId,
      severity: alert.severity,
      rule: rule.name
    });
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, metrics: any, errorStats: any): string {
    const condition = rule.conditions[0]; // Use first condition for message
    const value = this.getMetricValue(metrics, errorStats, condition.metric);
    
    return `${rule.name}: ${condition.metric} is ${value.toFixed(2)} (threshold: ${condition.threshold})`;
  }

  /**
   * Extract relevant metrics for alert details
   */
  private extractRelevantMetrics(rule: AlertRule, metrics: any, errorStats: any): Record<string, any> {
    const relevantMetrics: Record<string, any> = {};
    
    rule.conditions.forEach(condition => {
      relevantMetrics[condition.metric] = this.getMetricValue(metrics, errorStats, condition.metric);
    });

    return relevantMetrics;
  }

  /**
   * Execute alert actions
   */
  private executeAlertActions(rule: AlertRule, alert: Alert): void {
    rule.actions.forEach(action => {
      if (!action.enabled) return;

      switch (action.type) {
        case 'log':
          console.error(`[ALERT] ${alert.message}`, alert.details);
          break;
        case 'email':
          // Email integration would go here
          console.log(`[Alerting] Would send email to: ${action.target}`);
          break;
        case 'webhook':
          // Webhook integration would go here
          console.log(`[Alerting] Would send webhook to: ${action.target}`);
          break;
        case 'slack':
          // Slack integration would go here
          console.log(`[Alerting] Would send Slack message to: ${action.target}`);
          break;
      }
    });
  }
}

// Export singleton instance
export const alertingService = new AlertingService();






