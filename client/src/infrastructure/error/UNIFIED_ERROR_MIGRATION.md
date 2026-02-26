# Unified Error Handling Migration Guide

This guide explains how to migrate from the old error handling pattern (side effects in constructors) to the new unified pattern (pure factory functions + explicit error handling).

## Overview

The new unified error handling system separates error construction from error handling:

1. **Pure Factory Functions**: Create errors without side effects
2. **Explicit Error Handling**: Handle errors with explicit side effects (logging, tracking, recovery)

This aligns with server-side patterns and makes error handling more predictable and testable.

## Key Changes

### Old Pattern (Side Effects in Constructors)

```typescript
// ❌ OLD: Side effects happen automatically in constructor
const error = new AppError(
  'Validation failed',
  'VALIDATION_ERROR',
  ErrorDomain.VALIDATION,
  ErrorSeverity.LOW
);
// Error is automatically logged and tracked
```

### New Pattern (Pure Factory + Explicit Handling)

```typescript
// ✅ NEW: Pure factory function (no side effects)
import { createValidationError, handleUnifiedError } from '@/infrastructure/error';

const error = createValidationError(
  [{ field: 'email', message: 'Invalid email format' }],
  { component: 'LoginForm', operation: 'validateInput' }
);

// Explicit error handling (side effects)
handleUnifiedError(error);
// Now error is logged and tracked
```

## Migration Steps

### Step 1: Replace Error Constructors with Factory Functions

**Before:**
```typescript
import { AppError, ErrorDomain, ErrorSeverity } from '@/infrastructure/error';

const error = new AppError(
  'Network request failed',
  'NETWORK_ERROR',
  ErrorDomain.NETWORK,
  ErrorSeverity.MEDIUM,
  {
    context: { component: 'APIClient', operation: 'fetchData' },
    recoverable: true,
    retryable: true,
  }
);
```

**After:**
```typescript
import { createNetworkError, handleUnifiedError } from '@/infrastructure/error';

const error = createNetworkError(
  'Network request failed',
  0, // status code
  { component: 'APIClient', operation: 'fetchData' }
);

// Explicit handling
handleUnifiedError(error);
```

### Step 2: Use Appropriate Factory Functions

The unified error system provides factory functions for common error types:

#### Validation Errors

```typescript
import { createValidationError, handleUnifiedError } from '@/infrastructure/error';

const error = createValidationError(
  [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' },
  ],
  { component: 'RegistrationForm', operation: 'validateInput' }
);

handleUnifiedError(error);
```

#### Network Errors

```typescript
import { createNetworkError, handleUnifiedError } from '@/infrastructure/error';

const error = createNetworkError(
  'Failed to fetch user data',
  500, // HTTP status code
  { component: 'UserService', operation: 'fetchUser', userId: '123' }
);

handleUnifiedError(error);
```

#### Authentication Errors

```typescript
import { createAuthenticationError, handleUnifiedError } from '@/infrastructure/error';

const error = createAuthenticationError(
  'Invalid credentials',
  { component: 'AuthService', operation: 'login' }
);

handleUnifiedError(error);
```

#### Authorization Errors

```typescript
import { createAuthorizationError, handleUnifiedError } from '@/infrastructure/error';

const error = createAuthorizationError(
  'Insufficient permissions',
  ['admin', 'moderator'], // required permissions
  { component: 'AdminPanel', operation: 'accessSettings' }
);

handleUnifiedError(error);
```

#### Business Logic Errors

```typescript
import { createBusinessError, handleUnifiedError } from '@/infrastructure/error';
import { ERROR_CODES } from '@shared/constants';

const error = createBusinessError(
  ERROR_CODES.INVALID_OPERATION,
  'Cannot delete active subscription',
  { component: 'SubscriptionService', operation: 'deleteSubscription' }
);

handleUnifiedError(error);
```

#### System Errors

```typescript
import { createSystemError, handleUnifiedError } from '@/infrastructure/error';

const error = createSystemError(
  'Database connection failed',
  originalError, // optional Error object
  { component: 'DatabaseService', operation: 'connect' }
);

handleUnifiedError(error);
```

#### Not Found Errors

```typescript
import { createNotFoundError, handleUnifiedError } from '@/infrastructure/error';

const error = createNotFoundError(
  'User',
  { component: 'UserService', operation: 'findById', userId: '123' }
);

handleUnifiedError(error);
```

#### Timeout Errors

```typescript
import { createTimeoutError, handleUnifiedError } from '@/infrastructure/error';

const error = createTimeoutError(
  'fetchUserData',
  5000, // timeout in ms
  { component: 'APIClient', operation: 'fetchUser' }
);

handleUnifiedError(error);
```

### Step 3: Handle Errors in Try-Catch Blocks

**Before:**
```typescript
try {
  await fetchData();
} catch (err) {
  // Error is automatically logged
  throw err;
}
```

**After:**
```typescript
import { errorToClientError, handleUnifiedError } from '@/infrastructure/error';
import { ErrorDomain, ErrorSeverity } from '@shared/core';

try {
  await fetchData();
} catch (err) {
  // Convert to ClientError and handle explicitly
  const clientError = errorToClientError(
    err as Error,
    ErrorDomain.NETWORK,
    ErrorSeverity.MEDIUM,
    { component: 'DataFetcher', operation: 'fetchData' }
  );
  
  handleUnifiedError(clientError);
  throw clientError;
}
```

### Step 4: HTTP Boundary Serialization

When sending errors to the server or receiving errors from the server:

#### Client → Server

