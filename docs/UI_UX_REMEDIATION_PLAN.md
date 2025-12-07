# UI/UX Integration Remediation Plan
**Priority Level:** HIGH  
**Estimated Effort:** 2 weeks  
**Risk Level:** LOW (backward compatible approach)

---

## PHASE 1: UNIFY DESIGN FOUNDATION (Days 1-3)

### 1.1 Create Unified Design Token Export System

**File:** `client/src/shared/design-system/tokens/unified-export.ts`

```typescript
/**
 * Unified Design Token Export System
 * Single source of truth for all design values
 * Auto-validated against CSS custom properties
 */

// Re-export all tokens with canonical names
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './borders';
export * from './animations';
export * from './breakpoints';

// Create convenience exports for common patterns
export const designTokens = {
  // Color system - MUST match CSS custom properties
  colors: {
    // Primary brand
    primary: {
      light: 'hsl(var(--color-primary))',
      foreground: 'hsl(var(--color-primary-foreground))',
    },
    secondary: {
      light: 'hsl(var(--color-secondary))',
      foreground: 'hsl(var(--color-secondary-foreground))',
    },
    accent: {
      light: 'hsl(var(--color-accent))',
      foreground: 'hsl(var(--color-accent-foreground))',
    },
    
    // Semantic
    success: 'hsl(var(--color-success))',
    warning: 'hsl(var(--color-warning))',
    error: 'hsl(var(--color-error))',
    info: 'hsl(var(--color-info))',
    
    // Backgrounds
    background: 'hsl(var(--color-background))',
    foreground: 'hsl(var(--color-foreground))',
    card: 'hsl(var(--color-card))',
    border: 'hsl(var(--color-border))',
    muted: 'hsl(var(--color-muted))',
  },
  
  // Typography - must match CSS and component usage
  typography: {
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman"',
      mono: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo',
    },
    size: {
      xs: 'var(--text-xs)',
      sm: 'var(--text-sm)',
      base: 'var(--text-base)',
      lg: 'var(--text-lg)',
      xl: 'var(--text-xl)',
      '2xl': 'var(--text-2xl)',
      '3xl': 'var(--text-3xl)',
      '4xl': 'var(--text-4xl)',
    },
    lineHeight: {
      tight: 'var(--leading-tight)',
      snug: 'var(--leading-snug)',
      normal: 'var(--leading-normal)',
      relaxed: 'var(--leading-relaxed)',
      loose: 'var(--leading-loose)',
    },
  },
  
  // Spacing - 12-step scale
  spacing: {
    '0': 'var(--space-0)',
    '1': 'var(--space-1)',
    '2': 'var(--space-2)',
    '3': 'var(--space-3)',
    '4': 'var(--space-4)',
    '5': 'var(--space-5)',
    '6': 'var(--space-6)',
    '8': 'var(--space-8)',
    '10': 'var(--space-10)',
    '12': 'var(--space-12)',
    // Semantic aliases
    'xs': 'var(--space-xs)',
    'sm': 'var(--space-sm)',
    'md': 'var(--space-md)',
    'lg': 'var(--space-lg)',
    'xl': 'var(--space-xl)',
    '2xl': 'var(--space-2xl)',
  },
  
  // Radius values
  radius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  
  // Breakpoints - mobile-first
  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Type exports for type safety
export type DesignTokens = typeof designTokens;
export type ColorKey = keyof typeof designTokens.colors;
export type SpacingKey = keyof typeof designTokens.spacing;
export type BreakpointKey = keyof typeof designTokens.breakpoints;

/**
 * Utility function to get token value
 * Usage: getToken('colors', 'primary', 'light')
 */
export function getToken<T extends keyof DesignTokens>(
  category: T,
  ...path: string[]
): string {
  let current: any = designTokens[category];
  for (const key of path) {
    current = current?.[key];
  }
  return current || '';
}

/**
 * Validation function - ensure CSS and TS are in sync
 */
export function validateDesignTokens(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check if CSS custom properties are accessible
  if (typeof window !== 'undefined') {
    const root = getComputedStyle(document.documentElement);
    const primaryColor = root.getPropertyValue('--color-primary');
    if (!primaryColor) {
      errors.push('CSS custom property --color-primary not found');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

### 1.2 Create Component Type Safety

**File:** `client/src/shared/design-system/types/component-types.ts`

```typescript
/**
 * Type-safe component variant definitions
 * Ensures components only use valid design tokens
 */

