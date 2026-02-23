# Chanuka Import Resolution & Migration Audit - Design

## Architecture Overview

### Problem Space

The Chanuka monorepo has undergone multiple large-scale migrations that were not completed atomically:

1. **FSD (Feature-Sliced Design) Migration** - Moved feature code from `client/src/lib/` to `client/src/features/`
2. **Shared-Core Consolidation** - Moved shared utilities to `shared/` package
3. **Database Service Migration** - Restructured database layer
4. **WebSocket Migration** - Consolidated WebSocket implementations
5. **Error Handling Migration** - Standardized error handling patterns

Each migration left behind:
- Stale files at old locations
- Imports pointing to moved/deleted files
- Duplicated modules (old + new versions)
- Broken re-export chains
- Circular dependencies

### Solution Approach

This design implements a **5-phase systematic audit** that:
1. Captures baseline before touching anything
2. Fixes root cause (config) before symptoms (imports)
3. Investigates known hotspots before full scan
4. Classifies every error by root cause
5. Fixes manually with verification at each step

## Phase 0: Baseline Capture

### Objective
Establish ground truth before making any changes.

### Leveraging Project Snapshot
The project structure document (`docs/project-structure.md`) provides a comprehensive snapshot of the codebase. Use it to:
- Identify all packages and their structure before running type checks
- Pre-identify known hotspot areas (websocket compiled output, duplicated components)
- Map out the dependency graph (client → shared, server → shared)
- Understand the FSD migration boundary (client/src/lib/ vs client/src/features/)

### Process
```bash
# Capture TypeScript errors for each package
npx tsc --noEmit -p tsconfig.json 2>&1 | tee baseline_tsc_root.txt
npx tsc --noEmit -p client/tsconfig.json 2>&1 | tee baseline_tsc_client.txt
npx tsc --noEmit -p server/tsconfig.json 2>&1 | tee baseline_tsc_server.txt
npx tsc --noEmit -p shared/tsconfig.json 2>&1 | tee baseline_tsc_shared.txt

# Capture test runner errors (don't run tests, just collect)
npx vitest --reporter=verbose --run 2>&1 | head -200 | tee baseline_vitest.txt
```

### Analysis
For each baseline file:
- Count errors by category (TS2307, TS2305, TS2614, TS2724, etc.)
- Identify files with zero errors (regression canaries)
- Document error distribution by package
- Cross-reference with project-structure.md to identify affected areas

### Artifacts
- `baseline_tsc_root.txt`
- `baseline_tsc_client.txt`
- `baseline_tsc_server.txt`
- `baseline_tsc_shared.txt`
- `baseline_vitest.txt`
- `baseline_analysis.md` - Error counts and canary list
- `project-structure-reference.md` - Annotated copy with known issues marked

## Phase 1: Fix Alias Resolution Root Cause

### Objective
Ensure all TypeScript path aliases resolve correctly in all tools.

### Config Inventory

#### Files to Audit
1. `/tsconfig.json` - Root TypeScript config
2. `/client/tsconfig.json` - Client TypeScript config
3. `/server/tsconfig.json` - Server TypeScript config
4. `/shared/tsconfig.json` - Shared TypeScript config
5. `/client/vite.config.ts` - Vite bundler config
6. `/vitest.workspace.ts` - Vitest test runner config
7. `/nx.json` - Nx workspace config
8. `/pnpm-workspace.yaml` - pnpm workspace config

#### Expected Aliases

| Alias | Target | Declared In |
|-------|--------|-------------|
| `@/` | `client/src/` | client tsconfig, Vite |
| `@shared/` | `shared/` | root tsconfig, Vite, Vitest |
| `@server/` | `server/` | server tsconfig |
| `@client/` | `client/src/` | client tsconfig (if used) |

### Verification Protocol

1. **Document Current State**
   - Read each config file completely
   - List which aliases are declared where
   - Identify missing declarations

2. **Hypothesis Formation**
   - Pick one broken absolute import
   - Trace what path each resolver constructs
   - Compare to actual file location
   - Document the mismatch

3. **Minimal Fix**
   - Change only config files
   - Add missing alias declarations
   - Verify with single test file:
     ```typescript
     // test-import.ts
     import { something } from '@shared/types';
     ```
   - Run `tsc --noEmit test-import.ts`
   - If passes, config fix is correct

