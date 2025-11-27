/**
 * Error Boundary Usage Examples
 * 
 * Demonstrates how to use the error boundary components effectively
 * in different scenarios.
 */

import React, { useState } from 'react';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../ErrorBoundary';

/**
 * Component that can throw errors for testing
 */
const ProblematicComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('This is a test error from ProblematicComponent');
  }

  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <h3 className="text-green-800 font-medium">Component Working Fine</h3>
      <p className="text-green-700">This component is rendering without errors.</p>
    </div>
  );
};

/**
 * Component wrapped with error boundary using HOC
 */
const SafeProblematicComponent = withErrorBoundary(ProblematicComponent, {
  maxRetries: 2,
  onError: (error, errorInfo) => {
    console.log('Error caught by HOC boundary:', error, errorInfo);
  }
});

/**
 * Component that uses the error handler hook
 */
const ComponentWithErrorHandler: React.FC = () => {
  const handleError = useErrorHandler();
  const [count, setCount] = useState(0);

  const triggerError = () => {
    try {
      // Simulate an error
      throw new Error('Simulated error from button click');
    } catch (error) {
      handleError(error as Error, { component: 'ComponentWithErrorHandler', count });
    }
  };

  return (
    <div className="p-4 bg-blue-100 border border-blue-300 rounded">
      <h3 className="text-blue-800 font-medium">Component with Error Handler</h3>
      <p className="text-blue-700 mb-3">Count: {count}</p>
      <div className="space-x-2">
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Increment
        </button>
        <button
          onClick={triggerError}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Trigger Error
        </button>
      </div>
    </div>
  );
};

/**
 * Main example component demonstrating different error boundary patterns
 */
export const ErrorBoundaryExample: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Error Boundary Examples
        </h1>
        <p className="text-gray-600 mb-6">
          This page demonstrates different ways to use error boundaries in your React application.
        </p>

        <div className="space-y-6">
          {/* Example 1: Manual Error Boundary */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              1. Manual Error Boundary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShouldError(!shouldError)}
                  className={`px-4 py-2 rounded font-medium ${
                    shouldError
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {shouldError ? 'Fix Component' : 'Break Component'}
                </button>
                <span className="text-sm text-gray-600">
                  Toggle to see error boundary in action
                </span>
              </div>
              
              <ErrorBoundary
                maxRetries={3}
                onError={(error, errorInfo) => {
                  console.log('Manual boundary caught error:', error, errorInfo);
                }}
              >
                <ProblematicComponent shouldError={shouldError} />
              </ErrorBoundary>
            </div>
          </div>

          {/* Example 2: HOC Error Boundary */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              2. Higher-Order Component (HOC) Error Boundary
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              This component is automatically wrapped with an error boundary using the HOC pattern.
            </p>
            <SafeProblematicComponent shouldError={false} />
          </div>

          {/* Example 3: Error Handler Hook */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              3. Error Handler Hook
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              This component uses the useErrorHandler hook to programmatically trigger error boundaries.
            </p>
            <ErrorBoundary maxRetries={2}>
              <ComponentWithErrorHandler />
            </ErrorBoundary>
          </div>

          {/* Example 4: Nested Error Boundaries */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              4. Nested Error Boundaries
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Error boundaries can be nested to provide different fallbacks for different parts of your app.
            </p>
            <ErrorBoundary
              fallback={({ error, resetError }) => (
                <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
                  <h4 className="text-yellow-800 font-medium">Outer Boundary Caught Error</h4>
                  <p className="text-yellow-700 text-sm mt-1">{error.message}</p>
                  <button
                    onClick={resetError}
                    className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                  >
                    Reset Outer Boundary
                  </button>
                </div>
              )}
            >
              <div className="border border-gray-200 rounded p-4">
                <h4 className="font-medium text-gray-800 mb-2">Outer Boundary</h4>
                <ErrorBoundary
                  fallback={({ error, resetError }) => (
                    <div className="p-3 bg-red-100 border border-red-300 rounded">
                      <h5 className="text-red-800 font-medium">Inner Boundary Caught Error</h5>
                      <p className="text-red-700 text-sm mt-1">{error.message}</p>
                      <button
                        onClick={resetError}
                        className="mt-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Reset Inner Boundary
                      </button>
                    </div>
                  )}
                >
                  <div className="border border-gray-100 rounded p-3">
                    <h5 className="font-medium text-gray-700 mb-2">Inner Boundary</h5>
                    <ProblematicComponent shouldError={false} />
                  </div>
                </ErrorBoundary>
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundaryExample;