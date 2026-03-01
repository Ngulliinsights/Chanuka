# MVP Integration Guide - Community & Analysis Features

## Current Situation

### Existing Community Router
There's already a community router at `server/features/community/community.ts` with:
- Comment CRUD operations
- Voting system
- Statistics endpoints
- Uses old `commentService` and `commentVotingService`

### New Community Implementation
We created a modernized version with:
- `CommunityApplicationService` with argument intelligence
- Database-backed mocks (`MockCommentRepository`, `MockArgumentAnalysisService`)
- 11 REST endpoints with AI analysis
- Validation schemas and Result types

## Integration Options

### Option 1: Replace Existing Router (Recommended)
Replace the old router with our new implementation.

**Pros**:
- Clean, modern architecture
- AI-powered argument analysis
- Better error handling
- Consistent with other modernized features

**Cons**:
- Breaking change for existing clients
- Need to migrate any existing data

### Option 2: Run Both in Parallel
Keep old routes and add new ones with different paths.

**Pros**:
- No breaking changes
- Gradual migration possible

**Cons**:
- Confusing to have two systems
- More maintenance burden

### Option 3: Hybrid Approach
Use new service layer but keep compatible API.

**Pros**:
- Modern backend, compatible frontend
- Best of both worlds

**Cons**:
- More complex implementation

## Recommended Implementation: Option 1 (Replace)

### Step 1: Backup Existing Implementation
```bash
# Create backup
cp server/features/community/community.ts server/features/community/community.ts.backup
```

### Step 2: Update Server Index
The routes are already registered in `server/index.ts`:
```typescript
import { router as communityRouter } from '@server/features/community/community';
app.use('/api/community', communityRouter);
```

Change to:
```typescript
import communityRoutes from '@server/features/community/presentation/http/community-routes';
app.use('/api/community', communityRoutes);
```

### Step 3: Run Database Migrations

Create a migration runner script if you don't have one:

```typescript
// scripts/run-migrations.ts
import { readFileSync } from 'fs';
import { pool } from '@server/infrastructure/database';

async function runMigrations() {
  const migrations = [
    'server/infrastructure/database/migrations/20260301_create_comments_table.sql',
    'server/infrastructure/database/migrations/20260301_create_argument_analysis_table.sql',
    'server/infrastructure/database/migrations/20260301_seed_mock_community_data.sql',
  ];

  for (const migration of migrations) {
    console.log(`Running migration: ${migration}`);
    const sql = readFileSync(migration, 'utf-8');
    await pool.query(sql);
    console.log(`✅ Completed: ${migration}`);
  }

  console.log('🎉 All migrations complete!');
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
```

Run it:
```bash
npx ts-node scripts/run-migrations.ts
```

Or manually with psql:
```bash
psql -d your_database -f server/infrastructure/database/migrations/20260301_create_comments_table.sql
psql -d your_database -f server/infrastructure/database/migrations/20260301_create_argument_analysis_table.sql
psql -d your_database -f server/infrastructure/database/migrations/20260301_seed_mock_community_data.sql
```

### Step 4: Verify Database Tables
```bash
psql -d your_database -c "\dt comments argument_analysis"
psql -d your_database -c "SELECT COUNT(*) FROM comments"
psql -d your_database -c "SELECT COUNT(*) FROM argument_analysis"
```

Expected output:
- 2 tables exist
- Some seed data rows (3-5 comments)

### Step 5: Test Endpoints

#### Test 1: Get Comments
```bash
# Get first bill ID
BILL_ID=$(psql -d your_database -t -c "SELECT id FROM bills LIMIT 1" | tr -d ' ')

# Get comments
curl http://localhost:3000/api/community/bills/$BILL_ID/comments
```

Expected: JSON array of comments

#### Test 2: Create Comment with Analysis
```bash
curl -X POST http://localhost:3000/api/community/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{
    \"bill_id\": $BILL_ID,
    \"content\": \"According to the Congressional Budget Office report from Q4 2025, this bill will reduce administrative costs by approximately 15%. The evidence from similar legislation in California supports this projection.\",
    \"analyze_argument\": true
  }"
```

Expected: Comment with argument_analysis object

#### Test 3: Vote on Comment
```bash
# Get a comment ID from previous response
COMMENT_ID="paste-comment-id-here"

curl -X POST http://localhost:3000/api/community/comments/$COMMENT_ID/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"vote": "up"}'
```

Expected: Updated vote counts

#### Test 4: Get Debate Quality
```bash
curl http://localhost:3000/api/community/bills/$BILL_ID/debate-quality
```

Expected: Quality metrics object

## Analysis Feature Integration

The Analysis feature is already integrated! Just verify it works:

### Test Analysis Endpoint
```bash
curl http://localhost:3000/api/analysis/bills/$BILL_ID/comprehensive
```

Expected: Comprehensive analysis object with:
- Constitutional analysis
- Stakeholder impact
- Transparency score
- Public interest score
- Recommended actions

