# Unified Error Handling Integration Guide

## Overview

The unified error handling system has been integrated with existing error components while maintaining backward compatibility. This guide explains how to use both systems and migrate to the new unified approach.

## Quick Start

### 1. Basic Setup (New Applications)

```tsx
import { UnifiedErrorProvider } from './components/error';
import { errorHandler } from './utils/unified-error-handler';

// Initialize error handler
errorHandler.configure({
  enableGlobalHandlers: true,
  enableRecovery: true,
  logErrors: true,
});

// Wrap your app
function App() {
  return (
    <UnifiedErrorProvider 
      showToasts={true}
      showModalsForCritical={true}
      enableFeedback={true}
    >
      <YourAppContent />
    </UnifiedErrorProvider>
  );
}
```

### 2. Using Unified Error Handling

```tsx
import { useUnifiedErrorHandler, createNetworkError } from './components/error';

function MyComponent() {
  const { handleError } = useUnifiedErrorHandler();

  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        // Unified error handling with automatic recovery
        createNetworkError(
          `API call failed: ${response.statusText}`,
          { status: response.status, url: response.url },
          { component: 'MyComponent', action: 'fetchData' }
        );
        return;
      }
      // Handle success
    } catch (error) {
      // Manual error handling
      handleError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network request failed',
        details: error,
        context: { component: 'MyComponent' },
        recoverable: true,
        retryable: true,
      });
    }
  };

  return <button onClick={handleApiCall}>Fetch Data</button>;
}
```

## Migration Strategies

### Strategy 1: Gradual Migration (Recommended)

Keep existing error components but enhance them with unified error handler:

```tsx
// Old way (still works)
<ErrorBoundary onError={customHandler}>
  <Component />
</ErrorBoundary>

// Enhanced way (backward compatible)
<ErrorBoundary 
  enableRecovery={true}
  enableFeedback={true}
  onError={customHandler}
>
  <Component />
</ErrorBoundary>
```

### Strategy 2: Full Migration

Replace existing error handling with unified system:

```tsx
// Replace old error boundary
import { ErrorBoundary } from './components/error-handling/ErrorBoundary';

// Use enhanced error boundary with full features
<ErrorBoundary
  enableRecovery={true}
  enableFeedback={true}
  maxRecoveryAttempts={3}
  showTechnicalDetails={true}
>
  <Component />
</ErrorBoundary>
```

## Component Integration Status

### ✅ Integrated Components

1. **ErrorBoundary** - Enhanced with unified error handler backend
2. **ErrorFallback** - Added support for AppError and feedback
3. **ErrorModal** - Enhanced with unified error types and feedback
4. **UnifiedErrorIntegration** - New integration layer

### 🔄 Legacy Components (Backward Compatible)

1. **ErrorToast** - Still works, but consider using UnifiedErrorToast
2. **core/error** - Still works, but unified types are preferred

### 📋 Usage Examples

#### Error Boundaries

```tsx
// Basic usage (backward compatible)
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Enhanced usage with unified features
<ErrorBoundary 
  enableRecovery={true}
  enableFeedback={true}
  componentName="MyComponent"
>
  <MyComponent />
</ErrorBoundary>

// Full-featured unified error boundary
import { ErrorBoundary } from './components/error-handling/ErrorBoundary';
<ErrorBoundary
  enableRecovery={true}
  enableFeedback={true}
  maxRecoveryAttempts={3}
  showTechnicalDetails={process.env.NODE_ENV === 'development'}
>
  <MyComponent />
</ErrorBoundary>
```

#### Error Toasts

```tsx
// Old way (still works but requires react-hot-toast)
import { useErrorToast } from './components/error';
const { showError } = useErrorToast();

// New unified way (no external dependencies)
import { useUnifiedErrorIntegration } from './components/error';
const { showToast } = useUnifiedErrorIntegration();

// Or use directly
import { UnifiedErrorToast, createNetworkError } from './components/error';
const error = createNetworkError('Request failed');
UnifiedErrorToast.show(error);
```