4. **Rollout**
   - Apply config changes
   - Commit with proof of fix
   - Do NOT change any source files yet

### Artifacts
- `fix-root-cause.md` - Config diffs with proof

## Phase 2: Structural Hotspot Investigation

### Using Project Snapshot for Efficient Investigation

**Strategy**: Use `docs/project-structure.md` to:
1. Quickly locate all known hotspot directories without manual searching
2. Identify duplicate file patterns by comparing directory structures
3. Map import relationships by understanding package boundaries
4. Prioritize investigation based on file counts and complexity

### Known Hotspots

#### 1. Compiled Output in Source Tree
**Location**: `client/src/infrastructure/websocket/`

**From project-structure.md**:
```
├── websocket/
│   ├── index.ts
│   ├── manager.d.ts
│   ├── manager.d.ts.map
│   ├── manager.js
│   ├── manager.js.map
│   └── manager.ts
```

**Risk**: Imports may resolve to stale `.js` or `.d.ts` instead of `.ts`

**Investigation**:
```bash
# Find imports to this module
grep -r "from.*websocket/manager" client/src/
```

**Resolution**:
- If `.js`/`.d.ts` are committed artifacts, delete them
- Add to `.gitignore`: `*.js`, `*.js.map`, `*.d.ts`, `*.d.ts.map` in `src/` directories
- Verify imports resolve to `.ts` file

#### 2. Duplicated Security UI Components

**From project-structure.md**, we can see BOTH locations exist:

**Old Location**: `client/src/infrastructure/security/ui/`
```
├── ui/
│   ├── dashboard/
│   │   ├── SecureForm.tsx
│   │   ├── SecurityDashboard.tsx
│   │   └── SecuritySettings.tsx
│   ├── icons/
│   │   └── ChanukaIcons.tsx
│   ├── privacy/
│   │   ├── CookieConsentBanner.tsx
│   │   ├── DataUsageReportDashboard.tsx
│   │   ├── GDPRComplianceManager.tsx
│   │   └── ...
```

**New Location**: `client/src/features/security/ui/`
```
├── ui/
│   ├── dashboard/
│   │   ├── SecureForm.tsx
│   │   ├── SecurityDashboard.tsx
│   │   └── SecuritySettings.tsx
│   ├── icons/
│   │   └── ChanukaIcons.tsx
│   ├── privacy/
│   │   └── ... (same files)
```

**Efficient Investigation Using Snapshot**:
1. Compare file lists from project-structure.md to identify exact duplicates
2. Use grep only to find importers, not to discover duplicates
3. Prioritize by counting import references

**Investigation**:
```bash
# Find imports to old location
grep -r "from.*core/security/ui" client/src/

# Find imports to new location
grep -r "from.*features/security/ui" client/src/
```

**Resolution**:
- Determine canonical location (likely `features/security/ui/` per FSD)
- Classify imports to old location as Category A (stale path)
- Document in structural-ambiguities.md

#### 3. Duplicated useAuth Hook
**Locations**:
- `client/src/infrastructure/auth/hooks/useAuth.tsx`
- `client/src/features/users/hooks/useAuth.tsx`

**Investigation**:
```bash
# Compare implementations
diff client/src/infrastructure/auth/hooks/useAuth.tsx \
     client/src/features/users/hooks/useAuth.tsx

# Find all imports
grep -r "from.*useAuth" client/src/
```

**Resolution**:
- If identical, one is a copy - delete and update importers
- If different, determine which is authoritative (FSD suggests `features/users/hooks/`)
- Document divergence and migration plan

#### 4. Duplicated Loading Utilities
**Locations**:
- `client/src/infrastructure/loading/utils/` - `connection-utils.ts`, `loading-utils.ts`, `progress-utils.ts`, `timeout-utils.ts`
- `client/src/lib/ui/loading/utils/` - same files + `loadingUtils.ts` (camelCase variant)

**Investigation**:
```bash
# Check for re-exports
grep -r "export.*from.*loading/utils" client/src/

# Find imports to each location
grep -r "from.*core/loading/utils" client/src/
grep -r "from.*lib/ui/loading/utils" client/src/
```

