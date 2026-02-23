/**
 * Monitoring Initialization Tests
 * Tests for the monitoring initialization system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the ErrorMonitor class
class MockErrorMonitor {
  initialize = vi.fn().mockResolvedValue(undefined);
  setUserContext = vi.fn();
  setFeatureContext = vi.fn();
  captureError = vi.fn();
  addBreadcrumb = vi.fn();
  clearUserContext = vi.fn();
}

// Mock the ErrorMonitor import
vi.mock('../../infrastructure/monitoring/error-monitor', () => ({
  ErrorMonitor: MockErrorMonitor,
}));

// Mock Datadog
vi.mock('@datadog/browser-rum', () => ({
  datadogRum: {
    init: vi.fn(),
    setUser: vi.fn(),
    startSessionReplayRecording: vi.fn(),
    addAction: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
}));

// Mock window.DD_RUM
Object.defineProperty(window, 'DD_RUM', {
  value: {
    setUser: vi.fn(),
    addAction: vi.fn(),
  },
  writable: true,
});

// Extend Window interface for DD_RUM
declare global {
  interface Window {
    DD_RUM?: {
      setUser: () => void;
      addAction: () => void;
    };
  }
}

import {
  initializeMonitoring,
  getMonitoringInstance,
  destroyMonitoring,
  autoInitializeMonitoring,
} from '@client/infrastructure/monitoring/monitoring-init';

describe('Monitoring Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset window properties safely
    if (window.DD_RUM) {
      Object.defineProperty(window, 'DD_RUM', {
        value: {
          setUser: vi.fn(),
          addAction: vi.fn(),
        },
        writable: true,
        configurable: true,
      });
    } else {
      (window as any).DD_RUM = {
        setUser: vi.fn(),
        addAction: vi.fn(),
      };
    }
  });

  afterEach(() => {
    // Cleanup
    destroyMonitoring();
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      expect(() => {
        initializeMonitoring({
          environment: '',
          version: '1.0.0',
          enableErrorMonitoring: true,
          enablePerformanceMonitoring: true,
          enableAnalytics: true,
        });
      }).toThrow('Monitoring config must include environment');

      expect(() => {
        initializeMonitoring({
          environment: 'test',
          version: '',
          enableErrorMonitoring: true,
          enablePerformanceMonitoring: true,
          enableAnalytics: true,
        });
      }).toThrow('Monitoring config must include version');
    });

    it('should warn when error monitoring is enabled without Sentry DSN', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error monitoring enabled but no Sentry DSN provided'
      );

      consoleSpy.mockRestore();
    });

    it('should warn when analytics is enabled without Datadog config', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: false,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith('Analytics enabled but Datadog config incomplete');

      consoleSpy.mockRestore();
    });
  });

  describe('Service Initialization', () => {
    it('should initialize error monitoring when enabled', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: false,
        enableAnalytics: false,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
      });

      const instance = getMonitoringInstance();
      expect(instance).toBeDefined();
    });

    it('should initialize performance monitoring when enabled', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: false,
        enablePerformanceMonitoring: true,
        enableAnalytics: false,
      });

      const instance = getMonitoringInstance();
      expect(instance).toBeDefined();
    });

    it('should initialize analytics when enabled', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: false,
        enablePerformanceMonitoring: false,
        enableAnalytics: true,
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      const instance = getMonitoringInstance();
      expect(instance).toBeDefined();
    });

    it('should initialize all services when enabled', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      const instance = getMonitoringInstance();
      expect(instance).toBeDefined();
    });
  });

  describe('User Context Management', () => {
    it('should update user context across services', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      const instance = getMonitoringInstance();

      expect(instance).toBeDefined();
      expect(typeof instance?.updateUserContext).toBe('function');

      instance!.updateUserContext('user-123', {
        email: 'test@example.com',
        username: 'testuser',
      });

      // Verify the method exists and can be called
      const monitoringStatus = instance!.getStatus();
      expect(monitoringStatus.initialized).toBe(true);
    });
  });

  describe('Business Event Tracking', () => {
    it('should track business events', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      const instance = getMonitoringInstance();

      expect(instance).toBeDefined();
      expect(typeof instance?.trackBusinessEvent).toBe('function');

      instance!.trackBusinessEvent('user_signup', {
        plan: 'premium',
        source: 'landing_page',
      });

      // Verify the method can be called without throwing
      expect(() => {
        instance!.trackBusinessEvent('test_event', {});
      }).not.toThrow();
    });
  });

  describe('Error Tracking', () => {
    it('should track custom errors', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      const instance = getMonitoringInstance();

      expect(instance).toBeDefined();
      expect(typeof instance?.trackError).toBe('function');

      const testError = new Error('Test error');
      instance!.trackError(testError, {
        component: 'test-component',
        action: 'test-action',
      });

      // Verify the method can be called without throwing
      expect(() => {
        instance!.trackError(new Error('Another test error'), {});
      }).not.toThrow();
    });
  });

  describe('Monitoring Status', () => {
    it('should return monitoring status', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      const instance = getMonitoringInstance();
      const status = instance?.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('errorMonitoring');
      expect(status).toHaveProperty('performanceMonitoring');
      expect(status).toHaveProperty('analytics');
      expect(status).toHaveProperty('services');
      expect(status?.initialized).toBe(true);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should destroy monitoring instance properly', async () => {
      await initializeMonitoring({
        environment: 'test',
        version: '1.0.0',
        enableErrorMonitoring: true,
        enablePerformanceMonitoring: true,
        enableAnalytics: true,
        sentry: {
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        },
        datadog: {
          applicationId: 'test-app',
          clientToken: 'test-token',
          site: 'datadoghq.com',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
        },
      });

      let instance = getMonitoringInstance();
      expect(instance).toBeDefined();

      destroyMonitoring();

      instance = getMonitoringInstance();
      expect(instance).toBeNull();
    });
  });

  describe('Auto-initialization', () => {
    it('should auto-initialize in production environment', async () => {
      // Mock process.env.NODE_ENV
      process.env.NODE_ENV = 'production';
      process.env.BUILD_VERSION = '1.0.0';

      // Mock import.meta.env
      Object.defineProperty(import.meta, 'env', {
        value: {
          VITE_SENTRY_DSN: 'https://test@sentry.io/123',
          VITE_DATADOG_APPLICATION_ID: 'test-app',
          VITE_DATADOG_CLIENT_TOKEN: 'test-token',
        },
        configurable: true,
      });

      // Mock document.readyState
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        configurable: true,
      });

      // This would normally be called automatically, but we'll test the function directly
      autoInitializeMonitoring();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock Datadog to throw an error
      const mockDatadogRum = {
        init: vi.fn().mockImplementation(() => {
          throw new Error('Datadog initialization failed');
        }),
        setUser: vi.fn(),
        startSessionReplayRecording: vi.fn(),
        addAction: vi.fn(),
      };

      vi.mock('@datadog/browser-rum', () => ({
        datadogRum: mockDatadogRum,
      }));

      // Should not throw
      await expect(
        initializeMonitoring({
          environment: 'test',
          version: '1.0.0',
          enableErrorMonitoring: false,
          enablePerformanceMonitoring: false,
          enableAnalytics: true,
          datadog: {
            applicationId: 'test-app',
            clientToken: 'test-token',
            site: 'datadoghq.com',
            sessionSampleRate: 100,
            sessionReplaySampleRate: 20,
          },
        })
      ).resolves.toBeUndefined();
    });
  });
});
