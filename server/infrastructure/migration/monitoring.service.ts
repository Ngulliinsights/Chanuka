/**
 * Migration Monitoring Service
 * 
 * Provides comprehensive monitoring for migration metrics with real-time alerting
 * and performance tracking across all migration phases.
 */

export interface MigrationMetrics {
  component: string;
  phase: number;
  timestamp: Date;
  performance: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    errorRate: number;
    throughput: number;
    memoryUsage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
  connectionMetrics?: {
    activeConnections: number;
    connectionRate: number;
    disconnectionRate: number;
  };
  migrationState: {
    rolloutPercentage: number;
    status: 'not_started' | 'in_progress' | 'testing' | 'rolled_out' | 'completed';
    dataValidationStatus: 'passed' | 'failed' | 'pending';
  };
}

export interface AlertThreshold {
  metric: string;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'alert' | 'rollback';
}

export interface AlertEvent {
  id: string;
  component: string;
  metric: string;
  currentValue: number;
  threshold: AlertThreshold;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class MonitoringService {
  private metrics: Map<string, MigrationMetrics[]> = new Map();
  private alerts: AlertEvent[] = [];
  private thresholds: AlertThreshold[] = [];
  private alertCallbacks: Map<string, (alert: AlertEvent) => void> = new Map();

  constructor() {
    this.initializeDefaultThresholds();
    this.startMetricsCollection();
  }

  /**
   * Initialize default alert thresholds
   */
  private initializeDefaultThresholds(): void {
    this.thresholds = [
      {
        metric: 'errorRate',
        operator: '>',
        value: 0.01, // 1%
        severity: 'high',
        action: 'rollback'
      },
      {
        metric: 'responseTime.p95',
        operator: '>',
        value: 500, // 500ms
        severity: 'medium',
        action: 'alert'
      },
      {
        metric: 'responseTime.p99',
        operator: '>',
        value: 1000, // 1000ms
        severity: 'high',
        action: 'alert'
      },
      {
        metric: 'memoryUsage.heapUsed',
        operator: '>',
        value: 0.9, // 90% of heap
        severity: 'high',
        action: 'alert'
      },
      {
        metric: 'connectionMetrics.disconnectionRate',
        operator: '>',
        value: 0.01, // 1%
        severity: 'medium',
        action: 'alert'
      }
    ];
  }

  /**
   * Record migration metrics
   */
  async recordMetrics(metrics: MigrationMetrics): Promise<void> {
    const componentMetrics = this.metrics.get(metrics.component) || [];
    componentMetrics.push(metrics);
    
    // Keep only last 1000 metrics per component
    if (componentMetrics.length > 1000) {
      componentMetrics.splice(0, componentMetrics.length - 1000);
    }
    
    this.metrics.set(metrics.component, componentMetrics);
    
    // Check for threshold violations
    await this.checkThresholds(metrics);
  }

  /**
   * Get current metrics for a component
   */
  getCurrentMetrics(component: string): MigrationMetrics | null {
    const componentMetrics = this.metrics.get(component);
    return componentMetrics && componentMetrics.length > 0 
      ? componentMetrics[componentMetrics.length - 1] 
      : null;
  }

  /**
   * Get metrics history for a component
   */
  getMetricsHistory(component: string, limit: number = 100): MigrationMetrics[] {
    const componentMetrics = this.metrics.get(component) || [];
    return componentMetrics.slice(-limit);
  }

  /**
   * Get aggregated metrics across time window
   */
  getAggregatedMetrics(component: string, windowMinutes: number = 60): any {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
    const componentMetrics = this.metrics.get(component) || [];
    const recentMetrics = componentMetrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return null;
    }

    const responseTimes = recentMetrics.map(m => m.performance.responseTime.p95);
    const errorRates = recentMetrics.map(m => m.performance.errorRate);
    const memoryUsages = recentMetrics.map(m => m.performance.memoryUsage.heapUsed);

    return {
      component,
      windowMinutes,
      sampleCount: recentMetrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      averageErrorRate: errorRates.reduce((a, b) => a + b, 0) / errorRates.length,
      averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxResponseTime: Math.max(...responseTimes),
      maxErrorRate: Math.max(...errorRates),
      maxMemoryUsage: Math.max(...memoryUsages)
    };
  }

