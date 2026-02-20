# Chanuka Import Resolution & Migration Audit - Requirements

## Overview

This specification addresses systematic resolution of import path errors, module resolution failures, and structural inconsistencies across the entire Chanuka monorepo resulting from multiple incomplete migrations (FSD migration, shared-core consolidation, database service migration, websocket migration, error handling migration).

## Context

The codebase is a pnpm monorepo managed with Nx containing:
- `client/` - React + Vite frontend
- `server/` - Node/Express backend  
- `shared/` - Isomorphic types, utils, validation
- `tests/` - Cross-package integration & e2e tests

Multiple large-scale migrations have left the codebase with:
- **5,762 TypeScript compilation errors** (baseline)
- **~1,200 module resolution errors** (TS2307, TS2305, TS2614, TS2724)
- Duplicated modules in multiple locations
- Stale import paths pointing to moved/deleted files
- Broken re-export chains in barrel files
- Circular dependencies

## User Stories

### US-1: Establish Error Baseline
**As a developer**, I need a comprehensive baseline of all TypeScript errors across the monorepo so I can track progress and prevent regressions.

**Acceptance Criteria:**
- Baseline TypeScript errors captured for root, client, server, and shared packages
- Errors categorized by type (module resolution, type errors, null safety, etc.)
- Files with zero errors identified as regression canaries
- Baseline reports saved as artifacts before any changes

### US-2: Fix Alias Resolution Root Cause
**As a developer**, I need all TypeScript path aliases to resolve correctly in all tools (tsc, Vite, Vitest, ESLint) so imports work consistently.

**Acceptance Criteria:**
- All aliases (`@/`, `@shared/`, `@server/`, `@client/`) declared in tsconfig, Vite, and Vitest configs
- Alias resolution verified with test imports
- Config changes documented with before/after proof
- No tool-specific alias failures remain

### US-3: Identify Structural Inconsistencies
**As a developer**, I need to know which files are duplicated, which migrations are incomplete, and which paths are stale so I can fix them systematically.

**Acceptance Criteria:**
- All duplicated modules identified (e.g., `useAuth` in two locations, security UI in two locations)
- Canonical vs stale versions determined for each duplicate
- Empty directories that should have been deleted identified
- FSD migration boundary issues documented

### US-4: Categorize Every Broken Import
**As a developer**, I need every broken import classified by root cause so I can apply the correct fix strategy.

