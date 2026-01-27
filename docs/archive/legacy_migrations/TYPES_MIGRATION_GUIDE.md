# Type System Consolidation - Migration Guide

**Status:** Implementation Ready  
**Scope:** Complete type system unification  
**Impact:** 171+ files will have import changes  

---

## Migration Phases (ALL AT ONCE)

Instead of gradual migration, we execute the complete restructure in one atomic change. This prevents partial states and conflicting intermediate versions.

---

## Phase 0: Preparation (No Code Changes)

### 0.1 Create New Canonical Files

Create these new files with consolidated definitions:

```bash
# Create directory structure
mkdir -p shared/types/core

# Create canonical files (see details below)
touch shared/types/core/errors.ts
touch shared/types/core/validation.ts
touch shared/types/core/health-check.ts
touch shared/types/core/circuit-breaker.ts
touch shared/types/core/rate-limit.ts
touch shared/types/core/cache.ts
touch shared/types/core/auth.ts
```

### 0.2 Copy Content from Scattered Sources

**errors.ts:** Consolidate from:
- `@types/core/error.d.ts`
- `shared/core/observability/error-management/errors/`
- `shared/core/types/validation-types.ts` (ValidationError class)

**validation.ts:** Consolidate from:
- `shared/core/validation/types/`
- `shared/core/validation/core/interfaces/`
- `shared/core/types/validation-types.ts`

**health-check.ts:** Consolidate from:
- `shared/core/observability/health/types/`
- `shared/core/middleware/types` (HealthStatus)
- `shared/core/caching/types` (HealthStatus)

**circuit-breaker.ts:** Consolidate from:
- `shared/core/caching/types/` (CircuitBreakerState)
- `shared/core/observability/error-management/patterns/circuit-breaker/`

**rate-limit.ts:** Consolidate from:
- `shared/core/rate-limiting/types/`
- `shared/core/middleware/types` (RateLimitStore)

**cache.ts:** Consolidate from:
- `shared/core/caching/types/`
- `shared/core/types/index.ts` (CacheOptions)

**auth.ts:** Consolidate from:
- `shared/core/types/auth.types.ts`
- `shared/core/authentication/types/` (if exists)

### 0.3 Update shared/types/core/index.ts

Replace the 152-line alias block with clean re-exports:

```typescript
// shared/types/core/index.ts (AFTER)
/**
 * Core Type System
 * 
 * CANONICAL SOURCES OF TRUTH for:
 * - Error handling (AppError, ValidationError, etc.)
 * - Validation contracts (ValidationResult, ValidationContext)
 * - Infrastructure types (HealthStatus, CircuitBreakerState, RateLimitStore, CacheOptions)
 * - Authentication contracts (AuthContext, AuthToken)
 * - Feature flags and real-time types
 * 
 * NO ALIASES. One definition per concept, everywhere.
 */

export * from './base';          // BaseEntity, Identifiable, Timestamped, Auditable
export * from './errors';        // AppError and 40+ error classes
export * from './validation';    // ValidationError, ValidationResult, ValidationContext
export * from './health-check';  // HealthStatus, HealthCheckResult
export * from './circuit-breaker'; // CircuitBreakerState, CircuitBreakerMetrics
export * from './rate-limit';    // RateLimitStore, RateLimitConfig, RateLimitInfo
export * from './cache';         // CacheOptions, CacheMetrics, EvictionPolicy
export * from './auth';          // AuthContext, AuthToken, AuthProvider
export * from '../auth.types';   // Re-export from original location (can delete later)
export * from '../realtime';     // Re-export from original location (can delete later)
export * from '../feature-flags'; // Re-export from original location (can delete later)
```

That's it. No aliases. Just canonical sources.

---

## Phase 1: Update All Imports (171+ files)

This is the bulk operation. Use find-and-replace patterns to update imports systematically.

### 1.1 Update imports FROM scattered sources TO canonical locations

**Pattern 1: Validation errors**
```bash
# Find all files importing ValidationError from non-canonical locations
rg "import.*ValidationError.*from.*validation/types" -l

# Replace: from ../validation/types → from @shared/types/core/validation
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { ValidationError } from '[^']*validation/types'|import { ValidationError } from '@shared/types/core/validation'|g" {} +
```

