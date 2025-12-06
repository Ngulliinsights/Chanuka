/**
 * useScrollManager - Manages scroll-dependent behaviors
 * Handles header visibility and scroll-to-top button state
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { GESTURE_CONFIG } from '@client/config/gestures';

interface UseScrollManagerOptions {
  isEnabled: boolean;
  showScrollToTop: boolean;
  scrollTopThreshold?: number;
  headerToggleThreshold?: number;
}

export function useScrollManager({
  isEnabled,
  showScrollToTop,
  scrollTopThreshold = GESTURE_CONFIG.SCROLL.scrollTopButtonThreshold,
  headerToggleThreshold = GESTURE_CONFIG.SCROLL.headerToggleThreshold,
}: UseScrollManagerOptions) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);

  const handleScroll = useCallback(() => {
    if (!isEnabled) return;

    const currentScrollY = window.scrollY;
    const deltaScroll = currentScrollY - lastScrollY.current;

    // Simple velocity calculation
    scrollVelocity.current = deltaScroll;

    // Scroll-to-top button visibility
    if (showScrollToTop) {
      setShowScrollTop(currentScrollY > scrollTopThreshold);
    }

    // Header auto-hide behavior
    const scrollingDown = scrollVelocity.current > 0;
    const scrollDelta = Math.abs(deltaScroll);

    if (scrollDelta > headerToggleThreshold) {
      setHeaderVisible(!scrollingDown || currentScrollY < 50);
    }

    lastScrollY.current = currentScrollY;
  }, [isEnabled, showScrollToTop, scrollTopThreshold, headerToggleThreshold]);

  useEffect(() => {
    if (!isEnabled) return;

    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [isEnabled, handleScroll]);

  return { headerVisible, showScrollTop };
}
