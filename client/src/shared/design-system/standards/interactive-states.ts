/**
 * Interactive States Design Standards
 * Consistent hover, focus, active, and disabled states for all components
 */

import { animationTokens } from '../tokens/animations';
import { colorTokens } from '../tokens/colors';
import { shadowTokens } from '../tokens/shadows';

export const interactiveStates = {
  // Base interactive state patterns
  base: {
    transition: animationTokens.transition.all,
    cursor: 'pointer',
    userSelect: 'none' as const,
  },

  // Hover states
  hover: {
    default: {
      backgroundColor: colorTokens.interactive.hover.light,
      transform: 'translateY(-1px)',
      boxShadow: shadowTokens.component.card.hover,
      transition: animationTokens.component.card.hover,
    },
    button: {
      transform: 'translateY(-1px)',
      boxShadow: shadowTokens.component.button.hover,
      transition: animationTokens.component.button.hover,
    },
    card: {
      transform: 'translateY(-2px)',
      boxShadow: shadowTokens.component.card.hover,
      borderColor: colorTokens.border.emphasis,
      transition: animationTokens.component.card.hover,
    },
    link: {
      color: colorTokens.accent[600],
      textDecoration: 'underline',
      transition: animationTokens.transition.colors,
    },
    input: {
      borderColor: colorTokens.accent[500],
      boxShadow: shadowTokens.interactive.focus.accent,
      transition: animationTokens.transition.colors,
    },
  },

  // Focus states - WCAG compliant
  focus: {
    default: {
      outline: 'none',
      boxShadow: shadowTokens.interactive.focus.accent,
      borderColor: colorTokens.interactive.focus.ring,
      transition: animationTokens.transition.shadow,
    },
    button: {
      outline: 'none',
      boxShadow: shadowTokens.interactive.focus.accent,
      transition: animationTokens.transition.shadow,
    },
    input: {
      outline: 'none',
      borderColor: colorTokens.interactive.focus.ring,
      boxShadow: shadowTokens.interactive.focus.accent,
      backgroundColor: colorTokens.interactive.focus.background,
      transition: animationTokens.transition.all,
    },
    card: {
      outline: 'none',
      boxShadow: shadowTokens.interactive.focus.accent,
      borderColor: colorTokens.interactive.focus.ring,
      transition: animationTokens.transition.shadow,
    },
  },

  // Active/pressed states
  active: {
    default: {
      transform: 'translateY(0)',
      boxShadow: shadowTokens.component.button.pressed,
      transition: animationTokens.component.button.press,
    },
    button: {
      transform: 'translateY(0)',
      boxShadow: shadowTokens.component.button.pressed,
      transition: animationTokens.component.button.press,
    },
    card: {
      transform: 'translateY(-1px)',
      boxShadow: shadowTokens.component.card.pressed,
      transition: animationTokens.component.button.press,
    },
  },

  // Disabled states
  disabled: {
    default: {
      opacity: '0.5',
      cursor: 'not-allowed',
      pointerEvents: 'none' as const,
      backgroundColor: colorTokens.interactive.disabled.light,
      color: colorTokens.interactive.disabled.text,
      borderColor: colorTokens.interactive.disabled.light,
      boxShadow: 'none',
    },
    button: {
      opacity: '0.6',
      cursor: 'not-allowed',
      pointerEvents: 'none' as const,
      backgroundColor: colorTokens.interactive.disabled.light,
      color: colorTokens.interactive.disabled.text,
      borderColor: colorTokens.interactive.disabled.light,
      boxShadow: 'none',
      transform: 'none',
    },
    input: {
      opacity: '0.7',
      cursor: 'not-allowed',
      backgroundColor: colorTokens.interactive.disabled.light,
      color: colorTokens.interactive.disabled.text,
      borderColor: colorTokens.interactive.disabled.light,
    },
  },

  // Loading states
  loading: {
    default: {
      cursor: 'wait',
      pointerEvents: 'none' as const,
      opacity: '0.8',
    },
    button: {
      cursor: 'wait',
      pointerEvents: 'none' as const,
      opacity: '0.8',
    },
    overlay: {
      position: 'relative' as const,
      '&::after': {
        content: '""',
        position: 'absolute' as const,
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10',
      },
    },
  },
} as const;

