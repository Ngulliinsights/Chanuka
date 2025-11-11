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
export const civicColors = {
  urgent: '0 84% 60%',
  constitutional: '45 93% 47%',
  expert: '217 91% 60%',
  community: '142 76% 36%',
  transparency: '262 83% 58%',
} as const;

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
export const containerSizes = {
  mobile: '100%',
  'mobile-sm': '100%',
  'mobile-lg': '100%',
  tablet: '640px',
  'tablet-lg': '768px',
  laptop: '1024px',
  'laptop-lg': '1280px',
  desktop: '1440px',
  'desktop-xl': '1920px',
} as const;

// Spacing scale that adapts to screen size
export const responsiveSpacing = {
  // Base spacing (mobile)
  xs: {
    mobile: '0.25rem', // 4px
    tablet: '0.375rem', // 6px
    laptop: '0.5rem', // 8px
  },
  sm: {
    mobile: '0.5rem', // 8px
    tablet: '0.75rem', // 12px
    laptop: '1rem', // 16px
  },
  md: {
    mobile: '1rem', // 16px
    tablet: '1.25rem', // 20px
    laptop: '1.5rem', // 24px
  },
  lg: {
    mobile: '1.5rem', // 24px
    tablet: '2rem', // 32px
    laptop: '2.5rem', // 40px
  },
  xl: {
    mobile: '2rem', // 32px
    tablet: '3rem', // 48px
    laptop: '4rem', // 64px
  },
  '2xl': {
    mobile: '3rem', // 48px
    tablet: '4rem', // 64px
    laptop: '6rem', // 96px
  },
} as const;

// Typography scale that adapts to screen size
export const responsiveTypography = {
  'text-xs': {
    mobile: { fontSize: '0.75rem', lineHeight: '1rem' }, // 12px
    tablet: { fontSize: '0.8125rem', lineHeight: '1.125rem' }, // 13px
    laptop: { fontSize: '0.875rem', lineHeight: '1.25rem' }, // 14px
  },
  'text-sm': {
    mobile: { fontSize: '0.875rem', lineHeight: '1.25rem' }, // 14px
    tablet: { fontSize: '0.9375rem', lineHeight: '1.375rem' }, // 15px
    laptop: { fontSize: '1rem', lineHeight: '1.5rem' }, // 16px
  },
  'text-base': {
    mobile: { fontSize: '1rem', lineHeight: '1.5rem' }, // 16px
    tablet: { fontSize: '1.0625rem', lineHeight: '1.625rem' }, // 17px
    laptop: { fontSize: '1.125rem', lineHeight: '1.75rem' }, // 18px
  },
  'text-lg': {
    mobile: { fontSize: '1.125rem', lineHeight: '1.75rem' }, // 18px
    tablet: { fontSize: '1.25rem', lineHeight: '1.875rem' }, // 20px
    laptop: { fontSize: '1.375rem', lineHeight: '2rem' }, // 22px
  },
  'text-xl': {
    mobile: { fontSize: '1.25rem', lineHeight: '1.75rem' }, // 20px
    tablet: { fontSize: '1.5rem', lineHeight: '2rem' }, // 24px
    laptop: { fontSize: '1.75rem', lineHeight: '2.25rem' }, // 28px
  },
  'text-2xl': {
    mobile: { fontSize: '1.5rem', lineHeight: '2rem' }, // 24px
    tablet: { fontSize: '1.875rem', lineHeight: '2.25rem' }, // 30px
    laptop: { fontSize: '2.25rem', lineHeight: '2.5rem' }, // 36px
  },
  'text-3xl': {
    mobile: { fontSize: '1.875rem', lineHeight: '2.25rem' }, // 30px
    tablet: { fontSize: '2.25rem', lineHeight: '2.5rem' }, // 36px
    laptop: { fontSize: '3rem', lineHeight: '1' }, // 48px
  },
  'text-4xl': {
    mobile: { fontSize: '2.25rem', lineHeight: '2.5rem' }, // 36px
    tablet: { fontSize: '3rem', lineHeight: '1' }, // 48px
    laptop: { fontSize: '3.75rem', lineHeight: '1' }, // 60px
  },
} as const;

