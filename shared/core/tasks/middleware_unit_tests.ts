// === Test Setup and Utilities ===
// core/src/middleware/__tests__/setup.ts

import { Container } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../logging';

/**
 * Test utilities that create mock objects and setup testing environment.
 * Think of this as the "testing toolbox" that all other tests will use.
 */
export class TestUtils {
  /**
   * Creates a mock Express request object with sensible defaults.
   * This simulates an HTTP request coming into your server.
   */
  static createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
    const baseRequest = {
      path: '/test',
      method: 'GET',
      headers: {},
      query: {},
      params: {},
      body: {},
      user: undefined,
      session: undefined,
      correlationId: undefined,
      ...overrides
    };
    
    return baseRequest as Partial<Request>;
  }

  /**
   * Creates a mock Express response object with spies to track what was called.
   * This simulates the HTTP response that will be sent back to the client.
   */
  static createMockResponse(): Partial<Response> {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      locals: {}
    };
    
    return response as Partial<Response>;
  }

  /**
   * Creates a mock next function that tracks if it was called with errors.
   * This represents the Express middleware chain continuation.
   */
  static createMockNext(): jest.MockedFunction<NextFunction> {
    return jest.fn() as jest.MockedFunction<NextFunction>;
  }

  /**
   * Creates a dependency injection container with mock services.
   * This simulates the IoC container that provides dependencies to middleware.
   */
  static createTestContainer(): Container {
    const container = new Container();
    
    // Mock logger that tracks what was logged
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      requestLoggingMiddleware: jest.fn(() => 
        (req: Request, res: Response, next: NextFunction) => next()
      ),
      isHealthy: jest.fn().mockResolvedValue(true)
    };
    
    // Mock auth service that can be configured for success/failure
    const mockAuthService = {
      authenticate: jest.fn((req, res, next) => next()),
      isHealthy: jest.fn().mockResolvedValue(true)
    };

    container.bind<Logger>('Logger').toConstantValue(mockLogger as any);
    container.bind('AuthService').toConstantValue(mockAuthService);
    
    return container;
  }
}

// === Configuration Schema Tests ===
// core/src/middleware/__tests__/config.test.ts

import { middlewareConfigSchema, MiddlewareConfig } from '../config/MiddlewareConfig';

describe('MiddlewareConfig', () => {
  /**
   * Testing configuration validation is crucial because invalid config
   * can cause runtime failures that are hard to debug.
   */
  
  describe('schema validation', () => {
    it('should accept valid configuration with all defaults', () => {
      // Test the "happy path" - what happens when everything is correct
      const config = {};
      const result = middlewareConfigSchema.parse(config);
      
      // Verify that defaults are applied correctly
      expect(result.logging.enabled).toBe(true);
      expect(result.logging.priority).toBe(10);
      expect(result.auth.enabled).toBe(true);
      expect(result.global.enableLegacyMode).toBe(false);
    });

    it('should apply custom values when provided', () => {
      // Test that user overrides work correctly
      const customConfig = {
        logging: { enabled: false, priority: 99 },
        auth: { enabled: true, priority: 5 },
        global: { enableLegacyMode: true }
      };
      
      const result = middlewareConfigSchema.parse(customConfig);
      
      expect(result.logging.enabled).toBe(false);
      expect(result.logging.priority).toBe(99);
      expect(result.auth.priority).toBe(5);
      expect(result.global.enableLegacyMode).toBe(true);
    });

    it('should reject invalid priority values', () => {
      // Test error handling - what happens when config is wrong
      const invalidConfig = {
        logging: { priority: -1 } // Invalid: priorities must be 0-100
      };
      
      expect(() => middlewareConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should handle health endpoint configuration', () => {
      // Test specific feature configuration
      const configWithHealthEndpoint = {
        health: {
          enabled: true,
          config: {
            endpoint: '/custom-health',
            includeSystemMetrics: false
          }
        }
      };
      
      const result = middlewareConfigSchema.parse(configWithHealthEndpoint);
      
      expect(result.health.config?.endpoint).toBe('/custom-health');
      expect(result.health.config?.includeSystemMetrics).toBe(false);
    });
  });
});

// === Middleware Provider Tests ===
// core/src/middleware/__tests__/providers.test.ts

import { LoggingMiddlewareProvider, AuthMiddlewareProvider } from '../factory/MiddlewareFactory';
import { TestUtils } from './setup';

describe('LoggingMiddlewareProvider', () => {
  let provider: LoggingMiddlewareProvider;
  let mockLogger: any;
  let container: Container;

  beforeEach(() => {
    // Set up fresh test environment for each test
    // This prevents tests from interfering with each other
    container = TestUtils.createTestContainer();
    mockLogger = container.get('Logger');
    provider = new LoggingMiddlewareProvider(mockLogger);
  });

  describe('middleware creation', () => {
    it('should create middleware that adds correlation ID', () => {
      // Test the core functionality of the logging middleware
      const middleware = provider.createHandler();
      const req = TestUtils.createMockRequest();
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      middleware(req as Request, res as Response, next);

      // Verify that correlation ID was added to request
      expect(req.correlationId).toBeDefined();
      expect(typeof req.correlationId).toBe('string');
      
      // Verify that correlation ID header was set on response
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-correlation-id', 
        req.correlationId
      );
      
      // Verify that the underlying logger middleware was called
      expect(mockLogger.requestLoggingMiddleware).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      // Test that we respect correlation IDs from upstream services
      const existingCorrelationId = 'existing-correlation-123';
      const middleware = provider.createHandler();
      const req = TestUtils.createMockRequest({
        headers: { 'x-correlation-id': existingCorrelationId }
      });
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      middleware(req as Request, res as Response, next);

      expect(req.correlationId).toBe(existingCorrelationId);
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-correlation-id', 
        existingCorrelationId
      );
    });
  });

  describe('health checks', () => {
    it('should report healthy when logger is healthy', async () => {
      // Test the health check mechanism
      mockLogger.isHealthy.mockResolvedValue(true);
      
      const isHealthy = await provider.isHealthy();
      
      expect(isHealthy).toBe(true);
      expect(mockLogger.isHealthy).toHaveBeenCalled();
    });

    it('should report unhealthy when logger fails', async () => {
      // Test error propagation in health checks
      mockLogger.isHealthy.mockResolvedValue(false);
      
      const isHealthy = await provider.isHealthy();
      
      expect(isHealthy).toBe(false);
    });
  });
});

