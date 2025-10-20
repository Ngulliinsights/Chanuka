/**
 * Card Component Design Standards
 * Consistent card styling and behavior patterns
 */

import { colorTokens } from '../tokens/colors';
import { spacingTokens } from '../tokens/spacing';
import { borderTokens } from '../tokens/borders';
import { shadowTokens } from '../tokens/shadows';
import { animationTokens } from '../tokens/animations';

export const cardDesignStandards = {
  // Base card styles
  base: {
    backgroundColor: colorTokens.surface.card.light,
    border: `1px solid ${colorTokens.border.light}`,
    borderRadius: borderTokens.radius.lg,
    boxShadow: shadowTokens.component.card.default,
    transition: animationTokens.component.card.hover,
    overflow: 'hidden' as const,
  },

  // Card variants
  variants: {
    default: {
      backgroundColor: colorTokens.surface.card.light,
      border: `1px solid ${colorTokens.border.light}`,
      boxShadow: shadowTokens.component.card.default,
    },
    elevated: {
      backgroundColor: colorTokens.surface.card.light,
      border: 'none',
      boxShadow: shadowTokens.component.card.elevated,
    },
    outlined: {
      backgroundColor: colorTokens.surface.card.light,
      border: `2px solid ${colorTokens.border.emphasis}`,
      boxShadow: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
    },
  },

  // Interactive states
  states: {
    hover: {
      transform: 'translateY(-2px)',
      boxShadow: shadowTokens.component.card.hover,
      borderColor: colorTokens.border.emphasis,
    },
    focus: {
      outline: 'none',
      boxShadow: shadowTokens.interactive.focus.accent,
      borderColor: colorTokens.interactive.focus.ring,
    },
    active: {
      transform: 'translateY(-1px)',
      boxShadow: shadowTokens.component.card.pressed,
    },
    disabled: {
      opacity: '0.6',
      cursor: 'not-allowed',
      pointerEvents: 'none' as const,
    },
  },

  // Card sections
  sections: {
    header: {
      padding: `${spacingTokens.semantic.lg} ${spacingTokens.semantic.lg} ${spacingTokens.semantic.md}`,
      borderBottom: `1px solid ${colorTokens.border.light}`,
    },
    content: {
      padding: spacingTokens.semantic.lg,
    },
    footer: {
      padding: `${spacingTokens.semantic.md} ${spacingTokens.semantic.lg} ${spacingTokens.semantic.lg}`,
      borderTop: `1px solid ${colorTokens.border.light}`,
      backgroundColor: colorTokens.neutral[50],
    },
  },

  // Size variants
  sizes: {
    sm: {
      padding: spacingTokens.semantic.md,
      borderRadius: borderTokens.radius.md,
    },
    md: {
      padding: spacingTokens.semantic.lg,
      borderRadius: borderTokens.radius.lg,
    },
    lg: {
      padding: spacingTokens.semantic.xl,
      borderRadius: borderTokens.radius.xl,
    },
  },
} as const;

// Card utility functions
export const cardUtils = {
  /**
   * Get card classes
   */
  getCardClasses: (
    variant: keyof typeof cardDesignStandards.variants = 'default',
    size: keyof typeof cardDesignStandards.sizes = 'md',
    interactive: boolean = false
  ): string => {
    const classes = ['chanuka-card', `chanuka-card-${variant}`, `chanuka-card-${size}`];
    if (interactive) classes.push('chanuka-card-interactive');
    return classes.join(' ');
  },

  /**
   * Get card styles
   */
  getCardStyles: (
    variant: keyof typeof cardDesignStandards.variants = 'default',
    size: keyof typeof cardDesignStandards.sizes = 'md',
    state: keyof typeof cardDesignStandards.states | 'default' = 'default'
  ) => {
    const baseStyles = cardDesignStandards.base;
    const variantStyles = cardDesignStandards.variants[variant];
    const sizeStyles = cardDesignStandards.sizes[size];
    const stateStyles = state !== 'default' ? cardDesignStandards.states[state] : {};

    return {
      ...baseStyles,
      ...variantStyles,
      ...sizeStyles,
      ...stateStyles,
    };
  },
} as const;