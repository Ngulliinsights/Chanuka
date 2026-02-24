# Integration Monitoring Framework

Comprehensive monitoring system for tracking feature usage, performance, health, and alerts across all integrated features in the strategic integration project.

## Overview

The Integration Monitoring Framework provides:

- **Feature Registration**: Register features for monitoring
- **Metrics Collection**: Automatic collection of usage and performance metrics
- **Health Checks**: Periodic health checks with status tracking
- **Alerting**: Configurable alert rules with multiple notification channels
- **Logging**: Centralized logging for integration events
- **Dashboard**: Real-time monitoring dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Monitoring Dashboard                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Health  │  │  Metrics │  │  Alerts  │                 │
│  │  Status  │  │  Charts  │  │   Log    │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼────────────────────────┘
        │             │             │
┌───────┴─────────────┴─────────────┴────────────────────────┐
│              Monitoring API                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Features │  │  Health  │  │  Alerts  │                 │
│  │   API    │  │  Checks  │  │   API    │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼────────────────────────┘
        │             │             │
┌───────┴─────────────┴─────────────┴────────────────────────┐
│              Monitoring Services                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Monitor │  │  Metrics │  │ Alerting │                 │
│  │  Service │  │Middleware│  │  Service │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼────────────────────────┘
        │             │             │
┌───────┴─────────────┴─────────────┴────────────────────────┐
│              Database (PostgreSQL)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Features │  │  Metrics │  │  Alerts  │                 │
│  │  Health  │  │   Logs   │  │  Rules   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

1. **integration_features**: Registry of all monitored features
2. **feature_metrics**: Time-series metrics for usage and performance
3. **health_checks**: Health check results
4. **integration_alerts**: Alert records
5. **alert_rules**: Configurable alert rules
6. **integration_logs**: Detailed event logs

## Usage

### 1. Register a Feature

```typescript
import { integrationMonitor } from '@server/features/monitoring';

const feature = await integrationMonitor.registerFeature({
  name: 'pretext-detection',
  displayName: 'Pretext Detection',
  description: 'Trojan bill detection system',
  category: 'quick-wins',
  phase: 1,
  enabled: true,
});
```

### 2. Add Metrics Collection Middleware

```typescript
import { createMetricsMiddleware } from '@server/features/monitoring';
import { Router } from 'express';

const router = Router();

// Add metrics middleware to all routes
router.use(createMetricsMiddleware(featureId, 'Pretext Detection'));

// Your routes here
router.get('/analyze', async (req, res) => {
  // Metrics are automatically collected
  res.json({ result: 'success' });
});
```

### 3. Perform Health Checks

```typescript
import { integrationMonitor } from '@server/features/monitoring';

// Perform health check
const healthCheck = await integrationMonitor.performHealthCheck(
  featureId,
  async () => {
    try {
      // Check if service is healthy
      const response = await fetch('http://localhost:3000/api/pretext-detection/health');
      
      if (response.ok) {
        return { status: 'healthy' };
      } else {
        return {
          status: 'degraded',
          errorMessage: `Unexpected status: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        status: 'down',
        errorMessage: error.message,
      };
    }
  }
);
```

### 4. Configure Alert Rules

```typescript
import { integrationMonitor } from '@server/features/monitoring';

// Add alert rule for high error rate
const rule = await integrationMonitor.addAlertRule({
  featureId,
  name: 'High Error Rate',
  description: 'Alert when error rate exceeds 5%',
  enabled: true,
  metric: 'error_rate',
  operator: 'gt',
  threshold: '0.05',
  timeWindow: 5, // minutes
  severity: 'high',
  cooldown: 15, // minutes
  notificationChannels: ['email', 'webhook', 'log'],
});
```

### 5. Log Events

```typescript
import { integrationMonitor } from '@server/features/monitoring';

// Log an event
await integrationMonitor.logEvent(
  featureId,
  'info',
  'api',
  'Analysis completed successfully',
  {
    billId: 'bill-123',
    duration: 150,
    detections: 2,
  },
  userId,
  requestId
);
```

### 6. Get Dashboard Data

```typescript
import { integrationMonitor } from '@server/features/monitoring';

// Get dashboard data
const dashboard = await integrationMonitor.getDashboardData();

