/**
 * EventBus - Centralized event management system
 *
 * Provides a clean alternative to window.addEventListener for component communication
 * and WebSocket event handling. Ensures proper cleanup and prevents memory leaks.
 */

type EventListener = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param listener - Event listener function
   * @returns Unsubscribe function
   */
  on(event: string, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event to all listeners
   * @param event - Event name
   * @param args - Arguments to pass to listeners
   */
  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param event - Event name
   */
  removeAllListeners(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove a specific listener for an event
   * @param event - Event name
   * @param listener - Listener to remove
   */
  removeListener(event: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();

export default eventBus;