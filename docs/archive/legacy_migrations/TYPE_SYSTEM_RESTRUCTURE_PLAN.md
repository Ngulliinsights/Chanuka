# Type System Unified Restructure Plan

**Status:** COMPREHENSIVE SOLUTION (Not Phased)  
**Approach:** Complete consolidation with single sources of truth  
**Goal:** Eliminate ALL duplication, conflicts, and scattered authority  

---

## Type System Architecture (CANONICAL)

```
shared/types/                              ← SINGLE SOURCE OF TRUTH
│
├── api/                                   [API REQUEST/RESPONSE/ERROR CONTRACTS]
│   ├── index.ts                          (Barrel export)
│   ├── request-types.ts                  (ApiRequest, variants: Paginated, FileUpload, GraphQL, WebSocket)
│   ├── response-types.ts                 (ApiResponse, variants: Paginated, Error, FileDownload, Streaming)
│   ├── error-types.ts                    (ApiError classes 1-40, ApiErrorCode, ApiErrorContext)
│   ├── factories.ts                      (ApiRequestFactory, ApiResponseFactory, ApiErrorFactory, ApiTypeFactory)
│   ├── serialization.ts                  (ApiSerializer, SerializableApiRequest/Response/Error)
│   └── websocket/
│       ├── index.ts
│       ├── errors.ts
│       ├── messages.ts
│
├── core/                                 [DOMAIN & INFRASTRUCTURE CONTRACTS]
│   ├── index.ts                          (Barrel export - NO ALIASES)
│   ├── base.ts                           (BaseEntity, Identifiable, Timestamped, Auditable)
│   ├── errors.ts                         (AppError hierarchy - CANONICAL, no duplicates)
│   ├── validation.ts                     (ValidationError, ValidationResult - SINGLE DEFINITION)
│   ├── health-check.ts                   (HealthStatus - SINGLE DEFINITION)
│   ├── circuit-breaker.ts                (CircuitBreakerState - SINGLE DEFINITION)
│   ├── rate-limit.ts                     (RateLimitStore, RateLimitInfo - SINGLE DEFINITION)
│   ├── cache.ts                          (CacheOptions, CacheMetrics, CacheHealthStatus - SINGLE DEFINITION)
│   ├── services.ts                       (Services interface, ServiceConfig - for type contracts only)
│   ├── auth.types.ts                     (Authentication contracts: AuthContext, AuthToken, AuthProvider)
│   ├── realtime.ts                       (WebSocket/Real-time contracts)
│   └── feature-flags.ts                  (Feature flag contracts)
│
├── domains/                              [DOMAIN-SPECIFIC BUSINESS TYPES]
│   ├── authentication/
│   ├── legislative/
│   ├── safeguards/
│   └── [other domains]
│
├── testing/                              [TEST FIXTURES & MOCKS]
│   └── [test types only]

server/types/                              ← SERVER LAYER ADAPTERS (NOT sources of truth)
│
├── index.ts                              (Barrel export, imports from shared/types/)
├── middleware/
│   └── index.ts                          (Express-specific middleware types that extend/adapt shared types)
├── service/
│   └── index.ts                          (Service layer return types, not type contracts)
├── controller/
│   └── index.ts                          (Controller request/response DTOs that extend shared types)
└── database/
    └── index.ts                          (Database query types that extend shared types)

server/features/*/types/                  ← FEATURE-SPECIFIC SERVER TYPES
│
└── index.ts                              (Feature contracts, extends shared/types/domains/)

client/src/core/api/types/                ← CLIENT API LAYER (imports from shared/types/)
│
├── index.ts                              (Barrel export - re-exports shared types + client-only)
├── shared-imports.ts                     (DEPRECATED - migration bridge only, to be removed in v2.0)
├── service.ts                            (ClientBillsService, ClientAuthService - CLIENT-SPECIFIC)
├── auth.ts                               (Client auth domain types - CLIENT-SPECIFIC)
├── bill.ts                               (Client bill domain types - CLIENT-SPECIFIC)
├── community.ts                          (Client community domain types - CLIENT-SPECIFIC)
├── engagement.ts                         (Client engagement types - CLIENT-SPECIFIC)
├── preferences.ts                        (UserPreferences - CLIENT-SPECIFIC UI state)
├── performance.ts                        (WebVitals, PerformanceBudget - CLIENT-SPECIFIC)
├── cache.ts                              (ClientCacheOptions - CLIENT-SPECIFIC)
└── config.ts                             (ClientApiConfig - CLIENT-SPECIFIC)

client/src/lib/types/                  ← CLIENT SHARED TYPES (UI/Component concerns)
│
├── index.ts
├── ui/
│   ├── components/
│   ├── hooks/
│   └── context/

client/src/features/*/types/              ← FEATURE-SPECIFIC CLIENT TYPES
│
└── index.ts

@types/                                   ← AMBIENT DECLARATIONS ONLY (NO BUSINESS LOGIC)
│
├── global/
│   ├── index.ts
│   ├── shims.d.ts                        (Third-party augmentations, DOM extensions)
│   └── declarations.d.ts                 (Global augmentations only)
└── [EVERYTHING ELSE DELETED - Business types moved to shared/types/]
```

