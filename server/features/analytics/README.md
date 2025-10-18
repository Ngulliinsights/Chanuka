# Analytics Feature Module

## Overview

The Analytics Feature Module provides comprehensive analytics and reporting capabilities for the legislative transparency platform. It enables data-driven insights into user engagement, bill interactions, financial disclosure patterns, and system performance through a well-architected, scalable architecture.

### Key Capabilities

- **Engagement Analytics**: Track user interactions, comment patterns, voting behavior, and engagement trends
- **ML-Powered Insights**: Machine learning analysis for predictive modeling and pattern recognition
- **Financial Disclosure Monitoring**: Automated analysis of financial disclosure data and compliance tracking
- **Real-time Dashboards**: Live analytics dashboards for operational monitoring
- **Performance Monitoring**: System health tracking with automated alerting
- **Data Export**: Structured data export capabilities for external analysis

### Architecture Overview

The analytics module follows a layered architecture pattern designed for maintainability, testability, and scalability:

```
┌─────────────────┐
│   Controllers   │  ← HTTP request handling, validation, response formatting
├─────────────────┤
│    Services     │  ← Business logic, caching, orchestration
├─────────────────┤
│    Storage      │  ← Data access, database operations
├─────────────────┤
│ Configuration   │  ← Feature flags, performance settings, validation
├─────────────────┤
│   Middleware    │  ← Request context, performance tracking, error handling
└─────────────────┘
```

**Request Flow:**
```
HTTP Request → Middleware → Controller → Service → Storage → Database
                      ↓
                Response ← Controller ← Service ← Storage ← Database
```

## Folder Structure

```
server/features/analytics/
├── README.md                    # This documentation
├── index.ts                     # Public API exports
├── analytics.ts                 # Legacy route definitions
├── config/
│   ├── analytics.config.ts      # Configuration management
│   └── __tests__/
├── controllers/                 # HTTP request handlers
│   └── engagement.controller.ts
├── middleware/                  # Express middleware
│   ├── analytics-context.ts     # Request tracing
│   └── performance-tracking.ts  # Performance monitoring
├── services/                    # Business logic layer
│   ├── index.ts                 # Service exports
│   ├── engagement.service.ts    # User engagement analytics
│   ├── ml.service.ts           # ML analysis service
│   └── financial-disclosure.service.ts
├── storage/                     # Data access layer
│   ├── index.ts                 # Storage exports
│   └── progress.storage.ts      # Database operations
├── types/                       # TypeScript type definitions
│   ├── index.ts                 # Type exports
│   ├── common.ts                # Shared types
│   ├── engagement.ts            # Engagement domain types
│   ├── ml.ts                    # ML domain types
│   └── financial-disclosure.ts  # Financial domain types
├── financial-disclosure/        # Financial disclosure feature
├── [legacy files...]            # Files to be migrated
└── __tests__/                   # Test files (organized by layer)
```

## Integration Points

The analytics module integrates with core infrastructure components:

- **Error Tracking**: Uses `core/errors/error-tracker` for centralized error reporting
- **Validation**: Leverages `core/validation` for domain-level business rules
- **Logging**: Uses `shared/core/src/observability/logging` with structured logging and trace ID correlation
- **Caching**: Uses `server/utils/cache` with standardized `getOrSetCache` utility
- **Database**: Uses shared database infrastructure with connection pooling
- **Authentication**: Integrates with existing auth middleware for user context

## Code Organization Principles

### Layer Separation
- **Controllers**: Handle HTTP concerns only (parsing, validation, response formatting)
- **Services**: Contain business logic, orchestrate operations, manage caching
- **Storage**: Handle database operations, return domain objects
- **Types**: Define clear interfaces between layers

### Naming Conventions
- Services: `{Domain}Service` (e.g., `EngagementAnalyticsService`)
- Controllers: `{Domain}Controller` (e.g., `EngagementController`)
- Storage: `{Domain}Storage` (e.g., `ProgressStorage`)
- Types: Domain-specific interfaces in dedicated files

