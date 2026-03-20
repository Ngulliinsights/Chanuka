/**
 * Gestures Configuration
 * Defines gesture recognition settings for mobile interactions
 */

export interface GestureConfig {
  swipeThreshold: number;
  swipeVelocity: number;
  pullToRefreshThreshold: number;
  longPressDelay: number;
  PULL_TO_REFRESH: {
    threshold: number;
    maxPullDistance: number;
    resistance: number;
  };
  SWIPE: {
    threshold: number;
    velocity: number;
    timeout: number;
    minDistance: number;
    velocityThreshold: number;
    maxDuration: number;
  };
  SCROLL: {
    debounceMs: number;
    throttleMs: number;
    scrollTopButtonThreshold: number;
    headerToggleThreshold: number;
  };
}

export const gestureConfig: GestureConfig = {
  swipeThreshold: 50,
  swipeVelocity: 0.3,
  pullToRefreshThreshold: 80,
  longPressDelay: 500,
  PULL_TO_REFRESH: {
    threshold: 80,
    maxPullDistance: 150,
    resistance: 0.5,
  },
  SWIPE: {
    threshold: 50,
    velocity: 0.3,
    timeout: 300,
    minDistance: 50,
    velocityThreshold: 0.3,
    maxDuration: 300,
  },
  SCROLL: {
    debounceMs: 150,
    throttleMs: 100,
    scrollTopButtonThreshold: 300,
    headerToggleThreshold: 100,
  },
};

export default gestureConfig;


export const GESTURE_CONFIG = gestureConfig;
