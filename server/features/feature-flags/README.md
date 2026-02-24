# Feature Flags System

Enhanced feature flag management system with user targeting, percentage rollouts, A/B testing, and analytics.

## Features

- ✅ Feature flag CRUD operations
- ✅ User-based targeting (include/exclude lists)
- ✅ Percentage-based rollouts
- ✅ A/B testing support
- ✅ Flag evaluation middleware
- ✅ Analytics and metrics tracking
- ✅ Emergency kill switch
- ✅ Dependency management

## Architecture

```
feature-flags/
├── domain/
│   ├── types.ts          # Domain types and interfaces
│   └── service.ts        # Business logic
├── infrastructure/
│   └── repository.ts     # Database access layer
├── application/
│   ├── controller.ts     # HTTP request handlers
│   ├── routes.ts         # API endpoints
│   └── middleware.ts     # Request-level flag evaluation
└── __tests__/
    ├── service.test.ts   # Unit tests
    └── integration.test.ts # Integration tests
```

## API Endpoints

### Admin Endpoints (Require Authentication)

#### Create Flag
```http
POST /api/feature-flags/flags
Content-Type: application/json

{
  "name": "new-feature",
  "description": "New feature description",
  "enabled": true,
  "rolloutPercentage": 50,
  "userTargeting": {
    "include": ["user-123"],
    "exclude": ["user-456"]
  }
}
```

#### Get All Flags
```http
GET /api/feature-flags/flags
```

#### Get Flag
```http
GET /api/feature-flags/flags/:name
```

#### Update Flag
```http
PUT /api/feature-flags/flags/:name
Content-Type: application/json

{
  "description": "Updated description",
  "enabled": false
}
```

#### Toggle Flag
```http
POST /api/feature-flags/flags/:name/toggle
Content-Type: application/json

{
  "enabled": true
}
```

#### Update Rollout
```http
POST /api/feature-flags/flags/:name/rollout
Content-Type: application/json

{
  "percentage": 75
}
```

#### Get Analytics
```http
GET /api/feature-flags/flags/:name/analytics?startDate=2024-01-01&endDate=2024-12-31
```

#### Delete Flag
```http
DELETE /api/feature-flags/flags/:name
```

### Public Endpoints

#### Evaluate Flag
```http
POST /api/feature-flags/flags/:name/evaluate
Content-Type: application/json

{
  "userId": "user-123",
  "userAttributes": {
    "role": "admin",
    "county": "Nairobi"
  }
}
```

## Usage Examples

### Server-Side Usage

```typescript
import { FeatureFlagService } from '@server/features/feature-flags';

const service = new FeatureFlagService();

// Create a flag
await service.createFlag({
  name: 'new-dashboard',
  description: 'New dashboard UI',
  enabled: true,
  rolloutPercentage: 25
});

// Check if enabled
const result = await service.isEnabled('new-dashboard', {
  userId: 'user-123'
});

if (result.enabled) {
  // Show new dashboard
}
```

### Middleware Usage

```typescript
import { requireFeatureFlag, attachFeatureFlag } from '@server/features/feature-flags/application/middleware';

// Block request if flag is disabled
router.get('/new-feature', requireFeatureFlag('new-feature'), handler);

// Attach flag info without blocking
router.get('/dashboard', attachFeatureFlag('new-dashboard'), (req, res) => {
  if (req.featureFlag.enabled) {
    // Show new dashboard
  } else {
    // Show old dashboard
  }
});
```

### A/B Testing

```typescript
await service.createFlag({
  name: 'checkout-flow',
  enabled: true,
  rolloutPercentage: 100,
  abTestConfig: {
    variants: ['control', 'variant-a', 'variant-b'],
    distribution: [33, 33, 34],
    metrics: ['conversion_rate', 'cart_abandonment']
  }
});

const result = await service.isEnabled('checkout-flow', {
  userId: 'user-123'
});

// result.variant will be 'control', 'variant-a', or 'variant-b'
```

### User Targeting

```typescript
await service.createFlag({
  name: 'beta-feature',
  enabled: true,
  rolloutPercentage: 0,
  userTargeting: {
    include: ['beta-user-1', 'beta-user-2'],
    exclude: ['blocked-user'],
    attributes: {
      role: 'admin',
      county: 'Nairobi'
    }
  }
});
```

## Database Schema

### feature_flags
- `id` - UUID primary key
- `name` - Unique flag name
- `description` - Flag description
- `enabled` - Whether flag is enabled
- `rollout_percentage` - Percentage of users to enable (0-100)
- `user_targeting` - User targeting configuration (JSONB)
- `ab_test_config` - A/B test configuration (JSONB)
- `dependencies` - Array of dependent flag names
- `metadata` - Additional metadata
- `created_at`, `updated_at`, `updated_by` - Audit fields

### feature_flag_evaluations
- `id` - UUID primary key
- `flag_id` - Foreign key to feature_flags
- `user_id` - User who evaluated the flag
- `enabled` - Evaluation result
- `variant` - A/B test variant (if applicable)
- `evaluation_context` - Context at evaluation time
- `evaluated_at` - Timestamp

### feature_flag_metrics
- `id` - UUID primary key
- `flag_id` - Foreign key to feature_flags
- `total_requests` - Total evaluation requests
- `enabled_requests` - Requests where flag was enabled
- `disabled_requests` - Requests where flag was disabled
- `error_count` - Number of errors
- `avg_response_time` - Average response time
- `window_start`, `window_end` - Time window for metrics

## Best Practices

1. **Naming Convention**: Use kebab-case for flag names (e.g., `new-dashboard`, `beta-feature`)

2. **Gradual Rollout**: Start with low percentages and gradually increase
   ```
   0% → 5% → 25% → 50% → 100%
   ```

3. **User Targeting**: Use include lists for beta testing before percentage rollouts

4. **Dependencies**: Specify dependencies to ensure flags are enabled in correct order

5. **Cleanup**: Remove flags after full rollout to avoid technical debt

6. **Monitoring**: Track analytics to measure feature impact

7. **Emergency Kill Switch**: Keep flags enabled in production for quick rollback

## Testing

```bash
# Run unit tests
npm test -- server/features/feature-flags/__tests__/service.test.ts --run

# Run integration tests
npm test -- server/features/feature-flags/__tests__/integration.test.ts --run
```

## Migration

To create the database tables:

```bash
npm run db:generate
npm run db:migrate
```

## Integration with Existing Code

The feature flag system integrates with the existing `FeatureFlagService` in `server/infrastructure/feature-flags.ts`. The new system provides:

- Database persistence (vs in-memory)
- User targeting
- A/B testing
- Analytics
- Admin UI support

Both systems can coexist during migration.
