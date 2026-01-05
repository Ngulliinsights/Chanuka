import React from 'react';

import { cn } from '@/shared/design-system/lib/utils';

import { Skeleton } from './Skeleton';

interface CardSkeletonProps {
  className?: string;
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
  lines?: number;
}

export const CardSkeleton = React.memo<CardSkeletonProps>(({
  className,
  showAvatar = false,
  showTitle = true,
  showSubtitle = false,
  showDescription = true,
  showActions = false,
  lines = 3,
}) => {
  return (
    <div
      className={cn(
        'p-6 border border-gray-200 rounded-lg bg-white',
        className
      )}
      role="presentation"
      aria-hidden="true"
    >
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {showTitle && (
            <Skeleton className="h-5 w-3/4 mb-2" />
          )}
          {showSubtitle && (
            <Skeleton className="h-4 w-1/2 mb-3" />
          )}
          {showDescription && (
            <div className="space-y-2">
              {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={cn(
                    'h-4',
                    i === lines - 1 ? 'w-2/3' : 'w-full'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {showActions && (
        <div className="flex justify-end space-x-2 mt-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
    </div>
  );
});

export default CardSkeleton;

