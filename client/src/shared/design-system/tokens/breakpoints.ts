/**
 * Breakpoint System - Responsive design foundation
 * Mobile-first approach with consistent breakpoints
 */

export const breakpointTokens = {
  // Breakpoint values
  values: {
    xs: '0px',      // Extra small devices
    sm: '640px',    // Small devices (phones)
    md: '768px',    // Medium devices (tablets)
    lg: '1024px',   // Large devices (laptops)
    xl: '1280px',   // Extra large devices (desktops)
    '2xl': '1536px', // 2X large devices (large desktops)
  },

  // Media queries
  media: {
    xs: '@media (min-width: 0px)',
    sm: '@media (min-width: 640px)',
    md: '@media (min-width: 768px)',
    lg: '@media (min-width: 1024px)',
    xl: '@media (min-width: 1280px)',
    '2xl': '@media (min-width: 1536px)',
  },

  // Max-width media queries (for mobile-first overrides)
  maxMedia: {
    xs: '@media (max-width: 639px)',
    sm: '@media (max-width: 767px)',
    md: '@media (max-width: 1023px)',
    lg: '@media (max-width: 1279px)',
    xl: '@media (max-width: 1535px)',
  },

  // Container max-widths
  container: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Responsive utilities
export const responsiveUtils = {
  /**
   * Get media query for breakpoint
   */
  getMediaQuery: (breakpoint: keyof typeof breakpointTokens.values): string => {
    return breakpointTokens.media[breakpoint];
  },

  /**
   * Check if breakpoint is mobile
   */
  isMobile: (breakpoint: keyof typeof breakpointTokens.values): boolean => {
    return breakpoint === 'xs' || breakpoint === 'sm';
  },

  /**
   * Get container width for breakpoint
   */
  getContainerWidth: (breakpoint: keyof typeof breakpointTokens.container): string => {
    return breakpointTokens.container[breakpoint];
  },
} as const;

