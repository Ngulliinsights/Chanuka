---
description: Refactor a module's types to use shared definitions
---

## Type Refactor Workflow

1. Identify local type definitions in the target module:
```bash
grep -rn "interface\|type\|enum" client/src/features/TARGET_MODULE/
```

2. Check if equivalent exists in shared types:
```bash
grep -rn "export.*TypeName" client/src/lib/types/
```

3. If shared type exists:
   - Update imports in target module to use `@client/lib/types`
   - Remove local definition

4. If shared type does NOT exist:
   - Move definition to appropriate file in `client/src/lib/types/`
   - Update imports in target module

5. Run type check to verify:
```bash
cd client && npx tsc --noEmit
```

6. Update `docs/MIGRATION_LOG.md` with changes made.
