/**
 * Border System - Consistent border styles and radius
 * Supports component hierarchy and visual separation
 */

export const borderTokens = {
  // Border widths
  width: {
    none: '0',
    thin: '1px',
    medium: '2px',
    thick: '3px',
    heavy: '4px',
  },

  // Border radius - Consistent rounded corners
  radius: {
    none: '0',
    xs: '0.125rem',   // 2px
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px - default, refined from existing
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',   // Fully rounded
  },

  // Border styles
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
    double: 'double',
    none: 'none',
  },

  // Border colors - Using design system colors
  color: {
    // Default borders
    default: 'hsl(var(--border))',
    subtle: 'hsl(var(--border) / 0.5)',
    emphasis: 'hsl(var(--border) / 0.8)',

    // Semantic borders
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    accent: 'hsl(var(--accent))',

    // Status borders
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    error: 'hsl(var(--danger))',
    info: 'hsl(var(--info))',

    // Interactive states
    hover: 'hsl(var(--accent) / 0.6)',
    focus: 'hsl(var(--ring))',
    disabled: 'hsl(var(--muted-foreground) / 0.3)',
  },
} as const;

// Component-specific border configurations
export const componentBorders = {
  // Button borders
  button: {
    default: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: 'transparent',
      radius: borderTokens.radius.md,
    },
    outlined: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
      radius: borderTokens.radius.md,
    },
    focus: {
      width: borderTokens.width.medium,
      style: borderTokens.style.solid,
      color: borderTokens.color.focus,
      radius: borderTokens.radius.md,
    },
  },

  // Input borders
  input: {
    default: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
      radius: borderTokens.radius.md,
    },
    focus: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.focus,
      radius: borderTokens.radius.md,
    },
    error: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.error,
      radius: borderTokens.radius.md,
    },
    success: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.success,
      radius: borderTokens.radius.md,
    },
  },

  // Card borders
  card: {
    default: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
      radius: borderTokens.radius.lg,
    },
    interactive: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
      radius: borderTokens.radius.lg,
      hover: {
        color: borderTokens.color.hover,
      },
    },
    emphasis: {
      width: borderTokens.width.medium,
      style: borderTokens.style.solid,
      color: borderTokens.color.emphasis,
      radius: borderTokens.radius.lg,
    },
  },

  // Modal borders
  modal: {
    default: {
      width: borderTokens.width.none,
      style: borderTokens.style.none,
      color: 'transparent',
      radius: borderTokens.radius.xl,
    },
    outlined: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.subtle,
      radius: borderTokens.radius.xl,
    },
  },

  // Navigation borders
  navigation: {
    header: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.subtle,
      radius: borderTokens.radius.none,
    },
    sidebar: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
      radius: borderTokens.radius.none,
    },
    item: {
      width: borderTokens.width.none,
      style: borderTokens.style.none,
      color: 'transparent',
      radius: borderTokens.radius.md,
      hover: {
        color: borderTokens.color.hover,
      },
      active: {
        width: borderTokens.width.medium,
        color: borderTokens.color.accent,
      },
    },
  },

  // Table borders
  table: {
    cell: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
      radius: borderTokens.radius.none,
    },
    header: {
      width: borderTokens.width.medium,
      style: borderTokens.style.solid,
      color: borderTokens.color.emphasis,
      radius: borderTokens.radius.none,
    },
  },

  // Divider borders
  divider: {
    horizontal: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
    },
    vertical: {
      width: borderTokens.width.thin,
      style: borderTokens.style.solid,
      color: borderTokens.color.default,
    },
    emphasis: {
      width: borderTokens.width.medium,
      style: borderTokens.style.solid,
      color: borderTokens.color.emphasis,
    },
  },
} as const;

// Responsive border adjustments
export const responsiveBorders = {
  // Mobile border adjustments
  mobile: {
    radius: {
      sm: borderTokens.radius.sm,
      md: borderTokens.radius.md,
      lg: borderTokens.radius.lg,
    },
    width: {
      default: borderTokens.width.thin,
      emphasis: borderTokens.width.medium,
    },
  },

  // Tablet border adjustments
  tablet: {
    radius: {
      sm: borderTokens.radius.md,
      md: borderTokens.radius.lg,
      lg: borderTokens.radius.xl,
    },
  },

  // Desktop border adjustments
  desktop: {
    radius: {
      sm: borderTokens.radius.md,
      md: borderTokens.radius.lg,
      lg: borderTokens.radius.xl,
    },
  },
} as const;

