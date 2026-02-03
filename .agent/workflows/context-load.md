---
description: Load codebase context for new sessions
---

## Context Load Workflow

// turbo-all

1. Read project rules:
```
View file: .agent/rules.md
```

2. Read the IDE-agnostic context document:
```
View file: docs/CODEBASE_CONTEXT.md
```

3. Read active migrations:
```
View file: docs/MIGRATION_LOG.md
```

4. Check for relevant specs:
```
List directory: .agent/specs/
```

5. Check current tsc error count:
```bash
cd client && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
