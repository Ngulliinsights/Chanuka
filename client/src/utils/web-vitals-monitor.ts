/**
 * Enhanced Web Vitals Monitoring
 * Comprehensive Core Web Vitals tracking with performance budgets and alerts
 */

import { logger } from './logger';

// Enhanced Web Vitals interfaces
interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

interface PerformanceBudget {
  CLS: { good: number; poor: number };
  FID: { good: number; poor: number };
  FCP: { good: number; poor: number };
  LCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
  INP: { good: number; poor: number };
}

interface WebVitalsReport {
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType: string;
  metrics: WebVitalsMetric[];
  budgetViolations: string[];
  recommendations: string[];
}

interface AlertConfig {
  enabled: boolean;
  thresholds: {
    budgetViolation: boolean;
    performanceDegradation: boolean;
    consecutiveFailures: number;
  };
  channels: {
    console: boolean;
    localStorage: boolean;
    callback?: (report: WebVitalsReport) => void;
  };
}

class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private isMonitoring = false;
  private observers: PerformanceObserver[] = [];
  private alertConfig: AlertConfig;
  private performanceBudget: PerformanceBudget;
  private consecutiveFailures = 0;
  private reportHistory: WebVitalsReport[] = [];

  private constructor() {
    // Default performance budgets based on Core Web Vitals thresholds
    this.performanceBudget = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 }
    };

    this.alertConfig = {
      enabled: true,
      thresholds: {
        budgetViolation: true,
        performanceDegradation: true,
        consecutiveFailures: 3
      },
      channels: {
        console: true,
        localStorage: true
      }
    };
  }

  public static getInstance(): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor();
    }
    return WebVitalsMonitor.instance;
  }

  /**
   * Start monitoring Web Vitals with enhanced tracking
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Web Vitals monitoring already active', { component: 'WebVitalsMonitor' });
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting enhanced Web Vitals monitoring...', { component: 'WebVitalsMonitor' });

    try {
      // Try to use the web-vitals library if available
      await this.initializeWebVitalsLibrary();
    } catch (error) {
      logger.warn('Web Vitals library not available, using fallback monitoring', { component: 'WebVitalsMonitor' });
      this.initializeFallbackMonitoring();
    }

    // Set up additional performance observers
    this.setupPerformanceObservers();

    // Schedule periodic reporting
    this.schedulePeriodicReporting();
  }

  /**
   * Initialize monitoring using the web-vitals library
   */
  private async initializeWebVitalsLibrary(): Promise<void> {
    const webVitals = await import('web-vitals');
    
    const handleMetric = (metric: any) => {
      const enhancedMetric: WebVitalsMetric = {
        name: metric.name as WebVitalsMetric['name'],
        value: metric.value,
        rating: this.calculateRating(metric.name, metric.value),
        delta: metric.delta || 0,
        id: metric.id,
        timestamp: Date.now(),
        navigationType: this.getNavigationType()
      };

      this.processMetric(enhancedMetric);
    };

    // Set up all Core Web Vitals observers
    webVitals.onCLS(handleMetric);
    webVitals.onFID(handleMetric);
    webVitals.onFCP(handleMetric);
    webVitals.onLCP(handleMetric);
    webVitals.onTTFB(handleMetric);
    
    // Try to set up INP (newer metric)
    if ('onINP' in webVitals) {
      (webVitals as any).onINP(handleMetric);
    }

    logger.info('Web Vitals library monitoring initialized', { component: 'WebVitalsMonitor' });
  }

  /**
   * Fallback monitoring using Performance Observer API
   */
  private initializeFallbackMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      logger.error('PerformanceObserver not supported, cannot monitor Web Vitals', { component: 'WebVitalsMonitor' });
      return;
    }

    try {
      // Monitor paint metrics (FCP)
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.processMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: this.calculateRating('FCP', entry.startTime),
              delta: 0,
              id: 'fallback-fcp',
              timestamp: Date.now(),
              navigationType: this.getNavigationType()
            });
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.processMetric({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: this.calculateRating('LCP', lastEntry.startTime),
            delta: 0,
            id: 'fallback-lcp',
            timestamp: Date.now(),
            navigationType: this.getNavigationType()
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Monitor layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });

        if (clsValue > 0) {
          this.processMetric({
            name: 'CLS',
            value: clsValue,
            rating: this.calculateRating('CLS', clsValue),
            delta: clsValue,
            id: 'fallback-cls',
            timestamp: Date.now(),
            navigationType: this.getNavigationType()
          });
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      logger.info('Fallback Web Vitals monitoring initialized', { component: 'WebVitalsMonitor' });
    } catch (error) {
      logger.error('Failed to initialize fallback monitoring', { component: 'WebVitalsMonitor' }, error);
    }
  }

  /**
   * Set up additional performance observers
   */
  private setupPerformanceObservers(): void {
    try {
      // Monitor navigation timing for TTFB
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const navEntry = entry as PerformanceNavigationTiming;
          const ttfb = navEntry.responseStart - navEntry.requestStart;
          
          this.processMetric({
            name: 'TTFB',
            value: ttfb,
            rating: this.calculateRating('TTFB', ttfb),
            delta: 0,
            id: 'nav-ttfb',
            timestamp: Date.now(),
            navigationType: this.getNavigationType()
          });
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

    } catch (error) {
      logger.warn('Failed to setup additional performance observers', { component: 'WebVitalsMonitor' }, error);
    }
  }

  /**
   * Process and analyze a Web Vitals metric
   */
  private processMetric(metric: WebVitalsMetric): void {
    // Store the metric
    this.metrics.set(metric.name, metric);

    // Check against performance budget
    const budgetViolation = this.checkBudgetViolation(metric);
    
    // Log the metric
    logger.info(`Web Vital recorded: ${metric.name}`, {
      component: 'WebVitalsMonitor',
      value: metric.value,
      rating: metric.rating,
      budgetViolation
    });

    // Handle alerts if enabled
    if (this.alertConfig.enabled) {
      this.handleAlerts(metric, budgetViolation);
    }

    // Update consecutive failures counter
    if (metric.rating === 'poor') {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Calculate rating based on Core Web Vitals thresholds
   */
  private calculateRating(name: WebVitalsMetric['name'], value: number): WebVitalsMetric['rating'] {
    const budget = this.performanceBudget[name];
    if (!budget) return 'good';

    if (value <= budget.good) return 'good';
    if (value <= budget.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Check if metric violates performance budget
   */
  private checkBudgetViolation(metric: WebVitalsMetric): boolean {
    const budget = this.performanceBudget[metric.name];
    return budget ? metric.value > budget.good : false;
  }

  /**
   * Handle alerts for performance issues
   */
  private handleAlerts(metric: WebVitalsMetric, budgetViolation: boolean): void {
    const shouldAlert = 
      (budgetViolation && this.alertConfig.thresholds.budgetViolation) ||
      (metric.rating === 'poor' && this.alertConfig.thresholds.performanceDegradation) ||
      (this.consecutiveFailures >= this.alertConfig.thresholds.consecutiveFailures);

    if (!shouldAlert) return;

    const alertMessage = `Performance Alert: ${metric.name} = ${metric.value} (${metric.rating})`;

    if (this.alertConfig.channels.console) {
      console.warn(alertMessage, metric);
    }

    if (this.alertConfig.channels.localStorage) {
      const alerts = JSON.parse(localStorage.getItem('webvitals-alerts') || '[]');
      alerts.push({
        timestamp: Date.now(),
        metric,
        message: alertMessage
      });
      // Keep only last 50 alerts
      localStorage.setItem('webvitals-alerts', JSON.stringify(alerts.slice(-50)));
    }

    if (this.alertConfig.channels.callback) {
      const report = this.generateReport();
      this.alertConfig.channels.callback(report);
    }
  }

  /**
   * Get navigation type
   */
  private getNavigationType(): WebVitalsMetric['navigationType'] {
    if (!window.performance || !window.performance.navigation) {
      return 'navigate';
    }

    const navType = window.performance.navigation.type;
    switch (navType) {
      case 0: return 'navigate';
      case 1: return 'reload';
      case 2: return 'back-forward';
      default: return 'navigate';
    }
  }

  /**
   * Generate comprehensive performance report
   */
  public generateReport(): WebVitalsReport {
    const metrics = Array.from(this.metrics.values());
    const budgetViolations = metrics
      .filter(metric => this.checkBudgetViolation(metric))
      .map(metric => `${metric.name}: ${metric.value} > ${this.performanceBudget[metric.name].good}`);

    const recommendations = this.generateRecommendations(metrics);

    const report: WebVitalsReport = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      metrics,
      budgetViolations,
      recommendations
    };

    // Store in history
    this.reportHistory.push(report);
    if (this.reportHistory.length > 10) {
      this.reportHistory.shift(); // Keep only last 10 reports
    }

    return report;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: WebVitalsMetric[]): string[] {
    const recommendations: string[] = [];

    metrics.forEach(metric => {
      if (metric.rating === 'poor') {
        switch (metric.name) {
          case 'LCP':
            recommendations.push('Optimize images and reduce server response times to improve LCP');
            break;
          case 'FID':
            recommendations.push('Reduce JavaScript execution time and optimize event handlers for better FID');
            break;
          case 'CLS':
            recommendations.push('Set explicit dimensions for images and ads to prevent layout shifts');
            break;
          case 'FCP':
            recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
            break;
          case 'TTFB':
            recommendations.push('Optimize server response times and consider using a CDN');
            break;
          case 'INP':
            recommendations.push('Optimize JavaScript execution and reduce input processing delays');
            break;
        }
      }
    });

    return recommendations;
  }

  /**
   * Get connection type information
   */
  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? connection.effectiveType || 'unknown' : 'unknown';
  }

  /**
   * Schedule periodic reporting
   */
  private schedulePeriodicReporting(): void {
    // Report every 30 seconds
    setInterval(() => {
      if (this.metrics.size > 0) {
        const report = this.generateReport();
        logger.debug('Periodic Web Vitals report', { component: 'WebVitalsMonitor', report });
      }
    }, 30000);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): Map<string, WebVitalsMetric> {
    return new Map(this.metrics);
  }

  /**
   * Get performance budget
   */
  public getPerformanceBudget(): PerformanceBudget {
    return { ...this.performanceBudget };
  }

  /**
   * Update performance budget
   */
  public updatePerformanceBudget(budget: Partial<PerformanceBudget>): void {
    this.performanceBudget = { ...this.performanceBudget, ...budget };
    logger.info('Performance budget updated', { component: 'WebVitalsMonitor', budget: this.performanceBudget });
  }

  /**
   * Update alert configuration
   */
  public updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    logger.info('Alert configuration updated', { component: 'WebVitalsMonitor', config: this.alertConfig });
  }

  /**
   * Get report history
   */
  public getReportHistory(): WebVitalsReport[] {
    return [...this.reportHistory];
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    logger.info('Web Vitals monitoring stopped', { component: 'WebVitalsMonitor' });
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(): string {
    const exportData = {
      timestamp: Date.now(),
      metrics: Array.from(this.metrics.values()),
      budget: this.performanceBudget,
      history: this.reportHistory
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Export singleton instance
export const webVitalsMonitor = WebVitalsMonitor.getInstance();

// Export types
export type { WebVitalsMetric, PerformanceBudget, WebVitalsReport, AlertConfig };