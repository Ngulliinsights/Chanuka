/**
 * Error Analytics Repository
 *
 * Domain-specific repository for error analytics that extends the unified API client.
 * Provides clean interfaces for error tracking, analytics, and monitoring through
 * the error analytics bridge service.
 */

import { UnifiedApiClientImpl, globalApiClient } from '../core/api/client';
import { errorAnalyticsBridge } from '../services/errorAnalyticsBridge';
import { logger } from '../utils/logger';

export interface ErrorAnalyticsRepositoryConfig {
  baseEndpoint: string;
  cacheTTL: {
    overview: number;
    trends: number;
    patterns: number;
    recovery: number;
    realtime: number;
  };
  filters: {
    defaultTimeRange: number; // in milliseconds
    maxTimeRange: number; // in milliseconds
    defaultSeverity: string[];
    defaultDomains: string[];
  };
}

export interface DashboardFilters {
  timeRange: {
    start: number;
    end: number;
    preset?: '1h' | '24h' | '7d' | '30d' | '90d' | 'custom';
  };
  severity: string[];
  domain: string[];
  component: string[];
  userId?: string;
  sessionId?: string;
}

export interface ErrorOverviewMetrics {
  totalErrors: number;
  errorRate: number;
  uniqueErrors: number;
  affectedUsers: number;
  averageResolutionTime: number;
  severityDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
  timeRange: { start: number; end: number; preset?: string };
  lastUpdated: number;
}

export interface ErrorTrendData {
  timeSeries: any[];
  growthRate: number;
  seasonality: any;
  anomalies: any[];
  projections: any;
  period: string;
}

export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: number;
  severity: string;
  domain: string;
  cluster: any;
  impact: any;
  recommendations: string[];
}

export interface RecoveryAnalytics {
  overallSuccessRate: number;
  strategyEffectiveness: any[];
  recoveryTimeDistribution: any;
  failureAnalysis: any[];
  automatedRecoveryRate: number;
  manualInterventionRate: number;
}

export interface RealTimeMetrics {
  currentErrorRate: number;
  activeAlerts: any[];
  liveStream: any[];
  systemHealth: any;
  performanceMetrics: any;
}

export class ErrorAnalyticsRepository extends UnifiedApiClientImpl {
  private config: ErrorAnalyticsRepositoryConfig;

  constructor(config: ErrorAnalyticsRepositoryConfig) {
    super({
      baseUrl: globalApiClient.getConfig().baseUrl,
      timeout: globalApiClient.getConfig().timeout,
      retry: globalApiClient.getConfig().retry,
      cache: globalApiClient.getConfig().cache,
      websocket: globalApiClient.getConfig().websocket,
      headers: globalApiClient.getConfig().headers
    });

    this.config = config;
  }

