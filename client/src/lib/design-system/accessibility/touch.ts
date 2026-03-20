/**
 * Touch Target Accessibility - WCAG 2.1 AA compliance
 * Ensures adequate touch targets for mobile users
 */

// Base touch target sizes
const baseTouchTargets = {
  // Minimum sizes (WCAG 2.1 AA)
  minimum: {
    width: '44px',
    height: '44px',
    spacing: '8px', // Minimum space between targets
  },

  // Comfortable sizes (recommended)
  comfortable: {
    width: '48px',
    height: '48px',
    spacing: '12px',
  },

  // Large sizes (for accessibility)
  large: {
    width: '56px',
    height: '56px',
    spacing: '16px',
  },
} as const;

export const touchTargets = {
  ...baseTouchTargets,

  // Context-specific sizes
  context: {
    button: {
      primary: baseTouchTargets.comfortable,
      secondary: baseTouchTargets.minimum,
      icon: baseTouchTargets.comfortable,
    },
    navigation: {
      item: baseTouchTargets.comfortable,
      toggle: baseTouchTargets.large,
    },
    form: {
      input: { width: '100%', height: baseTouchTargets.comfortable.height },
      checkbox: baseTouchTargets.comfortable,
      radio: baseTouchTargets.comfortable,
    },
  },
} as const;

// Touch utility functions
export const touchUtils = {
  /**
   * Check if element meets touch target requirements
   */
  meetsTouchRequirements: (
    width: number,
    height: number,
    level: 'minimum' | 'comfortable' | 'large' = 'minimum'
  ): boolean => {
    const requirements = touchTargets[level];
    const minWidth = parseFloat(requirements.width);
    const minHeight = parseFloat(requirements.height);

    return width >= minWidth && height >= minHeight;
  },

  /**
   * Get touch target size for component
   */
  getTouchTargetSize: (
    component: keyof typeof touchTargets.context,
    variant: string = 'primary'
  ) => {
    const componentTargets = touchTargets.context[component];
    return componentTargets[variant as keyof typeof componentTargets] || touchTargets.minimum;
  },

  /**
   * Calculate required spacing between touch targets
   */
  getRequiredSpacing: (level: 'minimum' | 'comfortable' | 'large' = 'minimum'): string => {
    return touchTargets[level].spacing;
  },

  /**
   * Apply touch-friendly styles to element
   */
  applyTouchStyles: (
    element: HTMLElement,
    level: 'minimum' | 'comfortable' | 'large' = 'comfortable'
  ): void => {
    const target = touchTargets[level];
    element.style.minWidth = target.width;
    element.style.minHeight = target.height;
    element.style.touchAction = 'manipulation'; // Prevents double-tap zoom
  },
} as const;
