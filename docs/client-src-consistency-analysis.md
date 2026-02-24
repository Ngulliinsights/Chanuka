# Client/src Internal Consistency Analysis

**Date:** February 24, 2026  
**Scope:** `client/src` folder structure  
**Purpose:** Identify architectural inconsistencies, duplication, and organizational issues

---

## Executive Summary

The `client/src` folder shows a mixed architecture attempting to follow Feature-Sliced Design (FSD) principles but with significant inconsistencies. Key issues include:

1. **Blurred boundaries** between `features/` and `infrastructure/`
2. **Duplicate functionality** across layers (analytics, realtime, community)
3. **Inconsistent module organization** within features
4. **Unclear separation** between `lib/` and other layers
5. **Export conflicts** and circular dependencies

---

## 1. Architecture Overview

### Current Structure

```
client/src/
├── app/              # Application shell (providers, routing)
├── features/         # Business features (29 feature modules)
├── infrastructure/   # Technical infrastructure (31 modules)
├── lib/              # Shared UI, utilities, types (22 subdirectories)
├── __tests__/        # Test suites
├── tests/            # Additional test directories
└── scripts/          # Build and migration scripts
```

### Intended Architecture (FSD)

- **app/**: Application initialization and providers
- **features/**: Business logic and domain features
- **infrastructure/**: Technical concerns (API, auth, monitoring)
- **lib/**: Shared UI components, design system, utilities

---

## 2. Major Inconsistencies

### 2.1 Feature vs Infrastructure Overlap

**Problem:** Several domains exist in BOTH `features/` and `infrastructure/` with unclear boundaries.

#### Analytics Duplication

**Infrastructure:**
- `infrastructure/analytics/` - Core analytics tracking, providers
  - `service.ts`, `comprehensive-tracker.ts`
  - `AnalyticsProvider.tsx`, `AnalyticsIntegration.tsx`
  - Re-exports from features layer

**Features:**
- `features/analytics/` - Analytics feature module
  - `hooks/`, `model/`, `services/`, `ui/`
  - Business logic for analytics

**Issue:** `infrastructure/analytics/index.ts` re-exports from `features/analytics/`, creating circular dependency risk. Infrastructure should not depend on features.

**Recommendation:**
- Move core analytics tracking to `infrastructure/analytics/`
- Keep analytics UI and business logic in `features/analytics/`
- Remove re-exports from infrastructure → features

---

#### Realtime/WebSocket Duplication

**Infrastructure:**
- `infrastructure/realtime/` - WebSocket infrastructure
  - `manager.ts`, `websocket-client.ts`, `hub.ts`
  - Core services: `realtime-service.ts`, `bill-tracking.ts`, `community.ts`
  - Hooks: `use-websocket.ts`, `use-bill-tracking.ts`

**Features:**
- `features/realtime/` - Realtime feature
  - Only contains `model/realtime-optimizer.ts`
  - Minimal content

**Issue:** Most realtime functionality is correctly in infrastructure, but `features/realtime/` exists with minimal purpose.

**Recommendation:**
- Keep core WebSocket infrastructure in `infrastructure/realtime/`
- Move `realtime-optimizer.ts` to infrastructure or remove feature module
- Consider if realtime needs a feature layer at all

---

#### Community Duplication

**Infrastructure:**
- `infrastructure/community/` - Core community infrastructure
  - `hooks/`: `useUnifiedCommunity.ts`, `useUnifiedDiscussion.ts`, `useRealtime.ts`
  - `services/`: `websocket-manager.ts`, `moderation.service.ts`, `state-sync.service.ts`
  - Unified types

**Features:**
- `features/community/` - Community feature
  - `hooks/`: `useCommunity.ts`, `useDiscussion.ts`, `useCommunityIntegration.ts`
  - `services/`: `backend.ts`
  - `ui/`: Multiple UI components
  - `pages/`: Community pages

**Issue:** Duplicate hooks with similar names (`useCommunity` vs `useUnifiedCommunity`). Unclear which to use.

**Recommendation:**
- Infrastructure should provide low-level WebSocket/state management
- Features should provide business logic and UI
- Consolidate hooks - avoid "unified" vs non-unified naming

---

### 2.2 Auth Duplication

**Infrastructure:**
- `infrastructure/auth/` - Well-organized auth infrastructure
  - `config/`, `constants/`, `errors/`, `hooks/`, `http/`, `services/`, `store/`, `utils/`
  - Comprehensive auth system

**Features:**
- `features/auth/` - Only contains `pages/`
  - Auth UI pages (login, register, forgot password)

**Assessment:** This is CORRECT separation. Infrastructure handles auth logic, features handle UI.

---

### 2.3 API Layer Confusion

**Infrastructure:**
- `infrastructure/api/` - API client infrastructure
  - `client.ts`, `interceptors.ts`, `retry.ts`, `circuit-breaker/`
  - Domain-specific API files: `auth.ts`, `bills.ts`, `community.ts`, `analytics.ts`
  - `services/`: `bill.service.ts`, `user.service.ts`
  - `hooks/`: API hooks

**Features:**
- `features/api/` - Only contains `pages/api-access.tsx`

**Issue:** Domain-specific API logic (bills, community) in infrastructure layer. Should these be in feature modules?

**Recommendation:**
- Keep generic API client in `infrastructure/api/`
- Move domain-specific API services to respective feature modules
- Example: `infrastructure/api/bills.ts` → `features/bills/services/api.ts`

---

### 2.4 Navigation Duplication

**Infrastructure:**
- `infrastructure/navigation/` - Extensive navigation infrastructure
  - 20+ files including hooks, context, analytics, breadcrumbs, route validation

**Features:**
- `features/navigation/` - Only contains `model/index.ts` (empty or minimal)

**Assessment:** Navigation is correctly in infrastructure. Feature module is unnecessary.

---

### 2.5 Search Duplication

**Infrastructure:**
- `infrastructure/search/` - Search infrastructure
  - `search-strategy-selector.ts`, `UnifiedSearchInterface.tsx`

**Features:**
- `features/search/` - Complete search feature
  - `hooks/`, `services/`, `ui/`, `pages/`
  - `intelligent-search.ts`, `streaming-search.ts`

**Issue:** Unclear why search has both infrastructure and feature layers.

**Recommendation:**
- If search is a business feature, keep in `features/search/`
- Move `infrastructure/search/` components to feature layer
- Or clarify: infrastructure = search engine, features = search UI

---

### 2.6 Security Duplication

**Infrastructure:**
- `infrastructure/security/` - Comprehensive security infrastructure
  - `config/`, `headers/`, `ui/`, `unified/`
  - CSP, CSRF, rate limiting, input sanitization

**Features:**
- `features/security/` - Security feature
  - `hooks/useSecurity.ts`
  - `pages/SecurityDemoPage.tsx`

**Assessment:** Mostly correct. Infrastructure handles security mechanisms, features handle security UI/demos.

---

## 3. Lib Layer Issues

### 3.1 Unclear Purpose

The `lib/` directory contains a mix of:
- UI components (`lib/ui/`)
- Design system (`lib/design-system/`)
- Utilities (`lib/utils/`)
- Types (`lib/types/`)
- Hooks (`lib/hooks/`)
- Services (`lib/services/`)
- Context (`lib/context/`, `lib/contexts/`)
- Testing (`lib/testing/`)
- Demo data (`lib/demo/`, `lib/stubs/`)
- Examples (`lib/examples/`)
- Pages (`lib/pages/`)

**Issue:** `lib/` has become a catch-all for shared code, blurring its purpose.

### 3.2 Duplicate Context Directories

- `lib/context/`
- `lib/contexts/`

**Recommendation:** Consolidate to single `lib/contexts/` directory.

### 3.3 Pages in Lib

`lib/pages/` exists alongside feature pages. Pages should be in features or app layer, not lib.

### 3.4 Services in Lib

`lib/services/` contains shared services. Should these be in infrastructure?

**Recommendation:**
- Keep only UI-related utilities in `lib/`
- Move technical services to `infrastructure/`
- Move business services to `features/`

---

## 4. Feature Module Inconsistencies

### 4.1 Inconsistent Internal Structure

Features have varying internal organization:

**Well-structured (FSD-compliant):**
```
features/bills/
├── model/        # Business logic
├── services/     # Data services
├── ui/           # UI components
├── pages/        # Page components
├── hooks.ts      # Feature hooks
├── types.ts      # Feature types
└── index.ts      # Public API
```

**Minimal structure:**
```
features/realtime/
└── model/
    └── realtime-optimizer.ts
```

**Flat structure:**
```
features/advocacy/
├── ElectoralPressure.tsx
└── index.tsx
```

**Recommendation:** Standardize feature structure:
```
features/<feature>/
├── model/        # Business logic, state management
├── services/     # API calls, data fetching
├── ui/           # UI components
├── pages/        # Page-level components
├── hooks/        # Feature-specific hooks (optional)
├── types.ts      # Feature types
└── index.ts      # Public exports
```

---

### 4.2 Missing Feature Modules

Some features exist only as pages without proper feature structure:
- `features/api/` - Only has `pages/api-access.tsx`
- `features/civic/` - Only has `pages/civic-education.tsx`
- `features/sitemap/` - Only has `pages/sitemap.tsx`
- `features/status/` - Only has `pages/system-status.tsx`

**Recommendation:** Either expand to full features or move pages to appropriate existing features.

---

## 5. Export and Dependency Issues

### 5.1 Circular Dependencies

**Infrastructure → Features:**
```typescript
// infrastructure/analytics/index.ts
export { useAnalyticsDashboard } from '@client/features/analytics/hooks/useAnalytics';
export { default as AnalyticsDashboard } from '@client/features/analytics/ui/dashboard/AnalyticsDashboard';
```

**Issue:** Infrastructure layer depends on features layer, violating FSD principles.

### 5.2 Conflicting Exports

From `features/index.ts`:
```typescript
// Bills Features - selective exports to avoid conflicts
export { 
  BillCard,
  BillList,
  BillHeader,
  useBills,
  // BillAnalysis, BillsPage, BillDetailPage, useBillDetail, useTrackBill excluded due to conflicts
} from './bills';
```

**Issue:** Export conflicts indicate naming collisions or duplicate implementations.

### 5.3 Re-export Chains

Multiple layers of re-exports create complex dependency chains:
```
lib/hooks/useAnalytics.ts → features/analytics/hooks/useAnalytics.ts
infrastructure/analytics/index.ts → features/analytics/hooks/useAnalytics.ts
```

**Recommendation:** Reduce re-export chains. Import directly from source.

---

## 6. Test Organization Issues

### 6.1 Multiple Test Directories

- `client/src/__tests__/` - Strategic and unit tests
- `client/src/tests/` - Accessibility and performance tests
- Feature-specific tests within feature directories

**Recommendation:** Consolidate test organization:
- Keep unit tests co-located with features
- Move integration tests to `__tests__/integration/`
- Keep strategic tests in `__tests__/strategic/`

---

## 7. Migration and Cleanup Evidence

### 7.1 Migration Scripts

`client/src/scripts/` contains multiple migration scripts:
- `fsd-migration.ts`
- `consolidate-websocket-migration.ts`
- `migrate-components.ts`
- `validate-migration.ts`

**Observation:** Active migration to FSD architecture is in progress.

### 7.2 Documentation

Multiple documentation files indicate ongoing consolidation:
- `infrastructure/CONSOLIDATION_SUMMARY.md`
- `infrastructure/MIGRATION_GUIDE.md`
- Various README files

---

## 8. Recommendations Summary

### Priority 1: Critical Architectural Issues

1. **Remove infrastructure → features dependencies**
   - Move shared code to infrastructure
   - Remove re-exports from infrastructure to features

2. **Consolidate duplicate modules**
   - Resolve analytics duplication
   - Clarify community hooks (unified vs non-unified)
   - Remove unnecessary feature modules (realtime, navigation)

3. **Clarify lib/ purpose**
   - Keep only: UI components, design system, shared utilities, types
   - Move services to infrastructure
   - Move pages to features or app

### Priority 2: Consistency Improvements

4. **Standardize feature structure**
   - Apply consistent internal organization
   - Expand minimal features or remove them

5. **Consolidate test organization**
   - Single test strategy across codebase

6. **Clean up exports**
   - Resolve naming conflicts
   - Reduce re-export chains
   - Document public APIs

### Priority 3: Long-term Improvements

7. **Domain-driven organization**
   - Move domain-specific API code to features
   - Group related functionality

8. **Documentation**
   - Architecture decision records (ADRs)
   - Module dependency map
   - Public API documentation

---

## 9. Dependency Flow (Current vs Ideal)

### Current (Problematic)
```
app → features ⟷ infrastructure ⟷ lib
      ↑____________↓
```

### Ideal (FSD)
```
app → features → infrastructure → lib
```

**Rules:**
- `app` can import from any layer
- `features` can import from `infrastructure` and `lib`
- `infrastructure` can import from `lib` only
- `lib` has no internal dependencies on other layers

---

## 10. Action Items

### Immediate Actions

- [ ] Audit all infrastructure → features imports
- [ ] Create dependency graph visualization
- [ ] Document intended architecture in ADR
- [ ] Freeze new feature development until architecture is clarified

### Short-term Actions (1-2 weeks)

- [ ] Refactor analytics module (remove circular deps)
- [ ] Consolidate community hooks
- [ ] Clean up lib/ directory
- [ ] Standardize feature structure for top 5 features

### Medium-term Actions (1-2 months)

- [ ] Complete FSD migration
- [ ] Remove all circular dependencies
- [ ] Implement dependency linting rules
- [ ] Update all documentation

---

## Conclusion

The `client/src` folder shows evidence of an ongoing migration to Feature-Sliced Design but has significant consistency issues. The primary problems are:

1. Blurred boundaries between layers (especially infrastructure ⟷ features)
2. Duplicate functionality across layers
3. Unclear purpose of the lib/ directory
4. Inconsistent feature module organization

These issues create maintenance challenges, increase cognitive load, and risk circular dependencies. A focused effort to clarify architectural boundaries and complete the FSD migration is recommended.
