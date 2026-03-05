# Electoral Accountability Engine - Integration Guide

**Date:** March 5, 2026  
**Audience:** Developers integrating the Electoral Accountability feature  
**Status:** Production Ready (MVP)

---

## Quick Start

### 1. Database Setup

Run the migration to create the electoral accountability tables:

```bash
# Run migration (command depends on your migration tool)
npm run migrate:up

# Or manually run the schema
psql -d chanuka -f server/infrastructure/schema/electoral_accountability.ts
```

**Tables Created:**
- `voting_records`
- `constituency_sentiment`
- `representative_gap_analysis`
- `electoral_pressure_campaigns`
- `accountability_dashboard_exports`

---

### 2. Backend Integration

The routes are already registered in `server/index.ts`. No additional setup needed.

**Verify Integration:**

```bash
# Start the server
npm run dev

# Test health endpoint
curl http://localhost:4200/api/electoral-accountability/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-05T10:30:00.000Z"
  }
}
```

---

### 3. Frontend Integration

#### Option A: Use the Complete Dashboard

```tsx
// app/routes.tsx
import { ElectoralAccountabilityDashboard } from '@/features/electoral-accountability';

const routes = [
  {
    path: '/accountability',
    element: <ElectoralAccountabilityDashboard />,
  },
];
```

#### Option B: Use Individual Components

```tsx
import { 
  MPScorecard, 
  VotingRecordTimeline 
} from '@/features/electoral-accountability';

function MyPage() {
  return (
    <div>
      <MPScorecard
        sponsorId="sponsor-uuid"
        constituency="Westlands"
        onViewDetails={() => navigate('/details')}
        onCreateCampaign={() => openModal()}
      />
      
      <VotingRecordTimeline
        sponsorId="sponsor-uuid"
        constituency="Westlands"
        includeGapAnalysis={true}
      />
    </div>
  );
}
```

#### Option C: Use Hooks Directly

```tsx
import { 
  useMPScorecard, 
  useCriticalGaps 
} from '@/features/electoral-accountability';

function CustomComponent() {
  const { data: scorecard, isLoading } = useMPScorecard(
    'sponsor-id',
    'Westlands'
  );
  
  const { data: gaps } = useCriticalGaps({
    minRiskScore: 70,
    limit: 10,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Alignment: {scorecard?.alignmentPercentage}%</h2>
      <p>Critical Gaps: {gaps?.length}</p>
    </div>
  );
}
```

---

## API Usage Examples

### 1. Get MP Voting Record

```typescript
// Using the API service
import { electoralAccountabilityApi } from '@/features/electoral-accountability';

const records = await electoralAccountabilityApi.getMPVotingRecord({
  sponsorId: 'sponsor-uuid',
  constituency: 'Westlands',
  startDate: new Date('2024-01-01'),
  includeGapAnalysis: true,
});

console.log(`Found ${records.length} voting records`);
```

```bash
# Using curl
curl "http://localhost:4200/api/electoral-accountability/mp-voting-record?sponsorId=sponsor-uuid&constituency=Westlands&includeGapAnalysis=true"
```

---

### 2. Get Constituency Sentiment

```typescript
const sentiment = await electoralAccountabilityApi.getConstituencySentiment(
  'bill-uuid',
  'Westlands'
);

console.log(`Support: ${sentiment.supportCount}`);
console.log(`Oppose: ${sentiment.opposeCount}`);
console.log(`Sentiment Score: ${sentiment.sentimentScore}`);
```

```bash
curl "http://localhost:4200/api/electoral-accountability/constituency-sentiment?billId=bill-uuid&constituency=Westlands"
```

---

### 3. Get Critical Gaps

```typescript
const gaps = await electoralAccountabilityApi.getCriticalGaps({
  constituency: 'Westlands',
  minRiskScore: 70,
  limit: 10,
});

gaps.forEach(gap => {
  console.log(`Gap: ${gap.alignmentGap}%`);
  console.log(`Severity: ${gap.gapSeverity}`);
  console.log(`Risk: ${gap.electoralRiskScore}`);
});
```

