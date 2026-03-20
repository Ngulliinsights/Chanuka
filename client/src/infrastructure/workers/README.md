# Workers Infrastructure Module

## Overview

The Workers Infrastructure module provides service worker and web worker management for the Chanuka platform. It handles background task execution, offline capabilities, and performance optimization through worker threads.

## Purpose and Responsibilities

- **Service Worker Management**: Register and manage service workers
- **Offline Support**: Enable offline functionality through service workers
- **Background Sync**: Execute background tasks via service workers
- **Cache Management**: Manage service worker caches
- **Push Notifications**: Handle push notification subscriptions
- **Network Status**: Monitor and report network connectivity

## Public Exports

### Functions

- `registerServiceWorker(config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration>` - Register service worker
- `sendMessageToServiceWorker(message: any): Promise<any>` - Send message to service worker
- `isServiceWorkerAvailable(): boolean` - Check if service workers are supported
- `getNetworkStatus(): NetworkStatus` - Get current network status
- `onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void` - Subscribe to network changes

### Types

- `ServiceWorkerConfig` - Service worker configuration
- `NetworkStatus` - Network connectivity status
- `ServiceWorkerMessage` - Message format for worker communication

## Usage Examples

### Register Service Worker

```typescript
import { registerServiceWorker } from '@/infrastructure/workers';

async function initializeApp() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await registerServiceWorker({
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('Service worker registered:', registration);
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
}
```

### Send Messages to Service Worker

```typescript
import { sendMessageToServiceWorker } from '@/infrastructure/workers';

async function clearCache() {
  try {
    const response = await sendMessageToServiceWorker({
      type: 'CLEAR_CACHE',
      cacheNames: ['api-cache', 'image-cache']
    });

    console.log('Cache cleared:', response);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
```

### Monitor Network Status

```typescript
import { getNetworkStatus, onNetworkStatusChange } from '@/infrastructure/workers';

function NetworkMonitor() {
  const [status, setStatus] = useState(getNetworkStatus());

  useEffect(() => {
    const unsubscribe = onNetworkStatusChange((newStatus) => {
      setStatus(newStatus);
      
      if (newStatus.online) {
        console.log('Back online, syncing data...');
        syncOfflineData();
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      Status: {status.online ? 'Online' : 'Offline'}
      {status.effectiveType && ` (${status.effectiveType})`}
    </div>
  );
}
```

### Background Sync

```typescript
import { sendMessageToServiceWorker } from '@/infrastructure/workers';

async function scheduleBackgroundSync(data) {
  try {
    await sendMessageToServiceWorker({
      type: 'BACKGROUND_SYNC',
      tag: 'sync-user-data',
      data: data
    });

    console.log('Background sync scheduled');
  } catch (error) {
    console.error('Failed to schedule sync:', error);
  }
}
```

### Check Service Worker Support

```typescript
import { isServiceWorkerAvailable } from '@/infrastructure/workers';

function App() {
  const hasServiceWorker = isServiceWorkerAvailable();

  return (
    <div>
      {!hasServiceWorker && (
        <Banner type="warning">
          Your browser doesn't support offline features.
        </Banner>
      )}
      <MainContent />
    </div>
  );
}
```

## Best Practices

1. **Progressive Enhancement**: Gracefully degrade when service workers unavailable
2. **Update Strategy**: Implement proper service worker update mechanisms
3. **Cache Strategy**: Use appropriate caching strategies for different resources
4. **Error Handling**: Handle service worker errors gracefully
5. **Testing**: Test offline functionality thoroughly
6. **Security**: Only use service workers over HTTPS

## Sub-Module Organization

```
workers/
├── index.ts                # Public API exports
├── service-worker.ts       # Service worker utilities
└── README.md               # This file
```

## Integration Points

- **Sync Module**: Background synchronization via service workers
- **Cache Module**: Service worker cache management
- **API Module**: Offline API request handling
- **Events Module**: Network status events

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Sync Module](../sync/README.md) - Background synchronization
- [Cache Module](../cache/README.md) - Cache management
- [API Module](../api/README.md) - Offline API handling
