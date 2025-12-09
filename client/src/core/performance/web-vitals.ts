/**
 * Web Vitals Monitoring Module
 * 
 * Monitors Core Web Vitals and other performance metrics using browser APIs.
 * Automatically tracks LCP, FID, INP, CLS, FCP, and TTFB with proper attribution.
 * 
 * @module WebVitalsMonitor
 * @version 2.0.0
 */

import { WebVitalsMetric, PerformanceConfig } from './types';

/**
 * Extended PerformanceEntry types for better type safety
 */
interface PerformanceEntryWithRender extends PerformanceEntry {
  renderTime?: number;
  loadTime?: number;
  element?: Element;
}

interface PerformanceEntryWithInput extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
  sources?: Array<{ node?: Element }>;
}

interface PerformanceEntryWithInteraction extends PerformanceEventTiming {
  interactionId: number;
}

/**
 * Configuration defaults for the Web Vitals monitor
 */
const DEFAULT_CONFIG: PerformanceConfig['webVitals'] = {
  enabled: true,
  reportingThreshold: 0.1,
  sampleRate: 1.0
};

/**
 * Web Vitals thresholds based on Google's recommendations
 * Values are in milliseconds except for CLS which is unit-less
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
} as const;

/**
 * Weights for calculating overall performance score
 * Core Web Vitals (LCP, INP, CLS) receive equal weight
 */
const METRIC_WEIGHTS = {
  lcp: 0.30,
  inp: 0.30,
  cls: 0.30,
  fcp: 0.05,
  ttfb: 0.05
} as const;

/**
 * Web Vitals Monitor class for tracking Core Web Vitals
 * 
 * This singleton class provides comprehensive monitoring of web performance metrics
 * with automatic observer setup, metric collection, and configurable reporting.
 */
