# Migration Infrastructure

This directory contains the comprehensive migration infrastructure for the library migration project. It provides feature flags, A/B testing, monitoring, rollback capabilities, validation, and orchestration for safe, data-driven migrations.

## Components

### 1. Feature Flags Service (`feature-flags.service.ts`)
- **Purpose**: Controls migration rollouts with percentage-based routing
- **Features**:
  - User hash-based consistent routing
  - Environment-specific conditions
  - Fallback mechanisms
  - A/B testing cohort assignment

### 2. A/B Testing Service (`ab-testing.service.ts`)
- **Purpose**: Provides statistical analysis and user behavior tracking
- **Features**:
  - Cohort tracking and metrics aggregation
  - Statistical significance testing (t-tests)
  - User behavior analysis
  - Conversion rate tracking

### 3. Monitoring Service (`monitoring.service.ts`)
- **Purpose**: Real-time monitoring with alerting
- **Features**:
  - Performance metrics collection
  - Configurable alert thresholds
  - Automatic rollback triggers
  - Dashboard data aggregation

### 4. Rollback Service (`rollback.service.ts`)
- **Purpose**: Automated and manual rollback capabilities
- **Features**:
  - Instant failover mechanisms
  - Step-by-step rollback procedures
  - Rollback history tracking
  - Component-specific rollback steps

### 5. Validation Service (`validation.service.ts`)
- **Purpose**: Data consistency and inter-phase verification
- **Features**:
  - Component validation checkpoints
  - Inter-phase validation
  - Data consistency checks
  - Performance regression detection

### 6. Dashboard Service (`dashboard.service.ts`)
- **Purpose**: Real-time dashboard with comprehensive metrics
- **Features**:
  - Real-time updates (5-second intervals)
  - Phase and component status
  - Performance summaries
  - Alert aggregation
  - Subscription-based updates

### 7. Migration Orchestrator (`orchestrator.service.ts`)
- **Purpose**: Coordinates the entire migration process
- **Features**:
  - Automated workflow execution
  - Phase dependency management
  - Gradual rollout scheduling
  - Emergency stop capabilities

### 8. Migration API (`migration-api.ts`)
- **Purpose**: REST API endpoints for migration control
- **Features**:
  - Dashboard data access
  - Feature flag management
  - Rollback triggers
  - Validation execution
  - Alert management

## Database Schema

The migration infrastructure uses a comprehensive database schema (`migration-state.schema.ts`) with the following tables:

- `migration_phases` - Phase tracking
- `migration_components` - Component status
- `data_validation_checkpoints` - Validation results
- `migration_metrics` - Performance metrics
- `ab_testing_cohorts` - A/B testing data
- `statistical_results` - Statistical analysis
- `rollback_events` - Rollback history
- `alert_events` - Alert tracking
- `inter_phase_validation` - Cross-phase validation
- `user_behavior_tracking` - User behavior analytics

## Usage Examples

### Basic Migration Control

```typescript
import { 
  featureFlagsService, 
  migrationOrchestrator,
  dashboardService 
} from './infrastructure/migration';

// Start migration process
await migrationOrchestrator.startMigration();

// Enable gradual rollout
await featureFlagsService.enableGradualRollout('utilities-concurrency-adapter', 25);

// Get dashboard data
const dashboard = await dashboardService.getDashboardData();
```

### API Usage

```bash
# Get dashboard data
GET /api/migration/dashboard

# Update feature flag
PUT /api/migration/feature-flags/utilities-concurrency-adapter
{
  "enabled": true,
  "rolloutPercentage": 50
}

# Trigger rollback
POST /api/migration/rollback/utilities-concurrency-adapter
{
  "reason": "High error rate detected"
}

# Run validation
POST /api/migration/validation/utilities-concurrency-adapter
{
  "phase": 1,
  "sampleSize": 1000
}
```

### Real-time Dashboard Subscription

```typescript
// Subscribe to dashboard updates
const unsubscribe = dashboardService.subscribe((data) => {
  console.log('Dashboard updated:', data.systemHealth);
  console.log('Active alerts:', data.alerts.total);
});

// Unsubscribe when done
unsubscribe();
```