#### Error Modals

```tsx
// Enhanced error modal with feedback
import { useErrorModal } from './components/error';
const { showError } = useErrorModal();

showError({
  type: ErrorType.SERVER,
  severity: ErrorSeverity.HIGH,
  message: 'Server error occurred',
  id: 'error_123'
});

// Modal will automatically show feedback options if enableFeedback is true
```

## Advanced Features

### 1. Custom Recovery Strategies

```tsx
import { errorHandler } from './utils/unified-error-handler';

errorHandler.addRecoveryStrategy({
  id: 'custom-retry',
  name: 'Custom Retry Logic',
  description: 'Retry with custom backoff',
  canRecover: (error) => error.type === ErrorType.NETWORK,
  recover: async (error) => {
    // Custom recovery logic
    await customRetryLogic();
    return true;
  },
  priority: 1,
});
```

### 2. Error Analytics Integration

```tsx
import { errorHandler } from './utils/unified-error-handler';

errorHandler.addErrorListener((error) => {
  // Send to analytics service
  analytics.track('error_occurred', {
    errorId: error.id,
    type: error.type,
    severity: error.severity,
    component: error.context?.component,
  });
});
```

### 3. Custom Error UI

```tsx
import { useUnifiedErrorIntegration } from './components/error';

function CustomErrorHandler() {
  const { showToast, showErrorModal } = useUnifiedErrorIntegration({
    showToasts: false, // Disable automatic toasts
    showModalsForCritical: false, // Handle manually
  });

  useEffect(() => {
    const handleError = (error: AppError) => {
      if (error.severity === ErrorSeverity.CRITICAL) {
        // Custom critical error handling
        showCustomCriticalErrorUI(error);
      } else {
        // Use standard toast
        showToast(error);
      }
    };

    errorHandler.addErrorListener(handleError);
    return () => errorHandler.removeErrorListener(handleError);
  }, []);

  return null;
}
```

## Best Practices

### 1. Error Context

Always provide meaningful context:

```tsx
handleError({
  type: ErrorType.VALIDATION,
  severity: ErrorSeverity.MEDIUM,
  message: 'Form validation failed',
  context: {
    component: 'UserRegistrationForm',
    action: 'submitForm',
    userId: user?.id,
    formData: sanitizedFormData,
  },
});
```

### 2. Recovery Strategies

Make errors recoverable when possible:

```tsx
createNetworkError(
  'Failed to save data',
  { endpoint: '/api/save', method: 'POST' },
  { component: 'DataForm', action: 'save' }
); // Automatically retryable with exponential backoff
```

### 3. User Feedback

Enable feedback for better UX:

```tsx
<ErrorBoundary enableFeedback={true}>
  <CriticalComponent />
</ErrorBoundary>
```

### 4. Development vs Production

```tsx
errorHandler.configure({
  logErrors: process.env.NODE_ENV === 'development',
  enableGlobalHandlers: true,
  enableRecovery: process.env.NODE_ENV === 'production',
});
```

## Migration Checklist

- [ ] Install unified error handler in app initialization
- [ ] Wrap app with UnifiedErrorProvider
- [ ] Update error boundaries to use enhanced features
- [ ] Replace manual error handling with unified system
- [ ] Add custom recovery strategies if needed
- [ ] Enable error analytics integration
- [ ] Test error scenarios and recovery flows
- [ ] Update error handling documentation
- [ ] Train team on new error handling patterns

## Troubleshooting

### Common Issues

1. **Toasts not showing**: Ensure UnifiedErrorProvider is wrapping your app
2. **Recovery not working**: Check that errors are marked as recoverable
3. **Feedback not appearing**: Enable feedback in error boundary props
4. **Performance issues**: Adjust error handler configuration (maxErrors, debouncing)

### Debug Mode

```tsx
// Enable debug logging
errorHandler.configure({
  logErrors: true,
  // ... other config
});

// Check error stats
console.log(errorHandler.getErrorStats());

// View recent errors
console.log(errorHandler.getRecentErrors());
```