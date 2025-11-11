/**
 * Real User Monitoring (RUM) Integration
 * Tracks user interactions, performance metrics, and sends data to monitoring service
 * 
 * This service provides comprehensive monitoring of user experience, including:
 * - Core Web Vitals (LCP, FID/INP, CLS)
 * - User interactions (clicks, scrolls, form submissions)
 * - JavaScript errors and unhandled promise rejections
 * - Resource loading performance
 * - Navigation timing metrics
 */

import { logger } from './logger';
import type { Metric } from 'web-vitals';

// Configuration interface for RUM service initialization
interface RUMConfig {
  endpoint: string;
  apiKey: string;
  sampleRate: number; // Percentage of sessions to monitor (0.0 to 1.0)
  enableUserTracking: boolean;
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  enableInteractionTracking: boolean;
}

// User interaction event types and metadata
interface UserInteraction {
  type: 'click' | 'scroll' | 'navigation' | 'form-submit' | 'page-view' | 'visibility-change' | 'custom';
  element?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// Performance metric with categorization
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'web-vitals' | 'navigation' | 'resource' | 'custom';
  rating?: 'good' | 'needs-improvement' | 'poor';
}

// Error details structure
interface ErrorDetails {
  type: string;
  details: Record<string, unknown>;
  url: string;
  timestamp: number;
  userAgent: string;
  sessionId: string;
  userId?: string;
}

/**
 * RUM Service Class
 * 
 * This singleton service monitors user experience and sends telemetry data
 * to a remote endpoint for analysis. It implements sampling to reduce load
 * and includes fallback mechanisms for when data transmission fails.
 */
class RUMService {
  private config: RUMConfig;
  private sessionId: string;
  private userId?: string;
  private interactions: UserInteraction[] = [];
  private metrics: PerformanceMetric[] = [];
  private isInitialized = false;
  private batchIntervalId?: number;
  private performanceObserver?: PerformanceObserver;
  private scrollTimer?: number;
  private maxScrollDepth = 0;

  constructor(config: RUMConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();

    // Only initialize if this session is selected for monitoring
    // This implements sampling to reduce monitoring overhead
    if (Math.random() <= this.config.sampleRate) {
      this.initialize();
    } else {
      logger.debug('Session not selected for RUM monitoring', { component: 'RUMService' });
    }
  }

  /**
   * Initialize all monitoring subsystems based on configuration
   */
  private initialize(): void {
    if (this.isInitialized) {
      logger.warn('RUM Service already initialized', { component: 'RUMService' });
      return;
    }

    logger.info('🚀 Initializing RUM Service', { 
      component: 'RUMService',
      sessionId: this.sessionId 
    });

    // Set up user tracking to identify unique visitors
    if (this.config.enableUserTracking) {
      this.initializeUserTracking();
    }

    // Set up performance tracking for Core Web Vitals and timing metrics
    if (this.config.enablePerformanceTracking) {
      this.initializePerformanceTracking();
    }

    // Set up error tracking to catch unhandled exceptions
    if (this.config.enableErrorTracking) {
      this.initializeErrorTracking();
    }

    // Set up interaction tracking for user behavior analysis
    if (this.config.enableInteractionTracking) {
      this.initializeInteractionTracking();
    }

    // Send initial page view event
    this.trackPageView();

    this.isInitialized = true;

    // Send batched data every 30 seconds to reduce network overhead
    this.batchIntervalId = window.setInterval(() => {
      this.sendBatch().catch(err => {
        logger.error('Batch send failed', { component: 'RUMService' }, err);
      });
    }, 30000);

    // Send final batch before page unload
    this.setupUnloadHandler();

    // Attempt to retry any previously failed requests
    this.retryFailedRequests().catch(err => {
      logger.error('Retry failed', { component: 'RUMService' }, err);
    });
  }

