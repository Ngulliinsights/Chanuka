# System Infrastructure Module

## Overview

The System Infrastructure module provides system-level infrastructure components and utilities for monitoring application health, system status, and operational metrics.

## Purpose and Responsibilities

- **Health Monitoring**: Real-time application health checks
- **Service Status**: Monitor availability of critical services
- **System Diagnostics**: Collect and report system metrics
- **Performance Monitoring**: Track system-level performance indicators
- **Alerting**: Notify when system health degrades

## Public Exports

### Components

- `HealthCheck` - React component for health monitoring and display

### Types

- `HealthStatus` - System health status information
- `ServiceHealth` - Individual service health metrics
- `SystemMetrics` - System-level performance metrics

## Usage Examples

### Basic Health Check

```typescript
import { HealthCheck } from '@/infrastructure/system';

function App() {
  return (
    <HealthCheck
      interval={30000} // Check every 30 seconds
      onStatusChange={(status) => {
        if (!status.healthy) {
          console.error('System unhealthy:', status.issues);
        }
      }}
    />
  );
}
```

### Custom Health Monitoring

```typescript
import { HealthCheck } from '@/infrastructure/system';

function SystemMonitor() {
  const [healthStatus, setHealthStatus] = useState(null);

  return (
    <HealthCheck
      services={['api', 'database', 'cache']}
      interval={15000}
      onStatusChange={setHealthStatus}
      showUI={true}
    >
      {healthStatus && (
        <div>
          <h3>System Status: {healthStatus.overall}</h3>
          <ul>
            {healthStatus.services.map(service => (
              <li key={service.name}>
                {service.name}: {service.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </HealthCheck>
  );
}
```

### Programmatic Health Checks

```typescript
import { checkSystemHealth, getServiceStatus } from '@/infrastructure/system';

async function monitorSystem() {
  // Check overall system health
  const health = await checkSystemHealth();
  
  if (!health.healthy) {
    // Get detailed service status
    const services = await getServiceStatus();
    const unhealthy = services.filter(s => !s.healthy);
    
    console.error('Unhealthy services:', unhealthy);
  }
}
```

## Best Practices

1. **Regular Checks**: Run health checks at appropriate intervals (15-60 seconds)
2. **Service Dependencies**: Monitor all critical service dependencies
3. **Graceful Degradation**: Handle partial system failures gracefully
4. **User Communication**: Inform users of system status issues
5. **Automatic Recovery**: Implement automatic recovery for transient failures
6. **Metrics Collection**: Track health metrics over time for trend analysis

## Sub-Module Organization

```
system/
├── index.ts                # Public API exports
├── HealthCheck.tsx         # Health check component
└── README.md               # This file
```

## Integration Points

- **API Module**: Checks API service health and connectivity
- **Observability Module**: Reports health metrics and issues
- **Events Module**: Emits health status change events
- **Error Module**: Integrates with error tracking for health issues

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Observability Module](../observability/README.md) - Health metrics tracking
- [API Module](../api/README.md) - API health monitoring
- [Error Module](../error/README.md) - Error tracking integration
