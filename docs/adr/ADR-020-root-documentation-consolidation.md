# ADR-020: Root Documentation Consolidation

**Date:** March 9, 2026  
**Status:** Accepted  
**Context:** Documentation sprawl cleanup and design decision extraction

## Context

The project root contained 37+ markdown files documenting various fixes, sessions, and implementation details from March 2026. This created:
- Difficulty finding relevant information
- Duplicate information across files
- No single source of truth for design decisions
- Cluttered workspace root

## Decision

Consolidate all design decisions, architectural insights, and implementation patterns from root documentation into structured ADRs and archive session-specific details.

## Key Design Decisions Extracted

### 1. WebSocket vs Realtime Architecture (Layered Approach)

**Decision:** Maintain separate WebSocket and Realtime layers

**Rationale:**
- **WebSocket Layer (Low-Level):** Raw connection management, reconnection logic, message transport
- **Realtime Layer (High-Level):** Topic-based pub/sub, event routing, application abstraction

**Benefits:**
- Separation of concerns (transport vs application)
- Flexibility to swap transports (SSE, long-polling)
- Reusability of WebSocket client
- Application code doesn't need WebSocket details

**Architecture:**
```
Application Layer (React Components)
    ↓
Realtime Layer (Pub/Sub, Topic Routing)
    ↓ uses
WebSocket Layer (Connection, Transport)
    ↓
WebSocket Protocol (Browser Native)
```

**Files:**
- `client/src/infrastructure/api/websocket/` - Low-level transport
- `client/src/infrastructure/api/realtime/` - High-level pub/sub

### 2. API Client Type Safety

**Decision:** Comprehensive type definitions for all API operations

**Implementation:**
- Extended `ApiRequest` with: `id`, `body`, `timeout`, `timestamp`
- Extended `ApiResponse` with: `id`, `requestId`, `duration`, `cached`, `fromFallback`
- Added `RequestOptions.skipCache` for cache control
- Generic type parameters for type-safe responses

**Benefits:**
- Compile-time error detection
- IDE autocomplete support
- Prevents runtime type errors
- Better maintainability

**Files:**
- `client/src/infrastructure/api/types/common.ts`
- `client/src/infrastructure/api/client.ts`

### 3. Non-Blocking Audit Logging

**Decision:** Fire-and-forget audit logging to prevent request blocking

**Problem:** Blocking `await` on audit logging caused server crashes when audit failed

**Solution:**
```typescript
// Before (blocking)
await securityAuditService.logSecurityEvent(event);

// After (non-blocking)
securityAuditService.logSecurityEvent(event).catch(error => {
  logger.error('Audit logging failed', { error });
});
```

**Benefits:**
- Requests complete even if audit fails
- Server doesn't crash on audit errors
- Audit logging is best-effort
- Better resilience

**Files:**
- `server/middleware/security.middleware.ts`
- `server/features/security/infrastructure/services/security-audit.service.ts`

### 4. SQL Injection Detection Pattern

**Decision:** Targeted SQL injection detection instead of blanket whitespace matching

**Problem:** Pattern `/(\s)/` matched ALL whitespace, blocking legitimate requests

**Solution:**
```typescript
// Before (too aggressive)
const SQL_INJECTION_PATTERN = /(\s)/;

// After (targeted)
const SQL_INJECTION_PATTERN = /(-{2}|\/\*|\*\/|;.*--|union.*select|insert.*into|delete.*from|drop.*table|update.*set)/i;
```

**Benefits:**
- Detects actual SQL injection attempts
- Allows legitimate whitespace in queries
- Reduces false positives
- Better user experience

**Files:**
- `server/infrastructure/validation/validation-utils.ts`
- `server/infrastructure/validation/input-validation-service.ts`

### 5. Vite Proxy Configuration

**Decision:** Use relative paths (`/api`) instead of absolute URLs in development

**Problem:** Hardcoded `http://localhost:4200` bypassed Vite proxy, causing CORS issues

