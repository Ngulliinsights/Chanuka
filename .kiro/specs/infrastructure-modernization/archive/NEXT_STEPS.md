# Next Steps to Run Community MVP

## Current Status
✅ All code complete
✅ Database migrations ready
✅ API routes ready
⏳ Need to wire up and test

## Step-by-Step Instructions

### 1. Run Database Migrations (5 minutes)

You have 3 migration files that need to be executed:

```bash
# Option A: If you have a migration runner
npm run migrate

# Option B: Manual execution with psql
psql -d your_database_name -f server/infrastructure/database/migrations/20260301_create_comments_table.sql
psql -d your_database_name -f server/infrastructure/database/migrations/20260301_create_argument_analysis_table.sql
psql -d your_database_name -f server/infrastructure/database/migrations/20260301_seed_mock_community_data.sql
```

**Verify migrations worked:**
```bash
psql -d your_database_name -c "\dt comments argument_analysis"
psql -d your_database_name -c "SELECT COUNT(*) FROM comments"
```

Expected: Should see 2 tables and some seed data rows.

### 2. Register API Routes (2 minutes)

Find your main server file (likely `server/index.ts` or `server/app.ts`) and add:

```typescript
// Add import at top
import communityRoutes from './features/community/presentation/http/community-routes';

// Add route registration (after other routes)
app.use('/api/community', communityRoutes);
```

### 3. Verify Database Helper Functions Exist (2 minutes)

The mock implementations use these functions from `@server/infrastructure/database`:
- `readDatabase()`
- `writeDatabase()`
- `withTransaction()`

Check if these exist in your codebase:
```bash
# Search for these functions
grep -r "export.*readDatabase" server/infrastructure/database/
grep -r "export.*writeDatabase" server/infrastructure/database/
grep -r "export.*withTransaction" server/infrastructure/database/
```

If they don't exist, you'll need to create them or adapt the mock implementations to use your existing database access patterns.

### 4. Start the Server (1 minute)

```bash
npm run dev
# or
npm start
```

### 5. Test Basic Endpoint (2 minutes)

```bash
# Get the first bill ID from your database
BILL_ID=$(psql -d your_database_name -t -c "SELECT id FROM bills LIMIT 1")

# Test getting comments
curl http://localhost:3000/api/community/bills/$BILL_ID/comments

# Expected: JSON response with comments array
```

### 6. Test Creating a Comment (3 minutes)

```bash
# Create a high-quality comment
curl -X POST http://localhost:3000/api/community/comments \
  -H "Content-Type: application/json" \
  -d "{
    \"bill_id\": \"$BILL_ID\",
    \"content\": \"According to the Congressional Budget Office report, this bill will reduce costs by 15%. The evidence from similar legislation supports this projection.\",
    \"analyze_argument\": true
  }"

# Expected: JSON response with comment and argument_analysis
```

### 7. Test Voting (1 minute)

```bash
# Get a comment ID from the previous response
COMMENT_ID="<paste-comment-id-here>"

# Vote on it
curl -X POST http://localhost:3000/api/community/comments/$COMMENT_ID/vote \
  -H "Content-Type: application/json" \
  -d '{"vote": "up"}'

# Expected: JSON response with updated vote counts
```

### 8. Test Quality Filtering (1 minute)

```bash
# Get only high-quality comments
curl "http://localhost:3000/api/community/bills/$BILL_ID/comments?sort_by=quality&min_quality_score=7.0"

# Expected: JSON response with only high-quality comments
```

### 9. Test Debate Quality Metrics (1 minute)

```bash
# Get debate quality metrics
curl http://localhost:3000/api/community/bills/$BILL_ID/debate-quality

# Expected: JSON response with quality metrics
```

## Troubleshooting

### Issue: "Cannot find module '@server/infrastructure/database'"

**Solution**: Check your TypeScript path aliases in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@server/*": ["server/*"]
    }
  }
}
```

### Issue: "readDatabase is not a function"

**Solution**: Your database infrastructure might use different function names. Update the mock implementations:

```typescript
// In MockCommentRepository.ts and MockArgumentAnalysisService.ts
// Replace:
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';

// With your actual database access pattern, e.g.:
import { db } from '@server/infrastructure/database/pool';
```

### Issue: "Table 'comments' does not exist"

**Solution**: Migrations didn't run. Execute them manually:
```bash
psql -d your_database_name -f server/infrastructure/database/migrations/20260301_create_comments_table.sql
```

### Issue: "Cannot read property 'id' of undefined" when seeding

**Solution**: No bills or users in database. The seed script skips if no data exists. Either:
1. Add bills/users first
2. Manually insert test comments without running seed script

### Issue: "Port 3000 already in use"

**Solution**: Your server might use a different port. Check your `.env` file or server config.

## Quick Verification Checklist

- [ ] Migrations executed successfully
- [ ] Tables `comments` and `argument_analysis` exist
- [ ] Seed data inserted (at least 1 comment)
- [ ] Routes registered in main server file
- [ ] Server starts without errors
- [ ] GET /api/community/bills/:billId/comments returns data
- [ ] POST /api/community/comments creates a comment
- [ ] Analysis is performed and stored
- [ ] Voting works
- [ ] Quality filtering works

## If Everything Works

You should see:
1. ✅ Comments retrieved from database
2. ✅ New comments created with analysis
3. ✅ Quality scores calculated (0-10)
4. ✅ Evidence detected in high-quality comments
5. ✅ Fallacies detected in low-quality comments
6. ✅ Voting updates counts
7. ✅ Quality filtering works
8. ✅ Debate metrics calculated

## Demo Script

Once everything works, use this 3-minute demo:

1. **Show existing comments** (30 sec)
   - GET comments sorted by quality
   - Point out quality scores

2. **Create high-quality comment** (1 min)
   - POST with evidence-based content
   - Show quality score 8+
   - Show evidence detected

3. **Create low-quality comment** (1 min)
   - POST with fallacies
   - Show quality score 3-4
   - Show fallacies detected
   - Show improvement suggestions

4. **Show filtering** (30 sec)
   - GET with min_quality_score=7.0
   - Show only high-quality comments

## Need Help?

Check these files for details:
- `.kiro/specs/infrastructure-modernization/COMMUNITY_MVP_COMPLETE.md` - Full implementation guide
- `.kiro/specs/infrastructure-modernization/MVP_MOCK_STRATEGY.md` - Architecture explanation
- `server/features/community/presentation/http/community-routes.ts` - API endpoint definitions

---

**Total Time**: ~20 minutes to get running
**Difficulty**: Easy (if database helpers exist)
**Next Feature**: Analysis (8th core MVP feature)

