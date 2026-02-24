# Recommendation Engine

A comprehensive recommendation system for personalized bill recommendations using collaborative filtering and content-based filtering algorithms.

## Features

- **Personalized Recommendations**: Tailored bill suggestions based on user interests and engagement history
- **Collaborative Filtering**: Recommendations based on similar users' preferences
- **Content-Based Filtering**: Similar bill discovery using tags, categories, and metadata
- **Trending Analysis**: Real-time identification of popular and trending bills
- **User Profiling**: Automatic user interest tracking and profiling
- **Performance Optimized**: < 200ms response time with Redis caching
- **Monitoring Integration**: Full integration with monitoring and alerting system

## Architecture

The recommendation engine follows Domain-Driven Design (DDD) principles:

```
recommendation/
├── application/           # Application layer
│   ├── RecommendationService.ts    # Main service implementation
│   └── recommendation.routes.ts     # API routes with monitoring
├── domain/               # Domain layer
│   ├── RecommendationEngine.ts     # Core recommendation algorithms
│   ├── RecommendationValidator.ts  # Input validation
│   ├── EngagementScorer.ts         # Engagement scoring logic
│   └── recommendation.dto.ts       # Data transfer objects
├── infrastructure/       # Infrastructure layer
│   ├── RecommendationCache.ts      # Redis caching
│   └── RecommendationRepository.ts # Database operations
├── scripts/              # Utility scripts
│   └── register-monitoring.ts      # Monitoring registration
└── __tests__/            # Tests
    ├── recommendation.routes.test.ts
    └── recommendation.integration.test.ts
```

## Algorithms

### 1. Collaborative Filtering

Finds users with similar interests and recommends bills they've engaged with.

**Process:**
1. Identify users with shared interests (minimum 40% overlap)
2. Calculate user similarity scores
3. Aggregate engagement from similar users
4. Weight by similarity and engagement type
5. Filter out already-engaged bills

**Weights:**
- View: 0.1
- Comment: 0.5
- Share: 0.3

### 2. Content-Based Filtering

Recommends bills similar to those the user has engaged with.

**Similarity Factors:**
- Tag overlap (50%)
- Category match (30%)
- Sponsor match (20%)

### 3. Trending Analysis

Identifies bills gaining momentum based on recent engagement.

**Calculation:**
- Time-decayed engagement scores
- Exponential decay (24-hour half-life)
- Velocity tracking (engagements per day)

### 4. Hybrid Approach

Combines multiple algorithms for optimal results:
- Interest matching (40%)
- Collaborative similarity (30%)
- Trending popularity (20%)
- Recency bonus (10%)

## Performance

**Response Time Targets:**
- Personalized recommendations: < 200ms
- Similar bills: < 200ms
- Trending bills: < 200ms
- Collaborative recommendations: < 200ms

**Caching Strategy:**
- Multi-level caching (in-memory + Redis)
- 30-minute TTL for recommendations
- Cache invalidation on user engagement
- Stale-while-revalidate pattern

**Scalability:**
- Handles 10,000+ concurrent users
- Processes 1M+ requests/day
- Supports 100,000+ bills in catalog

## Usage

### Basic Usage

```typescript
import { RecommendationService } from '@server/features/recommendation';

const service = new RecommendationService();

// Get personalized recommendations
const recommendations = await service.getPersonalizedRecommendations(
  userId,
  10 // limit
);

// Find similar bills
const similarBills = await service.getSimilarBills(billId, 5);

// Get trending bills
const trending = await service.getTrendingBills(7, 10); // 7 days, 10 results

// Track engagement
await service.trackEngagement(userId, billId, 'view');
```

### API Usage

See [API.md](./API.md) for complete API documentation.

```bash
# Get personalized recommendations
curl -X GET "http://localhost:4200/api/recommendation/personalized?limit=10" \
  -H "Authorization: Bearer <token>"

# Track engagement
curl -X POST "http://localhost:4200/api/recommendation/track-engagement" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bill_id": 123, "engagement_type": "view"}'
```

