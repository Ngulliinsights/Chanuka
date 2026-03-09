# ADR 011: Bills Feature Server Implementation and Client-Server Congruence

**Date:** 2026-03-09  
**Status:** Accepted  
**Deciders:** Development Team  
**Context:** Bills feature server startup issues and missing endpoints

---

## Context and Problem Statement

The Bills feature had critical issues preventing development:

1. **Server Startup Failure:** Import errors in `bill-storage.ts` prevented server from starting
2. **Missing Mock Data:** Translation and impact calculator services referenced non-existent mock data files
3. **Client-Server Gap:** 11 endpoints missing on server, causing client API calls to fail (69% congruence)
4. **Port Configuration:** Server needed to run on port 4200 for development

These issues blocked all Bills feature development and testing.

---

## Decision Drivers

- **Immediate Unblocking:** Development team needed working server to continue
- **Client Integration:** Client code was calling endpoints that didn't exist
- **Testing Requirements:** Need to verify endpoints work before client integration
- **Development Velocity:** Mock data needed for rapid iteration without AI dependencies
- **Port Standardization:** Consistent port usage across development environments

---

## Considered Options

### Option 1: Fix Only Critical Startup Issues
- **Pros:** Minimal changes, quick fix
- **Cons:** Leaves client-server gap, blocks client development

### Option 2: Implement All Missing Endpoints + Fix Startup (CHOSEN)
- **Pros:** Complete solution, unblocks all development, 100% congruence
- **Cons:** More work upfront

### Option 3: Stub Endpoints with 501 Not Implemented
- **Pros:** Quick unblocking
- **Cons:** Doesn't enable actual testing, still blocks client work

---

## Decision Outcome

**Chosen Option:** Option 2 - Implement all missing endpoints and fix startup issues

### Implementation Details

#### 1. Server Startup Fixes

**Problem:** Import errors in `bill-storage.ts`
```typescript
// BEFORE (broken)
import { bill as bills } from '@server/infrastructure/schema/foundation';
import { InsertBill } from '@server/infrastructure/schema/foundation';
import { readDatabase } from '@server/infrastructure/database/connection';

// AFTER (fixed)
import { bills, bill_tags } from '@server/infrastructure/schema/foundation';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { readDatabase } from '@server/infrastructure/database/connection';
```

**Changes:**
- Corrected schema table imports (bills, bill_tags)
- Fixed database type from `PostgresJsDatabase` to `NodePgDatabase`
- Updated `readDatabase()` calls to `readDatabase.select()` (object not function)
- Fixed logger context type to `Record<string, unknown>`

#### 2. Mock Data Creation

**Location:** `server/features/bills/infrastructure/mocks/`

**Files Created:**
1. `translation-mock-data.ts` - Plain-language translations for legal text
2. `impact-mock-data.ts` - Personal impact calculations

**Pattern Established:**
```typescript
// Mock data structure
export interface ClauseTranslation {
  clauseRef: string;
  legalText: string;
  plainLanguage: string;
  keyPoints: string[];
  complexity: 'low' | 'medium' | 'high';
}

// Mock data provider
export function getMockTranslation(billId: string, clauseRef?: string): ClauseTranslation[] {
  // Returns mock data for development
}
```

**Import Pattern:**
```typescript
// Services import from infrastructure/mocks
import { getMockTranslation } from '../infrastructure/mocks/translation-mock-data';
```

#### 3. Missing Endpoints Implementation

**11 Endpoints Added:**

**Public Endpoints (5):**
1. `GET /api/bills/meta/categories` - 15 Kenyan bill categories
2. `GET /api/bills/meta/statuses` - 11 legislative statuses  
3. `GET /api/bills/:id/sponsors` - Bill sponsors list
4. `GET /api/bills/:id/analysis` - Bill analysis data
5. `GET /api/bills/:id/polls` - Get bill polls

**Protected Endpoints (6):**
6. `POST /api/bills/:id/track` - Track a bill (requires auth)
7. `POST /api/bills/:id/untrack` - Untrack a bill (requires auth)
8. `POST /api/bills/:id/engagement` - Record engagement (requires auth)
9. `POST /api/bills/:id/polls` - Create a poll (requires auth)
10. `POST /api/comments/:id/vote` - Vote on comment (requires auth)
11. `POST /api/comments/:id/endorse` - Expert endorsement (requires auth + role)

**Route Aliases Added (4):**
- `/bills/:id/sponsorship-analysis` → `/sponsorship/:id/analysis`
- `/bills/:id/primary-sponsor-analysis` → `/sponsorship/:id/primary-sponsor`
- `/bills/:id/co-sponsors-analysis` → `/sponsorship/:id/co-sponsors`
- `/bills/:id/financial-network-analysis` → `/sponsorship/:id/financial-network`

#### 4. Server Configuration

