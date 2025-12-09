/**
 * Unified Design Tokens
 * 
 * ✅ Single source of truth for all design decisions
 * ✅ Auto-generates CSS custom properties
 * ✅ Type-safe token access
 * ✅ Theme-aware token system
 */

import { colorTokens } from './colors';
import { spacingTokens } from './spacing';
import { typographyTokens } from './typography';

/**
 * Convert hex color to HSL for CSS custom properties
 */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Unified Token System
 */
export const unifiedTokens = {
  colors: {
    // Primary brand colors with CSS custom properties
    primary: {
      ...colorTokens.primary,
      css: {
        '--color-primary': hexToHsl(colorTokens.primary[500]),
        '--color-primary-foreground': '0 0% 100%',
        '--color-primary-muted': hexToHsl(colorTokens.primary[100]),
      }
    },

    // Secondary colors
    secondary: {
      ...colorTokens.secondary,
      css: {
        '--color-secondary': hexToHsl(colorTokens.secondary[500]),
        '--color-secondary-foreground': '0 0% 100%',
        '--color-secondary-muted': hexToHsl(colorTokens.secondary[100]),
      }
    },

    // Accent colors
    accent: {
      ...colorTokens.accent,
      css: {
        '--color-accent': hexToHsl(colorTokens.accent[500]),
        '--color-accent-foreground': '0 0% 100%',
        '--color-accent-muted': hexToHsl(colorTokens.accent[100]),
      }
    },

    // Semantic colors
    success: {
      ...colorTokens.semantic.success,
      css: {
        '--color-success': hexToHsl(colorTokens.semantic.success[500]),
        '--color-success-foreground': '0 0% 100%',
        '--color-success-muted': hexToHsl(colorTokens.semantic.success[100]),
      }
    },

    warning: {
      ...colorTokens.semantic.warning,
      css: {
        '--color-warning': hexToHsl(colorTokens.semantic.warning[500]),
        '--color-warning-foreground': '0 0% 0%',
        '--color-warning-muted': hexToHsl(colorTokens.semantic.warning[100]),
      }
    },

    error: {
      ...colorTokens.semantic.error,
      css: {
        '--color-error': hexToHsl(colorTokens.semantic.error[500]),
        '--color-destructive': hexToHsl(colorTokens.semantic.error[500]),
        '--color-error-foreground': '0 0% 100%',
        '--color-error-muted': hexToHsl(colorTokens.semantic.error[100]),
      }
    },

    // Neutral colors
    neutral: {
      ...colorTokens.neutral,
      css: {
        '--color-background': '0 0% 100%',
        '--color-foreground': hexToHsl(colorTokens.neutral[900]),
        '--color-card': '0 0% 100%',
        '--color-card-foreground': hexToHsl(colorTokens.neutral[900]),
        '--color-muted': hexToHsl(colorTokens.neutral[100]),
        '--color-muted-foreground': hexToHsl(colorTokens.neutral[500]),
        '--color-border': hexToHsl(colorTokens.neutral[200]),
        '--color-input': hexToHsl(colorTokens.neutral[200]),
      }
    },
  },

  spacing: spacingTokens,
  typography: typographyTokens,
} as const;

/**
 * Generate CSS custom properties for themes
 */
export function generateThemeCSS(theme: 'light' | 'dark' = 'light'): string {
  const tokens = unifiedTokens.colors;
  
  const lightVariables = {
    ...tokens.primary.css,
    ...tokens.secondary.css,
    ...tokens.accent.css,
    ...tokens.success.css,
    ...tokens.warning.css,
    ...tokens.error.css,
    ...tokens.neutral.css,
  };

  const darkVariables = {
    '--color-background': '222.2 84% 4.9%',
    '--color-foreground': '210 40% 98%',
    '--color-card': '222.2 84% 4.9%',
    '--color-card-foreground': '210 40% 98%',
    '--color-muted': '217.2 32.6% 17.5%',
    '--color-muted-foreground': '215 20.2% 65.1%',
    '--color-border': '217.2 32.6% 17.5%',
    '--color-input': '217.2 32.6% 17.5%',
    ...tokens.primary.css,
    ...tokens.secondary.css,
    ...tokens.accent.css,
    ...tokens.success.css,
    ...tokens.warning.css,
    ...tokens.error.css,
  };

  const variables = theme === 'dark' ? darkVariables : lightVariables;

  return `
    :root${theme === 'dark' ? '.dark' : ''} {
      ${Object.entries(variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n      ')}
    }
  `;
}

/**
 * Type-safe token access
 */
export type UnifiedTokens = typeof unifiedTokens;
export type ColorTokens = typeof unifiedTokens.colors;
export type SpacingTokens = typeof unifiedTokens.spacing;
export type TypographyTokens = typeof unifiedTokens.typography;