# Monitoring and Metrics Documentation

## Overview

The Chanuka Legislative Transparency Platform includes comprehensive monitoring and metrics collection for all validation services, database operations, and system health. This guide explains how to access, interpret, and use the monitoring data for system optimization and troubleshooting.

## Health Endpoints

### Schema Validation Health

**Endpoint:** `GET /api/system/health/schema`

Returns real-time health status of all validation services.

**Response Structure:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-11-15T01:36:26.236Z",
  "services": {
    "InputValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 45,
      "uptime": "99.9%",
      "errorRate": 0.001
    },
    "GovernmentDataValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 32,
      "uptime": "99.8%",
      "errorRate": 0.002
    },
    "DataIntegrityValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 28,
      "uptime": "99.9%",
      "errorRate": 0.0005
    }
  },
  "schema": {
    "version": "1.0.0",
    "lastValidated": "2025-11-15T01:36:26.236Z",
    "totalSchemas": 45,
    "validSchemas": 45,
    "invalidSchemas": 0
  },
  "alerts": []
}
```

**Status Interpretation:**
- **healthy**: All services operational, response times within thresholds
- **degraded**: Some services slow or with elevated error rates
- **unhealthy**: Critical services failing or major performance issues

### Validation Metrics

**Endpoint:** `GET /api/system/metrics/validation`

Provides detailed performance and usage metrics.

**Query Parameters:**
- `period`: Time period (`1h`, `24h`, `7d`, `30d`) - default: `24h`
- `service`: Filter by service name (optional)
- `format`: Response format (`json`, `prometheus`) - default: `json`

**Response Structure:**
```json
{
  "period": "24h",
  "timestamp": "2025-11-15T01:36:26.236Z",
  "summary": {
    "totalValidations": 12547,
    "successfulValidations": 12489,
    "failedValidations": 58,
    "successRate": 0.995,
    "avgValidationTime": 23.45,
    "cacheHitRate": 0.712
  },
  "services": {
    "InputValidationService": {
      "validations": 4521,
      "successRate": 0.987,
      "avgResponseTime": 18.32,
      "cacheHits": 3214,
      "cacheMisses": 1307,
      "errorBreakdown": {
        "required": 15,
        "format": 8,
        "custom": 3
      }
    },
    "GovernmentDataValidationService": {
      "validations": 3214,
      "successRate": 0.992,
      "avgResponseTime": 45.67,
      "qualityScore": 0.94,
      "crossValidations": 892,
      "conflictResolved": 23
    },
    "DataIntegrityValidationService": {
      "validations": 4812,
      "successRate": 0.978,
      "avgResponseTime": 12.89,
      "integrityViolations": 12,
      "autoRepairs": 8,
      "criticalIssues": 1
    }
  },
  "performance": {
    "p50": 15.2,
    "p95": 89.4,
    "p99": 234.1,
    "max": 1250.8
  },
  "errors": {
    "byField": {
      "email": 12,
      "phoneNumber": 8,
      "dateOfBirth": 15,
      "postalCode": 6
    },
    "byCode": {
      "required": 23,
      "format": 18,
      "range": 17,
      "custom": 0
    },
    "byType": {
      "validation": 45,
      "system": 8,
      "network": 5
    }
  }
}
```

### Overall System Health

**Endpoint:** `GET /api/system/health/validation`

Returns consolidated validation system health.

**Response Structure:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T01:36:26.236Z",
  "uptime": "2d 4h 32m",
  "version": "1.0.0",
  "services": [
    {
      "name": "InputValidationService",
      "status": "healthy",
      "description": "Unified input validation service",
      "metrics": {
        "uptime": "99.9%",
        "errorRate": 0.001,
        "avgResponseTime": 18.32
      }
    },
    {
      "name": "GovernmentDataValidationService",
      "status": "healthy",
      "description": "Government data validation and integrity",
      "metrics": {
        "uptime": "99.8%",
        "errorRate": 0.002,
        "qualityScore": 0.94
      }
    },
    {
      "name": "DataIntegrityValidationService",
      "status": "healthy",
      "description": "Database integrity and constraint validation",
      "metrics": {
        "uptime": "99.9%",
        "errorRate": 0.0005,
        "violations": 12
      }
    }
  ],
  "lastMaintenance": "2025-11-13T08:00:00.000Z",
  "activeAlerts": 0
}
```

## Metrics Interpretation

### Key Performance Indicators

#### Success Rate
- **Target**: > 99.5%
- **Warning**: 99.0% - 99.5%
- **Critical**: < 99.0%

