# Directory Alignment Analysis: FSD Design Evaluation

**Date:** December 10, 2025  
**Status:** ⚠️ **PARTIAL MISALIGNMENT - Requires Migration Strategy**

---

## Executive Summary

The three attached directories (`lib`, `hooks`, `types`) currently exist at **`client/src/`** level as **legacy shared resources**. Under your **Feature-Sliced Design (FSD)** architecture, they should be reorganized as follows:

| Directory | Current | FSD Alignment | Recommendation | Priority |
|-----------|---------|---------------|-----------------|----------|
| **lib/** | `client/src/lib/` | ❌ Wrong level | Move to `client/src/shared/lib/` | HIGH |
| **hooks/** | `client/src/hooks/` | ⚠️ Mixed | Split: core → `core/hooks/`, features → `features/*/hooks/`, shared → `shared/hooks/` | HIGH |
| **types/** | `client/src/types/` | ✅ Acceptable | Move to `client/src/shared/types/` or consolidate into design-system | MEDIUM |

---

## Detailed Analysis

### 1. **`lib/` Directory** - ❌ Needs Migration

#### Current State
- **Location:** `client/src/lib/`
- **Contents:** 5 files
  - `form-builder.tsx` - Form utility with react-hook-form
  - `protected-route.tsx` - Route protection
  - `queryClient.ts` - React Query config
  - `react-query-config.ts` - Query caching rules
  - `utils.ts` - General utilities
  - `validation-schemas.test.ts` - Shared validation

#### Usage Pattern
```typescript
// FROM: Imported as shared utilities
import { cn } from '@client/lib/utils';
import { useFormBuilder } from '@client/lib/form-builder';
import { ProtectedRoute } from '@client/lib/protected-route';
```

#### FSD Alignment Assessment: **❌ MISALIGNED**

**Issues:**
1. ✗ Placed at root-level `src/` instead of under `shared/`
2. ✗ Mixing cross-cutting utilities with feature-specific helpers
3. ✗ Form builder could be specific to form features
4. ✗ Route protection is core infrastructure, not shared

**FSD Rule Violation:**
```
FSD Hierarchy:
  app/          ← Application entry
  features/     ← Feature-specific code
  shared/       ← Cross-cutting, reusable code ⬅️ lib/ should be here
  core/         ← Core infrastructure ⬅️ Some of lib/ belongs here
```

#### Recommendation: **MIGRATE TO SHARED**

```
BEFORE:
client/src/
├── lib/
│   ├── form-builder.tsx
│   ├── utils.ts
│   └── ...

AFTER:
client/src/shared/
├── lib/
│   ├── form-builder.tsx     (Shared form utility)
│   ├── utils.ts             (Shared string/DOM utilities)
│   └── ...
├── infrastructure/
│   └── validation.ts        (Move validation-schemas here)

client/src/core/
├── query/
│   └── queryClient.ts       (React Query config)
```

**Migration Steps:**
```typescript
// 1. Update imports
// Before: import { cn } from '@client/lib/utils';
// After:  import { cn } from '@client/shared/lib/utils';

// 2. Update barrel exports
// shared/lib/index.ts
export { formBuilder } from './form-builder';
export { cn, capitalize } from './utils';

// 3. Update path alias if needed
// vite.config.ts: Add '@client/shared/lib': resolve to correct path
```

---

### 2. **`hooks/` Directory** - ⚠️ Needs Splitting

#### Current State
- **Location:** `client/src/hooks/`
- **Contents:** 38+ files (diverse collection)

```
hooks/
├── index.ts                      ← Re-exports everything
├── use-i18n.tsx                  ✓ Shared
├── use-mobile.tsx                ✓ Shared
├── use-keyboard-focus.ts         ✓ Shared
├── useCleanup.tsx                ✓ Shared utilities
├── useDebounce.ts                ✓ Shared utilities
├── useOfflineDetection.tsx        ✗ Core (offline is infrastructure)
├── useServiceStatus.ts           ✗ Core (service layer)
├── useConnectionAware.tsx        ✗ Core (network concerns)
├── mobile/                       ✗ Should be in shared/hooks/mobile
│   ├── useBottomSheet.ts         ✓ Mobile UI pattern
│   ├── useDeviceInfo.ts          ✗ Core (device detection)
│   └── usePullToRefresh.ts       ✓ Mobile UI pattern
├── useCommunityIntegration.ts    ✗ Feature-specific (community feature)
├── useSecurity.ts                ✗ Feature-specific or core
└── ...
```

#### Usage Pattern
```typescript
// Current imports scattered everywhere
import { useAuth } from '@client/hooks';              // ← Should be from features/users
import { useOfflineDetection } from '@client/hooks';  // ← Should be from core
import { useDebounce } from '@client/hooks';          // ← Should be from shared/hooks
import { usePullToRefresh } from '@client/hooks/mobile'; // ← OK but needs index
```

#### FSD Alignment Assessment: **⚠️ PARTIALLY MISALIGNED**

**Issues:**
1. ✗ Mixing core infrastructure hooks with shared UI hooks
2. ✗ Feature-specific hooks (useCommunityIntegration) in shared location
3. ✗ Mobile hooks scattered, not organized
4. ✗ Single barrel export hides true dependencies
5. ✗ Difficult to tree-shake unused hooks

**Violations:**
- Core hooks should live in `core/*/hooks/`
- Feature-specific hooks should live in `features/*/hooks/`
- Only truly shared hooks should be in `shared/hooks/`

#### Recommendation: **SPLIT INTO LAYERS**

```
BEFORE: client/src/hooks/ (38+ mixed files)

