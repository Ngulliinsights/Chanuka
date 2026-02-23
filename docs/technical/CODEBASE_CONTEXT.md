# Chanuka Codebase Context

> **Purpose:** IDE-agnostic reference for any developer or AI agent working on this codebase.  
> **Last Updated:** 2026-01-27

---

## 🏗️ Architecture Overview

| Layer | Location | Purpose |
|-------|----------|---------|
| **Shared Types** | `shared/types/` | Server-client common types |
| **Client Types** | `client/src/lib/types/` | Client-only types (single source of truth) |
| **Core Modules** | `client/src/infrastructure/` | Infrastructure (API, storage, security, monitoring) |
| **Features** | `client/src/features/` | FSD-organized feature modules |
| **Design System** | `client/src/lib/design-system/` | UI components and tokens |

---

## 📐 Type System Rules

1. **Single Source of Truth:** All client types live in `client/src/lib/types/`.
2. **Module Bridges:** Core modules (`core/storage`, `core/security`) re-export from `lib/types` via their own `types.ts`.
3. **No Deep Imports:** Import from module entry points (`@client/infrastructure/storage`), not `lib/types` internals.
4. **Enum Exports:** Export enums as values, not `export type`, if used at runtime.

---

## 🔑 Key Type Contracts

| Interface | Location | Required Properties |
|-----------|----------|---------------------|
| `Bill` | `lib/types/bill/bill-base.ts` | `urgency`, `complexity`, `lastActionDate`, `status`, `sponsors` |
| `Sponsor` | `lib/types/bill/bill-base.ts` | `id`, `name`, `party`, `role` |
| `Comment` | `lib/types/core.ts` | `authorId`, `authorName`, `content`, `createdAt` |
| `SearchResult` | `lib/types/search.ts` | `items`, `total`, `hasMore` |

---

## ⚠️ Anti-Patterns

- **DO NOT** import server-only code (`shared/core/observability`) into client.
- **DO NOT** create ad-hoc types; check `lib/types` first.
- **DO NOT** use `@types` folder for client types (legacy, being deprecated).
- **DO** use the unified API client in `client/src/infrastructure/api`.
- **DO** run `npx tsc --noEmit` before committing.

---

## 🚦 Active Work Streams

| Stream | Status | Notes |
|--------|--------|-------|
| Type System Cleanup | 🟡 In Progress | Consolidating types to `lib/types` |
| Core Modules Refactor | 🟡 In Progress | Storage, Monitoring, Security |
| Mock Data Alignment | 🟡 In Progress | `lib/data/mock/` needs type sync |
| Error System Unification | 🟡 In Progress | Phase 2B |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `client/tsconfig.json` | Path aliases (`@client`, `@shared`, `@lib`) |
| `docs/MIGRATION_LOG.md` | Active migrations and history |
| `CONTRIBUTING.md` | Development workflow |
| `docs/project-structure.md` | Full directory tree |

---

## 🛠️ Verification Commands

```bash
# Type check
npx tsc --noEmit

# Count errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Find type usage
grep -rn "YourType" client/src/
```
