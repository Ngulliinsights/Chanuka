/**
 * Timeout-aware loader component
 * Following navigation component patterns for UI implementation
 */

import React from 'react';
import { TimeoutAwareLoaderProps } from '../types';
import { cn } from '@/shared/design-system/lib/utils';
import { LoadingIndicator } from './LoadingIndicator';

export const TimeoutAwareLoader = React.memo<TimeoutAwareLoaderProps>(({
  className,
  size = 'md',
  message = 'Loading...',
  showMessage = true,
  timeout = 30000,
  onTimeout,
  showTimeoutWarning = true,
  timeoutMessage = 'This is taking longer than expected...',
}) => {
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [showWarning, setShowWarning] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout>();
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    const startTime = Date.now();

    // Update elapsed time every second
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      // Show warning at 70% of timeout
      if (showTimeoutWarning && elapsed > timeout * 0.7 && !showWarning) {
        setShowWarning(true);
      }
    }, 1000);

    // Set timeout
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        onTimeout?.();
      }, timeout);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeout, onTimeout, showTimeoutWarning, showWarning]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const remainingTime = Math.max(0, timeout - elapsedTime);
  const progress = timeout > 0 ? (elapsedTime / timeout) * 100 : 0;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 p-6',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingIndicator
        message={showWarning ? timeoutMessage : message}
        showMessage={showMessage}
        size={size}
        color={showWarning ? 'accent' : 'primary'}
      />

      {/* Progress ring for timeout */}
      {timeout > 0 && (
        <div className="relative">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className={cn(
                'transition-all duration-1000 ease-linear',
                showWarning ? 'text-orange-500' : 'text-blue-500'
              )}
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">
              {formatTime(remainingTime)}
            </span>
          </div>
        </div>
      )}

      {/* Time information */}
      <div className="text-center space-y-1">
        <div className="text-sm text-gray-600">
          Elapsed: {formatTime(elapsedTime)}
        </div>
        {timeout > 0 && (
          <div className="text-xs text-gray-500">
            Timeout in: {formatTime(remainingTime)}
          </div>
        )}
      </div>

      {/* Warning message */}
      {showWarning && showTimeoutWarning && (
        <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-orange-700">
              Taking longer than usual
            </span>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            Please check your connection or try refreshing the page
          </p>
        </div>
      )}
    </div>
  );
});

export default TimeoutAwareLoader;
