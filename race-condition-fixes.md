# Race Condition Fixes

Based on the analysis, here are the specific fixes for the identified race conditions:

## 1. WebSocket Connection State Race (HIGH PRIORITY)

**Issue:** Connection state updates can race with each other in rapid connect/disconnect cycles.

**Fix:** Add debouncing to connection state updates:

```typescript
// In webSocketMiddleware.ts
class WebSocketMiddlewareAdapter {
  private connectionStateUpdateTimeout: NodeJS.Timeout | null = null;
  private pendingConnectionState: Partial<CivicWebSocketState> | null = null;

  private updateConnectionState() {
    if (!this.reduxDispatch) return;

    // Clear existing timeout
    if (this.connectionStateUpdateTimeout) {
      clearTimeout(this.connectionStateUpdateTimeout);
    }

    // Debounce connection state updates
    this.connectionStateUpdateTimeout = setTimeout(() => {
      const wsStatus = this.wsManager.getConnectionStatus();
      const metrics = this.wsManager.getConnectionMetrics();

      const civicState: Partial<CivicWebSocketState> = {
        isConnected: wsStatus.connected,
        isConnecting: wsStatus.state === ConnectionState.CONNECTING,
        error: wsStatus.state === ConnectionState.FAILED ? 'Connection failed' : null,
        reconnectAttempts: wsStatus.reconnectAttempts,
        connection_quality: this.mapConnectionQuality(metrics.status),
        last_heartbeat: metrics.lastPong?.toISOString() || null,
        message_count: 0
      };

      // Merge with any pending state
      const finalState = this.pendingConnectionState 
        ? { ...this.pendingConnectionState, ...civicState }
        : civicState;

      this.reduxDispatch(updateConnectionState(finalState));
      this.pendingConnectionState = null;
      this.connectionStateUpdateTimeout = null;
    }, 100); // 100ms debounce
  }

  // Alternative: Use a state machine approach
  private connectionStateMachine = {
    state: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'reconnecting',
    
    transition(newState: string) {
      const validTransitions = {
        disconnected: ['connecting'],
        connecting: ['connected', 'disconnected'],
        connected: ['disconnected', 'reconnecting'],
        reconnecting: ['connected', 'disconnected']
      };

      if (validTransitions[this.state]?.includes(newState)) {
        this.state = newState as any;
        return true;
      }
      return false;
    }
  };
}
```

## 2. WebSocket Subscription Race (MEDIUM PRIORITY)

**Issue:** Subscribe/unsubscribe operations can interfere with each other.

**Fix:** Queue subscription operations:

```typescript
// In webSocketMiddleware.ts
class WebSocketMiddlewareAdapter {
  private subscriptionQueue: Array<() => Promise<void>> = [];
  private processingSubscriptions = false;

  private async queueSubscriptionOperation(operation: () => Promise<void>) {
    this.subscriptionQueue.push(operation);
    
    if (!this.processingSubscriptions) {
      await this.processSubscriptionQueue();
    }
  }

  private async processSubscriptionQueue() {
    this.processingSubscriptions = true;
    
    while (this.subscriptionQueue.length > 0) {
      const operation = this.subscriptionQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          logger.error('Subscription operation failed', {
            component: 'WebSocketMiddleware',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    this.processingSubscriptions = false;
  }

  subscribe(subscription: WebSocketSubscription) {
    this.queueSubscriptionOperation(async () => {
      const key = `${subscription.type}:${subscription.id}`;

      // Check if already subscribed
      if (this.subscriptionIds.has(key)) {
        logger.debug('Already subscribed to', { key });
        return;
      }

      // Perform subscription based on type
      switch (subscription.type) {
        case 'bill': {
          const billId = Number(subscription.id);
          const subscriptionId = this.wsManager.subscribeToBill(billId);
          this.subscriptionIds.set(key, subscriptionId);
          break;
        }
        // ... other cases
      }

      // Update polling fallback
      this.updatePollingFallbackSubscriptions();
    });
  }

  unsubscribe(subscription: WebSocketSubscription) {
    this.queueSubscriptionOperation(async () => {
      const key = `${subscription.type}:${subscription.id}`;
      const subscriptionId = this.subscriptionIds.get(key);

      if (subscriptionId) {
        if (subscription.type === 'bill') {
          this.wsManager.unsubscribeFromBill(Number(subscription.id));
        } else {
          this.wsManager.unsubscribe(subscriptionId);
        }
        this.subscriptionIds.delete(key);
        
        // Update polling fallback
        this.updatePollingFallbackSubscriptions();
      }
    });
  }
}
```

