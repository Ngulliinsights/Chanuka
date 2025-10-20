/**
 * Loading utility functions
 * Following navigation component patterns for utility organization
 */

import { LoadingOperation, LoadingStage, LoadingProgress, LoadingPriority, LoadingType } from '../types';
import { LOADING_PRIORITIES, LOADING_TIMEOUTS, RETRY_DELAYS } from '../constants';
import { validateLoadingOperation, validateLoadingStage } from '../validation';

/**
 * Generate unique operation ID
 */
export function generateOperationId(type: LoadingType, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const typePrefix = type.replace('-', '_').toUpperCase();
  const customPrefix = prefix ? `${prefix}_` : '';
  
  return `${customPrefix}${typePrefix}_${timestamp}_${random}`;
}

/**
 * Create a loading operation with defaults
 */
export function createLoadingOperation(
  type: LoadingType,
  message: string,
  options: Partial<LoadingOperation> = {}
): LoadingOperation {
  const operation: LoadingOperation = {
    id: generateOperationId(type, options.id),
    type,
    message,
    priority: options.priority || 'medium',
    progress: options.progress,
    stage: options.stage,
    error: options.error,
    startTime: options.startTime || Date.now(),
    timeout: options.timeout || getDefaultTimeout(type),
    retryCount: options.retryCount || 0,
    maxRetries: options.maxRetries || 3,
    connectionAware: options.connectionAware ?? true,
  };

  return validateLoadingOperation(operation);
}

/**
 * Create a loading stage with defaults
 */
export function createLoadingStage(
  id: string,
  message: string,
  options: Partial<LoadingStage> = {}
): LoadingStage {
  const stage: LoadingStage = {
    id,
    message,
    duration: options.duration,
    retryable: options.retryable ?? true,
  };

  return validateLoadingStage(stage);
}

/**
 * Get default timeout for loading type
 */
export function getDefaultTimeout(type: LoadingType): number {
  switch (type) {
    case 'page':
      return LOADING_TIMEOUTS.LONG;
    case 'component':
      return LOADING_TIMEOUTS.MEDIUM;
    case 'inline':
      return LOADING_TIMEOUTS.SHORT;
    case 'progressive':
      return LOADING_TIMEOUTS.EXTENDED;
    case 'network-aware':
      return LOADING_TIMEOUTS.LONG;
    case 'timeout-aware':
      return LOADING_TIMEOUTS.MEDIUM;
    default:
      return LOADING_TIMEOUTS.MEDIUM;
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number, baseDelay: number = RETRY_DELAYS.MEDIUM): number {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
  return Math.min(exponentialDelay + jitter, RETRY_DELAYS.LONG * 2);
}

/**
 * Sort operations by priority
 */
export function sortOperationsByPriority(operations: LoadingOperation[]): LoadingOperation[] {
  return operations.sort((a, b) => {
    const priorityA = LOADING_PRIORITIES[a.priority];
    const priorityB = LOADING_PRIORITIES[b.priority];
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    
    // If same priority, sort by start time (older first)
    return a.startTime - b.startTime;
  });
}

/**
 * Filter operations by priority
 */
export function filterOperationsByPriority(
  operations: LoadingOperation[],
  priority: LoadingPriority
): LoadingOperation[] {
  return operations.filter(op => op.priority === priority);
}

/**
 * Get operations by type
 */
export function filterOperationsByType(
  operations: LoadingOperation[],
  type: LoadingType
): LoadingOperation[] {
  return operations.filter(op => op.type === type);
}

/**
 * Check if operation has timed out
 */
export function hasOperationTimedOut(operation: LoadingOperation): boolean {
  if (!operation.timeout) return false;
  return Date.now() - operation.startTime > operation.timeout;
}

/**
 * Check if operation can be retried
 */
export function canRetryOperation(operation: LoadingOperation): boolean {
  return operation.retryCount < operation.maxRetries;
}

/**
 * Get operation duration in milliseconds
 */
export function getOperationDuration(operation: LoadingOperation): number {
  return Date.now() - operation.startTime;
}

/**
 * Format operation duration for display
 */
export function formatOperationDuration(operation: LoadingOperation): string {
  const duration = getOperationDuration(operation);
  const seconds = Math.floor(duration / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get operation status text
 */
export function getOperationStatusText(operation: LoadingOperation): string {
  if (operation.error) {
    return `Failed (retry ${operation.retryCount}/${operation.maxRetries})`;
  }
  
  if (operation.stage) {
    return `${operation.stage}...`;
  }
  
  if (operation.progress !== undefined) {
    return `${Math.round(operation.progress)}% complete`;
  }
  
  return 'Loading...';
}

/**
 * Create progress object
 */
export function createProgress(
  loaded: number,
  total: number,
  phase: LoadingProgress['phase'] = 'critical',
  currentAsset?: string
): LoadingProgress {
  return {
    loaded: Math.max(0, loaded),
    total: Math.max(0, total),
    phase,
    currentAsset,
  };
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(progress: LoadingProgress): number {
  if (progress.total === 0) return 0;
  return Math.min(100, Math.max(0, (progress.loaded / progress.total) * 100));
}

/**
 * Check if progress is complete
 */
export function isProgressComplete(progress: LoadingProgress): boolean {
  return progress.phase === 'complete' || progress.loaded >= progress.total;
}

/**
 * Merge progress objects
 */
export function mergeProgress(
  progress1: LoadingProgress,
  progress2: LoadingProgress
): LoadingProgress {
  return {
    loaded: progress1.loaded + progress2.loaded,
    total: progress1.total + progress2.total,
    phase: progress1.phase === 'complete' && progress2.phase === 'complete' ? 'complete' : 'critical',
    currentAsset: progress2.currentAsset || progress1.currentAsset,
  };
}

/**
 * Create loading stages for common scenarios
 */
export function createCommonStages(scenario: 'page-load' | 'data-fetch' | 'asset-load'): LoadingStage[] {
  switch (scenario) {
    case 'page-load':
      return [
        createLoadingStage('init', 'Initializing...', { duration: 500 }),
        createLoadingStage('auth', 'Authenticating...', { duration: 1000 }),
        createLoadingStage('data', 'Loading data...', { duration: 2000 }),
        createLoadingStage('render', 'Rendering...', { duration: 500 }),
      ];
    
    case 'data-fetch':
      return [
        createLoadingStage('validate', 'Validating request...', { duration: 200 }),
        createLoadingStage('fetch', 'Fetching data...', { duration: 1500 }),
        createLoadingStage('process', 'Processing data...', { duration: 300 }),
      ];
    
    case 'asset-load':
      return [
        createLoadingStage('discover', 'Discovering assets...', { duration: 300 }),
        createLoadingStage('download', 'Downloading assets...', { duration: 3000 }),
        createLoadingStage('cache', 'Caching assets...', { duration: 500 }),
      ];
    
    default:
      return [
        createLoadingStage('loading', 'Loading...', { duration: 1000 }),
      ];
  }
}

/**
 * Debounce function for loading updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function for loading updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a promise with timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Batch operations to prevent overwhelming the system
 */
export function batchOperations<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
  delay: number = 0
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await processor(batch);
        
        if (delay > 0 && i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}