/**
 * Error Context and Metadata Tests
 *
 * Tests for standardized error context, severity levels, and metadata handling
 * across all four client systems (Security, Hooks, Library Services, Service Architecture).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BaseError } from '@client/infrastructure/error/classes';
import { ErrorDomain, ErrorSeverity } from '@client/infrastructure/error/constants';
import { coreErrorHandler } from '@client/infrastructure/error/handler';
import { AppError, ErrorContext, ErrorMetadata } from '@client/infrastructure/error/types';

// Mock the error handler
vi.mock('../../../core/error/handler', () => ({
  coreErrorHandler: {
    handleError: vi.fn(),
  },
}));

describe('Error Context Management', () => {
  let baseContext: ErrorContext;
  let enhancedContext: ErrorContext;

  beforeEach(() => {
    baseContext = {
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

    enhancedContext = {
      ...baseContext,
      additionalData: 'extra info',
      nestedObject: { key: 'value' },
      arrayData: [1, 2, 3],
    };
  });

  it('should create error with comprehensive context', () => {
    const error = new AppError('Test error', 'TEST_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      context: baseContext,
    });

    expect(error.context).toEqual(baseContext);
    expect(error.context?.component).toBe('TestComponent');
    expect(error.context?.operation).toBe('testOperation');
    expect(error.context?.userId).toBe('user123');
    expect(error.context?.sessionId).toBe('session456');
    expect(error.context?.requestId).toBe('req789');
    expect(error.context?.url).toBe('/test/path');
    expect(error.context?.userAgent).toBe('TestAgent/1.0');
    expect(error.context?.retryCount).toBe(0);
    expect(error.context?.route).toBe('/test');
    expect(error.context?.timestamp).toBeDefined();
  });

  it('should handle complex context data types', () => {
    const error = new BaseError('Complex context error', {
      context: enhancedContext,
    });

    expect(error.context?.additionalData).toBe('extra info');
    expect(error.context?.nestedObject).toEqual({ key: 'value' });
    expect(error.context?.arrayData).toEqual([1, 2, 3]);
  });

  it('should merge context when adding additional context', () => {
    const originalError = new BaseError('Original error', {
      context: baseContext,
    });

    const additionalContext: Partial<ErrorContext> = {
      operation: 'updatedOperation',
      retryCount: 1,
      newField: 'newValue',
    };

    const enhancedError = originalError.withContext(additionalContext);

    expect(enhancedError.context?.component).toBe('TestComponent'); // Preserved
    expect(enhancedError.context?.operation).toBe('updatedOperation'); // Updated
    expect(enhancedError.context?.retryCount).toBe(1); // Updated
    expect(enhancedError.context?.newField).toBe('newValue'); // Added
    expect(enhancedError.context?.userId).toBe('user123'); // Preserved
  });

  it('should handle empty context gracefully', () => {
    const error = new AppError('No context error', 'NO_CONTEXT', ErrorDomain.SYSTEM, ErrorSeverity.LOW);

    expect(error.context).toBeUndefined();
  });

  it('should serialize context in error JSON', () => {
    const error = new AppError('Context error', 'CONTEXT_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      context: baseContext,
    });

    const json = error.toJSON();

    expect(json.context).toEqual(baseContext);
  });

  it('should maintain context immutability', () => {
    const originalContext = { ...baseContext };
    const error = new BaseError('Immutability test', {
      context: originalContext,
    });

    // Modify original context
    originalContext.component = 'ModifiedComponent';

    // Error context should remain unchanged
    expect(error.context?.component).toBe('TestComponent');
  });
});

describe('Error Severity Levels', () => {
  it('should define all severity levels correctly', () => {
    expect(ErrorSeverity.LOW).toBe('low');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.CRITICAL).toBe('critical');
  });

  it('should create errors with different severity levels', () => {
    const lowError = new AppError('Low severity', 'LOW', ErrorDomain.SYSTEM, ErrorSeverity.LOW);
    const mediumError = new AppError('Medium severity', 'MEDIUM', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM);
    const highError = new AppError('High severity', 'HIGH', ErrorDomain.SYSTEM, ErrorSeverity.HIGH);
    const criticalError = new AppError('Critical severity', 'CRITICAL', ErrorDomain.SYSTEM, ErrorSeverity.CRITICAL);

    expect(lowError.severity).toBe(ErrorSeverity.LOW);
    expect(mediumError.severity).toBe(ErrorSeverity.MEDIUM);
    expect(highError.severity).toBe(ErrorSeverity.HIGH);
    expect(criticalError.severity).toBe(ErrorSeverity.CRITICAL);
  });

  it('should log errors with appropriate severity-based logging', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    // Critical and High should use console.error
    new BaseError('Critical error', { severity: ErrorSeverity.CRITICAL });
    new BaseError('High error', { severity: ErrorSeverity.HIGH });
    expect(console.error).toHaveBeenCalledTimes(2);

    // Medium should use console.warn
    new BaseError('Medium error', { severity: ErrorSeverity.MEDIUM });
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    // Low should use console.info
    new BaseError('Low error', { severity: ErrorSeverity.LOW });
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('should include severity in error metadata', () => {
    const error = new BaseError('Severity test', {
      severity: ErrorSeverity.HIGH,
      domain: ErrorDomain.NETWORK,
    });

    expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
    expect(error.metadata.domain).toBe(ErrorDomain.NETWORK);
  });

  it('should default to medium severity when not specified', () => {
    const error = new AppError('Default severity', 'DEFAULT', ErrorDomain.SYSTEM);

    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });
});

describe('Error Metadata Structure', () => {
  it('should create comprehensive error metadata', () => {
    const context: ErrorContext = {
      component: 'TestComponent',
      operation: 'testOp',
      userId: 'user123',
    };

    const error = new BaseError('Metadata test', {
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.HIGH,
      context,
      correlationId: 'test-correlation-id',
    });

    expect(error.metadata).toEqual({
      domain: ErrorDomain.VALIDATION,
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

  it('should include cause in metadata when provided', () => {
    const cause = new Error('Original cause');
    const error = new BaseError('Caused error', {
      cause,
    });

    expect(error.metadata.cause).toBe(cause);
  });

  it('should handle metadata serialization', () => {
    const error = new BaseError('Serialization test', {
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.CRITICAL,
      context: { component: 'Test' },
    });

    const json = error.toJSON();

    expect(json).toHaveProperty('timestamp');
    expect((json as any).domain).toBe(ErrorDomain.NETWORK);
    expect((json as any).severity).toBe(ErrorSeverity.CRITICAL);
    expect((json as any).context).toEqual({ component: 'Test' });
  });

  it('should maintain metadata immutability', () => {
    const error = new BaseError('Immutability test', {
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
    });

    const originalMetadata = error.metadata;

    // Attempt to modify metadata (should not affect error)
    if (originalMetadata) {
      (originalMetadata as any).domain = ErrorDomain.NETWORK;
    }

    expect(error.metadata.domain).toBe(ErrorDomain.SYSTEM);
  });
});

describe('Error Correlation and Tracking', () => {
  it('should generate unique correlation IDs', () => {
    const error1 = new AppError('Error 1', 'ERR1', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM);
    const error2 = new AppError('Error 2', 'ERR2', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM);

    expect(error1.correlationId).toBeDefined();
    expect(error2.correlationId).toBeDefined();
    expect(error1.correlationId).not.toBe(error2.correlationId);
  });

  it('should use provided correlation ID', () => {
    const customId = 'custom-correlation-123';
    const error = new AppError('Custom ID error', 'CUSTOM_ID', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      correlationId: customId,
    });

    expect(error.correlationId).toBe(customId);
    expect(error.id).toBe(customId);
  });

  it('should include correlation ID in metadata', () => {
    const customId = 'metadata-test-id';
    const error = new BaseError('Metadata correlation test', {
      correlationId: customId,
    });

    expect(error.metadata.correlationId).toBe(customId);
  });

  it('should track error relationships through context', () => {
    const parentError = new AppError('Parent error', 'PARENT', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      correlationId: 'parent-123',
    });

    const childError = new AppError('Child error', 'CHILD', ErrorDomain.VALIDATION, ErrorSeverity.LOW, {
      context: {
        parentCorrelationId: parentError.correlationId,
        component: 'ChildComponent',
      },
    });

    expect(childError.context?.parentCorrelationId).toBe(parentError.correlationId);
    expect(childError.correlationId).not.toBe(parentError.correlationId);
  });
});

describe('Context Enrichment Patterns', () => {
  it('should enrich context with user information', () => {
    const baseError = new BaseError('Base error');
    const userContext: Partial<ErrorContext> = {
      userId: 'user456',
      sessionId: 'session789',
      userAgent: 'EnrichedAgent/2.0',
    };

    const enrichedError = baseError.withContext(userContext);

    expect(enrichedError.context?.userId).toBe('user456');
    expect(enrichedError.context?.sessionId).toBe('session789');
    expect(enrichedError.context?.userAgent).toBe('EnrichedAgent/2.0');
  });

  it('should enrich context with request information', () => {
    const baseError = new BaseError('Request error');
    const requestContext: Partial<ErrorContext> = {
      requestId: 'req-abc-123',
      url: '/api/data',
      route: '/data',
      timestamp: Date.now(),
    };

    const enrichedError = baseError.withContext(requestContext);

    expect(enrichedError.context?.requestId).toBe('req-abc-123');
    expect(enrichedError.context?.url).toBe('/api/data');
    expect(enrichedError.context?.route).toBe('/data');
    expect(enrichedError.context?.timestamp).toBeDefined();
  });

  it('should enrich context with operation details', () => {
    const baseError = new BaseError('Operation error');
    const operationContext: Partial<ErrorContext> = {
      component: 'DataService',
      operation: 'fetchUserData',
      retryCount: 2,
    };

    const enrichedError = baseError.withContext(operationContext);

    expect(enrichedError.context?.component).toBe('DataService');
    expect(enrichedError.context?.operation).toBe('fetchUserData');
    expect(enrichedError.context?.retryCount).toBe(2);
  });

  it('should handle multiple context enrichments', () => {
    let error = new BaseError('Multi-enrichment error');

    // First enrichment
    error = error.withContext({
      component: 'InitialComponent',
      userId: 'user123',
    });

    // Second enrichment
    error = error.withContext({
      operation: 'dataFetch',
      requestId: 'req456',
    });

    // Third enrichment
    error = error.withContext({
      retryCount: 1,
      sessionId: 'session789',
    });

    expect(error.context?.component).toBe('InitialComponent');
    expect(error.context?.userId).toBe('user123');
    expect(error.context?.operation).toBe('dataFetch');
    expect(error.context?.requestId).toBe('req456');
    expect(error.context?.retryCount).toBe(1);
    expect(error.context?.sessionId).toBe('session789');
  });
});

describe('Error Context Validation', () => {
  it('should validate context field types', () => {
    const validContext: ErrorContext = {
      component: 'TestComponent',
      operation: 'testOp',
      userId: 'user123',
      sessionId: 'session456',
      requestId: 'req789',
      url: '/test',
      userAgent: 'Agent/1.0',
      retryCount: 0,
      route: '/test',
      timestamp: Date.now(),
    };

    const error = new AppError('Validation test', 'VALIDATION_TEST', ErrorDomain.SYSTEM, ErrorSeverity.MEDIUM, {
      context: validContext,
    });

    expect(error.context).toEqual(validContext);
  });

  it('should handle undefined context fields gracefully', () => {
    const partialContext: Partial<ErrorContext> = {
      component: 'TestComponent',
      // Other fields undefined
    };

    const error = new BaseError('Partial context test', {
      context: partialContext as ErrorContext,
    });

    expect(error.context?.component).toBe('TestComponent');
    expect(error.context?.operation).toBeUndefined();
    expect(error.context?.userId).toBeUndefined();
  });

  it('should preserve custom context fields', () => {
    const customContext = {
      component: 'CustomComponent',
      customField: 'customValue',
      nestedData: { key: 'value' },
      arrayField: [1, 2, 3],
    };

    const error = new BaseError('Custom context test', {
      context: customContext as ErrorContext,
    });

    expect(error.context?.component).toBe('CustomComponent');
    expect((error.context as any)?.customField).toBe('customValue');
    expect((error.context as any)?.nestedData).toEqual({ key: 'value' });
    expect((error.context as any)?.arrayField).toEqual([1, 2, 3]);
  });
});

describe('Metadata Consistency Across Systems', () => {
  it('should maintain consistent metadata structure for all error types', () => {
    const errors = [
      new BaseError('Base error', { domain: ErrorDomain.SYSTEM }),
      new AppError('App error', 'APP_ERR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM),
    ];

    errors.forEach(error => {
      expect(error.metadata).toHaveProperty('domain');
      expect(error.metadata).toHaveProperty('severity');
      expect(error.metadata).toHaveProperty('timestamp');
      expect(error.metadata).toHaveProperty('retryable');
      expect(error.metadata).toHaveProperty('recoverable');
      expect(error.metadata).toHaveProperty('code');
      expect(error.metadata?.timestamp).toBeInstanceOf(Date);
    });
  });

  it('should ensure metadata is read-only', () => {
    const error = new BaseError('Read-only test', {
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
    });

    const originalDomain = error.metadata.domain;

    // Attempt to modify metadata
    try {
      (error.metadata as any).domain = ErrorDomain.NETWORK;
    } catch {
      // Expected to fail or be ignored
    }

    expect(error.metadata.domain).toBe(originalDomain);
  });

  it('should include metadata in error serialization', () => {
    const error = new BaseError('Serialization metadata test', {
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.HIGH,
      context: { component: 'Test' },
    });

    const json = error.toJSON();

    // Metadata is not directly exposed in JSON, but context should be
    expect((json as any).context).toEqual({ component: 'Test' });
    expect((json as any).domain).toBe(ErrorDomain.VALIDATION);
    expect((json as any).severity).toBe(ErrorSeverity.HIGH);
  });
});

describe('Cross-System Context Propagation', () => {
  it('should propagate context through error chains', () => {
    // Simulate error propagation across system boundaries
    const securityError = new AppError('Security error', 'SEC_ERROR', ErrorDomain.SECURITY, ErrorSeverity.HIGH, {
      context: {
        component: 'SecurityService',
        operation: 'authenticate',
        userId: 'user123',
      },
    });

    const serviceError = new AppError('Service error', 'SVC_ERROR', ErrorDomain.EXTERNAL_SERVICE, ErrorSeverity.MEDIUM, {
      context: {
        component: 'ApiService',
        operation: 'callExternalApi',
        requestId: 'req456',
        parentCorrelationId: securityError.correlationId,
      },
      cause: securityError,
    });

    const uiError = new AppError('UI error', 'UI_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.LOW, {
      context: {
        component: 'ErrorBoundary',
        operation: 'renderError',
        route: '/dashboard',
        parentCorrelationId: serviceError.correlationId,
      },
      cause: serviceError,
    });

    // Verify context propagation
    expect(serviceError.context?.parentCorrelationId).toBe(securityError.correlationId);
    expect(uiError.context?.parentCorrelationId).toBe(serviceError.correlationId);
    expect(serviceError.cause).toBe(securityError);
    expect(uiError.cause).toBe(serviceError);
  });

  it('should maintain context hierarchy in complex scenarios', () => {
    const rootContext: ErrorContext = {
      component: 'RootComponent',
      operation: 'rootOperation',
      userId: 'user123',
      sessionId: 'session456',
      requestId: 'root-request',
    };

    const rootError = new BaseError('Root error', { context: rootContext });

    // Add library-specific context
    const libraryError = rootError.withContext({
      component: 'LibraryService',
      operation: 'libraryCall',
      requestId: 'lib-request',
    });

    // Add hook-specific context
    const hookError = libraryError.withContext({
      component: 'AuthHook',
      operation: 'useAuth',
      retryCount: 1,
    });

    // Add service-specific context
    const serviceError = hookError.withContext({
      component: 'UserService',
      operation: 'getUserProfile',
      url: '/api/user/profile',
    });

    // Verify hierarchical context
    expect(serviceError.context?.userId).toBe('user123'); // Preserved from root
    expect(serviceError.context?.sessionId).toBe('session456'); // Preserved from root
    expect(serviceError.context?.component).toBe('UserService'); // Latest
    expect(serviceError.context?.operation).toBe('getUserProfile'); // Latest
    expect(serviceError.context?.requestId).toBe('lib-request'); // From library
    expect(serviceError.context?.retryCount).toBe(1); // From hook
    expect(serviceError.context?.url).toBe('/api/user/profile'); // From service
  });
});
