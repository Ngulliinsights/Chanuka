/**
 * Responsive Design Utilities
 * Mobile-first responsive design helpers
 */

import { breakpointTokens } from '../tokens/breakpoints';

export type Breakpoint = keyof typeof breakpointTokens.values;

/**
 * Check if current viewport matches breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia(`(min-width: ${breakpointTokens.values[breakpoint]})`);
  return mediaQuery.matches;
}

/**
 * Get current breakpoint
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'xs';

  const width = window.innerWidth;

  if (width >= parseInt(breakpointTokens.values['2xl'])) return '2xl';
  if (width >= parseInt(breakpointTokens.values.xl)) return 'xl';
  if (width >= parseInt(breakpointTokens.values.lg)) return 'lg';
  if (width >= parseInt(breakpointTokens.values.md)) return 'md';
  if (width >= parseInt(breakpointTokens.values.sm)) return 'sm';

  return 'xs';
}

/**
 * Check if viewport is mobile
 */
export function isMobile(): boolean {
  const breakpoint = getCurrentBreakpoint();
  return breakpoint === 'xs' || breakpoint === 'sm';
}

/**
 * Check if viewport is tablet
 */
export function isTablet(): boolean {
  const breakpoint = getCurrentBreakpoint();
  return breakpoint === 'md';
}

/**
 * Check if viewport is desktop
 */
export function isDesktop(): boolean {
  const breakpoint = getCurrentBreakpoint();
  return breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';
}

/**
 * Responsive value selector
 */
export function getResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, fallback: T): T {
  const currentBreakpoint = getCurrentBreakpoint();

  // Check current breakpoint first
  if (values[currentBreakpoint]) {
    return values[currentBreakpoint]!;
  }

  // Fall back to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp]) {
      return values[bp]!;
    }
  }

  return fallback;
}

/**
 * Create responsive CSS classes
 */
export function createResponsiveClasses(
  property: string,
  values: Partial<Record<Breakpoint, string>>
): string {
  const classes: string[] = [];

  Object.entries(values).forEach(([breakpoint, value]) => {
    if (breakpoint === 'xs') {
      classes.push(`${property}-${value}`);
    } else {
      classes.push(`${breakpoint}:${property}-${value}`);
    }
  });

  return classes.join(' ');
}

/**
 * Responsive container utilities
 */
export const containerUtils = {
  /**
   * Get container padding for current breakpoint
   */
  getPadding(): string {
    const breakpoint = getCurrentBreakpoint();

    switch (breakpoint) {
      case 'xs':
      case 'sm':
        return 'px-4'; // 16px
      case 'md':
        return 'px-6'; // 24px
      case 'lg':
      case 'xl':
      case '2xl':
        return 'px-8'; // 32px
      default:
        return 'px-4';
    }
  },

  /**
   * Get container max-width for breakpoint
   */
  getMaxWidth(breakpoint: Breakpoint = getCurrentBreakpoint()): string {
    return breakpointTokens.container[breakpoint] || '100%';
  },

  /**
   * Generate responsive container classes
   */
  getContainerClasses(): string {
    return 'w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl';
  },
};

/**
 * Grid utilities for responsive layouts
 */
export const gridUtils = {
  /**
   * Create responsive grid columns
   */
  createResponsiveGrid(columns: Partial<Record<Breakpoint, number>>): string {
    return createResponsiveClasses(
      'grid-cols',
      Object.fromEntries(Object.entries(columns).map(([bp, cols]) => [bp, cols.toString()]))
    );
  },

  /**
   * Create responsive gap classes
   */
  createResponsiveGap(gaps: Partial<Record<Breakpoint, string>>): string {
    return createResponsiveClasses('gap', gaps);
  },

  /**
   * Get optimal columns for content
   */
  getOptimalColumns(itemCount: number): Partial<Record<Breakpoint, number>> {
    if (itemCount <= 1) return { xs: 1 };
    if (itemCount <= 2) return { xs: 1, sm: 2 };
    if (itemCount <= 3) return { xs: 1, sm: 2, md: 3 };
    if (itemCount <= 4) return { xs: 1, sm: 2, lg: 4 };

    return { xs: 1, sm: 2, md: 3, lg: 4 };
  },
};

/**
 * Typography responsive utilities
 */
export const typographyUtils = {
  /**
   * Create responsive text size classes
   */
  createResponsiveText(sizes: Partial<Record<Breakpoint, string>>): string {
    return createResponsiveClasses('text', sizes);
  },

  /**
   * Get optimal text size for content type
   */
  getOptimalTextSize(type: 'heading' | 'body' | 'caption'): Partial<Record<Breakpoint, string>> {
    switch (type) {
      case 'heading':
        return { xs: 'xl', sm: '2xl', md: '3xl', lg: '4xl' };
      case 'body':
        return { xs: 'sm', sm: 'base', md: 'lg' };
      case 'caption':
        return { xs: 'xs', sm: 'sm' };
      default:
        return { xs: 'base' };
    }
  },
};
