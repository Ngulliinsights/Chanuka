# WebSocket Type System Consolidation Plan

## Overview

This document outlines a comprehensive plan to consolidate all WebSocket-related type definitions across server, client, and shared modules, eliminating redundancies and ensuring consistency between client and server implementations.

## Current Architecture Problems

### 1. Duplication Issues
- **Complete duplication** of core types between `shared/schema/websocket.ts` and `client/src/core/api/types/websocket.ts`
- **Partial duplication** of interfaces across multiple files
- **Inconsistent naming** for similar concepts

### 2. Structural Inconsistencies
- Message payload field: `data` vs `payload`
- Message ID field: `messageId` vs `id`
- Different generic type constraints
- Inconsistent optional field patterns

### 3. Platform Dependencies
- Node.js-specific types in client code (`NodeJS.Timeout`)
- Server-specific imports in shared types
- Browser-incompatible type definitions

## Unified Type System Design

### Core Principles

1. **Single Source of Truth:** All shared types in `shared/schema/websocket.ts`
2. **Platform Agnostic:** No Node.js or browser-specific dependencies in shared types
3. **Consistent Naming:** Standardized field names and interface patterns
4. **Type Safety:** Strong typing with discriminated unions and type guards
5. **Extensibility:** Easy to extend for new features without breaking changes

### Architecture Overview

```
shared/schema/websocket.ts (Core Types)
├── Connection & State Management
├── Message Definitions (Base & Specific)
├── Configuration Types
├── Error Handling
├── Statistics & Monitoring
└── Type Guards & Utilities

client/src/core/realtime/types/index.ts (Client Extensions)
├── Domain-Specific Types (Bills, Community, etc.)
├── React Hook Return Types
├── Client State Management
└── UI-Specific Types

server/infrastructure/websocket/types.ts (Server Extensions)
├── Service Interfaces
├── Server Configuration
├── Authentication Extensions
└── Performance Monitoring
```

## Detailed Consolidation Plan

### Phase 1: Core Type Unification

#### 1.1 Message Structure Standardization

**Target Structure:**
```typescript
export interface WebSocketMessage<T = unknown> {
  /** Message type discriminator */
  type: string;
  /** Message payload data */
  data?: T;
  /** Unique message identifier */
  messageId?: string;
  /** Message timestamp (Unix milliseconds) */
  timestamp?: number;
}
```

**Changes Required:**
- Standardize on `data` field (not `payload`)
- Standardize on `messageId` field (not `id`)
- Ensure consistent optional field patterns

#### 1.2 Connection State Consolidation

**Unified Connection State:**
```typescript
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  packetLoss?: number;
}

export interface ConnectionMetrics {
  connectedAt: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  latency: number;
}
```

#### 1.3 Configuration Type Unification

**Unified Configuration:**
```typescript
export interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnect?: ReconnectConfig;
  heartbeat?: HeartbeatConfig;
  auth?: WebSocketAuthConfig;
  debug?: boolean;
}

export interface ReconnectConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export interface HeartbeatConfig {
  interval: number;
  timeout: number;
}
```

### Phase 2: Message Type System

#### 2.1 Discriminated Union Design

**Base Message Types:**
```typescript
// Client to Server Messages
export type ClientToServerMessage =
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | HeartbeatMessage;

// Server to Client Messages
export type ServerToClientMessage =
  | BillUpdateMessage
  | CommunityUpdateMessage
  | NotificationMessage
  | ErrorMessage
  | ConnectionMessage
  | SystemMessage
  | HeartbeatMessage;

// All Messages
export type AnyWebSocketMessage = ClientToServerMessage | ServerToClientMessage;
```

#### 2.2 Specific Message Definitions

**Authentication Messages:**
```typescript
export interface AuthMessage extends WebSocketMessage {
  type: 'auth' | 'authenticate';
  data: {
    token: string;
    clientInfo?: {
      platform?: string;
      version?: string;
      capabilities?: string[];
    };
  };
}
```

