/**
 * Input Component Design Standards
 * Consistent input styling and behavior patterns
 */

import { animationTokens } from '../tokens/animations';
import { borderTokens } from '../tokens/borders';
import { colorTokens } from '../tokens/colors';
import { shadowTokens } from '../tokens/shadows';
import { spacingTokens } from '../tokens/spacing';

export const inputDesignStandards = {
  // Base input styles
  base: {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    color: colorTokens.neutral[900],
    backgroundColor: colorTokens.surface.background.light,
    border: `1px solid ${colorTokens.border.light}`,
    borderRadius: borderTokens.radius.md,
    padding: `${spacingTokens.semantic.sm} ${spacingTokens.semantic.md}`,
    transition: animationTokens.transition.all,
    outline: 'none',
    '&::placeholder': {
      color: colorTokens.neutral[400],
    },
  },

  // Size variants
  sizes: {
    sm: {
      fontSize: '0.75rem',
      padding: `${spacingTokens.semantic.xs} ${spacingTokens.semantic.sm}`,
      minHeight: '32px',
    },
    md: {
      fontSize: '0.875rem',
      padding: `${spacingTokens.semantic.sm} ${spacingTokens.semantic.md}`,
      minHeight: '40px',
    },
    lg: {
      fontSize: '1rem',
      padding: `${spacingTokens.semantic.md} ${spacingTokens.semantic.lg}`,
      minHeight: '48px',
    },
  },

  // Interactive states
  states: {
    hover: {
      borderColor: colorTokens.border.emphasis,
    },
    focus: {
      borderColor: colorTokens.interactive.focus.ring,
      boxShadow: shadowTokens.interactive.focus.accent,
      backgroundColor: colorTokens.interactive.focus.background,
    },
    disabled: {
      opacity: '0.7',
      cursor: 'not-allowed',
      backgroundColor: colorTokens.interactive.disabled.light,
      color: colorTokens.interactive.disabled.text,
      borderColor: colorTokens.interactive.disabled.light,
    },
    error: {
      borderColor: colorTokens.semantic.error[500],
      backgroundColor: colorTokens.semantic.error[50],
      boxShadow: `0 0 0 3px ${colorTokens.semantic.error[500]}20`,
      '&:focus': {
        borderColor: colorTokens.semantic.error[600],
        boxShadow: shadowTokens.interactive.focus.error,
      },
    },
    success: {
      borderColor: colorTokens.semantic.success[500],
      backgroundColor: colorTokens.semantic.success[50],
      boxShadow: `0 0 0 3px ${colorTokens.semantic.success[500]}20`,
    },
  },

  // Input variants
  variants: {
    default: {
      backgroundColor: colorTokens.surface.background.light,
      border: `1px solid ${colorTokens.border.light}`,
    },
    filled: {
      backgroundColor: colorTokens.neutral[50],
      border: `1px solid transparent`,
      '&:hover': {
        backgroundColor: colorTokens.neutral[100],
      },
      '&:focus': {
        backgroundColor: colorTokens.surface.background.light,
        border: `1px solid ${colorTokens.interactive.focus.ring}`,
      },
    },
    outlined: {
      backgroundColor: 'transparent',
      border: `2px solid ${colorTokens.border.light}`,
    },
  },

  // Label styles
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colorTokens.neutral[700],
    marginBottom: spacingTokens.semantic.xs,
    lineHeight: '1.4',
  },

  // Helper text styles
  helperText: {
    fontSize: '0.75rem',
    lineHeight: '1.4',
    marginTop: spacingTokens.semantic.xs,
    color: colorTokens.neutral[500],
  },

  // Error text styles
  errorText: {
    fontSize: '0.75rem',
    lineHeight: '1.4',
    marginTop: spacingTokens.semantic.xs,
    color: colorTokens.semantic.error[600],
    display: 'flex',
    alignItems: 'center',
    gap: spacingTokens.semantic.xs,
  },
} as const;

// Input utility functions
export const inputUtils = {
  /**
   * Get input classes
   */
  getInputClasses: (
    variant: keyof typeof inputDesignStandards.variants = 'default',
    size: keyof typeof inputDesignStandards.sizes = 'md',
    state?: keyof typeof inputDesignStandards.states
  ): string => {
    const classes = ['chanuka-input', `chanuka-input-${variant}`, `chanuka-input-${size}`];
    if (state) classes.push(`chanuka-input-${state}`);
    return classes.join(' ');
  },

  /**
   * Get input styles
   */
  getInputStyles: (
    variant: keyof typeof inputDesignStandards.variants = 'default',
    size: keyof typeof inputDesignStandards.sizes = 'md',
    state?: keyof typeof inputDesignStandards.states
  ) => {
    const baseStyles = inputDesignStandards.base;
    const variantStyles = inputDesignStandards.variants[variant];
    const sizeStyles = inputDesignStandards.sizes[size];
    const stateStyles = state ? inputDesignStandards.states[state] : {};

    return {
      ...baseStyles,
      ...variantStyles,
      ...sizeStyles,
      ...stateStyles,
    };
  },
} as const;