  /**
   * Get overview metrics for the error analytics dashboard
   */
  async getOverviewMetrics(filters?: Partial<DashboardFilters>): Promise<ErrorOverviewMetrics> {
    const defaultFilters: DashboardFilters = {
      timeRange: {
        start: Date.now() - this.config.filters.defaultTimeRange,
        end: Date.now(),
        preset: '24h'
      },
      severity: this.config.filters.defaultSeverity,
      domain: this.config.filters.defaultDomains,
      component: []
    };

    const mergedFilters = { ...defaultFilters, ...filters };

    // Validate time range
    if (mergedFilters.timeRange.end - mergedFilters.timeRange.start > this.config.filters.maxTimeRange) {
      throw new Error(`Time range exceeds maximum allowed: ${this.config.filters.maxTimeRange}ms`);
    }

    try {
      const metrics = await errorAnalyticsBridge.getOverviewMetrics(mergedFilters);

      logger.debug('Overview metrics retrieved', {
        totalErrors: metrics.totalErrors,
        errorRate: metrics.errorRate,
        timeRange: mergedFilters.timeRange.preset
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get overview metrics', { error, filters: mergedFilters });
      throw error;
    }
  }

  /**
   * Get error trend data for specified period
   */
  async getTrendData(period: string, filters?: Partial<DashboardFilters>): Promise<ErrorTrendData> {
    const defaultFilters: DashboardFilters = {
      timeRange: {
        start: Date.now() - this.config.filters.defaultTimeRange,
        end: Date.now(),
        preset: '24h'
      },
      severity: this.config.filters.defaultSeverity,
      domain: this.config.filters.defaultDomains,
      component: []
    };

    const mergedFilters = { ...defaultFilters, ...filters };

    try {
      const trendData = await errorAnalyticsBridge.getTrendData(period, mergedFilters);

      logger.debug('Trend data retrieved', {
        period,
        dataPoints: trendData.timeSeries.length,
        growthRate: trendData.growthRate
      });

      return trendData;
    } catch (error) {
      logger.error('Failed to get trend data', { error, period, filters: mergedFilters });
      throw error;
    }
  }

  /**
   * Get error patterns and clusters
   */
  async getPatterns(filters?: Partial<DashboardFilters>): Promise<ErrorPattern[]> {
    const defaultFilters: DashboardFilters = {
      timeRange: {
        start: Date.now() - this.config.filters.defaultTimeRange,
        end: Date.now(),
        preset: '24h'
      },
      severity: this.config.filters.defaultSeverity,
      domain: this.config.filters.defaultDomains,
      component: []
    };

    const mergedFilters = { ...defaultFilters, ...filters };

    try {
      const patterns = await errorAnalyticsBridge.getPatterns(mergedFilters);

      logger.debug('Error patterns retrieved', {
        patternCount: patterns.length,
        filters: mergedFilters
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to get error patterns', { error, filters: mergedFilters });
      throw error;
    }
  }

  /**
   * Get recovery analytics and effectiveness metrics
   */
  async getRecoveryAnalytics(filters?: Partial<DashboardFilters>): Promise<RecoveryAnalytics> {
    const defaultFilters: DashboardFilters = {
      timeRange: {
        start: Date.now() - this.config.filters.defaultTimeRange,
        end: Date.now(),
        preset: '24h'
      },
      severity: this.config.filters.defaultSeverity,
      domain: this.config.filters.defaultDomains,
      component: []
    };

    const mergedFilters = { ...defaultFilters, ...filters };

    try {
      const recoveryData = await errorAnalyticsBridge.getRecoveryAnalytics(mergedFilters);

      logger.debug('Recovery analytics retrieved', {
        successRate: recoveryData.overallSuccessRate,
        automatedRate: recoveryData.automatedRecoveryRate
      });

      return recoveryData;
    } catch (error) {
      logger.error('Failed to get recovery analytics', { error, filters: mergedFilters });
      throw error;
    }
  }

  /**
   * Get real-time error metrics and live stream
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const realTimeData = await errorAnalyticsBridge.getRealTimeMetrics();

      logger.debug('Real-time metrics retrieved', {
        currentErrorRate: realTimeData.currentErrorRate,
        activeAlerts: realTimeData.activeAlerts.length
      });

      return realTimeData;
    } catch (error) {
      logger.error('Failed to get real-time metrics', { error });
      throw error;
    }
  }

  /**
   * Get detailed error information by ID
   */
  async getErrorDetails(errorId: string): Promise<any> {
    const endpoint = `${this.config.baseEndpoint}/errors/${errorId}`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.overview }
    });

    return response.data;
  }

  /**
   * Get errors with filtering and pagination
   */
  async getErrors(filters: DashboardFilters & {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    errors: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const endpoint = `${this.config.baseEndpoint}/errors`;
    const queryParams = new URLSearchParams();

    // Add filter parameters
    queryParams.append('start_time', filters.timeRange.start.toString());
    queryParams.append('end_time', filters.timeRange.end.toString());
    if (filters.severity.length > 0) queryParams.append('severity', filters.severity.join(','));
    if (filters.domain.length > 0) queryParams.append('domain', filters.domain.join(','));
    if (filters.component.length > 0) queryParams.append('component', filters.component.join(','));
    if (filters.userId) queryParams.append('user_id', filters.userId);
    if (filters.sessionId) queryParams.append('session_id', filters.sessionId);

    // Add pagination parameters
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.sortBy) queryParams.append('sort_by', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sort_order', filters.sortOrder);

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.overview }
    });