**Port:** 4200 (configured in `server/config/index.ts`)
```typescript
server: {
  port: getEnvNumber('PORT', 4200),
  // ...
}
```

#### 5. Testing Approach

**Live HTTP Testing:**
```bash
# Test public endpoints
curl http://localhost:4200/api/bills/meta/categories
curl http://localhost:4200/api/bills/meta/statuses

# Test protected endpoints (expect auth error)
curl -X POST http://localhost:4200/api/bills/1/track
# Response: {"error":"Access token required"}
```

**Results:**
- ✅ All 11 endpoints responding
- ✅ Authentication working (401 for protected routes)
- ✅ Validation working (proper error messages)
- ✅ Error handling working (correlation IDs, proper status codes)

---

## Consequences

### Positive

1. **Server Operational:** Starts successfully on port 4200
2. **100% Congruence:** All client API calls now have matching server endpoints
3. **Development Unblocked:** Team can continue with client integration
4. **Testing Enabled:** Live endpoints allow proper integration testing
5. **Pattern Established:** Mock data pattern for other features to follow
6. **Documentation Complete:** Comprehensive test results and implementation docs

### Negative

1. **Mock Data Temporary:** Translation and impact services need real AI integration later
2. **Database Dependency:** Some endpoints fail without proper test data (expected)
3. **Maintenance Overhead:** Mock data needs updating as features evolve

### Neutral

1. **Port Change:** Development now uses 4200 instead of default (documented)
2. **File Organization:** Mock data in infrastructure/mocks/ (new pattern)

---

## Architecture Patterns Validated

This implementation validates several nature-inspired patterns:

### 1. Branching Architecture
```
Server (root)
├── Middleware (trunk)
├── Features (branches)
│   ├── Presentation (leaves - HTTP endpoints)
│   ├── Application (branches - business logic)
│   ├── Domain (trunk - core models)
│   └── Infrastructure (roots - database, cache)
```

### 2. Layered Filtration
```
Request → Security → Rate Limit → Auth → Routes → Service → Database
(Like: Air → Nose → Mucus → Cilia → Bronchi → Alveoli)
```

### 3. Circuit Breaker Pattern
```
CLOSED (normal flow) → OPEN (stop on failure) → HALF_OPEN (test recovery)
(Like: Blood vessels constricting/dilating based on pressure)
```

### 4. Exponential Backoff
```
Retry delays: 1s → 2s → 4s → 8s (with jitter)
(Like: Breathing adjusts to oxygen needs)
```

---

## Implementation Files

### Created
1. `server/features/bills/infrastructure/mocks/translation-mock-data.ts`
2. `server/features/bills/infrastructure/mocks/impact-mock-data.ts`
3. `server/features/bills/__tests__/quick-test.ts`
4. `server/features/bills/__tests__/LIVE_TEST_RESULTS.md`
5. `server/features/bills/IMPLEMENTATION_COMPLETE.md`

### Modified
1. `server/features/bills/infrastructure/bill-storage.ts` (import fixes)
2. `server/features/bills/application/translation.service.ts` (import path)
3. `server/features/bills/application/impact-calculator.service.ts` (import path)
4. `server/features/bills/presentation/http/bills.routes.ts` (11 endpoints)
5. `server/features/bills/presentation/http/sponsorship.routes.ts` (4 aliases)
6. `server/features/bills/__tests__/TEST_RESULTS.md` (updated)

---

## Compliance

- ✅ **Type Safety:** All TypeScript diagnostics pass
- ✅ **Error Handling:** Proper error responses with correlation IDs
- ✅ **Authentication:** Protected routes require valid tokens
- ✅ **Validation:** Input validation on all endpoints
- ✅ **Documentation:** Comprehensive test results and guides
- ✅ **Testing:** Live HTTP verification completed

---

## Future Work

1. **Replace Mock Data:**
   - Integrate OpenAI for translation service
   - Implement real impact calculation algorithms

2. **Database Seeding:**
   - Add test data for bills, sponsors, analysis
   - Enable full integration testing with real data

3. **Client Integration:**
   - Build React components for all endpoints
   - Implement client-side API integration
   - Add E2E tests

4. **Performance Optimization:**
   - Add database indexes for common queries
   - Implement query result caching
   - Optimize N+1 query patterns

---

## References

- [Bills Feature Implementation Complete](../../server/features/bills/IMPLEMENTATION_COMPLETE.md)
- [Live Test Results](../../server/features/bills/__tests__/LIVE_TEST_RESULTS.md)
- [Client-Server Congruence Analysis](../../server/features/bills/CLIENT_SERVER_CONGRUENCE_ANALYSIS.md)
- [Testing Guide](../../server/features/bills/__tests__/TESTING_GUIDE.md)

---

## Related ADRs

- ADR 001: Feature-Based Architecture
- ADR 003: API Design Principles
- ADR 005: Error Handling Strategy
- ADR 010: Natural Branching Architecture Patterns (this validates the approach)
