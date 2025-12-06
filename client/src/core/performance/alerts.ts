/**
 * Performance Alerts Module
 * 
 * Manages performance alerts and threshold monitoring with configurable
 * severity levels and external reporting capabilities.
 */

import { logger } from '../../utils/logger';
import { PerformanceAlert, PerformanceMetric, PerformanceConfig } from './types';

/**
 * Performance Alerts Manager class
 */
export class PerformanceAlertsManager {
  private static instance: PerformanceAlertsManager;
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, number> = new Map();
  private config: PerformanceConfig['alerts'];
  private listeners: Array<(alert: PerformanceAlert) => void> = [];
  private externalReporters: Array<(alert: PerformanceAlert) => Promise<void>> = [];

  private constructor(config: PerformanceConfig['alerts']) {
    this.config = config;
    this.setupDefaultThresholds();
    this.startCleanupTimer();
  }

  static getInstance(config?: PerformanceConfig['alerts']): PerformanceAlertsManager {
    if (!PerformanceAlertsManager.instance) {
      PerformanceAlertsManager.instance = new PerformanceAlertsManager(config || {
        enabled: true,
        maxAlerts: 100,
        retentionMs: 60 * 60 * 1000,
        externalReporting: false
      });
    }
    return PerformanceAlertsManager.instance;
  }

  /**
   * Adds a listener for performance alerts
   */
  addListener(listener: (alert: PerformanceAlert) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Removes a listener
   */
  removeListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Adds an external reporter for alerts
   */
  addExternalReporter(reporter: (alert: PerformanceAlert) => Promise<void>): void {
    this.externalReporters.push(reporter);
  }

  /**
   * Removes an external reporter
   */
  removeExternalReporter(reporter: (alert: PerformanceAlert) => Promise<void>): void {
    const index = this.externalReporters.indexOf(reporter);
    if (index > -1) {
      this.externalReporters.splice(index, 1);
    }
  }

  /**
   * Initializes default performance thresholds based on Web Vitals standards
   */
  private setupDefaultThresholds(): void {
    // Core Web Vitals thresholds (aligned with Google's recommendations)
    this.thresholds.set('LCP', 2500);  // Large Contentful Paint - good threshold
    this.thresholds.set('FID', 100);   // First Input Delay - good threshold
    this.thresholds.set('INP', 200);   // Interaction to Next Paint - good threshold
    this.thresholds.set('CLS', 0.1);   // Cumulative Layout Shift - good threshold
    this.thresholds.set('FCP', 1800);  // First Contentful Paint - good threshold
    this.thresholds.set('TTFB', 800);  // Time to First Byte - good threshold

    // Resource thresholds
    this.thresholds.set('bundle-size', 250000);      // 250KB
    this.thresholds.set('memory-usage', 50000000);   // 50MB
    this.thresholds.set('dom-size', 1500);           // DOM nodes
    this.thresholds.set('image-size', 1000000);      // 1MB
    this.thresholds.set('font-size', 100000);        // 100KB

    // Network thresholds
    this.thresholds.set('request-count', 50);        // Number of requests
    this.thresholds.set('total-size', 2000000);      // 2MB total payload

    logger.info('Default performance thresholds initialized', {
      component: 'PerformanceAlertsManager',
      thresholdCount: this.thresholds.size
    });
  }

  /**
   * Checks if a metric exceeds its threshold and creates an alert if necessary
   */
  async checkMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const threshold = this.thresholds.get(metric.name);
    
    // Early return if no threshold is defined for this metric
    if (threshold === undefined) {
      return;
    }

    // Only create alert if threshold is exceeded
    if (metric.value > threshold) {
      const severity = this.calculateSeverity(metric.value, threshold);
      const exceedancePercentage = ((metric.value - threshold) / threshold) * 100;
      
      const alert: PerformanceAlert = {
        id: this.generateAlertId(),
        type: this.determineAlertType(metric),
        severity,
        message: this.generateAlertMessage(metric, threshold, exceedancePercentage),
        metric: metric.name,
        value: metric.value,
        threshold,
        timestamp: new Date(),
        url: metric.url || (typeof window !== 'undefined' ? window.location.href : ''),
        resolved: false
      };

      await this.createAlert(alert);
    }
  }

