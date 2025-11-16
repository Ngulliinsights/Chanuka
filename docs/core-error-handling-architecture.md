# Core Error Handling Architecture

## Overview

This document describes the unified client-side error handling system implemented in Phase 1 of the client cross-cutting concerns consolidation. The system provides comprehensive error management, recovery strategies, and React integration.

## Architecture

### Core Components

#### 1. Error Types (`client/src/core/error/types.ts`)

- **AppError**: Core error interface with standardized fields
- **ErrorContext**: Contextual information for errors
- **ErrorRecoveryStrategy**: Interface for recovery mechanisms
- **ErrorHandlerConfig**: Configuration options
- **ErrorBoundaryProps**: React error boundary properties

#### 2. Core Error Handler (`client/src/core/error/handler.ts`)

- **CoreErrorHandler**: Singleton service managing error processing
- Global error handler setup
- Recovery strategy orchestration
- Error statistics and monitoring

#### 3. Recovery Strategies (`client/src/core/error/recovery.ts`)

- **Network Retry**: Exponential backoff for network errors
- **Cache Clear**: Application cache clearing and reload
- **Page Reload**: Full page refresh recovery
- **Auth Refresh**: Authentication token refresh

#### 4. React Error Boundary (`client/src/core/error/ErrorBoundary.tsx`)

- **EnhancedErrorBoundary**: React component catching JavaScript errors
- **DefaultErrorFallback**: User-friendly error display
- Recovery action buttons (Retry, Reload, Go Home)
- Technical details toggle for development

#### 5. Integration Module (`client/src/core/error/index.ts`)

- Unified exports for the error system
- Initialization functions
- Convenience utilities

### Integration Points

#### App.tsx Root Integration

```typescript
import { initializeCoreErrorHandling } from "./core/error";

// Initialize in useEffect
useEffect(() => {
  initializeCoreErrorHandling({
    enableGlobalHandlers: true,
    enableRecovery: true,
    logErrors: true,
    maxErrors: 100,
  });
}, []);
```

#### Component-Level Error Boundaries

```typescript
import { EnhancedErrorBoundary } from "./core/error";

function MyComponent() {
  return (
    <EnhancedErrorBoundary context="MyComponent">
      <ComponentContent />
    </EnhancedErrorBoundary>
  );
}
```

## Error Flow

1. **Error Occurrence**: Error thrown in component or caught by global handlers
2. **Error Boundary Catch**: React error boundary captures JavaScript errors
3. **Core Handler Processing**: Error passed to CoreErrorHandler for standardization
4. **Recovery Attempt**: Applicable recovery strategies executed
5. **Fallback Display**: User-friendly error UI with recovery options
6. **Logging/Analytics**: Error data sent to monitoring systems

## Recovery Strategies

### Network Retry Strategy

- **Trigger**: Network-related errors
- **Action**: Exponential backoff retry (up to 3 attempts)
- **Fallback**: Manual retry via UI

### Cache Clear Strategy

- **Trigger**: Critical errors, application corruption
- **Action**: Clear localStorage, sessionStorage, Cache API
- **Fallback**: Page reload

### Page Reload Strategy

- **Trigger**: High severity errors
- **Action**: `window.location.reload()`
- **Fallback**: Manual reload via UI

### Auth Refresh Strategy

- **Trigger**: Authentication errors
- **Action**: Token refresh attempt
- **Fallback**: Redirect to login

## Configuration

```typescript
interface ErrorHandlerConfig {
  maxErrors?: number; // Default: 100
  enableGlobalHandlers?: boolean; // Default: true
  enableRecovery?: boolean; // Default: true
  notificationDebounceMs?: number; // Default: 100
  logErrors?: boolean; // Default: true
  enableAnalytics?: boolean; // Default: false
}
```

## Usage Examples

### Basic Error Handling

```typescript
import { coreErrorHandler, ErrorDomain, ErrorSeverity } from "./core/error";

const error = coreErrorHandler.handleError({
  type: ErrorDomain.NETWORK,
  severity: ErrorSeverity.MEDIUM,
  message: "Failed to load data",
  context: { component: "DataLoader" },
});
```

### Custom Recovery Strategy

```typescript
import { coreErrorHandler } from "./core/error";

coreErrorHandler.addRecoveryStrategy({
  id: "custom-retry",
  name: "Custom Retry",
  description: "Custom retry logic",
  canRecover: (error) => error.type === ErrorDomain.NETWORK,
  recover: async (error) => {
    // Custom recovery logic
    return true; // Success
  },
  priority: 1,
});
```

### Error Boundary with Context

```typescript
<EnhancedErrorBoundary
  context="Dashboard"
  showTechnicalDetails={process.env.NODE_ENV === 'development'}
  onError={(error, errorInfo) => {
    // Custom error logging
    console.error('Dashboard error:', error, errorInfo);
  }}
>
  <DashboardContent />
</EnhancedErrorBoundary>
```

## Testing

### Unit Tests

- **handler.test.ts**: Core error handler functionality
- **ErrorBoundary.test.tsx**: React error boundary behavior
- Mocked dependencies for isolated testing

### Test Coverage

- Error creation and handling
- Recovery strategy execution
- Error boundary rendering
- Global error handler setup
- Configuration management

## Migration Path

### Phase 1 (Current)

- ✅ Core error types and interfaces
- ✅ Core error handler service
- ✅ React error boundary component
- ✅ Basic recovery strategies
- ✅ App.tsx integration
- ✅ Comprehensive tests

### Phase 2 (Future)

- Advanced recovery strategies
- Error analytics integration
- Performance monitoring
- User feedback collection
- Error prediction/prevention

## Benefits

1. **Unified Error Handling**: Consistent error processing across the application
2. **Automatic Recovery**: Smart recovery strategies reduce user friction
3. **Developer Experience**: Clear error boundaries and debugging information
4. **User Experience**: Graceful error handling with recovery options
5. **Monitoring**: Comprehensive error tracking and analytics
6. **Maintainability**: Centralized error management logic

## Dependencies

- React 16.8+ (for error boundaries)
- TypeScript 4.0+
- Existing logger utility
- Existing unified error handler (for integration)

## Future Enhancements

- Machine learning-based error prediction
- Advanced recovery strategies (circuit breakers, etc.)
- Real-time error monitoring dashboard
- Error pattern analysis
- Automated error reporting
- Integration with external monitoring services
