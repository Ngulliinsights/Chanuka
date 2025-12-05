/**
 * Performance Monitor Module
 * 
 * Central performance monitoring system that coordinates Web Vitals tracking,
 * budget checking, alert management, and provides unified performance insights.
 */

import { logger } from '../../utils/logger';
import { WebVitalsMonitor } from './web-vitals';
import { PerformanceBudgetChecker } from './budgets';
import { PerformanceAlertsManager } from './alerts';
import { 
  PerformanceConfig, 
  PerformanceMetric, 
  PerformanceStats,
  WebVitalsMetric,
  PerformanceAlert,
  DEFAULT_PERFORMANCE_CONFIG
} from './types';

/**
 * Central Performance Monitor class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceConfig;
  private webVitalsMonitor: WebVitalsMonitor;
  private budgetChecker: PerformanceBudgetChecker;
  private alertsManager: PerformanceAlertsManager;
  private customMetrics: PerformanceMetric[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MAX_CUSTOM_METRICS = 1000;

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    
    // Initialize sub-systems
    this.webVitalsMonitor = WebVitalsMonitor.getInstance(this.config.webVitals);
    this.budgetChecker = PerformanceBudgetChecker.getInstance();
    this.alertsManager = PerformanceAlertsManager.getInstance(this.config.alerts);
    
    this.setupEventListeners();
    this.startMonitoring();
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Sets up event listeners between sub-systems
   */
  private setupEventListeners(): void {
    // Listen to Web Vitals metrics and check budgets/alerts
    this.webVitalsMonitor.addListener(async (webVital: WebVitalsMetric) => {
      const metric: PerformanceMetric = {
        name: webVital.name,
        value: webVital.value,
        timestamp: webVital.timestamp,
        url: webVital.url,
        category: this.getMetricCategory(webVital.name),
        metadata: webVital.metadata
      };

      // Check budget compliance
      if (this.config.budgets.enabled) {
        const budgetResult = this.budgetChecker.checkBudget(metric);
        
        if (budgetResult.status === 'fail') {
          logger.warn('Budget exceeded', {
            component: 'PerformanceMonitor',
            metric: metric.name,
            value: metric.value,
            budget: budgetResult.budget?.budget
          });
        }
      }

      // Check for alerts
      if (this.config.alerts.enabled) {
        await this.alertsManager.checkMetric(metric);
      }
    });

    logger.info('Performance monitoring event listeners configured', {
      component: 'PerformanceMonitor'
    });
  }

  /**
   * Determines the category for a Web Vitals metric
   */
  private getMetricCategory(metricName: string): PerformanceMetric['category'] {
    switch (metricName) {
      case 'LCP':
      case 'FCP':
      case 'TTFB':
        return 'loading';
      case 'FID':
      case 'INP':
        return 'interactivity';
      case 'CLS':
        return 'visual-stability';
      default:
        return 'custom';
    }
  }

  /**
   * Starts the monitoring system
   */
  private startMonitoring(): void {
    if (!this.config.enabled) {
      logger.info('Performance monitoring disabled by configuration');
      return;
    }

    // Start periodic monitoring tasks
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, this.config.budgets.checkInterval);

    logger.info('Performance monitoring started', {
      component: 'PerformanceMonitor',
      config: this.config
    });
  }

  /**
   * Performs periodic monitoring checks
   */
  private async performPeriodicChecks(): Promise<void> {
    try {
      // Collect system metrics
      await this.collectSystemMetrics();
      
      // Check resource usage
      await this.checkResourceUsage();
      
      // Monitor memory usage
      await this.monitorMemoryUsage();
      
    } catch (error) {
      logger.error('Error in periodic monitoring checks', { error });
    }
  }

  /**
   * Collects system-level performance metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // DOM size metric
      const domSize = document.querySelectorAll('*').length;
      await this.recordCustomMetric({
        name: 'dom-size',
        value: domSize,
        timestamp: new Date(),
        category: 'loading',
        url: window.location.href
      });

      // Script count metric
      const scriptCount = document.querySelectorAll('script').length;
      await this.recordCustomMetric({
        name: 'script-count',
        value: scriptCount,
        timestamp: new Date(),
        category: 'loading',
        url: window.location.href
      });

      // Stylesheet count metric
      const stylesheetCount = document.querySelectorAll('link[rel="stylesheet"]').length;
      await this.recordCustomMetric({
        name: 'stylesheet-count',
        value: stylesheetCount,
        timestamp: new Date(),
        category: 'loading',
        url: window.location.href
      });

    } catch (error) {
      logger.error('Failed to collect system metrics', { error });
    }
  }

  /**
   * Checks resource usage and performance
   */
  private async checkResourceUsage(): Promise<void> {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // Page load time
        const loadTime = navigation.loadEventEnd - navigation.navigationStart;
        if (loadTime > 0) {
          await this.recordCustomMetric({
            name: 'page-load-time',
            value: loadTime,
            timestamp: new Date(),
            category: 'loading',
            url: window.location.href
          });
        }

        // DNS lookup time
        const dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
        if (dnsTime > 0) {
          await this.recordCustomMetric({
            name: 'dns-lookup-time',
            value: dnsTime,
            timestamp: new Date(),
            category: 'network',
            url: window.location.href
          });
        }
      }

      // Resource timing
      const resources = performance.getEntriesByType('resource');
      const totalResourceSize = resources.reduce((total, resource) => {
        const resourceTiming = resource as PerformanceResourceTiming;
        return total + (resourceTiming.transferSize || 0);
      }, 0);

      if (totalResourceSize > 0) {
        await this.recordCustomMetric({
          name: 'total-resource-size',
          value: totalResourceSize,
          timestamp: new Date(),
          category: 'network',
          url: window.location.href
        });
      }

    } catch (error) {
      logger.error('Failed to check resource usage', { error });
    }
  }

  /**
   * Monitors memory usage
   */
  private async monitorMemoryUsage(): Promise<void> {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    try {
      const memory = (performance as any).memory;
      
      if (memory) {
        await this.recordCustomMetric({
          name: 'memory-usage',
          value: memory.usedJSHeapSize,
          timestamp: new Date(),
          category: 'memory',
          url: window.location.href,
          metadata: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        });
      }
    } catch (error) {
      logger.error('Failed to monitor memory usage', { error });
    }
  }

  /**
   * Records a custom performance metric
   */
  async recordCustomMetric(metric: PerformanceMetric): Promise<void> {
    this.customMetrics.push(metric);
    
    // Maintain metrics history size
    if (this.customMetrics.length > this.MAX_CUSTOM_METRICS) {
      this.customMetrics = this.customMetrics.slice(-this.MAX_CUSTOM_METRICS);
    }

    // Check budget compliance
    if (this.config.budgets.enabled) {
      const budgetResult = this.budgetChecker.checkBudget(metric);
      
      if (budgetResult.status !== 'pass') {
        logger.debug('Custom metric budget check', {
          component: 'PerformanceMonitor',
          metric: metric.name,
          value: metric.value,
          status: budgetResult.status
        });
      }
    }

    // Check for alerts
    if (this.config.alerts.enabled) {
      await this.alertsManager.checkMetric(metric);
    }

    logger.debug('Custom metric recorded', {
      component: 'PerformanceMonitor',
      metric: {
        name: metric.name,
        value: metric.value,
        category: metric.category
      }
    });
  }

  /**
   * Gets comprehensive performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const webVitalsScores = this.webVitalsMonitor.getWebVitalsScores();
    const budgetStats = this.budgetChecker.getComplianceStats();
    const alertStats = this.alertsManager.getAlertStats();
    
    // Calculate average load time from custom metrics
    const loadTimeMetrics = this.customMetrics.filter(m => m.name === 'page-load-time');
    const averageLoadTime = loadTimeMetrics.length > 0
      ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length
      : 0;

    return {
      totalMetrics: this.webVitalsMonitor.getMetrics().length + this.customMetrics.length,
      totalAlerts: alertStats.total,
      totalSuggestions: 0, // Will be implemented in optimizer module
      averageLoadTime,
      webVitalsScores,
      budgetCompliance: {
        passing: budgetStats.passing,
        warning: budgetStats.warning,
        failing: budgetStats.failing
      },
      lastAnalysis: new Date()
    };
  }

  /**
   * Gets Web Vitals metrics
   */
  getWebVitalsMetrics(): WebVitalsMetric[] {
    return this.webVitalsMonitor.getMetrics();
  }

  /**
   * Gets custom metrics
   */
  getCustomMetrics(): PerformanceMetric[] {
    return [...this.customMetrics];
  }

  /**
   * Gets active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alertsManager.getActiveAlerts();
  }

  /**
   * Gets budget compliance results
   */
  getBudgetCompliance() {
    return this.budgetChecker.getComplianceStats();
  }

  /**
   * Gets overall performance score
   */
  getOverallScore(): number {
    return this.webVitalsMonitor.getOverallScore();
  }

  /**
   * Updates monitoring configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update sub-system configurations
    this.webVitalsMonitor.updateConfig(this.config.webVitals);
    this.alertsManager.updateConfig(this.config.alerts);
    
    // Restart monitoring if needed
    if (this.config.enabled && !this.monitoringInterval) {
      this.startMonitoring();
    } else if (!this.config.enabled && this.monitoringInterval) {
      this.stopMonitoring();
    }

    logger.info('Performance monitoring configuration updated', {
      component: 'PerformanceMonitor',
      config: this.config
    });
  }

  /**
   * Stops the monitoring system
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.webVitalsMonitor.disconnect();
    
    logger.info('Performance monitoring stopped', {
      component: 'PerformanceMonitor'
    });
  }

  /**
   * Resets all performance data
   */
  reset(): void {
    this.customMetrics = [];
    this.webVitalsMonitor.reset();
    this.budgetChecker.resetHistory();
    this.alertsManager.clearAlerts();
    
    logger.info('Performance monitoring data reset', {
      component: 'PerformanceMonitor'
    });
  }

  /**
   * Exports comprehensive performance report
   */
  exportReport(): {
    timestamp: Date;
    config: PerformanceConfig;
    stats: PerformanceStats;
    webVitals: WebVitalsMetric[];
    customMetrics: PerformanceMetric[];
    alerts: PerformanceAlert[];
    budgetCompliance: ReturnType<typeof this.budgetChecker.getComplianceStats>;
  } {
    return {
      timestamp: new Date(),
      config: this.config,
      stats: this.getPerformanceStats(),
      webVitals: this.getWebVitalsMetrics(),
      customMetrics: this.getCustomMetrics(),
      alerts: this.getActiveAlerts(),
      budgetCompliance: this.getBudgetCompliance()
    };
  }

  /**
   * Gets the Web Vitals monitor instance
   */
  getWebVitalsMonitor(): WebVitalsMonitor {
    return this.webVitalsMonitor;
  }

  /**
   * Gets the budget checker instance
   */
  getBudgetChecker(): PerformanceBudgetChecker {
    return this.budgetChecker;
  }

  /**
   * Gets the alerts manager instance
   */
  getAlertsManager(): PerformanceAlertsManager {
    return this.alertsManager;
  }
}