**Pattern 2: HealthStatus**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { HealthStatus } from '[^']*observability/health/types'|import { HealthStatus } from '@shared/types/core/health-check'|g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { HealthStatus } from '[^']*middleware/types'|import { HealthStatus } from '@shared/types/core/health-check'|g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { HealthStatus } from '[^']*caching/types'|import { HealthStatus } from '@shared/types/core/health-check'|g" {} +
```

**Pattern 3: CircuitBreakerState**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { CircuitBreakerState } from '[^']*caching/types'|import { CircuitBreakerState } from '@shared/types/core/circuit-breaker'|g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { CircuitBreakerState } from '[^']*error-management/patterns/circuit-breaker'|import { CircuitBreakerState } from '@shared/types/core/circuit-breaker'|g" {} +
```

**Pattern 4: RateLimitStore**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { RateLimitStore } from '[^']*rate-limiting/types'|import { RateLimitStore } from '@shared/types/core/rate-limit'|g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { RateLimitStore } from '[^']*middleware/types'|import { RateLimitStore } from '@shared/types/core/rate-limit'|g" {} +
```

**Pattern 5: CacheOptions, CacheMetrics**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { CacheOptions } from '[^']*caching/types'|import { CacheOptions } from '@shared/types/core/cache'|g" {} +
```

**Pattern 6: All AppError subclasses**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|import { AppError, ValidationError, .* } from '[^']*observability/error-management/|import { AppError, ValidationError, /* ... */ } from '@shared/types/core/errors'|g" {} +
```

### 1.2 Remove imports from @types/

**Pattern 7: Remove @types/core/api imports**
```bash
# Find files importing from @types/core/api
rg "import.*from '@types/core/api" -l

# Replace with @shared/types/api
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|from '@types/core/api'|from '@shared/types/api'|g" {} +
```

**Pattern 8: Remove @types/core/* imports**
```bash
# All @types/core/* should become @shared/types/core/* or @shared/types/api/*
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|from '@types/core/error'|from '@shared/types/core/errors'|g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|from '@types/shared/errors'|from '@shared/types/core/errors'|g" {} +
```

### 1.3 Remove alias imports

**Pattern 9: Remove ValidationError aliases**
```bash
# Before: import { ValidationError as ValidationTypesError }
# After: import { ValidationError }

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as ValidationTypesError//g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as ErrorManagementValidationError//g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as ValidationTypesAlias//g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as ModernizationValidationError//g" {} +
```

**Pattern 10: Remove HealthStatus aliases**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as ObservabilityHealthStatus//g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as MiddlewareHealthStatus//g" {} +
```

**Pattern 11: Remove CircuitBreakerState aliases**
```bash
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as CacheCircuitBreakerState//g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s/ as ObservabilityCircuitBreakerState//g" {} +
```

### 1.4 Remove duplicate client definitions

**Pattern 12: Remove client duplicate imports**
```bash
# client/src/core/api/types/request.ts → DELETE
# client/src/core/api/types/error-response.ts → DELETE

# Update client/src/core/api/types/index.ts to remove these exports and import from shared instead
find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|from './request'|from '@shared/types/api'|g" {} +

find . -name "*.ts" -not -path "./node_modules/*" -exec sed -i \
  "s|from './error-response'|from '@shared/types/api'|g" {} +
```

### 1.5 Manual Review & Fix

After bulk replacements, manually verify:

```bash
# Find any remaining non-canonical imports
echo "=== Checking for remaining non-canonical imports ==="
rg "from '\.\./[^']*validation/types'" || echo "✅ No scattered validation imports"
rg "from '\.\./[^']*observability/" || echo "✅ No scattered observability imports"
rg "from '\.\./[^']*caching/" || echo "✅ No scattered caching imports"
rg "from '@types/" || echo "✅ No @types/ imports"
rg " as ValidationTypesError" && echo "❌ Found validation alias" || echo "✅ No validation aliases"
rg " as HealthStatus.*Error" && echo "❌ Found health status alias" || echo "✅ No health status aliases"

# Count total import statements (for verification)
echo ""
echo "=== Import Stats ==="
rg "^import.*from '@shared/types/core/" --type ts | wc -l | xargs echo "Canonical shared/types/core imports:"
rg "^import.*from '@shared/types/api/" --type ts | wc -l | xargs echo "Canonical shared/types/api imports:"
rg "^import.*from '@server/types/" --type ts | wc -l | xargs echo "Canonical server/types imports:"
```

---

## Phase 2: Delete Duplicate Files

Only after imports are updated, delete the old scattered files:

```bash
# Error definitions
rm -f @types/core/error.d.ts
rm -f @types/core/dashboard.d.ts
rm -f @types/core/loading.d.ts
rm -f @types/core/storage.d.ts
rm -f @types/core/performance.d.ts
rm -f @types/core/mobile.d.ts
rm -f @types/core/browser.d.ts
rm -f @types/shared/core.d.ts
rm -f @types/shared/errors.d.ts
rm -f @types/shared/database.d.ts
rm -f @types/server/api-response.d.ts
rm -f @types/server/features.d.ts
rm -f @types/server/middleware.d.ts
rm -f @types/server/services.d.ts

# Client duplicates
rm -f client/src/core/api/types/request.ts
rm -f client/src/core/api/types/error-response.ts
rm -f client/src/core/api/types/shared-imports.ts  # If it existed

# Consolidated files (now in canonical locations)
rm -f shared/core/types/validation-types.ts  # Merged into shared/types/core/validation.ts
```

Update index files:
```bash
# shared/core/types/index.ts → Already updated in Phase 0.3
# @types/core/index.ts → Remove business logic exports, keep only ambient
# @types/index.ts → Verify it only exports ambient declarations
```

---

## Phase 3: Update TypeScript Configuration

