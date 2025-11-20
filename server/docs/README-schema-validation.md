# Schema Validation Integration

## Overview

The Chanuka Legislative Transparency Platform now includes a comprehensive schema validation system that ensures data integrity, provides real-time monitoring, and maintains high-quality data standards across all platform operations.

## Real Integration Components

### Startup Validation System

The platform includes a robust startup validation system that verifies all critical components before allowing the application to serve requests.

**Key Features:**
- **Dependency Verification**: Checks all required packages and Node.js modules
- **Environment Validation**: Validates all required environment variables and secrets
- **Database Connectivity**: Tests database connections and schema availability
- **Schema Validation**: Validates schema definitions and data integrity rules
- **Health Endpoint Testing**: Verifies all health check endpoints are responding

**Startup Process:**
1. File and dependency checks
2. Environment variable validation
3. Database connection testing
4. Schema validation and health checks
5. API endpoint verification

### Health Endpoints

The validation system provides multiple health check endpoints for monitoring and diagnostics:

#### `/api/system/health/schema`
Returns the current status of schema validation services.

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-11-15T01:36:26.236Z",
  "services": {
    "InputValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 45
    },
    "GovernmentDataValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 32
    },
    "DataIntegrityValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 28
    }
  },
  "schema": {
    "version": "1.0.0",
    "lastValidated": "2025-11-15T01:36:26.236Z",
    "totalSchemas": 45,
    "validSchemas": 45
  }
}
```

#### `/api/system/metrics/validation`
Provides detailed validation metrics and performance statistics.

**Response Format:**
```json
{
  "totalValidations": 12547,
  "successfulValidations": 12489,
  "failedValidations": 58,
  "cacheHits": 8923,
  "cacheMisses": 3624,
  "avgValidationTime": 23.45,
  "services": {
    "InputValidationService": {
      "validations": 4521,
      "successRate": 0.987,
      "avgResponseTime": 18.32
    },
    "GovernmentDataValidationService": {
      "validations": 3214,
      "successRate": 0.992,
      "avgResponseTime": 45.67
    },
    "DataIntegrityValidationService": {
      "validations": 4812,
      "successRate": 0.978,
      "avgResponseTime": 12.89
    }
  },
  "errors": {
    "byField": {
      "email": 12,
      "phoneNumber": 8,
      "dateOfBirth": 15
    },
    "byCode": {
      "required": 23,
      "format": 18,
      "range": 17
    }
  }
}
```

#### `/api/system/health/validation`
Returns the overall validation service health status.

**Response Format:**
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
      "description": "Unified input validation service"
    },
    {
      "name": "GovernmentDataValidationService",
      "status": "healthy",
      "description": "Government data validation and integrity"
    },
    {
      "name": "DataIntegrityValidationService",
      "status": "healthy",
      "description": "Database integrity and constraint validation"
    }
  ],
  "lastMaintenance": "2025-11-13T08:00:00.000Z"
}
```

### Monitoring and Alerting

The validation system includes comprehensive monitoring capabilities:

**Real-time Metrics:**
- Validation success/failure rates
- Response time tracking
- Cache performance statistics
- Error pattern analysis
- Schema usage analytics

**Alerting:**
- Service degradation notifications
- High error rate alerts
- Cache performance warnings
- Schema validation failures

**Logging:**
- Structured validation logs
- Error context and stack traces
- Performance metrics logging
- Audit trail for validation decisions

## Integration Examples

### Basic Input Validation

```typescript
import { inputValidationService } from '@server/core/validation';

// Validate user input
const result = await inputValidationService.validateApiInput(
  userSchema,
  {
    email: 'user@example.com',
    name: 'John Doe',
    age: 30
  }
);

if (result.isValid) {
  // Process valid data
  await createUser(result.data);
} else {
  // Handle validation errors
  return {
    success: false,
    errors: result.errors
  };
}
```

### Government Data Validation

```typescript
import { GovernmentDataValidationService } from '@server/core/validation';

// Validate government bill data
const validation = GovernmentDataValidationService.validateBill(billData);

if (validation.isValid) {
  // Store validated bill
  await billRepository.save(validation.data);
} else {
  // Log validation issues
  logger.warn('Bill validation failed', {
    billId: billData.id,
    errors: validation.errors
  });
}
```

### Batch Validation with Metrics

```typescript
import { validationService } from '@shared/core/validation';

// Batch validate multiple records
const results = await validationService.validateBatch(
  userSchema,
  userRecords,
  {
    useCache: true,
    abortEarly: false
  }
);

// Log metrics
logger.info('Batch validation completed', {
  total: results.totalCount,
  valid: results.validCount,
  invalid: results.invalidCount,
  duration: performance.now() - startTime
});
```

## Configuration

### Environment Variables

```bash
# Validation Service Configuration
VALIDATION_CACHE_TTL=300
VALIDATION_MAX_CACHE_SIZE=1000
VALIDATION_METRICS_ENABLED=true
VALIDATION_ERROR_TRACKING_ENABLED=true

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
```

### Service Configuration

```typescript
// Configure validation service
const validationConfig = {
  defaultOptions: {
    preprocess: true,
    useCache: true,
    cacheTtl: 300,
    stripUnknown: false,
    abortEarly: false
  },
  preprocessing: {
    trimStrings: true,
    coerceNumbers: true,
    coerceBooleans: true,
    emptyStringToNull: false
  },
  cache: {
    enabled: true,
    defaultTtl: 300,
    maxSize: 1000
  },
  metrics: {
    enabled: true,
    trackSchemaUsage: true,
    trackErrorPatterns: true
  }
};

const validationService = createValidationService(validationConfig);
```

## Performance Characteristics

- **Average Validation Time**: < 25ms for cached validations
- **Cache Hit Rate**: > 70% for repeated validations
- **Memory Usage**: < 50MB for cache with 1000 entries
- **Concurrent Requests**: Supports 1000+ concurrent validations
- **Error Recovery**: < 100ms failover to backup validation

## Troubleshooting

### Common Issues

1. **Schema Validation Errors**
   - Check schema definitions for typos
   - Verify data types match schema expectations
   - Review preprocessing configuration

2. **Cache Performance Issues**
   - Monitor cache hit rates
   - Adjust cache TTL settings
   - Check memory usage limits

3. **Health Check Failures**
   - Verify service dependencies are running
   - Check network connectivity
   - Review error logs for specific failures

### Debug Mode

Enable debug logging for detailed validation traces:

```bash
DEBUG=validation:* npm run dev
```

This will provide detailed logs including:
- Schema parsing and compilation
- Cache operations
- Preprocessing steps
- Validation rule execution
- Error context and stack traces

## Future Enhancements

- **Machine Learning Validation**: AI-powered data quality assessment
- **Real-time Schema Updates**: Dynamic schema modification without restarts
- **Advanced Analytics**: Predictive validation failure analysis
- **Multi-region Validation**: Distributed validation across regions
- **Custom Validation Rules**: User-defined validation extensions
