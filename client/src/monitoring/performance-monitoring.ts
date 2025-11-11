import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

interface PerformanceMetrics {
  coreWebVitals: CoreWebVitals;
  customMetrics: CustomMetrics;
  resourceTiming: ResourceTiming[];
  navigationTiming: NavigationTiming;
  userTiming: UserTiming[];
}

interface CoreWebVitals {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
}

interface CustomMetrics {
  timeToInteractive: number | null;
  firstMeaningfulPaint: number | null;
  domContentLoaded: number | null;
  windowLoad: number | null;
  memoryUsage: MemoryUsage | null;
  connectionInfo: ConnectionInfo | null;
}

interface ResourceTiming {
  name: string;
  type: string;
  duration: number;
  size: number;
  startTime: number;
  endTime: number;
}

interface NavigationTiming {
  domainLookup: number;
  tcpConnect: number;
  request: number;
  response: number;
  domProcessing: number;
  loadComplete: number;
}

interface UserTiming {
  name: string;
  startTime: number;
  duration: number;
  type: 'mark' | 'measure';
}

interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

class PerformanceMonitoring {
  private static instance: PerformanceMonitoring;
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private onMetricsUpdate?: (metrics: PerformanceMetrics) => void;

  static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  constructor() {
    this.metrics = {
      coreWebVitals: {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null,
      },
      customMetrics: {
        timeToInteractive: null,
        firstMeaningfulPaint: null,
        domContentLoaded: null,
        windowLoad: null,
        memoryUsage: null,
        connectionInfo: null,
      },
      resourceTiming: [],
      navigationTiming: {
        domainLookup: 0,
        tcpConnect: 0,
        request: 0,
        response: 0,
        domProcessing: 0,
        loadComplete: 0,
      },
      userTiming: [],
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Core Web Vitals
    this.setupCoreWebVitals();
    
    // Custom metrics
    this.setupCustomMetrics();
    
    // Performance observers
    this.setupPerformanceObservers();
    
    // Navigation timing
    this.setupNavigationTiming();
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
  }

  private setupCoreWebVitals(): void {
    // Largest Contentful Paint
    getLCP((metric: Metric) => {
      this.metrics.coreWebVitals.lcp = metric.value;
      this.reportMetric('LCP', metric.value, 2500); // Good: < 2.5s
      this.notifyMetricsUpdate();
    });

    // First Input Delay
    getFID((metric: Metric) => {
      this.metrics.coreWebVitals.fid = metric.value;
      this.reportMetric('FID', metric.value, 100); // Good: < 100ms
      this.notifyMetricsUpdate();
    });

    // Cumulative Layout Shift
    getCLS((metric: Metric) => {
      this.metrics.coreWebVitals.cls = metric.value;
      this.reportMetric('CLS', metric.value, 0.1); // Good: < 0.1
      this.notifyMetricsUpdate();
    });

    // First Contentful Paint
    getFCP((metric: Metric) => {
      this.metrics.coreWebVitals.fcp = metric.value;
      this.reportMetric('FCP', metric.value, 1800); // Good: < 1.8s
      this.notifyMetricsUpdate();
    });

    // Time to First Byte
    getTTFB((metric: Metric) => {
      this.metrics.coreWebVitals.ttfb = metric.value;
      this.reportMetric('TTFB', metric.value, 800); // Good: < 800ms
      this.notifyMetricsUpdate();
    });
  }

  private setupCustomMetrics(): void {
    // DOM Content Loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.customMetrics.domContentLoaded = performance.now();
        this.notifyMetricsUpdate();
      });
    } else {
      this.metrics.customMetrics.domContentLoaded = 0;
    }

    // Window Load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        this.metrics.customMetrics.windowLoad = performance.now();
        this.notifyMetricsUpdate();
      });
    } else {
      this.metrics.customMetrics.windowLoad = 0;
    }

    // Time to Interactive (simplified calculation)
    this.calculateTimeToInteractive();

    // Memory usage
    this.updateMemoryUsage();

    // Connection info
    this.updateConnectionInfo();
  }

  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Resource timing observer
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processResourceTiming(entry as PerformanceResourceTiming);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer failed:', error);
    }

    // Navigation timing observer
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processNavigationTiming(entry as PerformanceNavigationTiming);
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (error) {
      console.warn('Navigation timing observer failed:', error);
    }

    // User timing observer
    try {
      const userTimingObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processUserTiming(entry);
        }
      });
      userTimingObserver.observe({ entryTypes: ['mark', 'measure'] });
      this.observers.push(userTimingObserver);
    } catch (error) {
      console.warn('User timing observer failed:', error);
    }

    // Long task observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processLongTask(entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Long task observer failed:', error);
    }

    // Layout shift observer
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processLayoutShift(entry as any);
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(layoutShiftObserver);
    } catch (error) {
      console.warn('Layout shift observer failed:', error);
    }
  }

  private processResourceTiming(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name);
    const size = entry.transferSize || entry.encodedBodySize || 0;
    
    const resource: ResourceTiming = {
      name: entry.name,
      type: resourceType,
      duration: entry.duration,
      size,
      startTime: entry.startTime,
      endTime: entry.startTime + entry.duration,
    };

    this.metrics.resourceTiming.push(resource);

    // Alert on slow resources
    if (entry.duration > 3000) { // 3 seconds
      this.reportSlowResource(resource);
    }

    // Keep resource timing array manageable
    if (this.metrics.resourceTiming.length > 100) {
      this.metrics.resourceTiming = this.metrics.resourceTiming.slice(-50);
    }

    this.notifyMetricsUpdate();
  }

  private processNavigationTiming(entry: PerformanceNavigationTiming): void {
    this.metrics.navigationTiming = {
      domainLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnect: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      domProcessing: entry.domContentLoadedEventEnd - entry.responseEnd,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
    };

    this.notifyMetricsUpdate();
  }

  private processUserTiming(entry: PerformanceEntry): void {
    const userTiming: UserTiming = {
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      type: entry.entryType as 'mark' | 'measure',
    };

    this.metrics.userTiming.push(userTiming);

    // Keep user timing array manageable
    if (this.metrics.userTiming.length > 50) {
      this.metrics.userTiming = this.metrics.userTiming.slice(-25);
    }

    this.notifyMetricsUpdate();
  }

  private processLongTask(entry: PerformanceEntry): void {
    if (entry.duration > 50) {
      this.reportLongTask(entry.duration, entry.startTime);
    }
  }

  private processLayoutShift(entry: any): void {
    if (entry.value > 0.1) {
      this.reportLayoutShift(entry.value, entry.sources);
    }
  }

  private calculateTimeToInteractive(): void {
    // Simplified TTI calculation
    // In a real implementation, this would be more sophisticated
    setTimeout(() => {
      const longTasks = performance.getEntriesByType('longtask');
      const lastLongTask = longTasks[longTasks.length - 1];
      
      if (lastLongTask) {
        this.metrics.customMetrics.timeToInteractive = lastLongTask.startTime + lastLongTask.duration;
      } else {
        this.metrics.customMetrics.timeToInteractive = performance.now();
      }
      
      this.notifyMetricsUpdate();
    }, 5000); // Wait 5 seconds after page load
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.customMetrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
  }

  private updateConnectionInfo(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      this.metrics.customMetrics.connectionInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
  }

  private setupNavigationTiming(): void {
    if (performance.timing) {
      const timing = performance.timing;
      this.metrics.navigationTiming = {
        domainLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnect: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        domProcessing: timing.domContentLoadedEventEnd - timing.responseEnd,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
      };
    }
  }

  private startContinuousMonitoring(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.updateMemoryUsage();
      this.updateConnectionInfo();
      this.collectPerformanceMetrics();
    }, 30000); // Update every 30 seconds
  }

  private collectPerformanceMetrics(): void {
    // Collect and send metrics to monitoring service
    const metricsPayload = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      metrics: this.metrics,
    };

    // Send to analytics service
    this.sendMetricsToService(metricsPayload);
  }

  private sendMetricsToService(payload: any): void {
    // In a real implementation, this would send to your analytics service
    if (navigator.sendBeacon) {
      const data = JSON.stringify(payload);
      navigator.sendBeacon('/api/metrics', data);
    } else {
      // Fallback for browsers without sendBeacon
      fetch('/api/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch(error => {
        console.warn('Failed to send metrics:', error);
      });
    }
  }

  // Utility methods
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private reportMetric(name: string, value: number, threshold: number): void {
    const status = value <= threshold ? 'good' : value <= threshold * 2 ? 'needs-improvement' : 'poor';
    
    console.log(`${name}: ${value}ms (${status})`);
    
    // Report to external monitoring if needed
    if (status === 'poor') {
      this.reportPerformanceIssue(name, value, threshold);
    }
  }

  private reportSlowResource(resource: ResourceTiming): void {
    console.warn(`Slow resource detected: ${resource.name} (${resource.duration}ms)`);
  }

  private reportLongTask(duration: number, startTime: number): void {
    console.warn(`Long task detected: ${duration}ms at ${startTime}ms`);
  }

  private reportLayoutShift(value: number, sources: any[]): void {
    console.warn(`Layout shift detected: ${value}`, sources);
  }

  private reportPerformanceIssue(metric: string, value: number, threshold: number): void {
    // This would integrate with your error monitoring service
    console.error(`Performance issue: ${metric} = ${value} (threshold: ${threshold})`);
  }

  private notifyMetricsUpdate(): void {
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.metrics);
    }
  }

  // Public API
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  onMetricsChange(callback: (metrics: PerformanceMetrics) => void): void {
    this.onMetricsUpdate = callback;
  }

  mark(name: string): void {
    performance.mark(name);
  }

  measure(name: string, startMark?: string, endMark?: string): void {
    if (startMark && endMark) {
      performance.measure(name, startMark, endMark);
    } else if (startMark) {
      performance.measure(name, startMark);
    } else {
      performance.measure(name);
    }
  }

  getResourceTimings(): ResourceTiming[] {
    return [...this.metrics.resourceTiming];
  }

  getCoreWebVitals(): CoreWebVitals {
    return { ...this.metrics.coreWebVitals };
  }

  getCustomMetrics(): CustomMetrics {
    return { ...this.metrics.customMetrics };
  }

  destroy(): void {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear interval
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }
}

export default PerformanceMonitoring;