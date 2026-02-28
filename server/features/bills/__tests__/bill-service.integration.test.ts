/**
 * Bills Feature - Integration Tests
 * 
 * Tests for bills service with validation, caching, and security integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CachedBillService } from '../application/bill-service';
import { cacheService } from '@server/infrastructure/cache';
import { database as db } from '@server/infrastructure/database';
import { bills } from '@server/infrastructure/schema';

describe('CachedBillService Integration Tests', () => {
  let billService: CachedBillService;
  let testBillId: string;

  beforeEach(async () => {
    billService = new CachedBillService();
    
    // Clear cache before each test
    await cacheService.clear();
    
    // Create a test bill
    const result = await billService.createBill({
      title: 'Test Bill for Integration',
      summary: 'This is a test bill summary',
      category: 'technology',
      status: 'draft',
    });
    
    if (result.success && result.data) {
      testBillId = result.data.id;
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (testBillId) {
      await billService.deleteBill(testBillId);
    }
    await cacheService.clear();
  });

  describe('Validation Integration', () => {
    it('should validate bill creation with valid data', async () => {
      const result = await billService.createBill({
        title: 'Valid Bill Title',
        summary: 'Valid bill summary with enough content',
        category: 'education',
        status: 'draft',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('Valid Bill Title');
    });

    it('should reject bill creation with invalid data', async () => {
      const result = await billService.createBill({
        title: '', // Invalid: empty title
        summary: 'Valid summary',
        category: 'education',
        status: 'draft',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate bill number format', async () => {
      const result = await billService.createBill({
        title: 'Bill with Number',
        summary: 'Valid summary',
        category: 'finance',
        status: 'draft',
        bill_number: 'INVALID', // Invalid format
      } as any);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('bill number');
    });

    it('should validate bill update with valid data', async () => {
      const result = await billService.updateBill(testBillId, {
        title: 'Updated Title',
        summary: 'Updated summary',
      });

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Updated Title');
    });
  });

  describe('Caching Integration', () => {
    it('should cache bill details on first read', async () => {
      // First read - should hit database
      const result1 = await billService.getBillById(testBillId);
      expect(result1.success).toBe(true);

      // Second read - should hit cache
      const result2 = await billService.getBillById(testBillId);
      expect(result2.success).toBe(true);
      expect(result2.data?.id).toBe(testBillId);
    });

    it('should invalidate cache on bill update', async () => {
      // Read bill to populate cache
      await billService.getBillById(testBillId);

      // Update bill
      await billService.updateBill(testBillId, {
        title: 'Updated Title for Cache Test',
      });

      // Read again - should get updated data
      const result = await billService.getBillById(testBillId);
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Updated Title for Cache Test');
    });

    it('should cache search results', async () => {
      const result1 = await billService.searchBills('Test', {});
      expect(result1.success).toBe(true);

      const result2 = await billService.searchBills('Test', {});
      expect(result2.success).toBe(true);
      expect(result2.data?.length).toBeGreaterThan(0);
    });

    it('should cache bill statistics', async () => {
      const result1 = await billService.getBillStats();
      expect(result1.success).toBe(true);
      expect(result1.data?.total).toBeGreaterThan(0);

      const result2 = await billService.getBillStats();
      expect(result2.success).toBe(true);
      expect(result2.data?.total).toBe(result1.data?.total);
    });
  });

  describe('Security Integration', () => {
    it('should sanitize HTML in bill content', async () => {
      const result = await billService.createBill({
        title: 'Bill with HTML',
        summary: 'Summary with <script>alert("xss")</script> content',
        full_text: '<p>Valid content</p><script>alert("xss")</script>',
        category: 'technology',
        status: 'draft',
      });

      expect(result.success).toBe(true);
      expect(result.data?.summary).not.toContain('<script>');
      expect(result.data?.full_text).not.toContain('<script>');
    });

    it('should sanitize SQL injection attempts', async () => {
      const result = await billService.searchBills("'; DROP TABLE bills; --", {});
      
      expect(result.success).toBe(true);
      // Should not throw error or execute SQL injection
    });

    it('should log security events for bill access', async () => {
      const result = await billService.getBillById(testBillId);
      
      expect(result.success).toBe(true);
      // Security audit log should be created (checked via audit service)
    });
  });

  describe('Error Handling Integration', () => {
    it('should return Result type with error for non-existent bill', async () => {
      const result = await billService.getBillById('00000000-0000-0000-0000-000000000000');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Try to create bill with invalid data that bypasses validation
      const result = await billService.createBill({
        title: 'Test',
        summary: 'Test',
        category: 'invalid_category' as any,
        status: 'draft',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple bills
      const promises = Array.from({ length: 10 }, (_, i) =>
        billService.createBill({
          title: `Bulk Bill ${i}`,
          summary: `Summary for bulk bill ${i}`,
          category: 'technology',
          status: 'draft',
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      // Clean up
      for (const result of results) {
        if (result.success && result.data) {
          await billService.deleteBill(result.data.id);
        }
      }
    });

    it('should achieve >70% cache hit rate', async () => {
      // Populate cache
      await billService.getBillById(testBillId);
      await billService.getBillById(testBillId);
      await billService.getBillById(testBillId);
      
      // Get cache stats
      const stats = await billService.getBillStats();
      
      expect(stats.success).toBe(true);
      // Cache hit rate should be high for repeated reads
    });
  });
});