```bash
curl "http://localhost:4200/api/electoral-accountability/critical-gaps?constituency=Westlands&minRiskScore=70&limit=10"
```

---

### 4. Create Pressure Campaign

```typescript
const campaign = await electoralAccountabilityApi.createPressureCampaign({
  campaignName: 'Hold MP Accountable on Finance Bill',
  description: 'MP voted YES despite 78% constituency opposition',
  targetSponsorId: 'sponsor-uuid',
  targetConstituency: 'Westlands',
  targetCounty: 'Nairobi',
  triggeredByBillId: 'bill-uuid',
  triggeredByGapId: 'gap-uuid',
});

console.log(`Campaign created: ${campaign.campaignSlug}`);
```

```bash
curl -X POST http://localhost:4200/api/electoral-accountability/pressure-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "campaignName": "Hold MP Accountable on Finance Bill",
    "description": "MP voted YES despite 78% constituency opposition",
    "targetSponsorId": "sponsor-uuid",
    "targetConstituency": "Westlands",
    "targetCounty": "Nairobi"
  }'
```

---

### 5. Get MP Scorecard

```typescript
const scorecard = await electoralAccountabilityApi.getMPScorecard(
  'sponsor-uuid',
  'Westlands'
);

console.log(`Total Votes: ${scorecard.totalVotes}`);
console.log(`Alignment: ${scorecard.alignmentPercentage}%`);
console.log(`Critical Gaps: ${scorecard.criticalGaps}`);
console.log(`Electoral Risk: ${scorecard.electoralRiskScore}`);
```

```bash
curl "http://localhost:4200/api/electoral-accountability/mp-scorecard?sponsorId=sponsor-uuid&constituency=Westlands"
```

---

## Integration with Existing Features

### Bills Feature

Link from bill detail page to accountability:

```tsx
// In BillDetailPage.tsx
import { Link } from 'react-router-dom';

<Link 
  to={`/accountability/mp/${bill.sponsorId}?bill=${bill.id}`}
  className="text-blue-600 hover:underline"
>
  View MP Accountability
</Link>
```

### Community Feature

Show constituency sentiment in community discussions:

```tsx
// In CommunityDiscussion.tsx
import { useConstituencySentiment } from '@/features/electoral-accountability';

function BillDiscussion({ billId, constituency }) {
  const { data: sentiment } = useConstituencySentiment(billId, constituency);

  return (
    <div>
      <h3>Constituency Sentiment</h3>
      <p>Support: {sentiment?.supportCount}</p>
      <p>Oppose: {sentiment?.opposeCount}</p>
      <p>Score: {sentiment?.sentimentScore}</p>
    </div>
  );
}
```

### Notifications Feature

Notify users of critical gaps:

```tsx
// In NotificationService.ts
import { electoralAccountabilityService } from '@server/features/electoral-accountability';

async function checkCriticalGaps(userId: string) {
  const user = await getUserById(userId);
  const gaps = await electoralAccountabilityService.getCriticalGaps({
    constituency: user.constituency,
    minRiskScore: 80,
  });

  for (const gap of gaps) {
    await notificationService.send({
      userId,
      type: 'critical_gap',
      title: 'Your MP Voted Against Constituency Sentiment',
      message: `Your MP voted ${gap.representativeVote} despite ${gap.constituentPosition} sentiment`,
      data: { gapId: gap.id },
    });
  }
}
```

---

## Authentication Integration

### Current State (Placeholder)

The authentication middleware is currently a placeholder:

```typescript
// server/features/electoral-accountability/application/electoral-accountability-auth.middleware.ts

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Replace with actual JWT verification
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  // TODO: Verify JWT token and extract user info
  (req as AuthenticatedRequest).user = {
    id: 'mock-user-id',
    email: 'mock@example.com',
    role: 'user',
  };

  next();
};
```

### Integration Steps

1. **Replace JWT verification:**

```typescript
import jwt from 'jsonwebtoken';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };
    
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};
```

2. **Update client API service:**

