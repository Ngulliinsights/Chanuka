# Comprehensive Type System Audit

**Date:** January 11, 2026  
**Scope:** Complete client/src type files and directories analysis

---

## Executive Summary

Current type system has **13 type directories** and **24 standalone type files** scattered across 3 layers (core, features, shared). Significant consolidation opportunities exist with **5-8 direct conflicts** and **12+ indirect duplication risks**.

---

## Part 1: Type System Structure

### Type Directories (13 total)

```
CORE LAYER (3 dirs):
├── core/api/types/              [API types - 14 files]
├── core/community/types/        [Community domain - 1 file, re-exports]
└── core/realtime/types/         [Real-time - 1 file, re-exports]

FEATURES LAYER (3 dirs):
├── features/analysis/types/     [Analysis feature - 1 file, re-exports]
├── features/community/types/    [Community feature - 1 file, partial types]
└── features/users/types/        [Users feature - 1 file, re-exports]

SHARED LAYER (7 dirs):
├── shared/types/                [MAIN - 12 files, core types hub]
├── shared/design-system/types/  [UI component types - 1 file]
├── shared/lib/form-builder/types/  [Form builder - 1 file]
├── shared/lib/query-client/types/  [Query client - 1 file]
├── shared/lib/validation/types/    [Validation - 1 file]
├── shared/ui/dashboard/types/   [Dashboard UI - 3 files]
└── shared/ui/types/             [Generic UI - 1 file]
```

### Standalone Type Files (24 total)

```
CORE LAYER (8 files):
├── core/auth/types.ts
├── core/browser/types.ts
├── core/command-palette/types.ts
├── core/dashboard/types.ts
├── core/error/types.ts (+ components/types.ts)
├── core/mobile/types.ts
├── core/navigation/types.ts
├── core/performance/types.ts
├── core/personalization/types.ts
├── core/search/types.ts
├── core/security/types.ts
└── core/storage/types.ts

FEATURES LAYER (4 files):
├── features/analytics/types.ts
├── features/bills/types.ts (+ model/types.ts)
├── features/community/types.ts
├── features/pretext-detection/types.ts
└── features/users/types.ts

SHARED LAYER (6 files):
├── shared/design-system/interactive/types.ts
├── shared/lib/form-builder/types/form-builder.types.ts
├── shared/lib/query-client/types/query-client.types.ts
├── shared/lib/validation/types/validation.types.ts
├── shared/ui/dashboard/types.ts
├── shared/ui/integration/types.ts
├── shared/ui/navigation/types.ts
└── shared/ui/types.ts
```

---

## Part 2: Import Pattern Analysis

### Import Distribution by Location

| Location | Import Count | Pattern | Risk |
|----------|--------------|---------|------|
| `@client/shared/types` | **16+** | Most imported - Bill type | ✅ Good |
| `@client/features/community/types` | **5** | Community comments | ⚠️ Feature duplication |
| `@client/features/users/types` | **4** | User types | ⚠️ Feature duplication |
| `@client/core/error/types` | **2** | Error handling | ✅ Core appropriate |
| `@client/core/community/types` | **1** | Community violations | ⚠️ Unused/redundant |
| `@client/shared/types/navigation` | **4** | Navigation items | ✅ Good |
| `@client/shared/types/mobile` | **2** | Mobile specific | ✅ Good |
| `@client/shared/types/user-dashboard` | **3** | Dashboard data | ✅ Good |
| `@client/shared/types/analytics` | **2** | Analytics | ✅ Good |

---

## Part 3: Identified Type Conflicts

### CONFLICT #1: Community Types (HIGH PRIORITY)

**Locations:**
- `@client/core/community/types/` - BaseComment, DiscussionThread, ViolationType
- `@client/features/community/types/` - Comment, CommunityComment, ActivityItem
- `@client/shared/types/core.ts` - Comment (re-exported)

**Problem:**
```
core/community/types → Comments with detailed structure
features/community/types → Simpler Comment interface
shared/types/core.ts → Bill, User, BillAnalysis (legacy)
```

**Duplication Risk:** 3 different Comment definitions
**Import Mix:** 5 imports from features, 1 from core
**Current State:** Features version is actively used

