/**
 * Database Bill Data Source Tests
 * 
 * Unit tests for the database data source implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DatabaseBillDataSource } from '../database-bill-data-source';
import { BillFilters } from '../bill-data-source.interface';

// Mock the database import
vi.mock('@server/infrastructure/database', () => {
  const mockResult = vi.fn();
  
  // Create a chainable mock that always ends with mockResult
  const createChainableMock = (): any => {
    const mock = {
      from: vi.fn(() => createChainableMock()),
      leftJoin: vi.fn(() => createChainableMock()),
      where: vi.fn(() => createChainableMock()),
      groupBy: vi.fn(() => createChainableMock()),
      orderBy: vi.fn(() => createChainableMock()),
      limit: vi.fn(() => mockResult()),
      // Make the mock thenable so it can be awaited directly (for count queries)
      then: (resolve: any) => resolve(mockResult()),
    };
    return mock;
  };
  
  const mockSelect = vi.fn(() => createChainableMock());

  return {
    readDatabase: {
      select: mockSelect,
    },
    // Export mockResult so we can access it in tests
    __mockResult: mockResult,
  };
});

// Mock the schema imports
vi.mock('@server/infrastructure/schema', () => ({
  bills: {
    id: 'bills.id',
    title: 'bills.title',
    summary: 'bills.summary',
    status: 'bills.status',
    category: 'bills.category',
    introduced_date: 'bills.introduced_date',
    bill_number: 'bills.bill_number',
    full_text: 'bills.full_text',
    sponsor_id: 'bills.sponsor_id',
    tags: 'bills.tags',
    last_action_date: 'bills.last_action_date',
    created_at: 'bills.created_at',
    updated_at: 'bills.updated_at',
  },
  bill_engagement: {
    bill_id: 'bill_engagement.bill_id',
    view_count: 'bill_engagement.view_count',
    share_count: 'bill_engagement.share_count',
    engagement_score: 'bill_engagement.engagement_score',
  },
  comments: {
    id: 'comments.id',
    bill_id: 'comments.bill_id',
  },
}));

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, op: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, op: 'and' })),
  or: vi.fn((...conditions) => ({ conditions, op: 'or' })),
  desc: vi.fn((field) => ({ field, op: 'desc' })),
  sql: vi.fn((template, ...values) => ({ template, values, type: 'sql' })),
}));

// Mock logger
vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('DatabaseBillDataSource', () => {
  let dataSource: DatabaseBillDataSource;
  let mockDb: any;
  let mockResult: any;

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
  };

  beforeEach(async () => {
    dataSource = new DatabaseBillDataSource();
    
    // Get the mocked database
    const { readDatabase } = await import('@server/infrastructure/database');
    mockDb = readDatabase as any;
    
    // Get the mock result function
    const mockModule = await import('@server/infrastructure/database');
    mockResult = (mockModule as any).__mockResult;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should find bill by ID successfully', async () => {
      mockResult.mockResolvedValue([mockBillData]);

      const result = await dataSource.findById('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toBeDefined();
      expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result?.title).toBe('Test Bill');
      expect(result?.complexity_score).toBe(5);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return null when bill not found', async () => {
      mockResult.mockResolvedValue([]);

      const result = await dataSource.findById('non-existent-id');

      expect(result).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockResult.mockRejectedValue(error);

      await expect(dataSource.findById('test-id')).rejects.toThrow('Database connection failed');
    });
  });

  describe('findAll', () => {
    it('should find all bills without filters', async () => {
      mockResult.mockResolvedValue([mockBillData]);

      const result = await dataSource.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      mockResult.mockResolvedValue([mockBillData]);

      const filters: BillFilters = { status: 'draft' };
      const result = await dataSource.findAll(filters);

      expect(result).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockResult.mockResolvedValue([mockBillData]);

      const filters: BillFilters = { search: 'test' };
      const result = await dataSource.findAll(filters);

      expect(result).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database query failed');
      mockResult.mockRejectedValue(error);

      await expect(dataSource.findAll()).rejects.toThrow('Database query failed');
    });
  });

  describe('count', () => {
    it('should count bills without filters', async () => {
      mockResult.mockResolvedValue([{ count: 5 }]);

      const result = await dataSource.count();

      expect(result).toBe(5);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should count bills with filters', async () => {
      mockResult.mockResolvedValue([{ count: 2 }]);

      const filters: BillFilters = { status: 'passed' };
      const result = await dataSource.count(filters);

      expect(result).toBe(2);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return 0 when no results', async () => {
      mockResult.mockResolvedValue([]);

      const result = await dataSource.count();

      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      const error = new Error('Count query failed');
      mockResult.mockRejectedValue(error);

      await expect(dataSource.count()).rejects.toThrow('Count query failed');
    });
  });

  describe('getStats', () => {
    it('should return bill statistics', async () => {
      // Mock the three queries: total, by status, by category
      mockResult
        .mockResolvedValueOnce([{ count: 10 }]) // total
        .mockResolvedValueOnce([
          { status: 'draft', count: 5 },
          { status: 'passed', count: 3 },
          { status: 'committee_stage', count: 2 }
        ]) // by status
        .mockResolvedValueOnce([
          { category: 'technology', count: 4 },
          { category: 'healthcare', count: 3 },
          { category: 'infrastructure', count: 3 }
        ]); // by category

      const result = await dataSource.getStats();

      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual({
        'draft': 5,
        'passed': 3,
        'committee_stage': 2
      });
      expect(result.byCategory).toEqual({
        'technology': 4,
        'healthcare': 3,
        'infrastructure': 3
      });
      expect(mockDb.select).toHaveBeenCalledTimes(3);
    });

    it('should handle database errors', async () => {
      const error = new Error('Stats query failed');
      mockResult.mockRejectedValue(error);

      await expect(dataSource.getStats()).rejects.toThrow('Stats query failed');
    });
  });

  describe('isAvailable', () => {
    it('should return true when database is available', async () => {
      mockResult.mockResolvedValue([{ count: 1 }]);

      const result = await dataSource.isAvailable();

      expect(result).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return false when database is unavailable', async () => {
      const error = new Error('Connection failed');
      mockResult.mockRejectedValue(error);

      const result = await dataSource.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status when healthy', async () => {
      mockResult.mockResolvedValue([{ count: 1 }]);
      await dataSource.isAvailable(); // Set healthy state

      const status = dataSource.getStatus();

      expect(status.type).toBe('database');
      expect(status.available).toBe(true);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.error).toBeNull();
      expect(status.metadata).toBeDefined();
    });

    it('should return status when unhealthy', async () => {
      const error = new Error('Connection failed');
      mockResult.mockRejectedValue(error);
      await dataSource.isAvailable(); // Set unhealthy state

      const status = dataSource.getStatus();

      expect(status.type).toBe('database');
      expect(status.available).toBe(false);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.error).toBe('Connection failed');
    });
  });
});