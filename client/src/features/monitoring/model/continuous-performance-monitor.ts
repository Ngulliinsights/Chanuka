/**
 * Continuous Performance Monitor
 *
 * Sets up continuous performance monitoring pipeline that tracks metrics
 * in real-time and provides alerts for performance degradation
 *
 * Requirements: 11.4, 11.5
 */

import { logger } from '@client/shared/utils/logger';

/**
 * Performance monitoring configuration
 */
interface MonitoringConfig {
  enabled: boolean;
  monitoringInterval: number; // in milliseconds
  alertThresholds: {
    loadTime: number; // milliseconds
    renderTime: number; // milliseconds
    memoryUsage: number; // bytes
    errorRate: number; // percentage (0-1)
    resourceCount: number; // number of resources
  };
  alertCooldown: number; // milliseconds between alerts for same issue
  enableWebVitalsTracking: boolean;
  enableResourceTracking: boolean;
  enableErrorTracking: boolean;
  enableMemoryTracking: boolean;
}

/**
 * Performance alert
 */
interface PerformanceAlert {
  id: string;
  type:
    | 'load_time'
    | 'render_time'
    | 'memory_usage'
    | 'error_rate'
    | 'resource_count'
    | 'web_vitals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  route: string;
  timestamp: Date;
  acknowledged: boolean;
}

class ContinuousPerformanceMonitor {
  private static instance: ContinuousPerformanceMonitor;
  private config: MonitoringConfig;
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: PerformanceAlert[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  static getInstance(): ContinuousPerformanceMonitor {
    if (!ContinuousPerformanceMonitor.instance) {
      ContinuousPerformanceMonitor.instance = new ContinuousPerformanceMonitor();
    }
    return ContinuousPerformanceMonitor.instance;
  }

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      monitoringInterval: 30000, // 30 seconds
      alertThresholds: {
        loadTime: 3000, // 3 seconds
        renderTime: 100, // 100ms
        memoryUsage: 100 * 1024 * 1024, // 100MB
        errorRate: 0.05, // 5%
        resourceCount: 100,
      },
      alertCooldown: 300000, // 5 minutes
      enableWebVitalsTracking: true,
      enableResourceTracking: true,
      enableErrorTracking: true,
      enableMemoryTracking: true,
    };
  }

  /**
   * Start continuous monitoring
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting continuous performance monitoring');

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
  }

  /**
   * Stop continuous monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Stopped continuous performance monitoring');
  }

  /**
   * Collect performance metrics
   */
  private collectMetrics(): void {
    try {
      if (this.config.enableMemoryTracking) {
        this.checkMemoryUsage();
      }

      if (this.config.enableResourceTracking) {
        this.checkResourceCount();
      }

      if (this.config.enableWebVitalsTracking) {
        this.checkWebVitals();
      }
    } catch (error) {
      logger.error('Failed to collect performance metrics', { error });
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize;

      if (usedMemory > this.config.alertThresholds.memoryUsage) {
        this.createAlert({
          type: 'memory_usage',
          severity: 'high',
          message: `High memory usage: ${Math.round(usedMemory / 1024 / 1024)}MB`,
          value: usedMemory,
          threshold: this.config.alertThresholds.memoryUsage,
          route: window.location.pathname,
        });
      }
    }
  }

  /**
   * Check resource count
   */
  private checkResourceCount(): void {
    const resources = performance.getEntriesByType('resource');
    const resourceCount = resources.length;

    if (resourceCount > this.config.alertThresholds.resourceCount) {
      this.createAlert({
        type: 'resource_count',
        severity: 'medium',
        message: `High resource count: ${resourceCount}`,
        value: resourceCount,
        threshold: this.config.alertThresholds.resourceCount,
        route: window.location.pathname,
      });
    }
  }

  /**
   * Check Web Vitals
   */
  private checkWebVitals(): void {
    // Simplified Web Vitals check
    // In real implementation, would use web-vitals library
  }

  /**
   * Create performance alert
   */
  private createAlert(
    alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'acknowledged'>
  ): void {
    const alertKey = `${alertData.type}-${alertData.route}`;
    const now = Date.now();
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;

    // Check cooldown
    if (now - lastAlertTime < this.config.alertCooldown) {
      return;
    }

    const alert: PerformanceAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.lastAlertTimes.set(alertKey, now);

    logger.warn('Performance alert created', { alert });

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-25);
    }
  }

  /**
   * Get active alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info('Alert acknowledged', { alertId });
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.lastAlertTimes.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled && !this.isRunning) {
      this.start();
    } else if (!this.config.enabled && this.isRunning) {
      this.stop();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const continuousPerformanceMonitor = ContinuousPerformanceMonitor.getInstance();

// Export types
export type { MonitoringConfig, PerformanceAlert };
