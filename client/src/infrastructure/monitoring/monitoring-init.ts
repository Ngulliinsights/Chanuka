/**
 * Monitoring Initialization Utility - Optimized
 *
 * Production-grade monitoring with:
 * - Type-safe configuration
 * - Proper cleanup mechanisms
 * - Modular service initialization
 * - Enhanced error handling
 * - Performance optimization
 */

import { ErrorMonitor } from '../../infrastructure/monitoring/error-monitor';

import type {
  SentryConfig,
  DatadogConfig,
  MonitoringConfig,
  UserContext,
  MonitoringStatus,
  ServiceStatus,
} from '@client/lib/types/monitoring';

declare global {
  interface Window {
    DD_RUM?: any;
  }
}

interface EventHandler {
  element: EventTarget;
  event: string;
  handler: EventListener;
  options?: AddEventListenerOptions;
}

// ============================================================================
// Monitoring Initializer Class
// ============================================================================

class MonitoringInitializer {
  private config: MonitoringConfig;
  private initialized = false;
  private errorMonitoring?: ErrorMonitor;
  private sessionId: string;
  private eventHandlers: EventHandler[] = [];
  private observers: PerformanceObserver[] = [];
  private serviceStatus: MonitoringStatus['services'] = {
    sentry: { enabled: false, initialized: false },
    datadog: { enabled: false, initialized: false },
    performance: { enabled: false, initialized: false },
  };

