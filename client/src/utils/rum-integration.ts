/**
 * Real User Monitoring (RUM) Integration
 * Tracks user interactions, performance metrics, and sends data to monitoring service
 */

import { logger } from './browser-logger';
import { performanceMonitor } from '@shared/core';

interface RUMConfig {
  endpoint: string;
  apiKey: string;
  sampleRate: number;
  enableUserTracking: boolean;
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  enableInteractionTracking: boolean;
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'navigation' | 'form-submit' | 'page-view' | 'visibility-change' | 'custom';
  element?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'web-vitals' | 'navigation' | 'resource' | 'custom';
}

class RUMService {
  private config: RUMConfig;
  private sessionId: string;
  private userId?: string;
  private interactions: UserInteraction[] = [];
  private metrics: PerformanceMetric[] = [];
  private isInitialized = false;

  constructor(config: RUMConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();

    // Only initialize if this session is selected for monitoring
    if (Math.random() <= this.config.sampleRate) {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.isInitialized) return;

    logger.info('🚀 Initializing RUM Service', { component: 'RUMService' });

    // Set up user tracking
    if (this.config.enableUserTracking) {
      this.initializeUserTracking();
    }

    // Set up performance tracking
    if (this.config.enablePerformanceTracking) {
      this.initializePerformanceTracking();
    }

    // Set up error tracking
    if (this.config.enableErrorTracking) {
      this.initializeErrorTracking();
    }

    // Set up interaction tracking
    if (this.config.enableInteractionTracking) {
      this.initializeInteractionTracking();
    }

    // Send initial page view
    this.trackPageView();

    this.isInitialized = true;

    // Send periodic batches
    setInterval(() => this.sendBatch(), 30000);
  }

  private initializeUserTracking(): void {
    // Generate or retrieve user ID
    this.userId = localStorage.getItem('rum-user-id') || this.generateUserId();
    localStorage.setItem('rum-user-id', this.userId);

    // Track basic user info (anonymized)
    const userInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    };