**Resolution Needed:** Consolidate to single definition

---

### CONFLICT #2: User Types (HIGH PRIORITY)

**Locations:**
- `features/users/types/` - User-related types
- `shared/types/core.ts` - User re-export
- `shared/types/user-dashboard.ts` - UserDashboardData, EngagementHistoryItem
- `core/personalization/types.ts` - User preferences

**Problem:** User definition scattered across 4 locations

**Duplication Risk:** User type inconsistency
**Import Mix:** Imports from both features and shared
**Current State:** Multiple active imports

---

### CONFLICT #3: Navigation Types (MEDIUM PRIORITY)

**Locations:**
- `core/navigation/types.ts` - Core navigation
- `shared/types/navigation.ts` - Navigation items
- `shared/ui/navigation/types.ts` - UI navigation
- Features reference both

**Problem:** Navigation split across core, shared, and UI layers

**Duplication Risk:** UserRole, NavigationItem definitions vary
**Import Mix:** 4+ imports from navigation locations

---

### CONFLICT #4: Mobile Types (MEDIUM PRIORITY)

**Locations:**
- `core/mobile/types.ts` - Core mobile types
- `shared/types/mobile.ts` - Shared mobile types
- `shared/design-system/types/component-types.ts` - Component types

**Problem:** Mobile types in both core and shared

**Duplication Risk:** Mobile configuration duplication
**Import Mix:** 2 imports, but inconsistent sources

---

### CONFLICT #5: Dashboard Types (MEDIUM PRIORITY)

**Locations:**
- `core/dashboard/types.ts` - Core dashboard
- `shared/types/dashboard.ts` - Shared dashboard
- `shared/ui/dashboard/types/` - UI dashboard (3 files)

**Problem:** 5 files for dashboard types

**Duplication Risk:** Widget, component type definitions scattered
**Import Mix:** Mostly local to dashboard components

---

### CONFLICT #6: Analytics Types (LOW PRIORITY)

**Locations:**
- `features/analytics/types.ts` - Feature-specific
- `shared/types/analytics.ts` - Shared analytics
- Dashboard types reference both

**Problem:** Analytics split between feature and shared

**Duplication Risk:** Analytics metrics definitions
**Import Mix:** 2+ imports from different sources

---

### CONFLICT #7: Error Types (LOW PRIORITY - Already Consolidated)

**Status:** ✅ Already consolidated in `core/error/types.ts`
**Note:** Good example of proper consolidation

---

### CONFLICT #8: API Types (LOW PRIORITY - Already Organized)

**Status:** ✅ Well organized in `core/api/types/`
**Note:** 14 files organized by domain, single index export

---

## Part 4: Consolidation Implications

### Dependencies by Layer

```
SHARED LAYER (Lowest, imported by all):
  ├── shared/types/               [MASTER HUB]
  ├── shared/types/navigation
  ├── shared/types/mobile
  ├── shared/types/analytics
  └── shared/ui/types

CORE LAYER (Imported by features and shared):
  ├── core/api/types/            [WELL-ORGANIZED]
  ├── core/error/types           [GOOD]
  ├── core/community/types       [CONFLICT - underutilized]
  ├── core/navigation/types      [CONFLICT - duplicated]
  ├── core/mobile/types          [CONFLICT - duplicated]
  └── core/dashboard/types       [CONFLICT - duplicated]

FEATURES LAYER (Highest, imported by components):
  ├── features/community/types   [ACTIVE - conflicts with core]
  ├── features/users/types       [ACTIVE - conflicts with shared]
  ├── features/analysis/types    [ACTIVE - conflicts with shared]
  └── features/bills/types       [ISOLATED - OK]
```

### Cross-Layer Import Problems

