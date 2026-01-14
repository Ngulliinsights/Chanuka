/**
 * useMobile Hook
 *
 * Detects if the viewport is mobile-sized
 * Default breakpoint: 768px (tablet and below)
 */

import { useMediaQuery } from './useMediaQuery';

interface UseMobileOptions {
  /** Custom breakpoint in pixels (default: 768) */
  breakpoint?: number;
}

export function useMobile(options?: UseMobileOptions): boolean {
  const breakpoint = options?.breakpoint ?? 768;
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

/**
 * Additional responsive hooks for common breakpoints
 */

/** Detects tablet-sized viewports (768px - 1024px) */
export function useTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/** Detects desktop-sized viewports (1024px and above) */
export function useDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** Detects if device prefers dark mode */
export function usePrefersColorScheme(): 'light' | 'dark' {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return prefersDark ? 'dark' : 'light';
}

/** Detects if user prefers reduced motion */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
