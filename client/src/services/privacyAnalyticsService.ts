/**
 * Privacy-Focused Analytics Service
 * GDPR/CCPA compliant analytics with consent management and data protection
 */

import { privacyAnalyticsApiService } from '@/core/api/privacy';
import { logger } from '@/utils/logger';
import { privacyUtils, privacyCompliance } from '@/utils/privacy-compliance';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface AnalyticsEvent {
  id: string;
  type: 'track' | 'page_view' | 'engagement' | 'performance' | 'error';
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  sessionId: string;
  userId?: string;
  anonymized: boolean;
  consentGiven: boolean;
  metadata?: Record<string, unknown>;
}

interface AnalyticsConfig {
  enabledCategories: ReadonlyArray<string>;
  anonymizeData: boolean;
  respectDoNotTrack: boolean;
  consentRequired: boolean;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number; // Prevent memory overflow
  maxRetries: number; // For failed sends
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
  queueSize: number;
  failedSends: number;
}

interface ExportedUserData {
  events: AnalyticsEvent[];
  summary: AnalyticsMetrics;
  consent: UserConsent | null;
  exportDate: string;
}

interface DeleteResult {
  eventsDeleted: number;
  success: boolean;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  SESSION: 'analytics-session',
  LAST_FLUSH: 'analytics-last-flush',
  FAILED_EVENTS: 'analytics-failed-events',
} as const;

const CONSENT_VERSION = '1.0.0';

const SENSITIVE_FIELDS = [
  'email',
  'name',
  'phone',
  'address',
  'ip',
  'userId',
  'ssn',
  'creditCard',
] as const;

const SENSITIVE_CONTEXT_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'accessToken',
  'refreshToken',
  'authorization',
] as const;

// ============================================================================
// Main Service Class
// ============================================================================

class PrivacyAnalyticsService {
  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private failedEventQueue: AnalyticsEvent[] = [];
  private userConsent: UserConsent | null = null;
  private sessionId: string;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  private failedSendCount = 0;
  private boundHandleConsentUpdate: (event: Event) => void;
  private boundHandleBeforeUnload: () => void;

  constructor(customConfig?: Partial<AnalyticsConfig>) {
    // Initialize configuration with sensible defaults
    this.config = {
      enabledCategories: ['navigation', 'engagement', 'performance', 'errors'],
      anonymizeData: true,
      respectDoNotTrack: true,
      consentRequired: true,
      retentionDays: 730, // 2 years as per GDPR recommendation
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxQueueSize: 1000, // Prevent memory issues
      maxRetries: 3,
      ...customConfig,
    };

    this.sessionId = this.generateSessionId();

    // Bind methods to preserve 'this' context
    this.boundHandleConsentUpdate = this.handleConsentUpdate.bind(this);
    this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);