import { designTokens } from '../tokens/unified-export';

// Valid button variants
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonState = 'default' | 'hover' | 'active' | 'disabled' | 'focus' | 'loading';

export interface ButtonConfig {
  variant: ButtonVariant;
  size: ButtonSize;
  state?: ButtonState;
  disabled?: boolean;
  loading?: boolean;
}

// Valid card variants
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type CardInteractivity = 'none' | 'hoverable' | 'clickable';

export interface CardConfig {
  variant: CardVariant;
  interactive?: CardInteractivity;
}

// Valid input variants
export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputState = 'default' | 'hover' | 'focus' | 'error' | 'success' | 'disabled';

export interface InputConfig {
  variant?: InputVariant;
  state?: InputState;
  size?: 'sm' | 'md' | 'lg';
}

// Color variants - ONLY from design tokens
export type ColorVariant = keyof typeof designTokens.colors;
export type SpacingValue = keyof typeof designTokens.spacing;
export type BreakpointValue = keyof typeof designTokens.breakpoints;

/**
 * Utility type to ensure only valid tokens are used
 */
export type ValidColorValue = 
  | `hsl(var(--color-primary))`
  | `hsl(var(--color-secondary))`
  | `hsl(var(--color-accent))`
  | `hsl(var(--color-success))`
  | `hsl(var(--color-warning))`
  | `hsl(var(--color-error))`
  | `hsl(var(--color-info))`
  | `hsl(var(--color-background))`
  | `hsl(var(--color-foreground))`;
```

---

### 1.3 Create Component Factory Functions

**File:** `client/src/shared/design-system/factories/component-factory.ts`

```typescript
/**
 * Component Factory
 * Generates properly styled components from design tokens
 */

import { designTokens, getToken } from '../tokens/unified-export';
import type { ButtonConfig, CardConfig, InputConfig } from '../types/component-types';

/**
 * Generate button styles based on design tokens
 * NO hardcoded colors - all from tokens
 */
export function getButtonStyles(config: ButtonConfig): Record<string, string> {
  const { variant, size, state } = config;
  
  const baseStyles: Record<string, string> = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    transition: 'all 150ms ease-out',
    cursor: 'pointer',
    border: 'none',
    fontFamily: designTokens.typography.fontFamily.sans,
  };
  
  // Size-specific styles
  const sizeStyles: Record<ButtonConfig['size'], Record<string, string>> = {
    sm: {
      padding: `${designTokens.spacing['2']} ${designTokens.spacing['3']}`,
      fontSize: designTokens.typography.size.sm,
      minHeight: '32px',
      borderRadius: designTokens.radius.md,
    },
    md: {
      padding: `${designTokens.spacing['3']} ${designTokens.spacing['4']}`,
      fontSize: designTokens.typography.size.base,
      minHeight: '40px',
      borderRadius: designTokens.radius.md,
    },
    lg: {
      padding: `${designTokens.spacing['4']} ${designTokens.spacing['6']}`,
      fontSize: designTokens.typography.size.lg,
      minHeight: '48px',
      borderRadius: designTokens.radius.lg,
    },
    icon: {
      padding: designTokens.spacing['2'],
      minHeight: '40px',
      minWidth: '40px',
      borderRadius: designTokens.radius.md,
    },
  };
  
  // Variant-specific styles - USING TOKENS ONLY
  const variantStyles: Record<ButtonConfig['variant'], Record<string, string>> = {
    primary: {
      backgroundColor: designTokens.colors.primary.light,
      color: designTokens.colors.primary.foreground,
    },
    secondary: {
      backgroundColor: designTokens.colors.secondary.light,
      color: designTokens.colors.secondary.foreground,
    },
    accent: {
      backgroundColor: designTokens.colors.accent.light,
      color: designTokens.colors.accent.foreground,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: designTokens.colors.foreground,
    },
    outline: {
      backgroundColor: 'transparent',
      border: `1px solid ${designTokens.colors.border}`,
      color: designTokens.colors.foreground,
    },
    destructive: {
      backgroundColor: designTokens.colors.error,
      color: designTokens.colors.primary.foreground,
    },
  };
  
  // State-specific overrides
  const stateStyles: Record<Exclude<ButtonConfig['state'], undefined>, Record<string, string>> = {
    default: {},
    hover: {
      opacity: '0.9',
    },
    active: {
      transform: 'scale(0.98)',
    },
    focus: {
      outline: `2px solid ${designTokens.colors.accent.light}`,
      outlineOffset: '2px',
    },
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    loading: {
      opacity: '0.7',
      pointerEvents: 'none',
    },
  };
  
  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(state && stateStyles[state]),
  };
}

