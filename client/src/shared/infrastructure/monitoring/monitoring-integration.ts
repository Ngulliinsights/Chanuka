/**
 * Monitoring Integration Module
 * Centralizes all monitoring services for the Chanuka Client
 */

import { ErrorMonitor } from './error-monitor';
import { PerformanceMonitor } from './performance-monitor';
import SentryMonitoring from '@client/core/monitoring/sentry-config';

interface MonitoringConfig {
  environment: string;
  version: string;
  enableSentry: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorMonitoring: boolean;
  sentryDsn?: string;
  sampleRates: {
    sentry: number;
    traces: number;
    replays: number;
  };
}

class MonitoringIntegration {
  private static instance: MonitoringIntegration;
  private sentry: SentryMonitoring;
  private performance: PerformanceMonitor;
  private errorMonitoring: ErrorMonitor;
  private initialized = false;

  static getInstance(): MonitoringIntegration {
    if (!MonitoringIntegration.instance) {
      MonitoringIntegration.instance = new MonitoringIntegration();
    }
    return MonitoringIntegration.instance;
  }

  constructor() {
    this.sentry = SentryMonitoring.getInstance();
    this.performance = PerformanceMonitor.getInstance();
    this.errorMonitoring = ErrorMonitor.getInstance();
  }

  async initialize(config: MonitoringConfig): Promise<void> {
    if (this.initialized) {
      console.warn('Monitoring already initialized');
      return;
    }

    console.log('🔧 Initializing monitoring services...');

    try {
      // Initialize Sentry if enabled
      if (config.enableSentry && config.sentryDsn) {
        this.sentry.initialize({
          dsn: config.sentryDsn,
          environment: config.environment,
          release: config.version,
          sampleRate: config.sampleRates.sentry,
          tracesSampleRate: config.sampleRates.traces,
          replaysSessionSampleRate: config.sampleRates.replays,
          replaysOnErrorSampleRate: 1.0,
        });
        console.log('✅ Sentry monitoring initialized');
      }

      // Initialize performance monitoring if enabled
      if (config.enablePerformanceMonitoring) {
        // Performance monitoring is automatically initialized
        this.setupPerformanceIntegration();
        console.log('✅ Performance monitoring initialized');
      }

      // Initialize error monitoring if enabled
      if (config.enableErrorMonitoring) {
        // Error monitoring is automatically initialized
        this.setupErrorIntegration();
        console.log('✅ Error monitoring initialized');
      }

      // Set up cross-service integrations
      this.setupIntegrations();

      this.initialized = true;
      console.log('🎉 All monitoring services initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      throw error;
    }
  }

  private setupPerformanceIntegration(): void {
    // Integrate performance monitoring with Sentry
    this.performance.onMetricsChange((metrics) => {
      // Report Core Web Vitals to Sentry
      if (metrics.coreWebVitals.lcp) {
        this.sentry.setContext('performance', {
          lcp: metrics.coreWebVitals.lcp,
          fid: metrics.coreWebVitals.fid,
          cls: metrics.coreWebVitals.cls,
          fcp: metrics.coreWebVitals.fcp,
          ttfb: metrics.coreWebVitals.ttfb,
        });
      }

      // Alert on poor performance
      if (metrics.coreWebVitals.lcp && metrics.coreWebVitals.lcp > 4000) {
        this.sentry.captureMessage(
          `Poor LCP detected: ${metrics.coreWebVitals.lcp}ms`,
          'warning'
        );
      }

      if (metrics.coreWebVitals.cls && metrics.coreWebVitals.cls > 0.25) {
        this.sentry.captureMessage(
          `High CLS detected: ${metrics.coreWebVitals.cls}`,
          'warning'
        );
      }
    });
  }

  private setupErrorIntegration(): void {
    // Error monitoring is already integrated with Sentry
    // Additional custom integrations can be added here
  }

  private setupIntegrations(): void {
    // Set up breadcrumbs for user actions
    this.setupUserActionTracking();

    // Set up navigation tracking
    this.setupNavigationTracking();

    // Set up feature usage tracking
    this.setupFeatureTracking();
  }

  private setupUserActionTracking(): void {
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      // Track button clicks
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        const buttonText = button?.textContent?.trim() || 'Unknown';

        this.sentry.addBreadcrumb(
          `Button clicked: ${buttonText}`,
          'user',
          {
            element: button?.className,
            text: buttonText,
          }
        );
      }

      // Track link clicks
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.tagName === 'A' ? target : target.closest('a');
        const href = (link as HTMLAnchorElement)?.href;

        this.sentry.addBreadcrumb(
          `Link clicked: ${href}`,
          'navigation',
          { href }
        );
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || form.className || 'unknown';

      this.sentry.addBreadcrumb(
        `Form submitted: ${formId}`,
        'user',
        { formId }
      );
    });
  }

  private setupNavigationTracking(): void {
    // Track route changes (for SPA)
    let currentPath = window.location.pathname;

    const trackNavigation = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.sentry.addBreadcrumb(
          `Navigation: ${currentPath} → ${newPath}`,
          'navigation',
          {
            from: currentPath,
            to: newPath,
          }
        );

        // Mark performance measurement
        this.performance.mark(`navigation-${Date.now()}`);

        currentPath = newPath;
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', trackNavigation);

    // Override pushState and replaceState to track programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      trackNavigation();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      trackNavigation();
    };
  }

  private setupFeatureTracking(): void {
    // Track feature usage based on data attributes
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const feature = target.dataset.feature || target.closest('[data-feature]')?.getAttribute('data-feature');

      if (feature) {
        this.sentry.addBreadcrumb(
          `Feature used: ${feature}`,
          'user',
          { feature }
        );

        // Track feature adoption metrics
        this.sentry.setTag('last_feature_used', feature);
      }
    });
  }

  // Public API methods
  reportError(error: Error, context?: Record<string, unknown>): void {
    this.errorMonitoring.reportError(error, context);
  }

  reportUserAction(action: string, context?: Record<string, unknown>): void {
    this.errorMonitoring.reportUserAction(action, context);
  }

  reportPerformanceIssue(metric: string, value: number, threshold: number): void {
    this.errorMonitoring.reportPerformanceIssue(metric, value, threshold);
  }

  setUserContext(user: { id: string; email?: string; username?: string }): void {
    this.sentry.setUserContext(user);
    this.errorMonitoring.setUserContext(user);
  }

  clearUserContext(): void {
    this.sentry.clearUserContext();
    this.errorMonitoring.clearUserContext();
  }

  markPerformance(name: string): void {
    this.performance.mark(name);
  }

  measurePerformance(name: string, startMark?: string, endMark?: string): void {
    this.performance.measure(name, startMark, endMark);
  }

  getPerformanceMetrics() {
    return this.performance.getMetrics();
  }

  getCoreWebVitals() {
    return this.performance.getCoreWebVitals();
  }

  destroy(): void {
    if (this.performance) {
      this.performance.destroy();
    }
    if (this.errorMonitoring) {
      this.errorMonitoring.destroy();
    }
    this.initialized = false;
  }
}

// Auto-initialize based on environment variables
const autoInitialize = () => {
  const config: MonitoringConfig = {
    environment: process.env.REACT_APP_ENV || 'development',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    enableSentry: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
    enablePerformanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableErrorMonitoring: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
    sentryDsn: process.env.REACT_APP_SENTRY_DSN,
    sampleRates: {
      sentry: parseFloat(process.env.REACT_APP_SENTRY_SAMPLE_RATE || '0.1'),
      traces: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      replays: parseFloat(process.env.REACT_APP_SENTRY_REPLAYS_SAMPLE_RATE || '0.01'),
    },
  };

  const monitoring = MonitoringIntegration.getInstance();
  monitoring.initialize(config).catch(error => {
    console.error('Failed to auto-initialize monitoring:', error);
  });
};

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
  } else {
    autoInitialize();
  }
}

export { MonitoringIntegration };
export type { MonitoringConfig };
export default MonitoringIntegration;
