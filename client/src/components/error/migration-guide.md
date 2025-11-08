# Error Handling Migration Guide

## Overview
This guide outlines the migration from the existing error handling components to the new unified error handling system.

## Migration Strategy

### Phase 1: Integration (Current)
- Unified error handler is implemented and ready
- Existing components are updated to use unified handler as backend
- Both systems work together during transition

### Phase 2: Consolidation (Next)
- Migrate all error handling to use unified system
- Update all components to use new error types and patterns
- Deprecate old error handling patterns

### Phase 3: Cleanup (Final)
- Remove redundant error handling code
- Consolidate error components into unified system
- Update documentation and examples

## Component Mapping

### Old → New
- `ErrorBoundary` → Use unified `ErrorBoundary` with enhanced features
- `ErrorFallback` → Integrated into unified error boundary
- `ErrorModal` → Use unified error handler with modal listeners
- `ErrorToast` → Use unified error handler with toast listeners
- `shared/errors` → Use unified error types and classes

## Key Changes

### 1. Error Types
```typescript
// Old
import { BaseError } from '../../shared/errors'

// New
import { AppError, ErrorType, ErrorSeverity } from '../../utils/unified-error-handler'
```

### 2. Error Handling
```typescript
// Old
try {
  // operation
} catch (error) {
  // manual error handling
}

// New
import { errorHandler, createNetworkError } from '../../utils/unified-error-handler'

try {
  // operation
} catch (error) {
  errorHandler.handleError({
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: error.message,
    // ... automatic recovery, logging, etc.
  })
}
```

### 3. Error Boundaries
```typescript
// Old
<ErrorBoundary onError={customHandler}>
  <Component />
</ErrorBoundary>

// New - Enhanced with recovery
<ErrorBoundary 
  enableRecovery={true}
  enableFeedback={true}
  onError={customHandler}
>
  <Component />
</ErrorBoundary>
```

## Benefits of Migration

1. **Centralized Error Management**: All errors go through one system
2. **Automatic Recovery**: Built-in recovery strategies
3. **Better UX**: Enhanced error boundaries with user feedback
4. **Comprehensive Logging**: Structured error logging and metrics
5. **Type Safety**: Improved TypeScript support
6. **Performance**: Debounced notifications and memory management
7. **Monitoring**: Built-in error tracking and analytics

## Migration Checklist

- [ ] Update error boundary implementations
- [ ] Migrate error toast system
- [ ] Update error modal usage
- [ ] Replace shared error types
- [ ] Update API error handling
- [ ] Test error recovery flows
- [ ] Update documentation
- [ ] Remove deprecated code