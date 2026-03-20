/**
 * Dashboard Events Types - User interactions and state changes
 *
 * Defines all event types for dashboard interactions, widget changes, and state updates.
 *
 * @module shared/types/dashboard/dashboard-events
 */

import type { WidgetConfig, DashboardConfig, DashboardPreferences } from './dashboard-base';

/**
 * Dashboard event type discriminator
 */
export type DashboardEventType =
  | 'dashboard.created'
  | 'dashboard.loaded'
  | 'dashboard.configured'
  | 'dashboard.refreshed'
  | 'widget.added'
  | 'widget.removed'
  | 'widget.updated'
  | 'widget.refreshed'
  | 'widget.error'
  | 'preferences.changed'
  | 'filter.applied'
  | 'export.started'
  | 'export.completed'
  | 'error.occurred'
  | 'custom';

/**
 * Base event structure for all dashboard events
 *
 * @example
 * const event: DashboardEvent = {
 *   type: 'widget.updated',
 *   dashboardId: 'dashboard-1',
 *   timestamp: new Date(),
 *   data: { ... }
 * };
 */
export interface DashboardEvent<T = unknown> {
  /** Event type */
  type: DashboardEventType;
  /** Dashboard identifier */
  dashboardId: string;
  /** Event timestamp */
  timestamp: Date;
  /** User who triggered the event */
  userId?: string;
  /** Event-specific data */
  data?: T;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Widget lifecycle events
 */
export interface WidgetAddedEvent extends DashboardEvent<{ widget: WidgetConfig }> {
  type: 'widget.added';
}

export interface WidgetRemovedEvent extends DashboardEvent<{ widgetId: string }> {
  type: 'widget.removed';
}

export interface WidgetUpdatedEvent extends DashboardEvent<{ widgetId: string; config: Partial<WidgetConfig> }> {
  type: 'widget.updated';
}

export interface WidgetRefreshedEvent extends DashboardEvent<{ widgetId: string; data: unknown }> {
  type: 'widget.refreshed';
}

export interface WidgetErrorEvent extends DashboardEvent<{ widgetId: string; error: Error }> {
  type: 'widget.error';
}

/**
 * Dashboard lifecycle events
 */
export interface DashboardCreatedEvent extends DashboardEvent<{ config: DashboardConfig }> {
  type: 'dashboard.created';
}

export interface DashboardLoadedEvent extends DashboardEvent<{ duration: number }> {
  type: 'dashboard.loaded';
}

export interface DashboardConfiguredEvent extends DashboardEvent<{ config: Partial<DashboardConfig> }> {
  type: 'dashboard.configured';
}

export interface DashboardRefreshedEvent extends DashboardEvent<{ duration: number; widgetCount: number }> {
  type: 'dashboard.refreshed';
}

/**
 * User interaction events
 */
export interface PreferencesChangedEvent extends DashboardEvent<{ preferences: Partial<DashboardPreferences> }> {
  type: 'preferences.changed';
}

export interface FilterAppliedEvent extends DashboardEvent<{ filters: Record<string, unknown> }> {
  type: 'filter.applied';
}

export interface ExportStartedEvent extends DashboardEvent<{ format: 'csv' | 'json' | 'pdf'; dataSize: number }> {
  type: 'export.started';
}

export interface ExportCompletedEvent extends DashboardEvent<{ format: 'csv' | 'json' | 'pdf'; fileSize: number; duration: number }> {
  type: 'export.completed';
}

/**
 * Error event
 */
export interface ErrorOccurredEvent extends DashboardEvent<{ error: Error; context?: string }> {
  type: 'error.occurred';
}

/**
 * Custom event for extensions
 */
export interface CustomDashboardEvent extends DashboardEvent<unknown> {
  type: 'custom';
  /** Custom event name for extensibility */
  eventName: string;
}

/**
 * Union type of all dashboard events
 */
export type AnyDashboardEvent =
  | WidgetAddedEvent
  | WidgetRemovedEvent
  | WidgetUpdatedEvent
  | WidgetRefreshedEvent
  | WidgetErrorEvent
  | DashboardCreatedEvent
  | DashboardLoadedEvent
  | DashboardConfiguredEvent
  | DashboardRefreshedEvent
  | PreferencesChangedEvent
  | FilterAppliedEvent
  | ExportStartedEvent
  | ExportCompletedEvent
  | ErrorOccurredEvent
  | CustomDashboardEvent;

/**
 * Event handler callback
 *
 * @example
 * const handler: DashboardEventHandler = (event) => {
 *   console.log(`Event: ${event.type}`);
 * };
 */
export type DashboardEventHandler<T extends DashboardEvent = AnyDashboardEvent> = (event: T) => void | Promise<void>;

/**
 * Event emitter for dashboard events
 *
 * @example
 * const emitter = new DashboardEventEmitter();
 * emitter.on('widget.updated', (event) => {
 *   console.log('Widget updated:', event.data);
 * });
 * emitter.emit({ type: 'widget.updated', ... });
 */
export interface DashboardEventEmitter {
  /** Register event listener */
  on<T extends DashboardEvent>(type: T['type'], handler: DashboardEventHandler<T>): void;
  /** Unregister event listener */
  off<T extends DashboardEvent>(type: T['type'], handler: DashboardEventHandler<T>): void;
  /** Emit event */
  emit<T extends DashboardEvent>(event: T): void | Promise<void>;
  /** Remove all listeners */
  removeAllListeners(): void;
}

/**
 * Event logger for tracking dashboard events
 *
 * @example
 * const logger = createDashboardEventLogger();
 * logger.log(event);
 * const history = logger.getHistory();
 */
export interface DashboardEventLogger {
  /** Log an event */
  log(event: AnyDashboardEvent): void;
  /** Get event history */
  getHistory(type?: DashboardEventType, limit?: number): AnyDashboardEvent[];
  /** Clear event history */
  clear(): void;
  /** Export events as JSON */
  export(format?: 'json' | 'csv'): string;
}

/**
 * Event filter for selective event handling
 *
 * @example
 * const filter: DashboardEventFilter = {
 *   types: ['widget.updated', 'widget.refreshed'],
 *   dashboardIds: ['dashboard-1']
 * };
 */
export interface DashboardEventFilter {
  /** Event types to match */
  types?: DashboardEventType[];
  /** Dashboard IDs to match */
  dashboardIds?: string[];
  /** User IDs to match */
  userIds?: string[];
  /** Time range to match */
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Type guard for widget events
 *
 * @example
 * if (isWidgetEvent(event)) {
 *   // Handle widget event
 * }
 */
export function isWidgetEvent(event: AnyDashboardEvent): event is WidgetAddedEvent | WidgetRemovedEvent | WidgetUpdatedEvent {
  return event.type.startsWith('widget.');
}

/**
 * Type guard for dashboard events
 *
 * @example
 * if (isDashboardEvent(event)) {
 *   // Handle dashboard event
 * }
 */
export function isDashboardEvent(event: AnyDashboardEvent): event is DashboardCreatedEvent | DashboardLoadedEvent {
  return event.type.startsWith('dashboard.');
}

/**
 * Type guard for error events
 *
 * @example
 * if (isErrorEvent(event)) {
 *   // Handle error event
 * }
 */
export function isErrorEvent(event: AnyDashboardEvent): event is WidgetErrorEvent | ErrorOccurredEvent {
  return event.type === 'widget.error' || event.type === 'error.occurred';
}
