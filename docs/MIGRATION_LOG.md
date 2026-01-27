# Central Migration & Change Log

This document serves as the **Single Source of Truth** for architectural changes, migrations, and critical system updates in the Chanuka codebase. 

**Goal:** Prevent regression, incomplete migrations, and "ghost code" by tracking the *actual* status of major changes.

---

## 🚦 Active Migrations
*List currently active migrations here. If you start a new migration, add it here.*

| Migration | Status | Owner | Core Links | Notes |
|-----------|--------|-------|------------|-------|

| Migration | Status | Owner | Core Links | Notes |
|-----------|--------|-------|------------|-------|
| **Phase 2B: Error System Unification** | 🟡 In Progress | @User | [Tracker](./archive/legacy_migrations/MIGRATION_PROGRESS_TRACKER_PHASE2B.txt) | Community/Notifications pending (0%). User/Search done. |
| **Monitoring FSD Restructure** | ⚪ Proposed | @User | [Plan](./plans/monitoring-fsd-restructure.md) | Restructuring monitoring into FSD layers. Rename 'enhanced-' prefix. |


---

## 🏆 Recent Architectural Decisions
*Log key decisions that affect how code should be written going forward.*

### [YYYY-MM-DD] Decision Title
- **Context:** Brief explanation of why.
- **Decision:** What we are doing.
- **Consequences:** What changed? (e.g., "Do not use `x`, use `y` instead")

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
- **DO NOT** create ad-hoc types; check `@types` or `shared/types` first.
