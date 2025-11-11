/**
 * Core Error Handler Tests
 *
 * Comprehensive tests for the core error handling system.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ErrorDomain, ErrorSeverity } from '../../../utils/logger';
import { coreErrorHandler } from '../handler';
import { AppError } from '../types';

// Mock the unified error handler
vi.mock('../../../utils/unified-error-handler', () => ({
  errorHandler: {
    handleError: vi.fn(),
    getErrorStats: vi.fn(() => ({
      total: 0,
      byType: {},
      bySeverity: {},
      recent: { lastHour: 0, last24Hours: 0, last7Days: 0 },
      recovered: 0,
      retryable: 0,
    })),
  },
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  ErrorDomain,
  ErrorSeverity,
}));

describe('CoreErrorHandler', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    coreErrorHandler['isInitialized'] = false;
    coreErrorHandler.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      coreErrorHandler.initialize();

      expect(coreErrorHandler['isInitialized']).toBe(true);
      expect(coreErrorHandler.getConfig()).toEqual({
        maxErrors: 100,
        enableGlobalHandlers: true,
        enableRecovery: true,
        notificationDebounceMs: 100,
        logErrors: true,
        enableAnalytics: false,
      });
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        maxErrors: 50,
        enableGlobalHandlers: false,
        enableRecovery: false,
      };

      coreErrorHandler.initialize(customConfig);

      const config = coreErrorHandler.getConfig();
      expect(config.maxErrors).toBe(50);
      expect(config.enableGlobalHandlers).toBe(false);
      expect(config.enableRecovery).toBe(false);
    });

    it('should not reinitialize if already initialized', () => {
      coreErrorHandler.initialize({ maxErrors: 50 });
      coreErrorHandler.initialize({ maxErrors: 25 });

      expect(coreErrorHandler.getConfig().maxErrors).toBe(50);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      coreErrorHandler.initialize();
    });

    it('should handle error with minimal data', () => {
      const errorData = {
        type: ErrorDomain.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error occurred',
      };

      const result = coreErrorHandler.handleError(errorData);

      expect(result).toMatchObject({
        type: ErrorDomain.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error occurred',
        recoverable: true,
        retryable: false,
        retryCount: 0,
      });
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.context).toBeDefined();
    });

    it('should handle error with full data', () => {
      const errorData = {
        type: ErrorDomain.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation failed',
        details: { field: 'email', reason: 'invalid format' },
        context: { component: 'LoginForm', action: 'submit' },
        recoverable: false,
        retryable: false,
      };

      const result = coreErrorHandler.handleError(errorData);

      expect(result).toMatchObject(errorData);
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should generate unique error IDs', () => {
      const error1 = coreErrorHandler.handleError({
        type: ErrorDomain.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Error 1',
      });

      const error2 = coreErrorHandler.handleError({
        type: ErrorDomain.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Error 2',
      });

      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^core_error_\d+_[a-z0-9]+$/);
    });

    it('should add default context', () => {
      const result = coreErrorHandler.handleError({
        type: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: 'System error',
      });

      expect(result.context).toMatchObject({
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: expect.any(Number),
      });
    });

    it('should merge custom context with defaults', () => {
      const customContext = { component: 'TestComponent', action: 'test' };

      const result = coreErrorHandler.handleError({
        type: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: 'System error',
        context: customContext,
      });

      expect(result.context).toMatchObject({
        ...customContext,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('recovery strategies', () => {
    beforeEach(() => {
      coreErrorHandler.initialize();
    });

    it('should add recovery strategy', () => {
      const strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'A test recovery strategy',
        canRecover: () => true,
        recover: async () => true,
        priority: 1,
      };

      coreErrorHandler.addRecoveryStrategy(strategy);

      // Access private property for testing
      expect(coreErrorHandler['recoveryStrategies'].has('test-strategy')).toBe(true);
    });

    it('should replace existing strategy with same ID', () => {
      const strategy1 = {
        id: 'test-strategy',
        name: 'Test Strategy 1',
        description: 'First strategy',
        canRecover: () => true,
        recover: async () => true,
        priority: 1,
      };

      const strategy2 = {
        id: 'test-strategy',
        name: 'Test Strategy 2',
        description: 'Second strategy',
        canRecover: () => false,
        recover: async () => false,
        priority: 2,
      };

      coreErrorHandler.addRecoveryStrategy(strategy1);
      coreErrorHandler.addRecoveryStrategy(strategy2);

      const stored = coreErrorHandler['recoveryStrategies'].get('test-strategy');
      expect(stored?.name).toBe('Test Strategy 2');
      expect(stored?.priority).toBe(2);
    });

    it('should remove recovery strategy', () => {
      const strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        description: 'A test recovery strategy',
        canRecover: () => true,
        recover: async () => true,
        priority: 1,
      };

      coreErrorHandler.addRecoveryStrategy(strategy);
      expect(coreErrorHandler.removeRecoveryStrategy('test-strategy')).toBe(true);
      expect(coreErrorHandler.removeRecoveryStrategy('non-existent')).toBe(false);
    });
  });

  describe('error listeners', () => {
    beforeEach(() => {
      coreErrorHandler.initialize();
    });

    it('should add and remove error listeners', () => {
      const listener = vi.fn();

      coreErrorHandler.addErrorListener(listener);
      expect(coreErrorHandler['errorListeners'].has(listener)).toBe(true);

      coreErrorHandler.removeErrorListener(listener);
      expect(coreErrorHandler['errorListeners'].has(listener)).toBe(false);
    });

    it('should notify error listeners when handling errors', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      coreErrorHandler.addErrorListener(listener1);
      coreErrorHandler.addErrorListener(listener2);

      const error = coreErrorHandler.handleError({
        type: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: 'Test error',
      });

      expect(listener1).toHaveBeenCalledWith(error);
      expect(listener2).toHaveBeenCalledWith(error);
    });

    it('should handle listener errors gracefully', () => {
      const goodListener = vi.fn();
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      coreErrorHandler.addErrorListener(goodListener);
      coreErrorHandler.addErrorListener(badListener);

      // Mock console.error to avoid test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = coreErrorHandler.handleError({
        type: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: 'Test error',
      });

      expect(goodListener).toHaveBeenCalledWith(error);
      expect(badListener).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('error statistics', () => {
    beforeEach(() => {
      coreErrorHandler.initialize();
    });

    it('should delegate to unified error handler for stats', () => {
      const stats = coreErrorHandler.getErrorStats();

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

  describe('convenience functions', () => {
    beforeEach(() => {
      coreErrorHandler.initialize();
    });

    it('should create network error', () => {
      const handleSpy = vi.spyOn(coreErrorHandler, 'handleError');

      const { createNetworkError } = require('../handler');
      createNetworkError('Network failed', { status: 500 });

      expect(handleSpy).toHaveBeenCalledWith({
        type: ErrorDomain.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network failed',
        details: { status: 500 },
        recoverable: true,
        retryable: true,
      });
    });

    it('should create validation error', () => {
      const handleSpy = vi.spyOn(coreErrorHandler, 'handleError');

      const { createValidationError } = require('../handler');
      createValidationError('Validation failed', { field: 'email' });

      expect(handleSpy).toHaveBeenCalledWith({
        type: ErrorDomain.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation failed',
        details: { field: 'email' },
        recoverable: false,
        retryable: false,
      });
    });

    it('should create auth error', () => {
      const handleSpy = vi.spyOn(coreErrorHandler, 'handleError');

      const { createAuthError } = require('../handler');
      createAuthError('Authentication failed');

      expect(handleSpy).toHaveBeenCalledWith({
        type: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: 'Authentication failed',
        recoverable: true,
        retryable: false,
      });
    });
  });
});