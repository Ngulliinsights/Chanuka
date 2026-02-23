/**
 * Central Error Framework Tests
 *
 * Tests for the unified error handling system, error types, and core functionality
 * across all four client systems (Security, Hooks, Library Services, Service Architecture).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  BaseError,
  ValidationError,
  NetworkError,
  UnauthorizedError,
  NotFoundError,
  CacheError,
  NavigationError,
  NavigationItemNotFoundError,
  InvalidNavigationPathError,
  NavigationAccessDeniedError,
  NavigationValidationError,
  NavigationConfigurationError,
} from '@client/infrastructure/error/classes';
import {
  ErrorDomain,
  ErrorSeverity,
  RecoveryAction,
} from '@client/infrastructure/error/constants';
import { coreErrorHandler } from '@client/infrastructure/error/handler';
import { AppError, ErrorContext, ErrorMetadata } from '@client/infrastructure/error/types';

// Mock the error handler to avoid side effects in tests
vi.mock('../../../core/error/handler', () => ({
  coreErrorHandler: {
    handleError: vi.fn(),
    addRecoveryStrategy: vi.fn(),
    getRecoveryStrategies: vi.fn(() => []),
    removeRecoveryStrategy: vi.fn(),
    clearRecoveryStrategies: vi.fn(),
    setErrorLogger: vi.fn(),
    addReporter: vi.fn(),
    removeReporter: vi.fn(),
    clearReporters: vi.fn(),
    getStats: vi.fn(() => ({
      total: 0,
      byType: {},
      bySeverity: {},
      recent: { lastHour: 0, last24Hours: 0, last7Days: 0 },
      recovered: 0,
      retryable: 0,
    })),
  },
}));

describe('AppError Class', () => {
  let mockContext: ErrorContext;

  beforeEach(() => {
    mockContext = {
      component: 'TestComponent',
      operation: 'testOperation',
      userId: 'user123',
      sessionId: 'session456',
      requestId: 'req789',
      url: '/test/path',
      userAgent: 'TestAgent/1.0',
      retryCount: 0,
      route: '/test',
      timestamp: Date.now(),
    };
  });

  it('should create AppError with required parameters', () => {
    const error = new AppError('Test error message', 'TEST_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM);

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.type).toBe(ErrorDomain.SYSTEM);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.id).toBeDefined();
    expect(error.timestamp).toBeDefined();
    expect(error.correlationId).toBe(error.id);
  });

  it('should create AppError with optional parameters', () => {
    const recoveryStrategies = [{
      id: 'retry',
      type: RecoveryAction.RETRY,
      name: 'Retry',
      description: 'Retry the operation',
      automatic: true,
      priority: 1,
    }];

    const error = new AppError(
      'Test error with options',
      'TEST_ERROR_OPTIONS',
      ErrorDomain.NETWORK,
      ErrorSeverity.HIGH,
      {
        statusCode: 500,
        context: mockContext,
        userId: 'user456',
        sessionId: 'session789',
        recoverable: true,
        retryable: true,
        recoveryStrategies,
        retryCount: 2,
        recovered: false,
        recoveryStrategy: 'retry',
        correlationId: 'custom-correlation-id',
        details: { additionalInfo: 'test' },
      }
    );

    expect(error.statusCode).toBe(500);
    expect(error.context).toBe(mockContext);
    expect(error.userId).toBe('user456');
    expect(error.sessionId).toBe('session789');
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(true);
    expect(error.recoveryStrategies).toEqual(recoveryStrategies);
    expect(error.retryCount).toBe(2);
    expect(error.recovered).toBe(false);
    expect(error.recoveryStrategy).toBe('retry');
    expect(error.correlationId).toBe('custom-correlation-id');
    expect(error.details).toEqual({ additionalInfo: 'test' });
  });

  it('should serialize to JSON correctly', () => {
    const error = new AppError('Test error', 'TEST_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      context: mockContext,
      recoverable: true,
      retryable: true,
    });

    const json = error.toJSON();

    expect(json).toEqual({
      id: error.id,
      name: 'AppError',
      message: 'Test error',
      code: 'TEST_ERROR',
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      statusCode: undefined,
      timestamp: error.timestamp,
      context: mockContext,
      userId: undefined,
      sessionId: undefined,
      recoverable: true,
      retryable: true,
      recoveryStrategies: [],
      retryCount: 0,
      recovered: false,
      recoveryStrategy: undefined,
      correlationId: error.correlationId,
      stack: error.stack,
      details: undefined,
    });
  });

  it('should determine if error can recover', () => {
    const recoverableError = new AppError('Recoverable error', 'RECOVERABLE', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      recoverable: true,
      recoveryStrategies: [{
        id: 'retry',
        type: RecoveryAction.RETRY,
        name: 'Retry',
        description: 'Retry operation',
        automatic: true,
        priority: 1,
      }],
    });

    const nonRecoverableError = new AppError('Non-recoverable error', 'NON_RECOVERABLE', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL);

    expect(recoverableError.canRecover()).toBe(true);
    expect(nonRecoverableError.canRecover()).toBe(false);
  });

  it('should return recovery strategies', () => {
    const strategies = [{
      id: 'retry',
      type: RecoveryAction.RETRY,
      name: 'Retry',
      description: 'Retry operation',
      automatic: true,
      priority: 1,
    }];

    const error = new AppError('Error with strategies', 'STRATEGY_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      recoveryStrategies: strategies,
    });

    expect(error.getRecoveryStrategies()).toEqual(strategies);
  });

  it('should create new error with incremented retry count', () => {
    const originalError = new AppError('Original error', 'ORIGINAL', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      retryCount: 1,
    });

    const retriedError = originalError.withRetry();

    expect(retriedError.retryCount).toBe(2);
    expect(retriedError.message).toBe(originalError.message);
    expect(retriedError.code).toBe(originalError.code);
    expect(retriedError.id).not.toBe(originalError.id); // Should be new instance
  });
});

describe('BaseError Class', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create BaseError with default values', () => {
    const error = new BaseError('Test base error');

    expect(error.message).toBe('Test base error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.domain).toBe(ErrorDomain.SYSTEM);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.retryable).toBe(false);
    expect(error.recoverable).toBe(false);
    expect(error.errorId).toBeDefined();
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should create BaseError with custom options', () => {
    const context: ErrorContext = {
      component: 'TestComponent',
      operation: 'testOp',
    };

    const error = new BaseError('Custom error', {
      statusCode: 400,
      code: 'CUSTOM_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      recoverable: true,
      context,
      correlationId: 'custom-id',
    });

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.domain).toBe(ErrorDomain.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.retryable).toBe(true);
    expect(error.recoverable).toBe(true);
    expect(error.context).toBe(context);
    expect(error.metadata.correlationId).toBe('custom-id');
  });

  it('should log errors based on severity', () => {
    // Critical error should use console.error
    new BaseError('Critical error', { severity: ErrorSeverity.CRITICAL });
    expect(console.error).toHaveBeenCalled();

    // High severity should use console.error
    new BaseError('High error', { severity: ErrorSeverity.HIGH });
    expect(console.error).toHaveBeenCalled();

    // Medium severity should use console.warn
    new BaseError('Medium error', { severity: ErrorSeverity.MEDIUM });
    expect(console.warn).toHaveBeenCalled();

    // Low severity should use console.info
    new BaseError('Low error', { severity: ErrorSeverity.LOW });
    expect(console.info).toHaveBeenCalled();
  });

  it('should serialize to JSON', () => {
    const error = new BaseError('Serializable error', {
      statusCode: 404,
      code: 'NOT_FOUND',
      context: { component: 'Test' },
    });

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'BaseError',
      message: 'Serializable error',
      code: 'NOT_FOUND',
      statusCode: 404,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      errorId: error.errorId,
      timestamp: error.timestamp.toISOString(),
      retryable: false,
      recoverable: false,
      context: { component: 'Test' },
      stack: error.stack,
    });
  });

  it('should add context to existing error', () => {
    const originalError = new BaseError('Original error', {
      context: { component: 'Original' },
    });

    const enhancedError = originalError.withContext({
      operation: 'Enhanced',
      userId: 'user123',
    });

    expect(enhancedError.context).toEqual({
      component: 'Original',
      operation: 'Enhanced',
      userId: 'user123',
    });
    expect(enhancedError.message).toBe('Original error');
  });
});

describe('Specific Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with details', () => {
      const details = { field1: ['Required'], field2: ['Invalid format'] };
      const error = new ValidationError('Validation failed', details);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.domain).toBe(ErrorDomain.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.details).toBe(details);
      expect(error.retryable).toBe(false);
      expect(error.recoverable).toBe(false);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with defaults', () => {
      const error = new NetworkError();

      expect(error.message).toBe('Network error');
      expect(error.statusCode).toBe(0);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.domain).toBe(ErrorDomain.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.retryable).toBe(true);
      expect(error.recoverable).toBe(true);
    });

    it('should create network error with custom message', () => {
      const error = new NetworkError('Custom network error');

      expect(error.message).toBe('Custom network error');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.domain).toBe(ErrorDomain.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(false);
      expect(error.recoverable).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.domain).toBe(ErrorDomain.EXTERNAL_SERVICE);
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('CacheError', () => {
    it('should create cache error', () => {
      const error = new CacheError('Cache miss');

      expect(error.message).toBe('Cache miss');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CACHE_ERROR');
      expect(error.domain).toBe(ErrorDomain.CACHE);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.retryable).toBe(true);
      expect(error.recoverable).toBe(true);
    });
  });
});

describe('Navigation Error Classes', () => {
  describe('NavigationError', () => {
    it('should create base navigation error', () => {
      const error = new NavigationError('Navigation failed', undefined, 400, { path: '/test' });

      expect(error.message).toBe('Navigation failed');
      expect(error.type).toBe('NAVIGATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.domain).toBe(ErrorDomain.SYSTEM);
      expect(error.details).toEqual({ path: '/test' });
      expect(error.isOperational).toBe(true);
    });
  });

  describe('NavigationItemNotFoundError', () => {
    it('should create navigation item not found error', () => {
      const error = new NavigationItemNotFoundError('/missing/path', { attempted: true });

      expect(error.message).toBe('Navigation item not found for path: /missing/path');
      expect(error.type).toBe('NAVIGATION_ITEM_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ path: '/missing/path', attempted: true });
    });
  });

  describe('InvalidNavigationPathError', () => {
    it('should create invalid navigation path error', () => {
      const error = new InvalidNavigationPathError('/invalid', 'Invalid characters');

      expect(error.message).toBe('Invalid characters');
      expect(error.type).toBe('INVALID_NAVIGATION_PATH');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ path: '/invalid', reason: 'Invalid characters' });
    });
  });

  describe('NavigationAccessDeniedError', () => {
    it('should create navigation access denied error', () => {
      const error = new NavigationAccessDeniedError('/admin', 'Insufficient permissions', ['admin']);

      expect(error.message).toBe('Access denied to navigation path: /admin - Insufficient permissions');
      expect(error.type).toBe('NAVIGATION_ACCESS_DENIED');
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({
        path: '/admin',
        reason: 'Insufficient permissions',
        requiredRole: ['admin']
      });
    });
  });

  describe('NavigationValidationError', () => {
    it('should create navigation validation error', () => {
      const error = new NavigationValidationError('Invalid navigation data', 'path', '/test');

      expect(error.message).toBe('Invalid navigation data');
      expect(error.type).toBe('NAVIGATION_VALIDATION_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ field: 'path', value: '/test' });
    });
  });

  describe('NavigationConfigurationError', () => {
    it('should create navigation configuration error', () => {
      const error = new NavigationConfigurationError('Configuration missing');

      expect(error.message).toBe('Configuration missing');
      expect(error.type).toBe('NAVIGATION_CONFIGURATION_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });
});

describe('Error Constants and Enums', () => {
  it('should define all error domains', () => {
    expect(ErrorDomain.AUTHENTICATION).toBe('authentication');
    expect(ErrorDomain.AUTHORIZATION).toBe('authorization');
    expect(ErrorDomain.PERMISSION).toBe('permission');
    expect(ErrorDomain.VALIDATION).toBe('validation');
    expect(ErrorDomain.NETWORK).toBe('network');
    expect(ErrorDomain.DATABASE).toBe('database');
    expect(ErrorDomain.EXTERNAL_SERVICE).toBe('external_service');
    expect(ErrorDomain.CACHE).toBe('cache');
    expect(ErrorDomain.BUSINESS_LOGIC).toBe('business_logic');
    expect(ErrorDomain.SECURITY).toBe('security');
    expect(ErrorDomain.SESSION).toBe('session');
    expect(ErrorDomain.SYSTEM).toBe('system');
    expect(ErrorDomain.RESOURCE).toBe('resource');
    expect(ErrorDomain.RATE_LIMITING).toBe('rate_limiting');
    expect(ErrorDomain.UNKNOWN).toBe('unknown');
  });

  it('should define all error severities', () => {
    expect(ErrorSeverity.LOW).toBe('low');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.CRITICAL).toBe('critical');
  });

  it('should define all recovery actions', () => {
    expect(RecoveryAction.RETRY).toBe('retry');
    expect(RecoveryAction.CACHE_CLEAR).toBe('cache_clear');
    expect(RecoveryAction.RELOAD).toBe('reload');
    expect(RecoveryAction.REDIRECT).toBe('redirect');
    expect(RecoveryAction.IGNORE).toBe('ignore');
  });
});

describe('Error Handler Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle error through core error handler', () => {
    const error = new AppError('Test error', 'TEST_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM);

    coreErrorHandler.handleError(error);

    expect(coreErrorHandler.handleError).toHaveBeenCalledWith(error);
  });

  it('should add recovery strategy to handler', () => {
    const strategy = {
      id: 'test-strategy',
      name: 'Test Strategy',
      description: 'Test recovery strategy',
      canRecover: () => true,
      recover: async () => true,
      priority: 1,
    };

    coreErrorHandler.addRecoveryStrategy(strategy);

    expect(coreErrorHandler.addRecoveryStrategy).toHaveBeenCalledWith(strategy);
  });

  it('should get error statistics', () => {
    const stats = coreErrorHandler.getErrorStats();

    expect(coreErrorHandler.getErrorStats).toHaveBeenCalled();
    expect(stats).toEqual({
      total: 0,
      byType: {},
      bySeverity: {},
      recent: { lastHour: 0, last24Hours: 0, last7Days: 0 },
      recovered: 0,
      retryable: 0,
    });
  });
});

describe('Error Metadata and Context', () => {
  it('should create comprehensive error metadata', () => {
    const context: ErrorContext = {
      component: 'TestComponent',
      operation: 'testOperation',
      userId: 'user123',
      sessionId: 'session456',
      requestId: 'req789',
      url: '/test/path',
      userAgent: 'TestAgent/1.0',
      retryCount: 0,
      route: '/test',
      timestamp: Date.now(),
    };

    const error = new BaseError('Test error with metadata', {
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      context,
      correlationId: 'test-correlation-id',
    });

    expect(error.metadata).toEqual({
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.HIGH,
      timestamp: error.timestamp,
      context,
      retryable: false,
      recoverable: false,
      correlationId: 'test-correlation-id',
      cause: undefined,
      code: 'INTERNAL_ERROR',
    });
  });

  it('should handle error context merging', () => {
    const initialContext: ErrorContext = {
      component: 'InitialComponent',
      operation: 'initialOp',
    };

    const error = new BaseError('Test error', { context: initialContext });

    const additionalContext: Partial<ErrorContext> = {
      userId: 'user123',
      sessionId: 'session456',
      retryCount: 1,
    };

    const enhancedError = error.withContext(additionalContext);

    expect(enhancedError.context).toEqual({
      component: 'InitialComponent',
      operation: 'initialOp',
      userId: 'user123',
      sessionId: 'session456',
      retryCount: 1,
    });
  });
});

describe('Error Factory Patterns', () => {
  it('should create errors through factory pattern', () => {
    // Test that errors can be created with consistent patterns
    const validationError = new ValidationError('Field is required', { field: ['Required'] });
    const networkError = new NetworkError('Connection failed');
    const authError = new UnauthorizedError('Invalid credentials');

    expect(validationError.domain).toBe(ErrorDomain.VALIDATION);
    expect(networkError.domain).toBe(ErrorDomain.NETWORK);
    expect(authError.domain).toBe(ErrorDomain.AUTHENTICATION);

    expect(validationError.severity).toBe(ErrorSeverity.MEDIUM);
    expect(networkError.severity).toBe(ErrorSeverity.MEDIUM);
    expect(authError.severity).toBe(ErrorSeverity.HIGH);
  });

  it('should maintain error hierarchy', () => {
    const baseError = new BaseError('Base error');
    const appError = new AppError('App error', 'APP_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM);

    expect(baseError).toBeInstanceOf(Error);
    expect(appError).toBeInstanceOf(Error);
    expect(baseError).toBeInstanceOf(BaseError);
    expect(appError).toBeInstanceOf(AppError);

    // AppError is not a BaseError
    expect(appError).not.toBeInstanceOf(BaseError);
    expect(baseError).not.toBeInstanceOf(AppError);
  });
});

describe('Cross-System Error Consistency', () => {
  it('should maintain consistent error structure across domains', () => {
    const errors = [
      new ValidationError('Validation failed'),
      new NetworkError('Network failed'),
      new UnauthorizedError('Auth failed'),
      new CacheError('Cache failed'),
      new NavigationError('Navigation failed'),
    ];

    errors.forEach(error => {
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('domain');
      expect(error).toHaveProperty('severity');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('timestamp');
      expect(error).toHaveProperty('errorId');
      expect(error).toHaveProperty('metadata');
      expect(typeof error.toJSON).toBe('function');
    });
  });

  it('should handle error serialization consistently', () => {
    const errors = [
      new BaseError('Base error'),
      new AppError('App error', 'APP_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM),
      new ValidationError('Validation error'),
      new NetworkError('Network error'),
    ];

    errors.forEach(error => {
      const json = error.toJSON();
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('statusCode');
      expect(json).toHaveProperty('timestamp');
    });
  });
});
