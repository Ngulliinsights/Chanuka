# Analytics Monitoring Setup Guide

## Overview

This guide provides instructions for setting up comprehensive monitoring for the analytics service, including dashboards, alerts, and operational procedures.

## Prerequisites

- Grafana or compatible dashboard system
- Prometheus or metrics collection system
- AlertManager or alerting system
- Log aggregation system (ELK stack, Loki, etc.)
- Access to production infrastructure

## Metrics Collection Setup

### Application Metrics

The analytics service exposes metrics at `/metrics` endpoint (Prometheus format):

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'analytics'
    static_configs:
      - targets: ['analytics-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Custom Metrics

The analytics service exports the following custom metrics:

#### HTTP Metrics
```
http_requests_total{route="/api/analytics/engagement/metrics", method="GET", status="200"} 1234
http_request_duration_seconds{route="/api/analytics/engagement/metrics", method="GET", quantile="0.5"} 0.15
http_request_duration_seconds{route="/api/analytics/engagement/metrics", method="GET", quantile="0.95"} 0.45
http_request_duration_seconds{route="/api/analytics/engagement/metrics", method="GET", quantile="0.99"} 1.2
```

#### Cache Metrics
```
cache_hits_total{cache="analytics", prefix="engagement"} 5678
cache_misses_total{cache="analytics", prefix="engagement"} 1234
cache_hit_ratio{cache="analytics", prefix="engagement"} 0.82
```

#### Database Metrics
```
db_connections_active{database="analytics"} 5
db_connections_idle{database="analytics"} 10
db_query_duration_seconds{query_type="SELECT", quantile="0.95"} 0.08
```

#### Business Metrics
```
analytics_requests_total{endpoint="engagement_metrics"} 12345
analytics_processing_time_seconds{operation="ml_analysis"} 2.5
analytics_cache_size{type="user_engagement"} 1024
```

## Dashboard Setup

### Grafana Dashboard Import

1. **Access Grafana**
   ```bash
   open http://grafana.example.com
   ```

2. **Import Dashboard**
   - Go to Dashboards → Import
   - Upload `dashboard-config.json`
   - Select Prometheus as data source
   - Set folder to "Analytics"

3. **Verify Dashboard**
   - Check all panels are populated with data
   - Verify time ranges are correct
   - Test variable dropdowns

### Custom Dashboard Panels

#### Request Volume Trends
```sql
SELECT
  date_trunc('hour', created_at) as hour,
  count(*) as requests,
  count(*) filter (where status_code >= 400) as errors
FROM analytics_requests
WHERE created_at >= now() - interval '24 hours'
GROUP BY hour
ORDER BY hour;
```

#### Top Slow Endpoints
```sql
SELECT
  route,
  avg(duration_ms) as avg_duration,
  percentile_cont(0.95) within group (order by duration_ms) as p95_duration,
  count(*) as request_count
FROM analytics_requests
WHERE created_at >= now() - interval '1 hour'
  AND duration_ms > 1000
GROUP BY route
ORDER BY p95_duration DESC
LIMIT 10;
```

## Alert Configuration

### AlertManager Configuration

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'analytics-alerts'
  routes:
  - match:
      service: analytics
    receiver: 'analytics-pager'

receivers:
- name: 'analytics-alerts'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/...'
    channel: '#analytics-alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ .CommonAnnotations.description }}'

- name: 'analytics-pager'
  pagerduty_configs:
  - service_key: 'your-pagerduty-key'
```

### Alert Rules

```yaml
# analytics-alerts.yml
groups:
- name: analytics
  rules:
  - alert: AnalyticsHighErrorRate
    expr: sum(rate(http_requests_total{job="analytics", status=~"[5][0-9][0-9]"}[5m])) / sum(rate(http_requests_total{job="analytics"}[5m])) * 100 > 5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Analytics service error rate above 5%"
      description: "Error rate: {{ $value }}%"

  - alert: AnalyticsSlowResponseTime
    expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="analytics"}[5m])) by (le)) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Analytics service p95 response time above 2s"
      description: "p95 latency: {{ $value }}s"

  - alert: AnalyticsLowCacheHitRate
    expr: sum(rate(cache_hits_total{job="analytics"}[10m])) / (sum(rate(cache_hits_total{job="analytics"}[10m])) + sum(rate(cache_misses_total{job="analytics"}[10m]))) * 100 < 50
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Analytics cache hit rate below 50%"
      description: "Cache hit rate: {{ $value }}%"

  - alert: AnalyticsHighSlowRequestCount
    expr: sum(rate(http_request_duration_seconds_count{job="analytics", le="2"}[5m])) > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High number of slow analytics requests"
      description: "Slow requests: {{ $value }}/min"