## 3. Loading Slice Statistics Race (MEDIUM PRIORITY)

**Issue:** Statistics calculations can be corrupted by concurrent updates.

**Fix:** Use atomic operations for statistics:

```typescript
// In loadingSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Add a statistics update queue
interface StatsUpdate {
  type: 'increment_completed' | 'increment_failed' | 'update_average_time';
  payload?: any;
}

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    // ... existing reducers

    // New atomic stats update reducer
    updateStatsAtomic: (state, action: PayloadAction<StatsUpdate>) => {
      const { type, payload } = action.payload;
      
      switch (type) {
        case 'increment_completed':
          state.stats.completedOperations++;
          state.stats.totalOperations = Math.max(
            state.stats.totalOperations,
            state.stats.completedOperations + state.stats.failedOperations
          );
          break;
          
        case 'increment_failed':
          state.stats.failedOperations++;
          state.stats.totalOperations = Math.max(
            state.stats.totalOperations,
            state.stats.completedOperations + state.stats.failedOperations
          );
          break;
          
        case 'update_average_time':
          if (payload && typeof payload.loadTime === 'number') {
            const totalCompleted = state.stats.completedOperations;
            if (totalCompleted > 0) {
              state.stats.averageLoadTime = 
                (state.stats.averageLoadTime * (totalCompleted - 1) + payload.loadTime) / totalCompleted;
            }
          }
          break;
      }
      
      state.stats.lastUpdate = Date.now();
    },

    // Batch stats updates to reduce race conditions
    batchStatsUpdate: (state, action: PayloadAction<StatsUpdate[]>) => {
      action.payload.forEach(update => {
        // Apply each update atomically
        loadingSlice.caseReducers.updateStatsAtomic(state, { 
          type: 'loading/updateStatsAtomic', 
          payload: update 
        } as any);
      });
    }
  },
  
  extraReducers: (builder) => {
    // Update the complete operation handler
    builder.addCase(completeLoadingOperation.fulfilled, (state, action) => {
      const { id, success, error } = action.payload;
      const operation = state.operations[id];

      if (operation) {
        const loadTime = Date.now() - operation.startTime;
        
        if (success) {
          // Use atomic stats update
          loadingSlice.caseReducers.batchStatsUpdate(state, {
            type: 'loading/batchStatsUpdate',
            payload: [
              { type: 'increment_completed' },
              { type: 'update_average_time', payload: { loadTime } }
            ]
          } as any);
        } else {
          operation.error = new Error(error);
          loadingSlice.caseReducers.updateStatsAtomic(state, {
            type: 'loading/updateStatsAtomic',
            payload: { type: 'increment_failed' }
          } as any);
        }

        // Remove completed operation
        delete state.operations[id];
        state.stats.activeOperations = Object.keys(state.operations).length;

        // Update global loading states
        state.globalLoading = state.stats.activeOperations > 0;
        state.highPriorityLoading = Object.values(state.operations).some(op => op.priority === 'high');
      }
    });
  }
});

// Export the new actions
export const { updateStatsAtomic, batchStatsUpdate } = loadingSlice.actions;
```

## 4. Additional Preventive Measures

### A. Add Operation Existence Checks

