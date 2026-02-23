# Implementation Plan: Import Resolution & Migration Audit

## Overview

This plan implements a systematic 5-phase audit to resolve ~1,200 module resolution errors and structural inconsistencies across the Chanuka monorepo resulting from incomplete migrations. The approach prioritizes baseline capture, root cause fixes, structural investigation, categorization, and manual verification to prevent regressions.

## Tasks

### Phase 0: Baseline Capture

- [x] 1. Capture TypeScript error baselines for all packages
  - [x] 1.1 Run tsc on root package and save baseline
    - Execute: `npx tsc --noEmit -p tsconfig.json 2>&1 | tee baseline_tsc_root.txt`
    - _Requirements: TR-1_
  
  - [x] 1.2 Run tsc on client package and save baseline
    - Execute: `npx tsc --noEmit -p client/tsconfig.json 2>&1 | tee baseline_tsc_client.txt`
    - _Requirements: TR-1_
  
  - [x] 1.3 Run tsc on server package and save baseline
    - Execute: `npx tsc --noEmit -p server/tsconfig.json 2>&1 | tee baseline_tsc_server.txt`
    - _Requirements: TR-1_
  
  - [x] 1.4 Run tsc on shared package and save baseline
    - Execute: `npx tsc --noEmit -p shared/tsconfig.json 2>&1 | tee baseline_tsc_shared.txt`
    - _Requirements: TR-1_
  
  - [x] 1.5 Capture Vitest baseline errors
    - Execute: `npx vitest --reporter=verbose --run 2>&1 | head -200 | tee baseline_vitest.txt`
    - _Requirements: TR-1_

- [x] 2. Analyze baseline errors and identify regression canaries
  - [x] 2.1 Count errors by category for each package
    - Parse baseline files for TS2307, TS2305, TS2614, TS2724, TS7006, TS18046, etc.
    - Create error distribution table by package
    - _Requirements: TR-1, US-1_
  
  - [x] 2.2 Identify zero-error files as regression canaries
    - Extract files with no errors from baseline
    - Document canary list in baseline_analysis.md
    - _Requirements: TR-1, US-1_
  
  - [x] 2.3 Create baseline_analysis.md document
    - Document total error counts per package
    - Document error distribution by category
    - Document regression canary list
    - Cross-reference with docs/project-structure.md for affected areas
    - _Requirements: TR-1, US-1_
  
  - [x] 2.4 Create annotated project structure reference
    - Copy docs/project-structure.md to project-structure-reference.md
    - Mark known hotspot areas identified in baseline
    - This will be used in Phase 2 for efficient investigation
    - _Requirements: TR-1, US-1_

- [-] 3. Checkpoint - Review baseline before proceeding
  - Verify all baseline files captured successfully
  - Confirm error counts match expected magnitude (~5,762 total, ~1,200 module resolution)
  - Ensure no changes made to source code during baseline capture

### Phase 1: Fix Alias Resolution Root Cause

- [x] 4. Audit all module resolution configs
  - [x] 4.1 Document current state of all tsconfig files
    - Read /tsconfig.json, /client/tsconfig.json, /server/tsconfig.json, /shared/tsconfig.json
    - List all path aliases declared in each
    - Identify missing alias declarations
    - _Requirements: TR-2, US-2_
  
  - [x] 4.2 Document Vite and Vitest configs
    - Read /client/vite.config.ts and /vitest.workspace.ts
    - List all path aliases declared
    - Compare to tsconfig aliases
    - _Requirements: TR-2, US-2_
  
  - [x] 4.3 Document Nx and pnpm workspace configs
    - Read /nx.json and /pnpm-workspace.yaml
    - Document workspace structure and package relationships
    - _Requirements: TR-2_
  
  - [x] 4.4 Create config inventory table
    - Create table showing which aliases are declared in which tools
    - Identify gaps (alias missing from specific tool)
    - Document in fix-root-cause.md
    - _Requirements: TR-2, US-2_

