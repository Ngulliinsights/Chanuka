# Central Migration & Change Log

This document serves as the **Single Source of Truth** for architectural changes, migrations, and critical system updates in the Chanuka codebase. 

**Goal:** Prevent regression, incomplete migrations, and "ghost code" by tracking the *actual* status of major changes.

---

## 🚦 Active Migrations
*List currently active migrations here. If you start a new migration, add it here.*

| Migration | Status | Owner | Core Links | Notes |
|-----------|--------|-------|------------|-------|
| **Phase 2C: Search Module Refactor** | 🟢 Complete | @User | [Plan](./plans/search-refactor.md) | Types consolidated to `lib/types/search.ts`. Local definitions removed. Services updated. |
| **Phase 2D: Analytics Module Refactor** | 🟢 Complete | @User | [Plan](./plans/analytics-refactor.md) | Privacy types consolidated to `lib/types/analytics.ts`. Local definitions removed. |
| **Phase 2E: Core Modules Refactor** | 🟡 In Progress | @User | - | Storage, Monitoring, Security refactored to use shared types. Proxy adapters created for stability. |
| **Type System Cleanup** | 🟡 In Progress | @User | - | Removing `@types` conflicts. Establishing `lib/types` as single source of truth. |

| **Phase 2B: Error System Unification** | 🟡 In Progress | @User | [Tracker](./archive/legacy_migrations/MIGRATION_PROGRESS_TRACKER_PHASE2B.txt) | Community/Notifications pending. |
| **Monitoring FSD Restructure** | ⚪ Proposed | @User | [Plan](./plans/monitoring-fsd-restructure.md) | Restructuring into FSD layers. |


---

## 🏆 Recent Architectural Decisions
*Log key decisions that affect how code should be written going forward.*

### [YYYY-MM-DD] Decision Title
- **Context:** Brief explanation of why.
- **Decision:** What we are doing.
- **Consequences:** What changed? (e.g., "Do not use `x`, use `y` instead")

### [2026-01-27] Type System Strategy (Centralized Definitions, Module-Scoped Exports)
- **Context:** Type definitions were scattered and duplicated (`@types`, local `types.ts`, `shared`).
- **Decision:**
    1. **Single Source of Truth:** All domain and shared types live in `client/src/lib/types` (or `shared` for server-common).
    2. **Module Bridges:** Core modules (`core/storage`, `core/security`) MUST maintain their own `types.ts` or `index.ts` that re-exports from `lib/types`.
    3. **No Direct Deep Imports:** Consumers should import from the Module (e.g., `@client/core/storage`), NOT deeply into `lib/types` if possible, to respect module boundaries.
- **Consequences:**
    - `core/*/types.ts` files are converted to proxies (re-exports).
    - Local type definitions in `core` are moved to `lib/types`.
    - Mock data must import from `lib/types` (or the module proxy).

---

## 📜 Migration History
*Move items here from "Active Migrations" once `_COMPLETE.md` verification is done.*

| Date | Migration | Outcome | Archive Link |
|------|-----------|---------|--------------|

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
- **DO** use the unified `API` client in `client/src/core/api` instead of direct `fetch` calls.
- **DO NOT** create ad-hoc types; check `lib/types` or `shared/types` first.
- **DO NOT** export enums using `export type`; export them as values if used at runtime.
- **DO** import from module entry points (`@client/core/storage`), not deeply into `lib/types`.

---

## 📐 Type Contracts
*Key interfaces that must not regress.*

| Interface | Location | Required Properties |
|-----------|----------|---------------------|
| `Bill` | `lib/types/bill/bill-base.ts` | `urgency`, `complexity`, `lastActionDate`, `constitutionalIssues?` |
| `Sponsor` | `lib/types/bill/bill-base.ts` | `id`, `name`, `party`, `role` |
