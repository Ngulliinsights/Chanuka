// File: GlobalLoadingIndicator.tsx

import { Loader2, Network } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { cn } from '@/utils/cn';

import { useGlobalLoading } from './GlobalLoadingProvider';
import { LoadingOperation, LoadingPriority } from './types';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Position options for the loading indicator
 */
export type LoadingIndicatorPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

/**
 * Loading state interface
 */
export interface LoadingState {
  operations: Record<string, LoadingOperation>;
  isOnline: boolean;
}

/**
 * Global loading indicator props
 */
export interface GlobalLoadingIndicatorProps {
  /** Position of the loading indicator */
  position?: LoadingIndicatorPosition;
  /** Whether to show detailed operation information */
  showOperationDetails?: boolean;
  /** Maximum number of operations to display */
  maxVisibleOperations?: number;
  /** Whether to auto-hide after completion */
  autoHide?: boolean;
  /** Delay before auto-hiding (in milliseconds) */
  autoHideDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom loading message */
  customMessage?: string;
}

/**
 * Minimal loading indicator props
 */
export interface MinimalLoadingIndicatorProps {
  className?: string;
}

/**
 * Loading indicator configuration
 */
export interface LoadingIndicatorConfig extends Partial<GlobalLoadingIndicatorProps> {
  enabled: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to connect to global loading context
 */
const useLoadingState = () => {
  const { operations, isOnline, getOperationsByPriority } = useGlobalLoading();

  return {
    state: {
      operations,
      isOnline,
    },
    getOperationsByPriority,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get CSS classes for indicator position
 */
const getPositionClasses = (position: LoadingIndicatorPosition): string => {
  const baseClasses = 'fixed z-50';

  const positionMap: Record<LoadingIndicatorPosition, string> = {
    'top-left': `${baseClasses} top-4 left-4`,
    'top-right': `${baseClasses} top-4 right-4`,
    'bottom-left': `${baseClasses} bottom-4 left-4`,
    'bottom-right': `${baseClasses} bottom-4 right-4`,
    center: `${baseClasses} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`,
  };

  return positionMap[position] || positionMap['top-right'];
};

/**
 * Get priority-based operations
 */
const getVisibleOperations = (
  operations: Record<string, LoadingOperation>,
  maxVisible: number,
  showDetails: boolean
): LoadingOperation[] => {
  if (!showDetails) return [];

  const allOps = Object.values(operations);
  const priorityOrder: Record<LoadingPriority, number> = { high: 0, medium: 1, low: 2 };

  return allOps
    .sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Then by startTime (most recent first)
      return b.startTime - a.startTime;
    })
    .slice(0, maxVisible);
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Global loading indicator component with comprehensive loading state display
 */
export const GlobalLoadingIndicator = React.memo<GlobalLoadingIndicatorProps>(
  ({
    position = 'top-right',
    showOperationDetails = false,
    maxVisibleOperations = 3,
    autoHide = true,
    autoHideDelay = 5000,
    className,
    customMessage,
  }) => {
    const { state } = useLoadingState();
    const [isVisible, setIsVisible] = useState(false);

    // Calculate visible operations
    const visibleOperations = useMemo(
      () => getVisibleOperations(state.operations, maxVisibleOperations, showOperationDetails),
      [state.operations, maxVisibleOperations, showOperationDetails]
    );

    const operationCount = Object.keys(state.operations).length;
    const hasOperations = operationCount > 0;

    // Handle visibility and auto-hide
    useEffect(() => {
      setIsVisible(hasOperations);

      if (hasOperations && autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    }, [hasOperations, autoHide, autoHideDelay]);

    if (!isVisible) {
      return null;
    }

    return (
      <div
        className={cn(
          getPositionClasses(position),
          'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[200px] max-w-[400px]',
          'transition-all duration-300 ease-in-out',
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy={hasOperations}
      >
        {/* Main loading indicator */}
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {customMessage || 'Loading...'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {showOperationDetails && operationCount > 0
                ? `${operationCount} operation${operationCount !== 1 ? 's' : ''} in progress`
                : 'Please wait'}
            </div>
          </div>

          {/* Offline indicator */}
          {!state.isOnline && (
            <Network
              className="h-4 w-4 text-red-500 flex-shrink-0"
              aria-label="Offline"
              title="No network connection"
            />
          )}
        </div>

        {/* Operation details */}
        {showOperationDetails && visibleOperations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {visibleOperations.map(operation => (
              <div
                key={operation.id}
                className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
              >
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0',
                    operation.priority === 'high' && 'bg-red-500',
                    operation.priority === 'medium' && 'bg-yellow-500',
                    operation.priority === 'low' && 'bg-blue-500'
                  )}
                />
                <span className="flex-1 truncate">{operation.message || 'Loading...'}</span>
              </div>
            ))}

            {operationCount > maxVisibleOperations && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                +{operationCount - maxVisibleOperations} more
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

GlobalLoadingIndicator.displayName = 'GlobalLoadingIndicator';

// ============================================================================
// Minimal Variant
// ============================================================================

/**
 * Minimal global loading indicator - compact spinner-only version
 */
export const MinimalGlobalLoadingIndicator = React.memo<MinimalLoadingIndicatorProps>(
  ({ className }) => {
    const { state } = useLoadingState();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      setIsVisible(Object.keys(state.operations).length > 0);
    }, [state.operations]);

    if (!isVisible) {
      return null;
    }

    return (
      <div
        className={cn(
          'fixed top-4 right-4 z-50',
          'bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-700',
          'transition-all duration-200',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      </div>
    );
  }
);

MinimalGlobalLoadingIndicator.displayName = 'MinimalGlobalLoadingIndicator';

// ============================================================================
// Default Export
// ============================================================================

export default GlobalLoadingIndicator;
