/**
 * Unified Loading Spinner Component
 * Accessible, themeable loading indicator
 */

import React from 'react';
import { LoadingComponentProps } from '@client/types';

export interface LoadingSpinnerProps extends LoadingComponentProps {
  variant?: 'primary' | 'secondary' | 'white';
  thickness?: 'thin' | 'medium' | 'thick';
}

export function LoadingSpinner({
  size = 'md',
  message,
  showMessage = true,
  className = '',
  'aria-label': ariaLabel,
  variant = 'primary',
  thickness = 'medium',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const thicknessClasses = {
    thin: 'border-2',
    medium: 'border-2',
    thick: 'border-4',
  };

  const variantClasses = {
    primary: 'border-blue-500 border-t-transparent',
    secondary: 'border-gray-500 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  const spinnerClasses = [
    'animate-spin rounded-full',
    sizeClasses[size],
    thicknessClasses[thickness],
    variantClasses[variant],
  ].join(' ');

  const containerClasses = [
    'flex flex-col items-center justify-center gap-2',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      role="status"
      aria-label={ariaLabel || message || 'Loading...'}
    >
      <div className={spinnerClasses} aria-hidden="true" />
      {showMessage && message && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
      <span className="sr-only">{ariaLabel || message || 'Loading...'}</span>
    </div>
  );
}