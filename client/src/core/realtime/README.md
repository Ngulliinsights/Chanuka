# Core Real-time Module

A consolidated WebSocket and real-time functionality module for the Feature-Sliced Design (FSD) architecture. This module serves as the single source of truth for all real-time features in the application.

## Overview

This module consolidates all WebSocket and real-time functionality that was previously scattered across the codebase into a single, well-organized location at `client/src/core/realtime/`. The consolidation follows FSD principles and provides a clean, type-safe API for real-time features.

## Architecture

```
client/src/core/realtime/
├── index.ts              # Main entry point
├── types/               # TypeScript type definitions
├── config.ts            # Configuration management
├── websocket/           # WebSocket infrastructure
│   └── manager.ts       # Unified WebSocket manager
├── services/            # Real-time services
│   ├── realtime-service.ts    # Main orchestration service
│   ├── bill-tracking.ts       # Bill tracking service
│   ├── community.ts          # Community features service
│   └── notifications.ts      # Notifications service
├── hooks/               # React hooks
│   ├── use-websocket.ts          # General WebSocket hook
│   ├── use-bill-tracking.ts      # Bill tracking hook
│   ├── use-community-realtime.ts # Community real-time hook
│   └── use-realtime-engagement-legacy.ts # Legacy hook (deprecated)
└── utils/               # Utilities
    └── event-emitter.ts # Enhanced event emitter
```

## Features

### Core WebSocket Management
- **Unified WebSocket Manager**: Single instance managing all WebSocket connections
- **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
- **Heartbeat Monitoring**: Connection health monitoring
- **Message Batching**: Optimized message transmission
- **Subscription Management**: Dynamic subscription/unsubscription

### Real-time Services
- **Bill Tracking**: Real-time bill status, engagement metrics, and updates
- **Community Features**: Discussion threads, typing indicators, comments, votes
- **Notifications**: User notifications, system alerts, push notifications
- **Expert Activities**: Expert insights and activity tracking

### React Hooks
- **useWebSocket**: General WebSocket connection management
- **useBillTracking**: Bill-specific real-time features
- **useCommunityRealTime**: Community discussion features
- **useRealTimeEngagement**: Legacy hook (deprecated)

## Usage

### Basic Setup

```typescript
import { RealTimeService, realTimeService } from '@client/core/realtime';

// Initialize the real-time service
await realTimeService.initialize(authToken);

// Check connection status
const isConnected = realTimeService.isConnected();
```

### Using Hooks

```typescript
import { useBillTracking, useCommunityRealTime } from '@client/core/realtime';

function MyComponent() {
  const { 
    subscribeToBill, 
    unsubscribeFromBill, 
    getBillUpdates 
  } = useBillTracking();

  const { 
    subscribeToDiscussion, 
    sendTypingIndicator, 
    typingIndicators 
  } = useCommunityRealTime();

  // Subscribe to bill updates
  useEffect(() => {
    subscribeToBill(123);
    return () => unsubscribeFromBill(123);
  }, [subscribeToBill, unsubscribeFromBill]);

  // Get bill updates
  const updates = getBillUpdates(123);
  
  return (
    <div>
      {/* Render updates */}
    </div>
  );
}
```

### Direct Service Access

```typescript
import { realTimeService } from '@client/core/realtime';

// Access specific services
const billTrackingService = realTimeService.getBillTrackingService();
const communityService = realTimeService.getCommunityService();
const notificationService = realTimeService.getNotificationService();

// Subscribe to a bill
billTrackingService.subscribeToBill(123);

// Send a comment update
communityService.sendCommentUpdate(123, { text: 'Great bill!' });

// Get notifications
const notifications = notificationService.getAllNotifications();
```

## Configuration

The module supports environment-specific configuration:

```typescript
import { getRealTimeConfig } from '@client/core/realtime';

const config = getRealTimeConfig();
// Returns configuration based on NODE_ENV
```

### Configuration Options

- **WebSocket URL**: Different URLs for development/production
- **Heartbeat**: Connection monitoring interval
- **Reconnection**: Automatic reconnection settings
- **Batching**: Message batching optimization
- **Security**: Origin validation and security settings

## Migration Guide

### From Scattered Implementations

If you're migrating from scattered WebSocket implementations:

1. **Remove old WebSocket files** from various locations
2. **Update imports** to use the consolidated module
3. **Replace direct WebSocket usage** with hooks or services
4. **Test thoroughly** to ensure functionality is preserved

### Legacy Hook Deprecation

The `useRealTimeEngagement` hook is deprecated. Migrate to:

- `useBillTracking` for bill-specific features
- `useCommunityRealTime` for community features

## Best Practices

1. **Always unsubscribe** from subscriptions when components unmount
2. **Use hooks** for React components instead of direct service access
3. **Handle errors** appropriately - services include error logging
4. **Monitor connection status** for better UX
5. **Use TypeScript** for full type safety

## Error Handling

The module includes comprehensive error handling:

- Automatic reconnection with exponential backoff
- Connection timeout handling
- Message validation
- Service-level error logging

## Performance Optimizations

- **Message Batching**: Reduces WebSocket traffic
- **Connection Pooling**: Single WebSocket connection for all features
- **Efficient Event Emitting**: Optimized listener management
- **Memory Management**: Automatic cleanup of old data

## Testing

```typescript
// Mock the real-time service for testing
jest.mock('@client/core/realtime', () => ({
  realTimeService: {
    isConnected: jest.fn(() => true),
    getBillTrackingService: jest.fn(() => ({
      subscribeToBill: jest.fn(),
      unsubscribeFromBill: jest.fn(),
      getBillUpdates: jest.fn(() => [])
    }))
  }
}));
```

## Future Enhancements

- **Plugin System**: Allow custom real-time features
- **Performance Monitoring**: Built-in analytics
- **Advanced Batching**: More sophisticated message batching
- **Multi-tenancy**: Support for multiple environments

## Contributing

When contributing to this module:

1. Follow the established patterns in existing services
2. Add comprehensive TypeScript types
3. Include error handling and logging
4. Write tests for new functionality
5. Update this README with new features

## Troubleshooting

### Common Issues

1. **Connection Fails**: Check WebSocket URL configuration
2. **Messages Not Received**: Verify subscription topics
3. **Memory Leaks**: Ensure proper cleanup in useEffect
4. **Type Errors**: Check import paths and type definitions

### Debug Mode

Enable debug logging:

```typescript
// Set logger to debug level
logger.setLevel('debug');
```

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review the troubleshooting section
3. Consult the TypeScript definitions
4. Reach out to the development team