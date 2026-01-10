/**
 * Responsive Utils Module
 *
 * Utility class for managing responsive layouts and breakpoints.
 * Provides methods for creating responsive styles and checking breakpoint states.
 *
 * @module core/mobile/responsive-utils
 */

import { MOBILE_BREAKPOINTS } from '../../config';
import { logger } from '@client/shared/utils/logger';

import type { ResponsiveBreakpoints } from './types';

/**
 * Utility class for managing responsive layouts and breakpoints.
 */
export class ResponsiveUtils {
  private static instance: ResponsiveUtils;
  private mediaQueries: Map<string, MediaQueryList> = new Map();

  private getBreakpointValue(key: keyof ResponsiveBreakpoints): number {
    const upperKey = key.toUpperCase() as keyof typeof MOBILE_BREAKPOINTS;
    return MOBILE_BREAKPOINTS[upperKey];
  }

  private getBreakpointsMap(): ResponsiveBreakpoints {
    return {
      xs: MOBILE_BREAKPOINTS.XS,
      sm: MOBILE_BREAKPOINTS.SM,
      md: MOBILE_BREAKPOINTS.MD,
      lg: MOBILE_BREAKPOINTS.LG,
      xl: MOBILE_BREAKPOINTS.XL,
      '2xl': MOBILE_BREAKPOINTS['2XL'],
    };
  }

  private constructor() {
    this.setupMediaQueries();
  }

  static getInstance(): ResponsiveUtils {
    if (!ResponsiveUtils.instance) {
      ResponsiveUtils.instance = new ResponsiveUtils();
    }
    return ResponsiveUtils.instance;
  }

  /**
   * Sets up MediaQueryList objects for efficient breakpoint monitoring
   */
  private setupMediaQueries(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    Object.entries(this.getBreakpointsMap()).forEach(([name, width]) => {
      if (width > 0) {
        const mq = window.matchMedia(`(min-width: ${width}px)`);
        this.mediaQueries.set(name, mq);
      }
    });
  }

  getBreakpoints(): Readonly<ResponsiveBreakpoints> {
    return { ...this.getBreakpointsMap() };
  }

  getCurrentBreakpoint(): keyof ResponsiveBreakpoints {
    if (typeof window === 'undefined') return 'lg';

    const width = window.innerWidth;
    const breakpoints = Object.entries(this.getBreakpointsMap()).sort(([, a], [, b]) => b - a);

    for (const [name, minWidth] of breakpoints) {
      if (width >= minWidth) {
        return name as keyof ResponsiveBreakpoints;
      }
    }

    return 'xs';
  }

  isBreakpoint(breakpoint: keyof ResponsiveBreakpoints): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  isBreakpointUp(breakpoint: keyof ResponsiveBreakpoints): boolean {
    if (typeof window === 'undefined') return true;

    const mq = this.mediaQueries.get(breakpoint);
    if (mq) return mq.matches;

    return window.innerWidth >= this.getBreakpointValue(breakpoint);
  }

  isBreakpointDown(breakpoint: keyof ResponsiveBreakpoints): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < this.getBreakpointValue(breakpoint);
  }

  /**
   * Registers a callback for when a specific breakpoint becomes active or inactive
   */
  onBreakpointChange(
    breakpoint: keyof ResponsiveBreakpoints,
    callback: (matches: boolean) => void
  ): () => void {
    const mq = this.mediaQueries.get(breakpoint);
    if (!mq) {
      logger.warn(`No media query for breakpoint: ${breakpoint}`);
      return () => {};
    }

    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    mq.addEventListener('change', handler);

    // Return cleanup function
    return () => mq.removeEventListener('change', handler);
  }

  /**
   * Creates a style object based on the current breakpoint.
   * Applies styles progressively from smallest to current breakpoint.
   */
  createResponsiveStyles(
    styles: Partial<Record<keyof ResponsiveBreakpoints, Record<string, unknown>>>
  ): Record<string, unknown> {
    const currentBreakpoint = this.getCurrentBreakpoint();
    const breakpointOrder: (keyof ResponsiveBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

    let finalStyles: Record<string, unknown> = {};

    for (const bp of breakpointOrder) {
      if (styles[bp]) {
        finalStyles = { ...finalStyles, ...styles[bp] };
      }
      if (bp === currentBreakpoint) break;
    }

    return finalStyles;
  }

  generateMediaQuery(
    breakpoint: keyof ResponsiveBreakpoints,
    direction: 'up' | 'down' = 'up'
  ): string {
    const width = this.getBreakpointValue(breakpoint);
    return direction === 'up'
      ? `@media (min-width: ${width}px)`
      : `@media (max-width: ${width - 1}px)`;
  }

  /**
   * Returns a number value based on current breakpoint from provided map
   */
  getResponsiveValue<T>(values: Partial<Record<keyof ResponsiveBreakpoints, T>>): T | undefined {
    const currentBp = this.getCurrentBreakpoint();
    const breakpointOrder: (keyof ResponsiveBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

    let result: T | undefined;

    for (const bp of breakpointOrder) {
      if (values[bp] !== undefined) {
        result = values[bp];
      }
      if (bp === currentBp) break;
    }

    return result;
  }
}

// Singleton instance
export const responsiveUtils = ResponsiveUtils.getInstance();