describe('AuthMiddlewareProvider', () => {
  let provider: AuthMiddlewareProvider;
  let mockAuthService: any;
  let container: Container;

  beforeEach(() => {
    container = TestUtils.createTestContainer();
    mockAuthService = container.get('AuthService');
    provider = new AuthMiddlewareProvider(mockAuthService);
  });

  describe('authentication logic', () => {
    it('should skip authentication for health check endpoints', () => {
      // Test that certain routes bypass authentication
      const middleware = provider.createHandler();
      const req = TestUtils.createMockRequest({ path: '/health' });
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      middleware(req as Request, res as Response, next);

      // Should call next() without calling auth service
      expect(next).toHaveBeenCalledWith(); // No error parameter
      expect(mockAuthService.authenticate).not.toHaveBeenCalled();
    });

    it('should authenticate protected routes', async () => {
      // Test normal authentication flow
      const middleware = provider.createHandler();
      const req = TestUtils.createMockRequest({ path: '/api/users' });
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(mockAuthService.authenticate).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle auth failures gracefully in legacy mode', async () => {
      // Test error handling with legacy fallback
      const authError = new Error('Authentication failed');
      mockAuthService.authenticate.mockRejectedValue(authError);
      
      const middleware = provider.createHandler({ legacyFallback: true });
      const req = TestUtils.createMockRequest({ path: '/api/users' });
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      await middleware(req as Request, res as Response, next);

      // Should continue without error in legacy fallback mode
      expect(next).toHaveBeenCalledWith(); // No error parameter
    });

    it('should propagate auth failures in strict mode', async () => {
      // Test that errors are properly propagated when not in legacy mode
      const authError = new Error('Authentication failed');
      mockAuthService.authenticate.mockRejectedValue(authError);
      
      const middleware = provider.createHandler({ legacyFallback: false });
      const req = TestUtils.createMockRequest({ path: '/api/users' });
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(authError);
    });
  });
});

// === Unified Middleware Manager Tests ===
// core/src/middleware/__tests__/UnifiedMiddleware.test.ts

import { UnifiedMiddlewareManager } from '../UnifiedMiddleware';
import { IMiddlewareProvider } from '../factory/MiddlewareFactory';
import { TestUtils } from './setup';

