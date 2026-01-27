/**
 * Centralized gesture configuration constants
 * Single source of truth for all touch interaction thresholds
 */

export const GESTURE_CONFIG = {
  SWIPE: {
    minDistance: 50,
    maxVerticalDeviation: 0.5,
    velocityThreshold: 0.3,
    maxDuration: 1000,
  },
  PULL_TO_REFRESH: {
    threshold: 80,
    maxPullDistance: 120,
    resistance: 0.5,
  },
  SCROLL: {
    headerToggleThreshold: 10,
    scrollTopButtonThreshold: 300,
    velocitySmoothing: 0.2,
  },
} as const;

export type GestureConfig = typeof GESTURE_CONFIG;
