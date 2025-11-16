/**
 * Performance Monitoring API Service
 * Core API communication layer for performance metrics
 * Extracted from services/performance-monitoring.ts during infrastructure consolidation
 */

import { globalApiClient } from './client';
import { logger } from '../../utils/logger';

// Define types locally since they're not exported from the performance monitoring service
export interface PerformanceMetric {
  name: string;
  value: number;
  delta?: number;
  id: string;
  navigationType?: string;
  rating?: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
  timestamp: number;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  pageViews: number;
  interactions: number;
  errors: number;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
}

export interface NetworkInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
  cached: boolean;
  protocol?: string;
}

/**
 * Performance Monitoring API Service Class
 * Handles all performance-related API communication
 */
export class PerformanceApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '/api';
  }

  /**
   * Report performance metrics to the backend
   */
  async reportMetrics(payload: {
    sessionId: string;
    session: any;
    metrics: any[];
    customMetrics: any[];
    resourceTimings: any[];
    timestamp: number;
    url: string;
    userAgent: string;
  }): Promise<void> {
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
        customMetricsCount: payload.customMetrics.length
      });
    } catch (error) {
      logger.error('Failed to report performance metrics', {
        component: 'PerformanceApi',
        sessionId: payload.sessionId,
        error
      });
      throw error;
    }
  }

  /**
   * Get performance analytics for a user
   */
  async getUserAnalytics(userId: string, dateRange?: {
    start: string;
    end: string;
  }): Promise<{
    sessions: any[];
    averageMetrics: Record<string, number>;
    performanceTrends: Array<{
      date: string;
      metrics: Record<string, number>;
    }>;
  }> {
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('start', dateRange.start);
        params.append('end', dateRange.end);
      }

      const response = await globalApiClient.get(
        `${this.baseUrl}/performance/analytics/${userId}?${params.toString()}`
      );

      return response.data as {
        sessions: any[];
        averageMetrics: Record<string, number>;
        performanceTrends: Array<{
          date: string;
          metrics: Record<string, number>;
        }>;
      };
    } catch (error) {
      logger.error('Failed to get user performance analytics', {
        component: 'PerformanceApi',
        userId,
        error
      });
      throw error;
    }
  }

  /**
   * Get performance benchmarks
   */
  async getBenchmarks(): Promise<{
    webVitals: Record<string, { good: number; poor: number }>;
    customMetrics: Record<string, { target: number; warning: number }>;
  }> {
    try {
      const response = await globalApiClient.get(`${this.baseUrl}/performance/benchmarks`);
      return response.data as {
        webVitals: Record<string, { good: number; poor: number }>;
        customMetrics: Record<string, { target: number; warning: number }>;
      };
    } catch (error) {
      logger.error('Failed to get performance benchmarks', {
        component: 'PerformanceApi',
        error
      });
      throw error;
    }
  }

  /**
   * Report performance issue
   */
  async reportIssue(issue: {
    type: 'slow_page' | 'high_memory' | 'network_issue' | 'javascript_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metrics: Record<string, any>;
    sessionId: string;
    url: string;
    userAgent: string;
  }): Promise<void> {
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
        error
      });
      throw error;
    }
  }

  /**
   * Get performance recommendations
   */
  async getRecommendations(sessionId: string): Promise<Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    impact: number;
    implementation: string;
  }>> {
    try {
      const response = await globalApiClient.get(
        `${this.baseUrl}/performance/recommendations/${sessionId}`
      );

      return response.data as Array<{
        type: string;
        priority: 'low' | 'medium' | 'high';
        description: string;
        impact: number;
        implementation: string;
      }>;
    } catch (error) {
      logger.error('Failed to get performance recommendations', {
        component: 'PerformanceApi',
        sessionId,
        error
      });
      throw error;
    }
  }
}

// Global performance API service instance
export const performanceApiService = new PerformanceApiService();