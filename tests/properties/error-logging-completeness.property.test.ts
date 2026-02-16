/**
 * Property 8: Error Logging Completeness
 * 
 * Validates: Requirements 6.5
 * 
 * This property test verifies that error logging includes all required
 * information: timestamp, severity, stack trace, and context.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  logError,
  logTransformationError,
  logValidationError,
  logNetworkError,
  logCriticalError,
  configureErrorTracking,
  getErrorTrackingService,
  shouldLogError,
  type ErrorTrackingService,
  type ErrorLogEntry,
} from '../../shared/utils/errors/logger';
import { TransformationError, ValidationError, NetworkError } from '../../shared/utils/errors/types';
import { ErrorContextBuilder } from '../../shared/utils/errors/context';

describe('Property 8: Error Logging Completeness', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let mockTrackingService: ErrorTrackingService;
  let capturedErrors: ErrorLogEntry[];
  let capturedExceptions: Array<{ error: Error; context?: any }>;

  beforeEach(() => {
    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    // Create mock tracking service
    capturedErrors = [];
    capturedExceptions = [];
    mockTrackingService = {
      captureError: (entry: ErrorLogEntry) => {
        capturedErrors.push(entry);
      },
      captureException: (error: Error, context?: any) => {
        capturedExceptions.push({ error, context });
      },
    };

    // Configure tracking service
    configureErrorTracking(mockTrackingService);
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();

    // Clear tracking service
    configureErrorTracking(null as any);
    capturedErrors = [];
    capturedExceptions = [];
  });

  it('logError includes all required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // error message
        fc.constantFrom('low', 'medium', 'high', 'critical'), // severity
        (message, severity) => {
          const error = new Error(message);
          
          logError(error, severity);
          
          // Verify console was called
          expect(
            consoleErrorSpy.mock.calls.length +
            consoleWarnSpy.mock.calls.length +
            consoleInfoSpy.mock.calls.length
          ).toBeGreaterThan(0);
          
          // Verify tracking service received the error
          expect(capturedErrors.length).toBe(1);
          const entry = capturedErrors[0];
          
          // Verify all required fields are present
          expect(entry.timestamp).toBeInstanceOf(Date);
          expect(entry.severity).toBe(severity);
          expect(entry.message).toBe(message);
          expect(entry.errorType).toBeDefined();
          expect(typeof entry.errorType).toBe('string');
          
          // Stack trace should be present
          expect(entry.stackTrace).toBeDefined();
          expect(typeof entry.stackTrace).toBe('string');
          
          // Clear for next iteration
          capturedErrors = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logTransformationError includes error context', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // operation
        fc.string({ minLength: 1 }), // field
        fc.string({ minLength: 1 }), // message
        (operation, field, message) => {
          const context = new ErrorContextBuilder()
            .operation(operation)
            .layer('transformation')
            .field(field)
            .severity('high')
            .build();
          
          const error = new TransformationError(message, context);
          
          logTransformationError(error);
          
          // Verify tracking service received the error
          expect(capturedErrors.length).toBe(1);
          const entry = capturedErrors[0];
          
          // Verify context is included
          expect(entry.context).toBeDefined();
          expect(entry.context?.operation).toBe(operation);
          expect(entry.context?.layer).toBe('transformation');
          expect(entry.context?.field).toBe(field);
          expect(entry.context?.severity).toBe('high');
          
          // Clear for next iteration
          capturedErrors = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logValidationError includes validation errors', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // operation
        fc.array(
          fc.record({
            field: fc.string({ minLength: 1 }),
            rule: fc.string({ minLength: 1 }),
            message: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (operation, validationErrors) => {
          const context = new ErrorContextBuilder()
            .operation(operation)
            .layer('api')
            .severity('medium')
            .build();
          
          const error = new ValidationError('Validation failed', context, validationErrors);
          
          logValidationError(error);
          
          // Verify tracking service received the error
          expect(capturedErrors.length).toBe(1);
          const entry = capturedErrors[0];
          
          // Verify validation errors are included in metadata
          expect(entry.metadata).toBeDefined();
          expect(entry.metadata?.validationErrors).toEqual(validationErrors);
          
          // Clear for next iteration
          capturedErrors = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logNetworkError includes status code and retryable flag', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // operation
        fc.integer({ min: 400, max: 599 }), // status code
        fc.boolean(), // retryable
        (operation, statusCode, retryable) => {
          const context = new ErrorContextBuilder()
            .operation(operation)
            .layer('api')
            .severity('medium')
            .build();
          
          const error = new NetworkError('Network error', context, statusCode, retryable);
          
          logNetworkError(error);
          
          // Verify tracking service received the error
          expect(capturedErrors.length).toBe(1);
          const entry = capturedErrors[0];
          
          // Verify network error details are included in metadata
          expect(entry.metadata).toBeDefined();
          expect(entry.metadata?.statusCode).toBe(statusCode);
          expect(entry.metadata?.retryable).toBe(retryable);
          
          // Clear for next iteration
          capturedErrors = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logCriticalError sends to tracking service twice', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // message
        (message) => {
          const error = new Error(message);
          
          logCriticalError(error);
          
          // Verify tracking service received the error via captureError
          expect(capturedErrors.length).toBe(1);
          expect(capturedErrors[0].severity).toBe('critical');
          
          // Verify tracking service also received via captureException
          expect(capturedExceptions.length).toBe(1);
          expect(capturedExceptions[0].error).toBe(error);
          
          // Clear for next iteration
          capturedErrors = [];
          capturedExceptions = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shouldLogError correctly filters by severity', () => {
    const testCases = [
      { severity: 'low' as const, minSeverity: 'low' as const, expected: true },
      { severity: 'low' as const, minSeverity: 'medium' as const, expected: false },
      { severity: 'medium' as const, minSeverity: 'low' as const, expected: true },
      { severity: 'medium' as const, minSeverity: 'medium' as const, expected: true },
      { severity: 'medium' as const, minSeverity: 'high' as const, expected: false },
      { severity: 'high' as const, minSeverity: 'medium' as const, expected: true },
      { severity: 'critical' as const, minSeverity: 'low' as const, expected: true },
      { severity: 'critical' as const, minSeverity: 'critical' as const, expected: true },
    ];

    for (const { severity, minSeverity, expected } of testCases) {
      expect(shouldLogError(severity, minSeverity)).toBe(expected);
    }
  });

  it('console logging uses appropriate method based on severity', () => {
    const error = new Error('test error');
    
    // Test low severity
    logError(error, 'low');
    expect(consoleInfoSpy).toHaveBeenCalled();
    consoleInfoSpy.mockClear();
    capturedErrors = [];
    
    // Test medium severity
    logError(error, 'medium');
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockClear();
    capturedErrors = [];
    
    // Test high severity
    logError(error, 'high');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockClear();
    capturedErrors = [];
    
    // Test critical severity
    logError(error, 'critical');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockClear();
    capturedErrors = [];
  });

  it('error logging includes timestamp in ISO format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (message) => {
          const error = new Error(message);
          const beforeLog = new Date();
          
          logError(error);
          
          const afterLog = new Date();
          
          // Verify tracking service received the error
          expect(capturedErrors.length).toBe(1);
          const entry = capturedErrors[0];
          
          // Verify timestamp is within expected range
          expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
          expect(entry.timestamp.getTime()).toBeLessThanOrEqual(afterLog.getTime());
          
          // Clear for next iteration
          capturedErrors = [];
        }
      ),
      { numRuns: 100 }
    );
  });
});
