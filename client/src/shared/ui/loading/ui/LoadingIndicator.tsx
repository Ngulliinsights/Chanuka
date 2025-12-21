/**
 * Loading indicator component
 * Following navigation component patterns for UI implementation
 */

import React from 'react';
import { LoadingStateProps } from '../types';
import { cn } from '../../../design-system/lib/utils';
import { DEFAULT_LOADING_SIZE, LOADING_SIZES } from '../constants';

export interface LoadingIndicatorProps extends LoadingStateProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'primary' | 'secondary' | 'accent' | 'muted';
}

export const LoadingIndicator = React.memo(<LoadingIndicatorProps> = ({
  className,
  size = DEFAULT_LOADING_SIZE,
  message,
  showMessage = true,
  variant = 'spinner',
  color = 'primary',
}) => {
  const sizeClass = LOADING_SIZES[size];
  
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    accent: 'text-purple-600',
    muted: 'text-gray-400',
  };

  const renderSpinner = () => (
    <svg
      className={cn(sizeClass, colorClasses[color], 'animate-spin')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            size === 'sm' ? 'w-1 h-1' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2',
            colorClasses[color]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            backgroundColor: 'currentColor',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        sizeClass,
        'rounded-full animate-pulse',
        colorClasses[color]
      )}
      style={{ backgroundColor: 'currentColor' }}
    />
  );

  const renderBars = () => (
    <div className={cn('flex space-x-1 items-end', className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse',
            size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5',
            colorClasses[color]
          )}
          style={{
            height: `${20 + (i % 2) * 10}px`,
            animationDelay: `${i * 0.15}s`,
            backgroundColor: 'currentColor',
          }}
        />
      ))}
    </div>
  );

  const renderIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-2',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      {renderIndicator()}
      {showMessage && message && (
        <span className="text-sm text-gray-600 animate-pulse">
          {message}
        </span>
      )}
    </div>
  );
);

function 1(
};

export default LoadingIndicator;