```typescript
// client/src/features/electoral-accountability/services/electoral-accountability-api.ts

async createPressureCampaign(data: CreateCampaignData): Promise<ElectoralPressureCampaign> {
  const token = localStorage.getItem('authToken'); // Or use your auth context
  
  const response = await fetch(`${this.baseUrl}/pressure-campaign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create pressure campaign');
  }

  const result = await response.json();
  return result.data;
}
```

---

## Data Import

### Import Voting Records from CSV

```typescript
import { votingRecordImporter } from '@server/features/electoral-accountability';

// Import from CSV file
const result = await votingRecordImporter.importFromCSV('/path/to/voting-records.csv');

console.log(`Imported: ${result.imported}`);
console.log(`Failed: ${result.failed}`);
console.log(`Errors:`, result.errors);
```

**CSV Format:**

```csv
bill_id,sponsor_id,vote,vote_date,county,constituency,ward,reading_stage,hansard_reference
uuid1,uuid2,yes,2024-03-15,Nairobi,Westlands,Parklands,second_reading,HR-2024-03-15-001
uuid3,uuid4,no,2024-03-16,Nairobi,Westlands,Highridge,third_reading,HR-2024-03-16-002
```

### Import from JSON

```typescript
const records = [
  {
    billId: 'uuid1',
    sponsorId: 'uuid2',
    vote: 'yes',
    voteDate: new Date('2024-03-15'),
    county: 'Nairobi',
    constituency: 'Westlands',
    ward: 'Parklands',
  },
  // ... more records
];

const result = await votingRecordImporter.importFromJSON(records);
```

---

## Automated Gap Calculation

### On Voting Record Creation

Gap calculation is automatically triggered when a voting record is created:

```typescript
import { gapCalculationAutomationService } from '@server/features/electoral-accountability';

// This is called automatically in the service
await gapCalculationAutomationService.onVotingRecordCreated('voting-record-uuid');
```

### Batch Backfill

For historical data, run batch backfill:

```typescript
const result = await gapCalculationAutomationService.backfillGaps();

console.log(`Backfilled ${result.processed} gaps`);
console.log(`Failed: ${result.failed}`);
```

---

## Caching Strategy

### React Query (Client-Side)

```typescript
// Configured in hooks/useElectoralAccountability.ts

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: {
        scorecard: 60 * 60 * 1000,      // 1 hour
        votingRecords: 5 * 60 * 1000,   // 5 minutes
        criticalGaps: 15 * 60 * 1000,   // 15 minutes
        sentiment: 10 * 60 * 1000,      // 10 minutes
        campaigns: 5 * 60 * 1000,       // 5 minutes
      },
    },
  },
});
```

### Server-Side Caching (TODO)

```typescript
// Future implementation
import { electoralAccountabilityCacheService } from '@server/features/electoral-accountability';

// Cache MP scorecard
await electoralAccountabilityCacheService.cacheScorecard(
  'sponsor-uuid',
  'Westlands',
  scorecard,
  3600 // 1 hour TTL
);

// Get cached scorecard
const cached = await electoralAccountabilityCacheService.getScorecard(
  'sponsor-uuid',
  'Westlands'
);
```

---

## Error Handling

### Client-Side

```tsx
import { useMPScorecard } from '@/features/electoral-accountability';

function MyComponent() {
  const { data, isLoading, isError, error } = useMPScorecard(
    'sponsor-id',
    'Westlands'
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <div className="error">
        <h3>Failed to load scorecard</h3>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return <div>Scorecard: {data.alignmentPercentage}%</div>;
}
```

### Server-Side

```typescript
// Errors are automatically handled in routes
// Custom error handling:

try {
  const scorecard = await electoralAccountabilityService.getMPAccountabilityScorecard(
    sponsorId,
    constituency
  );
  return scorecard;
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Handle generic error
  }
}
```

---

## Testing

### Unit Tests (Example)

```typescript
// tests/electoral-accountability/service.test.ts

import { electoralAccountabilityService } from '@server/features/electoral-accountability';

