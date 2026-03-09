# Central Migration & Change Log

This document serves as the **Single Source of Truth** for architectural changes, migrations, and critical system updates in the Chanuka codebase. 

**Goal:** Prevent regression, incomplete migrations, and "ghost code" by tracking the *actual* status of major changes.

---

## 🚦 Active Migrations
*List currently active migrations here. If you start a new migration, add it here.*

| Migration | Status | Owner | Core Links | Notes |
|-----------|--------|-------|------------|-------|
| **Documentation Reorganization** | 🟡 In Progress | @User | [Plan](../DOCUMENTATION_REMEDIATION_PLAN.md) | Phase 1 complete (root cleanup). Phase 2-4 pending. |
| **Bills Feature Server Startup** | 🟢 Complete | @Kiro | [Summary](../../server/features/bills/IMPLEMENTATION_COMPLETE.md) | Fixed imports, created mock data, server running on port 4200. |
| **Error System Restructure** | 🟢 Complete | @User | [History](../../client/src/infrastructure/error/MIGRATION_HISTORY.md) | Moved to core/patterns/integration/recovery structure. |


---

## 🏆 Recent Architectural Decisions
*Log key decisions that affect how code should be written going forward.*

### [2026-03-09] Bills Feature Complete - Client-Server Congruence at 100%
- **Context:** Bills feature had 11 missing server endpoints causing client API calls to fail. Server startup was broken due to import errors and missing mock data files.
- **Decision:**
    1. **Fixed Server Startup Issues:**
       - Corrected `bill-storage.ts` imports (schema tables, database types, logger context)
       - Created `translation-mock-data.ts` for plain-language translation service
       - Created `impact-mock-data.ts` for personal impact calculator
       - Updated import paths in translation and impact calculator services
    2. **Implemented 11 Missing Endpoints:**
       - Public: categories, statuses, sponsors, analysis, polls (GET)
       - Protected: track, untrack, engagement, vote, endorse, create poll (POST)
    3. **Added Route Aliases:** 4 sponsorship route aliases for backward compatibility
    4. **Server Configuration:** Runs on port 4200 as requested
    5. **Testing:** Live HTTP endpoint verification with curl, all 11 endpoints operational
- **Consequences:**
    - Client-server congruence: 69% → 100%
    - Server starts successfully without errors
    - All authentication, validation, and error handling working
    - Mock data pattern established for development (infrastructure/mocks/)
    - Ready for client integration
- **Architecture Pattern:**
    - Mock data lives in `infrastructure/mocks/` not `services/mocks/`
    - Services import from `../infrastructure/mocks/` for consistency
    - Translation and impact services use mock data until AI integration ready

### [2026-03-09] Natural Branching Architecture Validation
- **Context:** Review of codebase architecture patterns against nature-inspired efficiency principles.
- **Validation:**
    1. **Layered Architecture:** Mimics tree rings/lung alveoli (root → branches → leaves)
    2. **Circuit Breaker:** Mimics blood vessel constriction/dilation (CLOSED → OPEN → HALF_OPEN)
    3. **Exponential Backoff:** Mimics breathing rhythm adjustment (quick → slower with jitter)
    4. **Caching:** Mimics oxygen storage in hemoglobin (instant delivery of stored data)
    5. **Middleware Pipeline:** Mimics respiratory filtration (nose → mucus → cilia → alveoli)
    6. **Feature Isolation:** Mimics organ systems (specialized but interconnected)
    7. **Error Propagation:** Mimics pain signals (local → spinal cord → brain)
    8. **Health Monitoring:** Mimics homeostasis (constant monitoring and adjustment)
- **Consequences:**
    - Architecture follows universal patterns proven by nature
    - Fractal design: same patterns repeat at different scales
    - Efficient resource distribution and fault tolerance
    - Intuitive for developers (mirrors natural systems)

### [2026-03-06] Type System Cleanup Complete
- **Context:** Type definitions were scattered across `@types`, local `types.ts`, and `shared`. Import conflicts and duplicate definitions caused type errors.
- **Decision:**
    1. Removed `@types` directory - no longer exists
    2. Established `lib/types` as single source of truth for shared types
    3. Feature modules maintain local `types.ts` for feature-specific extensions
    4. Fixed duplicate constant exports (ANALYSIS_OPTIONS, FALLACY_SEVERITY) in shared/constants
    5. Fixed unterminated string literals in client/src/lib/hooks/index.ts
    6. Completed incomplete onboarding-analytics.tsx file
    7. Updated server tsconfig.json ignoreDeprecations from "6.0" to "5.0"
- **Consequences:**
    - Zero type conflicts across codebase
    - Clear separation: shared types in lib/types, feature-specific in feature/types.ts
    - All packages (shared, client, server) pass type-check
    - Unblocks all downstream development work

### [2026-03-06] Documentation Structure Reorganization
- **Context:** Docs root had 50+ files making it difficult to find current documentation. Historical completion reports mixed with living documents.
- **Decision:** 
    1. Keep only 8 strategic entry points in docs root
    2. Archive historical completion reports to `docs/archive/2026-03-root-cleanup/`
    3. Move feature guides to `docs/features/`
    4. Move development guides to `docs/guides/`
    5. Move technical docs to `docs/technical/`
    6. Move chanuka brand/narrative to `docs/chanuka/`
