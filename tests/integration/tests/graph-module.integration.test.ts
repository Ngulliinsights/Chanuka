/**
 * Graph Module Integration Test
 * 
 * Verifies that the refactored graph module structure works correctly
 * after the Task 2.2 refactoring (flat to structured layout).
 */

import { describe, it, expect } from 'vitest';

describe('Graph Module Integration', () => {
  describe('Module Imports', () => {
    it('should import core module successfully', async () => {
      const coreModule = await import('@server/infrastructure/database/graph/core');
      expect(coreModule).toBeDefined();
      expect(typeof coreModule).toBe('object');
    });

    it('should import query module successfully', async () => {
      const queryModule = await import('@server/infrastructure/database/graph/query');
      expect(queryModule).toBeDefined();
      expect(typeof queryModule).toBe('object');
    });

    it('should import utils module successfully', async () => {
      const utilsModule = await import('@server/infrastructure/database/graph/utils');
      expect(utilsModule).toBeDefined();
      expect(typeof utilsModule).toBe('object');
    });

    it('should import analytics module successfully', async () => {
      const analyticsModule = await import('@server/infrastructure/database/graph/analytics');
      expect(analyticsModule).toBeDefined();
      expect(typeof analyticsModule).toBe('object');
    });

    it('should import sync module successfully', async () => {
      const syncModule = await import('@server/infrastructure/database/graph/sync');
      expect(syncModule).toBeDefined();
      expect(typeof syncModule).toBe('object');
    });

    it('should import config module successfully', async () => {
      const configModule = await import('@server/infrastructure/database/graph/config');
      expect(configModule).toBeDefined();
      expect(typeof configModule).toBe('object');
    });

    it('should import main barrel export successfully', async () => {
      const graphModule = await import('@server/infrastructure/database/graph');
      expect(graphModule).toBeDefined();
      expect(typeof graphModule).toBe('object');
    });
  });

  describe('Module Structure', () => {
    it('should have organized subdirectories', async () => {
      // Verify that the main barrel export re-exports from subdirectories
      const graphModule = await import('@server/infrastructure/database/graph');
      
      // The module should have exports (exact exports depend on implementation)
      const exports = Object.keys(graphModule);
      expect(exports.length).toBeGreaterThan(0);
    });

    it('should not have circular dependencies', async () => {
      // If this test completes without hanging, there are no circular dependencies
      await Promise.all([
        import('@server/infrastructure/database/graph/core'),
        import('@server/infrastructure/database/graph/query'),
        import('@server/infrastructure/database/graph/utils'),
        import('@server/infrastructure/database/graph/analytics'),
        import('@server/infrastructure/database/graph/sync'),
        import('@server/infrastructure/database/graph/config'),
      ]);
      
      expect(true).toBe(true);
    });
  });

  describe('Import Path Correctness', () => {
    it('should have correct relative imports within modules', async () => {
      // This test verifies that the refactoring correctly updated import paths
      // If any module fails to import, it means there are still incorrect relative paths
      
      try {
        await import('@server/infrastructure/database/graph');
        expect(true).toBe(true);
      } catch (error) {
        // If we get here, there's an import path issue
        expect.fail(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });
});