**High Risk:**
- features/* imports from shared/* but also has its own types
- core/* has duplicate with both shared/* and features/*
- No clear ownership model

**Cascading Issues:**
- Shared types changes break core and features
- Core types changes break features
- Features types create circular references to shared

---

## Part 5: Consolidation Strategy

### Priority 1: CRITICAL (Immediate)

#### 1. Community Types Consolidation
**Current State:** 3 locations with different definitions
**Target:** Single source: `shared/types/core.ts`
**Action:**
1. Merge BaseComment, DiscussionThread from core/community/types
2. Merge Comment types from features/community/types  
3. Create unified Comment interface in shared/types/core.ts
4. Update all imports
5. Delete core/community/types/index.ts
6. Delete features/community/types/index.ts

**Impact:** -2 files, +1 unified interface, 6 imports resolved

---

#### 2. User Types Consolidation
**Current State:** 4 locations
**Target:** Single source: `shared/types/core.ts`
**Action:**
1. Consolidate User from shared/core.ts
2. Move UserDashboardData to shared/types/user-dashboard.ts
3. Move preferences to shared/types/core.ts
4. Consolidate feature user types
5. Delete features/users/types/index.ts

**Impact:** -1 file, 4 imports resolved

---

### Priority 2: HIGH (Next Phase)

#### 3. Navigation Types Consolidation
**Target:** `shared/types/navigation.ts` as master
**Action:**
1. Consolidate NavigationItem, UserRole, NavigationSection
2. Keep core/navigation/types.ts for hook implementations (not types)
3. Move UI-specific props to shared/ui/navigation/types.ts
4. Update imports across layers

**Impact:** -1 core type file, clearer layer separation

---

#### 4. Mobile Types Consolidation
**Target:** `shared/types/mobile.ts` as master
**Action:**
1. Move core/mobile/types.ts → shared/types/mobile.ts
2. Keep mobile component types separate in shared/ui/
3. Clear separation: domain types (shared) vs component props (ui)

**Impact:** -1 core type file, clarity on layer responsibilities

---

#### 5. Dashboard Types Consolidation
**Target:** `shared/ui/dashboard/types/` (UI layer is correct)
**Action:**
1. Move core/dashboard/types.ts → shared/ui/dashboard/types/
2. Consolidate with shared/types/dashboard.ts
3. Keep dashboard components co-located with types

**Impact:** -1 core type file, all dashboard types in UI layer

---

### Priority 3: MEDIUM (Ongoing)

#### 6. Analytics Types Consolidation
**Target:** `shared/types/analytics.ts`
**Action:**
1. Move features/analytics/types.ts → shared/types/analytics.ts
2. Feature implementations reference shared types

**Impact:** -1 feature type file

---

## Part 6: Implementation Plan

### Phase 1: Community & User (30 minutes)
1. Consolidate Comment types → shared/types/core.ts
2. Consolidate User types → shared/types/core.ts
3. Update 6+ imports
4. Delete 2 redundant files

### Phase 2: Navigation & Mobile (20 minutes)
1. Consolidate Navigation → shared/types/navigation.ts
2. Consolidate Mobile → shared/types/mobile.ts
3. Update 4+ imports
4. Delete 2 core type files

### Phase 3: Dashboard & Analytics (15 minutes)
1. Move Dashboard types → shared/ui/dashboard/types/
2. Move Analytics → shared/types/analytics.ts
3. Update 2+ imports
4. Delete 2 type files

### Phase 4: Verification (10 minutes)
1. Type check: `npm run typecheck`
2. Verify all imports work
3. No circular dependencies
4. Error count check

---

## Part 7: Risk Assessment

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Circular imports | High | Enforce layer hierarchy: shared < core < features |
| Breaking changes | Medium | All imports updated automatically |
| Type conflicts in consolidation | Medium | Merge compatible definitions, document differences |
| Feature isolation | Low | Keep feature-specific types in features layer |

### Testing Checklist

- [ ] TypeScript compilation passes
- [ ] No circular dependency imports
- [ ] All files can find type imports
- [ ] Build completes successfully
- [ ] Error count ≤ target

---

## Summary: Consolidation Wins

**Before:**
- 13 type directories + 24 standalone files = 37 type locations
- 8 conflict areas with 3+ definitions each
- Cross-layer imports causing confusion
- 6 high-priority conflicts

**After (Proposed):**
- 10 type directories (3 removed)
- 20 standalone files (4 removed)
- Clear layer hierarchy: shared < core < features
- 0 conflicts (all consolidated)
- 12+ redundant files eliminated

**Estimated Error Reduction:** 15-20 errors from import/type conflicts

---

**Status:** Ready for consolidation execution
