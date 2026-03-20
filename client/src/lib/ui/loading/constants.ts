/**
 * Loading component constants
 * Following navigation component patterns for constants
 */

import type { LoadingConfig, LoadingSize, LoadingType, LoadingPriority } from '../../types';

export const DEFAULT_LOADING_SIZE: LoadingSize = 'md';
export const DEFAULT_LOADING_TYPE: LoadingType = 'component';
export const DEFAULT_LOADING_PRIORITY: LoadingPriority = 'medium';

export const LOADING_SIZES: Record<LoadingSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
} as const;

export const LOADING_TIMEOUTS = {
  SHORT: 5000, // 5 seconds
  MEDIUM: 15000, // 15 seconds
  LONG: 30000, // 30 seconds
  EXTENDED: 60000, // 1 minute
} as const;

export const RETRY_DELAYS = {
  IMMEDIATE: 0,
  SHORT: 1000, // 1 second
  MEDIUM: 3000, // 3 seconds
  LONG: 5000, // 5 seconds
} as const;

export const MAX_RETRIES = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
} as const;

export const CONNECTION_THRESHOLDS = {
  SLOW_CONNECTION_RTT: 1000, // 1 second RTT
  SLOW_CONNECTION_DOWNLINK: 1.5, // 1.5 Mbps
  OFFLINE_TIMEOUT: 5000, // 5 seconds to consider offline
} as const;

export const PROGRESS_PHASES = {
  PRELOAD: 'preload',
  CRITICAL: 'critical',
  LAZY: 'lazy',
  COMPLETE: 'complete',
} as const;

export const DEFAULT_LOADING_CONFIG: LoadingConfig = {
  timeout: LOADING_TIMEOUTS.MEDIUM,
  retryDelay: RETRY_DELAYS.MEDIUM,
  maxRetries: MAX_RETRIES.MEDIUM,
  showProgress: true,
  enableCaching: false,
  priority: 'normal',
};

export const LOADING_MESSAGES = {
  DEFAULT: 'Loading...',
  PAGE: 'Loading page...',
  COMPONENT: 'Loading component...',
  ASSET: 'Loading assets...',
  DATA: 'Loading data...',
  NETWORK_SLOW: 'Loading... (slow connection detected)',
  OFFLINE: 'You appear to be offline',
  TIMEOUT: 'This is taking longer than expected...',
  RETRY: 'Retrying...',
  FAILED: 'Loading failed',
  SUCCESS: 'Loaded successfully',
} as const;

export const LOADING_STAGES = {
  INITIALIZATION: {
    id: 'initialization',
    message: 'Initializing...',
    duration: 1000,
  },
  AUTHENTICATION: {
    id: 'authentication',
    message: 'Authenticating...',
    duration: 2000,
  },
  DATA_FETCH: {
    id: 'data-fetch',
    message: 'Fetching data...',
    duration: 3000,
  },
  ASSET_LOAD: {
    id: 'asset-load',
    message: 'Loading assets...',
    duration: 2000,
  },
  RENDERING: {
    id: 'rendering',
    message: 'Rendering content...',
    duration: 1000,
  },
  FINALIZATION: {
    id: 'finalization',
    message: 'Finalizing...',
    duration: 500,
  },
} as const;

export const POSITION_CLASSES = {
  'top-right': 'fixed top-4 right-4 z-50',
  'top-left': 'fixed top-4 left-4 z-50',
  'bottom-right': 'fixed bottom-4 right-4 z-50',
  'bottom-left': 'fixed bottom-4 left-4 z-50',
  center: 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50',
} as const;

export const SKELETON_VARIANTS = {
  TEXT: 'text',
  CARD: 'card',
  LIST: 'list',
  AVATAR: 'avatar',
  BUTTON: 'button',
  IMAGE: 'image',
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const Z_INDEX_LAYERS = {
  LOADING_OVERLAY: 40,
  LOADING_INDICATOR: 50,
  LOADING_MODAL: 60,
} as const;

export const ACCESSIBILITY_LABELS = {
  LOADING: 'Loading content',
  PROGRESS: 'Loading progress',
  RETRY: 'Retry loading',
  CANCEL: 'Cancel loading',
  SKIP: 'Skip current step',
  ERROR: 'Loading error',
  SUCCESS: 'Loading completed',
} as const;

export const LOADING_PRIORITIES: Record<LoadingPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

export const CONNECTION_TYPES = {
  FAST: 'fast',
  SLOW: 'slow',
  OFFLINE: 'offline',
} as const;

export const LOADING_STATES = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  TIMEOUT: 'timeout',
  OFFLINE: 'offline',
} as const;

export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  RESIZE: 100,
  SCROLL: 50,
  INPUT: 500,
} as const;
