# Complete DatabaseService Migration - Action Plan

## Current Status

✅ **Phase 1 Complete**: All imports removed from 7 files
⚠️ **Phase 2 In Progress**: 37 `databaseService.withFallback` calls need replacement

## Quick Win Strategy

Since the files are large and patterns are complex, here's the most efficient approach:

### Step 1: Add Missing Import (CRITICAL)

All files that still use `databaseService` need this import added back temporarily OR we need to remove all the calls. Since we removed the imports, TypeScript will show errors. We have two options:

**Option A: Add back import temporarily** (Not recommended - defeats the purpose)
**Option B: Replace all calls now** (Recommended)

### Step 2: Systematic Replacement Pattern

For each file, use this find-and-replace strategy:

#### Pattern to Find:
```typescript
const result = await databaseService.withFallback(
  async () => {
    // ... operation code ...
  },
  fallbackValue,
  'operationName'
);
return result.data;
```

#### Replace With:
```typescript
try {
  // ... operation code ...
  return data; // or whatever the operation returns
} catch (error) {
  logger.error('Operation failed', { 
    error, 
    component: 'ComponentName',
    operation: 'operationName'
  });
  return fallbackValue;
}
```

## File-by-File Action Plan

### Priority 1: Small Files (Start Here)

#### 1. server/infrastructure/adapters/drizzle-adapter.ts (4 calls)
- **Lines**: 61, 93, 245, 317
- **Component**: 'DrizzleAdapter'
- **Estimated time**: 20 minutes
- **Note**: Also fix duplicate import on line 17-18

#### 2. server/features/search/infrastructure/SearchIndexManager.ts (4 calls)
- **Lines**: 158, 236, 347, 418
- **Component**: 'SearchIndexManager'
- **Estimated time**: 20 minutes
- **Note**: File already has a withFallback helper function defined

#### 3. server/features/analytics/services/engagement.service.ts (4 calls)
- **Lines**: 36, 155, 263, 325
- **Component**: 'EngagementService'
- **Estimated time**: 20 minutes

### Priority 2: Medium Files

#### 4. server/features/community/comment-voting.ts (5 calls)
- **Lines**: 36, 149, 172, 232, 317, 404
- **Component**: 'CommentVotingService'
- **Estimated time**: 30 minutes

#### 5. server/features/community/comment.ts (9 calls)
- **Lines**: 118, 362, 441, 562, 634, 660, 717, 743
- **Component**: 'CommentService'
- **Estimated time**: 45 minutes

### Priority 3: Large File

#### 6. server/features/users/domain/user-profile.ts (11 calls)
- **Lines**: 176, 262, 319, 355, 457, 507, 551, 611, 665, 792
- **Component**: 'UserProfileService'
- **Estimated time**: 60 minutes

## Detailed Example: First Replacement

Let's do the first one together as an example:

### File: server/infrastructure/adapters/drizzle-adapter.ts
### Line: 61 - findById method

**BEFORE:**
```typescript
async findById(id: string | number): Promise<TEntity | null> {
  const startTime = Date.now();
  
  try {
    const result = await databaseService.withFallback(
      async () => {
        const [row] = await db
          .select()
          .from(this.table)
          .where(eq(this.table.id, id))
          .limit(1);

        return row ? this.entityMapping.toEntity(row as TRow) : null;
      },
      null,
      `DrizzleAdapter:findById:${this.tableName}:${id}`
    );

    this.logPerformance('findById', startTime, { id, found: !!result.data });
    return result.data;
  } catch (error) {
    this.logError('findById', error, { id });
    throw error;
  }
}
```

**AFTER:**
```typescript
async findById(id: string | number): Promise<TEntity | null> {
  const startTime = Date.now();
  
  try {
    const [row] = await db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    const result = row ? this.entityMapping.toEntity(row as TRow) : null;
    this.logPerformance('findById', startTime, { id, found: !!result });
    return result;
  } catch (error) {
    logger.error('Operation failed', {
      error,
      component: 'DrizzleAdapter',
      operation: `findById:${this.tableName}:${id}`,
      context: { id }
    });
    this.logError('findById', error, { id });
    return null; // fallback value
  }
}
```

## Common Patterns You'll Encounter

### Pattern 1: Simple Query
```typescript
// OLD
const result = await databaseService.withFallback(
  async () => await db.select().from(table),
  [],
  'operation'
);
return result.data;

// NEW
try {
  return await db.select().from(table);
} catch (error) {
  logger.error('Operation failed', { error, component: 'X', operation: 'operation' });
  return [];
}
```

### Pattern 2: With Transformation
```typescript
// OLD
const result = await databaseService.withFallback(
  async () => {
    const data = await db.select().from(table);
    return data.map(transform);
  },
  [],
  'operation'
);
return result.data;

// NEW
try {
  const data = await db.select().from(table);
  return data.map(transform);
} catch (error) {
  logger.error('Operation failed', { error, component: 'X', operation: 'operation' });
  return [];
}
```

### Pattern 3: With Transaction
```typescript
// OLD
const result = await databaseService.withFallback(
  async () => {
    await withTransaction(async (tx) => {
      // operations
    });
    return true;
  },
  false,
  'operation'
);
return result.data;

// NEW
try {
  await withTransaction(async (tx) => {
    // operations
  });
  return true;
} catch (error) {
  logger.error('Transaction failed', { error, component: 'X', operation: 'operation' });
  return false;
}
```

### Pattern 4: With Fallback Check
```typescript
// OLD
const result = await databaseService.withFallback(
  async () => {
    // operation
    return data;
  },
  fallbackValue,
  'operation'
);

if (result.source === 'fallback') {
  console.warn('Using fallback');
}
return result.data;

// NEW
try {
  // operation
  return data;
} catch (error) {
  logger.error('Operation failed', { error, component: 'X', operation: 'operation' });
  logger.warn('Using fallback value');
  return fallbackValue;
}
```

## Testing After Each File

```bash
# 1. Check TypeScript errors for that file
npx tsc --noEmit server/path/to/file.ts

# 2. Run tests if available
npm test -- file-name

# 3. Check all TypeScript errors
npm run type-check
```

## Commit Strategy

Commit after each file:
```bash
git add server/path/to/file.ts
git commit -m "refactor: migrate databaseService.withFallback in [filename]"
```

## Estimated Total Time

- Small files (3): 1 hour
- Medium files (2): 1.25 hours
- Large file (1): 1 hour
- Testing: 30 minutes
- **Total: ~3.75 hours**

## Need Help?

If you get stuck:
1. Check the pattern examples above
2. Look at DATABASE_SERVICE_MIGRATION_GUIDE.md
3. The key is: extract the async operation, wrap in try-catch, add logging, return fallback on error

## Ready to Start?

Begin with `server/infrastructure/adapters/drizzle-adapter.ts` - it's the smallest and will give you confidence for the rest!
