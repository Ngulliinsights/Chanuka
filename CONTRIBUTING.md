# Contributing to Chanuka

## 🚦 Migration & Change Tracking
**CRITICAL:** To prevent regressions and incomplete refactors, all architectural changes must be logged.

### Before starting a major change:
1. Check `docs/MIGRATION_LOG.md` to see if there is an active conflicting migration.
2. Add your new migration to the **Active Migrations** table in `docs/MIGRATION_LOG.md`.
3. Create a detailed plan (if complex) and link it in the table.

### During development:
- Keep the status updated (e.g., 🟡 In Progress, 🟢 Completed).
- Reference the tracking issue/row in your PRs.

### After completion:
1. Move your entry to **Migration History**.
2. Verify no "ghost code" remains (unused files/exports).

## 📁 Documentation
- **Architecture:** See `docs/project-structure.md` and `ARCHITECTURE.md`.
- **Migrations:** See `docs/MIGRATION_LOG.md`.\r\n- **Context:** See `docs/CODEBASE_CONTEXT.md` (IDE-agnostic strategic reference).\r\n- **Agent Rules:** See `.agent/rules.md` (enforced development standards).

## 🤖 AI-Assisted Development
- Log session outcomes in `MIGRATION_LOG.md` before closing.
- Preserve agent artifacts (`brain/*/task.md`, `implementation_plan.md`) for continuity.

## ✅ Pre-Commit Verification
- Run `npx tsc --noEmit` and confirm error count is not increasing.
