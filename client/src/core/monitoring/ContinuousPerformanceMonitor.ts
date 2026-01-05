/**
 * Continuous Performance Monitor
 *
 * Sets up continuous performance monitoring pipeline that tracks metrics
 * in real-time and provides alerts for performance degradation
 *
 * Requirements: 11.4, 11.5
 */

import { logger } from '@client/utils/logger';
import { performanceRegressionTester } from './PerformanceRegressionTester';

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
  type: 'load_time' | 'render_time' | 'memory_usage' | 'error_rate' | 'resource_count' | 'web_vitals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  route: string;
  timestamp: Date;
  acknowledged: boolean;
}

/**
 * Web Vitals metrics
 */
interface WebVitalsMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

/**
 * Performance snapshot
 */
interface PerformanceSnapshot {
  timestamp: Date;
  route: string;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  resourceCount: number;
  errorCount: number;
  webVitals: Partial<WebVitalsMetrics>;
  networkRequests: number;
  cacheHitRate: number;
}

/**
 * Default monitoring configuration
 */
const DEFAULT_CONFIG: MonitoringConfig = {
  enabled: process.env.NODE_ENV === 'development',
  monitoringInterval: 30000, // 30 seconds
  alertThresholds: {
    loadTime: 3000, // 3 seconds
    renderTime: 100, // 100ms
    memoryUsage: 100 * 1024 * 1024, // 100MB
    errorRate: 0.05, // 5%
    resourceCount: 100
  },
  alertCooldown: 300000, // 5 minutes
  enableWebVitalsTracking: true,
  enableResourceTracking: true,
  enableErrorTracking: true,
  enableMemoryTracking: true
};

/**
 * Continuous Performance Monitor Class
 */
export class ContinuousPerformanceMonitor {
  private static instance: ContinuousPerformanceMonitor;

  private config: MonitoringConfig;
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private webVitalsObserver: PerformanceObserver | null = null;

  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private lastAlertTimes: Map<string, number> = new Map();
  private webVitalsMetrics: Partial<WebVitalsMetrics> = {};
  private errorCount: number = 0;
  private totalRequests: number = 0;

