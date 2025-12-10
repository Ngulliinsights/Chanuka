/**
 * Input Component - UNIFIED & TOKEN-BASED
 *
 * ✅ Uses design tokens
 * ✅ Multiple variants (default, filled, outlined)
 * ✅ State management (default, error, success, disabled)
 * ✅ Accessible focus states with proper contrast
 */

import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '../utils/cn';

const inputVariants = cva(
  [
    'block w-full',
    'px-3 py-2',
    'rounded-[0.375rem]',
    'text-[0.875rem]',
    'transition-all duration-150 ease-out',
    'placeholder-[hsl(var(--color-muted-foreground))]',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:bg-[hsl(var(--color-muted))]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-[hsl(var(--color-background))]',
          'border border-[hsl(var(--color-border))]',
          'text-[hsl(var(--color-foreground))]',
          'focus:border-[hsl(var(--color-primary))]',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        filled: [
          'bg-[hsl(var(--color-muted))]',
          'border border-transparent',
          'text-[hsl(var(--color-foreground))]',
          'hover:bg-[hsl(var(--color-muted))]',
          'focus:border-[hsl(var(--color-primary))]',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),

        outlined: [
          'bg-transparent',
          'border-2 border-[hsl(var(--color-border))]',
          'text-[hsl(var(--color-foreground))]',
          'focus:border-[hsl(var(--color-primary))]',
          'focus:ring-[hsl(var(--color-primary))]',
        ].join(' '),
      },

      state: {
        default: '',

        error: [
          'border-[hsl(var(--color-destructive))]',
          'focus:ring-[hsl(var(--color-destructive))]',
        ].join(' '),

        success: [
          'border-[hsl(var(--color-success))]',
          'focus:ring-[hsl(var(--color-success))]',
        ].join(' '),

        disabled: 'cursor-not-allowed opacity-50',
      },
    },

    defaultVariants: {
      variant: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  /**
   * Visual variant of the input
   */
  variant?: VariantProps<typeof inputVariants>['variant'];

  /**
   * State of the input (error, success, disabled)
   */
  state?: VariantProps<typeof inputVariants>['state'];

  /**
   * Help text or error message
   */
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      variant = 'default',
      state = 'default',
      helperText,
      disabled,
      ...props
    },
    ref
  ) => {
    // Convert disabled prop to state
    const computedState = disabled ? 'disabled' : state;

    return (
      <div className="w-full">
        <input
          ref={ref}
          type={type}
          className={cn(inputVariants({ variant, state: computedState }), className)}
          disabled={disabled}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              'mt-1.5 text-xs font-medium',
              computedState === 'error'
                ? 'text-[hsl(var(--color-destructive))]'
                : computedState === 'success'
                  ? 'text-[hsl(var(--color-success))]'
                  : 'text-[hsl(var(--color-muted-foreground))]'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
export default Input;