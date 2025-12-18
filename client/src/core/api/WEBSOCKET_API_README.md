# WebSocket API Server

Server-side WebSocket API handlers and endpoints. This module handles WebSocket connections, authentication, and message routing for the server-side API.

> **Note**: Client-side WebSocket functionality is handled by `client/src/core/realtime/`. This module is for the server-side API only.

## Overview

The WebSocket API server provides real-time communication capabilities for the application. It handles:

- WebSocket connection management
- Authentication and authorization
- Message routing and broadcasting
- Topic-based subscriptions
- Rate limiting and security
- Performance monitoring

## Architecture

```
api/
├── websocket.ts              # Main WebSocket API server
├── types/websocket.ts        # TypeScript definitions
├── websocket-example.ts      # Usage examples
└── WEBSOCKET_API_README.md   # This documentation
```

## Features

### Connection Management
- **Authentication**: Token-based WebSocket authentication
- **Rate Limiting**: Per-user rate limiting for WebSocket connections
- **Heartbeats**: Automatic connection health monitoring
- **Cleanup**: Automatic cleanup of stale connections

### Message Handling
- **Topic-based Subscriptions**: Clients can subscribe to specific topics
- **Message Broadcasting**: Broadcast messages to all subscribers of a topic
- **User-specific Messages**: Send messages to specific users
- **Custom Handlers**: Register custom message handlers for different message types

### Security
- **Origin Validation**: Validate WebSocket connection origins
- **Message Validation**: Validate incoming message formats
- **Rate Limiting**: Prevent abuse with rate limiting
- **Connection Limits**: Limit connections per user

## Usage

### Basic Setup

```typescript
import { createServer } from 'http';
import { WebSocketAPIServer } from './api/websocket';

// Create HTTP server
const server = createServer();

// Create WebSocket API server
const wsServer = new WebSocketAPIServer(server);

// Initialize
await wsServer.initialize();

// Register message handlers
wsServer.registerMessageHandler('my_message_type', (connection, message) => {
  // Handle custom message type
});

// Start server
server.listen(3001);
```

### Message Handlers

Register custom message handlers for different message types:

```typescript
// Register a message handler
wsServer.registerMessageHandler('bill_subscribe', async (connection, message) => {
  const { billIds } = message.data;
  
  // Subscribe to bills
  for (const billId of billIds) {
    wsServer.subscribeToTopic(connection.id, `bill:${billId}`);
  }
  
  // Send confirmation
  connection.ws.send(JSON.stringify({
    type: 'bill_subscribed',
    data: { billIds }
  }));
});

// Unregister a message handler
wsServer.unregisterMessageHandler('bill_subscribe');
```

### Broadcasting Messages

```typescript
// Broadcast to all subscribers of a topic
wsServer.broadcastToTopic('bill:123', {
  type: 'bill_update',
  data: {
    billId: 123,
    status: 'passed',
    timestamp: new Date().toISOString()
  }
});

// Broadcast to a specific user
wsServer.broadcastToUser('user123', {
  type: 'notification',
  data: {
    id: 'notif1',
    title: 'Bill Update',
    message: 'A bill you follow has been updated'
  }
});

// Broadcast to all users except one
wsServer.broadcastToTopic(
  'discussion:123',
  {
    type: 'typing_indicator',
    data: { userId: 'user123', isTyping: true }
  },
  'user123' // Exclude this user
);
```

### Default Message Handlers

The server includes default handlers for common message types:

```typescript
import { defaultMessageHandlers } from './api/websocket';

// Register all default handlers
Object.entries(defaultMessageHandlers).forEach(([type, handler]) => {
  wsServer.registerMessageHandler(type, handler);
});
```

Default handlers include:
- `subscribe` - Handle topic subscriptions
- `unsubscribe` - Handle topic unsubscriptions
- `ping`/`pong` - Handle heartbeat messages
- `ready` - Handle client ready notifications

### Statistics and Monitoring

```typescript
// Get server statistics
const stats = wsServer.getStats();
console.log('WebSocket Stats:', stats);

// Get connection count
const connectionCount = wsServer.getConnectionCount();
console.log(`Active connections: ${connectionCount}`);

// Get connection details
const connection = wsServer.getConnectionDetails('connection-id-123');
if (connection) {
  console.log('Connection details:', {
    userId: connection.userId,
    subscriptions: Array.from(connection.subscriptions),
    connectionTime: connection.connectionTime
  });
}
```

