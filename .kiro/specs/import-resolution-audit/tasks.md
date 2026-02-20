# Chanuka Import Resolution & Migration Audit - Implementation Plan

## Overview

This implementation plan systematically resolves all import path errors and module resolution failures across the Chanuka monorepo using a 5-phase approach:

1. **Phase 0: Baseline Capture** - Establish ground truth before any changes
2. **Phase 1: Fix Alias Resolution Root Cause** - Fix config before fixing imports
3. **Phase 2: Structural Hotspot Investigation** - Identify duplicates and stale paths
4. **Phase 3: Full Import Scan & Categorization** - Classify every broken import
5. **Phase 4: Manual Fix Protocol** - Fix imports with verification
6. **Phase 5: Validation & Error Delta Report** - Verify success and document changes

**Key Principles:**
- Fix root causes (config) before symptoms (imports)
- Leverage industry-standard tools (madge, depcheck, ts-unused-exports)
- Manual verification at each step prevents regressions
- Dependency order: shared → server → client, leaf → root
- Safe bulk changes allowed for identical patterns with strict safeguards

---

## CRITICAL RULES

### Hard Constraints
- ❌ NO automated scripts, codemods, sed, awk, or regex replacements (see safe exceptions below)
- ❌ NO bulk changes without verification (see safe exceptions below)
- ❌ NO file moves - update imports, not file locations
- ❌ NO guessing - flag unclear cases for human review
- ❌ NO using backup files from scripts/error-remediation/tests/reports/backups/
- ❌ NO assuming TODO comments mean imports are intentionally broken

### Required Practices
- ✅ Manual fixes with verification (or safe bulk with strict protocols)
- ✅ Verify after every fix with `tsc --noEmit`
- ✅ One file per commit (or one batch per commit with all files listed)
- ✅ Stop and investigate if error count increases unexpectedly
- ✅ Monitor regression canaries (zero-error files)
- ✅ Use industry-standard tools (madge, depcheck, ts-unused-exports)

---

## SAFE BULK CHANGE EXCEPTIONS

See design.md Section "Safe Bulk Change Exceptions" for complete protocols.

### Exception 1: Identical Category A (Stale Path)
**When**: 10+ files import from exact same old path → exact same new path
**Max**: 50 files per batch
**Safety**: Verify first 3-5 files, IDE tools only, full diff review, `tsc --noEmit` verification

### Exception 2: Identical Category C (Alias Fix)
**When**: Config fix already applied, imports now resolve without source changes
**Max**: Unlimited (no source changes needed)
**Safety**: Config fix committed and verified

### Exception 3: Identical Category E (Named Export Rename)
**When**: 10+ files import exact same old export → exact same new export
**Max**: 30 files per batch
**Safety**: Verify first 5 files, signature compatibility check, IDE tools only

### Exception 4: Barrel File Fix (Category D)
**When**: Single barrel file fix resolves multiple downstream imports
**Max**: 1 barrel file (affects unlimited downstream)
**Safety**: Single root cause identified, downstream imports verified

### Bulk Change Prohibitions
**NEVER** use bulk changes for:
- Category B (replacement varies by context)
- Mixed categories (each needs different strategy)
- API changes (each call site needs review)
- Cross-package changes (different packages may need different fixes)
- Unclear patterns (if first 3-5 manual fixes show variation)

---

## Phase 0: Baseline Capture (Before Touching Anything)

**Objective**: Establish ground truth before making any changes. Capture comprehensive baseline using TypeScript compiler and industry-standard analysis tools.

**Key Deliverables**:
- Baseline TypeScript error reports for all packages
- Baseline analysis with error counts and regression canaries
- Tool-generated dependency graphs and circular dependency reports
- Annotated project structure reference with hotspots marked

---

### Task 0.0: Review Project Structure Snapshot
**Requirements**: US-1, TR-1
**Validates**: Requirements 1.1, 1.2

- [x] 0.0.1 Read docs/project-structure.md
  - Understand package structure (client/, server/, shared/, tests/)
  - Identify known duplicate directories from snapshot
  - Note FSD migration boundary (lib/ vs features/)
  - Map out dependency relationships
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.0.2 Create annotated project structure reference
  - Copy project-structure.md to project-structure-reference.md
  - Mark known hotspots with annotations:
    - `[HOTSPOT-1]` - Compiled output in websocket/
    - `[HOTSPOT-2]` - Duplicated security UI
    - `[HOTSPOT-3]` - Duplicated useAuth hooks
    - `[HOTSPOT-4]` - Duplicated loading utilities
    - `[HOTSPOT-5]` - Empty errors directory
    - `[HOTSPOT-6]` - FSD migration boundary
  - _Requirements: US-3 (Identify Structural Inconsistencies)_

- [x] 0.0.3 Extract key metrics from snapshot
  - Count total files in client/src/core/
  - Count total files in client/src/features/
  - Count total files in client/src/lib/
  - Document in baseline_analysis.md
  - _Requirements: US-1 (Establish Error Baseline)_

**Acceptance**: Project structure understood, hotspots pre-identified from snapshot, baseline_analysis.md started

### Task 0.0.5: Install Import Analysis Tools
**Requirements**: US-1, TR-1
**Validates**: Requirements 1.1

- [x] 0.0.5.1 Install dependency analysis tools (if not already installed)
  ```bash
  npm install --save-dev depcheck madge ts-unused-exports eslint-plugin-import
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.0.5.2 Verify tool installations
  ```bash
  npx depcheck --version
  npx madge --version
  npx ts-unused-exports --version
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

**Tools Purpose**:
- **depcheck**: Finds unused dependencies and missing imports
- **madge**: Generates dependency graphs, detects circular dependencies
- **ts-unused-exports**: Finds unused exports across the codebase
- **eslint-plugin-import**: Validates import/export statements

**Acceptance**: All analysis tools installed and verified, ready for baseline capture

---

### Task 0.1: Capture TypeScript Error Baseline
**Requirements**: US-1, TR-1
**Validates**: Requirements 1.1, 1.4

- [x] 0.1.1 Run tsc on root package
  ```bash
  npx tsc --noEmit -p tsconfig.json 2>&1 | tee baseline_tsc_root.txt
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.1.2 Run tsc on client package
  ```bash
  npx tsc --noEmit -p client/tsconfig.json 2>&1 | tee baseline_tsc_client.txt
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.1.3 Run tsc on server package
  ```bash
  npx tsc --noEmit -p server/tsconfig.json 2>&1 | tee baseline_tsc_server.txt
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.1.4 Run tsc on shared package
  ```bash
  npx tsc --noEmit -p shared/tsconfig.json 2>&1 | tee baseline_tsc_shared.txt
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.1.5 Capture Vitest module resolution errors
  ```bash
  npx vitest --reporter=verbose --run 2>&1 | head -200 | tee baseline_vitest.txt
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

**Acceptance**: All baseline files created (baseline_tsc_*.txt, baseline_vitest.txt), no changes made to source code

---

### Task 0.2: Analyze Baseline Errors
**Requirements**: US-1, TR-1
**Validates**: Requirements 1.2, 1.3

- [x] 0.2.1 Count errors by category in each baseline file
  - Count TS2307 (Cannot find module)
  - Count TS2305 (Module has no exported member)
  - Count TS2614 (Module not found or not a module)
  - Count TS2724 (Module has no default export)
  - Count TS7006 (Parameter implicitly has 'any')
  - Count TS18046 (Possibly undefined)
  - Count TS6133 (Variable declared but never used)
  - Count other error codes
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.2.2 Identify zero-error files (regression canaries)
  ```bash
  # Find files with no errors in baseline
  # These are canaries - if they gain errors, it's a regression
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.2.3 Run dependency analysis tools
  ```bash
  # Check for unused dependencies and missing imports
  npx depcheck --json > baseline_depcheck.json
  
  # Generate dependency graph for each package
  npx madge --circular --extensions ts,tsx client/src/ > baseline_circular_client.txt
  npx madge --circular --extensions ts,tsx server/ > baseline_circular_server.txt
  npx madge --circular --extensions ts,tsx shared/ > baseline_circular_shared.txt
  
  # Find unused exports
  npx ts-unused-exports tsconfig.json --excludePathsFromReport=".*\.test\.ts;.*\.spec\.ts" > baseline_unused_exports.txt
  ```
  - _Requirements: US-1 (Establish Error Baseline)_

