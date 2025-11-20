/**
 * Cross-cutting Loading Utilities
 * Platform-agnostic utilities for loading operations
 */

// Base loading times for different operation types
export const BASE_LOADING_TIMES = Object.freeze({
  page: 2000,
  component: 3000,
  api: 4000,
  asset: 5000,
  progressive: 10000,
} as const);

/**
 * Calculate estimated time based on loading type and connection
 */
export function calculateEstimatedTime(
  type: keyof typeof BASE_LOADING_TIMES,
  connectionMultiplier: number = 1
): number {
  return BASE_LOADING_TIMES[type] * connectionMultiplier;
}

/**
 * Get connection multiplier based on connection type
 */
export function getConnectionMultiplier(connectionType?: string): number {
  switch (connectionType) {
    case 'offline': return 3;
    case 'slow': return 2;
    case 'fast': return 0.8;
    default: return 1;
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  baseDelay: number,
  retryCount: number,
  maxDelay: number = 30000
): number {
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * Format loading time for display
 */
export function formatLoadingTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Check if operation has timed out
 */
export function hasOperationTimedOut(
  startTime: number,
  timeout: number,
  currentTime: number = Date.now()
): boolean {
  return (currentTime - startTime) > timeout;
}

/**
 * Check if operation should show timeout warning
 */
export function shouldShowTimeoutWarning(
  startTime: number,
  timeout: number,
  warningThreshold: number,
  currentTime: number = Date.now()
): boolean {
  const elapsed = currentTime - startTime;
  const warningTime = timeout * warningThreshold;
  return elapsed > warningTime;
}