console.log('System Health:', dashboard.systemHealth);
console.log('Features:', dashboard.features);
```

## API Endpoints

### Dashboard

- `GET /api/monitoring/dashboard` - Get monitoring dashboard data
- `GET /api/monitoring/health` - Get overall system health

### Features

- `POST /api/monitoring/features` - Register a new feature
- `PUT /api/monitoring/features/:featureId/status` - Update feature status

### Metrics

- `GET /api/monitoring/features/:featureId/metrics` - Get feature metrics
- `POST /api/monitoring/features/:featureId/metrics` - Record metrics manually

### Health Checks

- `POST /api/monitoring/features/:featureId/health-check` - Perform health check

### Alerts

- `GET /api/monitoring/features/:featureId/alerts` - Get feature alerts
- `POST /api/monitoring/alerts` - Create a new alert
- `PUT /api/monitoring/alerts/:alertId/acknowledge` - Acknowledge an alert
- `PUT /api/monitoring/alerts/:alertId/resolve` - Resolve an alert

### Alert Rules

- `POST /api/monitoring/features/:featureId/alert-rules` - Add an alert rule

### Logs

- `GET /api/monitoring/features/:featureId/logs` - Get feature logs
- `POST /api/monitoring/features/:featureId/logs` - Log an event

## Metrics Collected

### Usage Metrics

- **Active Users**: Number of unique users in the time window
- **Total Requests**: Total number of API requests
- **Successful Requests**: Number of successful requests (2xx, 3xx)
- **Failed Requests**: Number of failed requests (4xx, 5xx)

### Performance Metrics

- **Average Response Time**: Mean response time in milliseconds
- **P95 Response Time**: 95th percentile response time
- **P99 Response Time**: 99th percentile response time
- **Error Rate**: Percentage of failed requests

## Alert Severities

- **Critical**: Immediate attention required (e.g., service down)
- **High**: Urgent issue (e.g., high error rate, degraded performance)
- **Medium**: Important issue (e.g., elevated error rate)
- **Low**: Informational (e.g., minor anomalies)

## Alert Types

- **error_rate**: Error rate threshold exceeded
- **response_time**: Response time threshold exceeded
- **health_check**: Health check failed
- **usage**: Usage anomaly detected

## Notification Channels

### Email

Configure email recipients by severity:

```typescript
import { alertingService } from '@server/features/monitoring';

alertingService.registerEmailRecipients('critical', [
  'ops@example.com',
  'oncall@example.com',
]);
```

### Webhook

Register webhook endpoints:

```typescript
import { alertingService } from '@server/features/monitoring';

alertingService.registerWebhook('slack', 'https://hooks.slack.com/services/...');
```

### Log

Alerts are automatically logged to the application logs.

## Best Practices

1. **Register Features Early**: Register features during application startup
2. **Use Metrics Middleware**: Add metrics middleware to all feature routes
3. **Configure Alert Rules**: Set up alert rules for critical metrics
4. **Regular Health Checks**: Perform health checks every 1-5 minutes
5. **Monitor Dashboard**: Check the monitoring dashboard regularly
6. **Acknowledge Alerts**: Acknowledge alerts when investigating
7. **Resolve Alerts**: Resolve alerts after fixing issues

## Testing

### Unit Tests

```bash
npm test server/features/monitoring/__tests__/integration-monitor.service.test.ts
```

### Integration Tests

```bash
npm test server/features/monitoring/__tests__/monitoring-api.integration.test.ts
```

## Troubleshooting

### High Error Rate

1. Check feature logs for error details
2. Review recent code changes
3. Check external dependencies
4. Verify database connectivity

### Degraded Performance

1. Check response time metrics
2. Review database query performance
3. Check external API latency
4. Verify resource utilization

### Health Check Failures

1. Check service availability
2. Verify network connectivity
3. Review service logs
4. Check resource limits

## Future Enhancements

- [ ] Real-time dashboard with WebSocket updates
- [ ] Advanced analytics and trend analysis
- [ ] Machine learning-based anomaly detection
- [ ] Integration with external monitoring systems (Datadog, New Relic)
- [ ] Custom metric definitions
- [ ] SLA tracking and reporting
- [ ] Automated incident response

## License

Internal use only - Part of the Strategic Integration Project