**Resolution**:
- Check if one re-exports from the other
- If independent implementations, determine canonical
- `loadingUtils.ts` (camelCase) is red flag - likely renamed file where original wasn't deleted

#### 5. Empty server/infrastructure/errors/ Directory
**Location**: `server/infrastructure/errors/`

**Risk**: Any import to this path will fail with MODULE_NOT_FOUND

**Investigation**:
```bash
# Find imports to this path
grep -r "from.*infrastructure/errors" server/
```

**Resolution**:
- Likely moved to `server/infrastructure/error-handling/`
- Classify as Category B (deleted/superseded)
- Map to new location: `server/infrastructure/error-handling/index.ts`

#### 6. FSD Migration Boundary
**Locations**:
- `client/src/lib/` - still contains substantial code
- `client/src/features/` - FSD feature slices

**High-Risk Files**:
- `client/src/lib/services/userService.ts` vs `client/src/features/users/services/user-service-legacy.ts`
- `client/src/lib/services/notification-service.ts` vs `client/src/features/notifications/model/notification-service.ts`
- `client/src/lib/hooks/` - check for duplicates in `client/src/infrastructure/*/hooks/`

**Investigation**:
```bash
# Find potential duplicates
find client/src/lib/services -name "*.ts" | while read f; do
  basename=$(basename "$f")
  find client/src/features -name "$basename" -o -name "${basename/.ts/-legacy.ts}"
done
```

**Resolution**:
- For each duplicate pair, determine canonical version
- Document which is feature code (belongs in `features/`) vs shared infrastructure (belongs in `lib/`)

### Artifacts
- `structural-ambiguities.md` - Canonical vs stale for each duplicate

## Phase 3: Full Import Scan & Categorization

### Error Categories

#### Category A: Stale Path (Incomplete Migration)
**Symptom**: Module was moved/renamed, import not updated

**Evidence**: File exists at different path than import string

**Example**:
```typescript
// Import
import { useAuth } from '@/infrastructure/auth/hooks/useAuth';

// File actually at
client/src/features/users/hooks/useAuth.tsx
```

**Fix**: Update import path, never move file

#### Category B: Deleted, Superseded by Better Implementation
**Symptom**: Module intentionally deleted, functionality in different module

**Evidence**: File doesn't exist, newer module covers same domain

**Examples**:
- `scripts/deprecated/` paths
- Old `auth.ts` superseded by `client/src/infrastructure/auth/`
- Old websocket implementations superseded by `server/infrastructure/websocket/`
- Old error handling superseded by `client/src/infrastructure/error/` or `server/infrastructure/error-handling/`

**Fix**: Identify canonical replacement, verify API compatibility, update import AND call sites if API changed

#### Category C: Alias Not Recognized by Specific Tool
**Symptom**: Import path correct, alias fails in one tool

**Evidence**: Same import works as relative path, alias missing from tool config

**Example**:
```typescript
// Fails in Vitest, works in Vite
import { something } from '@shared/types';
```

**Fix**: Add missing alias to tool config (Phase 1), do NOT rewrite import to relative

#### Category D: Re-export Shim Has Broken Internal Import
**Symptom**: Barrel file exists, but imports from path that no longer resolves

**Evidence**: Target module exists, causes secondary errors inside it

**Example**:
```typescript
// client/src/features/security/ui/index.ts
export * from './dashboard/SecurityDashboard';  // ← this path is broken

// Consumer
import { SecurityDashboard } from '@/features/security/ui';  // ← fails
```

**Fix**: Trace chain to deepest broken link, fix from bottom up

#### Category E: Named Export Was Renamed or Removed
**Symptom**: Module path resolves, imported member doesn't exist

**Evidence**: `Module '"..."' has no exported member 'X'`

**Examples**:
- Types consolidated from `shared/types/` sub-paths into different index
- Auth types moved from `client/src/infrastructure/api/types/auth.ts` to `shared/types/domains/authentication/`
- Error types moved during error handling consolidation

**Fix**: Find new export location, update both import path and named binding

### Scan Process

```bash
# Extract all module resolution errors
npx tsc --noEmit -p tsconfig.json 2>&1 | \
  grep -E "TS2307|TS2305|TS2614|TS2724" > module_errors.txt

# For each error:
# 1. Identify file and import statement
# 2. Check if target file exists (Category A vs B)
# 3. Check if alias is in all configs (Category C)
# 4. Check if it's a barrel file (Category D)
# 5. Check if module exists but member doesn't (Category E)
# 6. Document in discrepancy-inventory.md
```