AFTER:

client/src/core/hooks/
├── useApiConnection.ts      (API layer)
├── useApiWithFallback.ts
├── useSafeMutation.ts
├── useOfflineDetection.ts   (Network)
├── useConnectionAware.ts
├── useServiceStatus.ts
├── useAuth.ts → move to features/users/hooks
└── index.ts

client/src/shared/hooks/
├── use-mobile.tsx           (Mobile detection)
├── use-keyboard-focus.ts    (Accessibility)
├── use-i18n.tsx             (i18n)
├── useDebounce.ts           (Utilities)
├── useSafeEffect.ts         (React utilities)
├── useSeamlessIntegration.ts (Cross-cutting)
├── mobile/
│   ├── useBottomSheet.ts
│   ├── usePullToRefresh.ts
│   ├── useSwipeGesture.ts
│   └── index.ts
└── index.ts

client/src/features/users/hooks/
├── useAuth.ts
├── usePasswordUtils.ts
└── index.ts

client/src/features/community/hooks/
├── useCommunityIntegration.ts
└── index.ts

client/src/features/security/hooks/
├── useSecurity.ts
└── index.ts
```

**Migration Plan:**

```typescript
// Step 1: Create new hook files in correct locations
client/src/core/hooks/
client/src/shared/hooks/
client/src/features/*/hooks/

// Step 2: Update barrel exports
// client/src/hooks/index.ts (DEPRECATED - backward compat only)
export { useAuth } from '../features/users/hooks';
export { useDebounce } from '../shared/hooks';
export { useApiConnection } from '../core/hooks';
// ... with deprecation warnings in comments

// Step 3: Update imports across codebase
// Old: import { useAuth } from '@client/hooks';
// New: import { useAuth } from '@client/features/users/hooks';

// Old: import { useDebounce } from '@client/hooks';
// New: import { useDebounce } from '@client/shared/hooks';
```

**Benefits:**
- ✓ Clear layer boundaries
- ✓ Better tree-shaking
- ✓ Smaller bundle sizes
- ✓ Easier to find related code
- ✓ Prevents circular dependencies

---

### 3. **`types/` Directory** - ✅ Mostly Aligned (Minor Adjustment)

#### Current State
- **Location:** `client/src/types/`
- **Contents:** 13+ type definition files

```
types/
├── api.ts                    ✓ Core API types
├── auth.ts                   ✗ User feature types
├── core.ts                   ✓ Shared types
├── dashboard.ts              ✗ Feature types
├── engagement-analytics.ts   ✗ Analytics feature types
├── expert.ts                 ✗ Bills feature types
├── security.ts               ✓ Core/Shared security
├── mobile.ts                 ✓ Shared mobile types
├── navigation.ts             ✗ Core navigation types
└── ...
```

#### Usage Pattern
```typescript
// Types are imported from @client/types (correct pattern)
import type { Bill } from '@client/core/api/types';
import type { User, PrivacySettings } from '@client/types/auth';
import type { SecurityEvent } from '@client/types';
```

#### FSD Alignment Assessment: **✅ ACCEPTABLE** (Minor Fix Needed)

**Current Status:**
- ✓ Generally well-organized
- ✓ Centralized location works for cross-cutting types
- ⚠️ Feature-specific types could move with features

**Issues (Minor):**
1. ⚠️ Feature-specific types (dashboard, expert, engagement-analytics) could live with features
2. ⚠️ Core types (navigation, api) better in `core/` for consistency

#### Recommendation: **CONSOLIDATE WITH OPTION TO SPLIT**

**Option A: Keep as-is (Simplest)**
```
client/src/shared/types/
├── core.ts
├── security.ts
├── mobile.ts
├── browser.ts
└── ...

client/src/core/api/types.ts
client/src/core/navigation/types.ts
```

**Option B: Full feature organization (Best practice)**
```
client/src/features/bills/model/types.ts
client/src/features/users/model/types.ts
client/src/features/analytics/model/types.ts
client/src/features/search/model/types.ts
client/src/shared/types/
├── browser.ts
├── mobile.ts
├── global.d.ts
└── shims/
```

**Recommendation: Move to `shared/types/`** (minimal change)

```typescript
// Update imports
// Before: import { User } from '@client/types';
// After:  import { User } from '@client/shared/types';

// OR for feature-specific:
// After:  import { User } from '@client/features/users/model/types';
```

---

## FSD Alignment Matrix

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ APP LAYER (Entry points, routing, providers)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────┬────────────────────┬─────────────────────┐
│ FEATURES         │ CORE               │ SHARED              │
│ (Use cases)      │ (Infrastructure)   │ (UI/Utils)          │
│                  │                    │                     │
│ features/        │ core/              │ shared/             │
│ ├─bills/         │ ├─api/             │ ├─design-system/    │
│ │  ├─model/      │ │ ├─types.ts       │ │ └─50+ components  │
│ │  ├─ui/         │ │ └─hooks/         │ ├─lib/              │
│ │  ├─hooks/ ✓    │ ├─navigation/      │ │ ├─utils.ts        │
│ │  └─api/        │ ├─loading/         │ │ └─form-builder.tsx│
│ │                │ ├─auth/            │ ├─hooks/            │
│ ├─users/         │ ├─error/           │ │ ├─use-mobile.tsx  │
│ │  ├─model/ ✓    │ └─storage/         │ │ └─mobile/         │
│ │  ├─hooks/ ✓    │                    │ ├─types/            │
│ │  └─ui/         │ Types: core/*/     │ ├─ui/               │
│ │                │        types.ts    │ └─infrastructure/   │
│ └─...            │                    │                     │
│                  │ Hooks: core/*/     │ Types: shared/types/│
│                  │        hooks/      │ Hooks: shared/hooks/│
└──────────────────┴────────────────────┴─────────────────────┘
```

### Current Placement Issues

```
MISALIGNED:                          CORRECT:
─────────────────────────────────    ─────────────────────────────────
client/src/lib/                      client/src/shared/lib/
  ├─ form-builder.tsx     ❌          ├─ form-builder.tsx      ✓
  ├─ utils.ts             ❌          ├─ utils.ts              ✓
  └─ ...                               └─ ...

client/src/hooks/                    client/src/core/hooks/
  ├─ useApiConnection.ts  ⚠️           ├─ useApiConnection.ts   ✓
  ├─ useOfflineDetection  ⚠️           ├─ useOfflineDetection   ✓
  └─ ...                               └─ ...

                                     client/src/shared/hooks/
                                       ├─ useDebounce.ts       ✓
                                       ├─ use-mobile.tsx       ✓
                                       └─ ...

                                     client/src/features/*/hooks/
                                       ├─ useAuth.ts           ✓
                                       └─ ...

