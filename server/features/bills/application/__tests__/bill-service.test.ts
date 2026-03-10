/**
 * Bill Service Tests
 * 
 * Unit tests for the cached bill service with data source abstraction.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CachedBillService } from '../bill-service';
import { BillDataSource } from '../infrastructure/data-sources/bill-data-source.interface';

// Mock dependencies
const mockDataSource: BillDataSource = {
  findById: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn(),
  getStats: vi.fn(),
  isAvailable: vi.fn(),
  getStatus: vi.fn(() => ({
    type: 'mock',
    available: true,
    lastCheck: new Date(),
  })),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockSecurityAuditService = {
  logSecurityEvent: vi.fn(),
};

const mockInputSanitizationService = {
  sanitizeString: vi.fn((str) => str),
  sanitizeHtml: vi.fn((str) => str),
  createSafeLikePattern: vi.fn((str) => str),
};

const mockValidateData = vi.fn();

// Mock all dependencies
vi.mock('../../infrastructure/data-sources/bill-data-source-factory', () => ({
  BillDataSourceFactory: {
    getInstance: vi.fn(() => ({
      getDataSource: vi.fn(() => Promise.resolve(mockDataSource)),
    })),
  },
}));

vi.mock('@server/infrastructure/cache', () => ({
  cacheService: mockCacheService,
}));

vi.mock('@server/features/security', () => ({
  securityAuditService: mockSecurityAuditService,
  InputSanitizationService: vi.fn(() => mockInputSanitizationService),
}));

vi.mock('@server/infrastructure/validation/validation-helpers', () => ({
  validateData: mockValidateData,
}));

vi.mock('@server/infrastructure/cache/cache-keys', () => ({
  cacheKeys: {
    bill: vi.fn((id, type) => `bill:${id}:${type}`),
    search: vi.fn((query, filters) => `search:${query}:${JSON.stringify(filters)}`),
    list: vi.fn((type, filters) => `list:${type}:${JSON.stringify(filters)}`),
    analytics: vi.fn((type) => `analytics:${type}`),
  },
  CACHE_TTL: {
    BILLS: 3600,
    SEARCH: 1800,
    HOUR: 3600,
  },
  createCacheInvalidation: vi.fn(() => ({
    invalidateBill: vi.fn(),
    invalidateList: vi.fn(),
    invalidateSearch: vi.fn(),
  })),
}));

vi.mock('./bill-lifecycle-hooks', () => ({
  billLifecycleHooks: {
    onBillCreated: vi.fn(() => Promise.resolve()),
    onBillUpdated: vi.fn(() => Promise.resolve()),
    onBillStatusChanged: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CachedBillService', () => {
  let service: CachedBillService;

  const mockBillData = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Test Bill',
    summary: 'Test Summary',
    status: 'draft',
    category: 'technology',
    introduced_date: '2024-01-15',
    bill_number: 'HR-2024-001',
    full_text: 'Full text...',
    sponsor_id: 'sponsor-001',
    tags: ['test'],
    last_action_date: '2024-01-20',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-20'),
    comment_count: 5,
    view_count: 100,
    share_count: 10,
    engagement_score: '50',
    complexity_score: 5,
  };

  beforeEach(() => {
    service = new CachedBillService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBillById', () => {
    it('should return cached bill if available', async () => {
      mockCacheService.get.mockResolvedValue(mockBillData);

      const result = await service.getBillById('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockBillData);
      }
      expect(mockCacheService.get).toHaveBeenCalledWith('bill:test-id:details');
      expect(mockDataSource.findById).not.toHaveBeenCalled();
    });

    it('should fetch from data source when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockDataSource.findById.mockResolvedValue(mockBillData);

      const result = await service.getBillById('test-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      }
      expect(mockDataSource.findById).toHaveBeenCalledWith('test-id');
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalled();
    });

    it('should return null when bill not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockDataSource.findById.mockResolvedValue(null);

      const result = await service.getBillById('non-existent-id');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should handle data source errors properly', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const error = new Error('Data source failed');
      mockDataSource.findById.mockRejectedValue(error);

      const result = await service.getBillById('test-id');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Failed to retrieve bill test-id');
      }
    });

    it('should sanitize input ID', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockDataSource.findById.mockResolvedValue(mockBillData);
      mockInputSanitizationService.sanitizeString.mockReturnValue('sanitized-id');

      await service.getBillById('test-id');

      expect(mockInputSanitizationService.sanitizeString).toHaveBeenCalledWith('test-id');
      expect(mockDataSource.findById).toHaveBeenCalledWith('sanitized-id');
    });
  });

  describe('searchBills', () => {
    const mockSearchResults = [mockBillData];

    beforeEach(() => {
      mockValidateData.mockResolvedValue({
        success: true,
        data: {
          query: 'test query',
          filters: { status: 'draft' },
        },
      });
    });

    it('should return cached search results if available', async () => {
      mockCacheService.get.mockResolvedValue(mockSearchResults);

      const result = await service.searchBills('test query', { status: 'draft' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockSearchResults);
      }
      expect(mockDataSource.findAll).not.toHaveBeenCalled();
    });

    it('should search data source when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockDataSource.findAll.mockResolvedValue(mockSearchResults);

      const result = await service.searchBills('test query', { status: 'draft' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockSearchResults);
      }
      expect(mockDataSource.findAll).toHaveBeenCalledWith({
        status: 'draft',
        search: 'test query',
      });
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockSecurityAuditService.logSecurityEvent).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockValidateData.mockResolvedValue({
        success: false,
        errors: [{ field: 'query', message: 'Required' }],
      });

      const result = await service.searchBills('', {});

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Validation failed');
      }
    });

    it('should handle data source errors', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const error = new Error('Search failed');
      mockDataSource.findAll.mockRejectedValue(error);

      const result = await service.searchBills('test query');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Failed to search bills');
      }
    });
  });

  describe('getBillStats', () => {
    const mockStats = {
      total: 10,
      byStatus: { draft: 5, passed: 3, committee_stage: 2 },
      byCategory: { technology: 4, healthcare: 3, infrastructure: 3 },
    };

    it('should return cached stats if available', async () => {
      mockCacheService.get.mockResolvedValue(mockStats);

      const result = await service.getBillStats();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockStats);
      }
      expect(mockDataSource.getStats).not.toHaveBeenCalled();
    });

    it('should fetch stats from data source when not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockDataSource.getStats.mockResolvedValue(mockStats);

      const result = await service.getBillStats();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockStats);
      }
      expect(mockDataSource.getStats).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle data source errors', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const error = new Error('Stats query failed');
      mockDataSource.getStats.mockRejectedValue(error);

      const result = await service.getBillStats();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Failed to retrieve bill statistics');
      }
    });
  });

  describe('countBills', () => {
    it('should count bills using data source', async () => {
      mockDataSource.count.mockResolvedValue(5);

      const result = await service.countBills({ status: 'draft' });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(5);
      }
      expect(mockDataSource.count).toHaveBeenCalledWith({ status: 'draft' });
    });

    it('should handle data source errors', async () => {
      const error = new Error('Count failed');
      mockDataSource.count.mockRejectedValue(error);

      const result = await service.countBills();

      expect(result.isOk()).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should invalidate bill caches', async () => {
      const mockInvalidation = {
        invalidateBill: vi.fn(),
        invalidateList: vi.fn(),
        invalidateSearch: vi.fn(),
      };

      // Mock the cache invalidation
      const { createCacheInvalidation } = await import('@server/infrastructure/cache/cache-keys');
      vi.mocked(createCacheInvalidation).mockReturnValue(mockInvalidation);

      await service.invalidateBillCaches('test-id');

      expect(mockInvalidation.invalidateBill).toHaveBeenCalledWith('test-id');
    });

    it('should invalidate all bill caches', async () => {
      const mockInvalidation = {
        invalidateBill: vi.fn(),
        invalidateList: vi.fn(),
        invalidateSearch: vi.fn(),
      };

      const { createCacheInvalidation } = await import('@server/infrastructure/cache/cache-keys');
      vi.mocked(createCacheInvalidation).mockReturnValue(mockInvalidation);

      await service.invalidateAllBillCaches();

      expect(mockInvalidation.invalidateList).toHaveBeenCalledWith('bill');
      expect(mockInvalidation.invalidateSearch).toHaveBeenCalled();
    });
  });
});