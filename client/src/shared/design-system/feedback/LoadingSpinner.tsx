/**
 * Loading Spinner Component
 *
 * A simple loading spinner component
 */

import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@client/shared/design-system/utils/cn';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    return (
      <div ref={ref} className={cn('flex items-center justify-center', className)} {...props}>
        <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      </div>
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };
