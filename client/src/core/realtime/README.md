# Core Real-time Module

This module consolidates all WebSocket and real-time functionality following Feature-Sliced Design (FSD) principles. It replaces scattered WebSocket implementations with a unified, optimized system.

## Architecture Overview

```
core/realtime/
├── index.ts                    # Main exports
├── types.ts                    # Consolidated type definitions
├── config.ts                   # Configuration management
├── websocket/
│   ├── manager.ts             # Unified WebSocket manager
│   └── pool.ts                # Connection pooling (future)
├── services/
│   ├── realtime-service.ts    # Main orchestration service
│   ├── bill-tracking.ts       # Bill tracking service
│   ├── community.ts           # Community features service
│   └── notifications.ts       # Notification service
├── hooks/
│   ├── use-websocket.ts       # Main WebSocket hook
│   ├── use-bill-tracking.ts   # Bill tracking hook
│   ├── use-community-realtime.ts # Community real-time hook
│   └── use-realtime-engagement.ts # Engagement analytics hook
├── utils/
│   ├── event-emitter.ts       # Enhanced event emitter
│   └── optimizer.ts           # Real-time optimization utilities
└── examples/
    └── integration-example.tsx # Usage examples
```

## Key Features

### 🔄 Unified WebSocket Management
- Single WebSocket connection for all real-time features
- Automatic reconnection with exponential backoff
- Connection pooling and optimization
- Heartbeat monitoring and health checks

### 📊 Bill Tracking
- Real-time bill status updates
- Engagement metrics (views, comments, shares)
- Amendment notifications
- Voting schedule alerts

### 💬 Community Features
- Live discussion updates
- Typing indicators
- Comment and vote real-time updates
- Expert activity notifications

### 🔔 Notifications
- Real-time user notifications
- System alerts and announcements
- Priority-based notification handling
- Read/unread state management

### ⚡ Performance Optimizations
- Message batching and compression
- Intelligent caching strategies
- Memory-efficient data structures
- Automatic cleanup and garbage collection

## Usage Examples

### Basic WebSocket Connection

```typescript
import { useWebSocket } from '@client/core/realtime';

function MyComponent() {
  const {
    isConnected,
    isConnecting,
    connectionQuality,
    error,
    connect,
    disconnect
  } = useWebSocket({
    autoConnect: true,
    token: userToken
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Quality: {connectionQuality}</p>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Bill Tracking

```typescript
import { useBillTracking } from '@client/core/realtime';

function BillTracker({ billId }: { billId: number }) {
  const {
    subscribeToBill,
    unsubscribeFromBill,
    getBillUpdates,
    getEngagementMetrics
  } = useBillTracking();

  useEffect(() => {
    subscribeToBill(billId);
    return () => unsubscribeFromBill(billId);
  }, [billId]);

  const updates = getBillUpdates(billId);
  const metrics = getEngagementMetrics(billId);

  return (
    <div>
      <h3>Bill Updates ({updates.length})</h3>
      {updates.map(update => (
        <div key={update.timestamp}>
          {update.type}: {JSON.stringify(update.data)}
        </div>
      ))}
      
      {metrics && (
        <div>
          <p>Views: {metrics.viewCount}</p>
          <p>Comments: {metrics.commentCount}</p>
        </div>
      )}
    </div>
  );
}
```

### Community Real-time Features

```typescript
import { useCommunityRealTime } from '@client/core/realtime';

function CommunityDiscussion({ billId }: { billId: number }) {
  const {
    subscribeToDiscussion,
    sendTypingIndicator,
    stopTypingIndicator,
    sendCommentUpdate,
    typingIndicators
  } = useCommunityRealTime();

  useEffect(() => {
    subscribeToDiscussion(billId);
  }, [billId]);

  const handleStartTyping = () => {
    sendTypingIndicator(billId);
  };

  const handleStopTyping = () => {
    stopTypingIndicator(billId);
  };

  const handleSubmitComment = (commentData: any) => {
    sendCommentUpdate(billId, commentData);
  };

  const currentTyping = typingIndicators.get(`${billId}_root`) || [];

  return (
    <div>
      <textarea
        onFocus={handleStartTyping}
        onBlur={handleStopTyping}
        placeholder="Write a comment..."
      />
      
      {currentTyping.length > 0 && (
        <p>{currentTyping.length} user(s) typing...</p>
      )}
    </div>
  );
}
```

### Direct Service Usage

```typescript
import { realTimeService } from '@client/core/realtime';

// Initialize the service
await realTimeService.initialize(userToken);

// Get individual services
const billService = realTimeService.getBillTrackingService();
const communityService = realTimeService.getCommunityService();
const notificationService = realTimeService.getNotificationService();

// Subscribe to events
const unsubscribe = realTimeService.on('connectionChange', (connected) => {
  console.log('Connection status:', connected);
});

// Get statistics
const stats = realTimeService.getStats();
console.log('Real-time stats:', stats);

// Cleanup
unsubscribe();
await realTimeService.shutdown();
```

## Configuration

### Environment Variables

```env
# WebSocket URL
VITE_WS_URL=ws://localhost:3001/ws

# Connection settings
VITE_WS_HEARTBEAT_INTERVAL=30000
VITE_WS_RECONNECT_ATTEMPTS=5
VITE_WS_RECONNECT_DELAY=2000

# Feature flags
VITE_WS_COMPRESSION_ENABLED=false
VITE_WS_BATCHING_ENABLED=true
```

### Custom Configuration

```typescript
import { getRealTimeConfig } from '@client/core/realtime/config';

