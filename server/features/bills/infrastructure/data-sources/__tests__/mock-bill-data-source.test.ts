import { bills } from '@server/infrastructure/schema';
/**
 * Mock Bill Data Source Tests
 * 
 * Unit tests for the mock data source implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockBillDataSource } from '../mock-bill-data-source';
import { BillFilters } from '../bill-data-source.interface';

describe('MockBillDataSource', () => {
  let dataSource: MockBillDataSource;

  beforeEach(() => {
    dataSource = new MockBillDataSource();
  });

  describe('findById', () => {
    it('should find bill by existing ID', async () => {
      const bill = await dataSource.findById('550e8400-e29b-41d4-a716-446655440001');
      
      expect(bill).toBeDefined();
      expect(bill?.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(bill?.title).toBe('Digital Economy and Data Protection Act 2024');
      expect(bill?.status).toBe('committee_stage');
      expect(bill?.category).toBe('technology');
      expect(bill?.comment_count).toBe(45);
      expect(bill?.view_count).toBe(1250);
    });

    it('should return null for non-existent ID', async () => {
      const bill = await dataSource.findById('non-existent-id');
      expect(bill).toBeNull();
    });

    it('should simulate database delay', async () => {
      const startTime = Date.now();
      await dataSource.findById('550e8400-e29b-41d4-a716-446655440001');
      const endTime = Date.now();
      
      // Should take at least 10ms (simulated delay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('findAll', () => {
    it('should return all bills without filters', async () => {
      const bills = await dataSource.findAll();
      
      expect(bills).toHaveLength(3);
      expect(bills[0].title).toBe('Infrastructure Investment and Jobs Act Amendment'); // Most recent first
      expect(bills[1].title).toBe('Healthcare Access Improvement Act 2024');
      expect(bills[2].title).toBe('Digital Economy and Data Protection Act 2024');
    });

    it('should filter by status', async () => {
      const filters: BillFilters = { status: 'passed' };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(1);
      expect(bills[0].status).toBe('passed');
      expect(bills[0].title).toBe('Healthcare Access Improvement Act 2024');
    });

    it('should filter by category', async () => {
      const filters: BillFilters = { category: 'technology' };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(1);
      expect(bills[0].category).toBe('technology');
      expect(bills[0].title).toBe('Digital Economy and Data Protection Act 2024');
    });

    it('should filter by sponsor_id', async () => {
      const filters: BillFilters = { sponsor_id: 'sponsor-002' };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(1);
      expect(bills[0].sponsor_id).toBe('sponsor-002');
      expect(bills[0].title).toBe('Healthcare Access Improvement Act 2024');
    });

    it('should filter by search term in title', async () => {
      const filters: BillFilters = { search: 'healthcare' };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(1);
      expect(bills[0].title.toLowerCase()).toContain('healthcare');
    });

    it('should filter by search term in summary', async () => {
      const filters: BillFilters = { search: 'digital platforms' };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(1);
      expect(bills[0].summary.toLowerCase()).toContain('digital platforms');
    });

    it('should return empty array for no matches', async () => {
      const filters: BillFilters = { status: 'non-existent-status' };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(0);
    });

    it('should combine multiple filters', async () => {
      const filters: BillFilters = { 
        category: 'healthcare',
        status: 'passed'
      };
      const bills = await dataSource.findAll(filters);
      
      expect(bills).toHaveLength(1);
      expect(bills[0].category).toBe('healthcare');
      expect(bills[0].status).toBe('passed');
    });

    it('should simulate database delay', async () => {
      const startTime = Date.now();
      await dataSource.findAll();
      const endTime = Date.now();
      
      // Should take at least 15ms (simulated delay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(15);
    });
  });

  describe('count', () => {
    it('should count all bills without filters', async () => {
      const count = await dataSource.count();
      expect(count).toBe(3);
    });

    it('should count bills with filters', async () => {
      const filters: BillFilters = { status: 'passed' };
      const count = await dataSource.count(filters);
      expect(count).toBe(1);
    });

    it('should return 0 for no matches', async () => {
      const filters: BillFilters = { status: 'non-existent' };
      const count = await dataSource.count(filters);
      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const stats = await dataSource.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byStatus).toEqual({
        'committee_stage': 1,
        'passed': 1,
        'draft': 1
      });
      expect(stats.byCategory).toEqual({
        'technology': 1,
        'healthcare': 1,
        'infrastructure': 1
      });
    });
  });

  describe('isAvailable', () => {
    it('should always return true for mock data source', async () => {
      const available = await dataSource.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const status = dataSource.getStatus();
      
      expect(status.type).toBe('mock');
      expect(status.available).toBe(true);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.metadata).toBeDefined();
      expect(status.metadata?.note).toContain('Mock data source');
    });
  });
});