### Error Handling
- Controllers catch and translate errors to HTTP responses
- Services throw domain-specific errors
- Storage operations include error context for debugging
- All errors include trace IDs for request correlation

## Getting Started

### Running Locally

1. **Start the development server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Run analytics tests:**
   ```bash
   npm test -- --testPathPattern=analytics
   ```

3. **View analytics endpoints:**
   Navigate to `http://localhost:3000/api/analytics/engagement/metrics`

### Running Tests

```bash
# Run all analytics tests
npm test -- server/features/analytics

# Run with coverage
npm test -- --coverage --testPathPattern=analytics

# Run specific test file
npm test -- server/features/analytics/config/__tests__/analytics.config.test.ts
```

### Viewing Metrics and Logs

- **Application Logs**: Check console output or log files for analytics operations
- **Performance Metrics**: Available at `/api/analytics/stats` (admin only)
- **Cache Metrics**: Included in service statistics
- **Error Logs**: Correlated by trace ID in centralized logging system

## Common Tasks

### Adding a New Endpoint

1. **Define the route in the appropriate router file:**
   ```typescript
   // server/features/analytics/analytics.ts
   import { controllerWrapper } from '../../utils/analytics-controller-wrapper';
   import { EngagementController } from '../controllers/engagement.controller';

   router.get('/engagement/custom-metrics',
     controllerWrapper({
       querySchema: z.object({
         timeframe: z.enum(['7d', '30d', '90d']).optional()
       })
     }, EngagementController.getCustomMetrics)
   );
   ```

2. **Add the controller method:**
   ```typescript
   // controllers/engagement.controller.ts
   static async getCustomMetrics(input: { query: { timeframe?: string } }) {
     const timeframe = input.query.timeframe || '30d';
     return await engagementAnalyticsService.getCustomMetrics(timeframe);
   }
   ```

3. **Implement the service method:**
   ```typescript
   // services/engagement.service.ts
   async getCustomMetrics(timeframe: string) {
     return await getOrSetCache(
       `custom-metrics:${timeframe}`,
       this.config.cache.trendsTtl,
       async () => {
         // Business logic here
         const data = await this.storage.getCustomMetricsData(timeframe);
         return this.processCustomMetrics(data);
       }
     );
   }
   ```

### Adding a New Service Method

1. **Add the method to the service class:**
   ```typescript
   // services/engagement.service.ts
   async getAdvancedAnalytics(userId: string, options: AdvancedAnalyticsOptions) {
     return await getOrSetCache(
       `advanced-analytics:${userId}:${JSON.stringify(options)}`,
       this.config.cache.userEngagementTtl,
       async () => {
         const userData = await this.storage.getUserData(userId);
         const processedData = await this.mlService.analyzeUserPatterns(userData);
         return this.formatAdvancedAnalytics(processedData, options);
       }
     );
   }
   ```

2. **Update the service index exports:**
   ```typescript
   // services/index.ts
   export { EngagementAnalyticsService, engagementAnalyticsService } from './engagement.service';
   ```

### Adding a New Storage Operation

1. **Add the method to the storage class:**
   ```typescript
   // storage/progress.storage.ts
   async getCustomMetricsData(timeframe: string) {
     const threshold = buildTimeThreshold(timeframe);
     return await db
       .select({
         date: sql`DATE(created_at)`,
         count: sql`COUNT(*)`
       })
       .from(userEngagement)
       .where(gte(userEngagement.createdAt, threshold))
       .groupBy(sql`DATE(created_at)`)
       .orderBy(desc(sql`DATE(created_at)`));
   }
   ```

2. **Ensure proper error handling and logging:**
   ```typescript
   async getCustomMetricsData(timeframe: string) {
     try {
       this.logger.debug('Fetching custom metrics data', { timeframe });
       const result = await this.executeQuery(/* query */);
       this.logger.debug('Custom metrics data retrieved', { count: result.length });
       return result;
     } catch (error) {
       this.logger.error('Failed to fetch custom metrics data', {
         timeframe,
         error: error.message
       });
       throw error;
     }
   }
   ```

