# Production Monitoring Configuration

## Overview

This document outlines the comprehensive production monitoring setup for all migrated components, ensuring continuous visibility into system health, performance, and reliability.

## Monitoring Architecture

### Core Monitoring Components

#### 1. Performance Monitor
- **Location**: `shared/core/src/testing/performance-monitor.ts`
- **Purpose**: Real-time performance tracking and alerting
- **Configuration**:
```typescript
const performanceMonitor = new PerformanceMonitor({
  maxDataAge: 24 * 60 * 60 * 1000, // 24 hours
  maxDataPoints: 10000,
  baselineFile: './performance-baselines.json',
  reportsDir: './reports'
});
```

#### 2. Unified Logger
- **Location**: `shared/core/src/observability/logging/logger.ts`
- **Purpose**: Structured logging with correlation IDs and performance tracking
- **Configuration**:
```typescript
const logger = new UnifiedLogger({
  level: process.env.LOG_LEVEL || 'info',
  enableMetrics: true,
  enableInMemoryStorage: true,
  maxStoredLogs: 10000,
  enableTracing: true,
  samplingRate: 0.1
});
```

#### 3. Benchmark Suite
- **Location**: `shared/core/src/testing/performance-benchmarks.ts`
- **Purpose**: Automated performance regression testing
- **Configuration**:
```typescript
const benchmarks = new PerformanceBenchmarks({
  iterations: {
    cache: { get: 10000, set: 5000 },
    rateLimit: { single: 5000, burst: 5000 },
    logging: { single: 10000, volume: 100 },
    validation: { simple: 10000, complex: 1000 }
  }
});
```

## Component-Specific Monitoring

### Cache Layer (Redis/Memory)
```typescript
// Monitor cache hit rates
performanceMonitor.startMonitoring('cache:hit-rate', async () => {
  const stats = await cache.getStats();
  return (stats.hits / (stats.hits + stats.misses)) * 100;
}, 30000); // Every 30 seconds

// Monitor cache memory usage
performanceMonitor.startMonitoring('cache:memory-usage', async () => {
  const info = await cache.info('memory');
  return parseInt(info.used_memory);
}, 60000); // Every minute

// Monitor cache operations per second
performanceMonitor.startMonitoring('cache:ops-per-second', async () => {
  const stats = await cache.getStats();
  return stats.total_commands_processed;
}, 10000); // Every 10 seconds
```

### Rate Limiting (Redis-based)
```typescript
// Monitor rate limit hits
performanceMonitor.startMonitoring('rate-limit:hits', async () => {
  const hits = await rateLimiter.getTotalHits();
  return hits;
}, 30000);

// Monitor blocked requests
performanceMonitor.startMonitoring('rate-limit:blocked', async () => {
  const blocked = await rateLimiter.getBlockedCount();
  return blocked;
}, 30000);

// Monitor rate limit memory usage
performanceMonitor.startMonitoring('rate-limit:memory', async () => {
  const memory = await rateLimiter.getMemoryUsage();
  return memory;
}, 60000);
```

### Search Engine (Fuse.js)
```typescript
// Monitor search response times
performanceMonitor.startMonitoring('search:response-time', async () => {
  const start = performance.now();
  await searchEngine.search('test query');
  return performance.now() - start;
}, 30000);

// Monitor search result relevance
performanceMonitor.startMonitoring('search:relevance-score', async () => {
  const results = await searchEngine.search('specific test query');
  return calculateAverageRelevance(results);
}, 60000);

// Monitor search index size
performanceMonitor.startMonitoring('search:index-size', async () => {
  return searchEngine.getIndexSize();
}, 300000); // Every 5 minutes
```

### Validation Layer (Zod)
```typescript
// Monitor validation times
performanceMonitor.startMonitoring('validation:response-time', async () => {
  const start = performance.now();
  await validator.validate(userSchema, testData);
  return performance.now() - start;
}, 30000);

// Monitor validation errors
performanceMonitor.startMonitoring('validation:error-rate', async () => {
  const errors = await validator.getErrorCount();
  const total = await validator.getTotalValidations();
  return total > 0 ? (errors / total) * 100 : 0;
}, 60000);
```

### WebSocket Layer (Socket.IO)
```typescript
// Monitor active connections
performanceMonitor.startMonitoring('websocket:active-connections', async () => {
  return io.engine.clientsCount;
}, 30000);

// Monitor message throughput
performanceMonitor.startMonitoring('websocket:messages-per-second', async () => {
  return websocketMonitor.getMessagesPerSecond();
}, 10000);

// Monitor connection errors
performanceMonitor.startMonitoring('websocket:connection-errors', async () => {
  return websocketMonitor.getConnectionErrors();
}, 60000);
```