// Touch-friendly minimum sizes
export const touchTargets = {
  // Minimum touch target size (44px recommended by Apple, 48px by Google)
  minSize: '44px',
  recommendedSize: '48px',
  
  // Touch target spacing
  minSpacing: '8px',
  recommendedSpacing: '12px',
  
  // Button sizes
  button: {
    small: { minHeight: '36px', minWidth: '36px', padding: '0.5rem 0.75rem' },
    medium: { minHeight: '44px', minWidth: '44px', padding: '0.75rem 1rem' },
    large: { minHeight: '48px', minWidth: '48px', padding: '1rem 1.5rem' },
  },
  
  // Form control sizes
  input: {
    small: { minHeight: '36px', padding: '0.5rem 0.75rem' },
    medium: { minHeight: '44px', padding: '0.75rem 1rem' },
    large: { minHeight: '48px', padding: '1rem 1.25rem' },
  },
} as const;

// Grid system configuration
export const gridSystem = {
  // Column counts for different breakpoints
  columns: {
    mobile: 1,
    'mobile-lg': 2,
    tablet: 2,
    'tablet-lg': 3,
    laptop: 4,
    'laptop-lg': 6,
    desktop: 8,
    'desktop-xl': 12,
  },
  
  // Gap sizes
  gaps: {
    mobile: '1rem',
    tablet: '1.5rem',
    laptop: '2rem',
    desktop: '2.5rem',
  },
  
  // Container padding
  containerPadding: {
    mobile: '1rem',
    tablet: '1.5rem',
    laptop: '2rem',
    desktop: '2.5rem',
  },
} as const;

// Layout patterns for common components
export const layoutPatterns = {
  // Stack layout (vertical)
  stack: {
    mobile: { flexDirection: 'column', gap: '1rem' },
    tablet: { flexDirection: 'column', gap: '1.5rem' },
    laptop: { flexDirection: 'column', gap: '2rem' },
  },
  
  // Inline layout (horizontal)
  inline: {
    mobile: { flexDirection: 'column', gap: '0.5rem' },
    tablet: { flexDirection: 'row', gap: '1rem' },
    laptop: { flexDirection: 'row', gap: '1.5rem' },
  },
  
  // Sidebar layout
  sidebar: {
    mobile: { flexDirection: 'column' },
    tablet: { flexDirection: 'row', gap: '1.5rem' },
    laptop: { flexDirection: 'row', gap: '2rem' },
  },
  
  // Card grid
  cardGrid: {
    mobile: { gridTemplateColumns: '1fr', gap: '1rem' },
    'mobile-lg': { gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
    tablet: { gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' },
    'tablet-lg': { gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' },
    laptop: { gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' },
  },
} as const;

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
      'desktop-xl', 'desktop', 'laptop-lg', 'laptop', 
      'tablet-lg', 'tablet', 'mobile-lg', 'mobile-sm', 'mobile'
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
export const createResponsiveStyles = (
  styles: Partial<Record<keyof typeof breakpoints, React.CSSProperties>>
): React.CSSProperties => {
  const currentBreakpoint = responsiveUtils.getCurrentBreakpoint();
  return responsiveUtils.getResponsiveValue(styles) || {};
};

// Hook for responsive behavior
export const useResponsive = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<keyof typeof breakpoints>('mobile');
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
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
    isMobile: currentBreakpoint === 'mobile' || currentBreakpoint === 'mobile-sm' || currentBreakpoint === 'mobile-lg',
    matchesBreakpoint: responsiveUtils.matchesBreakpoint,
    getResponsiveValue: responsiveUtils.getResponsiveValue,
  };
};

// Type definitions
export type Breakpoint = keyof typeof breakpoints;
export type ResponsiveValue<T> = Partial<Record<Breakpoint, T>>;

