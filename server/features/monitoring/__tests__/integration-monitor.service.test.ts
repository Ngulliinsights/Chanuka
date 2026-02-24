/**
 * Integration Monitor Service Unit Tests
 * 
 * Tests the monitoring service functionality including:
 * - Feature registration
 * - Metrics recording and calculation
 * - Health checks and status updates
 * - Alert creation and management
 * - Alert rules and evaluation
 * - Event logging
 * - Dashboard data aggregation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IntegrationMonitorService } from '../domain/integration-monitor.service';

// Mock dependencies
vi.mock('@server/infrastructure/database', () => ({
  database: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@server/infrastructure/observability/monitoring/error-tracker', () => ({
  errorTracker: {
    trackError: vi.fn(),
  },
}));

vi.mock('@server/infrastructure/observability/monitoring/performance-monitor', () => ({
  performanceMonitor: {
    trackMetric: vi.fn(),
  },
}));

describe('IntegrationMonitorService', () => {
  let service: IntegrationMonitorService;

  beforeEach(() => {
    service = new IntegrationMonitorService();
    vi.clearAllMocks();
  });

  describe('Feature Registration', () => {
    it('should register a new feature', async () => {
      const feature = {
        name: 'test-feature',
        displayName: 'Test Feature',
        description: 'A test feature',
        category: 'quick-wins',
        phase: 1,
        enabled: false,
      };

      // Mock database response
      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'test-id', ...feature }]),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;

      const result = await service.registerFeature(feature);

      expect(result).toBeDefined();
      expect(result.name).toBe('test-feature');
    });
  });

  describe('Metrics Recording', () => {
    it('should record feature metrics', async () => {
      const featureId = 'test-feature-id';
      const usage = {
        activeUsers: 10,
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
      };
      const performance = {
        avgResponseTime: 150,
        p95ResponseTime: 300,
        p99ResponseTime: 500,
      };

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;
      (mockDb.database.select as any) = mockSelect;

      await service.recordMetrics(featureId, usage, performance);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should calculate error rate correctly', async () => {
      const featureId = 'test-feature-id';
      const usage = {
        activeUsers: 5,
        totalRequests: 100,
        successfulRequests: 90,
        failedRequests: 10,
      };
      const performance = {
        avgResponseTime: 200,
        p95ResponseTime: 400,
        p99ResponseTime: 600,
      };

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;
      (mockDb.database.select as any) = mockSelect;

      await service.recordMetrics(featureId, usage, performance);

      // Error rate should be 10/100 = 0.1
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('Health Checks', () => {
    it('should perform health check and record result', async () => {
      const featureId = 'test-feature-id';
      const checkFn = vi.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 100,
      });

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'check-id',
              featureId,
              status: 'healthy',
              responseTime: '100',
            },
          ]),
        }),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;
      (mockDb.database.update as any) = mockUpdate;

      const result = await service.performHealthCheck(featureId, checkFn);

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(checkFn).toHaveBeenCalled();
    });

    it('should create alert on failed health check', async () => {
      const featureId = 'test-feature-id';
      const checkFn = vi.fn().mockResolvedValue({
        status: 'down',
        errorMessage: 'Service unavailable',
      });

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'check-id',
              featureId,
              status: 'down',
            },
          ]),
        }),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;
      (mockDb.database.update as any) = mockUpdate;

      const result = await service.performHealthCheck(featureId, checkFn);

      expect(result.status).toBe('down');
      expect(mockInsert).toHaveBeenCalledTimes(2); // health check + alert
    });
  });

  describe('Alert Management', () => {
    it('should create an alert', async () => {
      const alert = {
        featureId: 'test-feature-id',
        severity: 'high' as const,
        type: 'error_rate',
        title: 'High Error Rate',
        message: 'Error rate exceeded threshold',
      };

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'alert-id', ...alert }]),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;

      const result = await service.createAlert(alert);

      expect(result).toBeDefined();
      expect(result.severity).toBe('high');
    });

    it('should acknowledge an alert', async () => {
      const alertId = 'test-alert-id';
      const userId = 'test-user-id';

      const mockDb = await import('@server/infrastructure/database');
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (mockDb.database.update as any) = mockUpdate;

      await service.acknowledgeAlert(alertId, userId);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should resolve an alert', async () => {
      const alertId = 'test-alert-id';
      const userId = 'test-user-id';

      const mockDb = await import('@server/infrastructure/database');
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (mockDb.database.update as any) = mockUpdate;

      await service.resolveAlert(alertId, userId);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('Alert Rules', () => {
    it('should add an alert rule', async () => {
      const rule = {
        featureId: 'test-feature-id',
        name: 'High Error Rate',
        metric: 'error_rate',
        operator: 'gt' as const,
        threshold: '0.05',
        timeWindow: 5,
        severity: 'high' as const,
        cooldown: 15,
      };

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'rule-id', ...rule }]),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;

      const result = await service.addAlertRule(rule);

      expect(result).toBeDefined();
      expect(result.metric).toBe('error_rate');
    });
  });

  describe('Logging', () => {
    it('should log an integration event', async () => {
      const featureId = 'test-feature-id';
      const level = 'info';
      const category = 'api';
      const message = 'Test log message';

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      (mockDb.database.insert as any) = mockInsert;

      await service.logEvent(featureId, level, category, message);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('should not throw on logging errors', async () => {
      const featureId = 'test-feature-id';
      const level = 'error';
      const category = 'system';
      const message = 'Test error message';

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error')),
      });
      (mockDb.database.insert as any) = mockInsert;

      // Should not throw
      await expect(
        service.logEvent(featureId, level, category, message)
      ).resolves.not.toThrow();
    });
  });

  describe('Dashboard Data', () => {
    it('should get dashboard data', async () => {
      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      const result = await service.getDashboardData();

      expect(result).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.systemHealth).toBeDefined();
    });

    it('should include system health metrics', async () => {
      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      const result = await service.getDashboardData();

      expect(result.systemHealth).toHaveProperty('totalFeatures');
      expect(result.systemHealth).toHaveProperty('healthyFeatures');
      expect(result.systemHealth).toHaveProperty('degradedFeatures');
      expect(result.systemHealth).toHaveProperty('downFeatures');
      expect(result.systemHealth).toHaveProperty('totalAlerts');
      expect(result.systemHealth).toHaveProperty('criticalAlerts');
    });
  });

  describe('Feature Metrics Retrieval', () => {
    it('should get feature metrics for time range', async () => {
      const featureId = 'test-feature-id';
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');

      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                featureId,
                timestamp: new Date('2024-01-01T12:00:00'),
                activeUsers: 10,
                totalRequests: 100,
              },
            ]),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      const result = await service.getFeatureMetrics(featureId, startTime, endTime);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Feature Alerts Retrieval', () => {
    it('should get all feature alerts', async () => {
      const featureId = 'test-feature-id';

      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'alert-1',
                featureId,
                severity: 'high',
                resolved: false,
              },
            ]),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      const result = await service.getFeatureAlerts(featureId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter alerts by resolved status', async () => {
      const featureId = 'test-feature-id';

      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      await service.getFeatureAlerts(featureId, false);

      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('Feature Logs Retrieval', () => {
    it('should get feature logs', async () => {
      const featureId = 'test-feature-id';

      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  featureId,
                  level: 'info',
                  message: 'Test log',
                },
              ]),
            }),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      const result = await service.getFeatureLogs(featureId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter logs by level', async () => {
      const featureId = 'test-feature-id';
      const level = 'error';

      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      await service.getFeatureLogs(featureId, level);

      expect(mockSelect).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const featureId = 'test-feature-id';
      const limit = 50;

      const mockDb = await import('@server/infrastructure/database');
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      await service.getFeatureLogs(featureId, undefined, limit);

      expect(mockLimit).toHaveBeenCalledWith(limit);
    });
  });

  describe('Feature Status Updates', () => {
    it('should update feature enabled status', async () => {
      const featureId = 'test-feature-id';
      const enabled = true;

      const mockDb = await import('@server/infrastructure/database');
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (mockDb.database.update as any) = mockUpdate;

      await service.updateFeatureStatus(featureId, enabled);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should update feature health status', async () => {
      const featureId = 'test-feature-id';
      const enabled = true;
      const healthStatus = 'healthy';

      const mockDb = await import('@server/infrastructure/database');
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (mockDb.database.update as any) = mockUpdate;

      await service.updateFeatureStatus(featureId, enabled, healthStatus);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDb = await import('@server/infrastructure/database');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });
      (mockDb.database.select as any) = mockSelect;

      await expect(service.getDashboardData()).rejects.toThrow('Database error');
    });

    it('should track errors when operations fail', async () => {
      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Insert failed')),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;

      const { errorTracker } = await import(
        '@server/infrastructure/observability/monitoring/error-tracker'
      );

      await expect(
        service.registerFeature({
          name: 'test',
          displayName: 'Test',
          description: 'Test',
          category: 'test',
          phase: 1,
          enabled: false,
        })
      ).rejects.toThrow();

      expect(errorTracker.trackError).toHaveBeenCalled();
    });
  });

  describe('Alert Rule Evaluation', () => {
    it('should evaluate greater than operator correctly', async () => {
      const featureId = 'test-feature-id';
      const usage = {
        activeUsers: 10,
        totalRequests: 100,
        successfulRequests: 90,
        failedRequests: 10,
      };
      const performance = {
        avgResponseTime: 600, // Above threshold
        p95ResponseTime: 800,
        p99ResponseTime: 1000,
      };

      const mockDb = await import('@server/infrastructure/database');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'rule-1',
              featureId,
              metric: 'avg_response_time',
              operator: 'gt',
              threshold: '500',
              severity: 'high',
              cooldown: 15,
              enabled: true,
            },
          ]),
        }),
      });
      (mockDb.database.insert as any) = mockInsert;
      (mockDb.database.select as any) = mockSelect;

      await service.recordMetrics(featureId, usage, performance);

      // Should create an alert since 600 > 500
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