// Border utility functions
export const borderUtils = {
  /**
   * Create complete border style string
   */
  createBorder: (
    width: keyof typeof borderTokens.width,
    style: keyof typeof borderTokens.style,
    color: string
  ): string => {
    return `${borderTokens.width[width]} ${borderTokens.style[style]} ${color}`;
  },

  /**
   * Get component border configuration
   */
  getComponentBorder: (
    component: keyof typeof componentBorders,
    variant: string = 'default',
    state: string = 'default'
  ) => {
    const componentConfig = componentBorders[component];
    const variantConfig = componentConfig[variant as keyof typeof componentConfig] || componentConfig.default;
    
    if (typeof variantConfig === 'object' && 'default' in variantConfig) {
      return variantConfig;
    }
    
    return variantConfig;
  },

  /**
   * Get responsive border radius
   */
  getResponsiveRadius: (
    size: 'sm' | 'md' | 'lg',
    breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  ): string => {
    return responsiveBorders[breakpoint].radius?.[size] || borderTokens.radius[size];
  },

  /**
   * Create focus border with ring
   */
  createFocusBorder: (baseColor: string = borderTokens.color.focus): string => {
    return `${borderTokens.width.medium} ${borderTokens.style.solid} ${baseColor}`;
  },

  /**
   * Get border for status state
   */
  getStatusBorder: (status: 'success' | 'warning' | 'error' | 'info'): string => {
    const colorMap = {
      success: borderTokens.color.success,
      warning: borderTokens.color.warning,
      error: borderTokens.color.error,
      info: borderTokens.color.info,
    };
    
    return borderUtils.createBorder('thin', 'solid', colorMap[status]);
  },

  /**
   * Check if border meets accessibility requirements
   */
  meetsAccessibilityRequirements: (
    width: string,
    color: string,
    context: 'focus' | 'error' | 'general' = 'general'
  ): boolean => {
    const minWidth = context === 'focus' ? 2 : 1;
    const numericWidth = parseFloat(width);
    
    // Basic checks - real implementation would check color contrast
    return numericWidth >= minWidth && color !== 'transparent';
  },

  /**
   * Combine border radius for complex shapes
   */
  combineRadius: (
    topLeft: string,
    topRight: string,
    bottomRight: string,
    bottomLeft: string
  ): string => {
    return `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
  },
} as const;

// CSS Custom Properties for borders
export const borderCSSVariables = {
  // Border widths
  '--border-width-thin': borderTokens.width.thin,
  '--border-width-medium': borderTokens.width.medium,
  '--border-width-thick': borderTokens.width.thick,

  // Border radius
  '--border-radius-xs': borderTokens.radius.xs,
  '--border-radius-sm': borderTokens.radius.sm,
  '--border-radius-md': borderTokens.radius.md,
  '--border-radius-lg': borderTokens.radius.lg,
  '--border-radius-xl': borderTokens.radius.xl,
  '--border-radius-2xl': borderTokens.radius['2xl'],
  '--border-radius-full': borderTokens.radius.full,

  // Border colors
  '--border-color-default': borderTokens.color.default,
  '--border-color-subtle': borderTokens.color.subtle,
  '--border-color-emphasis': borderTokens.color.emphasis,
  '--border-color-primary': borderTokens.color.primary,
  '--border-color-accent': borderTokens.color.accent,
  '--border-color-success': borderTokens.color.success,
  '--border-color-warning': borderTokens.color.warning,
  '--border-color-error': borderTokens.color.error,
  '--border-color-info': borderTokens.color.info,
  '--border-color-focus': borderTokens.color.focus,

  // Component borders
  '--border-button': borderUtils.createBorder('thin', 'solid', 'transparent'),
  '--border-input': borderUtils.createBorder('thin', 'solid', borderTokens.color.default),
  '--border-card': borderUtils.createBorder('thin', 'solid', borderTokens.color.default),
} as const;

// Accessibility-focused border configurations
export const accessibilityBorders = {
  // High contrast borders
  highContrast: {
    width: borderTokens.width.medium,
    color: '#000000', // Pure black for maximum contrast
    focusWidth: borderTokens.width.thick,
  },

  // Focus indicators
  focus: {
    minWidth: borderTokens.width.medium,
    minOffset: '2px',
    color: borderTokens.color.focus,
    style: borderTokens.style.solid,
  },

  // Error indicators
  error: {
    width: borderTokens.width.medium,
    color: borderTokens.color.error,
    style: borderTokens.style.solid,
    pattern: borderTokens.style.dashed, // Alternative for colorblind users
  },
} as const;

export type BorderToken = typeof borderTokens;
export type ComponentBorder = typeof componentBorders;
export type ResponsiveBorder = typeof responsiveBorders;