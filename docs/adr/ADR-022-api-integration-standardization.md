# ADR-022: API Integration Standardization

**Status**: Accepted
**Date**: 2026-03-19

**Status:** RECOMMENDED  
**Date:** March 19, 2026  
**Severity:** 🔴 CRITICAL - Blocks production deployment  
**References:** API_CONTRACT_AUDIT.md, TASK_4_ENDPOINT_AUDIT.md
**Consolidated From:** TASK_4_STRATEGIC_RECOMMENDATIONS.md (now superseded by this ADR)

---

## Problem Statement

The Chanuka platform has critical API integration issues that block production deployment:

### Issue 1: No Formal API Contracts
- **Current:** Client and server have no shared specification of request/response shapes
- **Impact:** Changes break silently at runtime; no compile-time checking
- **Evidence:** 20+ endpoints returning inconsistent formats

### Issue 2: Response Format Chaos (6+ Patterns)
1. `{ success, data }` - Sponsorship, some bills
2. `{ bills, count, hasMore, pagination }` - Bills list
3. Direct object `{...}/[...]` - Action prompts
4. `ApiSuccess()` helper - Bill tracking
5. Custom per-endpoint - Government data
6. Raw binary/CSV - System endpoints

**Impact:** Client code must handle multiple response shapes; no unified error handling

### Issue 3: Infrastructure Client Not Used
- **Current:** `infrastructure/api/client.ts` exists but feature APIs use raw `fetch()`
- **Impact:** Lost benefits of retry logic, circuit breaker, error handling, caching
- **Evidence:** 8-12 feature API files bypassing infrastructure

### Issue 4: Type Safety Gaps
- **Current:** `@shared/types` focuses on domain models, not API contracts
- **Impact:** API changes aren't caught by TypeScript; runtime failures in production

---

## Architecture Decision

**Adopt standardized API integration pattern with three components:**

1. **Contracts Layer** (@shared/types/api)
   - Single source of truth for all request/response shapes
   - Zod validation schemas for runtime safety
   - Request/response types for each endpoint

2. **Response Standardization** (Server middleware)
   - All endpoints return standardized `ApiResponse<T>` wrapper
   - Consistent error format across all endpoints
   - Metadata: {success, data, error, timestamp}

3. **Infrastructure Client Usage** (Client layer)
   - All feature APIs use `globalApiClient` instead of `fetch()`
   - Leverage retry logic, circuit breaker, caching
   - Handle responses with centralized error handling

---

## Recommended Implementation Path

### Option A: Minimal Fix (1-2 hours)
**Create contracts without changing runtime behavior**

**Scope:**
- Create `@shared/types/api/contracts` directory
- Document current API shapes in TypeScript interfaces
- No server/client code changes

**Pros:**
- Quick to implement
- Provides type safety for future development

**Cons:**
- Doesn't fix runtime behavior
- Still have response format chaos
- Doesn't leverage infrastructure client

**Recommendation:** ❌ NOT SUFFICIENT for production

---

### Option B: Medium Fix (3-4 hours) ⭐ **RECOMMENDED**
**Standardize responses + ensure client uses infrastructure client**

**Implementation Steps:**

1. **Create API Contract Foundation**
   ```typescript
   // @shared/types/api/response.ts
   export interface ApiResponse<T, E = unknown> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: E;
     };
     timestamp: string;
     metadata?: Record<string, unknown>;
   }
   ```

2. **Add Response Middleware (Server)**
   - Intercept all `res.json()` calls
   - Transform responses to standard format
   - Preserve existing functionality

3. **Update Server Controllers (14 files)**
   - Replace `res.json(data)` with `res.json(standardizeResponse(data))`
   - Handle errors consistently
   - Document response contracts

4. **Migrate Client APIs (8-12 files)**
   - Replace direct `fetch()` with `globalApiClient`
   - Import response types from `@shared/types/api`
   - Add response validation with type guards

5. **Add Request/Response Contracts (20+ endpoints)**
   - Document each endpoint's shape
   - Create endpoint-specific types
   - Enable IDE autocomplete

