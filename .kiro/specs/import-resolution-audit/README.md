# Import Resolution & Migration Audit Spec

## Overview

This spec addresses the systematic resolution of **5,762 TypeScript compilation errors** across the Chanuka monorepo, with a focus on the **~1,200 module resolution errors** that are blocking all other type safety work.

## Why This Spec Exists

The Chanuka codebase has undergone multiple large-scale migrations that were not completed atomically:
- FSD (Feature-Sliced Design) migration
- Shared-core consolidation
- Database service migration
- WebSocket migration
- Error handling migration

Each migration left behind stale files, broken imports, duplicated modules, and circular dependencies. This spec provides a systematic, manual, verified approach to fixing all import resolution issues.

## Relationship to Other Specs

### Depends On
- `codebase-consolidation` (Phases 1-3) - Structural cleanup must be complete first

### Blocks
- `server-typescript-errors-remediation` - Cannot fix type errors until imports resolve
- `type-system-standardization` - Cannot standardize types until modules resolve
- `module-resolution-fixes` - This spec supersedes the narrow-scope module-resolution-fixes

### Complements
- `codebase-consolidation` - This spec documents the import fixes needed after structural cleanup

## Key Principles

### 🚫 What NOT to Do
- **NO automated scripts** - No sed, awk, regex, codemods (see safe exceptions)
- **NO bulk replacements** - One file at a time (see safe exceptions)
- **NO file moves** - Update imports, not file locations
- **NO guessing** - Flag unclear cases for human review
- **NO backup usage** - Don't use corrupted backup files

### ✅ What TO Do
- **Manual fixes only** - Every fix is intentional and understood
- **Verify after every fix** - Run tsc after each file or batch
- **One file per commit** - Enables precise rollback (or one batch per commit)
- **Respect dependency order** - shared → server → client
- **Document everything** - Every fix has a category and justification

### ⚡ Safe Bulk Change Exceptions

For efficiency, bulk changes are permitted in 4 specific cases with strict safeguards:

1. **Identical Category A**: 10+ files with same old path → same new path (max 50 files/batch)
2. **Identical Category C**: Config fix already applied, no source changes needed (unlimited)
3. **Identical Category E**: 10+ files with same old export → same new export (max 30 files/batch)
4. **Barrel File Fix**: Single barrel file fix resolves multiple downstream imports (1 barrel)

**Safety Requirements**:
- Manual verification of first 3-5 files confirms identical pattern
- Use IDE refactoring tools only (NOT regex/sed/awk)
- Review full diff before committing
- Run `tsc --noEmit` after batch
- Revert immediately if error count increases
- List all affected files in commit message
- Monitor regression canaries

See `design.md` for complete bulk change protocols and prohibitions.

## The 5-Phase Approach

### Phase 0: Baseline Capture
**Goal**: Establish ground truth before touching anything

**Deliverable**: Baseline error reports for root, client, server, shared packages

**Key Activity**: Run `tsc --noEmit` on all packages, save output, identify regression canaries

### Phase 1: Fix Alias Resolution Root Cause
**Goal**: Ensure all TypeScript path aliases resolve correctly in all tools

**Deliverable**: `fix-root-cause.md` with config diffs and proof

**Key Activity**: Audit tsconfig, Vite, Vitest configs; add missing aliases; verify with test imports

### Phase 2: Structural Hotspot Investigation
**Goal**: Identify and document known duplicated modules and incomplete migrations

**Deliverable**: `structural-ambiguities.md` with canonical vs stale versions

**Key Activity**: Investigate 6 known hotspots (security UI, useAuth, loading utils, etc.)

### Phase 3: Full Import Scan & Categorization
**Goal**: Classify every broken import by root cause

**Deliverable**: `discrepancy-inventory.md` with all imports categorized

**Key Activity**: Scan all TypeScript files, assign each broken import to Category A/B/C/D/E

### Phase 4: Manual Fix Protocol
**Goal**: Fix imports one file at a time with verification

**Deliverable**: Individual commits for each file fixed

**Key Activity**: Fix shared/ → server/ → client/ in dependency order, verify after each

### Phase 5: Validation & Error Delta Report
**Goal**: Verify fixes reduced errors without introducing regressions

**Deliverable**: `error-delta.md` with before/after analysis

**Key Activity**: Re-run baselines, classify error count changes, investigate regressions

## Import Error Categories

Every broken import falls into one of these categories:

### Category A: Stale Path (Incomplete Migration)
- **Symptom**: File moved, import not updated
- **Example**: `import { useAuth } from '@/core/auth/hooks/useAuth'` but file is now at `features/users/hooks/useAuth`
- **Fix**: Update import path

### Category B: Deleted, Superseded by Better Implementation
- **Symptom**: File intentionally deleted, functionality in different module
- **Example**: `BaseError` class deleted, replaced by `createValidationError()` factory
- **Fix**: Identify replacement, update import AND call sites

### Category C: Alias Not Recognized by Specific Tool
- **Symptom**: Import path correct, alias fails in one tool (e.g., Vitest)
- **Example**: `@shared/types` works in Vite but not Vitest
- **Fix**: Add missing alias to tool config (Phase 1)

### Category D: Re-export Shim Has Broken Internal Import
- **Symptom**: Barrel file exists, but imports from broken path
- **Example**: `index.ts` exports from `./dashboard/SecurityDashboard` but that path is broken
- **Fix**: Trace chain to deepest broken link, fix from bottom up

### Category E: Named Export Was Renamed or Removed
- **Symptom**: Module path resolves, imported member doesn't exist
- **Example**: `import { BaseError }` but module only exports `createValidationError`
- **Fix**: Find new export location, update import path and named binding

## Success Metrics

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

## Deliverables

1. **fix-root-cause.md** - Config changes with exact diffs and proof
2. **discrepancy-inventory.md** - Table of every broken import with category and fix
3. **structural-ambiguities.md** - Canonical vs stale for each duplicate, migration rationale
4. **error-delta.md** - Before/after error counts, classification of every change

## Getting Started

1. Read `requirements.md` to understand user stories and acceptance criteria
2. Read `design.md` to understand the technical approach
3. Start with `tasks.md` Phase 0 to capture baseline
4. Follow phases sequentially - do not skip ahead
5. Commit after every file fixed
6. Stop and investigate if error count increases unexpectedly

## Risk Mitigation

- **Baseline capture** prevents "did we make it worse?" questions
- **One-file-at-a-time** prevents cascade failures
- **Regression canaries** catch unintended side effects
- **Manual verification** prevents script-induced corruption
- **Git history** preserves every step for rollback

## Timeline Estimate

- Phase 0: 1 day (baseline capture and analysis)
- Phase 1: 2 days (config audit and fixes)
- Phase 2: 3 days (structural hotspot investigation)
- Phase 3: 3 days (full import scan and categorization)
- Phase 4: 10-15 days (manual fixes, ~30-50 files per day)
- Phase 5: 2 days (validation and delta report)

**Total**: 3-4 weeks for complete resolution

## Questions?

- See `requirements.md` for detailed acceptance criteria
- See `design.md` for technical implementation details
- See `tasks.md` for step-by-step execution plan
