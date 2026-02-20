# Logger Usage Guide - When to Use Which Logger

## Overview

The observability system provides two types of loggers with different purposes:

1. **`logger`** - Core structured logger (from `core/logger.ts`)
2. **`databaseLogger`** - Specialized database operation logger (from `database/database-logger.ts`)

## When to Use `logger`

Use the core `logger` for **infrastructure and system-level concerns**:

```typescript
import { logger } from '@server/infrastructure/observability';

// ✅ Connection pool management
logger.error('Pool error', { poolSize, waiting, component: 'DatabasePool' });

// ✅ Circuit breaker state changes
logger.warn('Circuit breaker opened', { failures, threshold });

// ✅ Health checks
logger.info('Health check passed', { uptime, memory });

// ✅ Server lifecycle events
logger.info('Server starting', { port, environment });

// ✅ Middleware operations
logger.debug('Request received', { method, path, duration });
```

## When to Use `databaseLogger`

Use `databaseLogger` for **application-level database operations**:

```typescript
import { databaseLogger } from '@server/infrastructure/observability';

// ✅ Wrapping database operations with automatic timing
const result = await databaseLogger.logOperation(
  context,
  async () => {
    return await db.select().from(users).where(eq(users.id, userId));
  }
);

// ✅ Logging query performance
databaseLogger.logQueryPerformance(
  'users',
  'SELECT',
  duration,
  { sql, params, recordCount }
);

// ✅ Audit trails for sensitive operations
databaseLogger.logAudit({
  action: 'UPDATE',
  entityType: 'user',
  entityId: userId,
  userId: currentUserId,
  sensitive: true,
  changes: { email: 'old@example.com -> new@example.com' }
});

// ✅ Batch operations
databaseLogger.logBatchOperation(
  context,
  batchSize,
  results,
  totalDuration
);
```

## Updated pool.ts Usage

The `pool.ts` file now uses both appropriately:

```typescript
// Infrastructure concerns → logger
logger.error('Pool error in read', { error, poolSize, component: 'DatabasePool' });
logger.warn('Circuit breaker opened', { failures, threshold });

// Query performance → databaseLogger
if (duration > CONFIG.SLOW_QUERY_THRESHOLD) {
  databaseLogger.logQueryPerformance(
    context || 'unknown',
    text,
    duration,
    { sql, params, recordCount }
  );
}
```

## Benefits of Using databaseLogger

When you use `databaseLogger` for database operations, you automatically get:

1. **Automatic timing** - Start/end timestamps calculated automatically
2. **Slow query detection** - Compares against configurable thresholds
3. **Error tracking integration** - Forwards errors to centralized error tracker
4. **Audit trail support** - Structured logging for compliance
5. **Batch operation summaries** - Aggregated metrics for bulk operations
6. **Performance recommendations** - Suggests optimizations for slow queries

## Import Pattern

```typescript
// For infrastructure/system logging
import { logger } from '@server/infrastructure/observability';

// For database operations
import { databaseLogger } from '@server/infrastructure/observability';

// Or import both
import { logger, databaseLogger } from '@server/infrastructure/observability';
```

## Summary

- **`logger`** = Infrastructure, connections, health, lifecycle
- **`databaseLogger`** = Queries, transactions, audits, performance

The separation ensures proper categorization and enables specialized features for database operations while keeping infrastructure logging simple and focused.
