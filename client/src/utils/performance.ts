/**
 * Performance Utilities - Optimized and Consolidated Module
 * 
 * This module provides comprehensive performance monitoring and optimization
 * capabilities including alerts, budget checking, Web Vitals tracking,
 * and automated optimization suggestions.
 * 
 * @module PerformanceUtils
 * @version 2.0.0
 */

import { logger } from './logger';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Represents a performance metric measurement
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  url?: string;
  category: 'loading' | 'interactivity' | 'visual-stability' | 'custom';
}

/**
 * Configuration for performance budgets
 */
export interface PerformanceBudget {
  metric: string;
  budget: number;
  warning: number;
}

/**
 * Web Vitals metric with rating
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: Date;
}

/**
 * Performance alert with severity classification
 */
export interface PerformanceAlert {
  id: string;
  type: 'budget-exceeded' | 'slow-metric' | 'memory-leak' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

/**
 * Actionable optimization suggestion
 */
export interface OptimizationSuggestion {
  type: 'image' | 'script' | 'style' | 'network' | 'memory' | 'cache';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement?: string;
}

/**
 * Result of a budget check operation
 */
export interface BudgetCheckResult {
  status: 'pass' | 'warning' | 'fail';
  budget?: PerformanceBudget;
  message: string;
  exceedancePercentage?: number;
}

// ============================================================================
// PERFORMANCE ALERTS
// ============================================================================

/**
 * Manages performance alerts and threshold monitoring.
 * Implements singleton pattern to maintain consistent state across the application.
 */
export class PerformanceAlerts {
  private static instance: PerformanceAlerts;
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, number> = new Map();
  private MAX_ALERTS = 100;
  private ALERT_RETENTION_MS = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.setupDefaultThresholds();
  }

  /**
   * Gets the singleton instance of PerformanceAlerts
   */
  static getInstance(): PerformanceAlerts {
    if (!PerformanceAlerts.instance) {
      PerformanceAlerts.instance = new PerformanceAlerts();
    }
    return PerformanceAlerts.instance;
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
  }

  /**
   * Checks if a metric exceeds its threshold and creates an alert if necessary
   */
  checkMetric(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    
    // Early return if no threshold is defined for this metric
    if (threshold === undefined) {
      return;
    }

    // Only create alert if threshold is exceeded
    if (metric.value > threshold) {
      const severity = this.calculateSeverity(metric.value, threshold);
      const exceedancePercentage = ((metric.value - threshold) / threshold) * 100;
      
      this.createAlert({
        id: this.generateAlertId(),
        type: 'slow-metric',
        severity,
        message: `${metric.name} exceeded threshold by ${exceedancePercentage.toFixed(1)}%: ${metric.value.toFixed(2)} > ${threshold}`,
        metric: metric.name,
        value: metric.value,
        threshold,
        timestamp: new Date()
      });
    }
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
  createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Log the alert for monitoring and debugging
    logger.warn('Performance alert created', { 
      alert,
      activeAlertsCount: this.alerts.length 
    });

    // Maintain a reasonable alert history size
    this.pruneOldAlerts();
  }

  /**
   * Removes old alerts to prevent unbounded memory growth
   */
  private pruneOldAlerts(): void {
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }
  }

  /**
   * Returns alerts from the last hour
   */
  getActiveAlerts(): PerformanceAlert[] {
    const cutoffTime = Date.now() - this.ALERT_RETENTION_MS;
    return this.alerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
  }

  /**
   * Returns alerts filtered by severity level
   */
  getAlertsBySeverity(severity: PerformanceAlert['severity']): PerformanceAlert[] {
    return this.getActiveAlerts().filter(alert => alert.severity === severity);
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
    logger.info('Threshold updated', { metric, threshold });
  }

  /**
   * Sends alerts to external monitoring services or notification systems
   */
  sendAlert(alert: PerformanceAlert): void {
    // Implementation for sending alerts to external services
    // This could integrate with monitoring tools like Sentry, DataDog, etc.
    logger.info('Sending alert to external service', { alert });

    // Placeholder for external service integration
    // Example: send to monitoring API, email, Slack, etc.
    try {
      // In a real implementation, this would make an API call
      // fetch('/api/alerts', { method: 'POST', body: JSON.stringify(alert) });
      console.warn('Alert sent (placeholder implementation)', alert);
    } catch (error) {
      logger.error('Failed to send alert externally', { error, alert });
    }
  }

  /**
   * Updates the configuration for performance alerts
   */
  updateConfig(config: { maxAlerts?: number; retentionMs?: number; defaultSeverity?: PerformanceAlert['severity'] }): void {
    if (config.maxAlerts !== undefined) {
      this.MAX_ALERTS = config.maxAlerts;
    }
    if (config.retentionMs !== undefined) {
      this.ALERT_RETENTION_MS = config.retentionMs;
    }
    // Note: defaultSeverity could be used to set default severity for new alerts

    logger.info('Performance alerts configuration updated', { config });
  }

  /**
   * Clears all alerts (useful for testing or reset scenarios)
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

// ============================================================================
// PERFORMANCE BUDGET CHECKER
// ============================================================================

/**
 * Monitors performance metrics against defined budgets.
 * Helps teams maintain performance standards during development.
 */
