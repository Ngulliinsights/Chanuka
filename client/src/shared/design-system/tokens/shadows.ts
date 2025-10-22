/**
 * Shadow System - Elevation and depth
 * Creates visual hierarchy and depth perception
 * Optimized for performance and accessibility
 */

export const shadowTokens = {
  // Elevation system - Material Design inspired
  elevation: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
  },

  // Interactive shadows - Hover and focus states
  interactive: {
    hover: {
      subtle: '0 2px 4px rgba(0, 0, 0, 0.1)',
      moderate: '0 4px 8px rgba(0, 0, 0, 0.12)',
      strong: '0 8px 16px rgba(0, 0, 0, 0.15)',
    },
    focus: {
      // Using Chanuka accent color for focus rings
      primary: '0 0 0 3px rgba(13, 59, 102, 0.15)', // Primary blue
      accent: '0 0 0 3px rgba(243, 138, 31, 0.15)',  // Chanuka orange
      error: '0 0 0 3px rgba(239, 68, 68, 0.15)',    // Error red
      success: '0 0 0 3px rgba(34, 197, 94, 0.15)',  // Success green
    },
    pressed: {
      inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
    },
  },

  // Component-specific shadows
  component: {
    // Card shadows
    card: {
      default: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      hover: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      active: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },

    // Button shadows
    button: {
      default: '0 1px 2px rgba(0, 0, 0, 0.05)',
      hover: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      pressed: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
    },

    // Modal and overlay shadows
    modal: {
      backdrop: 'rgba(0, 0, 0, 0.5)',
      content: '0 25px 50px rgba(0, 0, 0, 0.25)',
    },

    // Dropdown and popover shadows
    dropdown: {
      default: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      large: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    },

    // Navigation shadows
    navigation: {
      header: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      sidebar: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      floating: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    },

    // Form element shadows
    form: {
      input: {
        default: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        focus: '0 0 0 3px rgba(243, 138, 31, 0.15)',
        error: '0 0 0 3px rgba(239, 68, 68, 0.15)',
      },
    },

    // Toast and notification shadows
    toast: {
      default: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      important: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    },
  },

  // Colored shadows for branding
  colored: {
    primary: {
      subtle: '0 4px 6px rgba(13, 59, 102, 0.1)',
      moderate: '0 8px 16px rgba(13, 59, 102, 0.15)',
      strong: '0 12px 24px rgba(13, 59, 102, 0.2)',
    },
    accent: {
      subtle: '0 4px 6px rgba(243, 138, 31, 0.1)',
      moderate: '0 8px 16px rgba(243, 138, 31, 0.15)',
      strong: '0 12px 24px rgba(243, 138, 31, 0.2)',
    },
    success: {
      subtle: '0 4px 6px rgba(34, 197, 94, 0.1)',
      moderate: '0 8px 16px rgba(34, 197, 94, 0.15)',
    },
    warning: {
      subtle: '0 4px 6px rgba(245, 158, 11, 0.1)',
      moderate: '0 8px 16px rgba(245, 158, 11, 0.15)',
    },
    error: {
      subtle: '0 4px 6px rgba(239, 68, 68, 0.1)',
      moderate: '0 8px 16px rgba(239, 68, 68, 0.15)',
    },
  },
} as const;

// Dark theme shadow adjustments
export const darkShadowTokens = {
  elevation: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5), 0 4px 6px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6), 0 10px 10px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.8)',
  },

  interactive: {
    hover: {
      subtle: '0 2px 4px rgba(0, 0, 0, 0.4)',
      moderate: '0 4px 8px rgba(0, 0, 0, 0.5)',
      strong: '0 8px 16px rgba(0, 0, 0, 0.6)',
    },
  },

  component: {
    modal: {
      backdrop: 'rgba(0, 0, 0, 0.8)',
      content: '0 25px 50px rgba(0, 0, 0, 0.5)',
    },
  },
} as const;