---

## Type Consolidation Mapping (What moves where)

### ERROR TYPES (Consolidate to `shared/types/core/errors.ts`)

**Sources:**
- `@types/core/error.d.ts` → DELETE (move to shared/types/core/errors.ts)
- `shared/core/observability/error-management/errors/` → CONSOLIDATE
- `shared/core/validation/types` (ValidationError) → MOVE canonical definition to shared/types/core/validation.ts
- `client/src/core/api/types/error-response.ts` → DELETE (import from shared)

**Canonical Location:** `shared/types/core/errors.ts`

**Contents:**
```typescript
// Base error class hierarchy
export abstract class AppError extends Error { ... }
export class ValidationError extends AppError { ... }
export class AuthenticationError extends AppError { ... }
export class AuthorizationError extends AppError { ... }
export class NotFoundError extends AppError { ... }
export class ConflictError extends AppError { ... }
export class RateLimitError extends AppError { ... }
export class SerializationError extends AppError { ... }
export class DatabaseError extends AppError { ... }
// ... all 40+ error classes in ONE place
```

**Import Path:**
```typescript
// Everywhere that needs errors:
import { AppError, ValidationError, AuthenticationError, ... } from '@shared/types/core/errors';
```

---

### VALIDATION TYPES (Consolidate to `shared/types/core/validation.ts`)

**Sources:**
- `shared/core/validation/types` → SOURCE (canonical, keep as-is)
- `shared/core/validation/core/interfaces` → CONSOLIDATE
- `shared/core/types/validation-types.ts` → DELETE (merge into shared/types/core/validation.ts)
- `client/src/lib/lib/validation/types/validation.types.ts` → CONSOLIDATE

**Canonical Location:** `shared/types/core/validation.ts`

**Contents:**
```typescript
export class ValidationError extends AppError { ... }  // SINGLE DEFINITION
export interface ValidationResult { ... }               // SINGLE DEFINITION
export interface ValidationContext { ... }
export interface ValidationOptions { ... }
export interface ValidationMetrics { ... }
// ... all validation contracts in ONE place
```

**Import Path:**
```typescript
// Everywhere that needs validation types:
import { ValidationError, ValidationResult, ValidationContext, ... } from '@shared/types/core/validation';
```

---

### HEALTH CHECK TYPES (Consolidate to `shared/types/core/health-check.ts`)

**Sources:**
- `shared/core/observability/health/types` → SOURCE
- `shared/core/middleware/types` (HealthStatus) → CONSOLIDATE
- `shared/core/caching/types` (HealthStatus) → CONSOLIDATE

**Canonical Location:** `shared/types/core/health-check.ts`

**Contents:**
```typescript
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';  // SINGLE DEFINITION
export interface HealthCheckResult { ... }
export interface HealthStatus { ... }  // NOT DUPLICATED
```

**Import Path:**
```typescript
// Everywhere that needs health checks:
import { HealthStatus, HealthCheckResult } from '@shared/types/core/health-check';
```

---

### CIRCUIT BREAKER TYPES (Consolidate to `shared/types/core/circuit-breaker.ts`)

**Sources:**
- `shared/core/caching/types` (CircuitBreakerState) → SOURCE
- `shared/core/observability/error-management/patterns/circuit-breaker` (CircuitBreakerState) → CONSOLIDATE
- Database inline definitions → CONSOLIDATE

**Canonical Location:** `shared/types/core/circuit-breaker.ts`

**Contents:**
```typescript
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';  // SINGLE DEFINITION
export interface CircuitBreakerMetrics { ... }
export interface CircuitBreakerConfig { ... }
```

**Import Path:**
```typescript
// Everywhere that needs circuit breaker:
import { CircuitBreakerState, CircuitBreakerMetrics } from '@shared/types/core/circuit-breaker';
```

---

### RATE LIMIT TYPES (Consolidate to `shared/types/core/rate-limit.ts`)

**Sources:**
- `shared/core/rate-limiting/types` → SOURCE
- `shared/core/middleware/types` (RateLimitStore) → CONSOLIDATE

**Canonical Location:** `shared/types/core/rate-limit.ts`

**Contents:**
```typescript
export interface RateLimitStore { ... }     // SINGLE DEFINITION
export type RateLimitStore as RateLimitingStore → DELETE alias
export interface RateLimitConfig { ... }
export interface RateLimitInfo { ... }
```

**Import Path:**
```typescript
// Everywhere that needs rate limiting:
import { RateLimitStore, RateLimitConfig, RateLimitInfo } from '@shared/types/core/rate-limit';
```

---

### CACHE TYPES (Consolidate to `shared/types/core/cache.ts`)

**Sources:**
- `shared/core/caching/types` → SOURCE
- `client/src/core/api/types/cache.ts` → CLIENT-SPECIFIC, keep client config separate
- `shared/core/types/index.ts` (CacheOptions) → CONSOLIDATE

**Canonical Location:** `shared/types/core/cache.ts`

**Contents:**
```typescript
export interface CacheOptions { ... }       // SINGLE DEFINITION
export interface CacheMetrics { ... }
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl';  // SINGLE DEFINITION
```

**Import Path:**
```typescript
// Server-side caching:
import { CacheOptions, CacheMetrics } from '@shared/types/core/cache';

// Client caching (client-specific config):
import { ClientCacheOptions } from '@client/core/api/types/cache';
```

---

### API REQUEST/RESPONSE TYPES (Already correct in `shared/types/api/`)

**Status:** KEEP AS-IS (already unified)

**What stays:**
- `shared/types/api/request-types.ts` → ApiRequest + variants ✅
- `shared/types/api/response-types.ts` → ApiResponse + variants ✅
- `shared/types/api/error-types.ts` → ApiError + 40 codes ✅
- `shared/types/api/factories.ts` → Factories ✅
- `shared/types/api/serialization.ts` → Serialization ✅

**What gets deleted:**
- `@types/core/api.d.ts` → DELETE
- `client/src/core/api/types/request.ts` → DELETE (import from shared)
- `client/src/core/api/types/error-response.ts` → DELETE (import from shared)

---

## Files to DELETE (No Replacement)

```
@types/core/api.d.ts                                    (duplicates shared/types/api/)
@types/core/error.d.ts                                 (duplicates shared/types/core/errors)
@types/core/dashboard.d.ts                             (business logic in ambient - move elsewhere)
@types/core/loading.d.ts                               (business logic in ambient - move elsewhere)
@types/core/storage.d.ts                               (business logic in ambient - move elsewhere)
@types/core/performance.d.ts                           (business logic in ambient - move elsewhere)
@types/core/mobile.d.ts                                (business logic in ambient - move elsewhere)

@types/shared/core.d.ts                                (duplicates shared/types/core/)
@types/shared/database.d.ts                            (duplicates shared/types/)
@types/shared/design-system.d.ts                       (move to client/src/lib/types/)
@types/shared/errors.d.ts                              (duplicates shared/types/core/errors)
@types/shared/ui.d.ts                                  (move to client/src/lib/types/ui/)

@types/server/api-response.d.ts                        (duplicates shared/types/api/)
@types/server/features.d.ts                            (duplicates server/features/*/types/)
@types/server/middleware.d.ts                          (duplicates server/types/middleware/)
@types/server/services.d.ts                            (duplicates server/types/service/)

shared/core/types/index.ts (152-line alias block)      (REPLACE with clean re-exports)
shared/core/types/validation-types.ts                  (MOVE to shared/types/core/validation.ts)

client/src/core/api/types/request.ts                   (DELETE - import from shared/types/api/)
client/src/core/api/types/error-response.ts            (DELETE - import from shared/types/api/)
client/src/core/api/types/shared-imports.ts            (DELETE - not needed in final state)
```

---

## Files to CREATE (Bridge to unified system)

```
shared/types/core/errors.ts                 (Consolidate all error definitions)
shared/types/core/validation.ts             (Consolidate validation contracts)
shared/types/core/health-check.ts           (Consolidate health check types)
shared/types/core/circuit-breaker.ts        (Consolidate circuit breaker types)
shared/types/core/rate-limit.ts             (Consolidate rate limit types)
shared/types/core/cache.ts                  (Consolidate cache types)

shared/types/README.md                      (Type system governance)
TYPES_SYSTEM_GOVERNANCE.md                  (Rules for adding new types)
TYPES_MIGRATION_GUIDE.md                    (How to migrate imports)
```

