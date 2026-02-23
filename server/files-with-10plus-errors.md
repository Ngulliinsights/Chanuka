# Files with 10+ TypeScript Errors - Dependency Analysis

**Total Files:** 150+
**Generated:** 2026-02-20

## Top 20 Files by Error Count

### 1. services/managed-government-data-integration.ts (242 errors)
**Common Issues:**
- Missing module: `@server/infrastructure/observability`
- Missing module: `@server/infrastructure/database`
- Missing module: `@server/infrastructure/error-handling`
- Unused variables and parameters
- Null safety issues

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
import { databaseService } from '@server/infrastructure/database';
import { ErrorCategory } from '@server/infrastructure/error-handling';
```

---

### 2. features/bills/application/bill-tracking.service.ts (77 errors)
**Common Issues:**
- Missing shared types
- Null safety issues
- Type mismatches

**Dependencies to Fix:**
```typescript
import { Result } from '@shared/core';
import { logger } from '@server/infrastructure/observability';
import { DatabaseService } from '@server/infrastructure/database';
```

---

### 3. features/search/SearchController.ts (65 errors)
**Common Issues:**
- Missing observability module
- Type annotation issues
- Unused parameters

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
import { errorTracker } from '@server/infrastructure/observability';
```

---

### 4. features/argument-intelligence/application/structure-extractor.ts (61 errors)
**Common Issues:**
- Missing observability
- Type safety issues
- Null checks needed

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
```

---

### 5. features/privacy/privacy-service.ts (56 errors)
**Common Issues:**
- Missing observability
- Missing database module
- Type mismatches

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
import { databaseService } from '@server/infrastructure/database';
```

---

### 6. infrastructure/notifications/smart-notification-filter.ts (54 errors)
**Common Issues:**
- Missing observability
- Type annotation issues
- Null safety

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
```

---

### 7. features/government-data/services/government-data-integration.service.ts (54 errors)
**Common Issues:**
- Missing observability
- Missing database
- Type issues

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
import { databaseService } from '@server/infrastructure/database';
```

---

### 8. infrastructure/schema/integration-extended.ts (53 errors)
**Common Issues:**
- Schema type issues
- Missing exports
- Type mismatches

**Dependencies to Fix:**
```typescript
// Check schema exports in infrastructure/schema/index.ts
```

---

### 9. features/analytics/analytics.ts (52 errors)
**Common Issues:**
- Missing observability
- Missing database
- Type annotation issues

**Dependencies to Fix:**
```typescript
import { logger } from '@server/infrastructure/observability';
import { databaseService } from '@server/infrastructure/database';
```

---

### 10. features/bills/domain/services/bill-domain-service.ts (50 errors)
**Common Issues:**
- Missing shared core types
- Missing observability
- Type mismatches

**Dependencies to Fix:**
```typescript
import { Result, Err, Ok } from '@shared/core';
import { logger } from '@server/infrastructure/observability';
```

---

## Common Dependency Issues Across All Files

### Most Common Missing Modules (Fix These First!)

1. **@server/infrastructure/observability** (212 files affected)
   - Status: ✅ Module exists
   - Issue: Path resolution failing
   - Fix: Verify tsconfig paths, check for circular dependencies

2. **@server/infrastructure/database** (78 files affected)
   - Status: ✅ Module exists
   - Issue: Path resolution failing
   - Fix: Verify exports in index.ts

3. **@server/infrastructure/error-handling** (12 files affected)
   - Status: ✅ Module exists
   - Issue: Path resolution failing
   - Fix: Check exports

4. **@shared/core** (Multiple imports failing)
   - Status: ❓ Need to verify
   - Issue: May need to build shared package first
   - Fix: Run `npx tsc --build shared`

5. **@server/middleware/auth** (11 files affected)
   - Status: ✅ Module exists
   - Issue: Path resolution
   - Fix: Check exports

### Incorrect Path Aliases (26 files)

Files using `@/infrastructure/observability` instead of `@server/infrastructure/observability`:
- All files in `infrastructure/database/graph/`
- Some files in `features/analytics/`

**Fix:** Search and replace:
```bash
# Replace @/infrastructure/observability with @server/infrastructure/observability
# Replace @/infrastructure/errors with @server/infrastructure/error-handling
# Replace @/infrastructure/ with @server/infrastructure/
# Replace @/utils/ with @server/utils/
```

---

## Files by Category

### Infrastructure Files (High Priority)

| File | Errors | Main Issue |
|------|--------|------------|
| infrastructure/schema/integration-extended.ts | 53 | Schema exports |
| infrastructure/notifications/smart-notification-filter.ts | 54 | Observability |
| infrastructure/schema/integration.ts | 48 | Schema exports |
| infrastructure/schema/index.ts | 46 | Schema exports |
| infrastructure/schema/validation-integration.ts | 44 | Schema exports |
| infrastructure/core/validation/data-validation.ts | 43 | Observability |
| infrastructure/external-data/data-synchronization-service.ts | 42 | Observability, Database |
| infrastructure/demo-data.ts | 35 | Multiple imports |
| infrastructure/websocket/index.ts | 32 | Observability |

