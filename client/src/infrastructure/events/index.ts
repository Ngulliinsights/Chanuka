/**
 * Event Infrastructure Module
 *
 * Provides a shared event system for application-wide communication using
 * the publish-subscribe pattern. Enables decoupled communication between
 * components without direct dependencies.
 *
 * @module infrastructure/events
 * @example
 * ```typescript
 * import { eventBus, on, emit, off } from '@/infrastructure/events';
 *
 * // Subscribe to an event
 * const unsubscribe = on('user:login', (user) => {
 *   console.log('User logged in:', user);
 * });
 *
 * // Emit an event
 * emit('user:login', { id: '123', name: 'John' });
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */

export * from './event-bus';

/**
 * Global event bus instance for application-wide event communication.
 * Provides pub/sub functionality with type-safe event handling.
 *
 * @example
 * ```typescript
 * // Subscribe to events
 * eventBus.on('data:updated', (data) => console.log(data));
 *
 * // Emit events
 * eventBus.emit('data:updated', { id: 1, value: 'new' });
 * ```
 */
export { 
  eventBus, 
  EventBus, 
  /**
   * Subscribe to an event. Returns an unsubscribe function.
   *
   * @param event - The event name to subscribe to
   * @param handler - The callback function to handle the event
   * @returns Unsubscribe function
   * @example
   * ```typescript
   * const unsubscribe = on('user:login', (user) => {
   *   console.log('User logged in:', user);
   * });
   * ```
   */
  on, 
  /**
   * Subscribe to an event that fires only once, then automatically unsubscribes.
   *
   * @param event - The event name to subscribe to
   * @param handler - The callback function to handle the event
   * @returns Unsubscribe function
   * @example
   * ```typescript
   * once('app:ready', () => {
   *   console.log('App is ready!');
   * });
   * ```
   */
  once, 
  /**
   * Emit an event with optional data payload.
   *
   * @param event - The event name to emit
   * @param data - Optional data to pass to event handlers
   * @example
   * ```typescript
   * emit('user:logout', { userId: '123', reason: 'manual' });
   * ```
   */
  emit, 
  /**
   * Unsubscribe from an event.
   *
   * @param event - The event name to unsubscribe from
   * @param handler - The handler function to remove
   * @example
   * ```typescript
   * off('user:login', loginHandler);
   * ```
   */
  off 
} from './event-bus';
