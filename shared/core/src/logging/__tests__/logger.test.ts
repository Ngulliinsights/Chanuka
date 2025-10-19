/**
 * Logger Tests
 * 
 * Comprehensive tests for structured logging, async context preservation,
 * redaction, and transport functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../logger';
import { AsyncLocalStorage } from 'async_hooks';
import pino from 'pino';
import { logger } from '../../observability/logging';

// Mock pino
vi.mock('pino');
vi.mock('pino-pretty');

const mockPino = vi.mocked(pino);

describe('Logger', () => {
  let logger: Logger;
  let mockPinoInstance: any;
  let mockTransport: any;

  beforeEach(() => {
    mockPinoInstance = {
      fatal: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
      level: 'info',
    };

    mockTransport = {
      write: vi.fn(),
      end: vi.fn(),
    };

    mockPino.mockReturnValue(mockPinoInstance);
    mockPino.transport = vi.fn().mockReturnValue(mockTransport);
    mockPino.destination = vi.fn().mockReturnValue(mockTransport);

    vi.clearAllMocks();
  });

  afterEach(() => {
    logger?.destroy();
  });

  describe('Logger Initialization', () => {
    it('should initialize with default configuration', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          redact: [],
        })
      );
    });

    it('should initialize with custom redaction paths', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: ['*.password', '*.token', '*.ssn'],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          redact: ['*.password', '*.token', '*.ssn'],
        })
      );
    });

    it('should initialize with pretty printing enabled', () => {
      logger = new Logger({
        level: 'debug',
        pretty: true,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      expect(mockPino.transport).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'pino-pretty',
        })
      );
    });

    it('should initialize with async transport', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: true,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      expect(mockPino.transport).toHaveBeenCalled();
    });

    it('should initialize with file rotation', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '50mb',
        maxFiles: 10,
        enableMetrics: false,
      });

      expect(mockPino.transport).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            maxFileSize: '50mb',
            maxFiles: 10,
          }),
        })
      );
    });
  });

  describe('Basic Logging Methods', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'trace',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should log fatal messages', () => {
      logger.fatal({ error: 'critical' }, 'Fatal error occurred');

      expect(mockPinoInstance.fatal).toHaveBeenCalledWith(
        { error: 'critical' },
        'Fatal error occurred'
      );
    });

    it('should log error messages', () => {
      logger.error({ error: 'test' }, 'Error message');

      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { error: 'test' },
        'Error message'
      );
    });

    it('should log warning messages', () => {
      logger.warn({ warning: 'test' }, 'Warning message');

      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        { warning: 'test' },
        'Warning message'
      );
    });

    it('should log info messages', () => {
      logger.info({ info: 'test' }, 'Info message');

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        { info: 'test' },
        'Info message'
      );
    });

    it('should log debug messages', () => {
      logger.debug({ debug: 'test' }, 'Debug message');

      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        { debug: 'test' },
        'Debug message'
      );
    });

    it('should log trace messages', () => {
      logger.trace({ trace: 'test' }, 'Trace message');

      expect(mockPinoInstance.trace).toHaveBeenCalledWith(
        { trace: 'test' },
        'Trace message'
      );
    });

    it('should handle logging without message', () => {
      logger.info({ data: 'test' });

      expect(mockPinoInstance.info).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle logging with only message', () => {
      logger.info('Simple message');

      expect(mockPinoInstance.info).toHaveBeenCalledWith('Simple message');
    });
  });

  describe('Async Context Preservation', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should preserve context in async operations', async () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-456',
        traceId: 'trace-789',
      };

      await logger.withContext(context, async () => {
        logger.info('Test message');
        
        expect(mockPinoInstance.child).toHaveBeenCalledWith(
          expect.objectContaining(context)
        );
      });
    });

    it('should handle nested context operations', async () => {
      const outerContext = { requestId: 'req-123' };
      const innerContext = { userId: 'user-456' };

      await logger.withContext(outerContext, async () => {
        await logger.withContext(innerContext, async () => {
          logger.info('Nested message');
          
          // Should have both contexts
          expect(mockPinoInstance.child).toHaveBeenCalledWith(
            expect.objectContaining({
              ...outerContext,
              ...innerContext,
            })
          );
        });
      });
    });

    it('should handle context in Promise chains', async () => {
      const context = { requestId: 'req-123' };

      await logger.withContext(context, () => {
        return Promise.resolve()
          .then(() => {
            logger.info('Promise chain message');
            
            expect(mockPinoInstance.child).toHaveBeenCalledWith(
              expect.objectContaining(context)
            );
          });
      });
    });

    it('should handle context with setTimeout', async () => {
      const context = { requestId: 'req-123' };

      await logger.withContext(context, () => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            logger.info('Timeout message');
            
            expect(mockPinoInstance.child).toHaveBeenCalledWith(
              expect.objectContaining(context)
            );
            resolve();
          }, 10);
        });
      });
    });

    it('should isolate context between concurrent operations', async () => {
      const context1 = { requestId: 'req-1' };
      const context2 = { requestId: 'req-2' };

      const promise1 = logger.withContext(context1, async () => {
        await testUtils.wait(50);
        logger.info('Message 1');
      });

      const promise2 = logger.withContext(context2, async () => {
        await testUtils.wait(25);
        logger.info('Message 2');
      });

      await Promise.all([promise1, promise2]);

      // Each context should be preserved independently
      expect(mockPinoInstance.child).toHaveBeenCalledWith(
        expect.objectContaining(context1)
      );
      expect(mockPinoInstance.child).toHaveBeenCalledWith(
        expect.objectContaining(context2)
      );
    });
  });

  describe('Structured Logging Methods', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: true,
      });
    });

    it('should log request information', () => {
      const req = {
        method: 'GET',
        url: '/api/test',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      };
      const res = { statusCode: 200 };
      const duration = 150;

      logger.logRequest(req, res, duration);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          duration: 150,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
        'HTTP Request'
      );
    });

    it('should log database query information', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 25;
      const params = ['123'];

      logger.logDatabaseQuery(query, duration, params);

      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'database_query',
          query: 'SELECT * FROM users WHERE id = $1',
          duration: 25,
          params: ['123'],
        }),
        'Database Query'
      );
    });

    it('should log cache operations', () => {
      logger.logCacheOperation('get', 'user:123', true, 5);

      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cache_operation',
          operation: 'get',
          key: 'user:123',
          hit: true,
          duration: 5,
        }),
        'Cache Operation'
      );
    });

    it('should log business events', () => {
      const eventData = {
        userId: '123',
        action: 'purchase',
        amount: 99.99,
      };

      logger.logBusinessEvent('user_purchase', eventData);

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'business_event',
          event: 'user_purchase',
          data: eventData,
        }),
        'Business Event: user_purchase'
      );
    });

    it('should log security events', () => {
      const securityDetails = {
        ip: '192.168.1.100',
        userAgent: 'suspicious-agent',
        attemptedAction: 'admin_access',
      };

      logger.logSecurityEvent('unauthorized_access_attempt', securityDetails);

      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'security_event',
          event: 'unauthorized_access_attempt',
          details: securityDetails,
        }),
        'Security Event: unauthorized_access_attempt'
      );
    });
  });

  describe('Data Redaction', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: ['*.password', '*.token', '*.ssn', '*.creditCard'],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should initialize with redaction paths', () => {
      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          redact: ['*.password', '*.token', '*.ssn', '*.creditCard'],
        })
      );
    });

    it('should handle nested redaction paths', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: ['user.password', 'auth.token', 'payment.creditCard.number'],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          redact: ['user.password', 'auth.token', 'payment.creditCard.number'],
        })
      );
    });

    it('should handle array redaction paths', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: ['users[*].password', 'tokens[*].value'],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          redact: ['users[*].password', 'tokens[*].value'],
        })
      );
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: true,
      });
    });

    it('should collect log level metrics', () => {
      logger.info('Info message');
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Another info message');

      const metrics = logger.getMetrics();

      expect(metrics.totalLogs).toBe(4);
      expect(metrics.logsByLevel.info).toBe(2);
      expect(metrics.logsByLevel.error).toBe(1);
      expect(metrics.logsByLevel.warn).toBe(1);
    });

    it('should collect log type metrics', () => {
      logger.logRequest({ method: 'GET', url: '/test' });
      logger.logDatabaseQuery('SELECT 1', 10);
      logger.logCacheOperation('get', 'key', true);
      logger.logBusinessEvent('test_event', {});

      const metrics = logger.getMetrics();

      expect(metrics.logsByType.request).toBe(1);
      expect(metrics.logsByType.database_query).toBe(1);
      expect(metrics.logsByType.cache_operation).toBe(1);
      expect(metrics.logsByType.business_event).toBe(1);
    });

    it('should track average log processing time', () => {
      const startTime = Date.now();
      
      logger.info('Test message');
      
      const metrics = logger.getMetrics();
      
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
      expect(metrics.avgProcessingTime).toBeLessThan(100); // Should be very fast
    });

    it('should reset metrics', () => {
      logger.info('Test message');
      logger.error('Error message');

      let metrics = logger.getMetrics();
      expect(metrics.totalLogs).toBe(2);

      logger.resetMetrics();

      metrics = logger.getMetrics();
      expect(metrics.totalLogs).toBe(0);
      expect(metrics.logsByLevel.info).toBe(0);
      expect(metrics.logsByLevel.error).toBe(0);
    });

    it('should not collect metrics when disabled', () => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });

      logger.info('Test message');

      const metrics = logger.getMetrics();
      expect(metrics.totalLogs).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should handle pino errors gracefully', () => {
      mockPinoInstance.info.mockImplementation(() => {
        throw new Error('Pino error');
      });

      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
    });

    it('should handle transport errors gracefully', () => {
      mockTransport.write.mockImplementation(() => {
        throw new Error('Transport error');
      });

      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
    });

    it('should handle circular references in log data', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.info(circular, 'Circular reference test');
      }).not.toThrow();
    });

    it('should handle undefined and null values', () => {
      expect(() => {
        logger.info(undefined, 'Undefined test');
        logger.info(null, 'Null test');
        logger.info({ value: undefined }, 'Undefined property test');
        logger.info({ value: null }, 'Null property test');
      }).not.toThrow();
    });

    it('should handle very large log objects', () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        array: new Array(1000).fill('test'),
      };

      expect(() => {
        logger.info(largeObject, 'Large object test');
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should handle high-volume logging efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        logger.info({ iteration: i }, `Log message ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle concurrent logging efficiently', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          logger.withContext({ requestId: `req-${i}` }, () => {
            logger.info(`Concurrent message ${i}`);
          })
        );
      }
      
      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should optimize context operations', async () => {
      const context = { requestId: 'req-123', userId: 'user-456' };
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        await logger.withContext(context, () => {
          logger.info(`Context message ${i}`);
        });
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: true,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should cleanup resources on destroy', () => {
      const mockEnd = vi.fn();
      mockTransport.end = mockEnd;

      logger.destroy();

      expect(mockEnd).toHaveBeenCalled();
    });

    it('should handle multiple destroy calls gracefully', () => {
      const mockEnd = vi.fn();
      mockTransport.end = mockEnd;

      logger.destroy();
      logger.destroy();

      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('should prevent logging after destroy', () => {
      logger.destroy();

      expect(() => {
        logger.info('Should not log');
      }).not.toThrow();

      // Should not call pino methods after destroy
      expect(mockPinoInstance.info).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      logger = new Logger({
        level: 'info',
        pretty: false,
        redactPaths: [],
        asyncTransport: false,
        maxFileSize: '10mb',
        maxFiles: 5,
        enableMetrics: false,
      });
    });

    it('should update log level dynamically', () => {
      logger.updateLevel('debug');

      expect(mockPinoInstance.level).toBe('debug');
    });

    it('should validate log level updates', () => {
      expect(() => {
        logger.updateLevel('invalid-level' as any);
      }).toThrow();
    });

    it('should update redaction paths dynamically', () => {
      const newRedactPaths = ['*.newPassword', '*.newToken'];
      
      logger.updateRedactionPaths(newRedactPaths);

      // Should create new pino instance with updated redaction
      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          redact: newRedactPaths,
        })
      );
    });
  });
});











































