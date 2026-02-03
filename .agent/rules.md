# Chanuka Project Rules

> These rules are enforced for all AI/agent development in this codebase.

## 1. Spec-First Development

**For any work spanning multiple files or sessions:**
1. Check if a spec exists in `.agent/specs/`
2. If not, create one using `/create-spec` workflow
3. Reference spec requirements in task items

## 2. Context Loading

**At session start:**
1. Read `docs/CODEBASE_CONTEXT.md` for architecture overview
2. Read `docs/MIGRATION_LOG.md` for active migrations
3. Check `.agent/specs/` for relevant specifications

## 3. Type System Rules

- Import types from `@client/lib/types` or module entry points
- Do NOT create ad-hoc types; check shared types first
- Export enums as values, not `export type`
- Run `npx tsc --noEmit` before considering work complete

## 4. Migration Tracking

- Log architectural changes in `docs/MIGRATION_LOG.md`
- Update spec `tasks.md` when completing work
- Reference requirement IDs in task items (`_Requirements: X.X_`)

## 5. Verification

- Run type check: `npx tsc --noEmit`
- Count errors to track progress
- Update MIGRATION_LOG.md with outcomes

## 6. Available Workflows

| Command | Purpose |
|---------|---------|
| `/context-load` | Load context at session start |
| `/type-check` | Run tsc with error counting |
| `/create-spec` | Create EARS specification |
| `/type-refactor` | Refactor types to shared |