  constructor(config: MonitoringConfig) {
    this.validateConfig(config);
    this.config = config;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: MonitoringConfig): void {
    if (!config.environment) {
      throw new Error('Monitoring config must include environment');
    }
    if (!config.version) {
      throw new Error('Monitoring config must include version');
    }
    if (config.enableErrorMonitoring && !config.sentry?.dsn) {
      console.warn('Error monitoring enabled but no Sentry DSN provided');
    }
    if (
      config.enableAnalytics &&
      (!config.datadog?.applicationId || !config.datadog?.clientToken)
    ) {
      console.warn('Analytics enabled but Datadog config incomplete');
    }
  }

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('warn', 'Monitoring already initialized');
      return;
    }

    this.log('info', '🔧 Initializing monitoring services...');

    const initPromises: Promise<void>[] = [];

    // Initialize services in parallel with individual error handling
    if (this.config.enableErrorMonitoring && this.config.sentry?.dsn) {
      initPromises.push(this.initializeErrorMonitoring());
    }

    if (this.config.enablePerformanceMonitoring) {
      initPromises.push(this.initializePerformanceMonitoring());
    }

    if (this.config.enableAnalytics && this.config.datadog) {
      initPromises.push(this.initializeAnalytics());
    }

    // Wait for all services to initialize (with individual error handling)
    await Promise.allSettled(initPromises);

    // Set up global handlers
    this.setupGlobalErrorHandlers();
    this.setupPerformanceObservers();
    this.setupUserInteractionTracking();

    this.initialized = true;
    this.log('info', '✅ Monitoring services initialized successfully');
  }

  /**
   * Initialize Sentry error monitoring
   */
  private async initializeErrorMonitoring(): Promise<void> {
    try {
      this.log('info', '🐛 Initializing error monitoring...');

      this.errorMonitoring = new ErrorMonitor();
      await this.errorMonitoring.initialize();

      // Set initial context
      if (this.config.userId) {
        this.errorMonitoring.setUserContext({
          id: this.config.userId,
          sessionId: this.sessionId,
        });
      }

      this.errorMonitoring.setFeatureContext('monitoring-init', 'initialize');

      this.serviceStatus.sentry = { enabled: true, initialized: true };
      this.log('info', '✅ Error monitoring initialized');
    } catch (error) {
      this.serviceStatus.sentry = {
        enabled: true,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.log('error', '❌ Failed to initialize error monitoring:', error);
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      this.log('info', '⚡ Initializing performance monitoring...');

      // Track initial page load performance
      this.trackInitialPageLoad();

      // Set up web vitals tracking
      this.setupWebVitalsTracking();

      this.serviceStatus.performance = { enabled: true, initialized: true };
      this.log('info', '✅ Performance monitoring initialized');
    } catch (error) {
      this.serviceStatus.performance = {
        enabled: true,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.log('error', '❌ Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Initialize Datadog RUM analytics
   */
  private async initializeAnalytics(): Promise<void> {
    try {
      this.log('info', '📊 Initializing analytics...');

      const { datadogRum } = await import('@datadog/browser-rum');

      datadogRum.init({
        applicationId: this.config.datadog!.applicationId,
        clientToken: this.config.datadog!.clientToken,
        site: (this.config.datadog?.site as any) ?? 'datadoghq.com',
        service: 'chanuka-client',
        env: this.config.environment,
        version: this.config.version,
        sessionSampleRate: this.config.datadog?.sessionSampleRate ?? 100,
        sessionReplaySampleRate: this.config.datadog?.sessionReplaySampleRate ?? 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      // Set user context if available
      if (this.config.userId) {
        datadogRum.setUser({ id: this.config.userId });
      }

      datadogRum.startSessionReplayRecording();

      this.serviceStatus.datadog = { enabled: true, initialized: true };
      this.log('info', '✅ Analytics initialized');
    } catch (error) {
      this.serviceStatus.datadog = {
        enabled: true,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.log('error', '❌ Failed to initialize analytics:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      this.errorMonitoring?.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          feature: 'global-error-handler',
          action: 'unhandled-rejection',
          metadata: {
            reason: String(event.reason),
            promise: event.promise.toString(),
          },
        }
      );
    };

    // Global JavaScript errors
    const errorHandler = (event: ErrorEvent) => {
      this.errorMonitoring?.captureError(event.error ?? new Error(event.message), {
        feature: 'global-error-handler',
        action: 'javascript-error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message,
        },
      });
    };

    // Resource loading errors (capture phase)
    const resourceErrorHandler = (event: Event) => {
      const target = event.target;
      if (target && target !== window) {
        const element = target as HTMLElement;
        this.errorMonitoring?.captureError(
          new Error(`Resource loading failed: ${element.tagName}`),
          {
            feature: 'resource-loading',
            action: 'load-error',
            metadata: {
              tagName: element.tagName,
              src: this.getElementSrc(element),
              currentSrc: this.getElementCurrentSrc(element),
            },
          }
        );
      }
    };

    this.addEventHandler(window, 'unhandledrejection', unhandledRejectionHandler as EventListener);
    this.addEventHandler(window, 'error', errorHandler as EventListener);
    this.addEventHandler(window, 'error', resourceErrorHandler, { capture: true });
  }

  /**
   * Set up performance observers
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      this.log('warn', 'PerformanceObserver not supported');
      return;
    }

    // Long task observer
    this.createPerformanceObserver('longtask', entries => {
      for (const entry of entries) {
        if (entry.duration > 50) {
          this.trackLongTask(entry);
        }
      }
    });

    // Layout shift observer (CLS)
    this.createPerformanceObserver('layout-shift', entries => {
      for (const entry of entries) {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          this.trackLayoutShift(entry);
        }
      }
    });

    // Largest Contentful Paint
    this.createPerformanceObserver('largest-contentful-paint', entries => {
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.trackLCP(lastEntry);
      }
    });

    // First Input Delay
    this.createPerformanceObserver('first-input', entries => {
      const firstInput = entries[0];
      if (firstInput) {
        this.trackFID(firstInput);
      }
    });
  }

  /**
   * Create and register a performance observer
   */
  private createPerformanceObserver(
    type: string,
    callback: (entries: PerformanceEntryList) => void
  ): void {
    try {
      const observer = new PerformanceObserver(list => {
        callback(list.getEntries());
      });

      observer.observe({ type, buffered: true } as PerformanceObserverInit);
      this.observers.push(observer);
    } catch (error) {
      this.log('warn', `${type} observer not supported:`, error);
    }
  }

  /**
   * Set up user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    // Click tracking
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const tagName = target.tagName.toLowerCase();
      const id = target.id;
      const className = target.className;

      // Track important interactions
      if (this.isImportantElement(target, tagName)) {
        const elementId = this.getElementIdentifier(target, tagName, id, className);

        this.errorMonitoring?.addBreadcrumb(
          `User clicked ${tagName}${id ? ` #${id}` : ''}`,
          'user',
          'info',
          { tagName, id, className, elementId }
        );

        this.trackInteraction('click', elementId);
      }
    };

    // Form submission tracking
    const submitHandler = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || form.name || 'unnamed-form';

      this.errorMonitoring?.addBreadcrumb(`Form submitted: ${formId}`, 'user', 'info', {
        formId,
        action: form.action,
        method: form.method,
      });

      this.trackInteraction('form-submit', formId);
    };

    // Page visibility changes
    const visibilityHandler = () => {
      const state = document.visibilityState;

      this.errorMonitoring?.addBreadcrumb(
        `Page visibility changed to ${state}`,
        'navigation',
        'info',
        { state, timestamp: Date.now() }
      );

      this.trackVisibilityChange(state);
    };

    this.addEventHandler(document, 'click', clickHandler as EventListener);
    this.addEventHandler(document, 'submit', submitHandler as EventListener);
    this.addEventHandler(document, 'visibilitychange', visibilityHandler);
  }

  /**
   * Track initial page load performance
   */
  private trackInitialPageLoad(): void {
    if (!window.performance || !window.performance.timing) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstPaint = this.getFirstPaint();

        this.log('info', 'Page Load Metrics:', {
          loadTime,
          domReady,
          firstPaint,
        });

        this.trackPageLoadMetrics({ loadTime, domReady, firstPaint });
      }, 0);
    });
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitalsTracking(): void {
    // This is a simplified version. In production, use the web-vitals library
    this.log('info', 'Web Vitals tracking enabled');
  }

  /**
   * Update user context across all services
   */
  updateUserContext(userId: string, userInfo?: Partial<UserContext>): void {
    this.config.userId = userId;

    // Update Sentry
    if (this.errorMonitoring) {
      this.errorMonitoring.setUserContext({
        id: userId,
        sessionId: this.sessionId,
        ...userInfo,
      });
    }

    // Update Datadog
    if (this.serviceStatus.datadog.initialized && window.DD_RUM) {
      window.DD_RUM.setUser({
        id: userId,
        ...userInfo,
      });
    }

    this.log('info', 'User context updated:', { userId });
  }

  /**
   * Track custom business events
   */
  trackBusinessEvent(eventName: string, properties?: Record<string, unknown>): void {
    this.errorMonitoring?.addBreadcrumb(
      `Business event: ${eventName}`,
      'business',
      'info',
      properties
    );

    if (window.DD_RUM) {
      window.DD_RUM.addAction(eventName, properties || {});
    }

    this.log('info', `Business event tracked: ${eventName}`, properties);
  }

  /**
   * Track custom error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.errorMonitoring?.captureError(error, {
      feature: 'custom-tracking',
      action: 'manual-error',
      metadata: context,
    });
  }

  /**
   * Get monitoring status
   */
  getStatus(): MonitoringStatus {
    return {
      initialized: this.initialized,
      errorMonitoring: this.serviceStatus.sentry.initialized,
      performanceMonitoring: this.serviceStatus.performance.initialized,
      analytics: this.serviceStatus.datadog.initialized,
      services: { ...this.serviceStatus },
    };
  }

  /**
   * Cleanup and destroy monitoring instance
   */
  destroy(): void {
    this.log('info', 'Destroying monitoring instance...');

    // Remove all event handlers
    for (const { element, event, handler, options } of this.eventHandlers) {
      element.removeEventListener(event, handler, options);
    }
    this.eventHandlers = [];

    // Disconnect all observers
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];

    this.initialized = false;
    this.log('info', 'Monitoring instance destroyed');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private addEventHandler(
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    this.eventHandlers.push({ element, event, handler, options });
  }

  private getElementSrc(element: HTMLElement): string | undefined {
    return (element as HTMLImageElement | HTMLScriptElement).src;
  }

  private getElementCurrentSrc(element: HTMLElement): string | undefined {
    return (element as HTMLImageElement).currentSrc;
  }

  private isImportantElement(target: HTMLElement, tagName: string): boolean {
    return (
      ['button', 'a', 'input'].includes(tagName) ||
      target.getAttribute('role') === 'button' ||
      target.hasAttribute('data-track')
    );
  }

  private getElementIdentifier(
    target: HTMLElement,
    tagName: string,
    id: string,
    className: string
  ): string {
    return `${tagName}${id ? `#${id}` : ''}${className ? `.${className.split(' ')[0]}` : ''}`;
  }

  private trackLongTask(entry: PerformanceEntry): void {
    this.log('warn', 'Long task detected:', {
      duration: entry.duration,
      startTime: entry.startTime,
    });
  }

  private trackLayoutShift(entry: PerformanceEntry): void {
    this.log('info', 'Layout shift detected:', { entry });
  }

  private trackLCP(entry: PerformanceEntry): void {
    this.log('info', 'LCP:', { startTime: entry.startTime });
  }

  private trackFID(entry: PerformanceEntry): void {
    const fidEntry = entry as PerformanceEventTiming;
    const fid = fidEntry.processingStart - fidEntry.startTime;
    this.log('info', 'FID:', { fid });
  }

  private trackInteraction(type: string, identifier: string): void {
    if (window.DD_RUM) {
      window.DD_RUM.addAction(`${type}:${identifier}`, {});
    }
  }

  private trackVisibilityChange(state: DocumentVisibilityState): void {
    if (window.DD_RUM) {
      window.DD_RUM.addAction('visibility-change', { state });
    }
  }

  private trackPageLoadMetrics(metrics: {
    loadTime: number;
    domReady: number;
    firstPaint: number | null;
  }): void {
    if (window.DD_RUM) {
      window.DD_RUM.addAction('page-load', metrics);
    }
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${random}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    if (this.config.debug || level !== 'info') {
      console[level](`[Monitoring] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

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

export function destroyMonitoring(): void {
  if (monitoringInstance) {
    monitoringInstance.destroy();
    monitoringInstance = null;
  }
}

// ============================================================================
// Auto-initialization for Production
// ============================================================================

export function autoInitializeMonitoring(): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
    return;
  }

  const config: MonitoringConfig = {
    environment: process.env.NODE_ENV,
    version: process.env.BUILD_VERSION || 'unknown',
    enableErrorMonitoring: !!import.meta.env.VITE_SENTRY_DSN,
    enablePerformanceMonitoring: true,
    enableAnalytics: !!(
      import.meta.env.VITE_DATADOG_APPLICATION_ID && import.meta.env.VITE_DATADOG_CLIENT_TOKEN
    ),
    debug: false,
    sentry: import.meta.env.VITE_SENTRY_DSN
      ? {
          dsn: import.meta.env.VITE_SENTRY_DSN,
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        }
      : undefined,
    datadog:
      import.meta.env.VITE_DATADOG_APPLICATION_ID && import.meta.env.VITE_DATADOG_CLIENT_TOKEN
        ? {
            applicationId: import.meta.env.VITE_DATADOG_APPLICATION_ID,
            clientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
            site: 'datadoghq.com',
            sessionSampleRate: 100,
            sessionReplaySampleRate: 20,
          }
        : undefined,
  };

  const initialize = () => {
    initializeMonitoring(config).catch(error => {
      console.error('[Monitoring] Failed to auto-initialize:', error);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}

// Auto-initialize if in production
if (typeof window !== 'undefined') {
  autoInitializeMonitoring();
}

export default MonitoringInitializer;