### Test with Force Reanalysis
```bash
curl "http://localhost:3000/api/analysis/bills/$BILL_ID/comprehensive?force=true"
```

### Test Analysis History
```bash
curl "http://localhost:3000/api/analysis/bills/$BILL_ID/history?limit=5"
```

## Troubleshooting

### Issue: "Cannot find module '@server/infrastructure/database'"

**Solution**: Check tsconfig.json paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@server/*": ["server/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

### Issue: "readDatabase is not a function"

**Solution**: The functions exist in `server/infrastructure/database/connection.ts`. Make sure imports are correct:
```typescript
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
```

If using a different pattern, update the mock implementations.

### Issue: "Table 'comments' does not exist"

**Solution**: Run migrations:
```bash
psql -d your_database -f server/infrastructure/database/migrations/20260301_create_comments_table.sql
```

### Issue: "No bills found for seeding"

**Solution**: The seed script skips if no bills exist. Either:
1. Add bills first
2. Skip seed script and add comments manually via API

### Issue: "Authentication required"

**Solution**: Some endpoints require authentication. Either:
1. Get a valid JWT token
2. Temporarily disable auth for testing
3. Use endpoints that don't require auth (GET endpoints)

## API Compatibility

### Old API → New API Mapping

| Old Endpoint | New Endpoint | Notes |
|-------------|--------------|-------|
| `GET /comments/:bill_id` | `GET /bills/:billId/comments` | Path changed |
| `POST /comments` | `POST /comments` | Same, but different body structure |
| `POST /comments/:id/vote` | `POST /comments/:id/vote` | Same |
| `GET /comments/:bill_id/stats` | `GET /bills/:billId/debate-quality` | Enhanced with AI metrics |
| `GET /comments/:bill_id/trending` | `GET /bills/:billId/comments?sort_by=quality` | Use quality sorting |

### Request Body Changes

**Old Create Comment**:
```json
{
  "bill_id": 123,
  "content": "...",
  "commentType": "general",
  "parent_id": 456
}
```

**New Create Comment**:
```json
{
  "bill_id": 123,
  "content": "...",
  "parent_id": "uuid-string",
  "analyze_argument": true
}
```

### Response Structure Changes

**Old Response**:
```json
{
  "id": 123,
  "bill_id": 456,
  "content": "...",
  "upvotes": 10,
  "downvotes": 2
}
```

**New Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "bill_id": "uuid-string",
    "content": "...",
    "upvotes": 10,
    "downvotes": 2,
    "argument_analysis": {
      "quality_metrics": {
        "overall_score": 8.5,
        "evidence_strength": 0.9,
        ...
      },
      ...
    }
  }
}
```

## Migration Strategy

### Phase 1: Parallel Deployment (Week 1)
1. Deploy new endpoints alongside old ones
2. Update frontend to use new endpoints
3. Monitor for issues

### Phase 2: Gradual Migration (Week 2)
1. Migrate 10% of traffic to new endpoints
2. Monitor performance and errors
3. Gradually increase to 100%

### Phase 3: Deprecation (Week 3)
1. Mark old endpoints as deprecated
2. Send deprecation notices
3. Set sunset date

### Phase 4: Removal (Week 4)
1. Remove old endpoints
2. Clean up old code
3. Update documentation

## Testing Checklist

- [ ] Database migrations run successfully
- [ ] Tables created (comments, argument_analysis)
- [ ] Seed data inserted
- [ ] GET /bills/:billId/comments returns data
- [ ] POST /comments creates comment
- [ ] POST /comments with analyze_argument returns analysis
- [ ] POST /comments/:id/vote updates votes
- [ ] GET /bills/:billId/debate-quality returns metrics
- [ ] GET /analysis/bills/:billId/comprehensive returns analysis
- [ ] GET /analysis/bills/:billId/history returns history
- [ ] Error handling works correctly
- [ ] Authentication works (if enabled)
- [ ] Caching works (check response times)

## Performance Expectations

### Community Endpoints
- GET comments: <100ms (cached), <500ms (uncached)
- POST comment: <200ms
- POST vote: <100ms
- GET debate quality: <300ms (cached), <1s (uncached)

### Analysis Endpoints
- GET analysis: <200ms (cached), <5s (uncached, first run)
- POST trigger: <5s
- GET history: <100ms (cached), <300ms (uncached)

## Next Steps After Integration

1. ✅ Verify all endpoints work
2. ✅ Test with real data
3. ✅ Monitor performance
4. ⏳ Update frontend to use new endpoints
5. ⏳ Add automated tests
6. ⏳ Set up monitoring and alerts
7. ⏳ Document API for frontend team
8. ⏳ Plan production deployment

---

**Status**: Ready for Integration
**Estimated Time**: 2-3 hours
**Risk Level**: Medium (breaking changes)
**Rollback Plan**: Restore backup of old router

