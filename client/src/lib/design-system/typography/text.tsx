/**
 * Text Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Consistent typography hierarchy
 * ✅ Semantic text elements
 */

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@client/lib/design-system/utils/cn';

const textVariants = cva('text-[hsl(var(--color-foreground))]', {
  variants: {
    variant: {
      default: '',
      muted: 'text-[hsl(var(--color-muted-foreground))]',
      accent: 'text-[hsl(var(--color-accent-foreground))]',
      destructive: 'text-[hsl(var(--color-destructive))]',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
    align: 'left',
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div';
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, size, weight, align, as = 'p', ...props }, ref) => {
    const Component = as;
    return (
      <Component
        className={cn(textVariants({ variant, size, weight, align }), className)}
        ref={ref as unknown}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

export { Text, textVariants };
