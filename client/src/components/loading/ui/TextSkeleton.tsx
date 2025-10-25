import React from 'react';
import { cn } from '../../../lib/utils';
import { Skeleton } from './Skeleton';

interface TextSkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'title' | 'subtitle' | 'body' | 'caption';
  width?: string | number;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  className,
  lines = 1,
  variant = 'body',
  width,
}) => {
  const getHeight = () => {
    switch (variant) {
      case 'title':
        return 'h-6';
      case 'subtitle':
        return 'h-5';
      case 'body':
        return 'h-4';
      case 'caption':
        return 'h-3';
      default:
        return 'h-4';
    }
  };

  const getWidth = (lineIndex: number) => {
    if (width) return width;
    if (lines === 1) return 'w-full';

    // Vary width for multi-line text to look more natural
    const widths = ['w-full', 'w-4/5', 'w-3/4', 'w-2/3'];
    return widths[lineIndex % widths.length];
  };

  if (lines === 1) {
    return (
      <Skeleton
        className={cn(getHeight(), getWidth(0), className)}
        width={width}
      />
    );
  }

  return (
    <div
      className={cn('space-y-2', className)}
      role="presentation"
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            getHeight(),
            getWidth(index),
            index === lines - 1 && lines > 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
};

export default TextSkeleton;