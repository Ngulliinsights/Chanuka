---
name: Chanuka Development Standards
description: Enforces spec-first development, type system rules, and migration tracking
---

# Chanuka Development Standards Skill

## Overview

This skill enforces standardized development practices for the Chanuka Legislative Transparency Platform.

## Before Starting Any Work

1. **Load Context:**
   ```
   Read: docs/CODEBASE_CONTEXT.md
   Read: docs/MIGRATION_LOG.md
   ```

2. **Check for Existing Specs:**
   ```
   List: .agent/specs/
   ```
   If relevant spec exists, read its `requirements.md` and `tasks.md`.

3. **For Multi-Session Work:**
   Create a spec using the EARS format:
   ```
   .agent/specs/{feature-name}/
   ├── requirements.md  (WHEN/THEN acceptance criteria)
   └── tasks.md         (checklist with _Requirements: X.X_)
   ```

## Type System Rules

### DO:
- Import from `@client/lib/types` or module entry points
- Export enums as values (not `export type`)
- Use shared types from `lib/types/`
- Run `npx tsc --noEmit` before completion

### DO NOT:
- Create ad-hoc types without checking shared types
- Import deeply into `lib/types/` internals
- Leave type errors unaddressed
- Skip updating MIGRATION_LOG.md

## Task Tracking

### In Spec `tasks.md`:
```markdown
- [ ] 1. Task description
  - Details
  - _Requirements: 1.1, 1.2_
```

### In Session `task.md`:
```markdown
- [/] Task (from spec task 5)
    - [x] Sub-task
    - [ ] Sub-task
```

## Verification Checklist

Before considering work complete:
- [ ] `npx tsc --noEmit` runs successfully
- [ ] Spec `tasks.md` updated with completion status
- [ ] `MIGRATION_LOG.md` updated if architectural changes made
- [ ] No duplicate type definitions introduced

## Anti-Patterns

1. **Starting work without context** → Always load CODEBASE_CONTEXT.md
2. **Ad-hoc types** → Check lib/types first
3. **Untracked migrations** → Log in MIGRATION_LOG.md
4. **Type-only enum exports** → Export as values
5. **Deep lib/types imports** → Use module entry points
