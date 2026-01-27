/**
 * Comprehensive Analytics Tracker
 *
 * Implements comprehensive analytics tracking across all personas with:
 * - User journey tracking across all personas
 * - Performance metrics collection for all key pages
 * - Analytics dashboard for monitoring user engagement
 * - Error tracking and performance alerts
 *
 * Requirements: 11.1, 11.2, 11.3
 */

import { useCallback } from 'react';

import { analyticsApiService } from '@client/core/api/analytics';
import { ErrorAnalyticsService } from '@client/core/error/analytics';
import { PerformanceMonitor } from '@client/core/performance/monitor';
import type { PerformanceMetric, WebVitalsMetric } from '@client/core/performance/types';
import { userJourneyTracker, JourneyAnalytics } from '@client/features/analytics/model/user-journey-tracker';
import type { UserRole, NavigationSection } from '@client/lib/types/navigation';
import { logger } from '@client/lib/utils/logger';

/**
 * Persona-specific analytics configuration
 */
interface PersonaAnalyticsConfig {
  trackingEnabled: boolean;
  detailedMetrics: boolean;
  realTimeUpdates: boolean;
  customEvents: string[];
  performanceThresholds: {
    pageLoadTime: number;
    interactionDelay: number;
    errorRate: number;
  };
}

/**
 * Analytics event types for comprehensive tracking
 */
export type AnalyticsEventType =
  | 'page_view'
  | 'user_interaction'
  | 'search_performed'
  | 'bill_viewed'
  | 'bill_analyzed'
  | 'comment_posted'
  | 'expert_verification'
  | 'dashboard_accessed'
  | 'error_occurred'
  | 'performance_issue'
  | 'conversion_event';

/**
 * Comprehensive analytics event structure
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userRole: UserRole;
  page: string;
  section: NavigationSection;
  data: Record<string, unknown>;
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    connectionType?: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    referrer?: string;
  };
}

/**
 * Performance metrics for key pages
 */
export interface PagePerformanceMetrics {
  pageId: string;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  memoryUsage?: number;
  resourceCount: number;
  errorCount: number;
  timestamp: Date;
}

/**
 * User engagement metrics
 */
export interface UserEngagementMetrics {
  userId?: string;
  sessionId: string;
  userRole: UserRole;
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  conversions: number;
  bounceRate: number;
  engagementScore: number;
  timestamp: Date;
}

/**
 * Analytics dashboard data structure
 */
export interface AnalyticsDashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
  };
  personaBreakdown: Record<
    UserRole,
    {
      userCount: number;
      averageEngagement: number;
      topPages: string[];
      conversionRate: number;
    }
  >;
  performanceMetrics: {
    averageLoadTime: number;
    coreWebVitalsScore: number;
    errorRate: number;
    performanceIssues: number;
  };
  realTimeData: {
    currentUsers: number;
    recentEvents: AnalyticsEvent[];
    activePages: string[];
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  alerts: Array<{
    id: string;
    type: 'performance' | 'error' | 'engagement' | 'conversion';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

/**
 * Comprehensive Analytics Tracker class
 */
export class ComprehensiveAnalyticsTracker {
  private static instance: ComprehensiveAnalyticsTracker;

  private journeyTracker: typeof userJourneyTracker;
  private performanceMonitor: PerformanceMonitor;
  private errorAnalytics: ErrorAnalyticsService;

  private events: AnalyticsEvent[] = [];
  private pageMetrics: Map<string, PagePerformanceMetrics[]> = new Map();
  private userEngagement: Map<string, UserEngagementMetrics> = new Map();

  // Use a relaxed index type to avoid requiring every possible UserRole literal here
  private personaConfigs: Record<string, PersonaAnalyticsConfig> = {
    public: {
      trackingEnabled: true,
      detailedMetrics: false,
      realTimeUpdates: false,
      customEvents: ['page_view', 'search_performed', 'bill_viewed'],
      performanceThresholds: {
        pageLoadTime: 3000,
        interactionDelay: 300,
        errorRate: 0.05,
      },
    },
    citizen: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
      customEvents: [
        'page_view',
        'search_performed',
        'bill_viewed',
        'bill_analyzed',
        'comment_posted',
      ],
      performanceThresholds: {
        pageLoadTime: 2500,
        interactionDelay: 200,
        errorRate: 0.03,
      },
    },
    expert: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
      customEvents: [
        'page_view',
        'search_performed',
        'bill_viewed',
        'bill_analyzed',
        'expert_verification',
        'dashboard_accessed',
      ],
      performanceThresholds: {
        pageLoadTime: 2000,
        interactionDelay: 150,
        errorRate: 0.02,
      },
    },
    admin: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
      customEvents: ['page_view', 'dashboard_accessed', 'error_occurred', 'performance_issue'],
      performanceThresholds: {
        pageLoadTime: 1500,
        interactionDelay: 100,
        errorRate: 0.01,
      },
    },
  };

  private isEnabled: boolean = true;
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly MAX_EVENTS = 1000;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.journeyTracker = userJourneyTracker;
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.errorAnalytics = ErrorAnalyticsService.getInstance();

    this.initialize();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ComprehensiveAnalyticsTracker {
    if (!ComprehensiveAnalyticsTracker.instance) {
      ComprehensiveAnalyticsTracker.instance = new ComprehensiveAnalyticsTracker();
    }
    return ComprehensiveAnalyticsTracker.instance;
  }

  /**
   * Initialize the comprehensive analytics tracker
   */
  private initialize(): void {
    this.setupPerformanceTracking();
    this.setupErrorTracking();
    this.setupJourneyTracking();
    this.startPeriodicFlush();

    logger.info('Comprehensive Analytics Tracker initialized');
  }

  /**
   * Setup performance tracking integration
   */
  private setupPerformanceTracking(): void {
    // Listen to Web Vitals metrics
    this.performanceMonitor.getWebVitalsMonitor().addListener((metric: WebVitalsMetric) => {
      this.trackPerformanceMetric(metric);
    });

    // Track custom performance metrics
    this.trackPageLoadPerformance();
  }

  /**
   * Setup error tracking integration
   */
  private setupErrorTracking(): void {
    this.errorAnalytics.addProvider('comprehensive-tracker', {
      name: 'Comprehensive Tracker',
      track: async error => {
        await this.trackEvent({
          type: 'error_occurred',
          data: {
            errorId: error.id,
            errorType: error.type,
            errorMessage: error.message,
            errorSeverity: error.severity,
            errorContext: error.context,
          },
        });
      },
      isEnabled: () => this.isEnabled,
    });
  }

  /**
   * Setup journey tracking integration
   */
  private setupJourneyTracking(): void {
    // Journey tracking is already handled by the UserJourneyTracker
    // We'll integrate with it to get journey analytics
  }

  /**
   * Track page load performance for key pages
   */
  private trackPageLoadPerformance(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordPagePerformance(navEntry);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  /**
   * Record page performance metrics
   */
  private recordPagePerformance(navEntry: PerformanceNavigationTiming): void {
    const pageId = window.location.pathname;
    const webVitals = this.performanceMonitor.getWebVitalsMetrics();

    const metrics: PagePerformanceMetrics = {
      pageId,
      loadTime: navEntry.loadEventEnd - navEntry.fetchStart,
      firstContentfulPaint: this.getLatestMetricValue(webVitals, 'FCP') || 0,
      largestContentfulPaint: this.getLatestMetricValue(webVitals, 'LCP') || 0,
      cumulativeLayoutShift: this.getLatestMetricValue(webVitals, 'CLS') || 0,
      firstInputDelay: this.getLatestMetricValue(webVitals, 'FID') || 0,
      timeToInteractive: navEntry.domInteractive - navEntry.fetchStart,
      resourceCount: performance.getEntriesByType('resource').length,
      errorCount: 0, // Will be updated by error tracking
      timestamp: new Date(),
    };

    // Add memory usage if available
    const perfWithMemory = performance as any;
    if (perfWithMemory.memory) {
      metrics.memoryUsage = perfWithMemory.memory.usedJSHeapSize;
    }

    // Store metrics
    if (!this.pageMetrics.has(pageId)) {
      this.pageMetrics.set(pageId, []);
    }
    this.pageMetrics.get(pageId)!.push(metrics);

    // Keep only last 10 metrics per page
    const pageMetricsList = this.pageMetrics.get(pageId)!;
    if (pageMetricsList.length > 10) {
      this.pageMetrics.set(pageId, pageMetricsList.slice(-10));
    }

    // Check performance thresholds and create alerts
    this.checkPerformanceThresholds(metrics);
  }

  /**
   * Get latest metric value from Web Vitals
   */
  private getLatestMetricValue(
    metrics: readonly WebVitalsMetric[],
    name: string
  ): number | undefined {
    const metric = metrics.filter(m => m.name === name).pop();
    return metric?.value;
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(metrics: PagePerformanceMetrics): void {
    const currentUserRole = this.getCurrentUserRole();
    const config = this.personaConfigs[currentUserRole];

    const alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    if (metrics.loadTime > config.performanceThresholds.pageLoadTime) {
      alerts.push({
        type: 'performance',
        message: `Page load time (${metrics.loadTime}ms) exceeds threshold (${config.performanceThresholds.pageLoadTime}ms) for ${currentUserRole}`,
        severity:
          metrics.loadTime > config.performanceThresholds.pageLoadTime * 2 ? 'critical' : 'high',
      });
    }

    if (metrics.firstInputDelay > config.performanceThresholds.interactionDelay) {
      alerts.push({
        type: 'performance',
        message: `First Input Delay (${metrics.firstInputDelay}ms) exceeds threshold (${config.performanceThresholds.interactionDelay}ms)`,
        severity: 'medium',
      });
    }

    if (metrics.cumulativeLayoutShift > 0.25) {
      alerts.push({
        type: 'performance',
        message: `Cumulative Layout Shift (${metrics.cumulativeLayoutShift}) indicates poor visual stability`,
        severity: 'medium',
      });
    }

    // Track performance issues as events
    alerts.forEach(alert => {
      this.trackEvent({
        type: 'performance_issue',
        data: {
          alertType: alert.type,
          message: alert.message,
          severity: alert.severity,
          metrics: metrics,
        },
      });
    });
  }

  /**
   * Track a comprehensive analytics event
   */
  public async trackEvent(eventData: Partial<AnalyticsEvent>): Promise<void> {
    if (!this.isEnabled) return;

    const currentUserRole = this.getCurrentUserRole();
    const config = this.personaConfigs[currentUserRole];

    if (!config.trackingEnabled) return;

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type: eventData.type || 'user_interaction',
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      userRole: currentUserRole,
      page: window.location.pathname,
      section: this.getCurrentSection(),
      data: eventData.data || {},
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        deviceType: this.getDeviceType(),
        referrer: document.referrer,
        connectionType: this.getConnectionType(),
      },
      ...eventData,
    };

    // Check if this event type is tracked for current persona
    if (!config.customEvents.includes(event.type)) {
      return;
    }

    this.events.push(event);

    // Maintain event history within limits
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Update user engagement metrics
    this.updateUserEngagement(event);

    // Real-time updates for personas that support it
    if (config.realTimeUpdates) {
      await this.sendEventToAnalytics(event);
    }

    logger.debug('Analytics event tracked', { eventId: event.id, type: event.type });
  }

  /**
   * Track performance metric
   */
  private trackPerformanceMetric(metric: WebVitalsMetric): void {
    this.trackEvent({
      type: 'performance_issue',
      data: {
        metricName: metric.name,
        metricValue: metric.value,
        metricRating: metric.rating,
        metricUrl: metric.url,
      },
    });
  }

  /**
   * Update user engagement metrics
   */
  private updateUserEngagement(event: AnalyticsEvent): void {
    const key = event.userId || event.sessionId;

    let engagement = this.userEngagement.get(key);
    if (!engagement) {
      engagement = {
        userId: event.userId,
        sessionId: event.sessionId,
        userRole: event.userRole,
        sessionDuration: 0,
        pageViews: 0,
        interactions: 0,
        conversions: 0,
        bounceRate: 0,
        engagementScore: 0,
        timestamp: new Date(),
      };
      this.userEngagement.set(key, engagement);
    }

    // Update metrics based on event type
    switch (event.type) {
      case 'page_view':
        engagement.pageViews++;
        break;
      case 'user_interaction':
        engagement.interactions++;
        break;
      case 'conversion_event':
        engagement.conversions++;
        break;
    }

    // Calculate engagement score
    engagement.engagementScore = this.calculateEngagementScore(engagement);
    engagement.timestamp = new Date();
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(engagement: UserEngagementMetrics): number {
    const weights = {
      pageViews: 0.3,
      interactions: 0.4,
      conversions: 0.3,
    };

    const normalizedPageViews = Math.min(engagement.pageViews / 10, 1);
    const normalizedInteractions = Math.min(engagement.interactions / 20, 1);
    const normalizedConversions = Math.min(engagement.conversions / 5, 1);

    return (
      (normalizedPageViews * weights.pageViews +
        normalizedInteractions * weights.interactions +
        normalizedConversions * weights.conversions) *
      100
    );
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  public async getAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
    const journeyAnalytics = this.journeyTracker.getJourneyAnalytics();
    const performanceStats = this.performanceMonitor.getPerformanceStats();
    const errorStats = this.errorAnalytics.getAnalytics();

    // Calculate overview metrics
    const totalSessions = this.userEngagement.size;
    const totalUsers = new Set(
      Array.from(this.userEngagement.values())
        .map(e => e.userId)
        .filter(Boolean)
    ).size;
    const activeUsers = this.getActiveUsersCount();

    const averageSessionDuration = this.calculateAverageSessionDuration();
    const bounceRate = journeyAnalytics.bounceRate;
    const conversionRate = this.calculateConversionRate();

    // Calculate persona breakdown
    const personaBreakdown = this.calculatePersonaBreakdown();

    // Get real-time data
    const realTimeData = {
      currentUsers: activeUsers,
      recentEvents: this.events.slice(-10),
      activePages: this.getActivePages(),
      systemHealth: this.getSystemHealth(),
    };

    // Get alerts
    const alerts = await this.getActiveAlerts();

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalSessions,
        averageSessionDuration,
        bounceRate,
        conversionRate,
      },
      personaBreakdown,
      performanceMetrics: {
        averageLoadTime: performanceStats.averageLoadTime,
        coreWebVitalsScore: this.performanceMonitor.getOverallScore(),
        errorRate: errorStats.totalErrors / Math.max(totalSessions, 1),
        performanceIssues: this.countPerformanceIssues(),
      },
      realTimeData,
      alerts,
    };
  }

  /**
   * Calculate persona breakdown
   */
  private calculatePersonaBreakdown(): Record<UserRole, any> {
    const breakdown: Record<UserRole, any> = {
      public: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      citizen: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      user: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      expert: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      admin: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      official: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      moderator: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      journalist: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
      advocate: { userCount: 0, averageEngagement: 0, topPages: [], conversionRate: 0 },
    };

    const personaMetrics = new Map<
      UserRole,
      { engagements: number[]; pages: string[]; conversions: number }
    >();

    this.userEngagement.forEach(engagement => {
      if (!personaMetrics.has(engagement.userRole)) {
        personaMetrics.set(engagement.userRole, { engagements: [], pages: [], conversions: 0 });
      }

      const metrics = personaMetrics.get(engagement.userRole)!;
      metrics.engagements.push(engagement.engagementScore);
      metrics.conversions += engagement.conversions;
    });

    // Calculate page views by persona
    const pagesByPersona = new Map<UserRole, Map<string, number>>();
    this.events.forEach(event => {
      if (event.type === 'page_view') {
        if (!pagesByPersona.has(event.userRole)) {
          pagesByPersona.set(event.userRole, new Map());
        }
        const pages = pagesByPersona.get(event.userRole)!;
        pages.set(event.page, (pages.get(event.page) || 0) + 1);
      }
    });

    personaMetrics.forEach((metrics, role) => {
      breakdown[role].userCount = metrics.engagements.length;
      breakdown[role].averageEngagement =
        metrics.engagements.length > 0
          ? metrics.engagements.reduce((a, b) => a + b, 0) / metrics.engagements.length
          : 0;
      breakdown[role].conversionRate =
        metrics.engagements.length > 0 ? metrics.conversions / metrics.engagements.length : 0;

      // Get top pages for this persona
      const pages = pagesByPersona.get(role);
      if (pages) {
        breakdown[role].topPages = Array.from(pages.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([page]) => page);
      }
    });

    return breakdown;
  }

  /**
   * Get active users count (users active in last 30 minutes)
   */
  private getActiveUsersCount(): number {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeUsers = new Set<string>();

    this.events.forEach(event => {
      if (event.timestamp > thirtyMinutesAgo) {
        activeUsers.add(event.userId || event.sessionId);
      }
    });

    return activeUsers.size;
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(): number {
    const durations = Array.from(this.userEngagement.values()).map(e => e.sessionDuration);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  /**
   * Calculate conversion rate
   */
  private calculateConversionRate(): number {
    const totalSessions = this.userEngagement.size;
    const conversions = Array.from(this.userEngagement.values()).reduce(
      (sum, e) => sum + e.conversions,
      0
    );
    return totalSessions > 0 ? conversions / totalSessions : 0;
  }

  /**
   * Get active pages
   */
  private getActivePages(): string[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activePages = new Set<string>();

    this.events.forEach(event => {
      if (event.timestamp > fiveMinutesAgo && event.type === 'page_view') {
        activePages.add(event.page);
      }
    });

    return Array.from(activePages);
  }

  /**
   * Get system health status
   */
  private getSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const performanceScore = this.performanceMonitor.getOverallScore();
    const errorRate = this.calculateCurrentErrorRate();

    if (performanceScore < 50 || errorRate > 0.1) {
      return 'critical';
    } else if (performanceScore < 75 || errorRate > 0.05) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Calculate current error rate
   */
  private calculateCurrentErrorRate(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);
    const errorEvents = recentEvents.filter(e => e.type === 'error_occurred');

    return recentEvents.length > 0 ? errorEvents.length / recentEvents.length : 0;
  }

  /**
   * Count performance issues
   */
  private countPerformanceIssues(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.events.filter(e => e.type === 'performance_issue' && e.timestamp > oneHourAgo)
      .length;
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(): Promise<AnalyticsDashboardData['alerts']> {
    const alerts: AnalyticsDashboardData['alerts'] = [];

    // Performance alerts
    const performanceIssues = this.events.filter(
      e => e.type === 'performance_issue' && e.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );

    performanceIssues.forEach(issue => {
      alerts.push({
        id: issue.id,
        type: 'performance',
        severity: (issue.data.severity as any) || 'medium',
        message: (issue.data.message as string) || 'Performance issue detected',
        timestamp: issue.timestamp,
        acknowledged: false,
      });
    });

    // Error alerts
    const errorEvents = this.events.filter(
      e => e.type === 'error_occurred' && e.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    );

    errorEvents.forEach(error => {
      alerts.push({
        id: error.id,
        type: 'error',
        severity: (error.data.errorSeverity as any) || 'medium',
        message: (error.data.errorMessage as string) || 'Error occurred',
        timestamp: error.timestamp,
        acknowledged: false,
      });
    });

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20);
  }

  /**
   * Send event to analytics service
   */
  private async sendEventToAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      // Send to analytics API service
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      logger.error('Failed to send analytics event', { error, eventId: event.id });
    }
  }

  /**
   * Start periodic flush of analytics data
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushAnalyticsData();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush analytics data to server
   */
  private async flushAnalyticsData(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      const eventsToFlush = [...this.events];
      const engagementToFlush = Array.from(this.userEngagement.values());
      const metricsToFlush = Array.from(this.pageMetrics.entries()).map(([pageId, metrics]) => ({
        pageId,
        metrics: metrics.slice(-5), // Send last 5 metrics per page
      }));

      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToFlush,
          engagement: engagementToFlush,
          pageMetrics: metricsToFlush,
          timestamp: new Date(),
        }),
      });

      // Clear flushed data
      this.events = [];

      logger.info('Analytics data flushed successfully', {
        eventCount: eventsToFlush.length,
        engagementCount: engagementToFlush.length,
        metricsCount: metricsToFlush.length,
      });
    } catch (error) {
      logger.error('Failed to flush analytics data', { error });
    }
  }

  // Utility methods

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private getCurrentUserRole(): UserRole {
    // This should be integrated with your auth system
    // For now, return a default role
    return 'public';
  }

  private getCurrentSection(): NavigationSection {
    // This should be integrated with your navigation system
    // For now, determine from current path
    const path = window.location.pathname;
    if (path.includes('/bills')) return 'legislative' as NavigationSection;
    if (path.includes('/community')) return 'community' as NavigationSection;
    if (path.includes('/dashboard')) return 'user' as NavigationSection;
    if (path.includes('/admin')) return 'admin' as NavigationSection;
    return 'tools' as NavigationSection;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string | undefined {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    return connection?.effectiveType;
  }

  /**
   * Public API methods
   */

  /**
   * Enable/disable analytics tracking
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`Analytics tracking ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update persona configuration
   */
  public updatePersonaConfig(role: UserRole, config: Partial<PersonaAnalyticsConfig>): void {
    this.personaConfigs[role] = { ...this.personaConfigs[role], ...config };
    logger.info('Persona analytics config updated', { role, config });
  }

  /**
   * Get current analytics metrics
   */
  public getMetrics(): {
    eventCount: number;
    userEngagementCount: number;
    pageMetricsCount: number;
    isEnabled: boolean;
  } {
    return {
      eventCount: this.events.length,
      userEngagementCount: this.userEngagement.size,
      pageMetricsCount: this.pageMetrics.size,
      isEnabled: this.isEnabled,
    };
  }

  /**
   * Export analytics data
   */
  public exportData(): {
    events: AnalyticsEvent[];
    engagement: UserEngagementMetrics[];
    pageMetrics: Array<{ pageId: string; metrics: PagePerformanceMetrics[] }>;
    timestamp: Date;
  } {
    return {
      events: [...this.events],
      engagement: Array.from(this.userEngagement.values()),
      pageMetrics: Array.from(this.pageMetrics.entries()).map(([pageId, metrics]) => ({
        pageId,
        metrics: [...metrics],
      })),
      timestamp: new Date(),
    };
  }

  /**
   * Clear all analytics data
   */
  public clearData(): void {
    this.events = [];
    this.userEngagement.clear();
    this.pageMetrics.clear();
    logger.info('Analytics data cleared');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.clearData();
    logger.info('Comprehensive Analytics Tracker destroyed');
  }
}

