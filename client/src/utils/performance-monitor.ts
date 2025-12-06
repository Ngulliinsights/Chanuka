/**
 * Runtime Performance Monitor
 *
 * Core service for monitoring performance metrics in production.
 * Tracks Core Web Vitals, checks budgets, detects regressions, and sends alerts.
 */

import { performanceApiService } from '../core/api/performance';

import { logger } from './logger';
import { performanceAlerts, performanceBudgetChecker } from './performance';

interface CoreWebVitals {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

interface PerformanceMetrics {
  coreWebVitals: CoreWebVitals;
  memoryUsage?: number;
  renderTime?: number;
  bundleSize?: number;
  customMetrics?: Record<string, number>;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
}

interface NetworkInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface SessionInfo {
  sessionId: string;
  userId?: string;
  startTime: number;
  pageViews: number;
  interactions: number;
  errors: number;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
}

/**
 * Runtime Performance Monitor Class
 */
export class RuntimePerformanceMonitor {
  private observers: PerformanceObserver[] = [];
  private metrics: PerformanceMetrics = {
    coreWebVitals: {}
  };
  private sessionInfo: SessionInfo;
  private isInitialized = false;
  private bundleSizeTrackingEnabled = false;
  private memoryCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.sessionInfo = this.createSessionInfo();
    this.initialize();
  }

