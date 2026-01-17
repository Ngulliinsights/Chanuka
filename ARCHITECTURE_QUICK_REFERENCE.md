# Quick Reference: Architecture & Type System

**Use this as a cheat sheet for common questions about module organization.**

---

## Where Should I Put Code?

### Client-Only Code
```
client/src/
├── components/        ← React components
├── features/          ← Feature-specific logic
├── hooks/             ← Custom React hooks
├── utils/             ← Client utilities
└── services/          ← Client services (API calls, etc)
```

### Server-Only Code
```
server/
├── features/          ← Route handlers, controllers
├── infrastructure/    ← Database, auth, storage
├── middleware/        ← Express middleware
└── utils/             ← Server utilities
```

### Shared Code (True Shared)
```
shared/core/
├── primitives/        ← Constants, enums
├── types/             ← Shared types (auth, flags)
└── utils/             ← Generic utilities (string, number, etc)

shared/types/          ← Shared domain types
```

### Server Infrastructure (Currently in shared/core - TEMPORARY)
```
shared/core/
├── observability/     ← ⚠️ SERVER ONLY
├── caching/           ← ⚠️ SERVER ONLY
├── validation/        ← ⚠️ SERVER ONLY
├── middleware/        ← ⚠️ SERVER ONLY
├── performance/       ← ⚠️ SERVER ONLY
└── config/            ← ⚠️ SERVER ONLY
```

---

## Import Rules

### DO ✅

**Client can import from:**
```typescript
import { something } from '@shared/core/primitives';  // ✅ OK
import { something } from '@shared/core/types';       // ✅ OK
import { something } from '@shared/core/utils/string-utils';  // ✅ OK
import { something } from '@shared/types';            // ✅ OK
```

**Server can import from:**
```typescript
import { something } from '@shared/core';              // ✅ OK (everything)
import { something } from '@shared/types';            // ✅ OK
```

### DON'T ❌

**Client should NOT import from:**
```typescript
import { something } from '@shared/core/observability';  // ❌ Server-only
import { something } from '@shared/core/caching';        // ❌ Server-only
import { something } from '@shared/core/validation';     // ❌ Server-only
import { something } from '@shared/core/middleware';     // ❌ Server-only
import { something } from '@shared/core/performance';    // ❌ Server-only
import { something } from '@shared/core/config';         // ❌ Server-only
```

---

## Common Questions

### Q: Where do I put a new type definition?

**A:** Follow this priority:
1. **Shared by client + server?** → `shared/types/` or `shared/core/types/`
2. **Client-only?** → `client/src/types/` or colocate with component
3. **Server-only?** → `server/types/` or colocate with router

### Q: Where do I put a utility function?

**A:** Follow this priority:
1. **Used by both client and server?** → `shared/core/utils/`
2. **Only used by client?** → `client/src/utils/`
3. **Only used by server?** → `server/utils/`
4. **Only used in one feature?** → Colocate with feature code

### Q: Why is server code in shared/core?

**A:** Legacy architectural decision. Ideally it should be in `server/core/`, but that requires updating 30+ imports. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

### Q: When will it be reorganized?

**A:** Not immediately, but see [ARCHITECTURE.md](./ARCHITECTURE.md) for future plans.

### Q: Can I import from observability/logging in client code?

**A:** No! That's server-only. If you need to report errors from the client, send them to the server via API.

### Q: Where do I put Express middleware?

**A:** Server-specific, so either:
- `server/middleware/` (preferred)
- `shared/core/middleware/` (current - temporary location)

---

## File Organization Patterns

### Adding a New Feature

```
Feature needs:
1. API endpoint (server)
2. UI component (client)
3. Shared types
4. Database model

Follow this order:
1. Create types in shared/types/domains/
2. Create database model in server/infrastructure/schema/
3. Create routes/service in server/features/
4. Create components in client/features/
5. Connect with API client
```

### Adding a Shared Utility

```
If it's truly generic (used by both):
1. Add to shared/core/utils/
2. Export from shared/core/index.ts
3. Import as: import { something } from '@shared/core'

If it's server-only:
1. Add to server/utils/
2. Use relative imports or server path mapping
```

### Adding Server Infrastructure

```
If server-only infrastructure:
1. Prefer: server/infrastructure/
2. Current temporary: shared/core/

Examples:
- Database utilities → server/infrastructure/
- Cache management → shared/core/caching/ (temp) or server/infrastructure/cache/
- Validation → shared/core/validation/ (temp) or server/infrastructure/validation/
```

---

## Type System Rules

### ✅ DO THIS

```typescript
// Shared types go in shared/types/
export interface Bill {
  id: string;
  title: string;
  // ...
}

// Both client and server import from there
import { Bill } from '@shared/types/domains/bills';
```

### ❌ DON'T DO THIS

```typescript
// DON'T create types in both places
client/src/types/bill.ts       // Don't do this
server/types/bill.ts           // And don't do this

// Use shared/types/domains/bill.ts instead
```

---

## Architecture Decision Tree

**Question: Where should I put this code?**

```
Is it used by both client AND server?
├─ YES: Put in shared/core/ (utilities) or shared/types/ (types)
└─ NO: Go to next question

Is it client-only?
├─ YES: Put in client/src/
└─ NO: Go to next question

Is it server-only infrastructure (logging, caching, etc)?
├─ YES: Put in shared/core/ (temporary) or server/infrastructure/
└─ NO: Put in server/features/ or server/utils/
```

---

## Resources

- **Full Guide:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Project Status:** [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- **Type System:** [TYPE_SYSTEM_RESTRUCTURE_PLAN.md](./TYPE_SYSTEM_RESTRUCTURE_PLAN.md)
- **README:** [README.md](./README.md)

---

## When In Doubt

Reference [ARCHITECTURE.md](./ARCHITECTURE.md) or ask in code review!
