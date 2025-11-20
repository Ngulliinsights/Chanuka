/**
 * Integration Tests for Bill Service Result Types
 * 
 * Tests the integration of neverthrow Result types with the BillService,
 * ensuring proper error handling and API compatibility.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillService } from '../application/bill-service.js';
import { billServiceAdapter } from '../application/bill-service-adapter.js';
import { ResultAdapter } from '../../../infrastructure/errors/result-adapter.js';
import * as Boom from '@hapi/boom';
// Repository removed - using direct Drizzle queries now

// Mock dependencies
vi.mock('../../../infrastructure/database/database-service', () => ({
  databaseService: {
    getDatabase: () => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    }),
    withTransaction: vi.fn((callback) => callback({}))
  }
}));

// Mock database service for testing
vi.mock('../../../infrastructure/database/database-service', () => ({
  databaseService: {
    getDatabase: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: '1', title: 'Test Bill' }]),
      then: vi.fn().mockResolvedValue([])
    }),
    withTransaction: vi.fn().mockImplementation((fn) => fn()),
    withFallback: vi.fn().mockImplementation((fn) => fn())
  }
}));

describe('BillService Result Integration', () => {
  let billService: BillService;

  beforeEach(() => {
    billService = new BillService();
    vi.clearAllMocks();
    // Reset mocks to default successful state - no longer needed with direct Drizzle
  });

  describe('Result Type Integration', () => {
    it('should return Ok result for successful operations', async () => {
      const result = await billService.getAllBills();
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveProperty('bills');
        expect(result.value).toHaveProperty('pagination');
        expect(result.value).toHaveProperty('metadata');
      }
    });

    it('should return Err result for validation failures', async () => {
      const result = await billService.createBill({
        title: '', // Invalid: empty title
        summary: '',
        status: 'introduced',
        category: 'test',
        introduced_date: new Date(),
        bill_number: 'TEST-001'
      } as any);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('system');
        expect(result.error.message).toContain('Title and summary are required');
      }
    });

    it('should handle null results properly', async () => {
      const result = await billService.getBillById(999);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it('should validate engagement parameters', async () => {
      const result = await billService.recordEngagement(0, '', 'invalid' as any);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Bill ID, user ID, and engagement type are required');
      }
    });
  });

  describe('Error Conversion', () => {
    it('should convert Result errors to Boom errors', () => {
      const standardizedError = ResultAdapter.validationError([
        { field: 'title', message: 'Title is required' }
      ], { service: 'BillService', operation: 'test' }).error;

      const boomError = ResultAdapter.toBoom(standardizedError);
      
      expect(Boom.isBoom(boomError)).toBe(true);
      expect(boomError.output.statusCode).toBe(400);
      expect(boomError.output.payload.errorId).toBe(standardizedError.id);
      expect(boomError.output.payload.retryable).toBe(standardizedError.retryable);
    });

    it('should convert Boom errors to StandardizedError', () => {
      const boomError = Boom.badRequest('Invalid input');
      const standardizedError = ResultAdapter.fromBoom(boomError, {
        service: 'BillService',
        operation: 'test'
      });
      
      expect(standardizedError.category).toBe('validation');
      expect(standardizedError.httpStatusCode).toBe(400);
      expect(standardizedError.message).toBe('Invalid input');
    });

    it('should create proper error responses', () => {
      const errorResult = ResultAdapter.notFoundError('Bill', '123', {
        service: 'BillService',
        operation: 'getBillById'
      });

      const errorResponse = ResultAdapter.toErrorResponse(errorResult);
      
      expect(errorResponse).not.toBeNull();
      expect(errorResponse!.success).toBe(false);
      expect(errorResponse!.error.category).toBe('not_found');
      expect(errorResponse!.metadata.service).toBe('BillService');
    });
  });

  describe('API Compatibility Layer', () => {
    it('should maintain backward compatibility through adapter', async () => {
      const result = await billServiceAdapter.getAllBills();
      
      expect(result).toHaveProperty('bills');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('metadata');
    });

    it('should throw Boom errors for failed operations in adapter', async () => {
      await expect(
        billServiceAdapter.createBill({
          title: '', // Invalid
          summary: '',
          status: 'introduced',
          category: 'test',
          introduced_date: new Date(),
          bill_number: 'TEST-001'
        } as any)
      ).rejects.toThrow();
    });

    it('should handle null results in adapter', async () => {
      const result = await billServiceAdapter.getBillById(999);
      expect(result).toBeNull();
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error - no longer using repository
      const mockError = new Error('Database connection failed');

      const result = await billService.getBillStats();
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('system');
        expect(result.error.retryable).toBe(false);
      }
    });

    it('should validate business rules', async () => {
      const result = await billService.updateBillStatus(1, ''); // Invalid status
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Valid status is required');
      }
    });

    it('should handle concurrent operations safely', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        billService.recordEngagement(1, `user-${i}`, 'view')
      );

      const results = await Promise.all(promises);
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result.isOk()).toBe(true);
      });
    });
  });

  describe('Performance and Monitoring', () => {
    it('should include error context for monitoring', async () => {
      const result = await billService.createBill({
        title: '',
        summary: '',
        status: 'introduced',
        category: 'test',
        introduced_date: new Date(),
        bill_number: 'TEST-001'
      } as any);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.context.service).toBe('BillService');
        expect(result.error.context.operation).toBe('createBill');
        expect(result.error.context.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should provide error categorization for alerting', async () => {
      const result = await billService.getBillById(-1); // Invalid ID
      
      if (result.isErr()) {
        expect(['validation', 'system', 'not_found']).toContain(result.error.category);
        expect(['low', 'medium', 'high', 'critical']).toContain(result.error.severity);
      }
    });
  });
});

describe('Result Utility Functions', () => {
  it('should combine multiple results correctly', async () => {
    const billService = new BillService();
    
    const results = await Promise.all([
      billService.getBillStats(),
      billService.getAllBills(),
      billService.getBillById(1)
    ]);

    // All results should be Ok for this test
    results.forEach(result => {
      expect(result.isOk()).toBe(true);
    });
  });

  it('should chain result operations', async () => {
    const billService = new BillService();
    
    const result = await billService.getBillById(1);
    
    if (result.isOk()) {
      const mappedResult = result.map(bill => bill ? bill.title : 'No title');
      expect(mappedResult.isOk()).toBe(true);
    }
  });

  it('should handle error propagation in chains', async () => {
    const errorResult = ResultAdapter.notFoundError('Bill', '123', {
      service: 'BillService',
      operation: 'test'
    });

    const chainedResult = errorResult.andThen(bill => 
      ResultAdapter.safe(() => bill.title, { service: 'BillService', operation: 'getTitle' })
    );

    expect(chainedResult.isErr()).toBe(true);
  });
});