- [x] 0.2.4 Create baseline analysis document
  - Document total error count per package
  - Document error distribution by category
  - List regression canary files
  - Document circular dependencies found by madge
  - Document unused exports found by ts-unused-exports
  - Document missing/unused dependencies from depcheck
  - Save as `baseline_analysis.md`
  - _Requirements: US-1 (Establish Error Baseline)_

**Acceptance**: Baseline analysis document created with error counts, canary list, circular dependencies, unused exports, and dependency issues documented

---

### Checkpoint 0.3: Baseline Complete
**Requirements**: US-1

- [x] 0.3.1 Verify all baseline artifacts exist
  - baseline_tsc_root.txt
  - baseline_tsc_client.txt
  - baseline_tsc_server.txt
  - baseline_tsc_shared.txt
  - baseline_vitest.txt
  - baseline_depcheck.json
  - baseline_circular_*.txt (3 files)
  - baseline_unused_exports.txt
  - baseline_analysis.md
  - project-structure-reference.md

- [x] 0.3.2 Verify no source code changes made
  ```bash
  git status
  # Should show only new baseline files, no modified source files
  ```

- [-] 0.3.3 Commit baseline artifacts
  ```bash
  git add baseline_*.txt baseline_*.json baseline_analysis.md project-structure-reference.md
  git commit -m "chore: capture baseline for import resolution audit

  - TypeScript error baselines for all packages
  - Dependency analysis (depcheck, madge, ts-unused-exports)
  - Regression canaries identified
  - Project structure annotated with hotspots
  
  Total errors: [count from baseline_analysis.md]
  Module resolution errors: [count from baseline_analysis.md]"
  ```

**Acceptance**: All baseline artifacts committed, ready to proceed to Phase 1

---

## Phase 1: Fix Alias Resolution Root Cause

**Objective**: Ensure all TypeScript path aliases resolve correctly in all tools (tsc, Vite, Vitest, ESLint) before fixing any imports. Fix config, not source code.

**Key Deliverables**:
- Complete config inventory with alias declarations documented
- Alias resolution hypothesis with proof of mismatch
- Minimal config fixes with verification
- fix-root-cause.md document with diffs and proof

---

### Task 1.1: Audit Module Resolution Configs
**Requirements**: US-2, TR-2
**Validates**: Requirements 2.1

- [~] 1.1.1 Read root tsconfig.json
  - Document `compilerOptions.baseUrl`
  - Document `compilerOptions.paths` (all aliases)
  - Document `references` array
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [~] 1.1.2 Read client/tsconfig.json
  - Document whether it extends root
  - Document `compilerOptions.baseUrl`
  - Document `compilerOptions.paths`
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [~] 1.1.3 Read server/tsconfig.json
  - Document whether it extends root
  - Document `compilerOptions.baseUrl`
  - Document `compilerOptions.paths`
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [~] 1.1.4 Read shared/tsconfig.json
  - Document whether it extends root
  - Document `compilerOptions.baseUrl`
  - Document `compilerOptions.paths`
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.1.5 Read client/vite.config.ts
  - Document `resolve.alias` object
  - Compare to tsconfig paths
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.1.6 Read vitest.workspace.ts
  - Document per-project `resolve.alias`
  - Document `moduleNameMapper` if present
  - Compare to tsconfig paths
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.1.7 Read nx.json
  - Document `npmScope`
  - Document project graph settings
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.1.8 Read pnpm-workspace.yaml
  - Document workspace members
  - Verify all packages are listed
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

**Acceptance**: Complete inventory of all configs with alias declarations documented in fix-root-cause.md

---

### Task 1.2: Verify Expected Alias Inventory
**Requirements**: US-2, TR-2
**Validates**: Requirements 2.1

- [ ] 1.2.1 Create alias inventory table in fix-root-cause.md
  | Alias | Expected Target | Root tsconfig | Client tsconfig | Server tsconfig | Vite | Vitest |
  |-------|----------------|---------------|-----------------|-----------------|------|--------|
  | `@/` | `client/src/` | ? | ? | N/A | ? | ? |
  | `@shared/` | `shared/` | ? | ? | ? | ? | ? |
  | `@server/` | `server/` | N/A | N/A | ? | N/A | ? |
  | `@client/` | `client/src/` | ? | ? | N/A | ? | ? |
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.2.2 Fill in table with actual declarations
  - Mark ✅ if alias is declared correctly
  - Mark ❌ if alias is missing
  - Mark ⚠️ if alias target is incorrect
  - Note any incorrect target paths
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.2.3 Document missing aliases
  - List which tools are missing which aliases
  - Prioritize by impact (how many imports affected)
  - Cross-reference with baseline errors
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

**Acceptance**: Alias inventory table complete in fix-root-cause.md with gaps identified and prioritized

---

### Task 1.3: Confirm Alias Resolution Hypothesis
**Requirements**: US-2, TR-2
**Validates**: Requirements 2.2

- [ ] 1.3.1 Pick one broken absolute import from baseline
  - Choose from baseline_tsc_*.txt errors
  - Example: `import { something } from '@shared/types'`
  - Document in fix-root-cause.md
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.3.2 Trace what path each resolver constructs
  - TypeScript: `baseUrl` + `paths['@shared/*']` → ?
  - Vite: `resolve.alias['@shared']` → ?
  - Vitest: `resolve.alias['@shared']` → ?
  - Document each resolution path
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.3.3 Compare to actual file location
  - Where does the file actually exist?
  - Document the mismatch
  - Example: "TypeScript resolves to `shared/types` but file is at `shared/src/types`"
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.3.4 Write down proof in fix-root-cause.md
  - "TypeScript resolves to X, but file is at Y"
  - This proves config fix is needed
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

**Acceptance**: Hypothesis documented in fix-root-cause.md with proof of mismatch

---

### Task 1.4: Apply Minimal Config Fix
**Requirements**: US-2, TR-2
**Validates**: Requirements 2.2, 2.3

- [ ] 1.4.1 Identify minimal config changes needed
  - List exact changes to each config file
  - Example: "Add `'@shared/*': ['shared/*']` to root tsconfig paths"
  - Document in fix-root-cause.md
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.4.2 Apply config changes
  - Edit config files manually
  - Do NOT change any source files yet
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.4.3 Create test import file
  ```typescript
  // test-import.ts
  import { something } from '@shared/types';
  import { other } from '@/core/api';
  ```
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.4.4 Verify fix with test file
  ```bash
  npx tsc --noEmit test-import.ts
  ```
  - Should resolve successfully
  - If fails, adjust config and retry
  - Document verification in fix-root-cause.md
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.4.5 Delete test file
  ```bash
  rm test-import.ts
  ```
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.4.6 Document config changes in fix-root-cause.md
  - Include exact diffs for each config file
  - Include proof of fix (test-import.ts verification)
  - Include before/after tsc output
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

- [ ] 1.4.7 Commit config changes
  ```bash
  git add tsconfig.json client/vite.config.ts vitest.workspace.ts fix-root-cause.md
  git commit -m "fix(config): add missing path aliases

  - Add @shared/* to Vitest config
  - Fix @/ alias target in Vite config
  
  Proof: test-import.ts now resolves successfully
  See fix-root-cause.md for complete documentation"
  ```
  - _Requirements: US-2 (Fix Alias Resolution Root Cause)_

**Acceptance**: Config changes committed with proof of fix in fix-root-cause.md, no source files changed

---

### Checkpoint 1.5: Config Fixes Complete
**Requirements**: US-2

- [ ] 1.5.1 Verify fix-root-cause.md is complete
  - Config inventory table filled
  - Alias resolution hypothesis documented
  - Config diffs included
  - Proof of fix included