  /**
   * Determines the alert type based on the metric
   */
  private determineAlertType(metric: PerformanceMetric): PerformanceAlert['type'] {
    if (metric.name.includes('memory')) {
      return 'memory-leak';
    }
    if (metric.name.includes('network') || metric.name === 'TTFB') {
      return 'network-slow';
    }
    if (metric.category === 'loading' || metric.category === 'interactivity' || metric.category === 'visual-stability') {
      return 'slow-metric';
    }
    return 'custom';
  }

  /**
   * Generates a descriptive alert message
   */
  private generateAlertMessage(
    metric: PerformanceMetric, 
    threshold: number, 
    exceedancePercentage: number
  ): string {
    const metricDisplayName = this.getMetricDisplayName(metric.name);
    const unit = this.getMetricUnit(metric.name);
    
    return `${metricDisplayName} exceeded threshold by ${exceedancePercentage.toFixed(1)}%: ${metric.value.toFixed(2)}${unit} > ${threshold}${unit}`;
  }

  /**
   * Gets a human-readable display name for a metric
   */
  private getMetricDisplayName(metricName: string): string {
    const displayNames: Record<string, string> = {
      'LCP': 'Largest Contentful Paint',
      'FID': 'First Input Delay',
      'INP': 'Interaction to Next Paint',
      'CLS': 'Cumulative Layout Shift',
      'FCP': 'First Contentful Paint',
      'TTFB': 'Time to First Byte',
      'bundle-size': 'Bundle Size',
      'memory-usage': 'Memory Usage',
      'dom-size': 'DOM Size',
      'image-size': 'Image Payload',
      'font-size': 'Font Payload'
    };
    
    return displayNames[metricName] || metricName;
  }

  /**
   * Gets the appropriate unit for a metric
   */
  private getMetricUnit(metricName: string): string {
    if (metricName.includes('size') || metricName.includes('memory')) {
      return 'B'; // Bytes
    }
    if (metricName === 'CLS') {
      return ''; // Unitless
    }
    if (metricName.includes('dom')) {
      return ' nodes';
    }
    return 'ms'; // Milliseconds for timing metrics
  }

  /**
   * Generates a unique alert identifier
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Calculates alert severity based on how much the threshold was exceeded
   */
  private calculateSeverity(value: number, threshold: number): PerformanceAlert['severity'] {
    const ratio = value / threshold;
    
    if (ratio > 3) return 'critical';    // More than 3x threshold
    if (ratio > 2) return 'high';        // More than 2x threshold
    if (ratio > 1.5) return 'medium';    // More than 1.5x threshold
    return 'low';                         // Between 1x and 1.5x threshold
  }

