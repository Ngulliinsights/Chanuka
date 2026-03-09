# Admin Logs Endpoint Implementation

## Overview
Replaced the placeholder logs endpoint with a real implementation that integrates with the existing Pino-based logging infrastructure and in-memory log buffer.

## Endpoints

### GET /api/admin/logs
Retrieves recent application logs with advanced filtering capabilities.

**Query Parameters:**
- `level` (optional): Filter by log level (info, warn, error, fatal, debug, trace, or 'all')
- `limit` (optional): Maximum number of logs to return (1-1000, default: 100)
- `component` (optional): Filter by component name
- `timeWindow` (optional): Time window in milliseconds (max 24 hours, default: 1 hour)

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2026-03-09T...",
      "level": "info",
      "message": "Log message",
      "component": "admin-router",
      "operation": "fetch_users",
      "duration": 45.2,
      "error": null
    }
  ],
  "count": 50,
  "total": 150,
  "filters": {
    "level": "all",
    "limit": 100,
    "component": null,
    "timeWindow": 3600000
  },
  "metadata": {
    "bufferSize": 1000,
    "timeRange": {
      "start": "2026-03-09T...",
      "end": "2026-03-09T..."
    },
    "availableComponents": ["admin-router", "bill-service", "auth"],
    "levelDistribution": {
      "info": 120,
      "warn": 20,
      "error": 10
    }
  },
  "message": "Logs retrieved successfully"
}
```

### GET /api/admin/logs/metrics
Retrieves aggregated log metrics including error rates, performance data, and system health score.

**Response:**
```json
{
  "summary": {
    "timeRange": { "start": "...", "end": "..." },
    "totalLogs": 1500,
    "errorRate": "2.50%",
    "logsByLevel": { "info": 1200, "warn": 250, "error": 50 },
    "logsByComponent": { "admin-router": 300, "bill-service": 500 },
    "topOperations": { "fetch_bills": 200, "update_user": 150 }
  },
  "performance": {
    "averageResponseTime": 125,
    "p95ResponseTime": 450,
    "p99ResponseTime": 850,
    "slowRequests": 15,
    "totalErrors": 38
  },
  "topErrors": [
    {
      "message": "Database connection timeout",
      "count": 12,
      "component": "database",
      "lastSeen": "2026-03-09T..."
    }
  ],
  "securityEvents": [
    {
      "type": "failed_login",
      "severity": "medium",
      "count": 5,
      "lastSeen": "2026-03-09T..."
    }
  ],
  "alerts": [
    {
      "id": "high_error_rate",
      "name": "High Error Rate",
      "severity": "high",
      "triggered": false,
      "currentValue": 2.5,
      "threshold": 5,
      "message": "Error rate has exceeded 5% in the last hour"
    }
  ],
  "healthScore": 87,
  "recommendations": [
    "High-activity components to monitor: bill-service, admin-router, auth."
  ],
  "message": "Log metrics retrieved successfully"
}
```

## Technical Details

### Integration Points
- **LogBuffer**: In-memory ring buffer storing recent log entries (configurable size)
- **LogAggregator**: Provides aggregated metrics, health scoring, and alert monitoring
- **Pino Logger**: Structured logging with automatic buffer ingestion

### Features
1. **Real-time Log Access**: Query logs from in-memory buffer with sub-second response times
2. **Advanced Filtering**: Filter by level, component, and time window
3. **Metrics & Analytics**: Aggregated performance metrics, error rates, and health scores
4. **Alert Monitoring**: Track alert rules and their current status
5. **Security Events**: Dedicated tracking of security-related log events
6. **Performance Insights**: P95/P99 response times, slow request tracking

### Configuration
Log buffer settings are controlled via `server/infrastructure/observability/logging-config.ts`:
- `enableInMemoryStorage`: Enable/disable log buffering
- `maxStoredLogs`: Maximum number of logs to retain in memory
- `slowRequestThreshold`: Threshold for marking requests as slow

### Limitations
- Logs are stored in-memory only (not persisted to disk)
- Maximum retention based on buffer size (default: last N entries)
- Time window queries limited to 24 hours
- For long-term log storage, integrate with external systems (Datadog, CloudWatch, etc.)

## Usage Examples

### Get recent error logs
```bash
GET /api/admin/logs?level=error&limit=50
```

### Get logs from specific component
```bash
GET /api/admin/logs?component=bill-service&timeWindow=7200000
```

### Get system health metrics
```bash
GET /api/admin/logs/metrics
```

## Future Enhancements
- Export logs to external systems (Datadog, CloudWatch, Elasticsearch)
- Real-time log streaming via WebSocket
- Advanced query language for complex filtering
- Log retention policies and archival
- Integration with alerting systems (PagerDuty, Slack)
