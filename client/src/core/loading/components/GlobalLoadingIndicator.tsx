/**
 * Global Loading Indicator Component
 * Shows loading state for the entire application
 */

import React from 'react';

import { useLoading } from '@client/context';

import { LoadingProgress } from './LoadingProgress';
import { LoadingSpinner } from './LoadingSpinner';

export interface GlobalLoadingIndicatorProps {
  className?: string;
  showProgress?: boolean;
  position?: 'top' | 'bottom' | 'center';
  variant?: 'overlay' | 'bar';
}

export function GlobalLoadingIndicator({
  className = '',
  showProgress = true,
  position = 'top',
  variant = 'bar',
}: GlobalLoadingIndicatorProps) {
  const { state } = useLoading();

  const shouldShow = state.globalLoading || state.highPriorityLoading;

  if (!shouldShow) return null;

  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
    center: 'inset-0 flex items-center justify-center',
  };

  const baseClasses = [
    'fixed z-50',
    positionClasses[position],
  ].join(' ');

  if (variant === 'overlay') {
    return (
      <div className={`${baseClasses} bg-black bg-opacity-50 ${className}`}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" message="Loading..." />
        </div>
      </div>
    );
  }

  // Bar variant
  const activeOperations = Object.values(state.operations);
  const totalOperations = activeOperations.length;
  const completedOperations = activeOperations.filter(op => !op.error).length;
  const progress = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;

  return (
    <div className={`${baseClasses} ${className}`}>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="sm" showMessage={false} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {state.highPriorityLoading ? 'Loading...' : `${totalOperations} operations in progress`}
            </span>
          </div>
          {showProgress && totalOperations > 1 && (
            <div className="flex items-center space-x-2">
              <LoadingProgress
                progress={progress}
                variant="linear"
                size="sm"
                showMessage={false}
                showPercentage={false}
                className="w-24"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {completedOperations}/{totalOperations}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for using global loading state
export function useGlobalLoading() {
  const { shouldShowGlobalLoader, getActiveOperationsCount, state } = useLoading();

  return {
    isLoading: shouldShowGlobalLoader(),
    operationCount: getActiveOperationsCount(),
    hasHighPriorityLoading: state.highPriorityLoading,
    connectionType: state.connectionInfo.type,
    isOnline: state.isOnline,
  };
}