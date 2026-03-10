/**
 * Bill Health Service Tests
 * 
 * Unit tests for the bill health monitoring service.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BillHealthService } from '../bill-health.service';

// Mock dependencies
const mockDataSource = {
  isAvailable: vi.fn(),
  getStatus: vi.fn(),
};

const mockDataSourceFactory = {
  getStatus: vi.fn(),
  getDataSource: vi.fn(() => Promise.resolve(mockDataSource)),
  forceHealthCheck: vi.fn(),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../infrastructure/data-sources/bill-data-source-factory', () => ({
  billDataSourceFactory: mockDataSourceFactory,
}));

vi.mock('@server/infrastructure/cache', () => ({
  cacheService: mockCacheService,
}));

vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('BillHealthService', () => {
  let service: BillHealthService;

  beforeEach(() => {
    service = BillHealthService.getInstance();
    vi.clearAllMocks();
    
    // Set default mock values
    mockDataSourceFactory.getStatus.mockResolvedValue({
      current: 'database',
      preferred: 'auto',
      status: {
        type: 'database',
        available: true,
        error: null,
      },
      lastHealthCheck: new Date(),
    });
    
    mockDataSource.isAvailable.mockResolvedValue(true);
    mockDataSource.getStatus.mockReturnValue({
      type: 'database',
      available: true,
      lastCheck: new Date(),
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BillHealthService.getInstance();
      const instance2 = BillHealthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all systems are working', async () => {
      // Mock cache health check
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('test');
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const status = result.value;
        expect(status.service).toBe('bills');
        expect(status.status).toBe('healthy');
        expect(status.dataSource.current).toBe('database');
        expect(status.dataSource.available).toBe(true);
        expect(status.cache.available).toBe(true);
        expect(status.features.read).toBe(true);
        expect(status.features.write).toBe(true);
        expect(status.features.search).toBe(true);
        expect(status.features.stats).toBe(true);
        expect(status.timestamp).toBeDefined();
        expect(status.metadata.version).toBe('1.0.0');
      }
    });

    it('should return degraded status when cache is unavailable', async () => {
      // Mock cache failure
      mockCacheService.set.mockRejectedValue(new Error('Cache unavailable'));

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const status = result.value;
        expect(status.status).toBe('degraded');
        expect(status.dataSource.available).toBe(true);
        expect(status.cache.available).toBe(false);
        expect(status.cache.error).toBe('Cache unavailable');
      }
    });

    it('should return unhealthy status when data source is unavailable', async () => {
      mockDataSource.isAvailable.mockResolvedValue(false);
      mockDataSourceFactory.getStatus.mockResolvedValue({
        current: 'database',
        preferred: 'auto',
        status: {
          type: 'database',
          available: false,
          error: 'Connection failed',
        },
        lastHealthCheck: new Date(),
      });

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const status = result.value;
        expect(status.status).toBe('unhealthy');
        expect(status.dataSource.available).toBe(false);
        expect(status.dataSource.error).toBe('Connection failed');
        expect(status.features.read).toBe(false);
        expect(status.features.write).toBe(false);
        expect(status.features.search).toBe(false);
        expect(status.features.stats).toBe(false);
      }
    });

    it('should indicate write unavailable for mock data source', async () => {
      mockDataSourceFactory.getStatus.mockResolvedValue({
        current: 'mock',
        preferred: 'auto',
        status: {
          type: 'mock',
          available: true,
          error: null,
        },
        lastHealthCheck: new Date(),
      });

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const status = result.value;
        expect(status.features.read).toBe(true);
        expect(status.features.write).toBe(false); // Mock doesn't support writes
        expect(status.features.search).toBe(true);
        expect(status.features.stats).toBe(true);
      }
    });

    it('should handle errors gracefully', async () => {
      mockDataSourceFactory.getStatus.mockRejectedValue(new Error('Factory error'));

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Factory error');
      }
    });
  });

  describe('refreshHealthCheck', () => {
    it('should force health check refresh', async () => {
      const result = await service.refreshHealthCheck();

      expect(result.isOk()).toBe(true);
      expect(mockDataSourceFactory.forceHealthCheck).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      mockDataSourceFactory.forceHealthCheck.mockRejectedValue(new Error('Refresh failed'));

      const result = await service.refreshHealthCheck();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Refresh failed');
      }
    });
  });

  describe('getDataSourceInfo', () => {
    it('should return detailed data source information', async () => {
      const result = await service.getDataSourceInfo();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.factory).toBeDefined();
        expect(result.value.dataSource).toBeDefined();
      }
      expect(mockDataSourceFactory.getStatus).toHaveBeenCalled();
      expect(mockDataSource.getStatus).toHaveBeenCalled();
    });

    it('should handle data source info errors', async () => {
      mockDataSourceFactory.getStatus.mockRejectedValue(new Error('Info error'));

      const result = await service.getDataSourceInfo();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Info error');
      }
    });
  });

  describe('cache health check', () => {
    it('should pass when cache operations work', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('test');
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.cache.available).toBe(true);
        expect(result.value.cache.error).toBeUndefined();
      }
    });

    it('should fail when cache set fails', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Set failed'));

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.cache.available).toBe(false);
        expect(result.value.cache.error).toBe('Set failed');
      }
    });

    it('should fail when cache get returns wrong value', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('wrong-value');

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.cache.available).toBe(false);
        expect(result.value.cache.error).toContain('value mismatch');
      }
    });
  });

  describe('overall status determination', () => {
    it('should be healthy when both data source and cache are available', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('test');
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('healthy');
      }
    });

    it('should be degraded when data source is available but cache is not', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache down'));

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('degraded');
      }
    });

    it('should be unhealthy when data source is not available', async () => {
      mockDataSource.isAvailable.mockResolvedValue(false);

      const result = await service.getHealthStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });
});