client/src/types/                    client/src/shared/types/ (or core/)
  ├─ security.ts          ⚠️          ├─ security.ts           ✓
  ├─ mobile.ts            ✓           └─ ...
  └─ ...
```

---

## Migration Roadmap

### Phase 1: IMMEDIATE (1-2 days)
**Priority: HIGH** - These must be done before new features are added

1. **Move `lib/` to shared**
   ```bash
   mv client/src/lib → client/src/shared/lib
   ```
   - ✓ Minimal breaking changes
   - ✓ Clear benefits
   - ✓ Quick win

2. **Create barrel export for backward compatibility**
   ```typescript
   // client/src/lib/index.ts (deprecated)
   console.warn('DEPRECATED: Import from @client/shared/lib instead');
   export * from '../shared/lib';
   ```

### Phase 2: SHORT-TERM (3-5 days)
**Priority: HIGH** - Significant impact on codebase organization

1. **Split `hooks/` into layers**
   - Create `client/src/core/hooks/`
   - Create `client/src/shared/hooks/`
   - Move feature-specific hooks to features

2. **Update 50+ import statements**
   - Use find-and-replace or migration script
   - Generate script to automate this

3. **Update path aliases in `vite.config.ts`**

### Phase 3: MEDIUM-TERM (1 week)
**Priority: MEDIUM** - Consolidation and cleanup

1. **Consolidate `types/` to `shared/types/`**
   - Move from `client/src/types/`
   - Update imports (~100 files)

2. **Update all feature-specific types**
   - Move to `features/*/model/types.ts`
   - Create index exports

3. **Remove deprecated barrel exports**
   - Update old `client/src/hooks/index.ts`
   - Update old `client/src/types/index.ts`
   - Update old `client/src/lib/index.ts`

---

## Usage Audit Results

### Files Currently Using These Directories

```
IMPORTS FROM client/src/lib/:
  ✓ shared/ui/realtime/RealTimeDashboard.tsx
  ✓ pages/bill-detail.tsx (cn utility)
  ✓ shared/design-system/ThemeToggle.tsx

IMPORTS FROM client/src/hooks/:
  ✓ store/slices/userDashboardSlice.ts
  ✓ shared/ui/navigation/hooks/useRelatedPages.ts
  ✓ shared/ui/navigation/hooks/useRouteAccess.ts
  ✗ 50+ other files

IMPORTS FROM client/src/types/:
  ✓ pages/bill-detail.tsx (Bill type)
  ✓ security/* (SecurityEvent type)
  ✓ shared/ui/privacy/* (PrivacySettings type)
  ✗ 80+ other files
```

**Current Usage:** HIGH (deeply integrated)
**Migration Impact:** MEDIUM (mostly import updates)

---

## Recommended Actions

### ✅ Actions to Take Now

1. **Create migration tracking document**
   ```markdown
   # lib/ Migration Checklist
   - [ ] Create client/src/shared/lib/
   - [ ] Copy files from client/src/lib/
   - [ ] Update imports (15 files)
   - [ ] Update path aliases
   - [ ] Add deprecation notice
   - [ ] Test build
   ```

2. **Generate import migration script**
   ```bash
   # Find files importing from old locations
   grep -r "from '@client/lib" client/src --include="*.ts" --include="*.tsx"
   grep -r "from '@client/hooks" client/src --include="*.ts" --include="*.tsx"
   grep -r "from '@client/types" client/src --include="*.ts" --include="*.tsx"
   ```

3. **Create core/hooks/ and shared/hooks/ directories**
   - Prepare directory structure
   - Pre-create index.ts files
   - Document which hooks go where

### ⚠️ Important Considerations

1. **Circular Dependencies**
   - Be careful when moving hooks
   - Hooks in `core/` should not import from `features/`
   - Hooks in `shared/` should not import from `core/` or `features/`

2. **Path Aliases**
   - Current aliases: `@client/lib`, `@client/hooks`, `@client/types`
   - New aliases: `@client/shared/lib`, `@client/core/hooks`, `@client/shared/hooks`
   - Can keep old aliases for backward compatibility during transition

3. **Feature-Specific Hooks**
   - Identify hooks that belong to specific features
   - Move them to `features/*/hooks/`
   - Update barrel exports

4. **Tree-Shaking**
   - After split, ensure unused hooks are properly removed
   - Monitor bundle size changes
   - Test with `npm run build` and analyze chunks

### 📋 Validation Checklist

After migration, verify:
- [ ] No circular dependencies
- [ ] All imports resolve correctly
- [ ] Build succeeds (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Bundle size doesn't increase
- [ ] No console warnings about deprecated imports
- [ ] Path aliases work correctly
- [ ] Backward compatibility maintained (if needed)

---

## Summary Table

| Directory | Status | Action | Effort | Impact |
|-----------|--------|--------|--------|--------|
| **lib/** | ❌ Misaligned | Migrate to `shared/lib/` | 1-2 days | HIGH |
| **hooks/** | ⚠️ Mixed | Split into layers | 3-5 days | CRITICAL |
| **types/** | ✅ Good | Consolidate to `shared/types/` | 1 week | MEDIUM |

---

## Next Steps

1. **Review this analysis** with team
2. **Prioritize migrations** based on impact
3. **Create migration PRs** for each phase
4. **Update documentation** with new structure
5. **Train team** on new import patterns

---

**For Questions:**
- FSD reference: https://feature-sliced.design/
- Layer hierarchy: See Architecture Diagram above
- Migration examples: See Phase 1-3 sections
