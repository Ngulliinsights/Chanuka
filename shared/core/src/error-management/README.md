# Error Management System

A comprehensive error management system that provides structured error handling, categorization, recovery strategies, and circuit breaker patterns for robust application reliability.

## Architecture

```
error-management/
├── errors/
│   ├── specialized/          # Domain-specific error classes
│   │   ├── validation-error.ts
│   │   ├── authentication-error.ts
│   │   ├── authorization-error.ts
│   │   ├── database-error.ts
│   │   ├── network-error.ts
│   │   ├── external-service-error.ts
│   │   ├── system-error.ts
│   │   ├── timeout-error.ts
│   │   └── index.ts         # Barrel exports
│   └── index.ts            # Error management exports
├── circuit-breaker/        # Circuit breaker implementation
├── handlers/               # Error handlers and middleware
├── types/                  # TypeScript type definitions
└── index.ts               # Main exports
```

## Key Features

### 🏗️ Structured Error Classes
- **BaseError**: Unified error base class with metadata, correlation IDs, and recovery strategies
- **Specialized Errors**: Domain-specific error classes (ValidationError, DatabaseError, etc.)
- **Error Domains**: Categorized error types (VALIDATION, DATABASE, NETWORK, etc.)
- **Error Severity**: LOW, MEDIUM, HIGH, CRITICAL levels

### 🔄 Recovery Strategies
- **Automatic Recovery**: Built-in retry mechanisms with exponential backoff
- **Configurable Strategies**: Custom recovery actions per error type
- **Circuit Breaker Integration**: Automatic failure detection and recovery

### 📊 Error Correlation
- **Correlation IDs**: Track errors across service boundaries
- **Parent-Child Relationships**: Link related errors in error chains
- **Context Preservation**: Maintain error context through async operations

### 🛡️ Circuit Breaker Protection
- **Failure Detection**: Automatic threshold-based failure detection
- **Graceful Degradation**: Fallback strategies during outages
- **Recovery Monitoring**: Health checks and automatic recovery

## Usage Examples

### Basic Error Handling

```typescript
import {
  ValidationError,
  DatabaseError,
  NetworkError,
  BaseError
} from '@Chanuka/core/error-management';

// Throw domain-specific errors
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: 'invalid-email'
});

throw new DatabaseError('Connection timeout', {
  query: 'SELECT * FROM users',
  duration: 5000
});

// Handle errors with recovery
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof BaseError && error.shouldRetry()) {
    const recovered = await error.attemptRecovery();
    if (recovered) {
      // Retry the operation
      return await riskyOperation();
    }
  }
  throw error;
}
```

### Circuit Breaker Usage

```typescript
import { CircuitBreaker } from '@Chanuka/core/error-management';

const breaker = new CircuitBreaker({
  threshold: 5,        // Open after 5 failures
  timeout: 60000,      // Recovery timeout (1 minute)
  slowCallThreshold: 5000, // Slow call threshold (5 seconds)
});

const result = await breaker.call(async () => {
  return await externalApiCall();
});

if (result.success) {
  console.log('Operation successful:', result.data);
} else {
  console.log('Circuit breaker state:', result.state);
}
```

### Error Correlation and Context

```typescript
import { BaseError } from '@Chanuka/core/error-management';

// Create correlated errors
const parentError = new ValidationError('Form validation failed', {
  correlationId: 'req-123',
  context: { userId: 'user-456' }
});

// Create child error that inherits correlation
const childError = parentError.createChildError('Email validation failed', {
  field: 'email',
  value: 'invalid'
});

// Check error relationships
if (childError.isRelatedTo(parentError)) {
  console.log('Errors are correlated');
}
```

### Express Middleware Integration

```typescript
import express from 'express';
import { errorHandlerMiddleware } from '@Chanuka/core/error-management';

const app = express();

// Your routes here...

// Error handling middleware (must be last)
app.use(errorHandlerMiddleware({
  includeStackTrace: process.env.NODE_ENV === 'development',
  enableSentryReporting: true,
  logErrors: true
}));
```

## Error Types

### Specialized Error Classes

| Error Class | HTTP Status | Domain | Severity | Retryable |
|-------------|-------------|--------|----------|-----------|
| `ValidationError` | 400 | VALIDATION | LOW | No |
| `AuthenticationError` | 401 | AUTHENTICATION | MEDIUM | No |
| `AuthorizationError` | 403 | AUTHORIZATION | MEDIUM | No |
| `DatabaseError` | 500 | DATABASE | HIGH | Yes |
| `NetworkError` | 503 | NETWORK | HIGH | Yes |
| `ExternalServiceError` | 502 | EXTERNAL_SERVICE | HIGH | Yes |
| `SystemError` | 500 | SYSTEM | CRITICAL | No |
| `TimeoutError` | 408 | SYSTEM | MEDIUM | Yes |

