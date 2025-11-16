/**
 * Privacy-Focused Analytics Service
 * Analytics with user consent and privacy protection
 */                                                                                

import { logger } from '../utils/logger';
import { privacyUtils } from '../utils/privacy-compliance';
import { privacyAnalyticsApiService } from '../core/api/privacy';

interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  sessionId: string;
  userId?: string;
  anonymized: boolean;
  consentGiven: boolean;
  metadata?: Record<string, any>;
}

interface AnalyticsConfig {
  enabledCategories: string[];
  anonymizeData: boolean;
  respectDoNotTrack: boolean;
  consentRequired: boolean;
  retentionDays: number;
  batchSize: number;
  flushInterval: number; // milliseconds
}

interface UserConsent {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  timestamp: string;
  version: string;
}

interface AnalyticsMetrics {
  totalEvents: number;
  anonymizedEvents: number;
  consentedEvents: number;
  categoriesTracked: string[];
  retentionCompliance: boolean;
  lastFlush: string;
}

class PrivacyAnalyticsService {
  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private userConsent: UserConsent | null = null;
  private sessionId: string;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabledCategories: ['navigation', 'engagement', 'performance', 'errors'],
      anonymizeData: true,
      respectDoNotTrack: true,
      consentRequired: true,
      retentionDays: 730, // 2 years
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
    };

    this.sessionId = this.generateSessionId();
    this.loadUserConsent();
    this.startFlushTimer();

    // Listen for consent changes
    window.addEventListener('privacy-consent-updated', this.handleConsentUpdate.bind(this));
  }

  /**
   * Initializes analytics with user consent
   */
  initialize(consent?: UserConsent): void {
    if (consent) {
      this.userConsent = consent;
      this.saveUserConsent(consent);
    }

    // Check Do Not Track header
    if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
      logger.info('Analytics disabled due to Do Not Track', {
        component: 'PrivacyAnalyticsService',
      });
      return;
    }

    logger.info('Privacy analytics initialized', {
      component: 'PrivacyAnalyticsService',
      consent: this.userConsent,
      sessionId: this.sessionId,
    });
  }

  /**
   * Tracks an analytics event with privacy protection
   */
  track(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    // Check if category is enabled
    if (!this.config.enabledCategories.includes(category)) {
      return;
    }

    // Check consent requirements
    const consentGiven = this.hasConsentForCategory(category);
    if (this.config.consentRequired && !consentGiven) {
      return;
    }

    // Create event
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      type: 'track',
      category,
      action,
      label,
      value,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      anonymized: this.config.anonymizeData,
      consentGiven,
      metadata: this.config.anonymizeData ? this.anonymizeMetadata(metadata) : metadata,
    };

    // Anonymize user ID if required
    if (this.config.anonymizeData && event.userId) {
      event.userId = privacyUtils.hashValue(event.userId);
    }

    this.eventQueue.push(event);

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }

    logger.debug('Analytics event tracked', {
      component: 'PrivacyAnalyticsService',
      category,
      action,
      consentGiven,
      anonymized: event.anonymized,
    });
  }

  /**
   * Tracks page view with privacy protection
   */
  trackPageView(path: string, title?: string, metadata?: Record<string, any>): void {
    this.track('navigation', 'page_view', path, undefined, {
      title,
      ...metadata,
    });
  }

  /**
   * Tracks user engagement events
   */
  trackEngagement(action: string, target: string, metadata?: Record<string, any>): void {
    this.track('engagement', action, target, undefined, metadata);
  }

  /**
   * Tracks performance metrics
   */
  trackPerformance(metric: string, value: number, metadata?: Record<string, any>): void {
    if (!this.hasConsentForCategory('performance')) {
      return;
    }

    this.track('performance', metric, undefined, value, metadata);
  }

  /**
   * Tracks errors with privacy protection
   */
  trackError(error: Error, context?: Record<string, any>): void {
    const sanitizedContext = this.sanitizeErrorContext(context);
    
    this.track('errors', 'javascript_error', error.name, undefined, {
      message: error.message,
      stack: this.config.anonymizeData ? '[REDACTED]' : error.stack,
      ...sanitizedContext,
    });
  }

  /**
   * Updates user consent
   */
  updateConsent(consent: Partial<UserConsent>): void {
    this.userConsent = {
      ...this.userConsent,
      ...consent,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    } as UserConsent;

    this.saveUserConsent(this.userConsent);

    // Dispatch consent update event
    window.dispatchEvent(new CustomEvent('privacy-consent-updated', {
      detail: this.userConsent,
    }));

    logger.info('Analytics consent updated', {
      component: 'PrivacyAnalyticsService',
      consent: this.userConsent,
    });
  }

  /**
   * Withdraws all consent and clears data
   */
  withdrawConsent(): void {
    this.userConsent = {
      analytics: false,
      performance: false,
      functional: false,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    this.saveUserConsent(this.userConsent);
    this.clearStoredData();

    logger.info('Analytics consent withdrawn', {
      component: 'PrivacyAnalyticsService',
    });
  }

  /**
   * Exports user's analytics data
   */
  async exportUserData(userId: string): Promise<{
    events: AnalyticsEvent[];
    summary: AnalyticsMetrics;
    consent: UserConsent | null;
  }> {
    // In production, this would query the analytics database
    const userEvents = this.eventQueue.filter(event => 
      event.userId === userId || 
      (this.config.anonymizeData && event.userId === privacyUtils.hashValue(userId))
    );

    const summary = this.getAnalyticsMetrics();

    return {
      events: userEvents,
      summary,
      consent: this.userConsent,
    };
  }

  /**
   * Deletes user's analytics data
   */
  async deleteUserData(userId: string): Promise<{
    eventsDeleted: number;
    success: boolean;
  }> {
    const userEvents = this.eventQueue.filter(event => 
      event.userId === userId || 
      (this.config.anonymizeData && event.userId === privacyUtils.hashValue(userId))
    );

    const eventsDeleted = userEvents.length;

    // Remove from queue
    this.eventQueue = this.eventQueue.filter(event => 
      event.userId !== userId && 
      !(this.config.anonymizeData && event.userId === privacyUtils.hashValue(userId))
    );

    logger.info('User analytics data deleted', {
      component: 'PrivacyAnalyticsService',
      userId: this.config.anonymizeData ? privacyUtils.hashValue(userId) : userId,
      eventsDeleted,
    });

    return {
      eventsDeleted,
      success: true,
    };
  }

  /**
   * Gets analytics metrics for transparency
   */
  getAnalyticsMetrics(): AnalyticsMetrics {
    const totalEvents = this.eventQueue.length;
    const anonymizedEvents = this.eventQueue.filter(e => e.anonymized).length;
    const consentedEvents = this.eventQueue.filter(e => e.consentGiven).length;
    const categoriesTracked = [...new Set(this.eventQueue.map(e => e.category))];

    return {
      totalEvents,
      anonymizedEvents,
      consentedEvents,
      categoriesTracked,
      retentionCompliance: this.checkRetentionCompliance(),
      lastFlush: this.getLastFlushTime(),
    };
  }

  /**
   * Flushes queued events to analytics backend
   */
  private flush(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // In production, this would send events to analytics backend
    this.sendEventsToBackend(events);

    logger.debug('Analytics events flushed', {
      component: 'PrivacyAnalyticsService',
      eventCount: events.length,
    });
  }

  /**
   * Sends events to analytics backend
   */
  private async sendEventsToBackend(events: AnalyticsEvent[]): Promise<void> {
    try {
      await privacyAnalyticsApiService.sendEvents(events);

      logger.debug('Events sent to analytics backend', {
        component: 'PrivacyAnalyticsService',
        eventCount: events.length,
      });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);

      logger.error('Failed to send analytics events', {
        component: 'PrivacyAnalyticsService',
        error,
        eventCount: events.length,
      });
    }
  }

  /**
   * Checks if user has consent for a specific category
   */
  private hasConsentForCategory(category: string): boolean {
    if (!this.userConsent) {
      return false;
    }

    switch (category) {
      case 'navigation':
      case 'engagement':
      case 'errors':
        return this.userConsent.analytics;
      case 'performance':
        return this.userConsent.performance;
      case 'functional':
        return this.userConsent.functional;
      default:
        return this.userConsent.analytics;
    }
  }

  /**
   * Anonymizes metadata to protect privacy
   */
  private anonymizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) {
      return undefined;
    }

    const anonymized = { ...metadata };
    const sensitiveFields = ['email', 'name', 'phone', 'address', 'ip', 'userId'];

    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = privacyUtils.hashValue(String(anonymized[field]));
      }
    }

    return anonymized;
  }

  /**
   * Sanitizes error context to remove sensitive information
   */
  private sanitizeErrorContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized = { ...context };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.apiKey;
    delete sanitized.secret;

    // Anonymize user identifiers
    if (sanitized.userId) {
      sanitized.userId = privacyUtils.hashValue(sanitized.userId);
    }

    return sanitized;
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Gets current user ID (would be from auth context in production)
   */
  private getCurrentUserId(): string | undefined {
    // In production, this would get the user ID from auth context
    return undefined;
  }

  /**
   * Loads user consent from storage
   */
  private loadUserConsent(): void {
    try {
      const stored = localStorage.getItem('analytics-consent');
      if (stored) {
        this.userConsent = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Failed to load analytics consent', {
        component: 'PrivacyAnalyticsService',
        error,
      });
    }
  }

  /**
   * Saves user consent to storage
   */
  private saveUserConsent(consent: UserConsent): void {
    try {
      localStorage.setItem('analytics-consent', JSON.stringify(consent));
    } catch (error) {
      logger.error('Failed to save analytics consent', {
        component: 'PrivacyAnalyticsService',
        error,
      });
    }
  }

  /**
   * Clears all stored analytics data
   */
  private clearStoredData(): void {
    this.eventQueue = [];
    localStorage.removeItem('analytics-consent');
    localStorage.removeItem('analytics-session');
  }

  /**
   * Handles consent update events
   */
  private handleConsentUpdate(event: Event): void {
    const consent = (event as CustomEvent<UserConsent>).detail;
    this.userConsent = consent;
  }

  /**
   * Starts the flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stops the flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Checks retention compliance
   */
  private checkRetentionCompliance(): boolean {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - this.config.retentionDays);

    const expiredEvents = this.eventQueue.filter(event => 
      new Date(event.timestamp) < retentionCutoff
    );

    return expiredEvents.length === 0;
  }

  /**
   * Gets last flush time
   */
  private getLastFlushTime(): string {
    return localStorage.getItem('analytics-last-flush') || new Date().toISOString();
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flush(); // Final flush
    window.removeEventListener('privacy-consent-updated', this.handleConsentUpdate.bind(this));
  }
}

// Export singleton instance
export const privacyAnalyticsService = new PrivacyAnalyticsService();

/**
 * Utility functions for privacy analytics
 */
export const analyticsUtils = {
  /**
   * Creates a privacy-safe event tracker
   */
  createTracker(category: string) {
    return {
      track: (action: string, label?: string, value?: number, metadata?: Record<string, any>) => {
        privacyAnalyticsService.track(category, action, label, value, metadata);
      },
    };
  },

  /**
   * Checks if analytics is enabled
   */
  isAnalyticsEnabled(): boolean {
    const consent = localStorage.getItem('analytics-consent');
    if (!consent) return false;

    try {
      const parsed = JSON.parse(consent);
      return parsed.analytics === true;
    } catch {
      return false;
    }
  },

  /**
   * Gets consent status for display
   */
  getConsentStatus(): {
    analytics: boolean;
    performance: boolean;
    functional: boolean;
    timestamp?: string;
  } {
    const consent = localStorage.getItem('analytics-consent');
    if (!consent) {
      return {
        analytics: false,
        performance: false,
        functional: false,
      };
    }

    try {
      return JSON.parse(consent);
    } catch {
      return {
        analytics: false,
        performance: false,
        functional: false,
      };
    }
  },
};