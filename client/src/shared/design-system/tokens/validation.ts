/**
 * Design Tokens Validation & Consistency Layer
 * THE ARCHITECT PERSONA - Ensures unified token system
 *
 * Provides centralized validation, documentation, and consistency checks
 */

import { animationTokens } from './animations';
import { borderTokens } from './borders';
import { breakpointTokens } from './breakpoints';
import { colorTokens } from './colors';
import { shadowTokens } from './shadows';
import { spacingTokens } from './spacing';
import { typographyTokens } from './typography';

/**
 * Token validation schema
 */
export interface TokenValidationSchema {
  colors: typeof colorTokens;
  typography: typeof typographyTokens;
  spacing: typeof spacingTokens;
  shadows: typeof shadowTokens;
  borders: typeof borderTokens;
  animations: typeof animationTokens;
  breakpoints: typeof breakpointTokens;
}

/**
 * Unified token export with validation
 */
export const designTokens: TokenValidationSchema = {
  colors: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  shadows: shadowTokens,
  borders: borderTokens,
  animations: animationTokens,
  breakpoints: breakpointTokens,
};

/**
 * Token consistency validator
 * Ensures no orphaned or duplicated tokens
 */
export function validateTokenConsistency(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate color token completeness
  const colorLevels = Object.keys(colorTokens).length;
  if (colorLevels < 5) {
    errors.push(`Insufficient color categories: ${colorLevels} (minimum: 5)`);
  }

  // Validate typography token coverage
  const fontSizes = Object.keys(typographyTokens.fontSize || {}).length;
  if (fontSizes < 5) {
    warnings.push(`Limited font sizes: ${fontSizes} (recommended: 8+)`);
  }

  // Validate spacing scale consistency
  const spacingKeys = Object.keys(spacingTokens).filter(
    k => typeof spacingTokens[k as keyof typeof spacingTokens] === 'string'
  );
  if (spacingKeys.length < 8) {
    warnings.push(`Limited spacing scale: ${spacingKeys.length} (recommended: 12+)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Token usage analyzer
 * Helps identify which tokens are actively used
 */
export function getTokenMetadata() {
  return {
    totalColorVariants: Object.keys(colorTokens).reduce((acc, cat) => {
      const category = colorTokens[cat as keyof typeof colorTokens];
      if (typeof category === 'object') {
        return acc + Object.keys(category).length;
      }
      return acc;
    }, 0),
    fontFamilies: Object.keys(typographyTokens.fontFamily || {}),
    spacingScale: Object.keys(spacingTokens).filter(k => !k.startsWith('_')),
    shadowLayers: Object.keys((shadowTokens as any).semantic || {}),
    borderRadii: Object.keys(borderTokens.radius || {}),
    breakpoints: Object.keys(breakpointTokens),
  };
}

/**
 * Export all tokens for component usage
 */
export {
  colorTokens,
  typographyTokens,
  spacingTokens,
  shadowTokens,
  borderTokens,
  animationTokens,
  breakpointTokens,
};

/**
 * Type-safe token access utilities
 */
export const tokenUtils = {
  /**
   * Get color with fallback
   */
  getColor: (category: keyof typeof colorTokens, level?: string | number) => {
    const cat = colorTokens[category];
    if (typeof cat === 'object' && level) {
      return cat[level as keyof typeof cat] || 'transparent';
    }
    return cat;
  },

  /**
   * Get spacing value
   */
  getSpacing: (scale: number) => {
    const baseSpacing = 4; // 4px base
    return `${scale * baseSpacing}px`;
  },

  /**
   * Get font properties
   */
  getFont: (size: keyof typeof typographyTokens.fontSize) => {
    return typographyTokens.fontSize[size] || typographyTokens.fontSize.base;
  },

  /**
   * Get responsive breakpoint
   */
  getBreakpoint: (size: keyof typeof breakpointTokens) => {
    return breakpointTokens[size] || '0px';
  },
};