### Adding a New Domain Type

1. **Add to the appropriate types file:**
   ```typescript
   // types/engagement.ts
   export interface CustomMetrics {
     timeframe: string;
     totalUsers: number;
     totalEngagements: number;
     averageEngagementPerUser: number;
     topCategories: CategoryEngagement[];
     generatedAt: Date;
   }

   export interface CategoryEngagement {
     category: string;
     engagementCount: number;
     userCount: number;
     averageEngagement: number;
   }
   ```

2. **Update the types index:**
   ```typescript
   // types/index.ts
   export type {
     CustomMetrics,
     CategoryEngagement
   } from './engagement';
   ```

3. **Use the types in services and controllers:**
   ```typescript
   // services/engagement.service.ts
   async getCustomMetrics(timeframe: string): Promise<CustomMetrics> {
     // Implementation
   }
   ```

## Testing

### Testing Patterns

The analytics module follows comprehensive testing patterns:

- **Unit Tests**: Test individual functions and methods in isolation
- **Integration Tests**: Test interactions between layers
- **Performance Tests**: Validate response times and resource usage
- **Error Path Tests**: Ensure proper error handling and recovery

### Unit Testing

```typescript
// __tests__/services/engagement.service.test.ts
describe('EngagementAnalyticsService', () => {
  let service: EngagementAnalyticsService;
  let mockStorage: jest.Mocked<ProgressStorage>;

  beforeEach(() => {
    mockStorage = {
      getEngagementData: jest.fn()
    } as any;

    service = new EngagementAnalyticsService(mockStorage, mockConfig);
  });

  describe('getEngagementMetrics', () => {
    it('should return processed engagement data', async () => {
      const mockData = { users: 100, comments: 500 };
      mockStorage.getEngagementData.mockResolvedValue(mockData);

      const result = await service.getEngagementMetrics('30d');

      expect(result.totalUsers).toBe(100);
      expect(result.totalComments).toBe(500);
      expect(mockStorage.getEngagementData).toHaveBeenCalledWith('30d');
    });

    it('should handle empty data gracefully', async () => {
      mockStorage.getEngagementData.mockResolvedValue({ users: 0, comments: 0 });

      const result = await service.getEngagementMetrics('30d');

      expect(result.totalUsers).toBe(0);
      expect(result.totalComments).toBe(0);
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/engagement-analytics.integration.test.ts
describe('Engagement Analytics Integration', () => {
  let app: Express;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp();
    testUser = await createTestUser();
  });

  it('should return engagement metrics for authenticated user', async () => {
    const response = await request(app)
      .get('/api/analytics/engagement/metrics')
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(200);

    expect(response.body).toHaveProperty('totalUsers');
    expect(response.body).toHaveProperty('totalComments');
    expect(response.body).toHaveProperty('dateRange');
  });

  it('should handle invalid date parameters', async () => {
    const response = await request(app)
      .get('/api/analytics/engagement/metrics?startDate=invalid-date')
      .set('Authorization', `Bearer ${testUser.token}`)
      .expect(400);

    expect(response.body.error).toContain('Invalid date format');
  });
});
```

### Running and Debugging Tests

```bash
# Run all tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- server/features/analytics/services/__tests__/engagement.service.test.ts

# Debug failing test
npm test -- --testNamePattern="should handle empty data" --verbose
```

## Troubleshooting

### Common Issues

#### Cache Miss Debugging

**Symptoms:** Slow response times, high database load

**Debug Steps:**
1. Check cache hit rate in service statistics: `GET /api/analytics/stats`
2. Verify cache key format matches between calls
3. Check TTL values in configuration
4. Look for cache invalidation issues

**Resolution:**
```typescript
// Check cache key consistency
const cacheKey = `engagement:${userId}:${timeframe}`;
const result = await getOrSetCache(cacheKey, ttl, async () => {
  // Expensive operation
});
```

