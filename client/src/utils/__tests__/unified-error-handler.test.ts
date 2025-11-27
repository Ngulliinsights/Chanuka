import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger first
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

// Mock secure storage
vi.mock('../secure-storage', () => ({
  tokenStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import {
  errorHandler,
  ErrorType,
  ErrorSeverity,
  createNetworkError,
  createValidationError,
  createAuthError,
  createPermissionError,
  createServerError,
} from '@client/unified-error-handler';

describe('Unified Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler.reset();
  });

  describe('Error Creation and Handling', () => {
    it('should create and handle network errors', () => {
      const error = createNetworkError('Connection failed', { status: 0 });

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.message).toBe('Connection failed');
      expect(error.retryable).toBe(true);
      expect(error.recoverable).toBe(true);
    });

    it('should create and handle validation errors', () => {
      const error = createValidationError('Invalid input', { field: 'email' });

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.message).toBe('Invalid input');
      expect(error.retryable).toBe(false);
      expect(error.recoverable).toBe(false);
    });

    it('should create and handle authentication errors', () => {
      const error = createAuthError('Unauthorized', { redirect: '/login' });

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Unauthorized');
      expect(error.retryable).toBe(false);
      expect(error.recoverable).toBe(true);
    });

    it('should create and handle permission errors', () => {
      const error = createPermissionError('Access denied');

      expect(error.type).toBe(ErrorType.AUTHORIZATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.message).toBe('Access denied');
      expect(error.retryable).toBe(false);
      expect(error.recoverable).toBe(false);
    });

    it('should create and handle server errors', () => {
      const error = createServerError('Internal server error', { status: 500 });

      expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Internal server error');
      expect(error.retryable).toBe(true);
      expect(error.recoverable).toBe(true);
    });
  });

  describe('Error Storage and Retrieval', () => {
    it('should store and retrieve errors by ID', () => {
      const error = errorHandler.handleError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
      });

      const retrieved = errorHandler.getError(error.id);
      expect(retrieved).toEqual(error);
    });

    it('should limit stored errors to prevent memory leaks', () => {
      // Create more errors than the limit
      for (let i = 0; i < 110; i++) {
        errorHandler.handleError({
          type: ErrorType.SYSTEM,
          severity: ErrorSeverity.LOW,
          message: `Error ${i}`,
        });
      }

      const recentErrors = errorHandler.getRecentErrors(200);
      expect(recentErrors.length).toBeLessThanOrEqual(100);
    });

    it('should retrieve errors by type', () => {
      errorHandler.handleError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error 1',
      });

      errorHandler.handleError({
        type: ErrorType.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        message: 'Server error 1',
      });

      errorHandler.handleError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error 2',
      });

      const networkErrors = errorHandler.getErrorsByType(ErrorType.NETWORK);
      expect(networkErrors.length).toBe(2);
      expect(networkErrors.every(e => e.type === ErrorType.NETWORK)).toBe(true);
    });

    it('should retrieve errors by severity', () => {
      errorHandler.handleError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.LOW,
        message: 'Low severity error',
      });

      errorHandler.handleError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: 'High severity error',
      });

      const highSeverityErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.HIGH);
      expect(highSeverityErrors.length).toBe(1);
      expect(highSeverityErrors[0].severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('Error Recovery', () => {
    it('should add and execute recovery strategies', async () => {
      const mockRecover = vi.fn().mockResolvedValue(true);

      errorHandler.addRecoveryStrategy({
        id: 'test-recovery',
        name: 'Test Recovery',
        description: 'Test recovery strategy',
        canRecover: (error) => error.type === ErrorType.NETWORK,
        recover: mockRecover,
        priority: 1,
      });

      const error = errorHandler.handleError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error',
        recoverable: true,
      });

      const recovered = await errorHandler.attemptRecovery(error);
      expect(recovered).toBe(true);
      expect(mockRecover).toHaveBeenCalledWith(error);
      expect(error.recovered).toBe(true);
      expect(error.recoveryStrategy).toBe('test-recovery');
    });

    it('should not attempt recovery for non-recoverable errors', async () => {
      const mockRecover = vi.fn();

      errorHandler.addRecoveryStrategy({
        id: 'test-recovery',
        name: 'Test Recovery',
        description: 'Test recovery strategy',
        canRecover: () => true,
        recover: mockRecover,
        priority: 1,
      });

      const error = errorHandler.handleError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation error',
        recoverable: false,
      });

      const recovered = await errorHandler.attemptRecovery(error);
      expect(recovered).toBe(false);
      expect(mockRecover).not.toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    it('should provide comprehensive error statistics', () => {
      // Add various types of errors
      errorHandler.handleError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error',
      });

      errorHandler.handleError({
        type: ErrorType.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        message: 'Server error',
      });

      errorHandler.handleError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Another network error',
      });

      const stats = errorHandler.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byType[ErrorType.NETWORK]).toBe(2);
      expect(stats.byType[ErrorType.EXTERNAL_SERVICE]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(2);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
    });
  });

  describe('Error Listeners', () => {
    it('should notify error listeners', () => {
      const listener = vi.fn();

      errorHandler.addErrorListener(listener);

      const error = errorHandler.handleError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
      });

      // Wait for debounced notification
      vi.advanceTimersByTime(150);

      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should handle listener errors gracefully', () => {
      const failingListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener failed');
      });

      const workingListener = vi.fn();

      errorHandler.addErrorListener(failingListener);
      errorHandler.addErrorListener(workingListener);

      errorHandler.handleError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
        message: 'Test error',
      });

      // Wait for debounced notification
      vi.advanceTimersByTime(150);

      expect(failingListener).toHaveBeenCalled();
      expect(workingListener).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});