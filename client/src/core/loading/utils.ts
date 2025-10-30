/**
 * Client Loading Utilities - Helper functions for loading operations
 */

import { LoadingType, LoadingPriority, LoadingOperation } from './types';
import { 
  getAdjustedTimeout,
  calculateRetryDelay as coreCalculateRetryDelay,
  sortOperationsByPriority,
  filterOperationsByConnection,
  analyzeLoadingPerformance,
  createOperationFromScenario
} from '../../utils/comprehensiveLoading';

// Re-export cross-cutting utilities
export const calculateEstimatedTime = (operation: LoadingOperation) => operation.estimatedTime || 5000;
export const getConnectionMultiplier = (connectionType: string) => connectionType === 'slow' ? 2 : 1;
export const calculateRetryDelay = coreCalculateRetryDelay;
export const formatLoadingTime = (ms: number) => `${Math.round(ms / 1000)}s`;
export const hasOperationTimedOut = (operation: LoadingOperation, currentTime: number) => 
  currentTime - operation.startTime > (operation.timeout || 10000);
export const shouldShowTimeoutWarning = (operation: LoadingOperation, currentTime: number) =>
  currentTime - operation.startTime > (operation.timeout || 10000) * 0.8;

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

