# API Module

Unified API layer consolidating HTTP client, WebSocket, and realtime communication functionality.

## Overview

The API module provides a comprehensive, unified interface for all client-server communication:

- **HTTP Client**: RESTful API requests with retry logic, caching, and circuit breaker
- **WebSocket Client**: Persistent WebSocket connections with reconnection
- **Realtime Client**: Event subscriptions and pub/sub messaging

## Module Structure

```
api/
├── index.ts                    # Public API exports
├── README.md                   # This file
├── types/                      # Type definitions
│   ├── index.ts               # Unified type exports
│   ├── websocket.ts           # WebSocket types
│   ├── realtime.ts            # Realtime types
│   ├── request.ts             # HTTP request types
│   └── ...                    # Other type files
├── http/                       # HTTP client sub-module
│   ├── client.ts              # HTTP client implementation
│   ├── retry.ts               # Retry logic
│   ├── interceptors.ts        # Request/response interceptors
│   ├── cache-manager.ts       # Response caching
│   └── request-deduplicator.ts # Request deduplication
├── websocket/                  # WebSocket client sub-module
│   ├── client.ts              # WebSocket client implementation
│   └── manager.ts             # Connection management
├── realtime/                   # Realtime client sub-module
│   ├── client.ts              # Realtime client implementation
│   ├── hub.ts                 # Event hub
│   └── subscriptions.ts       # Subscription management
├── circuit-breaker/            # Circuit breaker pattern
├── hooks/                      # React hooks for API usage
└── services/                   # Domain-specific API services
```

## Usage

### HTTP Client

```typescript
import { globalApiClient } from '@/infrastructure/api';

// GET request
const response = await globalApiClient.get<User>('/api/users/123');

// POST request with data
const newUser = await globalApiClient.post<User>('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With options
const data = await globalApiClient.get<Data>('/api/data', {
  params: { page: 1, limit: 10 },
  cache: { ttl: 60000 },
  retry: { maxRetries: 3 }
});
```

### WebSocket Client

```typescript
import { createWebSocketClient } from '@/infrastructure/api';

const wsClient = createWebSocketClient({
  url: 'wss://api.example.com/ws',
  reconnect: true,
  heartbeat: { interval: 30000 }
});

// Connect
wsClient.connect();

// Listen for messages
wsClient.on('message', (message) => {
  console.log('Received:', message);
});

// Send message
wsClient.send({
  type: 'chat',
  data: { text: 'Hello!' },
  timestamp: Date.now()
});

// Subscribe to topics
wsClient.subscribe(['bills', 'notifications']);

// Disconnect
wsClient.disconnect();
```

### Realtime Client

```typescript
import { realTimeHub } from '@/infrastructure/api';

// Subscribe to events
const subscription = realTimeHub.subscribe('bill-updates', (data) => {
  console.log('Bill updated:', data);
});

// Publish event
realTimeHub.publish('user-action', {
  action: 'vote',
  billId: '123'
});

// Unsubscribe
subscription.unsubscribe();
```

## Features

### HTTP Client Features

- **Retry Logic**: Automatic retry with exponential backoff
- **Caching**: Response caching with TTL and invalidation
- **Circuit Breaker**: Fault tolerance with circuit breaker pattern
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Interceptors**: Request/response transformation and authentication
- **Error Handling**: Unified error handling with observability integration
- **Timeout Management**: Configurable request timeouts
- **Fallback Data**: Graceful degradation with fallback responses

### WebSocket Features

- **Auto-Reconnection**: Automatic reconnection with exponential backoff
- **Connection State**: Track connection status (connecting, connected, disconnected, etc.)
- **Event Handling**: Type-safe event listeners
- **Topic Subscriptions**: Subscribe/unsubscribe to specific topics
- **Heartbeat**: Keep-alive heartbeat mechanism
- **Error Recovery**: Graceful error handling and recovery

### Realtime Features

- **Event Hub**: Centralized event management
- **Subscriptions**: Topic-based event subscriptions
- **Pub/Sub**: Publish and subscribe to events
- **Type Safety**: Fully typed event handlers
- **Subscription Management**: Track and manage active subscriptions
- **Connection Awareness**: React to connection state changes

