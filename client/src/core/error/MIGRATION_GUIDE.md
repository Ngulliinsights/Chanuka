# Error Handling Migration Guide

## Overview

This guide covers the migration from the monolithic `utils/errors.ts` system to the modular `core/error/` architecture while maintaining full feature parity.

## What Changed

### Before (utils/errors.ts)
```typescript
import { UnifiedErrorHandler, BaseError, NetworkError } from '@client/utils/errors';

const handler = UnifiedErrorHandler.getInstance();
```

### After (core/error/)
```typescript
import { coreErrorHandler, BaseError, NetworkError } from '@client/core/error';

// Handler is already initialized as singleton
```

## Migration Steps

### 1. Update Imports

**Replace these imports:**
```typescript
// OLD
import { 
  UnifiedErrorHandler,
  BaseError,
  NetworkError,
  ValidationError,
  ErrorDomain,
  ErrorSeverity 
} from '@client/utils/errors';

// NEW
import { 
  coreErrorHandler,
  BaseError,
  NetworkError,
  ValidationError,
  ErrorDomain,
  ErrorSeverity 
} from '@client/core/error';
```

### 2. Update Handler Usage

**Replace handler calls:**
```typescript
// OLD
const handler = UnifiedErrorHandler.getInstance();
handler.handleError(error, context);

// NEW
coreErrorHandler.handleError({
  type: ErrorDomain.NETWORK,
  severity: ErrorSeverity.MEDIUM,
  message: error.message,
  context
});
```

### 3. Update Error Creation

**Use the new factory methods:**
```typescript
// OLD
const error = new NetworkError('Connection failed', context);

// NEW - Option 1: Use classes directly
const error = new NetworkError('Connection failed', context);

// NEW - Option 2: Use factory
import { ErrorFactory } from '@client/core/error';
const error = ErrorFactory.createNetworkError('Connection failed', details, context);

// NEW - Option 3: Use handler convenience methods
const error = createNetworkError('Connection failed', details, context);
```

## Feature Parity

All features from `utils/errors.ts` are available in the modular system:

| Feature | utils/errors.ts | core/error/ | Status |
|---------|----------------|-------------|---------|
| Error Classes | ✅ BaseError, NetworkError, etc. | ✅ Same classes | ✅ Migrated |
| Error Handler | ✅ UnifiedErrorHandler | ✅ coreErrorHandler | ✅ Enhanced |
| Analytics | ✅ ErrorAnalyticsService | ✅ ErrorAnalyticsService | ✅ Migrated |
| Reporting | ✅ ErrorReportingService | ✅ ErrorReportingService | ✅ Migrated |
| Rate Limiting | ✅ ErrorRateLimiter | ✅ ErrorRateLimiter | ✅ Migrated |
| Recovery Strategies | ✅ Built-in strategies | ✅ Enhanced strategies | ✅ Improved |
| React Integration | ✅ Error boundaries | ✅ Error boundaries | ✅ Maintained |

## Benefits of Migration

1. **Modular Architecture**: Easier to maintain and extend
2. **Better Tree Shaking**: Only import what you need
3. **Clearer Dependencies**: No circular dependency issues
4. **Enhanced Testing**: Each module can be tested in isolation
5. **Team Scalability**: Different teams can own different modules

## Automated Migration

Run this command to automatically update imports:

```bash
# Find and replace imports
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@client\/utils\/errors/@client\/core\/error/g'

# Update specific handler references
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/UnifiedErrorHandler\.getInstance()/coreErrorHandler/g'
```

## Validation

After migration, verify:

1. All imports resolve correctly
2. Error handling still works as expected
3. Analytics and reporting continue to function
4. Recovery strategies are still active
5. No runtime errors in console

## Rollback Plan

If issues arise, you can temporarily:

1. Keep both systems running in parallel
2. Gradually migrate components one by one
3. Use feature flags to control which system is active

The old `utils/errors.ts` can remain as a fallback until migration is complete.