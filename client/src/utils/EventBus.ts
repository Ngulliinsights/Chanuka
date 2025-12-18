/**
 * Simple EventBus utility for backward compatibility
 *
 * Provides a centralized event system for decoupling components.
 * Used by CommunityWebSocketManager and other services for event handling.
 */

type EventHandler = (data: Record<string, unknown>) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event
   * @param event Event name
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
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
  emit(event: string, data: Record<string, unknown>): void {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;

    // Create a copy of listeners to avoid issues if handlers modify the set
    const listenerArray = Array.from(listeners);

    // Emit to all listeners asynchronously to prevent blocking
    listenerArray.forEach(handler => {
      try {
        // Use queueMicrotask for better performance than setTimeout
        queueMicrotask(() => handler(data));
      } catch (error) {
        console.error(`Error in EventBus handler for '${event}':`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event or all events
   * @param event Optional event name. If not provided, removes all listeners.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0;
  }

  /**
   * Get all event names that have listeners
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Export singleton instance for backward compatibility
export const eventBus = new EventBus();

// Export the class for testing or multiple instances if needed
export { EventBus };