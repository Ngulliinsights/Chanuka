# Vitest Configuration Sprawl Analysis

## Current State: CHAOS ❌

**8 Configuration Files** with unclear purposes and duplication:

```
ROOT LEVEL (3 files)
├── vitest.config.ts                 ← Root unit test config (65 lines)
├── vitest.workspace.ts              ← UNIFIED workspace (370 lines) - ACTIVE
├── vitest.workspace.unified.ts      ← DUPLICATE (370 lines) - REDUNDANT
└── vitest.workspace.config.ts       ← OLD workspace (9 lines) - OBSOLETE

INDIVIDUAL PROJECTS (3 files)
├── client/vitest.config.ts          ← Client-specific (86 lines) - REDUNDANT
├── server/vitest.config.ts          ← Server-specific (44 lines) - REDUNDANT
└── shared/vitest.config.ts          ← (referenced but unclear)

IGNORE
└── client/vitest.config.ts.timestamp  ← Backup file (can delete)
```

## The Problem

1. **Duplicate Workspace Configs**
   - `vitest.workspace.ts` and `vitest.workspace.unified.ts` are identical (370 lines each)
   - Should be ONE file

2. **Conflicting Configs**
   - Root `vitest.config.ts` handles unit tests (65 lines)
   - Root `vitest.workspace.ts` is the "unified" workspace
   - Which one is actually active?

3. **Project-Level Configs**
   - `client/vitest.config.ts` has its own setup
   - `server/vitest.config.ts` has its own setup
   - But `vitest.workspace.ts` defines all projects inline

4. **Obsolete Files**
   - `vitest.workspace.config.ts` is old (9 lines, simple workspace)
   - No longer needed with unified config

## Dependencies & Relationships

```
Vitest CLI start
    ↓
reads vitest.config.ts (root)?
    OR
reads vitest.workspace.ts (if exists)?
    
If workspace.ts found:
    ├── client-unit    (setup: test-utils/setup/client.ts)
    ├── server-unit    (setup: test-utils/setup/server.ts)
    ├── shared-unit    (setup: test-utils/setup/shared.ts)
    ├── client-integration
    ├── server-integration
    ├── client-a11y
    └── e2e
    
Problem: Each project references OLD setupFiles paths!
    client/src/test-utils/setup.ts  ← WRONG PATH
    (Should be: tests/setup/vitest.ts or tests/validation/... per Phase 1)
```

## Root Cause

Phase 1 testing refactoring consolidated test infrastructure into `tests/setup/vitest.ts`, but the workspace config wasn't updated to point to the new paths. So we have:

1. ✅ Phase 1: New test infrastructure in `tests/`
2. ❌ Workspace config: Still references old `test-utils/setup/` paths
3. ❌ Multiple overlapping configs unclear which is active

## Solution: Complete Consolidation

**Single Source of Truth**: `vitest.workspace.ts`

```
KEEP:
├── vitest.workspace.ts              ← Unified workspace (ONLY workspace config)
└── vitest.setup.ts                  ← Root orchestrator (already correct)

DELETE:
├── vitest.config.ts                 ← Redundant with workspace
├── vitest.workspace.unified.ts      ← Duplicate of workspace.ts
├── vitest.workspace.config.ts       ← Old obsolete workspace
├── client/vitest.config.ts          ← Defined in workspace.ts
├── server/vitest.config.ts          ← Defined in workspace.ts
├── client/vitest.config.ts.timestamp ← Backup (remove)
└── client/vitest.integration.config.ts (if exists)
    client/vitest.performance.config.ts (if exists)

UPDATE setupFiles in vitest.workspace.ts to point to Phase 1 locations:
    test-utils/setup/client.ts  → ./tests/setup/vitest.ts
    test-utils/setup/server.ts  → ./tests/setup/vitest.ts
    etc.
```

## Consolidation Checklist

- [ ] Verify `vitest.workspace.ts` has all 7 projects with correct configs
- [ ] Update all setupFiles in workspace to point to `tests/setup/vitest.ts`
- [ ] Delete `vitest.config.ts` (redundant)
- [ ] Delete `vitest.workspace.unified.ts` (duplicate)
- [ ] Delete `vitest.workspace.config.ts` (obsolete)
- [ ] Delete `client/vitest.config.ts` (inlined in workspace)
- [ ] Delete `server/vitest.config.ts` (inlined in workspace)
- [ ] Delete `client/vitest.config.ts.timestamp` (backup)
- [ ] Delete any `client/vitest.*.config.ts` variants
- [ ] Verify `vitest.setup.ts` is referenced correctly
- [ ] Run tests: `pnpm test` (should use workspace)
- [ ] Commit: "refactor: Consolidate vitest configs to single workspace"

## Result

After consolidation:

```
tests/ (Phase 1)
├── setup/
│   ├── vitest.ts          ← Global utilities (auto-loaded)
│   ├── test-environment.ts ← Mocks
│   └── index.ts
└── ...

vitest.workspace.ts       ← SINGLE source of truth
vitest.setup.ts           ← Root orchestrator
vitest.config.ts          ← DELETED
vitest.workspace.*.ts     ← ALL DELETED

client/vitest.config.ts   ← DELETED
server/vitest.config.ts   ← DELETED
```

**Clean, maintainable, single source of truth!**
