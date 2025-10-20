/**
 * Spacing System - Consistent spatial relationships
 * Based on 8px grid system for pixel-perfect alignment
 * Supports responsive design and accessibility requirements
 */

export const spacingTokens = {
  // Base spacing scale - 8px grid system
  base: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
    40: '10rem',    // 160px
    48: '12rem',    // 192px
    56: '14rem',    // 224px
    64: '16rem',    // 256px
  },

  // Semantic spacing - T-shirt sizing for easier mental model
  semantic: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
    '4xl': '6rem',  // 96px
    '5xl': '8rem',  // 128px
  },

  // Component-specific spacing
  component: {
    // Button spacing
    button: {
      paddingX: {
        sm: '0.75rem',  // 12px
        md: '1rem',     // 16px
        lg: '1.5rem',   // 24px
      },
      paddingY: {
        sm: '0.375rem', // 6px
        md: '0.5rem',   // 8px
        lg: '0.75rem',  // 12px
      },
      gap: '0.5rem',    // 8px - space between icon and text
    },

    // Card spacing
    card: {
      padding: {
        sm: '1rem',     // 16px
        md: '1.5rem',   // 24px
        lg: '2rem',     // 32px
      },
      gap: '1rem',      // 16px - space between card elements
    },

    // Form spacing
    form: {
      fieldGap: '1rem',     // 16px - space between form fields
      labelGap: '0.5rem',   // 8px - space between label and input
      groupGap: '1.5rem',   // 24px - space between form groups
      sectionGap: '2rem',   // 32px - space between form sections
    },

    // Navigation spacing
    navigation: {
      itemPadding: {
        x: '1rem',      // 16px
        y: '0.75rem',   // 12px
      },
      itemGap: '0.25rem',   // 4px - space between nav items
      sectionGap: '1.5rem', // 24px - space between nav sections
    },

    // List spacing
    list: {
      itemGap: '0.5rem',    // 8px - space between list items
      nestedIndent: '1.5rem', // 24px - indentation for nested lists
    },

    // Table spacing
    table: {
      cellPadding: {
        x: '0.75rem',   // 12px
        y: '0.5rem',    // 8px
      },
      headerPadding: {
        x: '0.75rem',   // 12px
        y: '0.75rem',   // 12px
      },
    },
  },

  // Layout spacing - Page and section level
  layout: {
    // Container spacing
    container: {
      paddingX: {
        mobile: '1rem',     // 16px
        tablet: '1.5rem',   // 24px
        desktop: '2rem',    // 32px
      },
      maxWidth: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },

    // Section spacing
    section: {
      paddingY: {
        sm: '2rem',     // 32px
        md: '3rem',     // 48px
        lg: '4rem',     // 64px
        xl: '6rem',     // 96px
      },
      gap: {
        sm: '1.5rem',   // 24px
        md: '2rem',     // 32px
        lg: '3rem',     // 48px
      },
    },

    // Grid spacing
    grid: {
      gap: {
        sm: '1rem',     // 16px
        md: '1.5rem',   // 24px
        lg: '2rem',     // 32px
        xl: '3rem',     // 48px
      },
      columnGap: {
        sm: '1rem',     // 16px
        md: '1.5rem',   // 24px
        lg: '2rem',     // 32px
      },
      rowGap: {
        sm: '1rem',     // 16px
        md: '1.5rem',   // 24px
        lg: '2rem',     // 32px
      },
    },
  },

  // Touch target spacing - Accessibility compliance
  touch: {
    minTarget: '44px',      // Minimum touch target size (WCAG)
    comfortableTarget: '48px', // Comfortable touch target size
    spacing: '8px',         // Minimum space between touch targets
  },
} as const;

// Responsive spacing adjustments
export const responsiveSpacing = {
  // Mobile spacing adjustments (smaller screens)
  mobile: {
    container: {
      paddingX: spacingTokens.layout.container.paddingX.mobile,
    },
    section: {
      paddingY: spacingTokens.layout.section.paddingY.sm,
      gap: spacingTokens.layout.section.gap.sm,
    },
    grid: {
      gap: spacingTokens.layout.grid.gap.sm,
    },
    component: {
      card: {
        padding: spacingTokens.component.card.padding.sm,
      },
      form: {
        fieldGap: '0.75rem',    // Tighter spacing on mobile
        groupGap: '1rem',
        sectionGap: '1.5rem',
      },
    },
  },

  // Tablet spacing adjustments
  tablet: {
    container: {
      paddingX: spacingTokens.layout.container.paddingX.tablet,
    },
    section: {
      paddingY: spacingTokens.layout.section.paddingY.md,
      gap: spacingTokens.layout.section.gap.md,
    },
    grid: {
      gap: spacingTokens.layout.grid.gap.md,
    },
  },

  // Desktop spacing adjustments
  desktop: {
    container: {
      paddingX: spacingTokens.layout.container.paddingX.desktop,
    },
    section: {
      paddingY: spacingTokens.layout.section.paddingY.lg,
      gap: spacingTokens.layout.section.gap.lg,
    },
    grid: {
      gap: spacingTokens.layout.grid.gap.lg,
    },
  },
} as const;

