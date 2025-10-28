import React from 'react';
import { cn } from '../../../lib/utils';
import { Skeleton } from './Skeleton';

interface ListSkeletonProps {
  className?: string;
  itemCount?: number;
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showActions?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  className,
  itemCount = 5,
  showAvatar = false,
  showTitle = true,
  showSubtitle = false,
  showActions = false,
}) => {
  return (
    <div
      className={cn('space-y-4', className)}
      role="presentation"
      aria-hidden="true"
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <div
          key={index}
          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-white"
        >
          {showAvatar && (
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {showTitle && (
              <Skeleton className="h-4 w-3/4 mb-1" />
            )}
            {showSubtitle && (
              <Skeleton className="h-3 w-1/2" />
            )}
          </div>
          {showActions && (
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;

