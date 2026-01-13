/**
 * Redux Slice State Interface - Standardized Pattern
 *
 * Following the exemplary loading pattern with consistent structure
 * for all Redux slices across the application.
 */

import { z } from 'zod';
import { createValidatedType, createZodTypeGuard } from '../../core/validation';

/**
 * Base Slice State Interface
 * Standardized structure for all Redux slice states
 */
export interface SliceState<TData = unknown, TError = string> {
  // Core state properties following loading pattern
  readonly data: TData | null;
  readonly isLoading: boolean;
  readonly error: TError | null;
  readonly isInitialized: boolean;
  readonly lastUpdated?: number;
  readonly status: 'idle' | 'loading' | 'success' | 'error';

  // Metadata for tracking and debugging
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Extended Slice State with pagination support
 * For slices that manage paginated data
 */
export interface PaginatedSliceState<TData = unknown, TError = string> extends SliceState<TData, TError> {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly hasMore: boolean;
}

/**
 * Async Operation State
 * For tracking async operations within slices
 */
export interface AsyncOperationState {
  readonly operationId: string;
  readonly status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  readonly progress?: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly error?: string;
}

/**
 * Slice State with Async Operations
 * For slices that manage multiple async operations
 */
export interface SliceStateWithOperations<TData = unknown, TError = string> extends SliceState<TData, TError> {
  readonly operations: Record<string, AsyncOperationState>;
  readonly activeOperations: number;
}

// ============================================================================
// Type Guards for State Validation
// ============================================================================

/**
 * Type guard for base SliceState
 */
export function isSliceState(value: unknown): value is SliceState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'isLoading' in value &&
    'error' in value &&
    'isInitialized' in value &&
    'status' in value
  );
}

/**
 * Type guard for PaginatedSliceState
 */
export function isPaginatedSliceState(value: unknown): value is PaginatedSliceState {
  return (
    isSliceState(value) &&
    'page' in value &&
    'pageSize' in value &&
    'totalPages' in value &&
    'totalItems' in value &&
    'hasMore' in value
  );
}

/**
 * Type guard for AsyncOperationState
 */
export function isAsyncOperationState(value: unknown): value is AsyncOperationState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'operationId' in value &&
    'status' in value
  );
}

/**
 * Type guard for SliceStateWithOperations
 */
export function isSliceStateWithOperations(value: unknown): value is SliceStateWithOperations {
  return (
    isSliceState(value) &&
    'operations' in value &&
    'activeOperations' in value
  );
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for base SliceState
 */
export const SliceStateSchema = z.object({
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
});

/**
 * Zod schema for PaginatedSliceState
 */
export const PaginatedSliceStateSchema = SliceStateSchema.extend({
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  totalItems: z.number(),
  hasMore: z.boolean()
});

/**
 * Zod schema for AsyncOperationState
 */
export const AsyncOperationStateSchema = z.object({
  operationId: z.string(),
  status: z.union([
    z.literal('idle'),
    z.literal('pending'),
    z.literal('fulfilled'),
    z.literal('rejected')
  ]),
  progress: z.number().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  error: z.string().optional()
});

/**
 * Zod schema for SliceStateWithOperations
 */
export const SliceStateWithOperationsSchema = SliceStateSchema.extend({
  operations: z.record(z.string(), AsyncOperationStateSchema),
  activeOperations: z.number()
});

// ============================================================================
// Validated Type Definitions
// ============================================================================

/**
 * Validated SliceState type
 */
export const ValidatedSliceState = createValidatedType(
  SliceStateSchema,
  'SliceState'
);

/**
 * Validated PaginatedSliceState type
 */
export const ValidatedPaginatedSliceState = createValidatedType(
  PaginatedSliceStateSchema,
  'PaginatedSliceState'
);

/**
 * Validated AsyncOperationState type
 */
export const ValidatedAsyncOperationState = createValidatedType(
  AsyncOperationStateSchema,
  'AsyncOperationState'
);

/**
 * Validated SliceStateWithOperations type
 */
export const ValidatedSliceStateWithOperations = createValidatedType(
  SliceStateWithOperationsSchema,
  'SliceStateWithOperations'
);

// ============================================================================
// Zod Type Guards
// ============================================================================

/**
 * Zod-based type guard for SliceState
 */
export const isSliceStateZod = createZodTypeGuard(
  SliceStateSchema,
  'Invalid SliceState structure'
);

/**
 * Zod-based type guard for PaginatedSliceState
 */
export const isPaginatedSliceStateZod = createZodTypeGuard(
  PaginatedSliceStateSchema,
  'Invalid PaginatedSliceState structure'
);

/**
 * Zod-based type guard for AsyncOperationState
 */
export const isAsyncOperationStateZod = createZodTypeGuard(
  AsyncOperationStateSchema,
  'Invalid AsyncOperationState structure'
);

/**
 * Zod-based type guard for SliceStateWithOperations
 */
export const isSliceStateWithOperationsZod = createZodTypeGuard(
  SliceStateWithOperationsSchema,
  'Invalid SliceStateWithOperations structure'
);

// ============================================================================
// Domain Version and Metadata
// ============================================================================

export const REDUX_SLICE_STATE_VERSION = '1.0.0' as const;
export const REDUX_SLICE_STATE_DESCRIPTION = 'Standardized Redux slice state types following loading pattern' as const;