  /**
   * Creates and stores a new performance alert
   */
  private async createAlert(alert: PerformanceAlert): Promise<void> {
    // Check for duplicate alerts (same metric, similar value, recent timestamp)
    const isDuplicate = this.alerts.some(existingAlert => 
      existingAlert.metric === alert.metric &&
      Math.abs(existingAlert.value - alert.value) / alert.value < 0.1 && // Within 10%
      alert.timestamp.getTime() - existingAlert.timestamp.getTime() < 60000 && // Within 1 minute
      !existingAlert.resolved
    );

    if (isDuplicate) {
      logger.debug('Duplicate alert suppressed', {
        component: 'PerformanceAlertsManager',
        metric: alert.metric,
        value: alert.value
      });
      return;
    }

    this.alerts.push(alert);
    
    // Log the alert for monitoring and debugging
    logger.warn('Performance alert created', { 
      component: 'PerformanceAlertsManager',
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold
      },
      activeAlertsCount: this.getActiveAlerts().length 
    });

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('Error in alert listener', { error, alert });
      }
    });

    // Send to external reporters if enabled
    if (this.config.externalReporting) {
      await this.sendToExternalReporters(alert);
    }

    // Maintain a reasonable alert history size
    this.pruneOldAlerts();
  }

  /**
   * Sends alert to external reporting services
   */
  private async sendToExternalReporters(alert: PerformanceAlert): Promise<void> {
    const reportingPromises = this.externalReporters.map(async (reporter) => {
      try {
        await reporter(alert);
      } catch (error) {
        logger.error('External alert reporting failed', { 
          error, 
          alertId: alert.id 
        });
      }
    });

    await Promise.allSettled(reportingPromises);
  }

  /**
   * Removes old alerts to prevent unbounded memory growth
   */
  private pruneOldAlerts(): void {
    const cutoffTime = Date.now() - this.config.retentionMs;
    const initialCount = this.alerts.length;
    
    // Remove old alerts
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );

    // Also enforce max alerts limit
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(-this.config.maxAlerts);
    }

    const removedCount = initialCount - this.alerts.length;
    if (removedCount > 0) {
      logger.debug('Old alerts pruned', {
        component: 'PerformanceAlertsManager',
        removedCount,
        remainingCount: this.alerts.length
      });
    }
  }

  /**
   * Returns active (unresolved) alerts from the retention period
   */
  getActiveAlerts(): PerformanceAlert[] {
    const cutoffTime = Date.now() - this.config.retentionMs;
    return this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime && !alert.resolved
    );
  }

  /**
   * Returns all alerts from the retention period
   */
  getAllAlerts(): PerformanceAlert[] {
    const cutoffTime = Date.now() - this.config.retentionMs;
    return this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Returns alerts filtered by severity level
   */
  getAlertsBySeverity(severity: PerformanceAlert['severity']): PerformanceAlert[] {
    return this.getActiveAlerts().filter(alert => alert.severity === severity);
  }

  /**
   * Returns alerts filtered by type
   */
  getAlertsByType(type: PerformanceAlert['type']): PerformanceAlert[] {
    return this.getActiveAlerts().filter(alert => alert.type === type);
  }

  /**
   * Returns alerts for a specific metric
   */
  getAlertsByMetric(metric: string): PerformanceAlert[] {
    return this.getActiveAlerts().filter(alert => alert.metric === metric);
  }

  /**
   * Resolves an alert by ID
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Alert resolved', {
        component: 'PerformanceAlertsManager',
        alertId,
        metric: alert.metric
      });
      
      return true;
    }
    return false;
  }

  /**
   * Resolves all alerts for a specific metric
   */
  resolveAlertsByMetric(metric: string): number {
    let resolvedCount = 0;
    
    this.alerts.forEach(alert => {
      if (alert.metric === metric && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        resolvedCount++;
      }
    });

    if (resolvedCount > 0) {
      logger.info('Alerts resolved by metric', {
        component: 'PerformanceAlertsManager',
        metric,
        resolvedCount
      });
    }

    return resolvedCount;
  }

  /**
   * Configures a custom threshold for a specific metric
   */
  setThreshold(metric: string, threshold: number): void {
    if (threshold <= 0) {
      logger.error('Invalid threshold value', { metric, threshold });
      throw new Error('Threshold must be greater than zero');
    }

    this.thresholds.set(metric, threshold);
    logger.info('Threshold updated', { 
      component: 'PerformanceAlertsManager',
      metric, 
      threshold 
    });
  }

  /**
   * Gets the threshold for a specific metric
   */
  getThreshold(metric: string): number | undefined {
    return this.thresholds.get(metric);
  }

  /**
   * Gets all configured thresholds
   */
  getThresholds(): Map<string, number> {
    return new Map(this.thresholds);
  }

  /**
   * Updates the alerts configuration
   */
  updateConfig(config: Partial<PerformanceConfig['alerts']>): void {
    this.config = { ...this.config, ...config };
    
    logger.info('Performance alerts configuration updated', { 
      component: 'PerformanceAlertsManager',
      config: this.config 
    });
  }

  /**
   * Gets alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    byMetric: Record<string, number>;
  } {
    const allAlerts = this.getAllAlerts();
    const activeAlerts = this.getActiveAlerts();
    
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byMetric: Record<string, number> = {};

    activeAlerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      byMetric[alert.metric] = (byMetric[alert.metric] || 0) + 1;
    });

    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      resolved: allAlerts.filter(a => a.resolved).length,
      bySeverity,
      byType,
      byMetric
    };
  }

  /**
   * Clears all alerts (useful for testing or reset scenarios)
   */
  clearAlerts(): void {
    const clearedCount = this.alerts.length;
    this.alerts = [];
    
    logger.info('All alerts cleared', {
      component: 'PerformanceAlertsManager',
      clearedCount
    });
  }

  /**
   * Starts the cleanup timer for old alerts
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.pruneOldAlerts();
    }, 60000); // Run every minute
  }

  /**
   * Exports alerts for external analysis
   */
  exportAlerts(): {
    timestamp: Date;
    alerts: PerformanceAlert[];
    stats: ReturnType<typeof this.getAlertStats>;
    thresholds: Record<string, number>;
  } {
    return {
      timestamp: new Date(),
      alerts: this.getAllAlerts(),
      stats: this.getAlertStats(),
      thresholds: Object.fromEntries(this.thresholds)
    };
  }
}