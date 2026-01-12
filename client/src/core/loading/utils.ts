/**
 * Client Loading Utilities - Helper functions for loading operations
 */

import { LoadingType, LoadingPriority, LoadingOperation } from '@client/shared/types';

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_ESTIMATED_TIME = 5000;

// Re-export cross-cutting utilities
export const calculateEstimatedTime = (operation: LoadingOperation) =>
  DEFAULT_ESTIMATED_TIME;
export const getConnectionMultiplier = (connectionType: string) =>
  connectionType === 'slow' ? 2 : 1;
export const calculateRetryDelay = (attempt: number, baseDelay: number = 1000) =>
  Math.min(baseDelay * Math.pow(2, attempt), 30000);
export const formatLoadingTime = (ms: number) => `${Math.round(ms / 1000)}s`;
export const hasOperationTimedOut = (operation: LoadingOperation, currentTime: number) => {
  const opStartTime = operation.startTime;
  return currentTime - opStartTime > DEFAULT_TIMEOUT;
};
export const shouldShowTimeoutWarning = (operation: LoadingOperation, currentTime: number) => {
  const opStartTime = operation.startTime;
  return currentTime - opStartTime > DEFAULT_TIMEOUT * 0.8;
};

/**
 * Determine if operation should be skipped based on connection and priority
 */
export function shouldSkipOperation(
  isOnline: boolean,
  connectionType: string | undefined,
  priority: LoadingPriority
): boolean {
  if (!isOnline) return priority === 'low';
  if (connectionType === 'slow') return priority === 'low';
  return false;
}

/**
 * Safe timeout cleaner
 */
export function clearTimeoutSafe(timeout: NodeJS.Timeout | undefined): void {
  if (timeout) clearTimeout(timeout);
}

/**
 * Generate unique operation ID
 */
export function generateOperationId(type: LoadingType, identifier: string): string {
  return `${type}-${identifier}-${Date.now()}`;
}