**Subscription Messages:**
```typescript
export interface SubscribeMessage extends WebSocketMessage {
  type: 'subscribe';
  data: {
    topics: string[];
    filters?: Record<string, unknown>;
    priority?: SubscriptionPriority;
  };
}

export interface UnsubscribeMessage extends WebSocketMessage {
  type: 'unsubscribe';
  data: {
    topics: string[];
  };
}
```

**Update Messages:**
```typescript
export interface BillUpdateMessage extends WebSocketMessage<BillUpdate> {
  type: 'bill_update' | 'bill_status_change' | 'bill_engagement';
}

export interface CommunityUpdateMessage extends WebSocketMessage<CommunityUpdate> {
  type: 'community_update' | 'comment' | 'vote' | 'typing';
}

export interface NotificationMessage extends WebSocketMessage<NotificationData> {
  type: 'notification' | 'alert';
}
```

### Phase 3: Platform-Specific Adaptations

#### 3.1 Timer Type Abstraction

**Cross-Platform Timer Types:**
```typescript
// In shared/schema/websocket.ts
export type TimerHandle = number | NodeJS.Timeout;

// Platform-specific implementations
export interface PlatformTimers {
  setTimeout(callback: () => void, delay: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
  setInterval(callback: () => void, interval: number): TimerHandle;
  clearInterval(handle: TimerHandle): void;
}
```

#### 3.2 Client-Specific Extensions

**Client Real-Time Types:**
```typescript
// client/src/core/realtime/types/index.ts
export interface BillRealTimeUpdate {
  type: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 
        'engagement_change' | 'constitutional_flag' | 'expert_analysis';
  data: Record<string, unknown>;
  timestamp: string;
  bill_id: number;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ConnectionQuality['level'];
  error: string | null;
  notifications: WebSocketMessage[];
  notificationCount: number;
  connect: () => void;
  disconnect: () => void;
  subscribe: (topics: string | string[]) => void;
  unsubscribe: (topics: string | string[]) => void;
  send: (message: WebSocketMessage) => void;
}
```

#### 3.3 Server-Specific Extensions

**Server Infrastructure Types:**
```typescript
// server/infrastructure/websocket/types.ts
export interface AuthenticatedWebSocket extends WebSocket {
  user_id?: string;
  isAlive?: boolean;
  lastPing?: number;
  subscriptions?: Set<number>;
  messageBuffer?: Array<Record<string, unknown>>;
  flushTimer?: TimerHandle;
  connectionId?: string;
}

export interface IConnectionManager {
  addConnection(ws: AuthenticatedWebSocket): void;
  removeConnection(ws: AuthenticatedWebSocket): void;
  getConnectionsForUser(userId: string): AuthenticatedWebSocket[];
  authenticateConnection(ws: AuthenticatedWebSocket, token: string): Promise<boolean>;
  cleanup(): void;
  getConnectionCount(): number;
}
```

### Phase 4: Type Safety Enhancements

#### 4.1 Type Guards

**Message Type Guards:**
```typescript
export function isClientToServerMessage(message: WebSocketMessage): message is ClientToServerMessage {
  return ['auth', 'authenticate', 'subscribe', 'unsubscribe', 'ping'].includes(message.type);
}

export function isServerToClientMessage(message: WebSocketMessage): message is ServerToClientMessage {
  return ['bill_update', 'bill_status_change', 'bill_engagement', 'community_update',
          'comment', 'vote', 'typing', 'notification', 'alert', 'error', 'connected',
          'disconnected', 'reconnecting', 'system', 'pong'].includes(message.type);
}

export function isValidWebSocketMessage(message: unknown): message is WebSocketMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof (message as WebSocketMessage).type === 'string' &&
    (message as WebSocketMessage).type.length > 0
  );
}
```

#### 4.2 Runtime Validation

**Message Validation:**
```typescript
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

export function validateWebSocketMessage<T>(
  message: unknown,
  validator?: (data: unknown) => data is T
): ValidationResult<WebSocketMessage<T>> {
  if (!isValidWebSocketMessage(message)) {
    return { valid: false, errors: ['Invalid message structure'] };
  }

  if (validator && message.data !== undefined && !validator(message.data)) {
    return { valid: false, errors: ['Invalid message data'] };
  }

  return { valid: true, data: message as WebSocketMessage<T> };
}
```

