// Performance monitoring utilities for the Chanuka platform
import { logger } from '@shared/core/src/observability/logging';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  routeChangeTime?: number;
  apiResponseTime?: number;
  bundleLoadTime?: number;
  
  // Resource metrics
  totalJSSize?: number;
  totalCSSSize?: number;
  totalImageSize?: number;
  
  // User experience metrics
  timeToInteractive?: number;
  totalBlockingTime?: number;
}

export interface PerformanceLogEntry {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private entries: PerformanceLogEntry[] = [];
  private observer: PerformanceObserver | null = null;
  private navigationStartTime = performance.now();

  constructor() {
    this.initializeObserver();
    this.measureInitialMetrics();
  }

  private initializeObserver(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry as any);
          }
        });

      // Observe different types of performance entries
      this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      logger.error('Failed to initialize PerformanceObserver:', { component: 'Chanuka' }, error);
    }
  }

  private processPerformanceEntry(entry: any): void {
    switch (entry.entryType) {
      case 'navigation':
        this.processNavigationEntry(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.processPaintEntry(entry as PerformancePaintTiming);
        break;
      case 'largest-contentful-paint':
        this.processLCPEntry(entry as any);
        break;
      case 'first-input':
        this.processFIDEntry(entry as any);
        break;
      case 'layout-shift':
        this.processCLSEntry(entry as any);
        break;
    }
  }

  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.metrics.ttfb = entry.responseStart - entry.requestStart;
    this.recordMetric('TTFB', this.metrics.ttfb);
  }

  private processPaintEntry(entry: PerformancePaintTiming): void {
    if (entry.name === 'first-contentful-paint') {
      this.metrics.fcp = entry.startTime;
      this.recordMetric('FCP', this.metrics.fcp);
    }
  }

  private processLCPEntry(entry: any): void {
    this.metrics.lcp = entry.startTime;
    this.recordMetric('LCP', this.metrics.lcp);
  }

  private processFIDEntry(entry: any): void {
    this.metrics.fid = entry.processingStart - entry.startTime;
    this.recordMetric('FID', this.metrics.fid);
  }

  private processCLSEntry(entry: any): void {
    if (!entry.hadRecentInput) {
      this.metrics.cls = (this.metrics.cls || 0) + entry.value;
      this.recordMetric('CLS', this.metrics.cls);
    }
  }

  private measureInitialMetrics(): void {
    // Measure bundle sizes
    this.measureResourceSizes();
    
    // Measure Time to Interactive
    this.measureTimeToInteractive();
  }

  private measureResourceSizes(): void {
    if (!('performance' in window) || !performance.getEntriesByType) {
      return;
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let totalJSSize = 0;
    let totalCSSSize = 0;
    let totalImageSize = 0;

    resources.forEach((resource) => {
      const size = resource.transferSize || 0;
      
      if (resource.name.includes('.js')) {
        totalJSSize += size;
      } else if (resource.name.includes('.css')) {
        totalCSSSize += size;
      } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        totalImageSize += size;
      }
    });

    this.metrics.totalJSSize = totalJSSize;
    this.metrics.totalCSSSize = totalCSSSize;
    this.metrics.totalImageSize = totalImageSize;

    this.recordMetric('Bundle Size (JS)', totalJSSize);
    this.recordMetric('Bundle Size (CSS)', totalCSSSize);
    this.recordMetric('Bundle Size (Images)', totalImageSize);
  }

  private measureTimeToInteractive(): void {
    // Simple TTI approximation - when the main thread is idle for 5 seconds
    let lastLongTaskTime = 0;
    
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            lastLongTaskTime = entry.startTime + entry.duration;
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        
        // Check TTI after 5 seconds of no long tasks
        setTimeout(() => {
          const now = performance.now();
          if (now - lastLongTaskTime > 5000) {
            this.metrics.timeToInteractive = lastLongTaskTime || now;
            this.recordMetric('TTI', this.metrics.timeToInteractive);
          }
        }, 5000);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  public recordMetric(name: string, value: number | undefined, metadata?: any): void {
    // Prevent duplicate entries for the same metric within a short time window
    const recentEntry = this.entries.find(entry => 
      entry.name === name && 
      Date.now() - entry.timestamp < 1000
    );
    
    if (recentEntry) {
      return;
    }

    const entry: PerformanceLogEntry = {
      name,
      value: value ?? 0,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      metadata
    };

    this.entries.push(entry);

    // Limit entries to prevent memory leaks
    if (this.entries.length > 1000) {
      this.entries = this.entries.slice(-500);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      if (typeof value === 'number') {
        console.log(`Performance: ${name} = ${value.toFixed(2)}ms`);
      } else {
        console.log(`Performance: ${name} = ${String(value)}ms`);
      }
    }
  }

  private getConnectionType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  // Public methods
  public measureRouteChange(routeName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.metrics.routeChangeTime = duration;
      this.recordMetric(`Route Change: ${routeName}`, duration);
    };
  }

  public measureApiCall(endpoint: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(`API Call: ${endpoint}`, duration);
    };
  }

  public measureComponentRender(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(`Component Render: ${componentName}`, duration);
    };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Return our logged entries with a distinct API to avoid conflict with DOM PerformanceEntry
  public getLoggedEntries(): PerformanceLogEntry[] {
    return [...this.entries];
  }

  // NOTE: use getLoggedEntries() for strongly-typed logged entries.

  public getCoreWebVitals(): { lcp?: number; fid?: number; cls?: number } {
    return {
      lcp: this.metrics.lcp,
      fid: this.metrics.fid,
      cls: this.metrics.cls,
    };
  }

  public getPerformanceScore(): number {
    const { lcp, fid, cls } = this.getCoreWebVitals();
    
    // Simple scoring based on Core Web Vitals thresholds
    let score = 100;
    
    if (lcp) {
      if (lcp > 4000) score -= 30;
      else if (lcp > 2500) score -= 15;
    }
    
    if (fid) {
      if (fid > 300) score -= 30;
      else if (fid > 100) score -= 15;
    }
    
    if (cls) {
      if (cls > 0.25) score -= 30;
      else if (cls > 0.1) score -= 15;
    }
    
    return Math.max(0, score);
  }

  public exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      entries: this.entries,
      timestamp: Date.now(),
      url: window.location.href,
    }, null, 2);
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const measureRouteChange = (routeName: string) => {
    return performanceMonitor.measureRouteChange(routeName);
  };

  const measureApiCall = (endpoint: string) => {
    return performanceMonitor.measureApiCall(endpoint);
  };

  const measureComponentRender = (componentName: string) => {
    return performanceMonitor.measureComponentRender(componentName);
  };

  const getMetrics = () => {
    return performanceMonitor.getMetrics();
  };

  const getCoreWebVitals = () => {
    return performanceMonitor.getCoreWebVitals();
  };

  const getPerformanceScore = () => {
    return performanceMonitor.getPerformanceScore();
  };

  return {
    measureRouteChange,
    measureApiCall,
    measureComponentRender,
    getMetrics,
    getCoreWebVitals,
    getPerformanceScore,
  };
}

