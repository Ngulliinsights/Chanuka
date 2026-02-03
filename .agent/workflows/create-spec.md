---
description: Create a new EARS-format specification for a feature or migration
---

## Create Spec Workflow

1. Determine spec name (kebab-case):
```
Example: type-system-cleanup, auth-migration, bill-tracking-v2
```

2. Create spec directory:
```bash
mkdir -p .agent/specs/{spec-name}
```

3. Create requirements file with EARS format:
```bash
# Use template from .agent/templates/requirements-template.md
```

4. Define acceptance criteria using EARS patterns:
- **WHEN** [trigger] **THEN** [outcome] **SHALL** [behavior]
- **WHILE** [state] **WHEN** [action] **THEN** [response]
- **IF** [condition] **THEN** [outcome] **SHALL** [behavior]

5. Create tasks file with requirement traceability:
```markdown
- [ ] 1. Task description
  - Sub-task details
  - _Requirements: 1.1, 1.2_
```

6. Update `docs/MIGRATION_LOG.md` to reference new spec.

7. When starting work, copy relevant tasks to IDE's `task.md`.
