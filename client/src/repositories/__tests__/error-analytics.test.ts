/**
 * Error Analytics Repository Unit Tests
 *
 * Tests the ErrorAnalyticsRepository class methods with mocked API responses.
 * Focuses on error tracking, analytics, and monitoring through the error analytics bridge.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { ErrorAnalyticsRepository } from '../error-analytics';
import { UnifiedApiClientImpl } from '../../core/api/client';

// Mock the unified API client
jest.mock('../../core/api/client', () => ({
  UnifiedApiClientImpl: jest.fn(),
  globalApiClient: {
    getConfig: jest.fn(() => ({
      baseUrl: 'http://localhost:3000',
      timeout: 5000,
      retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffMultiplier: 2 },
      cache: { defaultTTL: 300000, maxSize: 100, storage: 'memory' },
      websocket: { url: 'ws://localhost:3000', reconnect: { enabled: true } },
      headers: { 'Content-Type': 'application/json' }
    }))
  }
}));

// Mock error analytics bridge
jest.mock('../../services/errorAnalyticsBridge', () => ({
  errorAnalyticsBridge: {
    getOverviewMetrics: jest.fn(),
    getTrendData: jest.fn(),
    getPatterns: jest.fn(),
    getRecoveryAnalytics: jest.fn(),
    getRealTimeMetrics: jest.fn()
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ErrorAnalyticsRepository', () => {
  let repository: ErrorAnalyticsRepository;
  let mockApiClient: jest.Mocked<UnifiedApiClientImpl>;
  let mockBridge: any;

  const mockConfig = {
    baseEndpoint: '/api',
    cacheTTL: {
      overview: 30000,
      trends: 60000,
      patterns: 300000,
      recovery: 120000,
      realtime: 10000
    },
    filters: {
      defaultTimeRange: 86400000, // 24 hours
      maxTimeRange: 7776000000, // 90 days
      defaultSeverity: ['CRITICAL', 'HIGH', 'MEDIUM'],
      defaultDomains: ['NETWORK', 'AUTHENTICATION', 'VALIDATION']
    }
  };

  const mockFilters: any = {
    timeRange: { start: Date.now() - 86400000, end: Date.now(), preset: '24h' },
    severity: ['CRITICAL', 'HIGH'],
    domain: ['NETWORK', 'AUTHENTICATION'],
    component: ['api-client']
  };

  const mockOverviewMetrics = {
    totalErrors: 1250,
    errorRate: 2.5,
    uniqueErrors: 45,
    affectedUsers: 320,
    averageResolutionTime: 1800000, // 30 minutes
    severityDistribution: { CRITICAL: 25, HIGH: 150, MEDIUM: 875, LOW: 200 },
    domainDistribution: { NETWORK: 400, AUTHENTICATION: 300, VALIDATION: 350, SYSTEM: 200 },
    timeRange: { start: Date.now() - 86400000, end: Date.now(), preset: '24h' },
    lastUpdated: Date.now()
  };

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    } as any;

    // Create mock bridge
    mockBridge = {
      getOverviewMetrics: jest.fn(),
      getTrendData: jest.fn(),
      getPatterns: jest.fn(),
      getRecoveryAnalytics: jest.fn(),
      getRealTimeMetrics: jest.fn()
    };

    (UnifiedApiClientImpl as jest.Mock).mockImplementation(() => mockApiClient);

    // Import and set up the bridge mock
    const bridgeModule = require('../../services/errorAnalyticsBridge');
    Object.assign(bridgeModule.errorAnalyticsBridge, mockBridge);

    repository = new ErrorAnalyticsRepository(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverviewMetrics', () => {
    it('should get overview metrics with default filters', async () => {
      mockBridge.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);

      const result = await repository.getOverviewMetrics();

      expect(mockBridge.getOverviewMetrics).toHaveBeenCalledWith({
        timeRange: {
          start: expect.any(Number),
          end: expect.any(Number),
          preset: '24h'
        },
        severity: mockConfig.filters.defaultSeverity,
        domain: mockConfig.filters.defaultDomains,
        component: []
      });
      expect(result).toEqual(mockOverviewMetrics);
    });

    it('should get overview metrics with custom filters', async () => {
      mockBridge.getOverviewMetrics.mockResolvedValue(mockOverviewMetrics);

      const result = await repository.getOverviewMetrics(mockFilters);

      expect(mockBridge.getOverviewMetrics).toHaveBeenCalledWith(mockFilters);
      expect(result).toEqual(mockOverviewMetrics);
    });

    it('should validate time range and throw on exceed max', async () => {
      const invalidFilters = {
        ...mockFilters,
        timeRange: {
          start: Date.now() - (100 * 24 * 60 * 60 * 1000), // 100 days
          end: Date.now()
        }
      };

      await expect(repository.getOverviewMetrics(invalidFilters))
        .rejects.toThrow('Time range exceeds maximum allowed: 7776000000ms');
    });

    it('should handle bridge errors', async () => {
      mockBridge.getOverviewMetrics.mockRejectedValue(new Error('Bridge error'));

      await expect(repository.getOverviewMetrics()).rejects.toThrow('Bridge error');
    });
  });

  describe('getTrendData', () => {
    const mockTrendData = {
      timeSeries: [
        { timestamp: Date.now() - 3600000, errorCount: 25, errorRate: 1.2 },
        { timestamp: Date.now() - 1800000, errorCount: 30, errorRate: 1.5 },
        { timestamp: Date.now(), errorCount: 20, errorRate: 1.0 }
      ],
      growthRate: 0.15,
      seasonality: { pattern: 'daily', confidence: 0.85 },
      anomalies: [
        { timestamp: Date.now() - 7200000, severity: 'high', description: 'Spike in authentication errors' }
      ],
      projections: { nextHour: 35, nextDay: 280 },
      period: '1h'
    };

    it('should get trend data successfully', async () => {
      const period = '24h';
      mockBridge.getTrendData.mockResolvedValue(mockTrendData);

      const result = await repository.getTrendData(period, mockFilters);

      expect(mockBridge.getTrendData).toHaveBeenCalledWith(period, mockFilters);
      expect(result).toEqual(mockTrendData);
    });

    it('should handle bridge errors', async () => {
      mockBridge.getTrendData.mockRejectedValue(new Error('Trend data error'));

      await expect(repository.getTrendData('1h')).rejects.toThrow('Trend data error');
    });
  });

  describe('getPatterns', () => {
    const mockPatterns = [
      {
        id: 'pattern-1',
        name: 'Authentication Timeout',
        description: 'Recurring authentication timeout errors',
        frequency: 45,
        firstSeen: Date.now() - (7 * 24 * 60 * 60 * 1000),
        lastSeen: Date.now() - 3600000,
        affectedUsers: 125,
        severity: 'HIGH',
        domain: 'AUTHENTICATION',
        cluster: { size: 45, similarity: 0.92 },
        impact: { userExperience: 'high', business: 'medium' },
        recommendations: [
          'Increase authentication timeout threshold',
          'Implement retry logic for auth requests'
        ]
      }
    ];

    it('should get error patterns successfully', async () => {
      mockBridge.getPatterns.mockResolvedValue(mockPatterns);

      const result = await repository.getPatterns(mockFilters);

      expect(mockBridge.getPatterns).toHaveBeenCalledWith(mockFilters);
      expect(result).toEqual(mockPatterns);
    });

    it('should handle bridge errors', async () => {
      mockBridge.getPatterns.mockRejectedValue(new Error('Patterns error'));

      await expect(repository.getPatterns()).rejects.toThrow('Patterns error');
    });
  });

  describe('getRecoveryAnalytics', () => {
    const mockRecoveryData = {
      overallSuccessRate: 0.85,
      strategyEffectiveness: [
        { strategy: 'automatic_retry', successRate: 0.92, usageCount: 450 },
        { strategy: 'user_refresh', successRate: 0.78, usageCount: 120 },
        { strategy: 'fallback_mode', successRate: 0.65, usageCount: 35 }
      ],
      recoveryTimeDistribution: {
        p50: 5000,
        p95: 15000,
        p99: 30000
      },
      failureAnalysis: [
        { reason: 'network_timeout', count: 25, percentage: 0.15 },
        { reason: 'server_error', count: 18, percentage: 0.11 }
      ],
      automatedRecoveryRate: 0.72,
      manualInterventionRate: 0.28
    };

    it('should get recovery analytics successfully', async () => {
      mockBridge.getRecoveryAnalytics.mockResolvedValue(mockRecoveryData);

      const result = await repository.getRecoveryAnalytics(mockFilters);

      expect(mockBridge.getRecoveryAnalytics).toHaveBeenCalledWith(mockFilters);
      expect(result).toEqual(mockRecoveryData);
    });

    it('should handle bridge errors', async () => {
      mockBridge.getRecoveryAnalytics.mockRejectedValue(new Error('Recovery analytics error'));

      await expect(repository.getRecoveryAnalytics()).rejects.toThrow('Recovery analytics error');
    });
  });

  describe('getRealTimeMetrics', () => {
    const mockRealTimeData = {
      currentErrorRate: 1.2,
      activeAlerts: [
        {
          id: 'alert-1',
          type: 'error_rate_spike',
          severity: 'high',
          message: 'Error rate exceeded threshold',
          timestamp: Date.now(),
          acknowledged: false
        }
      ],
      liveStream: [
        {
          id: 'error-1',
          timestamp: Date.now(),
          severity: 'HIGH',
          domain: 'NETWORK',
          message: 'Connection timeout',
          userId: 'user-123',
          sessionId: 'session-456'
        }
      ],
      systemHealth: {
        overall: 'warning',
        components: [
          { name: 'api', status: 'healthy', responseTime: 150 },
          { name: 'database', status: 'warning', responseTime: 850 }
        ]
      },
      performanceMetrics: {
        averageResponseTime: 245,
        throughput: 1250,
        errorRate: 1.2,
        uptime: 0.995
      }
    };

    it('should get real-time metrics successfully', async () => {
      mockBridge.getRealTimeMetrics.mockResolvedValue(mockRealTimeData);

      const result = await repository.getRealTimeMetrics();

      expect(mockBridge.getRealTimeMetrics).toHaveBeenCalled();
      expect(result).toEqual(mockRealTimeData);
    });

    it('should handle bridge errors', async () => {
      mockBridge.getRealTimeMetrics.mockRejectedValue(new Error('Real-time metrics error'));

      await expect(repository.getRealTimeMetrics()).rejects.toThrow('Real-time metrics error');
    });
  });

  describe('getErrorDetails', () => {
    it('should get error details by ID', async () => {
      const errorId = 'error-123';
      const mockErrorDetails = {
        id: errorId,
        timestamp: Date.now(),
        severity: 'HIGH',
        domain: 'NETWORK',
        component: 'api-client',
        message: 'Connection timeout',
        stackTrace: 'Error: Connection timeout\n    at ...',
        userId: 'user-123',
        sessionId: 'session-456',
        userAgent: 'Mozilla/5.0...',
        url: '/api/bills',
        requestId: 'req-789',
        metadata: { retryCount: 2, duration: 5000 }
      };

      const mockResponse = {
        data: mockErrorDetails,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getErrorDetails(errorId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/errors/error-123',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.overview }
        })
      );
      expect(result).toEqual(mockErrorDetails);
    });
  });

  describe('getErrors', () => {
    const mockErrorsResponse = {
      errors: [
        {
          id: 'error-1',
          timestamp: Date.now(),
          severity: 'HIGH',
          domain: 'NETWORK',
          message: 'Connection timeout'
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      }
    };

    it('should get errors with filters and pagination', async () => {
      const filters = {
        ...mockFilters,
        page: 1,
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc' as const
      };

      const mockResponse = {
        data: mockErrorsResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getErrors(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/errors?start_time=0&end_time=0&severity=CRITICAL%2CHIGH&domain=NETWORK%2CAUTHENTICATION&component=api-client&page=1&limit=50&sort_by=timestamp&sort_order=desc',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.overview }
        })
      );
      expect(result).toEqual(mockErrorsResponse);
    });
  });

  describe('getErrorStats', () => {
    const mockStats = {
      totalErrors: 1250,
      errorsBySeverity: { CRITICAL: 25, HIGH: 150, MEDIUM: 875, LOW: 200 },
      errorsByDomain: { NETWORK: 400, AUTHENTICATION: 300, VALIDATION: 350, SYSTEM: 200 },
      errorsByComponent: { 'api-client': 500, 'auth-service': 300, 'bill-service': 450 },
      topErrors: [
        {
          message: 'Connection timeout',
          count: 150,
          severity: 'HIGH',
          lastSeen: Date.now()
        }
      ],
      errorRateTrend: [
        { timestamp: Date.now() - 3600000, errorRate: 1.2 },
        { timestamp: Date.now() - 1800000, errorRate: 1.5 },
        { timestamp: Date.now(), errorRate: 1.0 }
      ]
    };

    it('should get error statistics', async () => {
      const timeRange = { start: Date.now() - 86400000, end: Date.now() };

      const mockResponse = {
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getErrorStats(timeRange);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/errors/stats?start_time=${timeRange.start}&end_time=${timeRange.end}`,
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.overview }
        })
      );
      expect(result).toEqual(mockStats);
    });

    it('should get error statistics without time range', async () => {
      const mockResponse = {
        data: mockStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getErrorStats();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/errors/stats',
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('exportErrors', () => {
    it('should export errors successfully', async () => {
      const format = 'csv';
      const mockExportResult = {
        downloadUrl: 'https://example.com/export/errors-123.csv',
        expiresAt: Date.now() + 3600000,
        fileSize: 1024000
      };

      const mockResponse = {
        data: mockExportResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await repository.exportErrors(mockFilters, format);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/errors/export', {
        filters: mockFilters,
        format
      });
      expect(result).toEqual(mockExportResult);
    });
  });

  describe('getSystemHealth', () => {
    const mockHealth = {
      overall: 'healthy' as const,
      components: [
        {
          name: 'api',
          status: 'healthy' as const,
          responseTime: 150,
          errorRate: 0.5,
          lastCheck: Date.now()
        }
      ],
      uptime: 0.995,
      lastIncident: null
    };

    it('should get system health metrics', async () => {
      const mockResponse = {
        data: mockHealth,
        status: 200,
        statusText: 'OK',
        headers: {},
        timestamp: new Date().toISOString(),
        duration: 150,
        cached: false,
        fromFallback: false,
        requestId: 'req-123'
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await repository.getSystemHealth();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/system/health',
        expect.objectContaining({
          cache: { ttl: mockConfig.cacheTTL.realtime }
        })
      );
      expect(result).toEqual(mockHealth);
    });
  });

  describe('getStatus', () => {
    it('should return repository status', () => {
      const status = repository.getStatus();

      expect(status).toEqual({
        bridgeConnected: true,
        cacheSize: 0,
        lastUpdate: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(repository.getErrorDetails('error-123')).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Request timeout'));

      await expect(repository.exportErrors(mockFilters)).rejects.toThrow('Request timeout');
    });
  });
});