  /**
   * Check metrics against thresholds and trigger alerts
   */
  private async checkThresholds(metrics: MigrationMetrics): Promise<void> {
    for (const threshold of this.thresholds) {
      const value = this.getMetricValue(metrics, threshold.metric);
      if (value !== null && this.evaluateThreshold(value, threshold)) {
        await this.triggerAlert(metrics.component, threshold.metric, value, threshold);
      }
    }
  }

  /**
   * Extract metric value from metrics object
   */
  private getMetricValue(metrics: MigrationMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let value: any = metrics.performance;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  /**
   * Evaluate if threshold is violated
   */
  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case '>': return value > threshold.value;
      case '<': return value < threshold.value;
      case '>=': return value >= threshold.value;
      case '<=': return value <= threshold.value;
      case '==': return value === threshold.value;
      case '!=': return value !== threshold.value;
      default: return false;
    }
  }

  /**
   * Trigger alert for threshold violation
   */
  private async triggerAlert(component: string, metric: string, currentValue: number, threshold: AlertThreshold): Promise<void> {
    const alertId = `${component}-${metric}-${Date.now()}`;
    const alert: AlertEvent = {
      id: alertId,
      component,
      metric,
      currentValue,
      threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    // Execute alert action
    switch (threshold.action) {
      case 'log':
        console.log(`[ALERT] ${threshold.severity.toUpperCase()}: ${component} ${metric} = ${currentValue} (threshold: ${threshold.operator} ${threshold.value})`);
        break;
      case 'alert':
        console.error(`[ALERT] ${threshold.severity.toUpperCase()}: ${component} ${metric} = ${currentValue} (threshold: ${threshold.operator} ${threshold.value})`);
        await this.notifyAlertHandlers(alert);
        break;
      case 'rollback':
        console.error(`[CRITICAL ALERT] Triggering rollback for ${component}: ${metric} = ${currentValue} (threshold: ${threshold.operator} ${threshold.value})`);
        await this.notifyAlertHandlers(alert);
        // Rollback will be handled by the rollback service
        break;
    }
  }

  /**
   * Notify registered alert handlers
   */
  private async notifyAlertHandlers(alert: AlertEvent): Promise<void> {
    for (const [handlerName, callback] of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error(`Alert handler ${handlerName} failed:`, error);
      }
    }
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(name: string, callback: (alert: AlertEvent) => void): void {
    this.alertCallbacks.set(name, callback);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Start automatic metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    // This would be expanded to collect metrics from all active migration components
    const systemMetrics: MigrationMetrics = {
      component: 'system',
      phase: 0,
      timestamp: new Date(),
      performance: {
        responseTime: { p50: 0, p95: 0, p99: 0 },
        errorRate: 0,
        throughput: 0,
        memoryUsage: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        }
      },
      migrationState: {
        rolloutPercentage: 0,
        status: 'not_started',
        dataValidationStatus: 'pending'
      }
    };

    this.recordMetrics(systemMetrics);
  }

  /**
   * Get dashboard data for monitoring UI
   */
  getDashboardData(): any {
    const components = Array.from(this.metrics.keys());
    const dashboardData: any = {
      timestamp: new Date(),
      components: {},
      alerts: {
        active: this.getActiveAlerts().length,
        total: this.alerts.length,
        byComponent: {}
      },
      systemHealth: 'healthy'
    };

    for (const component of components) {
      const currentMetrics = this.getCurrentMetrics(component);
      const aggregated = this.getAggregatedMetrics(component, 60);
      
      dashboardData.components[component] = {
        current: currentMetrics,
        aggregated,
        status: currentMetrics?.migrationState.status || 'not_started'
      };
    }

    // Count alerts by component
    for (const alert of this.getActiveAlerts()) {
      dashboardData.alerts.byComponent[alert.component] = 
        (dashboardData.alerts.byComponent[alert.component] || 0) + 1;
    }

    // Determine overall system health
    const criticalAlerts = this.getActiveAlerts().filter(a => a.threshold.severity === 'critical');
    const highAlerts = this.getActiveAlerts().filter(a => a.threshold.severity === 'high');
    
    if (criticalAlerts.length > 0) {
      dashboardData.systemHealth = 'critical';
    } else if (highAlerts.length > 0) {
      dashboardData.systemHealth = 'warning';
    }

    return dashboardData;
  }
}

// Global instance
export const monitoringService = new MonitoringService();
