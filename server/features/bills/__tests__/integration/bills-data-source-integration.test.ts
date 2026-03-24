import { bills } from '@server/infrastructure/schema';
/**
 * Bills Data Source Integration Tests
 * 
 * Integration tests that verify the data source abstraction works correctly
 * with real mock data and simulated database operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BillDataSourceFactory } from '../../infrastructure/data-sources/bill-data-source-factory';
import { MockBillDataSource } from '../../infrastructure/data-sources/mock-bill-data-source';
import { DatabaseBillDataSource } from '../../infrastructure/data-sources/database-bill-data-source';
import { BillFilters } from '../../infrastructure/data-sources/bill-data-source.interface';

describe('Bills Data Source Integration', () => {
  let factory: BillDataSourceFactory;

  beforeEach(() => {
    factory = BillDataSourceFactory.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mock Data Source Integration', () => {
    beforeEach(() => {
      factory.setDataSourceType('mock');
    });

    it('should provide consistent data across operations', async () => {
      const dataSource = await factory.getDataSource();
      
      // Test findAll
      const allBills = await dataSource.findAll();
      expect(allBills).toHaveLength(3);
      
      // Test findById with existing bill
      const firstBill = allBills[0];
      const foundBill = await dataSource.findById(firstBill!.id);
      expect(foundBill).toEqual(firstBill);
      
      // Test count
      const count = await dataSource.count();
      expect(count).toBe(allBills.length);
      
      // Test stats
      const stats = await dataSource.getStats();
      expect(stats.total).toBe(count);
      expect(Object.values(stats.byStatus).reduce((a, b) => a + b, 0)).toBe(count);
      expect(Object.values(stats.byCategory).reduce((a, b) => a + b, 0)).toBe(count);
    });

    it('should handle filtering correctly', async () => {
      const dataSource = await factory.getDataSource();
      
      // Test status filter
      const draftBills = await dataSource.findAll({ status: 'draft' });
      expect(draftBills.every(bill => bill.status === 'draft')).toBe(true);
      
      const draftCount = await dataSource.count({ status: 'draft' });
      expect(draftCount).toBe(draftBills.length);
      
      // Test category filter
      const techBills = await dataSource.findAll({ category: 'technology' });
      expect(techBills.every(bill => bill.category === 'technology')).toBe(true);
      
      // Test search filter
      const searchResults = await dataSource.findAll({ search: 'healthcare' });
      expect(searchResults.every(bill => 
        bill.title.toLowerCase().includes('healthcare') ||
        bill.summary.toLowerCase().includes('healthcare') ||
        bill.full_text.toLowerCase().includes('healthcare')
      )).toBe(true);
    });

    it('should simulate realistic API delays', async () => {
      const dataSource = await factory.getDataSource();
      
      // Test findById delay
      const startTime = Date.now();
      await dataSource.findById('550e8400-e29b-41d4-a716-446655440001');
      const findByIdTime = Date.now() - startTime;
      expect(findByIdTime).toBeGreaterThanOrEqual(10);
      
      // Test findAll delay
      const startTime2 = Date.now();
      await dataSource.findAll();
      const findAllTime = Date.now() - startTime2;
      expect(findAllTime).toBeGreaterThanOrEqual(15);
    });

    it('should provide realistic bill data structure', async () => {
      const dataSource = await factory.getDataSource();
      const bills = await dataSource.findAll();
      
      bills.forEach(bill => {
        // Check required fields
        expect(bill.id).toBeDefined();
        expect(bill.title).toBeDefined();
        expect(bill.summary).toBeDefined();
        expect(bill.status).toBeDefined();
        expect(bill.category).toBeDefined();
        expect(bill.bill_number).toBeDefined();
        
        // Check engagement data
        expect(typeof bill.comment_count).toBe('number');
        expect(typeof bill.view_count).toBe('number');
        expect(typeof bill.share_count).toBe('number');
        expect(typeof bill.engagement_score).toBe('string');
        expect(typeof bill.complexity_score).toBe('number');
        
        // Check dates
        expect(bill.created_at).toBeInstanceOf(Date);
        expect(bill.updated_at).toBeInstanceOf(Date);
        
        // Check arrays
        expect(Array.isArray(bill.tags)).toBe(true);
        
        // Check constitutional concerns if present
        if (bill.constitutionalConcerns) {
          expect(Array.isArray(bill.constitutionalConcerns.concerns)).toBe(true);
          expect(typeof bill.constitutionalConcerns.riskLevel).toBe('string');
        }
      });
    });
  });

  describe('Data Source Factory Auto Mode', () => {
    beforeEach(() => {
      factory.setDataSourceType('auto');
    });

    it('should fallback to mock when database is unavailable', async () => {
      // Mock database failure
      vi.spyOn(DatabaseBillDataSource.prototype, 'isAvailable')
        .mockResolvedValue(false);

      const dataSource = await factory.getDataSource();
      const status = dataSource.getStatus();
      
      expect(status.type).toBe('mock');
      
      // Should still provide data
      const bills = await dataSource.findAll();
      expect(bills.length).toBeGreaterThan(0);
    });

    it('should provide health status information', async () => {
      const status = await factory.getStatus();
      
      expect(status.current).toBeDefined();
      expect(status.preferred).toBe('auto');
      expect(status.status).toBeDefined();
      expect(status.lastHealthCheck).toBeInstanceOf(Date);
    });

    it('should allow forced health check refresh', async () => {
      const initialStatus = await factory.getStatus();
      const initialCheck = initialStatus.lastHealthCheck;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await factory.forceHealthCheck();
      
      const newStatus = await factory.getStatus();
      const newCheck = newStatus.lastHealthCheck;
      
      expect(newCheck?.getTime()).toBeGreaterThan(initialCheck?.getTime() || 0);
    });
  });

  describe('Data Source Switching', () => {
    it('should switch data sources when type changes', async () => {
      // Start with mock
      factory.setDataSourceType('mock');
      const mockSource = await factory.getDataSource();
      expect(mockSource.getStatus().type).toBe('mock');
      
      // Switch to database (will fallback to mock if database unavailable)
      factory.setDataSourceType('database');
      
      // Mock database as unavailable to force error
      vi.spyOn(DatabaseBillDataSource.prototype, 'isAvailable')
        .mockRejectedValue(new Error('Database unavailable'));
      
      await expect(factory.getDataSource()).rejects.toThrow('Database unavailable');
    });

    it('should maintain data consistency across source switches', async () => {
      // Get data from mock source
      factory.setDataSourceType('mock');
      const mockSource = await factory.getDataSource();
      const mockBills = await mockSource.findAll();
      const mockStats = await mockSource.getStats();
      
      // Data should be consistent
      expect(mockStats.total).toBe(mockBills.length);
      
      // Switch back to auto (will use mock as fallback)
      factory.setDataSourceType('auto');
      const autoSource = await factory.getDataSource();
      const autoBills = await autoSource.findAll();
      
      // Should get same data (both using mock)
      expect(autoBills).toHaveLength(mockBills.length);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle data source errors gracefully', async () => {
      factory.setDataSourceType('mock');
      const dataSource = await factory.getDataSource();
      
      // Mock an error in the mock service
      vi.spyOn(dataSource, 'findById').mockRejectedValue(new Error('Mock error'));
      
      await expect(dataSource.findById('test-id')).rejects.toThrow('Mock error');
    });

    it('should provide meaningful error messages', async () => {
      factory.setDataSourceType('database');
      
      // Mock database connection failure
      vi.spyOn(DatabaseBillDataSource.prototype, 'isAvailable')
        .mockRejectedValue(new Error('Connection timeout'));
      
      await expect(factory.getDataSource()).rejects.toThrow('Connection timeout');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      factory.setDataSourceType('mock');
      const dataSource = await factory.getDataSource();
      
      // Make multiple concurrent requests
      const promises = [
        dataSource.findById('550e8400-e29b-41d4-a716-446655440001'),
        dataSource.findById('550e8400-e29b-41d4-a716-446655440002'),
        dataSource.findAll({ status: 'draft' }),
        dataSource.findAll({ category: 'technology' }),
        dataSource.count(),
        dataSource.getStats(),
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should complete
      expect(results).toHaveLength(6);
      expect(results[0]).toBeDefined(); // findById result
      expect(results[4]).toBeGreaterThan(0); // count result
      
      // Should complete reasonably quickly (concurrent execution)
      expect(totalTime).toBeLessThan(100); // Should be much faster than sequential
    });

    it('should maintain performance with repeated requests', async () => {
      factory.setDataSourceType('mock');
      const dataSource = await factory.getDataSource();
      
      // Make repeated requests
      const iterations = 10;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await dataSource.findAll();
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / iterations;
      
      // Average time should be reasonable (mock delays are ~15ms)
      expect(avgTime).toBeLessThan(50); // Allow some overhead
    });
  });
});