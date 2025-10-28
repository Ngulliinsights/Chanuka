/**
 * Client Loading Utilities - Helper functions for loading operations
 */

import { LoadingType, LoadingPriority } from './types';
import { 
  calculateEstimatedTime as coreCalculateEstimatedTime,
  getConnectionMultiplier as coreGetConnectionMultiplier,
  calculateRetryDelay as coreCalculateRetryDelay,
  formatLoadingTime as coreFormatLoadingTime,
  hasOperationTimedOut as coreHasOperationTimedOut,
  shouldShowTimeoutWarning as coreShowTimeoutWarning
} from '@shared/core/src/utils/loading-utils';

// Re-export cross-cutting utilities
export const calculateEstimatedTime = coreCalculateEstimatedTime;
export const getConnectionMultiplier = coreGetConnectionMultiplier;
export const calculateRetryDelay = coreCalculateRetryDelay;
export const formatLoadingTime = coreFormatLoadingTime;
export const hasOperationTimedOut = coreHasOperationTimedOut;
export const shouldShowTimeoutWarning = coreShowTimeoutWarning;

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

