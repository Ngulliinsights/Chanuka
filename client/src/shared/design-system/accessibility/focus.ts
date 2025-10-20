/**
 * Focus Management - Keyboard navigation and accessibility
 * Ensures clear focus indicators and logical tab order
 */

export const focusTokens = {
  // Focus ring styles
  ring: {
    width: '2px',
    offset: '2px',
    color: 'hsl(var(--ring))', // Chanuka accent color
    style: 'solid',
    radius: '4px',
  },

  // Enhanced focus for high contrast
  enhanced: {
    width: '3px',
    offset: '2px',
    color: '#2563eb', // High contrast blue
    shadow: '0 0 0 5px rgba(37, 99, 235, 0.2)',
  },

  // Focus states for different components
  component: {
    button: {
      outline: '2px solid hsl(var(--ring))',
      outlineOffset: '2px',
      boxShadow: '0 0 0 4px rgba(243, 138, 31, 0.15)',
    },
    input: {
      outline: '2px solid hsl(var(--ring))',
      outlineOffset: '0px',
      borderColor: 'hsl(var(--ring))',
    },
    card: {
      outline: '2px solid hsl(var(--ring))',
      outlineOffset: '2px',
      transform: 'translateY(-1px)',
    },
    navigation: {
      outline: '2px solid hsl(var(--ring))',
      outlineOffset: '2px',
      backgroundColor: 'rgba(243, 138, 31, 0.1)',
    },
  },
} as const;

// Focus management utilities
export const focusUtils = {
  /**
   * Create focus ring styles
   */
  createFocusRing: (
    color: string = focusTokens.ring.color,
    width: string = focusTokens.ring.width,
    offset: string = focusTokens.ring.offset
  ): string => {
    return `outline: ${width} ${focusTokens.ring.style} ${color}; outline-offset: ${offset};`;
  },

  /**
   * Get component focus styles
   */
  getComponentFocus: (component: keyof typeof focusTokens.component) => {
    return focusTokens.component[component];
  },

  /**
   * Check if focus is visible (for :focus-visible polyfill)
   */
  isFocusVisible: (element: HTMLElement): boolean => {
    // Simplified check - real implementation would check user interaction method
    return document.body.classList.contains('keyboard-navigation');
  },

  /**
   * Trap focus within container
   */
  trapFocus: (container: HTMLElement): void => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  },

  /**
   * Restore focus to previous element
   */
  restoreFocus: (previousElement: HTMLElement | null): void => {
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus();
    }
  },
} as const;