```

## Log Aggregation Setup

### ELK Stack Configuration

#### Filebeat Configuration
```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  paths:
    - /var/log/analytics/*.log
  fields:
    service: analytics
  fields_under_root: true

processors:
- add_kubernetes_metadata:
    host: ${NODE_NAME}
    matchers:
    - logs_path:
        logs_path: "/var/log/containers/"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "analytics-%{+yyyy.MM.dd}"
```

#### Elasticsearch Index Template
```json
{
  "index_patterns": ["analytics-*"],
  "mappings": {
    "properties": {
      "@timestamp": { "type": "date" },
      "level": { "type": "keyword" },
      "message": { "type": "text" },
      "traceId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "route": { "type": "keyword" },
      "method": { "type": "keyword" },
      "statusCode": { "type": "integer" },
      "duration": { "type": "float" },
      "error": { "type": "text" },
      "service": { "type": "keyword" }
    }
  }
}
```

#### Kibana Dashboard Setup
1. Import saved objects from `kibana-analytics-dashboard.ndjson`
2. Set time range to "Last 15 minutes"
3. Configure index pattern: `analytics-*`

### Loki Configuration (Alternative)

```yaml
# promtail.yml
scrape_configs:
  - job_name: analytics
    static_configs:
      - targets:
          - localhost
        labels:
          job: analytics
          __path__: /var/log/analytics/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            traceId: traceId
```

## Operational Procedures

### Daily Monitoring Checklist

- [ ] Review dashboard for any alerts or anomalies
- [ ] Check error rates across all endpoints
- [ ] Verify cache hit rates are above 70%
- [ ] Review slow query logs for optimization opportunities
- [ ] Check system resource utilization
- [ ] Review log aggregation for new error patterns

### Weekly Review

- [ ] Analyze performance trends over the past week
- [ ] Review top slow endpoints and optimization opportunities
- [ ] Check cache effectiveness and tuning opportunities
- [ ] Review alert history and false positive rates
- [ ] Update monitoring thresholds based on baseline changes

### Monthly Review

- [ ] Comprehensive performance analysis
- [ ] Capacity planning based on growth trends
- [ ] Alert rule optimization
- [ ] Dashboard improvements based on operational feedback

## Troubleshooting Monitoring

### Common Issues

#### Metrics Not Appearing
```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Verify Prometheus configuration
curl http://prometheus:9090/config

# Check service discovery
curl http://prometheus:9090/service-discovery
```

#### Alerts Not Firing
```bash
# Test alert expression
curl "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{job=\"analytics\", status=~\"[5][0-9][0-9]\"}[5m])) / sum(rate(http_requests_total{job=\"analytics\"}[5m])) * 100 > 5"

# Check AlertManager status
curl http://alertmanager:9093/api/v2/status
```

#### Dashboard Not Loading
```bash
# Check Grafana logs
docker logs grafana

# Verify data source connectivity
curl http://grafana:3000/api/datasources
```

## Performance Baselines

### Normal Operating Ranges

| Metric | Warning | Critical | Description |
|--------|---------|----------|-------------|
| Error Rate | > 1% | > 5% | Percentage of failed requests |
| p95 Latency | > 1s | > 2s | 95th percentile response time |
| Cache Hit Rate | < 70% | < 50% | Percentage of cache hits |
| Memory Usage | > 80% | > 90% | Process memory utilization |
| CPU Usage | > 70% | > 85% | Process CPU utilization |
| DB Connections | > 80% | > 95% | Database connection pool usage |

### Seasonal Adjustments

- **Peak Hours**: 9 AM - 6 PM EST (adjust thresholds +20%)
- **Weekends**: Reduced traffic (adjust thresholds -30%)
- **Holidays**: Variable traffic (monitor closely, adjust manually)

## Contact Information

### On-Call Rotation
- Primary: DevOps Team (`@devops` in Slack)
- Secondary: Analytics Team (`@analytics` in Slack)
- Escalation: Engineering Manager

### External Resources
- Monitoring System: http://monitoring.example.com
- Runbooks: https://wiki.example.com/analytics-runbooks
- Incident Response: https://wiki.example.com/incident-response
