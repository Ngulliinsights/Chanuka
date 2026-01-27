import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ErrorBoundary } from '../../../core/error/ErrorBoundary';
import { ErrorPropagationService } from '../../../core/error/ErrorPropagationService';
import { HookErrorHandler } from '../../../core/error/hooks/HookErrorHandler';
import { LibraryErrorHandler } from '../../../core/error/library/LibraryErrorHandler';
import { SecurityErrorHandler } from '../../../core/error/security/SecurityErrorHandler';
import { ServiceErrorHandler } from '../../../core/error/services/ServiceErrorHandler';
import { ErrorContext } from '../../../core/error/types/ErrorContext';
import { ErrorSeverity } from '../../../core/error/types/ErrorSeverity';
import { ErrorType } from '../../../core/error/types/ErrorType';

// Mock external dependencies
vi.mock('../../../core/error/security/SecurityErrorHandler');
vi.mock('../../../core/error/hooks/HookErrorHandler');
vi.mock('../../../core/error/services/ServiceErrorHandler');
vi.mock('../../../core/error/library/LibraryErrorHandler');
vi.mock('../../../core/error/ErrorPropagationService');

describe('Cross-System Error Propagation Tests', () => {
  let mockSecurityHandler: any;
  let mockHookHandler: any;
  let mockServiceHandler: any;
  let mockLibraryHandler: any;
  let mockPropagationService: any;

  beforeEach(() => {
    mockSecurityHandler = {
      handleError: vi.fn(),
      propagateError: vi.fn(),
      getErrorContext: vi.fn(),
    };

    mockHookHandler = {
      handleError: vi.fn(),
      propagateError: vi.fn(),
      getErrorContext: vi.fn(),
    };

    mockServiceHandler = {
      handleError: vi.fn(),
      propagateError: vi.fn(),
      getErrorContext: vi.fn(),
    };

    mockLibraryHandler = {
      handleError: vi.fn(),
      propagateError: vi.fn(),
      getErrorContext: vi.fn(),
    };

    mockPropagationService = {
      propagateToSystem: vi.fn(),
      getPropagationChain: vi.fn(),
      validatePropagation: vi.fn(),
    };

    (SecurityErrorHandler as any).mockImplementation(() => mockSecurityHandler);
    (HookErrorHandler as any).mockImplementation(() => mockHookHandler);
    (ServiceErrorHandler as any).mockImplementation(() => mockServiceHandler);
    (LibraryErrorHandler as any).mockImplementation(() => mockLibraryHandler);
    (ErrorPropagationService as any).mockImplementation(() => mockPropagationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Propagation Chain', () => {
    it('should propagate security errors to hooks system', async () => {
      const securityError = new Error('Security breach detected');
      const errorContext: ErrorContext = {
        id: 'sec-001',
        type: ErrorType.SECURITY,
        severity: ErrorSeverity.CRITICAL,
        timestamp: new Date(),
        component: 'SecurityModule',
        operation: 'authenticate',
        userId: 'user-123',
        sessionId: 'session-456',
        metadata: { breachType: 'unauthorized_access' },
      };

      mockSecurityHandler.handleError.mockResolvedValue(errorContext);
      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();
      await propagationService.propagateToSystem('hooks', securityError, errorContext);

      expect(mockPropagationService.propagateToSystem).toHaveBeenCalledWith(
        'hooks',
        securityError,
        errorContext
      );
      expect(mockHookHandler.handleError).toHaveBeenCalledWith(securityError, errorContext);
    });

    it('should propagate hook errors to service layer', async () => {
      const hookError = new Error('Hook execution failed');
      const errorContext: ErrorContext = {
        id: 'hook-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        component: 'HookManager',
        operation: 'useDataFetch',
        userId: 'user-123',
        metadata: { hookName: 'useBills', retryCount: 2 },
      };

      mockHookHandler.handleError.mockResolvedValue(errorContext);
      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();
      await propagationService.propagateToSystem('services', hookError, errorContext);

      expect(mockPropagationService.propagateToSystem).toHaveBeenCalledWith(
        'services',
        hookError,
        errorContext
      );
      expect(mockServiceHandler.handleError).toHaveBeenCalledWith(hookError, errorContext);
    });

    it('should propagate service errors to library layer', async () => {
      const serviceError = new Error('Service unavailable');
      const errorContext: ErrorContext = {
        id: 'svc-001',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        component: 'BillService',
        operation: 'fetchBills',
        userId: 'user-123',
        metadata: { serviceName: 'bill-service', endpoint: '/api/bills' },
      };

      mockServiceHandler.handleError.mockResolvedValue(errorContext);
      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();
      await propagationService.propagateToSystem('library', serviceError, errorContext);

      expect(mockPropagationService.propagateToSystem).toHaveBeenCalledWith(
        'library',
        serviceError,
        errorContext
      );
      expect(mockLibraryHandler.handleError).toHaveBeenCalledWith(serviceError, errorContext);
    });

    it('should handle circular propagation prevention', async () => {
      const error = new Error('Circular error');
      const errorContext: ErrorContext = {
        id: 'circ-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        component: 'TestComponent',
        operation: 'testOperation',
        propagationChain: ['security', 'hooks', 'services'],
      };

      mockPropagationService.validatePropagation.mockReturnValue(false);

      const propagationService = new ErrorPropagationService();
      const result = await propagationService.propagateToSystem('security', error, errorContext);

      expect(result).toBe(false);
      expect(mockPropagationService.validatePropagation).toHaveBeenCalledWith(
        'security',
        errorContext.propagationChain
      );
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve error context across system boundaries', async () => {
      const originalContext: ErrorContext = {
        id: 'orig-001',
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        component: 'FormComponent',
        operation: 'validateInput',
        userId: 'user-123',
        sessionId: 'session-456',
        metadata: { fieldName: 'email', validationRule: 'email-format' },
      };

      mockSecurityHandler.getErrorContext.mockReturnValue(originalContext);
      mockHookHandler.getErrorContext.mockReturnValue({
        ...originalContext,
        propagationChain: ['security', 'hooks'],
      });

      const securityHandler = new SecurityErrorHandler();
      const hookHandler = new HookErrorHandler();

      const propagatedContext = await hookHandler.getErrorContext();

      expect(propagatedContext.id).toBe(originalContext.id);
      expect(propagatedContext.type).toBe(originalContext.type);
      expect(propagatedContext.propagationChain).toContain('security');
      expect(propagatedContext.propagationChain).toContain('hooks');
    });

    it('should enrich error context with system-specific metadata', async () => {
      const baseContext: ErrorContext = {
        id: 'base-001',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        component: 'BaseComponent',
        operation: 'networkCall',
        userId: 'user-123',
      };

      mockServiceHandler.getErrorContext.mockReturnValue({
        ...baseContext,
        metadata: {
          ...baseContext.metadata,
          serviceResponseTime: 5000,
          retryAttempts: 3,
        },
      });

      const serviceHandler = new ServiceErrorHandler();
      const enrichedContext = await serviceHandler.getErrorContext();

      expect(enrichedContext.metadata).toHaveProperty('serviceResponseTime');
      expect(enrichedContext.metadata).toHaveProperty('retryAttempts');
    });
  });

  describe('Error Boundary Integration', () => {
    const ErrorThrowingComponent = () => {
      throw new Error('Test error');
    };

    it('should catch and propagate errors through error boundary', async () => {
      const mockOnError = vi.fn();
      const errorContext: ErrorContext = {
        id: 'boundary-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
        component: 'ErrorBoundary',
        operation: 'errorCatching',
      };

      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      render(
        <ErrorBoundary onError={mockOnError}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });

      const errorArg = mockOnError.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('Test error');
    });

    it('should handle multiple error sources simultaneously', async () => {
      const errors = [
        { type: ErrorType.SECURITY, message: 'Security error' },
        { type: ErrorType.NETWORK, message: 'Network error' },
        { type: ErrorType.VALIDATION, message: 'Validation error' },
      ];

      mockSecurityHandler.handleError.mockImplementation((error) => ({
        id: `sec-${Date.now()}`,
        type: error.type || ErrorType.SECURITY,
        severity: ErrorSeverity.CRITICAL,
        timestamp: new Date(),
        component: 'SecurityHandler',
        operation: 'handleMultiple',
        propagationChain: ['security'],
      }));

      const securityHandler = new SecurityErrorHandler();

      for (const errorInfo of errors) {
        const error = new Error(errorInfo.message);
        (error as any).type = errorInfo.type;
        await securityHandler.handleError(error);
      }

      expect(mockSecurityHandler.handleError).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Impact Tests', () => {
    it('should not significantly impact performance during error propagation', async () => {
      const startTime = Date.now();
      const error = new Error('Performance test error');
      const errorContext: ErrorContext = {
        id: 'perf-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        component: 'PerfTest',
        operation: 'propagationTest',
      };

      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();
      await propagationService.propagateToSystem('hooks', error, errorContext);
      await propagationService.propagateToSystem('services', error, errorContext);
      await propagationService.propagateToSystem('library', error, errorContext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Propagation should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle high-frequency errors without degradation', async () => {
      const errorPromises = [];
      const errorContext: ErrorContext = {
        id: 'freq-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        component: 'FreqTest',
        operation: 'highFrequencyTest',
      };

      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();

      // Simulate 100 concurrent errors
      for (let i = 0; i < 100; i++) {
        const error = new Error(`Error ${i}`);
        errorPromises.push(
          propagationService.propagateToSystem('hooks', error, errorContext)
        );
      }

      const startTime = Date.now();
      await Promise.all(errorPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle high frequency without significant delay
      expect(duration).toBeLessThan(500);
      expect(mockPropagationService.propagateToSystem).toHaveBeenCalledTimes(100);
    });
  });

  describe('Edge Cases and Failure Scenarios', () => {
    it('should handle propagation service failure gracefully', async () => {
      const error = new Error('Test error');
      const errorContext: ErrorContext = {
        id: 'fail-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        component: 'FailTest',
        operation: 'propagationFailure',
      };

      mockPropagationService.propagateToSystem.mockRejectedValue(
        new Error('Propagation service failed')
      );

      const propagationService = new ErrorPropagationService();

      await expect(
        propagationService.propagateToSystem('hooks', error, errorContext)
      ).rejects.toThrow('Propagation service failed');
    });

    it('should handle invalid system names', async () => {
      const error = new Error('Test error');
      const errorContext: ErrorContext = {
        id: 'invalid-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        component: 'InvalidTest',
        operation: 'invalidSystem',
      };

      mockPropagationService.propagateToSystem.mockRejectedValue(
        new Error('Invalid system name')
      );

      const propagationService = new ErrorPropagationService();

      await expect(
        propagationService.propagateToSystem('invalid-system', error, errorContext)
      ).rejects.toThrow('Invalid system name');
    });

    it('should handle null/undefined error contexts', async () => {
      const error = new Error('Test error');

      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();

      // Should handle null context
      await expect(
        propagationService.propagateToSystem('hooks', error, null as any)
      ).rejects.toThrow();

      // Should handle undefined context
      await expect(
        propagationService.propagateToSystem('hooks', error, undefined as any)
      ).rejects.toThrow();
    });

    it('should handle malformed error objects', async () => {
      const malformedError = { message: 'Malformed error' }; // Not an Error instance
      const errorContext: ErrorContext = {
        id: 'malformed-001',
        type: ErrorType.RUNTIME,
        severity: ErrorSeverity.LOW,
        timestamp: new Date(),
        component: 'MalformedTest',
        operation: 'malformedError',
      };

      mockPropagationService.propagateToSystem.mockResolvedValue(true);

      const propagationService = new ErrorPropagationService();

      await expect(
        propagationService.propagateToSystem('hooks', malformedError as any, errorContext)
      ).rejects.toThrow();
    });
  });
});
