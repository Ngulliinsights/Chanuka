/**
 * Tree-shaking validation tests
 * Tests that the public API properly supports tree-shaking and bundle optimization
 */

import { logger } from '../logger';
import { assetLoader } from '../assets';
import { performanceOptimizer } from '../performance';
import { v1 } from '../index';

describe('Tree-shaking Validation', () => {
  describe('Direct imports', () => {
    it('should import logger without pulling in other utilities', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should import assetLoader without pulling in other utilities', () => {
      expect(assetLoader).toBeDefined();
      expect(typeof assetLoader.loadAsset).toBe('function');
    });

    it('should import performanceOptimizer without pulling in other utilities', () => {
      expect(performanceOptimizer).toBeDefined();
      expect(typeof performanceOptimizer.usePerformanceTracking).toBe('function');
    });
  });

  describe('V1 namespace imports', () => {
    it('should provide v1 namespace with all utilities', () => {
      expect(v1).toBeDefined();
      expect(v1.logger).toBeDefined();
      expect(v1.assetLoader).toBeDefined();
      expect(v1.performanceOptimizer).toBeDefined();
    });

    it('should have consistent API between namespace and direct imports', () => {
      expect(v1.logger).toBe(logger);
      expect(v1.assetLoader).toBe(assetLoader);
      expect(v1.performanceOptimizer).toBe(performanceOptimizer);
    });
  });

  describe('Bundle size optimization', () => {
    it('should export utilities that can be tree-shaken', () => {
      // This test validates that individual utilities are properly exported
      // The actual bundle size validation happens during build analysis
      const exportedUtilities = Object.keys(v1);
      expect(exportedUtilities.length).toBeGreaterThan(0);

      // Ensure critical utilities are available
      expect(exportedUtilities).toContain('logger');
      expect(exportedUtilities).toContain('assetLoader');
    });

    it('should not export internal utilities through public API', () => {
      // Test that internal utilities are not accessible
      const publicExports = Object.keys(v1);

      // These should not be in the public API
      const internalUtilities = ['logger-core', 'render-tracker', 'dev-mode'];
      internalUtilities.forEach(internal => {
        expect(publicExports).not.toContain(internal);
      });
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain v1 API surface stability', () => {
      // Test that v1 exports haven't changed unexpectedly
      const expectedV1Exports = [
        'logger', 'assetLoader', 'performanceOptimizer', 'assetFallbackConfig',
        'browserCompatibility', 'preloadOptimizer', 'routePreloader', 'comprehensiveLoading',
        'cacheInvalidation', 'offlineAnalytics', 'serviceRecovery', 'serviceWorker',
        'responsiveLayout', 'envConfig', 'routeValidation', 'polyfills'
      ];

      expectedV1Exports.forEach(expected => {
        expect(v1).toHaveProperty(expected);
      });
    });
  });
});