### Error Domains

- **VALIDATION**: Input validation errors
- **AUTHENTICATION**: User authentication failures
- **AUTHORIZATION**: Permission/access control errors
- **DATABASE**: Database operation failures
- **NETWORK**: Network connectivity issues
- **EXTERNAL_SERVICE**: Third-party service failures
- **BUSINESS_LOGIC**: Application logic errors
- **SYSTEM**: System-level failures

## Configuration

### Circuit Breaker Options

```typescript
{
  threshold: 5,           // Failures before opening circuit
  timeout: 60000,         // Recovery timeout (ms)
  slowCallThreshold: 5000, // Slow call threshold (ms)
  slowCallRateThreshold: 0.5, // Slow call rate threshold
  successThreshold: 3,    // Successes needed to close circuit
  monitoringPeriod: 10000 // Monitoring window (ms)
}
```

### Error Handler Options

```typescript
{
  includeStackTrace: false,    // Include stack traces in responses
  enableSentryReporting: true, // Send errors to Sentry
  logErrors: true,            // Log errors to configured logger
  trustProxy: true,           // Trust proxy headers for IP detection
  redactFields: ['password', 'token', 'ssn'] // Fields to redact in logs
}
```

## Recovery Strategies

### Built-in Recovery Actions

- **Retry with Backoff**: Exponential backoff retry for transient failures
- **Circuit Breaker**: Automatic failure isolation and recovery
- **Fallback Values**: Return cached or default values during outages
- **Service Degradation**: Reduce functionality during high error rates

### Custom Recovery Strategies

```typescript
const customError = new DatabaseError('Connection failed', {
  recoveryStrategies: [
    {
      name: 'custom-retry',
      description: 'Custom retry logic',
      automatic: true,
      action: async () => {
        // Custom recovery logic
        await customRecoveryFunction();
      }
    }
  ]
});
```

## Monitoring and Observability

### Error Metrics

- **Error Rates**: Track error frequency by type and domain
- **Recovery Success**: Monitor recovery strategy effectiveness
- **Circuit Breaker States**: Track circuit breaker open/closed states
- **Correlation Analysis**: Analyze error patterns and relationships

### Health Checks

```typescript
import { errorHealthCheck } from '@Chanuka/core/error-management';

const healthChecker = new HealthChecker();
healthChecker.register(errorHealthCheck({
  circuitBreakerThreshold: 0.1, // Alert if >10% errors
  errorRateWindow: 300000      // 5-minute window
}));
```

## Best Practices

1. **Use Appropriate Error Types**: Choose the most specific error class for your use case
2. **Provide Context**: Include relevant context in error details for debugging
3. **Handle Recovery**: Implement recovery strategies for transient failures
4. **Monitor Error Rates**: Set up alerts for unusual error patterns
5. **Test Error Scenarios**: Include error handling in your test suites
6. **Log Correlation IDs**: Use correlation IDs to trace errors across services
7. **Avoid Sensitive Data**: Use `toSafeLog()` for logging to prevent data leaks

## Migration Guide

### From Generic Errors

```typescript
// Before
throw new Error('Invalid input');

// After
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: userInput.email
});
```

### From Custom Error Classes

```typescript
// Before
class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

// After
class CustomError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      code: 'CUSTOM_ERROR',
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      ...details
    });
  }
}
```

## Testing

```bash
# Run error management tests
npm test -- src/error-management

# Run specific error type tests
npm test -- src/error-management/errors/specialized

# Run circuit breaker tests
npm test -- src/error-management/circuit-breaker
```

## Performance Considerations

- **Memory Usage**: Error objects include metadata but are optimized for low overhead
- **Serialization**: Efficient JSON serialization with caching for repeated calls
- **Recovery Actions**: Asynchronous recovery to avoid blocking operations
- **Circuit Breaker**: Lightweight state tracking with minimal performance impact

## Security

- **Information Disclosure**: Automatic redaction of sensitive error details
- **Error Masking**: User-friendly messages hide internal implementation details
- **Audit Logging**: Comprehensive error logging for security monitoring
- **Rate Limiting**: Built-in protection against error-based DoS attacks