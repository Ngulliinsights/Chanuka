/**
 * Redux Thunk Result Types - Standardized Pattern
 *
 * Consistent type definitions for async thunk operations following
 * the exemplary loading pattern and best practices.
 */

import { z } from 'zod';
import { createValidatedType, createZodTypeGuard } from '../../core/validation';
import { SliceState } from './slice-state';

/**
 * Base Thunk Result Type
 * Standardized result structure for all async thunks
 */
export interface ThunkResult<TData = unknown, TError = string> {
  // Core result properties
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: TError;
  readonly timestamp: number;

  // Operation metadata
  readonly operationId: string;
  readonly operationType: string;
  readonly duration?: number;

  // State transition information
  readonly previousState?: SliceState<TData, TError>;
  readonly nextState?: SliceState<TData, TError>;

  // Metadata for tracking and debugging
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Paginated Thunk Result
 * For thunk operations that return paginated data
 */
export interface PaginatedThunkResult<TData = unknown, TError = string> extends ThunkResult<TData[], TError> {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly hasMore: boolean;
}

/**
 * Async Thunk Operation State
 * For tracking the lifecycle of async thunk operations
 */
export interface ThunkOperationState {
  readonly operationId: string;
  readonly thunkName: string;
  readonly status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly error?: string;
  readonly retryCount: number;
  readonly maxRetries: number;
}

/**
 * Thunk Execution Context
 * Context information for thunk execution
 */
export interface ThunkExecutionContext {
  readonly dispatch: unknown; // Will be typed to Dispatch when used
  readonly getState: unknown;  // Will be typed to () => RootState when used
  readonly extra?: unknown;
  readonly requestId: string;
  readonly signal: AbortSignal;
  readonly rejectWithValue: (value: unknown) => unknown;
}

/**
 * Thunk Action Creator
 * Standardized signature for thunk action creators
 */
export interface ThunkActionCreator<TData = unknown, TError = string, TArg = void> {
  (arg: TArg): (
    dispatch: unknown,
    getState: unknown,
    extra?: unknown
  ) => Promise<ThunkResult<TData, TError>>;

  // Type properties for introspection
  readonly typePrefix: string;
  readonly argType?: TArg;
  readonly resultType?: ThunkResult<TData, TError>;
}

// ============================================================================
// Type Guards for Thunk Result Validation
// ============================================================================

/**
 * Type guard for base ThunkResult
 */
export function isThunkResult(value: unknown): value is ThunkResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'timestamp' in value &&
    'operationId' in value &&
    'operationType' in value
  );
}

/**
 * Type guard for PaginatedThunkResult
 */
export function isPaginatedThunkResult(value: unknown): value is PaginatedThunkResult {
  return (
    isThunkResult(value) &&
    'page' in value &&
    'pageSize' in value &&
    'totalPages' in value &&
    'totalItems' in value &&
    'hasMore' in value
  );
}

/**
 * Type guard for ThunkOperationState
 */
export function isThunkOperationState(value: unknown): value is ThunkOperationState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'operationId' in value &&
    'thunkName' in value &&
    'status' in value &&
    'retryCount' in value &&
    'maxRetries' in value
  );
}

/**
 * Type guard for ThunkExecutionContext
 */
export function isThunkExecutionContext(value: unknown): value is ThunkExecutionContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requestId' in value &&
    'signal' in value &&
    'rejectWithValue' in value
  );
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for base ThunkResult
 */
export const ThunkResultSchema = z.object({
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
});

/**
 * Zod schema for PaginatedThunkResult
 */
export const PaginatedThunkResultSchema = ThunkResultSchema.extend({
  data: z.array(z.unknown()),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  hasMore: z.boolean()
});

/**
 * Zod schema for ThunkOperationState
 */
export const ThunkOperationStateSchema = z.object({
  operationId: z.string(),
  thunkName: z.string(),
  status: z.union([
    z.literal('idle'),
    z.literal('pending'),
    z.literal('fulfilled'),
    z.literal('rejected')
  ]),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  error: z.string().optional(),
  retryCount: z.number(),
  maxRetries: z.number()
});

/**
 * Zod schema for ThunkExecutionContext
 */
export const ThunkExecutionContextSchema = z.object({
  dispatch: z.unknown(),
  getState: z.unknown(),
  extra: z.unknown().optional(),
  requestId: z.string(),
  signal: z.instanceof(AbortSignal),
  rejectWithValue: z.function()
});

// ============================================================================
// Validated Type Definitions
// ============================================================================

/**
 * Validated ThunkResult type
 */
export const ValidatedThunkResult = createValidatedType(
  ThunkResultSchema,
  'ThunkResult'
);

/**
 * Validated PaginatedThunkResult type
 */
export const ValidatedPaginatedThunkResult = createValidatedType(
  PaginatedThunkResultSchema,
  'PaginatedThunkResult'
);

/**
 * Validated ThunkOperationState type
 */
export const ValidatedThunkOperationState = createValidatedType(
  ThunkOperationStateSchema,
  'ThunkOperationState'
);

/**
 * Validated ThunkExecutionContext type
 */
export const ValidatedThunkExecutionContext = createValidatedType(
  ThunkExecutionContextSchema,
  'ThunkExecutionContext'
);

// ============================================================================
// Zod Type Guards
// ============================================================================

/**
 * Zod-based type guard for ThunkResult
 */
export const isThunkResultZod = createZodTypeGuard(
  ThunkResultSchema,
  'Invalid ThunkResult structure'
);

/**
 * Zod-based type guard for PaginatedThunkResult
 */
export const isPaginatedThunkResultZod = createZodTypeGuard(
  PaginatedThunkResultSchema,
  'Invalid PaginatedThunkResult structure'
);

/**
 * Zod-based type guard for ThunkOperationState
 */
export const isThunkOperationStateZod = createZodTypeGuard(
  ThunkOperationStateSchema,
  'Invalid ThunkOperationState structure'
);

/**
 * Zod-based type guard for ThunkExecutionContext
 */
export const isThunkExecutionContextZod = createZodTypeGuard(
  ThunkExecutionContextSchema,
  'Invalid ThunkExecutionContext structure'
);

// ============================================================================
// Domain Version and Metadata
// ============================================================================

export const REDUX_THUNK_RESULT_VERSION = '1.0.0' as const;
export const REDUX_THUNK_RESULT_DESCRIPTION = 'Standardized Redux thunk result types for async operations' as const;