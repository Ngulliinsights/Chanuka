/**
 * API Cost Monitoring Service
 * 
 * Enhanced cost tracking and budget management for external APIs
 * Part of task 12.3 - Build External API Management
 */

import { EventEmitter } from 'events';
import { logger   } from '@shared/core';

// Dynamic import to avoid circular dependencies
let performanceMonitoring: any = null;
const getPerformanceMonitoring = async () => {
  if (!performanceMonitoring) {
    try {
      const { performanceMonitoring: pm } = await import('../../client/src/monitoring/performance-monitoring');
      performanceMonitoring = pm;
    } catch (error) {
      // Performance monitoring not available, continue without it
    }
  }
  return performanceMonitoring;
};

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
    warning: number; // percentage of budget
    critical: number; // percentage of budget
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
  confidence: number; // 0-100
}

interface CostOptimizationRecommendation {
  source: string;
  type: 'caching' | 'rate_limiting' | 'request_batching' | 'endpoint_optimization';
  potentialSavings: number;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

export class APICostMonitoringService extends EventEmitter {
  private budgetConfigs: Map<string, BudgetConfig> = new Map();
  private costHistory: Map<string, Array<{ timestamp: Date; cost: number; requests: number }>> = new Map();
  private alerts: Map<string, CostAlert> = new Map();
  private readonly HISTORY_RETENTION_DAYS = 90;

  constructor() {
    super();
    this.initializeDefaultBudgets();
    this.startCostMonitoring();
  }

  /**
   * Initialize default budget configurations
   */
  private initializeDefaultBudgets(): void {
    const defaultBudgets: BudgetConfig[] = [
      {
        source: 'parliament-ca',
        dailyBudget: 10.00,
        monthlyBudget: 300.00,
        alertThresholds: { warning: 80, critical: 95 },
        costPerRequest: 0.001,
        currency: 'CAD'
      },
      {
        source: 'senate-ke',
        dailyBudget: 8.00,
        monthlyBudget: 240.00,
        alertThresholds: { warning: 80, critical: 95 },
        costPerRequest: 0.002,
        currency: 'KES'
      },
      {
        source: 'county-assemblies',
        dailyBudget: 5.00,
        monthlyBudget: 150.00,
        alertThresholds: { warning: 80, critical: 95 },
        costPerRequest: 0.0005,
        currency: 'KES'
      }
    ];

    defaultBudgets.forEach(budget => {
      this.budgetConfigs.set(budget.source, budget);
      this.costHistory.set(budget.source, []);
    });
  }

  /**
   * Record API request cost
   */
  recordRequestCost(source: string, requests: number = 1, customCost?: number): void {
    const budget = this.budgetConfigs.get(source);
    if (!budget) {
      console.warn(`No budget configuration found for source: ${source}`);
      return;
    }

    const cost = customCost || (budget.costPerRequest * requests);
    const history = this.costHistory.get(source) || [];

    // Record performance metrics
    getPerformanceMonitoring().then(pm => {
      if (pm) {
        pm.recordMetric('api.cost.total', cost, {
          source,
          component: 'api_cost_monitoring'
        });
        pm.recordMetric('api.requests.count', requests, {
          source,
          component: 'api_cost_monitoring'
        });
        pm.recordMetric('api.cost.per_request', budget.costPerRequest, {
          source,
          component: 'api_cost_monitoring'
        });
      }
    }).catch(() => {
      // Ignore performance monitoring errors
    });

    // Add to history
    history.push({
      timestamp: new Date(),
      cost,
      requests
    });

    // Keep only recent history
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.HISTORY_RETENTION_DAYS);

    const filteredHistory = history.filter(entry => entry.timestamp >= cutoffDate);
    this.costHistory.set(source, filteredHistory);

    // Check for budget alerts
    this.checkBudgetAlerts(source);

    // Emit cost event
    this.emit('costRecorded', { source, cost, requests, timestamp: new Date() });
  }

  /**
   * Get current cost summary for a source
   */
  getCostSummary(source: string): {
    dailyCost: number;
    monthlyCost: number;
    dailyBudget: number;
    monthlyBudget: number;
    dailyUtilization: number;
    monthlyUtilization: number;
    requestsToday: number;
    requestsThisMonth: number;
    averageCostPerRequest: number;
  } | null {
    const budget = this.budgetConfigs.get(source);
    const history = this.costHistory.get(source);
    
    if (!budget || !history) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayEntries = history.filter(entry => entry.timestamp >= todayStart);
    const monthEntries = history.filter(entry => entry.timestamp >= monthStart);

    const dailyCost = todayEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const monthlyCost = monthEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const requestsToday = todayEntries.reduce((sum, entry) => sum + entry.requests, 0);
    const requestsThisMonth = monthEntries.reduce((sum, entry) => sum + entry.requests, 0);

    return {
      dailyCost,
      monthlyCost,
      dailyBudget: budget.dailyBudget,
      monthlyBudget: budget.monthlyBudget,
      dailyUtilization: (dailyCost / budget.dailyBudget) * 100,
      monthlyUtilization: (monthlyCost / budget.monthlyBudget) * 100,
      requestsToday,
      requestsThisMonth,
      averageCostPerRequest: requestsThisMonth > 0 ? monthlyCost / requestsThisMonth : 0
    };
  }

