/**
 * Animation System - Smooth transitions and micro-interactions
 * Optimized for performance and accessibility
 */

export const animationTokens = {
  // Duration scale - Consistent timing
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
    slowest: '750ms',
  },

  // Easing functions - Natural motion curves
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  // Common transitions
  transition: {
    all: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors:
      'color 150ms cubic-bezier(0, 0, 0.2, 1), background-color 150ms cubic-bezier(0, 0, 0.2, 1), border-color 150ms cubic-bezier(0, 0, 0.2, 1)',
    opacity: 'opacity 150ms cubic-bezier(0, 0, 0.2, 1)',
    shadow: 'box-shadow 150ms cubic-bezier(0, 0, 0.2, 1)',
    transform: 'transform 150ms cubic-bezier(0, 0, 0.2, 1)',
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: '0', transform: 'translateY(-10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
    slideUp: {
      from: { transform: 'translateY(10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      from: { transform: 'translateY(-10px)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  },

  // Component-specific animations
  component: {
    button: {
      hover: 'transform 150ms cubic-bezier(0, 0, 0.2, 1)',
      press: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    card: {
      hover:
        'transform 250ms cubic-bezier(0, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0, 0, 0.2, 1)',
    },
    modal: {
      enter: 'opacity 250ms cubic-bezier(0, 0, 0.2, 1), transform 250ms cubic-bezier(0, 0, 0.2, 1)',
      exit: 'opacity 150ms cubic-bezier(0.4, 0, 1, 1), transform 150ms cubic-bezier(0.4, 0, 1, 1)',
    },
  },
} as const;