## Implementation Strategy

### Step 1: Preparation (1-2 days)
1. **Audit Current Usage**
   - Scan all imports of WebSocket types
   - Identify breaking change impact
   - Create compatibility matrix

2. **Create Migration Scripts**
   - Automated import path updates
   - Type structure transformations
   - Validation scripts

### Step 2: Core Consolidation (2-3 days)
1. **Update Shared Schema**
   - Implement unified message structure
   - Add comprehensive type guards
   - Update documentation

2. **Remove Duplicate Files**
   - Delete `client/src/core/api/types/websocket.ts`
   - Update all import statements
   - Fix compilation errors

### Step 3: Platform Fixes (1-2 days)
1. **Fix Node.js Dependencies**
   - Replace `NodeJS.Timeout` with cross-platform types
   - Update timer handling code
   - Test in browser environment

2. **Update Client Code**
   - Fix message structure usage (`payload` → `data`)
   - Update field names (`id` → `messageId`)
   - Test WebSocket client functionality

### Step 4: Server Integration (2-3 days)
1. **Update Server Types**
   - Integrate with shared schema
   - Maintain server-specific extensions
   - Update service interfaces

2. **Update Message Handlers**
   - Adapt to new message structure
   - Update validation logic
   - Test server functionality

### Step 5: Testing & Validation (2-3 days)
1. **Comprehensive Testing**
   - Unit tests for type guards
   - Integration tests for WebSocket communication
   - End-to-end testing

2. **Performance Validation**
   - Ensure no performance regression
   - Validate memory usage
   - Test connection stability

## Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Document current WebSocket usage patterns
- [ ] Create test scenarios for validation
- [ ] Set up monitoring for WebSocket connections

### Core Migration
- [ ] Update `shared/schema/websocket.ts` with unified types
- [ ] Remove `client/src/core/api/types/websocket.ts`
- [ ] Update all import statements
- [ ] Fix Node.js dependency issues
- [ ] Standardize message structure usage

### Post-Migration
- [ ] Run comprehensive test suite
- [ ] Validate WebSocket functionality in development
- [ ] Monitor for runtime errors
- [ ] Update documentation
- [ ] Deploy to staging environment

### Validation
- [ ] Client-server WebSocket communication works
- [ ] Real-time features function correctly
- [ ] No TypeScript compilation errors
- [ ] No runtime type errors
- [ ] Performance metrics maintained

## Risk Mitigation

### High-Risk Areas
1. **Message Structure Changes**
   - **Risk:** Breaking client-server communication
   - **Mitigation:** Gradual rollout with backward compatibility

2. **Timer Type Changes**
   - **Risk:** Runtime errors in client code
   - **Mitigation:** Thorough testing in browser environment

3. **Import Path Changes**
   - **Risk:** Build failures
   - **Mitigation:** Automated migration scripts

### Rollback Plan
1. **Immediate Rollback:** Revert to previous commit
2. **Partial Rollback:** Restore specific files if needed
3. **Forward Fix:** Address issues without full rollback

## Success Metrics

### Technical Metrics
- Zero TypeScript compilation errors
- All WebSocket tests passing
- No runtime type errors in logs
- Maintained WebSocket connection stability

### Code Quality Metrics
- Reduced type definition duplication (target: 0%)
- Improved type safety coverage
- Consistent naming conventions
- Comprehensive documentation

### Performance Metrics
- No degradation in WebSocket connection time
- Maintained message throughput
- No increase in memory usage
- Stable error rates

## Conclusion

This consolidation plan provides a systematic approach to unifying the WebSocket type system while minimizing breaking changes and maintaining functionality. The phased approach allows for careful validation at each step and provides clear rollback options if issues arise.

The end result will be a clean, consistent, and maintainable WebSocket type system that serves both client and server needs effectively while eliminating redundancy and improving type safety.