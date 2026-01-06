/**
 * Performance Monitoring API Service
 *
 * This service manages communication with backend performance monitoring endpoints.
 * It tracks Core Web Vitals, custom metrics, resource timings, and provides
 * actionable insights through performance analytics and recommendations.
 *
 * Core Web Vitals tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - TTFB (Time to First Byte): Server response time
 * - FCP (First Contentful Paint): Perceived load speed
 *
 * @module PerformanceApiService
 */
import { logger } from '@client/utils/logger';

import { ErrorFactory } from '../error';

import { globalApiClient } from './client';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Core Web Vitals and performance metrics as defined by the Web Performance API
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly delta?: number;
  readonly id: string;
  readonly navigationType?: string;
  readonly rating?: 'good' | 'needs-improvement' | 'poor';
  readonly timestamp: number;
}

/**
 * Application-specific custom metrics for business-critical operations
 */
export interface CustomMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
}

/**
 * Complete user session information including device and network context
 */
export interface UserSession {
  readonly sessionId: string;
  readonly userId?: string;
  readonly startTime: number;
  readonly pageViews: number;
  readonly interactions: number;
  readonly errors: number;
  readonly deviceInfo: DeviceInfo;
  readonly networkInfo: NetworkInfo;
}

/**
 * Device capabilities and characteristics
 */
export interface DeviceInfo {
  readonly userAgent: string;
  readonly platform: string;
  readonly language: string;
  readonly cookieEnabled: boolean;
  readonly onLine: boolean;
  readonly hardwareConcurrency: number;
  readonly deviceMemory?: number;
  readonly screen: {
    readonly width: number;
    readonly height: number;
    readonly colorDepth: number;
  };
}

/**
 * Network conditions and connection quality indicators
 */
export interface NetworkInfo {
  readonly effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  readonly downlink?: number; // Megabits per second
  readonly rtt?: number; // Round-trip time in milliseconds
  readonly saveData?: boolean; // Data saver mode enabled
}

/**
 * Resource loading performance data
 */
export interface ResourceTiming {
  readonly name: string;
  readonly duration: number;
  readonly size: number;
  readonly type: string;
  readonly cached: boolean;
  readonly protocol?: string;
}

/**
 * Performance issue types that can be detected and reported
 */
export type PerformanceIssueType =
  | 'slow_page'
  | 'high_memory'
  | 'network_issue'
  | 'javascript_error';

/**
 * Severity levels for performance issues
 */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Priority levels for performance recommendations
 */
export type RecommendationPriority = 'low' | 'medium' | 'high';

/**
 * Performance issue report structure
 */
export interface PerformanceIssue {
  readonly type: PerformanceIssueType;
  readonly severity: IssueSeverity;
  readonly description: string;
  readonly metrics: Readonly<Record<string, unknown>>;
  readonly sessionId: string;
  readonly url: string;
  readonly userAgent: string;
}

/**
 * Performance improvement recommendation
 */
export interface PerformanceRecommendation {
  readonly type: string;
  readonly priority: RecommendationPriority;
  readonly description: string;
  readonly impact: number; // Expected improvement percentage
  readonly implementation: string;
}

/**
 * Performance analytics data structure
 */
export interface PerformanceAnalytics {
  readonly sessions: UserSession[];
  readonly averageMetrics: Readonly<Record<string, number>>;
  readonly performanceTrends: ReadonlyArray<{
    readonly date: string;
    readonly metrics: Readonly<Record<string, number>>;
  }>;
}

/**
 * Performance benchmarks for comparison
 */
export interface PerformanceBenchmarks {
  readonly webVitals: Readonly<Record<string, { good: number; poor: number }>>;
  readonly customMetrics: Readonly<Record<string, { target: number; warning: number }>>;
}

/**
 * Complete metrics payload sent to the backend
 */
export interface MetricsPayload {
  readonly sessionId: string;
  readonly session: UserSession;
  readonly metrics: readonly PerformanceMetric[];
  readonly customMetrics: readonly CustomMetric[];
  readonly resourceTimings: readonly ResourceTiming[];
  readonly timestamp: number;
  readonly url: string;
  readonly userAgent: string;
}

// ============================================================================
// Performance API Service
// ============================================================================

/**
 * Service class that handles all performance monitoring API operations.
 * This service is designed to work seamlessly with the Web Performance API
 * and provides a bridge between client-side measurements and backend analytics.
 */
export class PerformanceApiService {
  private readonly baseUrl: string;

  /**
   * Creates a new Performance API Service instance
   * @param baseUrl - Base URL for API endpoints (defaults to '/api')
   */
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // ==========================================================================
  // Metrics Reporting
  // ==========================================================================

