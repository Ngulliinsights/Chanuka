/**
 * Event Infrastructure
 *
 * Shared event system for application-wide communication
 */

export * from './event-bus';
export { eventBus, EventBus, on, once, emit, off } from './event-bus';