**Interpretation:**
- High success rates indicate reliable validation
- Drops may indicate schema issues or data quality problems
- Monitor trends to identify degradation patterns

#### Response Time (P95)
- **Target**: < 100ms
- **Warning**: 100ms - 500ms
- **Critical**: > 500ms

**Interpretation:**
- Fast response times ensure good user experience
- Increases may indicate caching issues or heavy load
- Monitor for spikes during peak usage

#### Cache Hit Rate
- **Target**: > 70%
- **Warning**: 50% - 70%
- **Critical**: < 50%

**Interpretation:**
- High hit rates indicate effective caching strategy
- Low rates may suggest cache configuration issues
- Monitor for changes in data access patterns

#### Error Distribution

**By Field:**
- Identifies problematic data fields
- Helps prioritize data quality improvements
- May indicate upstream data issues

**By Code:**
- `required`: Missing mandatory fields
- `format`: Data format violations
- `range`: Value out of acceptable range
- `custom`: Business rule violations

**By Type:**
- `validation`: Schema/rule violations
- `system`: Internal service errors
- `network`: External service connectivity issues

### Quality Metrics

#### Data Quality Score
- **Range**: 0.0 - 1.0
- **Components**:
  - Completeness: Field population rate
  - Accuracy: Format compliance
  - Consistency: Internal data consistency
  - Timeliness: Data freshness

**Interpretation:**
- > 0.95: Excellent data quality
- 0.90 - 0.95: Good quality, minor issues
- 0.85 - 0.90: Acceptable, needs attention
- < 0.85: Poor quality, requires immediate action

#### Integrity Violations
- **Target**: 0
- **Acceptable**: < 0.1% of records

**Types:**
- **Critical**: Data corruption, constraint violations
- **Warning**: Business rule violations
- **Info**: Minor inconsistencies

## Monitoring Dashboard

### Accessing Metrics

#### Web Dashboard
Navigate to `/admin/monitoring` for the real-time dashboard.

#### API Access
```bash
# Get current health
curl -H "Authorization: Bearer <token>" \
  https://api.chanuka.go.ke/v1/api/system/health/schema

# Get detailed metrics
curl -H "Authorization: Bearer <token>" \
  "https://api.chanuka.go.ke/v1/api/system/metrics/validation?period=24h"

# Prometheus format
curl -H "Authorization: Bearer <token>" \
  "https://api.chanuka.go.ke/v1/api/system/metrics/validation?format=prometheus"
```

#### Programmatic Access
```typescript
import { inputValidationService } from '@server/core/validation';

// Get service metrics
const metrics = inputValidationService.getMetrics();
console.log('Cache hit rate:', metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses));

// Get detailed cache stats
const cacheStats = inputValidationService.getCacheStats();
console.log('Cache utilization:', cacheStats.utilization);
```

### Alert Configuration

#### Built-in Alerts

**Service Health Alerts:**
- Service becomes unhealthy
- Response time exceeds threshold
- Error rate spikes
- Cache hit rate drops

**Data Quality Alerts:**
- Quality score falls below threshold
- Integrity violations detected
- Schema validation failures
- Cross-validation conflicts

#### Custom Alerts

```typescript
import { getHealthMonitor } from '@shared/database';

const healthMonitor = getHealthMonitor();

// Add custom alert
healthMonitor.addAlertRule({
  name: 'validation_error_rate',
  condition: (metrics, result) => {
    const errorRate = metrics.failedValidations / metrics.totalValidations;
    return errorRate > 0.05; // 5% error rate
  },
  severity: 'high',
  message: 'Validation error rate exceeded 5%',
  cooldownMs: 5 * 60 * 1000 // 5 minutes
});
```

### Log Analysis

#### Structured Logging

All validation events are logged with structured data:

```json
{
  "timestamp": "2025-11-15T01:36:26.236Z",
  "level": "info",
  "service": "InputValidationService",
  "operation": "validateApiInput",
  "schema": "userRegistration",
  "duration": 23,
  "cacheHit": true,
  "result": "success",
  "userId": "user-123"
}
```

#### Error Logging

Validation errors include detailed context:

```json
{
  "timestamp": "2025-11-15T01:36:26.236Z",
  "level": "error",
  "service": "InputValidationService",
  "operation": "validateApiInput",
  "schema": "userRegistration",
  "error": {
    "code": "VALIDATION_ERROR",
    "field": "email",
    "message": "Invalid email format",
    "value": "invalid-email",
    "context": {
      "userId": "user-123",
      "ip": "192.168.1.100"
    }
  }
}
```

## Troubleshooting Guide