  /**
   * Reports comprehensive performance metrics to the backend.
   *
   * This method sends a complete snapshot of the current page's performance,
   * including Core Web Vitals, custom business metrics, and resource timings.
   * This data powers performance dashboards and automated alerting systems.
   *
   * The backend aggregates this data to identify performance trends, detect
   * regressions, and generate recommendations for optimization.
   *
   * @param payload - Complete metrics payload including all performance data
   * @throws {UnifiedError} When the network request fails or validation errors occur
   *
   * @example
   * ```typescript
   * await service.reportMetrics({
   *   sessionId: 'sess_abc123',
   *   session: currentSession,
   *   metrics: webVitals,
   *   customMetrics: businessMetrics,
   *   resourceTimings: resourcePerf,
   *   timestamp: Date.now(),
   *   url: window.location.href,
   *   userAgent: navigator.userAgent
   * });
   * ```
   */
  async reportMetrics(payload: MetricsPayload): Promise<void> {
    if (!payload?.sessionId) {
      throw ErrorFactory.createValidationError(
        'Session ID is required to report metrics',
        { payload, component: 'PerformanceApi', operation: 'reportMetrics' }
      );
    }

    try {
      await globalApiClient.post(
        `${this.baseUrl}/performance/metrics`,
        payload,
        { skipCache: true }
      );

      logger.debug('Performance metrics reported successfully', {
        component: 'PerformanceApi',
        sessionId: payload.sessionId,
        metricsCount: payload.metrics.length,
        customMetricsCount: payload.customMetrics.length,
        resourceTimingsCount: payload.resourceTimings.length
      });
    } catch (error) {
      logger.error('Failed to report performance metrics', {
        component: 'PerformanceApi',
        sessionId: payload.sessionId,
        error
      });

      throw ErrorFactory.createNetworkError(
        'Failed to send performance metrics to the server',
        {
          sessionId: payload.sessionId,
          metricsCount: payload.metrics.length,
          originalError: error,
          component: 'PerformanceApi',
          operation: 'reportMetrics'
        }
      );
    }
  }

  // ==========================================================================
  // Analytics & Insights
  // ==========================================================================

  /**
   * Retrieves performance analytics for a specific user.
   *
   * This method returns historical performance data, trends over time, and
   * aggregated metrics for a user. It helps identify patterns like:
   * - Performance degradation over time
   * - Correlation between device/network and performance
   * - User-specific performance bottlenecks
   *
   * The date range parameter allows you to focus on specific time periods
   * for more detailed analysis.
   *
   * @param userId - The unique identifier of the user
   * @param dateRange - Optional date range to filter results
   * @returns Promise resolving to comprehensive analytics data
   * @throws {UnifiedError} When retrieval fails or user is not found
   *
   * @example
   * ```typescript
   * const analytics = await service.getUserAnalytics('user_123', {
   *   start: '2024-01-01',
   *   end: '2024-01-31'
   * });
   *
   * console.log(`Average LCP: ${analytics.averageMetrics.LCP}ms`);
   * ```
   */
  async getUserAnalytics(
    userId: string,
    dateRange?: { start: string; end: string }
  ): Promise<PerformanceAnalytics> {
    if (!userId?.trim()) {
      throw ErrorFactory.createValidationError(
        'User ID is required to retrieve analytics',
        { userId, component: 'PerformanceApi', operation: 'getUserAnalytics' }
      );
    }

    if (dateRange && (!dateRange.start || !dateRange.end)) {
      throw ErrorFactory.createValidationError(
        'Date range must include both start and end dates',
        { userId, dateRange, component: 'PerformanceApi', operation: 'getUserAnalytics' }
      );
    }

    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('start', dateRange.start);
        params.append('end', dateRange.end);
      }

      const queryString = params.toString();
      const url = queryString
        ? `${this.baseUrl}/performance/analytics/${encodeURIComponent(userId)}?${queryString}`
        : `${this.baseUrl}/performance/analytics/${encodeURIComponent(userId)}`;

      const response = await globalApiClient.get<PerformanceAnalytics>(url);

