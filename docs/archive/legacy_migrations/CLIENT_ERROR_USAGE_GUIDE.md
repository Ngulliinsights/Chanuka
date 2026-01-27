# Client Error System Usage Guide

**Status**: Post-Migration (January 21, 2026)  
**All errors now use the unified core error system**

---

## Quick Reference

### Loading Errors (UI Operations)
```typescript
import {
  LoadingError,
  LoadingTimeoutError,
  LoadingNetworkError,
  LoadingValidationError,
  LoadingOperationFailedError,
  LoadingStageError,
} from '@client/lib/ui/loading/errors';

// Generic loading error
throw new LoadingError('Data failed to load', {
  statusCode: 400,
  context: { operation: 'fetchBills', component: 'BillsList' }
});

// Timeout error
throw new LoadingTimeoutError('fetchBills', 5000, {
  context: { component: 'BillsPage' }
});

// Network error
throw new LoadingNetworkError('Network connection lost', {
  context: { endpoint: '/api/bills' }
});

// Validation error
throw new LoadingValidationError('Invalid response format', {
  context: { component: 'DataValidator' }
});

// Operation failed
throw new LoadingOperationFailedError(
  'fetchBills',
  'Server returned 500 error',
  2, // retry count
  { statusCode: 500 }
);

// Stage error
throw new LoadingStageError('data-transform', 'Failed to transform data', {
  context: { stage: 'processing' }
});
```

### Dashboard Errors (Dashboard Operations)
```typescript
import {
  DashboardError,
  DashboardDataFetchError,
  DashboardValidationError,
  DashboardConfigurationError,
  DashboardActionError,
  DashboardTopicError,
} from '@client/lib/ui/dashboard/errors';

// Generic dashboard error
throw new DashboardError('Dashboard operation failed', undefined, {
  statusCode: 400,
  context: { operation: 'initialize' }
});

// Data fetch error (retryable)
throw new DashboardDataFetchError('/api/dashboard', 'Server error', {
  context: { component: 'DashboardWidget' }
});

// Validation error
throw new DashboardValidationError(
  'Invalid filter format',
  'dateRange',
  { start: 'invalid', end: '2024-01-01' },
  { context: { component: 'FilterPanel' } }
);

// Configuration error (not recoverable)
throw new DashboardConfigurationError('Dashboard not configured', {
  context: { component: 'DashboardSetup' }
});

// Action error
throw new DashboardActionError(
  'saveDashboard',
  'Insufficient permissions',
  { statusCode: 403 }
);

// Topic error
throw new DashboardTopicError(
  'delete',
  'bill-123',
  'Topic is locked',
  { statusCode: 422 }
);
```

### UI Component Errors (Interactive Components)
```typescript
import {
  UIComponentError,
  UIDateError,
  UIDialogError,
} from '@client/lib/design-system/interactive/errors';

// Component error
throw new UIComponentError('DatePicker', 'parse', 'Invalid date format', {
  statusCode: 400,
  context: { field: 'startDate' }
});

// Date error
throw new UIDateError('DatePicker', 'Date is outside valid range', new Date(), {
  context: { min: '2020-01-01', max: '2025-12-31' }
});

// Dialog error
throw new UIDialogError('ConfirmDialog', 'submit', 'Action confirmation failed', {
  statusCode: 400
});
```

---

## Error Properties (Always Available)

All errors extend `BaseError` and have these properties:

```typescript
error.errorId          // Unique error identifier (e.g., 'err_1705...8391')
error.code             // Error code (e.g., 'LOADING_TIMEOUT')
error.domain           // Error domain (UI, NETWORK, VALIDATION, etc.)
error.severity         // Severity level (LOW, MEDIUM, HIGH, CRITICAL)
error.statusCode       // HTTP status code or internal code
error.message          // Human-readable error message
error.retryable        // Can operation be retried?
error.recoverable      // Can error be recovered?
error.timestamp        // When error occurred (Date)
error.context          // Operation context (ErrorContext)
error.metadata         // Full error metadata (ErrorMetadata)
error.cause            // Original error (if wrapped)
error.stack            // Stack trace
```

