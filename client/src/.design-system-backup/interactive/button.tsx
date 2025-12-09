/**
 * Button Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Multiple variants (primary, secondary, outline, ghost, destructive)
 * ✅ Size variants (sm, md, lg)
 * ✅ State management (default, disabled, loading)
 * ✅ Accessible focus states with proper contrast
 */

import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '../utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'gap-2',
    'font-medium',
    'transition-all duration-150 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[hsl(var(--color-primary))]',
          'border border-[hsl(var(--color-primary))]',
          'text-[hsl(var(--color-primary-foreground))]',
          'hover:bg-[hsl(var(--color-primary))]/90',
          'hover:border-[hsl(var(--color-primary))]/90',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        secondary: [
          'bg-[hsl(var(--color-secondary))]',
          'border border-[hsl(var(--color-secondary))]',
          'text-[hsl(var(--color-secondary-foreground))]',
          'hover:bg-[hsl(var(--color-secondary))]/80',
          'hover:border-[hsl(var(--color-secondary))]/80',
          'focus:ring-[hsl(var(--color-secondary))]',
        ].join(' '),

        outline: [
          'bg-transparent',
          'border border-[hsl(var(--color-border))]',
          'text-[hsl(var(--color-foreground))]',
          'hover:bg-[hsl(var(--color-accent))]',
          'hover:text-[hsl(var(--color-accent-foreground))]',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        ghost: [
          'bg-transparent',
          'border border-transparent',
          'text-[hsl(var(--color-foreground))]',
          'hover:bg-[hsl(var(--color-accent))]',
          'hover:text-[hsl(var(--color-accent-foreground))]',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        destructive: [
          'bg-[hsl(var(--color-destructive))]',
          'border border-[hsl(var(--color-destructive))]',
          'text-[hsl(var(--color-destructive-foreground))]',
          'hover:bg-[hsl(var(--color-destructive))]/90',
          'hover:border-[hsl(var(--color-destructive))]/90',
          'focus:ring-[hsl(var(--color-destructive))]',
        ].join(' '),
      },

      size: {
        sm: [
          'px-3 py-1.5',
          'text-sm',
          'rounded-md',
          'min-h-[32px]',
          'min-w-[32px]',
        ].join(' '),

        md: [
          'px-4 py-2',
          'text-base',
          'rounded-md',
          'min-h-[40px]',
          'min-w-[40px]',
        ].join(' '),

        lg: [
          'px-6 py-3',
          'text-lg',
          'rounded-lg',
          'min-h-[48px]',
          'min-w-[48px]',
        ].join(' '),
      },

      state: {
        default: '',
        loading: 'cursor-wait',
        disabled: '',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'md',
      state: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Visual variant of the button
   */
  variant?: VariantProps<typeof buttonVariants>['variant'];

  /**
   * Size of the button
   */
  size?: VariantProps<typeof buttonVariants>['size'];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Icon to display before text
   */
  startIcon?: React.ReactNode;

  /**
   * Icon to display after text
   */
  endIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      state = 'default',
      loading = false,
      disabled,
      startIcon,
      endIcon,
      children,
      ...props
    },
    ref
  ) => {
    const computedState = disabled ? 'disabled' : loading ? 'loading' : state;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, state: computedState }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {startIcon && !loading && startIcon}
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
        {endIcon && !loading && endIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export default Button;