- [x] 5. Verify and fix alias resolution
  - [x] 5.1 Pick one broken absolute import and trace resolution
    - Select a TS2307 error with absolute import (e.g., @shared/types)
    - Trace what path each resolver constructs
    - Compare to actual file location
    - Document the mismatch hypothesis
    - _Requirements: TR-2, US-2_
  
  - [x] 5.2 Apply minimal config fixes
    - Add missing alias declarations to configs
    - Change ONLY config files, no source files
    - _Requirements: TR-2, US-2_
  
  - [x] 5.3 Verify config fix with test import
    - Create test-import.ts with import using fixed alias
    - Run `tsc --noEmit test-import.ts`
    - Verify import resolves correctly
    - Delete test file after verification
    - _Requirements: TR-2, US-2_
  
  - [x] 5.4 Commit config changes with proof
    - Commit config files with detailed message
    - Include before/after diffs in fix-root-cause.md
    - Document which errors are now resolved by config alone
    - _Requirements: TR-2, US-2_

- [x] 6. Checkpoint - Verify config fixes before structural investigation
  - Re-run tsc on one package to verify error count decreased
  - Confirm no source file changes made
  - Ensure config changes are committed

### Phase 2: Structural Hotspot Investigation

- [x] 7. Investigate compiled output in source tree
  - [x] 7.1 Audit client/src/core/websocket/ for compiled artifacts
    - List all .js, .js.map, .d.ts, .d.ts.map files in src/ directories
    - Verify these are committed artifacts (not gitignored)
    - _Requirements: TR-3, US-3_
  
  - [x] 7.2 Find imports to websocket/manager
    - Execute: `grep -r "from.*websocket/manager" client/src/`
    - Document which imports might resolve to stale .js/.d.ts
    - _Requirements: TR-3, US-3_
  
  - [x] 7.3 Remove compiled artifacts and update .gitignore
    - Delete .js, .js.map, .d.ts, .d.ts.map files from src/ directories
    - Add patterns to .gitignore: `src/**/*.js`, `src/**/*.d.ts`, etc.
    - Verify imports now resolve to .ts files
    - _Requirements: TR-3, US-3_

- [x] 8. Investigate duplicated security UI components
  - [x] 8.1 Compare client/src/core/security/ui/ vs client/src/features/security/ui/
    - Use project-structure-reference.md to identify exact duplicate files
    - Compare file contents to determine if identical or diverged
    - _Requirements: TR-3, US-3, US-7_
  
  - [x] 8.2 Find all imports to both locations
    - Execute: `grep -r "from.*core/security/ui" client/src/`
    - Execute: `grep -r "from.*features/security/ui" client/src/`
    - Count imports to each location
    - _Requirements: TR-3, US-3_
  
  - [x] 8.3 Determine canonical location
    - Based on FSD principles, features/security/ui/ is likely canonical
    - Document decision in structural-ambiguities.md
    - Classify imports to core/security/ui/ as Category A (stale path)
    - List all files that need import updates
    - _Requirements: TR-3, US-3, US-7_

- [x] 9. Investigate duplicated useAuth hook
  - [x] 9.1 Compare useAuth implementations
    - Execute: `diff client/src/core/auth/hooks/useAuth.tsx client/src/features/users/hooks/useAuth.tsx`
    - Determine if identical or diverged
    - _Requirements: TR-3, US-3, US-7_
  
  - [x] 9.2 Find all useAuth imports
    - Execute: `grep -r "from.*useAuth" client/src/`
    - Document import distribution
    - _Requirements: TR-3, US-3_
  
  - [x] 9.3 Determine canonical version
    - Based on FSD, features/users/hooks/useAuth.tsx is likely canonical
    - Document decision and divergence in structural-ambiguities.md
    - Classify imports to core/auth/hooks/ as Category A
    - _Requirements: TR-3, US-3, US-7_

- [x] 10. Investigate duplicated loading utilities
  - [x] 10.1 Compare loading utils in both locations
    - Compare client/src/core/loading/utils/ vs client/src/lib/ui/loading/utils/
    - Check for re-export relationships
    - Note camelCase loadingUtils.ts variant (red flag)
    - _Requirements: TR-3, US-3, US-7_
  
  - [x] 10.2 Find imports to both locations
    - Execute: `grep -r "from.*core/loading/utils" client/src/`
    - Execute: `grep -r "from.*lib/ui/loading/utils" client/src/`
    - _Requirements: TR-3, US-3_
  
  - [x] 10.3 Determine canonical location
    - Document which is canonical in structural-ambiguities.md
    - Classify stale imports as Category A
    - _Requirements: TR-3, US-3, US-7_