---

## Import Path Strategy (Unified)

### CANONICAL SOURCES (What to import from)

```typescript
// API contracts (Request/Response/Error)
import { 
  ApiRequest, 
  ApiResponse, 
  ApiError,
  ApiRequestFactory,
  ApiResponseFactory,
  ApiErrorFactory 
} from '@shared/types/api';

// Core error types
import { 
  AppError, 
  ValidationError, 
  AuthenticationError,
  NotFoundError,
  RateLimitError
} from '@shared/types/core/errors';

// Validation contracts
import { 
  ValidationResult, 
  ValidationContext, 
  ValidationOptions 
} from '@shared/types/core/validation';

// Infrastructure types
import { 
  HealthStatus, 
  HealthCheckResult 
} from '@shared/types/core/health-check';

import { 
  CircuitBreakerState, 
  CircuitBreakerMetrics 
} from '@shared/types/core/circuit-breaker';

import { 
  RateLimitStore, 
  RateLimitConfig, 
  RateLimitInfo 
} from '@shared/types/core/rate-limit';

import { 
  CacheOptions, 
  CacheMetrics, 
  EvictionPolicy 
} from '@shared/types/core/cache';

// Domain types
import { 
  AuthContext, 
  AuthToken, 
  AuthProvider 
} from '@shared/types/core/auth';

// Feature/domain-specific
import { 
  Bill, 
  BillStatus, 
  BillAction 
} from '@shared/types/domains/legislative';

// Server layer adapters (extend shared types)
import { 
  ExpressMiddlewareContext, 
  ServiceLayerResponse 
} from '@server/types';

// Client-specific (UI concerns)
import { 
  UserPreferences, 
  NotificationPreferences 
} from '@client/core/api/types';
```

### RULES FOR NEW IMPORTS

**DO:**
```typescript
// ✅ Import from canonical shared types
import { ValidationError } from '@shared/types/core/validation';
import { ApiRequest } from '@shared/types/api';

// ✅ Import server adapters from server/types
import { ServiceResponse } from '@server/types';

// ✅ Import client-specific types from client/
import { UserDashboardPreferences } from '@client/core/api/types';
```

**DON'T:**
```typescript
// ❌ No more scattered definitions
import { ValidationError } from '../validation/types';
import { ValidationError } from '../middleware/types';
import { ApiResponse } from '@types/core/api';
import { ApiRequest } from './types/request';

// ❌ No more aliases
export type { ValidationError as ValidationTypesError }
export type { HealthStatus as ObservabilityHealthStatus }
```

---

## Update Import Paths (171+ files)

### Bulk Replace Patterns

```bash
# Pattern 1: Import from @types/ → Import from @shared/types/
FROM: import { ... } from '@types/core/api';
TO:   import { ... } from '@shared/types/api';

# Pattern 2: Import validation error from scattered sources → Import from canonical
FROM: import { ValidationError } from '../validation/types';
TO:   import { ValidationError } from '@shared/types/core/validation';

# Pattern 3: Import HealthStatus from scattered sources → Import from canonical
FROM: import { HealthStatus } from '../observability/health/types';
TO:   import { HealthStatus } from '@shared/types/core/health-check';

# Pattern 4: Import CircuitBreakerState from scattered sources → Import from canonical
FROM: import { CircuitBreakerState } from '../caching/types';
TO:   import { CircuitBreakerState } from '@shared/types/core/circuit-breaker';

# Pattern 5: Client removing duplicate request/error types
FROM: import { ApiRequest, ApiResponse } from './request';
TO:   import { ApiRequest, ApiResponse } from '@shared/types/api';

# Pattern 6: Remove alias imports
FROM: import { ValidationError as ValidationTypesError } from '...';
TO:   import { ValidationError } from '@shared/types/core/validation';
```

---

## Type System Governance

### Principle 1: Single Source of Truth
- Every concept (ValidationError, ApiRequest, HealthStatus, etc.) defined in ONE place only
- Re-export from barrel files, never duplicate
- No aliasing primary types to mask conflicts