#### Slow Query Debugging

**Symptoms:** Requests taking >2 seconds, database timeouts

**Debug Steps:**
1. Check database query performance logs
2. Verify indexes are in place
3. Look for N+1 query patterns
4. Check connection pool utilization

**Resolution:**
```sql
-- Add composite index for common query patterns
CREATE INDEX idx_user_engagement_timeframe
ON user_engagement (user_id, created_at DESC);
```

#### Validation Error Debugging

**Symptoms:** 400 Bad Request responses, unexpected validation failures

**Debug Steps:**
1. Check request payload against Zod schema
2. Verify parameter transformations
3. Look for type coercion issues
4. Check for missing required fields

**Resolution:**
```typescript
// Add detailed error logging
try {
  const validatedInput = schema.parse(input);
} catch (error) {
  logger.error('Validation failed', {
    input,
    error: error.errors,
    traceId: req.analyticsContext?.traceId
  });
  throw error;
}
```

#### Using Trace IDs

All analytics requests include trace IDs for end-to-end debugging:

```bash
# Search logs by trace ID
grep "traceId: 12345678-1234-1234-1234-123456789abc" logs/app.log

# Include trace ID in error reports
logger.error('Operation failed', {
  traceId: req.analyticsContext?.traceId,
  userId: req.user?.id,
  operation: 'getEngagementMetrics'
});
```

### Performance Issues

- **High Memory Usage**: Check cache size limits, implement cache eviction
- **Slow Database Queries**: Add indexes, optimize query patterns
- **Concurrent Request Limits**: Adjust `maxConcurrentOperations` in config
- **Large Result Sets**: Implement pagination, limit result sizes

### Cache Issues

- **Cache Invalidation**: Ensure consistent key formats across requests
- **Cache Size Limits**: Monitor cache size, adjust `maxSize` configuration
- **TTL Mismatches**: Verify TTL values match business requirements
- **Cache Poisoning**: Validate cached data integrity

## Configuration

The analytics module uses comprehensive configuration management with environment variable overrides and runtime validation.

### Configuration Options

#### Cache Configuration
```typescript
cache: {
  userEngagementTtl: 1800,     // 30 minutes
  billEngagementTtl: 900,      // 15 minutes
  trendsTtl: 3600,             // 1 hour
  leaderboardTtl: 1800,        // 30 minutes
  mlAnalysisTtl: 7200,         // 2 hours
  financialDisclosureTtl: 3600, // 1 hour
  maxSize: 1000               // Maximum cache entries
}
```

**Environment Variables:**
- `ANALYTICS_CACHE_USER_ENGAGEMENT_TTL`
- `ANALYTICS_CACHE_BILL_ENGAGEMENT_TTL`
- `ANALYTICS_CACHE_TRENDS_TTL`
- `ANALYTICS_CACHE_LEADERBOARD_TTL`
- `ANALYTICS_CACHE_ML_ANALYSIS_TTL`
- `ANALYTICS_CACHE_FINANCIAL_DISCLOSURE_TTL`
- `ANALYTICS_CACHE_MAX_SIZE`

#### Database Configuration
```typescript
database: {
  queryTimeout: 10000,    // 10 seconds
  poolSize: 5,           // Connection pool size
  idleTimeout: 30000,    // 30 seconds
  maxRetries: 2          // Query retry attempts
}
```

**Environment Variables:**
- `ANALYTICS_DB_QUERY_TIMEOUT`
- `ANALYTICS_DB_POOL_SIZE`
- `ANALYTICS_DB_IDLE_TIMEOUT`
- `ANALYTICS_DB_MAX_RETRIES`

#### Feature Flags
```typescript
features: {
  enableMlAnalysis: false,           // Enable ML features
  enableRealTimeUpdates: true,      // Real-time analytics
  enableAdvancedCaching: true,      // Advanced caching
  enablePerformanceMonitoring: true, // Performance tracking
  enableErrorTracking: true         // Error tracking integration
}
```

