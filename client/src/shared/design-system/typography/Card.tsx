/**
 * Card Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Multiple variants
 * ✅ Proper spacing structure
 * ✅ Semantic sections
 */

import React from 'react';
import { cn } from '@/shared/design-system/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  [
    'rounded-[0.5rem]',
    'transition-all duration-150 ease-out',
    'overflow-hidden',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[hsl(var(--color-card))]',
          'border border-[hsl(var(--color-border))]',
          'shadow-sm',
          'hover:shadow-md',
        ].join(' '),

        elevated: [
          'bg-[hsl(var(--color-card))]',
          'shadow-lg',
          'hover:shadow-xl',
        ].join(' '),

        outlined: [
          'bg-[hsl(var(--color-card))]',
          'border-2 border-[hsl(var(--color-border))]',
          'shadow-none',
        ].join(' '),

        ghost: [
          'bg-transparent',
          'border-none',
          'shadow-none',
        ].join(' '),
      },

      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] transform',
        false: '',
      },
    },

    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Card variant style
   */
  variant?: VariantProps<typeof cardVariants>['variant'];
}

/**
 * Card Root
 */
const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, variant, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, interactive }), className)}
    {...props}
  />
));
Card.displayName = 'Card';

/**
 * Card Header - with semantic spacing using tokens
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5',
      'p-6',
      'border-b border-[hsl(var(--color-border))]',
      'bg-[hsl(var(--color-muted))]',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

/**
 * Card Title - proper typography hierarchy
 */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl',
      'font-semibold leading-none tracking-tight',
      'text-[hsl(var(--color-foreground))]',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

/**
 * Card Description - muted secondary text
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm',
      'text-[hsl(var(--color-muted-foreground))]',
      className
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

/**
 * Card Content - main content area with proper spacing
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'p-6',
      className
    )}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

/**
 * Card Footer - bottom section with semantic spacing
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center',
      'p-6',
      'border-t border-[hsl(var(--color-border))]',
      'bg-[hsl(var(--color-muted))]',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
