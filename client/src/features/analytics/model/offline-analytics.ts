/**
 * Offline Analytics - Analytics Feature
 *
 * Tracks offline usage patterns and reports errors for offline-first applications
 */

export interface OfflineEvent {
  id: string;
  type: 'page_view' | 'user_action' | 'api_error' | 'sync_error' | 'connection_change' | 'cache_hit' | 'cache_miss' | 'performance_metric' | 'visibility_change';
  timestamp: number;
  data: Record<string, unknown>;
  userAgent: string;
  url: string;
  session_id: string;
  connectionType?: string;
  isOffline: boolean;
}

export interface OfflineAnalyticsReport {
  period: {
    start: number;
    end: number;
  };
  events: OfflineEvent[];
  summary: {
    totalEvents: number;
    offlineTime: number;
    onlineTime: number;
    cacheHits: number;
    cacheMisses: number;
    syncAttempts: number;
    syncSuccesses: number;
    errors: number;
  };
  userJourney: {
    pagesViewed: string[];
    actionsPerformed: string[];
    timeSpentOffline: number;
  };
}

class OfflineAnalyticsManager {
  private session_id: string;
  private sessionStart: number;
  private events: OfflineEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.session_id = this.generateSessionId();
    this.sessionStart = Date.now();
    this.initialize();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Track connection changes
    window.addEventListener('online', () => {
      this.trackEvent('connection_change', { status: 'online' });
    });

    window.addEventListener('offline', () => {
      this.trackEvent('connection_change', { status: 'offline' });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
    });

    this.isInitialized = true;
  }

  trackEvent(type: OfflineEvent['type'], data: Record<string, unknown> = {}): void {
    const event: OfflineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      session_id: this.session_id,
      connectionType: (navigator as any).connection?.effectiveType,
      isOffline: !navigator.onLine
    };

    this.events.push(event);
    this.persistEvent(event);
  }

  private persistEvent(event: OfflineEvent): void {
    try {
      const stored = localStorage.getItem('offline-analytics') || '[]';
      const events = JSON.parse(stored);
      events.push(event);

      // Keep only last 1000 events to prevent storage overflow
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }

      localStorage.setItem('offline-analytics', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to persist analytics event:', error);
    }
  }

  generateReport(startTime?: number, endTime?: number): OfflineAnalyticsReport {
    const start = startTime || this.sessionStart;
    const end = endTime || Date.now();

    const filteredEvents = this.events.filter(
      event => event.timestamp >= start && event.timestamp <= end
    );

    const summary = this.calculateSummary(filteredEvents);
    const userJourney = this.calculateUserJourney(filteredEvents);

    return {
      period: { start, end },
      events: filteredEvents,
      summary,
      userJourney
    };
  }

  private calculateSummary(events: OfflineEvent[]) {
    return {
      totalEvents: events.length,
      offlineTime: events.filter(e => e.isOffline).length * 1000, // Rough estimate
      onlineTime: events.filter(e => !e.isOffline).length * 1000,
      cacheHits: events.filter(e => e.type === 'cache_hit').length,
      cacheMisses: events.filter(e => e.type === 'cache_miss').length,
      syncAttempts: events.filter(e => e.type === 'sync_error').length,
      syncSuccesses: 0, // Would need to track successful syncs
      errors: events.filter(e => e.type === 'api_error' || e.type === 'sync_error').length
    };
  }

  private calculateUserJourney(events: OfflineEvent[]) {
    const pageViews = events.filter(e => e.type === 'page_view');
    const actions = events.filter(e => e.type === 'user_action');
    const offlineEvents = events.filter(e => e.isOffline);

    return {
      pagesViewed: [...new Set(pageViews.map(e => e.url))],
      actionsPerformed: actions.map(e => e.data.action as string).filter(Boolean),
      timeSpentOffline: offlineEvents.length > 0 ?
        Math.max(...offlineEvents.map(e => e.timestamp)) - Math.min(...offlineEvents.map(e => e.timestamp)) : 0
    };
  }

  clearEvents(): void {
    this.events = [];
    localStorage.removeItem('offline-analytics');
  }
}

export const offlineAnalyticsManager = new OfflineAnalyticsManager();
