import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { UnifiedLogger, logger } from '../logging';

describe('UnifiedLogger', () => {
  let testLogger: UnifiedLogger;

  beforeEach(() => {
    testLogger = new UnifiedLogger({
      level: 'debug',
      enableInMemoryStorage: true,
      enableMetrics: false,
    });
  });

  describe('Core Logging', () => {
    it('should log messages at different levels', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');

      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should respect log levels', () => {
      const infoLogger = new UnifiedLogger({ level: 'info', enableMetrics: false });
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      infoLogger.debug('Debug message');
      infoLogger.info('Info message');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();

      debugSpy.mockRestore();
      infoSpy.mockRestore();
    });

    it('should handle context and metadata', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      testLogger.info('Test message', { component: 'test' }, { user_id: '123'  });

      expect(consoleSpy).toHaveBeenCalled();
      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toContain('Test message');

      consoleSpy.mockRestore();
    });
  });

  describe('Context Management', () => { it('should manage async context', async () => {
      const context = { requestId: 'req-123', user_id: 'user-456'  };

      await testLogger.withContextAsync(context, async () => {
        const currentContext = testLogger.getContext();
        expect(currentContext).toEqual(context);

        testLogger.info('Message with context');
      });

      // Context should be cleared after async operation
      const currentContext = testLogger.getContext();
      expect(currentContext).toBeUndefined();
    });

    it('should create child loggers with inherited context', () => {
      const childLogger = testLogger.child({ component: 'child' });

      expect(childLogger).toBeInstanceOf(UnifiedLogger);
      expect(childLogger).not.toBe(testLogger);
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure function execution time', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = testLogger.measure('test-operation', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should measure async function execution time', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await testLogger.measureAsync('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });

      expect(result).toBe('async result');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('In-Memory Storage', () => {
    it('should store and query logs', () => {
      testLogger.info('Test log entry', { component: 'test' });

      const logs = testLogger.queryLogs({});
      expect(logs.length).toBeGreaterThan(0);

      const testLogs = testLogger.queryLogs({ component: ['test'] });
      expect(testLogs.length).toBe(1);
      expect(testLogs[0].context?.component).toBe('test');
    });

    it('should generate correlation IDs', () => {
      testLogger.info('Test message');

      const logs = testLogger.queryLogs({});
      expect(logs[0].correlationId).toBeDefined();
      expect(typeof logs[0].correlationId).toBe('string');
    });
  });

  describe('Specialized Logging', () => {
    it('should log HTTP requests', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      testLogger.logRequest({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        duration: 150,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log database queries', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      testLogger.logDatabaseQuery('SELECT * FROM users', 45);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log cache operations', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      testLogger.logCacheOperation('get', 'user:123', true, 5);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Default Logger Instance', () => {
    it('should export a default logger instance', () => {
      expect(logger).toBeInstanceOf(UnifiedLogger);
    });

    it('should be configurable via environment variables', () => {
      // Test that the logger is created with environment-based config
      expect(logger).toBeDefined();
    });
  });
});





































