# Recovery Infrastructure Module

## Overview

The Recovery Infrastructure module provides error recovery and resilience utilities for the Chanuka platform. It handles automatic recovery strategies, state restoration, and graceful degradation when errors occur.

## Purpose and Responsibilities

- **State Checkpointing**: Save application state for recovery
- **Automatic Recovery**: Execute recovery strategies when errors occur
- **State Restoration**: Restore application to last known good state
- **Rollback Capabilities**: Revert changes when operations fail
- **Graceful Degradation**: Maintain partial functionality during failures

## Public Exports

### Functions

- `saveDashboardCheckpoint(state: DashboardState): Promise<void>` - Save dashboard state checkpoint
- `recoverDashboardState(): Promise<DashboardState | null>` - Recover dashboard from checkpoint
- `clearDashboardCheckpoints(): Promise<void>` - Clear all saved checkpoints
- `getDashboardCheckpoints(): Promise<DashboardCheckpoint[]>` - Get all available checkpoints

### Types

- `DashboardState` - Dashboard state structure
- `DashboardCheckpoint` - Checkpoint metadata and state
- `RecoveryOptions` - Recovery configuration options

## Usage Examples

### Save Recovery Checkpoint

```typescript
import { saveDashboardCheckpoint } from '@/infrastructure/recovery';

async function saveDashboard(state) {
  // Save current state as recovery checkpoint
  await saveDashboardCheckpoint({
    widgets: state.widgets,
    layout: state.layout,
    preferences: state.preferences,
    timestamp: Date.now()
  });
}
```

### Recover from Saved State

```typescript
import { recoverDashboardState } from '@/infrastructure/recovery';

async function recoverDashboard() {
  try {
    const recovered = await recoverDashboardState();
    
    if (recovered) {
      // Restore dashboard to recovered state
      restoreDashboard(recovered);
      console.log('Dashboard recovered successfully');
    } else {
      // No checkpoint available, use defaults
      loadDefaultDashboard();
    }
  } catch (error) {
    console.error('Recovery failed:', error);
    loadDefaultDashboard();
  }
}
```

### Automatic Recovery on Error

```typescript
import { recoverDashboardState, saveDashboardCheckpoint } from '@/infrastructure/recovery';

function DashboardWithRecovery() {
  useEffect(() => {
    // Save checkpoint periodically
    const interval = setInterval(() => {
      saveDashboardCheckpoint(currentState);
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [currentState]);

  const handleError = async (error) => {
    console.error('Dashboard error:', error);
    
    // Attempt recovery
    const recovered = await recoverDashboardState();
    if (recovered) {
      setState(recovered);
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### Manage Multiple Checkpoints

```typescript
import { getDashboardCheckpoints, recoverDashboardState } from '@/infrastructure/recovery';

async function showRecoveryOptions() {
  const checkpoints = await getDashboardCheckpoints();
  
  // Show user available recovery points
  const selected = await showCheckpointSelector(checkpoints);
  
  // Recover from selected checkpoint
  const state = await recoverDashboardState(selected.id);
  restoreDashboard(state);
}
```

## Best Practices

1. **Regular Checkpoints**: Save checkpoints at appropriate intervals
2. **Checkpoint Limits**: Limit number of stored checkpoints to manage storage
3. **Validation**: Validate recovered state before applying
4. **User Notification**: Inform users when recovery occurs
5. **Fallback Strategy**: Always have a default state as fallback
6. **Cleanup**: Periodically clean up old checkpoints

## Sub-Module Organization

```
recovery/
├── index.ts                    # Public API exports
├── dashboard-recovery.ts       # Dashboard recovery utilities
└── README.md                   # This file
```

## Integration Points

- **Storage Module**: Persists checkpoints to secure storage
- **Error Module**: Triggers recovery on critical errors
- **Events Module**: Emits recovery events for coordination
- **Observability Module**: Tracks recovery success/failure rates

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Error Module](../error/README.md) - Error handling and recovery strategies
- [Storage Module](../storage/README.md) - Checkpoint persistence
- [Events Module](../events/README.md) - Recovery event coordination