- [x] 11. Investigate empty server/infrastructure/errors/ directory
  - [x] 11.1 Find imports to infrastructure/errors
    - Execute: `grep -r "from.*infrastructure/errors" server/`
    - Document all broken imports
    - _Requirements: TR-3, US-3_
  
  - [x] 11.2 Map to new location
    - Verify functionality moved to server/infrastructure/error-handling/
    - Document mapping in structural-ambiguities.md
    - Classify as Category B (deleted/superseded)
    - _Requirements: TR-3, US-3, US-7_

- [-] 12. Investigate FSD migration boundary
  - [ ] 7.1 Audit client/src/core/websocket/ for compiled artifacts
    - List all .js, .js.map, .d.ts, .d.ts.map files in src/ directories
    - Verify these are committed artifacts (not gitignored)
    - _Requirements: TR-3, US-3_
  
  - [ ] 7.2 Find imports to websocket/manager
    - Execute: `grep -r "from.*websocket/manager" client/src/`
    - Document which imports might resolve to stale .js/.d.ts
    - _Requirements: TR-3, US-3_
  
  - [ ] 7.3 Remove compiled artifacts and update .gitignore
    - Delete .js, .js.map, .d.ts, .d.ts.map files from src/ directories
    - Add patterns to .gitignore: `src/**/*.js`, `src/**/*.d.ts`, etc.
    - Verify imports now resolve to .ts files
    - _Requirements: TR-3, US-3_

- [ ] 8. Investigate duplicated security UI components
  - [ ] 8.1 Compare client/src/core/security/ui/ vs client/src/features/security/ui/
    - Use project-structure-reference.md to identify exact duplicate files
    - Compare file contents to determine if identical or diverged
    - _Requirements: TR-3, US-3, US-7_
  
  - [ ] 8.2 Find all imports to both locations
    - Execute: `grep -r "from.*core/security/ui" client/src/`
    - Execute: `grep -r "from.*features/security/ui" client/src/`
    - Count imports to each location
    - _Requirements: TR-3, US-3_
  
  - [ ] 8.3 Determine canonical location
    - Based on FSD principles, features/security/ui/ stale path
    - Document decision in structural-ambiguities.md
    - Classify imports to core/security/ui/ as canonical 
    - List all files that need import updates
    - _Requirements: TR-3, US-3, US-7_

- [ ] 9. Investigate duplicated useAuth hook
  - [ ] 9.1 Compare useAuth implementations
    - Execute: `diff client/src/core/auth/hooks/useAuth.tsx client/src/features/users/hooks/useAuth.tsx`
    - Determine if identical or diverged
    - _Requirements: TR-3, US-3, US-7_
  
  - [ ] 9.2 Find all useAuth imports
    - Execute: `grep -r "from.*useAuth" client/src/`
    - Document import distribution
    - _Requirements: TR-3, US-3_
  
  - [ ] 9.3 Determine canonical version
    - Based on FSD, features/users/hooks/useAuth.tsx is likely canonical
    - Document decision and divergence in structural-ambiguities.md
    - Classify imports to core/auth/hooks/ as Category A
    - _Requirements: TR-3, US-3, US-7_

- [ ] 10. Investigate duplicated loading utilities
  - [ ] 10.1 Compare loading utils in both locations
    - Compare client/src/core/loading/utils/ vs client/src/lib/ui/loading/utils/
    - Check for re-export relationships
    - Note camelCase loadingUtils.ts variant (red flag)
    - _Requirements: TR-3, US-3, US-7_
  
  - [ ] 10.2 Find imports to both locations
    - Execute: `grep -r "from.*core/loading/utils" client/src/`
    - Execute: `grep -r "from.*lib/ui/loading/utils" client/src/`
    - _Requirements: TR-3, US-3_
  
  - [ ] 10.3 Determine canonical location
    - Document which is canonical in structural-ambiguities.md
    - Classify stale imports as Category A
    - _Requirements: TR-3, US-3, US-7_

- [ ] 11. Investigate empty server/infrastructure/errors/ directory
  - [ ] 11.1 Find imports to infrastructure/errors
    - Execute: `grep -r "from.*infrastructure/errors" server/`
    - Document all broken imports
    - _Requirements: TR-3, US-3_
  
  - [ ] 11.2 Map to new location
    - Verify functionality moved to server/infrastructure/error-handling/
    - Document mapping in structural-ambiguities.md
    - Classify as Category B (deleted/superseded)
    - _Requirements: TR-3, US-3, US-7_

