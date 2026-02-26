# Logging Infrastructure

Unified logging system for the client application, providing structured logging with context and integration with observability.

## Overview

The logging infrastructure provides:
- Structured logging with context
- Log level filtering (debug, info, warn, error)
- Integration with observability for tracking
- Alignment with server-side pino logger interface
- Child logger creation for scoped logging
- Render tracking and performance monitoring

## Architecture

```
infrastructure/logging/
├── index.ts           # Public API exports
├── README.md          # This file
└── types.ts           # Type definitions (re-exported from lib/utils/logger)
```

The actual logger implementation is in `@client/lib/utils/logger` and is re-exported here for consistency with the infrastructure module pattern.

## Usage

### Basic Logging

```typescript
import { logger } from '@/infrastructure/logging';

// Debug logging (only in development)
logger.debug('User action initiated', {
  component: 'LoginForm',
  operation: 'submit',
});

// Info logging
logger.info('User logged in successfully', {
  component: 'AuthService',
  userId: user.id,
});

// Warning logging
logger.warn('API rate limit approaching', {
  component: 'APIClient',
  remaining: 10,
});

// Error logging
logger.error('Failed to fetch user data', {
  component: 'UserService',
  userId: user.id,
}, error);
```

### Structured Logging with Context

```typescript
import { logger, LogContext } from '@/infrastructure/logging';

const context: LogContext = {
  component: 'PaymentForm',
  operation: 'processPayment',
  userId: currentUser.id,
  requestId: generateRequestId(),
};

logger.info('Processing payment', context, {
  amount: payment.amount,
  currency: payment.currency,
});
```

### Child Loggers for Scoped Logging

```typescript
import { logger } from '@/infrastructure/logging';

// Create a child logger with bound context
const authLogger = logger.child({
  component: 'AuthService',
  userId: currentUser.id,
});

// All logs from this logger will include the bound context
authLogger.info('Password changed');
authLogger.warn('Failed login attempt');
```

### Render Tracking

```typescript
import { logger } from '@/infrastructure/logging';

// Track component renders
logger.trackRender({
  component: 'UserProfile',
  renderCount: 1,
  timestamp: Date.now(),
  trigger: 'props-change',
});

// Track component lifecycle
logger.trackLifecycle({
  component: 'UserProfile',
  action: 'mount',
  timestamp: Date.now(),
});

// Track performance impact
logger.trackPerformanceImpact({
  component: 'UserProfile',
  renderDuration: 15.5,
  timestamp: Date.now(),
});

// Detect infinite renders
if (logger.detectInfiniteRender('UserProfile', 50)) {
  console.error('Infinite render detected!');
}

// Get render statistics
const stats = logger.getRenderStats('UserProfile');
console.log('Render stats:', stats);
```

## Integration with Observability

The logger automatically integrates with the observability module for error tracking and performance monitoring:

```typescript
import { logger } from '@/infrastructure/logging';
import { observability } from '@/infrastructure/observability';

// Errors logged through the logger are automatically tracked
logger.error('API call failed', { component: 'APIClient' }, error);
// → Automatically calls observability.trackError()

// Performance metrics are tracked
logger.trackPerformanceImpact({
  component: 'DataTable',
  renderDuration: 25.3,
  timestamp: Date.now(),
});
// → Automatically calls observability.trackPerformance()
```

## Log Levels

The logger supports four log levels:

1. **debug**: Detailed information for debugging (only in development)
2. **info**: General informational messages
3. **warn**: Warning messages for potentially problematic situations
4. **error**: Error messages for failures and exceptions

In production, debug logs are automatically filtered out.

## Migration from console.*

To migrate from console.* calls to structured logging:

### Before
```typescript
console.log('User logged in:', userId);
console.error('API call failed:', error);
console.warn('Cache miss for key:', key);
```

### After
```typescript
import { logger } from '@/infrastructure/logging';

logger.info('User logged in', {
  component: 'AuthService',
  userId: userId,
});

logger.error('API call failed', {
  component: 'APIClient',
  operation: 'fetchUserData',
}, error);

logger.warn('Cache miss', {
  component: 'CacheService',
  metadata: { key: key },
});
```

## Best Practices

1. **Always provide context**: Include component name and operation for better traceability
2. **Use appropriate log levels**: Don't use error for warnings or info for debug messages
3. **Include relevant metadata**: Add userId, requestId, and other contextual information
4. **Use child loggers for scoped logging**: Create child loggers for modules or features
5. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII
6. **Use structured data**: Pass objects instead of string concatenation

## Type Safety

All logger methods are fully typed:

```typescript
import { Logger, LogContext } from '@/infrastructure/logging';

const myLogger: Logger = logger.child({ component: 'MyComponent' });

const context: LogContext = {
  component: 'MyComponent',
  operation: 'myOperation',
  userId: '123',
};

myLogger.info('Operation completed', context);
```

## Performance Considerations

- Debug logs are automatically filtered in production
- Render tracking uses simple in-memory storage
- Performance impact tracking integrates with the performance monitoring system
- Child loggers are lightweight and can be created freely

## Alignment with Server-Side Logging

The client logger interface is aligned with the server-side pino logger:

- Same method signatures (debug, info, warn, error)
- Same context structure (component, operation, userId, etc.)
- Same child logger pattern
- Compatible log formats for unified log aggregation

## Future Enhancements

Potential future improvements:

1. Remote log shipping to centralized logging service
2. Log buffering and batching for performance
3. Advanced filtering and sampling
4. Integration with error boundary components
5. Automatic context injection from React context
