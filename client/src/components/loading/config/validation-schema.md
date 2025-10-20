# Loading Validation Schema Documentation

## Overview

This document describes the validation schemas used by the loading component system. All schemas are implemented using Zod for runtime type checking and validation.

## Core Schemas

### LoadingSizeSchema

```typescript
const LoadingSizeSchema = z.enum(['sm', 'md', 'lg']);
```

**Valid Values:**
- `'sm'` - Small size (16px)
- `'md'` - Medium size (24px) 
- `'lg'` - Large size (32px)

**Usage:**
Used for controlling the size of loading indicators and spinners.

### LoadingTypeSchema

```typescript
const LoadingTypeSchema = z.enum([
  'page', 
  'component', 
  'inline', 
  'progressive', 
  'network-aware', 
  'timeout-aware'
]);
```

**Valid Values:**
- `'page'` - Full page loading indicator
- `'component'` - Component-level loading indicator
- `'inline'` - Inline loading indicator (small, minimal)
- `'progressive'` - Multi-stage loading with progress tracking
- `'network-aware'` - Loading that adapts to network conditions
- `'timeout-aware'` - Loading with timeout handling and warnings

### LoadingStateSchema

```typescript
const LoadingStateSchema = z.enum([
  'loading', 
  'success', 
  'error', 
  'timeout', 
  'offline'
]);
```

**Valid Values:**
- `'loading'` - Currently loading
- `'success'` - Loading completed successfully
- `'error'` - Loading failed with an error
- `'timeout'` - Loading timed out
- `'offline'` - Loading failed due to offline status

### LoadingPhaseSchema

```typescript
const LoadingPhaseSchema = z.enum([
  'preload', 
  'critical', 
  'lazy', 
  'complete'
]);
```

**Valid Values:**
- `'preload'` - Preloading critical assets
- `'critical'` - Loading essential resources
- `'lazy'` - Loading non-critical resources
- `'complete'` - All loading phases completed

## Complex Schemas

### LoadingProgressSchema

```typescript
const LoadingProgressSchema = z.object({
  loaded: z.number().int().min(0),
  total: z.number().int().min(0),
  phase: LoadingPhaseSchema,
  currentAsset: z.string().optional(),
}).refine(data => data.loaded <= data.total, {
  message: 'Loaded count cannot exceed total count',
  path: ['loaded'],
});
```

**Properties:**
- `loaded` - Number of items loaded (non-negative integer)
- `total` - Total number of items to load (non-negative integer)
- `phase` - Current loading phase
- `currentAsset` - Optional path/name of currently loading asset

**Validation Rules:**
- `loaded` must be ≤ `total`
- Both `loaded` and `total` must be non-negative integers

### LoadingStageSchema

```typescript
const LoadingStageSchema = z.object({
  id: z.string().min(1, 'Stage ID cannot be empty'),
  message: z.string().min(1, 'Stage message cannot be empty').max(200, 'Stage message too long'),
  duration: z.number().int().min(0).optional(),
  retryable: z.boolean().optional(),
});
```

**Properties:**
- `id` - Unique identifier for the stage (1-100 characters)
- `message` - Display message for the stage (1-200 characters)
- `duration` - Optional expected duration in milliseconds (≥0)
- `retryable` - Optional flag indicating if stage can be retried

### LoadingOperationSchema

```typescript
const LoadingOperationSchema = z.object({
  id: z.string().min(1, 'Operation ID cannot be empty'),
  type: LoadingTypeSchema,
  message: z.string().min(1, 'Operation message cannot be empty').max(200, 'Operation message too long'),
  priority: LoadingPrioritySchema,
  progress: z.number().min(0).max(100).optional(),
  stage: z.string().max(100, 'Stage name too long').optional(),
  error: z.instanceof(Error).optional(),
  startTime: z.number().int().min(0),
  timeout: z.number().int().min(1000).optional(),
  retryCount: z.number().int().min(0),
  maxRetries: z.number().int().min(0).max(10),
  connectionAware: z.boolean(),
}).refine(data => data.retryCount <= data.maxRetries, {
  message: 'Retry count cannot exceed max retries',
  path: ['retryCount'],
});
```

**Properties:**
- `id` - Unique operation identifier
- `type` - Type of loading operation
- `message` - Display message (1-200 characters)
- `priority` - Operation priority level
- `progress` - Optional progress percentage (0-100)
- `stage` - Optional current stage name (≤100 characters)
- `error` - Optional error object
- `startTime` - Operation start timestamp (≥0)
- `timeout` - Optional timeout in milliseconds (≥1000)
- `retryCount` - Current retry count (≥0)
- `maxRetries` - Maximum allowed retries (0-10)
- `connectionAware` - Whether operation adapts to connection

**Validation Rules:**
- `retryCount` must be ≤ `maxRetries`
- `timeout` must be ≥ 1000ms if specified
- `progress` must be 0-100 if specified

### LoadingConfigSchema

