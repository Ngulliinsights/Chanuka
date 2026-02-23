/**
 * Navigation Analytics Module
 *
 * Handles navigation event tracking and analytics
 */

import { NavigationItem } from '@client/lib/types/navigation';
import { logger } from '@client/lib/utils/logger';


/**
 * Navigation event types for analytics tracking
 */
export type NavigationEvent = 'page_view' | 'navigation_click' | 'search' | 'command_palette';

/**
 * Navigation event data structure
 */
export interface NavigationEventData {
  path?: string;
  item?: NavigationItem;
  query?: string;
  source?: string;
  timestamp?: string;
  userAgent?: string;
  referrer?: string;
}

/**
 * Tracks navigation events for analytics
 */
export function trackNavigationEvent(event: NavigationEvent, data: NavigationEventData): void {
  try {
    const eventData = {
      event,
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      userAgent: data.userAgent || navigator.userAgent,
      referrer: data.referrer || document.referrer,
    };

    logger.info('Navigation event', eventData);

    // Here you could integrate with analytics services
    // Example: analytics.track(event, eventData);

    // Store in session for analytics aggregation
    storeNavigationEvent(eventData);
  } catch (error) {
    logger.error('Failed to track navigation event', { error, event, data });
  }
}

/**
 * Stores navigation event in session storage for analytics
 */
function storeNavigationEvent(eventData: NavigationEventData & { event: NavigationEvent }): void {
  try {
    const sessionKey = 'navigation-analytics';
    const existing = sessionStorage.getItem(sessionKey);
    const events = existing ? JSON.parse(existing) : [];

    events.push(eventData);

    // Keep only last 100 events to prevent storage bloat
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    sessionStorage.setItem(sessionKey, JSON.stringify(events));
  } catch (error) {
    logger.warn('Failed to store navigation event', { error, eventData });
  }
}

/**
 * Gets navigation analytics data from session
 */
export function getNavigationAnalytics(): Array<NavigationEventData & { event: NavigationEvent }> {
  try {
    const sessionKey = 'navigation-analytics';
    const stored = sessionStorage.getItem(sessionKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    logger.warn('Failed to retrieve navigation analytics', { error });
    return [];
  }
}

/**
 * Clears navigation analytics data
 */
export function clearNavigationAnalytics(): void {
  try {
    sessionStorage.removeItem('navigation-analytics');
  } catch (error) {
    logger.warn('Failed to clear navigation analytics', { error });
  }
}