  private constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupErrorTracking();
    this.setupWebVitalsTracking();
    this.setupResourceTracking();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<MonitoringConfig>): ContinuousPerformanceMonitor {
    if (!ContinuousPerformanceMonitor.instance) {
      ContinuousPerformanceMonitor.instance = new ContinuousPerformanceMonitor(config);
    }
    return ContinuousPerformanceMonitor.instance;
  }

  /**
   * Start continuous monitoring
   */
  public start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.capturePerformanceSnapshot();
    }, this.config.monitoringInterval);

    logger.info('Continuous performance monitoring started', {
      interval: this.config.monitoringInterval,
      thresholds: this.config.alertThresholds
    });
  }

  /**
   * Stop continuous monitoring
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.webVitalsObserver) {
      this.webVitalsObserver.disconnect();
    }

    this.isRunning = false;
    logger.info('Continuous performance monitoring stopped');
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    if (!this.config.enableErrorTracking || typeof window === 'undefined') {
      return;
    }

    const handleError = () => {
      this.errorCount++;
      this.totalRequests++;
    };

    const handleUnhandledRejection = () => {
      this.errorCount++;
      this.totalRequests++;
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Track successful requests (approximation)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      this.totalRequests++;
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.errorCount++;
        }
        return response;
      } catch (error) {
        this.errorCount++;
        throw error;
      }
    };
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitalsTracking(): void {
    if (!this.config.enableWebVitalsTracking || typeof window === 'undefined') {
      return;
    }

    try {
      this.webVitalsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.webVitalsMetrics.fcp = entry.startTime;
              }
              break;
            case 'largest-contentful-paint':
              this.webVitalsMetrics.lcp = entry.startTime;
              break;
            case 'first-input':
              this.webVitalsMetrics.fid = entry.processingStart - entry.startTime;
              break;
            case 'layout-shift':
              if (!(entry as any).hadRecentInput) {
                this.webVitalsMetrics.cls = (this.webVitalsMetrics.cls || 0) + (entry as any).value;
              }
              break;
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              this.webVitalsMetrics.ttfb = navEntry.responseStart - navEntry.requestStart;
              break;
          }
        });
      });

      this.webVitalsObserver.observe({
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation']
      });
    } catch (error) {
      logger.warn('Web Vitals tracking not supported', { error });
    }
  }

  /**
   * Setup resource tracking
   */
  private setupResourceTracking(): void {
    if (!this.config.enableResourceTracking || typeof window === 'undefined') {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        // Resource tracking is handled in capturePerformanceSnapshot
      });

      this.performanceObserver.observe({ entryTypes: ['resource', 'navigation'] });
    } catch (error) {
      logger.warn('Resource tracking not supported', { error });
    }
  }

  /**
   * Capture performance snapshot
   */
  private capturePerformanceSnapshot(): void {
    if (typeof window === 'undefined') return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      const memoryInfo = (performance as any).memory;

      const snapshot: PerformanceSnapshot = {
        timestamp: new Date(),
        route: window.location.pathname,
        loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
        renderTime: navigation ? navigation.domInteractive - navigation.fetchStart : 0,
        memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize : 0,
        resourceCount: resources.length,
        errorCount: this.errorCount,
        webVitals: { ...this.webVitalsMetrics },
        networkRequests: this.totalRequests,
        cacheHitRate: this.calculateCacheHitRate(resources)
      };

      this.snapshots.push(snapshot);

      // Keep only last 100 snapshots
      if (this.snapshots.length > 100) {
        this.snapshots = this.snapshots.slice(-100);
      }

      // Check for performance issues
      this.checkPerformanceThresholds(snapshot);

      // Update regression tester
      performanceRegressionTester.testPerformance(
        snapshot.route,
        snapshot.loadTime,
        snapshot.renderTime,
        snapshot.resourceCount,
        snapshot.memoryUsage
      );

      logger.debug('Performance snapshot captured', {
        route: snapshot.route,
        loadTime: snapshot.loadTime,
        memoryUsage: Math.round(snapshot.memoryUsage / 1024 / 1024) + 'MB'
      });
    } catch (error) {
      logger.error('Failed to capture performance snapshot', { error });
    }
  }

  /**
   * Calculate cache hit rate from resource entries
   */
  private calculateCacheHitRate(resources: PerformanceEntry[]): number {
    if (resources.length === 0) return 0;

    const cachedResources = resources.filter(resource => {
      const resourceEntry = resource as PerformanceResourceTiming;
      return resourceEntry.transferSize === 0 && resourceEntry.decodedBodySize > 0;
    });

    return cachedResources.length / resources.length;
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(snapshot: PerformanceSnapshot): void {
    const alerts: PerformanceAlert[] = [];

    // Check load time
    if (snapshot.loadTime > this.config.alertThresholds.loadTime) {
      alerts.push(this.createAlert(
        'load_time',
        'high',
        `Page load time (${Math.round(snapshot.loadTime)}ms) exceeds threshold (${this.config.alertThresholds.loadTime}ms)`,
        snapshot.loadTime,
        this.config.alertThresholds.loadTime,
        snapshot.route
      ));
    }

    // Check render time
    if (snapshot.renderTime > this.config.alertThresholds.renderTime) {
      alerts.push(this.createAlert(
        'render_time',
        'medium',
        `Render time (${Math.round(snapshot.renderTime)}ms) exceeds threshold (${this.config.alertThresholds.renderTime}ms)`,
        snapshot.renderTime,
        this.config.alertThresholds.renderTime,
        snapshot.route
      ));
    }

    // Check memory usage
    if (this.config.enableMemoryTracking && snapshot.memoryUsage > this.config.alertThresholds.memoryUsage) {
      alerts.push(this.createAlert(
        'memory_usage',
        'high',
        `Memory usage (${Math.round(snapshot.memoryUsage / 1024 / 1024)}MB) exceeds threshold (${Math.round(this.config.alertThresholds.memoryUsage / 1024 / 1024)}MB)`,
        snapshot.memoryUsage,
        this.config.alertThresholds.memoryUsage,
        snapshot.route
      ));
    }

    // Check error rate
    const errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
    if (errorRate > this.config.alertThresholds.errorRate) {
      alerts.push(this.createAlert(
        'error_rate',
        'critical',
        `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(this.config.alertThresholds.errorRate * 100).toFixed(1)}%)`,
        errorRate,
        this.config.alertThresholds.errorRate,
        snapshot.route
      ));
    }

    // Check resource count
    if (snapshot.resourceCount > this.config.alertThresholds.resourceCount) {
      alerts.push(this.createAlert(
        'resource_count',
        'medium',
        `Resource count (${snapshot.resourceCount}) exceeds threshold (${this.config.alertThresholds.resourceCount})`,
        snapshot.resourceCount,
        this.config.alertThresholds.resourceCount,
        snapshot.route
      ));
    }

    // Check Web Vitals
    if (snapshot.webVitals.lcp && snapshot.webVitals.lcp > 2500) {
      alerts.push(this.createAlert(
        'web_vitals',
        'high',
        `Largest Contentful Paint (${Math.round(snapshot.webVitals.lcp)}ms) indicates poor loading performance`,
        snapshot.webVitals.lcp,
        2500,
        snapshot.route
      ));
    }

    if (snapshot.webVitals.cls && snapshot.webVitals.cls > 0.25) {
      alerts.push(this.createAlert(
        'web_vitals',
        'medium',
        `Cumulative Layout Shift (${snapshot.webVitals.cls.toFixed(3)}) indicates poor visual stability`,
        snapshot.webVitals.cls,
        0.25,
        snapshot.route
      ));
    }

    // Process alerts with cooldown
    alerts.forEach(alert => {
      const alertKey = `${alert.type}-${alert.route}`;
      const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;
      const now = Date.now();

      if (now - lastAlertTime > this.config.alertCooldown) {
        this.alerts.push(alert);
        this.lastAlertTimes.set(alertKey, now);

        logger.warn('Performance alert triggered', {
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          route: alert.route
        });
      }
    });

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number,
    route: string
  ): PerformanceAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      value,
      threshold,
      route,
      timestamp: new Date(),
      acknowledged: false
    };
  }

  /**
   * Get performance snapshots
   */
  public getSnapshots(route?: string): PerformanceSnapshot[] {
    if (route) {
      return this.snapshots.filter(s => s.route === route);
    }
    return [...this.snapshots];
  }

  /**
   * Get performance alerts
   */
  public getAlerts(acknowledged?: boolean): PerformanceAlert[] {
    if (acknowledged !== undefined) {
      return this.alerts.filter(a => a.acknowledged === acknowledged);
    }
    return [...this.alerts];
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    averageLoadTime: number;
    averageRenderTime: number;
    averageMemoryUsage: number;
    errorRate: number;
    totalSnapshots: number;
    activeAlerts: number;
    webVitalsScore: number;
  } {
    if (this.snapshots.length === 0) {
      return {
        averageLoadTime: 0,
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        errorRate: 0,
        totalSnapshots: 0,
        activeAlerts: 0,
        webVitalsScore: 100
      };
    }

    const averageLoadTime = this.snapshots.reduce((sum, s) => sum + s.loadTime, 0) / this.snapshots.length;
    const averageRenderTime = this.snapshots.reduce((sum, s) => sum + s.renderTime, 0) / this.snapshots.length;
    const averageMemoryUsage = this.snapshots.reduce((sum, s) => sum + s.memoryUsage, 0) / this.snapshots.length;
    const errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
    const activeAlerts = this.alerts.filter(a => !a.acknowledged).length;

    // Calculate Web Vitals score
    let webVitalsScore = 100;
    if (this.webVitalsMetrics.lcp && this.webVitalsMetrics.lcp > 2500) webVitalsScore -= 25;
    if (this.webVitalsMetrics.fid && this.webVitalsMetrics.fid > 100) webVitalsScore -= 25;
    if (this.webVitalsMetrics.cls && this.webVitalsMetrics.cls > 0.25) webVitalsScore -= 25;
    if (this.webVitalsMetrics.fcp && this.webVitalsMetrics.fcp > 1800) webVitalsScore -= 25;

    return {
      averageLoadTime,
      averageRenderTime,
      averageMemoryUsage,
      errorRate,
      totalSnapshots: this.snapshots.length,
      activeAlerts,
      webVitalsScore: Math.max(webVitalsScore, 0)
    };
  }

  /**
   * Clear all data
   */
  public clearData(): void {
    this.snapshots = [];
    this.alerts = [];
    this.lastAlertTimes.clear();
    this.errorCount = 0;
    this.totalRequests = 0;
    this.webVitalsMetrics = {};
    logger.info('Performance monitoring data cleared');
  }

  /**
   * Export monitoring data
   */
  public exportData(): string {
    const data = {
      config: this.config,
      snapshots: this.snapshots,
      alerts: this.alerts,
      summary: this.getPerformanceSummary(),
      webVitals: this.webVitalsMetrics,
      exportedAt: new Date()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart monitoring if it was running
    if (this.isRunning) {
      this.stop();
      this.start();
    }

    logger.info('Performance monitoring configuration updated', { config: this.config });
  }
}

/**
 * Initialize continuous performance monitor
 */
export const continuousPerformanceMonitor = ContinuousPerformanceMonitor.getInstance();

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
  continuousPerformanceMonitor.start();
}

export default ContinuousPerformanceMonitor;