  /**
   * Set up handler to send data before page unload
   */
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // Synchronously send any pending data before page closes
      this.sendBatch().catch(() => {
        // Ignore errors during unload as page is closing
      });
    });

    // Visibility change is more reliable for mobile devices
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendBatch().catch(() => {
          // Ignore errors during visibility change
        });
      }
    });
  }

  /**
   * Initialize user tracking subsystem
   * Generates or retrieves a persistent user ID and collects device information
   */
  private initializeUserTracking(): void {
    try {
      // Generate or retrieve user ID from localStorage for cross-session tracking
      this.userId = this.getStoredUserId() || this.generateUserId();
      this.storeUserId(this.userId);

      // Collect anonymized user information for context
      const userInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        deviceMemory: this.getDeviceMemory(),
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        connectionType: this.getConnectionType()
      };

      this.sendData('user-info', userInfo).catch(err => {
        logger.error('Failed to send user info', { component: 'RUMService' }, err);
      });
    } catch (error) {
      logger.error('Failed to initialize user tracking', { component: 'RUMService' }, error);
    }
  }

  /**
   * Get device memory safely with type checking
   */
  private getDeviceMemory(): number | string {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return nav.deviceMemory ?? 'unknown';
  }

  /**
   * Get connection type safely with type checking
   */
  private getConnectionType(): string {
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    return nav.connection?.effectiveType ?? 'unknown';
  }

  /**
   * Get stored user ID from localStorage
   */
  private getStoredUserId(): string | null {
    try {
      return localStorage.getItem('rum-user-id');
    } catch {
      return null;
    }
  }

  /**
   * Store user ID in localStorage
   */
  private storeUserId(userId: string): void {
    try {
      localStorage.setItem('rum-user-id', userId);
    } catch (error) {
      logger.warn('Failed to store user ID', { component: 'RUMService' });
    }
  }

  /**
   * Initialize performance tracking subsystem
   * Sets up Core Web Vitals monitoring and navigation timing collection
   */
  private initializePerformanceTracking(): void {
    // Track Core Web Vitals using the web-vitals library
    this.trackWebVitals();

    // Track navigation timing for page load performance
    this.trackNavigationTiming();

    // Track resource loading for asset performance analysis
    this.trackResourceTiming();
  }

  /**
   * Initialize error tracking subsystem
   * Captures JavaScript errors, promise rejections, and React errors
   */
  private initializeErrorTracking(): void {
    // Track JavaScript errors with full stack traces
    window.addEventListener('error', (event) => {
      this.trackError('javascript', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || 'No stack trace available'
      });
    });

    // Track unhandled promise rejections which often indicate async errors
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('promise', {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || 'No stack trace available'
      });
    });

    // Track React errors if error boundary dispatches custom events
    window.addEventListener('react-error', (event) => {
      const customEvent = event as CustomEvent;
      this.trackError('react', {
        message: customEvent.detail?.message || 'Unknown React error',
        stack: customEvent.detail?.stack,
        componentStack: customEvent.detail?.componentStack
      });
    });
  }

  /**
   * Initialize interaction tracking subsystem
   * Monitors user clicks, form submissions, scrolling, and visibility changes
   */
  private initializeInteractionTracking(): void {
    // Track clicks with element identification
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.trackInteraction('click', {
          element: this.getElementSelector(target),
          text: target.textContent?.slice(0, 50), // Limit text length for privacy
          tagName: target.tagName,
          className: target.className,
          id: target.id
        });
      }
    }, { passive: true }); // Passive listener for better scroll performance

    // Track form submissions to understand conversion funnels
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

    // Track scroll depth to understand content engagement
    window.addEventListener('scroll', () => {
      this.handleScroll();
    }, { passive: true });

    // Track page visibility changes to understand engagement patterns
    document.addEventListener('visibilitychange', () => {
      this.trackInteraction('visibility-change', {
        state: document.visibilityState,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Handle scroll events with debouncing
   */
  private handleScroll(): void {
    // Debounce scroll events to reduce processing overhead
    if (this.scrollTimer !== undefined) {
      window.clearTimeout(this.scrollTimer);
    }
    
    this.scrollTimer = window.setTimeout(() => {
      const scrollDepth = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollDepth > this.maxScrollDepth) {
        this.maxScrollDepth = scrollDepth;
        // Only track at 25% intervals to reduce noise
        if (scrollDepth % 25 === 0 || scrollDepth > 90) {
          this.trackInteraction('scroll', {
            depth: scrollDepth,
            maxDepth: this.maxScrollDepth
          });
        }
      }
    }, 150);
  }

  /**
   * Track Core Web Vitals using the web-vitals library
   * Falls back to basic metrics if the library is unavailable
   */
  private trackWebVitals(): void {
    // Dynamically import web-vitals to avoid bundling if monitoring is disabled
    import('web-vitals')
      .then((webVitals) => {
        // Helper function to handle metric callbacks
        const handleMetric = (metric: unknown) => {
          const m = metric as Metric & { rating?: 'good' | 'needs-improvement' | 'poor' };
          this.trackMetric(
            m.name,
            m.value,
            'web-vitals',
            m.rating
          );
        };

        // CLS: Cumulative Layout Shift - measures visual stability
        webVitals.onCLS(handleMetric);

        // FCP: First Contentful Paint - measures perceived load speed
        webVitals.onFCP(handleMetric);

        // LCP: Largest Contentful Paint - measures load performance
        webVitals.onLCP(handleMetric);

        // TTFB: Time to First Byte - measures server response time
        webVitals.onTTFB(handleMetric);

        // INP: Interaction to Next Paint - measures responsiveness (replaces FID)
        webVitals.onINP(handleMetric);

        logger.info('Web Vitals tracking initialized', { component: 'RUMService' });
      })
      .catch((error) => {
        // Gracefully fall back to basic metrics if web-vitals isn't available
        logger.warn('Web Vitals library not available, using fallback metrics', { 
          component: 'RUMService',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.trackBasicPerformanceMetrics();
      });
  }

  /**
   * Track basic performance metrics without web-vitals library
   * This provides fallback metrics when the web-vitals library is unavailable
   */
  private trackBasicPerformanceMetrics(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

      if (navigation) {
        // DOM Content Loaded - when HTML is parsed and DOM is ready
        this.trackMetric(
          'dom-content-loaded',
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          'navigation'
        );

        // Load Complete - when all resources have finished loading
        this.trackMetric(
          'load-complete',
          navigation.loadEventEnd - navigation.loadEventStart,
          'navigation'
        );

        // First Paint - when browser first renders any pixels
        const firstPaint = performance.getEntriesByName('first-paint')[0];
        if (firstPaint) {
          this.trackMetric('first-paint', firstPaint.startTime, 'navigation');
        }

        // First Contentful Paint - when browser renders first content
        const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];
        if (firstContentfulPaint) {
          this.trackMetric('first-contentful-paint', firstContentfulPaint.startTime, 'navigation');
        }
      }
    } catch (error) {
      logger.error('Failed to track basic performance metrics', { component: 'RUMService' }, error);
    }
  }

  /**
   * Track detailed navigation timing metrics
   * Breaks down the page load process into individual phases
   */
  private trackNavigationTiming(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

      if (navigation) {
        // DNS lookup time - how long DNS resolution took
        this.trackMetric(
          'dns-lookup',
          navigation.domainLookupEnd - navigation.domainLookupStart,
          'navigation'
        );

        // TCP connection time - how long establishing connection took
        this.trackMetric(
          'tcp-connect',
          navigation.connectEnd - navigation.connectStart,
          'navigation'
        );

        // Server response time - how long the server took to respond
        this.trackMetric(
          'server-response',
          navigation.responseEnd - navigation.requestStart,
          'navigation'
        );

        // Total page load time - from navigation start to load complete
        this.trackMetric(
          'page-load',
          navigation.loadEventEnd - navigation.fetchStart,
          'navigation'
        );
      }
    } catch (error) {
      logger.error('Failed to track navigation timing', { component: 'RUMService' }, error);
    }
  }

  /**
   * Track resource loading performance
   * Monitors how long it takes to load images, scripts, stylesheets, etc.
   */
  private trackResourceTiming(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          // Extract filename from URL for cleaner metric names
          const resourceName = resourceEntry.name.split('/').pop() || 'unknown';
          const duration = resourceEntry.responseEnd - resourceEntry.startTime;
          
          // Only track resources that took more than 50ms to avoid noise
          if (duration > 50) {
            this.trackMetric(
              `resource-${resourceName.slice(0, 50)}`, // Limit name length
              duration,
              'resource'
            );
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.error('Failed to initialize resource timing observer', { component: 'RUMService' }, error);
    }
  }

  /**
   * Track page view event with URL and referrer information
   */
  private trackPageView(): void {
    this.trackInteraction('page-view', {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
      timestamp: Date.now()
    });
  }

  /**
   * Track user interaction event
   * Buffers interactions and sends them in batches unless they're critical
   */
  private trackInteraction(type: UserInteraction['type'], metadata: Record<string, unknown>): void {
    const interaction: UserInteraction = {
      type,
      timestamp: Date.now(),
      metadata
    };

    this.interactions.push(interaction);

    // Limit buffer size to prevent memory issues
    if (this.interactions.length > 1000) {
      this.interactions.shift(); // Remove oldest interaction
    }

    // Send immediately for important interactions that indicate user intent
    if (['form-submit', 'navigation'].includes(type)) {
      this.sendData('interaction', interaction).catch(err => {
        logger.error('Failed to send critical interaction', { component: 'RUMService' }, err);
      });
    }
  }

  /**
   * Track performance metric
   * Buffers metrics for batched sending to reduce network overhead
   */
  private trackMetric(
    name: string, 
    value: number, 
    category: PerformanceMetric['category'],
    rating?: 'good' | 'needs-improvement' | 'poor'
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      rating
    };

    this.metrics.push(metric);

    // Limit buffer size to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics.shift(); // Remove oldest metric
    }

    logger.debug('Tracked metric', { 
      component: 'RUMService',
      metric: name,
      value,
      category,
      rating
    });
  }

  /**
   * Track error event with full context
   * Sends immediately as errors are high-priority events
   */
  private trackError(type: string, details: Record<string, unknown>): void {
    const errorData: ErrorDetails = {
      type,
      details,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.sendData('error', errorData).catch(err => {
      logger.error('Failed to send error data', { component: 'RUMService' }, err);
    });
  }

  /**
   * Generate a CSS selector for an HTML element
   * Creates a path from the element to the document root for identification
   */
  private getElementSelector(element: HTMLElement): string {
    // If element has ID, that's the most specific selector
    if (element.id) return `#${element.id}`;
    
    // If element has class, use the first class
    if (element.className && typeof element.className === 'string') {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) return `.${firstClass}`;
    }

    // Build a path from element to root
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();

      if (current.id) {
        // Stop at the first ID since that's unique
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else if (current.className && typeof current.className === 'string') {
        // Add classes for more specificity
        const classes = current.className.split(' ').filter(c => c).join('.');
        if (classes) selector += `.${classes}`;
      }

      path.unshift(selector);
      current = current.parentElement;

      // Limit depth to avoid extremely long selectors
      if (path.length > 5) break;
    }

    return path.join(' > ');
  }

  /**
   * Generate unique session ID
   * Uses timestamp and random string for uniqueness
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique user ID
   * Uses timestamp and random string for uniqueness
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Send batched interactions and metrics
   * Clears buffers after successful send
   */
  private async sendBatch(): Promise<void> {
    if (this.interactions.length === 0 && this.metrics.length === 0) return;

    const batch = {
      sessionId: this.sessionId,
      userId: this.userId,
      interactions: [...this.interactions],
      metrics: [...this.metrics],
      timestamp: Date.now()
    };

    // Clear arrays after copying to prevent duplicate sends
    this.interactions = [];
    this.metrics = [];

    await this.sendData('batch', batch);
  }

  /**
   * Send data to monitoring endpoint
   * Includes retry logic for failed requests
   */
  private async sendData(type: string, data: unknown): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-RUM-Type': type,
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(data),
        // keepalive allows sending even after page unload
        keepalive: true
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.debug('RUM data sent successfully', { 
        component: 'RUMService',
        type 
      });
    } catch (error) {
      logger.error('Failed to send RUM data', { 
        component: 'RUMService',
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Store failed requests for retry on next session
      this.storeFailedRequest(type, data);
    }
  }

  /**
   * Store failed request in localStorage for retry
   * Maintains a limited buffer to prevent storage overflow
   */
  private storeFailedRequest(type: string, data: unknown): void {
    try {
      const storedRequests = localStorage.getItem('rum-failed-requests');
      const failedRequests = storedRequests ? JSON.parse(storedRequests) : [];
      
      failedRequests.push({ type, data, timestamp: Date.now() });

      // Keep only last 50 failed requests to prevent storage bloat
      if (failedRequests.length > 50) {
        failedRequests.splice(0, failedRequests.length - 50);
      }

      localStorage.setItem('rum-failed-requests', JSON.stringify(failedRequests));
    } catch (error) {
      // Silently ignore localStorage errors (quota exceeded, private browsing, etc.)
      logger.warn('Failed to store failed request', { 
        component: 'RUMService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Retry previously failed requests
   * Called on initialization to clear backlog
   */
  private async retryFailedRequests(): Promise<void> {
    try {
      const storedRequests = localStorage.getItem('rum-failed-requests');
      const failedRequests = storedRequests ? JSON.parse(storedRequests) : [];
      
      if (failedRequests.length === 0) return;

      logger.info(`Retrying ${failedRequests.length} failed requests`, { component: 'RUMService' });

      // Retry each failed request
      const retryPromises = failedRequests.map((request: { type: string; data: unknown }) => 
        this.sendData(request.type, request.data)
      );

      await Promise.allSettled(retryPromises);

      // Clear after retry attempt (regardless of success)
      localStorage.removeItem('rum-failed-requests');
    } catch (error) {
      logger.error('Failed to retry failed requests', { component: 'RUMService' }, error);
    }
  }

  // Public API for custom tracking

  /**
   * Track custom event with arbitrary data
   * Useful for application-specific events
   */
  public trackCustomEvent(name: string, data: Record<string, unknown>): void {
    if (!this.isInitialized) {
      logger.warn('Cannot track event - RUM service not initialized', { component: 'RUMService' });
      return;
    }
    this.trackInteraction('custom', { name, ...data });
  }

  /**
   * Track custom metric with numeric value
   * Useful for application-specific performance metrics
   */
  public trackCustomMetric(name: string, value: number): void {
    if (!this.isInitialized) {
      logger.warn('Cannot track metric - RUM service not initialized', { component: 'RUMService' });
      return;
    }
    this.trackMetric(name, value, 'custom');
  }

  /**
   * Set user ID for tracking authenticated users
   * Call this after user login to associate events with user
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    this.storeUserId(userId);
  }

  /**
   * Clean up and destroy RUM service
   * Removes event listeners and observers, sends final batch
   */
  public async destroy(): Promise<void> {
    // Send final batch before cleanup
    await this.sendBatch().catch(err => {
      logger.error('Failed to send final batch', { component: 'RUMService' }, err);
    });

    // Clean up interval
    if (this.batchIntervalId !== undefined) {
      window.clearInterval(this.batchIntervalId);
    }

    // Clean up scroll timer
    if (this.scrollTimer !== undefined) {
      window.clearTimeout(this.scrollTimer);
    }

    // Clean up performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.isInitialized = false;
    logger.info('RUM Service destroyed', { component: 'RUMService' });
  }
}

// Configuration - environment variables should be set in production
const RUM_CONFIG: RUMConfig = {
  endpoint: import.meta.env.VITE_RUM_ENDPOINT || 'https://rum-api.example.com/v1/events',
  apiKey: import.meta.env.VITE_RUM_API_KEY || 'development-key',
  sampleRate: parseFloat(import.meta.env.VITE_RUM_SAMPLE_RATE || '0.1'),
  enableUserTracking: true,
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  enableInteractionTracking: true
};

// Create singleton instance
export const rumService = new RUMService(RUM_CONFIG);

// Export for use in components
export default rumService;