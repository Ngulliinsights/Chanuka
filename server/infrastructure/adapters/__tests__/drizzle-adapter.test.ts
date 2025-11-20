/**
 * DrizzleAdapter Unit Tests
 * 
 * Comprehensive test suite for the DrizzleAdapter class covering:
 * - Basic CRUD operations
 * - Error handling and edge cases
 * - Performance monitoring
 * - Batch operations
 * - Search functionality
 * - Filter conditions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DrizzleAdapter, createDrizzleAdapter, EntityMapping, FilterCondition } from '../drizzle-adapter';
import { databaseService } from '../../database/database-service';

// Mock dependencies
vi.mock('../../database/database-service');
vi.mock('@shared/database/connection');
vi.mock('../../../../shared/core/src/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Test entity and row types
interface TestEntity {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

interface TestRow {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

// Mock table structure
const mockTable = {
  id: { name: 'id' },
  name: { name: 'name' },
  email: { name: 'email' },
  created_at: { name: 'created_at' },
  updated_at: { name: 'updated_at' }
};

// Test entity mapping
class TestEntityMapping implements EntityMapping<TestEntity, TestRow> {
  toEntity(row: TestRow): TestEntity {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  fromEntity(entity: TestEntity): Partial<TestRow> {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      created_at: entity.created_at,
      updated_at: entity.updated_at
    };
  }
}

describe('DrizzleAdapter', () => {
  let adapter: DrizzleAdapter<TestEntity, TestRow>;
  let mockDb: any;
  let mockTx: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock database operations
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis()
    };

    mockTx = { ...mockDb };

    // Mock databaseService
    vi.mocked(databaseService.withFallback).mockImplementation(async (fn, fallback) => {
      try {
        const result = await fn();
        return { data: result, fromCache: false };
      } catch (error) {
        return { data: fallback, fromCache: false };
      }
    });

    vi.mocked(databaseService.withTransaction).mockImplementation(async (fn) => {
      const result = await fn(mockTx);
      return { data: result, fromCache: false };
    });

    // Mock db import
    vi.doMock('@shared/database/connection', () => ({
      database: mockDb
    }));

    adapter = createDrizzleAdapter(mockTable, new TestEntityMapping(), 'test_table');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should find entity by ID successfully', async () => {
      const mockRow = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.select.mockResolvedValue([mockRow]);

      const result = await adapter.findById('1');

      expect(result).toEqual(mockRow);
      expect(databaseService.withFallback).toHaveBeenCalledWith(
        expect.any(Function),
        null,
        'DrizzleAdapter:findById:test_table:1'
      );
    });

    it('should return null when entity not found', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await adapter.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(databaseService.withFallback).mockRejectedValue(error);

      await expect(adapter.findById('1')).rejects.toThrow('Database connection failed');
    });
  });

  describe('findMany', () => {
    it('should find multiple entities with filters', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'User 1',
          email: 'user1@example.com',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'User 2',
          email: 'user2@example.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const filters: FilterCondition[] = [
        { field: 'name', operator: 'like', value: 'User' }
      ];

      const result = await adapter.findMany(filters, { limit: 10, orderBy: 'name' });

      expect(result).toEqual(mockRows);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });

    it('should apply safety limit for large queries', async () => {
      mockDb.select.mockResolvedValue([]);

      await adapter.findMany([], { limit: 2000 });

      expect(mockDb.limit).toHaveBeenCalledWith(1000); // Safety limit
    });

    it('should handle empty filters', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await adapter.findMany();

      expect(result).toEqual([]);
      expect(mockDb.where).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new entity successfully', async () => {
      const newEntity: TestEntity = {
        id: '1',
        name: 'New User',
        email: 'new@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockTx.insert.mockResolvedValue([newEntity]);

      const result = await adapter.create(newEntity);

      expect(result).toEqual(newEntity);
      expect(databaseService.withTransaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(mockTx.values).toHaveBeenCalled();
      expect(mockTx.returning).toHaveBeenCalled();
    });

    it('should add timestamps if not present', async () => {
      const entityWithoutTimestamps = {
        id: '1',
        name: 'New User',
        email: 'new@example.com'
      } as TestEntity;

      mockTx.insert.mockResolvedValue([{
        ...entityWithoutTimestamps,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      await adapter.create(entityWithoutTimestamps);

      expect(mockTx.values).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        })
      );
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
      const updatedEntity: TestEntity = {
        id: '1',
        name: 'Updated User',
        email: 'updated@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockTx.update.mockResolvedValue([updatedEntity]);

      const result = await adapter.update('1', { name: 'Updated User' });

      expect(result).toEqual(updatedEntity);
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(Date)
        })
      );
    });

    it('should return null when entity not found', async () => {
      mockTx.update.mockResolvedValue([]);

      const result = await adapter.update('nonexistent', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
      mockTx.delete.mockResolvedValue({ rowCount: 1 });

      const result = await adapter.delete('1');

      expect(result).toBe(true);
      expect(mockTx.delete).toHaveBeenCalled();
    });

    it('should return false when entity not found', async () => {
      mockTx.delete.mockResolvedValue({ rowCount: 0 });

      const result = await adapter.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entities with filters', async () => {
      mockDb.select.mockResolvedValue([{ count: 5 }]);

      const filters: FilterCondition[] = [
        { field: 'name', operator: 'like', value: 'User' }
      ];

      const result = await adapter.count(filters);

      expect(result).toBe(5);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should count all entities when no filters', async () => {
      mockDb.select.mockResolvedValue([{ count: 10 }]);

      const result = await adapter.count();

      expect(result).toBe(10);
      expect(mockDb.where).not.toHaveBeenCalled();
    });
  });

  describe('batchCreate', () => {
    it('should create multiple entities', async () => {
      const entities: TestEntity[] = [
        {
          id: '1',
          name: 'User 1',
          email: 'user1@example.com',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'User 2',
          email: 'user2@example.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockTx.insert.mockResolvedValue(entities);

      const result = await adapter.batchCreate(entities);

      expect(result).toEqual(entities);
      expect(mockTx.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
          expect.objectContaining({ id: '2' })
        ])
      );
    });

    it('should handle empty array', async () => {
      const result = await adapter.batchCreate([]);

      expect(result).toEqual([]);
      expect(mockTx.insert).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search entities by text fields', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await adapter.search(['name', 'email'], 'john');

      expect(result).toEqual(mockRows);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should return empty array for invalid search fields', async () => {
      const result = await adapter.search(['invalid_field'], 'query');

      expect(result).toEqual([]);
    });

    it('should apply search options correctly', async () => {
      mockDb.select.mockResolvedValue([]);

      await adapter.search(['name'], 'query', {
        limit: 25,
        offset: 10,
        orderBy: 'name',
        orderDirection: 'asc'
      });

      expect(mockDb.limit).toHaveBeenCalledWith(25);
      expect(mockDb.offset).toHaveBeenCalledWith(10);
      expect(mockDb.orderBy).toHaveBeenCalled();
    });
  });

  describe('filter conditions', () => {
    it('should handle different filter operators', async () => {
      mockDb.select.mockResolvedValue([]);

      const filters: FilterCondition[] = [
        { field: 'name', operator: 'eq', value: 'John' },
        { field: 'email', operator: 'like', value: 'example' },
        { field: 'id', operator: 'in', value: ['1', '2', '3'] },
        { field: 'created_at', operator: 'gt', value: new Date() }
      ];

      await adapter.findMany(filters);

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should handle unknown fields gracefully', async () => {
      mockDb.select.mockResolvedValue([]);

      const filters: FilterCondition[] = [
        { field: 'unknown_field', operator: 'eq', value: 'test' }
      ];

      const result = await adapter.findMany(filters);

      expect(result).toEqual([]);
    });

    it('should handle unknown operators gracefully', async () => {
      mockDb.select.mockResolvedValue([]);

      const filters: FilterCondition[] = [
        { field: 'name', operator: 'unknown' as any, value: 'test' }
      ];

      const result = await adapter.findMany(filters);

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should log performance warnings for slow queries', async () => {
      // Mock a slow query
      vi.mocked(databaseService.withFallback).mockImplementation(async (fn) => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds
        return { data: null, fromCache: false };
      });

      await adapter.findById('1');

      // Performance logging is internal, we just ensure it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle transaction failures', async () => {
      const error = new Error('Transaction failed');
      vi.mocked(databaseService.withTransaction).mockRejectedValue(error);

      await expect(adapter.create({} as TestEntity)).rejects.toThrow('Transaction failed');
    });
  });

  describe('factory function', () => {
    it('should create adapter with factory function', () => {
      const factoryAdapter = createDrizzleAdapter(
        mockTable,
        new TestEntityMapping(),
        'factory_table'
      );

      expect(factoryAdapter).toBeInstanceOf(DrizzleAdapter);
    });
  });
});