  /**
   * Get cost projections for all sources
   */
  getCostProjections(): CostProjection[] {
    const projections: CostProjection[] = [];

    for (const [source, history] of this.costHistory) {
      const budget = this.budgetConfigs.get(source);
      if (!budget || history.length < 7) continue; // Need at least a week of data

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentHistory = history.filter(entry => entry.timestamp >= weekAgo);

      if (recentHistory.length === 0) continue;

      // Calculate daily averages
      const dailyCosts = this.groupByDay(recentHistory);
      const dailyAverage = dailyCosts.reduce((sum, cost) => sum + cost, 0) / dailyCosts.length;

      // Calculate trend
      const firstHalf = dailyCosts.slice(0, Math.floor(dailyCosts.length / 2));
      const secondHalf = dailyCosts.slice(Math.floor(dailyCosts.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, cost) => sum + cost, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, cost) => sum + cost, 0) / secondHalf.length;
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      const trendThreshold = 0.1; // 10% change threshold
      
      if (secondHalfAvg > firstHalfAvg * (1 + trendThreshold)) {
        trend = 'increasing';
      } else if (secondHalfAvg < firstHalfAvg * (1 - trendThreshold)) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }

      // Project monthly cost
      const currentMonthlyCost = this.getCostSummary(source)?.monthlyCost || 0;
      const projectedMonthlyCost = dailyAverage * 30;

      projections.push({
        source,
        currentDailyCost: this.getCostSummary(source)?.dailyCost || 0,
        projectedDailyCost: dailyAverage,
        currentMonthlyCost,
        projectedMonthlyCost,
        trend,
        confidence: Math.min(95, recentHistory.length * 5) // Higher confidence with more data
      });
    }

    return projections;
  }

  /**
   * Get cost optimization recommendations
   */
  getCostOptimizationRecommendations(): CostOptimizationRecommendation[] {
    const recommendations: CostOptimizationRecommendation[] = [];

    for (const [source, history] of this.costHistory) {
      const summary = this.getCostSummary(source);
      if (!summary) continue;

      // High cost per request recommendation
      if (summary.averageCostPerRequest > 0.005) {
        recommendations.push({
          source,
          type: 'caching',
          potentialSavings: summary.monthlyCost * 0.3, // 30% savings estimate
          implementation: 'Implement aggressive caching with longer TTL for static data',
          priority: 'high'
        });
      }

      // High request volume recommendation
      if (summary.requestsThisMonth > 50000) {
        recommendations.push({
          source,
          type: 'request_batching',
          potentialSavings: summary.monthlyCost * 0.2, // 20% savings estimate
          implementation: 'Batch multiple requests into single API calls where possible',
          priority: 'medium'
        });
      }

      // Budget utilization recommendation
      if (summary.monthlyUtilization > 70) {
        recommendations.push({
          source,
          type: 'rate_limiting',
          potentialSavings: summary.monthlyCost * 0.15, // 15% savings estimate
          implementation: 'Implement more aggressive rate limiting to control costs',
          priority: 'medium'
        });
      }

      // Endpoint optimization
      if (summary.averageCostPerRequest > 0.002) {
        recommendations.push({
          source,
          type: 'endpoint_optimization',
          potentialSavings: summary.monthlyCost * 0.25, // 25% savings estimate
          implementation: 'Optimize API endpoints to request only necessary data fields',
          priority: 'high'
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get active cost alerts
   */
  getActiveAlerts(): CostAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Update budget configuration
   */
  updateBudgetConfig(source: string, config: Partial<BudgetConfig>): void {
    const existing = this.budgetConfigs.get(source);
    if (existing) {
      const updated = { ...existing, ...config };
      this.budgetConfigs.set(source, updated);
      this.emit('budgetConfigUpdated', { source, config: updated });
    }
  }

  /**
   * Check for budget alerts
   */
  private checkBudgetAlerts(source: string): void {
    const summary = this.getCostSummary(source);
    const budget = this.budgetConfigs.get(source);
    
    if (!summary || !budget) return;

    // Check daily budget alerts
    if (summary.dailyUtilization >= budget.alertThresholds.critical) {
      this.createAlert(source, 'budget_exceeded', 'critical', 
        `Daily budget critically exceeded: ${summary.dailyUtilization.toFixed(1)}%`,
        summary.dailyCost, budget.dailyBudget);
    } else if (summary.dailyUtilization >= budget.alertThresholds.warning) {
      this.createAlert(source, 'budget_exceeded', 'medium',
        `Daily budget warning: ${summary.dailyUtilization.toFixed(1)}%`,
        summary.dailyCost, budget.dailyBudget);
    }

    // Check monthly budget alerts
    if (summary.monthlyUtilization >= budget.alertThresholds.critical) {
      this.createAlert(source, 'budget_exceeded', 'critical',
        `Monthly budget critically exceeded: ${summary.monthlyUtilization.toFixed(1)}%`,
        summary.monthlyCost, budget.monthlyBudget);
    } else if (summary.monthlyUtilization >= budget.alertThresholds.warning) {
      this.createAlert(source, 'budget_exceeded', 'medium',
        `Monthly budget warning: ${summary.monthlyUtilization.toFixed(1)}%`,
        summary.monthlyCost, budget.monthlyBudget);
    }

    // Check for cost spikes
    this.checkCostSpikes(source);
  }

  /**
   * Check for unusual cost spikes
   */
  private checkCostSpikes(source: string): void {
    const history = this.costHistory.get(source);
    if (!history || history.length < 24) return; // Need at least 24 hours of data

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const lastHourCost = history
      .filter(entry => entry.timestamp >= hourAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    const previousDayAvgHourlyCost = history
      .filter(entry => entry.timestamp >= dayAgo && entry.timestamp < hourAgo)
      .reduce((sum, entry) => sum + entry.cost, 0) / 23; // 23 hours

    // Alert if last hour cost is 3x the average
    if (lastHourCost > previousDayAvgHourlyCost * 3 && previousDayAvgHourlyCost > 0) {
      this.createAlert(source, 'cost_spike', 'high',
        `Unusual cost spike detected: ${lastHourCost.toFixed(4)} vs avg ${previousDayAvgHourlyCost.toFixed(4)}`,
        lastHourCost, previousDayAvgHourlyCost);
    }
  }

  /**
   * Create a cost alert
   */
  private createAlert(
    source: string,
    type: CostAlert['type'],
    severity: CostAlert['severity'],
    message: string,
    currentCost: number,
    threshold: number
  ): void {
    const alertId = `${source}-${type}-${Date.now()}`;
    
    // Don't create duplicate alerts within 1 hour
    const existingAlert = Array.from(this.alerts.values()).find(alert => 
      alert.source === source && 
      alert.type === type && 
      !alert.acknowledged &&
      (Date.now() - alert.timestamp.getTime()) < 3600000 // 1 hour
    );

    if (existingAlert) return;

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

    // Clean up old alerts (keep last 100)
    if (this.alerts.size > 100) {
      const sortedAlerts = Array.from(this.alerts.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const toDelete = sortedAlerts.slice(0, this.alerts.size - 100);
      toDelete.forEach(([id]) => this.alerts.delete(id));
    }
  }

  /**
   * Group cost history by day
   */
  private groupByDay(history: Array<{ timestamp: Date; cost: number; requests: number }>): number[] {
    const dailyCosts = new Map<string, number>();
    
    history.forEach(entry => {
      const dayKey = entry.timestamp.toISOString().split('T')[0];
      dailyCosts.set(dayKey, (dailyCosts.get(dayKey) || 0) + entry.cost);
    });

    return Array.from(dailyCosts.values());
  }

  /**
   * Start cost monitoring background tasks
   */
  private startCostMonitoring(): void {
    // Check for alerts every 5 minutes
    setInterval(() => {
      for (const source of this.budgetConfigs.keys()) {
        this.checkBudgetAlerts(source);
      }
    }, 5 * 60 * 1000);

    // Clean up old history every hour
    setInterval(() => {
      this.cleanupOldHistory();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old cost history
   */
  private cleanupOldHistory(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.HISTORY_RETENTION_DAYS);

    for (const [source, history] of this.costHistory) {
      const filteredHistory = history.filter(entry => entry.timestamp >= cutoffDate);
      this.costHistory.set(source, filteredHistory);
    }
  }

  /**
   * Get comprehensive cost report
   */
  getCostReport(): {
    summary: {
      totalDailyCost: number;
      totalMonthlyCost: number;
      totalDailyBudget: number;
      totalMonthlyBudget: number;
      overallUtilization: number;
    };
    sources: Array<{
      source: string;
      summary: ReturnType<APICostMonitoringService['getCostSummary']>;
      projection: CostProjection | null;
    }>;
    alerts: CostAlert[];
    recommendations: CostOptimizationRecommendation[];
  } {
    const sources = Array.from(this.budgetConfigs.keys());
    const projections = this.getCostProjections();
    
    let totalDailyCost = 0;
    let totalMonthlyCost = 0;
    let totalDailyBudget = 0;
    let totalMonthlyBudget = 0;

    const sourceData = sources.map(source => {
      const summary = this.getCostSummary(source);
      const projection = projections.find(p => p.source === source) || null;
      
      if (summary) {
        totalDailyCost += summary.dailyCost;
        totalMonthlyCost += summary.monthlyCost;
        totalDailyBudget += summary.dailyBudget;
        totalMonthlyBudget += summary.monthlyBudget;
      }

      return { source, summary, projection };
    });

    return {
      summary: {
        totalDailyCost,
        totalMonthlyCost,
        totalDailyBudget,
        totalMonthlyBudget,
        overallUtilization: totalMonthlyBudget > 0 ? (totalMonthlyCost / totalMonthlyBudget) * 100 : 0
      },
      sources: sourceData,
      alerts: this.getActiveAlerts(),
      recommendations: this.getCostOptimizationRecommendations()
    };
  }
}













































