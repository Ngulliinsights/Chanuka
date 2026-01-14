/**
 * API Cost Monitoring Service
 * 
 * Enhanced cost tracking and budget management for external APIs
 * Moved from: server/services/api-cost-monitoring.ts
 * Current location: server/features/monitoring/application/api-cost-monitoring.service.ts
 */

import { logger } from '@shared/core';
import { EventEmitter } from 'events';

interface CostAlert {
  id: string;
  source: string;
  type: 'budget_exceeded' | 'cost_spike' | 'quota_warning' | 'unusual_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentCost: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

interface BudgetConfig {
  source: string;
  dailyBudget: number;
  monthlyBudget: number;
  alertThresholds: {
    warning: number;
    critical: number;
  };
  costPerRequest: number;
  currency: string;
}

interface CostProjection {
  source: string;
  currentDailyCost: number;
  projectedDailyCost: number;
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export class APICostMonitoringService extends EventEmitter {
  private budgetConfigs: Map<string, BudgetConfig> = new Map();
  private costHistory: Map<string, Array<{ timestamp: Date; cost: number; requests: number }>> = new Map();
  private alerts: Map<string, CostAlert> = new Map();

  constructor() {
    super();
    this.initializeDefaultBudgets();
    this.startCostMonitoring();
  }

  private initializeDefaultBudgets(): void {
    const defaultBudgets: BudgetConfig[] = [
      {
        source: 'parliament-ca',
        dailyBudget: 10.0,
        monthlyBudget: 300.0,
        alertThresholds: { warning: 80, critical: 95 },
        costPerRequest: 0.001,
        currency: 'CAD'
      },
      {
        source: 'senate-ke',
        dailyBudget: 8.0,
        monthlyBudget: 240.0,
        alertThresholds: { warning: 80, critical: 95 },
        costPerRequest: 0.002,
        currency: 'KES'
      }
    ];

    defaultBudgets.forEach(budget => {
      this.budgetConfigs.set(budget.source, budget);
      this.costHistory.set(budget.source, []);
    });
  }

  recordRequestCost(source: string, requests: number = 1, customCost?: number): void {
    const budget = this.budgetConfigs.get(source);
    if (!budget) {
      logger.warn(`No budget configuration for source: ${source}`);
      return;
    }

    const cost = customCost || budget.costPerRequest * requests;
    const history = this.costHistory.get(source) || [];

    history.push({
      timestamp: new Date(),
      cost,
      requests
    });

    this.costHistory.set(source, history);
    this.checkBudgetAlerts(source);
    this.emit('costRecorded', { source, cost, requests, timestamp: new Date() });
  }

  getCostSummary(source: string): {
    dailyCost: number;
    monthlyCost: number;
    dailyBudget: number;
    monthlyBudget: number;
    dailyUtilization: number;
    monthlyUtilization: number;
    requestsToday: number;
    requestsThisMonth: number;
  } | null {
    const budget = this.budgetConfigs.get(source);
    const history = this.costHistory.get(source);

    if (!budget || !history) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayEntries = history.filter(entry => entry.timestamp >= todayStart);
    const monthEntries = history.filter(entry => entry.timestamp >= monthStart);

    const dailyCost = todayEntries.reduce((sum, e) => sum + e.cost, 0);
    const monthlyCost = monthEntries.reduce((sum, e) => sum + e.cost, 0);

    return {
      dailyCost,
      monthlyCost,
      dailyBudget: budget.dailyBudget,
      monthlyBudget: budget.monthlyBudget,
      dailyUtilization: (dailyCost / budget.dailyBudget) * 100,
      monthlyUtilization: (monthlyCost / budget.monthlyBudget) * 100,
      requestsToday: todayEntries.reduce((sum, e) => sum + e.requests, 0),
      requestsThisMonth: monthEntries.reduce((sum, e) => sum + e.requests, 0)
    };
  }

  getActiveAlerts(): CostAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  updateBudgetConfig(source: string, config: Partial<BudgetConfig>): void {
    const existing = this.budgetConfigs.get(source);
    if (existing) {
      const updated = { ...existing, ...config };
      this.budgetConfigs.set(source, updated);
      this.emit('budgetConfigUpdated', { source, config: updated });
    }
  }

  private checkBudgetAlerts(source: string): void {
    const summary = this.getCostSummary(source);
    const budget = this.budgetConfigs.get(source);

    if (!summary || !budget) return;

    if (summary.dailyUtilization >= budget.alertThresholds.critical) {
      this.createAlert(source, 'budget_exceeded', 'critical',
        `Daily budget exceeded: ${summary.dailyUtilization.toFixed(1)}%`,
        summary.dailyCost, budget.dailyBudget);
    }
  }

  private createAlert(
    source: string,
    type: CostAlert['type'],
    severity: CostAlert['severity'],
    message: string,
    currentCost: number,
    threshold: number
  ): void {
    const alertId = `${source}-${type}-${Date.now()}`;
    const alert: CostAlert = {
      id: alertId,
      source,
      type,
      severity,
      message,
      currentCost,
      threshold,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    this.emit('costAlert', alert);
  }

  private startCostMonitoring(): void {
    setInterval(() => {
      for (const source of this.budgetConfigs.keys()) {
        this.checkBudgetAlerts(source);
      }
    }, 5 * 60 * 1000);
  }
}

export const apiCostMonitoringService = new APICostMonitoringService();
