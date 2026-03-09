# Bills Feature Architecture

**Last Updated:** March 9, 2026  
**Status:** ✅ Production Ready with Known Gaps

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Client-Server Contract](#client-server-contract)
4. [Known Issues](#known-issues)
5. [Quick Fixes](#quick-fixes)

## Overview

The Bills module is the core feature of the Chanuka platform, providing comprehensive legislative bill tracking, analysis, and community engagement.

**Launch Priority:** Critical — Must-have for launch

### Purpose
- Track Kenyan legislative bills through their lifecycle
- Provide constitutional and legal analysis
- Enable community discussion and engagement
- Analyze sponsorship patterns and conflicts of interest
- Support multi-language translations
- Calculate bill impact and relevance

## Architecture

### Clean Architecture Layers

```
server/features/bills/
├── presentation/          # HTTP layer
│   └── http/             # Route handlers
│       ├── bills.routes.ts
│       ├── sponsorship.routes.ts
│       ├── action-prompts.routes.ts
│       ├── bill-tracking.routes.ts
│       ├── translation.routes.ts
│       ├── voting-pattern-analysis.routes.ts
│       ├── real-time-tracking.routes.ts
│       ├── integration-status.routes.ts
│       └── coverage-routes.ts
├── application/          # Use cases & services
│   ├── bill-service.ts
│   ├── bill-service-adapter.ts
│   ├── bill-tracking.service.ts
│   ├── bill-status-monitor.service.ts
│   ├── sponsorship-analysis.service.ts
│   ├── bill-integration-orchestrator.ts
│   └── bill-lifecycle-hooks.ts
├── domain/              # Business logic
│   ├── entities/
│   ├── repositories/
│   │   ├── bill.repository.ts
│   │   └── sponsorship-repository.ts
│   ├── services/
│   │   └── bill.domain.service.ts
│   └── events/
├── infrastructure/      # External concerns
│   ├── bill-storage.ts
│   └── legislative-storage.ts
├── services/           # Domain services (to be consolidated)
│   ├── impact-calculator.ts
│   ├── translation-service.ts
│   └── voting-pattern-analysis-service.ts
├── types/              # Type definitions
└── bill.factory.ts     # DI container
```

### Recent Improvements (March 9, 2026)

✅ **Completed:**
- Moved all routes to `presentation/http/`
- Consolidated repositories in `domain/repositories/`
- Fixed `bill-storage.ts` import issues
- Organized services by layer

⚠️ **Remaining Issues:**
- `services/` folder needs consolidation into `application/` or `domain/services/`
- 15 missing server endpoints that client expects
- Route path inconsistencies between client and server

## Client-Server Contract

### ✅ Implemented Endpoints

| Method | Path | Handler | Status |
|--------|------|---------|--------|
| GET | `/bills` | bills.routes.ts | ✅ |
| GET | `/bills/:id` | bills.routes.ts | ✅ |
| POST | `/bills` | bills.routes.ts | ✅ |
| GET | `/bills/:id/comments` | bills.routes.ts | ✅ |
| POST | `/bills/:id/comments` | bills.routes.ts | ✅ |
| POST | `/bills/:id/share` | bills.routes.ts | ✅ |
| GET | `/bills/:bill_id/sponsorship-analysis` | sponsorship.routes.ts | ✅ |
| GET | `/bills/:bill_id/sponsorship-analysis/primary-sponsor` | sponsorship.routes.ts | ✅ |
| GET | `/bills/:bill_id/sponsorship-analysis/co-sponsors` | sponsorship.routes.ts | ✅ |
| GET | `/bills/:bill_id/sponsorship-analysis/financial-network` | sponsorship.routes.ts | ✅ |

### ❌ Missing Endpoints (High Priority)

**Critical (Breaks Features):**
1. `POST /bills/:id/track` - Bill tracking
2. `POST /bills/:id/untrack` - Untrack bills
3. `POST /comments/:id/vote` - Comment voting
4. `GET /bills/:id/sponsors` - Sponsor list
5. `GET /bills/:id/analysis` - Bill analysis

**Medium Priority:**
6. `POST /bills/:id/engagement` - Analytics tracking
7. `POST /comments/:id/endorse` - Expert endorsements
8. `GET /bills/meta/categories` - Category metadata
9. `GET /bills/meta/statuses` - Status metadata

**Low Priority:**
10. `POST /bills/:id/polls` - Poll creation
11. `GET /bills/:id/polls` - Poll retrieval

### Route Path Inconsistencies

**Issue:** Client expects different paths than server provides

**Sponsorship Routes:**
- Client: `/bills/:id/analysis/sponsorship`
- Server: `/bills/:bill_id/sponsorship-analysis`

**Solution:** Add route aliases to support both patterns

## Known Issues

### 1. Services Directory Ambiguity

**Problem:** Two service directories with unclear distinction
```
services/                    # Domain services?
├── impact-calculator.ts
├── translation-service.ts
└── voting-pattern-analysis-service.ts

application/                 # Application services
├── bill-service.ts
└── sponsorship-analysis.service.ts
```

**Solution:** 
- Move domain services to `domain/services/`
- Keep application services in `application/`
- Document the distinction clearly

### 2. Missing Server Implementations

**Impact:** 15 client API calls will fail

**Priority Order:**
1. 🔴 Bill tracking endpoints (track/untrack)
2. 🔴 Comment voting endpoint
3. 🔴 Sponsor list endpoint
4. 🔴 Bill analysis endpoint
5. 🟡 Engagement tracking
6. 🟡 Metadata endpoints
7. 🟢 Polls feature

### 3. Type System Gaps

**Issue:** Client uses deprecated types
- `BillsSearchParams` is deprecated but still in use
- Some types don't match server schema

**Solution:** Align types with `@shared/types`

## Quick Fixes

### Phase 1: Structural (Completed ✅)
- [x] Move `repositories/sponsorship-repository.ts` → `domain/repositories/`
- [x] Move `application/integration-status.routes.ts` → `presentation/http/`
- [x] Update imports

### Phase 2: Critical Endpoints (2-3 hours)

Add to `presentation/http/bills.routes.ts`:

```typescript
// Bill Tracking
router.post('/:id/track', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  const userId = req.user!.id;
  
  await billTrackingService.trackBill(userId, billId);
  
  res.json({ success: true, message: 'Bill tracked successfully' });
}));

router.post('/:id/untrack', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  const userId = req.user!.id;
  
  await billTrackingService.untrackBill(userId, billId);
  
  res.json({ success: true, message: 'Bill untracked successfully' });
}));

// Comment Voting
router.post('/comments/:id/vote', authenticateToken, asyncHandler(async (req, res) => {
  const commentId = parseIntParam(req.params.id, 'Comment ID');
  const { type } = req.body;
  
  const comment = await legislativeStorage.voteOnComment(commentId, type, req.user!.id);
  
  res.json({ success: true, data: comment });
}));

// Sponsors List
router.get('/:id/sponsors', asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  
  const sponsors = await legislativeStorage.getBillSponsors(billId);
  
  res.json({ success: true, data: sponsors });
}));

// Bill Analysis
router.get('/:id/analysis', asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  
  const analysis = await billService.getComprehensiveAnalysis(billId);
  
  res.json({ success: true, data: analysis });
}));
```

### Phase 3: Route Aliases (1 hour)

Add to `presentation/http/sponsorship.routes.ts`:

```typescript
// Support both path patterns
router.get('/bills/:id/analysis/sponsorship', /* same handler as sponsorship-analysis */);
router.get('/bills/:id/analysis/sponsor/primary', /* same handler */);
router.get('/bills/:id/analysis/sponsor/co', /* same handler */);
router.get('/bills/:id/analysis/financial', /* same handler */);
```

### Phase 4: Services Consolidation (2 hours)

1. Analyze each service in `services/` folder
2. Determine if domain or application service
3. Move to appropriate location
4. Update imports
5. Remove empty `services/` folder

## Database Schema

### Primary Tables

**bills**
- Core bill information
- Status tracking
- Engagement metrics
- Full-text search support

**bill_tags**
- Bill categorization
- Tag-based filtering

**bill_engagement**
- User interactions
- Analytics data

**bill_tracking_preferences**
- User tracking settings
- Notification preferences

### Shared Tables (Read Access)
- **users** — User information
- **sponsors** — Bill sponsors
- **comments** — Community discussions

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/chanuka
REDIS_URL=redis://localhost:6379
BILL_CACHE_TTL=3600
ENABLE_BILL_TRANSLATIONS=true
ENABLE_VOTING_PATTERNS=true
```

### Feature Flags
- `bill-translations` — Multi-language support
- `voting-patterns` — Voting pattern analysis
- `sponsorship-analysis` — Financial network analysis
- `action-prompts` — Civic action prompts

## Dependencies

### Internal
- `@shared/types` — Shared TypeScript types
- `@server/infrastructure/database` — Database access
- `@server/infrastructure/cache` — Redis caching
- `@server/features/security` — Audit logging
- `@server/features/notifications` — Real-time updates

### External
- PostgreSQL — Primary data store
- Redis — Caching layer
- Neo4j — Graph database (optional)

## Testing

### Integration Tests
- `__tests__/bill-service.integration.test.ts`
- `__tests__/bill.repository.test.ts`

### Coverage
- Current: ~70%
- Target: 85%

## Performance

### Caching Strategy
- Bill list: 5 minutes TTL
- Bill details: 1 hour TTL
- Comments: 5 minutes TTL
- Analysis: 1 hour TTL

### Optimization
- Database indexes on frequently queried fields
- Redis caching for hot data
- Pagination for large result sets
- Virtual scrolling on client

## Security

### Authentication
- Required for: POST, PUT, DELETE operations
- Optional for: GET operations (public data)

### Authorization
- Admin: Full access
- Moderator: Comment moderation
- User: Own data + public data

### Audit Logging
- All data access logged via `securityAuditService`
- Includes user ID, operation, timestamp

## Monitoring

### Metrics
- Request count by endpoint
- Response times
- Error rates
- Cache hit rates

### Alerts
- High error rate (>5%)
- Slow queries (>1s)
- Cache misses (>50%)

## Next Steps

1. **Immediate (This Week)**
   - Implement missing critical endpoints
   - Add route aliases for path consistency
   - Consolidate services folder

2. **Short-term (Next 2 Weeks)**
   - Add comprehensive tests
   - Implement engagement tracking
   - Add metadata endpoints

3. **Long-term (Next Month)**
   - Implement polls feature
   - Add advanced analytics
   - Optimize performance

## References

- [Client-Server Congruence Analysis](./CLIENT_SERVER_CONGRUENCE_ANALYSIS.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Migration Summary](./MIGRATION_SUMMARY.md)
