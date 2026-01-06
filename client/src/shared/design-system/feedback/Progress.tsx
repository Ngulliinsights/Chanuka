/**
 * Progress Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Animated progress bar
 * ✅ Proper accessibility attributes
 * ✅ Size variants (sm, md, lg)
 */

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/design-system/utils/cn';

const progressVariants = cva(
  [
    'relative w-full overflow-hidden',
    'rounded-[0.375rem]',
    'bg-[hsl(var(--color-secondary))]',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, size, value, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(progressVariants({ size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1',
          'bg-[hsl(var(--color-primary))]',
          'transition-all duration-300 ease-out'
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressVariants };
