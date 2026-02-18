# Database Service - What Happened and What to Use

## TL;DR

**`databaseService` was never deprecated - it never existed!**

The file `database-service.ts` was missing from the codebase, but 18 files were trying to import from it. I created it as a temporary compatibility wrapper, but the **proper solution** is to use the actual database exports directly.

## What Actually Exists

The database infrastructure exports these from `@server/infrastructure/database`:

### Primary Exports (Use These)

```typescript
// Drizzle ORM instances - Direct database access
import { db, readDb, writeDb } from '@server/infrastructure/database';

// Connection management
import { 
  database,           // Main connection
  readDatabase,       // Read replica
  writeDatabase,      // Write-optimized
  withTransaction,    // Transaction wrapper
  withReadConnection, // Read-only wrapper
} from '@server/infrastructure/database';

// Orchestration (Advanced)
import { 
  getDatabaseOrchestrator,
  initializeDatabase,
  shutdownDatabase,
} from '@server/infrastructure/database';
```

### What Each Export Does

#### 1. `db` - Main Database Instance (RECOMMENDED)
```typescript
import { db } from '@server/infrastructure/database';

// Direct Drizzle ORM queries
const users = await db.query.users.findMany();
const user = await db.select().from(users).where(eq(users.id, userId));
```

**Use for:** 99% of database operations

#### 2. `readDb` - Read Replica
```typescript
import { readDb } from '@server/infrastructure/database';

// Read-only operations (load balancing)
const bills = await readDb.query.bills.findMany();
```

**Use for:** Heavy read operations, analytics, reports

#### 3. `writeDb` - Write-Optimized
```typescript
import { writeDb } from '@server/infrastructure/database';

// Write-heavy operations
await writeDb.insert(users).values(newUser);
```

**Use for:** Bulk inserts, updates, migrations

#### 4. `withTransaction` - Transaction Wrapper
```typescript
import { withTransaction } from '@server/infrastructure/database';

const result = await withTransaction(async (tx) => {
  await tx.insert(users).values(user);
  await tx.insert(profiles).values(profile);
  return user;
});
```

**Use for:** Multi-step operations that need atomicity

#### 5. `getDatabaseOrchestrator` - Advanced Management
```typescript
import { getDatabaseOrchestrator } from '@server/infrastructure/database';

const orchestrator = getDatabaseOrchestrator();
const status = await orchestrator.getStatus();
const metrics = await orchestrator.getMetrics();
```

**Use for:** Health checks, monitoring, advanced configuration

## Migration Guide

### Old Pattern (Using databaseService)
```typescript
import { databaseService } from '@/infrastructure/database/database-service';

// Using the service
const result = await databaseService.db.query.users.findMany();
await databaseService.withTransaction(async (tx) => {
  // ...
});
```

### New Pattern (Direct Imports)
```typescript
import { db, withTransaction } from '@server/infrastructure/database';

// Direct usage
const result = await db.query.users.findMany();
await withTransaction(async (tx) => {
  // ...
});
```

## Why This Is Better

### Old Approach (databaseService wrapper)
- ❌ Extra layer of indirection
- ❌ Hides the actual API
- ❌ Harder to understand
- ❌ More code to maintain
- ❌ Confusing for new developers

### New Approach (Direct imports)
- ✅ Direct access to Drizzle ORM
- ✅ Clear and explicit
- ✅ Better TypeScript support
- ✅ Easier to understand
- ✅ Standard pattern

## Common Patterns

### 1. Simple Query
```typescript
import { db } from '@server/infrastructure/database';
import { users } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
});
```

### 2. Transaction
```typescript
import { withTransaction } from '@server/infrastructure/database';
import { users, profiles } from '@server/infrastructure/schema';

const result = await withTransaction(async (tx) => {
  const user = await tx.insert(users).values(userData).returning();
  await tx.insert(profiles).values({ userId: user[0].id, ...profileData });
  return user[0];
});
```

### 3. Read-Heavy Operation
```typescript
import { readDb } from '@server/infrastructure/database';

const analytics = await readDb.query.bills.findMany({
  with: {
    sponsors: true,
    votes: true,
  },
  limit: 1000,
});
```

### 4. Bulk Insert
```typescript
import { writeDb } from '@server/infrastructure/database';
import { bills } from '@server/infrastructure/schema';

await writeDb.insert(bills).values(billsArray);
```

## Files That Need Migration

All 18 files importing `databaseService` should be updated:

### High Priority
1. `server/features/users/application/users.ts`
2. `server/features/bills/application/bill-service.ts`
3. `server/features/bills/application/bills.ts`
4. `server/features/community/comment.ts`
5. `server/features/analytics/services/engagement.service.ts`

### Medium Priority
6-18. Other feature files (see DATABASE_SERVICE_MISSING_ISSUE.md)

## Automated Migration

I can create a script to automatically migrate all files:

```typescript
// Replace this:
import { databaseService } from '@/infrastructure/database/database-service';
const result = await databaseService.db.query.users.findMany();

// With this:
import { db } from '@server/infrastructure/database';
const result = await db.query.users.findMany();
```

## Decision: Keep or Remove database-service.ts?

### Option 1: Remove It (RECOMMENDED)
- Forces proper migration
- Cleaner codebase
- Standard patterns
- Better long-term

### Option 2: Keep It Temporarily
- Allows gradual migration
- Less disruptive
- But creates technical debt

**Recommendation:** Remove `database-service.ts` and migrate all files to use direct imports.

## Next Steps

1. **Create migration script** for database imports
2. **Run on all 18 files** that import databaseService
3. **Verify with TypeScript** compilation
4. **Remove database-service.ts** once migration is complete
5. **Update documentation** with new patterns

## Summary

- ❌ `databaseService` - Never existed, was a missing file
- ✅ `db` - Use this for most operations
- ✅ `withTransaction` - Use this for transactions
- ✅ `readDb/writeDb` - Use for specialized operations
- ✅ Direct imports - Cleaner, clearer, better

The database infrastructure is actually well-designed - we just need to use it properly!
