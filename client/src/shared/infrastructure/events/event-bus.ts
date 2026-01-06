/**
 * Event Bus System - Shared Infrastructure
 *
 * Centralized event system for application-wide communication
 */

export type EventHandler = (data: Record<string, unknown>) => void;

export interface EventSubscription {
  unsubscribe(): void;
}

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();
  private maxListeners = 100;

  /**
   * Subscribe to an event
   * @param event Event name
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  on(event: string, handler: EventHandler): EventSubscription {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event)!;

    if (listeners.size >= this.maxListeners) {
      console.warn(`EventBus: Maximum listeners (${this.maxListeners}) reached for event '${event}'`);
      return { unsubscribe: () => {} };
    }

    listeners.add(handler);

    // Return unsubscribe function
    return {
      unsubscribe: () => this.off(event, handler)
    };
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once(event: string, handler: EventHandler): EventSubscription {
    const onceHandler: EventHandler = (data) => {
      handler(data);
      this.off(event, onceHandler);
    };

    return this.on(event, onceHandler);
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param handler Event handler function
   */
  off(event: string, handler: EventHandler): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(handler);
      // Clean up empty event sets
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param event Event name
   * @param data Event data
   */
  emit(event: string, data: Record<string, unknown> = {}): void {
    const listeners = this.events.get(event);
    if (listeners) {
      // Create a copy to avoid issues if listeners are modified during iteration
      const listenersCopy = Array.from(listeners);

      for (const handler of listenersCopy) {
        try {
          handler(data);
        } catch (error) {
          console.error(`EventBus: Error in listener for event '${event}':`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get list of events with listeners
   */
  getEvents(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get number of listeners for an event
   */
  getListenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }

  /**
   * Set maximum number of listeners per event
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export class for custom instances
export { EventBus };

// Convenience functions
export function on(event: string, handler: EventHandler): EventSubscription {
  return eventBus.on(event, handler);
}

export function once(event: string, handler: EventHandler): EventSubscription {
  return eventBus.once(event, handler);
}

export function emit(event: string, data?: Record<string, unknown>): void {
  return eventBus.emit(event, data);
}

export function off(event: string, handler: EventHandler): void {
  return eventBus.off(event, handler);
}