const customConfig = {
  ...getRealTimeConfig(),
  websocket: {
    ...getRealTimeConfig().websocket,
    heartbeat: {
      enabled: true,
      interval: 15000, // 15 seconds
      timeout: 5000    // 5 seconds
    },
    reconnect: {
      enabled: true,
      maxAttempts: 10,
      delay: 1000,
      backoff: 'exponential'
    }
  }
};
```

## Migration Guide

### From Legacy WebSocket Services

#### Before (Legacy)
```typescript
// Old scattered approach
import { webSocketService } from '@client/services/webSocketService';
import { communityWebSocketManager } from '@client/services/CommunityWebSocketManager';
import { useWebSocket } from '@client/hooks/use-websocket';

// Multiple connections and services
webSocketService.connect();
communityWebSocketManager.connect();
```

#### After (Consolidated)
```typescript
// New unified approach
import { 
  realTimeService, 
  useWebSocket, 
  useBillTracking, 
  useCommunityRealTime 
} from '@client/core/realtime';

// Single service managing everything
await realTimeService.initialize(token);

// Specialized hooks for different features
const websocket = useWebSocket();
const billTracking = useBillTracking();
const community = useCommunityRealTime();
```

### Import Updates

The migration script automatically updates imports, but manual updates may be needed:

```typescript
// Old imports
import { webSocketService } from '@client/services/webSocketService';
import { useWebSocket } from '@client/hooks/use-websocket';
import { CommunityWebSocketManager } from '@client/services/CommunityWebSocketManager';

// New imports
import { 
  realTimeService,
  useWebSocket,
  useBillTracking,
  useCommunityRealTime
} from '@client/core/realtime';
```

## Performance Considerations

### Memory Management
- Automatic cleanup of old messages and notifications
- Configurable limits for cached data
- Efficient data structures (Maps vs Arrays)
- Garbage collection of inactive subscriptions

### Network Optimization
- Message batching to reduce network calls
- Compression for large payloads (configurable)
- Intelligent reconnection strategies
- Connection pooling for multiple features

### CPU Optimization
- Event emitter with microtask scheduling
- Debounced updates for high-frequency events
- Lazy loading of non-critical features
- Efficient message routing and filtering

## Testing

### Unit Tests
```typescript
import { UnifiedWebSocketManager } from '@client/core/realtime/websocket/manager';
import { BillTrackingService } from '@client/core/realtime/services/bill-tracking';

describe('BillTrackingService', () => {
  let service: BillTrackingService;
  let mockWsManager: jest.Mocked<UnifiedWebSocketManager>;

  beforeEach(() => {
    mockWsManager = createMockWebSocketManager();
    service = new BillTrackingService(mockWsManager);
  });

  it('should subscribe to bill updates', () => {
    service.subscribeToBill(123);
    expect(mockWsManager.subscribe).toHaveBeenCalledWith(
      'bill:123',
      expect.any(Function)
    );
  });
});
```

### Integration Tests
```typescript
import { realTimeService } from '@client/core/realtime';

describe('Real-time Integration', () => {
  beforeEach(async () => {
    await realTimeService.initialize('test-token');
  });

  afterEach(async () => {
    await realTimeService.shutdown();
  });

  it('should handle end-to-end bill tracking', async () => {
    const billService = realTimeService.getBillTrackingService();
    
    // Subscribe to bill
    billService.subscribeToBill(123);
    
    // Simulate WebSocket message
    const mockMessage = {
      type: 'bill_update',
      bill_id: 123,
      update: { type: 'status_change', data: { newStatus: 'passed' } }
    };
    
    // Verify update is processed
    const updates = billService.getBillUpdates(123);
    expect(updates).toHaveLength(1);
    expect(updates[0].data.newStatus).toBe('passed');
  });
});
```

## Troubleshooting

### Common Issues

#### Connection Problems
```typescript
// Check connection status
const stats = realTimeService.getStats();
console.log('Connection state:', stats.connectionState);

// Manual reconnection
if (!realTimeService.isConnected()) {
  await realTimeService.connect(newToken);
}
```

#### Memory Leaks
```typescript
// Ensure proper cleanup
useEffect(() => {
  const billService = realTimeService.getBillTrackingService();
  billService.subscribeToBill(billId);
  
  return () => {
    // Always unsubscribe on unmount
    billService.unsubscribeFromBill(billId);
  };
}, [billId]);
```

#### Performance Issues
```typescript
// Monitor service statistics
const stats = realTimeService.getStats();
if (stats.subscriptionCount > 50) {
  console.warn('High subscription count may impact performance');
}

// Use specialized hooks instead of direct service access
const { getBillUpdates } = useBillTracking(); // ✅ Optimized
// vs
const updates = realTimeService.getBillTrackingService().getBillUpdates(billId); // ❌ Direct access
```

## Future Enhancements

- [ ] WebSocket connection pooling
- [ ] Advanced message compression
- [ ] Machine learning for predictive caching
- [ ] Real-time collaboration features
- [ ] Advanced analytics and monitoring
- [ ] Multi-tenant support
- [ ] Offline synchronization
- [ ] Push notification integration

## Contributing

When adding new real-time features:

1. **Add types** to `types.ts`
2. **Create service** in `services/` directory
3. **Add hook** in `hooks/` directory
4. **Update main service** to orchestrate new feature
5. **Add tests** for all new functionality
6. **Update documentation** and examples

Follow the established patterns for consistency and maintainability.