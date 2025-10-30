import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateManagerProps {
  type: 'page' | 'component' | 'data';
  state: 'loading' | 'timeout' | 'error' | 'success' | 'idle';
  message?: string;
  error?: Error;
  timeout?: number;
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
}

export function LoadingStateManager({
  type,
  state,
  message = 'Loading...',
  error,
  timeout,
  className = '',
  showDetails = false,
  onRetry,
}: LoadingStateManagerProps) {
  if (state === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-red-500 text-xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-600 mb-2">Loading Error</h3>
        <p className="text-gray-600 text-center mb-4">
          {error?.message || 'Failed to load content'}
        </p>
        <button
          onClick={onRetry || (() => window.location.reload())}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          {onRetry ? 'Retry' : 'Reload Page'}
        </button>
        {showDetails && error && (
          <details className="mt-4 text-xs text-gray-500">
            <summary>Error Details</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (state === 'timeout') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-yellow-500 text-xl mb-4">⏱️</div>
        <h3 className="text-lg font-semibold text-yellow-600 mb-2">Loading Timeout</h3>
        <p className="text-gray-600 text-center mb-4">
          Content is taking longer than expected to load
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Try Again
        </button>
        {showDetails && timeout && (
          <p className="text-xs text-gray-500 mt-2">
            Timeout after {timeout}ms
          </p>
        )}
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-green-500 text-xl mb-4">✅</div>
        <h3 className="text-lg font-semibold text-green-600 mb-2">Success</h3>
        <p className="text-gray-600 text-center">
          {message || 'Content loaded successfully'}
        </p>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-gray-400 text-xl mb-4">⏸️</div>
        <p className="text-gray-500 text-center">
          {message || 'Ready to load'}
        </p>
      </div>
    );
  }

  // Loading state
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-600">{message}</p>
      {showDetails && (
        <p className="text-xs text-gray-400 mt-2">
          Loading {type} content...
        </p>
      )}
    </div>
  );
}

export function PageLoader({ size = 'lg', message = 'Loading page...' }: { size?: 'sm' | 'md' | 'lg', message?: string }) {
  return (
    <LoadingStateManager
      type="page"
      state="loading"
      message={message}
      className="min-h-screen"
    />
  );
}

export function ComponentLoader({ size = 'md', message = 'Loading component...' }: { size?: 'sm' | 'md' | 'lg', message?: string }) {
  return (
    <LoadingStateManager
      type="component"
      state="loading"
      message={message}
      className="min-h-[200px]"
    />
  );
}

export function ConnectionAwareLoader({ size = 'md', message = 'Connecting...', showMessage = true }: { size?: 'sm' | 'md' | 'lg', message?: string, showMessage?: boolean }) {
  return (
    <LoadingStateManager
      type="data"
      state="loading"
      message={showMessage ? message : undefined}
      className="min-h-[100px]"
    />
  );
}

export function LazyLoadPlaceholder() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

