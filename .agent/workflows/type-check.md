---
description: Run TypeScript type check and count errors
---

## Type Check Workflow

// turbo-all

1. Run full type check:
```bash
cd client && npx tsc --noEmit
```

2. Count remaining errors:
```bash
cd client && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

3. If errors exist, grep for specific patterns:
```bash
cd client && npx tsc --noEmit 2>&1 | grep "TS2339" | head -20
```
