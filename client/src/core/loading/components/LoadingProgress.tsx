/**
 * Unified Loading Progress Components
 * Progress bars and indicators for loading operations
 */

import React from 'react';

import { LoadingComponentProps } from '@client/types';

export interface LoadingProgressProps extends LoadingComponentProps {
  progress: number;
  variant?: 'linear' | 'circular';
  color?: 'primary' | 'secondary' | 'success' | 'warning';
  showPercentage?: boolean;
  indeterminate?: boolean;
  thickness?: 'thin' | 'medium' | 'thick';
}

export function LoadingProgress({
  progress,
  size = 'md',
  variant = 'linear',
  color = 'primary',
  showPercentage = false,
  indeterminate = false,
  thickness = 'medium',
  message,
  showMessage = true,
  className = '',
  'aria-label': ariaLabel,
}: LoadingProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const colorClasses = {
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
  };

  const thicknessClasses = {
    thin: 'h-1',
    medium: 'h-2',
    thick: 'h-3',
  };

  if (variant === 'circular') {
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-10 w-10',
      xl: 'h-12 w-12',
    };

    const radius = size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 20 : 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = indeterminate ? circumference * 0.75 : circumference - (clampedProgress / 100) * circumference;

    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 ${className}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || message || `Loading progress: ${clampedProgress}%`}
      >
        <div className="relative">
          <svg
            className={`${sizeClasses[size]} transform -rotate-90`}
            viewBox={`0 0 ${radius * 2 + 8} ${radius * 2 + 8}`}
          >
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${colorClasses[color]} ${indeterminate ? 'animate-spin' : 'transition-all duration-300'}`}
              style={{
                transformOrigin: `${radius + 4}px ${radius + 4}px`,
              }}
            />
          </svg>
        </div>
        {showPercentage && !indeterminate && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(clampedProgress)}%
          </span>
        )}
        {showMessage && message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {message}
          </p>
        )}
      </div>
    );
  }

  // Linear progress bar
  return (
    <div
      className={`space-y-2 ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel || message || `Loading progress: ${clampedProgress}%`}
    >
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${thicknessClasses[thickness]}`}>
        <div
          className={`${colorClasses[color]} ${thicknessClasses[thickness]} transition-all duration-300 ease-out ${
            indeterminate ? 'animate-pulse' : ''
          }`}
          style={{
            width: indeterminate ? '100%' : `${clampedProgress}%`,
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        {showMessage && message && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        )}
        {showPercentage && !indeterminate && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Specialized progress components
export function LoadingProgressBar({
  progress,
  className = '',
  ...props
}: Omit<LoadingProgressProps, 'variant'>) {
  return (
    <LoadingProgress
      {...props}
      progress={progress}
      variant="linear"
      className={className}
    />
  );
}

export function LoadingProgressCircle({
  progress,
  className = '',
  ...props
}: Omit<LoadingProgressProps, 'variant'>) {
  return (
    <LoadingProgress
      {...props}
      progress={progress}
      variant="circular"
      className={className}
    />
  );
}