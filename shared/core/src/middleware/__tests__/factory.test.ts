/**
 * Middleware Factory Tests
 * 
 * Comprehensive tests for middleware factory, composition, chaining,
 * and integration with core utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MiddlewareFactory } from '../factory';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../observability/logging';

describe('MiddlewareFactory', () => {
  let middlewareFactory: MiddlewareFactory;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middlewareFactory = new MiddlewareFactory({
      enableMetrics: true,
      enableErrorHandling: true,
      enableContextPreservation: true,
    });

    mockRequest = testUtils.createMockRequest();
    mockResponse = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
  });

  afterEach(() => {
    middlewareFactory?.destroy();
  });

  describe('Middleware Creation', () => {
    it('should create rate limiting middleware', () => {
      const rateLimitMiddleware = middlewareFactory.createRateLimit({
        max: 100,
        windowMs: 60000,
        algorithm: 'sliding-window',
      });

      expect(rateLimitMiddleware).toBeInstanceOf(Function);
      expect(rateLimitMiddleware.length).toBe(3); // req, res, next
    });

    it('should create validation middleware', () => {
      const validationMiddleware = middlewareFactory.createValidation({
        body: {
          name: 'string',
          age: 'number',
        },
      });

      expect(validationMiddleware).toBeInstanceOf(Function);
      expect(validationMiddleware.length).toBe(3);
    });

    it('should create logging middleware', () => {
      const loggingMiddleware = middlewareFactory.createLogging({
        includeBody: true,
        includeQuery: true,
        redactFields: ['password', 'token'],
      });

      expect(loggingMiddleware).toBeInstanceOf(Function);
      expect(loggingMiddleware.length).toBe(3);
    });

    it('should create error handling middleware', () => {
      const errorMiddleware = middlewareFactory.createErrorHandler({
        includeStack: false,
        enableSentryReporting: false,
      });

      expect(errorMiddleware).toBeInstanceOf(Function);
      expect(errorMiddleware.length).toBe(4); // err, req, res, next
    });

    it('should create caching middleware', () => {
      const cacheMiddleware = middlewareFactory.createCache({
        ttl: 300,
        keyGenerator: (req) => `cache:${req.path}`,
      });

      expect(cacheMiddleware).toBeInstanceOf(Function);
      expect(cacheMiddleware.length).toBe(3);
    });
  });

  describe('Middleware Composition', () => {
    it('should compose multiple middleware functions', async () => {
      const middleware1 = vi.fn((req, res, next) => {
        req.step1 = true;
        next();
      });

      const middleware2 = vi.fn((req, res, next) => {
        req.step2 = true;
        next();
      });

      const middleware3 = vi.fn((req, res, next) => {
        req.step3 = true;
        next();
      });

      const composed = middlewareFactory.compose([middleware1, middleware2, middleware3]);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.step1).toBe(true);
          expect(mockRequest.step2).toBe(true);
          expect(mockRequest.step3).toBe(true);
          resolve();
        });

        composed(mockRequest as Request, mockResponse as Response, mockNext);
      });

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).toHaveBeenCalled();
    });

    it('should handle middleware errors in composition', async () => {
      const middleware1 = vi.fn((req, res, next) => {
        req.step1 = true;
        next();
      });

      const middleware2 = vi.fn((req, res, next) => {
        next(new Error('Middleware error'));
      });

      const middleware3 = vi.fn((req, res, next) => {
        req.step3 = true;
        next();
      });

      const composed = middlewareFactory.compose([middleware1, middleware2, middleware3]);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Middleware error');
          expect(mockRequest.step1).toBe(true);
          expect(mockRequest.step3).toBeUndefined(); // Should not reach middleware3
          resolve();
        });

        composed(mockRequest as Request, mockResponse as Response, mockNext);
      });

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).not.toHaveBeenCalled();
    });

    it('should handle empty middleware array', () => {
      const composed = middlewareFactory.compose([]);

      composed(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle single middleware in composition', async () => {
      const middleware = vi.fn((req, res, next) => {
        req.processed = true;
        next();
      });

      const composed = middlewareFactory.compose([middleware]);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.processed).toBe(true);
          resolve();
        });

        composed(mockRequest as Request, mockResponse as Response, mockNext);
      });

      expect(middleware).toHaveBeenCalled();
    });
  });

  describe('Middleware Chaining', () => {
    it('should create middleware chain with fluent API', () => {
      const chain = middlewareFactory
        .chain()
        .rateLimit({ max: 100, windowMs: 60000 })
        .validation({ body: { name: 'string' } })
        .logging({ includeBody: true })
        .build();

      expect(chain).toBeInstanceOf(Function);
      expect(chain.length).toBe(3);
    });

    it('should execute middleware chain in order', async () => {
      const executionOrder: string[] = [];

      const customMiddleware1 = (req: Request, res: Response, next: NextFunction) => {
        executionOrder.push('custom1');
        next();
      };

      const customMiddleware2 = (req: Request, res: Response, next: NextFunction) => {
        executionOrder.push('custom2');
        next();
      };

      const chain = middlewareFactory
        .chain()
        .use(customMiddleware1)
        .use(customMiddleware2)
        .build();

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(executionOrder).toEqual(['custom1', 'custom2']);
          resolve();
        });

        chain(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should support conditional middleware in chain', async () => {
      const conditionalMiddleware = (req: Request, res: Response, next: NextFunction) => {
        req.conditional = true;
        next();
      };

      const chain = middlewareFactory
        .chain()
        .useIf(() => true, conditionalMiddleware)
        .useIf(() => false, (req, res, next) => {
          req.shouldNotRun = true;
          next();
        })
        .build();

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.conditional).toBe(true);
          expect(mockRequest.shouldNotRun).toBeUndefined();
          resolve();
        });

        chain(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should support async conditions in chain', async () => {
      const asyncCondition = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      };

      const conditionalMiddleware = (req: Request, res: Response, next: NextFunction) => {
        req.asyncConditional = true;
        next();
      };

      const chain = middlewareFactory
        .chain()
        .useIfAsync(asyncCondition, conditionalMiddleware)
        .build();

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.asyncConditional).toBe(true);
          resolve();
        });

        chain(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      middlewareFactory = new MiddlewareFactory({
        enableMetrics: true,
        enableErrorHandling: true,
        enableContextPreservation: true,
      });
    });

    it('should track middleware execution times', async () => {
      const slowMiddleware = (req: Request, res: Response, next: NextFunction) => {
        setTimeout(() => {
          req.processed = true;
          next();
        }, 50);
      };

      const monitoredMiddleware = middlewareFactory.withPerformanceMonitoring(slowMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          const metrics = middlewareFactory.getMetrics();
          expect(metrics.totalExecutions).toBe(1);
          expect(metrics.avgExecutionTime).toBeGreaterThan(0);
          resolve();
        });

        monitoredMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should track middleware error rates', async () => {
      const errorMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next(new Error('Test error'));
      };

      const monitoredMiddleware = middlewareFactory.withPerformanceMonitoring(errorMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          const metrics = middlewareFactory.getMetrics();
          expect(metrics.totalExecutions).toBe(1);
          expect(metrics.errorCount).toBe(1);
          expect(metrics.errorRate).toBe(1);
          resolve();
        });

        monitoredMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should collect metrics for multiple middleware executions', async () => {
      const testMiddleware = (req: Request, res: Response, next: NextFunction) => {
        req.processed = true;
        next();
      };

      const monitoredMiddleware = middlewareFactory.withPerformanceMonitoring(testMiddleware);

      // Execute multiple times
      for (let i = 0; i < 5; i++) {
        await new Promise<void>((resolve) => {
          const mockReq = testUtils.createMockRequest();
          const mockRes = testUtils.createMockResponse();
          const mockNext = vi.fn(() => resolve());

          monitoredMiddleware(mockReq as Request, mockRes as Response, mockNext);
        });
      }

      const metrics = middlewareFactory.getMetrics();
      expect(metrics.totalExecutions).toBe(5);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });

    it('should not collect metrics when disabled', async () => {
      middlewareFactory = new MiddlewareFactory({
        enableMetrics: false,
        enableErrorHandling: true,
        enableContextPreservation: true,
      });

      const testMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next();
      };

      const monitoredMiddleware = middlewareFactory.withPerformanceMonitoring(testMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          const metrics = middlewareFactory.getMetrics();
          expect(metrics.totalExecutions).toBe(0);
          resolve();
        });

        monitoredMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap middleware with error handling', async () => {
      const throwingMiddleware = (req: Request, res: Response, next: NextFunction) => {
        throw new Error('Synchronous error');
      };

      const wrappedMiddleware = middlewareFactory.withErrorHandling(throwingMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Synchronous error');
          resolve();
        });

        wrappedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should handle async middleware errors', async () => {
      const asyncThrowingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      };

      const wrappedMiddleware = middlewareFactory.withErrorHandling(asyncThrowingMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Async error');
          resolve();
        });

        wrappedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should preserve original error when error handling is disabled', async () => {
      middlewareFactory = new MiddlewareFactory({
        enableMetrics: true,
        enableErrorHandling: false,
        enableContextPreservation: true,
      });

      const throwingMiddleware = (req: Request, res: Response, next: NextFunction) => {
        throw new Error('Original error');
      };

      const wrappedMiddleware = middlewareFactory.withErrorHandling(throwingMiddleware);

      expect(() => {
        wrappedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Original error');
    });

    it('should handle middleware that calls next with error', async () => {
      const errorMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next(new Error('Next error'));
      };

      const wrappedMiddleware = middlewareFactory.withErrorHandling(errorMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Next error');
          resolve();
        });

        wrappedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });
  });

  describe('Context Preservation', () => {
    it('should preserve async context across middleware', async () => {
      const contextMiddleware = middlewareFactory.withContextPreservation(
        (req: Request, res: Response, next: NextFunction) => {
          req.contextPreserved = true;
          setTimeout(() => {
            req.asyncOperation = true;
            next();
          }, 10);
        }
      );

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.contextPreserved).toBe(true);
          expect(mockRequest.asyncOperation).toBe(true);
          resolve();
        });

        contextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should handle context preservation with errors', async () => {
      const contextMiddleware = middlewareFactory.withContextPreservation(
        (req: Request, res: Response, next: NextFunction) => {
          setTimeout(() => {
            next(new Error('Context error'));
          }, 10);
        }
      );

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Context error');
          resolve();
        });

        contextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should not apply context preservation when disabled', async () => {
      middlewareFactory = new MiddlewareFactory({
        enableMetrics: true,
        enableErrorHandling: true,
        enableContextPreservation: false,
      });

      const testMiddleware = (req: Request, res: Response, next: NextFunction) => {
        req.processed = true;
        next();
      };

      const wrappedMiddleware = middlewareFactory.withContextPreservation(testMiddleware);

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.processed).toBe(true);
          resolve();
        });

        wrappedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });
  });

  describe('Middleware Registry', () => {
    it('should register and retrieve middleware', () => {
      const testMiddleware = (req: Request, res: Response, next: NextFunction) => {
        next();
      };

      middlewareFactory.register('test-middleware', testMiddleware);

      const retrieved = middlewareFactory.get('test-middleware');
      expect(retrieved).toBe(testMiddleware);
    });

    it('should return undefined for non-existent middleware', () => {
      const retrieved = middlewareFactory.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should list all registered middleware names', () => {
      const middleware1 = (req: Request, res: Response, next: NextFunction) => next();
      const middleware2 = (req: Request, res: Response, next: NextFunction) => next();

      middlewareFactory.register('middleware1', middleware1);
      middlewareFactory.register('middleware2', middleware2);

      const names = middlewareFactory.list();
      expect(names).toContain('middleware1');
      expect(names).toContain('middleware2');
    });

    it('should unregister middleware', () => {
      const testMiddleware = (req: Request, res: Response, next: NextFunction) => next();

      middlewareFactory.register('test-middleware', testMiddleware);
      expect(middlewareFactory.get('test-middleware')).toBe(testMiddleware);

      middlewareFactory.unregister('test-middleware');
      expect(middlewareFactory.get('test-middleware')).toBeUndefined();
    });

    it('should overwrite existing middleware registration', () => {
      const middleware1 = (req: Request, res: Response, next: NextFunction) => {
        req.version = 1;
        next();
      };

      const middleware2 = (req: Request, res: Response, next: NextFunction) => {
        req.version = 2;
        next();
      };

      middlewareFactory.register('test-middleware', middleware1);
      middlewareFactory.register('test-middleware', middleware2);

      const retrieved = middlewareFactory.get('test-middleware');
      expect(retrieved).toBe(middleware2);
    });
  });

  describe('Middleware Configuration', () => {
    it('should create middleware with custom configuration', () => {
      const rateLimitMiddleware = middlewareFactory.createRateLimit({
        max: 50,
        windowMs: 30000,
        algorithm: 'token-bucket',
        keyGenerator: (req) => req.ip,
        skipIf: (req) => req.path === '/health',
      });

      expect(rateLimitMiddleware).toBeInstanceOf(Function);
    });

    it('should validate middleware configuration', () => {
      expect(() => {
        middlewareFactory.createRateLimit({
          max: -1, // Invalid
          windowMs: 60000,
        });
      }).toThrow();

      expect(() => {
        middlewareFactory.createValidation({
          body: null, // Invalid
        });
      }).toThrow();
    });

    it('should merge default and custom configuration', () => {
      const loggingMiddleware = middlewareFactory.createLogging({
        includeBody: false, // Override default
        // Other options should use defaults
      });

      expect(loggingMiddleware).toBeInstanceOf(Function);
    });
  });

  describe('Integration with Core Services', () => {
    it('should integrate with rate limiting service', async () => {
      const rateLimitMiddleware = middlewareFactory.createRateLimit({
        max: 2,
        windowMs: 1000,
      });

      mockRequest.ip = '127.0.0.1';

      // First request should pass
      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockResponse.status).not.toHaveBeenCalledWith(429);
          resolve();
        });

        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });

      // Second request should pass
      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockResponse.status).not.toHaveBeenCalledWith(429);
          resolve();
        });

        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });

      // Third request should be rate limited
      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          // Should not call next for rate limited request
          expect.fail('Should not call next for rate limited request');
        });

        mockResponse.status = vi.fn().mockReturnThis();
        mockResponse.json = vi.fn().mockImplementation(() => {
          expect(mockResponse.status).toHaveBeenCalledWith(429);
          resolve();
        });

        rateLimitMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should integrate with validation service', async () => {
      const validationMiddleware = middlewareFactory.createValidation({
        body: {
          name: 'string',
          age: 'number',
        },
      });

      // Valid request
      mockRequest.body = { name: 'John', age: 30 };

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          expect(mockRequest.body.name).toBe('John');
          expect(mockRequest.body.age).toBe(30);
          resolve();
        });

        validationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });

      // Invalid request
      mockRequest.body = { name: 123, age: 'invalid' };

      await new Promise<void>((resolve) => {
        mockNext = vi.fn((error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain('validation');
          resolve();
        });

        validationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });

    it('should integrate with logging service', async () => {
      const loggingMiddleware = middlewareFactory.createLogging({
        includeBody: true,
        includeQuery: true,
      });

      mockRequest.method = 'POST';
      mockRequest.url = '/api/test';
      mockRequest.body = { data: 'test' };
      mockRequest.query = { param: 'value' };

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          // Logging should have occurred
          resolve();
        });

        loggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle middleware factory configuration errors', () => {
      expect(() => {
        new MiddlewareFactory({
          enableMetrics: true,
          enableErrorHandling: true,
          enableContextPreservation: true,
          invalidOption: true, // Invalid option
        } as any);
      }).toThrow();
    });

    it('should handle middleware creation with invalid parameters', () => {
      expect(() => {
        middlewareFactory.createRateLimit(null as any);
      }).toThrow();

      expect(() => {
        middlewareFactory.createValidation(undefined as any);
      }).toThrow();
    });

    it('should handle composition with invalid middleware', () => {
      expect(() => {
        middlewareFactory.compose([null as any]);
      }).toThrow();

      expect(() => {
        middlewareFactory.compose([undefined as any]);
      }).toThrow();
    });

    it('should handle chain building errors', () => {
      expect(() => {
        middlewareFactory
          .chain()
          .use(null as any)
          .build();
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle high-volume middleware execution efficiently', async () => {
      const fastMiddleware = (req: Request, res: Response, next: NextFunction) => {
        req.processed = true;
        next();
      };

      const monitoredMiddleware = middlewareFactory.withPerformanceMonitoring(fastMiddleware);

      const startTime = Date.now();

      // Execute many times
      const promises = Array(1000).fill(0).map(() => {
        return new Promise<void>((resolve) => {
          const mockReq = testUtils.createMockRequest();
          const mockRes = testUtils.createMockResponse();
          const mockNext = vi.fn(() => resolve());

          monitoredMiddleware(mockReq as Request, mockRes as Response, mockNext);
        });
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete quickly
      
      const metrics = middlewareFactory.getMetrics();
      expect(metrics.totalExecutions).toBe(1000);
    });

    it('should optimize middleware composition for large chains', async () => {
      const middlewares = Array(50).fill(0).map((_, i) => {
        return (req: Request, res: Response, next: NextFunction) => {
          req[`step${i}`] = true;
          next();
        };
      });

      const composed = middlewareFactory.compose(middlewares);

      const startTime = Date.now();

      await new Promise<void>((resolve) => {
        mockNext = vi.fn(() => {
          const endTime = Date.now();
          expect(endTime - startTime).toBeLessThan(100); // Should be fast
          resolve();
        });

        composed(mockRequest as Request, mockResponse as Response, mockNext);
      });
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      const testMiddleware = (req: Request, res: Response, next: NextFunction) => next();
      
      middlewareFactory.register('test', testMiddleware);
      expect(middlewareFactory.list()).toContain('test');

      middlewareFactory.destroy();

      expect(middlewareFactory.list()).toHaveLength(0);
    });

    it('should handle multiple destroy calls', () => {
      middlewareFactory.destroy();
      middlewareFactory.destroy();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should prevent operations after destroy', () => {
      middlewareFactory.destroy();

      expect(() => {
        middlewareFactory.createRateLimit({ max: 100, windowMs: 60000 });
      }).toThrow('MiddlewareFactory has been destroyed');

      expect(() => {
        middlewareFactory.register('test', vi.fn());
      }).toThrow('MiddlewareFactory has been destroyed');
    });

    it('should reset metrics on destroy', () => {
      const testMiddleware = (req: Request, res: Response, next: NextFunction) => next();
      const monitoredMiddleware = middlewareFactory.withPerformanceMonitoring(testMiddleware);

      // Execute to generate metrics
      monitoredMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      let metrics = middlewareFactory.getMetrics();
      expect(metrics.totalExecutions).toBeGreaterThan(0);

      middlewareFactory.destroy();

      // Metrics should be reset
      metrics = middlewareFactory.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
    });
  });
});











