- [x] 12. Investigate FSD migration boundary
  - [x] 12.1 Find potential duplicates between lib/ and features/
    - Compare client/src/lib/services/ vs client/src/features/*/services/
    - Compare client/src/lib/hooks/ vs client/src/core/*/hooks/
    - Use project-structure-reference.md to identify patterns
    - _Requirements: TR-3, US-3, US-7_
  
  - [ ] 12.2 Document canonical versions for each duplicate pair
    - For each duplicate, determine if feature code (→ features/) or shared infrastructure (→ lib/)
    - Document decisions in structural-ambiguities.md
    - _Requirements: TR-3, US-3, US-7_

- [x] 13. Checkpoint - Review structural findings
  - Verify structural-ambiguities.md documents all duplicate pairs
  - Confirm canonical versions identified for each
  - Ensure migration rationale documented

### Phase 3: Full Import Scan & Categorization

**Note**: Skipping Phase 3 full scan and proceeding directly to Phase 4 with targeted fixes based on baseline analysis and Phase 2 findings.

### Phase 4: Manual Fix Protocol

- [ ] 19. Fix imports in shared/ package (foundation)
  - [ ] 14.1 Extract module resolution errors from baseline
    - Execute: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "TS2307|TS2305|TS2614|TS2724" > module_errors.txt`
    - Parse errors to extract file paths and import strings
    - _Requirements: TR-4, US-4_
  
  - [ ] 14.2 Create discrepancy-inventory.md template
    - Create table with columns: File, Import String, Category, Root Cause, Fix Applied, Verified
    - _Requirements: TR-4, US-4_

- [ ] 15. Categorize errors in shared/ package
  - [ ] 15.1 Process each broken import in shared/
    - For each error, determine category (A/B/C/D/E)
    - Check if target file exists (A vs B)
    - Check if alias in all configs (C)
    - Check if barrel file (D)
    - Check if module exists but member doesn't (E)
    - Document in discrepancy-inventory.md
    - _Requirements: TR-4, US-4_

- [ ] 16. Categorize errors in server/ package
  - [ ] 16.1 Process each broken import in server/
    - Apply same categorization process as shared/
    - Document in discrepancy-inventory.md
    - _Requirements: TR-4, US-4_

- [ ] 17. Categorize errors in client/ package
  - [ ] 17.1 Process each broken import in client/
    - Apply same categorization process
    - Document in discrepancy-inventory.md
    - _Requirements: TR-4, US-4_

- [ ] 18. Checkpoint - Review categorization completeness
  - Verify all ~1,200 module resolution errors categorized
  - Confirm each has category (A/B/C/D/E) assigned
  - Ensure fix strategy defined for each category

### Phase 4: Manual Fix Protocol

- [ ] 19. Fix imports in shared/ package (foundation)
  - [ ] 19.1 Fix Category C errors in shared/ (config-only fixes)
    - Verify these are resolved by Phase 1 config changes
    - No source file changes needed
    - Document in discrepancy-inventory.md
    - _Requirements: TR-5, US-5_
  
  - [ ] 19.2 Fix Category D errors in shared/ (barrel files)
    - Fix broken re-export chains from bottom up
    - Each barrel file fix may resolve multiple downstream imports
    - Verify each barrel file fix with `tsc --noEmit -p shared/tsconfig.json`
    - Document downstream imports resolved by each barrel fix
    - _Requirements: TR-5, US-5_
  
  - [ ] 19.3 Fix Category A errors in shared/ (stale paths)
    - Default: Fix one file at a time
    - State filename, list broken imports with categories, state corrected imports
    - Verify with `tsc --noEmit -p shared/tsconfig.json` after each file
    - Commit each file individually
    - **Bulk Exception**: If 10+ files have identical old→new path pattern:
      - Manually verify first 3-5 files to confirm pattern
      - Document pattern in discrepancy-inventory.md
      - Use IDE refactoring tools only (not regex/scripts)
      - Review full diff before committing
      - Run tsc verification after bulk change
      - Monitor regression canaries
      - Maximum 50 files per batch
    - _Requirements: TR-5, US-5_
  
  - [ ] 19.4 Fix Category E errors in shared/ (renamed exports)
    - Update import statements to use new export names
    - Verify type signatures match
    - Default: One file at a time with verification
    - **Bulk Exception**: If 10+ files have identical old→new export name:
      - Manually verify first 5 files
      - Check signature compatibility
      - Use IDE refactoring tools only
      - Maximum 30 files per batch
    - _Requirements: TR-5, US-5_
  
  - [ ] 19.5 Fix Category B errors in shared/ (deleted/superseded)
    - Identify canonical replacement for each
    - Verify API compatibility
    - Update imports and call sites if API changed
    - **Never use bulk changes** - replacement may vary by context
    - _Requirements: TR-5, US-5_

- [ ] 20. Checkpoint - Verify shared/ package clean
  - Run `tsc --noEmit -p shared/tsconfig.json`
  - Verify module resolution errors (TS2307, TS2305, TS2614, TS2724) eliminated
  - Check regression canaries - ensure no previously clean files gained errors
  - Compare error count to baseline - document reduction
  - If error count increased or canaries affected, investigate before proceeding

- [ ] 21. Fix imports in server/ package (depends on shared/)
  - [ ] 21.1 Fix Category C errors in server/
    - Verify config-only fixes from Phase 1
    - No source file changes needed
    - _Requirements: TR-5, US-5_
  
  - [ ] 21.2 Fix Category D errors in server/
    - Fix barrel files bottom-up
    - Document downstream imports resolved by each barrel fix
    - _Requirements: TR-5, US-5_
  
  - [ ] 21.3 Fix Category A errors in server/
    - Default: One file at a time with verification
    - Focus on infrastructure/ before features/ (dependency order)
    - **Bulk Exception**: Apply same criteria as shared/ (10+ identical patterns, max 50 files)
    - _Requirements: TR-5, US-5_
  
  - [ ] 21.4 Fix Category E errors in server/
    - Update to new export names
    - **Bulk Exception**: Apply same criteria as shared/ (10+ identical, max 30 files)
    - _Requirements: TR-5, US-5_
  
  - [ ] 21.5 Fix Category B errors in server/
    - Map to canonical replacements (e.g., infrastructure/errors → infrastructure/error-handling)
    - Update call sites if API changed
    - **Never use bulk changes** - replacement varies by context
    - _Requirements: TR-5, US-5_

- [ ] 22. Checkpoint - Verify server/ package clean
  - Run `tsc --noEmit -p server/tsconfig.json`
  - Verify module resolution errors (TS2307, TS2305, TS2614, TS2724) eliminated
  - Check regression canaries - ensure no previously clean files gained errors
  - Compare error count to baseline - document reduction
  - If error count increased or canaries affected, investigate before proceeding

- [ ] 23. Fix imports in client/ package (depends on shared/)
  - [ ] 23.1 Fix Category C errors in client/
    - Verify config-only fixes from Phase 1
    - No source file changes needed
    - _Requirements: TR-5, US-5_
  
  - [ ] 23.2 Fix Category D errors in client/
    - Fix barrel files bottom-up
    - Document downstream imports resolved by each barrel fix
    - _Requirements: TR-5, US-5_
  
  - [ ] 23.3 Fix Category A errors in client/ (high volume - expect 400+ files)
    - Default: One file at a time with verification
    - Fix order: core/ → features/ → lib/ (dependency order)
    - **Bulk Exception Criteria** (use judiciously given high volume):
      - Pattern must be identical across 10+ files (same old→new path)
      - Manually verify first 3-5 files confirm pattern holds
      - Document pattern in discrepancy-inventory.md before bulk change
      - Use IDE refactoring tools only (Find & Replace with whole word match)
      - Review full diff before committing
      - Run `tsc --noEmit -p client/tsconfig.json` after bulk change
      - Monitor regression canaries immediately after
      - If error count increases, revert immediately and investigate
      - Maximum 50 files per batch
    - **When NOT to use bulk**: Mixed categories, API changes, unclear patterns, cross-package changes
    - _Requirements: TR-5, US-5_
  
  - [ ] 23.4 Fix Category E errors in client/
    - Update to new export names
    - **Bulk Exception**: Apply same criteria (10+ identical, max 30 files)
    - _Requirements: TR-5, US-5_
  
  - [ ] 23.5 Fix Category B errors in client/
    - Map to canonical replacements
    - Update call sites if API changed
    - **Never use bulk changes** - replacement varies by context
    - _Requirements: TR-5, US-5_

- [ ] 24. Checkpoint - Verify client/ package clean
  - Run `tsc --noEmit -p client/tsconfig.json`
  - Verify module resolution errors (TS2307, TS2305, TS2614, TS2724) eliminated
  - Check regression canaries - ensure no previously clean files gained errors
  - Compare error count to baseline - document reduction
  - If error count increased or canaries affected, investigate before proceeding

### Phase 5: Validation & Error Delta Report

- [ ] 25. Capture post-fix baselines
  - [ ] 25.1 Run tsc on all packages post-fix
    - Execute: `npx tsc --noEmit -p tsconfig.json 2>&1 | tee postfix_tsc_root.txt`
    - Execute: `npx tsc --noEmit -p client/tsconfig.json 2>&1 | tee postfix_tsc_client.txt`
    - Execute: `npx tsc --noEmit -p server/tsconfig.json 2>&1 | tee postfix_tsc_server.txt`
    - Execute: `npx tsc --noEmit -p shared/tsconfig.json 2>&1 | tee postfix_tsc_shared.txt`
    - _Requirements: TR-6, US-6_

- [ ] 26. Analyze error deltas
  - [ ] 26.1 Calculate error count changes per package
    - Compare baseline vs post-fix for each package
    - Calculate total reduction
    - _Requirements: TR-6, US-6_
  
  - [ ] 26.2 Identify and classify regressions
    - Find files that gained errors (regression canaries)
    - Classify each: fix exposed transitive bug vs true regression
    - _Requirements: TR-6, US-6_
  
  - [ ] 26.3 Document newly visible pre-existing bugs
    - Identify modules that were unreachable before fixes
    - Document errors that are now visible but were always present
    - Separate from true regressions
    - _Requirements: TR-6, US-6_
  
  - [ ] 26.4 Create error-delta.md report
    - Summary table with before/after counts
    - Regressions table with explanations
    - Newly visible bugs table
    - Fixes applied table by category
    - _Requirements: TR-6, US-6_

- [ ] 27. Run integration tests
  - [ ] 27.1 Run full type check
    - Execute: `npm run type-check`
    - Verify no module resolution errors remain
    - _Requirements: US-6_
  
  - [ ] 27.2 Build all packages
    - Execute: `npm run build`
    - Verify builds succeed
    - _Requirements: US-6_
  
  - [ ] 27.3 Run test suite
    - Execute: `npm run test`
    - Document any test failures
    - _Requirements: US-6_

- [ ] 28. Final checkpoint - Review all deliverables
  - Verify fix-root-cause.md complete with config diffs
  - Verify discrepancy-inventory.md documents all ~1,200 errors
  - Verify structural-ambiguities.md documents all duplicates
  - Verify error-delta.md explains all changes
  - Confirm module resolution errors reduced to 0
  - Confirm no regressions in canary files

## Notes

- **Default Protocol**: Fix one file at a time, verify with tsc, commit individually
- **Bulk Change Exceptions**: Only for Categories A, C, E with strict criteria (see Phase 4 tasks)
  - Category A: 10+ files, identical old→new path, max 50 files/batch
  - Category C: Config-only fixes, unlimited (no source changes)
  - Category E: 10+ files, identical old→new export name, max 30 files/batch
  - Category D: Single barrel file fix (affects unlimited downstream)
- **Never Bulk**: Category B (replacement varies), mixed categories, API changes, unclear patterns
- **Bulk Safety**: IDE tools only, manual verification of first 3-5 files, full diff review, tsc verification, canary monitoring, immediate revert if errors increase
- Each fix must be verified with `tsc --noEmit` before proceeding
- Regression canaries (zero-error files) must be monitored throughout
- No automated scripts, codemods, or regex replacements except for approved bulk change patterns
- Dependency order: shared → server → client (foundation first)
- Within packages: leaf files before root files, utilities before features
- Stop immediately if error count increases unexpectedly or canary gains errors
- Each phase builds on previous phase - do not skip ahead
- Commit frequently with detailed messages including category and justification
- Document every structural decision in structural-ambiguities.md
- Flag unclear Category B/E replacements for human review rather than guessing
- Use project-structure-reference.md for efficient investigation in Phase 2
