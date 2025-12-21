/**
 * Example Usage of Unified Error Boundary Components
 *
 * Demonstrates how to use the consolidated error boundary components
 * with different display modes and recovery strategies.
 */

import React from 'react';

import { ErrorBoundary, ErrorFallback, RecoveryUI, withErrorBoundary, useErrorBoundary, ErrorFallbackProps } from './index';

// Example 1: Basic Error Boundary with default settings
export const BasicErrorBoundaryExample = React.memo(<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
);

function 1(
};

// Example 2: Error Boundary with inline display mode
export const InlineErrorBoundaryExample = React.memo(<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      displayMode="inline"
      fallbackVariant="user-friendly"
      recoveryVariant="buttons"
      enableRecovery={true}
      enableReporting={true}
      context="example-component"
      onError={(error, errorInfo) => {
        console.log('Error caught:', error, errorInfo);
      }}
      onRecovery={(error, strategy) => {
        console.log('Recovery attempted:', strategy, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
);

function 1(
};

// Example 3: Error Boundary with page-level error display
export const PageErrorBoundaryExample = React.memo(<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      displayMode="page"
      fallbackVariant="detailed"
      recoveryVariant="modal"
      maxRetries={2}
      context="page-level"
    >
      {children}
    </ErrorBoundary>
  );
);

function 1(
};

// Example 4: Using withErrorBoundary HOC
export const WrappedComponentExample = withErrorBoundary(
  ({ title }: { title: string }) => {
    // This component might throw an error
    if (title === 'error') {
      throw new Error('Example error from wrapped component');
    }
    return <div>{title}</div>;
  },
  {
    displayMode: 'overlay',
    fallbackVariant: 'technical',
    context: 'wrapped-component',
  }
);

function 1(

// Example 5: Using useErrorBoundary hook in functional component
export const HookExample = React.memo( = () => {
  const { error, hasError, retry, reportError, resetError } = useErrorBoundary();

  const throwError = () => {
    throw new Error('Error from hook example');
  };

  if (hasError) {
    return (
      <div>
        <ErrorFallback
          error={error!}
          displayMode="inline"
          variant="user-friendly"
          onRetry={retry}
          onReport={reportError}
          onDismiss={resetError}
          isDevelopment={process.env.NODE_ENV === 'development'}
        />
        <RecoveryUI
          error={error!}
          variant="buttons"
          onRetry={retry}
          onRefresh={() => window.location.reload()}
          onGoHome={() => window.location.href = '/'}
          onReport={reportError}
          isRecovering={false}
          retryCount={0}
          maxRetries={3}
        />
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={throwError}>Throw Error</button>
    </div>
  );
);

function 1(
};

// Example 6: Custom error fallback
const CustomErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onReport,
  onDismiss
}) => {
  return (
    <div style={{ border: '2px solid red', padding: '1rem', margin: '1rem' }}>
      <h3>🚨 Custom Error!</h3>
      <p>{error.message}</p>
      <div>
        {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
        {onReport && <button type="button" onClick={onReport}>Report</button>}
        {onDismiss && <button type="button" onClick={onDismiss}>Dismiss</button>}
      </div>
    </div>
  );
);

function 1(
};

export const CustomFallbackExample = React.memo(<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      customFallback={CustomErrorFallback}
      context="custom-fallback"
    >
      {children}
    </ErrorBoundary>
  );
);

function 1(
};

// Example 7: Error prone component for testing
export const ErrorProneComponent = React.memo(<{ shouldError?: boolean }> = ({ shouldError = false }) => {
  if (shouldError) {
    throw new Error('This is a test error for demonstration purposes');
  }

  return (
    <div>
      <p>This component works normally when shouldError is false.</p>
      <p>Set shouldError to true to see the error boundary in action.</p>
    </div>
  );
);

function 1(
};

// Example 8: Complete integration example
export const CompleteExample = React.memo( = () => {
  const [shouldError, setShouldError] = React.useState(false);

  return (
    <div>
      <h2>Unified Error Boundary Examples</h2>

      <button type="button" onClick={() => setShouldError(!shouldError)}>
        {shouldError ? 'Fix Error' : 'Trigger Error'}
      </button>

      <InlineErrorBoundaryExample>
        <ErrorProneComponent shouldError={shouldError} />
      </InlineErrorBoundaryExample>

      <hr />

      <PageErrorBoundaryExample>
        <ErrorProneComponent shouldError={false} />
      </PageErrorBoundaryExample>
    </div>
  );
);

function 1(
};