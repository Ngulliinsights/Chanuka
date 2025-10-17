# Unified Observability Platform

This directory contains the unified observability platform that consolidates logging, health monitoring, metrics collection, and distributed tracing into a cohesive system.

## Architecture

The observability platform is structured into four main components:

### 1. Logging (`logging/`)
- **Unified Logger**: Consolidates multiple fragmented logger implementations
- **Structured Logging**: Context preservation and correlation ID propagation
- **Performance Monitoring**: Built-in timers and performance tracking
- **In-Memory Storage**: Queryable log storage with aggregation
- **Multiple Transports**: Console, file, and async transport support

### 2. Health Monitoring (`health/`)
- **Health Check Orchestrator**: Coordinates health checks with timeout protection
- **Built-in Checks**: Memory, disk, process, and external service checks
- **Dependency Management**: Health check dependencies and cascading failures
- **Metrics Integration**: Health check performance tracking
- **Caching**: Result caching to reduce check frequency

### 3. Metrics Collection (`metrics/`)
- **Multiple Metric Types**: Counter, Gauge, Histogram, Summary
- **Prometheus Export**: Native Prometheus format support
- **OpenTelemetry Integration**: OTLP protocol support
- **Registry System**: Centralized metric management
- **Label Support**: Multi-dimensional metrics

### 4. Distributed Tracing (`tracing/`)
- **W3C Trace Context**: Standard trace propagation
- **Multiple Formats**: W3C, Jaeger, B3 header support
- **Sampling**: Configurable sampling strategies
- **Async Context**: Automatic context propagation across async boundaries
- **Span Linking**: Parent-child span relationships

## Key Features

### Shared Correlation IDs
All telemetry types share correlation IDs for unified observability:
- Logs include trace and request IDs
- Health checks include correlation IDs
- Metrics can be labeled with trace context
- Traces propagate correlation across services

### Feature Flag Migration
Use the `useUnifiedObservability` feature flag for gradual migration:
```typescript
import { useUnifiedObservability } from '@Chanuka/core/observability';

if (useUnifiedObservability) {
  // Use new unified platform
} else {
  // Use legacy fragmented systems
}
```

### Backward Compatibility
The platform maintains backward compatibility through:
- Legacy logger adapters
- Drop-in replacements for existing interfaces
- Barrel exports preserving existing import paths

## Usage Examples

### Logging
```typescript
import { logger } from '@Chanuka/core/observability';

// Structured logging with context
logger.info('User login successful', {
  component: 'auth',
  userId: '12345',
  loginMethod: 'email'
});

// Performance monitoring
const duration = logger.measure('database-query', () => {
  return db.query('SELECT * FROM users');
});

// Request logging
logger.logRequest({
  method: 'GET',
  url: '/api/users',
  statusCode: 200,
  duration: 150
});
```

### Health Monitoring
```typescript
import { HealthCheckOrchestrator, createMemoryHealthCheck } from '@Chanuka/core/observability';

const orchestrator = new HealthCheckOrchestrator();
orchestrator.register(createMemoryHealthCheck());
orchestrator.register({
  name: 'database',
  check: async () => {
    try {
      await db.ping();
      return { status: 'healthy', message: 'Database connected' };
    } catch (error) {
      return { status: 'unhealthy', error };
    }
  }
});

const report = await orchestrator.runAllChecks();
```

### Metrics Collection
```typescript
import { createCounter, createHistogram, createPrometheusExporter } from '@Chanuka/core/observability';

const requestCounter = createCounter('http_requests_total', 'Total HTTP requests');
const responseTime = createHistogram('http_request_duration', 'Request duration');

requestCounter.increment(1, { method: 'GET', status: '200' });
responseTime.observe(0.150, { method: 'GET' });

// Export to Prometheus
const exporter = createPrometheusExporter({
  gatewayUrl: 'http://prometheus:9091'
});
await exporter.export(registry.collect());
```

### Distributed Tracing
```typescript
import { createTracer } from '@Chanuka/core/observability';

const tracer = createTracer('my-service', '1.0.0');

// Create spans
const span = tracer.startSpan('http-request', {
  kind: 'server',
  attributes: { 'http.method': 'GET' }
});

// Context propagation
const carrier = {};
tracer.inject(span.context(), carrier, 'w3c');
// carrier now contains trace headers

span.end();
```

## Configuration

### Environment Variables
- `USE_UNIFIED_OBSERVABILITY`: Enable unified platform (default: false)
- `LOG_LEVEL`: Logging level (default: 'info')
- `METRICS_ENABLED`: Enable metrics collection (default: true)
- `TRACING_ENABLED`: Enable distributed tracing (default: true)

### Programmatic Configuration
```typescript
import { logger, healthOrchestrator, createTracer } from '@Chanuka/core/observability';

// Configure logging
const customLogger = new UnifiedLogger({
  level: 'debug',
  enableMetrics: true,
  enableInMemoryStorage: true
});

// Configure health monitoring
const health = new HealthCheckOrchestrator({
  enableCaching: true,
  cacheTtl: 30000
});

// Configure tracing
const tracer = createTracer('my-service', '1.0.0', {
  sampling: { rate: 0.1 }
});
```

## Testing

Comprehensive test suites are provided for all components:

```bash
# Run all observability tests
npm test -- src/observability

# Run specific component tests
npm test -- src/observability/logging
npm test -- src/observability/health
npm test -- src/observability/metrics
npm test -- src/observability/tracing
```

## Migration Guide

### From Fragmented Loggers
```typescript
// Before
import { logger } from '../utils/logger';
import { monitoringLogger } from '../infrastructure/monitoring';

// After
import { logger } from '@Chanuka/core/observability';
// Same interface, enhanced capabilities
```

### From Legacy Health Checks
```typescript
// Before
const health = require('../health-checker');

// After
import { HealthCheckOrchestrator, createMemoryHealthCheck } from '@Chanuka/core/observability';
```

### From Custom Metrics
```typescript
// Before
const metrics = require('../custom-metrics');

// After
import { createCounter, createGauge, createHistogram } from '@Chanuka/core/observability';
```

## Performance Considerations

- **Memory Usage**: Circular buffers prevent unbounded growth
- **CPU Overhead**: Efficient sampling and batching
- **Network**: Configurable timeouts and retries
- **Storage**: Optional in-memory storage with size limits

## Security

- **Sensitive Data Redaction**: Automatic PII detection and masking
- **Rate Limiting**: Built-in protection against telemetry floods
- **Access Control**: Configurable export permissions
- **Audit Logging**: All observability events are logged

## Monitoring the Platform

The observability platform monitors itself:

```typescript
// Platform health metrics
const platformHealth = await orchestrator.runCheck('observability-platform');

// Platform performance metrics
logger.getMetrics(); // Logger performance
orchestrator.getMetrics(); // Health check performance
registry.collect(); // Metrics collection status