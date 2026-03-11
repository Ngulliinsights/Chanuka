# Strategic Client Consolidation Plan

Eliminate 16+ duplicate file groups across the client by designating canonical locations, merging functionality, and enforcing ADR conventions (especially ADR-011, ADR-012, ADR-013, ADR-016).

## User Review Required

> [!IMPORTANT]
> This plan covers **16 consolidation moves**. Each "move" is a delete-or-redirect, not new code. The largest functional merge is ErrorBoundary (5 → 2). All other duplicates already have one clearly superior version.

> [!WARNING]
> Several files are re-exports that already point to the correct canonical (`cn.ts`, `lib/hooks/use-safe-query`). These are **intentionally kept** as convenience re-exports per FSD convention, not treated as duplicates.

---

## Proposed Changes

### Group A — Hooks & Query Layer

#### 1. `use-safe-query.ts` (3 copies → 1 canonical + 1 re-export)

| Copy | Lines | Role |
|------|-------|------|
| `infrastructure/api/hooks/use-safe-query.ts` | 320 | **CANONICAL** — full implementation (race-condition prevention, `useAdminQuery`, `useCoordinatedQueries`) |
| `lib/hooks/use-safe-query.ts` | 11 | **KEEP** — convenience re-export pointing to canonical |
| `features/pretext-detection/hooks/use-safe-query.ts` | 1 | **DELETE** — empty stub [() => ({})](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/realtime/client.ts#94-101), broken |

**Merge strategy:** Delete the pretext-detection stub. If pretext-detection imports it, update to import from `@client/infrastructure/api/hooks/use-safe-query`.

---

#### 2. `useOnboarding.ts` (2 copies → 1)

| Copy | Location |
|------|----------|
| `features/onboarding/hooks/useOnboarding.ts` | **CANONICAL** — onboarding is its own feature module |
| `features/users/hooks/useOnboarding.ts` | **DELETE** — cross-feature leak |

**Merge strategy:** Check if users-version has any unique functionality (e.g., user-specific onboarding state). If so, merge into the onboarding feature. Redirect imports.

---

#### 3. [use-constitutional-analysis.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/constitutional-intelligence/hooks/use-constitutional-analysis.ts) (2 copies → 1)

| Copy | Location |
|------|----------|
| `features/constitutional-intelligence/hooks/use-constitutional-analysis.ts` | **CANONICAL** — this is the domain owner |
| `features/legal/hooks/use-constitutional-analysis.ts` | **DELETE** — cross-feature leak |

**Merge strategy:** Merge any legal-specific extras (if any) then redirect imports.

---

### Group B — Error Handling (5 ErrorBoundary variants → 2)

Per ADR-014 (Result types for errors) and the existing error restructure:

| Variant | Lines | Unique Feature | Decision |
|---------|-------|----------------|----------|
| `infrastructure/error/ErrorBoundary.tsx` | 822 | Recovery options, metrics, feedback, `EnhancedErrorFallback` | **CANONICAL** — rename to `ErrorBoundary.tsx` (keep location) |
| `infrastructure/error/UnifiedErrorBoundary.tsx` | 352 | Circuit breaker integration, correlation IDs | **MERGE** into canonical — add circuit breaker stats to canonical `ErrorBoundary` |
| `infrastructure/error/SimpleErrorBoundary.tsx` | 84 | Lightweight, uses `SharedErrorDisplay` | **KEEP** — legitimate lightweight variant for leaf components |
| `infrastructure/error/CommunityErrorBoundary.tsx` | ~100 | Community-domain-specific | **KEEP** — community-domain variant references community error handlers |
| `lib/ui/error-boundary/ErrorBoundary.tsx` | 253 | `withErrorBoundary` HOC, `createErrorBoundary` utility, `resetKeys` | **MERGE** → move `withErrorBoundary` and `createErrorBoundary` into canonical, then **DELETE** |

**Merge strategy:**
1. Add `withErrorBoundary()`, `createErrorBoundary()`, and `resetKeys` prop from `lib/ui/` version to the canonical `infrastructure/error/ErrorBoundary.tsx`
2. Add circuit breaker stats display from `UnifiedErrorBoundary` into the canonical version
3. Delete `UnifiedErrorBoundary.tsx` and `lib/ui/error-boundary/ErrorBoundary.tsx`
4. Keep `SimpleErrorBoundary.tsx` and `CommunityErrorBoundary.tsx`
5. Update all imports

---

### Group C — Security Layer (per ADR-012)

#### 4. [rate-limiter.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/rate-limiter.ts) (3 copies → 1)

| Copy | Lines | Purpose |
|------|-------|---------|
| [infrastructure/security/rate-limiter.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/rate-limiter.ts) | 502 | **CANONICAL** — full client-side rate limiter with fetch interception, form/button/search limiting, security event reporting, singleton instance |
| `infrastructure/security/unified/rate-limiter.ts` | 122 | Simplified version implementing `SecurityComponent` interface — **MERGE** the `SecurityComponent`/health/metrics interface into canonical, then **DELETE** |
| `infrastructure/error/rate-limiter.ts` | 105 | Error-specific rate limiter (`ErrorRateLimiter`) — **KEEP** as `ErrorRateLimiter` (different concern: limiting error floods, not API requests) but **RENAME** to [error-rate-limiter.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/error/error-rate-limiter.ts) for clarity |

**Merge strategy:** Make [infrastructure/security/rate-limiter.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/rate-limiter.ts) implement `SecurityComponent` interface. Move `ErrorRateLimiter` into [infrastructure/error/error-rate-limiter.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/error/error-rate-limiter.ts).

---

#### 5. [input-sanitizer.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/input-sanitizer.ts) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [infrastructure/security/input-sanitizer.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/input-sanitizer.ts) | **CANONICAL** |
| `infrastructure/security/unified/input-sanitizer.ts` | **DELETE** — merge any unique sanitization rules into parent |

---

#### 6. [security-monitor.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/security-monitor.ts) / [security-monitoring.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/.tmp_recover/security-monitoring.ts) (2 → 1)

Both in `infrastructure/security/`. **Merge** into [security-monitor.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/security-monitor.ts) (noun form is standard per ADR-016). Delete [security-monitoring.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/.tmp_recover/security-monitoring.ts).

---

### Group D — Caching (per ADR-013)

#### 7. [cache-manager.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/cache-manager.ts) (2 copies → 2 kept, renamed for clarity)

| Copy | Lines | Purpose |
|------|-------|---------|
| [infrastructure/api/cache-manager.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/cache-manager.ts) | 670 | `ApiCacheManager` — API response caching with TTL, eviction, storage | **KEEP** — rename nothing, it's correctly placed for API caching |
| [infrastructure/storage/cache-manager.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/storage/cache-manager.ts) | 482 | `CacheInvalidationManager` — general cache invalidation with tags, dependencies, events | **KEEP** — rename to `cache-invalidation-manager.ts` for clarity |

These are **not duplicates** — they serve different concerns. The API version caches API responses; the storage version manages invalidation patterns. Rename storage version to disambiguate.

---

### Group E — UI Components

#### 8. [ActivityFeed.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/ui/ActivityFeed.tsx) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [features/community/ui/activity/ActivityFeed.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/community/ui/activity/ActivityFeed.tsx) | **CANONICAL** — community is the domain owner of activity feeds |
| [features/collaboration/ui/ActivityFeed.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/ui/ActivityFeed.tsx) | **DELETE** — if it has collaboration-specific props, extract those into the canonical version |

---

#### 9. [ChanukaIcons.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/users/ui/icons/ChanukaIcons.tsx) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [features/users/ui/icons/ChanukaIcons.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/users/ui/icons/ChanukaIcons.tsx) | **MOVE** to `lib/design-system/icons/ChanukaIcons.tsx` — icons are shared UI, not feature-specific |
| [infrastructure/security/ui/icons/ChanukaIcons.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/ui/icons/ChanukaIcons.tsx) | **DELETE** |

---

#### 10. [OnboardingTrigger.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/app/OnboardingTrigger.tsx) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [features/onboarding/components/OnboardingTrigger.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/onboarding/components/OnboardingTrigger.tsx) | **CANONICAL** — the feature owns its components |
| [app/OnboardingTrigger.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/app/OnboardingTrigger.tsx) | **CONVERT** to re-export: `export { OnboardingTrigger } from '@client/features/onboarding/components/OnboardingTrigger'` |

---

#### 11. Design System Internal Duplicates

| File | `feedback/` | `interactive/` | Decision |
|------|-------------|-----------------|----------|
| [separator.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/design-system/feedback/separator.tsx) | ✅ KEEP | DELETE | Separators are feedback/dividers, not interactive |
| [skeleton.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/design-system/feedback/skeleton.tsx) | ✅ KEEP | DELETE | Skeletons are loading feedback, not interactive |

Add re-exports from `interactive/index.ts` if needed for backward compatibility.

---

### Group F — Cross-Cutting Utilities

#### 12. `cn.ts` (2 copies → already correct)

- `lib/utils/cn.ts` — **CANONICAL** (12 lines, actual implementation)
- `lib/design-system/utils/cn.ts` — **KEEP** (re-export, 1 line: `export { cn } from '@client/lib/utils/cn'`)

**No action needed.** This is already correctly structured as a re-export.

---

#### 13. [roleGuard.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/roleGuard.ts) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [infrastructure/roleGuard.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/roleGuard.ts) | **CANONICAL** — infrastructure owns auth/access-control |
| `lib/ui/navigation/core/roleGuard.ts` | **DELETE** or convert to re-export |

---

### Group G — Type System (per ADR-011)

#### 14. [auth-types.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/types/bill/auth-types.ts) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [infrastructure/api/types/auth-types.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/types/auth-types.ts) | **CANONICAL** — API auth types belong with API infrastructure |
| [lib/types/bill/auth-types.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/types/bill/auth-types.ts) | **DELETE** — auth types have no business being inside bill types |

Merge any unique types from the bill version into the canonical, then redirect imports.

---

#### 15. [notification-service.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/services/notification-service.ts) (2 copies → 1)

| Copy | Location | Decision |
|------|----------|----------|
| [features/notifications/model/notification-service.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/notifications/model/notification-service.ts) | **CANONICAL** — feature owns its service |
| [lib/services/notification-service.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/services/notification-service.ts) | **DELETE** or convert to re-export |

---

### Group H — Naming Convention Fixes (per ADR-016)

#### 16. Offline detection hook naming

| File | Convention | Decision |
|------|-----------|----------|
| `lib/hooks/use-offline-detection.ts` | kebab-case ✅ | **KEEP** — kebab-case is the convention for hook files |
| `lib/hooks/useOfflineDetection.ts` | camelCase ❌ | **DELETE** or convert to re-export |

#### 17. Validation files

| File | Decision |
|------|----------|
| [infrastructure/validation/validator.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/validation/validator.ts) | **CANONICAL** |
| `infrastructure/validation/validators.ts` | **MERGE** into [validator.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/validation/validator.ts), then **DELETE** |

---

## Naming Convention Summary (per ADR-016)

| Element | Convention | Example |
|---------|-----------|---------|
| Hook files | kebab-case | `use-safe-query.ts` |
| Component files | PascalCase | `ErrorBoundary.tsx` |
| Service class files | PascalCase | `NotificationsService.ts` |
| Utility files | kebab-case | [rate-limiter.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/rate-limiter.ts) |
| Type files | kebab-case | [auth-types.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/lib/types/bill/auth-types.ts) |
| Class names | PascalCase, no "Enhanced/Unified" prefix | [RateLimiter](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/security/security-utils.ts#284-313), not `UnifiedRateLimiter` |
| Exported instances | camelCase | `clientRateLimiter` |

---

## Verification Plan

### Automated Tests

There are existing test files that should be used to verify no regressions:

```bash
# Run the full client test suite to check for broken imports
cd client && npx vitest run --reporter=verbose 2>&1 | head -100

# Check TypeScript compilation for import errors
cd client && npx tsc --noEmit 2>&1 | head -100

# Verify no remaining duplicate file names (post-consolidation)
fd -t f --full-path "client/src" | xargs -I{} basename {} | sort | uniq -d
```

Specific existing test files to validate:
- `infrastructure/navigation/NavigationConsistency.test.tsx` — navigation/roleGuard integration
- `infrastructure/api/__tests__/websocket-client.test.ts` — API layer 
- `features/notifications/__tests__/notification-service.test.ts` — notification service

### Phase 4 — State Management & Component Consolidation
1. **Component Consolidation: [ActivityFeed](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/ui/ActivityFeed.tsx#20-72)**
   - We have [features/collaboration/ui/ActivityFeed.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/ui/ActivityFeed.tsx) (stub) and [features/community/ui/activity/ActivityFeed.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/community/ui/activity/ActivityFeed.tsx) (robust, canonical).
   - *Plan*: Refactor [features/collaboration/pages/WorkspaceDetailPage.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/pages/WorkspaceDetailPage.tsx) to use the canonical [ActivityFeed](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/ui/ActivityFeed.tsx#20-72). Adjust types if necessary.
   - *Plan*: Delete [features/collaboration/ui/ActivityFeed.tsx](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/collaboration/ui/ActivityFeed.tsx).

2. **State Management: WebSocket Legacy Manager**
   - The legacy `WebSocketManager` in [infrastructure/api/websocket/manager.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/websocket/manager.ts) was retained for backwards compatibility, but it overlaps with [UnifiedRealtimeClient](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/realtime/client.ts#26-311) and [UnifiedWebSocketClient](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/websocket/client.ts#30-426).
   - *Consumers*: [useRealtime.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/community/hooks/useRealtime.ts), [useUnifiedDiscussion.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/features/community/hooks/useUnifiedDiscussion.ts), [state-sync.service.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/community/services/state-sync.service.ts).
   - *Plan*: Investigate migrating these to `realTimeService` / [UnifiedRealtimeClient](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/realtime/client.ts#26-311) to fully deprecate and delete [websocket/manager.ts](file:///c:/Users/Access%20Granted/Downloads/projects/SimpleTool/client/src/infrastructure/api/websocket/manager.ts).

### Manual Verification

After each group of changes is committed:
1. **Run `npx tsc --noEmit`** from `client/` to verify zero TypeScript errors
2. **Run `npx vitest run`** to verify existing tests still pass
3. **Grep for orphaned imports** referencing deleted file paths:
   ```bash
   ```bash
   grep -r "from.*<deleted-path>" client/src/ --include="*.ts" --include="*.tsx"
   ```

### Phase 5 — Comprehensive TypeScript Error Resolution

After consolidating the architecture and removing duplicate legacy code, the client still has ~2700 pre-existing TypeScript errors. To establish a stable baseline, we must resolve these errors systematically, prioritizing foundational layers first to prevent cascading issues.

**Error Distribution:**
- `features/`: ~1218 errors (bills: 403, community: 257, analytics: 245)
- `lib/`: ~586 errors (ui: 225, hooks: 118, components: 82)
- `infrastructure/`: ~533 errors (auth: 114, api: 113, store: 83)

**Execution Strategy (Bottom-Up Approach):**

1. **Step 1: Core Types & Infrastructure (~533 errors)**
   - Fix `infrastructure/api/` (113 errors) — resolve HTTP/WebSocket client types, interceptors, and request definitions.
   - Fix `infrastructure/auth/` (114 errors) — resolve authentication state, tokens, permissions, and guard types.
   - Fix `infrastructure/store/` (83 errors) — resolve Redux slice types, root state, and action payloads.

2. **Step 2: Shared UI & Library Utilities (~586 errors)**
   - Fix `lib/ui/` (225 errors) — resolve core component prop types, design system interfaces, and refs.
   - Fix `lib/hooks/` (118 errors) — resolve generic type parameters, query keys, and return types for shared hooks.
   - Fix `lib/components/` (82 errors) — resolve shared component logic and prop drilling.

3. **Step 3: Feature Modules (~1218 errors)**
   - Fix `features/bills/` (403 errors) — resolve bill models, API responses, and specific UI component props.
   - Fix `features/community/` (257 errors) — resolve comments, threads, discussions, and moderation types.
   - Fix `features/analytics/` (245 errors) — resolve metric data shapes, chart props, and reporting structures.

4. **Step 4: Application Glue & Tests**
   - Resolve remaining errors in `App.tsx`, routing configuration, and higher-order pages.
   - Re-enable and fix failing tests (`vitest`) affected by type changes.

**Methodology:**
- We will fix one domain at a time, running `tsc --noEmit` frequently to monitor actual progress against the cascade.
- **Do not use `any` or `@ts-ignore`** unless strictly necessary for third-party library boundaries. Prefer `unknown` and actual interface definitions.
