# Observability Module

Unified observability infrastructure consolidating error monitoring, performance tracking, telemetry, and analytics.

## Purpose

The observability module provides a centralized interface for tracking application health, performance, errors, and user behavior. It consolidates four previously separate modules (monitoring, performance, telemetry, analytics) into a single cohesive system.

## Requirements

- **4.1, 4.2, 4.3, 4.4**: Standard module structure with index.ts, types.ts, README.md, __tests__/
- **11.1**: Unified observability interface with all capabilities
- **11.2**: Error tracking with context
- **11.3**: Performance monitoring with metrics
- **11.4**: Analytics event tracking
- **11.5**: Telemetry data aggregation

## Architecture

```
observability/
├── index.ts                 # Public API exports
├── types.ts                 # Type definitions
├── README.md                # This file
├── __tests__/               # Test files
├── error-monitoring/        # Error tracking sub-module
├── performance/             # Performance monitoring sub-module
├── telemetry/               # System telemetry sub-module
└── analytics/               # Analytics tracking sub-module
```

## Public API

### Core Interface

```typescript
import { observability } from '@/infrastructure/observability';

// Track an error
observability.trackError(error, {
  component: 'UserProfile',
  operation: 'loadUserData',
  userId: 'user-123',
  metadata: { attemptNumber: 3 }
});

// Track performance
observability.trackPerformance({
  name: 'api.getUserProfile',
  value: 245,
  unit: 'ms',
  timestamp: new Date(),
  category: 'api'
});

// Track analytics event
observability.trackEvent({
  name: 'button_clicked',
  properties: { buttonId: 'submit', page: 'profile' },
  userId: 'user-123'
});

// Send telemetry
await observability.sendTelemetry({
  type: 'system_health',
  payload: { cpu: 45, memory: 60 }
});

// Get metrics
const metrics = observability.getMetrics();
```

## Sub-modules

### Error Monitoring (`error-monitoring/`)

Tracks and aggregates application errors with context. Integrates with external monitoring services like Sentry.

**Key Features:**
- Error tracking with rich context
- Error aggregation and deduplication
- Integration with Sentry
- Error trend analysis

### Performance (`performance/`)

Monitors application performance including Web Vitals, custom metrics, and performance budgets.

**Key Features:**
- Web Vitals tracking (LCP, FID, INP, CLS, FCP, TTFB)
- Performance budget monitoring
- Real-time alerts
- Custom metrics collection

### Telemetry (`telemetry/`)

Collects and aggregates system telemetry data for diagnostics and monitoring.

**Key Features:**
- System metrics collection
- Data aggregation
- Batch sending to reduce overhead
- Configurable export formats

### Analytics (`analytics/`)

Tracks user behavior and engagement across the application.

**Key Features:**
- Event tracking
- User journey tracking
- Session management
- Persona-specific tracking

## Integration with Other Modules

The observability module integrates with:

- **Error Handler**: Receives error notifications for tracking
- **Logger**: Logs observability events
- **API Module**: Tracks API performance and errors
- **Store**: Monitors state changes and performance

## Usage Examples

### Basic Error Tracking

```typescript
try {
  await fetchUserData(userId);
} catch (error) {
  observability.trackError(error as Error, {
    component: 'UserService',
    operation: 'fetchUserData',
    userId,
    metadata: { endpoint: '/api/users' }
  });
}
```

### Performance Monitoring

```typescript
const startTime = performance.now();
await performOperation();
const duration = performance.now() - startTime;

observability.trackPerformance({
  name: 'operation.duration',
  value: duration,
  unit: 'ms',
  timestamp: new Date(),
  category: 'business-logic'
});
```

### Analytics Tracking

```typescript
observability.trackEvent({
  name: 'feature_used',
  properties: {
    feature: 'dashboard',
    action: 'widget_added',
    widgetType: 'chart'
  },
  userId: currentUser.id
});
```

## Configuration

The observability module can be configured through the initialization:

```typescript
import { initializeObservability } from '@/infrastructure/observability';

initializeObservability({
  errorMonitoring: {
    enabled: true,
    sentryDsn: process.env.SENTRY_DSN
  },
  performance: {
    enabled: true,
    budgets: {
      'page.load': { budget: 3000, warning: 2500 }
    }
  },
  analytics: {
    enabled: true,
    flushInterval: 30000
  },
  telemetry: {
    enabled: true,
    aggregationInterval: 60000
  }
});
```

## Testing

Tests are located in the `__tests__/` directory and cover:

- Error tracking with various contexts
- Performance metric collection
- Analytics event tracking
- Telemetry data aggregation
- Integration with external services

Run tests with:
```bash
npm test -- observability
```

## Migration Guide

If you were using the old separate modules:

### From `monitoring`
```typescript
// Old
import { ErrorMonitor } from '@/infrastructure/monitoring';
ErrorMonitor.trackError(error);

// New
import { observability } from '@/infrastructure/observability';
observability.trackError(error, context);
```

### From `performance`
```typescript
// Old
import { recordMetric } from '@/infrastructure/performance';
recordMetric(metric);

// New
import { observability } from '@/infrastructure/observability';
observability.trackPerformance(metric);
```

### From `analytics`
```typescript
// Old
import { ComprehensiveAnalyticsTracker } from '@/infrastructure/analytics';
ComprehensiveAnalyticsTracker.getInstance().trackEvent(event);

// New
import { observability } from '@/infrastructure/observability';
observability.trackEvent(event);
```

### From `telemetry`
```typescript
// Old
import { telemetryService } from '@/infrastructure/telemetry';
telemetryService.sendMetrics(data);

// New
import { observability } from '@/infrastructure/observability';
observability.sendTelemetry(data);
```

## Best Practices

1. **Always provide context**: Include component, operation, and relevant metadata when tracking errors
2. **Use meaningful metric names**: Follow naming convention `category.subcategory.metric`
3. **Batch telemetry**: Use the built-in aggregation to reduce overhead
4. **Monitor performance budgets**: Set and track budgets for critical operations
5. **Track user journeys**: Use consistent event naming for analytics

## Performance Considerations

- Error tracking is synchronous but lightweight
- Performance metrics are recorded asynchronously
- Analytics events are batched and sent periodically
- Telemetry data is aggregated before sending
- All operations are non-blocking to avoid impacting user experience

## Security

- PII is automatically sanitized from error contexts
- User IDs are hashed before sending to external services
- Telemetry data is encrypted in transit
- Analytics events respect user privacy preferences