**Solution:**
```typescript
// Before
const API_BASE_URL = 'http://localhost:4200';

// After
const API_BASE_URL = '/api';  // Proxied by Vite to :4200
```

**Benefits:**
- Works with Vite dev server proxy
- No CORS issues in development
- Easier to deploy (no URL changes)
- Consistent with production setup

**Files:**
- `client/src/infrastructure/api/config.ts`
- `client/src/lib/constants/index.ts`
- `client/src/lib/utils/env-config.ts`

### 6. Content Security Policy (CSP)

**Decision:** Balanced CSP allowing development tools while maintaining security

**Implementation:**
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
           style-src 'self' 'unsafe-inline'; 
           img-src 'self' data: blob: https:; 
           font-src 'self' data:; 
           connect-src 'self' http://localhost:4200 ws://localhost:4200 http://127.0.0.1:4200 ws://127.0.0.1:4200; 
           media-src 'self' blob:; 
           frame-src 'none';">
```

**Rationale:**
- `blob:` for media sources
- Both `localhost` and `127.0.0.1` for IPv4/IPv6 compatibility
- `frame-src 'none'` prevents iframe embedding
- `unsafe-inline` and `unsafe-eval` for development (should be removed in production)

**Files:**
- `client/index.html`

### 7. Database Integration Architecture

**Decision:** Multi-layer architecture with proper separation

**Layers:**
1. **Database Layer:** Drizzle ORM with read/write separation
2. **Service Layer:** Business logic with caching
3. **API Routes:** RESTful endpoints
4. **Client Service:** API client abstraction
5. **UI Components:** React components

**Data Flow:**
```
UI Component
    ↓
Client API Service (billsApiService)
    ↓
HTTP Request (/api/bills)
    ↓
Server Router (billsRouter)
    ↓
Service Layer (billService)
    ↓
Database (Drizzle ORM)
    ↓
PostgreSQL
```

**Benefits:**
- Clear separation of concerns
- Testable layers
- Cacheable at multiple levels
- Type-safe end-to-end

### 8. Error Handling Strategy

**Decision:** Different error handling patterns for client vs server

**Client (Imperative):**
```typescript
try {
  const data = await fetchData();
  return data;
} catch (error) {
  const clientError = ErrorFactory.createFromError(error);
  errorHandler.handleError(clientError);
  throw clientError;
}
```

**Server (Functional):**
```typescript
async fetchData(): AsyncServiceResult<Data> {
  return safeAsync(async () => {
    const data = await db.query(...);
    if (!data) {
      throw createNotFoundError('Data not found');
    }
    return data;
  });
}
```

**Rationale:**
- Client uses imperative style (familiar to React developers)
- Server uses Result monad (functional, composable)
- Both provide type safety
- Both integrate with observability

### 9. Caching Strategy

**Decision:** Multi-layer caching with proper invalidation

**Layers:**
1. **L1 (In-Memory):** Hot data, millisecond access
2. **L2 (Redis):** Shared cache, sub-second access
3. **L3 (Database):** Source of truth, indexed queries

**Invalidation:**
- Write operations invalidate related caches
- TTL-based expiration for stale data
- Manual invalidation for critical updates

**Benefits:**
- Reduced database load
- Faster response times
- Scalable architecture
- Resilient to cache failures

### 10. shared/core Module Boundary

**Decision:** Document that `shared/core` is mostly server infrastructure (~80%)

**Rationale:**
- Legacy architectural decision
- Server infrastructure added for convenience
- Should eventually move to `server/core/`
- Requires updating 30+ import statements

**Design Boundary:**
- **Add to shared/core ONLY if:** Used by both client and server
- **Add to server/infrastructure if:** Server-only code
- **When in doubt:** Check existing imports

**Future Plan:**
```
shared/core/                    server/core/ (future)
├── observability/    ───────→  ├── observability/
├── caching/         ───────→   ├── caching/
├── validation/      ───────→   ├── validation/
├── middleware/      ───────→   ├── middleware/
├── performance/     ───────→   ├── performance/
└── config/          ───────→   └── config/
```

## Implementation Patterns

### 1. Request Interceptors
```typescript
export const createLoggingRequestInterceptor = (): RequestInterceptor => {
  return async (request: BaseClientRequest): Promise<BaseClientRequest> => {
    logger.debug('API Request', { method: request.method, url: request.url });
    return request;
  };
};
```

### 2. Response Interceptors
```typescript
export const createLoggingResponseInterceptor = (): ResponseInterceptor => {
  return async <T>(response: BaseClientResponse<T>): Promise<BaseClientResponse<T>> => {
    const logLevel = response.status >= 400 ? 'warn' : 'debug';
    logger[logLevel]('API Response', { status: response.status });
    return response;
  };
};
```

### 3. Database Queries with Aggregations
```typescript
const billResults = await readDatabase
  .select({
    id: bills.id,
    title: bills.title,
    comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
    view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
  })
  .from(bills)
  .leftJoin(comments, eq(bills.id, comments.bill_id))
  .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
  .where(eq(bills.id, sanitizedId))
  .groupBy(bills.id);
