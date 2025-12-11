/**
 * Performance Monitor Module
 * 
 * Central performance monitoring system that coordinates Web Vitals tracking,
 * budget checking, alert management, and provides unified performance insights.
 * 
 * @module PerformanceMonitor
 * @version 2.0.0
 */

import { PerformanceAlertsManager } from './alerts';
import { PerformanceBudgetChecker } from './budgets';
import { 
  DEFAULT_PERFORMANCE_CONFIG,
  PerformanceAlert,
  PerformanceConfig, 
  PerformanceMetric, 
  PerformanceStats,
  WebVitalsMetric
} from './types';
import { WebVitalsMonitor } from './web-vitals';

/**
 * Extended Performance interface to safely access memory API
 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

/**
 * Error types for better error handling and debugging
 */
enum MonitorErrorType {
  INITIALIZATION = 'INITIALIZATION_ERROR',
  METRIC_COLLECTION = 'METRIC_COLLECTION_ERROR',
  BUDGET_CHECK = 'BUDGET_CHECK_ERROR',
  ALERT_CHECK = 'ALERT_CHECK_ERROR',
  SYSTEM_METRIC = 'SYSTEM_METRIC_ERROR'
}

/**
 * Custom error class for performance monitoring
 */
class PerformanceMonitorError extends Error {
  constructor(
    public type: MonitorErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PerformanceMonitorError';
  }
}

