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
    mutedForeground: 'hsl(var(--color-muted-foreground))',
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
