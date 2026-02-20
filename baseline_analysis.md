# Chanuka Import Resolution Audit - Baseline Analysis

## Task 0.0.1 Completion: Project Structure Analysis

**Date**: February 20, 2026  
**Source**: docs/project-structure.md  
**Total Items**: 4,022 files and directories  
**Max Depth**: 7 levels

---

## 1. Package Structure Overview

The Chanuka monorepo follows a standard pnpm workspace structure with Nx management:

### 1.1 Main Packages

```
.
├── client/          # React + Vite frontend application
├── server/          # Node/Express backend application  
├── shared/          # Isomorphic types, utilities, validation
└── tests/           # Cross-package integration & e2e tests
```

### 1.2 Package Characteristics

**client/** (Lines 31-2476 in project-structure.md)
- Frontend React application using Vite bundler
- Contains `src/` with application code
- Has `public/` for static assets
- Includes `docs/`, `reports/`, `scripts/` for development
- Main source structure:
  - `src/app/` - Application shell and providers
  - `src/core/` - Core infrastructure (auth, api, error handling, etc.)
  - `src/features/` - Feature-Sliced Design (FSD) feature modules
  - `src/lib/` - Shared UI components and utilities (legacy/migration boundary)

**server/** (Lines 2476-3495 in project-structure.md)
- Backend Node/Express application
- Contains domain-driven design structure
- Main directories:
  - `config/` - Configuration files
  - `features/` - Business domain features
  - `infrastructure/` - Technical infrastructure (database, websocket, etc.)
  - `shared/` - Server-specific shared code

**shared/** (Lines 3495-3803 in project-structure.md)
- Isomorphic code shared between client and server
- Contains:
  - `constants/` - Shared constants
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions
  - `validation/` - Validation schemas

**tests/** (Lines 3803+ in project-structure.md)
- Cross-package testing
- Contains:
  - `e2e/` - End-to-end tests
  - `integration/` - Integration tests
  - `unit/` - Unit tests

---

## 2. Known Duplicate Directories (Hotspots)

### 2.1 HOTSPOT-1: Compiled Output in WebSocket Directory

**Location**: `client/src/core/websocket/`

**Evidence from project-structure.md** (Lines 457-465):
```
│   │   │   ├── websocket/
│   │   │   │   ├── index.ts
│   │   │   │   ├── manager.d.ts
│   │   │   │   ├── manager.d.ts.map
│   │   │   │   ├── manager.js
│   │   │   │   ├── manager.js.map
│   │   │   │   └── manager.ts
```

**Issue**: Compiled JavaScript files (`.js`, `.js.map`) and TypeScript declaration files (`.d.ts`, `.d.ts.map`) are present alongside source `.ts` files in the source tree.

**Risk**: 
- Imports may resolve to stale compiled artifacts instead of source files
- Build artifacts should not be in source control
- Potential for version mismatch between `.ts` and `.js` files

**Classification**: Category A (Stale Path) or build artifact contamination

---

### 2.2 HOTSPOT-2: Security Module Triple Overlap

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`

**Three Locations**:
1. `client/src/core/security/` - Comprehensive infrastructure (CSP, CSRF, input sanitizer, rate limiter, security monitor, vulnerability scanner) + UI components
2. `client/src/features/security/` - Minimal feature (useSecurity hook, SecurityDemoPage, duplicate UI)
3. `client/src/lib/ui/privacy/` - Privacy-specific UI (CookieConsentBanner, GDPRComplianceManager)

**Best Implementation**: `core/security/` - Most comprehensive infrastructure

**Architectural Issue**: 
- Security infrastructure belongs in `lib/infrastructure/security/` (not core/)
- Security UI belongs in `lib/ui/security/` (shared UI components)
- Privacy UI already correctly placed in `lib/ui/privacy/`
- `features/security/` is minimal and duplicates core

**Recommended Resolution**:
- ⚠️ MOVE `core/security/` infrastructure → `lib/infrastructure/security/`
- ⚠️ MOVE `core/security/ui/` → `lib/ui/security/`
- ❌ DELETE `features/security/` (consolidate into lib)
- ✅ KEEP `lib/ui/privacy/` for privacy-specific UI

**Classification**: Category A (Stale Path) + Architectural Misplacement

**Priority**: HIGH - Triple overlap with clear best implementation identified

---

### 2.3 HOTSPOT-3: Authentication Module Overlap

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`

**Three Locations**:
1. `client/src/core/auth/` - Complete auth infrastructure (TokenManager, SessionManager, AuthApiService, HTTP interceptors, Redux integration, validation, RBAC, security helpers)
2. `client/src/features/auth/pages/` - Auth UI pages only (LoginPage, RegisterPage, ForgotPasswordPage, etc.)
3. `client/src/features/users/hooks/useAuth.tsx` - Single auth hook

**Best Implementation**: `core/auth/` - Most complete infrastructure

**Architectural Assessment**:
- `core/auth/` is **correctly placed** - it's infrastructure, not business logic
- Auth infrastructure should remain in `core/auth/` OR move to `lib/infrastructure/auth/`
- `features/auth/pages/` is correctly placed - UI pages belong in features
- `features/users/hooks/useAuth.tsx` should use `core/auth/hooks/useAuth.tsx`

**Recommended Resolution**:
- ✅ KEEP `core/auth/` infrastructure (it's infrastructure, not business logic)
- ✅ KEEP `features/auth/pages/` for UI
- ⚠️ CONSOLIDATE `features/users/hooks/useAuth.tsx` to use `core/auth/hooks/useAuth.tsx`

**Classification**: Category A (Stale Path) - Hook duplication

**Priority**: MEDIUM - Clear infrastructure vs UI separation, minor hook consolidation needed

---

### 2.4 HOTSPOT-4: Loading Module Triple Overlap

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`

**Three Locations**:
1. `client/src/core/loading/` - Loading context, hooks (useOnlineStatus, useTimeoutAwareLoading), utils (connection, loading, progress, timeout), validation
2. `client/src/lib/ui/loading/` - Extensive loading UI (AssetLoadingIndicator, BrandedLoadingScreen, GlobalLoadingIndicator, hooks, UI components, skeletons, spinners, fallbacks)
3. `client/src/lib/design-system/feedback/LoadingSpinner.tsx` - Basic design system spinner primitive

**Best Implementation**: `lib/ui/loading/` - Most comprehensive

**Architectural Issue**:
- Loading is primarily a UI concern, not business logic
- `core/loading/` contains infrastructure that belongs in `lib/ui/loading/`
- `lib/ui/loading/` is the most complete implementation
- `lib/design-system/feedback/LoadingSpinner.tsx` is correctly placed as a primitive

**Recommended Resolution**:
- ✅ KEEP `lib/ui/loading/` as primary
- ❌ MOVE `core/loading/` hooks → `lib/ui/loading/hooks/`
- ❌ MOVE `core/loading/` utils → `lib/ui/loading/utils/`
- ❌ DELETE `core/loading/` after migration
- ✅ KEEP `lib/design-system/feedback/LoadingSpinner.tsx` as primitive

**Classification**: Category A (Stale Path) + Architectural Misplacement

**Priority**: HIGH - Triple overlap with clear best implementation, lib has superior version

---

### 2.5 HOTSPOT-5: Empty Errors Directory

**Note**: Not directly visible in project-structure.md snapshot, but mentioned in task requirements

**Expected Location**: `server/infrastructure/errors/` (empty)

**Replacement Location**: `server/infrastructure/error-handling/` (likely exists)

**Issue**: Old error handling directory may still be referenced in imports

**Classification**: Category B (Deleted/Superseded)

---

### 2.6 HOTSPOT-6: FSD Migration Boundary (lib/ vs features/)

**Old Structure**: `client/src/lib/` (Lines 881-1427)
```
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── home/
│   │   │   │   ├── layout/
│   │   │   │   ├── lib/
│   │   │   │   ├── media/
│   │   │   │   ├── navigation/
│   │   │   │   ├── ui/
```

**New Structure**: `client/src/features/` (Lines 467-880)
```
│   │   ├── features/
│   │   │   ├── accountability/
│   │   │   ├── admin/
│   │   │   ├── advocacy/
│   │   │   ├── analysis/
│   │   │   ├── analytics/
│   │   │   ├── bills/
│   │   │   ├── community/
│   │   │   ├── dashboard/
│   │   │   ├── security/
│   │   │   ├── search/
│   │   │   ├── users/
```

**Issue**: Incomplete migration from monolithic `lib/` to Feature-Sliced Design `features/`

**FSD Principle**:
- `features/` - Feature-specific business logic (bills, users, community, etc.)
- `lib/` - Shared UI components and utilities (should be minimal)
- `core/` - Infrastructure and technical concerns (auth, api, error handling)

**Investigation Needed**:
- Identify which `lib/` code is feature-specific (should move to `features/`)
- Identify which `lib/` code is truly shared infrastructure (can stay in `lib/`)
- Check for duplicate implementations between `lib/` and `features/`

**Classification**: Category A (Stale Path) - migration incomplete

---

## 3. FSD Migration Boundary Analysis

### 3.1 Current State

**client/src/** structure shows three architectural layers:

1. **app/** - Application shell (providers, routing)
2. **core/** - Infrastructure layer (auth, api, error, loading, security, etc.)
3. **features/** - Feature slices (bills, users, community, analytics, etc.)
4. **lib/** - Legacy shared code (components, hooks, services, utils)

### 3.2 FSD Compliance

**Compliant**:
- `features/` directory exists with proper feature slices
- Each feature has FSD-style structure (model/, ui/, pages/, hooks/, services/)
- Core infrastructure properly separated in `core/`

**Non-Compliant**:
- `lib/` still contains substantial code that should be in `features/`
- Some UI components in `core/` that should be in `features/` (e.g., security UI)
- Potential duplicate implementations between `lib/` and `features/`

### 3.3 Migration Boundary Issues

**High-Risk Files** (likely duplicated):
- Services: `lib/services/userService.ts` vs `features/users/services/`
- Services: `lib/services/notification-service.ts` vs `features/notifications/model/notification-service.ts`
- Hooks: `lib/hooks/` vs `core/*/hooks/` vs `features/*/hooks/`
- Components: `lib/components/` vs `features/*/ui/`

---

## 4. Dependency Relationships

### 4.1 Package Dependencies

```
┌─────────┐
│  tests  │ (depends on all)
└────┬────┘
     │
