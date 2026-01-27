# Type System Governance & Sustainability Rules

**Version:** 1.0  
**Last Updated:** January 15, 2026  
**Steward:** [Assign person or team]  

---

## Core Principle

**ONE DEFINITION, EVERYWHERE IT'S NEEDED.**

There is exactly ONE canonical location for each type. All code imports from that location. Duplication is eliminated at the source, not masked with aliases.

---

## Type System Authority

| Type Category | Canonical Location | Import Path | Rationale |
|---------------|--------------------|-------------|-----------|
| **API Contracts** | `shared/types/api/` | `@shared/types/api` | Request/Response must be uniform across server & client |
| **Error Types** | `shared/types/core/errors.ts` | `@shared/types/core/errors` | All layers throw same error classes |
| **Validation** | `shared/types/core/validation.ts` | `@shared/types/core/validation` | Schema & rules shared across server & client |
| **Health Check** | `shared/types/core/health-check.ts` | `@shared/types/core/health-check` | Infrastructure monitoring unified |
| **Circuit Breaker** | `shared/types/core/circuit-breaker.ts` | `@shared/types/core/circuit-breaker` | Single resilience pattern |
| **Rate Limiting** | `shared/types/core/rate-limit.ts` | `@shared/types/core/rate-limit` | Shared rate limit store interface |
| **Caching** | `shared/types/core/cache.ts` | `@shared/types/core/cache` | Cache behavior unified |
| **Authentication** | `shared/types/core/auth.ts` | `@shared/types/core/auth` | Auth contracts shared |
| **Domain Types** | `shared/types/domains/{domain}/` | `@shared/types/domains/{domain}` | Business domain schemas |
| **Server Adapters** | `server/types/` | `@server/types` | Extend shared types, never duplicate |
| **Client UI Types** | `client/src/core/api/types/` | `@client/core/api/types` | React-specific, UI state |

---

## What Gets Defined WHERE

### `shared/types/api/` - API Contracts (Immutable, Versioned)

**Defines:**
- `ApiRequest<T>` and variants (Paginated, FileUpload, GraphQL, WebSocket)
- `ApiResponse<T>` and variants (Paginated, Error, FileDownload, Streaming)
- `ApiError` and 40+ specific error classes
- `ApiRequestFactory`, `ApiResponseFactory`, `ApiErrorFactory`
- `ApiSerializer` and serialization contracts
- `ApiErrorCode` (40+ error codes)
- `ApiErrorContext`

