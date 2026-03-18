/**
 * Responsive Design System
 *
 * Mobile-first responsive design system with consistent breakpoints,
 * adaptive layouts, touch-friendly interactions, and visual hierarchy.
 *
 * Requirements: 9.1, 9.5
 */

import React from 'react';

// Civic Color Constants (HSL values matching CSS custom properties)
export 
// Breakpoint definitions following mobile-first approach
export const breakpoints = {
  // Mobile devices (default, no prefix needed)
  mobile: '0px',

  // Small mobile devices
  'mobile-sm': '320px',

  // Large mobile devices / small tablets
  'mobile-lg': '480px',

  // Tablets
  tablet: '640px',

  // Large tablets / small laptops
  'tablet-lg': '768px',

  // Laptops / small desktops
  laptop: '1024px',

  // Large laptops / desktops
  'laptop-lg': '1280px',

  // Large desktops
  desktop: '1440px',

  // Ultra-wide displays
  'desktop-xl': '1920px',
} as const;

// Breakpoint utilities for JavaScript usage
export const mediaQueries = {
  mobile: `(min-width: ${breakpoints.mobile})`,
  'mobile-sm': `(min-width: ${breakpoints['mobile-sm']})`,
  'mobile-lg': `(min-width: ${breakpoints['mobile-lg']})`,
  tablet: `(min-width: ${breakpoints.tablet})`,
  'tablet-lg': `(min-width: ${breakpoints['tablet-lg']})`,
  laptop: `(min-width: ${breakpoints.laptop})`,
  'laptop-lg': `(min-width: ${breakpoints['laptop-lg']})`,
  desktop: `(min-width: ${breakpoints.desktop})`,
  'desktop-xl': `(min-width: ${breakpoints['desktop-xl']})`,

  // Max-width queries for mobile-first approach
  'max-mobile-lg': `(max-width: ${parseInt(breakpoints['mobile-lg']) - 1}px)`,
  'max-tablet': `(max-width: ${parseInt(breakpoints.tablet) - 1}px)`,
  'max-tablet-lg': `(max-width: ${parseInt(breakpoints['tablet-lg']) - 1}px)`,
  'max-laptop': `(max-width: ${parseInt(breakpoints.laptop) - 1}px)`,

  // Orientation queries
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)',

  // Touch device detection
  touch: '(hover: none) and (pointer: coarse)',
  'no-touch': '(hover: hover) and (pointer: fine)',

  // High DPI displays
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',

  // Reduced motion preference
  'reduced-motion': '(prefers-reduced-motion: reduce)',

  // High contrast preference
  'high-contrast': '(prefers-contrast: high)',
} as const;

// Container max-widths for different breakpoints
export 
// Spacing scale that adapts to screen size
export 
// Typography scale that adapts to screen size
export 
// Touch-friendly minimum sizes
export 
// Grid system configuration
export 
// Layout patterns for common components
export 
// Utility functions for responsive design
export const responsiveUtils = {
  // Check if current viewport matches a breakpoint
  matchesBreakpoint: (breakpoint: keyof typeof breakpoints): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQueries[breakpoint]).matches;
  },

  // Check if device supports touch
  isTouchDevice: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQueries.touch).matches;
  },

  // Check if user prefers reduced motion
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQueries['reduced-motion']).matches;
  },

  // Check if user prefers high contrast
  prefersHighContrast: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(mediaQueries['high-contrast']).matches;
  },

  // Get current breakpoint
  getCurrentBreakpoint: (): keyof typeof breakpoints => {
    if (typeof window === 'undefined') return 'mobile';

    const width = window.innerWidth;

    if (width >= parseInt(breakpoints['desktop-xl'])) return 'desktop-xl';
    if (width >= parseInt(breakpoints.desktop)) return 'desktop';
    if (width >= parseInt(breakpoints['laptop-lg'])) return 'laptop-lg';
    if (width >= parseInt(breakpoints.laptop)) return 'laptop';
    if (width >= parseInt(breakpoints['tablet-lg'])) return 'tablet-lg';
    if (width >= parseInt(breakpoints.tablet)) return 'tablet';
    if (width >= parseInt(breakpoints['mobile-lg'])) return 'mobile-lg';
    if (width >= parseInt(breakpoints['mobile-sm'])) return 'mobile-sm';

    return 'mobile';
  },

  // Get responsive value based on current breakpoint
  getResponsiveValue: <T>(values: Partial<Record<keyof typeof breakpoints, T>>): T | undefined => {
    const currentBreakpoint = responsiveUtils.getCurrentBreakpoint();

    // Try to find exact match first
    if (values[currentBreakpoint]) {
      return values[currentBreakpoint];
    }

    // Fall back to smaller breakpoints
    const breakpointOrder: (keyof typeof breakpoints)[] = [
      'desktop-xl',
      'desktop',
      'laptop-lg',
      'laptop',
      'tablet-lg',
      'tablet',
      'mobile-lg',
      'mobile-sm',
      'mobile',
    ];

    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (values[breakpoint]) {
        return values[breakpoint];
      }
    }

    return undefined;
  },
} as const;

// CSS-in-JS helper for responsive styles
export };

// Hook for responsive behavior
export   const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const updateBreakpoint = () => {
      setCurrentBreakpoint(responsiveUtils.getCurrentBreakpoint());
    };

    const updateTouchDevice = () => {
      setIsTouchDevice(responsiveUtils.isTouchDevice());
    };

    const updateReducedMotion = () => {
      setPrefersReducedMotion(responsiveUtils.prefersReducedMotion());
    };

    // Initial setup
    updateBreakpoint();
    updateTouchDevice();
    updateReducedMotion();

    // Listen for changes
    window.addEventListener('resize', updateBreakpoint);

    const touchMediaQuery = window.matchMedia(mediaQueries.touch);
    const motionMediaQuery = window.matchMedia(mediaQueries['reduced-motion']);

    touchMediaQuery.addEventListener('change', updateTouchDevice);
    motionMediaQuery.addEventListener('change', updateReducedMotion);

    return () => {
      window.removeEventListener('resize', updateBreakpoint);
      touchMediaQuery.removeEventListener('change', updateTouchDevice);
      motionMediaQuery.removeEventListener('change', updateReducedMotion);
    };
  }, []);

  return {
    currentBreakpoint,
    isTouchDevice,
    prefersReducedMotion,
    isDesktop: currentBreakpoint === 'desktop' || currentBreakpoint === 'desktop-xl',
    isTablet: currentBreakpoint === 'tablet' || currentBreakpoint === 'tablet-lg',
    isMobile:
      currentBreakpoint === 'mobile' ||
      currentBreakpoint === 'mobile-sm' ||
      currentBreakpoint === 'mobile-lg',
    matchesBreakpoint: responsiveUtils.matchesBreakpoint,
    getResponsiveValue: responsiveUtils.getResponsiveValue,
  };
};

// Type definitions
export type Breakpoint = keyof typeof breakpoints;
export type ResponsiveValue<T> = Partial<Record<Breakpoint, T>>;
