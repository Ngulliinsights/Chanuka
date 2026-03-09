# Bills Feature Testing Guide

## Overview
This guide provides instructions for testing the bills feature integration across server, client, and database.

## Prerequisites
- Server running on `http://localhost:3000`
- Database accessible and migrated
- Valid authentication tokens
- Redis cache running

## Running Automated Tests

### Integration Tests
```bash
# Run all integration tests
npm test server/features/bills/__tests__/integration

# Run with coverage
npm test -- --coverage server/features/bills/__tests__/integration

# Run specific test suite
npm test bills-feature.integration.test.ts
```

### Expected Results
- All tests should pass
- Coverage should be >80%
- No database errors
- No TypeScript errors

## Manual Testing

### 1. Core Bill Operations

#### Create a Bill
```bash
curl -X POST http://localhost:3000/api/bills \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_number": "BILL-2026-001",
    "title": "Test Bill for Manual Testing",
    "description": "This is a test bill to verify the integration works correctly.",
    "status": "introduced",
    "category": "technology",
    "sponsor_id": 1
  }'
```

Expected: 201 Created with bill object

#### Get All Bills
```bash
curl http://localhost:3000/api/bills?page=1&limit=10
```

Expected: 200 OK with bills array

#### Get Single Bill
```bash
curl http://localhost:3000/api/bills/1
```

Expected: 200 OK with bill object


### 2. Bill Tracking

#### Track a Bill
```bash
curl -X POST http://localhost:3000/api/bills/1/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_types": ["status_changes", "new_comments"],
    "alert_frequency": "immediate",
    "alert_channels": ["in_app", "email"]
  }'
```

Expected: 200 OK with preferences

#### Untrack a Bill
```bash
curl -X POST http://localhost:3000/api/bills/1/untrack \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: 200 OK with success message

### 3. Comments & Engagement

#### Create Comment
```bash
curl -X POST http://localhost:3000/api/bills/1/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test comment"}'
```

Expected: 201 Created with comment object

#### Vote on Comment
```bash
curl -X POST http://localhost:3000/api/comments/1/vote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "up"}'
```

Expected: 200 OK with updated comment

#### Endorse Comment (Expert Only)
```bash
curl -X POST http://localhost:3000/api/comments/1/endorse \
  -H "Authorization: Bearer EXPERT_TOKEN"
```

Expected: 200 OK with updated comment

#### Record Engagement
```bash
curl -X POST http://localhost:3000/api/bills/1/engagement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "view"}'
```

Expected: 200 OK with success message

### 4. Analysis & Sponsors

#### Get Sponsors
```bash
curl http://localhost:3000/api/bills/1/sponsors
```

Expected: 200 OK with sponsors array

#### Get Analysis
```bash
curl http://localhost:3000/api/bills/1/analysis
```

Expected: 200 OK with analysis array

#### Get Sponsorship Analysis (Both Paths)
```bash
# Original path
curl http://localhost:3000/api/bills/1/sponsorship-analysis

# Alias path
curl http://localhost:3000/api/bills/1/analysis/sponsorship
```

Expected: Both should return 200 OK with same data

### 5. Metadata

#### Get Categories
```bash
curl http://localhost:3000/api/bills/meta/categories
```

Expected: 200 OK with 15 categories

#### Get Statuses
```bash
curl http://localhost:3000/api/bills/meta/statuses
```

Expected: 200 OK with 11 statuses

### 6. Polls

#### Create Poll
```bash
curl -X POST http://localhost:3000/api/bills/1/polls \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Do you support this bill?",
    "options": ["Strongly Support", "Support", "Neutral", "Oppose", "Strongly Oppose"],
    "endDate": "2026-12-31T23:59:59Z"
  }'
```

Expected: 201 Created with poll object

#### Get Polls
```bash
curl http://localhost:3000/api/bills/1/polls
```

Expected: 200 OK with polls array

## Database Verification

### Check Bill Data
```sql
SELECT * FROM bills WHERE id = 1;
```

### Check Comments
```sql
SELECT * FROM comments WHERE bill_id = 1;
```

### Check Engagement
```sql
SELECT * FROM bill_engagement WHERE bill_id = 1;
```

### Check Tracking
```sql
SELECT * FROM bill_tracking_preferences WHERE bill_id = 1;
```

## Client Integration Testing

### Using the Client API Service
```typescript
import { billsApiService } from '@client/features/bills/services/api';

// Test bill retrieval
const bills = await billsApiService.getBills({ page: 1, limit: 10 });
console.log('Bills:', bills);

// Test bill tracking
await billsApiService.trackBill(1, true);
console.log('Bill tracked');

// Test comment voting
await billsApiService.voteOnComment(1, 'up');
console.log('Vote recorded');

// Test poll creation
const poll = await billsApiService.createBillPoll(1, {
  question: 'Do you support this bill?',
  options: ['Yes', 'No', 'Undecided']
});
console.log('Poll created:', poll);
```

## Error Testing

### Test Invalid Bill ID
```bash
curl http://localhost:3000/api/bills/invalid
```

Expected: 400 Bad Request

### Test Non-Existent Bill
```bash
curl http://localhost:3000/api/bills/999999
```

Expected: 404 Not Found

### Test Unauthorized Access
```bash
curl -X POST http://localhost:3000/api/bills/1/track
```

Expected: 401 Unauthorized

### Test Invalid Vote Type
```bash
curl -X POST http://localhost:3000/api/comments/1/vote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "invalid"}'
```

Expected: 400 Bad Request

## Performance Testing

### Load Test Bills Endpoint
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/bills

# Using wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/bills
```

Expected: <100ms average response time

## Checklist

- [ ] All automated tests pass
- [ ] Manual API tests successful
- [ ] Database data persists correctly
- [ ] Client API service works
- [ ] Error handling works correctly
- [ ] Authentication/Authorization works
- [ ] Route aliases work
- [ ] Polls feature works
- [ ] Performance is acceptable
- [ ] No memory leaks

## Troubleshooting

### Tests Failing
1. Check database connection
2. Verify migrations are up to date
3. Check Redis is running
4. Verify auth tokens are valid

### 404 Errors
1. Check server is running
2. Verify route paths
3. Check bill IDs exist

### 401 Errors
1. Verify auth token format
2. Check token expiration
3. Verify user exists

### Database Errors
1. Check connection string
2. Verify tables exist
3. Check permissions

## Success Criteria

✅ All 11 endpoints working
✅ Database operations successful
✅ Client API compatible
✅ Error handling correct
✅ Performance acceptable
✅ 100% feature coverage