/**
 * Central Performance Monitor class that orchestrates all performance tracking subsystems.
 * Implements singleton pattern to ensure consistent monitoring across the application.
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private config: PerformanceConfig;
  private webVitalsMonitor: WebVitalsMonitor;
  private budgetChecker: PerformanceBudgetChecker;
  private alertsManager: PerformanceAlertsManager;
  private customMetrics: PerformanceMetric[] = [];
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_CUSTOM_METRICS = 1000;
  private readonly MIN_CHECK_INTERVAL = 1000; // Minimum 1 second between checks
  private isMonitoring: boolean = false;
  private errorHandler: ((error: PerformanceMonitorError) => void) | null = null;

  private constructor(config: Partial<PerformanceConfig> = {}) {
    try {
      // Merge configuration with defensive defaults
      this.config = this.mergeConfig(config);
      
      // Initialize subsystems with error boundaries
      this.webVitalsMonitor = WebVitalsMonitor.getInstance(this.config.webVitals);
      this.budgetChecker = PerformanceBudgetChecker.getInstance();
      this.alertsManager = PerformanceAlertsManager.getInstance(this.config.alerts);
      
      // Set up cross-system communication
      this.setupEventListeners();
      
      // Start monitoring if enabled
      if (this.config.enabled) {
        this.startMonitoring();
      }
    } catch (error) {
      const monitorError = new PerformanceMonitorError(
        MonitorErrorType.INITIALIZATION,
        'Failed to initialize Performance Monitor',
        error instanceof Error ? error : undefined
      );
      this.handleError(monitorError);
      throw monitorError;
    }
  }

  /**
   * Gets singleton instance of PerformanceMonitor with optional configuration.
   * Ensures only one monitoring instance exists per application lifecycle.
   */
  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Destroys the singleton instance. Useful for testing or application teardown.
   * Ensures all monitoring activities are properly cleaned up.
   */
  static destroyInstance(): void {
    if (PerformanceMonitor.instance) {
      PerformanceMonitor.instance.stopMonitoring();
      PerformanceMonitor.instance = null;
    }
  }

  /**
   * Merges user configuration with defaults, applying validation and constraints.
   * Ensures configuration values are within acceptable ranges.
   */
  private mergeConfig(userConfig: Partial<PerformanceConfig>): PerformanceConfig {
    const merged = { ...DEFAULT_PERFORMANCE_CONFIG, ...userConfig };
    
    // Validate and constrain check interval to prevent performance issues
    if (merged.budgets.checkInterval < this.MIN_CHECK_INTERVAL) {
      console.warn(
        `Check interval ${merged.budgets.checkInterval}ms is too low. ` +
        `Setting to minimum ${this.MIN_CHECK_INTERVAL}ms`
      );
      merged.budgets.checkInterval = this.MIN_CHECK_INTERVAL;
    }
    
    return merged;
  }

  /**
   * Sets up event-driven communication between subsystems.
   * This creates a reactive architecture where metrics flow through the system.
   */
  private setupEventListeners(): void {
    try {
      // Subscribe to Web Vitals updates and propagate to other subsystems
      this.webVitalsMonitor.addListener(async (webVital: WebVitalsMetric) => {
        try {
          // Transform Web Vitals metric to standard performance metric format
          const metric: PerformanceMetric = {
            name: webVital.name,
            value: webVital.value,
            timestamp: webVital.timestamp,
            url: webVital.url,
            category: this.getMetricCategory(webVital.name),
            metadata: { 
              ...webVital.metadata,
              source: 'web-vitals' // Track metric origin for debugging
            }
          };

          // Process metric through budget and alert systems in parallel
          await this.processMetric(metric);
        } catch (error) {
          this.handleError(new PerformanceMonitorError(
            MonitorErrorType.METRIC_COLLECTION,
            'Failed to process Web Vitals metric',
            error instanceof Error ? error : undefined
          ));
        }
      });
    } catch (error) {
      throw new PerformanceMonitorError(
        MonitorErrorType.INITIALIZATION,
        'Failed to setup event listeners',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Processes a metric through budget checking and alerting systems.
   * Uses parallel processing for better performance.
   */
  private async processMetric(metric: PerformanceMetric): Promise<void> {
    const tasks: Promise<void>[] = [];

    // Check budget compliance if enabled
    if (this.config.budgets.enabled) {
      tasks.push(
        Promise.resolve().then(() => {
          try {
            const budgetResult = this.budgetChecker.checkBudget(metric);
            // Budget violations are logged internally by budgetChecker
            // Additional handling could be added here if needed
            if (budgetResult.status === 'fail') {
              // Budget check failed - already tracked by budgetChecker
            }
          } catch (error) {
            throw new PerformanceMonitorError(
              MonitorErrorType.BUDGET_CHECK,
              `Budget check failed for metric: ${metric.name}`,
              error instanceof Error ? error : undefined
            );
          }
        })
      );
    }

    // Check for performance alerts if enabled
    if (this.config.alerts.enabled) {
      tasks.push(
        this.alertsManager.checkMetric(metric).catch(error => {
          throw new PerformanceMonitorError(
            MonitorErrorType.ALERT_CHECK,
            `Alert check failed for metric: ${metric.name}`,
            error instanceof Error ? error : undefined
          );
        })
      );
    }

    // Execute all checks in parallel and collect any errors
    const results = await Promise.allSettled(tasks);
    results.forEach(result => {
      if (result.status === 'rejected') {
        this.handleError(result.reason);
      }
    });
  }

  /**
   * Maps Web Vitals metric names to their performance categories.
   * This categorization helps with metric organization and reporting.
   */
  private getMetricCategory(metricName: string): PerformanceMetric['category'] {
    const categoryMap: Record<string, PerformanceMetric['category']> = {
      'LCP': 'loading',      // Largest Contentful Paint
      'FCP': 'loading',      // First Contentful Paint
      'TTFB': 'loading',     // Time to First Byte
      'FID': 'interactivity', // First Input Delay
      'INP': 'interactivity', // Interaction to Next Paint
      'CLS': 'visual-stability' // Cumulative Layout Shift
    };

    return categoryMap[metricName] || 'custom';
  }

  /**
   * Starts the performance monitoring system with periodic checks.
   * Ensures monitoring only starts once and respects configuration.
   */
  private startMonitoring(): void {
    // Prevent double-initialization
    if (this.isMonitoring || !this.config.enabled) {
      return;
    }

    this.isMonitoring = true;

    // Schedule periodic system checks at configured interval
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks().catch(error => {
        this.handleError(new PerformanceMonitorError(
          MonitorErrorType.SYSTEM_METRIC,
          'Periodic check failed',
          error instanceof Error ? error : undefined
        ));
      });
    }, this.config.budgets.checkInterval);
  }

  /**
   * Executes periodic monitoring tasks including system metrics collection.
   * Runs multiple collection tasks in parallel for efficiency.
   */
  private async performPeriodicChecks(): Promise<void> {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Execute all collection tasks in parallel for better performance
    await Promise.allSettled([
      this.collectSystemMetrics(),
      this.checkResourceUsage(),
      this.monitorMemoryUsage()
    ]);
  }

  /**
   * Collects DOM and resource-related system metrics.
   * Tracks page complexity indicators that can impact performance.
   */
  private async collectSystemMetrics(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    try {
      const timestamp = new Date();
      const url = window.location.href;

      // Collect all metrics in one pass to minimize DOM queries
      const metrics = {
        domSize: document.querySelectorAll('*').length,
        scriptCount: document.querySelectorAll('script').length,
        stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length,
        imageCount: document.querySelectorAll('img').length
      };

      // Record each metric
      await Promise.all([
        this.recordCustomMetric({
          name: 'dom-size',
          value: metrics.domSize,
          timestamp,
          category: 'loading',
          url,
          metadata: { 
            description: 'Total number of DOM elements',
            threshold: 1500 // Common performance budget for DOM size
          }
        }),
        this.recordCustomMetric({
          name: 'script-count',
          value: metrics.scriptCount,
          timestamp,
          category: 'loading',
          url
        }),
        this.recordCustomMetric({
          name: 'stylesheet-count',
          value: metrics.stylesheetCount,
          timestamp,
          category: 'loading',
          url
        }),
        this.recordCustomMetric({
          name: 'image-count',
          value: metrics.imageCount,
          timestamp,
          category: 'loading',
          url
        })
      ]);
    } catch (error) {
      // Log error but don't throw to prevent monitoring disruption
      this.handleError(new PerformanceMonitorError(
        MonitorErrorType.SYSTEM_METRIC,
        'Failed to collect system metrics',
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Analyzes resource loading performance using the Resource Timing API.
   * Provides insights into network performance and resource efficiency.
   */
  private async checkResourceUsage(): Promise<void> {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    try {
      const timestamp = new Date();
      const url = window.location.href;

      // Get navigation timing if available
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navigation = navigationEntries[0] as PerformanceNavigationTiming;
        
        // Calculate key timing metrics with validation
        const timings = {
          pageLoad: this.calculateTiming(navigation.loadEventEnd, navigation.fetchStart),
          dnsLookup: this.calculateTiming(navigation.domainLookupEnd, navigation.domainLookupStart),
          tcpConnection: this.calculateTiming(navigation.connectEnd, navigation.connectStart),
          serverResponse: this.calculateTiming(navigation.responseEnd, navigation.requestStart),
          domProcessing: this.calculateTiming(navigation.domComplete, navigation.domInteractive)
        };

        // Record valid timings
        const metricPromises = Object.entries(timings)
          .filter(([, value]) => value > 0)
          .map(([name, value]) => 
            this.recordCustomMetric({
              name: `${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
              value,
              timestamp,
              category: 'loading',
              url
            })
          );

        await Promise.all(metricPromises);
      }

      // Analyze resource loading
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      // Calculate aggregate resource metrics
      const resourceStats = resources.reduce((acc, resource) => {
        acc.totalSize += resource.transferSize || 0;
        acc.totalDuration += resource.duration;
        acc.count += 1;
        return acc;
      }, { totalSize: 0, totalDuration: 0, count: 0 });

      if (resourceStats.totalSize > 0) {
        await this.recordCustomMetric({
          name: 'total-resource-size',
          value: resourceStats.totalSize,
          timestamp,
          category: 'network',
          url,
          metadata: {
            resourceCount: resourceStats.count,
            averageDuration: resourceStats.count > 0 
              ? resourceStats.totalDuration / resourceStats.count 
              : 0
          }
        });
      }
    } catch (error) {
      this.handleError(new PerformanceMonitorError(
        MonitorErrorType.SYSTEM_METRIC,
        'Failed to check resource usage',
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Helper method to safely calculate timing differences.
   * Returns 0 for invalid or negative timings.
   */
  private calculateTiming(end: number, start: number): number {
    const timing = end - start;
    return timing > 0 && timing < Infinity ? timing : 0;
  }

  /**
   * Monitors JavaScript heap memory usage if available.
   * Helps identify memory leaks and excessive memory consumption.
   */
  private async monitorMemoryUsage(): Promise<void> {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    try {
      // Check for memory API support (Chromium-based browsers)
      // Using type-safe approach instead of 'as any'
      const perfWithMemory = window.performance as PerformanceWithMemory;
      const memory = perfWithMemory.memory;
      
      if (memory && typeof memory.usedJSHeapSize === 'number') {
        const usedHeap = memory.usedJSHeapSize;
        const totalHeap = memory.totalJSHeapSize;
        const heapLimit = memory.jsHeapSizeLimit;
        
        // Calculate memory usage percentage
        const usagePercent = (usedHeap / heapLimit) * 100;
        
        await this.recordCustomMetric({
          name: 'memory-usage',
          value: usedHeap,
          timestamp: new Date(),
          category: 'memory',
          url: window.location.href,
          metadata: {
            totalJSHeapSize: totalHeap,
            jsHeapSizeLimit: heapLimit,
            usagePercent: Math.round(usagePercent * 100) / 100,
            unit: 'bytes'
          }
        });
      }
    } catch (error) {
      this.handleError(new PerformanceMonitorError(
        MonitorErrorType.SYSTEM_METRIC,
        'Failed to monitor memory usage',
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Records a custom performance metric with validation and processing.
   * Ensures metrics are properly stored and checked against budgets/alerts.
   */
  async recordCustomMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Validate metric structure
      if (!this.isValidMetric(metric)) {
        throw new Error('Invalid metric structure');
      }

      // Add metric to history with size management
      this.customMetrics.push(metric);
      
      // Maintain metrics history within size limit using efficient slicing
      if (this.customMetrics.length > this.MAX_CUSTOM_METRICS) {
        this.customMetrics = this.customMetrics.slice(-this.MAX_CUSTOM_METRICS);
      }

      // Process metric through subsystems
      await this.processMetric(metric);
    } catch (error) {
      this.handleError(new PerformanceMonitorError(
        MonitorErrorType.METRIC_COLLECTION,
        `Failed to record custom metric: ${metric.name}`,
        error instanceof Error ? error : undefined
      ));
    }
  }

  /**
   * Validates metric structure to ensure data integrity.
   */
  private isValidMetric(metric: PerformanceMetric): boolean {
    return Boolean(
      metric &&
      typeof metric.name === 'string' &&
      typeof metric.value === 'number' &&
      !isNaN(metric.value) &&
      metric.timestamp instanceof Date &&
      typeof metric.category === 'string'
    );
  }

  /**
   * Generates comprehensive performance statistics across all subsystems.
   * Provides a holistic view of application performance health.
   */
  getPerformanceStats(): PerformanceStats {
    const webVitalsScores = this.webVitalsMonitor.getWebVitalsScores();
    const budgetStats = this.budgetChecker.getComplianceStats();
    const alertStats = this.alertsManager.getAlertStats();
    
    // Calculate average load time from collected metrics
    const loadTimeMetrics = this.customMetrics.filter(m => 
      m.name === 'page-load-time' || m.name === 'page-load'
    );
    
    const averageLoadTime = loadTimeMetrics.length > 0
      ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length
      : 0;

    return {
      totalMetrics: this.webVitalsMonitor.getMetrics().length + this.customMetrics.length,
      totalAlerts: alertStats.total,
      totalSuggestions: 0, // Reserved for future optimizer module
      averageLoadTime: Math.round(averageLoadTime),
      webVitalsScores: webVitalsScores as PerformanceStats['webVitalsScores'],
      budgetCompliance: {
        passing: budgetStats.passing,
        warning: budgetStats.warning,
        failing: budgetStats.failing
      },
      lastAnalysis: new Date()
    };
  }

  /**
   * Retrieves all Web Vitals metrics collected by the monitor.
   */
  getWebVitalsMetrics(): ReadonlyArray<WebVitalsMetric> {
    return this.webVitalsMonitor.getMetrics();
  }

  /**
   * Returns a copy of custom metrics to prevent external mutation.
   */
  getCustomMetrics(): PerformanceMetric[] {
    return [...this.customMetrics];
  }

  /**
   * Gets currently active performance alerts.
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alertsManager.getActiveAlerts();
  }

  /**
   * Retrieves budget compliance statistics.
   */
  getBudgetCompliance() {
    return this.budgetChecker.getComplianceStats();
  }

  /**
   * Calculates overall performance score based on Web Vitals.
   */
  getOverallScore(): number {
    return this.webVitalsMonitor.getOverallScore();
  }

  /**
   * Updates monitoring configuration dynamically.
   * Allows runtime configuration changes without reinitialization.
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    const previousEnabled = this.config.enabled;
    
    // Merge and validate new configuration
    this.config = this.mergeConfig({ ...this.config, ...config });
    
    // Update subsystem configurations
    this.webVitalsMonitor.updateConfig(this.config.webVitals);
    this.alertsManager.updateConfig(this.config.alerts);
    
    // Handle monitoring state changes
    const enabledChanged = previousEnabled !== this.config.enabled;
    
    if (enabledChanged) {
      if (this.config.enabled && !this.isMonitoring) {
        this.startMonitoring();
      } else if (!this.config.enabled && this.isMonitoring) {
        this.stopMonitoring();
      }
    }
  }

  /**
   * Stops all monitoring activities and cleans up resources.
   * Ensures proper cleanup to prevent memory leaks.
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.webVitalsMonitor.disconnect();
  }

  /**
   * Resets all collected performance data across all subsystems.
   * Useful for clearing data between test runs or page transitions.
   */
  reset(): void {
    this.customMetrics = [];
    this.webVitalsMonitor.reset();
    this.budgetChecker.resetHistory();
    this.alertsManager.clearAlerts();
  }

  /**
   * Exports a comprehensive performance report for analysis or archival.
   * Includes all metrics, alerts, and compliance data.
   */
  exportReport() {
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
   * Provides direct access to the Web Vitals monitoring subsystem.
   */
  getWebVitalsMonitor(): WebVitalsMonitor {
    return this.webVitalsMonitor;
  }

  /**
   * Provides direct access to the budget checking subsystem.
   */
  getBudgetChecker(): PerformanceBudgetChecker {
    return this.budgetChecker;
  }

  /**
   * Provides direct access to the alerts management subsystem.
   */
  getAlertsManager(): PerformanceAlertsManager {
    return this.alertsManager;
  }

  /**
   * Sets a custom error handler for monitoring errors.
   * Allows applications to integrate monitoring errors with their error tracking.
   * 
   * @param handler - Callback function that receives PerformanceMonitorError instances
   */
  setErrorHandler(handler: (error: PerformanceMonitorError) => void): void {
    this.errorHandler = handler;
  }

  /**
   * Internal error handling with optional custom handler invocation.
   * Ensures errors don't break the monitoring system while still being visible.
   */
  private handleError(error: PerformanceMonitorError): void {
    // Invoke custom error handler if provided
    if (this.errorHandler) {
      try {
        this.errorHandler(error);
      } catch (handlerError) {
        // Prevent error handler from breaking monitoring
        console.error('Error in custom error handler:', handlerError);
      }
    }
    
    // Always log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[PerformanceMonitor] ${error.type}:`, error.message, error.originalError);
    }
  }
}