/**
 * Progress Component
 * Progress bar for showing completion status
 */

import React from 'react';
import { cn } from '@client/lib/utils';

interface ProgressProps {
  value?: number;
  className?: string;
  max?: number;
}

export function Progress({ value = 0, className, max = 100 }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-valuemin={0}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

export default Progress;