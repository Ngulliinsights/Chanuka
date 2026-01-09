/**
 * Error Trend Analysis and Alerting Service
 * Analyzes error trends and provides alerting capabilities
 */

import {
  TrendAnalysisService as ITrendAnalysisService,
  ClientSystem,
  ErrorSeverity,
  ErrorAggregationService
} from './unified-error-monitoring-interface';

interface TrendDataPoint {
  timestamp: number;
  errorCount: number;
  system: ClientSystem;
}

interface AlertRule {
  id: string;
  name: string;
  condition: (data: TrendDataPoint[]) => boolean;
  severity: ErrorSeverity;
  message: string;
  cooldownMs: number;
  lastTriggered: number;
}

class TrendAnalysisService implements ITrendAnalysisService {
  private static instance: TrendAnalysisService;
  private aggregationService: ErrorAggregationService;
  private trendData: TrendDataPoint[] = [];
  private alertRules: AlertRule[] = [];
  private analysisInterval: NodeJS.Timeout | null = null;

  static getInstance(): TrendAnalysisService {
    if (!TrendAnalysisService.instance) {
      TrendAnalysisService.instance = new TrendAnalysisService();
    }
    return TrendAnalysisService.instance;
  }

  constructor() {
    this.aggregationService = ErrorAggregationService.getInstance();
    this.initializeDefaultAlertRules();
    this.startTrendAnalysis();
  }

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate Alert',
        condition: (data) => {
          const recent = data.filter(d => d.timestamp > Date.now() - 60 * 60 * 1000);
          const avgErrorsPerHour = recent.length;
          return avgErrorsPerHour > 50; // More than 50 errors per hour
        },
        severity: ErrorSeverity.HIGH,
        message: 'Error rate has exceeded threshold of 50 errors per hour',
        cooldownMs: 30 * 60 * 1000, // 30 minutes cooldown
        lastTriggered: 0
      },
      {
        id: 'sudden-spike',
        name: 'Sudden Error Spike Alert',
        condition: (data) => {
          const now = Date.now();
          const lastHour = data.filter(d => d.timestamp > now - 60 * 60 * 1000);
          const previousHour = data.filter(d =>
            d.timestamp > now - 2 * 60 * 60 * 1000 && d.timestamp <= now - 60 * 60 * 1000
          );
          const currentRate = lastHour.length;
          const previousRate = previousHour.length;
          return currentRate > previousRate * 2 && currentRate > 10; // 2x increase and > 10 errors
        },
        severity: ErrorSeverity.CRITICAL,
        message: 'Sudden spike in error rate detected',
        cooldownMs: 15 * 60 * 1000, // 15 minutes cooldown
        lastTriggered: 0
      },
      {
        id: 'system-down',
        name: 'System Down Alert',
        condition: (data) => {
          const now = Date.now();
          const last10Minutes = data.filter(d => d.timestamp > now - 10 * 60 * 1000);
          // Check if any system has stopped reporting errors (might indicate system down)
          const systems = new Set(data.map(d => d.system));
          return systems.size > 0 && last10Minutes.length === 0;
        },
        severity: ErrorSeverity.CRITICAL,
        message: 'No error reports received - possible system outage',
        cooldownMs: 5 * 60 * 1000, // 5 minutes cooldown
        lastTriggered: 0
      },
      {
        id: 'persistent-errors',
        name: 'Persistent Error Pattern',
        condition: (data) => {
          const now = Date.now();
          const last6Hours = data.filter(d => d.timestamp > now - 6 * 60 * 60 * 1000);
          // Check for consistent error rate over 6 hours
          const hourlyRates = [];
          for (let i = 0; i < 6; i++) {
            const hourStart = now - (i + 1) * 60 * 60 * 1000;
            const hourEnd = now - i * 60 * 60 * 1000;
            const hourErrors = last6Hours.filter(d => d.timestamp >= hourStart && d.timestamp < hourEnd);
            hourlyRates.push(hourErrors.length);
          }
          const avgRate = hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length;
          return avgRate > 20 && hourlyRates.every(rate => rate > 15); // Consistent high rate
        },
        severity: ErrorSeverity.HIGH,
        message: 'Persistent high error rate detected over 6 hours',
        cooldownMs: 2 * 60 * 60 * 1000, // 2 hours cooldown
        lastTriggered: 0
      }
    ];
  }

  private startTrendAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.collectTrendData();
      this.analyzeTrendsAndAlert();
    }, 5 * 60 * 1000); // Analyze every 5 minutes
  }

  private collectTrendData(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Get error data from the last 5 minutes
    Object.values(ClientSystem).forEach(system => {
      const systemErrors = this.aggregationService.getSystemErrors(system, {
        start: fiveMinutesAgo,
        end: now
      });

      if (systemErrors.length > 0) {
        this.trendData.push({
          timestamp: now,
          errorCount: systemErrors.length,
          system
        });
      }
    });

    // Keep only last 24 hours of data
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    this.trendData = this.trendData.filter(d => d.timestamp > oneDayAgo);
  }

  private analyzeTrendsAndAlert(): void {
    const alerts = this.checkAlertConditions();

    alerts.forEach(alert => {
      this.triggerAlert(alert);
    });
  }

  private checkAlertConditions(): Array<{
    rule: AlertRule;
    triggered: boolean;
    systems: ClientSystem[];
  }> {
    const alerts = [];

    for (const rule of this.alertRules) {
      const now = Date.now();
      if (now - rule.lastTriggered < rule.cooldownMs) {
        continue; // Still in cooldown
      }

      const triggered = rule.condition(this.trendData);
      if (triggered) {
        // Find affected systems
        const affectedSystems = new Set<ClientSystem>();
        const recentData = this.trendData.filter(d => d.timestamp > now - 60 * 60 * 1000);

        recentData.forEach(d => {
          if (d.errorCount > 0) {
            affectedSystems.add(d.system);
          }
        });

        alerts.push({
          rule,
          triggered: true,
          systems: Array.from(affectedSystems)
        });

        rule.lastTriggered = now;
      }
    }

    return alerts;
  }

  private triggerAlert(alert: { rule: AlertRule; triggered: boolean; systems: ClientSystem[] }): void {
    // In a real implementation, this would send notifications, log to external systems, etc.
    console.warn(`🚨 ALERT: ${alert.rule.name}`, {
      message: alert.rule.message,
      severity: alert.rule.severity,
      affectedSystems: alert.systems,
      timestamp: new Date().toISOString()
    });

    // Could integrate with notification systems here
    // this.notificationService.sendAlert(alert);
  }

  async analyzeTrends(timeRange: { start: number; end: number }): Promise<{
    trends: Array<{
      pattern: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      confidence: number;
      prediction: number;
    }>;
    alerts: Array<{
      type: 'threshold_exceeded' | 'anomaly_detected' | 'trend_shift';
      message: string;
      severity: ErrorSeverity;
      affectedSystems: ClientSystem[];
    }>;
  }> {
    const data = this.trendData.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end);

    const trends = this.calculateTrends(data);
    const alerts = this.generateAlerts(data);

    return { trends, alerts };
  }

  private calculateTrends(data: TrendDataPoint[]): Array<{
    pattern: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    prediction: number;
  }> {
    const trends = [];
    const systems = Object.values(ClientSystem);

    systems.forEach(system => {
      const systemData = data.filter(d => d.system === system).sort((a, b) => a.timestamp - b.timestamp);

      if (systemData.length < 3) return; // Need at least 3 data points

      // Simple linear regression to determine trend
      const n = systemData.length;
      const sumX = systemData.reduce((sum, d, i) => sum + i, 0);
      const sumY = systemData.reduce((sum, d) => sum + d.errorCount, 0);
      const sumXY = systemData.reduce((sum, d, i) => sum + i * d.errorCount, 0);
      const sumXX = systemData.reduce((sum, d, i) => sum + i * i, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let confidence = 0.5; // Base confidence

      if (slope > 0.5) {
        trend = 'increasing';
        confidence = Math.min(0.9, Math.abs(slope) / 2);
      } else if (slope < -0.5) {
        trend = 'decreasing';
        confidence = Math.min(0.9, Math.abs(slope) / 2);
      }

      // Predict next value
      const prediction = systemData[systemData.length - 1].errorCount + slope;

      trends.push({
        pattern: `${system} error rate`,
        trend,
        confidence,
        prediction: Math.max(0, prediction)
      });
    });

    return trends;
  }

  private generateAlerts(data: TrendDataPoint[]): Array<{
    type: 'threshold_exceeded' | 'anomaly_detected' | 'trend_shift';
    message: string;
    severity: ErrorSeverity;
    affectedSystems: ClientSystem[];
  }> {
    const alerts = [];
    const now = Date.now();
    const recentData = data.filter(d => d.timestamp > now - 60 * 60 * 1000);

    // Check for threshold exceeded
    const systemErrorCounts: Record<ClientSystem, number> = {
      [ClientSystem.SECURITY]: 0,
      [ClientSystem.HOOKS]: 0,
      [ClientSystem.LIBRARY_SERVICES]: 0,
      [ClientSystem.SERVICE_ARCHITECTURE]: 0
    };

    recentData.forEach(d => {
      systemErrorCounts[d.system] += d.errorCount;
    });

    Object.entries(systemErrorCounts).forEach(([system, count]) => {
      if (count > 30) { // Threshold
        alerts.push({
          type: 'threshold_exceeded',
          message: `Error threshold exceeded for ${system}: ${count} errors in last hour`,
          severity: ErrorSeverity.HIGH,
          affectedSystems: [system as ClientSystem]
        });
      }
    });

    // Check for anomalies (using simple statistical method)
    const allCounts = recentData.map(d => d.errorCount);
    if (allCounts.length > 0) {
      const mean = allCounts.reduce((a, b) => a + b, 0) / allCounts.length;
      const stdDev = Math.sqrt(
        allCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / allCounts.length
      );

      recentData.forEach(d => {
        if (d.errorCount > mean + 2 * stdDev) {
          alerts.push({
            type: 'anomaly_detected',
            message: `Anomalous error count detected for ${d.system}: ${d.errorCount} errors`,
            severity: ErrorSeverity.MEDIUM,
            affectedSystems: [d.system]
          });
        }
      });
    }

    return alerts;
  }

  async predictIssues(horizon: number): Promise<Array<{
    system: ClientSystem;
    issue: string;
    probability: number;
    impact: number;
    recommendedActions: string[];
  }>> {
    const predictions = [];
    const trends = await this.analyzeTrends({
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now()
    });

    trends.trends.forEach(trend => {
      if (trend.trend === 'increasing' && trend.confidence > 0.7) {
        const system = trend.pattern.split(' ')[0] as ClientSystem;
        const probability = Math.min(0.9, trend.confidence);
        const impact = Math.min(100, trend.prediction * 10);

        predictions.push({
          system,
          issue: `Increasing error rate in ${system}`,
          probability,
          impact,
          recommendedActions: [
            'Review recent code changes',
            'Check system resources',
            'Monitor error patterns',
            'Consider rolling back recent deployments'
          ]
        });
      }
    });

    // Add predictions based on current system health
    const crossSystemAnalytics = await this.getCrossSystemAnalytics();
    crossSystemAnalytics.systems.forEach(systemHealth => {
      if (systemHealth.status === 'critical') {
        predictions.push({
          system: systemHealth.system,
          issue: `Critical system health in ${systemHealth.system}`,
          probability: 0.95,
          impact: 90,
          recommendedActions: [
            'Immediate investigation required',
            'Check system logs',
            'Verify service dependencies',
            'Prepare incident response'
          ]
        });
      }
    });

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  private async getCrossSystemAnalytics() {
    // Import here to avoid circular dependencies
    const { CrossSystemErrorAnalytics } = await import('./cross-system-error-analytics');
    return CrossSystemErrorAnalytics.getInstance().getCrossSystemAnalytics();
  }

  // Public methods for configuration
  addAlertRule(rule: Omit<AlertRule, 'lastTriggered'>): void {
    this.alertRules.push({
      ...rule,
      lastTriggered: 0
    });
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  getTrendData(system?: ClientSystem, timeRange?: { start: number; end: number }): TrendDataPoint[] {
    let data = this.trendData;

    if (system) {
      data = data.filter(d => d.system === system);
    }

    if (timeRange) {
      data = data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end);
    }

    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  destroy(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }
}

export { TrendAnalysisService };
export default TrendAnalysisService;
