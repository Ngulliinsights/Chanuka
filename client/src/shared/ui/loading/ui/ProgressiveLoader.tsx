/**
 * Progressive loader component
 * Following navigation component patterns for UI implementation
 */

import React from 'react';
import { ProgressiveLoaderProps } from '../types';
import { cn } from '../../../design-system/lib/utils';
import { LoadingIndicator } from './LoadingIndicator';

export const ProgressiveLoader = React.memo(<ProgressiveLoaderProps> = ({
  stages,
  currentStage,
  className,
  // onStageComplete,
  // onStageError,
  onRetryStage,
  showRetryButton = true,
  allowSkip = false,
  onSkipStage,
}) => {
  const currentStageData = stages[currentStage];
  const progress = ((currentStage + 1) / stages.length) * 100;

  if (!currentStageData) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 p-6',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Step {currentStage + 1} of {stages.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current stage indicator */}
      <LoadingIndicator
        message={currentStageData.message}
        showMessage={true}
        size="md"
      />

      {/* Stage list */}
      <div className="w-full max-w-md space-y-2">
        {stages.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isCurrent = index === currentStage;
          const isPending = index > currentStage;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center space-x-3 p-2 rounded-md transition-colors',
                {
                  'bg-green-50 text-green-700': isCompleted,
                  'bg-blue-50 text-blue-700': isCurrent,
                  'bg-gray-50 text-gray-500': isPending,
                }
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  {
                    'bg-green-500 text-white': isCompleted,
                    'bg-blue-500 text-white': isCurrent,
                    'bg-gray-300 text-gray-600': isPending,
                  }
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className="flex-1 text-sm font-medium">
                {stage.message}
              </span>
              {stage.duration && (
                <span className="text-xs text-gray-500">
                  ~{Math.round(stage.duration / 1000)}s
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {(showRetryButton || allowSkip) && (
        <div className="flex space-x-3">
          {showRetryButton && currentStageData.retryable !== false && (
            <button
              onClick={() => onRetryStage?.(currentStageData.id)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Retry
            </button>
          )}
          {allowSkip && (
            <button
              onClick={() => onSkipStage?.(currentStageData.id)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
);

function 1(
};

export default ProgressiveLoader;