export class PerformanceBudgetChecker {
  private static instance: PerformanceBudgetChecker;
  private budgets: PerformanceBudget[] = [];

  private constructor() {
    this.setupDefaultBudgets();
  }

  static getInstance(): PerformanceBudgetChecker {
    if (!PerformanceBudgetChecker.instance) {
      PerformanceBudgetChecker.instance = new PerformanceBudgetChecker();
    }
    return PerformanceBudgetChecker.instance;
  }

  /**
   * Sets up industry-standard performance budgets
   */
  private setupDefaultBudgets(): void {
    this.budgets = [
      // Core Web Vitals budgets
      { metric: 'LCP', budget: 2500, warning: 2000 },
      { metric: 'FID', budget: 100, warning: 75 },
      { metric: 'INP', budget: 200, warning: 150 },
      { metric: 'CLS', budget: 0.1, warning: 0.05 },
      { metric: 'FCP', budget: 1800, warning: 1500 },
      { metric: 'TTFB', budget: 800, warning: 600 },
      
      // Resource budgets
      { metric: 'bundle-size', budget: 250000, warning: 200000 },      // 250KB max
      { metric: 'memory-usage', budget: 50000000, warning: 40000000 }, // 50MB max
      { metric: 'dom-size', budget: 1500, warning: 1200 }              // DOM nodes
    ];
  }

  /**
   * Checks if a metric is within its performance budget
   */
  checkBudget(metric: PerformanceMetric): BudgetCheckResult {
    const budget = this.budgets.find(b => b.metric === metric.name);
    
    // If no budget is defined, consider it a pass
    if (!budget) {
      return { 
        status: 'pass', 
        message: 'No budget defined for this metric' 
      };
    }

    // Calculate how much the budget was exceeded
    const exceedancePercentage = ((metric.value - budget.budget) / budget.budget) * 100;

    // Check for budget failure
    if (metric.value > budget.budget) {
      return {
        status: 'fail',
        budget,
        message: `Budget exceeded by ${exceedancePercentage.toFixed(1)}%: ${metric.value.toFixed(2)} > ${budget.budget}`,
        exceedancePercentage
      };
    }

    // Check for warning threshold
    if (metric.value > budget.warning) {
      const warningExceedance = ((metric.value - budget.warning) / budget.warning) * 100;
      return {
        status: 'warning',
        budget,
        message: `Warning threshold exceeded by ${warningExceedance.toFixed(1)}%: ${metric.value.toFixed(2)} > ${budget.warning}`,
        exceedancePercentage: warningExceedance
      };
    }

    // Within acceptable limits
    const utilizationPercentage = (metric.value / budget.warning) * 100;
    return {
      status: 'pass',
      budget,
      message: `Within budget (${utilizationPercentage.toFixed(1)}% of warning threshold)`
    };
  }