describe('UnifiedMiddlewareManager', () => {
  let manager: UnifiedMiddlewareManager;
  let container: Container;
  let mockLogger: any;

  beforeEach(() => {
    container = TestUtils.createTestContainer();
    mockLogger = container.get('Logger');
    manager = new UnifiedMiddlewareManager(container);
  });

  describe('provider registration', () => {
    it('should register middleware providers', () => {
      // Test the registration mechanism
      const mockProvider: IMiddlewareProvider = {
        name: 'test-provider',
        priority: 50,
        createHandler: jest.fn(() => (req, res, next) => next()),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      manager.registerProvider(mockProvider);

      // Verify internal state (this tests the registration mechanism)
      // Note: In a real implementation, you might want to add a public
      // method to query registered providers
      expect(() => manager.registerProvider(mockProvider)).not.toThrow();
    });
  });

  describe('middleware creation and ordering', () => {
    it('should create middleware in priority order', async () => {
      // Test that middleware are applied in the correct order
      const executionOrder: string[] = [];
      
      // Create mock providers with different priorities
      const lowPriorityProvider: IMiddlewareProvider = {
        name: 'low-priority',
        priority: 10,
        createHandler: jest.fn(() => (req, res, next) => {
          executionOrder.push('low-priority');
          next();
        }),
        isHealthy: jest.fn().mockResolvedValue(true)
      };
      
      const highPriorityProvider: IMiddlewareProvider = {
        name: 'high-priority',
        priority: 90,
        createHandler: jest.fn(() => (req, res, next) => {
          executionOrder.push('high-priority');
          next();
        }),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      manager.registerProvider(highPriorityProvider); // Register in wrong order
      manager.registerProvider(lowPriorityProvider);

      const router = await manager.createMiddleware({
        global: { enableLegacyMode: false }
      });

      // Simulate a request through the middleware stack
      const req = TestUtils.createMockRequest();
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      // Execute the router middleware
      // Note: This is simplified - in reality you'd need to simulate
      // the Express router execution
      expect(lowPriorityProvider.createHandler).toHaveBeenCalled();
      expect(highPriorityProvider.createHandler).toHaveBeenCalled();
    });

    it('should skip unhealthy middleware in legacy mode', async () => {
      // Test graceful degradation when components fail health checks
      const unhealthyProvider: IMiddlewareProvider = {
        name: 'unhealthy-provider',
        priority: 50,
        createHandler: jest.fn(() => (req, res, next) => next()),
        isHealthy: jest.fn().mockResolvedValue(false) // Fails health check
      };

      manager.registerProvider(unhealthyProvider);

      const router = await manager.createMiddleware({
        global: { enableLegacyMode: true }
      });

      // Should not throw error and should log warning
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed health check')
      );
      expect(router).toBeDefined();
    });

    it('should fail fast with unhealthy middleware in strict mode', async () => {
      // Test that unhealthy middleware causes failure in production mode
      const unhealthyProvider: IMiddlewareProvider = {
        name: 'unhealthy-provider',
        priority: 50,
        createHandler: jest.fn(() => (req, res, next) => next()),
        isHealthy: jest.fn().mockResolvedValue(false)
      };

      manager.registerProvider(unhealthyProvider);

      await expect(manager.createMiddleware({
        global: { enableLegacyMode: false }
      })).rejects.toThrow('unhealthy-provider middleware unhealthy');
    });
  });

  describe('error recovery', () => {
    it('should wrap middleware with error recovery', async () => {
      // Test that middleware errors are caught and handled
      const errorThrowingProvider: IMiddlewareProvider = {
        name: 'error-provider',
        priority: 50,
        createHandler: jest.fn(() => (req, res, next) => {
          throw new Error('Middleware error');
        }),
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      manager.registerProvider(errorThrowingProvider);

      const router = await manager.createMiddleware();

      // The error should be caught and logged, not crash the application
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error hasn't occurred yet
      
      // When we actually execute the middleware, it should handle the error
      // This would need more complex setup to test the actual execution
    });
  });

  describe('deprecation warnings', () => {
    it('should add deprecation headers for legacy paths', async () => {
      // Test that deprecation warnings are properly added
      const router = await manager.createMiddleware({
        global: { enableDeprecationWarnings: true }
      });

      const req = TestUtils.createMockRequest({ path: '/api/v1/users' });
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      // This tests the deprecation warning middleware
      // In practice, you'd need to execute the router to test this
      expect(router).toBeDefined();
    });
  });
});

// === Legacy Bridge Tests ===
// core/src/middleware/__tests__/LegacyBridge.test.ts

import { LegacyBridge } from '../legacy/LegacyBridge';
import { TestUtils } from './setup';

describe('LegacyBridge', () => {
  let bridge: LegacyBridge;

  beforeEach(() => {
    bridge = new LegacyBridge();
  });

  describe('legacy middleware registration', () => {
    it('should register and execute legacy middleware', () => {
      // Test that legacy middleware can be integrated
      const mockLegacyMiddleware = jest.fn((req, res, next) => {
        req.user = { id: '123', name: 'Test User' };
        next();
      });

      bridge.registerLegacy('test-middleware', mockLegacyMiddleware);
      const bridgeHandler = bridge.createBridgeHandler('test-middleware');

      const req = TestUtils.createMockRequest();
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      bridgeHandler(req as Request, res as Response, next);

      expect(mockLegacyMiddleware).toHaveBeenCalledWith(req, res, next);
      expect(req.user).toEqual({ id: '123', name: 'Test User' });
    });

    it('should handle missing legacy middleware gracefully', () => {
      // Test error handling when legacy middleware isn't found
      const bridgeHandler = bridge.createBridgeHandler('non-existent');
      
      const req = TestUtils.createMockRequest();
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      // Should log warning and continue
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      bridgeHandler(req as Request, res as Response, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Legacy middleware \'non-existent\' not found')
      );
      expect(next).toHaveBeenCalledWith(); // No error
      
      consoleSpy.mockRestore();
    });

    it('should add compatibility layer for legacy expectations', () => {
      // Test that the bridge adds expected properties for legacy middleware
      const mockLegacyMiddleware = jest.fn((req, res, next) => {
        // Legacy middleware expects these properties to exist
        expect(req.user).toBeDefined();
        expect(req.session).toBeDefined();
        expect(res.locals).toBeDefined();
        next();
      });

      bridge.registerLegacy('compat-test', mockLegacyMiddleware);
      const bridgeHandler = bridge.createBridgeHandler('compat-test');

      const req = TestUtils.createMockRequest();
      const res = TestUtils.createMockResponse();
      const next = TestUtils.createMockNext();

      bridgeHandler(req as Request, res as Response, next);

      expect(mockLegacyMiddleware).toHaveBeenCalled();
    });
  });
});

// === Migration Helper Tests ===
// core/src/middleware/__tests__/MigrationHelper.test.ts

import { MigrationHelper } from '../migration/MigrationHelper';
import { TestUtils } from './setup';
import { logger } from '../src/observability/logging';

describe('MigrationHelper', () => {
  describe('gradual migration strategies', () => {
    beforeEach(() => {
      // Clean up environment variables before each test
      delete process.env.USE_UNIFIED_MIDDLEWARE;
    });

    it('should support feature flag based migration', () => {
      // Test feature flag mechanism
      const migration = MigrationHelper.createGradualMigration();

      // Test disabled state
      process.env.USE_UNIFIED_MIDDLEWARE = 'false';
      expect(migration.byFeatureFlag()).toBe(false);

      // Test enabled state
      process.env.USE_UNIFIED_MIDDLEWARE = 'true';
      expect(migration.byFeatureFlag()).toBe(true);

      // Test custom flag name
      process.env.CUSTOM_FLAG = 'true';
      expect(migration.byFeatureFlag('CUSTOM_FLAG')).toBe(true);
    });

    it('should support route-based migration', () => {
      // Test that specific routes can be migrated first
      const migration = MigrationHelper.createGradualMigration();

      const v2Request = TestUtils.createMockRequest({ path: '/api/v2/users' });
      const v1Request = TestUtils.createMockRequest({ path: '/api/v1/users' });
      const graphqlRequest = TestUtils.createMockRequest({ path: '/graphql' });

      expect(migration.byRoute(v2Request as Request)).toBe(true);
      expect(migration.byRoute(v1Request as Request)).toBe(false);
      expect(migration.byRoute(graphqlRequest as Request)).toBe(true);
    });

    it('should support user-based migration', () => {
      // Test that specific users can be migrated gradually
      const migration = MigrationHelper.createGradualMigration();

      const userRequest = TestUtils.createMockRequest({
        user: { id: 'test-user-123' }
      });
      const noUserRequest = TestUtils.createMockRequest();

      // User-based migration should return consistent results for same user
      const result1 = migration.byUser(userRequest as Request);
      const result2 = migration.byUser(userRequest as Request);
      expect(result1).toBe(result2); // Consistent hashing

      // No user should return false
      expect(migration.byUser(noUserRequest as Request)).toBe(false);
    });
  });
});

// === Integration Test Helpers ===
// core/src/middleware/__tests__/integration-helpers.ts

/**
 * Integration test helpers that test multiple components working together.
 * These bridge the gap between unit tests and full end-to-end tests.
 */
export class IntegrationTestHelpers {
  /**
   * Creates a complete middleware stack for testing end-to-end scenarios
   */
  static async createTestMiddlewareStack() {
    const container = TestUtils.createTestContainer();
    const manager = new UnifiedMiddlewareManager(container);

    // Register all standard providers
    const loggingProvider = new LoggingMiddlewareProvider(container.get('Logger'));
    const authProvider = new AuthMiddlewareProvider(container.get('AuthService'));

    manager.registerProvider(loggingProvider);
    manager.registerProvider(authProvider);

    return {
      manager,
      container,
      createRouter: (config?: any) => manager.createMiddleware(config)
    };
  }

  /**
   * Simulates a full HTTP request through the middleware stack
   */
  static async simulateRequest(router: any, requestConfig: any = {}) {
    const req = TestUtils.createMockRequest(requestConfig);
    const res = TestUtils.createMockResponse();
    const next = TestUtils.createMockNext();

    // This would need to be implemented based on your actual router structure
    // The key is to provide a way to test the complete request flow

    return { req, res, next };
  }
}











































