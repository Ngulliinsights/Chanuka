# Unified Error Handling System

Comprehensive error handling infrastructure for the client application, aligned with server-side patterns and integrated with observability and logging.

## Overview

The unified error handling system provides:

1. **Type-Safe Error Types**: Aligned with server `StandardizedError`
2. **Pure Factory Functions**: Create errors without side effects
3. **Explicit Error Handling**: Handle errors with observability and logging integration
4. **HTTP Boundary Serialization**: Seamless error transmission across client/server boundaries
5. **Recovery Strategies**: Automatic and manual error recovery
6. **Result Monad**: Functional error handling pattern (optional)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Creation Layer                      │
│  Pure Factory Functions (no side effects)                    │
│  - createValidationError()                                   │
│  - createNetworkError()                                      │
│  - createAuthenticationError()                               │
│  - etc.                                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Error Handling Layer                       │
│  Explicit Side Effects                                       │
│  - handleUnifiedError()                                      │
│    ├─ Track in observability                                │
│    ├─ Log with structured logger                            │
│    └─ Attempt recovery                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  HTTP Boundary Layer                         │
│  Serialization/Deserialization                               │
│  - toApiError() (client → server)                           │
│  - fromApiError() (server → client)                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Separation of Concerns

**Error Construction** (pure, no side effects):
```typescript
const error = createValidationError([{ field: 'email', message: 'Invalid' }]);
```

**Error Handling** (explicit side effects):
```typescript
handleUnifiedError(error); // Logs, tracks, attempts recovery
```

### 2. Type Alignment

Client errors align with server `StandardizedError`:
- Uses `ErrorDomain` (not `ErrorCategory` or `ErrorClassification`)
- Uses `type` field (not `category`)
- Uses `statusCode` field (not `httpStatusCode`)

### 3. HTTP Boundary Serialization

Errors can be serialized for transmission:
```typescript
// Client → Server
const apiError = toApiError(clientError);

// Server → Client
const clientError = fromApiError(apiErrorResponse);
```

## Quick Start

### Basic Usage

```typescript
import {
  createNetworkError,
  handleUnifiedError,
} from '@/infrastructure/error';

// 1. Create error (pure function)
const error = createNetworkError(
  'Request failed',
  500,
  { component: 'APIClient', operation: 'fetchData' }
);

// 2. Handle error (side effects)
handleUnifiedError(error);

// 3. Throw or return
throw error;
```

### With Try-Catch

```typescript
import {
  errorToClientError,
  handleUnifiedError,
} from '@/infrastructure/error';
import { ErrorDomain, ErrorSeverity } from '@shared/core';

try {
  await fetchData();
} catch (err) {
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

### With Result Monad (Functional)

```typescript
import {
  safeAsync,
  isOk,
  createNetworkError,
} from '@/infrastructure/error';

async function fetchUser(id: string) {
  return safeAsync(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    (error) => createNetworkError(error.message, 0, {
      component: 'UserService',
      operation: 'fetchUser',
    })
  );
}

// Usage
const result = await fetchUser('123');

if (isOk(result)) {
  console.log('User:', result.value);
} else {
  handleUnifiedError(result.error);
}
```

## Factory Functions

### Validation Errors

```typescript
import { createValidationError } from '@/infrastructure/error';

const error = createValidationError(
  [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' },
  ],
  { component: 'RegistrationForm', operation: 'validateInput' }
);
```

### Network Errors

```typescript
import { createNetworkError } from '@/infrastructure/error';

const error = createNetworkError(
  'Request failed',
  500, // HTTP status code
  { component: 'APIClient', operation: 'fetchData' }
);
```

### Authentication Errors

```typescript
import { createAuthenticationError } from '@/infrastructure/error';

const error = createAuthenticationError(
  'Invalid credentials',
  { component: 'AuthService', operation: 'login' }
);
```

### Authorization Errors

```typescript
import { createAuthorizationError } from '@/infrastructure/error';