```

### 4. Realtime Subscriptions
```typescript
// High-level (recommended)
const realtime = createRealtimeClient({ url: 'ws://localhost:4200' });
realtime.subscribe('bills:updates', (update) => {
  console.log('Bill updated:', update.billId);
});

// Low-level (when needed)
const ws = createWebSocketClient({ url: 'ws://localhost:4200' });
ws.on('message', (msg) => {
  console.log('Raw message:', msg);
});
```

## Consequences

### Positive
- Clear architectural patterns documented
- Design decisions preserved
- Implementation examples available
- Future developers have context
- Reduced documentation sprawl

### Negative
- Some historical context lost (mitigated by archiving)
- Need to maintain ADRs going forward
- Developers must read ADRs to understand decisions

### Neutral
- ADRs become source of truth for architecture
- Session summaries archived for reference
- Root directory cleaner

## Related Documents

- [ADR-001: API Client Consolidation](./ADR-001-api-client-consolidation.md)
- [ADR-005: CSP Manager Consolidation](./ADR-005-csp-manager-consolidation.md)
- [ADR-006: Validation Single Source](./ADR-006-validation-single-source.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [DOCUMENTATION_INDEX.md](../../DOCUMENTATION_INDEX.md)

## Archived Documents

The following root documents were consolidated into this ADR:
- `BILLS_API_FIX_2026-03-09.md`
- `CLIENT_API_FIXES_COMPLETE_2026-03-09.md`
- `SERVER_FIXES_COMPLETE_2026-03-09.md`
- `COMPLETE_FIX_SUMMARY_2026-03-09.md`
- `SESSION_SUMMARY_2026-03-09.md`
- `ALL_REACT_ERRORS_FIXED.md`
- `BILLS_PORTAL_FIX_SUMMARY.md`
- `BROWSER_CACHE_FIX.md`
- `CLEAR_BROWSER_CACHE_NOW.md`
- `CLIENT_CONNECTION_FIX.md`
- `DEMO_FIXES_COMPLETE.md`
- `DEMO_QUICK_REFERENCE.md`
- `DEMO_READINESS_FINAL_REPORT.md`
- `DEMO_READINESS_FIXES_SUMMARY.md`
- `DOCS_CLEANUP_COMPLETE.md`
- `DUPLICATE_REACT_IMPORT_FIXED.md`
- `FINAL_ERROR_FIX_SUMMARY.md`
- `FINAL_FIX_GUIDE.md`
- `FINAL_FIX_SUMMARY_2026-03-09.md`
- `QUICK_FIX_REFERENCE.md`
- `REACT_FORWARDREF_FIX_COMPLETE.md`
- `README_FIXES.md`
- `RESTART_INSTRUCTIONS.md`
- `SECURITY_FIXES_SUMMARY.md`
- `SERVER_STARTUP_SOLUTION.md`

These files have been archived to `docs/archive/root-cleanup-2026-03-09/`.
