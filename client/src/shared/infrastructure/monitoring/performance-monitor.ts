// Modern web-vitals v3+ uses 'on' prefix instead of 'get' prefix
import { onCLS, onFID, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

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

// Extended Performance API with memory property (Chrome-specific)
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Extended Navigator with connection APIs
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// Network Information API interface
interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

// Layout Shift Entry extends PerformanceEntry
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  sources?: Array<{
    node?: Node;
    previousRect?: DOMRectReadOnly;
    currentRect?: DOMRectReadOnly;
  }>;
}

// Metrics payload structure for analytics
interface MetricsPayload {
  timestamp: number;
  url: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  metrics: PerformanceMetrics;
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
    // Core Web Vitals - these are Google's key metrics for user experience
    this.setupCoreWebVitals();

    // Custom metrics specific to your application needs
    this.setupCustomMetrics();

    // Performance observers watch for specific browser events
    this.setupPerformanceObservers();

    // Navigation timing tracks page load performance
    this.setupNavigationTiming();

    // Start continuous monitoring for ongoing metrics
    this.startContinuousMonitoring();
  }

  private setupCoreWebVitals(): void {
    // Largest Contentful Paint - measures when the largest content element becomes visible
    // Good: < 2.5s, Needs Improvement: 2.5-4s, Poor: > 4s
    onLCP((metric: Metric) => {
      this.metrics.coreWebVitals.lcp = metric.value;
      this.reportMetric('LCP', metric.value, 2500);
      this.notifyMetricsUpdate();
    });

    // First Input Delay - measures time from first user interaction to browser response
    // Good: < 100ms, Needs Improvement: 100-300ms, Poor: > 300ms
    onFID((metric: Metric) => {
      this.metrics.coreWebVitals.fid = metric.value;
      this.reportMetric('FID', metric.value, 100);
      this.notifyMetricsUpdate();
    });

    // Cumulative Layout Shift - measures visual stability (unexpected layout movements)
    // Good: < 0.1, Needs Improvement: 0.1-0.25, Poor: > 0.25
    onCLS((metric: Metric) => {
      this.metrics.coreWebVitals.cls = metric.value;
      this.reportMetric('CLS', metric.value, 0.1);
      this.notifyMetricsUpdate();
    });

    // First Contentful Paint - measures when the first text or image appears
    // Good: < 1.8s, Needs Improvement: 1.8-3s, Poor: > 3s
    onFCP((metric: Metric) => {
      this.metrics.coreWebVitals.fcp = metric.value;
      this.reportMetric('FCP', metric.value, 1800);
      this.notifyMetricsUpdate();
    });

    // Time to First Byte - measures server response time
    // Good: < 800ms, Needs Improvement: 800-1800ms, Poor: > 1800ms
    onTTFB((metric: Metric) => {
      this.metrics.coreWebVitals.ttfb = metric.value;
      this.reportMetric('TTFB', metric.value, 800);
      this.notifyMetricsUpdate();
    });
  }

  private setupCustomMetrics(): void {
    // Track when the DOM structure is fully loaded and parsed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.customMetrics.domContentLoaded = performance.now();
        this.notifyMetricsUpdate();
      });
    } else {
      // Document already loaded
      this.metrics.customMetrics.domContentLoaded = 0;
    }

    // Track when all resources (images, scripts, etc.) have finished loading
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        this.metrics.customMetrics.windowLoad = performance.now();
        this.notifyMetricsUpdate();
      });
    } else {
      // Window already loaded
      this.metrics.customMetrics.windowLoad = 0;
    }

    // Calculate Time to Interactive - when page becomes fully interactive
    this.calculateTimeToInteractive();

    // Track JavaScript memory usage (Chrome-specific)
    this.updateMemoryUsage();

    // Track network connection quality
    this.updateConnectionInfo();
  }

  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Resource timing observer - tracks loading of all page resources
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

    // Navigation timing observer - tracks overall page navigation performance
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

    // User timing observer - tracks custom performance marks and measures
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

    // Long task observer - identifies JavaScript tasks that block the main thread
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

    // Layout shift observer - tracks unexpected visual changes on the page
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processLayoutShift(entry as LayoutShiftEntry);
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

    // Alert on slow resources (taking more than 3 seconds)
    if (entry.duration > 3000) {
      this.reportSlowResource(resource);
    }

    // Keep resource timing array manageable to prevent memory issues
    if (this.metrics.resourceTiming.length > 100) {
      this.metrics.resourceTiming = this.metrics.resourceTiming.slice(-50);
    }

    this.notifyMetricsUpdate();
  }

  private processNavigationTiming(entry: PerformanceNavigationTiming): void {
    // Calculate key navigation phases
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
    // Tasks longer than 50ms can cause jank and poor user experience
    if (entry.duration > 50) {
      this.reportLongTask(entry.duration, entry.startTime);
    }
  }

  private processLayoutShift(entry: LayoutShiftEntry): void {
    // Layout shifts above 0.1 indicate poor visual stability
    if (entry.value > 0.1) {
      this.reportLayoutShift(entry.value, entry.sources || []);
    }
  }

  private calculateTimeToInteractive(): void {
    // Time to Interactive is when the page becomes fully responsive to user input
    // This is a simplified calculation - production implementations would be more sophisticated
    setTimeout(() => {
      const longTasks = performance.getEntriesByType('longtask');
      const lastLongTask = longTasks[longTasks.length - 1];

      if (lastLongTask) {
        // TTI is after the last long task completes
        this.metrics.customMetrics.timeToInteractive = lastLongTask.startTime + lastLongTask.duration;
      } else {
        // No long tasks means the page became interactive quickly
        this.metrics.customMetrics.timeToInteractive = performance.now();
      }

      this.notifyMetricsUpdate();
    }, 5000); // Wait 5 seconds after page load to calculate TTI
  }

  private updateMemoryUsage(): void {
    // Memory API is Chrome-specific and helps detect memory leaks
    const perfWithMemory = performance as PerformanceWithMemory;
    if (perfWithMemory.memory) {
      const memory = perfWithMemory.memory;
      this.metrics.customMetrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
  }

  private updateConnectionInfo(): void {
    // Network Information API provides details about the user's connection quality
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      this.metrics.customMetrics.connectionInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };
    }
  }

  private setupNavigationTiming(): void {
    // Fallback for older browsers that use performance.timing instead of PerformanceObserver
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
    // Periodically update metrics that can change over time
    this.metricsCollectionInterval = setInterval(() => {
      this.updateMemoryUsage();
      this.updateConnectionInfo();
      this.collectPerformanceMetrics();
    }, 30000); // Update every 30 seconds
  }

  private collectPerformanceMetrics(): void {
    // Prepare metrics payload for sending to analytics service
    const metricsPayload: MetricsPayload = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      metrics: this.metrics,
    };

    // Send metrics to your analytics backend
    this.sendMetricsToService(metricsPayload);
  }

  private sendMetricsToService(payload: MetricsPayload): void {
    // Use sendBeacon when available - it's more reliable during page unload
    if (navigator.sendBeacon) {
      const data = JSON.stringify(payload);
      navigator.sendBeacon('/api/metrics', data);
    } else {
      // Fallback to fetch with keepalive for browsers without sendBeacon
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
    // Classify resources by their URL patterns for better analysis
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private reportMetric(name: string, value: number, threshold: number): void {
    // Classify metrics based on thresholds (good, needs improvement, poor)
    const status = value <= threshold ? 'good' : value <= threshold * 2 ? 'needs-improvement' : 'poor';

    console.log(`${name}: ${value}ms (${status})`);

    // Report poor metrics to external monitoring for alerting
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

  private reportLayoutShift(
    value: number,
    sources: Array<{
      node?: Node;
      previousRect?: DOMRectReadOnly;
      currentRect?: DOMRectReadOnly;
    }>
  ): void {
    console.warn(`Layout shift detected: ${value}`, sources);
  }

  private reportPerformanceIssue(metric: string, value: number, threshold: number): void {
    // Integrate with your error monitoring service to alert on performance issues
    console.error(`Performance issue: ${metric} = ${value} (threshold: ${threshold})`);
  }

  private notifyMetricsUpdate(): void {
    // Notify registered callbacks when metrics are updated
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.metrics);
    }
  }

  // Public API - methods for application code to interact with performance monitoring

  /**
   * Get a snapshot of all current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Register a callback to be notified when metrics are updated
   */
  onMetricsChange(callback: (metrics: PerformanceMetrics) => void): void {
    this.onMetricsUpdate = callback;
  }

  /**
   * Create a performance mark at the current time
   * Useful for measuring custom application events
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Create a performance measure between two marks or from a mark to now
   * This helps measure the duration of custom operations
   */
  measure(name: string, startMark?: string, endMark?: string): void {
    if (startMark && endMark) {
      performance.measure(name, startMark, endMark);
    } else if (startMark) {
      performance.measure(name, startMark);
    } else {
      performance.measure(name);
    }
  }

  /**
   * Get all collected resource timing data
   */
  getResourceTimings(): ResourceTiming[] {
    return [...this.metrics.resourceTiming];
  }

  /**
   * Get Core Web Vitals metrics
   */
  getCoreWebVitals(): CoreWebVitals {
    return { ...this.metrics.coreWebVitals };
  }

  /**
   * Get custom application metrics
   */
  getCustomMetrics(): CustomMetrics {
    return { ...this.metrics.customMetrics };
  }

  /**
   * Clean up all observers and intervals when monitoring is no longer needed
   */
  destroy(): void {
    // Disconnect all performance observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear the metrics collection interval
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }
}

export default PerformanceMonitoring;