  /**
   * Updates or creates a performance budget
   */
  setBudget(metric: string, budget: number, warning: number): void {
    if (budget <= 0 || warning <= 0) {
      throw new Error('Budget values must be greater than zero');
    }
    
    if (warning > budget) {
      throw new Error('Warning threshold must be less than or equal to budget');
    }

    const existingIndex = this.budgets.findIndex(b => b.metric === metric);
    const newBudget: PerformanceBudget = { metric, budget, warning };

    if (existingIndex >= 0) {
      this.budgets[existingIndex] = newBudget;
      logger.info('Budget updated', { metric, budget, warning });
    } else {
      this.budgets.push(newBudget);
      logger.info('Budget created', { metric, budget, warning });
    }
  }

  /**
   * Returns all configured budgets
   */
  getBudgets(): PerformanceBudget[] {
    return [...this.budgets]; // Return a copy to prevent external modifications
  }

  /**
   * Returns a specific budget by metric name
   */
  getBudget(metric: string): PerformanceBudget | undefined {
    return this.budgets.find(b => b.metric === metric);
  }
}

// ============================================================================
// WEB VITALS MONITOR
// ============================================================================

/**
 * Monitors Core Web Vitals and other performance metrics using browser APIs.
 * Automatically tracks LCP, FID, INP, CLS, FCP, and TTFB.
 */
