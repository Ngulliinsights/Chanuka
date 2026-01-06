/**
 * Optimized Loading State Reducer
 * Manages loading operations with performance-optimized state transitions
 * Aligned with actual LoadingAction and LoadingStateData types
 */

import {
  LoadingStateData,
  LoadingAction,
  LoadingOperation,
  LoadingMetrics,
} from '@client/shared/types';

/**
 * Main reducer for managing loading state
 * Handles action types: retry, fallback, cancel, prioritize, delay, cache
 */
export function loadingReducer(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  switch (action.type) {
    case 'retry':
      return handleRetry(state, action);

    case 'fallback':
      return handleFallback(state, action);

    case 'cancel':
      return handleCancel(state, action);

    case 'prioritize':
      return handlePrioritize(state, action);

    case 'delay':
      return handleDelay(state, action);

    case 'cache':
      return handleCache(state, action);

    default:
      return state;
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Handles retry action - increments retry count for an operation
 */
function handleRetry(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  const operationId = extractOperationId(action);
  if (!operationId) return state;

  const operation = state.operations[operationId];
  if (!operation) return state;

  const updatedOperation: LoadingOperation = {
    ...operation,
    retryCount: operation.retryCount + 1,
    error: undefined,
    startTime: new Date(),
  };

  const newOperations = {
    ...state.operations,
    [operationId]: updatedOperation,
  };

  return {
    ...state,
    operations: newOperations,
    stats: updateMetrics(state.stats, {
      totalOperations: state.stats.totalOperations,
      completedOperations: state.stats.completedOperations,
      failedOperations: state.stats.failedOperations,
    }),
  };
}

/**
 * Handles fallback action - marks operation with fallback state
 */
function handleFallback(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  const operationId = extractOperationId(action);
  if (!operationId) return state;

  const operation = state.operations[operationId];
  if (!operation) return state;

  const updatedOperation: LoadingOperation = {
    ...operation,
    state: 'loading', // Keep existing state or update as needed
  };

  return {
    ...state,
    operations: {
      ...state.operations,
      [operationId]: updatedOperation,
    },
  };
}

/**
 * Handles cancel action - removes operation from state
 */
function handleCancel(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  const operationId = extractOperationId(action);
  if (!operationId) return state;

  const operation = state.operations[operationId];
  if (!operation) return state;

  const newOperations = { ...state.operations };
  delete newOperations[operationId];

  return {
    ...state,
    operations: newOperations,
    stats: updateMetrics(state.stats, {
      totalOperations: state.stats.totalOperations,
      completedOperations: state.stats.completedOperations + 1,
      failedOperations: state.stats.failedOperations,
    }),
  };
}

/**
 * Handles prioritize action - updates operation metadata to mark as prioritized
 */
function handlePrioritize(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  const operationId = extractOperationId(action);
  if (!operationId) return state;

  const operation = state.operations[operationId];
  if (!operation) return state;

  const updatedOperation: LoadingOperation = {
    ...operation,
    metadata: {
      ...(operation.metadata || {}),
      prioritized: true,
      prioritizedAt: new Date().toISOString(),
    },
  };

  return {
    ...state,
    operations: {
      ...state.operations,
      [operationId]: updatedOperation,
    },
  };
}

/**
 * Handles delay action - updates operation metadata with delay information
 */
function handleDelay(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  const operationId = extractOperationId(action);
  if (!operationId) return state;

  const operation = state.operations[operationId];
  if (!operation) return state;

  const delayAmount = extractDelayAmount(action);

  const updatedOperation: LoadingOperation = {
    ...operation,
    metadata: {
      ...(operation.metadata || {}),
      delayed: true,
      delayAmount,
      delayedAt: new Date().toISOString(),
    },
  };

  return {
    ...state,
    operations: {
      ...state.operations,
      [operationId]: updatedOperation,
    },
  };
}

/**
 * Handles cache action - marks operation as cached
 */
function handleCache(state: LoadingStateData, action: LoadingAction): LoadingStateData {
  const operationId = extractOperationId(action);
  if (!operationId) return state;

  const operation = state.operations[operationId];
  if (!operation) return state;

  const updatedOperation: LoadingOperation = {
    ...operation,
    metadata: {
      ...(operation.metadata || {}),
      cached: true,
      cachedAt: new Date().toISOString(),
    },
  };

  return {
    ...state,
    operations: {
      ...state.operations,
      [operationId]: updatedOperation,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts operation ID from action
 * Attempts to get ID from common property names
 */
function extractOperationId(action: LoadingAction): string | null {
  // Safely check for operation ID in action payload
  if ('payload' in action && action.payload && typeof action.payload === 'object') {
    const payload = action.payload as { operationId?: string; id?: string };
    return payload.operationId || payload.id || null;
  }

  // Check direct properties
  if ('operationId' in action && typeof action.operationId === 'string') {
    return action.operationId;
  }

  if ('id' in action && typeof action.id === 'string') {
    return action.id;
  }

  return null;
}

/**
 * Extracts delay amount from action
 */
function extractDelayAmount(action: LoadingAction): number {
  // Safely check for delay in action payload
  if ('payload' in action && action.payload && typeof action.payload === 'object') {
    const payload = action.payload as { delay?: number; delayAmount?: number };
    return payload.delay || payload.delayAmount || 0;
  }

  // Check direct properties
  if ('delay' in action && typeof action.delay === 'number') {
    return action.delay;
  }

  if ('delayAmount' in action && typeof action.delayAmount === 'number') {
    return action.delayAmount;
  }

  return 0;
}

/**
 * Updates metrics with new values
 * Only updates properties that exist on LoadingMetrics type
 */
function updateMetrics(
  currentMetrics: LoadingMetrics,
  updates: Partial<LoadingMetrics>
): LoadingMetrics {
  return {
    ...currentMetrics,
    ...updates,
  };
}

/**
 * Calculates completion time between two dates
 */
export function calculateCompletionTime(startTime: Date, endTime: Date): number {
  return endTime.getTime() - startTime.getTime();
}

/**
 * Checks if operation has exceeded its max retries
 */
export function hasExceededRetries(operation: LoadingOperation): boolean {
  return operation.retryCount >= operation.maxRetries;
}

/**
 * Gets all operations with dependencies
 */
export function getOperationsWithDependencies(state: LoadingStateData): LoadingOperation[] {
  return Object.values(state.operations).filter(
    op => op.dependencies && op.dependencies.length > 0
  );
}

/**
 * Checks if all dependencies for an operation are complete
 */
export function areDependenciesComplete(
  operation: LoadingOperation,
  state: LoadingStateData
): boolean {
  if (!operation.dependencies || operation.dependencies.length === 0) {
    return true;
  }

  return operation.dependencies.every(depId => {
    const dep = state.operations[depId];
    // Dependency is complete if it doesn't exist (was completed and removed)
    return !dep;
  });
}

/**
 * Gets operations sorted by start time (oldest first)
 */
export function getOperationsByAge(state: LoadingStateData): LoadingOperation[] {
  return Object.values(state.operations).sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
}

/**
 * Gets operations filtered by type
 */
export function getOperationsByType(state: LoadingStateData, type: string): LoadingOperation[] {
  return Object.values(state.operations).filter(op => op.type === type);
}

/**
 * Checks if there are any active operations
 */
export function hasActiveOperations(state: LoadingStateData): boolean {
  return Object.keys(state.operations).length > 0;
}

/**
 * Gets count of operations in specific state
 */
export function getOperationCountByState(state: LoadingStateData, operationState: string): number {
  return Object.values(state.operations).filter(op => op.state === operationState).length;
}

/**
 * Calculates success rate from metrics
 */
export function calculateSuccessRate(metrics: LoadingMetrics): number {
  const total = metrics.totalOperations;
  if (total === 0) return 0;
  return ((total - metrics.failedOperations) / total) * 100;
}

/**
 * Calculates average operation duration
 */
export function calculateAverageDuration(totalDuration: number, completedCount: number): number {
  if (completedCount === 0) return 0;
  return totalDuration / completedCount;
}

/**
 * Updates queue length metrics
 */
export function updateQueueMetrics(
  currentMetrics: LoadingMetrics,
  currentQueueLength: number
): LoadingMetrics {
  return {
    ...currentMetrics,
    currentQueueLength,
    peakQueueLength: Math.max(currentMetrics.peakQueueLength, currentQueueLength),
  };
}

/**
 * Creates initial loading state with all required properties
 */
export function createInitialLoadingState(): LoadingStateData {
  return {
    isLoading: false,
    operations: {},
    stats: {
      totalOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      successRate: 0,
      currentQueueLength: 0,
      peakQueueLength: 0,
    },
  };
}

/**
 * Creates initial metrics object
 */
export function createInitialMetrics(): LoadingMetrics {
  return {
    totalOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    averageDuration: 0,
    successRate: 0,
    currentQueueLength: 0,
    peakQueueLength: 0,
  };
}

/**
 * Recalculates all derived metrics from current state
 */
export function recalculateMetrics(state: LoadingStateData): LoadingMetrics {
  const activeCount = Object.keys(state.operations).length;
  const successRate = calculateSuccessRate(state.stats);

  return {
    ...state.stats,
    currentQueueLength: activeCount,
    peakQueueLength: Math.max(state.stats.peakQueueLength, activeCount),
    successRate,
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingReducerAction = LoadingAction;
export type LoadingReducerState = LoadingStateData;

/**
 * Helper type for operation updates
 */
export type OperationUpdate = Partial<Omit<LoadingOperation, 'id' | 'startTime'>> & {
  id: string;
};

/**
 * Helper type for batch operation updates
 */
export interface BatchOperationUpdate {
  operationIds: string[];
  update: Partial<Omit<LoadingOperation, 'id' | 'startTime'>>;
}

/**
 * Helper type for metrics calculation
 */
export interface MetricsSnapshot {
  timestamp: Date;
  activeOperations: number;
  completedOperations: number;
  failedOperations: number;
  successRate: number;
  averageDuration: number;
}