### High Error Rates

**Symptoms:**
- Success rate drops below 99%
- Increased error logs
- User complaints about validation failures

**Diagnosis:**
1. Check error breakdown by field/code
2. Review recent schema changes
3. Analyze input data patterns
4. Check for upstream data quality issues

**Solutions:**
- Update validation schemas
- Implement data preprocessing
- Add custom validation rules
- Improve error messages

### Slow Response Times

**Symptoms:**
- P95 response time > 100ms
- User experience degradation
- Timeout errors

**Diagnosis:**
1. Check cache hit rates
2. Monitor database query performance
3. Analyze concurrent load
4. Review network latency

**Solutions:**
- Optimize cache configuration
- Implement query optimization
- Add request throttling
- Scale infrastructure

### Cache Issues

**Symptoms:**
- Low cache hit rate
- High memory usage
- Cache misses for repeated requests

**Diagnosis:**
1. Check cache size vs. utilization
2. Analyze cache key generation
3. Review TTL settings
4. Monitor eviction rates

**Solutions:**
- Adjust cache size limits
- Optimize cache key strategy
- Tune TTL values
- Implement cache warming

### Data Quality Issues

**Symptoms:**
- Low quality scores
- Frequent validation failures
- Data inconsistency reports

**Diagnosis:**
1. Review data sources
2. Check transformation pipelines
3. Analyze validation rules
4. Monitor upstream changes

**Solutions:**
- Update data transformation logic
- Enhance validation schemas
- Implement data cleansing
- Add data quality monitoring

## Performance Optimization

### Caching Strategies

#### Cache Configuration
```typescript
const validationConfig = {
  cache: {
    enabled: true,
    defaultTtl: 300, // 5 minutes
    maxSize: 10000, // 10k entries
    evictionPolicy: 'lru'
  }
};
```

#### Cache Key Optimization
- Use deterministic keys
- Include relevant context
- Avoid overly specific keys
- Implement key versioning

### Database Optimization

#### Query Optimization
- Use appropriate indexes
- Implement query result caching
- Batch similar operations
- Optimize connection pooling

#### Connection Management
```typescript
const dbConfig = {
  pool: {
    min: 2,
    max: 20,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000
  }
};
```

### Monitoring Overhead

#### Metrics Collection
- Sample high-volume metrics
- Use efficient data structures
- Implement metric aggregation
- Set appropriate retention periods

#### Alert Management
- Avoid alert fatigue
- Use appropriate thresholds
- Implement alert correlation
- Set up escalation policies

## Integration with External Systems

### Prometheus Integration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'chanuka-validation'
    static_configs:
      - targets: ['api.chanuka.go.ke:443']
    metrics_path: '/v1/api/system/metrics/validation'
    params:
      format: ['prometheus']
```

### Grafana Dashboards

Pre-built dashboards available for:
- Validation Performance
- Data Quality Metrics
- Error Analysis
- System Health Overview

### ELK Stack Integration

Structured logs integrate with Elasticsearch for:
- Advanced querying
- Trend analysis
- Anomaly detection
- Historical reporting

## Best Practices

### Monitoring Strategy

1. **Define SLIs/SLOs**: Set clear service level indicators
2. **Implement Alerting**: Configure meaningful alerts
3. **Regular Review**: Weekly metrics review
4. **Capacity Planning**: Monitor resource utilization trends

### Incident Response

1. **Detection**: Automated alerts and monitoring
2. **Assessment**: Quick health check review
3. **Diagnosis**: Detailed metrics analysis
4. **Resolution**: Targeted fixes based on data
5. **Prevention**: Update monitoring and alerts

### Continuous Improvement

1. **Trend Analysis**: Identify performance patterns
2. **Optimization**: Regular performance tuning
3. **Automation**: Implement automated remediation
4. **Documentation**: Keep runbooks current

## Support and Resources

### Getting Help

- **Health Check**: `/api/system/health/schema`
- **Metrics API**: `/api/system/metrics/validation`
- **Logs**: Check application logs for detailed errors
- **Dashboard**: `/admin/monitoring` for visual monitoring

### Common Issues

**"Service Unhealthy"**
- Check individual service status
- Review error logs
- Verify dependencies

**"High Error Rate"**
- Analyze error breakdown
- Check input data quality
- Review validation rules

**"Slow Performance"**
- Check cache hit rates
- Monitor database performance
- Review system resources

### Emergency Contacts

- **Platform Team**: platform@chanuka.go.ke
- **DevOps Team**: devops@chanuka.go.ke
- **On-call Engineer**: +254-700-000-000