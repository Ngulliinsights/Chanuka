/**
 * Badge Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Multiple variants (default, secondary, destructive, outline, success, warning)
 * ✅ Size support (sm, md, lg)
 * ✅ Semantic color variants
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { HTMLAttributes } from 'react';
import React from 'react';

import { cn } from '@/shared/design-system/utils/cn';

const badgeVariants = cva(
  [
    'inline-flex items-center',
    'px-2.5 py-0.5',
    'rounded-[0.375rem]',
    'text-xs font-semibold',
    'transition-all duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'border border-transparent',
          'bg-[hsl(var(--color-primary))]',
          'text-[hsl(var(--color-primary-foreground))]',
          'hover:bg-[hsl(var(--color-primary))] hover:opacity-90',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        secondary: [
          'border border-transparent',
          'bg-[hsl(var(--color-secondary))]',
          'text-[hsl(var(--color-secondary-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-secondary))]',
        ].join(' '),

        destructive: [
          'border border-transparent',
          'bg-[hsl(var(--color-destructive))]',
          'text-[hsl(var(--color-destructive-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-destructive))]',
        ].join(' '),

        success: [
          'border border-transparent',
          'bg-[hsl(var(--color-success))]',
          'text-[hsl(var(--color-success-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-success))]',
        ].join(' '),

        warning: [
          'border border-transparent',
          'bg-[hsl(var(--color-warning))]',
          'text-[hsl(var(--color-warning-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-warning))]',
        ].join(' '),

        outline: [
          'border-2 border-[hsl(var(--color-border))]',
          'bg-transparent',
          'text-[hsl(var(--color-foreground))]',
          'hover:bg-[hsl(var(--color-muted))]',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),
      },

      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
