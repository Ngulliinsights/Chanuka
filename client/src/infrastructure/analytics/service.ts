/**
 * Analytics Service
 * Core service for tracking user events, page views, and performance metrics
 * Integrates with analyticsApiService from @/infrastructure/api
 */

import type { AnalyticsEvent } from '@shared/validation/schemas/analytics.schema';
import type { AnalyticsPerformanceMetrics } from '@client/lib/types/analytics';
import { logger } from '@client/lib/utils/logger';

/**
 * Result types for analytics operations
 */
export interface TrackingResult {
  tracked: boolean;
  eventId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateResult {
  updated: boolean;
  timestamp: number;
}

export interface PageViewData {
  path: string;
  title: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

export interface UserAction {
  action: string;
  category: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface ErrorData {
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SessionProperties {
  sessionId: string;
  startTime: number;
  [key: string]: unknown;
}

/**
 * Analytics Service Interface
 */
export interface AnalyticsService {
  trackEvent(event: AnalyticsEvent): Promise<TrackingResult>;
  trackPageView(pageView: PageViewData): Promise<TrackingResult>;
  trackUserAction(action: UserAction): Promise<TrackingResult>;
  trackPerformance(metrics: AnalyticsPerformanceMetrics): Promise<TrackingResult>;
  trackError(error: ErrorData): Promise<TrackingResult>;
  setUserProperties(properties: UserProperties): Promise<UpdateResult>;
  setSessionProperties(properties: SessionProperties): Promise<UpdateResult>;
}

/**
 * Analytics Service Implementation
 * Handles all analytics tracking with proper error handling
 */
class AnalyticsServiceImpl implements AnalyticsService {
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a valid ISO timestamp
   * Validates the date before converting to ISO string
   */
  private generateTimestamp(): string {
    const now = new Date();
    
    // Validate the date is valid
    if (isNaN(now.getTime())) {
      // Fallback to current timestamp if Date is somehow invalid
      return new Date(Date.now()).toISOString();
    }
    
    return now.toISOString();
  }

  /**
   * Track a custom analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<TrackingResult> {
    try {
      // Validate event timestamp if provided
      if (event.timestamp) {
        const eventDate = new Date(event.timestamp);
        if (isNaN(eventDate.getTime())) {
          // Replace invalid timestamp with current time
          event.timestamp = this.generateTimestamp();
        }
      } else {
        event.timestamp = this.generateTimestamp();
      }

      // In a real implementation, this would call the analytics API
      // For now, we log and return success
      logger.info('Analytics event tracked', { event });

      return {
        tracked: true,
        eventId: this.generateEventId(),
        timestamp: Date.now(),
        metadata: {
          sessionId: this.sessionId,
          userId: this.userId,
        },
      };
    } catch (error) {
      logger.error('Failed to track analytics event', { event, error });
      return {
        tracked: false,
        eventId: '',
        timestamp: Date.now(),
        metadata: { error: String(error) },
      };
    }
  }

  /**
   * Track a page view
   */
  async trackPageView(pageView: PageViewData): Promise<TrackingResult> {
    try {
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type: 'page_view',
        category: 'navigation',
        action: 'page_view',
        label: pageView.path,
        timestamp: this.generateTimestamp(),
        sessionId: this.sessionId,
        userId: this.userId,
        anonymized: !this.userId,
        consentGiven: true,
        metadata: {
          path: pageView.path,
          title: pageView.title,
          referrer: pageView.referrer,
          ...pageView.metadata,
        },
      };

      return await this.trackEvent(event);
    } catch (error) {
      logger.error('Failed to track page view', { pageView, error });
      return {
        tracked: false,
        eventId: '',
        timestamp: Date.now(),
        metadata: { error: String(error) },
      };
    }
  }

  /**
   * Track a user action
   */
  async trackUserAction(action: UserAction): Promise<TrackingResult> {
    try {
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type: 'user_action',
        category: action.category,
        action: action.action,
        label: action.label,
        value: action.value,
        timestamp: this.generateTimestamp(),
        sessionId: this.sessionId,
        userId: this.userId,
        anonymized: !this.userId,
        consentGiven: true,
        metadata: action.metadata,
      };

      return await this.trackEvent(event);
    } catch (error) {
      logger.error('Failed to track user action', { action, error });
      return {
        tracked: false,
        eventId: '',
        timestamp: Date.now(),
        metadata: { error: String(error) },
      };
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metrics: AnalyticsPerformanceMetrics): Promise<TrackingResult> {
    try {
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type: 'performance',
        category: 'performance',
        action: 'metrics_collected',
        timestamp: this.generateTimestamp(),
        sessionId: this.sessionId,
        userId: this.userId,
        anonymized: !this.userId,
        consentGiven: true,
        metadata: { ...metrics } as Record<string, unknown>,
      };

      return await this.trackEvent(event);
    } catch (error) {
      logger.error('Failed to track performance metrics', { metrics, error });
      return {
        tracked: false,
        eventId: '',
        timestamp: Date.now(),
        metadata: { error: String(error) },
      };
    }
  }

  /**
   * Track an error
   */
  async trackError(error: ErrorData): Promise<TrackingResult> {
    try {
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type: 'error',
        category: 'error',
        action: 'error_occurred',
        label: error.message,
        timestamp: this.generateTimestamp(),
        sessionId: this.sessionId,
        userId: this.userId,
        anonymized: !this.userId,
        consentGiven: true,
        metadata: {
          message: error.message,
          stack: error.stack,
          severity: error.severity,
          ...error.metadata,
        },
      };

      return await this.trackEvent(event);
    } catch (err) {
      logger.error('Failed to track error', { error, err });
      return {
        tracked: false,
        eventId: '',
        timestamp: Date.now(),
        metadata: { error: String(err) },
      };
    }
  }

  /**
   * Set user properties for analytics
   */
  async setUserProperties(properties: UserProperties): Promise<UpdateResult> {
    try {
      if (properties.userId) {
        this.userId = String(properties.userId);
      }

      logger.info('User properties set', { properties });

      return {
        updated: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to set user properties', { properties, error });
      return {
        updated: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Set session properties for analytics
   */
  async setSessionProperties(properties: SessionProperties): Promise<UpdateResult> {
    try {
      this.sessionId = properties.sessionId;

      logger.info('Session properties set', { properties });

      return {
        updated: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to set session properties', { properties, error });
      return {
        updated: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Global analytics service instance
 */
export const analyticsService: AnalyticsService = new AnalyticsServiceImpl();

/**
 * Export for testing and dependency injection
 */
export { AnalyticsServiceImpl };