- **Consequences:**
    - 84% reduction in root clutter (50+ → 8 files)
    - Clear separation between living and historical docs
    - Better discoverability for developers
    - Update links when referencing moved documents

### [2026-03-06] Error Infrastructure Restructure
- **Context:** Error handling files were flat in `infrastructure/error/` with unclear organization.
- **Decision:** Restructure into logical subdirectories:
    1. `core/` - Factory, handler, types
    2. `patterns/` - Result monad pattern
    3. `integration/` - React Query integration
    4. `recovery/` - Auth and user action recovery
- **Consequences:**
    - Clearer organization and discoverability
    - Better separation of concerns
    - Import paths updated to new structure

### [2026-01-27] Type System Strategy (Centralized Definitions, Module-Scoped Exports)
- **Context:** Type definitions were scattered and duplicated (`@types`, local `types.ts`, `shared`).
- **Decision:**
    1. **Single Source of Truth:** All domain and shared types live in `client/src/lib/types` (or `shared` for server-common).
    2. **Module Bridges:** Core modules (`core/storage`, `core/security`) MUST maintain their own `types.ts` or `index.ts` that re-exports from `lib/types`.
    3. **No Direct Deep Imports:** Consumers should import from the Module (e.g., `@client/infrastructure/storage`), NOT deeply into `lib/types` if possible, to respect module boundaries.
- **Consequences:**
    - `core/*/types.ts` files are converted to proxies (re-exports).
    - Local type definitions in `core` are moved to `lib/types`.
    - Mock data must import from `lib/types` (or the module proxy).

---

## 📜 Migration History
*Move items here from "Active Migrations" once `_COMPLETE.md` verification is done.*

| Date | Migration | Outcome | Archive Link |
|------|-----------|---------|--------------|
| 2026-03-09 | Bills Feature Server Startup & Endpoint Implementation | ✅ Complete | [Summary](../../server/features/bills/IMPLEMENTATION_COMPLETE.md), [Tests](../../server/features/bills/__tests__/LIVE_TEST_RESULTS.md) |
| 2026-03-06 | Type System Cleanup | ✅ Complete | No @types conflicts. lib/types is single source of truth. Feature modules use local types.ts for feature-specific extensions. |
| 2026-03-06 | Documentation Root Cleanup (Phase 1) | ✅ Complete | [Archive](../archive/2026-03-root-cleanup/) |
| 2026-03-06 | Error Infrastructure Restructure | ✅ Complete | [History](../../client/src/infrastructure/error/MIGRATION_HISTORY.md) |
| 2026-02-27 | Notification System Consolidation | ✅ Complete | [Guide](../features/NOTIFICATION_SYSTEM_CONSOLIDATION.md) |
| 2026-01-27 | Search Module Refactor (Phase 2C) | ✅ Complete | Types consolidated to `lib/types/search.ts` |
| 2026-01-27 | Analytics Module Refactor (Phase 2D) | ✅ Complete | Privacy types consolidated to `lib/types/analytics.ts` |

## 🗳️ Legacy Migration Archive
*Index of archived planning and report files moved from root.*

| Category | Description | Folder Link |
|----------|-------------|-------------|
| **Phase Reports** | Tracking for Phases 1-4, R4, etc. | [Legacy Migrations](./archive/legacy_migrations/) |
| **Conflict Resolution** | Reports on drift and conflict analysis | [Legacy Migrations](./archive/legacy_migrations/) |
| **Type System** | Type governance and audit logs | [Legacy Migrations](./archive/legacy_migrations/) |
| **Architecture** | Old architecture overviews and options | [Legacy Migrations](./archive/legacy_migrations/) |
| **Infrastructure** | Audits and quick references | [Legacy Migrations](./archive/legacy_migrations/) |


---

## ⚠️ Anti-Patterns & Regressions (Do's and Don'ts)
*Add items here when you find a recurring regression or mistake.*

- **DO NOT** import server-only code (e.g., `shared/core/observability`) into client components.
- **DO** use the unified `API` client in `client/src/infrastructure/api` instead of direct `fetch` calls.
- **DO NOT** create ad-hoc types; check `lib/types` or `shared/types` first.
- **DO NOT** export enums using `export type`; export them as values if used at runtime.
- **DO** import from module entry points (`@client/infrastructure/storage`), not deeply into `lib/types`.
- **DO NOT** create completion report files (e.g., `PHASE_X_COMPLETE.md`) in docs root - archive them immediately to `docs/archive/`.
- **DO NOT** delete strategic tracking documents like MIGRATION_LOG.md without ensuring functionality is preserved elsewhere.
- **DO** update MIGRATION_LOG.md when starting or completing migrations to maintain critical path visibility.
- **DO** place mock data in `infrastructure/mocks/` not `services/mocks/` for consistency.
- **DO** import mock data from `../infrastructure/mocks/` in service files.
- **DO** test server startup after fixing imports - use `npm run dev` to verify.
- **DO** verify all endpoints with live HTTP tests (curl) before marking complete.
- **DO NOT** assume database connection works - always test with actual queries.

---

## 📐 Type Contracts
*Key interfaces that must not regress.*

| Interface | Location | Required Properties |
|-----------|----------|---------------------|
| `Bill` | `lib/types/bill/bill-base.ts` | `urgency`, `complexity`, `lastActionDate`, `constitutionalIssues?` |
| `Sponsor` | `lib/types/bill/bill-base.ts` | `id`, `name`, `party`, `role` |