- [ ] 1.5.2 Verify no source code changes made
  ```bash
  git diff --name-only HEAD~1 HEAD
  # Should show only config files and fix-root-cause.md
  ```

- [ ] 1.5.3 Run quick verification
  ```bash
  # Check if config fixes reduced errors
  npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "TS2307|TS2305" | wc -l
  # Compare to baseline count
  ```

**Acceptance**: Config fixes committed and verified, ready to proceed to Phase 2

---

## Phase 2: Structural Hotspot Investigation

### Task 2.1: Investigate Compiled Output in Source Tree
**Requirements**: US-3, TR-3

- [ ] 2.1.1 List files in client/src/core/websocket/
  ```bash
  ls -la client/src/core/websocket/
  ```
  - Identify `.js`, `.js.map`, `.d.ts`, `.d.ts.map` files

- [ ] 2.1.2 Find imports to websocket/manager
  ```bash
  grep -r "from.*websocket/manager" client/src/ --include='*.ts' --include='*.tsx'
  ```

- [ ] 2.1.3 Determine if compiled files are stale
  - Check git history: when were they committed?
  - Are they build artifacts that shouldn't be in source control?

- [ ] 2.1.4 Document resolution
  - If stale artifacts: delete them, add to .gitignore
  - If intentional: document why and verify imports resolve to .ts

**Acceptance**: Compiled output issue documented and resolved

### Task 2.2: Investigate Security Module Triple Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-2

- [ ] 2.2.1 Use project-structure.md to verify three locations
  - `core/security/` - Infrastructure + UI
  - `features/security/` - Minimal feature + duplicate UI
  - `lib/ui/privacy/` - Privacy-specific UI
  - Document file counts and structure from snapshot

- [ ] 2.2.2 Verify best implementation (already identified)
  - **Best**: `core/security/` - Most comprehensive infrastructure
  - **Issue**: Architectural misplacement (infrastructure in core instead of lib)
  - **Duplicate**: `features/security/` has minimal content + duplicate UI

- [ ] 2.2.3 Find imports to each location
  ```bash
  grep -r "from.*core/security" client/src/ --include='*.ts' --include='*.tsx' > security_core_imports.txt
  grep -r "from.*features/security" client/src/ --include='*.ts' --include='*.tsx' > security_features_imports.txt
  grep -r "from.*lib/ui/privacy" client/src/ --include='*.ts' --include='*.tsx' > security_privacy_imports.txt
  ```

- [ ] 2.2.4 Document recommended resolution in structural-ambiguities.md
  - **Action 1**: MOVE `core/security/` infrastructure → `lib/infrastructure/security/`
  - **Action 2**: MOVE `core/security/ui/` → `lib/ui/security/`
  - **Action 3**: DELETE `features/security/` (consolidate into lib)
  - **Action 4**: KEEP `lib/ui/privacy/` for privacy-specific UI
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: HIGH - Triple overlap with clear resolution
  - Importers: (list from import files)

**Acceptance**: Security triple overlap documented with architectural resolution plan

### Task 2.3: Investigate Authentication Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-3

- [ ] 2.3.1 Verify three locations from analysis
  - `core/auth/` - Complete infrastructure (TokenManager, SessionManager, AuthApiService, etc.)
  - `features/auth/pages/` - Auth UI pages only
  - `features/users/hooks/useAuth.tsx` - Single auth hook
  - **Best**: `core/auth/` - Most complete infrastructure

- [ ] 2.3.2 Compare useAuth implementations
  ```bash
  diff client/src/core/auth/hooks/useAuth.tsx \
       client/src/features/users/hooks/useAuth.tsx
  ```

- [ ] 2.3.3 Find all useAuth imports
  ```bash
  grep -r "from.*useAuth" client/src/ --include='*.ts' --include='*.tsx' > useauth_imports.txt
  ```

