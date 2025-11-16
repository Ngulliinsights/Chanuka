/**
 * Real User Metrics (RUM) Performance Monitoring Service
 * 
 * Collects and analyzes real user performance data including:
 * - Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * - Custom performance metrics
 * - User experience analytics
 * - Resource loading performance
 * - Network conditions monitoring
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';
import { performanceApiService } from '../core/api/performance';

interface PerformanceMetric {
  name: string;
  value: number;
  delta?: number;
  id: string;
  navigationType?: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface CustomMetric {
  name: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
  timestamp: number;
}

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  pageViews: number;
  interactions: number;
  errors: number;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
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

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
  cached: boolean;
  protocol?: string;
}

class PerformanceMonitoringService {
  private sessionId: string;
  private session: UserSession;
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private resourceTimings: ResourceTiming[] = [];
  private observers: PerformanceObserver[] = [];
  private reportingEndpoint = '/api/performance/metrics';
  private batchSize = 10;
  private reportingInterval = 30000; // 30 seconds
  private reportingTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.session = this.initializeSession();
    this.setupPerformanceObservers();
    this.setupWebVitalsCollection();
    this.setupCustomMetricsCollection();
    this.startPeriodicReporting();
    this.setupPageVisibilityHandling();
  }

  /**
   * Initialize the performance monitoring service
   */
  initialize(config: {
    reportingEndpoint?: string;
    batchSize?: number;
    reportingInterval?: number;
    userId?: string;
  } = {}) {
    this.reportingEndpoint = config.reportingEndpoint || this.reportingEndpoint;
    this.batchSize = config.batchSize || this.batchSize;
    this.reportingInterval = config.reportingInterval || this.reportingInterval;
    
    if (config.userId) {
      this.session.userId = config.userId;
    }

    console.log('📊 Performance monitoring initialized');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize user session data
   */
  private initializeSession(): UserSession {
    return {
      sessionId: this.sessionId,
      startTime: Date.now(),
      pageViews: 1,
      interactions: 0,
      errors: 0,
      deviceInfo: this.collectDeviceInfo(),
      networkInfo: this.collectNetworkInfo()
    };
  }

  /**
   * Collect device information
   */
  private collectDeviceInfo(): DeviceInfo {
    const nav = navigator as any;
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: nav.deviceMemory,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    };
  }

  /**
   * Collect network information
   */
  private collectNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

    if (!connection) {
      return {};
    }

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  /**
   * Set up Web Vitals collection
   */
   private setupWebVitalsCollection() {
     // Largest Contentful Paint
     onLCP((metric: Metric) => {
       this.recordMetric({
         name: 'LCP',
         value: metric.value,
         delta: metric.delta,
         id: metric.id,
         rating: metric.rating,
         timestamp: Date.now()
       });
     });

     // Interaction to Next Paint
     onINP((metric: Metric) => {
       this.recordMetric({
         name: 'INP',
         value: metric.value,
         delta: metric.delta,
         id: metric.id,
         rating: metric.rating,
         timestamp: Date.now()
       });
     });

     // Cumulative Layout Shift
     onCLS((metric: Metric) => {
       this.recordMetric({
         name: 'CLS',
         value: metric.value,
         delta: metric.delta,
         id: metric.id,
         rating: metric.rating,
         timestamp: Date.now()
       });
     });

     // First Contentful Paint
     onFCP((metric: Metric) => {
       this.recordMetric({
         name: 'FCP',
         value: metric.value,
         delta: metric.delta,
         id: metric.id,
         rating: metric.rating,
         timestamp: Date.now()
       });
     });

     // Time to First Byte
     onTTFB((metric: Metric) => {
       this.recordMetric({
         name: 'TTFB',
         value: metric.value,
         delta: metric.delta,
         id: metric.id,
         rating: metric.rating,
         timestamp: Date.now()
       });
     });
   }

  /**
   * Set up performance observers for additional metrics
   */
  private setupPerformanceObservers() {
    // Navigation timing
    this.observePerformanceEntries('navigation', (entries) => {
      for (const entry of entries as PerformanceNavigationTiming[]) {
        this.recordNavigationMetrics(entry);
      }
    });

    // Resource timing
    this.observePerformanceEntries('resource', (entries) => {
      for (const entry of entries as PerformanceResourceTiming[]) {
        this.recordResourceTiming(entry);
      }
    });

    // Long tasks (blocking main thread)
    this.observePerformanceEntries('longtask', (entries) => {
      for (const entry of entries) {
        this.recordCustomMetric({
          name: 'long_task_duration',
          value: entry.duration,
          unit: 'milliseconds',
          context: {
            startTime: entry.startTime,
            name: entry.name
          },
          timestamp: Date.now()
        });
      }
    });

    // Layout shifts
    this.observePerformanceEntries('layout-shift', (entries) => {
      for (const entry of entries as any) {
        if (!entry.hadRecentInput) {
          this.recordCustomMetric({
            name: 'layout_shift',
            value: entry.value,
            unit: 'score',
            context: {
              sources: entry.sources?.map((s: any) => ({
                node: s.node?.tagName,
                previousRect: s.previousRect,
                currentRect: s.currentRect
              }))
            },
            timestamp: Date.now()
          });
        }
      }
    });

    // Element timing (for custom elements)
    this.observePerformanceEntries('element', (entries) => {
      for (const entry of entries) {
        this.recordCustomMetric({
          name: 'element_timing',
          value: entry.startTime,
          unit: 'milliseconds',
          context: {
            identifier: (entry as any).identifier,
            naturalWidth: (entry as any).naturalWidth,
            naturalHeight: (entry as any).naturalHeight
          },
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Observe specific performance entry types
   */
  private observePerformanceEntries(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${type} entries:`, error);
    }
  }

  /**
   * Record navigation timing metrics
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const startTime = entry.activationStart ?? 0;
    const metrics = [
      { name: 'dns_lookup', value: entry.domainLookupEnd - entry.domainLookupStart },
      { name: 'tcp_connect', value: entry.connectEnd - entry.connectStart },
      { name: 'ssl_negotiation', value: entry.connectEnd - entry.secureConnectionStart },
      { name: 'request_time', value: entry.responseStart - entry.requestStart },
      { name: 'response_time', value: entry.responseEnd - entry.responseStart },
      { name: 'dom_processing', value: entry.domComplete - entry.domContentLoadedEventStart },
      { name: 'dom_interactive', value: entry.domInteractive - startTime },
      { name: 'dom_content_loaded', value: entry.domContentLoadedEventEnd - startTime },
      { name: 'load_complete', value: entry.loadEventEnd - startTime }
    ];

    for (const metric of metrics) {
      if (metric.value > 0) {
        this.recordCustomMetric({
          name: metric.name,
          value: metric.value,
          unit: 'milliseconds',
          timestamp: Date.now()
        });
      }
    }

    // Record navigation type
    const typeMap: Record<string, number> = { navigate: 0, reload: 1, 'back_forward': 2, prerender: 3 };
    this.recordCustomMetric({
      name: 'navigation_type',
      value: typeMap[entry.type] ?? 0,
      unit: 'enum',
      context: {
        redirectCount: entry.redirectCount,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize
      },
      timestamp: Date.now()
    });
  }

  /**
   * Record resource timing information
   */
  private recordResourceTiming(entry: PerformanceResourceTiming) {
    const resourceType = this.getResourceType(entry.name);
    const cached = entry.transferSize === 0 && entry.decodedBodySize > 0;

    const timing: ResourceTiming = {
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize || entry.decodedBodySize,
      type: resourceType,
      cached,
      protocol: (entry as any).nextHopProtocol
    };

    this.resourceTimings.push(timing);

    // Record slow resources
    if (entry.duration > 1000) {
      this.recordCustomMetric({
        name: 'slow_resource',
        value: entry.duration,
        unit: 'milliseconds',
        context: {
          url: entry.name,
          type: resourceType,
          size: entry.transferSize,
          cached
        },
        timestamp: Date.now()
      });
    }

    // Record large resources
    if (entry.transferSize > 1024 * 1024) { // > 1MB
      this.recordCustomMetric({
        name: 'large_resource',
        value: entry.transferSize,
        unit: 'bytes',
        context: {
          url: entry.name,
          type: resourceType,
          duration: entry.duration
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Determine resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)(\?|$)/)) return 'script';
    if (url.match(/\.css(\?|$)/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)(\?|$)/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)(\?|$)/)) return 'font';
    if (url.match(/\.(mp4|webm|ogg)(\?|$)/)) return 'video';
    if (url.match(/\.(mp3|wav|ogg)(\?|$)/)) return 'audio';
    if (url.includes('/api/')) return 'xhr';
    return 'other';
  }

  /**
   * Set up custom metrics collection
   */
  private setupCustomMetricsCollection() {
    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordCustomMetric({
          name: 'memory_used',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          context: {
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          },
          timestamp: Date.now()
        });
      }, 60000); // Every minute
    }

    // Connection monitoring
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const recordConnectionMetrics = () => {
        this.recordCustomMetric({
          name: 'connection_speed',
          value: connection.downlink || 0,
          unit: 'mbps',
          context: {
            effectiveType: connection.effectiveType,
            rtt: connection.rtt,
            saveData: connection.saveData
          },
          timestamp: Date.now()
        });
      };

      // Record initial connection
      recordConnectionMetrics();

      // Monitor connection changes
      connection.addEventListener('change', recordConnectionMetrics);
    }

    // Battery monitoring
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const recordBatteryMetrics = () => {
          this.recordCustomMetric({
            name: 'battery_level',
            value: battery.level * 100,
            unit: 'percentage',
            context: {
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            },
            timestamp: Date.now()
          });
        };

        recordBatteryMetrics();
        battery.addEventListener('levelchange', recordBatteryMetrics);
        battery.addEventListener('chargingchange', recordBatteryMetrics);
      });
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Trigger immediate reporting for critical metrics
    if (metric.rating === 'poor' || metric.value > this.getCriticalThreshold(metric.name)) {
      this.reportMetrics(true);
    }
  }

  /**
   * Record a custom metric
   */
  recordCustomMetric(metric: CustomMetric) {
    this.customMetrics.push(metric);
  }

  /**
   * Get critical threshold for a metric
   */
  private getCriticalThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'LCP': 4000,    // 4 seconds
      'FID': 300,     // 300ms
      'CLS': 0.25,    // 0.25 score
      'FCP': 3000,    // 3 seconds
      'TTFB': 1800    // 1.8 seconds
    };
    
    return thresholds[metricName] || Infinity;
  }

  /**
   * Track user interactions
   */
  trackInteraction(type: string, target?: string, duration?: number) {
    this.session.interactions++;
    
    this.recordCustomMetric({
      name: 'user_interaction',
      value: duration || 0,
      unit: 'milliseconds',
      context: {
        type,
        target,
        sessionInteractions: this.session.interactions
      },
      timestamp: Date.now()
    });
  }

  /**
   * Track page navigation
   */
  trackPageView(path: string, referrer?: string) {
    this.session.pageViews++;
    
    this.recordCustomMetric({
      name: 'page_view',
      value: Date.now() - this.session.startTime,
      unit: 'milliseconds',
      context: {
        path,
        referrer,
        sessionPageViews: this.session.pageViews
      },
      timestamp: Date.now()
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: Record<string, any>) {
    this.session.errors++;
    
    this.recordCustomMetric({
      name: 'error_occurred',
      value: 1,
      unit: 'count',
      context: {
        message: error.message,
        stack: error.stack,
        sessionErrors: this.session.errors,
        ...context
      },
      timestamp: Date.now()
    });
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting() {
    this.reportingTimer = setInterval(() => {
      this.reportMetrics();
    }, this.reportingInterval);
  }

  /**
   * Set up page visibility handling
   */
  private setupPageVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Report metrics before page becomes hidden
        this.reportMetrics(true);
      }
    });

    // Report metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics(true);
    });
  }

  /**
   * Report metrics to the server
   */
  private async reportMetrics(immediate = false) {
    const hasMetrics = this.metrics.length > 0 || this.customMetrics.length > 0;
    const shouldReport = immediate ||
                        this.metrics.length >= this.batchSize ||
                        this.customMetrics.length >= this.batchSize;

    if (!hasMetrics || !shouldReport) {
      return;
    }

    const payload = {
      sessionId: this.sessionId,
      session: this.session,
      metrics: [...this.metrics],
      customMetrics: [...this.customMetrics],
      resourceTimings: [...this.resourceTimings],
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    try {
      // Use sendBeacon for reliability during page unload
      if (immediate && 'sendBeacon' in navigator) {
        navigator.sendBeacon(
          this.reportingEndpoint,
          JSON.stringify(payload)
        );
      } else {
        await performanceApiService.reportMetrics(payload);
      }

      // Clear reported metrics
      this.metrics = [];
      this.customMetrics = [];
      this.resourceTimings = [];

      console.log('📊 Performance metrics reported successfully');
    } catch (error) {
      console.warn('Failed to report performance metrics:', error);
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary() {
    return {
      session: this.session,
      metricsCount: this.metrics.length,
      customMetricsCount: this.customMetrics.length,
      resourceTimingsCount: this.resourceTimings.length,
      lastMetrics: this.metrics.slice(-5),
      lastCustomMetrics: this.customMetrics.slice(-5)
    };
  }

  /**
   * Cleanup observers and timers
   */
  cleanup() {
    // Clear reporting timer
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }

    // Disconnect observers
    for (const observer of this.observers) {
      observer.disconnect();
    }

    // Final metrics report
    this.reportMetrics(true);
  }
}

// Create singleton instance
export const performanceMonitoring = new PerformanceMonitoringService();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  const trackInteraction = (type: string, target?: string, duration?: number) => {
    performanceMonitoring.trackInteraction(type, target, duration);
  };

  const trackPageView = (path: string, referrer?: string) => {
    performanceMonitoring.trackPageView(path, referrer);
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    performanceMonitoring.trackError(error, context);
  };

  const recordCustomMetric = (metric: CustomMetric) => {
    performanceMonitoring.recordCustomMetric(metric);
  };

  return {
    trackInteraction,
    trackPageView,
    trackError,
    recordCustomMetric,
    getPerformanceSummary: () => performanceMonitoring.getPerformanceSummary()
  };
}

// Performance monitoring utilities
export const performanceUtils = {
  /**
   * Measure function execution time
   */
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T => {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const duration = performance.now() - start;

      performanceMonitoring.recordCustomMetric({
        name: `function_${name}`,
        value: duration,
        unit: 'milliseconds',
        timestamp: Date.now()
      });

      return result;
    }) as T;
  },

  /**
   * Measure async function execution time
   */
  measureAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name: string
  ): T => {
    return (async (...args: any[]) => {
      const start = performance.now();
      const result = await fn(...args);
      const duration = performance.now() - start;

      performanceMonitoring.recordCustomMetric({
        name: `async_function_${name}`,
        value: duration,
        unit: 'milliseconds',
        timestamp: Date.now()
      });

      return result;
    }) as T;
  },

  /**
   * Mark performance milestones
   */
  mark: (name: string) => {
    performance.mark(name);
    
    performanceMonitoring.recordCustomMetric({
      name: `milestone_${name}`,
      value: performance.now(),
      unit: 'milliseconds',
      timestamp: Date.now()
    });
  },

  /**
   * Measure time between marks
   */
  measure: (name: string, startMark: string, endMark?: string) => {
    performance.measure(name, startMark, endMark);
    
    const entries = performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];
    
    if (entry) {
      performanceMonitoring.recordCustomMetric({
        name: `measure_${name}`,
        value: entry.duration,
        unit: 'milliseconds',
        timestamp: Date.now()
      });
    }
  }
};

export default performanceMonitoring;