const error = createAuthorizationError(
  'Insufficient permissions',
  ['admin', 'moderator'], // required permissions
  { component: 'AdminPanel', operation: 'accessSettings' }
);
```

### Business Logic Errors

```typescript
import { createBusinessError } from '@/infrastructure/error';
import { ERROR_CODES } from '@shared/constants';

const error = createBusinessError(
  ERROR_CODES.INVALID_OPERATION,
  'Cannot delete active subscription',
  { component: 'SubscriptionService', operation: 'delete' }
);
```

### System Errors

```typescript
import { createSystemError } from '@/infrastructure/error';

const error = createSystemError(
  'Database connection failed',
  originalError, // optional Error object
  { component: 'DatabaseService', operation: 'connect' }
);
```

### Not Found Errors

```typescript
import { createNotFoundError } from '@/infrastructure/error';

const error = createNotFoundError(
  'User',
  { component: 'UserService', operation: 'findById', userId: '123' }
);
```

### Timeout Errors

```typescript
import { createTimeoutError } from '@/infrastructure/error';

const error = createTimeoutError(
  'fetchUserData',
  5000, // timeout in ms
  { component: 'APIClient', operation: 'fetchUser' }
);
```

## Error Handler

### Configuration

```typescript
import { errorHandler } from '@/infrastructure/error';

errorHandler.updateConfig({
  enableTracking: true,      // Track in observability
  enableLogging: true,        // Log with structured logger
  enableRecovery: true,       // Attempt automatic recovery
  maxRecoveryAttempts: 3,     // Max recovery attempts per error
});
```

### Recovery Strategies

```typescript
import { errorHandler } from '@/infrastructure/error';

// Register a recovery strategy
errorHandler.registerRecoveryStrategy({
  id: 'network-retry',
  name: 'Network Retry',
  description: 'Retry network requests with exponential backoff',
  automatic: true,
  execute: async () => {
    // Retry logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Retry successful' };
  },
});

// Unregister a strategy
errorHandler.unregisterRecoveryStrategy('network-retry');

// Get all strategies
const strategies = errorHandler.getRecoveryStrategies();
```

## HTTP Boundary Serialization

### Client → Server

```typescript
import { createValidationError, toApiError } from '@/infrastructure/error';

const error = createValidationError([{ field: 'email', message: 'Invalid' }]);

// Serialize for API
const apiError = toApiError(error);

// Send to server
await fetch('/api/errors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiError),
});
```

### Server → Client

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

## Result Monad (Functional Pattern)

### Basic Usage

```typescript
import { ok, err, isOk, isErr } from '@/infrastructure/error';

// Create results
const successResult = ok({ id: 1, name: 'John' });
const failureResult = err(createNetworkError('Failed', 500));

// Check results
if (isOk(result)) {
  console.log('Success:', result.value);
} else {
  console.log('Error:', result.error);
}
```

### Wrapping Operations

```typescript
import { safeAsync, createNetworkError } from '@/infrastructure/error';

async function fetchUser(id: string) {
  return safeAsync(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    (error) => createNetworkError(error.message, 0)
  );
}
```

### Chaining Operations

```typescript
import { andThen, map } from '@/infrastructure/error';

const result = await fetchUser('123');

const processedResult = andThen(result, (user) => {
  // Validate user
  if (!user.email) {
    return err(createValidationError([{ field: 'email', message: 'Required' }]));
  }
  return ok(user);
});

const transformedResult = map(processedResult, (user) => ({
  ...user,
  displayName: `${user.firstName} ${user.lastName}`,
}));
```

See [RESULT_MONAD_GUIDE.md](./RESULT_MONAD_GUIDE.md) for complete documentation.

## Integration

### With Observability

Errors are automatically tracked in observability:

```typescript
handleUnifiedError(error);

// Equivalent to:
observability.trackError(errorObj, {
  component: error.context.component,
  errorType: error.type,
  errorSeverity: error.severity,
  // ... more context
});
```

### With Logging

Errors are automatically logged with structured logger:

```typescript
handleUnifiedError(error);

