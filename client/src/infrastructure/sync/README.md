# Sync Infrastructure Module

## Overview

The Sync Infrastructure module provides background synchronization and offline capabilities for the Chanuka platform. It manages data sync between client and server, handles offline queuing, and ensures data consistency across network conditions.

## Purpose and Responsibilities

- **Background Sync**: Automatic synchronization of data when online
- **Offline Queue**: Queue operations when offline for later sync
- **Conflict Resolution**: Handle sync conflicts with configurable strategies
- **Retry Logic**: Automatic retry with exponential backoff for failed syncs
- **Sync Status**: Real-time sync status and progress tracking
- **Data Consistency**: Ensure data integrity across sync operations

## Public Exports

### Classes and Instances

- `backgroundSyncManager` - Global background sync manager instance

### Types

- `SyncTask` - Sync task configuration
- `SyncStatus` - Sync operation status
- `SyncOptions` - Sync configuration options

## Usage Examples

### Register Background Sync Task

```typescript
import { backgroundSyncManager } from '@/infrastructure/sync';

// Register a sync task
await backgroundSyncManager.register('sync-user-data', {
  url: '/api/sync/user',
  method: 'POST',
  data: userData,
  priority: 'high'
});
```

### Check Sync Status

```typescript
import { backgroundSyncManager } from '@/infrastructure/sync';

// Get overall sync status
const status = backgroundSyncManager.getStatus();
console.log(`Pending tasks: ${status.pendingCount}`);
console.log(`Failed tasks: ${status.failedCount}`);

// Get specific task status
const taskStatus = backgroundSyncManager.getTaskStatus('sync-user-data');
```

### Handle Offline Operations

```typescript
import { backgroundSyncManager } from '@/infrastructure/sync';

async function saveData(data) {
  try {
    // Try to save immediately
    await api.saveData(data);
  } catch (error) {
    // Queue for background sync if offline
    await backgroundSyncManager.register('save-data', {
      url: '/api/data',
      method: 'POST',
      data,
      retryOnFailure: true
    });
  }
}
```

### Listen to Sync Events

```typescript
import { backgroundSyncManager } from '@/infrastructure/sync';

// Listen for sync completion
backgroundSyncManager.on('sync:complete', (task) => {
  console.log(`Sync completed: ${task.id}`);
});

// Listen for sync failures
backgroundSyncManager.on('sync:failed', (task, error) => {
  console.error(`Sync failed: ${task.id}`, error);
});
```

## Best Practices

1. **Priority Management**: Set appropriate priorities for sync tasks
2. **Idempotent Operations**: Ensure sync operations can be safely retried
3. **Conflict Resolution**: Implement clear conflict resolution strategies
4. **Progress Feedback**: Provide user feedback during long sync operations
5. **Error Handling**: Handle sync failures gracefully with user notifications
6. **Batch Operations**: Group related sync tasks for efficiency

## Sub-Module Organization

```
sync/
├── index.ts                        # Public API exports
├── background-sync-manager.ts      # Background sync manager
├── offline-data-manager.ts         # Offline data management
└── README.md                       # This file
```

## Integration Points

- **API Module**: Executes sync requests through HTTP client
- **Storage Module**: Persists offline queue and sync state
- **Events Module**: Emits sync events for application-wide coordination
- **Observability Module**: Tracks sync performance and failures

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [API Module](../api/README.md) - HTTP client for sync operations
- [Storage Module](../storage/README.md) - Offline data persistence
- [Events Module](../events/README.md) - Sync event coordination