## Migration Phases

The infrastructure supports 5 migration phases:

1. **Phase 1: Utilities Migration**
   - Concurrency adapter (async-mutex, p-limit)
   - Query builder migration (direct Drizzle)
   - ML service migration (real implementation)

2. **Phase 2: Search System Migration**
   - Fuzzy search (Fuse.js)
   - PostgreSQL full-text search
   - Simple matching optimization

3. **Phase 3: Error Handling Migration**
   - Boom error standardization
   - Neverthrow Result types
   - Middleware updates

4. **Phase 4: Repository Migration**
   - Direct Drizzle ORM usage
   - Repository pattern removal
   - Service layer updates

5. **Phase 5: WebSocket Migration**
   - Socket.IO implementation
   - Provider SDK integration
   - Connection migration

## Safety Features

### Automatic Rollback Triggers
- Error rate > 1%
- Response time > 500ms (P95)
- Memory usage > 90%
- Connection drops > 1%

### Validation Checkpoints
- Data consistency validation
- API compatibility checks
- Performance regression detection
- Cross-phase validation

### Monitoring & Alerting
- Real-time metrics collection
- Configurable alert thresholds
- Automatic escalation procedures
- Dashboard visualization

## Configuration

### Feature Flag Configuration
```typescript
{
  name: 'utilities-concurrency-adapter',
  enabled: true,
  rolloutPercentage: 25,
  conditions: {
    environment: 'production',
    userGroups: ['beta-testers']
  },
  fallbackEnabled: true
}
```

### Rollback Thresholds
```typescript
{
  component: 'utilities-concurrency-adapter',
  metric: 'errorRate',
  threshold: 0.01,
  operator: '>',
  windowMinutes: 5,
  enabled: true
}
```

### Alert Thresholds
```typescript
{
  metric: 'responseTime.p95',
  operator: '>',
  value: 500,
  severity: 'high',
  action: 'alert'
}
```

## Testing

The infrastructure includes comprehensive tests:

```bash
# Run migration infrastructure tests
npm test -- server/infrastructure/migration/__tests__/migration-infrastructure.test.ts

# Run dashboard and orchestrator tests
npm test -- server/infrastructure/migration/__tests__/dashboard-orchestrator.test.ts
```

## Database Migration

Apply the database schema:

```bash
# Run the migration
npm run db:migrate
```

The migration file is located at `drizzle/0024_migration_infrastructure.sql`.

## Monitoring Dashboard

The dashboard provides real-time visibility into:

- **System Health**: Overall migration status
- **Phase Progress**: Individual phase completion
- **Component Status**: Per-component metrics
- **Performance Trends**: Response time, error rate, memory usage
- **A/B Testing Results**: Statistical significance and recommendations
- **Alert Summary**: Active alerts by severity
- **Rollback History**: Recent rollback events

## Best Practices

1. **Gradual Rollouts**: Always start with 1% traffic
2. **Validation First**: Run validation before increasing rollout
3. **Monitor Closely**: Watch metrics during rollout periods
4. **Quick Rollback**: Don't hesitate to rollback on issues
5. **Document Issues**: Record reasons for rollbacks
6. **Test Thoroughly**: Validate all scenarios before production

## Emergency Procedures

### Emergency Stop
```bash
POST /api/migration/emergency-stop
```

This will:
1. Immediately disable all feature flags
2. Rollback all active migrations
3. Set migration status to 'failed'
4. Clear all active timers

### Manual Rollback
```bash
POST /api/migration/rollback/{component}
{
  "reason": "Emergency rollback due to critical issue"
}
```

### Health Check
```typescript
const health = await migrationInfrastructure.healthCheck();
if (!health.healthy) {
  console.error('Migration infrastructure issues:', health.issues);
}
```

## Support

For issues or questions about the migration infrastructure:

1. Check the test files for usage examples
2. Review the API documentation in `migration-api.ts`
3. Monitor the dashboard for real-time status
4. Check logs for detailed error information