// Equivalent to:
logger.error(error.message, {
  component: error.context.component,
  errorType: error.type,
  errorCode: error.code,
  // ... more context
}, errorObj);
```

## Migration Guide

See [UNIFIED_ERROR_MIGRATION.md](./UNIFIED_ERROR_MIGRATION.md) for complete migration guide from old patterns.

## API Reference

### Types

- `BaseError` - Core error interface aligned with server
- `ClientError` - Extended error with recovery concerns
- `ErrorContext` - Contextual information about error
- `ApiErrorResponse` - HTTP boundary error format
- `ClientResult<T>` - Result monad type

### Factory Functions

- `createValidationError()` - Create validation error
- `createNetworkError()` - Create network error
- `createAuthenticationError()` - Create authentication error
- `createAuthorizationError()` - Create authorization error
- `createBusinessError()` - Create business logic error
- `createSystemError()` - Create system error
- `createNotFoundError()` - Create not found error
- `createTimeoutError()` - Create timeout error
- `createClientError()` - Create generic client error

### Error Handler

- `handleUnifiedError()` - Handle error with side effects
- `errorHandler.updateConfig()` - Update configuration
- `errorHandler.registerRecoveryStrategy()` - Register recovery strategy
- `errorHandler.unregisterRecoveryStrategy()` - Unregister recovery strategy
- `errorHandler.getRecoveryStrategies()` - Get all strategies

### Serialization

- `toApiError()` - Serialize ClientError to API format
- `fromApiError()` - Deserialize API error to ClientError
- `serializeError()` - Serialize to JSON string
- `deserializeError()` - Deserialize from JSON string
- `isValidApiErrorResponse()` - Validate API error response
- `errorToClientError()` - Convert Error to ClientError
- `sanitizeErrorForDisplay()` - Remove sensitive information
- `enrichErrorContext()` - Add additional context
- `cloneError()` - Clone error with modifications

### Result Monad

- `ok()` - Create success result
- `err()` - Create failure result
- `isOk()` - Check if result is success
- `isErr()` - Check if result is failure
- `safeAsync()` - Wrap async operation
- `safe()` - Wrap sync operation
- `map()` - Transform success value
- `mapError()` - Transform error
- `andThen()` - Chain operations
- `unwrap()` - Unwrap or throw
- `unwrapOr()` - Unwrap or use default
- `unwrapOrElse()` - Unwrap or compute default
- `match()` - Pattern match on result
- `combine()` - Combine multiple results
- `combineWith()` - Combine with different types
- `fromPromise()` - Convert Promise to Result
- `toPromise()` - Convert Result to Promise
- `tap()` - Side effect on success
- `tapError()` - Side effect on error

## Examples

See the following files for complete examples:

- [UNIFIED_ERROR_MIGRATION.md](./UNIFIED_ERROR_MIGRATION.md) - Migration guide with examples
- [RESULT_MONAD_GUIDE.md](./RESULT_MONAD_GUIDE.md) - Result monad examples
- [__tests__/serialization.test.ts](./__tests__/serialization.test.ts) - Test examples

## Requirements

This implementation satisfies the following requirements:

- **22.1**: Uses ErrorDomain from @shared/core
- **22.2**: Standardizes field names (type, statusCode)
- **22.3**: Pure factory functions
- **22.4**: Side effects moved out of construction
- **22.5**: toApiError() implementation
- **22.6**: fromApiError() implementation
- **22.7**: ErrorHandler integrates with observability
- **22.8**: ErrorHandler integrates with logger
- **22.9**: AppError refactored (backward compatible)
- **22.10**: Result monad support
- **22.11**: Round-trip serialization tested
- **22.12**: Observability and logging integration tested
- **22.13**: Documentation complete

## Support

For questions or issues:

1. Check the migration guide: [UNIFIED_ERROR_MIGRATION.md](./UNIFIED_ERROR_MIGRATION.md)
2. Check the Result monad guide: [RESULT_MONAD_GUIDE.md](./RESULT_MONAD_GUIDE.md)
3. Review test examples: [__tests__/serialization.test.ts](./__tests__/serialization.test.ts)
4. Check integration tests: [__tests__/integration.test.md](./__tests__/integration.test.md)
