/**
 * Error Hierarchy Usage Examples
 * Demonstrates how to use the standardized error system
 */

import {
  AppError,
  ValidationError,
  BusinessLogicError,
  NotFoundError,
  PermissionError,
  AuthenticationError,
  DatabaseError,
  NetworkError,
  ConfigurationError,
  RateLimitError,
  ConflictError,
  TimeoutError,
  SystemError,
  ErrorSeverity,
  createErrorContext,
  enhanceErrorWithContext,
  extractErrorMetadata,
  isAppError,
  isValidationError,
  isBusinessLogicError,
  isCriticalError,
  isHighSeverityError,
  errorToSafeObject,
  errorFromSafeObject,
  Result,
  success,
  failure,
  isSuccess,
  isFailure,
} from './errors';

// ============================================================================
// Basic Error Creation Examples
// ============================================================================

// 1. Creating a validation error
export function createValidationErrorExample(): ValidationError {
  return new ValidationError('Email format is invalid', 'email', {
    invalidValue: 'user@example',
    expectedFormat: 'user@example.com',
  });
}

// 2. Creating a business logic error
export function createBusinessLogicErrorExample(): BusinessLogicError {
  return new BusinessLogicError('Cannot delete system administrator', {
    userId: 'admin-1',
    userRole: 'administrator',
  });
}

// 3. Creating a not found error
export function createNotFoundErrorExample(): NotFoundError {
  return new NotFoundError('User', 'user-123', {
    searchQuery: 'SELECT * FROM users WHERE id = ?',
    database: 'postgres',
  });
}

// 4. Creating a permission error
export function createPermissionErrorExample(): PermissionError {
  return new PermissionError('delete', 'user-profile', {
    userId: 'user-456',
    requiredRole: 'admin',
    currentRole: 'user',
  });
}

// ============================================================================
// Error Context and Metadata Examples
// ============================================================================

// 1. Creating error with context
export function createErrorWithContextExample(): AppError {
  const context = createErrorContext({
    userId: 'user-123',
    sessionId: 'session-456',
    requestId: 'req-789',
    component: 'authentication-service',
    method: 'login',
    additionalData: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    },
  });

  return new AuthenticationError('Invalid credentials', 'oauth2', context);
}

// 2. Enhancing error with additional context
export function enhanceErrorExample(): AppError {
  const originalError = new ValidationError('Field is required', 'username');

  return enhanceErrorWithContext(originalError, {
    userId: 'user-123',
    component: 'registration-form',
    method: 'validateForm',
    additionalData: {
      formStep: 1,
      totalSteps: 3,
    },
  });
}

// ============================================================================
// Error Type Guards Examples
// ============================================================================

// 1. Checking error types
export function handleErrorWithTypeGuards(error: unknown): void {
  if (isAppError(error)) {
    console.log(`AppError detected: ${error.code} (${error.severity})`);

    if (isValidationError(error)) {
      console.log(`Validation failed for field: ${error.field}`);
    } else if (isBusinessLogicError(error)) {
      console.log('Business logic violation detected');
    }
  } else {
    console.log('Non-AppError detected');
  }
}

// 2. Handling errors by severity
export function handleErrorBySeverity(error: unknown): void {
  if (isCriticalError(error)) {
    console.log('CRITICAL ERROR - System failure detected');
    // Trigger emergency procedures
  } else if (isHighSeverityError(error)) {
    console.log('HIGH SEVERITY ERROR - Requires immediate attention');
    // Notify administrators
  } else if (isAppError(error)) {
    console.log(`MEDIUM/LOW ERROR - ${error.message}`);
    // Log and continue
  }
}

// ============================================================================
// Error Metadata Extraction Examples
// ============================================================================

// 1. Extracting error metadata for logging
export function logErrorMetadataExample(error: unknown): void {
  const metadata = extractErrorMetadata(error);

  console.log('Error Metadata:', {
    code: metadata.code,
    severity: metadata.severity,
    message: metadata.message,
    context: metadata.context,
    stack: metadata.stack,
  });
}

// ============================================================================
// Error Serialization Examples
// ============================================================================

// 1. Converting error to safe object for API responses
export function serializeErrorForApi(error: unknown): Record<string, unknown> {
  return errorToSafeObject(error);
}

// 2. Reconstructing error from safe object (e.g., from API response)
export function deserializeErrorFromApi(
  safeObject: Record<string, unknown>
): AppError | Error {
  return errorFromSafeObject(safeObject);
}