---

## Error Context

Include context for better debugging and analytics:

```typescript
// ErrorContext properties
throw new LoadingError('Failed to fetch', {
  context: {
    component: 'BillsList',      // Component name
    operation: 'fetchBills',     // Operation being performed
    userId: 'user-123',          // User context
    sessionId: 'session-456',    // Session identifier
    requestId: 'req-789',        // Request tracking ID
    url: '/bills',               // Current URL
    userAgent: 'Mozilla/5.0...', // Browser info
    retryCount: 2,               // Retry attempt number
    route: '/bills/portal',      // Current route
    correlationId: 'corr-999',   // Cross-system tracking
    parentErrorId: 'parent-err', // Error chain
    customField: 'value'         // Custom data
  }
});
```

---

## Type Guards

Use type guards to check error types at runtime:

```typescript
import { isLoadingError, isLoadingTimeoutError } from '@client/lib/ui/loading/errors';
import { isDashboardError, isDashboardDataFetchError } from '@client/lib/ui/dashboard/errors';
import { isUIComponentError, isUIDateError } from '@client/lib/design-system/interactive/errors';

try {
  // ... operation
} catch (error) {
  if (isLoadingTimeoutError(error)) {
    // Handle timeout specifically
    console.log(`Operation timed out after ${error.timeout}ms`);
  } else if (isDashboardDataFetchError(error)) {
    // Handle data fetch failures (retryable)
    retryOperation();
  } else if (isUIDateError(error)) {
    // Handle date errors in UI
    showDatePicker(error.date);
  }
}
```

---

## Error Handling in Components

### Error Boundary Pattern
```typescript
import { UnifiedErrorBoundary } from '@client/core/error/components';

export function MyComponent() {
  return (
    <UnifiedErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, info) => {
        console.error('Component error:', error, info);
      }}
    >
      <ContentComponent />
    </UnifiedErrorBoundary>
  );
}
```

### Try-Catch Pattern
```typescript
import { LoadingError, isLoadingTimeoutError } from '@client/lib/ui/loading/errors';
import { coreErrorHandler } from '@client/core/error';

async function loadData() {
  try {
    const data = await fetchWithTimeout(5000);
    return data;
  } catch (error) {
    if (isLoadingTimeoutError(error)) {
      // Handle timeout
      const recovery = await coreErrorHandler.handle(error);
      if (recovery.recovered) {
        return loadData(); // Retry
      }
    }
    
    // Report to error handler
    coreErrorHandler.handleError(error);
    throw error;
  }
}
```

### Async Operation Pattern
```typescript
import { LoadingOperationFailedError } from '@client/lib/ui/loading/errors';

async function performOperation(operationId: string) {
  let retryCount = 0;
  
  try {
    // ... do work
  } catch (error) {
    throw new LoadingOperationFailedError(
      operationId,
      error instanceof Error ? error.message : 'Unknown error',
      retryCount,
      { cause: error }
    );
  }
}
```

---

## Recovery Strategies

Errors support automatic recovery:

```typescript
import { coreErrorHandler } from '@client/core/error';

const error = new LoadingTimeoutError('fetchBills', 5000);

// Check if recoverable
if (error.recoverable) {
  const recovery = await coreErrorHandler.handle(error);
  
  if (recovery.success) {
    console.log(`Recovery succeeded: ${recovery.action}`);
    // Retry operation
  } else {
    console.log(`Recovery failed: ${recovery.message}`);
    // Show user error
  }
}

// Or use retryable property
if (error.retryable) {
  setTimeout(() => retryOperation(), 1000);
}
```

---

## Error Analytics

All errors automatically contribute to analytics:

```typescript
import { errorAnalyticsBridge } from '@client/lib/services/errorAnalyticsBridge';

// Track error
errorAnalyticsBridge.trackError({
  errorId: error.errorId,
  message: error.message,
  stack: error.stack,
  timestamp: Date.now(),
  userId: 'user-123',
  url: window.location.href,
});

// Get metrics
const metrics = errorAnalyticsBridge.getMetrics();
console.log(`Total errors: ${metrics.totalErrors}`);
console.log(`Error rate: ${metrics.errorRate}%`);
console.log(`Top errors:`, metrics.topErrors);

// Get alerts
const alerts = errorAnalyticsBridge.getAlerts();
alerts.forEach(alert => {
  console.log(`${alert.severity}: ${alert.message}`);
});
```

---

## Error Reporters

Errors are automatically reported to all registered reporters:

```typescript
import { 
  coreErrorHandler, 
  removeErrorReporter 
} from '@client/core/error';
import { ConsoleReporter } from '@client/core/error/reporters';

// Default reporters are registered automatically
// Console reporter logs to browser console
// Sentry reporter (if configured) sends to Sentry
// API reporter sends to backend

// Add custom reporter
class LoggingReporter {
  async report(error) {
    const entry = {
      timestamp: new Date().toISOString(),
      errorId: error.errorId,
      message: error.message,
      stack: error.stack,
    };
    console.log('Error logged:', entry);
    // Could send to logging service
  }
}

coreErrorHandler.addReporter(new LoggingReporter());
```

---

## Best Practices

### ✅ DO

```typescript
// 1. Include context when throwing errors
throw new LoadingError('Failed to load bills', {
  context: {
    component: 'BillsList',
    operation: 'fetchBills',
    endpoint: '/api/bills',
  }
});

// 2. Use appropriate error types
if (validationFailed) {
  throw new LoadingValidationError('Invalid bill format');
} else if (networkFailed) {
  throw new LoadingNetworkError('Network unreachable');
}

// 3. Check error properties before acting
if (error.retryable && error.context.retryCount < 3) {
  retryOperation();
}

// 4. Use type guards
if (isLoadingTimeoutError(error)) {
  // Handle timeout
}

// 5. Preserve error chains
try {
  // ... operation
} catch (cause) {
  throw new LoadingError('Operation failed', { cause });
}
```

### ❌ DON'T

```typescript
// 1. Don't lose error context
throw new Error('Failed to load'); // ❌ No context

// 2. Don't mix error systems
import { ServiceError } from '@client/lib/services/errors'; // ❌ Legacy

// 3. Don't ignore error recovery
catch (error) {
  throw error; // ❌ Lost recovery opportunity
}

// 4. Don't use generic Error
throw new Error('Something went wrong'); // ❌ No domain info

// 5. Don't swallow errors silently
try {
  // ... operation
} catch (error) {
  // ❌ Silent failure - no logging or reporting
}
```

---

## Migration Checklist

If migrating old code:

- [ ] Replace `ServiceError` imports with core error imports
- [ ] Replace `APIError` imports with core error imports
- [ ] Update error instantiation to use new constructors
- [ ] Add error context to throw statements
- [ ] Use type guards instead of string matching
- [ ] Test with error boundaries
- [ ] Verify error analytics capture
- [ ] Update component error handlers
- [ ] Test recovery strategies

---

## Troubleshooting

### Error not being reported
**Cause**: Reporter not registered  
**Solution**: Check that error handler is initialized and reporters are added

### Error context lost
**Cause**: Context not included when throwing  
**Solution**: Include context object with relevant information

### Recovery not working
**Cause**: Error marked as not recoverable  
**Solution**: Check error.recoverable property and strategy configuration

### Analytics not showing errors
**Cause**: Error not tracked properly  
**Solution**: Ensure error goes through coreErrorHandler.handleError()

---

## Additional Resources

- [Core Error System](./client/src/core/error/README.md)
- [Error Boundaries](./client/src/core/error/components/README.md)
- [Error Recovery](./client/src/core/error/recovery.ts)
- [Error Reporters](./client/src/core/error/reporters/)

---

**Last Updated**: January 21, 2026  
**Maintained By**: Development Team  
**Status**: Production Ready ✅
