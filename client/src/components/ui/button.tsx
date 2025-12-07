/**
 * Button Component - UNIFIED & TOKEN-BASED
 * Single source of truth for all button usage
 * 
 * ✅ Uses design tokens (NO hardcoded colors)
 * ✅ Type-safe variants
 * ✅ Accessibility built-in
 * ✅ Loading states
 * ✅ Accessible focus management
 */

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@client/lib/utils';

// CVA configuration using design tokens via CSS variables
const buttonVariants = cva(
  // Base styles - using design tokens
  [
    'inline-flex items-center justify-center font-medium rounded-[0.375rem]',
    'transition-all duration-150 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
    'active:scale-95',
  ].join(' '),
  {
    variants: {
      variant: {
        // ✅ USING CSS CUSTOM PROPERTIES (NOT hardcoded colors)
        primary: [
          'bg-[hsl(var(--color-primary))]',
          'text-[hsl(var(--color-primary-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        secondary: [
          'bg-[hsl(var(--color-secondary))]',
          'text-[hsl(var(--color-secondary-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-secondary))]',
        ].join(' '),

        accent: [
          'bg-[hsl(var(--color-accent))]',
          'text-[hsl(var(--color-accent-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-accent))]',
        ].join(' '),

        destructive: [
          'bg-[hsl(var(--color-error))]',
          'text-[hsl(var(--color-primary-foreground))]',
          'hover:opacity-90',
          'focus:ring-[hsl(var(--color-error))]',
        ].join(' '),

        outline: [
          'border border-[hsl(var(--color-border))]',
          'text-[hsl(var(--color-foreground))]',
          'hover:bg-[hsl(var(--color-muted))]',
          'focus:ring-[hsl(var(--color-accent))]',
        ].join(' '),

        ghost: [
          'text-[hsl(var(--color-foreground))]',
          'hover:bg-[hsl(var(--color-muted))]',
          'focus:ring-[hsl(var(--color-accent))]',
        ].join(' '),
      },

      size: {
        sm: 'px-3 py-1.5 text-sm min-h-8',
        md: 'px-4 py-2 text-base min-h-10',
        lg: 'px-6 py-3 text-lg min-h-12',
        icon: 'h-10 w-10',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Button Component - Token-based, accessible, extensible
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      disabled,
      loading = false,
      loadingText,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading}
        ref={ref}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            {loadingText || 'Loading...'}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
export default Button;
