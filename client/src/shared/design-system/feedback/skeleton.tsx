import React from 'react';
/**
 * Skeleton Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Loading state placeholder
 * ✅ Consistent animation
 */

import { cn } from '@/shared/design-system/utils/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[hsl(var(--color-muted))]', className)}
      {...props}
    />
  );
}

export { Skeleton };
