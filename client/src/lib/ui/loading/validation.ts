import { z } from 'zod';

import { LoadingValidationError } from './errors';

/**
 * Loading validation schemas and utilities
 * Following navigation component patterns for validation
 */

export const LoadingSizeSchema = z.enum(['sm', 'md', 'lg']);

export const LoadingTypeSchema = z.enum([
  'page',
  'component',
  'inline',
  'progressive',
  'network-aware',
  'timeout-aware',
]);

export const LoadingStateSchema = z.enum(['loading', 'success', 'error', 'timeout', 'offline']);

export const LoadingPhaseSchema = z.enum(['preload', 'critical', 'lazy', 'complete']);

export const ConnectionTypeSchema = z.enum(['slow', 'fast', 'offline']);

export const LoadingPrioritySchema = z.enum(['low', 'medium', 'high']);

export const LoadingProgressSchema = z
  .object({
    loaded: z.number().int().min(0),
    total: z.number().int().min(0),
    phase: LoadingPhaseSchema,
    currentAsset: z.string().optional(),
  })
  .refine(data => data.loaded <= data.total, {
    message: 'Loaded count cannot exceed total count',
    path: ['loaded'],
  });

export const LoadingStageSchema = z.object({
  id: z.string().min(1, 'Stage ID cannot be empty'),
  message: z.string().min(1, 'Stage message cannot be empty').max(200, 'Stage message too long'),
  duration: z.number().int().min(0).optional(),
  retryable: z.boolean().optional(),
});

export const LoadingOperationSchema = z
  .object({
    id: z.string().min(1, 'Operation ID cannot be empty'),
    type: LoadingTypeSchema,
    message: z
      .string()
      .min(1, 'Operation message cannot be empty')
      .max(200, 'Operation message too long'),
    priority: LoadingPrioritySchema,
    progress: z.number().min(0).max(100).optional(),
    stage: z.string().max(100, 'Stage name too long').optional(),
    error: z.string().optional(), // Changed from Error to string
    startTime: z.number().int().min(0),
    timeout: z.number().int().min(1000).optional(), // Minimum 1 second
    retryCount: z.number().int().min(0),
    maxRetries: z.number().int().min(0).max(10), // Maximum 10 retries
    connectionAware: z.boolean(),
  })
  .refine(data => data.retryCount <= data.maxRetries, {
    message: 'Retry count cannot exceed max retries',
    path: ['retryCount'],
  });

export const LoadingConfigSchema = z.object({
  timeout: z.number().int().min(1000).max(300000), // 1s to 5 minutes
  retryDelay: z.number().int().min(100).max(30000), // 100ms to 30s
  maxRetries: z.number().int().min(0).max(10),
  showProgress: z.boolean(),
  enableCaching: z.boolean(),
  priority: LoadingPrioritySchema,
  validation: z
    .object({
      enabled: z.boolean(),
      strict: z.boolean(),
      validateProgress: z.boolean(),
    })
    .optional(),
  errorHandling: z
    .object({
      enableRecovery: z.boolean(),
      maxRetries: z.number().int().min(0).max(10),
      retryDelay: z.number().int().min(100).max(30000), // 100ms to 30s
      fallbackComponent: z.any().optional(),
    })
    .optional(),
  performance: z
    .object({
      enableMemoization: z.boolean(),
      debounceMs: z.number().int().min(0).max(5000), // 0 to 5 seconds
      maxConcurrentOperations: z.number().int().min(1).max(20),
    })
    .optional(),
  display: z
    .object({
      autoHide: z.boolean(),
      autoHideDelay: z.number().int().min(1000).max(60000), // 1s to 60s
      showProgress: z.boolean(),
      showDetails: z.boolean(),
      position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center']),
    })
    .optional(),
});

export const LoadingStatsSchema = z.object({
  loaded: z.number().int().min(0),
  failed: z.number().int().min(0),
  connectionType: ConnectionTypeSchema,
  isOnline: z.boolean(),
});

/**
 * Validation utility functions
 */

export function validateLoadingProgress(progress: unknown): any {
  try {
    return LoadingProgressSchema.parse(progress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid loading progress';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Loading progress validation failed');
  }
}

export function validateLoadingStage(stage: unknown): any {
  try {
    return LoadingStageSchema.parse(stage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid loading stage';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Loading stage validation failed');
  }
}

export function validateLoadingOperation(operation: unknown): any {
  try {
    return LoadingOperationSchema.parse(operation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid loading operation';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Loading operation validation failed');
  }
}

export function validateLoadingConfig(config: unknown): any {
  try {
    return LoadingConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid loading configuration';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Loading configuration validation failed');
  }
}

export function validateLoadingStats(stats: unknown): any {
  try {
    return LoadingStatsSchema.parse(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid loading stats';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Loading stats validation failed');
  }
}

export function validateTimeout(timeout: number): number {
  try {
    return z.number().int().min(1000).max(300000).parse(timeout); // 1s to 5 minutes
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid timeout value';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Timeout validation failed');
  }
}

export function validateRetryCount(retryCount: number, maxRetries: number): number {
  try {
    const validatedRetryCount = z.number().int().min(0).parse(retryCount);
    const validatedMaxRetries = z.number().int().min(0).max(10).parse(maxRetries);

    if (validatedRetryCount > validatedMaxRetries) {
      throw new LoadingValidationError('Retry count cannot exceed max retries');
    }

    return validatedRetryCount;
  } catch (error) {
    if (error instanceof LoadingValidationError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || 'Invalid retry count';
      throw new LoadingValidationError(message);
    }
    throw new LoadingValidationError('Retry count validation failed');
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidateLoadingProgress(progress: unknown): {
  success: boolean;
  data?: any;
  error?: LoadingValidationError;
} {
  try {
    const data = validateLoadingProgress(progress);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as LoadingValidationError };
  }
}

export function safeValidateLoadingOperation(operation: unknown): {
  success: boolean;
  data?: any;
  error?: LoadingValidationError;
} {
  try {
    const data = validateLoadingOperation(operation);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as LoadingValidationError };
  }
}

export function safeValidateLoadingConfig(config: unknown): {
  success: boolean;
  data?: any;
  error?: LoadingValidationError;
} {
  try {
    const data = validateLoadingConfig(config);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as LoadingValidationError };
  }
}

/**
 * Validation helpers for common scenarios
 */

export function isValidProgressPercentage(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

export function isValidOperationId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 100;
}

export function isValidStageMessage(message: string): boolean {
  return typeof message === 'string' && message.length > 0 && message.length <= 200;
}

export function normalizeLoadingSize(size: unknown): 'sm' | 'md' | 'lg' {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  return 'md'; // Default fallback
}

export function normalizeLoadingType(
  type: unknown
): 'page' | 'component' | 'inline' | 'progressive' | 'network-aware' | 'timeout-aware' {
  const validTypes = [
    'page',
    'component',
    'inline',
    'progressive',
    'network-aware',
    'timeout-aware',
  ];
  if (typeof type === 'string' && validTypes.includes(type)) {
    return type as 'page' | 'component' | 'inline' | 'progressive' | 'network-aware' | 'timeout-aware';
  }
  return 'component'; // Default fallback
}