**Environment Variables:**
- `ANALYTICS_ENABLE_ML_ANALYSIS`
- `ANALYTICS_ENABLE_REAL_TIME_UPDATES`
- `ANALYTICS_ENABLE_ADVANCED_CACHING`
- `ANALYTICS_ENABLE_PERFORMANCE_MONITORING`
- `ANALYTICS_ENABLE_ERROR_TRACKING`

#### Performance Thresholds
```typescript
performance: {
  slowRequestThreshold: 2000,  // 2 seconds
  maxConcurrentOperations: 10, // Max concurrent ops
  memoryWarningThreshold: 200, // 200 MB
  cpuWarningThreshold: 80      // 80% CPU
}
```

**Environment Variables:**
- `ANALYTICS_SLOW_REQUEST_THRESHOLD`
- `ANALYTICS_MAX_CONCURRENT_OPERATIONS`
- `ANALYTICS_MEMORY_WARNING_THRESHOLD`
- `ANALYTICS_CPU_WARNING_THRESHOLD`

### Example Environment Configuration

```bash
# Analytics Configuration
ANALYTICS_CACHE_USER_ENGAGEMENT_TTL=1800
ANALYTICS_DB_QUERY_TIMEOUT=15000
ANALYTICS_ENABLE_ML_ANALYSIS=true
ANALYTICS_SLOW_REQUEST_THRESHOLD=3000
ANALYTICS_LOG_LEVEL=debug
ANALYTICS_ENABLE_STRUCTURED_LOGGING=true
ANALYTICS_DEFAULT_TIMEFRAME=30d
ANALYTICS_MAX_RESULTS_PER_PAGE=50
```

### Configuration Validation

Configuration is validated at startup with clear error messages:

```typescript
// Valid configuration loads successfully
const config = initializeAnalyticsConfig();
console.log('Analytics configuration loaded:', config.analytics.defaultTimeframe);

// Invalid configuration fails fast
// ANALYTICS_CACHE_USER_ENGAGEMENT_TTL=30 (too low)
// → Error: cache.userEngagementTtl: Number must be greater than or equal to 60
```

## Monitoring

### Key Metrics to Watch

#### Performance Metrics
- **Endpoint Latency**: p50, p95, p99 response times by endpoint
- **Error Rate**: Percentage of failed requests by endpoint
- **Cache Hit Rate**: Cache effectiveness by data type
- **Database Query Performance**: Slow query detection and analysis

#### Business Metrics
- **Request Volume**: Total analytics requests over time
- **User Engagement**: Active users, engagement patterns
- **Data Freshness**: Age of cached analytics data
- **Export Usage**: Data export request frequency

#### System Health
- **Memory Usage**: Analytics service memory consumption
- **CPU Utilization**: Processing load during peak times
- **Connection Pool Usage**: Database connection utilization
- **Queue Depth**: Pending analytics operations

### Dashboard Locations

- **Grafana Dashboard**: `https://monitoring.example.com/d/analytics-overview`
- **Application Metrics**: `GET /api/analytics/stats` (admin endpoint)
- **Cache Metrics**: Available in service statistics
- **Performance Logs**: Centralized logging system with trace ID correlation

### Interpreting Metrics

#### Response Time Alerts
- **p95 > 2s**: Indicates performance degradation, investigate caching or database issues
- **p99 > 5s**: Critical performance issue, may impact user experience
- **Error Rate > 5%**: Service reliability issue, check error logs and dependencies

#### Cache Performance
- **Hit Rate < 50%**: Cache ineffective, review TTL settings or cache key consistency
- **Memory Usage > 80%**: Cache size limit reached, consider increasing `maxSize`
- **Eviction Rate High**: Cache thrashing, optimize cache key granularity

#### Database Performance
- **Slow Queries > 10%**: Database performance issue, check indexes and query optimization
- **Connection Pool Exhaustion**: Database connection limits reached, increase pool size
- **Timeout Rate > 1%**: Database or network issues, investigate connectivity

