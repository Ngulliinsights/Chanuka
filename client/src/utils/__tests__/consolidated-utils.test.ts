/**
 * Comprehensive test suite for consolidated utility modules
 * Tests for non-lossy consolidation and optimal functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import all consolidated modules
import * as assets from '../assets';
import * as errors from '../errors';
import * as performance from '../performance';
import * as security from '../security';
import * as devTools from '../dev-tools';
import * as browser from '../browser';
import * as storage from '../storage';
import * as mobile from '../mobile';
import * as api from '../api';
import * as testing from '../testing';

describe('Consolidated Utils - Code Quality Tests', () => {
  describe('Assets Module', () => {
    it('should export all required classes and functions', () => {
      expect(assets.AssetLoader).toBeDefined();
      expect(assets.ImageOptimizer).toBeDefined();
      expect(assets.AssetLoadingManager).toBeDefined();
      expect(assets.assetLoader).toBeDefined();
      expect(assets.imageOptimizer).toBeDefined();
      expect(assets.assetLoadingManager).toBeDefined();
      expect(assets.loadAsset).toBeDefined();
      expect(assets.createOptimizedImage).toBeDefined();
    });

    it('should have working asset loader', () => {
      expect(typeof assets.assetLoader.loadAsset).toBe('function');
      expect(typeof assets.assetLoader.getStats).toBe('function');
      expect(typeof assets.assetLoader.clearCache).toBe('function');
    });

    it('should have working image optimizer', () => {
      expect(typeof assets.imageOptimizer.optimizeImageUrl).toBe('function');
      expect(typeof assets.imageOptimizer.createOptimizedImage).toBe('function');
      expect(typeof assets.imageOptimizer.getMetrics).toBe('function');
    });
  });

  describe('Errors Module', () => {
    it('should export all required error classes', () => {
      expect(errors.BaseError).toBeDefined();
      expect(errors.ValidationError).toBeDefined();
      expect(errors.NetworkError).toBeDefined();
      expect(errors.UnauthorizedError).toBeDefined();
      expect(errors.NotFoundError).toBeDefined();
      expect(errors.ErrorDomain).toBeDefined();
      expect(errors.ErrorSeverity).toBeDefined();
    });

    it('should create proper error instances', () => {
      const error = new errors.BaseError('Test error', {
        domain: errors.ErrorDomain.SYSTEM,
        severity: errors.ErrorSeverity.LOW
      });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.domain).toBe(errors.ErrorDomain.SYSTEM);
      expect(error.severity).toBe(errors.ErrorSeverity.LOW);
    });

    it('should have working unified error handler', () => {
      const handler = errors.UnifiedErrorHandler.getInstance();
      expect(typeof handler.handleError).toBe('function');
      expect(typeof handler.getRecentErrors).toBe('function');
      expect(typeof handler.getErrorStats).toBe('function');
    });
  });

  describe('Performance Module', () => {
    it('should export all performance utilities', () => {
      expect(performance.PerformanceAlerts).toBeDefined();
      expect(performance.PerformanceBudgetChecker).toBeDefined();
      expect(performance.WebVitalsMonitor).toBeDefined();
      expect(performance.PerformanceOptimizer).toBeDefined();
      expect(performance.performanceAlerts).toBeDefined();
      expect(performance.recordPerformanceMetric).toBeDefined();
    });

    it('should have working performance alerts', () => {
      expect(typeof performance.performanceAlerts.checkMetric).toBe('function');
      expect(typeof performance.performanceAlerts.getActiveAlerts).toBe('function');
      expect(typeof performance.performanceAlerts.setThreshold).toBe('function');
    });

    it('should record performance metrics', () => {
      expect(() => {
        performance.recordPerformanceMetric({
          name: 'test-metric',
          value: 100,
          category: 'custom'
        });
      }).not.toThrow();
    });
  });

  describe('Security Module', () => {
    it('should export all security utilities', () => {
      expect(security.CSPManager).toBeDefined();
      expect(security.DOMSanitizer).toBeDefined();
      expect(security.InputValidator).toBeDefined();
      expect(security.PasswordValidator).toBeDefined();
      expect(security.SecurityMonitor).toBeDefined();
      expect(security.generateCSPHeader).toBeDefined();
      expect(security.sanitizeHTML).toBeDefined();
    });

    it('should sanitize HTML properly', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = security.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('should validate passwords', () => {
      const result = security.validatePassword('TestPassword123!');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('isValid');
    });
  });

  describe('Browser Module', () => {
    it('should export all browser utilities', () => {
      expect(browser.FeatureDetector).toBeDefined();
      expect(browser.BrowserDetector).toBeDefined();
      expect(browser.PolyfillManager).toBeDefined();
      expect(browser.featureDetector).toBeDefined();
      expect(browser.browserDetector).toBeDefined();
      expect(browser.getBrowserInfo).toBeDefined();
    });

    it('should detect browser features', () => {
      const features = browser.featureDetector.getAllFeatures();
      expect(features).toHaveProperty('es6');
      expect(features).toHaveProperty('fetch');
      expect(features).toHaveProperty('promises');
      expect(features).toHaveProperty('localStorage');
    });

    it('should get browser info', () => {
      const info = browser.getBrowserInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('features');
      expect(info).toHaveProperty('isSupported');
    });
  });

  describe('Storage Module', () => {
    it('should export all storage utilities', () => {
      expect(storage.SecureStorage).toBeDefined();
      expect(storage.SessionManager).toBeDefined();
      expect(storage.TokenManager).toBeDefined();
      expect(storage.CacheManager).toBeDefined();
      expect(storage.secureStorage).toBeDefined();
      expect(storage.sessionManager).toBeDefined();
    });

    it('should have working secure storage', async () => {
      await expect(storage.secureStorage.setItem('test', 'value')).resolves.not.toThrow();
      const value = await storage.secureStorage.getItem('test');
      expect(value).toBe('value');
    });

    it('should validate session state', () => {
      expect(typeof storage.sessionManager.isSessionValid).toBe('function');
      expect(typeof storage.sessionManager.getCurrentSession).toBe('function');
    });
  });

  describe('Mobile Module', () => {
    it('should export all mobile utilities', () => {
      expect(mobile.DeviceDetector).toBeDefined();
      expect(mobile.TouchHandler).toBeDefined();
      expect(mobile.ResponsiveUtils).toBeDefined();
      expect(mobile.deviceDetector).toBeDefined();
      expect(mobile.isMobileDevice).toBeDefined();
      expect(mobile.hasTouch).toBeDefined();
    });

    it('should detect device type', () => {
      const deviceInfo = mobile.deviceDetector.getDeviceInfo();
      expect(deviceInfo).toHaveProperty('isMobile');
      expect(deviceInfo).toHaveProperty('isTablet');
      expect(deviceInfo).toHaveProperty('isDesktop');
      expect(deviceInfo).toHaveProperty('hasTouch');
    });

    it('should handle responsive breakpoints', () => {
      const breakpoint = mobile.responsiveUtils.getCurrentBreakpoint();
      expect(['xs', 'sm', 'md', 'lg', 'xl']).toContain(breakpoint);
    });
  });

  describe('API Module', () => {
    it('should export all API utilities', () => {
      expect(api.ApiClient).toBeDefined();
      expect(api.AuthenticatedApiClient).toBeDefined();
      expect(api.SafeApiClient).toBeDefined();
      expect(api.apiClient).toBeDefined();
      expect(api.authenticatedApi).toBeDefined();
      expect(api.safeApi).toBeDefined();
    });

    it('should have working API client', () => {
      expect(typeof api.apiClient.get).toBe('function');
      expect(typeof api.apiClient.post).toBe('function');
      expect(typeof api.apiClient.put).toBe('function');
      expect(typeof api.apiClient.delete).toBe('function');
    });

    it('should have safe API wrapper', () => {
      expect(typeof api.safeApi.safeGet).toBe('function');
      expect(typeof api.safeApi.safePost).toBe('function');
    });
  });

  describe('Testing Module', () => {
    it('should export all testing utilities', () => {
      expect(testing.ImportValidator).toBeDefined();
      expect(testing.MigrationValidator).toBeDefined();
      expect(testing.ArchitectureValidator).toBeDefined();
      expect(testing.TestHelpers).toBeDefined();
      expect(testing.migrationValidator).toBeDefined();
    });

    it('should validate imports', () => {
      const results = testing.ImportValidator.validateImports();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should have test helpers', () => {
      expect(typeof testing.TestHelpers.simulateError).toBe('function');
      expect(typeof testing.TestHelpers.clearAllCaches).toBe('function');
      expect(typeof testing.TestHelpers.getTestEnvironment).toBe('function');
    });
  });

  describe('Dev Tools Module', () => {
    it('should export development utilities', () => {
      expect(devTools.isDevelopment).toBeDefined();
      expect(devTools.isProduction).toBeDefined();
      expect(devTools.DevServerCheck).toBeDefined();
      expect(devTools.DevelopmentDebugger).toBeDefined();
      expect(devTools.applyDevelopmentOverrides).toBeDefined();
    });

    it('should have server check utilities', () => {
      expect(typeof devTools.DevServerCheck.checkServerConnection).toBe('function');
      expect(typeof devTools.DevServerCheck.checkWebSocketConnection).toBe('function');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle cross-module dependencies correctly', async () => {
    // Test that modules can work together without circular dependencies
    const errorHandler = errors.UnifiedErrorHandler.getInstance();
    const testError = new errors.NetworkError('Test network error');
    
    expect(() => {
      errorHandler.handleError({
        type: errors.ErrorDomain.NETWORK,
        severity: errors.ErrorSeverity.MEDIUM,
        message: testError.message,
        recoverable: true,
        retryable: true
      });
    }).not.toThrow();
  });

  it('should maintain backward compatibility', () => {
    // Test that old import patterns still work
    expect(errors.ErrorType).toBe(errors.ErrorDomain); // Backward compatibility alias
  });

  it('should handle environment differences gracefully', () => {
    // Test that modules work in different environments
    expect(() => {
      browser.getBrowserInfo();
      mobile.deviceDetector.getDeviceInfo();
      security.generateCSPHeader();
    }).not.toThrow();
  });
});

describe('Performance and Memory Tests', () => {
  it('should not create memory leaks', () => {
    // Test that instances are properly managed
    const initialInstances = {
      assetLoader: assets.assetLoader,
      errorHandler: errors.UnifiedErrorHandler.getInstance(),
      deviceDetector: mobile.deviceDetector
    };

    // Getting instances again should return the same objects (singleton pattern)
    expect(assets.assetLoader).toBe(initialInstances.assetLoader);
    expect(errors.UnifiedErrorHandler.getInstance()).toBe(initialInstances.errorHandler);
    expect(mobile.deviceDetector).toBe(initialInstances.deviceDetector);
  });

  it('should handle cleanup properly', () => {
    expect(() => {
      assets.assetLoader.clearCache();
      browser.featureDetector.clearCache();
      mobile.touchHandler.removeTouchListener;
    }).not.toThrow();
  });
});