import { ErrorPattern } from '../core/types.js';

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    errorRate?: number; // Percentage
    errorCount?: number; // Count in time window
    timeWindow: number; // Minutes
    severity?: Array<'low' | 'medium' | 'high' | 'critical'>;
    category?: Array<'database' | 'authentication' | 'validation' | 'external_api' | 'system' | 'business_logic'>;
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'log';
    target: string;
    template?: string;
  }>;
  enabled: boolean;
  cooldown: number; // Minutes between alerts for same condition
  lastTriggered?: Date;
}

export class AlertRuleManager {
  private alertRules: Map<string, AlertRule> = new Map();

  constructor() {
    this.initializeDefaultAlertRules();
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.set(ruleId, { ...rule, id: ruleId });
    return ruleId;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Check alert conditions
   */
  checkAlertConditions(
    stats: {
      totalErrors: number;
      errorRate: number;
      errorsByCategory: Record<string, number>;
      errorsBySeverity: Record<string, number>;
    }
  ): AlertRule[] {
    const now = new Date();
    const triggeredRules: AlertRule[] = [];

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastAlert = now.getTime() - rule.lastTriggered.getTime();
        if (timeSinceLastAlert < rule.cooldown * 60 * 1000) {
          return; // Still in cooldown
        }
      }

      let shouldAlert = false;

      // Check error rate condition
      if (rule.condition.errorRate && stats.errorRate > rule.condition.errorRate) {
        shouldAlert = true;
      }

      // Check error count condition
      if (rule.condition.errorCount && stats.totalErrors > rule.condition.errorCount) {
        shouldAlert = true;
      }

      // Check severity condition
      if (rule.condition.severity) {
        const severityCount = rule.condition.severity.reduce((sum, severity) => {
          return sum + (stats.errorsBySeverity[severity] || 0);
        }, 0);
        if (severityCount > 0) {
          shouldAlert = true;
        }
      }

      // Check category condition
      if (rule.condition.category) {
        const categoryCount = rule.condition.category.reduce((sum, category) => {
          return sum + (stats.errorsByCategory[category] || 0);
        }, 0);
        if (categoryCount > 0) {
          shouldAlert = true;
        }
      }

      if (shouldAlert) {
        rule.lastTriggered = now;
        triggeredRules.push(rule);
      }
    });

    return triggeredRules;
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // Critical errors - immediate alert
    this.addAlertRule({
      name: 'Critical Errors',
      condition: {
        errorCount: 1,
        timeWindow: 1,
        severity: ['critical']
      },
      actions: [
        { type: 'log', target: 'console' }
      ],
      enabled: true,
      cooldown: 5
    });

    // High error rate
    this.addAlertRule({
      name: 'High Error Rate',
      condition: {
        errorRate: 10, // 10% error rate
        timeWindow: 5
      },
      actions: [
        { type: 'log', target: 'console' }
      ],
      enabled: true,
      cooldown: 15
    });

    // Database errors
    this.addAlertRule({
      name: 'Database Errors',
      condition: {
        errorCount: 5,
        timeWindow: 5,
        category: ['database']
      },
      actions: [
        { type: 'log', target: 'console' }
      ],
      enabled: true,
      cooldown: 10
    });
  }
}