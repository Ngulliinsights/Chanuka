/**
 * Import Path Verification Test
 * Ensures standardized import paths work correctly across modules
 */

import { describe, it, expect } from 'vitest';

// Test imports from different modules using standardized paths
import { logger } from '@shared/core/src/observability/logging';
import { BaseError } from '@shared/core/src/observability/error-management/errors/base-error';
import { createRedisMock } from '@tests/mocks/redis.mock';
import { createPerformanceMock } from '@tests/mocks/performance.mock';

describe('Import Path Verification', () => {
  describe('Shared Module Imports', () => {
    it('should import logger from @shared path', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
    
    it('should import BaseError from @shared path', () => {
      expect(BaseError).toBeDefined();
      
      const error = new BaseError('Test error', {
        code: 'TEST_ERROR',
        domain: 'test' as any,
        severity: 'low' as any,
      });
      
      expect(error).toBeInstanceOf(BaseError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
    });
  });
  
  describe('Test Module Imports', () => {
    it('should import Redis mock from @tests path', () => {
      expect(createRedisMock).toBeDefined();
      
      const redisMock = createRedisMock();
      expect(redisMock.get).toBeDefined();
      expect(redisMock.set).toBeDefined();
      expect(redisMock.ping).toBeDefined();
    });
    
    it('should import Performance mock from @tests path', () => {
      expect(createPerformanceMock).toBeDefined();
      
      const performanceMock = createPerformanceMock();
      expect(performanceMock.now).toBeDefined();
      expect(performanceMock.mark).toBeDefined();
      expect(performanceMock.memory).toBeDefined();
    });
  });
  
  describe('Cross-Module Compatibility', () => {
    it('should work with shared utilities in tests', async () => {
      // Test that shared utilities work correctly when imported via standardized paths
      const error = new BaseError('Integration test error', {
        code: 'INTEGRATION_ERROR',
        domain: 'test' as any,
        severity: 'medium' as any,
      });
      
      // Should be able to log the error
      expect(() => {
        logger.error('Test error occurred', { error: error.toJSON() });
      }).not.toThrow();
      
      // Should be able to use test mocks
      const redisMock = createRedisMock();
      const result = await redisMock.ping();
      expect(result).toBe('PONG');
    });
    
    it('should maintain type safety across imports', () => {
      // TypeScript should properly resolve types across module boundaries
      const error: BaseError = new BaseError('Type test', {
        code: 'TYPE_TEST',
        domain: 'validation' as any,
        severity: 'low' as any,
      });
      
      expect(error.errorId).toBeDefined();
      expect(error.metadata.timestamp).toBeDefined();
      expect(error.metadata).toBeDefined();
    });
  });
  
  describe('Path Alias Resolution', () => {
    it('should resolve @shared aliases correctly', () => {
      // Verify that the import actually resolved to the correct module
      expect(logger.constructor.name).toBe('UnifiedLogger'); // Updated to match actual class name
      expect(BaseError.name).toBe('BaseError');
    });
    
    it('should resolve @tests aliases correctly', () => {
      // Verify that test utilities are properly imported
      expect(typeof createRedisMock).toBe('function');
      expect(typeof createPerformanceMock).toBe('function');
    });
  });
});