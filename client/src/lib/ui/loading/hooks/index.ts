/**
 * Loading hooks barrel exports - SIMPLIFIED
 * Core hooks only
 */

export { useLoading } from './useLoading';
export { useLoadingState } from './useLoadingState';

// Placeholder hooks for demo compatibility
export const useProgressiveLoading = (stages: unknown[]) => ({
  currentStage: stages[0],
  progress: 0,
  isComplete: false,
  start: () => {},
  reset: () => {},
});

export const useTimeoutAwareLoading = (operation: () => Promise<any>, _timeout: number) => ({
  execute: operation,
  isLoading: false,
  hasTimedOut: false,
  result: null,
  error: null,
});
