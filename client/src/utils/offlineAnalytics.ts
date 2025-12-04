/**
 * Offline Analytics and Error Reporting
 * Tracks offline usage patterns and reports errors for offline-first applications
 */

import { backgroundSyncManager } from './backgroundSyncManager';
import { logger } from './logger';
import { offlineDataManager } from './offlineDataManager';

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
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load any pending analytics from offline storage
      const storedEvents = (await offlineDataManager.getOfflineAnalytics()) as OfflineEvent[];
      if (storedEvents && storedEvents.length > 0) {
        this.events = storedEvents;
        logger.info('Loaded stored analytics events', { component: 'OfflineAnalytics', count: storedEvents.length });
      }

      this.isInitialized = true;
      logger.info('Offline analytics initialized', { component: 'OfflineAnalytics' });
    } catch (error) {
      logger.error('Failed to initialize offline analytics', { component: 'OfflineAnalytics', error });
    }
  }

  // Event tracking
  async trackEvent(type: OfflineEvent['type'], data: Record<string, unknown> = {}): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const event: OfflineEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      session_id: this.session_id,
      connectionType: this.getConnectionType(),
      isOffline: !navigator.onLine,
    };

    this.events.push(event);

    // Store in offline data manager
    await offlineDataManager.logOfflineEvent('analytics_event', event);

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    logger.debug('Offline event tracked', { component: 'OfflineAnalytics', type, id: event.id });
  }

  // Specific event types
  async trackPageView(page: string): Promise<void> {
    await this.trackEvent('page_view', { page });
  }

  async trackUserAction(action: string, details?: Record<string, unknown>): Promise<void> {
    await this.trackEvent('user_action', { action, details });
  }

  async trackApiError(endpoint: string, error: unknown): Promise<void> {
    const e = error as { message?: string; status?: number; retryCount?: number };
    await this.trackEvent('api_error', {
      endpoint,
      error: e.message ?? 'unknown',
      status: e.status,
      retryCount: e.retryCount,
    });
  }

  async trackSyncError(actionId: string, error: unknown): Promise<void> {
    const e = error as { message?: string };
    await this.trackEvent('sync_error', {
      actionId,
      error: e.message ?? 'unknown',
      timestamp: Date.now(),
    });
  }

  async trackConnectionChange(isOnline: boolean, connectionType?: string): Promise<void> {
    await this.trackEvent('connection_change', {
      isOnline,
      connectionType: connectionType || this.getConnectionType(),
      previousState: !isOnline,
    });
  }

  async trackCacheAccess(hit: boolean, key: string): Promise<void> {
    await this.trackEvent(hit ? 'cache_hit' : 'cache_miss', { key });
  }

  // Analytics reporting
  async generateReport(startTime?: number, endTime?: number): Promise<OfflineAnalyticsReport> {
    const start = startTime || this.sessionStart;
    const end = endTime || Date.now();

    const periodEvents = this.events.filter(event =>
      event.timestamp >= start && event.timestamp <= end
    );

    const summary = this.calculateSummary(periodEvents);
    const userJourney = this.analyzeUserJourney(periodEvents);

    return {
      period: { start, end },
      events: periodEvents,
      summary,
      userJourney,
    };
  }

  private calculateSummary(events: OfflineEvent[]) {
    const offlinePeriods = this.calculateOfflinePeriods(events);
    const cacheEvents = events.filter(e => e.type === 'cache_hit' || e.type === 'cache_miss');

    return {
      totalEvents: events.length,
      offlineTime: offlinePeriods.totalOfflineTime,
      onlineTime: (events[events.length - 1]?.timestamp || Date.now()) - (events[0]?.timestamp || Date.now()) - offlinePeriods.totalOfflineTime,
      cacheHits: cacheEvents.filter(e => e.type === 'cache_hit').length,
      cacheMisses: cacheEvents.filter(e => e.type === 'cache_miss').length,
      syncAttempts: events.filter(e => e.type === 'sync_error').length,
      syncSuccesses: 0, // Would need sync success events
      errors: events.filter(e => e.type === 'api_error' || e.type === 'sync_error').length,
    };
  }

  private analyzeUserJourney(events: OfflineEvent[]) {
    const pageViews = events
      .filter(e => e.type === 'page_view')
      .map(e => (e.data.page as string | undefined))
      .filter((page): page is string => typeof page === 'string')
      .filter((page, index, arr) => arr.indexOf(page) === index); // Unique

    const actions = events
      .filter(e => e.type === 'user_action')
      .map(e => (e.data.action as string | undefined))
      .filter((action): action is string => typeof action === 'string')
      .filter((action, index, arr) => arr.indexOf(action) === index); // Unique

    const offlinePeriods = this.calculateOfflinePeriods(events);

    return {
      pagesViewed: pageViews,
      actionsPerformed: actions,
      timeSpentOffline: offlinePeriods.totalOfflineTime,
    };
  }

  private calculateOfflinePeriods(events: OfflineEvent[]) {
    const connectionChanges = events.filter(e => e.type === 'connection_change');
    let totalOfflineTime = 0;
    let lastOfflineStart: number | null = null;

    for (const event of connectionChanges) {
      const d = event.data as Record<string, unknown>;
      const isOnline = typeof d.isOnline === 'boolean' ? (d.isOnline as boolean) : true;
      if (!isOnline && lastOfflineStart === null) {
        lastOfflineStart = event.timestamp;
      } else if (isOnline && lastOfflineStart !== null) {
        totalOfflineTime += event.timestamp - lastOfflineStart;
        lastOfflineStart = null;
      }
    }

    // If still offline at the end
    if (lastOfflineStart !== null) {
      totalOfflineTime += Date.now() - lastOfflineStart;
    }

    return { totalOfflineTime };
  }

  // Error reporting
  async reportError(error: Error, context?: any): Promise<void> {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context: context as Record<string, unknown> | undefined,
      timestamp: Date.now(),
      session_id: this.session_id,
      userAgent: navigator.userAgent,
      url: window.location.href,
      isOffline: !navigator.onLine,
      connectionType: this.getConnectionType(),
    };

    await offlineDataManager.logOfflineEvent('error_report', errorReport);

    // Try to send error report if online
    if (navigator.onLine) {
      try {
        await backgroundSyncManager.queueApiRequest(
          'POST',
          '/api/analytics/errors',
          errorReport,
          'low'
        );
      } catch (syncError) {
        logger.warn('Failed to queue error report', { component: 'OfflineAnalytics', error: syncError });
      }
    }

    logger.error('Error reported', { component: 'OfflineAnalytics', error: error.message, context });
  }

  // Performance tracking
  async trackPerformance(metric: string, value: number, context?: Record<string, unknown>): Promise<void> {
    await this.trackEvent('performance_metric', {
      metric,
      value,
      context,
    });
  }

  // Data export
  async exportAnalytics(): Promise<string> {
    const report = await this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  // Cleanup
  async clearAnalytics(): Promise<void> {
    this.events = [];
    await offlineDataManager.logOfflineEvent('analytics_cleared', {
      timestamp: Date.now(),
      session_id: this.session_id,
    });
    logger.info('Analytics cleared', { component: 'OfflineAnalytics' });
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getConnectionType(): string {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  // Get current session info
  getSessionInfo() {
    return {
      session_id: this.session_id,
      sessionStart: this.sessionStart,
      eventCount: this.events.length,
      isOffline: !navigator.onLine,
    };
  }
}

// Global instance
export const offlineAnalytics = new OfflineAnalyticsManager();

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineAnalytics.initialize().catch(error => {
    logger.error('Failed to initialize offline analytics', { component: 'OfflineAnalytics', error });
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    offlineAnalytics.trackEvent('visibility_change', {
      hidden: document.hidden,
      visibilityState: document.visibilityState,
    });
  });

  // Track connection changes
  window.addEventListener('online', () => {
    offlineAnalytics.trackConnectionChange(true);
  });

  window.addEventListener('offline', () => {
    offlineAnalytics.trackConnectionChange(false);
  });
}