## Message Types

### Client to Server Messages

#### Authentication
```json
{
  "type": "auth",
  "data": {
    "token": "jwt-token-here"
  }
}
```

#### Subscription
```json
{
  "type": "subscribe",
  "data": {
    "topics": ["bill:123", "discussion:456"]
  }
}
```

#### Custom Messages
```json
{
  "type": "bill_subscribe",
  "data": {
    "billIds": [123, 456]
  },
  "requestId": "req-123"
}
```

### Server to Client Messages

#### Connection
```json
{
  "type": "connected",
  "data": {
    "connectionId": "conn-123",
    "sessionId": "sess-456",
    "serverTime": "2023-12-01T12:00:00Z"
  }
}
```

#### Bill Update
```json
{
  "type": "bill_update",
  "topic": "bill:123",
  "data": {
    "billId": 123,
    "updateType": "status_change",
    "newValue": "passed",
    "previousValue": "introduced",
    "timestamp": "2023-12-01T12:00:00Z"
  }
}
```

#### Error
```json
{
  "type": "error",
  "data": {
    "code": 4003,
    "message": "Invalid message format",
    "details": "Missing required field: type"
  }
}
```

## Configuration

The WebSocket server can be configured with various options:

```typescript
const config = {
  path: '/api/ws',                    // WebSocket endpoint path
  maxConnections: 1000,              // Maximum total connections
  maxConnectionsPerUser: 5,          // Maximum connections per user
  maxSubscriptionsPerConnection: 20, // Maximum subscriptions per connection
  maxMessageSize: 1024 * 1024,       // Maximum message size (1MB)
  heartbeatInterval: 10000,          // Heartbeat interval (10s)
  connectionTimeout: 30000,          // Connection timeout (30s)
  cleanupInterval: 60000,            // Cleanup interval (1m)
  maxAge: 86400000,                  // Maximum connection age (24h)
  rateLimit: {
    windowMs: 60000,                 // Rate limit window (1m)
    maxRequests: 100                 // Max requests per window
  }
};
```

## Security Best Practices

1. **Authentication**: Always authenticate WebSocket connections
2. **Origin Validation**: Validate connection origins in production
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Message Validation**: Validate all incoming messages
5. **Connection Limits**: Limit connections per user
6. **Input Sanitization**: Sanitize all user input

## Testing

```typescript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:3001/api/ws');

ws.on('open', () => {
  console.log('Connected to WebSocket API');
  
  // Subscribe to topics
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: { topics: ['bill:123'] }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received message:', message);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Performance Considerations

1. **Connection Pooling**: Limit maximum connections
2. **Message Batching**: Consider batching messages for high-frequency updates
3. **Subscription Management**: Unsubscribe from unused topics
4. **Memory Management**: Clean up stale connections regularly
5. **Rate Limiting**: Prevent individual users from overwhelming the server

## Deployment

### Development
```bash
npm run dev
# WebSocket API will be available at ws://localhost:3001/api/ws
```

### Production
```bash
npm run build
npm start
# Configure production WebSocket URL in client
```

## Monitoring

Monitor these metrics for production deployments:

- Active connections
- Messages per second
- Subscription counts
- Error rates
- Memory usage
- Connection duration

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check authentication and rate limits
2. **Messages Not Received**: Verify topic subscriptions
3. **High Memory Usage**: Check for connection leaks
4. **Performance Issues**: Monitor message frequency and connection count

### Debug Mode

Enable debug logging:
```typescript
// Set logger to debug level
logger.setLevel('debug');
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the type definitions in `api/types/websocket.ts`
3. Consult the development team
4. Test with the provided example

## Future Enhancements

- **Message Batching**: Support for batching multiple messages
- **Compression**: WebSocket message compression
- **Clustering**: Support for multiple server instances
- **Metrics**: Enhanced monitoring and metrics
- **Plugins**: Plugin system for custom handlers

## API Stability

The WebSocket API follows semantic versioning. Breaking changes will be clearly documented in release notes.