export class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private metrics: WebVitalsMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private clsValue: number = 0;
  private fidRecorded: boolean = false;
  private readonly MAX_METRICS = 100;

  private constructor() {
    this.setupObservers();
  }

  static getInstance(): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor();
    }
    return WebVitalsMonitor.instance;
  }

  /**
   * Initializes all performance observers
   */
  private setupObservers(): void {
    // Only run in browser environment with PerformanceObserver support
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      logger.warn('PerformanceObserver not available, skipping Web Vitals monitoring');
      return;
    }

    this.observeLCP();
    this.observeFID();
    this.observeINP();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  /**
   * Observes Largest Contentful Paint - measures loading performance
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number };
        
        // Use renderTime if available, otherwise use startTime
        const lcpValue = lastEntry.renderTime || lastEntry.startTime;
        
        this.recordMetric({
          name: 'LCP',
          value: lcpValue,
          rating: this.getRating('LCP', lcpValue),
          timestamp: new Date()
        });
      });
      
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('LCP', observer);
    } catch (error) {
      logger.error('Failed to observe LCP', { error });
    }
  }

  /**
   * Observes First Input Delay - measures interactivity
   */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const eventEntry = entry as PerformanceEventTiming;
          // Only record the first input delay
          if (!this.fidRecorded) {
            const fidValue = eventEntry.processingStart - eventEntry.startTime;

            this.recordMetric({
              name: 'FID',
              value: fidValue,
              rating: this.getRating('FID', fidValue),
              timestamp: new Date()
            });

            this.fidRecorded = true;
          }
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.set('FID', observer);
    } catch (error) {
      logger.error('Failed to observe FID', { error });
    }
  }

  /**
   * Observes Interaction to Next Paint - measures responsiveness
   * This is replacing FID as a Core Web Vital
   */
  private observeINP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        
        entries.forEach((entry) => {
          // INP considers all interactions, not just the first
          const inpValue = entry.processingStart - entry.startTime + entry.duration;
          
          this.recordMetric({
            name: 'INP',
            value: inpValue,
            rating: this.getRating('INP', inpValue),
            timestamp: new Date()
          });
        });
      });

      // Use 'event' type for broader interaction tracking
      observer.observe({ type: 'event', buffered: true });
      this.observers.set('INP', observer);
    } catch (error) {
      logger.error('Failed to observe INP', { error });
    }
  }

  /**
   * Observes Cumulative Layout Shift - measures visual stability
   */
  private observeCLS(): void {
    try {
      let sessionValue = 0;
      let sessionEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
          // Only count layout shifts without recent user input
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // Check if this entry is part of the current session
            if (sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value || 0;
              sessionEntries.push(entry);
            } else {
              // Start a new session
              sessionValue = entry.value || 0;
              sessionEntries = [entry];
            }

            // Update CLS with the maximum session value
            if (sessionValue > this.clsValue) {
              this.clsValue = sessionValue;

              this.recordMetric({
                name: 'CLS',
                value: this.clsValue,
                rating: this.getRating('CLS', this.clsValue),
                timestamp: new Date()
              });
            }
          }
        });
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('CLS', observer);
    } catch (error) {
      logger.error('Failed to observe CLS', { error });
    }
  }

  /**
   * Observes First Contentful Paint - measures perceived loading speed
   */
  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric({
              name: 'FCP',
              value: entry.startTime,
              rating: this.getRating('FCP', entry.startTime),
              timestamp: new Date()
            });
          }
        });
      });
      
      observer.observe({ type: 'paint', buffered: true });
      this.observers.set('FCP', observer);
    } catch (error) {
      logger.error('Failed to observe FCP', { error });
    }
  }

  /**
   * Observes Time to First Byte - measures server response time
   */
  private observeTTFB(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const navEntry = entry as PerformanceNavigationTiming;
          if (navEntry.responseStart > 0) {
            const ttfbValue = navEntry.responseStart - navEntry.requestStart;

            this.recordMetric({
              name: 'TTFB',
              value: ttfbValue,
              rating: this.getRating('TTFB', ttfbValue),
              timestamp: new Date()
            });
          }
        });
      });
      
      observer.observe({ type: 'navigation', buffered: true });
      this.observers.set('TTFB', observer);
    } catch (error) {
      logger.error('Failed to observe TTFB', { error });
    }
  }

  /**
   * Determines the rating for a given metric value based on Web Vitals thresholds
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      INP: { good: 200, poor: 500 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Records a Web Vitals metric
   */
  private recordMetric(metric: WebVitalsMetric): void {
    this.metrics.push(metric);
    
    // Maintain a reasonable history size
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    logger.info('Web Vitals metric recorded', { metric });
  }

  /**
   * Returns all recorded metrics
   */
  getMetrics(): WebVitalsMetric[] {
    return [...this.metrics];
  }

  /**
   * Returns the most recent metric for a specific Web Vital
   */
  getLatestMetric(name: WebVitalsMetric['name']): WebVitalsMetric | undefined {
    const filtered = this.metrics.filter(m => m.name === name);
    return filtered.length > 0 
      ? filtered.reduce((latest, current) => 
          current.timestamp > latest.timestamp ? current : latest
        )
      : undefined;
  }

  /**
   * Returns metrics grouped by rating
   */
  getMetricsByRating(rating: 'good' | 'needs-improvement' | 'poor'): WebVitalsMetric[] {
    return this.metrics.filter(m => m.rating === rating);
  }

  /**
   * Disconnects all observers and cleans up
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    logger.info('Web Vitals monitoring disconnected');
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZER
// ============================================================================

/**
 * Analyzes page performance and provides actionable optimization suggestions.
 * Helps developers identify and fix performance issues.
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private suggestions: OptimizationSuggestion[] = [];
  private analysisTimestamp: Date | null = null;

  private constructor() {
    // Defer initial analysis to avoid blocking initialization
    if (typeof window !== 'undefined') {
      setTimeout(() => this.analyzePage(), 1000);
    }
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Performs comprehensive page analysis
   */
  private analyzePage(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.suggestions = []; // Clear previous suggestions
    
    this.analyzeImages();
    this.analyzeScripts();
    this.analyzeStyles();
    this.analyzeNetwork();
    this.analyzeCaching();
    this.analyzeMemory();
    
    this.analysisTimestamp = new Date();
    logger.info('Page analysis completed', { 
      suggestionsCount: this.suggestions.length,
      timestamp: this.analysisTimestamp 
    });
  }

  /**
   * Analyzes image optimization opportunities
   */
  private analyzeImages(): void {
    const images = document.querySelectorAll('img');
    let unoptimizedCount = 0;
    let missingAltCount = 0;
    
    images.forEach((img) => {
      // Check for lazy loading
      if (!img.loading || img.loading !== 'lazy') {
        unoptimizedCount++;
      }

      // Check for alt text (accessibility)
      if (!img.alt) {
        missingAltCount++;
      }
      
      // Check for modern image formats
      if (img.src && !img.src.match(/\.(webp|avif)$/i)) {
        this.addSuggestionOnce({
          type: 'image',
          priority: 'medium',
          description: 'Consider using modern image formats (WebP, AVIF)',
          impact: 'Can reduce image size by 25-35% compared to JPEG/PNG',
          implementation: 'Use <picture> element with multiple format sources or configure your build tool to generate modern formats',
          estimatedImprovement: '~30% reduction in image payload'
        });
      }
    });

    if (unoptimizedCount > 0) {
      this.suggestions.push({
        type: 'image',
        priority: 'medium',
        description: `${unoptimizedCount} images not using lazy loading`,
        impact: 'Reduces initial page load time and bandwidth usage',
        implementation: 'Add loading="lazy" attribute to below-the-fold images',
        estimatedImprovement: `~${unoptimizedCount * 50}KB saved on initial load`
      });
    }

    if (missingAltCount > 0) {
      this.suggestions.push({
        type: 'image',
        priority: 'low',
        description: `${missingAltCount} images missing alt text`,
        impact: 'Improves accessibility and SEO',
        implementation: 'Add descriptive alt attributes to all images'
      });
    }
  }

  /**
   * Analyzes JavaScript loading and execution
   */
  private analyzeScripts(): void {
    const scripts = document.querySelectorAll('script[src]');
    let blockingScripts = 0;
    
    scripts.forEach((script) => {
      const hasAsync = script.hasAttribute('async');
      const hasDefer = script.hasAttribute('defer');
      const hasTypeModule = script.getAttribute('type') === 'module';
      
      // Modules are deferred by default
      if (!hasAsync && !hasDefer && !hasTypeModule) {
        blockingScripts++;
      }
    });

    if (blockingScripts > 0) {
      this.suggestions.push({
        type: 'script',
        priority: 'high',
        description: `${blockingScripts} render-blocking scripts detected`,
        impact: 'Scripts block HTML parsing and delay page rendering',
        implementation: 'Add defer attribute for scripts that can wait, or async for independent scripts',
        estimatedImprovement: `~${blockingScripts * 100}ms faster First Contentful Paint`
      });
    }

    // Check for large number of scripts
    if (scripts.length > 10) {
      this.suggestions.push({
        type: 'script',
        priority: 'medium',
        description: `High number of script requests (${scripts.length})`,
        impact: 'Each request adds network overhead and potential blocking',
        implementation: 'Bundle scripts or use code splitting to reduce requests',
        estimatedImprovement: 'Fewer network round trips, faster page load'
      });
    }
  }

  /**
   * Analyzes CSS optimization opportunities
   */
  private analyzeStyles(): void {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    if (stylesheets.length > 5) {
      this.suggestions.push({
        type: 'style',
        priority: 'medium',
        description: `${stylesheets.length} separate stylesheet requests`,
        impact: 'Multiple requests delay rendering and increase latency',
        implementation: 'Combine stylesheets using CSS bundling or build tools',
        estimatedImprovement: `Reduce requests from ${stylesheets.length} to 1-2`
      });
    }

    // Check for inline critical CSS
    const hasInlineStyle = document.querySelector('style');
    if (!hasInlineStyle && stylesheets.length > 0) {
      this.suggestions.push({
        type: 'style',
        priority: 'high',
        description: 'No critical CSS inlined in document head',
        impact: 'Inlining critical CSS eliminates render-blocking requests',
        implementation: 'Extract and inline above-the-fold CSS, load remaining CSS asynchronously',
        estimatedImprovement: '~300-500ms faster First Contentful Paint'
      });
    }
  }

  /**
   * Analyzes network conditions and connection quality
   */
  private analyzeNetwork(): void {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType: string; saveData: boolean } }).connection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          this.suggestions.push({
            type: 'network',
            priority: 'high',
            description: 'Slow network connection detected',
            impact: 'Users on slow connections will experience poor performance',
            implementation: 'Implement adaptive loading: reduce image quality, defer non-critical resources',
            estimatedImprovement: 'Better experience for users on slow connections'
          });
        }

        // Check for save-data preference
        if (connection.saveData) {
          this.suggestions.push({
            type: 'network',
            priority: 'high',
            description: 'User has enabled data saver mode',
            impact: 'User wants to minimize data usage',
            implementation: 'Respect save-data preference by reducing resource sizes and quality',
            estimatedImprovement: 'Reduced data consumption'
          });
        }
      }
    }
  }

  /**
   * Analyzes caching strategies
   */
  private analyzeCaching(): void {
    if ('caches' in window) {
      // Check if service worker is registered
      if (!navigator.serviceWorker?.controller) {
        this.suggestions.push({
          type: 'cache',
          priority: 'medium',
          description: 'No service worker detected',
          impact: 'Service workers enable advanced caching and offline functionality',
          implementation: 'Register a service worker to cache static assets and API responses',
          estimatedImprovement: 'Instant repeat visits, offline support'
        });
      }
    }

    // Check for proper cache headers on resources
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const uncachedResources = resources.filter(resource => {
        // Resources without cache should have cache-control headers
        return resource.transferSize > 0 && resource.transferSize === resource.encodedBodySize;
      });

      if (uncachedResources.length > 5) {
        this.suggestions.push({
          type: 'cache',
          priority: 'high',
          description: `${uncachedResources.length} resources not leveraging browser cache`,
          impact: 'Repeat visitors must re-download unchanged resources',
          implementation: 'Configure server to send proper Cache-Control headers for static assets',
          estimatedImprovement: '~80% faster repeat visits'
        });
      }
    }
  }

  /**
   * Analyzes memory usage patterns
   */
  private analyzeMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;

      if (memory && memory.usedJSHeapSize && memory.jsHeapSizeLimit) {
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        if (usageRatio > 0.9) {
          this.suggestions.push({
            type: 'memory',
            priority: 'critical',
            description: 'High memory usage detected (>90% of heap limit)',
            impact: 'May cause performance degradation or crashes',
            implementation: 'Investigate memory leaks, reduce object retention, implement pagination',
            estimatedImprovement: 'More stable performance, reduced crash risk'
          });
        } else if (usageRatio > 0.7) {
          this.suggestions.push({
            type: 'memory',
            priority: 'medium',
            description: 'Elevated memory usage (>70% of heap limit)',
            impact: 'Approaching memory constraints',
            implementation: 'Profile memory usage and optimize data structures',
            estimatedImprovement: 'Improved responsiveness and stability'
          });
        }
      }
    }
  }

  /**
   * Adds a suggestion only if it hasn't been added before (deduplication)
   */
  private addSuggestionOnce(suggestion: OptimizationSuggestion): void {
    const exists = this.suggestions.some(s => 
      s.type === suggestion.type && s.description === suggestion.description
    );
    
    if (!exists) {
      this.suggestions.push(suggestion);
    }
  }

  /**
   * Returns all optimization suggestions
   */
  getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions];
  }

  /**
   * Returns suggestions filtered by type
   */
  getSuggestionsByType(type: OptimizationSuggestion['type']): OptimizationSuggestion[] {
    return this.suggestions.filter(s => s.type === type);
  }

  /**
   * Returns suggestions filtered by priority
   */
  getSuggestionsByPriority(priority: OptimizationSuggestion['priority']): OptimizationSuggestion[] {
    return this.suggestions.filter(s => s.priority === priority);
  }

  /**
   * Triggers a fresh analysis of the page
   */
  reanalyze(): void {
    this.analyzePage();
  }

  /**
   * Returns when the last analysis was performed
   */
  getLastAnalysisTime(): Date | null {
    return this.analysisTimestamp;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Pre-instantiated singleton for performance alerts
 */
export const performanceAlerts = PerformanceAlerts.getInstance();

/**
 * Pre-instantiated singleton for budget checking
 */
export const performanceBudgetChecker = PerformanceBudgetChecker.getInstance();

/**
 * Pre-instantiated singleton for Web Vitals monitoring
 */
export const webVitalsMonitor = WebVitalsMonitor.getInstance();

/**
 * Pre-instantiated singleton for performance optimization
 */
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Records a performance metric and automatically checks it against thresholds and budgets.
 * This is the primary function you'll use to track custom performance metrics.
 * 
 * @example
 * ```typescript
 * recordPerformanceMetric({
 *   name: 'api-response-time',
 *   value: 450,
 *   category: 'custom',
 *   url: '/api/users'
 * });
 * ```
 */
export function recordPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
  const fullMetric: PerformanceMetric = {
    ...metric,
    timestamp: new Date()
  };
  
  // Check against alert thresholds
  performanceAlerts.checkMetric(fullMetric);
  
  // Check against performance budgets
  const budgetResult = performanceBudgetChecker.checkBudget(fullMetric);
  if (budgetResult.status !== 'pass') {
    logger.warn('Performance budget check', { 
      metric: fullMetric, 
      result: budgetResult 
    });
    
    // Create an alert for budget violations
    if (budgetResult.status === 'fail') {
      performanceAlerts.createAlert({
        id: `budget_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: 'budget-exceeded',
        severity: budgetResult.exceedancePercentage && budgetResult.exceedancePercentage > 50 ? 'high' : 'medium',
        message: budgetResult.message,
        metric: fullMetric.name,
        value: fullMetric.value,
        threshold: budgetResult.budget?.budget || 0,
        timestamp: new Date()
      });
    }
  }
}

/**
 * Returns a comprehensive summary of current performance state.
 * Use this to get a complete picture of your application's performance.
 * 
 * @example
 * ```typescript
 * const summary = getPerformanceSummary();
 * console.log('Critical alerts:', summary.alerts.filter(a => a.severity === 'critical'));
 * console.log('Poor Web Vitals:', summary.webVitals.filter(v => v.rating === 'poor'));
 * ```
 */
export function getPerformanceSummary(): {
  webVitals: WebVitalsMetric[];
  alerts: PerformanceAlert[];
  suggestions: OptimizationSuggestion[];
  budgets: PerformanceBudget[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    poorWebVitals: number;
    highPrioritySuggestions: number;
    budgetViolations: number;
  };
} {
  const webVitals = webVitalsMonitor.getMetrics();
  const alerts = performanceAlerts.getActiveAlerts();
  const suggestions = performanceOptimizer.getSuggestions();
  const budgets = performanceBudgetChecker.getBudgets();

  return {
    webVitals,
    alerts,
    suggestions,
    budgets,
    summary: {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length,
      poorWebVitals: webVitals.filter(v => v.rating === 'poor').length,
      highPrioritySuggestions: suggestions.filter(s => s.priority === 'high').length,
      budgetViolations: alerts.filter(a => a.type === 'budget-exceeded').length
    }
  };
}

/**
 * Returns actionable optimization suggestions for the current page.
 * Convenience wrapper around performanceOptimizer.getSuggestions().
 */
export function optimizePerformance(): OptimizationSuggestion[] {
  return performanceOptimizer.getSuggestions();
}

/**
 * Measures the execution time of a function and records it as a performance metric.
 * Useful for tracking custom operations like data processing or rendering.
 * 
 * @example
 * ```typescript
 * const result = await measurePerformance(
 *   'data-processing',
 *   async () => await processLargeDataset(data),
 *   'custom'
 * );
 * ```
 */
export async function measurePerformance<T>(
  metricName: string,
  operation: () => T | Promise<T>,
  category: PerformanceMetric['category'] = 'custom'
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    recordPerformanceMetric({
      name: metricName,
      value: duration,
      category
    });
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Record the failed operation time as well
    recordPerformanceMetric({
      name: `${metricName}-failed`,
      value: duration,
      category
    });
    
    throw error;
  }
}

/**
 * Creates a performance mark that can be measured later.
 * Wraps the User Timing API for easier usage.
 * 
 * @example
 * ```typescript
 * markPerformance('component-render-start');
 * // ... render component
 * markPerformance('component-render-end');
 * const duration = measureBetweenMarks('component-render', 'component-render-start', 'component-render-end');
 * ```
 */
export function markPerformance(markName: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(markName);
  }
}

/**
 * Measures the time between two performance marks and records it as a metric.
 * Returns the duration in milliseconds.
 */
export function measureBetweenMarks(
  measureName: string,
  startMark: string,
  endMark: string,
  category: PerformanceMetric['category'] = 'custom'
): number | null {
  if (typeof performance === 'undefined' || !performance.measure) {
    return null;
  }

  try {
    performance.measure(measureName, startMark, endMark);
    const measure = performance.getEntriesByName(measureName, 'measure')[0];
    
    if (measure) {
      recordPerformanceMetric({
        name: measureName,
        value: measure.duration,
        category
      });
      
      return measure.duration;
    }
  } catch (error) {
    logger.error('Failed to measure between marks', { measureName, startMark, endMark, error });
  }
  
  return null;
}

/**
 * Configures custom performance thresholds and budgets for your application.
 * Call this early in your application initialization.
 * 
 * @example
 * ```typescript
 * configurePerformance({
 *   thresholds: {
 *     'api-response': 1000,
 *     'database-query': 500
 *   },
 *   budgets: {
 *     'api-response': { budget: 1500, warning: 1000 },
 *     'bundle-size': { budget: 300000, warning: 250000 }
 *   }
 * });
 * ```
 */
export function configurePerformance(config: {
  thresholds?: Record<string, number>;
  budgets?: Record<string, { budget: number; warning: number }>;
}): void {
  if (config.thresholds) {
    Object.entries(config.thresholds).forEach(([metric, threshold]) => {
      performanceAlerts.setThreshold(metric, threshold);
    });
  }

  if (config.budgets) {
    Object.entries(config.budgets).forEach(([metric, { budget, warning }]) => {
      performanceBudgetChecker.setBudget(metric, budget, warning);
    });
  }

  logger.info('Performance configuration updated', { config });
}

/**
 * Returns the current health status of the application based on performance metrics.
 * Useful for dashboard displays or health checks.
 */
export function getPerformanceHealth(): {
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  details: {
    webVitalsScore: number;
    alertScore: number;
    budgetScore: number;
  };
} {
  const summary = getPerformanceSummary();
  
  // Calculate Web Vitals score (0-100)
  const vitalsCount = summary.webVitals.length;
  const goodVitals = summary.webVitals.filter(v => v.rating === 'good').length;
  const webVitalsScore = vitalsCount > 0 ? (goodVitals / vitalsCount) * 100 : 100;
  
  // Calculate alert score (0-100, penalize based on severity)
  const alertPenalty = summary.alerts.reduce((total, alert) => {
    const penalties = { low: 5, medium: 15, high: 30, critical: 50 };
    return total + penalties[alert.severity];
  }, 0);
  const alertScore = Math.max(0, 100 - alertPenalty);
  
  // Calculate budget score (0-100)
  const budgetViolations = summary.summary.budgetViolations;
  const budgetScore = Math.max(0, 100 - (budgetViolations * 20));
  
  // Overall score is weighted average
  const overallScore = (webVitalsScore * 0.5) + (alertScore * 0.3) + (budgetScore * 0.2);
  
  let status: 'healthy' | 'degraded' | 'critical';
  if (overallScore >= 80) {
    status = 'healthy';
  } else if (overallScore >= 50) {
    status = 'degraded';
  } else {
    status = 'critical';
  }
  
  return {
    status,
    score: Math.round(overallScore),
    details: {
      webVitalsScore: Math.round(webVitalsScore),
      alertScore: Math.round(alertScore),
      budgetScore: Math.round(budgetScore)
    }
  };
}

// ============================================================================
// CLEANUP FUNCTION
// ============================================================================

/**
 * Cleans up all performance monitoring observers and resources.
 * Call this when unmounting your application or during cleanup.
 */
export function cleanupPerformanceMonitoring(): void {
  webVitalsMonitor.disconnect();
  performanceAlerts.clearAlerts();
  logger.info('Performance monitoring cleaned up');
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/**
 * Default export containing all performance utilities.
 * You can import individual items or use the entire module.
 * 
 * @example
 * ```typescript
 * // Named imports (recommended)
 * import { recordPerformanceMetric, getPerformanceSummary } from './performance-utils';
 * 
 * // Default import
 * import PerformanceUtils from './performance-utils';
 * PerformanceUtils.recordPerformanceMetric({ ... });
 * ```
 */
export default {
  // Classes
  PerformanceAlerts,
  PerformanceBudgetChecker,
  WebVitalsMonitor,
  PerformanceOptimizer,
  
  // Singleton instances
  performanceAlerts,
  performanceBudgetChecker,
  webVitalsMonitor,
  performanceOptimizer,
  
  // Convenience functions
  recordPerformanceMetric,
  getPerformanceSummary,
  optimizePerformance,
  measurePerformance,
  markPerformance,
  measureBetweenMarks,
  configurePerformance,
  getPerformanceHealth,
  cleanupPerformanceMonitoring
};