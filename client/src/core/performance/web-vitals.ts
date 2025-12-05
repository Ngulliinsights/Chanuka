/**
 * Web Vitals Monitoring Module
 * 
 * Monitors Core Web Vitals and other performance metrics using browser APIs.
 * Automatically tracks LCP, FID, INP, CLS, FCP, and TTFB with proper attribution.
 */

import { logger } from '../../utils/logger';
import { WebVitalsMetric, PerformanceConfig } from './types';

/**
 * Creates a performance-specific error
 */
function createPerformanceError(message: string, context?: Record<string, unknown>): Error {
  const error = new Error(message);
  (error as any).context = context;
  return error;
}

/**
 * Web Vitals Monitor class for tracking Core Web Vitals
 */
export class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private metrics: WebVitalsMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private config: PerformanceConfig['webVitals'];
  private clsValue: number = 0;
  private clsEntries: PerformanceEntry[] = [];
  private fidRecorded: boolean = false;
  private readonly MAX_METRICS = 100;
  private listeners: Array<(metric: WebVitalsMetric) => void> = [];

  private constructor(config: PerformanceConfig['webVitals']) {
    this.config = config;
    if (this.config.enabled) {
      this.setupObservers();
    }
  }

  static getInstance(config?: PerformanceConfig['webVitals']): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor(config || {
        enabled: true,
        reportingThreshold: 0.1,
        sampleRate: 1.0
      });
    }
    return WebVitalsMonitor.instance;
  }

  /**
   * Adds a listener for Web Vitals metrics
   */
  addListener(listener: (metric: WebVitalsMetric) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Removes a listener
   */
  removeListener(listener: (metric: WebVitalsMetric) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
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

    try {
      this.observeLCP();
      this.observeFID();
      this.observeINP();
      this.observeCLS();
      this.observeFCP();
      this.observeTTFB();

      logger.info('Web Vitals monitoring initialized', {
        component: 'WebVitalsMonitor',
        observersCount: this.observers.size
      });
    } catch (error) {
      logger.error('Failed to setup Web Vitals observers', { error });
    }
  }

  /**
   * Observes Largest Contentful Paint - measures loading performance
   */
  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { 
          renderTime?: number; 
          element?: Element;
        };
        
        if (lastEntry) {
          // Use renderTime if available, otherwise use startTime
          const lcpValue = lastEntry.renderTime || lastEntry.startTime;
          
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
                startTime: lastEntry.startTime
              }
            }
          });
        }
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
          if (!this.fidRecorded && eventEntry.processingStart && eventEntry.startTime) {
            const fidValue = eventEntry.processingStart - eventEntry.startTime;

            this.recordMetric({
              name: 'FID',
              value: fidValue,
              rating: this.getRating('FID', fidValue),
              timestamp: new Date(),
              url: window.location.href,
              metadata: {
                attribution: {
                  eventType: (eventEntry as any).name,
                  processingStart: eventEntry.processingStart,
                  startTime: eventEntry.startTime,
                  duration: eventEntry.duration
                }
              }
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
   */
  private observeINP(): void {
    try {
      let maxINP = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        
        entries.forEach((entry) => {
          // Calculate interaction duration
          const interactionDuration = entry.processingStart - entry.startTime + entry.duration;
          
          // Track the maximum interaction duration (INP is the worst interaction)
          if (interactionDuration > maxINP) {
            maxINP = interactionDuration;
            
            this.recordMetric({
              name: 'INP',
              value: interactionDuration,
              rating: this.getRating('INP', interactionDuration),
              timestamp: new Date(),
              url: window.location.href,
              metadata: {
                attribution: {
                  eventType: (entry as any).name,
                  processingStart: entry.processingStart,
                  startTime: entry.startTime,
                  duration: entry.duration,
                  interactionId: (entry as any).interactionId
                }
              }
            });
          }
        });
      });

      // Observe event timing for interactions
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
        list.getEntries().forEach((entry: PerformanceEntry & { 
          hadRecentInput?: boolean; 
          value?: number;
          sources?: Array<{ node?: Element }>;
        }) => {
          // Only count layout shifts without recent user input
          if (!entry.hadRecentInput && entry.value) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // Check if this entry is part of the current session
            if (sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              // Start a new session
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            // Update CLS with the maximum session value
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
                    entryValue: entry.value,
                    sources: entry.sources?.map(source => ({
                      element: source.node?.tagName || 'unknown'
                    })) || []
                  }
                }
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
              timestamp: new Date(),
              url: window.location.href,
              metadata: {
                attribution: {
                  startTime: entry.startTime,
                  entryType: entry.entryType
                }
              }
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
          if (navEntry.responseStart > 0 && navEntry.requestStart > 0) {
            const ttfbValue = navEntry.responseStart - navEntry.requestStart;

            this.recordMetric({
              name: 'TTFB',
              value: ttfbValue,
              rating: this.getRating('TTFB', ttfbValue),
              timestamp: new Date(),
              url: window.location.href,
              metadata: {
                attribution: {
                  requestStart: navEntry.requestStart,
                  responseStart: navEntry.responseStart,
                  connectEnd: navEntry.connectEnd,
                  connectStart: navEntry.connectStart
                }
              }
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
   * Records a Web Vitals metric and notifies listeners
   */
  private recordMetric(metric: WebVitalsMetric): void {
    // Check if we should sample this metric
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.metrics.push(metric);
    
    // Maintain a reasonable history size
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        logger.error('Error in Web Vitals listener', { error, metric });
      }
    });

    logger.debug('Web Vitals metric recorded', {
      component: 'WebVitalsMonitor',
      metric: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating
      }
    });
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
   * Gets Web Vitals summary scores
   */
  getWebVitalsScores() {
    const scores = {
      lcp: this.getLatestMetric('LCP'),
      fid: this.getLatestMetric('FID'),
      inp: this.getLatestMetric('INP'),
      cls: this.getLatestMetric('CLS'),
      fcp: this.getLatestMetric('FCP'),
      ttfb: this.getLatestMetric('TTFB')
    };

    return Object.entries(scores).reduce((acc, [key, metric]) => {
      acc[key] = metric ? {
        value: metric.value,
        rating: metric.rating
      } : {
        value: 0,
        rating: 'good'
      };
      return acc;
    }, {} as Record<string, { value: number; rating: string }>);
  }

  /**
   * Calculates overall performance score based on Web Vitals
   */
  getOverallScore(): number {
    const scores = this.getWebVitalsScores();
    const weights = {
      lcp: 0.25,
      fid: 0.25,
      inp: 0.25,
      cls: 0.25
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      const score = scores[metric];
      if (score) {
        let metricScore = 0;
        switch (score.rating) {
          case 'good':
            metricScore = 100;
            break;
          case 'needs-improvement':
            metricScore = 75;
            break;
          case 'poor':
            metricScore = 50;
            break;
        }
        totalScore += metricScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<PerformanceConfig['webVitals']>): void {
    this.config = { ...this.config, ...config };
    
    if (!this.config.enabled) {
      this.disconnect();
    } else if (this.observers.size === 0) {
      this.setupObservers();
    }
  }

  /**
   * Disconnects all observers and cleans up
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.listeners = [];
    
    logger.info('Web Vitals monitoring disconnected', {
      component: 'WebVitalsMonitor'
    });
  }

  /**
   * Resets all collected metrics
   */
  reset(): void {
    this.metrics = [];
    this.clsValue = 0;
    this.clsEntries = [];
    this.fidRecorded = false;
    
    logger.info('Web Vitals metrics reset', {
      component: 'WebVitalsMonitor'
    });
  }

  /**
   * Exports metrics for external reporting
   */
  exportMetrics(): {
    timestamp: Date;
    url: string;
    metrics: WebVitalsMetric[];
    summary: ReturnType<typeof this.getWebVitalsScores>;
    overallScore: number;
  } {
    return {
      timestamp: new Date(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      metrics: this.getMetrics(),
      summary: this.getWebVitalsScores(),
      overallScore: this.getOverallScore()
    };
  }
}