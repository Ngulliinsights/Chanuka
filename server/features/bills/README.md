# Bills Feature Module

**Status:**
- Code Health: 90% ✅ — Well-architected DDD structure, comprehensive tests
- Feature Completeness: 95% ✅ — Full bill tracking, comments, voting, translations
- Launch Priority: Critical — Must-have for launch

## Overview

The Bills module is the core feature of the Chanuka platform, providing comprehensive legislative bill tracking, analysis, and community engagement. It follows full Domain-Driven Design (DDD) architecture with clear separation between domain logic, application services, and infrastructure.

## Purpose

- Track Kenyan legislative bills through their lifecycle
- Provide full-text search and filtering
- Enable community comments and voting on bills
- Track bill sponsorship and voting patterns
- Support multi-language translations (English/Swahili)
- Monitor bill status changes in real-time
- Calculate bill impact and relevance

## Architecture

### DDD Structure

```
bills/
├── domain/              # Business logic and entities
│   ├── entities/       # Bill, Comment, Vote entities
│   ├── services/       # Domain services
│   ├── events/         # Domain events
│   └── repositories/   # Repository interfaces
├── application/         # Use cases and orchestration
│   ├── bill-service.ts
│   ├── bill-tracking.service.ts
│   └── sponsorship-analysis.service.ts
├── infrastructure/      # Data access and external services
│   └── repositories/   # Repository implementations
├── presentation/        # HTTP layer
│   └── http/          # Route handlers
└── types/              # TypeScript types
```

## API Endpoints

### Bill Management

**GET /api/bills**
- Retrieve all bills with optional filtering
- Query params: `tags`, `limit`, `offset`
- Returns: Array of bills with metadata
- Auth: Not required

**GET /api/bills/:id**
- Retrieve specific bill by ID
- Increments view count automatically
- Returns: Full bill details with comments count
- Auth: Not required

**POST /api/bills**
- Create a new bill
- Body: Bill data (title, description, status, etc.)
- Returns: Created bill with ID
- Auth: Required

**POST /api/bills/:id/share**
- Increment share count for a bill
- Returns: Updated share count
- Auth: Not required

### Comments & Engagement

**GET /api/bills/:id/comments**
- Retrieve all comments for a bill
- Query params: `sort` (recent/popular), `limit`, `offset`
- Returns: Array of comments with user info
- Auth: Not required

**POST /api/bills/:id/comments**
- Create a new comment on a bill
- Body: `content`, `parent_id` (optional for replies)
- Returns: Created comment
- Auth: Required

**GET /api/bills/comments/:comment_id/replies**
- Get all replies to a specific comment
- Returns: Array of reply comments
- Auth: Not required

**PUT /api/bills/comments/:comment_id/endorsements**
- Update endorsement count (upvote/downvote)
- Body: `action` ('upvote' | 'downvote' | 'remove')
- Returns: Updated endorsement count
- Auth: Required

**PUT /api/bills/comments/:comment_id/highlight**
- Highlight a comment (moderator feature)
- Returns: Updated comment with highlight status
- Auth: Required (moderator)

**DELETE /api/bills/comments/:comment_id/highlight**
- Remove highlight from a comment
- Returns: Updated comment
- Auth: Required (moderator)

### Additional Routes

**Sponsorship:** `/api/bills/sponsorship/*` (see `sponsorship.routes.ts`)  
**Translations:** `/api/bills/translations/*` (see `translation-routes.ts`)  
**Tracking:** `/api/bills/tracking/*` (see `bill-tracking.routes.ts`)  
**Voting Patterns:** `/api/bills/voting-patterns/*` (see `voting-pattern-analysis-router.ts`)  
**Action Prompts:** `/api/bills/action-prompts/*` (see `action-prompts-routes.ts`)

### Admin Endpoints

**GET /api/bills/cache/stats**
- Get cache performance statistics
- Returns: Cache hit/miss rates, memory usage
- Auth: Required (admin)

## Database Tables

### Primary Tables (Owned by Bills Module)

**bills**
- `id` (PK) — Bill identifier
- `title` — Bill title
- `description` — Bill description
- `status` — Current status (draft, committee, floor, passed, rejected)
- `introduced_date` — Date introduced
- `sponsor_id` — Primary sponsor
- `tags` — Array of tags for categorization
- `view_count` — Number of views
- `share_count` — Number of shares
- `created_at`, `updated_at` — Timestamps

**bill_comments**
- `id` (PK) — Comment identifier
- `bill_id` (FK) — References bills.id
- `user_id` (FK) — References users.id
- `content` — Comment text
- `parent_id` (FK) — References bill_comments.id (for replies)
- `endorsement_count` — Upvote/downvote count
- `is_highlighted` — Moderator highlight flag
- `created_at`, `updated_at` — Timestamps

**bill_votes**
- `id` (PK) — Vote identifier
- `bill_id` (FK) — References bills.id
- `mp_id` (FK) — References mps.id
- `vote` — Vote value (yes, no, abstain)
- `vote_date` — Date of vote
- `created_at` — Timestamp

**bill_sponsorships**
- `id` (PK) — Sponsorship identifier
- `bill_id` (FK) — References bills.id
- `sponsor_id` (FK) — References mps.id
- `sponsorship_type` — Type (primary, co-sponsor)
- `created_at` — Timestamp

**bill_translations**
- `id` (PK) — Translation identifier
- `bill_id` (FK) — References bills.id
- `language` — Language code (en, sw)
- `title` — Translated title
- `description` — Translated description
- `created_at`, `updated_at` — Timestamps

