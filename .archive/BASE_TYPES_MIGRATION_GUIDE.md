# Base Types Migration Guide

## Comprehensive Guide to Type System Migration

This guide provides detailed instructions for migrating from legacy types to the standardized type system. It includes examples, breaking changes, and replacement patterns.

## Table of Contents

- [Introduction](#introduction)
- [Migration Tools](#migration-tools)
- [Deprecation Warnings](#deprecation-warnings)
- [Breaking Changes](#breaking-changes)
- [Replacement Patterns](#replacement-patterns)
- [Migration Examples](#migration-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

The type system has been standardized to ensure consistency across the entire codebase. This migration guide helps you transition from legacy types to the new standardized system.

### Why Migrate?

- **Consistency**: Unified type architecture across all layers
- **Maintainability**: Easier to understand and modify types
- **Performance**: Optimized type definitions
- **Future-proof**: Aligned with best practices and industry standards

### Migration Process Overview

1. **Identify deprecated types** in your codebase
2. **Review replacement patterns** for each deprecated type
3. **Update imports** to use standardized types
4. **Refactor code** following migration examples
5. **Test thoroughly** to ensure compatibility
6. **Remove deprecated imports** once migration is complete

## Migration Tools

The migration utilities provide automated tools to simplify the migration process:

### Core Migration Tools

- **Type Analysis**: Analyze type structure and compatibility
- **Type Transformation**: Automated transformation between type versions
- **Batch Processing**: Migrate multiple items efficiently
- **Validation**: Ensure migrated types are valid
- **State Tracking**: Monitor migration progress

### Usage Examples

```typescript
import { MigrationTools } from 'shared/types/migration/migration-tools';

// Analyze type structure
const analysis = MigrationTools.analyzeTypeStructure(legacyItem, standardDefinition);

// Transform to standard type
const standardItem = MigrationTools.transformToStandardType(
  legacyItem,
  StandardType,
  fieldMapping
);

// Migrate batch of items
const result = await MigrationTools.migrateBatch(
  legacyItems,
  migrationFunction,
  batchSize
);
```

## Deprecation Warnings

The system includes comprehensive deprecation warning management:

### Deprecation Registry

```typescript
import { DeprecationRegistry } from 'shared/types/migration/deprecation-warnings';

const registry = DeprecationRegistry.getInstance();

// Register a deprecation warning
registry.registerDeprecation({
  typeName: 'LegacyType',
  versionDeprecated: '2.0.0',
  versionRemoved: '3.0.0',
  replacementType: 'StandardType',
  replacementImport: 'shared/types/standard',
  severity: 'high',
  message: 'This type has been deprecated',
});

// Emit warning when legacy type is used
registry.emitWarning('LegacyType');
```

### Deprecation Configuration

```typescript
// Configure deprecation behavior
registry.configure({
  suppressWarnings: false,
  logToConsole: true,
  throwErrors: process.env.NODE_ENV === 'development',
});
```

## Breaking Changes

### Major Breaking Changes

#### BC-001: LoadingOperation Restructuring

**Description**: LoadingOperation interface has been completely restructured with new field names and types.

**Old Signature**:
```typescript
interface LoadingOperation {
  operationId: string;
  operationType: 'page' | 'api' | 'asset';
  startedAt: Date | number;
  endedAt?: Date | number;
  status: 'loading' | 'complete' | 'error';
  retryCount: number;
  maxRetries: number;
  error?: string;
  progress?: number;
}
```

**New Signature**:
```typescript
interface LoadingOperation {
  id: string;
  type: LoadingType;
  startTime: number;
  endTime?: number;
  timeout?: number;
  estimatedTime?: number;
  retryCount: number;
  maxRetries: number;
  retryStrategy: RetryStrategy;
  retryDelay: number;
  state: LoadingState;
  message?: string;
  error?: Error | string;
  progress?: number;
  stage?: string;
  connectionAware: boolean;
  dependencies?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
  timeoutWarningShown: boolean;
  cancelled: boolean;
  description?: string;
}
```

**Migration Path**: Use `LoadingOperationTransformer` for automated migration.

#### BC-002: BaseEntity Field Naming

**Description**: BaseEntity field names changed from camelCase to snake_case for database consistency.

**Old Signature**:
```typescript
interface BaseEntity {
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**New Signature**:
```typescript
interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}
```

**Migration Path**: Use `BaseEntityTransformer` for automated migration.

#### BC-003: ApiResponse Standardization

**Description**: ApiResponse structure standardized with consistent error handling.

**Old Signature**:
```typescript
interface ApiResponse<T = any> {
  result: T;
  success: boolean;
  errorCode?: number;
  errorMessage?: string;
  timestamp: string;
}
```

**New Signature**:
```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: ApiError;
  timestamp: string;
}
```

**Migration Path**: Use `ApiResponseTransformer` for automated migration.

## Replacement Patterns

### LegacyLoadingOperation → LoadingOperation

**Import Path**: `shared/types/loading`

**Code Example**:

**Before**:
```typescript
import { LegacyLoadingOperation } from './legacy-types';

const operation: LegacyLoadingOperation = {
  operationId: 'op1',
  operationType: 'api',
  startedAt: new Date(),
  status: 'loading',
  retryCount: 0,
  maxRetries: 3,
};
```

**After**:
```typescript
import { LoadingOperation } from 'shared/types/loading';

const operation: LoadingOperation = {
  id: 'op1',
  type: 'api',
  startTime: Date.now(),
  state: 'loading',
  retryCount: 0,
  maxRetries: 3,
  retryStrategy: 'exponential',
  retryDelay: 1000,
  connectionAware: false,
  timeoutWarningShown: false,
  cancelled: false,
};
```

### LegacyEntity → BaseEntity

**Import Path**: `shared/schema/base-types`

**Code Example**:

**Before**:
```typescript
import { LegacyEntity } from './legacy-types';

const entity: LegacyEntity = {
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

**After**:
```typescript
import { BaseEntity } from 'shared/schema/base-types';

const entity: BaseEntity = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  created_at: new Date(),
  updated_at: new Date(),
};
```

### LegacyApiResponse → ApiResponse

**Import Path**: `shared/types/api/response-types`

**Code Example**:

**Before**:
```typescript
import { LegacyApiResponse } from './legacy-types';

const response: LegacyApiResponse<User> = {
  result: { id: 'user1', name: 'John Doe' },
  success: true,
  errorCode: 200,
  errorMessage: '',
  timestamp: new Date().toISOString(),
};
```

**After**:
```typescript
import { ApiResponse } from 'shared/types/api/response-types';

const response: ApiResponse<User> = {
  data: { id: 'user1', name: 'John Doe' },
  success: true,
  error: undefined,
  timestamp: new Date().toISOString(),
};
```

## Migration Examples

### Complete Loading State Migration

**Title**: Migrating Loading State Management

**Description**: Complete example of migrating loading state from legacy to standardized format.

**Before**:
```typescript
import { LegacyLoadingState } from './legacy-types';

interface AppState {
  loading: LegacyLoadingState;
  data: any;
}

const state: AppState = {
  loading: {
    isLoading: true,
    operations: {
      'op1': {
        operationId: 'op1',
        operationType: 'api',
        startedAt: new Date(),
        status: 'loading',
      }
    },
    globalLoading: true,
  },
  data: null,
};
```

**After**:
```typescript
import { LoadingStateData } from 'shared/types/loading';

interface AppState {
  loading: LoadingStateData;
  data: any;
}

const state: AppState = {
  loading: {
    isLoading: true,
    operations: {
      'op1': {
        id: 'op1',
        type: 'api',
        startTime: Date.now(),
        state: 'loading',
        retryCount: 0,
        maxRetries: 3,
        retryStrategy: 'exponential',
        retryDelay: 1000,
        connectionAware: false,
        timeoutWarningShown: false,
        cancelled: false,
      }
    },
    stats: {
      totalOperations: 1,
      activeOperations: 1,
      completedOperations: 0,
      failedOperations: 0,
      averageLoadTime: 0,
      retryRate: 0,
      successRate: 0,
      connectionImpact: 'low',
      lastUpdate: Date.now(),
      currentQueueLength: 0,
      peakQueueLength: 0,
    },
    connectionInfo: {
      type: 'unknown',
    },
    isOnline: true,
    adaptiveSettings: {
      enableAnimations: true,
      maxConcurrentOperations: 5,
      defaultTimeout: 30000,
      retryDelay: 1000,
      timeoutWarningThreshold: 5000,
      connectionMultiplier: 1,
    },
    globalLoading: true,
    highPriorityLoading: false,
    assetLoadingProgress: {
      loaded: 0,
      total: 0,
      phase: 'initial',
      status: 'pending',
    },
  },
  data: null,
};
```

**Key Changes**:
- Replaced LegacyLoadingState with LoadingStateData
- Updated operation structure to LoadingOperation
- Added comprehensive statistics and connection info
- Added adaptive settings for performance optimization

### Database Entity Migration

**Title**: Database Entity Migration

**Description**: Migrating database entities to standardized format.

**Before**:
```typescript
import { LegacyAuditEntity } from './legacy-types';

interface User extends LegacyAuditEntity {
  username: string;
  email: string;
}

const user: User = {
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-15'),
  createdBy: 'system',
  updatedBy: 'admin',
  deletedAt: null,
  deletedBy: null,
  username: 'johndoe',
  email: 'john@example.com',
};
```

**After**:
```typescript
import { FullAuditEntity } from 'shared/schema/base-types';

interface User extends FullAuditEntity {
  username: string;
  email: string;
}

const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  created_at: new Date('2023-01-01'),
  updated_at: new Date('2023-01-15'),
  created_by: 'system',
  updated_by: 'admin',
  deleted_at: null,
  deleted_by: null,
  username: 'johndoe',
  email: 'john@example.com',
};
```

**Key Changes**:
- Replaced LegacyAuditEntity with FullAuditEntity
- Changed field names from camelCase to snake_case
- Maintained all audit trail functionality

## Best Practices

### Migration Strategy

1. **Incremental Migration**: Migrate types gradually rather than all at once
2. **Feature Flagging**: Use feature flags to toggle between old and new implementations
3. **Backward Compatibility**: Maintain backward compatibility during transition periods
4. **Comprehensive Testing**: Test migrated code thoroughly before deployment
5. **Documentation Updates**: Update documentation as you migrate

### Code Organization

1. **Separate Migration Files**: Keep migration-related code separate from business logic
2. **Clear Naming Conventions**: Use clear names for migration utilities
3. **Modular Design**: Design migration tools to be reusable and modular
4. **Error Handling**: Implement robust error handling for migration processes

### Performance Considerations

1. **Batch Processing**: Use batch processing for large migrations
2. **Memory Management**: Be mindful of memory usage during migrations
3. **Progress Tracking**: Implement progress tracking for long-running migrations
4. **Timeout Handling**: Handle timeouts appropriately

## Troubleshooting

### Common Issues and Solutions

**Issue**: TypeScript compilation errors after migration
- **Solution**: Check field mappings and ensure all required fields are present

**Issue**: Runtime errors with migrated types
- **Solution**: Validate migrated data and implement proper error handling

**Issue**: Performance issues during migration
- **Solution**: Use batch processing and optimize migration functions

**Issue**: Deprecation warnings not showing
- **Solution**: Check deprecation registry configuration and ensure warnings are enabled

### Debugging Tips

1. **Enable Detailed Logging**: Set `logMigrationDetails: true` in migration config
2. **Use Validation Tools**: Validate data before and after migration
3. **Check Type Compatibility**: Use type compatibility utilities
4. **Review Migration Logs**: Examine migration logs for errors and warnings

## Additional Resources

- **Type Transformers**: `shared/types/migration/type-transformers.ts`
- **Validation Migrator**: `shared/types/migration/validation-migrator.ts`
- **Migration Helpers**: `shared/types/migration/migration-helpers.ts`
- **Breaking Changes**: `shared/types/migration/breaking-changes.ts`
- **Replacement Patterns**: `shared/types/migration/replacement-patterns.ts`

## Support

For additional support with migration:

- **Check the examples** in the replacement patterns documentation
- **Review breaking changes** for specific migration guidance
- **Use migration utilities** for automated assistance
- **Consult the development team** for complex migration scenarios

## Changelog

- **1.0.0**: Initial migration guide with core patterns and examples
- **1.1.0**: Added comprehensive examples and troubleshooting section
- **1.2.0**: Enhanced best practices and performance considerations

This guide will be updated as new migration patterns and best practices emerge.
