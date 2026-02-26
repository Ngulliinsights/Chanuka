/**
 * Redux State Validation Utilities
 *
 * Comprehensive type guards and validation functions for Redux state management
 * following the exemplary loading pattern and standardized architecture.
 */

import { z } from 'zod';
import { createValidatedType, createZodTypeGuard } from '../../core/validation';
// Import types directly to avoid circular dependency with index.ts
import type {
  SliceState,
  PaginatedSliceState,
  SliceStateWithOperations,
  AsyncOperationState,
} from './slice-state';

// Local type definitions for types not exported from slice-state
type ThunkResult<TData = unknown, TError = string> = {
  success: boolean;
  data?: TData;
  error?: TError;
};

type PaginatedThunkResult<TData = unknown, TError = string> = ThunkResult<TData, TError> & {
  page: number;
  limit: number;
  total: number;
};

// Stub types for ThunkOperationState and ThunkExecutionContext
type ThunkOperationState = {
  operationId: string;
  thunkName: string;
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  retryCount: number;
  maxRetries: number;
};

type ThunkExecutionContext = {
  requestId: string;
  signal: AbortSignal;
  rejectWithValue: (value: unknown) => unknown;
};

// ============================================================================
// Comprehensive Type Guards
// ============================================================================

/**
 * Enhanced type guard for SliceState with runtime validation
 */
export function isValidSliceState(value: unknown): value is SliceState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'isLoading' in value &&
    typeof value.isLoading === 'boolean' &&
    'error' in value &&
    'isInitialized' in value &&
    typeof value.isInitialized === 'boolean' &&
    'status' in value &&
    typeof value.status === 'string' &&
    ['idle', 'loading', 'success', 'error'].includes(value.status)
  );
}

/**
 * Enhanced type guard for PaginatedSliceState
 */
export function isValidPaginatedSliceState(value: unknown): value is PaginatedSliceState {
  return (
    isValidSliceState(value) &&
    'page' in value &&
    typeof value.page === 'number' &&
    'pageSize' in value &&
    typeof value.pageSize === 'number' &&
    'totalPages' in value &&
    typeof value.totalPages === 'number' &&
    'totalItems' in value &&
    typeof value.totalItems === 'number' &&
    'hasMore' in value &&
    typeof value.hasMore === 'boolean'
  );
}

/**
 * Enhanced type guard for SliceStateWithOperations
 */
export function isValidSliceStateWithOperations(value: unknown): value is SliceStateWithOperations {
  return (
    isValidSliceState(value) &&
    'operations' in value &&
    typeof value.operations === 'object' &&
    'activeOperations' in value &&
    typeof value.activeOperations === 'number'
  );
}

/**
 * Enhanced type guard for AsyncOperationState
 */
export function isValidAsyncOperationState(value: unknown): value is AsyncOperationState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'operationId' in value &&
    typeof value.operationId === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    ['idle', 'pending', 'fulfilled', 'rejected'].includes(value.status)
  );
}

/**
 * Enhanced type guard for ThunkResult
 */
export function isValidThunkResult(value: unknown): value is ThunkResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean' &&
    'timestamp' in value &&
    typeof value.timestamp === 'number' &&
    'operationId' in value &&
    typeof value.operationId === 'string' &&
    'operationType' in value &&
    typeof value.operationType === 'string'
  );
}

/**
 * Enhanced type guard for PaginatedThunkResult
 */
export function isValidPaginatedThunkResult(value: unknown): value is PaginatedThunkResult {
  return (
    isValidThunkResult(value) &&
    'page' in value &&
    typeof value.page === 'number' &&
    'pageSize' in value &&
    typeof value.pageSize === 'number' &&
    'totalPages' in value &&
    typeof value.totalPages === 'number' &&
    'totalItems' in value &&
    typeof value.totalItems === 'number' &&
    'hasMore' in value &&
    typeof value.hasMore === 'boolean'
  );
}

/**
 * Enhanced type guard for ThunkOperationState
 */
export function isValidThunkOperationState(value: unknown): value is ThunkOperationState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'operationId' in value &&
    typeof value.operationId === 'string' &&
    'thunkName' in value &&
    typeof value.thunkName === 'string' &&
    'status' in value &&
    typeof value.status === 'string' &&
    ['idle', 'pending', 'fulfilled', 'rejected'].includes(value.status) &&
    'retryCount' in value &&
    typeof value.retryCount === 'number' &&
    'maxRetries' in value &&
    typeof value.maxRetries === 'number'
  );
}

/**
 * Enhanced type guard for ThunkExecutionContext
 */
export function isValidThunkExecutionContext(value: unknown): value is ThunkExecutionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requestId' in value &&
    typeof value.requestId === 'string' &&
    'signal' in value &&
    value.signal instanceof AbortSignal &&
    'rejectWithValue' in value &&
    typeof value.rejectWithValue === 'function'
  );
}

// ============================================================================
// State Validation Utilities
// ============================================================================

/**
 * Validate slice state structure with detailed error reporting
 */
export function validateSliceState<TData, TError>(
  value: unknown,
  sliceName: string
): value is SliceState<TData, TError> {
  if (!isValidSliceState(value)) {
    console.warn(`Invalid ${sliceName} slice state structure`);
    return false;
  }

  // Additional validation for data consistency
  if (value.status === 'loading' && !value.isLoading) {
    console.warn(`${sliceName} state inconsistency: status is 'loading' but isLoading is false`);
    return false;
  }

  if (value.status === 'error' && !value.error) {
    console.warn(`${sliceName} state inconsistency: status is 'error' but error is null`);
    return false;
  }

  return true;
}

/**
 * Validate paginated slice state
 */
