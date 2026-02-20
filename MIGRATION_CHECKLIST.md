# DatabaseService Migration Checklist

## Quick Reference

Use this checklist to track your migration progress.

## Phase 1: Import Removal ✅ COMPLETE

- [x] server/infrastructure/migration/repository-deployment-validator.ts
- [x] server/features/community/comment-voting.ts
- [x] server/features/community/comment.ts
- [x] server/features/bills/application/bills.ts
- [x] server/features/bills/application/bill-tracking.service.ts
- [x] server/features/analysis/application/bill-comprehensive-analysis.service.ts
- [x] server/features/analytics/services/engagement.service.ts

## Phase 2: Code Pattern Migration ⚠️ IN PROGRESS

### High Priority Files

#### server/features/users/domain/user-profile.ts (11 calls)
- [ ] Line 176: `getUserProfile` - withFallback call
- [ ] Line 262: `createOrUpdateProfile` - withFallback call
- [ ] Line 319: `updateUserInterests` - withFallback call
- [ ] Line 355: `updateBasicInfo` - withFallback call
- [ ] Line 457: `getUserActivitySummary` - withFallback call
- [ ] Line 507: `updateUserPreferences` - withFallback call
- [ ] Line 551: `updateVerificationStatus` - withFallback call
- [ ] Line 611: `getUserNotificationSettings` - withFallback call
- [ ] Line 665: `getUserEngagementStats` - withFallback call
- [ ] Line 792: `deleteUserProfile` - withFallback call
- [ ] Additional calls if any

#### server/features/community/comment.ts (9 calls)
- [ ] Line 118: `getBillComments` - withFallback call
- [ ] Line 362: `getCommentReplies` - withFallback call
- [ ] Line 441: `createComment` - withFallback call
- [ ] Line 562: `updateComment` - withFallback call
- [ ] Line 634: `deleteComment` - withFallback call
- [ ] Line 660: `findCommentById` - withFallback call
- [ ] Line 717: `getReplyCount` - withFallback call
- [ ] Line 743: `getCommentStats` - withFallback call
- [ ] Additional calls if any

#### server/features/community/comment-voting.ts (5 calls)
- [ ] Line 36: `voteOnComment` - withFallback call
- [ ] Line 149: `getUserVote` - withFallback call
- [ ] Line 172: `getCommentVotingStats` - withFallback call
- [ ] Line 232: `getTrendingComments` - withFallback call
- [ ] Line 317: `getUserVotingHistory` - withFallback call
- [ ] Line 404: Additional withFallback call

### Medium Priority Files

#### server/features/analytics/services/engagement.service.ts (4 calls)
- [ ] Line 36: `getUserEngagementMetrics` - withFallback call
- [ ] Line 155: `getBillEngagementMetrics` - withFallback call
- [ ] Line 263: `getEngagementTrends` - withFallback call
- [ ] Line 325: `getEngagementLeaderboard` - withFallback call

#### server/features/search/infrastructure/SearchIndexManager.ts (4 calls)
- [ ] Line 158: First withFallback call
- [ ] Line 236: Second withFallback call
- [ ] Line 347: Third withFallback call
- [ ] Line 418: Fourth withFallback call

### Low Priority Files

#### server/infrastructure/adapters/drizzle-adapter.ts (4 calls)
- [ ] Line 61: `findById` - withFallback call
- [ ] Line 93: `findMany` - withFallback call
- [ ] Line 245: `count` - withFallback call
- [ ] Line 317: `search` - withFallback call

## Phase 3: Testing

### Unit Tests
- [ ] Run type check: `npm run type-check`
- [ ] Test user profile operations
- [ ] Test comment operations
- [ ] Test comment voting operations
- [ ] Test analytics services
- [ ] Test search functionality
- [ ] Test drizzle adapter

### Integration Tests
- [ ] Test full user flow
- [ ] Test comment creation and voting
- [ ] Test analytics dashboard
- [ ] Test search functionality

### Manual Testing
- [ ] Start dev server: `npm run dev`
- [ ] Test user profile pages
- [ ] Test comment sections
- [ ] Test voting functionality
- [ ] Test analytics views
- [ ] Test search features

## Phase 4: Cleanup

- [ ] Remove `database-service.ts` file (if exists)
- [ ] Remove `database-service.d.ts` from dist
- [ ] Update any remaining documentation
- [ ] Remove migration guide files (optional)

## Phase 5: Verification

- [ ] No TypeScript errors: `npm run type-check`
- [ ] All tests passing: `npm test`
- [ ] No runtime errors in dev
- [ ] Code review completed
- [ ] Documentation updated

## Quick Commands

```bash
# Check for remaining databaseService references
grep -r "databaseService" server/ --exclude-dir=dist --exclude-dir=node_modules

# Check TypeScript errors
npm run type-check

# Run tests
npm test

# Start dev server
npm run dev
```

## Progress Tracker

- **Total Tasks**: 44
- **Completed**: 7 (16%)
- **Remaining**: 37 (84%)
- **Estimated Time**: 4-7 hours

## Notes

- Each withFallback replacement takes ~5-10 minutes
- Test after each file migration
- Commit after each successful file migration
- Use the migration guide for reference patterns

## Status Legend

- ✅ Complete
- ⚠️ In Progress
- ❌ Not Started
- 🔄 Testing
- 📝 Needs Review