// Interactive state utility functions
export const interactiveStateUtils = {
  /**
   * Get interactive state classes
   */
  getStateClasses: (
    component: 'button' | 'card' | 'input' | 'link' | 'default' = 'default',
    states: {
      hover?: boolean;
      focus?: boolean;
      active?: boolean;
      disabled?: boolean;
      loading?: boolean;
    } = {}
  ): string => {
    const classes = [`chanuka-interactive-${component}`];
    
    if (states.hover) classes.push(`chanuka-${component}-hover`);
    if (states.focus) classes.push(`chanuka-${component}-focus`);
    if (states.active) classes.push(`chanuka-${component}-active`);
    if (states.disabled) classes.push(`chanuka-${component}-disabled`);
    if (states.loading) classes.push(`chanuka-${component}-loading`);
    
    return classes.join(' ');
  },

  /**
   * Get interactive state styles
   */
  getStateStyles: (
    component: 'button' | 'card' | 'input' | 'link' | 'default' = 'default',
    state: 'hover' | 'focus' | 'active' | 'disabled' | 'loading' | 'default' = 'default'
  ) => {
    const baseStyles = interactiveStates.base;
    
    if (state === 'default') return baseStyles;
    
    const stateStyles = (interactiveStates[state] as any)?.[component] || (interactiveStates[state] as any)?.default;
    
    return {
      ...baseStyles,
      ...stateStyles,
    };
  },

  /**
   * Generate CSS for all interactive states
   */
  generateCSS: (component: string, baseSelector: string): string => {
    return `
      ${baseSelector} {
        transition: ${interactiveStates.base.transition};
        cursor: ${interactiveStates.base.cursor};
        user-select: ${interactiveStates.base.userSelect};
      }

      ${baseSelector}:hover:not(:disabled):not([aria-disabled="true"]) {
        ${Object.entries(interactiveStates.hover[component as keyof typeof interactiveStates.hover] || interactiveStates.hover.default)
          .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
          .join('\n        ')}
      }

      ${baseSelector}:focus-visible {
        ${Object.entries(interactiveStates.focus[component as keyof typeof interactiveStates.focus] || interactiveStates.focus.default)
          .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
          .join('\n        ')}
      }

      ${baseSelector}:active:not(:disabled):not([aria-disabled="true"]) {
        ${Object.entries(interactiveStates.active[component as keyof typeof interactiveStates.active] || interactiveStates.active.default)
          .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
          .join('\n        ')}
      }

      ${baseSelector}:disabled,
      ${baseSelector}[aria-disabled="true"] {
        ${Object.entries(interactiveStates.disabled[component as keyof typeof interactiveStates.disabled] || interactiveStates.disabled.default)
          .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
          .join('\n        ')}
      }

      ${baseSelector}[data-loading="true"] {
        ${Object.entries(interactiveStates.loading[component as keyof typeof interactiveStates.loading] || interactiveStates.loading.default)
          .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
          .join('\n        ')}
      }
    `;
  },

  /**
   * Validate interactive state accessibility
   */
  validateAccessibility: (element: {
    hasVisibleFocus: boolean;
    hasKeyboardSupport: boolean;
    hasAriaStates: boolean;
    meetsContrastRequirements: boolean;
  }): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!element.hasVisibleFocus) {
      issues.push('Element must have visible focus indicator');
    }
    
    if (!element.hasKeyboardSupport) {
      issues.push('Element must support keyboard navigation');
    }
    
    if (!element.hasAriaStates) {
      issues.push('Element must have appropriate ARIA states');
    }
    
    if (!element.meetsContrastRequirements) {
      issues.push('Element must meet WCAG contrast requirements');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  },
} as const;

export type InteractiveComponent = 'button' | 'card' | 'input' | 'link' | 'default';
export type InteractiveState = 'hover' | 'focus' | 'active' | 'disabled' | 'loading' | 'default';

