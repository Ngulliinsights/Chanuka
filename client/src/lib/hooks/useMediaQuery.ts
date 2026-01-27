/**
 * useMediaQuery Hook
 *
 * A hook for responsive design that listens to media query changes
 * Includes SSR support and debouncing for optimal performance
 */

import { useState, useEffect, useRef } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setMounted(true);

    // SSR guard
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Debounced listener to prevent excessive re-renders during resize
    const listener = (event: MediaQueryListEvent) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setMatches(event.matches);
      }, 100);
    };

    // Add listener with fallback for older browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  // Return false until mounted on client to prevent hydration mismatch
  return mounted ? matches : false;
}