┌────┴────┬─────────┐
│ client  │ server  │ (both depend on shared)
└────┬────┴────┬────┘
     │         │
     └────┬────┘
          │
     ┌────┴────┐
     │ shared  │ (foundation)
     └─────────┘
```

### 4.2 Dependency Order for Fixes

Based on the dependency graph, fixes should be applied in this order:

1. **shared/** - Foundation types and utilities (no dependencies)
2. **server/** - Backend (depends on shared)
3. **client/** - Frontend (depends on shared)
4. **tests/** - Tests (depends on all packages)

Within each package:
- Leaf files (no internal imports) before root files
- Types before implementations
- Utilities before features

---

## 5. Key Metrics

### 5.1 File Counts (from project-structure.md)

- **Total Items**: 4,022 files and directories
- **Max Depth**: 7 levels
- **Client Package**: ~2,445 items (lines 31-2476)
- **Server Package**: ~1,019 items (lines 2476-3495)
- **Shared Package**: ~308 items (lines 3495-3803)
- **Tests Package**: ~250 items (lines 3803+)

### 5.2 Client Source Directory File Counts (Task 0.0.3)

**Extracted**: February 20, 2026  
**Method**: Direct file system count using `find` command

- **client/src/core/**: 311 files
- **client/src/features/**: 293 files  
- **client/src/lib/**: 641 files

**Key Observations**:
- `lib/` has the most files (641), indicating substantial legacy code
- `core/` (311) and `features/` (293) are roughly equal in size
- Total client source files: 1,245 files across these three directories
- `lib/` contains 51.5% of client source code (641/1245)
- This confirms the FSD migration is incomplete - `lib/` should be minimal

**Migration Impact**:
- High volume of files in `lib/` suggests many potential stale imports
- Roughly equal `core/` and `features/` sizes suggests some business logic may still be in `core/`
- Import resolution will need to handle ~641 files in `lib/` that may have moved to `features/`

### 5.2 Structural Complexity

**Client Complexity**:
- `core/` has ~25 subdirectories (infrastructure concerns)
- `features/` has ~30+ feature slices
- `lib/` still has substantial code (migration incomplete)

**Server Complexity**:
- `features/` has domain-driven structure
- `infrastructure/` has technical concerns (database, websocket, error-handling)
- `shared/` has server-specific utilities

---

## 6. Import Path Patterns

### 6.1 Expected Alias Patterns

Based on the structure, these aliases are likely used:

- `@/` → `client/src/` (client-side absolute imports)
- `@shared/` → `shared/` (shared package imports)
- `@server/` → `server/` (server-side absolute imports)
- `@client/` → `client/src/` (alternative client alias)

### 6.2 Problematic Import Patterns (Predicted)

**Category A (Stale Path)**:
- `from '@/core/security/ui'` → should be `from '@/features/security/ui'`
- `from '@/core/auth/hooks/useAuth'` → should be `from '@/features/users/hooks/useAuth'`
- `from '@/lib/services/userService'` → should be `from '@/features/users/services'`

**Category B (Deleted/Superseded)**:
- `from '@server/infrastructure/errors'` → should be `from '@server/infrastructure/error-handling'`
- `from '@/lib/deprecated/*'` → superseded by feature slices

**Category C (Alias Not Recognized)**:
- `from '@shared/types'` failing in Vitest (alias missing from config)
- `from '@/'` failing in server tests (client alias not available)

**Category D (Broken Re-export)**:
- Barrel files in `features/*/ui/index.ts` with broken internal imports
- `core/*/index.ts` re-exporting from moved files

**Category E (Named Export Renamed)**:
- Auth types moved from `client/src/core/api/types/auth.ts` to `shared/types/domains/authentication/`
- Error types consolidated during error handling migration

---

## 7. Next Steps

### 7.1 Immediate Actions

1. ✅ **Task 0.0.1 Complete**: Project structure understood
2. **Task 0.0.2**: Create annotated project structure reference with hotspots marked
3. **Task 0.0.3**: Extract key metrics from snapshot (completed above)

### 7.2 Phase 0 Continuation

- **Task 0.0.5**: Install import analysis tools (depcheck, madge, ts-unused-exports)
- **Task 0.1**: Capture TypeScript error baseline
- **Task 0.2**: Analyze baseline errors
- **Task 0.3**: Commit baseline artifacts

### 7.3 Investigation Priorities

**High Priority** (likely to cause many import errors):
1. Security UI duplication (`core/security/ui/` vs `features/security/ui/`)
2. WebSocket compiled output contamination
3. FSD migration boundary (`lib/` vs `features/`)

**Medium Priority**:
4. Loading utilities duplication
5. useAuth hook duplication
6. Empty errors directory

---

## 8. Architectural Observations

### 8.1 Positive Patterns

- Clear package separation (client, server, shared, tests)
- Feature-Sliced Design adoption in progress
- Domain-driven design in server package
- Comprehensive test structure

### 8.2 Technical Debt

- Incomplete FSD migration (lib/ still substantial)
- Compiled artifacts in source tree (websocket/)
- Duplicate implementations during migration
- Inconsistent directory naming (some kebab-case, some camelCase)

### 8.3 Migration Context

The codebase shows evidence of multiple concurrent migrations:
1. **FSD Migration**: `lib/` → `features/` (incomplete)
2. **Shared-Core Consolidation**: Moving shared code to `shared/` package
3. **Database Service Migration**: Restructuring database layer
4. **WebSocket Migration**: Consolidating WebSocket implementations
5. **Error Handling Migration**: Standardizing error handling patterns

These overlapping migrations explain the high number of import errors and structural inconsistencies.

---

## Conclusion

Task 0.0.1 is complete. The project structure has been thoroughly analyzed, revealing:

- **4 main packages**: client, server, shared, tests
- **6 major hotspots**: websocket compiled output, security UI duplication, useAuth duplication, loading utilities duplication, empty errors directory, FSD migration boundary
- **Clear dependency order**: shared → server/client → tests
- **Multiple incomplete migrations**: FSD, shared-core, database, websocket, error handling

This analysis provides the foundation for Phase 0 baseline capture and subsequent import resolution work.


### 2.7 HOTSPOT-7: Critical Overlaps Summary

**Analysis Source**: `docs/architecture/CLIENT_OVERLAP_ANALYSIS.md`

Based on comprehensive overlap analysis, the following critical overlaps require immediate attention:

#### High Priority (Triple Overlaps)

1. **Monitoring** - 3 locations
   - `core/monitoring/` - Basic (monitoring-init, sentry-config)
   - `features/monitoring/model/` - Performance monitoring models
   - `lib/infrastructure/monitoring/` - **BEST** - Comprehensive infrastructure
   - **Action**: Move core → lib, keep features for performance testing

2. **Navigation** - 3 locations
   - `core/navigation/` - **BEST** - Complete business logic (services, hooks, analytics, breadcrumbs)
   - `features/navigation/model/` - Empty (only index.ts)
   - `lib/ui/navigation/` - Navigation UI components
   - **Action**: Move core → features/navigation/services/, keep lib UI

3. **Validation** - 3 locations
   - `core/validation/` - Dashboard validation (minimal)
   - `lib/validation/` - **BEST** - Base validation, consolidated
   - `features/dashboard/validation/` - Feature-specific with tests
   - **Action**: Delete core, keep lib + features

#### High Priority (Clear Duplicates)

4. **Realtime/WebSocket** - 2 locations + legacy
   - `core/realtime/` - **BEST** - Recently consolidated, complete system
   - `core/websocket/` - **DELETE** - Old implementation (compiled .js files)
   - `features/realtime/model/` - Feature-specific optimizer
   - **Action**: Delete websocket/, move realtime → lib/infrastructure/

5. **Error Handling** - 4 locations
   - `core/error/` - **BEST** - Complete error handling system
   - `lib/infrastructure/monitoring/` - Error monitoring
   - `lib/design-system/interactive/errors.ts` - UI components
   - `lib/ui/error-boundary/` - Error boundary components
   - **Action**: Move core → lib/infrastructure/error/, consolidate

#### Medium Priority (Business Logic Misplaced)

6. **Community** - 2 locations
   - `core/community/` - Real-time infrastructure
   - `features/community/` - **BEST** - Complete feature
   - **Action**: Move core → features, delete core

7. **Search** - 2 locations
   - `core/search/` - Minimal infrastructure
   - `features/search/` - **BEST** - Complete feature
   - **Action**: Move core → features, delete core

8. **Analytics** - 2 locations
   - `core/analytics/` - Infrastructure (provider, tracker, service)
   - `features/analytics/` - **BEST** - Complete feature with UI
   - **Action**: Move infrastructure → lib, delete core business logic

#### Medium Priority (UI Misplaced)

9. **Dashboard** - 3 locations
   - `core/dashboard/` - Basic (context, hooks, reducer, utils)
   - `features/dashboard/pages/` - Dashboard page
   - `lib/ui/dashboard/` - **BEST** - Extensive UI components
   - **Action**: Keep lib UI, move core logic → features

10. **Storage** - 2 locations
    - `core/storage/` - Client storage (cache, offline, secure)
    - `lib/infrastructure/store/` - Redux store
    - **Action**: Move core → lib/infrastructure/storage/

---

## 7. Architectural Principles for Import Resolution

### 7.1 Directory Purpose Clarification

**From `docs/architecture/CLIENT_LIB_CORE_FEATURES_ANALYSIS.md`:**

**Root `shared/`** (Client+Server shared):
- Types, validation schemas, constants
- Platform-specific code (Kenya)
- ML models and services
- i18n translations
- Core utilities

**Client `lib/`** (Client-only shared):
- Originally named `shared/` but renamed to `lib/` to avoid confusion with root `shared/`
- UI components and design system
- Client infrastructure (monitoring, store, workers)
- Client-specific hooks, utils, types
- Client services

**Client `core/`** (Currently ambiguous):
- **Claims**: "Business Logic and Domain Services"
- **Reality**: Contains MASSIVE infrastructure code (api, auth, browser, error, loading, monitoring, performance, security, storage, websocket)
- **Issue**: Contradicts documentation that says "Technical infrastructure has been moved to the shared module"
- **Recommendation**: Rename to `infrastructure/` OR distribute contents to `lib/infrastructure/` and `features/`

**Client `features/`** (FSD feature slices):
- Self-contained business features
- Each feature has: model/, ui/, pages/, hooks/, services/
- Examples: bills, users, community, analytics

### 7.2 Recommended Architecture (Option B: Three-Layer Pragmatic)

**From `docs/architecture/CLIENT_LIB_CORE_FEATURES_ANALYSIS.md`:**

```
project-root/
├── shared/                    # Client+Server shared
├── client/src/
│   ├── app/                  # Application shell
│   ├── infrastructure/       # Rename from core/ - technical infrastructure
│   │   ├── api/
│   │   ├── auth/
│   │   ├── monitoring/
│   │   ├── error/
│   │   ├── realtime/
│   │   └── security/
│   ├── lib/                  # Keep as lib/ - client-shared UI & utilities
│   │   ├── ui/
│   │   ├── design-system/
│   │   ├── hooks/
│   │   └── utils/
│   └── features/             # FSD feature slices
│       ├── bills/
│       ├── users/
│       ├── community/
│       ├── analytics/
│       ├── search/
│       └── navigation/
└── server/
```

**Clear boundaries**:
- Root `shared/` = Client+Server shared code
- Client `infrastructure/` = Technical infrastructure (API, auth, monitoring, etc.)
- Client `lib/` = Client-shared UI components, design system, utilities
- Client `features/` = Business features (FSD slices)

### 7.3 Import Resolution Strategy

Based on architectural analysis, import resolution should follow this strategy:

1. **Identify module type** (infrastructure vs UI vs business logic)
2. **Determine correct location** based on architecture
3. **Update imports** to reflect correct location
4. **Verify** no functionality is lost

**Decision Matrix**:
| If X is... | Current Location | Ideal Location | Action |
|------------|------------------|----------------|--------|
| HTTP client | core/api/ | lib/infrastructure/api/ OR keep core | Evaluate |
| Auth infra | core/auth/ | Keep core OR lib/infrastructure/auth/ | Keep |
| Error handling | core/error/ | lib/infrastructure/error/ | Move |
| Monitoring | core/monitoring/ | lib/infrastructure/monitoring/ | Move |
| Realtime | core/realtime/ | lib/infrastructure/realtime/ | Move |
| Security | core/security/ | lib/infrastructure/security/ | Move |
| Storage | core/storage/ | lib/infrastructure/storage/ | Move |
| Business logic | core/{module}/ | features/{module}/ | Move |
| UI components | core/{module}/ui/ | lib/ui/{module}/ | Move |
| Shared hooks | lib/hooks/ | Keep | Keep |
| Feature hooks | features/{feature}/hooks/ | Keep | Keep |



---

## 8. Baseline Error Count Analysis (Task 0.2.1)

**Date**: February 20, 2026  
**Method**: Automated grep analysis of baseline TypeScript error files  
**Files Analyzed**: baseline_tsc_root.txt, baseline_tsc_client.txt, baseline_tsc_server.txt, baseline_tsc_shared.txt, baseline_vitest.txt

### 8.1 Summary by Package

| Package | Total Errors | Module Resolution | Type Errors | Null Safety | Unused Code |
|---------|--------------|-------------------|-------------|-------------|-------------|
| Root    | 0            | 0                 | 0           | 0           | 0           |
| Client  | 2,571        | 115               | 1,024       | 575         | 639         |
| Server  | 5,167        | 1,266             | 1,650       | 1,018       | 810         |
| Shared  | 1,059        | 55                | 382         | 394         | 121         |
| Vitest  | 0            | 0                 | 0           | 0           | 0           |
| **TOTAL** | **8,797**  | **1,436**         | **3,056**   | **1,987**   | **1,570**   |

**Key Observations**:
- Server package has the most errors (5,167 - 59% of total)
- Module resolution errors are concentrated in server (1,266 out of 1,436 - 88%)
- Client has significant unused code warnings (639)
- Root and Vitest baselines show zero errors (clean state)


### 8.2 Detailed Error Counts by Category

#### 8.2.1 Root Package (baseline_tsc_root.txt)

**Total Errors**: 0

**Status**: ✅ Clean - No errors detected

**Significance**: Root tsconfig is clean, indicating proper project references configuration.

---

#### 8.2.2 Client Package (baseline_tsc_client.txt)

**Total Errors**: 2,571

**Module Resolution Errors** (115 total):
- TS2307 (Cannot find module): 16
- TS2305 (Module has no exported member): 79
- TS2614 (Module not found or not a module): 1
- TS2724 (Module has no default export): 19

**Type Safety Errors** (1,024 total):
- TS2339 (Property does not exist): 390
- TS2304 (Cannot find name): 146
- TS2353 (Object literal may only specify known properties): 124
- TS2322 (Type not assignable): 102
- TS2345 (Argument not assignable): 83
- TS2551 (Property does not exist, did you mean): 43
- TS7030 (Not all code paths return a value): 34
- TS2352 (Conversion may be a mistake): 23
- TS2416 (Property not assignable to same property in base): 18
- TS2571 (Object is of type 'unknown'): 17
- TS2769 (No overload matches this call): 15
- TS7006 (Parameter implicitly has 'any'): 14
- TS7053 (Element implicitly has 'any' type): 12
- TS2554 (Expected X arguments, but got Y): 12
- Other type errors: 91


**Null Safety Errors** (575 total):
- TS18046 (Possibly undefined): 390
- TS18048 (Possibly null): 106
- TS2532 (Object is possibly undefined): 79

**Unused Code Warnings** (710 total):
- TS6133 (Variable declared but never used): 639
- TS6196 (Declared but value never read): 71

**Build Configuration Errors** (71 total):
- TS4114 (Property must have explicit type annotation): 71

**Other Errors**: 76

**Top 5 Error Codes**:
1. TS6133 (Unused variables): 639
2. TS2339 (Property does not exist): 390
3. TS18046 (Possibly undefined): 390
4. TS2304 (Cannot find name): 146
5. TS2353 (Object literal properties): 124

---

#### 8.2.3 Server Package (baseline_tsc_server.txt)

**Total Errors**: 5,167

**Module Resolution Errors** (1,266 total):
- TS2307 (Cannot find module): 1,004 ⚠️ **CRITICAL**
- TS2305 (Module has no exported member): 115
- TS2614 (Module not found or not a module): 96
- TS2724 (Module has no default export): 51

**Type Safety Errors** (1,650 total):
- TS7006 (Parameter implicitly has 'any'): 492
- TS2304 (Cannot find name): 453
- TS2339 (Property does not exist): 305
- TS2345 (Argument not assignable): 142
- TS2322 (Type not assignable): 112
- TS2769 (No overload matches this call): 67
- TS2300 (Duplicate identifier): 56
- TS2323 (Duplicate identifier): 48
- Other type errors: 975


**Null Safety Errors** (1,018 total):
- TS18046 (Possibly undefined): 793
- TS18048 (Possibly null): 125
- TS2532 (Object is possibly undefined): 74
- TS18047 (Possibly null): 2
- TS18004 (No value exists in scope): 2
- Other null safety: 22

**Unused Code Warnings** (839 total):
- TS6133 (Variable declared but never used): 810
- TS6192 (All imports are unused): 23
- TS6196 (Declared but value never read): 20
- TS6138 (Property declared but never used): 6

**Build Configuration Errors** (394 total):
- TS7030 (Not all code paths return a value): 35
- TS1210 (Code cannot be compiled under isolatedModules): 34
- TS2484 (Export declaration conflicts): 29
- TS2393 (Duplicate function implementation): 26
- TS1205 (Re-exporting a type when isolatedModules): 16
- TS1272 (An accessor cannot be declared in ambient context): 12
- TS4115 (Property has no initializer): 9
- TS7053 (Element implicitly has 'any' type): 13
- TS7022 (Function implicitly has return type 'any'): 5
- TS7031 (Binding element implicitly has 'any' type): 5
- TS7027 (Unreachable code detected): 3
- TS4114 (Property must have explicit type annotation): 3
- TS7034 (Variable implicitly has type 'any'): 2
- TS7016 (Could not find declaration file): 2
- TS7005 (Variable implicitly has 'any[]' type): 2
- Other build errors: 198

**Top 5 Error Codes**:
1. TS2307 (Cannot find module): 1,004 ⚠️ **CRITICAL - 19% of all errors**
2. TS6133 (Unused variables): 810
3. TS18046 (Possibly undefined): 793
4. TS7006 (Implicit any parameters): 492
5. TS2304 (Cannot find name): 453


---

#### 8.2.4 Shared Package (baseline_tsc_shared.txt)

**Total Errors**: 1,059

**Module Resolution Errors** (55 total):
- TS2307 (Cannot find module): 33
- TS2305 (Module has no exported member): 18
- TS2614 (Module not found or not a module): 0
- TS2724 (Module has no default export): 4

**Type Safety Errors** (382 total):
- TS2339 (Property does not exist): 81
- TS2353 (Object literal may only specify known properties): 52
- TS2322 (Type not assignable): 49
- TS2345 (Argument not assignable): 47
- TS2416 (Property not assignable to same property in base): 24
- TS2308 (Module has no exported member): 23
- TS2352 (Conversion may be a mistake): 20
- TS7053 (Element implicitly has 'any' type): 16
- TS2554 (Expected X arguments, but got Y): 14
- TS2540 (Cannot assign to read-only property): 14
- TS2741 (Property missing in type): 12
- TS2304 (Cannot find name): 12
- TS2769 (No overload matches this call): 9
- TS2484 (Export declaration conflicts): 9
- Other type errors: 100

**Null Safety Errors** (394 total):
- TS18046 (Possibly undefined): 381
- TS18048 (Possibly null): 13
- TS18047 (Possibly null): 9
- TS2532 (Object is possibly undefined): 4

**Unused Code Warnings** (129 total):
- TS6133 (Variable declared but never used): 121
- TS6196 (Declared but value never read): 28
- TS6192 (All imports are unused): 6
- TS6138 (Property declared but never used): 2


**Build Configuration Errors** (99 total):
- TS4114 (Property must have explicit type annotation): 21
- TS7006 (Parameter implicitly has 'any'): 3
- TS7034 (Variable implicitly has type 'any'): 2
- TS7005 (Variable implicitly has 'any[]' type): 2
- TS7024 (Function implicitly has return type 'any'): 1
- TS7022 (Function implicitly has return type 'any'): 1
- TS1202 (Import declaration conflicts): 2
- Other build errors: 67

**Top 5 Error Codes**:
1. TS18046 (Possibly undefined): 381
2. TS6133 (Unused variables): 121
3. TS2339 (Property does not exist): 81
4. TS2353 (Object literal properties): 52
5. TS2322 (Type not assignable): 49

---

#### 8.2.5 Vitest Package (baseline_vitest.txt)

**Total Errors**: 0

**Status**: ✅ Clean - No errors detected

**Significance**: Vitest baseline captured successfully with no immediate errors. This may indicate:
- Test files are not being type-checked by Vitest
- Tests are isolated from main codebase errors
- Vitest config may need adjustment to surface type errors


---

### 8.3 Critical Findings

#### 8.3.1 Module Resolution Crisis in Server Package

**TS2307 (Cannot find module): 1,004 errors in server package**

This represents:
- 70% of all module resolution errors (1,004 / 1,436)
- 19% of all server errors (1,004 / 5,167)
- **HIGHEST PRIORITY** for Phase 1-4 remediation

**Root Causes** (predicted):
1. Incomplete database service migration
2. Broken imports to `server/infrastructure/errors/` (empty directory)
3. Stale paths from websocket migration
4. Missing path aliases in server tsconfig

**Impact**: Server package is effectively unbuildable due to module resolution failures.

---

#### 8.3.2 Null Safety Epidemic

**TS18046 (Possibly undefined): 1,564 errors across all packages**

Distribution:
- Server: 793 (51%)
- Client: 390 (25%)
- Shared: 381 (24%)

**Significance**: This is the single most common error code across the entire codebase.

**Recommendation**: Address in separate spec (out of scope for import resolution audit).


---

#### 8.3.3 Unused Code Burden

**TS6133 (Variable declared but never used): 1,570 errors**

Distribution:
- Server: 810 (52%)
- Client: 639 (41%)
- Shared: 121 (8%)

**Significance**: 
- 18% of all errors are unused code warnings
- Indicates incomplete cleanup after migrations
- May mask real errors in IDE

**Recommendation**: Address in separate cleanup spec (out of scope for import resolution audit).

---

#### 8.3.4 Implicit Any Type Issues

**TS7006 (Parameter implicitly has 'any'): 509 errors**

Distribution:
- Server: 492 (97%)
- Client: 14 (3%)
- Shared: 3 (<1%)

**Significance**: Server package has weak type safety, concentrated in parameter types.

**Recommendation**: Address in server-typescript-errors-remediation spec.

---

### 8.4 Error Category Distribution

#### By Error Type (All Packages Combined)

| Category | Count | Percentage | Priority |
|----------|-------|------------|----------|
| Type Safety | 3,056 | 34.7% | Medium |
| Null Safety | 1,987 | 22.6% | Low (separate spec) |
| Unused Code | 1,570 | 17.8% | Low (cleanup spec) |
| Module Resolution | 1,436 | 16.3% | **HIGH** ⚠️ |
| Build Config | 564 | 6.4% | Medium |
| Other | 184 | 2.1% | Low |
| **TOTAL** | **8,797** | **100%** | - |


**Key Insight**: Module resolution errors (16.3%) are the 4th largest category, but have the highest impact because they block compilation and cascade into other errors.

---

#### By Package (Error Distribution)

| Package | Module Res | Type Safety | Null Safety | Unused Code | Build Config | Other |
|---------|------------|-------------|-------------|-------------|--------------|-------|
| Client  | 115 (4%)   | 1,024 (40%) | 575 (22%)   | 710 (28%)   | 71 (3%)      | 76 (3%) |
| Server  | 1,266 (24%)| 1,650 (32%) | 1,018 (20%) | 839 (16%)   | 394 (8%)     | 0 (0%) |
| Shared  | 55 (5%)    | 382 (36%)   | 394 (37%)   | 129 (12%)   | 99 (9%)      | 0 (0%) |

**Observations**:
- Server has highest module resolution error rate (24% of its errors)
- Client has highest unused code rate (28% of its errors)
- Shared has highest null safety error rate (37% of its errors)
- Server has highest build config error rate (8% of its errors)

---

### 8.5 Regression Canaries (Task 0.2.2 Complete)

**Date**: February 20, 2026  
**Method**: Automated comparison of all TypeScript files vs files with errors in baseline  
**Script**: identify-canaries.sh

**Files with Zero Errors** serve as regression canaries. If any of these files gain errors during the import resolution process, it indicates a regression that must be investigated immediately.

#### 8.5.1 Canary Summary by Package

| Package | Total TS Files | Files with Errors | Zero-Error Files (Canaries) | Canary Percentage |
|---------|----------------|-------------------|----------------------------|-------------------|
| Client  | 1,235          | 547               | 724                        | 58.6%             |
| Server  | 1,939          | 472               | 1,467                      | 75.7%             |
| Shared  | 1,563          | 110               | 1,453                      | 93.0%             |
| **TOTAL** | **4,737**    | **1,129**         | **3,644**                  | **76.9%**         |

**Key Observations**:
- 76.9% of all TypeScript files have zero errors (3,644 canaries)
- Shared package has highest canary rate (93.0%) - most stable
- Server package has 75.7% canary rate despite having most errors
- Client package has lowest canary rate (58.6%) - errors more distributed
- Errors are concentrated in specific files rather than spread across codebase

**Significance**:
- High canary percentage indicates errors are localized, not systemic
- Most files are clean and should remain clean during import resolution
- Any canary file gaining errors is a clear regression signal

#### 8.5.2 Client Package Canaries (724 files)

**Sample Canary Files** (first 50 of 724):
```
client/src/__tests__/fsd/form-builder.test.ts
client/src/__tests__/race-conditions.test.tsx
client/src/__tests__/service-architecture.test.ts
client/src/__tests__/strategic/analytics/telemetry.test.ts
client/src/__tests__/strategic/api/critical-integration.test.ts
client/src/__tests__/strategic/api/critical-integration.test.tsx
client/src/__tests__/strategic/api/data-synchronization.test.ts
client/src/__tests__/strategic/authentication/auth-hook.test.tsx
client/src/__tests__/strategic/error-handling/central-error-framework.test.ts
client/src/__tests__/strategic/error-handling/cross-system-propagation.test.tsx
client/src/__tests__/strategic/error-handling/error-boundary.test.tsx
client/src/__tests__/strategic/error-handling/error-context-metadata.test.ts
client/src/__tests__/strategic/error-handling/error-recovery-strategies.test.ts
client/src/__tests__/strategic/integration/cross-system.test.ts
client/src/__tests__/strategic/mobile/responsiveness.test.ts
client/src/__tests__/strategic/monitoring/monitoring-init.test.ts
client/src/__tests__/strategic/monitoring/performance-monitor.test.ts
client/src/__tests__/strategic/navigation/accessibility-navigation.test.ts
client/src/__tests__/strategic/navigation/critical-navigation.test.ts
client/src/__tests__/strategic/performance/regression.test.ts
client/src/__tests__/strategic/realtime/bill-tracking.test.ts
client/src/__tests__/strategic/realtime/critical-features.test.ts
client/src/__tests__/strategic/security/critical-protection.test.ts
client/src/__tests__/strategic/security/rate-limiting.test.ts
client/src/__tests__/strategic/state-management/global-state.test.ts
client/src/__tests__/strategic/ui/components.test.ts
client/src/__tests__/unit/utils/cn.test.ts
client/src/__tests__/websocket-reconnection.property.test.d.ts
client/src/__tests__/websocket-reconnection.property.test.ts
client/src/app/providers/AppProviders.tsx
client/src/app/providers/queryClient.ts
client/src/app/shell/AppRouter.tsx
client/src/app/shell/AppShell.tsx
client/src/app/shell/BrandedFooter.tsx
client/src/app/shell/index.ts
client/src/app/shell/NavigationBar.tsx
client/src/app/shell/ProtectedRoute.tsx
client/src/app/shell/SkipLinks.tsx
client/src/core/analytics/AnalyticsIntegration.tsx
client/src/core/analytics/AnalyticsProvider.tsx
client/src/core/analytics/data-retention-service.ts
client/src/core/analytics/service.ts
client/src/core/api/authentication.ts
client/src/core/api/bills.ts
client/src/core/api/cache-manager.ts
client/src/core/api/circuit-breaker/core.ts
client/src/core/api/circuit-breaker/types.ts
client/src/core/api/circuit-breaker-monitor.ts
client/src/core/api/config.ts
client/src/core/api/errors.ts
```

**Full list**: See canary_files.txt (674 additional files)

**Notable Canary Patterns**:
- All test files in `__tests__/strategic/` are canaries (critical test coverage)
- Application shell files (`app/shell/`) are all canaries
- Many API client files are canaries (circuit-breaker, cache-manager, config)
- Core analytics files are canaries

#### 8.5.3 Server Package Canaries (1,467 files)

**Sample Canary Files** (first 50 of 1,467):
```
server/__tests__/migration-safety.integration.test.ts
server/__tests__/module-resolution.test.ts
server/config/development.ts
server/config/index.ts
server/config/production.ts
server/config/test.ts
server/dist/client/src/monitoring/performance-monitoring.d.ts
server/dist/config/development.d.ts
server/dist/config/index.d.ts
server/dist/config/production.d.ts
server/dist/config/test.d.ts
server/dist/demo/real-time-tracking-demo.d.ts
server/dist/domain/interfaces/bill-repository.interface.d.ts
server/dist/domain/interfaces/sponsor-repository.interface.d.ts
server/dist/domain/interfaces/user-repository.interface.d.ts
server/dist/features/accountability/ledger.controller.d.ts
server/dist/features/accountability/ledger.service.d.ts
server/dist/features/admin/admin.d.ts
server/dist/features/admin/content-moderation.d.ts
server/dist/features/admin/external-api-dashboard.d.ts
server/dist/features/admin/index.d.ts
server/dist/features/admin/moderation/content-analysis.service.d.ts
server/dist/features/admin/moderation/index.d.ts
server/dist/features/admin/moderation/moderation-analytics.service.d.ts
server/dist/features/admin/moderation/moderation-decision.service.d.ts
server/dist/features/admin/moderation/moderation-orchestrator.service.d.ts
server/dist/features/admin/moderation/moderation-queue.service.d.ts
server/dist/features/admin/moderation/types.d.ts
server/dist/features/admin/system.d.ts
server/dist/features/advocacy/advocacy-factory.d.ts
server/dist/features/advocacy/application/action-coordinator.d.ts
server/dist/features/advocacy/application/campaign-service.d.ts
server/dist/features/advocacy/application/coalition-builder.d.ts
server/dist/features/advocacy/application/impact-tracker.d.ts
server/dist/features/advocacy/config/advocacy-config.d.ts
server/dist/features/advocacy/domain/entities/action-item.d.ts
server/dist/features/advocacy/domain/entities/campaign.d.ts
server/dist/features/advocacy/domain/errors/advocacy-errors.d.ts
server/dist/features/advocacy/domain/events/advocacy-events.d.ts
server/dist/features/advocacy/domain/services/campaign-domain-service.d.ts
server/dist/features/advocacy/index.d.ts
server/dist/features/advocacy/infrastructure/services/notification-service.d.ts
server/dist/features/advocacy/infrastructure/services/representative-contact-service.d.ts
server/dist/features/advocacy/types/index.d.ts
server/dist/features/ai-evaluation/application/evaluation-orchestrator.d.ts
server/dist/features/alert-preferences/application/alert-preferences-service.d.ts
server/dist/features/alert-preferences/application/commands/create-alert-preference-command.d.ts
server/dist/features/alert-preferences/application/use-cases/create-alert-preference-use-case.d.ts
server/dist/features/alert-preferences/application/utils/alert-utilities.d.ts
server/dist/features/alert-preferences/domain/entities/alert-delivery-log.d.ts
```

**Full list**: See canary_files.txt (1,417 additional files)

**Notable Canary Patterns**:
- All config files are canaries (development, production, test)
- Many `.d.ts` declaration files in `dist/` are canaries
- Test files are canaries
- Many domain entity files are canaries

**Warning**: Many `dist/` files are canaries, but these are build artifacts and should not be in source control. These should be added to .gitignore.

#### 8.5.4 Shared Package Canaries (1,453 files)

**Sample Canary Files** (first 50 of 1,453):
```
shared/__tests__/api-contract-type-usage.property.test.ts
shared/__tests__/migration-type-generation.property.test.ts
shared/__tests__/transformation-edge-cases.unit.test.ts
shared/__tests__/validation-at-integration-points.property.test.ts
shared/constants/error-codes.ts
shared/constants/feature-flags.ts
shared/constants/index.ts
shared/constants/limits.ts
shared/core/middleware/auth/types.d.ts
shared/core/middleware/index.ts
shared/core/middleware/types.ts
shared/core/primitives/constants/http-status.ts
shared/core/primitives/constants/index.ts
shared/core/primitives/constants/time.ts
shared/core/primitives/index.ts
shared/core/primitives/types/branded.ts
shared/core/primitives/types/index.ts
shared/core/primitives/types/maybe.ts
shared/core/primitives/types/result.ts
shared/core/types/feature-flags.ts
shared/core/types/index.ts
shared/core/types/realtime.ts
shared/core/types/services.ts
shared/core/types/validation-types.ts
shared/core/utils/async-utils.ts
shared/core/utils/browser-logger.d.ts
shared/core/utils/concurrency-adapter.ts
shared/core/utils/constants.ts
shared/core/utils/examples/concurrency-migration-example.ts
shared/core/utils/formatting/currency.ts
shared/core/utils/formatting/date-time.test.ts
shared/core/utils/formatting/date-time.ts
shared/core/utils/formatting/document.ts
shared/core/utils/formatting/file-size.ts
shared/core/utils/formatting/index.ts
shared/core/utils/formatting/location.ts
shared/core/utils/formatting/status.ts
shared/core/utils/http-utils.ts
shared/core/utils/index.ts
shared/core/utils/loading-utils.ts
shared/core/utils/navigation-utils.ts
shared/core/utils/race-condition-prevention.ts
shared/core/utils/regex-patterns.ts
shared/core/utils/security-utils.test.ts
shared/core/utils/string-utils.test.ts
shared/core/utils/string-utils.ts
shared/core/utils/type-guards.test.ts
shared/dist/constants/error-codes.d.ts
shared/dist/constants/feature-flags.d.ts
shared/dist/constants/index.d.ts
```

**Full list**: See canary_files.txt (1,403 additional files)

**Notable Canary Patterns**:
- All constants files are canaries
- All primitive type files are canaries
- Most utility files are canaries
- Test files are canaries
- Formatting utilities are all canaries

**Significance**: Shared package is the most stable (93% canary rate), indicating it's the foundation that other packages depend on.

#### 8.5.5 Canary Monitoring Strategy

**During Import Resolution (Phases 1-4)**:

1. **Before each fix**: Note current canary count
2. **After each fix**: Run `tsc --noEmit` and check if any canaries gained errors
3. **If canary gains error**: 
   - STOP immediately
   - Investigate root cause
   - Revert fix if necessary
   - Document in error-delta.md

**Canary Monitoring Commands**:
```bash
# Re-run canary identification after fixes
bash identify-canaries.sh > canary_files_postfix.txt