## Monitoring

The recommendation engine is fully integrated with the monitoring system.

### Registration

```bash
# Register with monitoring system
npm run register-recommendation-monitoring
```

Or programmatically:

```typescript
import { registerRecommendationMonitoring } from '@server/features/recommendation/scripts/register-monitoring';

await registerRecommendationMonitoring();
```

### Metrics Tracked

- **Usage Metrics:**
  - Active users
  - Total requests
  - Successful/failed requests
  
- **Performance Metrics:**
  - Average response time
  - P95 response time
  - P99 response time
  
- **Business Metrics:**
  - Recommendation click-through rate
  - Engagement tracking rate
  - Cache hit rate

### Alert Rules

- Response time > 200ms (medium severity)
- Error rate > 5% (high severity)
- P95 response time > 500ms (medium severity)
- Failed requests > 10 (high severity)

### Monitoring Dashboard

Access the monitoring dashboard at:
```
http://localhost:4200/api/monitoring/dashboard
```

View recommendation-specific metrics:
```
http://localhost:4200/api/monitoring/features/recommendation-engine/metrics
```

## Testing

### Unit Tests

```bash
npm test server/features/recommendation/__tests__/recommendation.routes.test.ts
```

### Integration Tests

```bash
npm test server/features/recommendation/__tests__/recommendation.integration.test.ts
```

### Performance Tests

```bash
npm run test:performance recommendation
```

## Configuration

### Environment Variables

```env
# Redis configuration (for caching)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password

# Cache TTL (seconds)
RECOMMENDATION_CACHE_TTL=1800  # 30 minutes

# Performance targets
RECOMMENDATION_TARGET_RESPONSE_TIME=200  # milliseconds
```

### Feature Flags

The recommendation engine can be controlled via feature flags:

```typescript
import { featureFlagService } from '@server/features/feature-flags';

// Check if recommendations are enabled
const enabled = await featureFlagService.isEnabled(
  'recommendation-engine',
  userId
);

// Enable for specific users
await featureFlagService.enableForUser(
  'recommendation-engine',
  userId
);

// Gradual rollout
await featureFlagService.setRolloutPercentage(
  'recommendation-engine',
  25 // 25% of users
);
```

## Deployment

### Prerequisites

- PostgreSQL database
- Redis cache
- Node.js 18+

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run database migrations:
```bash
npm run migrate
```

3. Register with monitoring:
```bash
npm run register-recommendation-monitoring
```

4. Start the server:
```bash
npm run dev
```

### Health Check

Verify the recommendation engine is running:

```bash
curl http://localhost:4200/api/recommendation/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-24T15:30:00Z",
  "cache": {
    "size": 42,
    "keys": 15
  }
}
```

## Troubleshooting

### High Response Times

1. Check Redis connection:
```bash
redis-cli ping
```

2. Monitor cache hit rate:
```bash
curl http://localhost:4200/api/recommendation/health
```

3. Check database query performance:
```sql
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%bill_engagement%' 
ORDER BY mean_exec_time DESC;
```

### Low Recommendation Quality

1. Verify user interests are being tracked:
```sql
SELECT * FROM user_interests WHERE user_id = 'user-id';
```

2. Check engagement data:
```sql
SELECT * FROM bill_engagement WHERE user_id = 'user-id';
```

3. Review recommendation scores in logs:
```bash
grep "recommendation" logs/app.log | tail -100
```

### Cache Issues

1. Clear cache:
```typescript
const service = new RecommendationService();
service.clearCache();
```

2. Check Redis memory:
```bash
redis-cli info memory
```

3. Monitor cache statistics:
```typescript
const stats = service.getCacheStats();
console.log(stats);
```

## Contributing

1. Follow the DDD architecture pattern
2. Write tests for all new features
3. Ensure performance targets are met
4. Update API documentation
5. Add monitoring for new endpoints

## License

MIT

## Support

- GitHub Issues: https://github.com/your-org/your-repo/issues
- Documentation: https://docs.example.com/recommendation-engine
- Email: support@example.com