      return response.data;
    } catch (error) {
      logger.error('Failed to get user performance analytics', {
        component: 'PerformanceApi',
        userId,
        dateRange,
        error
      });

      throw ErrorFactory.createNetworkError(
        'Failed to retrieve user performance analytics',
        { userId, dateRange, originalError: error, component: 'PerformanceApi', operation: 'getUserAnalytics' }
      );
    }
  }

  /**
   * Retrieves performance benchmarks for comparison.
   *
   * Benchmarks define what constitutes "good" vs "poor" performance based on
   * industry standards (like Google's Core Web Vitals thresholds) and your
   * application's specific requirements. Use these to:
   * - Color-code metrics in dashboards (green/yellow/red)
   * - Trigger alerts when performance degrades
   * - Set team goals and track improvements
   *
   * @returns Promise resolving to benchmark thresholds
   * @throws {UnifiedError} When retrieval fails
   *
   * @example
   * ```typescript
   * const benchmarks = await service.getBenchmarks();
   * const lcpGood = benchmarks.webVitals.LCP.good; // 2500ms
   * const lcpPoor = benchmarks.webVitals.LCP.poor; // 4000ms
   * ```
   */
  async getBenchmarks(): Promise<PerformanceBenchmarks> {
    try {
      const response = await globalApiClient.get<PerformanceBenchmarks>(
        `${this.baseUrl}/performance/benchmarks`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get performance benchmarks', {
        component: 'PerformanceApi',
        error
      });

      throw ErrorFactory.createNetworkError(
        'Failed to retrieve performance benchmarks',
        { originalError: error, component: 'PerformanceApi', operation: 'getBenchmarks' }
      );
    }
  }

  // ==========================================================================
  // Issue Reporting & Recommendations
  // ==========================================================================

  /**
   * Reports a detected performance issue.
   *
   * Use this method when automated monitoring detects performance problems
   * like slow page loads, memory leaks, or network failures. The backend
   * can aggregate these reports to:
   * - Identify widespread issues affecting multiple users
   * - Correlate issues with deployments or infrastructure changes
   * - Prioritize performance improvements based on impact
   *
   * @param issue - Complete issue report with context
   * @throws {UnifiedError} When reporting fails
   *
   * @example
   * ```typescript
   * await service.reportIssue({
   *   type: 'slow_page',
   *   severity: 'high',
   *   description: 'LCP exceeded 4 seconds on homepage',
   *   metrics: { LCP: 4234, FID: 145 },
   *   sessionId: 'sess_abc123',
   *   url: window.location.href,
   *   userAgent: navigator.userAgent
   * });
   * ```
   */
  async reportIssue(issue: PerformanceIssue): Promise<void> {
    if (!issue?.sessionId) {
      throw ErrorFactory.createValidationError(
        'Session ID is required to report performance issue',
        { issue, component: 'PerformanceApi', operation: 'reportIssue' }
      );
    }

    if (!issue.type || !issue.severity || !issue.description) {
      throw ErrorFactory.createValidationError(
        'Type, severity, and description are required fields',
        { issue, component: 'PerformanceApi', operation: 'reportIssue' }
      );
    }

    try {
      await globalApiClient.post(
        `${this.baseUrl}/performance/issues`,
        issue,
        { skipCache: true }
      );

      logger.info('Performance issue reported', {
        component: 'PerformanceApi',
        type: issue.type,
        severity: issue.severity,
        sessionId: issue.sessionId
      });
    } catch (error) {
      logger.error('Failed to report performance issue', {
        component: 'PerformanceApi',
        type: issue.type,
        severity: issue.severity,
        error
      });

      throw ErrorFactory.createNetworkError(
        'Failed to report performance issue',
        { issue, originalError: error, component: 'PerformanceApi', operation: 'reportIssue' }
      );
    }
  }

  /**
   * Retrieves personalized performance recommendations.
   *
   * Based on a session's performance data, this endpoint returns actionable
   * recommendations for improvement. The backend analyzes metrics to identify:
   * - Resource optimization opportunities (images, scripts, fonts)
   * - Code splitting opportunities
   * - Caching strategy improvements
   * - Critical rendering path optimizations
   *
   * Each recommendation includes an estimated impact score to help you
   * prioritize improvements that will provide the most benefit.
   *
   * @param sessionId - The session to analyze
   * @returns Promise resolving to an array of prioritized recommendations
   * @throws {UnifiedError} When retrieval fails or session is not found
   *
   * @example
   * ```typescript
   * const recommendations = await service.getRecommendations('sess_abc123');
   *
   * for (const rec of recommendations) {
   *   console.log(`${rec.priority}: ${rec.description}`);
   *   console.log(`Expected improvement: ${rec.impact}%`);
   * }
   * ```
   */
  async getRecommendations(sessionId: string): Promise<PerformanceRecommendation[]> {
    if (!sessionId?.trim()) {
      throw ErrorFactory.createValidationError(
        'Session ID is required to retrieve recommendations',
        { sessionId, component: 'PerformanceApi', operation: 'getRecommendations' }
      );
    }

    try {
      const response = await globalApiClient.get<PerformanceRecommendation[]>(
        `${this.baseUrl}/performance/recommendations/${encodeURIComponent(sessionId)}`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get performance recommendations', {
        component: 'PerformanceApi',
        sessionId,
        error
      });

      throw ErrorFactory.createNetworkError(
        'Failed to retrieve performance recommendations',
        { sessionId, originalError: error, component: 'PerformanceApi', operation: 'getRecommendations' }
      );
    }
  }
}

// ============================================================================
// Global Instance
// ============================================================================

/**
 * Global singleton instance of the Performance API Service.
 * Use this instance throughout your application for consistent behavior
 * and proper resource management.
 *
 * @example
 * ```typescript
 * import { performanceApiService } from './api/performance';
 *
 * await performanceApiService.reportMetrics(metricsPayload);
 * ```
 */
export const performanceApiService = new PerformanceApiService();