/**
 * Button Component Design Standards
 * Consistent button styling and behavior patterns
 */

import { colorTokens } from '../tokens/colors';
import { spacingTokens } from '../tokens/spacing';
import { borderTokens } from '../tokens/borders';
import { shadowTokens } from '../tokens/shadows';

export const buttonDesignStandards = {
  // Base button styles
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingTokens.semantic.sm,
    fontFamily: 'inherit',
    fontWeight: '500',
    lineHeight: '1.25',
    textAlign: 'center' as const,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    border: `${borderTokens.width.thin} solid transparent`,
    borderRadius: borderTokens.radius.md,
    cursor: 'pointer',
    transition: 'all 150ms ease-out',
    userSelect: 'none' as const,
  },

  // Size variants
  sizes: {
    sm: {
      padding: `${spacingTokens.component.button.paddingY.sm} ${spacingTokens.component.button.paddingX.sm}`,
      fontSize: '0.75rem',
      minHeight: '32px',
      minWidth: '32px',
    },
    md: {
      padding: `${spacingTokens.component.button.paddingY.md} ${spacingTokens.component.button.paddingX.md}`,
      fontSize: '0.875rem',
      minHeight: '40px',
      minWidth: '40px',
    },
    lg: {
      padding: `${spacingTokens.component.button.paddingY.lg} ${spacingTokens.component.button.paddingX.lg}`,
      fontSize: '1rem',
      minHeight: '48px',
      minWidth: '48px',
    },
  },

  // Style variants
  variants: {
    primary: {
      backgroundColor: colorTokens.accent[500],
      borderColor: colorTokens.accent[500],
      color: '#ffffff',
      boxShadow: shadowTokens.component.button.default,
      hover: {
        backgroundColor: colorTokens.accent[600],
        borderColor: colorTokens.accent[600],
        transform: 'translateY(-1px)',
        boxShadow: shadowTokens.component.button.hover,
      },
      active: {
        transform: 'translateY(0)',
        boxShadow: shadowTokens.component.button.pressed,
      },
      focus: {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
    secondary: {
      backgroundColor: colorTokens.primary[500],
      borderColor: colorTokens.primary[500],
      color: '#ffffff',
      boxShadow: shadowTokens.component.button.default,
      hover: {
        backgroundColor: colorTokens.primary[600],
        borderColor: colorTokens.primary[600],
        transform: 'translateY(-1px)',
        boxShadow: shadowTokens.component.button.hover,
      },
      active: {
        transform: 'translateY(0)',
        boxShadow: shadowTokens.component.button.pressed,
      },
      focus: {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.primary,
      },
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colorTokens.border.light,
      color: colorTokens.neutral[700],
      boxShadow: 'none',
      hover: {
        backgroundColor: colorTokens.accent[500],
        borderColor: colorTokens.accent[500],
        color: '#ffffff',
        boxShadow: shadowTokens.component.button.hover,
      },
      active: {
        transform: 'translateY(0)',
        boxShadow: shadowTokens.component.button.pressed,
      },
      focus: {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: colorTokens.neutral[700],
      boxShadow: 'none',
      hover: {
        backgroundColor: colorTokens.neutral[100],
        color: colorTokens.neutral[900],
      },
      active: {
        backgroundColor: colorTokens.neutral[200],
      },
      focus: {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.accent,
      },
    },
    destructive: {
      backgroundColor: colorTokens.semantic.error[500],
      borderColor: colorTokens.semantic.error[500],
      color: '#ffffff',
      boxShadow: shadowTokens.component.button.default,
      hover: {
        backgroundColor: colorTokens.semantic.error[600],
        borderColor: colorTokens.semantic.error[600],
        transform: 'translateY(-1px)',
        boxShadow: shadowTokens.component.button.hover,
      },
      active: {
        transform: 'translateY(0)',
        boxShadow: shadowTokens.component.button.pressed,
      },
      focus: {
        outline: 'none',
        boxShadow: shadowTokens.interactive.focus.error,
      },
    },
  },

  // State styles
  states: {
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      pointerEvents: 'none' as const,
    },
    loading: {
      cursor: 'wait',
      pointerEvents: 'none' as const,
    },
  },

  // Accessibility requirements
  accessibility: {
    minTouchTarget: spacingTokens.touch.minTarget,
    focusRing: shadowTokens.interactive.focus.accent,
    ariaLabel: 'Required for icon-only buttons',
    keyboardNavigation: 'Must support Enter and Space keys',
  },
} as const;

// Button utility functions
export const buttonUtils = {
  /**
   * Generate button classes
   */
  getButtonClasses: (
    variant: keyof typeof buttonDesignStandards.variants = 'primary',
    size: keyof typeof buttonDesignStandards.sizes = 'md',
    disabled: boolean = false,
    loading: boolean = false
  ): string => {
    const classes = ['chanuka-btn'];
    
    classes.push(`chanuka-btn-${variant}`);
    classes.push(`chanuka-btn-${size}`);
    
    if (disabled) classes.push('chanuka-btn-disabled');
    if (loading) classes.push('chanuka-btn-loading');
    
    return classes.join(' ');
  },

  /**
   * Get button styles object
   */
  getButtonStyles: (
    variant: keyof typeof buttonDesignStandards.variants = 'primary',
    size: keyof typeof buttonDesignStandards.sizes = 'md',
    state: 'default' | 'hover' | 'active' | 'focus' | 'disabled' = 'default'
  ) => {
    const baseStyles = buttonDesignStandards.base;
    const sizeStyles = buttonDesignStandards.sizes[size];
    const variantStyles = buttonDesignStandards.variants[variant];
    const stateStyles = state === 'disabled' 
      ? buttonDesignStandards.states.disabled 
      : variantStyles[state as keyof typeof variantStyles] || {};

    return {
      ...baseStyles,
      ...sizeStyles,
      ...(variantStyles as any),
      ...(stateStyles as any),
    };
  },

  /**
   * Validate button accessibility
   */
  validateAccessibility: (button: {
    hasText: boolean;
    hasAriaLabel: boolean;
    width: number;
    height: number;
  }): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!button.hasText && !button.hasAriaLabel) {
      issues.push('Button must have visible text or aria-label');
    }
    
    const minSize = parseFloat(buttonDesignStandards.accessibility.minTouchTarget);
    if (button.width < minSize || button.height < minSize) {
      issues.push(`Button must be at least ${minSize}px in both dimensions`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  },
} as const;