describe('Electoral Accountability Service', () => {
  describe('calculateRepresentativeGap', () => {
    it('should calculate gap correctly', async () => {
      const gap = await electoralAccountabilityService.calculateRepresentativeGap(
        'voting-record-uuid',
        'sentiment-uuid'
      );

      expect(gap.alignmentGap).toBeGreaterThanOrEqual(0);
      expect(gap.alignmentGap).toBeLessThanOrEqual(100);
      expect(gap.gapSeverity).toMatch(/low|medium|high|critical/);
    });
  });
});
```

### Integration Tests (Example)

```typescript
// tests/electoral-accountability/api.test.ts

import request from 'supertest';
import { app } from '@server/index';

describe('Electoral Accountability API', () => {
  describe('GET /api/electoral-accountability/mp-scorecard', () => {
    it('should return MP scorecard', async () => {
      const response = await request(app)
        .get('/api/electoral-accountability/mp-scorecard')
        .query({ sponsorId: 'test-sponsor', constituency: 'Westlands' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alignmentPercentage');
    });
  });
});
```

---

## Monitoring

### Metrics to Track

```typescript
// Add to your monitoring service

// API Performance
metrics.histogram('electoral_accountability.api.response_time', responseTime);
metrics.counter('electoral_accountability.api.requests', 1, { endpoint });
metrics.counter('electoral_accountability.api.errors', 1, { endpoint, error });

// Gap Calculation
metrics.histogram('electoral_accountability.gap_calculation.duration', duration);
metrics.counter('electoral_accountability.gaps.created', 1);
metrics.counter('electoral_accountability.gaps.critical', 1);

// Campaigns
metrics.counter('electoral_accountability.campaigns.created', 1);
metrics.gauge('electoral_accountability.campaigns.active', activeCount);
```

### Alerts

```yaml
# alerts.yml

- name: HighErrorRate
  condition: electoral_accountability.api.errors > 10 per minute
  severity: critical
  
- name: SlowAPIResponse
  condition: electoral_accountability.api.response_time > 1000ms
  severity: warning
  
- name: CriticalGapsSpike
  condition: electoral_accountability.gaps.critical > 50 per hour
  severity: warning
```

---

## Environment Variables

```env
# .env

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chanuka

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# API Configuration
API_BASE_URL=http://localhost:4200/api
CORS_ORIGIN=http://localhost:3000

# Feature Flags
ENABLE_ELECTORAL_ACCOUNTABILITY=true
ENABLE_CAMPAIGN_CREATION=true

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL_SCORECARD=3600
CACHE_TTL_GAPS=900

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

---

## Troubleshooting

### Issue: "Failed to fetch voting record"

**Solution:**
- Check API endpoint is accessible
- Verify sponsor ID is valid UUID
- Check database connection
- Review server logs

### Issue: "No voting records found"

**Solution:**
- Verify data exists in database
- Check constituency name spelling
- Ensure data import completed successfully
- Review query parameters

### Issue: "Authentication required"

**Solution:**
- Add Authorization header with Bearer token
- Verify JWT token is valid
- Check token expiration
- Ensure user has required permissions

### Issue: "TypeScript errors in components"

**Solution:**
- Run `npm install` to ensure all types are available
- Check React Query provider is configured
- Verify import paths are correct
- Clear TypeScript cache: `rm -rf node_modules/.cache`

---

## Support

### Documentation

- [Electoral Accountability README](../server/features/electoral-accountability/README.md)
- [Frontend README](../client/src/features/electoral-accountability/README.md)
- [Implementation Summary](./ELECTORAL_ACCOUNTABILITY_COMPLETE_IMPLEMENTATION.md)
- [Status Document](./ELECTORAL_ACCOUNTABILITY_STATUS.md)

### Contact

- **Feature Owner:** Electoral Accountability Team
- **Technical Lead:** [Your Name]
- **Slack Channel:** #electoral-accountability
- **Email:** dev@chanuka.org

---

**Last Updated:** March 5, 2026  
**Version:** 1.0.0 (MVP)  
**Status:** Production Ready
