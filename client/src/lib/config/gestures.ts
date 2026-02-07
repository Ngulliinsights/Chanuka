/**
 * Gestures Configuration
 * Defines gesture recognition settings for mobile interactions
 */

export interface GestureConfig {
  swipeThreshold: number;
  swipeVelocity: number;
  pullToRefreshThreshold: number;
  longPressDelay: number;
}

export const gestureConfig: GestureConfig = {
  swipeThreshold: 50,
  swipeVelocity: 0.3,
  pullToRefreshThreshold: 80,
  longPressDelay: 500,
};

export default gestureConfig;


export const GESTURE_CONFIG = gestureConfig;