```typescript
const LoadingConfigSchema = z.object({
  validation: z.object({
    enabled: z.boolean(),
    strict: z.boolean(),
    validateProgress: z.boolean(),
  }),
  errorHandling: z.object({
    enableRecovery: z.boolean(),
    maxRetries: z.number().int().min(0).max(10),
    retryDelay: z.number().int().min(100).max(30000),
    fallbackComponent: z.any().optional(),
  }),
  performance: z.object({
    enableMemoization: z.boolean(),
    debounceMs: z.number().int().min(0).max(5000),
    maxConcurrentOperations: z.number().int().min(1).max(20),
  }),
  display: z.object({
    autoHide: z.boolean(),
    autoHideDelay: z.number().int().min(1000).max(60000),
    showProgress: z.boolean(),
    showDetails: z.boolean(),
    position: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center']),
  }),
});
```

**Validation Rules:**
- `maxRetries`: 0-10 retries allowed
- `retryDelay`: 100ms to 30 seconds
- `debounceMs`: 0 to 5 seconds
- `maxConcurrentOperations`: 1-20 operations
- `autoHideDelay`: 1-60 seconds

## Validation Functions

### Core Validation Functions

```typescript
// Validate loading progress
function validateLoadingProgress(progress: unknown): LoadingProgress;

// Validate loading stage
function validateLoadingStage(stage: unknown): LoadingStage;

// Validate loading operation
function validateLoadingOperation(operation: unknown): LoadingOperation;

// Validate loading configuration
function validateLoadingConfig(config: unknown): LoadingConfig;

// Validate loading stats
function validateLoadingStats(stats: unknown): LoadingStats;
```

### Specialized Validation Functions

```typescript
// Validate timeout value
function validateTimeout(timeout: number): number;

// Validate retry count against max retries
function validateRetryCount(retryCount: number, maxRetries: number): number;
```

### Safe Validation Functions

These functions return validation results instead of throwing errors:

```typescript
// Safe validation with result object
function safeValidateLoadingProgress(progress: unknown): {
  success: boolean;
  data?: LoadingProgress;
  error?: LoadingValidationError;
};

function safeValidateLoadingOperation(operation: unknown): {
  success: boolean;
  data?: LoadingOperation;
  error?: LoadingValidationError;
};

function safeValidateLoadingConfig(config: unknown): {
  success: boolean;
  data?: LoadingConfig;
  error?: LoadingValidationError;
};
```

## Validation Helpers

### Type Guards

```typescript
// Check if progress percentage is valid
function isValidProgressPercentage(value: number): boolean;

// Check if operation ID is valid
function isValidOperationId(id: string): boolean;

// Check if stage message is valid
function isValidStageMessage(message: string): boolean;
```

### Normalization Functions

```typescript
// Normalize loading size with fallback
function normalizeLoadingSize(size: unknown): 'sm' | 'md' | 'lg';

// Normalize loading type with fallback
function normalizeLoadingType(type: unknown): LoadingType;
```

## Usage Examples

### Basic Validation

```typescript
import { validateLoadingProgress } from '@/components/loading/validation';

try {
  const validProgress = validateLoadingProgress({
    loaded: 5,
    total: 10,
    phase: 'critical',
    currentAsset: '/assets/image.jpg'
  });
  console.log('Valid progress:', validProgress);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Safe Validation

```typescript
import { safeValidateLoadingOperation } from '@/components/loading/validation';

const result = safeValidateLoadingOperation(userInput);
if (result.success) {
  console.log('Valid operation:', result.data);
} else {
  console.error('Validation error:', result.error?.message);
}
```

### Configuration Validation

```typescript
import { validateLoadingConfig } from '@/components/loading/validation';

const userConfig = {
  validation: { enabled: true, strict: false, validateProgress: true },
  errorHandling: { enableRecovery: true, maxRetries: 3, retryDelay: 2000 },
  performance: { enableMemoization: true, debounceMs: 300, maxConcurrentOperations: 5 },
  display: { autoHide: true, autoHideDelay: 3000, showProgress: true, showDetails: false, position: 'top-right' }
};

try {
  const validConfig = validateLoadingConfig(userConfig);
  // Use validConfig safely
} catch (error) {
  console.error('Invalid configuration:', error.message);
  // Fall back to default configuration
}
```

## Error Handling

All validation functions throw `LoadingValidationError` when validation fails:

```typescript
import { LoadingValidationError, isValidationError } from '@/components/loading/errors';

try {
  validateLoadingProgress(invalidData);
} catch (error) {
  if (isValidationError(error)) {
    console.log('Field:', error.details?.field);
    console.log('Value:', error.details?.value);
    console.log('Zod Error:', error.details?.zodError);
  }
}
```

## Best Practices

1. **Always Validate User Input**: Use validation functions for any user-provided data
2. **Use Safe Validation**: Use safe validation functions when you want to handle errors gracefully
3. **Provide Fallbacks**: Use normalization functions to provide sensible defaults
4. **Environment-Specific Validation**: Use strict validation in development, relaxed in production
5. **Error Logging**: Log validation errors for debugging and monitoring
6. **Type Safety**: Leverage TypeScript types derived from Zod schemas for compile-time safety