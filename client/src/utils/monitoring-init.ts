/**
 * Monitoring Initialization Utility
 * 
 * Initializes all monitoring services for production deployment:
 * - Error monitoring (Sentry)
 * - Performance monitoring (RUM)
 * - User analytics
 * - Custom metrics collection
 */

import { errorMonitoring } from '@client/services/error-monitoring';
import { performanceMonitoring } from '@client/services/performance-monitoring';

interface MonitoringConfig {
  environment: string;
  version: string;
  userId?: string;
  enableErrorMonitoring: boolean;
  enablePerformanceMonitoring: boolean;
  enableAnalytics: boolean;
  sentry?: {
    dsn: string;
    tracesSampleRate?: number;
    replaysSessionSampleRate?: number;
    replaysOnErrorSampleRate?: number;
  };
  datadog?: {
    applicationId: string;
    clientToken: string;
    site?: string;
    sessionSampleRate?: number;
  };
}

class MonitoringInitializer {
  private config: MonitoringConfig;
  private initialized = false;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('Monitoring already initialized');
      return;
    }

    console.log('🔧 Initializing monitoring services...');

    try {
      // Initialize error monitoring
      if (this.config.enableErrorMonitoring && this.config.sentry?.dsn) {
        await this.initializeErrorMonitoring();
      }

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        await this.initializePerformanceMonitoring();
      }

      // Initialize analytics
      if (this.config.enableAnalytics && this.config.datadog) {
        await this.initializeAnalytics();
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up performance observers
      this.setupPerformanceObservers();

      // Set up user interaction tracking
      this.setupUserInteractionTracking();

      this.initialized = true;
      console.log('✅ Monitoring services initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      throw error;
    }
  }

  /**
   * Initialize Sentry error monitoring
   */
  private async initializeErrorMonitoring(): Promise<void> {
    console.log('🐛 Initializing error monitoring...');

    errorMonitoring.initialize({
      dsn: this.config.sentry!.dsn,
      environment: this.config.environment,
      release: this.config.version,
      tracesSampleRate: this.config.sentry?.tracesSampleRate || 0.1,
      replaysSessionSampleRate: this.config.sentry?.replaysSessionSampleRate || 0.1,
      replaysOnErrorSampleRate: this.config.sentry?.replaysOnErrorSampleRate || 1.0
    });

    // Set initial context
    if (this.config.userId) {
      errorMonitoring.setUserContext({
        id: this.config.userId,
        sessionId: this.generateSessionId()
      });
    }

    errorMonitoring.setFeatureContext('monitoring-init', 'initialize');
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    console.log('⚡ Initializing performance monitoring...');

    performanceMonitoring.initialize({
      reportingEndpoint: '/api/performance/metrics',
      batchSize: 10,
      reportingInterval: 30000,
      userId: this.config.userId
    });

    // Track initial page load
    performanceMonitoring.trackPageView(window.location.pathname, document.referrer);
  }

  /**
   * Initialize Datadog RUM analytics
   */
  private async initializeAnalytics(): Promise<void> {
    console.log('📊 Initializing analytics...');

    // Dynamically import Datadog RUM
    const { datadogRum } = await import('@datadog/browser-rum');

    datadogRum.init({
      applicationId: this.config.datadog!.applicationId,
      clientToken: this.config.datadog!.clientToken,
      site: (this.config.datadog?.site as any) || 'datadoghq.com',
      service: 'chanuka-client',
      env: this.config.environment,
      version: this.config.version,
      sessionSampleRate: this.config.datadog?.sessionSampleRate || 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input'
    });

    // Set user context if available
    if (this.config.userId) {
      datadogRum.setUser({
        id: this.config.userId
      });
    }

    datadogRum.startSessionReplayRecording();
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      errorMonitoring.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          feature: 'global-error-handler',
          action: 'unhandled-rejection',
          metadata: {
            reason: event.reason,
            promise: event.promise
          }
        }
      );
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      errorMonitoring.captureError(
        event.error || new Error(event.message),
        {
          feature: 'global-error-handler',
          action: 'javascript-error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      );
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        errorMonitoring.captureError(
          new Error(`Resource loading failed: ${target.tagName}`),
          {
            feature: 'resource-loading',
            action: 'load-error',
            metadata: {
              tagName: target.tagName,
              src: (target as any).src || (target as any).href,
              currentSrc: (target as any).currentSrc
            }
          }
        );
      }
    }, true);
  }

  /**
   * Set up performance observers
   */
  private setupPerformanceObservers(): void {
    // Long task observer
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              performanceMonitoring.recordCustomMetric({
                name: 'long_task',
                value: entry.duration,
                unit: 'milliseconds',
                context: {
                  startTime: entry.startTime,
                  name: entry.name
                },
                timestamp: Date.now()
              });
            }
          }
        });

        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }

      // Navigation observer
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const navEntry = entry as PerformanceNavigationTiming;
            
            performanceMonitoring.recordCustomMetric({
              name: 'navigation_timing',
              value: navEntry.loadEventEnd - (navEntry as any).navigationStart,
              unit: 'milliseconds',
              context: {
                type: navEntry.type,
                redirectCount: navEntry.redirectCount,
                transferSize: navEntry.transferSize
              },
              timestamp: Date.now()
            });
          }
        });

        navigationObserver.observe({ type: 'navigation', buffered: true });
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }
  }

  /**
   * Set up user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const id = target.id;
      const className = target.className;

      // Track important interactions
      if (['button', 'a', 'input'].includes(tagName) || target.getAttribute('role') === 'button') {
        performanceMonitoring.trackInteraction(
          'click',
          `${tagName}${id ? `#${id}` : ''}${className ? `.${className.split(' ')[0]}` : ''}`
        );

        errorMonitoring.addBreadcrumb(
          `User clicked ${tagName}${id ? ` #${id}` : ''}`,
          'user',
          'info',
          { tagName, id, className }
        );
      }
    });

    // Form submission tracking
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || form.name || 'unnamed-form';

      performanceMonitoring.trackInteraction('form-submit', formId);
      
      errorMonitoring.addBreadcrumb(
        `Form submitted: ${formId}`,
        'user',
        'info',
        { formId, action: form.action, method: form.method }
      );
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      const state = document.visibilityState;
      
      performanceMonitoring.recordCustomMetric({
        name: 'page_visibility_change',
        value: state === 'visible' ? 1 : 0,
        unit: 'boolean',
        context: { state },
        timestamp: Date.now()
      });

      errorMonitoring.addBreadcrumb(
        `Page visibility changed to ${state}`,
        'navigation',
        'info',
        { state }
      );
    });
  }

  /**
   * Update user context
   */
  updateUserContext(userId: string, userInfo?: Record<string, any>): void {
    this.config.userId = userId;

    if (this.config.enableErrorMonitoring) {
      errorMonitoring.setUserContext({
        id: userId,
        ...userInfo
      });
    }

    if (this.config.enableAnalytics && window.DD_RUM) {
      window.DD_RUM.setUser({
        id: userId,
        ...userInfo
      });
    }
  }

  /**
   * Track custom business events
   */
  trackBusinessEvent(eventName: string, properties?: Record<string, any>): void {
    performanceMonitoring.recordCustomMetric({
      name: `business_event_${eventName}`,
      value: 1,
      unit: 'count',
      context: properties,
      timestamp: Date.now()
    });

    errorMonitoring.addBreadcrumb(
      `Business event: ${eventName}`,
      'business',
      'info',
      properties
    );

    if (window.DD_RUM) {
      window.DD_RUM.addAction(eventName, properties);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    initialized: boolean;
    errorMonitoring: boolean;
    performanceMonitoring: boolean;
    analytics: boolean;
  } {
    return {
      initialized: this.initialized,
      errorMonitoring: this.config.enableErrorMonitoring && !!this.config.sentry?.dsn,
      performanceMonitoring: this.config.enablePerformanceMonitoring,
      analytics: this.config.enableAnalytics && !!this.config.datadog
    };
  }
}