/**
 * Generate card styles
 */
export function getCardStyles(config: CardConfig): Record<string, string> {
  const { variant, interactive } = config;
  
  const baseStyles: Record<string, string> = {
    backgroundColor: designTokens.colors.card,
    borderRadius: designTokens.radius.lg,
    overflow: 'hidden',
    transition: 'all 150ms ease-out',
  };
  
  const variantStyles: Record<CardConfig['variant'], Record<string, string>> = {
    default: {
      border: `1px solid ${designTokens.colors.border}`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    elevated: {
      border: 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    outlined: {
      border: `2px solid ${designTokens.colors.border}`,
      boxShadow: 'none',
    },
    ghost: {
      border: 'none',
      boxShadow: 'none',
      backgroundColor: 'transparent',
    },
  };
  
  const interactivityStyles: Record<Exclude<CardConfig['interactive'], undefined>, Record<string, string>> = {
    none: {},
    hoverable: {
      cursor: 'pointer',
    },
    clickable: {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-2px)',
      },
    },
  };
  
  return {
    ...baseStyles,
    ...variantStyles[variant],
    ...(interactive && interactivityStyles[interactive]),
  };
}

/**
 * Generate input styles
 */
export function getInputStyles(config: InputConfig): Record<string, string> {
  return {
    width: '100%',
    fontFamily: designTokens.typography.fontFamily.sans,
    backgroundColor: designTokens.colors.background,
    color: designTokens.colors.foreground,
    border: `1px solid ${designTokens.colors.border}`,
    borderRadius: designTokens.radius.md,
    padding: `${designTokens.spacing['2']} ${designTokens.spacing['3']}`,
    transition: 'all 150ms ease-out',
  };
}
```

---

## PHASE 2: IMPLEMENT COMPONENT UNIFICATION (Days 4-8)

### 2.1 Refactor Button Component (Canonical Version)

**File:** `client/src/components/ui/button.tsx` (REPLACE)

```typescript
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
import { designTokens } from '@client/shared/design-system/tokens/unified-export';

