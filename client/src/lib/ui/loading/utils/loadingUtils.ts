/**
 * Loading Utilities
 */

import type { LoadingProgress } from '../types';

export class LoadingError extends Error {
  constructor(
    message: string,
    public asset?: string,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LoadingError';
  }
}

export function getErrorDisplayMessage(error: LoadingError): string {
  if (error.asset) {
    return `Failed to load ${error.asset}`;
  }
  return error.message || 'Loading error occurred';
}

export function safeValidateLoadingProgress(progress: LoadingProgress): ValidationResult {
  try {
    if (typeof progress.loaded !== 'number' || typeof progress.total !== 'number') {
      return {
        success: false,
        data: { loaded: 0, total: 0, phase: 'preload', currentAsset: undefined, status: 'error' },
        error: new LoadingError('Invalid progress data: loaded and total must be numbers'),
      };
    }

    if (progress.loaded < 0 || progress.total < 0) {
      return {
        success: false,
        data: { loaded: 0, total: 0, phase: 'preload', currentAsset: undefined, status: 'error' },
        error: new LoadingError('Invalid progress data: values cannot be negative'),
      };
    }

    return {
      success: true,
      data: progress,
    };
  } catch (err) {
    return {
      success: false,
      data: { loaded: 0, total: 0, phase: 'preload', currentAsset: undefined, status: 'error' },
      error: new LoadingError('Validation error', undefined, undefined, { originalError: err }),
    };
  }
}
