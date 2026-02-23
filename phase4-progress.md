# Phase 4: Manual Fix Protocol - Progress Report

**Date**: 2026-02-22  
**Spec**: `.kiro/specs/import-resolution-audit`

## Current Status

### Errors Remaining
- **Server**: 1,004 TS2307 errors (module not found)
- **Shared**: 33 TS2307 errors (down from 55 - 40% reduction!)
- **Client**: Not yet analyzed

### Root Cause Analysis

The primary issue is NOT with alias configuration, but with **incorrect import paths** from incomplete migrations:

1. **@shared/schema → @server/infrastructure/schema** (~15+ files)
2. **@shared/database → @server/infrastructure/database** (1 file - FIXED ✅)
3. **@shared/core/utils/api-utils** → Unknown new location (19 errors)
4. **@shared/core/observability/logging** → @server/infrastructure/observability (16 errors)
5. **@server/types/index** → Likely moved or deleted (15 errors)

### Configuration Changes Made

#### Phase 1 Config Fixes ✅
- Added 56 missing alias declarations across 7 config files
- Fixed @workspace/* aliases in Vitest and server
- Added @shared/* sub-aliases to Vite
- Added @shared/platform and @shared/i18n to all packages

#### Phase 2 Structural Fixes ✅
- Fixed infrastructure/errors → infrastructure/error-handling (2 files)
- Removed empty infrastructure/errors/ directory
- Fixed missing imports in users.ts (safeAsync, err, create*Error functions)

#### Phase 4 Additional Config Fixes
- Added `moduleResolution: "node"` to server/tsconfig.json
- Added `baseUrl: "."` to server/tsconfig.json
- Changed alias paths from `index.ts` to directories

**Note**: The alias configuration is correct. The errors are from source code using wrong import paths.

## Top Import Patterns to Fix

### Pattern 1: @shared/schema → @server/infrastructure/schema
**Count**: ~15 files  
**Category**: B (Deleted/Superseded)  
**Files Affected**:
- server/features/accountability/ledger.service.ts ✅ FIXED
- server/features/safeguards/infrastructure/safeguard-jobs.ts
- server/features/analytics/*.ts (multiple files)
- server/features/analysis/application/*.ts (multiple files)
- server/infrastructure/core/validation/schema-validation-service.ts
- server/features/admin/admin.ts

**Fix Strategy**: Bulk change with pattern verification
```typescript
// OLD
import { ... } from '@shared/schema';
import { ... } from '@shared/schema/domains/foundation';
import { ... } from '@shared/schema/domains/*';

// NEW
import { ... } from '@server/infrastructure/schema';
import { ... } from '@server/infrastructure/schema/domains/foundation';
import { ... } from '@server/infrastructure/schema/domains/*';
```

### Pattern 2: @shared/core/utils/api-utils → ?
**Count**: 19 files  
**Category**: A (Stale Path) or B (Deleted/Superseded)  
**Investigation Needed**: Find where api-utils moved to

### Pattern 3: @shared/core/observability/* → @server/infrastructure/observability
**Count**: 16+ files  
**Category**: A (Stale Path)  
**Fix Strategy**: Update imports to use server infrastructure

### Pattern 4: @server/types/index → ?
**Count**: 15 files  
**Category**: B (Deleted/Superseded)  
**Investigation Needed**: Find replacement or remove if deprecated

### Pattern 5: @server/middleware/auth → ?
**Count**: 11 files  
**Category**: A (Stale Path) or B (Deleted/Superseded)  
**Investigation Needed**: Check if middleware/auth exists or moved

## Recommended Next Steps

### Immediate Actions (High Impact)

1. **Fix @shared/schema imports** (Pattern 1)
   - Use IDE find & replace: `@shared/schema` → `@server/infrastructure/schema`
   - Verify first 5 files manually
   - Run tsc to verify
   - Expected impact: ~50-100 errors resolved

2. **Investigate missing modules**
   - Check if shared/core/utils/api-utils exists anywhere
   - Check if server/types/index exists or was moved
   - Check if server/middleware/auth exists
   - Document findings

3. **Fix high-frequency patterns**
   - Once locations confirmed, bulk update imports
   - Verify with tsc after each pattern
   - Monitor regression canaries

### Deferred Actions (Lower Priority)

4. **Demo/Example files**
   - Many errors are in server/demo/ and server/examples/
   - These are not production code
   - Can be fixed last or excluded from compilation

5. **Dependency issues**
   - inversify, inversify-express-utils not installed
   - mysql2/promise not installed
   - These are separate from import resolution issues

## Success Metrics

**Target**: Reduce TS2307 errors from 1,004 to <100

**Current Progress**:
- Phase 0: 1,004 errors (baseline)
- Phase 1: 1,004 errors (config fixes didn't reduce count - wrong hypothesis)
- Phase 2: 1,004 errors (structural fixes - 2 files)
- Phase 4: 1,003 errors (1 file fixed)

**Estimated Impact of Remaining Fixes**:
- Pattern 1 (@shared/schema): ~50-100 errors
- Pattern 2 (api-utils): ~19 errors
- Pattern 3 (observability): ~16 errors
- Pattern 4 (types): ~15 errors
- Pattern 5 (middleware/auth): ~11 errors
- **Total**: ~111-161 errors (11-16% of total)

**Remaining ~840-890 errors** are likely:
- Other stale import paths
- Missing dependencies (inversify, etc.)
- Demo/example files
- Actual missing modules

## Lessons Learned

1. **Alias configuration was not the root cause** - The paths were mostly correct
2. **Incomplete migrations left stale imports** - @shared/schema, @shared/database, etc.
3. **Module resolution strategy matters** - bundler vs node
4. **Project references complicate path resolution** - baseUrl inheritance issues
5. **Bulk changes need careful verification** - Pattern must be consistent across all files

## Next Session Plan

1. Investigate missing modules (api-utils, types, middleware/auth)
2. Fix @shared/schema pattern (bulk change with verification)
3. Fix other high-frequency patterns
4. Re-run baseline to measure progress
5. Document remaining errors by category

---

**Status**: Phase 4 In Progress  
**Files Fixed**: 3 (users.ts, ledger.service.ts, fix-typescript-syntax-errors.ts)  
**Errors Resolved**: ~3-5  
**Next**: Bulk fix @shared/schema imports