### Principle 2: Clear Ownership
- `shared/types/api/` → Request/Response/Error contracts (immutable, versioned)
- `shared/types/core/` → Infrastructure & domain contracts (canonical, shared across server & client)
- `server/types/` → Server layer adapters (extend shared types, never duplicate)
- `client/src/core/api/types/` → Client-specific concerns (UI, prefs, domain views)
- `@types/` → Ambient augmentations ONLY (no business logic)

### Principle 3: No Scattered Definitions
- If a type exists in `shared/types/`, it exists NOWHERE else
- If shared and client both need a type:
  - If it's a contract (structure for data transfer) → Live in `shared/types/`
  - If it's a UI concern (React preferences, state) → Live in `client/src/`
  - Server reads from `shared/`, client reads from `shared/` + `client/`

### Principle 4: Import from Canonical Only
- Import from `@shared/types/*` for contracts and infrastructure
- Import from `@server/types/*` for server layer types (which themselves import shared)
- Import from `@client/...` for client-specific types
- NEVER import from intermediate modules (../caching/types, ../validation/types, etc.)

### Principle 5: Versioning & Stability
- When changing API contracts in `shared/types/api/`, bump version
- Maintain backward compatibility through variants (PaginatedApiRequest, etc.)
- Deprecate old types with `@deprecated` comment, provide migration path

---

## Execution Checklist

- [ ] **1. Create canonical type files** (shared/types/core/{errors,validation,health-check,circuit-breaker,rate-limit,cache}.ts)
- [ ] **2. Move/consolidate definitions** into new canonical files
- [ ] **3. Update shared/core/types/index.ts** (remove 152-line alias block, replace with clean re-exports)
- [ ] **4. Delete duplicate type files** (@types/*.d.ts, client/*/request.ts, etc.)
- [ ] **5. Update ALL import paths** (171+ files across server/, client/, shared/)
- [ ] **6. Delete old source files** that have been consolidated
- [ ] **7. Create governance documentation** (TYPES_SYSTEM_GOVERNANCE.md, TYPES_MIGRATION_GUIDE.md)
- [ ] **8. Run TypeScript check** (tsc --noEmit) → Should pass with zero conflicts
- [ ] **9. Run tests** (npm test) → All tests pass
- [ ] **10. Grep for old imports** → Verify no lingering references to deleted/consolidated files
- [ ] **11. Code review** → Confirm no naming conflicts remain

---

## Expected Outcome

**Before:**
```
18 type directories
39+ type files
12+ naming conflicts
3+ competing definitions of ApiResponse, ApiError, ApiRequest
150+ lines of aliases masking problems
@types/ containing business logic
Unclear which type is canonical
```

**After:**
```
6 type directories (shared/types/, server/types/, server/features/*/types/, client/src/...)
15 unified type files (one per concept)
0 naming conflicts
1 definition per concept (canonical)
0 aliases (problem solved, not papered over)
@types/ contains ONLY ambient augmentations
Crystal clear which type is the source of truth
TypeScript compilation passes cleanly
Tests pass completely
Sustainable architecture prevents regression
```

---

## Sustainability (How we prevent regression)

1. **Documentation in Code**
   - Every type file starts with: "This is the CANONICAL definition of X. All imports must use @shared/types/Y."
   - Link to TYPES_SYSTEM_GOVERNANCE.md

2. **Pre-commit Hooks** (or ESLint rule)
   - Scan for duplicate type definitions
   - Warn if importing from non-canonical locations
   - Block PRs that add competing definitions

3. **Type System Owner**
   - Assign one person as "Type System Steward" for code review
   - All type file changes require their approval
   - Prevents ad-hoc additions that fragment the system

4. **Regular Audits**
   - Quarterly check: grep for naming conflicts, duplicate exports
   - Document in TYPES_AUDIT_LOG.md if any drift detected
   - Fix immediately before they accumulate

5. **Onboarding**
   - New team members read TYPES_SYSTEM_GOVERNANCE.md before writing types
   - Code review includes "Is this type canonical or a duplicate?" question

---

## Timeline Estimate

- **Create canonical files:** 1 hour
- **Consolidate definitions:** 2 hours
- **Update 171+ import paths:** 2 hours (Python script + manual fixes)
- **Delete duplicates & verify:** 1 hour
- **Create documentation:** 1 hour
- **TypeScript check & tests:** 30 min
- **Total:** ~7-8 hours (non-blocking if done in dedicated session)

**This is sustainable because:**
- No ongoing aliases to maintain
- No scattered definitions to hunt down
- Crystal clear where types live
- Governance prevents future fragmentation