### Database Layer (Drizzle ORM)
```typescript
// Monitor query execution times
performanceMonitor.startMonitoring('database:query-time', async () => {
  const start = performance.now();
  await db.select().from(users).limit(1);
  return performance.now() - start;
}, 30000);

// Monitor connection pool usage
performanceMonitor.startMonitoring('database:pool-usage', async () => {
  const pool = db.$pool;
  return pool.totalCount - pool.idleCount;
}, 30000);

// Monitor slow queries
performanceMonitor.startMonitoring('database:slow-queries', async () => {
  return await db.getSlowQueryCount();
}, 60000);
```

## Alert Configuration

### Critical Alerts
```yaml
# alerting-rules.yml
groups:
  - name: migration_critical_alerts
    rules:
      - alert: CacheUnavailable
        expr: up{job="cache"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Cache service is down"
          description: "Cache service has been unavailable for 30 seconds"

      - alert: DatabaseConnectionPoolExhausted
        expr: database_connections_active / database_connections_total > 0.95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Active connections: {{ $value }}%"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate: {{ $value }}% over 5 minutes"

      - alert: MemoryUsageCritical
        expr: process_resident_memory_bytes / process_virtual_memory_max_bytes > 0.9
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Memory usage critical"
          description: "Memory usage: {{ $value }}%"
```

### Warning Alerts
```yaml
  - name: migration_warning_alerts
    rules:
      - alert: PerformanceDegradation
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time degradation"
          description: "95th percentile response time: {{ $value }}s"

      - alert: CacheHitRateLow
        expr: cache_hit_rate < 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate: {{ $value }}%"

      - alert: RateLimitExceeded
        expr: rate(rate_limit_exceeded_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit violations"
          description: "Rate limit violations: {{ $value }}/min"

      - alert: SearchResponseTimeHigh
        expr: histogram_quantile(0.95, rate(search_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Search response time elevated"
          description: "95th percentile search time: {{ $value }}s"
```

## Dashboard Configuration

### Grafana Dashboard Setup
```json
{
  "dashboard": {
    "title": "Migration Performance Dashboard",
    "tags": ["migration", "performance"],
    "panels": [
      {
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Cache Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "cache_hit_rate",
            "legendFormat": "Hit Rate %"
          },
          {
            "expr": "cache_operations_total",
            "legendFormat": "Operations/sec"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "database_query_duration_seconds{quantile=\"0.95\"}",
            "legendFormat": "95th percentile query time"
          },
          {
            "expr": "database_connections_active",
            "legendFormat": "Active connections"
          }
        ]
      },
      {
        "title": "Error Rates",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          },
          {
            "expr": "rate(validation_errors_total[5m])",
            "legendFormat": "Validation errors"
          }
        ]
      }
    ]
  }
}
```

## Automated Monitoring Scripts

### Daily Health Check
```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Migration Components Health Check ==="
echo "Date: $(date)"

# Check cache connectivity
echo "Cache Status:"
redis-cli ping || echo "Redis unavailable"

# Check database connectivity
echo "Database Status:"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" || echo "Database unavailable"

# Check search functionality
echo "Search Status:"
curl -s http://localhost:3000/api/search?q=test | jq '.success' || echo "Search unavailable"

# Check WebSocket connectivity
echo "WebSocket Status:"
timeout 5 bash -c "</dev/tcp/localhost/3001" && echo "WebSocket port open" || echo "WebSocket port closed"

# Performance metrics
echo "Performance Summary:"
curl -s http://localhost:9090/api/v1/query?query=http_request_duration_seconds%7Bquantile%3D%220.95%22%7D | jq .

echo "Health check complete"
```

### Performance Regression Test
```typescript
// performance-regression-test.ts
import { PerformanceBenchmarks } from './shared/core/src/testing/performance-benchmarks';
import { logger } from './shared/core/src/observability/logging';

async function runPerformanceRegressionTest() {
  const benchmarks = new PerformanceBenchmarks();

  try {
    logger.info('Starting performance regression test');

    const results = await benchmarks.runAll({
      cache: cacheService,
      rateLimiter: rateLimitStore,
      logger: logger,
      validator: validationService
    });

    // Check for regressions
    const regressions = results.results.filter(r =>
      r.category === 'cache' && r.averageTimeMs > 10 || // Cache operations > 10ms
      r.category === 'validation' && r.averageTimeMs > 5    // Validation > 5ms
    );

    if (regressions.length > 0) {
      logger.error('Performance regressions detected', { regressions });
      // Send alert
      await sendAlert('Performance Regression', regressions);
    } else {
      logger.info('No performance regressions detected');
    }

    // Save results
    await benchmarks.saveResults(results, './performance-reports');

  } catch (error) {
    logger.error('Performance regression test failed', { error });
  }
}

// Run daily
if (require.main === module) {
  runPerformanceRegressionTest();
}
```

