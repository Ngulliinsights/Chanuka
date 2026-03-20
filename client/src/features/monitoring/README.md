# Integration Monitoring Dashboard

A comprehensive monitoring dashboard for tracking all integrated features in real-time.

## Features

- **Real-time Dashboard**: Monitor all integrated features with automatic refresh
- **Health Status Display**: Visual indicators for feature health (healthy, degraded, down, unknown)
- **Metrics Visualization**: Display key metrics including requests, error rates, and response times
- **Alert Management**: View, acknowledge, and resolve alerts
- **Feature Usage Charts**: Visualize usage trends over time
- **Performance Metrics**: Track response times (avg, p95, p99)
- **Error Tracking**: Monitor error rates and view error logs

## Components

### IntegrationMonitoringDashboard
Main dashboard component that displays:
- System health overview
- Feature list with health status
- Feature detail modal with tabs for overview, metrics, alerts, and logs

### HealthStatusDisplay
Displays health status with appropriate color coding:
- Green: Healthy
- Yellow: Degraded
- Red: Down
- Gray: Unknown

### MetricsVisualization
Shows aggregated metrics for a feature over the last 24 hours:
- Total requests
- Success rate
- Average response time
- Error rate

### AlertManagement
Manages alerts for a feature:
- View active and resolved alerts
- Acknowledge alerts
- Resolve alerts
- Filter by resolution status

### FeatureUsageCharts
Displays usage trends:
- Total requests over time
- Active users over time
- Success rate over time

### PerformanceMetrics
Shows performance metrics:
- Average response time
- P95 response time
- P99 response time

### ErrorTrackingDisplay
Displays error tracking information:
- Error statistics
- Error trend chart
- Recent error logs with filtering

## API

The monitoring dashboard integrates with the backend monitoring API at `/api/monitoring`:

- `GET /api/monitoring/dashboard` - Get dashboard data
- `GET /api/monitoring/features/:featureId/metrics` - Get feature metrics
- `GET /api/monitoring/features/:featureId/alerts` - Get feature alerts
- `PUT /api/monitoring/alerts/:alertId/acknowledge` - Acknowledge an alert
- `PUT /api/monitoring/alerts/:alertId/resolve` - Resolve an alert
- `GET /api/monitoring/features/:featureId/logs` - Get feature logs

## Usage

```tsx
import { IntegrationMonitoringDashboard } from '@/features/monitoring';

function MonitoringPage() {
  return <IntegrationMonitoringDashboard />;
}
```

## Testing

The monitoring feature includes comprehensive tests:

- Component tests for all UI components
- Hook tests for data fetching
- E2E tests for dashboard workflows

Run tests:
```bash
npm test -- monitoring
```

## Architecture

The monitoring feature follows the Feature-Sliced Design (FSD) pattern:

```
monitoring/
├── api/              # API client
├── hooks/            # React hooks for data fetching
├── ui/               # UI components
├── pages/            # Page components
├── types.ts          # TypeScript types
└── __tests__/        # Tests
```

## Real-time Updates

The dashboard automatically refreshes every 30 seconds by default. This can be configured by passing a different `refreshInterval` to the hooks.

## Performance

- Metrics are cached for 60 seconds
- Dashboard data is cached for 10 seconds
- Alerts are cached for 30 seconds
- Logs are cached for 30 seconds

## Accessibility

All components are keyboard accessible and screen reader compatible.