/**
 * React hook for comprehensive analytics
 */
export const useComprehensiveAnalytics = () => {
  const tracker = ComprehensiveAnalyticsTracker.getInstance();

  const trackEvent = useCallback(
    async (eventData: Partial<AnalyticsEvent>) => {
      await tracker.trackEvent(eventData);
    },
    [tracker]
  );

  const getAnalyticsDashboard = useCallback(async () => {
    return await tracker.getAnalyticsDashboard();
  }, [tracker]);

  const getMetrics = useCallback(() => {
    return tracker.getMetrics();
  }, [tracker]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      tracker.setEnabled(enabled);
    },
    [tracker]
  );

  const updatePersonaConfig = useCallback(
    (role: UserRole, config: Partial<PersonaAnalyticsConfig>) => {
      tracker.updatePersonaConfig(role, config);
    },
    [tracker]
  );

  const exportData = useCallback(() => {
    return tracker.exportData();
  }, [tracker]);

  const clearData = useCallback(() => {
    tracker.clearData();
  }, [tracker]);

  return {
    trackEvent,
    getAnalyticsDashboard,
    getMetrics,
    setEnabled,
    updatePersonaConfig,
    exportData,
    clearData,
    tracker,
  };
};

export default ComprehensiveAnalyticsTracker;