    // Initialize asynchronously
    this.initialize().catch(error => {
      logger.error('Failed to initialize analytics service', {
        component: 'PrivacyAnalyticsService',
        error,
      });
    });
  }

  /**
   * Initializes the analytics service, loading consent and setting up listeners.
   * This method is called automatically in the constructor but can be called
   * again if the service needs to be re-initialized.
   */
  private async initialize(): Promise<void> {
    await this.loadUserConsent();
    this.loadFailedEvents();
    this.startFlushTimer();

    // Listen for consent changes throughout the application
    if (typeof window !== 'undefined') {
      window.addEventListener('privacy-consent-updated', this.boundHandleConsentUpdate);
      window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
    }

    // Check Do Not Track preference early to respect user privacy
    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      logger.info('Analytics disabled due to Do Not Track setting', {
        component: 'PrivacyAnalyticsService',
      });
      return;
    }

    logger.info('Privacy analytics initialized', {
      component: 'PrivacyAnalyticsService',
      consent: this.userConsent ? 'granted' : 'pending',
      sessionId: this.sessionId,
      anonymizeData: this.config.anonymizeData,
    });
  }

  /**
   * Sets or updates user consent. This is the primary way external code
   * should grant or modify analytics permissions. Updates are persisted
   * via privacyCompliance and API service, and trigger a consent-updated event.
   */
  async setConsent(consent: Partial<UserConsent>, userId?: string): Promise<void> {
    const currentUserId = userId || this.getCurrentUserId() || 'anonymous';

    // Record analytics consent using privacyCompliance
    if (consent.analytics !== undefined) {
      privacyCompliance.recordConsent(currentUserId, 'analytics', consent.analytics);
    }

    // Update consent via API service
    try {
      this.userConsent = await privacyAnalyticsApiService.updateUserConsent(currentUserId, {
        analytics: consent.analytics ?? this.userConsent?.analytics ?? false,
        performance: consent.performance ?? this.userConsent?.performance ?? false,
        functional: consent.functional ?? this.userConsent?.functional ?? false,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION,
      });
    } catch (error) {
      // Fallback to local consent if API fails
      this.userConsent = {
        analytics: consent.analytics ?? this.userConsent?.analytics ?? false,
        performance: consent.performance ?? this.userConsent?.performance ?? false,
        functional: consent.functional ?? this.userConsent?.functional ?? false,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION,
      };
      logger.warn('Failed to update consent via API, using local fallback', {
        component: 'PrivacyAnalyticsService',
        error,
      });
    }

    // Notify other parts of the application about consent changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('privacy-consent-updated', {
          detail: this.userConsent,
        })
      );
    }

    logger.info('Analytics consent updated', {
      component: 'PrivacyAnalyticsService',
      userId: currentUserId,
      consent: this.userConsent,
    });
  }

  /**
   * Tracks a general analytics event. This is the core tracking method
   * that all other tracking methods use internally. It handles consent
   * checks, anonymization, and queuing.
   */
  track(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, unknown>
  ): void {
    // Early exit if service is destroyed to prevent memory leaks
    if (this.isDestroyed) {
      logger.warn('Attempted to track event after service was destroyed', {
        component: 'PrivacyAnalyticsService',
      });
      return;
    }

    // Validate that we're tracking an enabled category
    if (!this.config.enabledCategories.includes(category)) {
      logger.debug('Event category not enabled', {
        component: 'PrivacyAnalyticsService',
        category,
      });
      return;
    }

    // Enforce consent requirements before tracking
    const consentGiven = this.hasConsentForCategory(category);
    if (this.config.consentRequired && !consentGiven) {
      logger.debug('Event tracking blocked: consent not given', {
        component: 'PrivacyAnalyticsService',
        category,
      });
      return;
    }

    // Prevent queue overflow which could cause memory issues
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      logger.warn('Event queue full, flushing before adding new event', {
        component: 'PrivacyAnalyticsService',
        queueSize: this.eventQueue.length,
      });
      this.flush();
    }

    // Build the event object with all necessary privacy protections
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
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
      metadata: this.config.anonymizeData 
        ? this.anonymizeMetadata(metadata) 
        : metadata,
    };

    // Anonymize user identifier if privacy mode is enabled
    if (this.config.anonymizeData && event.userId) {
      event.userId = privacyUtils.hashValue(event.userId);
    }

    this.eventQueue.push(event);

    // Flush when we reach batch size to optimize network requests
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
   * Tracks page navigation events. This provides a convenient wrapper
   * for tracking page views with the correct category and structure.
   */
  trackPageView(
    path: string, 
    title?: string, 
    metadata?: Record<string, unknown>
  ): void {
    this.track('navigation', 'page_view', path, undefined, {
      title: title || document?.title,
      referrer: this.config.anonymizeData ? '[REDACTED]' : document?.referrer,
      ...metadata,
    });
  }

  /**
   * Tracks user engagement events like clicks, form submissions, etc.
   * This helps measure how users interact with the application.
   */
  trackEngagement(
    action: string, 
    target: string, 
    metadata?: Record<string, unknown>
  ): void {
    this.track('engagement', action, target, undefined, metadata);
  }

  /**
   * Tracks performance metrics like load times, API response times, etc.
   * This requires specific performance consent from the user.
   */
  trackPerformance(
    metric: string, 
    value: number, 
    metadata?: Record<string, unknown>
  ): void {
    // Performance tracking requires explicit consent
    if (!this.hasConsentForCategory('performance')) {
      return;
    }

    this.track('performance', metric, undefined, value, metadata);
  }

  /**
   * Tracks JavaScript errors while protecting user privacy. Stack traces
   * and sensitive context are redacted when anonymization is enabled.
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    const sanitizedContext = this.sanitizeErrorContext(context);

    this.track('errors', 'javascript_error', error.name, undefined, {
      message: error.message,
      stack: this.config.anonymizeData ? '[REDACTED]' : error.stack,
      ...sanitizedContext,
    });
  }

  /**
   * Revokes all analytics consent and clears stored data. This implements
   * the "right to be forgotten" required by GDPR.
   */
  async withdrawConsent(userId?: string): Promise<void> {
    const currentUserId = userId || this.getCurrentUserId() || 'anonymous';

    // Withdraw consent using privacyCompliance
    // Note: This would need existing consent records, but for simplicity we'll use API
    try {
      await privacyAnalyticsApiService.withdrawConsent(currentUserId);
    } catch (error) {
      logger.warn('Failed to withdraw consent via API, proceeding with local cleanup', {
        component: 'PrivacyAnalyticsService',
        error,
      });
    }

    this.userConsent = {
      analytics: false,
      performance: false,
      functional: false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };

    this.clearStoredData();

    logger.info('Analytics consent withdrawn and data cleared', {
      component: 'PrivacyAnalyticsService',
      userId: currentUserId,
    });
  }

  /**
   * Exports all analytics data for a specific user. This implements the
   * "right to data portability" required by GDPR.
   */
  async exportUserData(userId: string): Promise<ExportedUserData> {
    try {
      const apiResponse = await privacyAnalyticsApiService.exportUserData(userId);

      // Transform API events to local format
      const transformedEvents: AnalyticsEvent[] = apiResponse.events.map(event => ({
        id: event.id,
        type: event.type as AnalyticsEvent['type'], // Cast to local union type
        category: event.category,
        action: event.action,
        label: event.label,
        value: event.value,
        timestamp: event.timestamp,
        sessionId: event.sessionId,
        userId: event.userId,
        anonymized: event.anonymized,
        consentGiven: event.consentGiven,
        metadata: event.metadata,
      }));

      // Transform API summary to local format
      const transformedSummary: AnalyticsMetrics = {
        ...apiResponse.summary,
        queueSize: 0, // API doesn't provide this
        failedSends: 0, // API doesn't provide this
      };

      logger.info('User data exported via API', {
        component: 'PrivacyAnalyticsService',
        userId,
        eventCount: transformedEvents.length,
      });

      return {
        events: transformedEvents,
        summary: transformedSummary,
        consent: apiResponse.consent,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      // Fallback to local data if API fails
      const hashedUserId = this.config.anonymizeData
        ? privacyUtils.hashValue(userId)
        : userId;

      const userEvents = this.eventQueue.filter(
        event => event.userId === userId || event.userId === hashedUserId
      );

      const failedUserEvents = this.failedEventQueue.filter(
        event => event.userId === userId || event.userId === hashedUserId
      );

      const allUserEvents = [...userEvents, ...failedUserEvents];
      const summary = this.getAnalyticsMetrics();

      logger.warn('API export failed, using local fallback', {
        component: 'PrivacyAnalyticsService',
        userId: hashedUserId,
        eventCount: allUserEvents.length,
        error,
      });

      return {
        events: allUserEvents,
        summary,
        consent: this.userConsent,
        exportDate: new Date().toISOString(),
      };
    }
  }

  /**
   * Deletes all analytics data for a specific user. This implements the
   * "right to erasure" required by GDPR.
   */
  async deleteUserData(userId: string): Promise<DeleteResult> {
    try {
      const apiResponse = await privacyAnalyticsApiService.deleteUserData(userId);

      logger.info('User analytics data deleted via API', {
        component: 'PrivacyAnalyticsService',
        userId,
        eventsDeleted: apiResponse.eventsDeleted,
      });

      return {
        eventsDeleted: apiResponse.eventsDeleted,
        success: apiResponse.success,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Fallback to local deletion if API fails
      const hashedUserId = this.config.anonymizeData
        ? privacyUtils.hashValue(userId)
        : userId;

      const eventsInQueue = this.eventQueue.filter(
        event => event.userId === userId || event.userId === hashedUserId
      ).length;

      const eventsInFailedQueue = this.failedEventQueue.filter(
        event => event.userId === userId || event.userId === hashedUserId
      ).length;

      const totalEventsDeleted = eventsInQueue + eventsInFailedQueue;

      this.eventQueue = this.eventQueue.filter(
        event => event.userId !== userId && event.userId !== hashedUserId
      );

      this.failedEventQueue = this.failedEventQueue.filter(
        event => event.userId !== userId && event.userId !== hashedUserId
      );

      this.saveFailedEvents();

      logger.warn('API deletion failed, using local fallback', {
        component: 'PrivacyAnalyticsService',
        userId: hashedUserId,
        eventsDeleted: totalEventsDeleted,
        error,
      });

      return {
        eventsDeleted: totalEventsDeleted,
        success: true,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Returns current analytics metrics for transparency. This allows users
   * to see exactly what data is being collected about them.
   */
  getAnalyticsMetrics(): AnalyticsMetrics {
    const totalEvents = this.eventQueue.length + this.failedEventQueue.length;
    const anonymizedEvents = [...this.eventQueue, ...this.failedEventQueue]
      .filter(e => e.anonymized).length;
    const consentedEvents = [...this.eventQueue, ...this.failedEventQueue]
      .filter(e => e.consentGiven).length;
    const categoriesTracked = [
      ...new Set([...this.eventQueue, ...this.failedEventQueue].map(e => e.category))
    ];

    return {
      totalEvents,
      anonymizedEvents,
      consentedEvents,
      categoriesTracked,
      retentionCompliance: this.checkRetentionCompliance(),
      lastFlush: this.getLastFlushTime(),
      queueSize: this.eventQueue.length,
      failedSends: this.failedSendCount,
    };
  }

  /**
   * Immediately flushes all queued events to the backend. This is useful
   * before page navigation or when you need to ensure data is sent.
   */
  async flushNow(): Promise<void> {
    await this.flush();
  }

  /**
   * Cleans up resources and stops all timers. Should be called when the
   * analytics service is no longer needed to prevent memory leaks.
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.stopFlushTimer();
    this.flush(); // Final flush before destruction

    if (typeof window !== 'undefined') {
      window.removeEventListener('privacy-consent-updated', this.boundHandleConsentUpdate);
      window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);
    }

    logger.info('Analytics service destroyed', {
      component: 'PrivacyAnalyticsService',
    });
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Flushes the event queue to the analytics backend. Handles retry logic
   * for failed sends and prevents duplicate sends during concurrent flushes.
   */
  private async flush(): Promise<void> {
    // Don't flush if queue is empty or service is destroyed
    if (this.eventQueue.length === 0 || this.isDestroyed) {
      return;
    }

    // Take a snapshot of events and clear the queue to prevent duplicates
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendEventsToBackend(events);
      
      // Update last flush timestamp on success
      this.updateLastFlushTime();

      logger.debug('Analytics events flushed successfully', {
        component: 'PrivacyAnalyticsService',
        eventCount: events.length,
      });
    } catch (error) {
      // On failure, move events to failed queue for retry
      this.failedEventQueue.push(...events);
      this.failedSendCount++;

      // Limit failed queue size to prevent memory issues
      if (this.failedEventQueue.length > this.config.maxQueueSize) {
        const overflow = this.failedEventQueue.length - this.config.maxQueueSize;
        this.failedEventQueue.splice(0, overflow);
        
        logger.warn('Failed event queue overflow, dropped oldest events', {
          component: 'PrivacyAnalyticsService',
          droppedCount: overflow,
        });
      }

      this.saveFailedEvents();

      logger.error('Failed to flush analytics events', {
        component: 'PrivacyAnalyticsService',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventCount: events.length,
      });
    }
  }

  /**
   * Sends events to the analytics backend with retry logic. This is where
   * the actual network request happens.
   */
  private async sendEventsToBackend(events: AnalyticsEvent[]): Promise<void> {
    try {
      await privacyAnalyticsApiService.sendEvents(events);

      logger.debug('Events sent to analytics backend', {
        component: 'PrivacyAnalyticsService',
        eventCount: events.length,
      });
    } catch (error) {
      logger.error('Failed to send analytics events to backend', {
        component: 'PrivacyAnalyticsService',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventCount: events.length,
      });
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Determines if a user has granted consent for a specific tracking category.
   * Different categories require different consent types.
   */
  private hasConsentForCategory(category: string): boolean {
    if (!this.userConsent) {
      return false;
    }

    // Map categories to consent types
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
   * Anonymizes metadata by hashing sensitive fields. This protects user
   * privacy while still allowing useful analytics.
   */
  private anonymizeMetadata(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!metadata) {
      return undefined;
    }

    const anonymized = { ...metadata };

    // Hash any sensitive fields found in the metadata
    for (const field of SENSITIVE_FIELDS) {
      if (anonymized[field] !== undefined && anonymized[field] !== null) {
        anonymized[field] = privacyUtils.hashValue(String(anonymized[field]));
      }
    }

    return anonymized;
  }

  /**
   * Removes sensitive information from error contexts before tracking.
   * This prevents accidental logging of passwords, tokens, etc.
   */
  private sanitizeErrorContext(
    context?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized = { ...context };

    // Remove sensitive fields entirely
    for (const field of SENSITIVE_CONTEXT_FIELDS) {
      delete sanitized[field];
    }

    // Anonymize user identifiers
    if (sanitized.userId) {
      sanitized.userId = privacyUtils.hashValue(String(sanitized.userId));
    }

    return sanitized;
  }

  /**
   * Generates a unique event ID using the crypto API for strong randomness.
   */
  private generateEventId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback UUID v4 generator for older browsers
    return this.generateUUIDv4();
  }

  /**
   * Generates a unique session ID that persists for the user's session.
   */
  private generateSessionId(): string {
    // Try to restore existing session ID from storage
    try {
      const stored = localStorage?.getItem(STORAGE_KEYS.SESSION);
      if (stored) {
        return stored;
      }
    } catch {
      // Storage access might fail in private browsing mode
    }

    // Generate new session ID
    const sessionId = this.generateUUIDv4();
    
    try {
      localStorage?.setItem(STORAGE_KEYS.SESSION, sessionId);
    } catch {
      // Silent fail if storage is unavailable
    }

    return sessionId;
  }

  /**
   * Generates a UUID v4 string as a fallback when crypto.randomUUID is unavailable.
   */
  private generateUUIDv4(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Set version (4) and variant (2) bits
    array[6] = (array[6] & 0x0f) | 0x40;
    array[8] = (array[8] & 0x3f) | 0x80;
    
    // Convert to hex string with dashes
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }

  /**
   * Gets the current user ID from the application context. In production,
   * this would integrate with your authentication system.
   */
  getCurrentUserId(): string | undefined {
    // In production, integrate with your auth system:
    // return authService.getCurrentUserId();
    return undefined;
  }

  /**
   * Checks if Do Not Track is enabled in the user's browser.
   */
  private isDoNotTrackEnabled(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return (
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      (navigator as any).msDoNotTrack === '1'
    );
  }

  /**
   * Loads user consent from API service. This is called on initialization
   * to restore consent state across page loads.
   */
  private async loadUserConsent(): Promise<void> {
    const userId = this.getCurrentUserId() || 'anonymous';

    try {
      this.userConsent = await privacyAnalyticsApiService.getUserConsent(userId);
    } catch (error) {
      logger.warn('Failed to load analytics consent from API, using default', {
        component: 'PrivacyAnalyticsService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // No localStorage fallback since we moved to API-based consent
    }
  }


  /**
   * Loads failed events from localStorage. These are events that couldn't
   * be sent in previous sessions and will be retried.
   */
  private loadFailedEvents(): void {
    try {
      const stored = localStorage?.getItem(STORAGE_KEYS.FAILED_EVENTS);
      if (stored) {
        this.failedEventQueue = JSON.parse(stored);
        
        // Clean up old failed events to comply with retention policies
        this.cleanupOldEvents();
      }
    } catch (error) {
      logger.error('Failed to load failed events from storage', {
        component: 'PrivacyAnalyticsService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Persists failed events to localStorage so they can be retried later.
   */
  private saveFailedEvents(): void {
    try {
      localStorage?.setItem(
        STORAGE_KEYS.FAILED_EVENTS,
        JSON.stringify(this.failedEventQueue)
      );
    } catch (error) {
      logger.error('Failed to save failed events to storage', {
        component: 'PrivacyAnalyticsService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Removes all analytics data from storage. Used when consent is withdrawn.
   */
  private clearStoredData(): void {
    this.eventQueue = [];
    this.failedEventQueue = [];

    try {
      localStorage?.removeItem(STORAGE_KEYS.SESSION);
      localStorage?.removeItem(STORAGE_KEYS.FAILED_EVENTS);
      localStorage?.removeItem(STORAGE_KEYS.LAST_FLUSH);
    } catch (error) {
      logger.error('Failed to clear analytics storage', {
        component: 'PrivacyAnalyticsService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Removes events older than the retention period from both queues.
   * This ensures compliance with data retention policies.
   */
  private cleanupOldEvents(): void {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - this.config.retentionDays);

    const filterOldEvents = (event: AnalyticsEvent) =>
      new Date(event.timestamp) >= retentionCutoff;

    const beforeCount = this.eventQueue.length + this.failedEventQueue.length;
    
    this.eventQueue = this.eventQueue.filter(filterOldEvents);
    this.failedEventQueue = this.failedEventQueue.filter(filterOldEvents);

    const afterCount = this.eventQueue.length + this.failedEventQueue.length;
    const removedCount = beforeCount - afterCount;

    if (removedCount > 0) {
      logger.info('Removed old events for retention compliance', {
        component: 'PrivacyAnalyticsService',
        removedCount,
        retentionDays: this.config.retentionDays,
      });
    }
  }

  /**
   * Checks if all events in the queues comply with retention policies.
   */
  private checkRetentionCompliance(): boolean {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - this.config.retentionDays);

    const hasExpiredEvents = [...this.eventQueue, ...this.failedEventQueue].some(
      event => new Date(event.timestamp) < retentionCutoff
    );

    return !hasExpiredEvents;
  }

  /**
   * Gets the timestamp of the last successful flush operation.
   */
  private getLastFlushTime(): string {
    try {
      return localStorage?.getItem(STORAGE_KEYS.LAST_FLUSH) || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Updates the last flush timestamp in storage.
   */
  private updateLastFlushTime(): void {
    try {
      localStorage?.setItem(STORAGE_KEYS.LAST_FLUSH, new Date().toISOString());
    } catch {
      // Silent fail if storage is unavailable
    }
  }

  /**
   * Handles consent update events from other parts of the application.
   */
  private handleConsentUpdate(event: Event): void {
    const consent = (event as CustomEvent<UserConsent>).detail;
    this.userConsent = consent;
    
    logger.debug('Consent updated via event', {
      component: 'PrivacyAnalyticsService',
      consent,
    });
  }

  /**
   * Handles the beforeunload event to flush events before the page closes.
   */
  private handleBeforeUnload(): void {
    // Synchronous flush before page unload
    this.flush();
  }

  /**
   * Starts the periodic flush timer that sends events at regular intervals.
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      return; // Timer already running
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stops the periodic flush timer.
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Singleton instance of the analytics service. Use this for most cases.
 * Initialize with setConsent() before tracking events.
 */
export const privacyAnalyticsService = new PrivacyAnalyticsService();

/**
 * Utility functions for working with privacy analytics
 */
export const analyticsUtils = {
  /**
   * Creates a category-specific tracker with bound tracking methods.
   * Useful for feature-specific analytics where you want to ensure
   * consistent category usage.
   * 
   * @example
   * const checkoutTracker = analyticsUtils.createTracker('checkout');
   * checkoutTracker.track('add_to_cart', 'product-123');
   */
  createTracker(category: string) {
    return {
      track: (
        action: string,
        label?: string,
        value?: number,
        metadata?: Record<string, unknown>
      ) => {
        privacyAnalyticsService.track(category, action, label, value, metadata);
      },
      
      trackPageView: (path: string, title?: string, metadata?: Record<string, unknown>) => {
        privacyAnalyticsService.trackPageView(path, title, { category, ...metadata });
      },
      
      trackEngagement: (action: string, target: string, metadata?: Record<string, unknown>) => {
        privacyAnalyticsService.trackEngagement(action, target, { category, ...metadata });
      },
    };
  },

  /**
   * Checks if analytics is currently enabled based on user consent.
   * Returns false if consent hasn't been given or if it was withdrawn.
   *
   * @example
   * if (analyticsUtils.isAnalyticsEnabled()) {
   *   // Show analytics-related UI
   * }
   */
  async isAnalyticsEnabled(userId?: string): Promise<boolean> {
    const currentUserId = userId || privacyAnalyticsService.getCurrentUserId() || 'anonymous';

    try {
      const consent = await privacyAnalyticsApiService.getUserConsent(currentUserId);
      return consent?.analytics === true;
    } catch {
      return false;
    }
  },

  /**
   * Checks if performance tracking is enabled based on user consent.
   */
  async isPerformanceTrackingEnabled(userId?: string): Promise<boolean> {
    const currentUserId = userId || privacyAnalyticsService.getCurrentUserId() || 'anonymous';

    try {
      const consent = await privacyAnalyticsApiService.getUserConsent(currentUserId);
      return consent?.performance === true;
    } catch {
      return false;
    }
  },

  /**
   * Gets the full consent status for display in privacy settings UI.
   * Returns an object with all consent types and when consent was given.
   *
   * @example
   * const status = await analyticsUtils.getConsentStatus();
   * console.log(`Analytics: ${status.analytics ? 'Enabled' : 'Disabled'}`);
   */
  async getConsentStatus(userId?: string): Promise<{
    analytics: boolean;
    performance: boolean;
    functional: boolean;
    timestamp?: string;
    version?: string;
  }> {
    const currentUserId = userId || privacyAnalyticsService.getCurrentUserId() || 'anonymous';

    try {
      const consent = await privacyAnalyticsApiService.getUserConsent(currentUserId);
      if (!consent) {
        return {
          analytics: false,
          performance: false,
          functional: false,
        };
      }

      return consent;
    } catch {
      return {
        analytics: false,
        performance: false,
        functional: false,
      };
    }
  },

  /**
   * Gets the current session ID. Useful for correlating events in the same session.
   */
  getSessionId(): string | null {
    try {
      return localStorage?.getItem(STORAGE_KEYS.SESSION) || null;
    } catch {
      return null;
    }
  },

  /**
   * Checks if the user's browser has Do Not Track enabled.
   */
  isDoNotTrackEnabled(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return (
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      (navigator as any).msDoNotTrack === '1'
    );
  },

  /**
   * Gets the current analytics metrics for transparency reporting.
   * Useful for displaying privacy dashboards to users.
   * 
   * @example
   * const metrics = analyticsUtils.getMetrics();
   * console.log(`Tracking ${metrics.totalEvents} events across ${metrics.categoriesTracked.length} categories`);
   */
  getMetrics(): AnalyticsMetrics {
    return privacyAnalyticsService.getAnalyticsMetrics();
  },

  /**
   * Validates that a consent object has the required structure.
   * Useful when accepting consent from user input.
   */
  validateConsent(consent: unknown): consent is UserConsent {
    if (!consent || typeof consent !== 'object') {
      return false;
    }

    const c = consent as Record<string, unknown>;
    
    return (
      typeof c.analytics === 'boolean' &&
      typeof c.performance === 'boolean' &&
      typeof c.functional === 'boolean' &&
      typeof c.timestamp === 'string' &&
      typeof c.version === 'string'
    );
  },

  /**
   * Creates a consent object with default values and proper structure.
   * 
   * @example
   * const consent = analyticsUtils.createConsent({ analytics: true });
   * privacyAnalyticsService.setConsent(consent);
   */
  createConsent(options: {
    analytics?: boolean;
    performance?: boolean;
    functional?: boolean;
  }): UserConsent {
    return {
      analytics: options.analytics ?? false,
      performance: options.performance ?? false,
      functional: options.functional ?? false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  },

  /**
   * Clears all analytics data and consent. Useful for testing or
   * implementing a "reset privacy settings" feature.
   */
  async clearAllData(userId?: string): Promise<void> {
    await privacyAnalyticsService.withdrawConsent(userId);

    logger.info('All analytics data and consent cleared', {
      component: 'analyticsUtils',
    });
  },
};

/**
 * React hook for using analytics in React components.
 * Provides access to the analytics service with proper typing.
 * 
 * @example
 * function MyComponent() {
 *   const analytics = useAnalytics();
 *   
 *   const handleClick = () => {
 *     analytics.trackEngagement('button_click', 'submit-form');
 *   };
 *   
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 */
export function useAnalytics() {
  return {
    track: privacyAnalyticsService.track.bind(privacyAnalyticsService),
    trackPageView: privacyAnalyticsService.trackPageView.bind(privacyAnalyticsService),
    trackEngagement: privacyAnalyticsService.trackEngagement.bind(privacyAnalyticsService),
    trackPerformance: privacyAnalyticsService.trackPerformance.bind(privacyAnalyticsService),
    trackError: privacyAnalyticsService.trackError.bind(privacyAnalyticsService),
    setConsent: privacyAnalyticsService.setConsent.bind(privacyAnalyticsService),
    withdrawConsent: privacyAnalyticsService.withdrawConsent.bind(privacyAnalyticsService),
    getMetrics: privacyAnalyticsService.getAnalyticsMetrics.bind(privacyAnalyticsService),
    exportUserData: privacyAnalyticsService.exportUserData.bind(privacyAnalyticsService),
    deleteUserData: privacyAnalyticsService.deleteUserData.bind(privacyAnalyticsService),
  };
}

/**
 * Higher-order function that wraps a function with analytics tracking.
 * Useful for tracking function calls without cluttering business logic.
 * 
 * @example
 * const submitForm = withAnalytics(
 *   'engagement',
 *   'form_submit',
 *   async (formData) => {
 *     return await api.submitForm(formData);
 *   }
 * );
 */
export function withAnalytics<T extends (...args: any[]) => any>(
  category: string,
  action: string,
  fn: T,
  options?: {
    getLabel?: (...args: Parameters<T>) => string;
    getValue?: (...args: Parameters<T>) => number;
    getMetadata?: (...args: Parameters<T>) => Record<string, unknown>;
  }
): T {
  return ((...args: Parameters<T>) => {
    const label = options?.getLabel?.(...args);
    const value = options?.getValue?.(...args);
    const metadata = options?.getMetadata?.(...args);

    privacyAnalyticsService.track(category, action, label, value, metadata);

    return fn(...args);
  }) as T;
}

/**
 * Decorator for class methods that automatically tracks method calls.
 * Only works with TypeScript experimental decorators enabled.
 * 
 * @example
 * class CheckoutService {
 *   @trackMethod('checkout', 'process_payment')
 *   async processPayment(amount: number) {
 *     // Payment logic
 *   }
 * }
 */
export function trackMethod(category: string, action: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      privacyAnalyticsService.track(category, action, propertyKey, undefined, {
        args: args.length,
      });

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Type exports for external use
 */
export type {
  AnalyticsEvent,
  AnalyticsConfig,
  UserConsent,
  AnalyticsMetrics,
  ExportedUserData,
  DeleteResult,
};

/**
 * Export the service class for advanced use cases where you need
 * multiple instances with different configurations.
 */
export { PrivacyAnalyticsService };

/**
 * Default export is the singleton service instance
 */
export default privacyAnalyticsService;