- [ ] 2.3.4 Document resolution in structural-ambiguities.md
  - **Assessment**: `core/auth/` is correctly placed (it's infrastructure)
  - **Action 1**: KEEP `core/auth/` infrastructure
  - **Action 2**: KEEP `features/auth/pages/` for UI
  - **Action 3**: CONSOLIDATE `features/users/hooks/useAuth.tsx` to use `core/auth/hooks/useAuth.tsx`
  - Classification: Category A (Stale Path) - Hook duplication
  - Priority: MEDIUM - Clear infrastructure vs UI separation
  - Importers: (list from useauth_imports.txt)

**Acceptance**: Auth overlap documented with consolidation plan for hook duplication

### Task 2.4: Investigate Loading Module Triple Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-4

- [ ] 2.4.1 Verify three locations from analysis
  - `core/loading/` - Loading context, hooks (useOnlineStatus, useTimeoutAwareLoading), utils (connection, loading, progress, timeout), validation
  - `lib/ui/loading/` - Extensive loading UI (AssetLoadingIndicator, BrandedLoadingScreen, GlobalLoadingIndicator, hooks, UI components, skeletons, spinners, fallbacks)
  - `lib/design-system/feedback/LoadingSpinner.tsx` - Basic design system spinner primitive
  - **Best**: `lib/ui/loading/` - Most comprehensive

- [ ] 2.4.2 Compare utility files
  ```bash
  diff client/src/core/loading/utils/connection-utils.ts \
       client/src/lib/ui/loading/utils/connection-utils.ts
  # Repeat for loading-utils.ts, progress-utils.ts, timeout-utils.ts
  ```

- [ ] 2.4.3 Find imports to each location
  ```bash
  grep -r "from.*core/loading" client/src/ --include='*.ts' --include='*.tsx' > loading_core_imports.txt
  grep -r "from.*lib/ui/loading" client/src/ --include='*.ts' --include='*.tsx' > loading_lib_imports.txt
  grep -r "from.*design-system/feedback/LoadingSpinner" client/src/ --include='*.ts' --include='*.tsx' > loading_spinner_imports.txt
  ```

- [ ] 2.4.4 Document resolution in structural-ambiguities.md
  - **Assessment**: Loading is primarily a UI concern, not business logic
  - **Action 1**: KEEP `lib/ui/loading/` as primary (most comprehensive)
  - **Action 2**: MOVE `core/loading/` hooks → `lib/ui/loading/hooks/`
  - **Action 3**: MOVE `core/loading/` utils → `lib/ui/loading/utils/`
  - **Action 4**: DELETE `core/loading/` after migration
  - **Action 5**: KEEP `lib/design-system/feedback/LoadingSpinner.tsx` as primitive
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: HIGH - Triple overlap with clear best implementation
  - Importers: (list from import files)

**Acceptance**: Loading triple overlap documented with architectural resolution plan

### Task 2.5: Investigate Empty server/infrastructure/errors/ Directory
**Requirements**: US-3, TR-3

- [ ] 2.5.1 Verify directory is empty
  ```bash
  ls -la server/infrastructure/errors/
  ```

- [ ] 2.5.2 Find imports to this path
  ```bash
  grep -r "from.*infrastructure/errors" server/ --include='*.ts' > errors_dir_imports.txt
  ```

- [ ] 2.5.3 Identify replacement location
  - Check `server/infrastructure/error-handling/`
  - Verify it exports error handling functionality

- [ ] 2.5.4 Document in structural-ambiguities.md
  - Old path: `server/infrastructure/errors/` (empty, deleted)
  - New path: `server/infrastructure/error-handling/`
  - Classification: Category B (deleted/superseded)
  - Importers: (list from errors_dir_imports.txt)

**Acceptance**: Empty errors directory documented with replacement identified

### Task 2.6: Investigate FSD Migration Boundary
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-6

- [ ] 2.6.1 Find potential duplicates in services
  ```bash
  # Compare userService files
  diff client/src/lib/services/userService.ts \
       client/src/features/users/services/user-service-legacy.ts
  
  # Compare notification services
  diff client/src/lib/services/notification-service.ts \
       client/src/features/notifications/model/notification-service.ts
  ```

- [ ] 2.6.2 Find potential duplicates in hooks
  ```bash
  # Find hooks in lib/
  find client/src/lib/hooks -name "*.ts" -o -name "*.tsx"
  
  # Check if they exist in core/*/hooks/
  # (manual comparison needed)
  ```

- [ ] 2.6.3 Classify each file using architectural principles
  - Feature code (belongs in `features/`) vs
  - Shared infrastructure (belongs in `lib/`)
  - Reference `docs/architecture/CLIENT_LIB_CORE_FEATURES_ANALYSIS.md` for decision matrix

- [ ] 2.6.4 Document in structural-ambiguities.md
  - For each duplicate pair:
    - Canonical version
    - Stale version
    - Rationale (feature vs infrastructure, reference architectural principles)
    - Importers
  - Note: Many overlaps already documented in CLIENT_OVERLAP_ANALYSIS.md

**Acceptance**: FSD migration boundary issues documented with canonical versions identified and architectural rationale

---

### Task 2.7: Investigate Monitoring Module Triple Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.7.1 Verify three locations from analysis
  - `core/monitoring/` - Basic (monitoring-init, sentry-config)
  - `features/monitoring/model/` - Performance monitoring models
  - `lib/infrastructure/monitoring/` - **BEST** - Comprehensive infrastructure
  - Document file counts and structure

- [ ] 2.7.2 Find imports to each location
  ```bash
  grep -r "from.*core/monitoring" client/src/ --include='*.ts' --include='*.tsx' > monitoring_core_imports.txt
  grep -r "from.*features/monitoring" client/src/ --include='*.ts' --include='*.tsx' > monitoring_features_imports.txt
  grep -r "from.*lib/infrastructure/monitoring" client/src/ --include='*.ts' --include='*.tsx' > monitoring_lib_imports.txt
  ```

- [ ] 2.7.3 Document resolution in structural-ambiguities.md
  - **Action 1**: KEEP `lib/infrastructure/monitoring/` as primary infrastructure
  - **Action 2**: MOVE `core/monitoring/` → `lib/infrastructure/monitoring/` (consolidate)
  - **Action 3**: KEEP `features/monitoring/` for feature-specific performance testing
  - **Action 4**: DELETE `core/monitoring/` after migration
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: HIGH - Triple overlap with clear best implementation
  - Importers: (list from import files)

**Acceptance**: Monitoring triple overlap documented with architectural resolution plan

---

### Task 2.8: Investigate Navigation Module Triple Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.8.1 Verify three locations from analysis
  - `core/navigation/` - **BEST** - Complete business logic (services, hooks, analytics, breadcrumbs)
  - `features/navigation/model/` - Empty (only index.ts)
  - `lib/ui/navigation/` - Navigation UI components
  - Document structure

- [ ] 2.8.2 Find imports to each location
  ```bash
  grep -r "from.*core/navigation" client/src/ --include='*.ts' --include='*.tsx' > navigation_core_imports.txt
  grep -r "from.*features/navigation" client/src/ --include='*.ts' --include='*.tsx' > navigation_features_imports.txt
  grep -r "from.*lib/ui/navigation" client/src/ --include='*.ts' --include='*.tsx' > navigation_lib_imports.txt
  ```

- [ ] 2.8.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Navigation business logic should be in features, not core
  - **Action 1**: MOVE `core/navigation/` → `features/navigation/services/` (it's business logic)
  - **Action 2**: KEEP `lib/ui/navigation/` for UI
  - **Action 3**: KEEP `lib/contexts/NavigationContext.tsx`
  - **Action 4**: DELETE empty `features/navigation/model/`
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: HIGH - Triple overlap with clear resolution
  - Importers: (list from import files)

**Acceptance**: Navigation triple overlap documented with architectural resolution plan

---

### Task 2.9: Investigate Validation Module Triple Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.9.1 Verify three locations from analysis
  - `core/validation/` - Dashboard validation (minimal)
  - `lib/validation/` - **BEST** - Base validation, consolidated
  - `features/dashboard/validation/` - Feature-specific with tests
  - Document structure

- [ ] 2.9.2 Find imports to each location
  ```bash
  grep -r "from.*core/validation" client/src/ --include='*.ts' --include='*.tsx' > validation_core_imports.txt
  grep -r "from.*lib/validation" client/src/ --include='*.ts' --include='*.tsx' > validation_lib_imports.txt
  grep -r "from.*features/dashboard/validation" client/src/ --include='*.ts' --include='*.tsx' > validation_dashboard_imports.txt
  ```

- [ ] 2.9.3 Document resolution in structural-ambiguities.md
  - **Action 1**: KEEP `lib/validation/` for shared validation
  - **Action 2**: KEEP `features/dashboard/validation/` for feature-specific
  - **Action 3**: DELETE `core/validation/` (consolidate into lib or features)
  - Classification: Category A (Stale Path)
  - Priority: HIGH - Triple overlap with clear resolution
  - Importers: (list from import files)

**Acceptance**: Validation triple overlap documented with architectural resolution plan

---

### Task 2.10: Investigate Realtime/WebSocket Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.10.1 Verify locations from analysis
  - `core/realtime/` - **BEST** - Recently consolidated, complete system
  - `core/websocket/` - **DELETE** - Old implementation (compiled .js files)
  - `features/realtime/model/` - Feature-specific optimizer
  - Document structure

- [ ] 2.10.2 Find imports to each location
  ```bash
  grep -r "from.*core/realtime" client/src/ --include='*.ts' --include='*.tsx' > realtime_core_imports.txt
  grep -r "from.*core/websocket" client/src/ --include='*.ts' --include='*.tsx' > websocket_core_imports.txt
  grep -r "from.*features/realtime" client/src/ --include='*.ts' --include='*.tsx' > realtime_features_imports.txt
  ```

- [ ] 2.10.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Realtime is infrastructure, recently consolidated
  - **Action 1**: MOVE `core/realtime/` → `lib/infrastructure/realtime/` (it's infrastructure)
  - **Action 2**: DELETE `core/websocket/` (superseded by core/realtime)
  - **Action 3**: KEEP `features/realtime/model/` for feature-specific optimizations
  - Classification: Category A (Stale Path) + Category B (Deleted/Superseded for websocket)
  - Priority: HIGH - Old websocket implementation must be removed
  - Importers: (list from import files)

**Acceptance**: Realtime/WebSocket overlap documented with architectural resolution plan

---

### Task 2.11: Investigate Error Handling Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.11.1 Verify four locations from analysis
  - `core/error/` - **BEST** - Complete error handling system
  - `lib/infrastructure/monitoring/` - Error monitoring
  - `lib/design-system/interactive/errors.ts` - UI components
  - `lib/ui/error-boundary/` - Error boundary components
  - Document structure

- [ ] 2.11.2 Find imports to each location
  ```bash
  grep -r "from.*core/error" client/src/ --include='*.ts' --include='*.tsx' > error_core_imports.txt
  grep -r "from.*lib/infrastructure/monitoring" client/src/ --include='*.ts' --include='*.tsx' > error_monitoring_imports.txt
  grep -r "from.*lib/design-system/interactive/errors" client/src/ --include='*.ts' --include='*.tsx' > error_ui_imports.txt
  grep -r "from.*lib/ui/error-boundary" client/src/ --include='*.ts' --include='*.tsx' > error_boundary_imports.txt
  ```

- [ ] 2.11.3 Document resolution in structural-ambiguities.md
  - **Action 1**: MOVE `core/error/` → `lib/infrastructure/error/` (it's infrastructure)
  - **Action 2**: KEEP `lib/infrastructure/monitoring/` for monitoring
  - **Action 3**: KEEP `lib/ui/error-boundary/` for UI
  - **Action 4**: CONSOLIDATE: Single error handling system
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: MEDIUM - Four locations need consolidation
  - Importers: (list from import files)

**Acceptance**: Error handling overlap documented with architectural resolution plan

---

### Task 2.12: Investigate Community Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.12.1 Verify two locations from analysis
  - `core/community/` - Real-time infrastructure
  - `features/community/` - **BEST** - Complete feature
  - Document structure

- [ ] 2.12.2 Find imports to each location
  ```bash
  grep -r "from.*core/community" client/src/ --include='*.ts' --include='*.tsx' > community_core_imports.txt
  grep -r "from.*features/community" client/src/ --include='*.ts' --include='*.tsx' > community_features_imports.txt
  ```

- [ ] 2.12.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Community is business logic, belongs in features
  - **Action 1**: KEEP `features/community/` as primary
  - **Action 2**: MOVE `core/community/services/` → `features/community/services/`
  - **Action 3**: MOVE `core/community/hooks/` → `features/community/hooks/`
  - **Action 4**: DELETE `core/community/` after migration
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: MEDIUM - Business logic misplaced in core
  - Importers: (list from import files)

**Acceptance**: Community overlap documented with architectural resolution plan

---

### Task 2.13: Investigate Search Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.13.1 Verify two locations from analysis
  - `core/search/` - Minimal infrastructure
  - `features/search/` - **BEST** - Complete feature
  - Document structure

- [ ] 2.13.2 Find imports to each location
  ```bash
  grep -r "from.*core/search" client/src/ --include='*.ts' --include='*.tsx' > search_core_imports.txt
  grep -r "from.*features/search" client/src/ --include='*.ts' --include='*.tsx' > search_features_imports.txt
  ```

- [ ] 2.13.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Search is business logic, belongs in features
  - **Action 1**: KEEP `features/search/` as primary
  - **Action 2**: MOVE `core/search/` → `features/search/services/` (consolidate)
  - **Action 3**: DELETE `core/search/` after migration
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: MEDIUM - Business logic misplaced in core
  - Importers: (list from import files)

**Acceptance**: Search overlap documented with architectural resolution plan

---

### Task 2.14: Investigate Analytics Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.14.1 Verify two locations from analysis
  - `core/analytics/` - Analytics infrastructure (provider, tracker, service)
  - `features/analytics/` - **BEST** - Complete feature with UI
  - Document structure

- [ ] 2.14.2 Find imports to each location
  ```bash
  grep -r "from.*core/analytics" client/src/ --include='*.ts' --include='*.tsx' > analytics_core_imports.txt
  grep -r "from.*features/analytics" client/src/ --include='*.ts' --include='*.tsx' > analytics_features_imports.txt
  ```

- [ ] 2.14.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Separate infrastructure from business logic
  - **Action 1**: KEEP `features/analytics/` as primary
  - **Action 2**: MOVE infrastructure from `core/analytics/` → `lib/infrastructure/analytics/`
  - **Action 3**: DELETE `core/analytics/` business logic (consolidate into features)
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: MEDIUM - Infrastructure vs business logic separation needed
  - Importers: (list from import files)

**Acceptance**: Analytics overlap documented with architectural resolution plan

---

### Task 2.15: Investigate Dashboard Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.15.1 Verify three locations from analysis
  - `core/dashboard/` - Basic (context, hooks, reducer, utils)
  - `features/dashboard/pages/` - Dashboard page
  - `lib/ui/dashboard/` - **BEST** - Extensive UI components
  - Document structure

- [ ] 2.15.2 Find imports to each location
  ```bash
  grep -r "from.*core/dashboard" client/src/ --include='*.ts' --include='*.tsx' > dashboard_core_imports.txt
  grep -r "from.*features/dashboard" client/src/ --include='*.ts' --include='*.tsx' > dashboard_features_imports.txt
  grep -r "from.*lib/ui/dashboard" client/src/ --include='*.ts' --include='*.tsx' > dashboard_lib_imports.txt
  ```

- [ ] 2.15.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Separate UI from business logic
  - **Action 1**: KEEP `lib/ui/dashboard/` for UI components
  - **Action 2**: MOVE `core/dashboard/` business logic → `features/dashboard/services/`
  - **Action 3**: KEEP `features/dashboard/pages/` for pages
  - **Action 4**: CONSOLIDATE: Use lib UI components in feature pages
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: MEDIUM - UI vs business logic separation needed
  - Importers: (list from import files)

**Acceptance**: Dashboard overlap documented with architectural resolution plan

---

### Task 2.16: Investigate Storage Module Overlap
**Requirements**: US-3, TR-3

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`, `baseline_analysis.md` HOTSPOT-7

- [ ] 2.16.1 Verify two locations from analysis
  - `core/storage/` - Storage infrastructure (cache, offline, secure storage)
  - `lib/infrastructure/store/` - Redux store infrastructure
  - Document structure

- [ ] 2.16.2 Find imports to each location
  ```bash
  grep -r "from.*core/storage" client/src/ --include='*.ts' --include='*.tsx' > storage_core_imports.txt
  grep -r "from.*lib/infrastructure/store" client/src/ --include='*.ts' --include='*.tsx' > storage_lib_imports.txt
  ```

- [ ] 2.16.3 Document resolution in structural-ambiguities.md
  - **Assessment**: Both are infrastructure, different purposes
  - **Action 1**: MOVE `core/storage/` → `lib/infrastructure/storage/` (it's infrastructure)
  - **Action 2**: KEEP `lib/infrastructure/store/` for Redux
  - Classification: Category A (Stale Path) + Architectural Misplacement
  - Priority: LOW - Clear separation, just needs relocation
  - Importers: (list from import files)

**Acceptance**: Storage overlap documented with architectural resolution plan

---

### Checkpoint 2.17: Structural Hotspot Investigation Complete
**Requirements**: US-3

- [ ] 2.17.1 Verify all hotspots investigated
  - HOTSPOT-1: Compiled Output (Task 2.1)
  - HOTSPOT-2: Security Triple Overlap (Task 2.2)
  - HOTSPOT-3: Auth Overlap (Task 2.3)
  - HOTSPOT-4: Loading Triple Overlap (Task 2.4)
  - HOTSPOT-5: Empty Errors Directory (Task 2.5)
  - HOTSPOT-6: FSD Migration Boundary (Task 2.6)
  - HOTSPOT-7: Critical Overlaps (Tasks 2.7-2.16)

- [ ] 2.17.2 Verify structural-ambiguities.md is complete
  - All overlaps documented
  - Best implementations identified
  - Architectural rationale provided
  - Migration actions specified
  - Importers listed

- [ ] 2.17.3 Commit structural-ambiguities.md
  ```bash
  git add structural-ambiguities.md
  git commit -m "docs: complete structural hotspot investigation

  - Investigated 16 critical overlaps
  - Identified best implementations using architectural principles
  - Documented migration actions for each overlap
  - Referenced CLIENT_OVERLAP_ANALYSIS.md and CLIENT_LIB_CORE_FEATURES_ANALYSIS.md
  
  Hotspots covered:
  - Compiled output in websocket/
  - Security, Auth, Loading triple overlaps
  - Empty errors directory
  - FSD migration boundary
  - 10 additional critical overlaps (Monitoring, Navigation, Validation, etc.)
  
  See structural-ambiguities.md for complete analysis"
  ```

**Acceptance**: All structural hotspots investigated and documented with architectural rationale, ready to proceed to Phase 3 and architectural rationale

---

## Phase 3: Full Import Scan & Categorization

### Task 3.1: Extract Module Resolution Errors
**Requirements**: US-4, TR-4

- [ ] 3.1.1 Extract all module resolution errors using TypeScript
  ```bash
  npx tsc --noEmit -p tsconfig.json 2>&1 | \
    grep -E "TS2307|TS2305|TS2614|TS2724" > module_errors.txt
  ```

- [ ] 3.1.2 Use madge to analyze import relationships
  ```bash
  # Generate detailed dependency tree for each package
  npx madge --json client/src/ > client_dependencies.json
  npx madge --json server/ > server_dependencies.json
  npx madge --json shared/ > shared_dependencies.json
  
  # Find orphaned modules (no imports)
  npx madge --orphans --extensions ts,tsx client/src/ > client_orphans.txt
  npx madge --orphans --extensions ts,tsx server/ > server_orphans.txt
  npx madge --orphans --extensions ts,tsx shared/ > shared_orphans.txt
  ```

- [ ] 3.1.3 Use depcheck to find import issues
  ```bash
  # Analyze each package separately
  cd client && npx depcheck --json > ../client_import_issues.json && cd ..
  cd server && npx depcheck --json > ../server_import_issues.json && cd ..
  cd shared && npx depcheck --json > ../shared_import_issues.json && cd ..
  ```

- [ ] 3.1.4 Parse errors into structured format
  - File path
  - Line number
  - Error code
  - Import statement
  - Target module
  - Cross-reference with madge dependency data

- [ ] 3.1.5 Group errors by file
  - Count errors per file
  - Prioritize files with most errors
  - Use madge data to identify high-impact files (many dependents)

- [ ] 3.1.6 Cross-reference with project-structure.md
  - For each broken import, check if target exists in snapshot
  - If target exists elsewhere in snapshot, mark as Category A candidate
  - If target doesn't exist anywhere, mark as Category B candidate
  - Use madge orphans list to identify Category B candidates
  - Document findings in module_errors_annotated.txt

**Acceptance**: All module resolution errors extracted, grouped, and pre-categorized using tools and project snapshot

### Task 3.2: Categorize Each Broken Import
**Requirements**: US-4, TR-4

For each broken import, determine category using tools and architectural analysis:

- [ ] 3.2.1 Use madge to check if target file exists at different path (Category A)
  ```bash
  # For import: from '@/core/auth/hooks/useAuth'
  # Check madge dependency graph to find if useAuth exists elsewhere
  # Example: grep -r "useAuth" client_dependencies.json
  ```
  - Cross-reference with structural-ambiguities.md to identify if it's an architectural misplacement
  - Check if module is in one of the 16 critical overlaps documented in Phase 2
  - If overlap exists, use recommended location from architectural analysis

- [ ] 3.2.2 Use madge orphans list to identify deleted files (Category B)
  ```bash
  # Check if target module is in orphans list
  # If yes, it's likely Category B (deleted/superseded)
  # Cross-reference with git history if needed
  git log --all --full-history -- "path/to/deleted/file.ts"
  ```
  - Check structural-ambiguities.md for documented superseded modules
  - Example: `core/websocket/` superseded by `core/realtime/`

- [ ] 3.2.3 Check if alias is missing from tool config (Category C)
  - Refer to alias inventory from Task 1.2
  - If alias is missing from specific tool, it's Category C
  - Use depcheck output to identify missing alias configurations

- [ ] 3.2.4 Use madge to identify broken barrel files (Category D)
  ```bash
  # Check if it's a barrel file with broken internal import
  # Madge will show the dependency chain
  npx madge --image barrel-deps.svg client/src/features/security/ui/index.ts
  ```

- [ ] 3.2.5 Use ts-unused-exports to check if member exists (Category E)
  ```bash
  # Check if module exists but member doesn't
  # ts-unused-exports will show what's actually exported
  npx ts-unused-exports tsconfig.json --findCompletelyUnusedFiles
  ```

- [ ] 3.2.6 Apply architectural principles for categorization
  - Reference `docs/architecture/CLIENT_LIB_CORE_FEATURES_ANALYSIS.md` decision matrix
  - Reference `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md` for best implementations
  - Reference `baseline_analysis.md` Section 7 for architectural principles
  - Determine if import is:
    - Stale path (Category A) - file moved during architectural refactor
    - Architectural misplacement - importing from wrong layer (core vs lib vs features)
    - Deleted/superseded (Category B) - old implementation removed

- [ ] 3.2.7 Document in discrepancy-inventory.md
  - Create table with columns:
    - File
    - Line
    - Import String
    - Category (A/B/C/D/E)
    - Root Cause Hypothesis
    - Proposed Fix
    - Architectural Rationale (reference to overlap analysis if applicable)
    - Priority (based on dependency order)
    - Tool Evidence (madge/depcheck/ts-unused-exports findings)

**Acceptance**: Every broken import categorized using industry-standard tools and architectural principles in discrepancy-inventory.md

### Task 3.3: Prioritize Fixes by Dependency Order
**Requirements**: US-5, TR-4

- [ ] 3.3.1 Use madge to generate dependency graph
  ```bash
  # Generate visual dependency graph
  npx madge --image dependency-graph.svg --extensions ts,tsx client/src/
  npx madge --image dependency-graph-server.svg --extensions ts,tsx server/
  npx madge --image dependency-graph-shared.svg --extensions ts,tsx shared/
  
  # Get dependency depth for each file
  npx madge --json --extensions ts,tsx client/src/ > client_dep_depth.json
  ```

- [ ] 3.3.2 Group files by package using madge data
  - shared/ files (analyze from shared_dependencies.json)
  - server/ files (analyze from server_dependencies.json)
  - client/ files (analyze from client_dependencies.json)

- [ ] 3.3.3 Within each package, use madge to identify dependency order
  - Leaf files (no imports from same package) - madge shows 0 dependencies
  - Intermediate files - madge shows moderate dependencies
  - Root files (imported by many others) - madge shows high dependent count

- [ ] 3.3.4 Create fix order list using madge insights
  1. shared/ leaf files (from madge: files with 0 internal dependencies)
  2. shared/ intermediate files
  3. shared/ root files (from madge: files with most dependents)
  4. server/ leaf files
  5. server/ intermediate files
  6. server/ root files
  7. client/ leaf files
  8. client/ intermediate files
  9. client/ root files

- [ ] 3.3.5 Update discrepancy-inventory.md with fix order
  - Add "Fix Order" column
  - Number files in dependency order based on madge analysis
  - Add "Dependent Count" column from madge data
  - Prioritize high-impact files (many dependents) within each group

**Acceptance**: Fix order established using madge dependency analysis in discrepancy-inventory.md

### Task 3.4: Identify Bulk Change Opportunities
**Requirements**: US-5, TR-4

- [ ] 3.4.1 Use madge to scan for identical Category A patterns
  ```bash
  # Use madge to find all files importing from old path
  npx madge --depends '@/core/auth/hooks/useAuth' client/src/ > useauth_importers.txt
  
  # Count occurrences
  wc -l useauth_importers.txt
  ```
  - List patterns with 10+ identical occurrences
  - Verify new path exists and exports match using ts-unused-exports
  - Mark as "BULK CANDIDATE" in discrepancy-inventory.md

- [ ] 3.4.2 Use ts-unused-exports to scan for identical Category E patterns
  ```bash
  # Find all files importing a renamed export
  # ts-unused-exports will show what's actually exported vs what's imported
  npx ts-unused-exports tsconfig.json --showLineNumber > export_mismatches.txt
  ```
  - List patterns with 10+ identical occurrences
  - Verify new export exists and signature matches
  - Mark as "BULK CANDIDATE" in discrepancy-inventory.md

- [ ] 3.4.3 Use madge to identify barrel file fixes (Category D)
  ```bash
  # Find barrel files with broken internal imports
  # Madge will show dependency chains through barrel files
  npx madge --circular --extensions ts,tsx client/src/ | grep "index.ts"
  
  # Count downstream files for each barrel
  npx madge --depends 'client/src/features/security/ui/index.ts' client/src/ | wc -l
  ```
  - Find barrel files with broken internal imports
  - Count how many downstream files import from each barrel
  - Mark barrel file as "BARREL FIX" in discrepancy-inventory.md

- [ ] 3.4.4 Document bulk change plan using tool data
  - For each bulk candidate:
    - Pattern description
    - Number of affected files (from madge/grep counts)
    - Safety verification steps
    - Maximum batch size
    - Tool evidence (madge dependency count, ts-unused-exports findings)
  - Save as section in discrepancy-inventory.md

**Acceptance**: All bulk change opportunities identified using madge and ts-unused-exports, documented with safety protocols

---

## Phase 4: Manual Fix Protocol

**NOTE**: This phase allows safe bulk changes for identical patterns. See design.md for full safety protocols.

### Task 4.0: Execute Bulk Change Opportunities (If Identified)
**Requirements**: US-5, TR-5

For each bulk change candidate identified in Task 3.4:

- [ ] 4.0.1 Select bulk change candidate
  - Choose from "BULK CANDIDATE" or "BARREL FIX" items in discrepancy-inventory.md
  - Verify it meets exception criteria (see design.md)

- [ ] 4.0.2 Manual verification phase
  - Manually fix first 3-5 files following the pattern
  - Verify each fix with `tsc --noEmit`
  - Confirm pattern is truly identical across all files
  - If variation found, STOP and mark as manual-only

- [ ] 4.0.3 Document the pattern
  - Old import/export: (exact string)
  - New import/export: (exact string)
  - Number of affected files: (count)
  - Verification: (what was checked)

- [ ] 4.0.4 Apply bulk change using IDE
  - Use IDE "Find and Replace" with whole word match
  - OR use IDE refactoring tools (e.g., "Rename Symbol")
  - NEVER use sed, awk, or regex scripts
  - Review full diff before proceeding

- [ ] 4.0.5 Verify bulk change
  ```bash
  # Run type check on affected package
  npx tsc --noEmit -p package/tsconfig.json
  
  # Count errors before and after
  # Should show reduction, never increase
  ```

- [ ] 4.0.6 Check regression canaries
  - Verify no previously clean files gained errors
  - If any canary fails, REVERT immediately

- [ ] 4.0.7 Commit batch with detailed message
  ```bash
  git add [all affected files]
  git commit -m "fix(package): resolve [Category] in [N] files

  Pattern: [old] → [new]
  
  Files affected:
  - file1.ts
  - file2.ts
  ... (list all)
  
  Verified:
  - Manual verification: first 5 files
  - tsc errors: [before] → [after]
  - Canaries: all clean"
  ```

- [ ] 4.0.8 Update discrepancy-inventory.md
  - Mark all affected files as "Fixed (Batch)"
  - Document batch commit hash

- [ ] 4.0.9 Repeat for remaining bulk candidates
  - Process one bulk candidate at a time
  - Verify after each batch
  - Stop if any batch causes issues

**Acceptance**: All safe bulk change opportunities executed with verification, or marked as manual-only

### Task 4.1: Fix shared/ Package Imports
**Requirements**: US-5, TR-5

For each file in shared/ (in dependency order):

- [ ] 4.1.1 State the filename
  - Example: "Fixing: shared/types/api/contracts/user.schemas.ts"

- [ ] 4.1.2 List broken imports with categories
  - Example:
    ```
    Line 5: import { BaseError } from '../error-handling'
    Category: E (named export removed)
    ```

- [ ] 4.1.3 State corrected import with justification
  - Example:
    ```
    Line 5: import { createValidationError } from '../error-handling'
    Justification: Error handling migration replaced classes with factory functions
    ```
  - Reference architectural principles if applicable
  - Reference structural-ambiguities.md for documented migrations

- [ ] 4.1.4 Make the edit manually
  - Open file in editor
  - Change import statements
  - Update call sites if API changed
  - Save file

- [ ] 4.1.5 Verify fix
  ```bash
  npx tsc --noEmit -p shared/tsconfig.json | grep "filename.ts"
  ```

- [ ] 4.1.6 Check for cascade effects
  ```bash
  # Count total errors before and after
  npx tsc --noEmit -p shared/tsconfig.json 2>&1 | grep "error TS" | wc -l
  ```

- [ ] 4.1.7 Commit
  ```bash
  git add shared/path/to/file.ts
  git commit -m "fix(shared): resolve imports in filename.ts

  - [Category] Fix description
  - Architectural rationale: [if applicable]
  
  Errors reduced: X → Y in this file"
  ```

- [ ] 4.1.8 Repeat for all shared/ files

**Acceptance**: All shared/ package imports fixed and committed with architectural rationale where applicable

### Task 4.2: Fix server/ Package Imports
**Requirements**: US-5, TR-5

For each file in server/ (in dependency order):

- [ ] 4.2.1 State the filename
- [ ] 4.2.2 List broken imports with categories
- [ ] 4.2.3 State corrected import with justification
  - Reference architectural principles if applicable
  - Reference structural-ambiguities.md for documented migrations
- [ ] 4.2.4 Make the edit manually
- [ ] 4.2.5 Verify fix
  ```bash
  npx tsc --noEmit -p server/tsconfig.json | grep "filename.ts"
  ```
- [ ] 4.2.6 Check for cascade effects
- [ ] 4.2.7 Commit with architectural rationale if applicable
- [ ] 4.2.8 Repeat for all server/ files

**Acceptance**: All server/ package imports fixed and committed with architectural rationale where applicable

### Task 4.3: Fix client/ Package Imports
**Requirements**: US-5, TR-5

For each file in client/ (in dependency order):

- [ ] 4.3.1 State the filename
- [ ] 4.3.2 List broken imports with categories
- [ ] 4.3.3 State corrected import with justification
  - Reference architectural principles if applicable
  - Reference structural-ambiguities.md for documented migrations
  - Apply architectural decision matrix from CLIENT_LIB_CORE_FEATURES_ANALYSIS.md
  - Use best implementation from CLIENT_OVERLAP_ANALYSIS.md
- [ ] 4.3.4 Make the edit manually
- [ ] 4.3.5 Verify fix
  ```bash
  npx tsc --noEmit -p client/tsconfig.json | grep "filename.ts"
  ```
- [ ] 4.3.6 Check for cascade effects
- [ ] 4.3.7 Commit with architectural rationale if applicable
- [ ] 4.3.8 Repeat for all client/ files

**Acceptance**: All client/ package imports fixed and committed with architectural rationale where applicable

### Task 4.4: Handle Edge Cases
**Requirements**: US-5, TR-5

- [ ] 4.4.1 Flag unclear Category B replacements for human review
  - Document in discrepancy-inventory.md
  - Mark as "NEEDS REVIEW"
  - Provide context and options

- [ ] 4.4.2 Flag unclear Category E replacements for human review
  - Document in discrepancy-inventory.md
  - Mark as "NEEDS REVIEW"
  - Provide context and options

- [ ] 4.4.3 Break circular dependencies
  - Identify circular dependency chains
  - Extract shared interfaces to common modules
  - Refactor to remove circular references
  - Document in structural-ambiguities.md

**Acceptance**: All edge cases documented and resolved or flagged for review

---

## Phase 5: Validation & Error Delta Report

### Task 5.1: Capture Post-Fix Baseline
**Requirements**: US-6, TR-6

- [ ] 5.1.1 Run tsc on root package
  ```bash
  npx tsc --noEmit -p tsconfig.json 2>&1 | tee postfix_tsc_root.txt
  ```

- [ ] 5.1.2 Run tsc on client package
  ```bash
  npx tsc --noEmit -p client/tsconfig.json 2>&1 | tee postfix_tsc_client.txt
  ```

- [ ] 5.1.3 Run tsc on server package
  ```bash
  npx tsc --noEmit -p server/tsconfig.json 2>&1 | tee postfix_tsc_server.txt
  ```

- [ ] 5.1.4 Run tsc on shared package
  ```bash
  npx tsc --noEmit -p shared/tsconfig.json 2>&1 | tee postfix_tsc_shared.txt
  ```

**Acceptance**: All post-fix baseline files created

### Task 5.2: Analyze Error Delta
**Requirements**: US-6, TR-6

- [ ] 5.2.1 Count errors by category in post-fix files
  - Same categories as baseline analysis

- [ ] 5.2.2 Calculate delta for each category
  - Baseline count - Post-fix count = Delta

- [ ] 5.2.3 Re-run dependency analysis tools
  ```bash
  # Compare with baseline
  npx depcheck --json > postfix_depcheck.json
  npx madge --circular --extensions ts,tsx client/src/ > postfix_circular_client.txt
  npx madge --circular --extensions ts,tsx server/ > postfix_circular_server.txt
  npx madge --circular --extensions ts,tsx shared/ > postfix_circular_shared.txt
  npx ts-unused-exports tsconfig.json --excludePathsFromReport=".*\.test\.ts;.*\.spec\.ts" > postfix_unused_exports.txt
  
  # Generate diff reports
  diff baseline_circular_client.txt postfix_circular_client.txt > circular_deps_delta.txt
  diff baseline_unused_exports.txt postfix_unused_exports.txt > unused_exports_delta.txt
  ```

- [ ] 5.2.4 Identify files that gained errors
  ```bash
  # Compare baseline and post-fix for each file
  # List files where error count increased
  ```

- [ ] 5.2.5 Classify each error count change
  - Error disappears → Fix worked ✅
  - Error moves to another file → Transitive dependency exposed
  - Error count spikes in module → Newly visible pre-existing bugs
  - Zero-error file gains errors → **REGRESSION** (investigate)
  - Circular dependencies reduced (from madge diff)
  - Unused exports reduced (from ts-unused-exports diff)

- [ ] 5.2.6 Validate architectural improvements
  - Check if imports now follow architectural principles
  - Verify overlaps are resolved (reference structural-ambiguities.md)
  - Confirm best implementations are being used
  - Validate separation of concerns (infrastructure vs business logic vs UI)
  - Document architectural compliance improvements

- [ ] 5.2.7 Create error-delta.md
  - Summary table (baseline vs post-fix by package)
  - Regressions table (files that gained errors)
  - Newly visible bugs table (files now reachable by type checker)
  - Fixes applied table (by category)
  - Circular dependencies delta (from madge)
  - Unused exports delta (from ts-unused-exports)
  - Dependency health improvements (from depcheck)
  - Architectural improvements section:
    - Overlaps resolved
    - Architectural principles applied
    - Best implementations adopted
    - Separation of concerns improved

**Acceptance**: error-delta.md created with complete analysis including tool-generated metrics and architectural validation

### Task 5.3: Investigate Regressions
**Requirements**: US-6, TR-6

For each file that gained errors:

- [ ] 5.3.1 Determine if it's a regression or newly visible bug
  - Regression: Fix introduced new error
  - Newly visible: File was unreachable, now reachable, had pre-existing bugs

- [ ] 5.3.2 If regression, diagnose and fix
  - Identify which fix caused the regression
  - Determine correct fix
  - Apply fix and verify

- [ ] 5.3.3 If newly visible bug, document
  - Add to "Newly Visible Pre-existing Bugs" section of error-delta.md
  - Do NOT revert the fix that made it visible
  - These bugs should be fixed in a separate effort

**Acceptance**: All regressions fixed, newly visible bugs documented

### Task 5.4: Verify Regression Canaries
**Requirements**: US-6, TR-6

- [ ] 5.4.1 Check each canary file from baseline
  - Compare baseline error count (0) to post-fix error count
  - If post-fix > 0, it's a regression

- [ ] 5.4.2 Investigate any canary regressions
  - Determine which fix caused the regression
  - Diagnose and fix

- [ ] 5.4.3 Update error-delta.md with canary status
  - List all canaries
  - Mark status (clean / regression)

**Acceptance**: All canary regressions investigated and fixed

### Task 5.5: Run Integration Tests
**Requirements**: US-6, TR-6

- [ ] 5.5.1 Run full type check
  ```bash
  npm run type-check
  ```

- [ ] 5.5.2 Build all packages
  ```bash
  npm run build
  ```

- [ ] 5.5.3 Run test suite
  ```bash
  npm run test
  ```

- [ ] 5.5.4 Run integration tests
  ```bash
  npm run test:integration
  ```

- [ ] 5.5.5 Document any failures
  - Add to error-delta.md
  - Classify as regression or pre-existing

**Acceptance**: All integration tests pass or failures documented

---

## Final Deliverables

### Task 6.1: Create fix-root-cause.md
**Requirements**: US-2, TR-2

- [ ] 6.1.1 Document all config changes
  - Exact diff of each config file
  - Justification for each change

- [ ] 6.1.2 Document proof of fix
  - Test import that failed before, passes after
  - Before/after tsc output

- [ ] 6.1.3 Save as fix-root-cause.md

**Acceptance**: fix-root-cause.md created with config diffs and proof

### Task 6.2: Finalize discrepancy-inventory.md
**Requirements**: US-4, TR-4

- [ ] 6.2.1 Ensure all broken imports are listed
- [ ] 6.2.2 Ensure all have categories assigned
- [ ] 6.2.3 Ensure all have fixes documented
- [ ] 6.2.4 Mark all as "Verified Clean"

**Acceptance**: discrepancy-inventory.md complete with all imports fixed

### Task 6.3: Finalize structural-ambiguities.md
**Requirements**: US-3, US-7, TR-3

- [ ] 6.3.1 Ensure all duplicate pairs documented
- [ ] 6.3.2 Ensure canonical versions identified
- [ ] 6.3.3 Ensure migration rationale documented with architectural principles
  - Reference CLIENT_LIB_CORE_FEATURES_ANALYSIS.md decision matrix
  - Reference CLIENT_OVERLAP_ANALYSIS.md best implementations
  - Document architectural layer (infrastructure vs business logic vs UI)
- [ ] 6.3.4 Ensure importers updated
- [ ] 6.3.5 Document architectural improvements achieved
  - Overlaps resolved
  - Architectural principles applied
  - Separation of concerns improved
  - Best implementations adopted

**Acceptance**: structural-ambiguities.md complete with all duplicates resolved and architectural rationale documented

### Task 6.4: Finalize error-delta.md
**Requirements**: US-6, TR-6

- [ ] 6.4.1 Ensure summary tables complete
- [ ] 6.4.2 Ensure all error count changes classified
- [ ] 6.4.3 Ensure regressions investigated
- [ ] 6.4.4 Ensure newly visible bugs documented
- [ ] 6.4.5 Ensure architectural improvements documented
  - Overlaps resolved
  - Architectural principles applied
  - Best implementations adopted
  - Separation of concerns improved

**Acceptance**: error-delta.md complete with full analysis including architectural validation

---

### Task 6.5: Create Architectural Migration Summary
**Requirements**: US-3, US-7, TR-3

- [ ] 6.5.1 Create architectural-migration-summary.md
  - Document all architectural improvements made
  - List overlaps resolved (reference 16 critical overlaps from Phase 2)
  - Document architectural principles applied
  - List best implementations adopted
  - Document separation of concerns improvements
  - Reference CLIENT_LIB_CORE_FEATURES_ANALYSIS.md and CLIENT_OVERLAP_ANALYSIS.md

- [ ] 6.5.2 Create migration metrics
  - Number of overlaps resolved
  - Number of architectural misplacements corrected
  - Number of imports updated to follow architectural principles
  - Improvement in separation of concerns

- [ ] 6.5.3 Document remaining architectural debt
  - Overlaps not yet resolved
  - Architectural misplacements still present
  - Recommended next steps for full architectural compliance

**Acceptance**: architectural-migration-summary.md created with complete architectural analysis

---

## Success Criteria

- [ ] Module resolution errors reduced from ~1,200 to 0
- [ ] Total TypeScript errors reduced from 5,762 to <4,500
- [ ] Zero regressions in canary files
- [ ] All broken imports categorized with architectural rationale
- [ ] All duplicate modules documented with best implementations identified
- [ ] All 16 critical overlaps investigated and documented
- [ ] Architectural principles applied to import resolution
- [ ] Separation of concerns improved (infrastructure vs business logic vs UI)
- [ ] All fixes committed individually with architectural rationale where applicable
- [ ] All deliverables created (including architectural-migration-summary.md)
- [ ] Integration tests pass

## Notes

- **CRITICAL**: No automated scripts, codemods, or bulk replacements (except safe exceptions)
- Fix one file at a time, verify after each
- Respect dependency order (shared → server → client)
- Stop and investigate if error count increases unexpectedly
- Flag unclear cases for human review, don't guess
- Document everything in deliverables
- Apply architectural principles from CLIENT_LIB_CORE_FEATURES_ANALYSIS.md
- Use best implementations from CLIENT_OVERLAP_ANALYSIS.md
- Reference structural-ambiguities.md for documented migrations
- Validate architectural improvements in error-delta.md