// Performance budget checker
export class PerformanceBudget {
  private budgets = {
    lcp: 2500, // 2.5 seconds
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    totalJSSize: 500 * 1024, // 500KB
    totalCSSSize: 100 * 1024, // 100KB
    routeChangeTime: 1000, // 1 second
  };

  public checkBudget(): { passed: boolean; violations: string[] } {
    const metrics = performanceMonitor.getMetrics();
    const violations: string[] = [];

    Object.entries(this.budgets).forEach(([metric, budget]) => {
      const value = metrics[metric as keyof PerformanceMetrics];
      if (value && value > budget) {
        violations.push(`${metric}: ${value} exceeds budget of ${budget}`);
      }
    });

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  public setBudget(metric: keyof typeof this.budgets, value: number): void {
    this.budgets[metric] = value;
  }

  public getBudgets(): typeof this.budgets {
    return { ...this.budgets };
  }
}

export const performanceBudget = new PerformanceBudget();

// Connection-aware performance optimization
export function getOptimalSettings() {
  const connection = (navigator as any).connection;
  
  if (!connection) {
    return {
      imageQuality: 75,
      enablePreloading: true,
      lazyLoadThreshold: 0.1,
    };
  }

  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink || 1;

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return {
      imageQuality: 50,
      enablePreloading: false,
      lazyLoadThreshold: 0.5,
    };
  }

  if (effectiveType === '3g' || downlink < 1.5) {
    return {
      imageQuality: 60,
      enablePreloading: true,
      lazyLoadThreshold: 0.3,
    };
  }

  return {
    imageQuality: 80,
    enablePreloading: true,
    lazyLoadThreshold: 0.1,
  };
}











