### Shared Tables (Read Access)

- **users** — User information for comment authors
- **mps** — MP information for sponsors and votes
- **constituencies** — Constituency data for impact analysis

## Dependencies

### Internal Dependencies

- **@shared/types** — Shared TypeScript types
- **@shared/db** — Database client and utilities
- **@shared/core** — Observability, caching, validation
- **users feature** — User authentication and profiles
- **notifications feature** — Real-time bill status updates

### External Dependencies

- **PostgreSQL** — Primary data store
- **Redis** — Caching layer for frequently accessed bills
- **Neo4j** — Graph database for bill relationships (optional)

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chanuka

# Redis Cache
REDIS_URL=redis://localhost:6379
BILL_CACHE_TTL=3600  # 1 hour

# Feature Flags
ENABLE_BILL_TRANSLATIONS=true
ENABLE_VOTING_PATTERNS=true
ENABLE_REAL_TIME_TRACKING=true
```

### Feature Flags

- `bill-translations` — Enable multi-language support
- `voting-patterns` — Enable voting pattern analysis
- `real-time-tracking` — Enable WebSocket bill status updates
- `action-prompts` — Enable civic action prompts

## Key Services

### BillService (`application/bill-service.ts`)

Primary service for bill operations:
- `getAllBills(filters)` — Retrieve bills with filtering
- `getBillById(id)` — Get single bill with details
- `createBill(data)` — Create new bill
- `updateBill(id, data)` — Update existing bill
- `deleteBill(id)` — Soft delete bill
- `incrementViewCount(id)` — Track bill views
- `incrementShareCount(id)` — Track bill shares

### BillTrackingService (`application/bill-tracking.service.ts`)

Real-time bill status tracking:
- `trackBillStatus(billId)` — Monitor bill status changes
- `notifyStatusChange(billId, newStatus)` — Send notifications
- `getBillHistory(billId)` — Get status change history

### SponsorshipAnalysisService (`application/sponsorship-analysis.service.ts`)

Sponsorship pattern analysis:
- `analyzeSponsorshipPatterns(mpId)` — Analyze MP sponsorship history
- `findRelatedBills(billId)` — Find bills with similar sponsors
- `getSponsorshipNetwork(billId)` — Get co-sponsorship network

### VotingPatternAnalysisService (`services/voting-pattern-analysis-service.ts`)

Voting pattern analysis:
- `analyzeVotingPatterns(mpId)` — Analyze MP voting history
- `predictVote(billId, mpId)` — Predict MP vote on bill
- `getVotingAlignment(mp1Id, mp2Id)` — Calculate voting alignment

## Domain Events

The Bills module emits the following domain events:

- `BillCreated` — New bill added to system
- `BillStatusChanged` — Bill status updated
- `BillCommentAdded` — New comment on bill
- `BillVoteRecorded` — MP vote recorded
- `BillShared` — Bill shared by user
- `BillTranslationAdded` — New translation available

## Testing

### Test Coverage

- Unit tests: `__tests__/bill.repository.test.ts`
- Integration tests: `__tests__/bill-service.integration.test.ts`
- E2E tests: `tests/e2e/bills.spec.ts`

### Running Tests

```bash
# Unit tests
pnpm --filter @chanuka/server test bills

# Integration tests
pnpm --filter @chanuka/server test:integration bills

# E2E tests
pnpm test:e2e bills
```

## Performance

### Caching Strategy

- Bill list queries: 5-minute cache
- Individual bills: 1-hour cache
- Comments: 1-minute cache
- Cache invalidation on updates

### Optimization

- Database indexes on: `bill_id`, `status`, `introduced_date`, `tags`
- Pagination for large result sets
- Lazy loading of comments
- Denormalized view/share counts for performance

## Migration Guides

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** — Integrating with bills module
- **[INTEGRATION_QUICK_START.md](./INTEGRATION_QUICK_START.md)** — Quick start guide
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** — Migration history

## Common Use Cases

### 1. Display Bill List

```typescript
import { billService } from '@server/features/bills';

const bills = await billService.getAllBills({
  tags: ['healthcare'],
  limit: 20,
  offset: 0
});
```

### 2. Get Bill Details

```typescript
const bill = await billService.getBillById(123);
// Automatically increments view count
```

### 3. Add Comment

```typescript
const comment = await billService.addComment(billId, {
  userId: user.id,
  content: 'This bill will impact...',
  parentId: null // or parent comment ID for reply
});
```

### 4. Track Bill Status

```typescript
import { billTrackingService } from '@server/features/bills';

await billTrackingService.trackBillStatus(billId);
// Sends notifications when status changes
```

## Troubleshooting

### "Bill not found" errors

Check that bill ID exists and is not soft-deleted.

### Cache inconsistency

Clear Redis cache: `redis-cli FLUSHDB`

### Slow comment queries

Ensure `bill_id` index exists on `bill_comments` table.

### Translation not appearing

Check `ENABLE_BILL_TRANSLATIONS` feature flag is enabled.

## Future Enhancements

- [ ] Advanced semantic search using ML
- [ ] Bill similarity detection
- [ ] Automated bill summarization
- [ ] Constituency impact prediction
- [ ] Bill amendment tracking
- [ ] Committee hearing integration

## Related Documentation

- [Server Features Overview](../README.md)
- [DDD Architecture](../../docs/technical/architecture.md)
- [API Documentation](../../docs/api-client-guide.md)

---

**Maintainer:** Bills team  
**Last Updated:** March 6, 2026  
**Questions?** See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