// Create and export monitoring instance
let monitoringInstance: MonitoringInitializer | null = null;

export function initializeMonitoring(config: MonitoringConfig): Promise<void> {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringInitializer(config);
  }
  return monitoringInstance.initialize();
}

export function getMonitoringInstance(): MonitoringInitializer | null {
  return monitoringInstance;
}

// Auto-initialize in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const config: MonitoringConfig = {
    environment: process.env.NODE_ENV,
    version: process.env.BUILD_VERSION || 'unknown',
    enableErrorMonitoring: !!import.meta.env.VITE_SENTRY_DSN,
    enablePerformanceMonitoring: true,
    enableAnalytics: !!(import.meta.env.VITE_DATADOG_APPLICATION_ID && import.meta.env.VITE_DATADOG_CLIENT_TOKEN),
    sentry: import.meta.env.VITE_SENTRY_DSN ? {
      dsn: import.meta.env.VITE_SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    } : undefined,
    datadog: (import.meta.env.VITE_DATADOG_APPLICATION_ID && import.meta.env.VITE_DATADOG_CLIENT_TOKEN) ? {
      applicationId: import.meta.env.VITE_DATADOG_APPLICATION_ID,
      clientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
      site: 'datadoghq.com',
      sessionSampleRate: 100
    } : undefined
  };

  // Initialize monitoring after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeMonitoring(config).catch(console.error);
    });
  } else {
    initializeMonitoring(config).catch(console.error);
  }
}

export default MonitoringInitializer;