### Feature Files (Medium Priority)

| File | Errors | Main Issue |
|------|--------|------------|
| features/bills/application/bill-tracking.service.ts | 77 | Shared types, Observability |
| features/search/SearchController.ts | 65 | Observability |
| features/argument-intelligence/application/structure-extractor.ts | 61 | Observability |
| features/privacy/privacy-service.ts | 56 | Observability, Database |
| features/government-data/services/government-data-integration.service.ts | 54 | Observability, Database |
| features/analytics/analytics.ts | 52 | Observability, Database |
| features/bills/domain/services/bill-domain-service.ts | 50 | Shared core, Observability |
| features/users/application/users.ts | 49 | Observability, Database |
| features/sponsors/application/sponsor-conflict-analysis.service.ts | 49 | Observability |
| features/admin/admin-router.ts | 49 | Multiple imports |

### Service Files (Medium Priority)

| File | Errors | Main Issue |
|------|--------|------------|
| services/managed-government-data-integration.ts | 242 | Observability, Database, Error handling |

### Utility Files (Low Priority)

| File | Errors | Main Issue |
|------|--------|------------|
| utils/missing-modules-fallback.ts | 37 | Unused parameters, Type issues |
| utils/metrics.ts | 13 | Observability, Unused parameters |

---

## Recommended Fix Order

### Phase 1: Fix Path Aliases (Quick Win - 30 minutes)
1. Replace all `@/infrastructure/observability` with `@server/infrastructure/observability` (26 files)
2. Replace all `@/infrastructure/` with `@server/infrastructure/`
3. Replace all `@/utils/` with `@server/utils/`
4. Replace all `@/shared/` with `@shared/`

**Command:**
```bash
# In server directory
find . -name "*.ts" -type f -exec sed -i "s|@/infrastructure/observability|@server/infrastructure/observability|g" {} +
find . -name "*.ts" -type f -exec sed -i "s|@/infrastructure/|@server/infrastructure/|g" {} +
find . -name "*.ts" -type f -exec sed -i "s|@/utils/|@server/utils/|g" {} +
find . -name "*.ts" -type f -exec sed -i "s|@/shared/|@shared/|g" {} +
```

### Phase 2: Build Shared Package (5 minutes)
```bash
cd ..
npx tsc --build shared --force
```

### Phase 3: Verify Observability Module (10 minutes)
1. Check `server/infrastructure/observability/index.ts` exports
2. Verify no circular dependencies
3. Test import in a single file

### Phase 4: Fix Top 10 Files Manually (2-3 hours)
Focus on files with 50+ errors:
1. services/managed-government-data-integration.ts (242 errors)
2. features/bills/application/bill-tracking.service.ts (77 errors)
3. features/search/SearchController.ts (65 errors)
4. features/argument-intelligence/application/structure-extractor.ts (61 errors)
5. features/privacy/privacy-service.ts (56 errors)
6. infrastructure/notifications/smart-notification-filter.ts (54 errors)
7. features/government-data/services/government-data-integration.service.ts (54 errors)
8. infrastructure/schema/integration-extended.ts (53 errors)
9. features/analytics/analytics.ts (52 errors)
10. features/bills/domain/services/bill-domain-service.ts (50 errors)

### Phase 5: Re-run Compilation
```bash
npx tsc --noEmit
```

---

## Quick Reference: Common Fixes

### Fix 1: Observability Import
```typescript
// ❌ Wrong
import { logger } from '@/core/observability';

// ✅ Correct
import { logger } from '@server/infrastructure/observability';
```

### Fix 2: Database Import
```typescript
// ❌ Wrong
import { databaseService } from '@/infrastructure/database';

// ✅ Correct
import { databaseService } from '@server/infrastructure/database';
```

### Fix 3: Error Handling Import
```typescript
// ❌ Wrong
import { ErrorCategory } from '@/infrastructure/error-handling';

// ✅ Correct
import { ErrorCategory } from '@server/infrastructure/error-handling';
```

### Fix 4: Shared Core Import
```typescript
// ❌ Wrong
import { Result } from '@shared/types/core/errors';

// ✅ Correct
import { Result } from '@shared/core';
```

### Fix 5: Unused Parameter
```typescript
// ❌ Wrong
function handler(req: Request, res: Response, next: NextFunction) {
  // next is never used
}

// ✅ Correct
function handler(req: Request, res: Response, _next: NextFunction) {
  // Prefix with underscore if required by interface
}
```

---

## Estimated Impact

- **Phase 1 (Path Aliases):** ~200-300 errors fixed
- **Phase 2 (Build Shared):** ~100-200 errors fixed
- **Phase 3 (Verify Observability):** ~212 errors fixed
- **Phase 4 (Top 10 Files):** ~700 errors fixed

**Total Potential:** ~1,200-1,400 errors fixed (out of 5,510)
**Remaining:** ~4,100-4,300 errors (mostly type annotations, null safety, unused code)