// Spacing utility functions
export const spacingUtils = {
  /**
   * Get responsive spacing value based on breakpoint
   */
  getResponsiveSpacing: (
    property: keyof typeof responsiveSpacing.mobile,
    breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  ) => {
    return responsiveSpacing[breakpoint][property];
  },

  /**
   * Calculate spacing based on multiplier
   */
  multiply: (baseSpacing: string, multiplier: number): string => {
    const numericValue = parseFloat(baseSpacing);
    const unit = baseSpacing.replace(numericValue.toString(), '');
    return `${numericValue * multiplier}${unit}`;
  },

  /**
   * Add two spacing values
   */
  add: (spacing1: string, spacing2: string): string => {
    const value1 = parseFloat(spacing1);
    const value2 = parseFloat(spacing2);
    const unit1 = spacing1.replace(value1.toString(), '');
    const unit2 = spacing2.replace(value2.toString(), '');
    
    // Assume same units for simplicity
    if (unit1 === unit2) {
      return `${value1 + value2}${unit1}`;
    }
    
    // Return calc() for different units
    return `calc(${spacing1} + ${spacing2})`;
  },

  /**
   * Get optimal spacing for touch targets
   */
  getTouchSpacing: (isComfortable: boolean = false): string => {
    return isComfortable 
      ? spacingTokens.touch.comfortableTarget 
      : spacingTokens.touch.minTarget;
  },

  /**
   * Validate spacing meets accessibility requirements
   */
  meetsAccessibilityRequirements: (spacing: string): boolean => {
    const numericValue = parseFloat(spacing);
    const minSpacing = parseFloat(spacingTokens.touch.spacing);
    return numericValue >= minSpacing;
  },

  /**
   * Get spacing for specific component
   */
  getComponentSpacing: (
    component: keyof typeof spacingTokens.component,
    property: string,
    size: 'sm' | 'md' | 'lg' = 'md'
  ): string => {
    const componentSpacing = spacingTokens.component[component];
    // Type-safe access would require more complex typing
    return componentSpacing[property as keyof typeof componentSpacing]?.[size] || 
           componentSpacing[property as keyof typeof componentSpacing] || 
           spacingTokens.semantic.md;
  },
} as const;

// CSS Custom Properties for spacing
export const spacingCSSVariables = {
  // Base spacing
  '--spacing-xs': spacingTokens.semantic.xs,
  '--spacing-sm': spacingTokens.semantic.sm,
  '--spacing-md': spacingTokens.semantic.md,
  '--spacing-lg': spacingTokens.semantic.lg,
  '--spacing-xl': spacingTokens.semantic.xl,
  '--spacing-2xl': spacingTokens.semantic['2xl'],
  '--spacing-3xl': spacingTokens.semantic['3xl'],

  // Component spacing
  '--button-padding-x': spacingTokens.component.button.paddingX.md,
  '--button-padding-y': spacingTokens.component.button.paddingY.md,
  '--card-padding': spacingTokens.component.card.padding.md,
  '--form-field-gap': spacingTokens.component.form.fieldGap,
  '--nav-item-padding-x': spacingTokens.component.navigation.itemPadding.x,
  '--nav-item-padding-y': spacingTokens.component.navigation.itemPadding.y,

  // Layout spacing
  '--container-padding-x': spacingTokens.layout.container.paddingX.desktop,
  '--section-padding-y': spacingTokens.layout.section.paddingY.md,
  '--grid-gap': spacingTokens.layout.grid.gap.md,

  // Touch targets
  '--touch-target-min': spacingTokens.touch.minTarget,
  '--touch-target-comfortable': spacingTokens.touch.comfortableTarget,
  '--touch-spacing': spacingTokens.touch.spacing,
} as const;

export type SpacingToken = typeof spacingTokens;
export type ResponsiveSpacing = typeof responsiveSpacing;