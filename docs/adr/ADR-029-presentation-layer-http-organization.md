# ADR-029: Presentation Layer HTTP Organization

**Status**: Accepted  
**Date**: 2026-03-23  
**Replaces**: Clarification of ADR-001  
**Related**: ADR-001 (Domain-Driven Design), ADR-002 (Facade Pattern)

---

## Context

ADR-001 specified routes in the `application/` layer, but during implementation across 12+ features, the team organically evolved toward a separate `presentation/http/` layer. This created a gap between documented design and actual implementation.

### Original ADR-001 Structure
```
application/
  ├── *.routes.ts
  └── *.controller.ts
```

### Actual Implementation (12 out of 13 features)
```
presentation/
  └── http/
      ├── *.routes.ts
      └── *.middleware.ts
```

This ADR formally documents and validates the actual pattern.

---

## Decision

We will **standardize on the `presentation/http/` layer** for all HTTP/API endpoints, separating them from application logic.

### Standard Structure

```
features/<feature-name>/
├── presentation/
│   ├── http/
│   │   ├── [feature].routes.ts        # Primary feature routes
│   │   ├── [action].routes.ts         # Action-specific routes (if multiple)
│   │   └── [feature].middleware.ts    # Validation and auth middleware
│   ├── websocket/                     # Optional: WebSocket layer
│   └── cli/                           # Optional: CLI layer (future)
├── application/
│   ├── [feature].service.ts           # Main orchestration service
│   ├── [action-coordinator].ts        # Action coordination
│   └── use-cases/                     # Use case implementations
├── domain/
├── infrastructure/
├── types/
├── config/
├── index.ts
└── README.md
```

### Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `[feature].routes.ts` | `bills.routes.ts` | Primary routes for feature |
| `[action].routes.ts` | `bill-tracking.routes.ts` | Action-specific routes |
| `[feature].middleware.ts` | `bills.middleware.ts` | Validation, auth middleware |
| `routes.ts` | `routes.ts` | Generic router (fallback) |

### Current Compliance Status

| Feature | Status | Location |
|---------|--------|----------|
| bills | ✓ | `presentation/http/` (10 route files) |
| users | ✓ | `presentation/http/` |
| notifications | ✓ | `presentation/http/` + `presentation/websocket/` |
| admin | ✓ | `presentation/http/` (4 route files) |
| constitutional-analysis | ✓ | `presentation/http/` |
| argument-intelligence | ✓ | `presentation/http/` |
| analysis | ✓ | `presentation/http/` |
| electoral-accountability | ✓ | `presentation/http/` |
| constitutional-intelligence | ✓ | `presentation/http/` |
| feature-flags | ✓ | `presentation/http/` |
| recommendation | ✓ | `presentation/http/` |
| search | ✓ | `presentation/http/` |
| **advocacy** | ⚠️ | `presentation/` (missing `http/`) |

---

## Rationale

### Why Separate `presentation/` from `application/`?

1. **Horizontal Scalability**
   - Multiple presentation layers can coexist (HTTP, WebSocket, CLI, GraphQL)
   - Each layer imports the same application services
   - Avoids circular dependencies between presentation types

2. **Testing Benefits**
   - Application services can be tested without HTTP context
   - Middleware can be tested independently
   - Routes are integration tests, not unit tests

3. **Clarity of Concerns**
   - **presentation/** = Request/response handling, HTTP-specific logic
   - **application/** = Pure orchestration, use case coordination
   - **domain/** = Business rules (unaware of HTTP)

4. **Framework Flexibility**
   - Easy to swap Express for Fastify or other frameworks
   - Can add new presentation types without touching application layer
   - Middleware stack is independent of business logic

5. **Team Experience**
   - Developers consistently know where routes live
   - Reduces cognitive load during feature development
   - Matches actual team behavior (observed in 12 features)

---

## Implementation Details

### File Organization

**Primary Route File Example:**
```typescript
// presentation/http/bills.routes.ts
import { Router } from 'express';
import { BillService } from '../../application/bill-service';

const router = Router();

router.post('/bills', async (req, res) => {
  // HTTP handling → delegates to application service
});

export default router;
```

**Multiple Routes Example (complex feature):**
```
admin/presentation/http/
  ├── routes.ts                          # Main router registration
  ├── admin.routes.ts                    # Admin operations
  ├── system.routes.ts                   # System management
  ├── content-moderation.routes.ts      # Moderation operations
  └── admin.middleware.ts                # Auth, role validation
```

**Middleware Pattern:**
```typescript
// presentation/http/bills.middleware.ts
export const validateBillInput = (req, res, next) => {
  // Validation logic
};
```

### Registration in index.ts

```typescript
// features/bills/index.ts
export { BillService } from './application/bill-service';
export { BillRepository } from './infrastructure/repositories/bill-repository';
export * from './domain/types';
// Routes are NOT exported (they're registered in server setup)
```

### Server-Level Registration

Routes are registered at the server level, not exported from features:

```typescript
// server/main.ts
import billRoutes from '@server/features/bills/presentation/http/bills.routes';
import adminRoutes from '@server/features/admin/presentation/http/admin.routes';

app.use('/api/bills', billRoutes);
app.use('/api/admin', adminRoutes);
```

---

## Non-Compliance Item

### Advocacy Feature Deviation

**Current State:**
```
advocacy/presentation/
  └── advocacy-router.ts          ✗ Should be in http/
```

**Required Structure:**
```
advocacy/presentation/
  └── http/
      ├── advocacy-router.ts      ✓
      └── advocacy.middleware.ts  (optional)
```

**Migration Step:**
1. Create `presentation/http/` directory
2. Move `advocacy-router.ts` → `presentation/http/advocacy-router.ts`
3. Update any relative imports
4. Update server route registration if needed

---

## Decision Drivers

1. **Observed Pattern** - 12/13 features already follow this structure
2. **Team Consensus** - Organically converged without formal directive
3. **Framework Compatibility** - Aligns with Express.js patterns
4. **Future-Proofing** - Enables multiple presentation layers
5. **Testing** - Clear separation enables better test strategies

---

## Consequences

### Positive

1. **Consistency** - All features follow same structure (once advocacy is fixed)
2. **Clarity** - Clear ownership: "presentation/" owns HTTP concerns
3. **Extensibility** - Easy to add WebSocket, CLI, or other layers
4. **Testability** - Application services testable without HTTP mocking
5. **Documentation** - Single pattern to document and teach

### Negative

1. **One More Nesting Level** - `presentation/http/` vs `application/`
2. **Breaking Change for Advocacy** - Minor refactoring needed
3. **Update to ADR-001** - Requires documentation correction

---

## Compliance Checklist

- [x] Standardize presentation layer pattern across codebase
- [x] Document in ADR
- [ ] Fix advocacy feature `presentation/http/` migration
- [ ] Update server route registration if needed
- [ ] Linter rule: Enforce files in `presentation/` cannot have HTTP-specific code outside `http/`
- [ ] Linter rule: `application/` services must not import from `presentation/`

---

## References

- ADR-001: Domain-Driven Design Feature Structure
- ADR-002: Facade Pattern for Middleware
- ADR-003: Layer Import Rules
