# Core Hooks Module

## Overview

The Core Hooks module provides infrastructure and system-level React hooks used across the Chanuka platform. These hooks manage core concerns including offline detection, API connections, system status, error recovery, and offline capabilities.

## Purpose and Responsibilities

- **Offline Detection**: Monitor and react to network connectivity changes
- **Connection Management**: Handle connection-aware operations with retry logic
- **Service Monitoring**: Track service health and availability
- **Error Recovery**: Implement automatic error recovery strategies
- **Offline Capabilities**: Enable offline-first functionality with sync

## Public Exports

### Hooks

- `useOfflineDetection()` - Detect offline/online status
- `useConnectionAware()` - Connection-aware API operations
- `useServiceStatus()` - Monitor service health
- `useOnlineStatus()` - Real-time online status
- `useErrorRecovery()` - Error recovery with retry strategies
- `useOfflineCapabilities()` - Offline data management and sync
- `useErrorHandling()` - Alias for useErrorRecovery

## Usage Examples

### Offline Detection

```typescript
import { useOfflineDetection } from '@/infrastructure/hooks';

function App() {
  const isOffline = useOfflineDetection();

  return (
    <div>
      {isOffline && (
        <Banner type="warning">
          You are currently offline. Some features may be limited.
        </Banner>
      )}
      <MainContent />
    </div>
  );
}
```

### Connection-Aware Operations

```typescript
import { useConnectionAware } from '@/infrastructure/hooks';

function DataFetcher() {
  const { isConnected, executeWhenOnline } = useConnectionAware();

  const fetchData = async () => {
    // Automatically queues if offline, executes when online
    const result = await executeWhenOnline(async () => {
      return await api.getData();
    });

    return result;
  };

  return (
    <div>
      <button onClick={fetchData} disabled={!isConnected}>
        Fetch Data
      </button>
      {!isConnected && <p>Waiting for connection...</p>}
    </div>
  );
}
```

### Service Health Monitoring

```typescript
import { useServiceStatus } from '@/infrastructure/hooks';

function ServiceMonitor() {
  const { isHealthy, services, refresh } = useServiceStatus();

  return (
    <div>
      <h3>System Status: {isHealthy ? '✅ Healthy' : '❌ Degraded'}</h3>
      <ul>
        {services.map(service => (
          <li key={service.name}>
            {service.name}: {service.status}
            {service.latency && ` (${service.latency}ms)`}
          </li>
        ))}
      </ul>
      <button onClick={refresh}>Refresh Status</button>
    </div>
  );
}
```

### Error Recovery

```typescript
import { useErrorRecovery } from '@/infrastructure/hooks';

function DataComponent() {
  const { recover, isRecovering, lastError } = useErrorRecovery();

  const handleOperation = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      // Attempt automatic recovery
      const result = await recover(error, {
        strategy: 'retry',
        maxAttempts: 3,
        backoff: 'exponential'
      });

      if (result.success) {
        console.log('Recovered successfully');
      } else {
        console.error('Recovery failed:', result.error);
      }
    }
  };

  return (
    <div>
      <button onClick={handleOperation} disabled={isRecovering}>
        {isRecovering ? 'Recovering...' : 'Execute Operation'}
      </button>
      {lastError && <ErrorDisplay error={lastError} />}
    </div>
  );
}
```

### Offline Capabilities

```typescript
import { useOfflineCapabilities } from '@/infrastructure/hooks';

function OfflineForm() {
  const { saveOffline, syncWhenOnline, pendingCount } = useOfflineCapabilities();

  const handleSubmit = async (data) => {
    // Save data offline
    await saveOffline('form-data', data);

    // Sync when connection is restored
    await syncWhenOnline();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="field1" />
      <input name="field2" />
      <button type="submit">Save</button>
      {pendingCount > 0 && (
        <p>{pendingCount} items pending sync</p>
      )}
    </form>
  );
}
```

### Online Status Badge

```typescript
import { useOnlineStatus } from '@/infrastructure/hooks';

function NetworkStatusBadge() {
  const isOnline = useOnlineStatus();

  return (
    <Badge color={isOnline ? 'green' : 'red'}>
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
}
```

## Best Practices

1. **Cleanup**: Hooks automatically clean up subscriptions on unmount
2. **Debouncing**: Network status changes are debounced to avoid flapping
3. **Error Boundaries**: Wrap components using error recovery in error boundaries
4. **Offline First**: Design features to work offline when possible
5. **User Feedback**: Always provide feedback for offline/recovery states
6. **Testing**: Mock hook return values in tests for predictable behavior

## Sub-Module Organization

```
hooks/
├── index.ts                # Public API exports
└── README.md               # This file
```

Note: Individual hook implementations are located in:
- `@client/lib/hooks/` - Core utility hooks
- `../api/hooks/` - API-specific hooks
- `../loading/hooks/` - Loading state hooks

## Integration Points

- **API Module**: Connection-aware API operations
- **Storage Module**: Offline data persistence
- **Events Module**: Network status events
- **Observability Module**: Hook usage tracking
- **Error Module**: Error recovery integration

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [API Module](../api/README.md) - API integration
- [Storage Module](../storage/README.md) - Offline storage
- [Error Module](../error/README.md) - Error recovery
- [Events Module](../events/README.md) - Event coordination