**Acceptance Criteria:**
- Every broken import assigned to one of 5 categories:
  - **Category A**: Stale Path (file moved, import not updated)
  - **Category B**: Deleted/Superseded (file intentionally removed, replacement exists)
  - **Category C**: Alias Not Recognized (path correct, tool config missing)
  - **Category D**: Re-export Shim Broken (barrel file has broken internal import)
  - **Category E**: Named Export Renamed/Removed (module exists, member doesn't)
- Categorization documented in discrepancy inventory
- Fix strategy defined for each category

### US-5: Fix Imports One File at a Time
**As a developer**, I need to fix imports manually and verify each fix so I don't introduce regressions or cascade errors.

**Acceptance Criteria:**
- Fixes applied one file at a time, never in bulk
- Each fix verified with `tsc --noEmit` before proceeding
- Dependency order respected (shared → server → client, leaf → root)
- No automated scripts, codemods, or regex replacements used
- Each fix committed individually

### US-6: Validate Progress Without Regressions
**As a developer**, I need to verify that fixes reduce errors without introducing new ones.

**Acceptance Criteria:**
- Post-fix error counts compared to baseline
- Error deltas classified (fix worked, exposed transitive bug, regression)
- Files that gained errors investigated before continuing
- Regression canaries (previously clean files) monitored

### US-7: Document Structural Decisions
**As a developer**, I need to understand which module is canonical when duplicates exist and why migrations were incomplete.

**Acceptance Criteria:**
- For each duplicate pair: canonical version identified, stale version documented
- Migration rationale documented (why incomplete, what was intended)
- Importers of stale paths listed
- Structural ambiguities resolved and documented

## Technical Requirements

### TR-1: Baseline Capture (Phase 0)
- Run `tsc --noEmit` on root, client, server, shared packages
- Save output to `baseline_tsc_*.txt` files
- Count errors by category (TS2307, TS2305, TS7006, etc.)
- Identify zero-error files as canaries
- **No changes made in this phase**

### TR-2: Config Audit (Phase 1)
- Read and document every config that affects module resolution:
  - `/tsconfig.json`, `/client/tsconfig.json`, `/server/tsconfig.json`, `/shared/tsconfig.json`
  - `/client/vite.config.ts`
  - `/vitest.workspace.ts`
  - `/nx.json`
  - `/pnpm-workspace.yaml`
- Verify expected aliases are declared in all tools
- Document which tools are missing which aliases
- Apply minimal config fixes
- Verify fix with single test file before proceeding

### TR-3: Structural Hotspot Investigation (Phase 2)
Investigate these known high-risk areas:
- `client/src/core/websocket/` - compiled output artifacts (`.js`, `.d.ts`) alongside `.ts`
- `client/src/core/security/ui/` vs `client/src/features/security/ui/` - duplicated components
- `client/src/core/auth/hooks/useAuth.tsx` vs `client/src/features/users/hooks/useAuth.tsx` - duplicated hooks
- `client/src/core/loading/utils/` vs `client/src/lib/ui/loading/utils/` - duplicated utilities
- `server/infrastructure/errors/` - empty directory
- `client/src/lib/` vs `client/src/features/` - FSD migration boundary

For each hotspot:
- Determine which version is canonical
- Identify all importers of stale version
- Classify as Category A (stale path) or Category D (broken re-export)

### TR-4: Full Import Scan (Phase 3)
- Scan all TypeScript files for broken imports
- Classify each into Category A, B, C, D, or E
- Document classification in discrepancy inventory
- Prioritize fixes by dependency order (shared first, then server, then client)

### TR-5: Manual Fix Protocol (Phase 4)
- Fix one file at a time
- State filename, list broken imports with categories, state corrected import with justification
- Run `tsc --noEmit` scoped to file/package after each fix
- If error count changes in another file, stop and investigate
- Never use automated bulk replacements
- One file per commit

### TR-6: Validation & Delta Report (Phase 5)
- Re-run all baseline commands
- Produce error delta report (before vs after)
- Classify every change:
  - Error disappears → fix worked ✅
  - Error moves to another file → transitive dependency exposed
  - Error count spikes → newly visible pre-existing bugs
  - Zero-error file gains errors → REGRESSION (stop and diagnose)
- Document newly visible pre-existing bugs separately from regressions

## Constraints

### Hard Constraints
- **No automated scripts** - No sed, awk, regex pipelines, JS/TS migration scripts, codemods (see safe exceptions below)
- **No bulk replacements** - One file at a time, manually verified (see safe exceptions below)
- **No file moves** - Update imports, not file locations
- **No guessing** - If Category B/E replacement unclear, flag for human review
- **No backup usage** - Don't use files from `scripts/error-remediation/tests/reports/backups/`

### Safe Bulk Change Exceptions
In specific cases, bulk changes are permitted with strict safeguards to improve efficiency while maintaining safety:

1. **Identical Category A (Stale Path)**: When 10+ files import from exact same old path and should use exact same new path
   - Requires: Manual verification of first 3-5 files, IDE refactoring tools only, full diff review
   - Maximum: 50 files per batch

2. **Identical Category C (Alias Fix)**: When config fix already applied and imports now resolve without source changes
   - Requires: Config fix committed and verified
   - Maximum: Unlimited (no source changes needed)

3. **Identical Category E (Named Export)**: When 10+ files import exact same old export name and should use exact same new export name
   - Requires: Manual verification of first 5 files, signature compatibility check, IDE tools only
   - Maximum: 30 files per batch

4. **Barrel File Fix (Category D)**: When single barrel file fix resolves multiple downstream imports
   - Requires: Single root cause identified, downstream imports verified
   - Maximum: 1 barrel file (affects unlimited downstream)

**Bulk Change Prohibitions**: Never use bulk changes for Category B (replacement varies), mixed categories, API changes, cross-package changes, or unclear patterns.

**Safety Requirements**: All bulk changes must use IDE refactoring tools (not regex/scripts), include full diff review, run `tsc --noEmit` verification, monitor regression canaries, and revert immediately if error count increases.

### Verification Requirements
- Run `tsc --noEmit` after every fix
- Monitor regression canaries (zero-error files)
- Stop if error count increases unexpectedly
- Investigate transitive dependencies before continuing

## Success Metrics

### Quantitative
- Module resolution errors reduced from ~1,200 to 0
- Total TypeScript errors reduced from 5,762 to target (TBD based on newly visible bugs)
- Zero regressions in previously clean files
- 100% of broken imports categorized

### Qualitative
- Every duplicate module pair has documented canonical version
- Every incomplete migration has documented rationale
- Config changes proven with test imports
- Error delta report explains every change

## Out of Scope

- Fixing type safety errors (TS7006, TS7031, TS7053) - covered by separate spec
- Fixing null safety errors (TS18046, TS18048, TS2532) - covered by separate spec
- Removing unused code (TS6133, TS6138) - covered by separate spec
- Refactoring business logic
- Performance optimizations
- Adding new features

## Dependencies

- Requires completion of `codebase-consolidation` spec (Phase 1-3) for structural cleanup
- Blocks `server-typescript-errors-remediation` spec (cannot fix type errors until imports resolve)
- Blocks `type-system-standardization` spec (cannot standardize types until modules resolve)

## Deliverables

1. **fix-root-cause.md** - Config changes with exact diffs and proof
2. **discrepancy-inventory.md** - Table of every broken import with category and fix
3. **structural-ambiguities.md** - Canonical vs stale for each duplicate, migration rationale
4. **error-delta.md** - Before/after error counts, classification of every change

## Risk Mitigation

- Baseline capture prevents "did we make it worse?" questions
- One-file-at-a-time prevents cascade failures
- Regression canaries catch unintended side effects
- Manual verification prevents script-induced corruption
- Git history preserves every step for rollback