```typescript
// In loadingSlice.ts - startLoadingOperation handler
builder.addCase(startLoadingOperation.fulfilled, (state, action) => {
  const operationId = action.payload.id;
  
  // Check if operation already exists
  if (state.operations[operationId]) {
    logger.warn('Operation already exists, skipping creation', {
      component: 'LoadingSlice',
      operationId
    });
    return; // Don't create duplicate operation
  }

  const operation: LoadingOperation = {
    ...action.payload,
    startTime: Date.now(),
    retryCount: 0,
    timeoutWarningShown: false,
    cancelled: false,
  };

  state.operations[operationId] = operation;
  
  // Use atomic stats update
  loadingSlice.caseReducers.updateStatsAtomic(state, {
    type: 'loading/updateStatsAtomic',
    payload: { type: 'increment_total' }
  } as any);

  state.stats.activeOperations = Object.keys(state.operations).length;
  state.globalLoading = state.stats.activeOperations > 0;
  state.highPriorityLoading = Object.values(state.operations).some(op => op.priority === 'high');
});
```

### B. Add Request Deduplication

```typescript
// Create a request deduplication utility
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up when request completes
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear() {
    this.pendingRequests.clear();
  }
}

// Use in auth middleware for token refresh
const tokenRefreshDeduplicator = new RequestDeduplicator();

async function performTokenRefresh(store: { dispatch: Dispatch }): Promise<void> {
  return tokenRefreshDeduplicator.deduplicate('token-refresh', async () => {
    // Existing token refresh logic here
    const authTokens = await authService.instance.refreshTokens();
    // ... rest of the implementation
  });
}
```

## 5. Testing the Fixes

Create comprehensive tests to verify the fixes work:

```typescript
// race-condition-tests.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { loadingSlice } from '../client/src/store/slices/loadingSlice';

describe('Race Condition Fixes', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        loading: loadingSlice.reducer
      }
    });
  });

  it('should handle concurrent statistics updates safely', async () => {
    // Simulate concurrent completion events
    const promises = Array(100).fill(null).map((_, index) => 
      store.dispatch(loadingSlice.actions.updateStatsAtomic({
        type: 'increment_completed'
      }))
    );

    await Promise.all(promises);

    const state = store.getState();
    expect(state.loading.stats.completedOperations).toBe(100);
  });

  it('should prevent duplicate operations with same ID', async () => {
    const operationId = 'test-operation';
    
    // Try to create multiple operations with same ID
    const promises = Array(10).fill(null).map(() => 
      store.dispatch(startLoadingOperation({
        id: operationId,
        type: 'api',
        priority: 'medium'
      }))
    );

    await Promise.allSettled(promises);

    const state = store.getState();
    expect(Object.keys(state.loading.operations)).toHaveLength(1);
  });

  it('should handle WebSocket subscription races', async () => {
    const wsAdapter = new WebSocketMiddlewareAdapter(mockConfig);
    
    // Rapid subscribe/unsubscribe operations
    const subscription = { type: 'bill', id: '123' };
    
    const promises = Array(20).fill(null).map((_, index) => {
      if (index % 2 === 0) {
        return wsAdapter.subscribe(subscription);
      } else {
        return wsAdapter.unsubscribe(subscription);
      }
    });

    await Promise.allSettled(promises);
    
    // Should not crash and state should be consistent
    expect(wsAdapter.subscriptionIds.size).toBeGreaterThanOrEqual(0);
  });
});
```

These fixes address the identified race conditions by:

1. **Debouncing connection state updates** to prevent rapid state changes
2. **Queueing subscription operations** to ensure they execute sequentially
3. **Using atomic statistics updates** to prevent corruption from concurrent operations
4. **Adding existence checks** to prevent duplicate operations
5. **Implementing request deduplication** to handle concurrent identical requests

Implement these fixes gradually, starting with the high-priority WebSocket connection state race, and add comprehensive tests to verify they work correctly.