### Artifacts
- `discrepancy-inventory.md` - Table with columns:
  - File
  - Import String
  - Category (A/B/C/D/E)
  - Root Cause Hypothesis
  - Fix Applied
  - Verified Clean

## Phase 4: Manual Fix Protocol

### Dependency Order
Fix in this order to prevent cascade failures:

1. **shared/** - Foundation types and utilities
2. **server/** - Backend (depends on shared)
3. **client/** - Frontend (depends on shared)

Within each package:
- Leaf files before root files
- Utilities before features
- Types before implementations

### Fix Process

For each file:

1. **State the filename**
   ```
   Fixing: server/features/community/community.ts
   ```

2. **List broken imports with categories**
   ```
   - Line 5: import { BaseError } from '@server/infrastructure/error-handling'
     Category: E (named export removed)
     
   - Line 8: import { contentModerationService } from './moderation'
     Category: B (deleted, superseded)
   ```

3. **State corrected import with justification**
   ```
   - Line 5: import { createValidationError } from '@server/infrastructure/error-handling'
     Justification: Error handling migration replaced classes with factory functions
     
   - Line 8: Remove import (service deprecated, functionality moved to unified moderation)
     Justification: ADR-XXX documents moderation consolidation
   ```

4. **Make the edit manually**
   - Open file in editor
   - Change import statements
   - Update call sites if API changed
   - Save file

5. **Verify fix**
   ```bash
   # Scoped verification
   npx tsc --noEmit -p server/tsconfig.json | grep community.ts
   
   # Should show fewer errors or none
   ```

6. **Check for cascade effects**
   ```bash
   # Did error count change in other files?
   npx tsc --noEmit -p server/tsconfig.json | wc -l
   
   # Compare to previous count
   # If increased, investigate before continuing
   ```

7. **Commit**
   ```bash
   git add server/features/community/community.ts
   git commit -m "fix(server): resolve imports in community.ts

   - Replace BaseError with createValidationError (Category E)
   - Remove deprecated contentModerationService import (Category B)
   
   Errors reduced: 12 → 8 in this file"
   ```

### Hard Limits

- **No automated bulk replacements** - No sed, awk, regex, codemods (see exceptions below)
- **No scripts** - Every fix is manual (see exceptions below)
- **No guessing** - If Category B/E replacement unclear, flag for human review
- **No backup usage** - Don't use files from `scripts/error-remediation/tests/reports/backups/`
- **One file per commit** - Enables precise rollback (see batch commit exceptions below)

### Safe Bulk Change Exceptions

In specific cases, bulk changes are permitted with strict safeguards:

#### Exception 1: Identical Category A Stale Path (Same Old → Same New)
**Criteria**:
- All imports are Category A (stale path)
- All imports use EXACT same old path
- All imports should use EXACT same new path
- No API changes between old and new location
- File at new location verified to exist and export expected members

**Example**:
```typescript
// 50 files import from old location
import { useAuth } from '@/infrastructure/auth/hooks/useAuth';

// All should import from new location
import { useAuth } from '@/features/users/hooks/useAuth';
```

**Safety Protocol**:
1. Manually verify first 3 files to confirm pattern
2. Document the pattern in discrepancy-inventory.md
3. Create a list of ALL affected files
4. Apply bulk change using IDE refactoring (NOT regex)
5. Run `tsc --noEmit` on entire package
6. If error count increases, revert and investigate
7. Commit all files together with detailed message listing all files
8. Monitor regression canaries

**Maximum Batch Size**: 50 files per batch

#### Exception 2: Identical Category C Alias Fix (Config Already Fixed)
**Criteria**:
- Phase 1 config fix already applied and verified
- All imports use same alias that was missing
- Imports are syntactically identical except for imported members
- No path changes needed, only waiting for config to take effect

**Example**:
```typescript
// After adding @shared/* to Vitest config, these now work:
import { UserType } from '@shared/types/user';
import { PostType } from '@shared/types/post';
// No changes needed - just verify they resolve
```

**Safety Protocol**:
1. Verify config fix is committed
2. Run `tsc --noEmit` to confirm errors are gone
3. No source file changes needed
4. Document in fix-root-cause.md that X files were fixed by config change

**Maximum Batch Size**: Unlimited (no source changes)

#### Exception 3: Identical Category E Named Export Rename (Same Old → Same New)
**Criteria**:
- All imports use EXACT same old named export
- All should use EXACT same new named export
- Module path stays the same
- New export verified to exist and have compatible type signature
- No other code changes needed (parameters, return types match)

**Example**:
```typescript
// 30 files import old name
import { BaseError } from '@server/infrastructure/error-handling';

// All should import new name
import { ValidationError } from '@server/infrastructure/error-handling';

// Usage is identical (constructor signature matches)
throw new ValidationError('message');
```

**Safety Protocol**:
1. Manually verify first 5 files to confirm:
   - Same import path
   - Same old export name
   - Same new export name
   - No usage changes needed
2. Use IDE "Find and Replace" with whole word match
3. Review diff before committing
4. Run `tsc --noEmit` on entire package
5. If error count increases, revert and investigate
6. Commit with detailed message listing pattern

**Maximum Batch Size**: 30 files per batch

#### Exception 4: Barrel File Re-export Chain Fix (Single Root Cause)
**Criteria**:
- Multiple files import from same barrel file
- Barrel file has single broken internal import
- Fixing barrel file will fix all downstream imports
- No changes needed in consuming files

**Example**:
```typescript
// client/src/features/security/ui/index.ts (barrel file)
export * from './dashboard/SecurityDashboard'; // ← broken path

// 20 files import from barrel
import { SecurityDashboard } from '@/features/security/ui';
// These all fail because barrel is broken
```

**Safety Protocol**:
1. Identify the single root cause (broken barrel import)
2. Fix ONLY the barrel file
3. Run `tsc --noEmit` to verify all downstream imports now work
4. Commit barrel file fix
5. Document in discrepancy-inventory.md that fixing barrel resolved X downstream imports

**Maximum Batch Size**: 1 barrel file fix (affects unlimited downstream imports)

### Bulk Change Prohibitions

Even with exceptions above, NEVER use bulk changes for:

- **Category B (Deleted/Superseded)** - Replacement may vary by context
- **Category D (Broken Re-export)** - Each chain may be different
- **Mixed categories** - Each category needs different fix strategy
- **API changes** - If function signature changed, each call site needs review
- **Cross-package changes** - Different packages may need different fixes
- **Unclear patterns** - If first 3-5 manual fixes show variation, stop bulk approach

### Batch Commit Guidelines

When using bulk change exceptions:

**Commit Message Format**:
```
fix(package): resolve [Category] in [N] files

Pattern: [old import] → [new import]

Files affected:
- path/to/file1.ts
- path/to/file2.ts
- path/to/file3.ts
... (list all files)

Verified:
- tsc --noEmit shows [X] fewer errors
- No regression canaries affected
- Error count: [before] → [after]
```

**Rollback Strategy**:
```bash
# Single commit rollback
git revert <commit-hash>

# Verify rollback worked
npx tsc --noEmit -p package/tsconfig.json
```

### When to Stop

Stop and investigate if:
- Error count increases in another file
- Previously clean file (canary) gains errors
- Same error appears in multiple files after fix
- Unclear which module is canonical replacement
- Pattern breaks after first 3-5 manual fixes
- Bulk change causes error count to increase

## Phase 5: Validation & Error Delta Report

### Re-run Baseline Commands

```bash
# Capture post-fix state
npx tsc --noEmit -p tsconfig.json 2>&1 | tee postfix_tsc_root.txt
npx tsc --noEmit -p client/tsconfig.json 2>&1 | tee postfix_tsc_client.txt
npx tsc --noEmit -p server/tsconfig.json 2>&1 | tee postfix_tsc_server.txt
npx tsc --noEmit -p shared/tsconfig.json 2>&1 | tee postfix_tsc_shared.txt
```

### Error Delta Analysis

For each file, classify error count changes:

| Change Type | Meaning | Action |
|-------------|---------|--------|
| Error disappears | Fix worked as intended | ✅ Expected |
| Error disappears in one file, appears in another | Fix exposed transitive dependency that was previously masked | Investigate - pre-existing or regression? |
| Error count spikes in a module after fixing its importer | Module was previously unreachable by type checker; now it is. Pre-existing bugs inside it are now visible. | Document as "newly visible pre-existing bugs" - do NOT revert |
| File that had zero errors now has errors | **REGRESSION** | Stop. Diagnose before continuing |

### Delta Report Structure

```markdown
# Error Delta Report

## Summary
- Baseline: 5,762 errors
- Post-fix: 4,200 errors
- Reduction: 1,562 errors (27%)

## By Package
| Package | Baseline | Post-fix | Delta |
|---------|----------|----------|-------|
| Root    | 150      | 120      | -30   |
| Client  | 2,800    | 2,100    | -700  |
| Server  | 2,500    | 1,800    | -700  |
| Shared  | 312      | 180      | -132  |

## Regressions (files that gained errors)
| File | Baseline | Post-fix | Reason |
|------|----------|----------|--------|
| client/src/features/bills/BillList.tsx | 0 | 3 | Imported type from fixed module, exposed pre-existing type mismatch |

## Newly Visible Pre-existing Bugs
| File | Errors | Reason |
|------|--------|--------|
| server/features/users/user-service.ts | 45 | Was unreachable due to broken import in parent module; now reachable |

## Fixes Applied
| Category | Count | Examples |
|----------|-------|----------|
| A (Stale Path) | 450 | useAuth moved to features/users/hooks/ |
| B (Deleted/Superseded) | 200 | BaseError → createValidationError |
| C (Alias Not Recognized) | 50 | Added @shared/ to Vitest config |
| D (Broken Re-export) | 30 | Fixed barrel file chains |
| E (Named Export Removed) | 20 | Updated to new export names |
```

### Artifacts
- `error-delta.md` - Before/after with classification

## Testing Strategy

### Regression Prevention

1. **Canary Monitoring**
   - Files with zero errors in baseline are canaries
   - If canary gains errors, it's a regression
   - Investigate immediately

2. **Incremental Verification**
   - Run `tsc --noEmit` after every fix
   - Compare error count to previous run
   - If count increases, investigate before continuing

3. **Transitive Dependency Tracking**
   - If fixing File A causes errors in File B, it means:
     - File B imports from File A
     - File B has pre-existing bugs that were masked
     - This is NOT a regression, it's newly visible bugs
   - Document in error-delta.md

### Integration Testing

After all fixes:
```bash
# Full type check
npm run type-check

# Build all packages
npm run build

# Run test suite
npm run test

# Run integration tests
npm run test:integration
```

## Rollback Strategy

### Per-File Rollback
```bash
# Revert single file
git revert <commit-hash>
```

### Per-Phase Rollback
```bash
# Revert all commits in Phase 4
git revert <first-commit>..<last-commit>
```

### Full Rollback
```bash
# Revert to baseline
git reset --hard <baseline-commit>
```

## Success Criteria

### Quantitative
- Module resolution errors: 1,200 → 0
- Total TypeScript errors: 5,762 → <4,500 (accounting for newly visible bugs)
- Regressions: 0
- Files fixed: ~500

### Qualitative
- Every broken import categorized
- Every duplicate module pair documented
- Config changes proven with test imports
- Error delta report explains every change
- No automated scripts used
- One file per commit

## Monitoring & Metrics

### Progress Tracking
```bash
# Daily error count
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "error TS" | wc -l

# Errors by category
npx tsc --noEmit -p tsconfig.json 2>&1 | \
  grep -oE "error TS[0-9]+" | sort | uniq -c
```

### Velocity Metrics
- Files fixed per day
- Errors reduced per day
- Regressions introduced per day (target: 0)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cascade failures | Fix one file at a time, verify after each |
| Regressions | Monitor canaries, stop if zero-error file gains errors |
| Script corruption | No automated scripts, all fixes manual |
| Lost context | Document every fix with category and justification |
| Unclear replacements | Flag for human review, don't guess |
| Circular dependencies | Extract shared interfaces to break cycles |

## Future Improvements

After this audit:
1. Add pre-commit hook to prevent broken imports
2. Add CI check for module resolution errors
3. Document import conventions in CONTRIBUTING.md
4. Add ESLint rule to enforce import patterns
5. Create migration checklist for future large-scale changes