    this.sendData('user-info', userInfo);
  }

  private initializePerformanceTracking(): void {
    // Track Core Web Vitals
    if ('web-vitals' in window || typeof (window as any).webVitals !== 'undefined') {
      // Use web-vitals library if available
      this.trackWebVitals();
    } else {
      // Fallback to basic performance tracking
      this.trackBasicPerformanceMetrics();
    }

    // Track navigation timing
    this.trackNavigationTiming();

    // Track resource loading
    this.trackResourceTiming();
  }

  private initializeErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('promise', {
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack
      });
    });

    // Track React errors (if React error boundary is set up)
    window.addEventListener('react-error', (event) => {
      const customEvent = event as CustomEvent;
      this.trackError('react', {
        message: customEvent.detail?.message,
        stack: customEvent.detail?.stack,
        componentStack: customEvent.detail?.componentStack
      });
    });
  }

  private initializeInteractionTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.trackInteraction('click', {
          element: this.getElementSelector(target),
          text: target.textContent?.slice(0, 50),
          tagName: target.tagName,
          className: target.className,
          id: target.id
        });
      }
    }, { passive: true });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form) {
        this.trackInteraction('form-submit', {
          element: this.getElementSelector(form),
          action: form.action,
          method: form.method,
          inputs: Array.from(form.elements).filter(el => el.tagName === 'INPUT').length
        });
      }
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollDepth = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        this.trackInteraction('scroll', {
          depth: scrollDepth,
          maxDepth: maxScrollDepth
        });
      }
    }, { passive: true });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackInteraction('visibility-change', {
        state: document.visibilityState,
        timestamp: Date.now()
      });
    });
  }

  private trackWebVitals(): void {
    // Import web-vitals dynamically
    import('web-vitals').then((webVitals) => {
      // Use the correct API from web-vitals v3+
      webVitals.onCLS((metric) => this.trackMetric('CLS', metric.value, 'web-vitals'));
      webVitals.onFCP((metric) => this.trackMetric('FCP', metric.value, 'web-vitals'));
      webVitals.onLCP((metric) => this.trackMetric('LCP', metric.value, 'web-vitals'));
      webVitals.onTTFB((metric) => this.trackMetric('TTFB', metric.value, 'web-vitals'));

      // FID is deprecated in favor of INP in newer versions
      if (webVitals.onINP) {
        webVitals.onINP((metric) => this.trackMetric('INP', metric.value, 'web-vitals'));
      }
    }).catch(() => {
      // Fallback if web-vitals not available
      this.trackBasicPerformanceMetrics();
    });
  }

  private trackBasicPerformanceMetrics(): void {
    // Basic performance metrics without web-vitals library
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      this.trackMetric('dom-content-loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, 'navigation');
      this.trackMetric('load-complete', navigation.loadEventEnd - navigation.loadEventStart, 'navigation');
      this.trackMetric('first-paint', performance.getEntriesByName('first-paint')[0]?.startTime || 0, 'navigation');
      this.trackMetric('first-contentful-paint', performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0, 'navigation');
    }
  }

  private trackNavigationTiming(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      this.trackMetric('dns-lookup', navigation.domainLookupEnd - navigation.domainLookupStart, 'navigation');
      this.trackMetric('tcp-connect', navigation.connectEnd - navigation.connectStart, 'navigation');
      this.trackMetric('server-response', navigation.responseEnd - navigation.requestStart, 'navigation');
      this.trackMetric('page-load', navigation.loadEventEnd - navigation.fetchStart, 'navigation');
    }
  }

  private trackResourceTiming(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        this.trackMetric(`resource-${resourceEntry.name.split('/').pop()}`, resourceEntry.responseEnd - resourceEntry.startTime, 'resource');
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private trackPageView(): void {
    this.trackInteraction('page-view', {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
      timestamp: Date.now()
    });
  }

  private trackInteraction(type: UserInteraction['type'], metadata: Record<string, any>): void {
    const interaction: UserInteraction = {
      type,
      timestamp: Date.now(),
      metadata
    };

    this.interactions.push(interaction);

    // Send immediately for important interactions
    if (['form-submit', 'navigation'].includes(type)) {
      this.sendData('interaction', interaction);
    }
  }

  private trackMetric(name: string, value: number, category: PerformanceMetric['category']): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category
    };

    this.metrics.push(metric);
  }

  private trackError(type: string, details: Record<string, any>): void {
    this.sendData('error', {
      type,
      details,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;

    const path: string[] = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`;
      }

      path.unshift(selector);
      current = current.parentElement!;

      if (path.length > 5) break; // Limit depth
    }

    return path.join(' > ');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendBatch(): Promise<void> {
    if (this.interactions.length === 0 && this.metrics.length === 0) return;

    const batch = {
      sessionId: this.sessionId,
      userId: this.userId,
      interactions: [...this.interactions],
      metrics: [...this.metrics],
      timestamp: Date.now()
    };

    // Clear arrays after sending
    this.interactions = [];
    this.metrics = [];

    await this.sendData('batch', batch);
  }

  private async sendData(type: string, data: any): Promise<void> {
    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-RUM-Type': type,
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(data),
        keepalive: true // Allow sending after page unload
      });
    } catch (error) {
      logger.error('Failed to send RUM data:', { component: 'RUMService' }, error);
      // Store failed requests for retry
      this.storeFailedRequest(type, data);
    }
  }

  private storeFailedRequest(type: string, data: any): void {
    try {
      const failedRequests = JSON.parse(localStorage.getItem('rum-failed-requests') || '[]');
      failedRequests.push({ type, data, timestamp: Date.now() });

      // Keep only last 50 failed requests
      if (failedRequests.length > 50) {
        failedRequests.splice(0, failedRequests.length - 50);
      }

      localStorage.setItem('rum-failed-requests', JSON.stringify(failedRequests));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  // Public API
  public trackCustomEvent(name: string, data: Record<string, any>): void {
    this.trackInteraction('custom', { name, ...data });
  }

  public trackCustomMetric(name: string, value: number): void {
    this.trackMetric(name, value, 'custom');
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public destroy(): void {
    // Clean up event listeners and observers
    this.isInitialized = false;
    logger.info('RUM Service destroyed', { component: 'RUMService' });
  }
}

// Configuration - should be set via environment variables in production
const RUM_CONFIG: RUMConfig = {
  endpoint: process.env.VITE_RUM_ENDPOINT || 'https://rum-api.example.com/v1/events',
  apiKey: process.env.VITE_RUM_API_KEY || 'development-key',
  sampleRate: parseFloat(process.env.VITE_RUM_SAMPLE_RATE || '0.1'),
  enableUserTracking: true,
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  enableInteractionTracking: true
};

// Create singleton instance
export const rumService = new RUMService(RUM_CONFIG);

// Export for use in components
export default rumService;