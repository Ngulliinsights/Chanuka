/**
 * Motion and Animation Accessibility
 * Respects user preferences for reduced motion
 */

export const motionTokens = {
  // Reduced motion alternatives
  reducedMotion: {
    duration: '0.01ms',
    easing: 'linear',
    transform: 'none',
    transition: 'none',
  },

  // Safe animations (minimal motion)
  safe: {
    opacity: 'opacity 150ms ease-out',
    color: 'color 150ms ease-out',
    backgroundColor: 'background-color 150ms ease-out',
  },

  // Vestibular-safe animations (no parallax, rotation, or scaling)
  vestibularSafe: {
    fadeIn: 'opacity 200ms ease-out',
    slideVertical: 'transform 200ms ease-out', // Only vertical movement
    colorChange: 'color 150ms ease-out, background-color 150ms ease-out',
  },
} as const;

// Motion utility functions
export const motionUtils = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Get appropriate animation based on user preference
   */
  getAnimation: (
    normalAnimation: string,
    reducedAnimation: string = motionTokens.reducedMotion.transition
  ): string => {
    return motionUtils.prefersReducedMotion() ? reducedAnimation : normalAnimation;
  },

  /**
   * Create vestibular-safe animation
   */
  createSafeAnimation: (
    property: 'opacity' | 'color' | 'backgroundColor' | 'slideVertical',
    duration: string = '200ms',
    easing: string = 'ease-out'
  ): string => {
    if (motionUtils.prefersReducedMotion()) {
      return motionTokens.reducedMotion.transition;
    }

    const propertyMap = {
      opacity: 'opacity',
      color: 'color',
      backgroundColor: 'background-color',
      slideVertical: 'transform',
    };

    return `${propertyMap[property]} ${duration} ${easing}`;
  },

  /**
   * Apply motion preferences to element
   */
  applyMotionPreferences: (element: HTMLElement): void => {
    if (motionUtils.prefersReducedMotion()) {
      element.style.animationDuration = motionTokens.reducedMotion.duration;
      element.style.transitionDuration = motionTokens.reducedMotion.duration;
    }
  },
} as const;