## Monitoring Deployment

### Production Setup
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/config.yml

volumes:
  grafana_data:
```

### Application Integration
```typescript
// monitoring-integration.ts
import { PerformanceMonitor } from './shared/core/src/testing/performance-monitor';
import { UnifiedLogger } from './shared/core/src/observability/logging';

export class MonitoringIntegration {
  private performanceMonitor: PerformanceMonitor;
  private logger: UnifiedLogger;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.logger = new UnifiedLogger();
    this.setupMonitoring();
  }

  private setupMonitoring() {
    // Start all component monitoring
    this.startCacheMonitoring();
    this.startDatabaseMonitoring();
    this.startSearchMonitoring();
    this.startValidationMonitoring();
    this.startWebSocketMonitoring();

    // Set up alert thresholds
    this.setupAlertThresholds();

    // Start periodic health reporting
    setInterval(() => this.reportHealth(), 300000); // Every 5 minutes
  }

  private startCacheMonitoring() {
    this.performanceMonitor.startMonitoring('cache:hit-rate', async () => {
      const stats = await cache.getStats();
      return (stats.hits / (stats.hits + stats.misses)) * 100;
    }, 30000);
  }

  private startDatabaseMonitoring() {
    this.performanceMonitor.startMonitoring('db:query-time', async () => {
      const start = performance.now();
      await db.select().from(users).limit(1);
      return performance.now() - start;
    }, 30000);
  }

  private startSearchMonitoring() {
    this.performanceMonitor.startMonitoring('search:response-time', async () => {
      const start = performance.now();
      await searchEngine.search('test');
      return performance.now() - start;
    }, 30000);
  }

  private startValidationMonitoring() {
    this.performanceMonitor.startMonitoring('validation:time', async () => {
      const start = performance.now();
      await validator.validate(userSchema, { name: 'test', email: 'test@test.com' });
      return performance.now() - start;
    }, 30000);
  }

  private startWebSocketMonitoring() {
    this.performanceMonitor.startMonitoring('websocket:connections', () => {
      return io.engine.clientsCount;
    }, 30000);
  }

  private setupAlertThresholds() {
    this.performanceMonitor.setAlertThreshold('cache:hit-rate', {
      warning: { min: 70, max: 100 },
      critical: { min: 50, max: 100 }
    });

    this.performanceMonitor.setAlertThreshold('db:query-time', {
      warning: { min: 0, max: 100 },
      critical: { min: 0, max: 500 }
    });

    this.performanceMonitor.setAlertThreshold('search:response-time', {
      warning: { min: 0, max: 200 },
      critical: { min: 0, max: 1000 }
    });
  }

  private async reportHealth() {
    const dashboard = this.performanceMonitor.getDashboardData();
    this.logger.info('Health report', { health: dashboard });
  }
}
```

## Alert Escalation Procedures

### Alert Levels and Response Times
- **Critical**: Immediate response required (< 5 minutes)
- **Warning**: Response within 30 minutes
- **Info**: Monitor and address in regular maintenance

### Escalation Matrix
```
Critical Alerts:
├── DevOps Lead (Primary)
├── Engineering Manager (Secondary)
└── CTO (Tertiary)

Warning Alerts:
├── On-call Engineer (Primary)
├── DevOps Lead (Secondary)
└── Engineering Manager (Tertiary)

Info Alerts:
└── Daily review by engineering team
```

### Automated Escalation
```typescript
// alert-escalation.ts
export class AlertEscalation {
  async handleAlert(alert: PerformanceAlert) {
    switch (alert.level) {
      case 'critical':
        await this.escalateCritical(alert);
        break;
      case 'warning':
        await this.escalateWarning(alert);
        break;
      case 'info':
        await this.logInfoAlert(alert);
        break;
    }
  }

  private async escalateCritical(alert: PerformanceAlert) {
    // Immediate notifications
    await this.notifyPagerduty(alert);
    await this.notifySlack('#critical-alerts', alert);
    await this.notifySMS(onCallEngineer, alert);

    // Create incident ticket
    await this.createIncidentTicket(alert);
  }

  private async escalateWarning(alert: PerformanceAlert) {
    // Delayed notifications
    await this.notifySlack('#warnings', alert);

    // Email notification
    await this.sendEmail(onCallEngineer, 'Performance Warning', alert);
  }
}
```

This monitoring setup ensures comprehensive visibility into all migrated components, enabling proactive issue detection and rapid response to performance degradation.