### Alerting Setup

#### Critical Alerts (Page Immediately)
- Error rate > 10% for 5 minutes
- p99 latency > 10 seconds for 5 minutes
- Service unavailable (5xx responses > 50%)

#### Warning Alerts (Monitor Closely)
- Error rate > 5% for 5 minutes
- p95 latency > 3 seconds for 5 minutes
- Cache hit rate < 30% for 10 minutes
- Memory usage > 90% for 5 minutes

#### Info Alerts (Track Trends)
- Slow request count > 20 in 5 minutes
- Database connection pool > 80% utilized
- New error patterns detected

### Monitoring Best Practices

1. **Set Appropriate Baselines**: Establish normal operating ranges during stable periods
2. **Use Percentiles**: Focus on p95/p99 rather than averages for performance monitoring
3. **Correlate Metrics**: Look for relationships between metrics (e.g., high latency + low cache hit rate)
4. **Monitor Trends**: Track metric changes over time, not just absolute values
5. **Alert on Anomalies**: Use statistical thresholds rather than fixed values where possible
6. **Include Context**: Always include trace IDs and user context in alerts

## Development Workflow

### Code Review Checklist

#### General Checks
- [ ] TypeScript compilation passes (`npm run type-check`)
- [ ] All tests pass (`npm test`)
- [ ] No `console.log` statements (use logger instead)
- [ ] Code follows established patterns and conventions
- [ ] No linting errors (`npm run lint`)

#### Route-Specific Checks
- [ ] Thin controllers (no business logic, only request/response handling)
- [ ] Controller wrapper used for validation and error handling
- [ ] Middleware applied (analytics-context, performance-tracking)
- [ ] No direct service instantiation (use dependency injection)
- [ ] Proper HTTP status codes and error responses

#### Controller-Specific Checks
- [ ] Zod schemas used for request validation
- [ ] Input transformation handled appropriately
- [ ] Error cases return appropriate HTTP responses
- [ ] No storage layer access (only service calls)
- [ ] JSDoc comments for complex methods

#### Service-Specific Checks
- [ ] No HTTP imports or Express dependencies
- [ ] Caching implemented using `getOrSetCache` utility
- [ ] Business logic separated from data access
- [ ] Error handling with appropriate context
- [ ] Logging at appropriate levels with trace IDs

#### Storage-Specific Checks
- [ ] Focused methods (single responsibility)
- [ ] Return domain objects, not raw database results
- [ ] Proper error handling and logging
- [ ] No business logic (data access only)
- [ ] SQL injection prevention (use parameterized queries)

#### Documentation Checks
- [ ] JSDoc comments on public methods
- [ ] Complex types documented with examples
- [ ] README updated for new features
- [ ] Breaking changes documented in changelog

### Testing Standards

- **Unit Test Coverage**: 90%+ for utilities, 80%+ overall
- **Integration Tests**: Critical user journeys covered
- **Performance Tests**: Key endpoints benchmarked
- **Error Path Coverage**: All error conditions tested
- **Edge Case Handling**: Boundary conditions validated

### Performance Benchmarks

- **Response Time**: < 500ms for cached requests, < 2s for uncached
- **Concurrent Users**: Support 100+ concurrent analytics requests
- **Memory Usage**: < 200MB under normal load
- **Cache Hit Rate**: > 70% for frequently accessed data
- **Database Load**: < 10% of total database capacity

## API Reference

See the [OpenAPI documentation](./api-docs.html) for complete API reference with examples.

## Contributing

1. Follow the established architecture patterns
2. Add comprehensive tests for new functionality
3. Update documentation for any API changes
4. Ensure performance benchmarks are maintained
5. Get code review approval before merging

## Support

For issues or questions:
1. Check this documentation first
2. Review application logs with trace ID correlation
3. Check monitoring dashboards for system health
4. Create an issue with relevant trace IDs and error context