/**
 * Unified Loading Skeleton Components
 * Accessible skeleton screens for better perceived performance
 */

import React from 'react';
import { LoadingComponentProps } from '@client/types';

export interface LoadingSkeletonProps extends LoadingComponentProps {
  variant?: 'default' | 'pulse' | 'wave';
  lines?: number;
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
}

export function LoadingSkeleton({
  size = 'md',
  className = '',
  variant = 'pulse',
  lines = 3,
  showAvatar = false,
  showTitle = true,
  showSubtitle = false,
  'aria-label': ariaLabel,
}: LoadingSkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 rounded';

  const animationClasses = {
    default: '',
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Could be enhanced with wave animation
  };

  const skeletonClasses = [
    baseClasses,
    animationClasses[variant],
  ].join(' ');

  const sizeClasses = {
    sm: {
      avatar: 'w-8 h-8',
      title: 'h-3 w-24',
      subtitle: 'h-2 w-16',
      line: 'h-2',
    },
    md: {
      avatar: 'w-10 h-10',
      title: 'h-4 w-32',
      subtitle: 'h-3 w-20',
      line: 'h-3',
    },
    lg: {
      avatar: 'w-12 h-12',
      title: 'h-5 w-40',
      subtitle: 'h-4 w-24',
      line: 'h-4',
    },
    xl: {
      avatar: 'w-16 h-16',
      title: 'h-6 w-48',
      subtitle: 'h-5 w-32',
      line: 'h-5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={`space-y-3 ${className}`}
      role="status"
      aria-label={ariaLabel || 'Loading content...'}
    >
      {showAvatar && (
        <div className={`flex items-center space-x-3 ${className}`}>
          <div className={`${skeletonClasses} ${currentSize.avatar} rounded-full`} />
          <div className="flex-1 space-y-2">
            {showTitle && <div className={`${skeletonClasses} ${currentSize.title}`} />}
            {showSubtitle && <div className={`${skeletonClasses} ${currentSize.subtitle}`} />}
          </div>
        </div>
      )}

      {!showAvatar && showTitle && (
        <div className={`${skeletonClasses} ${currentSize.title}`} />
      )}

      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${skeletonClasses} ${currentSize.line} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}

      <span className="sr-only">Loading content...</span>
    </div>
  );
}

// Specialized skeleton components
export function TextSkeleton({ lines = 3, className = '', ...props }: Omit<LoadingSkeletonProps, 'showAvatar' | 'showTitle' | 'showSubtitle'>) {
  return (
    <LoadingSkeleton
      {...props}
      lines={lines}
      showAvatar={false}
      showTitle={false}
      showSubtitle={false}
      className={className}
    />
  );
}

export function CardSkeleton({ className = '', ...props }: Omit<LoadingSkeletonProps, 'showAvatar' | 'showTitle' | 'showSubtitle'>) {
  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <LoadingSkeleton
        {...props}
        showAvatar={true}
        showTitle={true}
        showSubtitle={true}
        lines={2}
      />
    </div>
  );
}

export function ListSkeleton({ items = 5, className = '', ...props }: Omit<LoadingSkeletonProps, 'lines' | 'showAvatar' | 'showTitle' | 'showSubtitle'> & { items?: number }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <LoadingSkeleton
            {...props}
            showAvatar={true}
            showTitle={false}
            showSubtitle={false}
            lines={1}
            className="flex-1"
          />
        </div>
      ))}
    </div>
  );
}