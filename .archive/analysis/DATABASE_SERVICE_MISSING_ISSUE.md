# Critical Issue: Missing `databaseService` Export

## Problem
18 files across the codebase are importing `databaseService` from `@server/infrastructure/database/database-service` or `@/infrastructure/database/database-service`, but this file **does not exist** in the source code.

## Affected Files

### Infrastructure (6 files):
1. server/infrastructure/integration/service-orchestrator.ts
2. server/infrastructure/migration/repository-deployment-validator.ts
3. server/infrastructure/database/persistence/drizzle/drizzle-sponsor-repository.ts
4. server/infrastructure/database/persistence/drizzle/drizzle-user-repository.ts
5. server/infrastructure/database/persistence/drizzle/drizzle-bill-repository.ts
6. server/infrastructure/adapters/drizzle-adapter.ts

### Features (12 files):
7. server/features/users/domain/user-profile.ts
8. server/features/users/application/user-service-direct.ts
9. server/features/analytics/services/engagement.service.ts
10. server/features/recommendation/infrastructure/RecommendationRepository.ts
11. server/features/bills/domain/services/bill-domain-service.ts
12. server/features/government-data/services/government-data-integration.service.ts
13. server/features/bills/application/bills.ts
14. server/features/bills/application/bill-service.ts
15. server/features/community/comment.ts
16. server/features/analysis/application/bill-comprehensive-analysis.service.ts
17. server/features/community/comment-voting.ts
18. server/features/alert-preferences/domain/services/unified-alert-preference-service.ts

## Root Cause

The `database-service.ts` file was likely deleted or never created during a database infrastructure refactoring. The current database exports (from `server/infrastructure/database/index.ts`) are:

### Available Exports:
- `database`, `readDatabase`, `writeDatabase` (from connection.ts)
- `db`, `readDb`, `writeDb` (from pool.ts)
- `getDatabaseOrchestrator()` - New orchestrator pattern
- `initializeDatabase()`, `shutdownDatabase()`
- `executeWithDatabase()` - Wrapper for operations

### Missing Export:
- `databaseService` - **Does not exist**

## Solution Options

### Option 1: Create Missing `database-service.ts` (Quick Fix)
Create a compatibility layer that exports a `databaseService` object wrapping the existing database exports:

```typescript
// server/infrastructure/database/database-service.ts
import { db, readDb, writeDb } from './pool';
import { getDatabaseOrchestrator } from './core/database-orchestrator';

export const databaseService = {
  db,
  readDb,
  writeDb,
  getOrchestrator: getDatabaseOrchestrator,
  // Add other commonly used methods
};

export class DatabaseService {
  get db() { return db; }
  get readDb() { return readDb; }
  get writeDb() { return writeDb; }
  // Add other methods as needed
}
```

### Option 2: Update All Imports (Proper Fix)
Replace all `databaseService` imports with the appropriate new exports:

- For direct database access: Use `db` from `@server/infrastructure/database`
- For read operations: Use `readDb`
- For write operations: Use `writeDb`
- For orchestration: Use `getDatabaseOrchestrator()`

Example migration:
```typescript
// Before:
import { databaseService } from '@/infrastructure/database/database-service';
const result = await databaseService.db.query.users.findMany();

// After:
import { db } from '@server/infrastructure/database';
const result = await db.query.users.findMany();
```

### Option 3: Add Export to index.ts (Compatibility)
Add a `databaseService` export to the database index.ts that wraps existing functionality.

## Recommendation

**Option 1 (Quick Fix)** - Create the missing file as a compatibility layer to unblock development, then gradually migrate to Option 2.

This is why the `@server` alias appears to not be resolving - the module itself doesn't exist, so TypeScript correctly reports "Cannot find module".

## Impact

- **Build Status**: Likely failing (18 files with import errors)
- **Runtime Status**: Would fail if these modules are loaded
- **Test Status**: Tests for affected modules would fail

## Priority

🔴 **CRITICAL** - This blocks compilation and runtime execution of major features including:
- User management
- Bill tracking
- Analytics
- Recommendations
- Community features
