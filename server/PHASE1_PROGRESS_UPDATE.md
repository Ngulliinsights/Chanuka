# Phase 1 Progress Update - Circular Dependency Fixes

**Date:** 2026-02-20
**Status:** In Progress

## Actions Completed

### 1. Fixed Critical Circular Dependencies (6 files)

Fixed circular import chains that were preventing module resolution:

1. **error-tracker.ts** - Changed `import { logger } from '../'` to `import { logger } from '../core/logger'`
   - Broke: `observability/index.ts` → `monitoring/error-tracker.ts` → `observability/index.ts`

2. **resilience.ts** - Changed `import { logger } from '../observability'` to `import { logger } from '../observability/core/logger'`
   - Broke part of large circular chain involving error-handling → observability

3. **connection.ts** - Changed `import { logger } from '@server/infrastructure/core/index'` to `import { logger } from '@server/infrastructure/observability/core/logger'`
   - Broke: database → core → auth → error-handling → observability → database

4. **pool.ts** - Changed imports to direct paths:
   - `import { logger } from '../observability/core/logger'`
   - `import { databaseLogger } from '../observability/database/database-logger'`
   - Broke: database/pool → observability/index → monitoring-scheduler → database

5. **base-script.ts** - Changed `import { logger } from '../../observability'` to `import { logger } from '../../observability/core/logger'`
   - Broke: database/utils → observability/index → monitoring-scheduler → database

6. **image-utils.ts** (shared) - Changed `import { ErrorDomain, ErrorSeverity } from '../../index'` to `import { ErrorDomain, ErrorSeverity } from '../../errors/error-types'`
   - Broke: shared/core/index → shared/core/utils/index → shared/core/utils/images/image-utils → shared/core/index

## Error Reduction

- **Before fixes:** 5,242 errors
- **After fixes:** 5,233 errors
- **Reduction:** 9 errors fixed

## Remaining Circular Dependencies

Still detected by dependency-cruiser:

1. **Schema circular dependencies** (3 instances):
   - `foundation.ts` ↔ `trojan_bill_detection.ts`
   - `foundation.ts` ↔ `political_economy.ts`
   - `foundation.ts` ↔ `participation_oversight.ts`
   - **Impact:** Medium - schema files import each other
   - **Fix:** Requires schema refactoring (extract shared types)

2. **Database/Schema circular dependency**:
   - `database/pool.ts` → `schema/index.ts` → `database/index.ts` → `database/pool.ts`
   - **Impact:** Medium - affects database initialization
   - **Fix:** Extract schema types to separate module

3. **Large circular chain** (still exists but partially broken):
   - `database/index.ts` → `observability/monitoring-scheduler.ts` → `core/validation/schema-validation-service.ts` → `database/index.ts`
   - **Impact:** High - affects module resolution
   - **Fix:** Requires architectural refactoring

## Module Resolution Status

**Top TS2307 errors (Cannot find module):**
- `@server/infrastructure/observability`: 235 instances (UNCHANGED)
- `@server/infrastructure/database`: 76 instances
- `@shared/core/utils/api-utils`: 19 instances
- `@shared/core/observability/logging`: 16 instances
- `@server/types/index`: 15 instances

**Root Cause:** The circular dependency fixes didn't resolve the module resolution issues because:
1. Shared package has 1,059 TypeScript errors preventing build
2. TypeScript project references can't be built without shared package
3. Module resolution requires built declaration files (.d.ts)

## Next Steps

### Option A: Fix Shared Package First (Recommended)
1. Fix critical errors in shared package (focus on exports and types)
2. Build shared package successfully
3. Build server with project references
4. Module resolution should work

### Option B: Bypass Project References (Faster)
1. Remove `composite: true` from tsconfigs temporarily
2. Remove `references` from tsconfigs
3. Use direct file imports instead of path aliases
4. Fix errors without building

### Option C: Manual Import Fixes (Most Work)
1. Find all 235 files importing `@server/infrastructure/observability`
2. Change to direct file imports: `import { logger } from './infrastructure/observability/core/logger'`
3. Repeat for all failing modules
4. Tedious but guaranteed to work

## Recommendation

**Proceed with Option B** (Bypass Project References):
- Fastest path to fixing server errors
- Can re-enable project references later
- Allows us to continue with Phase 1 tasks

**Command to execute:**
```bash
# Temporarily disable composite mode
# Edit server/tsconfig.json: set "composite": false
# Edit tsconfig.json: remove "references" array
# Re-run tsc
```

## Files Modified

1. `server/infrastructure/observability/monitoring/error-tracker.ts`
2. `server/infrastructure/error-handling/resilience.ts`
3. `server/infrastructure/database/connection.ts`
4. `server/infrastructure/database/pool.ts`
5. `server/infrastructure/database/utils/base-script.ts`
6. `shared/core/utils/images/image-utils.ts`

## Verification

Circular dependencies reduced but not eliminated:
```bash
npx depcruise --config .dependency-cruiser.cjs --output-type err server/infrastructure/observability
# Shows remaining circular dependencies in schema and database modules
```

TypeScript errors slightly reduced:
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Result: 5,233 (was 5,242)
```