// Shadow utility functions
export const shadowUtils = {
  /**
   * Get shadow based on elevation level
   */
  getElevationShadow: (level: keyof typeof shadowTokens.elevation, isDark: boolean = false): string => {
    return isDark ? darkShadowTokens.elevation[level] : shadowTokens.elevation[level];
  },

  /**
   * Get component shadow with state
   */
  getComponentShadow: (
    component: keyof typeof shadowTokens.component,
    state: 'default' | 'hover' | 'active' | 'focus' = 'default',
    isDark: boolean = false
  ): string => {
    const componentShadows = shadowTokens.component[component];
    
    if (typeof componentShadows === 'string') {
      return componentShadows;
    }

    // Handle different shadow structures
    if ('default' in componentShadows) {
      return componentShadows[state as keyof typeof componentShadows] || componentShadows.default;
    }

    return shadowTokens.elevation.sm;
  },

  /**
   * Get colored shadow for branding
   */
  getColoredShadow: (
    color: keyof typeof shadowTokens.colored,
    intensity: 'subtle' | 'moderate' | 'strong' = 'subtle'
  ): string => {
    return shadowTokens.colored[color][intensity];
  },

  /**
   * Combine multiple shadows
   */
  combineShadows: (...shadows: string[]): string => {
    return shadows.filter(shadow => shadow !== 'none').join(', ');
  },

  /**
   * Create custom shadow with color
   */
  createColoredShadow: (
    offsetX: number,
    offsetY: number,
    blur: number,
    spread: number,
    color: string,
    opacity: number = 1
  ): string => {
    const rgbaColor = color.startsWith('#') 
      ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${opacity})`
      : `${color.replace(')', `, ${opacity})`).replace('rgb', 'rgba')}`;
    
    return `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${rgbaColor}`;
  },

  /**
   * Check if shadow meets accessibility requirements
   */
  meetsAccessibilityRequirements: (shadow: string): boolean => {
    // Check if shadow provides sufficient contrast for focus indicators
    // This is a simplified check - real implementation would analyze shadow properties
    return shadow.includes('rgba') && !shadow.includes('0.05');
  },

  /**
   * Get optimal shadow for component size
   */
  getOptimalShadow: (width: number, height: number): string => {
    const area = width * height;
    
    if (area < 1000) return shadowTokens.elevation.xs;
    if (area < 5000) return shadowTokens.elevation.sm;
    if (area < 20000) return shadowTokens.elevation.md;
    if (area < 50000) return shadowTokens.elevation.lg;
    return shadowTokens.elevation.xl;
  },
} as const;

// CSS Custom Properties for shadows
export const shadowCSSVariables = {
  // Elevation shadows
  '--shadow-xs': shadowTokens.elevation.xs,
  '--shadow-sm': shadowTokens.elevation.sm,
  '--shadow-md': shadowTokens.elevation.md,
  '--shadow-lg': shadowTokens.elevation.lg,
  '--shadow-xl': shadowTokens.elevation.xl,
  '--shadow-2xl': shadowTokens.elevation['2xl'],

  // Interactive shadows
  '--shadow-hover-subtle': shadowTokens.interactive.hover.subtle,
  '--shadow-hover-moderate': shadowTokens.interactive.hover.moderate,
  '--shadow-hover-strong': shadowTokens.interactive.hover.strong,

  // Focus shadows
  '--shadow-focus-primary': shadowTokens.interactive.focus.primary,
  '--shadow-focus-accent': shadowTokens.interactive.focus.accent,
  '--shadow-focus-error': shadowTokens.interactive.focus.error,
  '--shadow-focus-success': shadowTokens.interactive.focus.success,

  // Component shadows
  '--shadow-card': shadowTokens.component.card.default,
  '--shadow-card-hover': shadowTokens.component.card.hover,
  '--shadow-button': shadowTokens.component.button.default,
  '--shadow-button-hover': shadowTokens.component.button.hover,
  '--shadow-modal': shadowTokens.component.modal.content,
  '--shadow-dropdown': shadowTokens.component.dropdown.default,
  '--shadow-navigation': shadowTokens.component.navigation.header,

  // Colored shadows
  '--shadow-primary': shadowTokens.colored.primary.subtle,
  '--shadow-accent': shadowTokens.colored.accent.subtle,
  '--shadow-success': shadowTokens.colored.success.subtle,
  '--shadow-warning': shadowTokens.colored.warning.subtle,
  '--shadow-error': shadowTokens.colored.error.subtle,
} as const;

// Performance optimizations for shadows
export const shadowPerformance = {
  // Reduced motion shadows
  reducedMotion: {
    elevation: {
      xs: shadowTokens.elevation.xs,
      sm: shadowTokens.elevation.xs, // Simplified for reduced motion
      md: shadowTokens.elevation.sm,
      lg: shadowTokens.elevation.md,
      xl: shadowTokens.elevation.lg,
      '2xl': shadowTokens.elevation.xl,
    },
  },

  // GPU-optimized shadows (using transform instead of box-shadow when possible)
  gpuOptimized: {
    hover: 'transform: translateY(-1px)',
    pressed: 'transform: translateY(1px)',
  },
} as const;

export type ShadowToken = typeof shadowTokens;
export type DarkShadowToken = typeof darkShadowTokens;