```typescript
import { createValidationError, toApiError } from '@/infrastructure/error';

const error = createValidationError(
  [{ field: 'email', message: 'Invalid email' }],
  { component: 'Form', operation: 'submit' }
);

// Serialize for API
const apiError = toApiError(error);

// Send to server
await fetch('/api/errors', {
  method: 'POST',
  body: JSON.stringify(apiError),
});
```

#### Server → Client

```typescript
import { fromApiError, handleUnifiedError } from '@/infrastructure/error';

try {
  const response = await fetch('/api/data');
  const data = await response.json();
  
  if (!data.success) {
    // Deserialize server error
    const clientError = fromApiError(data);
    handleUnifiedError(clientError);
    throw clientError;
  }
} catch (err) {
  // Handle error
}
```

## Benefits of the New Pattern

### 1. Separation of Concerns

- **Error Construction**: Pure functions, no side effects
- **Error Handling**: Explicit side effects (logging, tracking, recovery)

### 2. Testability

```typescript
// Easy to test error construction without side effects
const error = createValidationError([{ field: 'email', message: 'Invalid' }]);
expect(error.type).toBe(ErrorDomain.VALIDATION);
expect(error.severity).toBe(ErrorSeverity.LOW);
// No logs or tracking calls during test
```

### 3. Predictability

```typescript
// Clear when side effects occur
const error = createNetworkError('Failed'); // No side effects
handleUnifiedError(error); // Side effects happen here
```

### 4. Flexibility

```typescript
// Create error without handling
const error = createValidationError([{ field: 'email', message: 'Invalid' }]);

// Decide later whether to handle
if (shouldReport) {
  handleUnifiedError(error);
}
```

### 5. Alignment with Server

The new pattern aligns with server-side error handling:
- Pure factory functions
- Explicit error handling
- HTTP boundary serialization

## Common Patterns

### Pattern 1: Create and Handle Immediately

```typescript
import { createNetworkError, handleUnifiedError } from '@/infrastructure/error';

const error = createNetworkError('Request failed', 500, { component: 'API' });
handleUnifiedError(error);
throw error;
```

### Pattern 2: Create, Enrich, Then Handle

```typescript
import { createSystemError, enrichErrorContext, handleUnifiedError } from '@/infrastructure/error';

let error = createSystemError('Operation failed', originalError);

// Add more context as error bubbles up
error = enrichErrorContext(error, { userId: currentUser.id });

handleUnifiedError(error);
```

### Pattern 3: Create Multiple Errors, Handle Once

```typescript
import { createValidationError, handleUnifiedError } from '@/infrastructure/error';

const errors: ClientError[] = [];

if (!email) {
  errors.push(createValidationError([{ field: 'email', message: 'Required' }]));
}

if (!password) {
  errors.push(createValidationError([{ field: 'password', message: 'Required' }]));
}

// Handle all errors
errors.forEach(handleUnifiedError);
```

### Pattern 4: Conditional Handling

```typescript
import { createNetworkError, handleUnifiedError } from '@/infrastructure/error';

const error = createNetworkError('Request failed', 500);

// Only handle in production
if (process.env.NODE_ENV === 'production') {
  handleUnifiedError(error);
}
```

## Integration with Observability and Logging

The unified error handler automatically integrates with:

### Observability

```typescript
// Error is tracked in observability
handleUnifiedError(error);

// Equivalent to:
observability.trackError(errorObj, {
  component: error.context.component,
  errorType: error.type,
  errorSeverity: error.severity,
  // ... more context
});
```

### Logging

```typescript
// Error is logged with structured logger
handleUnifiedError(error);

// Equivalent to:
logger.error(error.message, {
  component: error.context.component,
  errorType: error.type,
  errorCode: error.code,
  // ... more context
}, errorObj);
```

## Recovery Strategies

The unified error handler supports recovery strategies:

```typescript
import { errorHandler, createNetworkError } from '@/infrastructure/error';

// Register a recovery strategy
errorHandler.registerRecoveryStrategy({
  id: 'network-retry',
  name: 'Network Retry',
  description: 'Retry network requests',
  automatic: true,
  execute: async () => {
    // Retry logic
    return { success: true, message: 'Retry successful' };
  },
});

// Create error with recovery strategy
const error = createNetworkError('Request failed', 500);
error.recoveryStrategies.push(/* recovery strategy */);

// Handle error (will attempt recovery)
handleUnifiedError(error);
```

## Configuration

Configure the unified error handler:

```typescript
import { errorHandler } from '@/infrastructure/error';

errorHandler.updateConfig({
  enableTracking: true,
  enableLogging: true,
  enableRecovery: true,
  maxRecoveryAttempts: 3,
});
```

## Backward Compatibility

The old `AppError` class still exists for backward compatibility, but new code should use the unified pattern.

To gradually migrate:

1. Start using factory functions for new code
2. Gradually refactor existing code to use factory functions
3. Eventually deprecate `AppError` constructor

## Summary

| Aspect | Old Pattern | New Pattern |
|--------|-------------|-------------|
| Error Creation | `new AppError(...)` | `createValidationError(...)` |
| Side Effects | Automatic in constructor | Explicit with `handleUnifiedError()` |
| Testability | Difficult (side effects) | Easy (pure functions) |
| Predictability | Unclear when side effects occur | Clear separation |
| Server Alignment | Different patterns | Aligned patterns |

## Questions?

For questions or issues with migration, please refer to:
- `client/src/infrastructure/error/unified-types.ts` - Type definitions
- `client/src/infrastructure/error/unified-factory.ts` - Factory functions
- `client/src/infrastructure/error/unified-handler.ts` - Error handler
- `client/src/infrastructure/error/serialization.ts` - HTTP boundary serialization
