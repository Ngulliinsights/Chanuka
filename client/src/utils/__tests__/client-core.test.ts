import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logger,
  BaseError,
  ValidationError,
  performanceMonitor,
} from '@client/utils/logger';

// Mock console methods
const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

// Mock performance API
const mockMark = vi.fn();
const mockMeasure = vi.fn();
const mockGetEntriesByType = vi.fn();
const mockClearMarks = vi.fn();
const mockClearMeasures = vi.fn();

Object.defineProperty(window, 'performance', {
  value: {
    mark: mockMark,
    measure: mockMeasure,
    getEntriesByType: mockGetEntriesByType,
    clearMarks: mockClearMarks,
    clearMeasures: mockClearMeasures,
  },
  writable: true,
});

describe('Client Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logger', () => {
    it('should have all required methods', () => {
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('should log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.debug('Test debug', { component: 'Test' }, { extra: 'data' });

      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Test debug', { component: 'Test' }, { extra: 'data' });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log debug messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.debug('Test debug');

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log info messages', () => {
      logger.info('Test info', { component: 'Test' });

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test info', { component: 'Test' });
    });

    it('should log warning messages', () => {
      logger.warn('Test warn', { component: 'Test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warn', { component: 'Test' });
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Test error', { component: 'Test' }, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error', { component: 'Test' }, error);
    });

    it('should handle undefined context and meta', () => {
      logger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test message', undefined, undefined);
    });
  });

  describe('BaseError', () => {
    it('should create error with message and code', () => {
      const error = new BaseError('Test message', 'TEST_ERROR');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('BaseError');
    });

    it('should create error with metadata', () => {
      const metadata = {
        domain: 'test' as any,
        severity: 'high' as any,
        context: { key: 'value' },
      };
      const error = new BaseError('Test message', 'TEST_ERROR', metadata);

      expect(error.metadata).toEqual({
        timestamp: expect.any(Date),
        ...metadata,
      });
    });

    it('should create error with details', () => {
      const details = { field: 'test', value: 'invalid' };
      const error = new BaseError('Test message', 'TEST_ERROR', undefined, details);

      expect(error.details).toEqual(details);
    });

    it('should serialize to JSON', () => {
      const error = new BaseError('Test message', 'TEST_ERROR');
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'BaseError',
        message: 'Test message',
        code: 'TEST_ERROR',
        status: undefined,
        details: undefined,
        metadata: expect.any(Object),
      });
    });

    it('should have proper prototype chain', () => {
      const error = new BaseError('Test message');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof BaseError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error.metadata?.domain).toBe('validation');
      expect(error.metadata?.severity).toBe('medium');
    });

    it('should include validation details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Email is invalid', details);

      expect(error.metadata?.context).toEqual(details);
    });
  });

  describe('Performance Monitor', () => {
    it('should have all required methods', () => {
      expect(performanceMonitor).toHaveProperty('mark');
      expect(performanceMonitor).toHaveProperty('measure');
      expect(performanceMonitor).toHaveProperty('getEntriesByType');
      expect(performanceMonitor).toHaveProperty('clearMarks');
      expect(performanceMonitor).toHaveProperty('clearMeasures');
    });

    it('should call performance.mark', () => {
      performanceMonitor.mark('test-mark');

      expect(mockMark).toHaveBeenCalledWith('test-mark');
    });

    it('should call performance.measure', () => {
      performanceMonitor.measure('test-measure', 'start', 'end');

      expect(mockMeasure).toHaveBeenCalledWith('test-measure', 'start', 'end');
    });

    it('should handle measure errors gracefully', () => {
      mockMeasure.mockImplementation(() => {
        throw new Error('Measure failed');
      });

      expect(() => {
        performanceMonitor.measure('test-measure', 'start', 'end');
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should call getEntriesByType', () => {
      mockGetEntriesByType.mockReturnValue([]);
      const result = performanceMonitor.getEntriesByType('measure');

      expect(mockGetEntriesByType).toHaveBeenCalledWith('measure');
      expect(result).toEqual([]);
    });

    it('should call clearMarks', () => {
      performanceMonitor.clearMarks();

      expect(mockClearMarks).toHaveBeenCalled();
    });

    it('should call clearMeasures', () => {
      performanceMonitor.clearMeasures();

      expect(mockClearMeasures).toHaveBeenCalled();
    });

    it('should handle missing performance API', () => {
      const originalPerformance = window.performance;
      delete (window as any).performance;

      expect(() => {
        performanceMonitor.mark('test');
        performanceMonitor.measure('test', 'start', 'end');
        performanceMonitor.clearMarks();
        performanceMonitor.clearMeasures();
      }).not.toThrow();

      const result = performanceMonitor.getEntriesByType('measure');
      expect(result).toEqual([]);

      // Restore
      Object.defineProperty(window, 'performance', {
        value: originalPerformance,
        writable: true,
      });
    });
  });

  describe('Error Classes Integration', () => {
    it('should work with try-catch blocks', () => {
      try {
        throw new ValidationError('Test validation error');
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
        expect(error instanceof BaseError).toBe(true);
        expect(error instanceof Error).toBe(true);
        expect(error.message).toBe('Test validation error');
      }
    });

    it('should serialize complex error objects', () => {
      const complexError = new BaseError(
        'Complex error',
        'COMPLEX_ERROR',
        {
          domain: 'test' as any,
          severity: 'high' as any,
          context: { userId: 123, action: 'test' },
          correlationId: 'test-123',
        },
        { field: 'test', value: 'invalid' }
      );

      const json = complexError.toJSON() as import('../logger').BaseErrorJSON;

      expect(json.code).toBe('COMPLEX_ERROR');
      expect(json.details).toEqual({ field: 'test', value: 'invalid' });
      expect(json.metadata?.context).toEqual({ userId: 123, action: 'test' });
      expect(json.metadata?.correlationId).toBe('test-123');
    });
  });

  describe('Environment Compatibility', () => {
    it('should work without console methods', () => {
      const originalConsole = global.console;
      global.console = {} as any;

      expect(() => {
        logger.info('No console test');
        logger.warn('No console test');
        logger.error('No console test');
      }).not.toThrow();

      global.console = originalConsole;
    });

    it('should handle missing process.env', () => {
      const originalProcess = global.process;
      delete (global as any).process;

      expect(() => {
        logger.debug('No process test');
      }).not.toThrow();

      global.process = originalProcess;
    });
  });
});