  /**
   * Initialize performance monitoring
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start Core Web Vitals monitoring
      this.startCoreWebVitalsMonitoring();

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Start bundle size tracking if enabled
      if (this.bundleSizeTrackingEnabled) {
        this.startBundleSizeTracking();
      }

      // Track page visibility changes
      this.trackPageVisibility();

      // Track user interactions
      this.trackUserInteractions();

      this.isInitialized = true;

      logger.debug('Runtime performance monitoring initialized', {
        sessionId: this.sessionInfo.sessionId,
        budgetsConfigured: performanceBudgetChecker.getBudgets().length > 0
      });
    } catch (error) {
      logger.error('Failed to initialize performance monitoring', { error });
    }
  }

  /**
   * Start monitoring Core Web Vitals
   */
  private startCoreWebVitalsMonitoring(): void {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
          this.metrics.coreWebVitals.lcp = lastEntry.startTime;
          this.checkBudgetAndAlert();
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        logger.warn('LCP monitoring not supported', { error });
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number };
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
          this.metrics.coreWebVitals.cls = clsValue;
          this.checkBudgetAndAlert();
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        logger.warn('CLS monitoring not supported', { error });
      }

      // FCP (First Contentful Paint)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.coreWebVitals.fcp = entry.startTime;
              this.checkBudgetAndAlert();
            }
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (error) {
        logger.warn('FCP monitoring not supported', { error });
      }
    }

    // FID (First Input Delay) - requires user interaction
    if ('PerformanceEventTiming' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-input') {
              const eventTimingEntry = entry as PerformanceEntry & { processingStart: number };
              this.metrics.coreWebVitals.fid = eventTimingEntry.processingStart - entry.startTime;
              this.checkBudgetAndAlert();
            }
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        logger.warn('FID monitoring not supported', { error });
      }
    }

    // TTFB (Time to First Byte) - from navigation timing
    if ('performance' in window && 'timing' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.coreWebVitals.ttfb = navigation.responseStart - navigation.requestStart;
        this.checkBudgetAndAlert();
      }
    }
  }

  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    // Monitor memory usage periodically
    this.memoryCheckInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;

        // Check for memory issues
        const memoryLimit = memory.jsHeapSizeLimit;
        const memoryUsagePercent = (memory.usedJSHeapSize / memoryLimit) * 100;

        if (memoryUsagePercent > 80) {
          logger.warn('High memory usage detected', {
            used: memory.usedJSHeapSize,
            limit: memoryLimit,
            percentage: memoryUsagePercent
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start bundle size tracking
   */
  private startBundleSizeTracking(): void {
    // Track bundle size changes by monitoring resource loading
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceResourceTiming[];
          let totalBundleSize = 0;

          entries.forEach(entry => {
            // Look for JavaScript bundles
            if (entry.name.includes('.js') && !entry.name.includes('external')) {
              totalBundleSize += entry.transferSize || 0;
            }
          });

          if (totalBundleSize > 0) {
            this.metrics.bundleSize = totalBundleSize;
            this.checkBudgetAndAlert();
          }
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        logger.warn('Bundle size tracking not supported', { error });
      }
    }
  }

  /**
   * Track page visibility changes
   */
  private trackPageVisibility(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, pause intensive monitoring
        logger.debug('Page hidden, pausing performance monitoring');
      } else {
        // Page is visible again, resume monitoring
        logger.debug('Page visible, resuming performance monitoring');
        this.checkBudgetAndAlert();
      }
    });
  }

  /**
   * Track user interactions for FID and engagement metrics
   */
  private trackUserInteractions(): void {
    let interactionCount = 0;
    const interactionHandler = () => {
      interactionCount++;
      this.sessionInfo.interactions = interactionCount;
    };

    // Track various interaction events
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, interactionHandler, { passive: true });
    });
  }

  /**
   * Check budget and send alerts if violations detected
   */
  private async checkBudgetAndAlert(): Promise<void> {
    try {
      // Check each metric individually since checkBudgets doesn't exist
      const metricsToCheck = [
        { name: 'LCP', value: this.metrics.coreWebVitals.lcp },
        { name: 'FID', value: this.metrics.coreWebVitals.fid },
        { name: 'CLS', value: this.metrics.coreWebVitals.cls },
        { name: 'FCP', value: this.metrics.coreWebVitals.fcp },
        { name: 'TTFB', value: this.metrics.coreWebVitals.ttfb },
        { name: 'memory-usage', value: this.metrics.memoryUsage },
        { name: 'bundle-size', value: this.metrics.bundleSize }
      ].filter(metric => metric.value !== undefined);

      const violations: Array<{ metric: string; actual: number; limit: number; severity: string; description: string }> = [];
      const warnings: Array<{ metric: string; actual: number; limit: number; description: string }> = [];

      for (const metric of metricsToCheck) {
        const budgetResult = performanceBudgetChecker.checkBudget({
          name: metric.name,
          value: metric.value!,
          timestamp: new Date(),
          category: 'loading'
        });

        if (budgetResult.status === 'fail') {
          violations.push({
            metric: metric.name,
            actual: metric.value!,
            limit: budgetResult.budget?.budget || 0,
            severity: 'error',
            description: budgetResult.message
          });
        } else if (budgetResult.status === 'warning') {
          warnings.push({
            metric: metric.name,
            actual: metric.value!,
            limit: budgetResult.budget?.warning || 0,
            description: budgetResult.message
          });
        }
      }

      // Send alerts for violations
      if (violations.length > 0) {
        for (const violation of violations) {
          performanceAlerts.createAlert({
            id: `budget_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: 'budget-exceeded',
            severity: violation.severity === 'error' ? 'high' : 'medium',
            message: `${violation.metric} Budget Violation: ${violation.description}`,
            metric: violation.metric,
            value: violation.actual,
            threshold: violation.limit,
            timestamp: new Date()
          });
        }
      }

      // Send alerts for warnings  
      if (warnings.length > 0) {
        for (const warning of warnings) {
          performanceAlerts.createAlert({
            id: `warning_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: 'slow-metric',
            severity: 'medium',
            message: `${warning.metric} Budget Warning: ${warning.description}`,
            metric: warning.metric,
            value: warning.actual,
            threshold: warning.limit,
            timestamp: new Date()
          });
        }
      }

      // Note: Regression detection would need to be implemented separately
      // as it requires historical data storage and comparison logic

      // Send metrics to backend
      await this.reportMetricsToBackend();

    } catch (error) {
      logger.error('Failed to check budgets and send alerts', { error });
    }
  }

  /**
   * Report metrics to backend API
   */
  private async reportMetricsToBackend(): Promise<void> {
    try {
      await performanceApiService.reportMetrics({
        sessionId: this.sessionInfo.sessionId,
        session: this.sessionInfo,
        metrics: this.convertToApiMetrics(),
        customMetrics: Object.entries(this.metrics.customMetrics || {}).map(([name, value]) => ({
          name,
          value,
          unit: 'number',
          timestamp: Date.now()
        })),
        resourceTimings: this.getResourceTimings(),
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    } catch (error) {
      logger.error('Failed to report metrics to backend', { error });
    }
  }

  /**
   * Convert internal metrics to API format
   */
  private convertToApiMetrics() {
    const metrics: Array<{ name: string; value: number; rating: 'good' | 'needs-improvement' | 'poor'; timestamp: number; id: string }> = [];

    if (this.metrics.coreWebVitals.lcp !== undefined) {
      metrics.push({
        name: 'LCP',
        value: this.metrics.coreWebVitals.lcp,
        rating: this.getRating('lcp', this.metrics.coreWebVitals.lcp),
        timestamp: Date.now(),
        id: crypto.randomUUID()
      });
    }

    if (this.metrics.coreWebVitals.fid !== undefined) {
      metrics.push({
        name: 'FID',
        value: this.metrics.coreWebVitals.fid,
        rating: this.getRating('fid', this.metrics.coreWebVitals.fid),
        timestamp: Date.now(),
        id: crypto.randomUUID()
      });
    }

    if (this.metrics.coreWebVitals.cls !== undefined) {
      metrics.push({
        name: 'CLS',
        value: this.metrics.coreWebVitals.cls,
        rating: this.getRating('cls', this.metrics.coreWebVitals.cls),
        timestamp: Date.now(),
        id: crypto.randomUUID()
      });
    }

    return metrics;
  }

  /**
   * Get performance rating for a metric
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const budget = performanceBudgetChecker.getBudget(metric);
    if (!budget) return 'good';

    if (value <= budget.warning) return 'good';
    if (value <= budget.budget) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get resource timings for API report
   */
  private getResourceTimings() {
    if (!('performance' in window) || !performance.getEntriesByType) {
      return [];
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.slice(0, 50).map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize || 0,
      type: resource.initiatorType || 'unknown',
      cached: resource.transferSize === 0,
      protocol: resource.nextHopProtocol || undefined
    }));
  }

  /**
   * Create session information
   */
  private createSessionInfo(): SessionInfo {
    return {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId: undefined, // Would be set from auth context
      startTime: Date.now(),
      pageViews: 1,
      interactions: 0,
      errors: 0,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: (navigator as any).userAgentData?.platform || 'unknown',
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth
        }
      },
      networkInfo: {
        effectiveType: (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection?.effectiveType,
        downlink: (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection?.downlink,
        rtt: (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection?.rtt,
        saveData: (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection?.saveData
      }
    };
  }

  /**
   * Add custom metric for monitoring
   */
  addCustomMetric(name: string, value: number): void {
    if (!this.metrics.customMetrics) {
      this.metrics.customMetrics = {};
    }
    this.metrics.customMetrics[name] = value;
    this.checkBudgetAndAlert();
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get session information
   */
  getSessionInfo(): SessionInfo {
    return { ...this.sessionInfo };
  }

  /**
   * Enable bundle size tracking
   */
  enableBundleSizeTracking(): void {
    this.bundleSizeTrackingEnabled = true;
    if (this.isInitialized) {
      this.startBundleSizeTracking();
    }
  }

  /**
   * Measure route change performance
   * @param route The route being changed to
   * @returns Cleanup function to stop measurement
   */
  measureRouteChange(route: string): () => void {
    const startTime = performance.now();

    // Add custom metric for route change start
    this.addCustomMetric(`route_change_start_${route}`, startTime);

    // Return cleanup function
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Add custom metrics for route change completion
      this.addCustomMetric(`route_change_end_${route}`, endTime);
      this.addCustomMetric(`route_change_duration_${route}`, duration);
    };
  }

  /**
   * Cleanup monitoring
   */
  destroy(): void {
    // Disconnect all observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        logger.warn('Failed to disconnect observer', { error });
      }
    });
    this.observers = [];

    // Clear intervals
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.isInitialized = false;
    logger.debug('Performance monitoring destroyed');
  }
}

// Global instance
export const runtimePerformanceMonitor = new RuntimePerformanceMonitor();

// Legacy API compatibility
export const performanceMonitor = {
  measureRouteChange: (route: string) => runtimePerformanceMonitor.measureRouteChange(route)
};