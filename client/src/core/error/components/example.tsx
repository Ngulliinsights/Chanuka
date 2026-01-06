import React from 'react';
// import { ErrorBoundary } from 'react-error-boundary';
// import { useErrorBoundary } from 'react-error-boundary';

/**
 * Example error components demonstrating error boundary usage
 */

// Example 1: Simple error fallback component
const SimpleErrorFallback = React.memo<{ error: Error; resetErrorBoundary: () => void }>(
  ({ error, resetErrorBoundary }) => (
    <div className="error-fallback p-4 border border-red-300 rounded bg-red-50">
      <h2 className="text-red-800 font-semibold">Something went wrong</h2>
      <p className="text-red-600 mt-2">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
);

SimpleErrorFallback.displayName = 'SimpleErrorFallback';

// Example 2: Detailed error fallback with stack trace
const DetailedErrorFallback = React.memo<{ error: Error; resetErrorBoundary: () => void }>(
  ({ error, resetErrorBoundary }) => (
    <div className="error-fallback p-6 border border-red-300 rounded bg-red-50 max-w-2xl">
      <h2 className="text-red-800 font-semibold text-lg">Application Error</h2>
      <p className="text-red-600 mt-2">{error.message}</p>
      {process.env.NODE_ENV === 'development' && error.stack && (
        <details className="mt-4">
          <summary className="cursor-pointer text-red-700 font-medium">Stack Trace</summary>
          <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-auto">{error.stack}</pre>
        </details>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Reload page
        </button>
      </div>
    </div>
  )
);

DetailedErrorFallback.displayName = 'DetailedErrorFallback';

// Example 3: Component that might throw an error
const ProblematicComponent = React.memo<{ shouldThrow?: boolean }>(({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('This is a test error from ProblematicComponent');
  }

  return (
    <div className="p-4 bg-green-50 border border-green-300 rounded">
      <p className="text-green-800">Component rendered successfully!</p>
    </div>
  );
});

ProblematicComponent.displayName = 'ProblematicComponent';

// Example 4: Using ErrorBoundary with custom fallback
export const ErrorBoundaryExample = React.memo(() => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShouldThrow(!shouldThrow)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {shouldThrow ? 'Fix Component' : 'Break Component'}
        </button>
      </div>

      <ErrorBoundary
        FallbackComponent={SimpleErrorFallback}
        onError={(error, errorInfo) => {
          console.error('Error caught by boundary:', error, errorInfo);
        }}
        onReset={() => setShouldThrow(false)}
      >
        <ProblematicComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
});

ErrorBoundaryExample.displayName = 'ErrorBoundaryExample';

// Example 5: Using useErrorBoundary hook
export const ErrorBoundaryHookExample = React.memo(() => {
  const { showBoundary } = useErrorBoundary();

  const handleError = () => {
    try {
      throw new Error('Error triggered by useErrorBoundary hook');
    } catch (error) {
      showBoundary(error);
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-300 rounded">
      <p className="text-blue-800 mb-3">This component uses the useErrorBoundary hook</p>
      <button
        onClick={handleError}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Trigger Error
      </button>
    </div>
  );
});

ErrorBoundaryHookExample.displayName = 'ErrorBoundaryHookExample';

// Example 6: Complete example with multiple error boundaries
export const CompleteErrorExample = React.memo(() => (
  <div className="space-y-6 p-6">
    <h1 className="text-2xl font-bold">Error Boundary Examples</h1>

    <section>
      <h2 className="text-lg font-semibold mb-3">Simple Error Boundary</h2>
      <ErrorBoundaryExample />
    </section>

    <section>
      <h2 className="text-lg font-semibold mb-3">Hook-based Error Handling</h2>
      <ErrorBoundary
        FallbackComponent={DetailedErrorFallback}
        onError={error => console.error('Hook error:', error)}
      >
        <ErrorBoundaryHookExample />
      </ErrorBoundary>
    </section>
  </div>
));

CompleteErrorExample.displayName = 'CompleteErrorExample';

export default CompleteErrorExample;