// ============================================================================
// Result Type Integration Examples
// ============================================================================

// 1. Using Result type with AppError
export function processUserRegistration(
  userData: unknown
): Result<string, AppError> {
  // Validation logic
  if (!userData || typeof userData !== 'object') {
    return failure(
      new ValidationError('Invalid user data format', 'root', {
        receivedType: typeof userData,
      })
    );
  }

  // Business logic
  if ((userData as any).role === 'admin' && (userData as any).isSystemAdmin) {
    return failure(
      new BusinessLogicError('Cannot create system admin through regular registration', {
        attemptedRole: 'admin',
        isSystemAdmin: true,
      })
    );
  }

  // Success case
  return success('user-123');
}

// 2. Handling Result with error type guards
export function handleRegistrationResult(
  result: Result<string, AppError>
): void {
  if (isSuccess(result)) {
    console.log(`Registration successful: ${result.data}`);
  } else if (isFailure(result)) {
    const error = result.error;

    if (isValidationError(error)) {
      console.log(`Validation error in field ${error.field}: ${error.message}`);
    } else if (isBusinessLogicError(error)) {
      console.log(`Business rule violation: ${error.message}`);
    } else {
      console.log(`Unexpected error: ${error.message}`);
    }
  }
}

// ============================================================================
// Complete Error Handling Workflow Example
// ============================================================================

/**
 * Complete example showing error handling workflow
 */
export function completeErrorHandlingWorkflowExample(): void {
  try {
    // Simulate an operation that might fail
    const result = performSensitiveOperation();

    if (isSuccess(result)) {
      console.log('Operation successful:', result.data);
    } else {
      handleOperationError(result.error);
    }
  } catch (error) {
    // Convert unexpected errors to AppError
    const appError = convertToAppError(error);
    handleOperationError(appError);
  }
}

function performSensitiveOperation(): Result<string, AppError> {
  // Simulate different error scenarios
  const scenario = Math.floor(Math.random() * 4);

  switch (scenario) {
    case 0:
      return failure(new ValidationError('Invalid input data', 'email'));
    case 1:
      return failure(new PermissionError('read', 'sensitive-data'));
    case 2:
      return failure(new DatabaseError('Connection timeout', 'query', 'SELECT * FROM sensitive_data'));
    default:
      return success('operation-result');
  }
}

function handleOperationError(error: AppError): void {
  // Extract metadata for logging
  const metadata = extractErrorMetadata(error);
  console.log('Error metadata:', metadata);

  // Handle by type
  if (isValidationError(error)) {
    console.log('Validation error - notify user');
    // User feedback logic
  } else if (isPermissionError(error)) {
    console.log('Permission error - show access denied');
    // Access control logic
  } else if (isDatabaseError(error)) {
    console.log('Database error - retry or failover');
    // Database recovery logic
  }

  // Handle by severity
  if (isCriticalError(error) || isHighSeverityError(error)) {
    console.log('High severity - alert administrators');
    // Notification logic
  }

  // Convert to safe object for API response
  const safeError = errorToSafeObject(error);
  console.log('Safe error for API:', safeError);
}

function convertToAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Create a generic AppError from regular Error
    class GenericAppError extends AppError {
      readonly code = 'GENERIC_ERROR';
      readonly severity: ErrorSeverity = 'medium';
    }

    return new GenericAppError(error.message, {
      originalError: {
        name: error.name,
        stack: error.stack,
      },
    });
  }

  // Fallback for non-Error values
  return new class extends AppError {
    readonly code = 'UNKNOWN_ERROR';
    readonly severity: ErrorSeverity = 'high';

    constructor() {
      super(String(error));
    }
  }();
}

// ============================================================================
// Usage Examples
// ============================================================================

// Example 1: Basic error creation
const validationError = createValidationErrorExample();
console.log('Validation Error:', validationError);

// Example 2: Error with context
const errorWithContext = createErrorWithContextExample();
console.log('Error with Context:', errorWithContext);

// Example 3: Error type guards
handleErrorWithTypeGuards(validationError);
handleErrorWithTypeGuards(new Error('Regular error'));

// Example 4: Error serialization
const safeError = serializeErrorForApi(validationError);
const reconstructedError = deserializeErrorFromApi(safeError);
console.log('Reconstructed Error:', reconstructedError);

// Example 5: Result type integration
const registrationResult = processUserRegistration({ username: 'test' });
handleRegistrationResult(registrationResult);

// Example 6: Complete workflow
completeErrorHandlingWorkflowExample();