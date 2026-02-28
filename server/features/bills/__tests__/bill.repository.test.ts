// ============================================================================
// BILL REPOSITORY TESTS
// ============================================================================
// Unit tests for BillRepository domain-specific methods

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BillRepository } from '../domain/repositories/bill.repositoryries/bill.repository';
import type { Bill, InsertBill, BillStatus } from '../domain/repositories/bill.repositoryries/bill.repository';
import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import { cacheService } from '@server/infrastructure/cache';

// Mock dependencies
vi.mock('@server/infrastructure/database', () => ({
  readDatabase: {
    select: vi.fn(),
  },
  writeDatabase: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@server/infrastructure/cache', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    deletePattern: vi.fn(),
  },
}));

describe('BillRepository', () => {
  let repository: BillRepository;

  beforeEach(() => {
    repository = new BillRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should find bill by ID successfully', async () => {
      const mockBill: Bill = {
        id: 1,
        bill_number: 'BILL-2024-001',
        title: 'Test Bill',
        description: 'Test Description',
        status: 'introduced',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
        updated_at: new Date(),
        view_count: 0,
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBill]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findById(1);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockBill);
      }
    });

    it('should return null when bill not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBeNull();
      }
    });

    it('should use cached result when available', async () => {
      const mockBill: Bill = {
        id: 1,
        bill_number: 'BILL-2024-001',
        title: 'Cached Bill',
        description: 'Cached Description',
        status: 'introduced',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
        updated_at: new Date(),
        view_count: 0,
      };

      vi.mocked(cacheService.get).mockResolvedValue(mockBill);

      const result = await repository.findById(1);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockBill);
      }
      expect(readDatabase.select).not.toHaveBeenCalled();
    });
  });

  describe('findByBillNumber', () => {
    it('should find bill by bill number successfully', async () => {
      const mockBill: Bill = {
        id: 1,
        bill_number: 'BILL-2024-001',
        title: 'Test Bill',
        description: 'Test Description',
        status: 'introduced',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
        updated_at: new Date(),
        view_count: 0,
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBill]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findByBillNumber('BILL-2024-001');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockBill);
      }
    });

    it('should return null when bill number not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findByBillNumber('NONEXISTENT');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('findByStatus', () => {
    it('should find bills by single status', async () => {
      const mockBills: Bill[] = [
        {
          id: 1,
          bill_number: 'BILL-2024-001',
          title: 'Bill 1',
          description: 'Description 1',
          status: 'introduced',
          category: 'education',
          sponsor_id: 'sponsor-1',
          affected_counties: ['Nairobi'],
          introduced_date: new Date('2024-01-01'),
          updated_at: new Date(),
          view_count: 0,
        },
        {
          id: 2,
          bill_number: 'BILL-2024-002',
          title: 'Bill 2',
          description: 'Description 2',
          status: 'introduced',
          category: 'health',
          sponsor_id: 'sponsor-2',
          affected_counties: ['Mombasa'],
          introduced_date: new Date('2024-01-02'),
          updated_at: new Date(),
          view_count: 0,
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockBills),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findByStatus('introduced');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toEqual(mockBills);
      }
    });

    it('should find bills by multiple statuses', async () => {
      const mockBills: Bill[] = [
        {
          id: 1,
          bill_number: 'BILL-2024-001',
          title: 'Bill 1',
          description: 'Description 1',
          status: 'introduced',
          category: 'education',
          sponsor_id: 'sponsor-1',
          affected_counties: ['Nairobi'],
          introduced_date: new Date('2024-01-01'),
          updated_at: new Date(),
          view_count: 0,
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockBills),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findByStatus(['introduced', 'passed']);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockBills);
      }
    });
  });

  describe('findByCategory', () => {
    it('should find bills by category', async () => {
      const mockBills: Bill[] = [
        {
          id: 1,
          bill_number: 'BILL-2024-001',
          title: 'Education Bill',
          description: 'Education Description',
          status: 'introduced',
          category: 'education',
          sponsor_id: 'sponsor-1',
          affected_counties: ['Nairobi'],
          introduced_date: new Date('2024-01-01'),
          updated_at: new Date(),
          view_count: 0,
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockBills),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findByCategory('education');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockBills);
      }
    });

    it('should apply pagination options', async () => {
      const mockBills: Bill[] = [];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockBills),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findByCategory('education', {
        limit: 10,
        offset: 20,
      });

      expect(result.isOk).toBe(true);
      expect(mockSelect.limit).toHaveBeenCalledWith(10);
      expect(mockSelect.offset).toHaveBeenCalledWith(20);
    });
  });

  describe('searchByKeywords', () => {
    it('should search bills by keywords', async () => {
      const mockBills: Bill[] = [
        {
          id: 1,
          bill_number: 'BILL-2024-001',
          title: 'Education Reform Bill',
          description: 'Reform education system',
          status: 'introduced',
          category: 'education',
          sponsor_id: 'sponsor-1',
          affected_counties: ['Nairobi'],
          introduced_date: new Date('2024-01-01'),
          updated_at: new Date(),
          view_count: 0,
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockBills),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.searchByKeywords('education');

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(mockBills);
      }
    });

    it('should apply status filter in search', async () => {
      const mockBills: Bill[] = [];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockBills),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.searchByKeywords('education', {
        status: 'introduced',
      });

      expect(result.isOk).toBe(true);
    });
  });

  describe('count', () => {
    it('should count all bills when no criteria provided', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 42 }]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.count();

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(42);
      }
    });

    it('should count bills by status', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 10 }]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.count({ status: 'introduced' });

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toBe(10);
      }
    });
  });

  describe('create', () => {
    it('should create new bill successfully', async () => {
      const newBillData: InsertBill = {
        bill_number: 'BILL-2024-003',
        title: 'New Bill',
        description: 'New Description',
        status: 'draft',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
      };

      const createdBill: Bill = {
        id: 3,
        ...newBillData,
        updated_at: new Date(),
        view_count: 0,
      };

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([createdBill]),
      };

      vi.mocked(writeDatabase.insert).mockReturnValue(mockInsert as any);

      const result = await repository.create(newBillData);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(createdBill);
      }
      expect(cacheService.deletePattern).toHaveBeenCalledWith('bill:*');
    });
  });

  describe('update', () => {
    it('should update bill successfully', async () => {
      const updateData: Partial<InsertBill> = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const updatedBill: Bill = {
        id: 1,
        bill_number: 'BILL-2024-001',
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'introduced',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
        updated_at: new Date(),
        view_count: 0,
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedBill]),
      };

      vi.mocked(writeDatabase.update).mockReturnValue(mockUpdate as any);

      const result = await repository.update('BILL-2024-001', updateData);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.value).toEqual(updatedBill);
      }
    });

    it('should throw error when bill not found', async () => {
      const updateData: Partial<InsertBill> = {
        title: 'Updated Title',
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(writeDatabase.update).mockReturnValue(mockUpdate as any);

      const result = await repository.update('NONEXISTENT', updateData);

      expect(result.isErr).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete bill successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      };

      vi.mocked(writeDatabase.delete).mockReturnValue(mockDelete as any);

      const result = await repository.delete('BILL-2024-001');

      expect(result.isOk).toBe(true);
      expect(cacheService.deletePattern).toHaveBeenCalled();
    });

    it('should throw error when bill not found', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      };

      vi.mocked(writeDatabase.delete).mockReturnValue(mockDelete as any);

      const result = await repository.delete('NONEXISTENT');

      expect(result.isErr).toBe(true);
    });
  });

  describe('Cache Integration', () => {
    it('should cache read operations with cache key', async () => {
      const mockBill: Bill = {
        id: 1,
        bill_number: 'BILL-2024-001',
        title: 'Test Bill',
        description: 'Test Description',
        status: 'introduced',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
        updated_at: new Date(),
        view_count: 0,
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBill]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      await repository.findById(1);

      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should invalidate cache on write operations', async () => {
      const newBillData: InsertBill = {
        bill_number: 'BILL-2024-003',
        title: 'New Bill',
        description: 'New Description',
        status: 'draft',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
      };

      const createdBill: Bill = {
        id: 3,
        ...newBillData,
        updated_at: new Date(),
        view_count: 0,
      };

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([createdBill]),
      };

      vi.mocked(writeDatabase.insert).mockReturnValue(mockInsert as any);

      await repository.create(newBillData);

      expect(cacheService.deletePattern).toHaveBeenCalledWith('bill:*');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await repository.findById(1);

      expect(result.isErr).toBe(true);
      if (result.isErr) {
        expect(result.error.message).toContain('Database connection failed');
      }
    });

    it('should handle cache errors gracefully', async () => {
      const mockBill: Bill = {
        id: 1,
        bill_number: 'BILL-2024-001',
        title: 'Test Bill',
        description: 'Test Description',
        status: 'introduced',
        category: 'education',
        sponsor_id: 'sponsor-1',
        affected_counties: ['Nairobi'],
        introduced_date: new Date('2024-01-01'),
        updated_at: new Date(),
        view_count: 0,
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBill]),
      };

      vi.mocked(readDatabase.select).mockReturnValue(mockSelect as any);
      vi.mocked(cacheService.get).mockRejectedValue(new Error('Cache error'));

      // Should still succeed even if cache fails
      const result = await repository.findById(1);

      expect(result.isOk).toBe(true);
    });
  });
});
