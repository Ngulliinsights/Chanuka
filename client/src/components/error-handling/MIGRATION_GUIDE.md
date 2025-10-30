# Error Handling Migration Guide

## Overview

The `withErrorBoundary.tsx` component has been removed as it was redundant with the more comprehensive `EnhancedErrorBoundary.tsx`. This guide helps you migrate existing code.

## Migration Steps

### 1. Replace HOC Pattern with Component Wrapping

**Before (withErrorBoundary):**
```tsx
import { withErrorBoundary } from './error-handling';

const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: CustomErrorFallback,
  onError: handleError,
  maxRetries: 3
});
```

**After (EnhancedErrorBoundary):**
```tsx
import { EnhancedErrorBoundary } from './error-handling';

function SafeComponent(props) {
  return (
    <EnhancedErrorBoundary
      fallback={CustomErrorFallback}
      onError={handleError}
      maxRetries={3}
    >
      <MyComponent {...props} />
    </EnhancedErrorBoundary>
  );
}
```

### 2. Replace createSafeLazyComponent

**Before:**
```tsx
import { createSafeLazyComponent } from './error-handling';

const LazyComponent = createSafeLazyComponent(
  () => import('./MyComponent'),
  'MyComponent'
);
```

**After:**
```tsx
import { lazy, Suspense } from 'react';
import { EnhancedErrorBoundary, ChunkErrorFallback } from './error-handling';

const LazyComponent = lazy(() => import('./MyComponent'));

// Usage:
<EnhancedErrorBoundary fallback={ChunkErrorFallback}>
  <Suspense fallback={<div>Loading...</div>}>
    <LazyComponent />
  </Suspense>
</EnhancedErrorBoundary>
```

### 3. Update Error Fallback Props

The `ErrorFallbackProps` interface has been enhanced:

**Before:**
```tsx
interface OldErrorFallbackProps {
  error?: Error;
  retry: () => void;
}
```

**After:**
```tsx
interface ErrorFallbackProps {
  error: BaseError;           // Now always a BaseError with rich metadata
  resetError: () => void;     // Renamed from 'retry'
  context?: string;           // Additional context information
  retryCount?: number;        // Current retry attempt
  errorType?: string;         // Categorized error type
  errorSeverity?: ErrorSeverity; // Error severity level
  canRecover?: boolean;       // Whether recovery is possible
  onReportError?: () => void; // Custom error reporting
}
```

### 4. Benefits of Migration

**Enhanced Error Information:**
- Rich error metadata with domains, severity levels, and correlation IDs
- Better error categorization and user messaging
- Automatic error normalization from any error type to BaseError

**Better Recovery:**
- Intelligent retry logic based on error type and severity
- Recovery strategy suggestions
- Contextual error messages

**Improved Debugging:**
- Structured logging with error IDs
- Component stack traces
- Development-specific technical details

**Specialized Fallbacks:**
- `ApiErrorFallback` for API-related errors
- `ChunkErrorFallback` for code-splitting failures
- `NetworkErrorFallback` for connectivity issues
- `CriticalErrorFallback` for system-critical errors

## Example: Complete Migration

**Before:**
```tsx
// Old approach with multiple error boundaries
import { withErrorBoundary, createSafeLazyComponent } from './error-handling';

const SafeHeader = withErrorBoundary(Header);
const SafeContent = withErrorBoundary(Content, {
  fallback: CustomFallback
});
const LazyFooter = createSafeLazyComponent(
  () => import('./Footer'),
  'Footer'
);

function App() {
  return (
    <div>
      <SafeHeader />
      <SafeContent />
      <LazyFooter />
    </div>
  );
}
```

**After:**
```tsx
// New approach with EnhancedErrorBoundary
import { 
  EnhancedErrorBoundary, 
  ComponentErrorFallback,
  ChunkErrorFallback 
} from './error-handling';
import { lazy, Suspense } from 'react';

const LazyFooter = lazy(() => import('./Footer'));

function App() {
  return (
    <div>
      <EnhancedErrorBoundary 
        fallback={ComponentErrorFallback}
        context="header"
      >
        <Header />
      </EnhancedErrorBoundary>
      
      <EnhancedErrorBoundary 
        fallback={CustomFallback}
        context="content"
      >
        <Content />
      </EnhancedErrorBoundary>
      
      <EnhancedErrorBoundary 
        fallback={ChunkErrorFallback}
        context="footer"
      >
        <Suspense fallback={<div>Loading footer...</div>}>
          <LazyFooter />
        </Suspense>
      </EnhancedErrorBoundary>
    </div>
  );
}
```

## Breaking Changes

1. **HOC Pattern Removed**: No more `withErrorBoundary` HOC
2. **Props Interface Changed**: Error fallback props have new structure
3. **Error Types**: All errors are normalized to `BaseError` instances
4. **Import Paths**: Some utilities moved or removed

## Recommended Patterns

### Page-Level Error Boundaries
```tsx
<EnhancedErrorBoundary 
  fallback={ErrorFallback}
  context="page"
  maxRetries={3}
>
  <PageComponent />
</EnhancedErrorBoundary>
```

### Component-Level Error Boundaries
```tsx
<EnhancedErrorBoundary 
  fallback={ComponentErrorFallback}
  context="component"
  maxRetries={1}
>
  <FeatureComponent />
</EnhancedErrorBoundary>
```

### API Error Boundaries
```tsx
<EnhancedErrorBoundary 
  fallback={ApiErrorFallback}
  context="api"
  onError={logApiError}
>
  <DataComponent />
</EnhancedErrorBoundary>
```

This migration provides better error handling, improved user experience, and more maintainable code.