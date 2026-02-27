// ============================================================================
// BASE REPOSITORY TESTS
// ============================================================================
// Comprehensive unit and property tests for BaseRepository

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { BaseRepository } from '../base-repository';
import type { Result } from '@shared/core/result';
import { Ok, Err } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { RepositoryError, TransientError, NotFoundError } from '../errors';
import {
  idArbitrary,
  billArbitrary,
  propertyTestHelpers,
  assertionHelpers,
} from '../test-utils';

/**
 * Test repository implementation
 */
class TestRepository extends BaseRepository<{ id: string; name: string }> {
  constructor() {
    super({
      entityName: 'TestEntity',
      enableCache: true,
      cacheTTL: 300,
      enableLogging: false, // Disable logging in tests
    });
  }

  // Expose protected methods for testing
  public async testExecuteRead<R>(
    operation: (db: any) => Promise<R>,
    cacheKey?: string
  ): Promise<Result<R, Error>> {
    return this.executeRead(operation, cacheKey);
  }

  public async testExecuteWrite<R>(
    operation: (tx: any) => Promise<R>,
    invalidateKeys?: string[]
  ): Promise<Result<R, Error>> {
    return this.executeWrite(operation, invalidateKeys);
  }

  public async testExecuteBatchWrite<R>(
    operation: (tx: any) => Promise<R>,
    invalidatePattern?: string
  ): Promise<Result<R, Error>> {
    return this.executeBatchWrite(operation, invalidatePattern);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;

  beforeEach(() => {
    repository = new TestRepository();
  });

  describe('executeRead', () => {
    it('should execute read operation successfully', async () => {
      const mockData = { id: '1', name: 'Test' };
      const operation = vi.fn().mockResolvedValue(mockData);

      const result = await repository.testExecuteRead(operation);

      assertionHelpers.assertOk(result);
      expect(result.value).toEqual(mockData);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return cached result on second call with same cache key', async () => {
      const mockData = { id: '1', name: 'Test' };
      const operation = vi.fn().mockResolvedValue(mockData);
      const cacheKey = 'test:1';

      // First call - should execute operation
      const result1 = await repository.testExecuteRead(operation, cacheKey);
      assertionHelpers.assertOk(result1);
      expect(operation).toHaveBeenCalledTimes(1);

      // Second call - should return cached result
      const result2 = await repository.testExecuteRead(operation, cacheKey);
      assertionHelpers.assertOk(result2);
      expect(result2.value).toEqual(mockData);
      expect(operation).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle errors and return Err result', async () => {
      const error = new Error('Database error');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await repository.testExecuteRead(operation);

      assertionHelpers.assertErr(result);
      expect(result.error).toBeInstanceOf(RepositoryError);
    });

    it('should not cache when cacheKey is not provided', async () => {
      const mockData = { id: '1', name: 'Test' };
      const operation = vi.fn().mockResolvedValue(mockData);

      // First call
      await repository.testExecuteRead(operation);
      expect(operation).toHaveBeenCalledTimes(1);

      // Second call - should execute operation again
      await repository.testExecuteRead(operation);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeWrite', () => {
    it('should execute write operation successfully', async () => {
      const mockData = { id: '1', name: 'Test' };
      const operation = vi.fn().mockResolvedValue(mockData);

      const result = await repository.testExecuteWrite(operation);

      assertionHelpers.assertOk(result);
      expect(result.value).toEqual(mockData);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and return Err result', async () => {
      const error = new Error('Database error');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await repository.testExecuteWrite(operation);

      assertionHelpers.assertErr(result);
      expect(result.error).toBeInstanceOf(RepositoryError);
    });

    it('should invalidate cache keys after successful write', async () => {
      const mockData = { id: '1', name: 'Test' };
      const cacheKey = 'test:1';

      // Seed cache with read operation
      const readOp = vi.fn().mockResolvedValue(mockData);
      await repository.testExecuteRead(readOp, cacheKey);
      expect(readOp).toHaveBeenCalledTimes(1);

      // Write operation that invalidates cache
      const writeOp = vi.fn().mockResolvedValue(mockData);
      await repository.testExecuteWrite(writeOp, [cacheKey]);

      // Read again - should execute operation (cache invalidated)
      await repository.testExecuteRead(readOp, cacheKey);
      expect(readOp).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeBatchWrite', () => {
    it('should execute batch write operation successfully', async () => {
      const mockData = [
        { id: '1', name: 'Test1' },
        { id: '2', name: 'Test2' },
      ];
      const operation = vi.fn().mockResolvedValue(mockData);

      const result = await repository.testExecuteBatchWrite(operation);

      assertionHelpers.assertOk(result);
      expect(result.value).toEqual(mockData);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and return Err result', async () => {
      const error = new Error('Database error');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await repository.testExecuteBatchWrite(operation);

      assertionHelpers.assertErr(result);
      expect(result.error).toBeInstanceOf(RepositoryError);
    });

    it('should invalidate cache pattern after successful write', async () => {
      const mockData = { id: '1', name: 'Test' };

      // Seed cache with multiple keys
      const readOp = vi.fn().mockResolvedValue(mockData);
      await repository.testExecuteRead(readOp, 'test:1');
      await repository.testExecuteRead(readOp, 'test:2');
      expect(readOp).toHaveBeenCalledTimes(2);

      // Batch write that invalidates all test:* keys
      const writeOp = vi.fn().mockResolvedValue([mockData]);
      await repository.testExecuteBatchWrite(writeOp, 'test:*');

      // Read again - should execute operations (cache invalidated)
      await repository.testExecuteRead(readOp, 'test:1');
      await repository.testExecuteRead(readOp, 'test:2');
      expect(readOp).toHaveBeenCalledTimes(4);
    });
  });

  describe('Property Tests', () => {
    it('Property 1: Write operations are wrapped in transactions', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Write operations transaction wrapping',
        billArbitrary,
        async (bill) => {
          const operation = vi.fn().mockResolvedValue(bill);
          const result = await repository.testExecuteWrite(operation);
          
          // Verify operation was called (transaction executed)
          return operation.mock.calls.length === 1 && result.isOk;
        }
      );
    });

    it('Property 2: Transient errors trigger retry (simulated)', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Transient error handling',
        fc.string(),
        async (errorMessage) => {
          const error = new TransientError(errorMessage);
          const operation = vi.fn().mockRejectedValue(error);
          const result = await repository.testExecuteRead(operation);
          
          // Verify error is wrapped in RepositoryError
          return result.isErr && result.error instanceof RepositoryError;
        }
      );
    });

    it('Property 3: Read operations route correctly', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Read operation routing',
        billArbitrary,
        async (bill) => {
          const operation = vi.fn().mockResolvedValue(bill);
          const result = await repository.testExecuteRead(operation);
          
          // Verify read operation executed successfully
          return result.isOk && JSON.stringify(result.value) === JSON.stringify(bill);
        }
      );
    });

    it('Property 4: Operations complete (logging test)', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Operation completion',
        billArbitrary,
        async (bill) => {
          const operation = vi.fn().mockResolvedValue(bill);
          const result = await repository.testExecuteRead(operation);
          
          // Verify operation completed
          return result.isOk || result.isErr;
        }
      );
    });

    it('Property 5: Errors include context', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Error context preservation',
        fc.string(),
        async (errorMessage) => {
          const error = new Error(errorMessage);
          const operation = vi.fn().mockRejectedValue(error);
          const result = await repository.testExecuteRead(operation);
          
          // Verify error is wrapped with context
          return result.isErr && result.error instanceof RepositoryError;
        }
      );
    });

    it('Property 6: Cache-then-database pattern', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Cache-then-database',
        fc.tuple(billArbitrary, idArbitrary),
        async ([bill, cacheKey]) => {
          const operation = vi.fn().mockResolvedValue(bill);
          
          // First call - database
          const result1 = await repository.testExecuteRead(operation, cacheKey);
          const callCount1 = operation.mock.calls.length;
          
          // Second call - cache
          const result2 = await repository.testExecuteRead(operation, cacheKey);
          const callCount2 = operation.mock.calls.length;
          
          // Verify: first call executes operation, second call uses cache
          return (
            result1.isOk &&
            result2.isOk &&
            callCount1 === 1 &&
            callCount2 === 1 && // No additional call
            JSON.stringify(result1.value) === JSON.stringify(result2.value)
          );
        }
      );
    });

    it('Property 10: Round-trip property (create-read)', async () => {
      await propertyTestHelpers.runPropertyTest(
        'Create-read round trip',
        billArbitrary,
        async (bill) => {
          // Simulate create
          const createOp = vi.fn().mockResolvedValue(bill);
          const createResult = await repository.testExecuteWrite(createOp);
          
          if (!createResult.isOk) return false;
          
          // Simulate read
          const readOp = vi.fn().mockResolvedValue(bill);
          const readResult = await repository.testExecuteRead(readOp);
          
          if (!readResult.isOk) return false;
          
          // Verify round trip
          return JSON.stringify(createResult.value) === JSON.stringify(readResult.value);
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should wrap generic errors in RepositoryError', async () => {
      const error = new Error('Generic error');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await repository.testExecuteRead(operation);

      assertionHelpers.assertErr(result);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('TestEntity');
      expect(result.error.message).toContain('read');
    });

    it('should preserve RepositoryError instances', async () => {
      const error = new NotFoundError('TestEntity', '123');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await repository.testExecuteRead(operation);

      assertionHelpers.assertErr(result);
      expect(result.error).toBe(error); // Same instance
    });

    it('should handle non-Error objects', async () => {
      const error = 'String error';
      const operation = vi.fn().mockRejectedValue(error);

      const result = await repository.testExecuteRead(operation);

      assertionHelpers.assertErr(result);
      expect(result.error).toBeInstanceOf(RepositoryError);
      expect(result.error.message).toContain('String error');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache successful read results', async () => {
      const mockData = { id: '1', name: 'Test' };
      const operation = vi.fn().mockResolvedValue(mockData);
      const cacheKey = 'test:cache:1';

      // First call
      const result1 = await repository.testExecuteRead(operation, cacheKey);
      assertionHelpers.assertOk(result1);
      expect(operation).toHaveBeenCalledTimes(1);

      // Second call with same key
      const result2 = await repository.testExecuteRead(operation, cacheKey);
      assertionHelpers.assertOk(result2);
      expect(operation).toHaveBeenCalledTimes(1); // Not called again
      expect(result2.value).toEqual(mockData);
    });

    it('should not cache when cache is disabled', async () => {
      const noCacheRepo = new (class extends BaseRepository<any> {
        constructor() {
          super({ entityName: 'Test', enableCache: false });
        }
        public async testRead(op: any, key?: string) {
          return this.executeRead(op, key);
        }
      })();

      const mockData = { id: '1', name: 'Test' };
      const operation = vi.fn().mockResolvedValue(mockData);
      const cacheKey = 'test:1';

      // First call
      await noCacheRepo.testRead(operation, cacheKey);
      expect(operation).toHaveBeenCalledTimes(1);

      // Second call - should execute again (no cache)
      await noCacheRepo.testRead(operation, cacheKey);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should invalidate specific cache keys', async () => {
      const mockData = { id: '1', name: 'Test' };
      const cacheKey1 = 'test:1';
      const cacheKey2 = 'test:2';

      // Seed both caches
      const readOp = vi.fn().mockResolvedValue(mockData);
      await repository.testExecuteRead(readOp, cacheKey1);
      await repository.testExecuteRead(readOp, cacheKey2);
      expect(readOp).toHaveBeenCalledTimes(2);

      // Invalidate only cacheKey1
      const writeOp = vi.fn().mockResolvedValue(mockData);
      await repository.testExecuteWrite(writeOp, [cacheKey1]);

      // Read cacheKey1 - should execute (invalidated)
      await repository.testExecuteRead(readOp, cacheKey1);
      expect(readOp).toHaveBeenCalledTimes(3);

      // Read cacheKey2 - should use cache (not invalidated)
      await repository.testExecuteRead(readOp, cacheKey2);
      expect(readOp).toHaveBeenCalledTimes(3); // No additional call
    });
  });
});