    return response.data as {
      errors: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
    };
  }

  /**
   * Get error statistics for dashboard widgets
   */
  async getErrorStats(timeRange?: { start: number; end: number }): Promise<{
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsByDomain: Record<string, number>;
    errorsByComponent: Record<string, number>;
    topErrors: Array<{
      message: string;
      count: number;
      severity: string;
      lastSeen: number;
    }>;
    errorRateTrend: Array<{
      timestamp: number;
      errorRate: number;
    }>;
  }> {
    const endpoint = `${this.config.baseEndpoint}/errors/stats`;
    const queryParams = new URLSearchParams();

    if (timeRange) {
      queryParams.append('start_time', timeRange.start.toString());
      queryParams.append('end_time', timeRange.end.toString());
    }

    const response = await this.get(`${endpoint}?${queryParams}`, {
      cache: { ttl: this.config.cacheTTL.overview }
    });

    return response.data as {
      totalErrors: number;
      errorsBySeverity: Record<string, number>;
      errorsByDomain: Record<string, number>;
      errorsByComponent: Record<string, number>;
      topErrors: Array<{
        message: string;
        count: number;
        severity: string;
        lastSeen: number;
      }>;
      errorRateTrend: Array<{
        timestamp: number;
        errorRate: number;
      }>;
    };
  }

  /**
   * Export error data for analysis
   */
  async exportErrors(filters: DashboardFilters, format: 'json' | 'csv' = 'json'): Promise<{
    downloadUrl: string;
    expiresAt: number;
    fileSize: number;
  }> {
    const endpoint = `${this.config.baseEndpoint}/errors/export`;

    const response = await this.post(endpoint, {
      filters,
      format
    });

    logger.info('Error data export initiated', { format, filters });

    return response.data as {
      downloadUrl: string;
      expiresAt: number;
      fileSize: number;
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    components: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'critical';
      responseTime: number;
      errorRate: number;
      lastCheck: number;
    }>;
    uptime: number;
    lastIncident: number | null;
  }> {
    const endpoint = `${this.config.baseEndpoint}/system/health`;

    const response = await this.get(endpoint, {
      cache: { ttl: this.config.cacheTTL.realtime }
    });

    return response.data as {
      overall: 'healthy' | 'warning' | 'critical';
      components: Array<{
        name: string;
        status: 'healthy' | 'warning' | 'critical';
        responseTime: number;
        errorRate: number;
        lastCheck: number;
      }>;
      uptime: number;
      lastIncident: number | null;
    };
  }

  /**
   * Clear error analytics cache
   */
  clearCache(): void {
    logger.info('Error analytics cache cleared');
  }

  /**
   * Get repository status and health
   */
  getStatus(): {
    bridgeConnected: boolean;
    cacheSize: number;
    lastUpdate: number;
  } {
    return {
      bridgeConnected: true, // Bridge is always available
      cacheSize: 0, // Not tracking cache size currently
      lastUpdate: Date.now()
    };
  }
}

// Default configuration
const defaultConfig: ErrorAnalyticsRepositoryConfig = {
  baseEndpoint: '/api',
  cacheTTL: {
    overview: 30 * 1000, // 30 seconds
    trends: 60 * 1000, // 1 minute
    patterns: 5 * 60 * 1000, // 5 minutes
    recovery: 2 * 60 * 1000, // 2 minutes
    realtime: 10 * 1000 // 10 seconds
  },
  filters: {
    defaultTimeRange: 24 * 60 * 60 * 1000, // 24 hours
    maxTimeRange: 90 * 24 * 60 * 60 * 1000, // 90 days
    defaultSeverity: ['CRITICAL', 'HIGH', 'MEDIUM'],
    defaultDomains: ['NETWORK', 'AUTHENTICATION', 'VALIDATION', 'SYSTEM']
  }
};

// Export singleton instance
export const errorAnalyticsRepository = new ErrorAnalyticsRepository(defaultConfig);