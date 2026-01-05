import React from 'react';

import { cn } from '@/shared/design-system/lib/utils';

import { Skeleton } from './Skeleton';

interface FormSkeletonProps {
  className?: string;
  fieldCount?: number;
  showLabels?: boolean;
  showButtons?: boolean;
  buttonCount?: number;
}

export const FormSkeleton = React.memo<FormSkeletonProps>(({
  className,
  fieldCount = 4,
  showLabels = true,
  showButtons = true,
  buttonCount = 2,
}) => {
  return (
    <div
      className={cn('space-y-6', className)}
      role="presentation"
      aria-hidden="true"
    >
      {Array.from({ length: fieldCount }).map((_, index) => (
        <div key={index} className="space-y-2">
          {showLabels && (
            <Skeleton className="h-4 w-24" />
          )}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}

      {showButtons && (
        <div className="flex justify-end space-x-3 pt-4">
          {Array.from({ length: buttonCount }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                'h-10 rounded-md',
                index === 0 ? 'w-20' : 'w-24'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default FormSkeleton;