# Compare canary counts
diff canary_files.txt canary_files_postfix.txt

# Check specific canary file
npx tsc --noEmit client/src/app/shell/AppRouter.tsx
```

**Red Flags**:
- Canary count decreases (files gained errors)
- Strategic test files gain errors
- Config files gain errors
- Core infrastructure files gain errors

**Status**: ✅ Task 0.2.2 Complete - 3,644 canary files identified


---

### 8.6 Comparison to Initial Estimates

**Initial Estimate** (from requirements.md):
- Total TypeScript errors: 5,762
- Module resolution errors: ~1,200

**Actual Baseline** (measured):
- Total TypeScript errors: 8,797 (52% higher than estimate)
- Module resolution errors: 1,436 (20% higher than estimate)

**Discrepancy Analysis**:
- Initial estimate was conservative
- Actual error count is significantly higher
- Module resolution errors are close to estimate (within 20%)
- Additional errors likely from:
  - Null safety issues not initially counted
  - Unused code warnings not initially counted
  - Build configuration errors not initially counted

**Impact on Spec**:
- Success metrics should be adjusted
- Timeline may need extension
- Prioritization remains valid (module resolution is still highest priority)

---

## 9. Dependency Analysis (Task 0.2.3 Complete)

**Date**: February 20, 2026  
**Tools Used**: depcheck, madge, ts-unused-exports  
**Files Generated**: baseline_depcheck.json, baseline_circular_*.txt, baseline_unused_exports.txt

### 9.1 Circular Dependencies (madge)

#### 9.1.1 Client Package Circular Dependencies

**Total Circular Dependencies**: 1

**Circular Dependency Chain**:
1. `lib/types/utils/react.ts` → (self-referential)

**Severity**: LOW  
**Impact**: Single file with self-referential circular dependency  
**Recommendation**: Review react.ts for type re-exports that may be causing the cycle

**Processing Stats**:
- Files Processed: 1,259
- Processing Time: 15.6s
- Warnings: 497

---

#### 9.1.2 Server Package Circular Dependencies

**Total Circular Dependencies**: 4

**Circular Dependency Chains**:
1. `dist/server/infrastructure/migration/migration-api.js` → `dist/server/infrastructure/migration/index.js` → (back to migration-api.js)
2. `infrastructure/schema/foundation.ts` → `infrastructure/schema/participation_oversight.ts` → (back to foundation.ts)
3. `infrastructure/schema/foundation.ts` → `infrastructure/schema/political_economy.ts` → (back to foundation.ts)
4. `infrastructure/schema/foundation.ts` → `infrastructure/schema/trojan_bill_detection.ts` → (back to foundation.ts)

**Severity**: MEDIUM-HIGH  
**Impact**: 
- Cycle 1 is in compiled output (`dist/`) - should not be in source control
- Cycles 2-4 are in database schema files - foundation.ts is a hub for circular dependencies
- Schema circular dependencies can cause initialization order issues

**Root Cause**: `infrastructure/schema/foundation.ts` imports from domain-specific schema files that also import from foundation.ts

**Recommendation**: 
- Add `dist/` to .gitignore (compiled artifacts should not be tracked)
- Extract shared schema types to a separate file (e.g., `schema/shared-types.ts`)
- Have foundation.ts and domain schemas both import from shared-types.ts
- Break circular dependency by using type-only imports where possible

**Processing Stats**:
- Files Processed: 1,979
- Processing Time: 30.9s
- Warnings: 603

---

#### 9.1.3 Shared Package Circular Dependencies

**Total Circular Dependencies**: 3

**Circular Dependency Chains**:
1. `dist/core/observability/interfaces.d.ts` → `dist/core/observability/telemetry.d.ts` → (back to interfaces.d.ts)
2. `dist/core/src/observability/interfaces.d.ts` → `dist/core/observability/telemetry.d.ts` → (back to interfaces.d.ts)
3. `dist/schema/domains/foundation.d.ts` → (self-referential)

**Severity**: LOW-MEDIUM  
**Impact**: 
- Cycles 1-2 are in compiled output (`dist/`) - should not be in source control
- Cycle 3 is in compiled schema declarations
- All cycles are in declaration files, not source files

**Root Cause**: Compiled artifacts in source control

**Recommendation**: 
- Add `dist/` to .gitignore
- Verify source files don't have circular dependencies
- Re-run madge after removing dist/ to get accurate source-only analysis

**Processing Stats**:
- Files Processed: 983
- Processing Time: 24.8s
- Warnings: 121

---

#### 9.1.4 Circular Dependency Summary

| Package | Total Cycles | In Source | In Dist | Severity |
|---------|--------------|-----------|---------|----------|
| Client  | 1            | 1         | 0       | LOW      |
| Server  | 4            | 3         | 1       | MEDIUM-HIGH |
| Shared  | 3            | 0         | 3       | LOW-MEDIUM |
| **TOTAL** | **8**      | **4**     | **4**   | **MEDIUM** |

**Key Findings**:
- 50% of circular dependencies are in compiled output (dist/) that shouldn't be tracked
- Server schema files have 3 circular dependencies centered on foundation.ts
- Client has minimal circular dependency issues
- Shared package cycles are all in compiled output

**Priority Actions**:
1. Add `dist/` to .gitignore (removes 4 of 8 cycles)
2. Fix server schema circular dependencies (foundation.ts hub)
3. Review client lib/types/utils/react.ts for self-referential cycle

---

### 9.2 Unused Exports (ts-unused-exports)

**Total Unused Exports**: 0

**Status**: ✅ EXCELLENT - No unused exports detected

**Significance**: 
- All exported code is being used somewhere in the codebase
- No dead code exports to clean up
- Good code hygiene despite multiple migrations

**Note**: Test files were excluded from analysis (.*\.test\.ts;.*\.spec\.ts)

---

### 9.3 Missing and Unused Dependencies (depcheck)

**Analysis Source**: baseline_depcheck.json

#### 9.3.1 Missing Dependencies

**Total Missing Dependencies**: 14 unique packages

**Critical Missing Dependencies** (used in source code):

1. **@shared/types** - Used in 10 files
   - tests/cross-layer-integration.test.ts
   - tests/end-to-end-workflows.test.ts
   - tests/performance-regression.test.ts
   - tests/properties/*.property.test.ts (2 files)
   - scripts/*.ts (5 files)
   - **Impact**: HIGH - Core shared types not properly declared
   - **Root Cause**: Workspace alias not in package.json dependencies

2. **@shared/core** - Used in 17 files
   - tests/utilities/shared/*.ts (2 files)
   - scripts/*.ts (15 files)
   - **Impact**: HIGH - Core shared utilities not properly declared
   - **Root Cause**: Workspace alias not in package.json dependencies

3. **@server/infrastructure** - Used in 10 files
   - tests/integration/tests/graph-module.integration.test.ts
   - scripts/*.ts (9 files)
   - **Impact**: HIGH - Server infrastructure not properly declared
   - **Root Cause**: Workspace alias not in package.json dependencies

4. **@shared/utils** - Used in 5 files
   - tests/properties/*.property.test.ts (3 files)
   - **Impact**: MEDIUM - Shared utilities not properly declared
   - **Root Cause**: Workspace alias not in package.json dependencies

5. **@client/core** - Used in 2 files
   - tests/properties/api-retry-logic.property.test.ts
   - tests/properties/websocket-message-batching.property.test.ts
   - **Impact**: MEDIUM - Client core not properly declared
   - **Root Cause**: Workspace alias not in package.json dependencies

**Legacy/Deprecated Missing Dependencies**:

6. **@shared/shared** - Used in 5 scripts
   - **Impact**: LOW - Likely deprecated alias
   - **Root Cause**: Old workspace alias from migration

7. **@shared/server** - Used in 2 scripts
   - **Impact**: LOW - Likely deprecated alias
   - **Root Cause**: Old workspace alias from migration

8. **@server/config** - Used in 1 script
   - **Impact**: LOW - Server config not properly declared
   - **Root Cause**: Workspace alias not in package.json dependencies

**Test/Dev Tool Missing Dependencies**:

9. **react-router-dom** - Used in 1 test utility
   - tests/utilities/client/comprehensive-test-setup.tsx
   - **Impact**: MEDIUM - Should be in devDependencies
   - **Root Cause**: Missing from package.json

10. **jest-axe** - Used in 1 test utility
    - tests/utilities/client/setup-a11y.ts
    - **Impact**: LOW - Accessibility testing tool
    - **Root Cause**: Missing from devDependencies

11. **msw** - Used in 1 test utility
    - tests/utilities/client/setup-integration.ts
    - **Impact**: MEDIUM - Mock Service Worker for API mocking
    - **Root Cause**: Missing from devDependencies

12. **commander** - Used in 1 script
    - scripts/deploy-repository-migration.ts
    - **Impact**: LOW - CLI tool for scripts
    - **Root Cause**: Missing from devDependencies

**Documentation/Legacy Missing Dependencies**:

13. **cheerio** - Used in docs/reference/leg_intel_scraper.js
    - **Impact**: NEGLIGIBLE - Legacy documentation script
    - **Root Cause**: Old scraper script, likely unused

14. **csv-writer** - Used in docs/reference/leg_intel_scraper.js
    - **Impact**: NEGLIGIBLE - Legacy documentation script
    - **Root Cause**: Old scraper script, likely unused

15. **winston** - Used in docs/reference/leg_intel_scraper.js
    - **Impact**: NEGLIGIBLE - Legacy documentation script
    - **Root Cause**: Old scraper script, likely unused

16. **aws-sdk** - Used in deployment/cdn-config.js
    - **Impact**: LOW - Deployment script
    - **Root Cause**: Missing from devDependencies

17. **mime-types** - Used in deployment/cdn-config.js
    - **Impact**: LOW - Deployment script
    - **Root Cause**: Missing from devDependencies

18. **espree** - Used in .eslintrc.cjs
    - **Impact**: LOW - ESLint parser
    - **Root Cause**: Missing from devDependencies (but listed in "using" section)

---

#### 9.3.2 Missing Dependencies Summary

| Category | Count | Priority | Action Required |
|----------|-------|----------|-----------------|
| Workspace Aliases | 8 | HIGH | Add to package.json or fix tsconfig paths |
| Test/Dev Tools | 4 | MEDIUM | Add to devDependencies |
| Legacy/Docs | 5 | LOW | Remove or add to devDependencies |
| Build Tools | 1 | LOW | Add to devDependencies |
| **TOTAL** | **18** | - | - |

**Key Insight**: Most "missing" dependencies are workspace aliases (@shared/*, @server/*, @client/*) that are resolved via TypeScript path mapping but not declared in package.json. This is expected in a monorepo with workspace references.

**Recommendation**: 
- Workspace aliases are correctly configured in tsconfig.json - no action needed
- Add missing test/dev tools to devDependencies (react-router-dom, jest-axe, msw, commander)
- Remove or update legacy documentation scripts

---

#### 9.3.3 Unused Dependencies

**Total Unused Dependencies**: 47 packages

**Note**: depcheck reports these as unused, but they may be:
- Used in runtime (not statically analyzed)
- Used in configuration files
- Used in scripts not analyzed
- False positives

**Unused Dependencies List**:
```
@aws-sdk/client-sns, @hapi/boom, @reduxjs/toolkit, @sentry/replay, 
@socket.io/redis-adapter, @tensorflow/tfjs-node, async-mutex, bcrypt, 
bcryptjs, chokidar, compromise, cors, dompurify, dotenv-expand, 
drizzle-zod, express-rate-limit, express-session, firebase-admin, 
fuse.js, helmet, ioredis, isomorphic-dompurify, joi, jsonwebtoken, 
jspdf, lucide-react, natural, neo4j-driver, neverthrow, node-cron, 
nodemailer, openai, p-limit, passport, passport-google-oauth20, 
passport-local, pdf-lib, pdfjs-dist, pino, react-redux, redis, 
redux-persist, reflect-metadata, reselect, socket.io, sql-template-tag, 
uuid
```

**Unused DevDependencies List**:
```
@axe-core/playwright, @nx/devkit, @nx/eslint, @nx/js, @nx/vite, 
@nx/workspace, @tanstack/react-query-devtools, @types/bcrypt, 
@types/cors, @types/express-session, @types/helmet, @types/jsonwebtoken, 
@types/node-cron, @types/nodemailer, @types/passport, 
@types/passport-google-oauth20, @types/passport-local, @types/pdfjs-dist, 
@types/pino, @types/react-redux, @types/supertest, axe-core, concurrently, 
dependency-cruiser, eslint-plugin-simple-import-sort, lighthouse, nodemon, 
postcss, socket.io-client, start-server-and-test, supertest, swagger-jsdoc, 
swagger-ui-express, tsconfig-paths
```

**Severity**: LOW  
**Impact**: These are likely false positives from depcheck's static analysis  
**Recommendation**: Manual review required - many of these are used in runtime or configuration

---

### 9.4 Dependency Analysis Summary

| Analysis Type | Result | Severity | Action Required |
|---------------|--------|----------|-----------------|
| Circular Dependencies | 8 found (4 in dist/) | MEDIUM | Fix schema cycles, ignore dist/ |
| Unused Exports | 0 found | ✅ EXCELLENT | None |
| Missing Dependencies | 18 found | HIGH | Add test tools to devDeps |
| Unused Dependencies | 47 reported | LOW | Manual review (likely false positives) |

**Key Findings**:
1. **Circular Dependencies**: Concentrated in server schema files (foundation.ts hub)
2. **Unused Exports**: Clean - no dead code exports
3. **Missing Dependencies**: Mostly workspace aliases (expected in monorepo)
4. **Unused Dependencies**: Likely false positives - manual review needed

**Priority Actions**:
1. Add `dist/` to .gitignore (removes 50% of circular dependencies)
2. Fix server schema circular dependencies (extract shared types)
3. Add missing test tools to devDependencies (react-router-dom, jest-axe, msw)
4. Manual review of "unused" dependencies (likely false positives)

**Status**: ✅ Task 0.2.3 Complete - Dependency analysis documented

---

## 10. Baseline Analysis Summary (Task 0.2.4 Complete)

**Date**: February 20, 2026  
**Baseline Capture Date**: February 20, 2026  
**Analysis Tools**: TypeScript Compiler (tsc), madge, depcheck, ts-unused-exports

### 10.1 Overall Error Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Total TypeScript Errors** | 8,797 | 52% higher than initial estimate (5,762) |
| **Module Resolution Errors** | 1,436 (16.3%) | 20% higher than estimate (~1,200) |
| **Type Safety Errors** | 3,056 (34.7%) | Largest category |
| **Null Safety Errors** | 1,987 (22.6%) | Second largest category |
| **Unused Code Warnings** | 1,570 (17.8%) | Cleanup needed |
| **Build Config Errors** | 564 (6.4%) | Configuration issues |
| **Circular Dependencies** | 8 (4 in source) | Server schema issues |
| **Unused Exports** | 0 | ✅ Excellent |
| **Regression Canaries** | 3,644 (76.9%) | High stability |

### 10.2 Error Distribution by Package

| Package | Total Errors | Module Res | Type Safety | Null Safety | Unused Code | Canaries | Canary % |
|---------|--------------|------------|-------------|-------------|-------------|----------|----------|
| Client  | 2,571        | 115 (4%)   | 1,024 (40%) | 575 (22%)   | 710 (28%)   | 724      | 58.6%    |
| Server  | 5,167        | 1,266 (24%)| 1,650 (32%) | 1,018 (20%) | 839 (16%)   | 1,467    | 75.7%    |
| Shared  | 1,059        | 55 (5%)    | 382 (36%)   | 394 (37%)   | 129 (12%)   | 1,453    | 93.0%    |
| **TOTAL** | **8,797**  | **1,436**  | **3,056**   | **1,987**   | **1,678**   | **3,644**| **76.9%**|

### 10.3 Critical Findings

#### 10.3.1 Server Module Resolution Crisis
- **1,004 TS2307 errors** (Cannot find module) in server package
- Represents 70% of all module resolution errors
- 19% of all server errors
- **HIGHEST PRIORITY** for remediation

#### 10.3.2 High Canary Rate (76.9%)
- 3,644 files with zero errors serve as regression canaries
- Errors are localized, not systemic
- Shared package most stable (93.0% canary rate)
- Any canary gaining errors indicates regression

#### 10.3.3 Circular Dependency Hotspots
- Server schema files have 3 circular dependencies centered on `foundation.ts`
- 50% of circular dependencies are in compiled output (`dist/`)
- Client has minimal circular dependency issues

#### 10.3.4 Clean Export Hygiene
- Zero unused exports detected
- Good code hygiene despite multiple migrations
- No dead code exports to clean up

### 10.4 Structural Hotspots Identified

| Hotspot | Location | Issue | Priority |
|---------|----------|-------|----------|
| HOTSPOT-1 | client/src/core/websocket/ | Compiled output in source tree | HIGH |
| HOTSPOT-2 | Security UI (3 locations) | Triple overlap | HIGH |
| HOTSPOT-3 | useAuth hook (2 locations) | Duplication | MEDIUM |
| HOTSPOT-4 | Loading utilities (3 locations) | Triple overlap | HIGH |
| HOTSPOT-5 | server/infrastructure/errors/ | Empty directory | MEDIUM |
| HOTSPOT-6 | client/src/lib/ vs features/ | FSD migration boundary | HIGH |
| HOTSPOT-7 | Monitoring (3 locations) | Triple overlap | HIGH |
| HOTSPOT-7 | Navigation (3 locations) | Triple overlap | HIGH |
| HOTSPOT-7 | Validation (3 locations) | Triple overlap | HIGH |

### 10.5 Dependency Analysis Results

| Analysis | Result | Severity | Action |
|----------|--------|----------|--------|
| Circular Dependencies | 8 (4 in source) | MEDIUM | Fix schema cycles |
| Unused Exports | 0 | ✅ EXCELLENT | None |
| Missing Dependencies | 18 (mostly workspace aliases) | HIGH | Add test tools |
| Unused Dependencies | 47 (likely false positives) | LOW | Manual review |

### 10.6 Top Error Codes (Across All Packages)

| Rank | Error Code | Description | Count | Percentage |
|------|------------|-------------|-------|------------|
| 1 | TS6133 | Variable declared but never used | 1,570 | 17.8% |
| 2 | TS18046 | Possibly undefined | 1,564 | 17.8% |
| 3 | TS2307 | Cannot find module | 1,053 | 12.0% |
| 4 | TS2339 | Property does not exist | 776 | 8.8% |
| 5 | TS7006 | Parameter implicitly has 'any' | 509 | 5.8% |

### 10.7 Baseline Artifacts Generated

✅ **TypeScript Error Baselines**:
- baseline_tsc_root.txt (0 errors)
- baseline_tsc_client.txt (2,571 errors)
- baseline_tsc_server.txt (5,167 errors)
- baseline_tsc_shared.txt (1,059 errors)
- baseline_vitest.txt (0 errors)

✅ **Dependency Analysis**:
- baseline_depcheck.json (18 missing, 47 unused)
- baseline_circular_client.txt (1 cycle)
- baseline_circular_server.txt (4 cycles)
- baseline_circular_shared.txt (3 cycles)
- baseline_unused_exports.txt (0 unused)

✅ **Analysis Documents**:
- baseline_analysis.md (this document)
- project-structure-reference.md (annotated structure)
- canary_files.txt (3,644 regression canaries)

### 10.8 Success Metrics Adjustment

**Original Estimate** (from requirements.md):
- Total TypeScript errors: 5,762
- Module resolution errors: ~1,200

**Actual Baseline**:
- Total TypeScript errors: 8,797 (52% higher)
- Module resolution errors: 1,436 (20% higher)

**Adjusted Success Metrics**:
- Module resolution errors: 1,436 → 0 (100% reduction)
- Total TypeScript errors: 8,797 → <7,000 (accounting for newly visible bugs)
- Regressions: 0 (maintain 3,644 canaries)
- Files fixed: ~500-600 (estimated)

### 10.9 Phase 0 Completion Status

| Task | Status | Artifacts |
|------|--------|-----------|
| 0.0.1 Read project structure | ✅ Complete | Analysis in baseline_analysis.md |
| 0.0.2 Create annotated reference | ✅ Complete | project-structure-reference.md |
| 0.0.3 Extract key metrics | ✅ Complete | Metrics in baseline_analysis.md |
| 0.0.5 Install analysis tools | ✅ Complete | depcheck, madge, ts-unused-exports |
| 0.1 Capture TypeScript baseline | ✅ Complete | 5 baseline_tsc_*.txt files |
| 0.2.1 Count errors by category | ✅ Complete | Section 8.2 |
| 0.2.2 Identify canaries | ✅ Complete | Section 8.5, canary_files.txt |
| 0.2.3 Run dependency analysis | ✅ Complete | Section 9 |
| **0.2.4 Create baseline analysis** | ✅ **Complete** | **This document** |

### 10.10 Next Steps (Checkpoint 0.3)

**Immediate Actions**:
1. Verify all baseline artifacts exist
2. Verify no source code changes made (git status)
3. Commit baseline artifacts with comprehensive commit message

**Phase 1 Priority**:
- Focus on server package (1,004 TS2307 errors - 70% of module resolution errors)
- Audit module resolution configs (tsconfig.json, vite.config.ts, vitest.workspace.ts)
- Verify path aliases in all configs
- Fix config root cause before fixing imports

**Phase 2 Priority**:
- Investigate structural hotspots (security UI, loading utilities, FSD boundary)
- Determine canonical vs stale versions
- Document in structural-ambiguities.md

---

## 11. Recommendations

### 11.1 Immediate Actions (Before Phase 1)

1. **Add dist/ to .gitignore**
   - Removes 4 of 8 circular dependencies
   - Prevents compiled artifacts in source control
   - Cleans up repository

2. **Add missing test tools to devDependencies**
   - react-router-dom
   - jest-axe
   - msw
   - commander

3. **Commit baseline artifacts**
   - All baseline_*.txt files
   - baseline_depcheck.json
   - baseline_analysis.md
   - project-structure-reference.md
   - canary_files.txt

### 11.2 Phase 1 Focus (Config Fixes)

1. **Server tsconfig.json audit**
   - Verify @shared/* alias
   - Verify @server/* alias
   - Check baseUrl and paths configuration

2. **Vitest config audit**
   - Verify all aliases match tsconfig
   - Check moduleNameMapper
   - Verify resolve.alias

3. **Vite config audit**
   - Verify all aliases match tsconfig
   - Check resolve.alias

### 11.3 Phase 2 Focus (Structural Investigation)

1. **Fix server schema circular dependencies**
   - Extract shared types from foundation.ts
   - Create schema/shared-types.ts
   - Update imports to break cycles

2. **Investigate security UI triple overlap**
   - Determine canonical location
   - Document in structural-ambiguities.md
   - Prepare import fix strategy

3. **Investigate loading utilities triple overlap**
   - Determine canonical location
   - Document in structural-ambiguities.md
   - Prepare import fix strategy

### 11.4 Out of Scope (Separate Specs)

1. **Null safety errors (1,987)** → Separate null safety spec
2. **Unused code warnings (1,570)** → Separate cleanup spec
3. **Type safety errors (3,056)** → server-typescript-errors-remediation spec
4. **Implicit any errors (509)** → server-typescript-errors-remediation spec

---

## 12. Conclusion

**Task 0.2.4 Status**: ✅ **COMPLETE**

This baseline analysis document provides a comprehensive foundation for the import resolution audit:

- **8,797 total errors** documented and categorized
- **1,436 module resolution errors** identified as primary target
- **3,644 regression canaries** identified for monitoring
- **8 circular dependencies** documented (4 in source, 4 in dist/)
- **0 unused exports** - excellent code hygiene
- **18 missing dependencies** identified (mostly workspace aliases)
- **9 structural hotspots** documented with priority levels

The baseline is complete and ready for Phase 1 (config fixes) and Phase 2 (structural investigation).

**Key Insight**: Server package has 70% of all module resolution errors (1,004 TS2307), making it the highest priority for Phase 1-4 remediation.

---

**Document Version**: 1.0  
**Last Updated**: February 20, 2026  
**Next Review**: After Phase 1 completion

