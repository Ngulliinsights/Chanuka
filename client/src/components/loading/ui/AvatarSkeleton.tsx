import React from 'react';

import { cn } from '@/lib/utils';

import { Skeleton } from './Skeleton';

interface AvatarSkeletonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square' | 'rounded';
}

export const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({
  className,
  size = 'md',
  shape = 'circle',
}) => {
  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8';
      case 'md':
        return 'w-10 h-10';
      case 'lg':
        return 'w-12 h-12';
      case 'xl':
        return 'w-16 h-16';
      default:
        return 'w-10 h-10';
    }
  };

  const getShape = () => {
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-md';
      default:
        return 'rounded-full';
    }
  };

  return (
    <div
      className={cn(getSize(), getShape(), 'chanuka-skeleton', className)}
      role="presentation"
      aria-hidden="true"
    />
  );
};

export default AvatarSkeleton;