## Configuration

### HTTP Client Configuration

```typescript
import { globalApiClient } from '@/infrastructure/api';

globalApiClient.configure({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  },
  cache: {
    ttl: 60000,
    maxSize: 100
  }
});
```

### WebSocket Configuration

```typescript
const wsClient = createWebSocketClient({
  url: 'wss://api.example.com/ws',
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 1000
  },
  heartbeat: {
    interval: 30000,
    timeout: 5000
  },
  timeout: 10000
});
```

## Integration with Observability

The API module integrates with the observability module for:

- **Error Tracking**: All API errors are tracked
- **Performance Monitoring**: Request timing and metrics
- **Circuit Breaker Monitoring**: Circuit breaker state and events
- **Connection Monitoring**: WebSocket connection health

```typescript
import { observability } from '@/infrastructure/observability';

// Errors are automatically tracked
// Performance metrics are automatically collected
// Circuit breaker events are automatically monitored
```

## React Hooks

The API module provides React hooks for easy integration:

```typescript
import { 
  useSafeQuery, 
  useSafeMutation,
  useWebSocket,
  useApiConnection 
} from '@/infrastructure/api/hooks';

// Safe query with error handling
const { data, error, loading } = useSafeQuery('/api/users');

// Safe mutation
const { mutate, loading } = useSafeMutation('/api/users', 'POST');

// WebSocket hook
const { connected, send, subscribe } = useWebSocket('wss://api.example.com/ws');

// Connection awareness
const { isOnline, isConnected } = useApiConnection();
```

## Migration from Old Modules

### From `infrastructure/http`

```typescript
// Old
import { requestDeduplicator } from '@/infrastructure/http';

// New
import { requestDeduplicator } from '@/infrastructure/api/http';
```

### From `infrastructure/websocket`

```typescript
// Old
import { WebSocketManager } from '@/infrastructure/websocket';

// New
import { createWebSocketClient } from '@/infrastructure/api';
```

### From `infrastructure/realtime`

```typescript
// Old
import { realTimeHub } from '@/infrastructure/realtime';

// New
import { realTimeHub } from '@/infrastructure/api';
```

## Type Definitions

All types are exported from the main module:

```typescript
import type {
  // HTTP types
  ApiRequest,
  ApiResponse,
  RequestOptions,
  
  // WebSocket types
  IWebSocketClient,
  WebSocketOptions,
  WebSocketMessage,
  ConnectionState,
  
  // Realtime types
  IRealtimeClient,
  Subscription,
  RealtimeEvent,
  
  // Common types
  UnifiedApiClient,
  ClientConfig
} from '@/infrastructure/api';
```

## Best Practices

1. **Use the global client**: Prefer `globalApiClient` for HTTP requests
2. **Handle errors gracefully**: Always handle API errors appropriately
3. **Use caching wisely**: Cache GET requests that don't change frequently
4. **Clean up subscriptions**: Always unsubscribe when components unmount
5. **Monitor connection state**: React to connection changes in your UI
6. **Use TypeScript**: Leverage type safety for all API calls
7. **Integrate with observability**: Ensure errors and metrics are tracked

## Testing

```typescript
import { UnifiedApiClientImpl } from '@/infrastructure/api/http/client';
import { createWebSocketClient } from '@/infrastructure/api/websocket';

// Mock HTTP client
const mockClient = new UnifiedApiClientImpl({
  baseUrl: 'http://localhost:3000',
  timeout: 5000
});

// Mock WebSocket client
const mockWsClient = createWebSocketClient({
  url: 'ws://localhost:3000/ws'
});
```

## Requirements Satisfied

- **Requirement 3.3**: API modules consolidated (http, websocket, realtime → api)
- **Requirement 4.1-4.5**: Standard module structure (index.ts, types/, README.md, __tests__/)
- **Requirement 13.1-13.5**: API module integration (HTTP, WebSocket, realtime, observability)
- **Requirement 14.4-14.5**: Import path migration

## See Also

- [Observability Module](../observability/README.md)
- [Error Handling](../error/README.md)
- [Store Module](../store/README.md)
