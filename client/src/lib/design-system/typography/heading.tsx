/**
 * Heading Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Consistent typography hierarchy
 * ✅ Semantic heading elements
 */

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@client/lib/design-system/utils/cn';

const headingVariants = cva(
  ['font-semibold tracking-tight', 'text-[hsl(var(--color-foreground))]'].join(' '),
  {
    variants: {
      level: {
        h1: 'text-4xl lg:text-5xl',
        h2: 'text-3xl lg:text-4xl',
        h3: 'text-2xl lg:text-3xl',
        h4: 'text-xl lg:text-2xl',
        h5: 'text-lg lg:text-xl',
        h6: 'text-base lg:text-lg',
      },
      variant: {
        default: '',
        muted: 'text-[hsl(var(--color-muted-foreground))]',
        accent: 'text-[hsl(var(--color-accent-foreground))]',
      },
    },
    defaultVariants: {
      level: 'h1',
      variant: 'default',
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level, variant, as, ...props }, ref) => {
    const Component = (as || (level as keyof JSX.IntrinsicElements) || 'h1') as React.ElementType;
    return (
      <Component
        className={cn(headingVariants({ level, variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Heading.displayName = 'Heading';

export { Heading, headingVariants };
