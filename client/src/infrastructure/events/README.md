# Event Infrastructure Module

## Overview

The Event Infrastructure module provides a shared event system for application-wide communication using the publish-subscribe pattern. It enables decoupled communication between components without direct dependencies.

## Purpose and Responsibilities

- **Event Publishing**: Emit events with typed payloads
- **Event Subscription**: Subscribe to events with type-safe handlers
- **Event Routing**: Route events to appropriate handlers
- **Event History**: Track event history for debugging
- **Event Filtering**: Filter events by type or pattern
- **Memory Management**: Automatic cleanup of event listeners

## Public Exports

### Classes and Instances

- `EventBus` - Event bus class for creating custom event buses
- `eventBus` - Global event bus instance

### Functions

- `on(event: string, handler: Function): () => void` - Subscribe to an event
- `once(event: string, handler: Function): () => void` - Subscribe to an event once
- `emit(event: string, data?: any): void` - Emit an event
- `off(event: string, handler: Function): void` - Unsubscribe from an event

### Types

- `EventHandler<T>` - Type-safe event handler function
- `EventSubscription` - Event subscription metadata
- `EventPayload<T>` - Event payload wrapper

## Usage Examples

### Basic Event Communication

```typescript
import { on, emit, off } from '@/infrastructure/events';

// Subscribe to an event
const unsubscribe = on('user:login', (user) => {
  console.log('User logged in:', user);
  updateUI(user);
});

// Emit an event
emit('user:login', { id: '123', name: 'John Doe' });

// Unsubscribe when done
unsubscribe();
```

### One-Time Event Subscription

```typescript
import { once, emit } from '@/infrastructure/events';

// Subscribe to event that fires only once
once('app:ready', () => {
  console.log('Application is ready!');
  initializeFeatures();
});

// Emit the event
emit('app:ready');
```

### Type-Safe Events

```typescript
import { eventBus } from '@/infrastructure/events';

interface UserLoginEvent {
  userId: string;
  timestamp: number;
  source: 'web' | 'mobile';
}

// Type-safe subscription
eventBus.on<UserLoginEvent>('user:login', (data) => {
  // data is typed as UserLoginEvent
  console.log(`User ${data.userId} logged in from ${data.source}`);
});

// Type-safe emission
eventBus.emit<UserLoginEvent>('user:login', {
  userId: '123',
  timestamp: Date.now(),
  source: 'web'
});
```

### Event Namespacing

```typescript
import { on, emit } from '@/infrastructure/events';

// Use namespaced events for organization
on('dashboard:widget:added', handleWidgetAdded);
on('dashboard:widget:removed', handleWidgetRemoved);
on('dashboard:layout:changed', handleLayoutChanged);

// Emit namespaced events
emit('dashboard:widget:added', { widgetId: 'w1', type: 'chart' });
```

### Component Communication

```typescript
import { on, emit } from '@/infrastructure/events';

// Component A - Publisher
function ComponentA() {
  const handleAction = () => {
    emit('data:updated', { id: 1, value: 'new data' });
  };

  return <button onClick={handleAction}>Update Data</button>;
}

// Component B - Subscriber
function ComponentB() {
  useEffect(() => {
    const unsubscribe = on('data:updated', (data) => {
      console.log('Data updated:', data);
      refreshDisplay(data);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  return <div>Component B</div>;
}
```

### Event Bus with Middleware

```typescript
import { EventBus } from '@/infrastructure/events';

// Create custom event bus with middleware
const customBus = new EventBus({
  middleware: [
    (event, data) => {
      console.log(`Event: ${event}`, data);
      return data; // Pass through
    },
    (event, data) => {
      // Validate event data
      if (!data) throw new Error('Event data required');
      return data;
    }
  ]
});

customBus.on('custom:event', handleCustomEvent);
customBus.emit('custom:event', { foo: 'bar' });
```

## Best Practices

1. **Event Naming**: Use consistent naming conventions (e.g., `domain:action`)
2. **Cleanup**: Always unsubscribe when components unmount
3. **Type Safety**: Use TypeScript generics for type-safe events
4. **Avoid Overuse**: Don't use events for direct parent-child communication
5. **Documentation**: Document available events and their payloads
6. **Error Handling**: Handle errors in event handlers to prevent propagation

## Sub-Module Organization

```
events/
├── index.ts                # Public API exports
├── event-bus.ts            # Event bus implementation
└── README.md               # This file
```

## Integration Points

- **All Modules**: Used for cross-module communication
- **Observability Module**: Tracks event metrics and patterns
- **Error Module**: Emits error events for centralized handling
- **API Module**: Emits API lifecycle events

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Observability Module](../observability/README.md) - Event tracking
- [Error Module](../error/README.md) - Error event handling
- [API Module](../api/README.md) - API lifecycle events