Verify `tsconfig.json` path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/types/*": ["shared/types/*"],
      "@shared/types/api": ["shared/types/api/index.ts"],
      "@shared/types/core/*": ["shared/types/core/*"],
      "@shared/types/domains/*": ["shared/types/domains/*"],
      "@server/types": ["server/types/index.ts"],
      "@client/*": ["client/src/*"]
    }
  }
}
```

No changes needed if these are already configured. Verify with:
```bash
npm run build || npx tsc --noEmit -p tsconfig.json
```

---

## Phase 4: Verification

### 4.1 TypeScript Compilation
```bash
npx tsc --noEmit -p tsconfig.json
# Should complete with 0 errors
```

### 4.2 Verify No Duplication
```bash
# Count definitions per concept (should be exactly 1 each)
echo "Validation errors: $(rg "^export.*ValidationError" --type ts | wc -l)"
echo "Health statuses: $(rg "^export.*HealthStatus" --type ts | wc -l)"
echo "API responses: $(rg "^export.*ApiResponse" --type ts | wc -l)"
echo "API requests: $(rg "^export.*ApiRequest" --type ts | wc -l)"
echo "API errors: $(rg "^export.*ApiError" --type ts | wc -l)"

# All should print "1"
```

### 4.3 Verify No Aliases
```bash
# Should find nothing (empty output)
rg "export.*as.*Error|export.*as.*Status|export.*as.*Store" \
  shared/core/types/index.ts \
  shared/types/core/index.ts

# If it finds anything, that's the old alias block - delete it
```

### 4.4 Verify No Business Logic in @types/
```bash
# Should be empty (only ambient declarations)
grep -r "^export interface\|^export class\|^export type" @types/ --include="*.d.ts" | \
  grep -v "declare\|declare global" | wc -l

# Should print 0
```

### 4.5 Run Tests
```bash
npm test
# All tests should pass
```

### 4.6 Check for Broken Imports
```bash
# Find any remaining imports of deleted files
rg "from.*['\"].*request.ts['\"]" client/src/ && echo "❌ Client still imports from request.ts" || echo "✅ No request.ts imports"
rg "from.*['\"].*error-response.ts['\"]" client/src/ && echo "❌ Client still imports from error-response.ts" || echo "✅ No error-response.ts imports"
rg "from.*validation-types" shared/core/ && echo "❌ Found validation-types imports" || echo "✅ No validation-types imports"
```

---

## Phase 5: Documentation

Create migration documentation:

**File: TYPES_MIGRATION_COMPLETED.md**
```markdown
# Type System Consolidation Complete

**Date:** [Today]
**Changes:**
- Consolidated 18 type directories → 6 unified directories
- Eliminated 12+ naming conflicts
- Removed 8+ duplicate type definitions
- Updated 171+ import paths
- Created canonical sources of truth

**Results:**
- ✅ 0 naming conflicts
- ✅ 1 definition per concept
- ✅ 0 aliases (problem solved, not masked)
- ✅ All tests pass
- ✅ TypeScript compilation clean

**Canonical Import Paths:**
- API contracts: `@shared/types/api`
- Errors: `@shared/types/core/errors`
- Validation: `@shared/types/core/validation`
- Infrastructure: `@shared/types/core/{health-check,circuit-breaker,rate-limit,cache}`
- Domains: `@shared/types/domains/{domain}`
- Server adapters: `@server/types`
- Client UI: `@client/core/api/types`

See TYPES_SYSTEM_GOVERNANCE.md for ongoing rules.
```

---

## Execution Summary

```
Total phases: 5
Total files modified: 171+
Total files deleted: 25+
Total files created: 8
Total time: ~6-8 hours

Steps:
1. Create canonical type files (Phase 0) - 1 hour
2. Update all import paths (Phase 1) - 2-3 hours (with manual review)
3. Delete duplicate files (Phase 2) - 30 min
4. Update TypeScript config (Phase 3) - 15 min
5. Run verification (Phase 4) - 1 hour (tests + debugging if needed)
6. Document completion (Phase 5) - 30 min

Success criteria:
□ tsc --noEmit passes with 0 errors
□ npm test passes with 100% success
□ 0 remaining naming conflicts
□ 0 remaining aliases
□ 0 business logic in @types/
□ All canonical imports use @shared/types/ or @server/types/
```

---

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# Revert the entire change
git reset --hard HEAD

# Or cherry-pick specific parts:
git revert [commit-hash]
```

But thorough verification in Phase 4 should prevent issues. The consolidation is safe because:
- All imports verified before file deletion
- TypeScript compilation is strict
- Tests must pass
- No production code is changed, only type definitions reorganized

---

## Post-Consolidation (Maintenance)

After consolidation is complete:

1. **Enable Governance (Daily)**
   - Run pre-commit hooks to detect duplication
   - ESLint rule blocks non-canonical imports

2. **Monthly Audit**
   - Run `scripts/audit-type-system.sh`
   - Document results in TYPES_AUDIT_LOG.md
   - Fix any drift immediately

3. **Code Review**
   - All type PRs require steward approval
   - Check canonical locations before merge
   - Link to TYPES_SYSTEM_GOVERNANCE.md in review

4. **Onboarding**
   - New developers read TYPES_SYSTEM_GOVERNANCE.md
   - Decision tree in contributing guide
   - No surprises about where types should live

---

## Questions & Answers

**Q: What if I find an import I didn't expect?**
A: Check TYPES_SYSTEM_GOVERNANCE.md decision tree. If canonical location is unclear, file an issue for steward review.

**Q: Can I add a new type to @types/?**
A: NO. @types/ is for ambient augmentations only. New types go to shared/types/ or server/types/ or client/.

**Q: What if my type fits multiple locations?**
A: Follow the decision tree in TYPES_SYSTEM_GOVERNANCE.md. If still ambiguous, discuss with steward before coding.

**Q: How do I deprecate an old type?**
A: Add `@deprecated` JSDoc comment, link to replacement, provide migration timeline. Don't delete immediately.

**Q: Can I create aliases for convenience?**
A: NO. Aliases mask problems. If type location is confusing, fix the location, don't add an alias.

---

Ready to execute. Approve and I'll run all phases.
