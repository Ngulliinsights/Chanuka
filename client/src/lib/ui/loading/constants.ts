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

export 
export 
export const DEFAULT_LOADING_CONFIG: LoadingConfig = {
  timeout: LOADING_TIMEOUTS.MEDIUM,
  retryDelay: RETRY_DELAYS.MEDIUM,
  maxRetries: MAX_RETRIES.MEDIUM,
  showProgress: true,
  enableCaching: false,
  priority: 'normal',
};

export 
export 
export 
export 
export 
export 
export 
export const LOADING_PRIORITIES: Record<LoadingPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

export 
export 
export 