**Rules:**
- ✅ Request/Response/Error is versioned and never breaks (extends BaseEntity)
- ✅ Add new variants instead of modifying existing structures
- ✅ Factory pattern for construction (don't instantiate directly)
- ✅ Immutable/readonly properties throughout
- ❌ Never add server-specific concerns (middleware, database)
- ❌ Never add client-specific concerns (React state, UI prefs)

**Import Examples:**
```typescript
// server/features/bills/routes.ts
import { ApiRequest, ApiResponse, ApiBadRequestError } from '@shared/types/api';

// client/src/core/api/base-client.ts
import { ApiRequest, ApiResponse, ApiErrorFactory } from '@shared/types/api';
```

---

### `shared/types/core/` - Infrastructure & Domain Contracts (Canonical)

**Defines:**

**errors.ts:**
- `AppError` (base class for all errors)
- `ValidationError` (SINGLE DEFINITION)
- `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `SerializationError`, `DatabaseError`, etc.
- Error severity constants
- Error context interfaces

**validation.ts:**
- `ValidationError` (SINGLE DEFINITION)
- `ValidationResult` (SINGLE DEFINITION)
- `ValidationContext`
- `ValidationOptions`
- `ValidationMetrics`
- `ValidationServiceConfig`

**health-check.ts:**
- `HealthStatus` type (SINGLE DEFINITION)
- `HealthCheckResult` interface
- `HealthChecker` interface

**circuit-breaker.ts:**
- `CircuitBreakerState` type (SINGLE DEFINITION)
- `CircuitBreakerMetrics` interface
- `CircuitBreakerConfig` interface

**rate-limit.ts:**
- `RateLimitStore` interface (SINGLE DEFINITION)
- `RateLimitConfig` interface
- `RateLimitInfo` interface
- `RateLimitHeaders` interface

**cache.ts:**
- `CacheOptions` interface (SINGLE DEFINITION)
- `CacheMetrics` interface
- `EvictionPolicy` type (SINGLE DEFINITION)
- `CacheEntry<T>` interface

**auth.ts:**
- `AuthContext` interface
- `AuthToken` interface
- `AuthProvider` interface
- `AuthStrategy` type

**Rules:**
- ✅ One definition per concept across entire codebase
- ✅ Shared across server and client (both need ValidationError, HealthStatus, etc.)
- ✅ Clear documentation: "This is the CANONICAL definition of X"
- ✅ Immutable/readonly properties
- ❌ Never scatter a concept across multiple files
- ❌ Never export same name with aliases (ValidationError as ValidationTypesError)
- ❌ Never create competing definitions in other modules

**Import Examples:**
```typescript
// server/middleware/validation.ts
import { ValidationError, ValidationResult } from '@shared/types/core/validation';

// server/infrastructure/core/errors/standardizer.ts
import { AppError, RateLimitError } from '@shared/types/core/errors';

// server/features/*/service.ts
import { HealthStatus, HealthCheckResult } from '@shared/types/core/health-check';

// client/src/core/api/retry.ts
import { RateLimitError } from '@shared/types/core/errors';

// client/src/core/api/circuit-breaker.ts
import { CircuitBreakerState } from '@shared/types/core/circuit-breaker';
```

---

### `shared/types/domains/{domain}/` - Domain-Specific Types (Shared Schema)

**Defines:**
- Business entity types (Bill, User, Community, etc.)
- Domain enums (BillStatus, UserRole, etc.)
- Domain contracts (interfaces specific to that domain)

**Rules:**
- ✅ Shared schema across server and client
- ✅ One location per domain type
- ✅ Can be imported by both server and client features
- ❌ Never define domain types in server/features or client/src separately
- ❌ Server-only models (db schema) go in `@server/infrastructure/schema/`, not here

**Import Examples:**
```typescript
// server/features/bills/routes.ts
import { Bill, BillStatus } from '@shared/types/domains/legislative';

// client/src/features/bills/components.tsx
import { Bill, BillStatus } from '@shared/types/domains/legislative';
```

---

### `server/types/` - Server Layer Adapters (Extend, Never Duplicate)

**Purpose:** Adapt shared types for server-specific concerns

**Defines:**
- Express middleware types (context, error handling)
- Service layer return types (wrap shared types)
- Controller DTOs (extend shared types)
- Database query builders (use shared types as seeds)

**Rules:**
- ✅ Imports from `@shared/types/*` for canonical types
- ✅ Extends or wraps shared types (e.g., `ExpressContext extends BaseContext`)
- ✅ Adds server-specific metadata (middleware chain, request context)
- ❌ NEVER redefine a type that exists in shared/types/
- ❌ NEVER create parallel `ValidationError` or `ApiRequest` here

**Example (What's RIGHT):**
```typescript
// server/types/middleware/index.ts
import { BaseContext, ValidationResult } from '@shared/types/core';

export interface ExpressContext extends BaseContext {
  req: express.Request;
  res: express.Response;
  validationResult: ValidationResult;  // ← Reuses shared type
}

export type ExpressMiddleware = (ctx: ExpressContext) => Promise<void>;
```

**Example (What's WRONG):**
```typescript
// server/types/middleware/index.ts - DON'T DO THIS
export interface ValidationError { ... }  // ❌ DUPLICATE - already in @shared/types/core/validation
export interface HealthStatus { ... }     // ❌ DUPLICATE - already in @shared/types/core/health-check
```

---

### `server/features/*/types/` - Feature-Specific Server Types

**Purpose:** Feature-specific contracts for that feature's services

**Defines:**
- Feature request/response DTOs
- Feature-specific enums
- Feature service interfaces

**Rules:**
- ✅ Imports from `@shared/types/` for canonical types
- ✅ Imports from `@server/types/` for layer adapters
- ✅ Imports from `@shared/types/domains/` for domain types
- ❌ NEVER define a type that should be in shared/types/

**Example:**
```typescript
// server/features/bills/types/index.ts
import { Bill } from '@shared/types/domains/legislative';
import { ApiRequest, ApiResponse } from '@shared/types/api';

export interface GetBillsRequest extends ApiRequest<void> {
  status?: string;
}

export interface GetBillsResponse extends ApiResponse<Bill[]> {}
```

---

### `client/src/core/api/types/` - Client-Specific API Types (UI Concerns)

**Purpose:** React-specific, UI state, client configuration

**Defines:**
- `UserPreferences` (UI state, persisted locally)
- `NotificationPreferences` (UI notifications, not server notifications)
- `ClientApiConfig` (client retry, cache, timeout settings)
- `ClientCacheOptions` (browser storage strategy)
- `PerformanceBudget`, `WebVitals` (client metrics)
- Client domain views (how client renders Bill, User, etc.)
- Service interfaces (BillsService, AuthService)

**Rules:**
- ✅ Imports from `@shared/types/*` for contracts (ApiRequest, ApiResponse, Bill, etc.)
- ✅ Imports from `@shared/types/domains/` for shared domain types
- ✅ Adds client-specific wrapping or configuration
- ❌ NEVER redefine ApiRequest, ApiResponse, ApiError, ValidationError, etc.
- ❌ NEVER duplicate shared types

**Example (What's RIGHT):**
```typescript
// client/src/core/api/types/preferences.ts
import { ApiResponse } from '@shared/types/api';  // ← Reuses shared type
import { User } from '@shared/types/domains/authentication';

export interface UserPreferences {
  notificationFrequency: 'immediate' | 'hourly' | 'daily';
  theme: 'light' | 'dark';
  language: string;
  // ... UI-specific preferences
}

export interface ClientBillView extends Bill {
  userVoted?: boolean;  // ← Client-specific view
  userTracking?: boolean;
}
```

**Example (What's WRONG):**
```typescript
// client/src/core/api/types/request.ts - DON'T DO THIS
export interface ApiRequest<T = unknown> { ... }  // ❌ Already in @shared/types/api/
export interface ApiResponse<T = unknown> { ... } // ❌ Already in @shared/types/api/
```

---

### `@types/` - Ambient Declarations ONLY (No Business Logic)

**Purpose:** Augment third-party types and global environment

**Defines:**
- DOM extensions (if needed)
- Global shims (polyfills)
- Third-party module augmentations
- Global constants or functions

**Rules:**
- ✅ Only `declare` or `declare global` statements
- ✅ Augmenting third-party types (e.g., Express.Request)
- ✅ Global type extensions
- ❌ NEVER define business logic types here
- ❌ NEVER define ApiRequest, ApiResponse, ApiError, ValidationError, etc.
- ❌ NEVER duplicate shared types

**Example (What's RIGHT):**
```typescript
// @types/global/shims.d.ts
declare global {
  interface Window {
    __APP_VERSION__: string;
  }
}

declare module 'express' {
  interface Request {
    user?: AuthContext;  // ← Augment existing type
  }
}
```

**Example (What's WRONG):**
```typescript
// @types/core/api.d.ts - DELETE THIS
export interface ApiResponse<T = any> { ... }  // ❌ Business logic, not augmentation
export interface ApiError { ... }               // ❌ Should be in @shared/types/api/
```

---

## Decision Tree: "Where should this type live?"

```
┌─ Is this a request/response/error for API communication?
│  └─ YES → shared/types/api/
│  └─ NO  → Continue...
│
├─ Is this shared between server and client (not UI-specific)?
│  ├─ YES, it's an error or validation concept?
│  │  └─ YES → shared/types/core/{errors,validation,etc.}/
│  │  └─ NO  → Continue...
│  │
│  ├─ YES, it's a business domain (Bill, User, Community)?
│  │  └─ YES → shared/types/domains/{domain}/
│  │  └─ NO  → Continue...
│  │
│  └─ NO (server-specific or client-specific) → Continue...
│
├─ Is this a server-side concern?
│  ├─ YES, is it a layer adapter (middleware, service, controller)?
│  │  └─ YES → server/types/{layer}/
│  │  └─ NO  → Is it feature-specific?
│  │           ├─ YES → server/features/{feature}/types/
│  │           └─ NO  → Reconsider: should it be in shared/types/?
│  │
│  └─ NO (client-side) → Continue...
│
├─ Is this a client UI concern (React preferences, component state)?
│  └─ YES → client/src/core/api/types/ or client/src/lib/types/
│  └─ NO  → Is it a component/hook/context type?
│           ├─ YES → client/src/lib/types/{components,hooks,context}/
│           └─ NO  → Reconsider location
│
└─ Is this an ambient declaration (augmenting global or third-party)?
   └─ YES → @types/global/
   └─ NO  → Type system doesn't need this, question your design
```

**Examples:**

```typescript
// ✅ CORRECT LOCATION: Bill type
// Question: Shared between server and client?
// Answer: YES
// Question: Business domain?
// Answer: YES (Legislative domain)
// Location: shared/types/domains/legislative/index.ts

// ✅ CORRECT LOCATION: ValidationError
// Question: Shared between server and client?
// Answer: YES
// Question: Error or validation concept?
// Answer: YES (Validation)
// Location: shared/types/core/validation.ts

// ✅ CORRECT LOCATION: UserPreferences
// Question: Shared between server and client?
// Answer: NO (UI state only)
// Question: Client UI concern?
// Answer: YES (React preferences)
// Location: client/src/core/api/types/preferences.ts

// ✅ CORRECT LOCATION: ExpressContext
// Question: Shared between server and client?
// Answer: NO (server-specific)
// Question: Layer adapter?
// Answer: YES (Middleware)
// Location: server/types/middleware/index.ts

// ❌ WRONG: ApiRequest in client/src/core/api/types/request.ts
// Should be: client/src/core/api/types/index.ts imports from @shared/types/api/

// ❌ WRONG: ValidationError in server/types/validation.ts
// Should be: @shared/types/core/validation.ts (shared location)
```

---

## Adding a New Type (Checklist)

Before creating a new type file, ask these questions:

1. **Is this shared?** (Server and client both use it, or might in future?)
   - [ ] YES → Should it go in `shared/types/`?
   - [ ] NO → Is it server-specific or client-specific?

2. **Is it a contract?** (Request, Response, Error, Domain entity?)
   - [ ] YES → Must go in `shared/types/` (canonical source)
   - [ ] NO → Is it a layer adapter or UI concern?

3. **Does a similar type already exist elsewhere?**
   - [ ] Run: `rg "interface ApiRequest|export.*ApiRequest" --type ts`
   - [ ] If found: Import it, don't redefine
   - [ ] If multiple definitions: STOP, resolve duplication first

4. **Where am I putting this?**
   - [ ] `shared/types/api/` → API request/response/error
   - [ ] `shared/types/core/` → Infrastructure or domain contract
   - [ ] `shared/types/domains/{domain}/` → Business domain type
   - [ ] `server/types/{layer}/` → Server layer adapter
   - [ ] `server/features/{feature}/types/` → Feature-specific
   - [ ] `client/src/core/api/types/` → Client API or UI state
   - [ ] `client/src/lib/types/` → Client shared UI types
   - [ ] `@types/global/` → Ambient augmentation ONLY

5. **Does my new type extend or duplicate an existing shared type?**
   - [ ] Extends → Document the relationship: "Extends X from @shared/types/Y"
   - [ ] Duplicates → WRONG, delete and import instead

6. **Am I using aliases to hide conflicts?**
   - [ ] YES → STOP, reconsider your design
   - [ ] NO → Good, continue

7. **Did I document why this type lives here?**
   - [ ] Add JSDoc comment: `/** This is the canonical definition of X. All imports must use @shared/types/Y. */`

---

## Preventing Duplication (Automation & Checks)

### Pre-Commit Hook (Git)

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Check for duplicate type definitions
echo "Checking for duplicate type definitions..."

# Look for same interface name in multiple type files
duplicates=$(
  grep -r "^export interface\|^export type\|^export class" \
    shared/types/ server/types/ client/src/*/types/ |
  cut -d: -f2 | sort | uniq -d
)

if [ ! -z "$duplicates" ]; then
  echo "❌ DUPLICATE TYPE DEFINITIONS FOUND:"
  echo "$duplicates"
  echo ""
  echo "Tip: Use the decision tree in TYPES_SYSTEM_GOVERNANCE.md"
  echo "to find the canonical location for each type."
  exit 1
fi

echo "✅ No duplicate type definitions found"
exit 0
```

### ESLint Rule (TypeScript)

Add custom ESLint rule to detect non-canonical imports:
```javascript
// eslint-plugin-custom/rules/canonical-type-imports.js
module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Ensure imports come from canonical type locations',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        
        // Block: import ValidationError from '../validation/types'
        if (source.includes('validation/types') && 
            node.specifiers.some(s => s.local.name === 'ValidationError')) {
          context.report({
            node,
            message: 'Import ValidationError from @shared/types/core/validation, not from validation module',
          });
        }

        // Block: import ApiRequest from './request'
        if (source.includes('./request') || source.includes('./error-response')) {
          context.report({
            node,
            message: 'Import from @shared/types/api, not from local request.ts or error-response.ts',
          });
        }

        // Block: import HealthStatus from '@types/core/api'
        if (source.startsWith('@types/')) {
          context.report({
            node,
            message: 'Import from @shared/types/, not from @types/ (ambient declarations only)',
          });
        }
      },
    };
  },
};
```

### Regular Audit Script

Create `scripts/audit-type-system.sh`:
```bash
#!/bin/bash
# Monthly type system audit

echo "📊 Type System Audit Report"
echo "Generated: $(date)"
echo ""

# Count definitions per concept
echo "## Validation Errors"
rg "^export.*ValidationError" --type ts | wc -l
echo "  (Should be 1, in shared/types/core/validation.ts)"
echo ""

echo "## HealthStatus Definitions"
rg "^export.*HealthStatus" --type ts | wc -l
echo "  (Should be 1, in shared/types/core/health-check.ts)"
echo ""

echo "## ApiResponse Definitions"
rg "^export.*ApiResponse" --type ts | wc -l
echo "  (Should be 1, in shared/types/api/response-types.ts)"
echo ""

# Check for @types/ business logic
echo "## Business Logic in @types/ (should be empty)"
grep -r "^export interface\|^export class\|^export type" @types/ --include="*.d.ts" | \
  grep -v "declare\|global" | wc -l
echo "  (Should be 0)"
echo ""

# Check for aliases
echo "## Type Aliases (anti-pattern, should be empty)"
grep -r "as ValidationTypesError\|as HealthStatusCache\|as CircuitBreakerStateDB" \
  shared/core/types/index.ts || echo "  ✅ No anti-pattern aliases found"
echo ""

echo "✅ Audit complete. See results above."
```

Run monthly:
```bash
bash scripts/audit-type-system.sh > TYPES_AUDIT_LOG.md
git add TYPES_AUDIT_LOG.md
git commit -m "chore: monthly type system audit - all checks pass"
```

---

## Code Review Checklist (Type System)

When reviewing a PR that touches type files:

- [ ] **No Duplication:** Is this type defined elsewhere? (Run grep if unsure)
- [ ] **Canonical Source:** Does it import from canonical locations (@shared/types/*, @server/types/)?
- [ ] **No Aliases:** Are there any `as` renames? (Should have none, except for deliberate re-exports)
- [ ] **Documentation:** Does the type include JSDoc explaining its purpose and canonical status?
- [ ] **Consistent Naming:** Does it follow naming conventions (ValidationError not ValidateError)?
- [ ] **No @types/ Business Logic:** Is @types/ only used for ambient augmentations?
- [ ] **Tests:** Are there types tests or at least TypeScript compilation check?
- [ ] **Migration Path:** If changing existing type, is there a deprecation path?

**Template Response for Type-Related PRs:**

```markdown
## Type System Review

- [ ] Canonical location confirmed (see TYPES_SYSTEM_GOVERNANCE.md)
- [ ] No duplication found (grep verified)
- [ ] Imports from canonical sources only
- [ ] Documentation updated
- [ ] Tests pass with tsc --noEmit

Approved: Ready to merge
```

---

## Enforcement & Accountability

1. **Type System Steward:** Assign one person to review all type PRs
2. **Monthly Audit:** Run `scripts/audit-type-system.sh` and document results
3. **Failing Builds:** If TypeScript compilation detects conflicts, PR fails automatically
4. **Documentation:** Link TYPES_SYSTEM_GOVERNANCE.md in contributing guide
5. **Onboarding:** All new developers must read this doc before writing types

---

## Summary

**The Rule:** One concept, one location, everywhere it's needed.

**The Enforcement:** No aliases, no scattering, no duplicates.

**The Sustainability:** Clear governance, automated checks, regular audits, dedicated steward.

**The Result:** A type system that's easy to navigate, impossible to break, and pleasant to extend.