**Pros:**
- ✅ Fixes runtime API failures
- ✅ Standardizes all endpoints
- ✅ Uses existing infrastructure client
- ✅ Provides type safety
- ✅ Enables consistent error handling

**Cons:**
- Requires changes to both server and client
- Breaking changes to API shape (internal only)

**Recommendation:** ✅ **BEST APPROACH**

---

### Option C: Comprehensive Fix (5-6 hours)
**Option B + Zod validation + comprehensive testing**

**Additions:**
- Request validation with Zod schemas
- Response validation with Zod schemas
- Integration test suite (10+ tests)
- API documentation generation
- OpenAPI/Swagger specs

**When to do:** After Option B is complete and verified

---

## Implementation Checklist

### Phase 1: Foundation (1 hour)
- [ ] Create `@shared/types/api/response.ts`
- [ ] Define `ApiResponse<T>` wrapper type
- [ ] Create `@shared/types/api/contracts/` directory
- [ ] Document contracts for 5 pilot endpoints

### Phase 2: Server Standardization (1.5 hours)
- [ ] Create response middleware
- [ ] Update 5 pilot route files
- [ ] Test response format consistency
- [ ] Verify TypeScript compilation
- [ ] Create response transformation guide

### Phase 3: Client Migration (1 hour)
- [ ] Update 5 pilot feature APIs
- [ ] Replace `fetch()` with `globalApiClient`
- [ ] Import response types from `@shared/types/api`
- [ ] Test API calls work correctly

### Phase 4: Validation & Scale (1 hour)
- [ ] Full TypeScript compilation check
- [ ] Integration testing (smoke tests)
- [ ] Scale to remaining endpoints
- [ ] Document API contracts completely

---

## Risk Assessment

### If NOT Implemented
**Risk Level:** 🔴 CRITICAL

**Consequences:**
- Production app unusable (40-50% of features fail)
- Cannot reliably add new features
- Every API change risks breaking multiple features
- No clear way to debug API failures
- Security issues go undetected

**Cost of Delay:** Blocks entire deployment

---

### If Implemented
**Risk Level:** 🟢 LOW

**Mitigations:**
- TypeScript catches breaking changes
- Tests validate behavior
- Changes isolated to API boundaries
- Infrastructure client provides safety net (retry, circuit breaker)
- Gradual migration reduces risk

---

## Consequences

### Positive
- ✅ Single source of truth for API contracts
- ✅ Type-safe client-server communication
- ✅ Consistent error handling across all endpoints
- ✅ Enables production deployment
- ✅ Foundation for future features
- ✅ Improved debugging and troubleshooting

### Negative
- ⚠️ Requires touching multiple files
- ⚠️ Server response format changes (internal APIs only)
- ⚠️ 3-4 hours focused development time

---

## Decision History

- **Task 3 (Complete):** Centralized 286+ server type definitions in `@shared/types`
- **Task 4 (Complete):** Audited all 20+ API endpoints, discovered integration issues
- **Task 5 (Recommended):** Implement this ADR (Option B - Medium Fix)
- **Task 6:** Validation, testing, comprehensive documentation

---

## Related Documents

- [TASK_4_STRATEGIC_RECOMMENDATIONS.md](../../TASK_4_STRATEGIC_RECOMMENDATIONS.md) - Original problem analysis
- [API_CONTRACT_AUDIT.md](../../API_CONTRACT_AUDIT.md) - Endpoint audit details
- [TASK_4_ENDPOINT_AUDIT.md](../../TASK_4_ENDPOINT_AUDIT.md) - Complete endpoint listing
- [ADR-002-client-api-architecture.md](./ADR-002-client-api-architecture.md) - Original API architecture
- [ADR-014-error-handling-pattern.md](./ADR-014-error-handling-pattern.md) - Error handling standards

---

## Approval & Tracking

**Reviewed by:** Architecture Team  
**Status:** Awaiting implementation go-ahead  
**Effort Estimate:** 3-4 focused hours  
**Priority:** CRITICAL (blocks deployment)

