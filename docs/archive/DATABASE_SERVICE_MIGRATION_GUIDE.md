# DatabaseService Migration Guide

## Summary

The `DatabaseService` class has been deprecated and removed. All database operations should now use direct imports from `@server/infrastructure/database`.

## What Changed

### Old Approach (DEPRECATED)
```typescript
import { databaseService } from '@server/infrastructure/database/database-service';

const result = await databaseService.withFallback(
  async () => {
    const data = await db.select().from(table).where(eq(table.id, id));
    return data;
  },
  fallbackValue,
  'operationName'
);

// Access result
return result.data;
```

### New Approach (CURRENT)
```typescript
import { database as db, readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';

try {
  const data = await db.select().from(table).where(eq(table.id, id));
  return data;
} catch (error) {
  logger.error('Operation failed', { 
    error, 
    component: 'ServiceName',
    operation: 'operationName',
    context: { id }
  });
  return fallbackValue; // or throw error
}
```

## Migration Steps

### Step 1: Update Imports

**Remove:**
```typescript
import { databaseService } from '@server/infrastructure/database/database-service';
import { DatabaseService } from '@/infrastructure/database/database-service';
```

**Add:**
```typescript
import { database as db, readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
```

### Step 2: Replace withFallback Calls

#### Pattern 1: Simple Query with Fallback
**Before:**
```typescript
const result = await databaseService.withFallback(
  async () => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  },
  null,
  'getUserById'
);
return result.data;
```

**After:**
```typescript
try {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
} catch (error) {
  logger.error('Failed to get user by ID', { 
    error, 
    component: 'UserService',
    userId 
  });
  return null;
}
```

#### Pattern 2: Complex Query with Data Transformation
**Before:**
```typescript
const result = await databaseService.withFallback(
  async () => {
    const data = await db.select().from(bills).where(eq(bills.id, billId));
    return data.map(transformBill);
  },
  [],
  'getBills'
);
return result.data;
```

**After:**
```typescript
try {
  const data = await db.select().from(bills).where(eq(bills.id, billId));
  return data.map(transformBill);
} catch (error) {
  logger.error('Failed to get bills', { 
    error, 
    component: 'BillService',
    billId 
  });
  return [];
}
```

#### Pattern 3: Transaction Operations
**Before:**
```typescript
const result = await databaseService.withFallback(
  async () => {
    await withTransaction(async (tx) => {
      await tx.insert(table).values(data);
      await tx.update(otherTable).set({ updated: true });
    });
    return true;
  },
  false,
  'complexTransaction'
);
```

**After:**
```typescript
try {
  await withTransaction(async (tx) => {
    await tx.insert(table).values(data);
    await tx.update(otherTable).set({ updated: true });
  });
  return true;
} catch (error) {
  logger.error('Transaction failed', { 
    error, 
    component: 'ServiceName',
    operation: 'complexTransaction'
  });
  return false;
}
```

#### Pattern 4: Read-Only Operations
**Before:**
```typescript
const result = await databaseService.withFallback(
  async () => {
    return await databaseService.readDb.select().from(table);
  },
  [],
  'readOperation'
);
```

**After:**
```typescript
try {
  return await readDatabase.select().from(table);
} catch (error) {
  logger.error('Read operation failed', { 
    error, 
    component: 'ServiceName'
  });
  return [];
}
```

### Step 3: Database Connection Selection

Choose the appropriate database connection based on your operation:

| Operation Type | Connection | Use Case |
|---------------|------------|----------|
| General queries | `database` or `db` | Default for most operations |
| Read-only queries | `readDatabase` | SELECT queries, reports, analytics |
| Write operations | `writeDatabase` | INSERT, UPDATE, DELETE |
| Transactions | `withTransaction()` | Multi-step atomic operations |

### Step 4: Error Handling Best Practices

1. **Always log errors** with context:
```typescript
logger.error('Operation failed', {
  error,
  component: 'ServiceName',
  operation: 'operationName',
  context: { userId, billId, etc }
});
```

2. **Return appropriate fallback values**:
   - `null` for single entity queries
   - `[]` for list queries
   - `false` for boolean operations
   - `0` for count operations
   - Or throw the error if it should propagate

3. **Include operation context** in logs for debugging

## Files Requiring Migration

The following files still have `databaseService.withFallback` calls:

1. ✅ **server/infrastructure/migration/repository-deployment-validator.ts** - Import removed
2. ✅ **server/features/community/comment-voting.ts** - Import removed
3. ✅ **server/features/community/comment.ts** - Import removed
4. ✅ **server/features/bills/application/bills.ts** - Import removed
5. ✅ **server/features/bills/application/bill-tracking.service.ts** - Import removed
6. ✅ **server/features/analysis/application/bill-comprehensive-analysis.service.ts** - Import removed
7. ✅ **server/features/analytics/services/engagement.service.ts** - Import removed

### Still Need Code Updates:
8. ⚠️ **server/features/users/domain/user-profile.ts** - 11 withFallback calls
9. ⚠️ **server/features/search/infrastructure/SearchIndexManager.ts** - 4 withFallback calls
10. ⚠️ **server/infrastructure/adapters/drizzle-adapter.ts** - 4 withFallback calls

## Testing After Migration

After migrating each file:

1. Run TypeScript compiler: `npm run type-check`
2. Run tests: `npm test -- <file-pattern>`
3. Check for runtime errors in development
4. Verify error logging is working correctly
5. Ensure fallback values are returned appropriately

## Benefits of New Approach

1. **Simpler code**: No wrapper abstraction
2. **Better error visibility**: Explicit try-catch blocks
3. **Type safety**: Direct Drizzle ORM types
4. **Performance**: One less function call
5. **Standard patterns**: Consistent with modern Node.js practices
6. **Better debugging**: Clear stack traces

## Common Pitfalls

1. **Forgetting to handle errors**: Always wrap database calls in try-catch
2. **Not logging errors**: Include logger.error() in catch blocks
3. **Wrong connection type**: Use readDatabase for reads, writeDatabase for writes
4. **Missing context in logs**: Include relevant IDs and parameters
5. **Incorrect fallback values**: Match the return type (null vs [] vs false)

## Need Help?

If you encounter issues during migration:
1. Check this guide for patterns
2. Look at already-migrated files for examples
3. Ensure all imports are correct
4. Verify error handling is comprehensive
