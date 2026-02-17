/**
 * Enhanced Event Emitter with Type Safety
 *
 * Optimized event emitter for WebSocket and real-time functionality
 */

import { EventListener } from '../types';

export class EventEmitter {
  private events: Map<string, Set<EventListener>> = new Map();

  on(event: string, listener: EventListener): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);

    // Return unsubscribe function for easier cleanup
    return () => this.off(event, listener);
  }

  off(event: string, listener: EventListener): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      // Optimization: Clean up empty listener sets
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;

    // Optimization: Convert to array once for iteration
    const listenerArray = Array.from(listeners);

    // Limit concurrent microtasks to prevent overwhelming the queue
    if (listenerArray.length > 10) {
      // For large listener counts, use setTimeout to batch processing
      setTimeout(() => {
        listenerArray.forEach(callback => {
          try {
            callback(...(args as [any]));
          } catch (error) {
            console.error(`Error in event listener for '${event}':`, error);
          }
        });
      }, 0);
    } else {
      // For small listener counts, use microtasks
      listenerArray.forEach(callback => {
        try {
          queueMicrotask(() => callback(...(args as [any])));
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}