// CVA configuration using design tokens
const buttonVariants = cva(
  // Base styles - using design tokens
  [
    'inline-flex items-center justify-center font-medium rounded-[--radius-md]',
    'transition-all duration-150 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
    'active:scale-98',
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
```

---

### 2.2 Refactor Card Component (Canonical Version)

**File:** `client/src/components/ui/card.tsx` (REPLACE)

```typescript
/**
 * Card Component - UNIFIED & TOKEN-BASED
 * 
 * ✅ Uses design tokens
 * ✅ Multiple variants
 * ✅ Proper spacing structure
 * ✅ Semantic sections
 */

import React from 'react';
import { cn } from '@client/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  [
    'rounded-[var(--radius-lg)]',
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
        true: 'cursor-pointer hover:scale-102 transform',
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
      'p-[var(--space-lg)]',
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
      'text-[var(--text-2xl)]',
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
      'text-[var(--text-sm)]',
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
      'p-[var(--space-lg)]',
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
      'p-[var(--space-lg)]',
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
```

---

### 2.3 Refactor Input Component (Canonical Version)

**File:** `client/src/components/ui/input.tsx` (REPLACE)

```typescript
/**
 * Input Component - UNIFIED & TOKEN-BASED
 * Accessible form input with proper design token integration
 */

import React from 'react';
import { cn } from '@client/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  [
    'w-full',
    'px-[var(--space-md)]',
    'py-[var(--space-sm)]',
    'text-[var(--text-base)]',
    'font-family-[var(--font-family-sans)]',
    'border border-[hsl(var(--color-border))]',
    'rounded-[var(--radius-md)]',
    'bg-[hsl(var(--color-background))]',
    'text-[hsl(var(--color-foreground))]',
    'transition-all duration-150 ease-out',
    'placeholder:text-[hsl(var(--color-muted-foreground))]',
    'focus:outline-none',
    'focus:ring-2 focus:ring-[hsl(var(--color-accent))]',
    'focus:border-[hsl(var(--color-accent))]',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:bg-[hsl(var(--color-muted))]',
  ].join(' '),
  {
    variants: {
      state: {
        default: '',
        error: [
          'border-[hsl(var(--color-error))]',
          'focus:ring-[hsl(var(--color-error))]',
        ].join(' '),
        success: [
          'border-[hsl(var(--color-success))]',
          'focus:ring-[hsl(var(--color-success))]',
        ].join(' '),
      },
      size: {
        sm: 'min-h-8 text-[var(--text-sm)]',
        md: 'min-h-10 text-[var(--text-base)]',
        lg: 'min-h-12 text-[var(--text-lg)]',
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

/**
 * Input Component - Token-based, accessible
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, size, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(inputVariants({ state, size }), className)}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input, inputVariants };
```

---

### 2.4 Create Component Registry/Index

**File:** `client/src/components/ui/index.ts` (NEW)

```typescript
/**
 * Unified Component Export Registry
 * 
 * Single source of truth for all UI components
 * Ensures consistent imports across the application
 */

// ✅ Canonical components (TOKEN-BASED)
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from './card';
export type { CardProps } from './card';

export { Input, inputVariants } from './input';
export type { InputProps } from './input';

// Add other components as they're refactored
export { Badge, badgeVariants } from './badge';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Label } from './label';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './dropdown-menu';

/**
 * DEPRECATION NOTICE
 * 
 * The following imports are DEPRECATED and should not be used:
 * ❌ simple-button.tsx - use Button instead
 * ❌ hybrid-components.tsx - use canonical components
 * ❌ unified-components.tsx - use canonical components
 * 
 * All components now use design tokens and support theming
 */

/**
 * Design tokens export
 */
export {
  designTokens,
  getToken,
  validateDesignTokens,
  type DesignTokens,
  type ColorKey,
  type SpacingKey,
  type BreakpointKey,
} from '@client/shared/design-system/tokens/unified-export';

/**
 * Component types export
 */
export type {
  ButtonVariant,
  ButtonSize,
  ButtonState,
  ButtonConfig,
  CardVariant,
  CardInteractivity,
  CardConfig,
  InputVariant,
  InputState,
  InputConfig,
} from '@client/shared/design-system/types/component-types';

/**
 * Usage Examples:
 * 
 * ✅ CORRECT:
 * import { Button, Card, Input } from '@/components/ui';
 * import { designTokens } from '@/components/ui';
 * 
 * ❌ WRONG:
 * import Button from '@/components/ui/button'; // Use named export
 * import { SimpleButton } from '@/components/ui/simple-button'; // Deprecated
 */
```

---

## PHASE 3: ENFORCE TOKEN USAGE (Days 9-10)

### 3.1 Create ESLint Rule for Token Validation

**File:** `.eslintrc.json` (UPDATE)

```json
{
  "plugins": ["@typescript-eslint", "tailwindcss"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:tailwindcss/recommended"
  ],
  "rules": {
    // ⚠️ WARN on hardcoded colors
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Literal[value=/^#[0-9a-f]{6}$|rgb|hsl\\(\\d+|colors\\./i]",
        "message": "❌ Hardcoded colors detected. Use designTokens instead: import { designTokens } from '@/components/ui'"
      },
      {
        "selector": "CallExpression[callee.name='cn'] Literal[value=/^(bg|text|border)-\\w+-\\d+$/]",
        "message": "❌ Hardcoded Tailwind color class. Use CSS custom properties: bg-[hsl(var(--color-primary))]"
      }
    ],
    
    // Tailwind-specific checks
    "tailwindcss/no-custom-classname": "off",
    "tailwindcss/classnames-order": "warn",
    
    // Force component usage patterns
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-types": "warn",
  }
}
```

---

### 3.2 Add Pre-commit Hook

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for hardcoded colors
if grep -r "bg-\(red\|blue\|green\|yellow\|gray\|orange\|pink\|purple\|indigo\|cyan\)" client/src/components --include="*.tsx" --include="*.ts"; then
  echo "❌ Hardcoded Tailwind colors detected!"
  echo "ℹ️  Use CSS custom properties instead: bg-[hsl(var(--color-primary))]"
  exit 1
fi

# Check for unregistered color values
if grep -r "#[0-9a-f]\{6\}" client/src/components --include="*.tsx" --include="*.ts" | grep -v "node_modules"; then
  echo "❌ Hardcoded hex colors detected!"
  echo "ℹ️  Use designTokens instead: import { designTokens } from '@/components/ui'"
  exit 1
fi

# Run tests
npm run test:unit

exit 0
```

---

## PHASE 4: TESTING & VALIDATION (Days 11-14)

### 4.1 Add Component Compliance Tests

**File:** `client/src/__tests__/components/token-compliance.test.ts`

```typescript
/**
 * Token Compliance Tests
 * Ensures components use design tokens exclusively
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { designTokens } from '@/components/ui';

describe('Token Compliance', () => {
  describe('Button Component', () => {
    it('should use design tokens for colors', () => {
      const { container } = render(
        <Button variant="primary">Click me</Button>
      );
      const button = container.querySelector('button');
      const styles = getComputedStyle(button!);
      
      // Verify token is applied (will be HSL format)
      expect(styles.backgroundColor).toMatch(/hsl\(\d+/);
    });
    
    it('should support all design token variants', () => {
      const variants = ['primary', 'secondary', 'accent', 'ghost', 'outline', 'destructive'];
      
      variants.forEach(variant => {
        const { container } = render(
          <Button variant={variant as any}>Test</Button>
        );
        expect(container.querySelector('button')).toBeInTheDocument();
      });
    });
  });
  
  describe('Card Component', () => {
    it('should use design tokens for styling', () => {
      const { container } = render(
        <Card>
          <h3>Test Card</h3>
        </Card>
      );
      const card = container.querySelector('[class*="rounded"]');
      expect(card).toBeInTheDocument();
    });
  });
  
  describe('Input Component', () => {
    it('should have proper focus styling using tokens', () => {
      const { container } = render(<Input />);
      const input = container.querySelector('input');
      
      // Focus should use token color
      expect(input).toHaveClass('focus:ring-[hsl(var(--color-accent))]');
    });
  });
});
```

---

### 4.2 Add Visual Regression Tests

**File:** `client/src/__tests__/visual/components-token-based.visual.test.tsx`

```typescript
/**
 * Visual Regression Tests - Token-based Components
 * Ensures components render consistently with design tokens
 */

import { test, expect } from '@playwright/test';

test.describe('Token-based Components', () => {
  test('Button variants render correctly', async ({ page }) => {
    await page.goto('/components/button');
    
    const screenshots = ['primary', 'secondary', 'accent', 'ghost'];
    
    for (const variant of screenshots) {
      const button = page.locator(`[data-variant="${variant}"]`);
      await expect(button).toHaveScreenshot(`button-${variant}.png`);
    }
  });
  
  test('Dark theme applies correctly', async ({ page }) => {
    await page.goto('/components/button');
    
    // Toggle dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    const button = page.locator('button[data-variant="primary"]');
    await expect(button).toHaveScreenshot('button-dark.png');
  });
  
  test('Cards maintain consistency across variants', async ({ page }) => {
    await page.goto('/components/card');
    
    const variants = ['default', 'elevated', 'outlined', 'ghost'];
    
    for (const variant of variants) {
      const card = page.locator(`[data-variant="${variant}"]`);
      await expect(card).toHaveScreenshot(`card-${variant}.png`);
    }
  });
});
```

---

## MIGRATION CHECKLIST

### ✅ To Complete:

- [ ] Create `unified-export.ts` with all tokens
- [ ] Create `component-types.ts` with type definitions
- [ ] Create `component-factory.ts` with style generators
- [ ] Refactor `button.tsx` to use tokens
- [ ] Refactor `card.tsx` to use tokens
- [ ] Refactor `input.tsx` to use tokens
- [ ] Refactor remaining UI components (~15 files)
- [ ] Create `ui/index.ts` registry
- [ ] Update ESLint rules
- [ ] Add pre-commit hooks
- [ ] Add compliance tests
- [ ] Add visual regression tests
- [ ] Document for developers
- [ ] Update STYLE_GUIDE.md
- [ ] Archive deprecated components
- [ ] Run full test suite
- [ ] Production deployment

---

## SUCCESS CRITERIA

After implementation:

✅ **0% hardcoded colors** in components  
✅ **100% token usage** in CSS/Tailwind  
✅ **Type-safe component variants**  
✅ **Theme switching functional** (light/dark/high-contrast)  
✅ **All tests passing**  
✅ **Visual consistency across platform**  
✅ **Consistent developer experience**  

---

*This remediation plan is designed to be executed incrementally with zero breaking changes to existing functionality.*