export function validatePaginatedSliceState<TData, TError>(
  value: unknown,
  sliceName: string
): value is PaginatedSliceState<TData[], TError> {
  if (!isValidPaginatedSliceState(value)) {
    console.warn(`Invalid ${sliceName} paginated slice state structure`);
    return false;
  }

  // Validate pagination consistency
  if (value.page < 1) {
    console.warn(`${sliceName} invalid page number: ${value.page}`);
    return false;
  }

  if (value.pageSize < 1) {
    console.warn(`${sliceName} invalid page size: ${value.pageSize}`);
    return false;
  }

  if (value.totalPages < value.page) {
    console.warn(`${sliceName} invalid pagination: totalPages (${value.totalPages}) < current page (${value.page})`);
    return false;
  }

  return true;
}

/**
 * Validate thunk result structure
 */
export function validateThunkResult<TData, TError>(
  value: unknown,
  thunkName: string
): value is ThunkResult<TData, TError> {
  if (!isValidThunkResult(value)) {
    console.warn(`Invalid ${thunkName} thunk result structure`);
    return false;
  }

  // Validate consistency
  if (value.success && value.error) {
    console.warn(`${thunkName} result inconsistency: success is true but error is present`);
    return false;
  }

  if (!value.success && !value.error) {
    console.warn(`${thunkName} result inconsistency: success is false but error is null`);
    return false;
  }

  return true;
}

// ============================================================================
// State Transition Validation
// ============================================================================

/**
 * Validate state transitions for consistency
 */
export function validateStateTransition(
  _previousState: SliceState,
  nextState: SliceState,
  actionType: string
): boolean {
  // Validate that loading states are consistent
  if (actionType.endsWith('/pending') && !nextState.isLoading) {
    console.warn(`State transition error: ${actionType} should set isLoading to true`);
    return false;
  }

  if (actionType.endsWith('/fulfilled') && nextState.isLoading) {
    console.warn(`State transition error: ${actionType} should set isLoading to false`);
    return false;
  }

  if (actionType.endsWith('/rejected') && nextState.isLoading) {
    console.warn(`State transition error: ${actionType} should set isLoading to false`);
    return false;
  }

  return true;
}

/**
 * Validate async operation state transitions
 */
export function validateOperationStateTransition(
  previousState: AsyncOperationState,
  nextState: AsyncOperationState
): boolean {
  // Validate operation ID consistency
  if (previousState.operationId !== nextState.operationId) {
    console.warn(`Operation ID changed from ${previousState.operationId} to ${nextState.operationId}`);
    return false;
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    idle: ['pending'],
    pending: ['fulfilled', 'rejected'],
    fulfilled: [],
    rejected: ['pending'],
  };

  const validNextStatuses = validTransitions[previousState.status] ?? [];
  if (!validNextStatuses.includes(nextState.status)) {
    console.warn(`Invalid operation state transition from ${previousState.status} to ${nextState.status}`);
    return false;
  }

  return true;
}

// ============================================================================
// Runtime Validation with Zod
// ============================================================================

/**
 * Zod schema for comprehensive slice state validation
 */
export const ComprehensiveSliceStateSchema = z.object({
  data: z.unknown().nullable(),
  isLoading: z.boolean(),
  error: z.union([z.string(), z.null()]),
  isInitialized: z.boolean(),
  lastUpdated: z.number().optional(),
  status: z.union([
    z.literal('idle'),
    z.literal('loading'),
    z.literal('success'),
    z.literal('error')
  ]),
  metadata: z.record(z.string(), z.unknown()).optional()
}).superRefine((data, ctx) => {
  // Cross-field validation
  if (data.status === 'loading' && !data.isLoading) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Status is loading but isLoading is false',
      path: ['status'],
    });
  }

  if (data.status === 'error' && !data.error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Status is error but error is null',
      path: ['status'],
    });
  }

  return data;
});

/**
 * Zod schema for comprehensive thunk result validation
 */
export const ComprehensiveThunkResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.union([z.string(), z.unknown()]).optional(),
  timestamp: z.number(),
  operationId: z.string(),
  operationType: z.string(),
  duration: z.number().optional(),
  previousState: z.unknown().optional(),
  nextState: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).superRefine((data, ctx) => {
  // Cross-field validation
  if (data.success && data.error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Success is true but error is present',
      path: ['success'],
    });
  }

  if (!data.success && !data.error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Success is false but error is null',
      path: ['success'],
    });
  }

  return data;
});

// ============================================================================
// Validated Type Definitions
// ============================================================================

/**
 * Validated comprehensive slice state type
 */
export const ValidatedComprehensiveSliceState = createValidatedType(
  ComprehensiveSliceStateSchema,
  'ComprehensiveSliceState'
);

/**
 * Validated comprehensive thunk result type
 */
export const ValidatedComprehensiveThunkResult = createValidatedType(
  ComprehensiveThunkResultSchema,
  'ComprehensiveThunkResult'
);

// ============================================================================
// Zod Type Guards for Runtime Validation
// ============================================================================

/**
 * Zod-based comprehensive type guard for SliceState
 */
export const isComprehensiveSliceState = createZodTypeGuard(
  ComprehensiveSliceStateSchema,
  'Invalid comprehensive slice state structure'
);

/**
 * Zod-based comprehensive type guard for ThunkResult
 */
export const isComprehensiveThunkResult = createZodTypeGuard(
  ComprehensiveThunkResultSchema,
  'Invalid comprehensive thunk result structure'
);

// ============================================================================
// Domain Version and Metadata
// ============================================================================

export const REDUX_VALIDATION_VERSION = '1.0.0' as const;
export const REDUX_VALIDATION_DESCRIPTION = 'Comprehensive validation utilities for Redux state management' as const;