export class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private metrics: WebVitalsMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private config: PerformanceConfig['webVitals'];
  private clsValue: number = 0;
  private fidRecorded: boolean = false;
  private inpValue: number = 0;
  private readonly MAX_METRICS = 100;
  private listeners: Set<(metric: WebVitalsMetric) => void> = new Set();
  private isInitialized: boolean = false;

  private constructor(config: PerformanceConfig['webVitals']) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.enabled && this.isBrowserEnvironment()) {
      this.initialize();
    }
  }

  /**
   * Gets the singleton instance of WebVitalsMonitor
   * Creates a new instance if one doesn't exist
   */
  static getInstance(config?: PerformanceConfig['webVitals']): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor(config || DEFAULT_CONFIG);
    }
    return WebVitalsMonitor.instance;
  }

  /**
   * Checks if code is running in a browser environment with PerformanceObserver support
   */
  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           'PerformanceObserver' in window &&
           'performance' in window;
  }

  /**
   * Initializes the monitoring system
   * Sets up all performance observers and visibility change handlers
   */
  private initialize(): void {
    if (this.isInitialized) return;

    try {
      this.setupObservers();
      this.setupVisibilityHandler();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize Web Vitals monitor:', error);
    }
  }

  /**
   * Sets up a handler to finalize metrics when the page becomes hidden
   * This ensures we capture final values before the page is unloaded
   */
  private setupVisibilityHandler(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.finalizeMetrics();
      }
    }, { once: true, capture: true });
  }

  /**
   * Finalizes all metrics when the page is about to be unloaded
   * This captures the final state of CLS and other accumulating metrics
   */
  private finalizeMetrics(): void {
    // Final CLS report if we have a value
    if (this.clsValue > 0) {
      this.recordMetric({
        name: 'CLS',
        value: this.clsValue,
        rating: this.getRating('CLS', this.clsValue),
        timestamp: new Date(),
        url: window.location.href,
        metadata: {
          attribution: {
            finalValue: true
          }
        }
      });
    }

    // Final INP report if we have a value
    if (this.inpValue > 0) {
      this.recordMetric({
        name: 'INP',
        value: this.inpValue,
        rating: this.getRating('INP', this.inpValue),
        timestamp: new Date(),
        url: window.location.href,
        metadata: {
          attribution: {
            finalValue: true
          }
        }
      });
    }
  }

  /**
   * Adds a listener for Web Vitals metrics
   * Returns a function to remove the listener
   */
  addListener(listener: (metric: WebVitalsMetric) => void): () => void {
    this.listeners.add(listener);
    return () => this.removeListener(listener);
  }

  /**
   * Removes a specific listener
   */
  removeListener(listener: (metric: WebVitalsMetric) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Initializes all performance observers for the various Web Vitals metrics
   */
  private setupObservers(): void {
    const observers = [
      { name: 'LCP', setup: () => this.observeLCP() },
      { name: 'FID', setup: () => this.observeFID() },
      { name: 'INP', setup: () => this.observeINP() },
      { name: 'CLS', setup: () => this.observeCLS() },
      { name: 'FCP', setup: () => this.observeFCP() },
      { name: 'TTFB', setup: () => this.observeTTFB() }
    ];

    // Set up each observer independently to prevent one failure from affecting others
    observers.forEach(({ name, setup }) => {
      try {
        setup();
      } catch (error) {
        console.warn(`Failed to observe ${name}:`, error);
      }
    });
  }

  /**
   * Observes Largest Contentful Paint (LCP)
   * Measures loading performance by tracking the render time of the largest content element
   */
  private observeLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntryWithRender;
      
      if (!lastEntry) return;

      // LCP uses renderTime if available (for images), otherwise loadTime, otherwise startTime
      const lcpValue = lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime;
      
      this.recordMetric({
        name: 'LCP',
        value: lcpValue,
        rating: this.getRating('LCP', lcpValue),
        timestamp: new Date(),
        url: window.location.href,
        metadata: {
          element: lastEntry.element?.tagName || 'unknown',
          attribution: {
            renderTime: lastEntry.renderTime,
            loadTime: lastEntry.loadTime,
            startTime: lastEntry.startTime,
            url: lastEntry.element?.getAttribute('src') || lastEntry.element?.getAttribute('href') || undefined
          }
        }
      });
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    this.observers.set('LCP', observer);
  }

  /**
   * Observes First Input Delay (FID)
   * Measures the delay between user interaction and browser response
   * Note: FID only measures the first interaction on the page
   */
  private observeFID(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (this.fidRecorded || entries.length === 0) return;

      const entry = entries[0] as PerformanceEventTiming;
      if (!entry.processingStart || !entry.startTime) return;

      const fidValue = entry.processingStart - entry.startTime;

      this.recordMetric({
        name: 'FID',
        value: fidValue,
        rating: this.getRating('FID', fidValue),
        timestamp: new Date(),
        url: window.location.href,
        metadata: {
          attribution: {
            eventType: entry.name,
            processingStart: entry.processingStart,
            startTime: entry.startTime,
            duration: entry.duration
          }
        }
      });

      this.fidRecorded = true;
      // Disconnect after recording FID since we only need the first one
      observer.disconnect();
    });

    observer.observe({ type: 'first-input', buffered: true });
    this.observers.set('FID', observer);
  }

  /**
   * Observes Interaction to Next Paint (INP)
   * Measures overall responsiveness by tracking all interactions and keeping the worst one
   */
  private observeINP(): void {
    const interactionMap = new Map<number, number>();

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntryWithInteraction[];
      
      entries.forEach((entry) => {
        // Skip entries without an interaction ID (these aren't user interactions)
        if (!entry.interactionId) return;

        const duration = entry.duration;
        const existingDuration = interactionMap.get(entry.interactionId) || 0;
        
        // Track the maximum duration for this interaction ID
        if (duration > existingDuration) {
          interactionMap.set(entry.interactionId, duration);
          
          // INP is the worst interaction, so we update if this is worse than current
          if (duration > this.inpValue) {
            this.inpValue = duration;
            
            this.recordMetric({
              name: 'INP',
              value: duration,
              rating: this.getRating('INP', duration),
              timestamp: new Date(),
              url: window.location.href,
              metadata: {
                attribution: {
                  eventType: entry.name,
                  processingStart: entry.processingStart,
                  startTime: entry.startTime,
                  duration: entry.duration,
                  interactionId: entry.interactionId
                }
              }
            });
          }
        }
      });
    });

    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    this.observers.set('INP', observer);
  }

  /**
   * Observes Cumulative Layout Shift (CLS)
   * Measures visual stability by tracking unexpected layout shifts
   * Uses session windows to group related shifts
   */
  private observeCLS(): void {
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];
    const SESSION_GAP_MS = 1000;
    const MAX_SESSION_DURATION_MS = 5000;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: PerformanceEntryWithInput) => {
        // Only count layout shifts that weren't caused by user input
        if (entry.hadRecentInput || !entry.value) return;

        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

        // Determine if this entry belongs to the current session
        const isPartOfCurrentSession = sessionValue > 0 &&
          entry.startTime - lastSessionEntry.startTime < SESSION_GAP_MS &&
          entry.startTime - firstSessionEntry.startTime < MAX_SESSION_DURATION_MS;

        if (isPartOfCurrentSession) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          // Start a new session
          sessionValue = entry.value;
          sessionEntries = [entry];
        }

        // Update CLS if this session has the highest value so far
        if (sessionValue > this.clsValue) {
          this.clsValue = sessionValue;

          this.recordMetric({
            name: 'CLS',
            value: this.clsValue,
            rating: this.getRating('CLS', this.clsValue),
            timestamp: new Date(),
            url: window.location.href,
            metadata: {
              attribution: {
                sessionValue,
                shiftValue: entry.value,
                sources: entry.sources?.map(source => ({
                  element: source.node?.tagName || 'unknown',
                  selector: this.getElementSelector(source.node)
                })) || []
              }
            }
          });
        }
      });
    });

    observer.observe({ type: 'layout-shift', buffered: true });
    this.observers.set('CLS', observer);
  }

  /**
   * Observes First Contentful Paint (FCP)
   * Measures when the first text or image is painted to the screen
   */
  private observeFCP(): void {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric({
            name: 'FCP',
            value: entry.startTime,
            rating: this.getRating('FCP', entry.startTime),
            timestamp: new Date(),
            url: window.location.href,
            metadata: {
              attribution: {
                startTime: entry.startTime,
                entryType: entry.entryType
              }
            }
          });
          // Disconnect after recording FCP since it only happens once
          observer.disconnect();
        }
      });
    });
    
    observer.observe({ type: 'paint', buffered: true });
    this.observers.set('FCP', observer);
  }

  /**
   * Observes Time to First Byte (TTFB)
   * Measures the time from navigation start to when the first byte is received
   */
  private observeTTFB(): void {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const navEntry = entry as PerformanceNavigationTiming;
        
        // Ensure we have valid timing data
        if (navEntry.responseStart <= 0) return;

        // TTFB is measured from request start to response start
        const ttfbValue = navEntry.responseStart - navEntry.requestStart;

        this.recordMetric({
          name: 'TTFB',
          value: ttfbValue,
          rating: this.getRating('TTFB', ttfbValue),
          timestamp: new Date(),
          url: window.location.href,
          metadata: {
            attribution: {
              waitingTime: navEntry.responseStart - navEntry.requestStart,
              dnsTime: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              connectionTime: navEntry.connectEnd - navEntry.connectStart,
              requestStart: navEntry.requestStart,
              responseStart: navEntry.responseStart
            }
          }
        });
        
        // Disconnect after recording TTFB since it only happens once per page load
        observer.disconnect();
      });
    });
    
    observer.observe({ type: 'navigation', buffered: true });
    this.observers.set('TTFB', observer);
  }

  /**
   * Generates a CSS selector for an element to help identify it
   */
  private getElementSelector(element?: Element): string {
    if (!element) return 'unknown';
    
    try {
      if (element.id) return `#${element.id}`;
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).slice(0, 2).join('.');
        return classes ? `.${classes}` : element.tagName.toLowerCase();
      }
      return element.tagName.toLowerCase();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Determines the rating for a given metric value based on Web Vitals thresholds
   * Returns 'good', 'needs-improvement', or 'poor'
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[metric as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Records a Web Vitals metric and notifies all registered listeners
   * Applies sampling rate and maintains metric history within limits
   */
  private recordMetric(metric: WebVitalsMetric): void {
    // Apply sampling rate to reduce data collection if needed
    if (Math.random() > this.config.sampleRate) return;

    this.metrics.push(metric);
    
    // Maintain a reasonable history size to prevent memory issues
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Notify all listeners asynchronously to avoid blocking
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        console.warn('Error in Web Vitals listener:', error);
      }
    });
  }

  /**
   * Returns all recorded metrics
   */
  getMetrics(): ReadonlyArray<WebVitalsMetric> {
    return [...this.metrics];
  }

  /**
   * Returns the most recent metric for a specific Web Vital
   */
  getLatestMetric(name: WebVitalsMetric['name']): WebVitalsMetric | undefined {
    return this.metrics
      .filter(m => m.name === name)
      .reduce<WebVitalsMetric | undefined>(
        (latest, current) => 
          !latest || current.timestamp > latest.timestamp ? current : latest,
        undefined
      );
  }

  /**
   * Returns metrics filtered by rating
   */
  getMetricsByRating(rating: 'good' | 'needs-improvement' | 'poor'): ReadonlyArray<WebVitalsMetric> {
    return this.metrics.filter(m => m.rating === rating);
  }

  /**
   * Gets Web Vitals summary with latest values for each metric
   */
  getWebVitalsScores(): Record<string, { value: number; rating: string }> {
    const metricNames: Array<WebVitalsMetric['name']> = ['LCP', 'FID', 'INP', 'CLS', 'FCP', 'TTFB'];
    
    return metricNames.reduce((acc, name) => {
      const metric = this.getLatestMetric(name);
      acc[name.toLowerCase()] = metric 
        ? { value: metric.value, rating: metric.rating }
        : { value: 0, rating: 'good' };
      return acc;
    }, {} as Record<string, { value: number; rating: string }>);
  }

  /**
   * Calculates overall performance score based on Core Web Vitals
   * Returns a score from 0-100 where higher is better
   */
  getOverallScore(): number {
    const scores = this.getWebVitalsScores();
    let totalScore = 0;
    let totalWeight = 0;

    // Calculate weighted score based on rating
    Object.entries(METRIC_WEIGHTS).forEach(([metric, weight]) => {
      const metricData = scores[metric];
      if (!metricData) return;

      let score = 0;
      switch (metricData.rating) {
        case 'good':
          score = 100;
          break;
        case 'needs-improvement':
          score = 50;
          break;
        case 'poor':
          score = 0;
          break;
      }
      
      totalScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Updates configuration and reinitializes observers if needed
   */
  updateConfig(config: Partial<PerformanceConfig['webVitals']>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };
    
    if (!this.config.enabled && wasEnabled) {
      this.disconnect();
    } else if (this.config.enabled && !wasEnabled && this.isBrowserEnvironment()) {
      this.initialize();
    }
  }

  /**
   * Disconnects all observers and cleans up resources
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * Resets all collected metrics and internal state
   */
  reset(): void {
    this.metrics = [];
    this.clsValue = 0;
    this.inpValue = 0;
    this.fidRecorded = false;
  }

  /**
   * Exports complete metrics report for external analysis or reporting
   */
  exportMetrics(): {
    timestamp: Date;
    url: string;
    metrics: ReadonlyArray<WebVitalsMetric>;
    summary: ReturnType<WebVitalsMonitor['getWebVitalsScores']>;
    overallScore: number;
  } {
    return {
      timestamp: new Date(),
      url: this.isBrowserEnvironment() ? window.location.href : '',
      metrics: this.getMetrics(),
      summary: this.getWebVitalsScores(),
      overallScore: this.getOverallScore()
    };
  }
}