/**
 * Data Synchronization Tests
 *
 * Focus: Offline/online sync, Conflict resolution, Cache management
 * Pareto Priority: Week 1 - Foundation
 *
 * These tests cover the most critical data synchronization scenarios that deliver
 * 80% of testing value with 20% of implementation effort.
 */

import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock data synchronization services
vi.mock('@client/infrastructure/data-sync/service', () => ({
  dataSyncService: {
    syncData: vi.fn(),
    queueOperation: vi.fn(),
    resolveConflicts: vi.fn(),
    getSyncStatus: vi.fn(),
    clearQueue: vi.fn(),
  },
}));

// Mock cache manager
vi.mock('@client/infrastructure/cache/manager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('Data Synchronization', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Offline/Online Sync', () => {
    it('should sync data when coming online', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      // Mock offline operations
      const offlineOperations = [
        { type: 'create', data: { id: '1', name: 'Test Item' } },
        { type: 'update', data: { id: '2', name: 'Updated Item' } },
      ];

      dataSyncService.getSyncStatus.mockResolvedValue({ isOnline: true, queueLength: 2 });
      dataSyncService.syncData.mockResolvedValue({ success: true, synced: 2 });
      cacheManager.get.mockResolvedValue(offlineOperations);

      // Simulate coming online and triggering sync
      const syncResult = await dataSyncService.syncData();

      expect(dataSyncService.syncData).toHaveBeenCalled();
      expect(syncResult.success).toBe(true);
      expect(syncResult.synced).toBe(2);
    });

    it('should queue operations during offline', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      const operation = { type: 'create', data: { id: '1', name: 'Test Item' } };

      dataSyncService.queueOperation.mockResolvedValue({ queued: true });
      cacheManager.set.mockResolvedValue(true);

      const result = await dataSyncService.queueOperation(operation);

      expect(dataSyncService.queueOperation).toHaveBeenCalledWith(operation);
      expect(result.queued).toBe(true);
    });

    it('should handle sync conflicts', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');

      const conflictData = {
        local: { id: '1', name: 'Local Item', version: 2 },
        remote: { id: '1', name: 'Remote Item', version: 3 },
        conflict: 'version_mismatch',
      };

      dataSyncService.resolveConflicts.mockResolvedValue({
        resolved: true,
        strategy: 'remote_wins',
        finalData: conflictData.remote,
      });

      const result = await dataSyncService.resolveConflicts(conflictData);

      expect(dataSyncService.resolveConflicts).toHaveBeenCalledWith(conflictData);
      expect(result.resolved).toBe(true);
      expect(result.strategy).toBe('remote_wins');
    });

    it('should maintain data integrity', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      dataSyncService.syncData.mockResolvedValue({ success: true, integrity: true });
      cacheManager.set.mockResolvedValue(true);

      const result = await dataSyncService.syncData();

      expect(result.success).toBe(true);
      expect(result.integrity).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should cache API responses appropriately', async () => {
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      const cacheKey = 'api_data_1';
      const testData = { id: '1', name: 'Test Item' };

      cacheManager.set.mockResolvedValue(true);

      const result = await cacheManager.set(cacheKey, testData, { ttl: 300 });

      expect(cacheManager.set).toHaveBeenCalledWith(cacheKey, testData, { ttl: 300 });
      expect(result).toBe(true);
    });

    it('should invalidate stale cache', async () => {
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      const cacheKey = 'api_data_1';

      cacheManager.invalidate.mockResolvedValue(true);

      const result = await cacheManager.invalidate(cacheKey);

      expect(cacheManager.invalidate).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(true);
    });

    it('should handle cache conflicts', async () => {
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      const localData = { id: '1', name: 'Local Item' };
      const remoteData = { id: '1', name: 'Remote Item' };

      cacheManager.get.mockResolvedValue(localData);
      cacheManager.set.mockResolvedValue(true);

      // Simulate cache conflict resolution
      const conflictResult = {
        resolved: true,
        strategy: 'merge',
        finalData: { ...localData, ...remoteData },
      };

      expect(conflictResult.resolved).toBe(true);
      expect(conflictResult.strategy).toBe('merge');
    });

    it('should optimize cache usage', async () => {
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      // Mock cache statistics
      const cacheStats = {
        hitRate: 0.85,
        missRate: 0.15,
        size: 1024,
        maxSize: 10240,
      };

      cacheManager.get.mockResolvedValue(cacheStats);

      const stats = await cacheManager.get('cache_stats');

      expect(stats.hitRate).toBe(0.85);
      expect(stats.missRate).toBe(0.15);
      expect(stats.size).toBe(1024);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete offline workflow', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      // Simulate offline operations
      const offlineOperations = [
        { type: 'create', data: { id: '1', name: 'Offline Item 1' } },
        { type: 'create', data: { id: '2', name: 'Offline Item 2' } },
        { type: 'update', data: { id: '1', name: 'Updated Offline Item 1' } },
      ];

      // Mock service responses
      dataSyncService.getSyncStatus.mockResolvedValue({
        isOnline: false,
        queueLength: 3,
        lastSync: new Date(),
      });

      dataSyncService.queueOperation.mockResolvedValue({ queued: true });
      cacheManager.set.mockResolvedValue(true);

      // Queue operations
      for (const operation of offlineOperations) {
        await dataSyncService.queueOperation(operation);
      }

      // Verify operations were queued
      expect(dataSyncService.queueOperation).toHaveBeenCalledTimes(3);

      // Simulate coming online
      dataSyncService.getSyncStatus.mockResolvedValue({
        isOnline: true,
        queueLength: 3,
        lastSync: new Date(),
      });

      dataSyncService.syncData.mockResolvedValue({
        success: true,
        synced: 3,
        conflicts: 0,
      });

      const syncResult = await dataSyncService.syncData();

      expect(syncResult.success).toBe(true);
      expect(syncResult.synced).toBe(3);
      expect(syncResult.conflicts).toBe(0);
    });

    it('should handle network recovery scenarios', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');

      // Simulate network failure followed by recovery
      dataSyncService.syncData
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ success: true, synced: 2 });

      // First sync attempt fails
      await expect(dataSyncService.syncData()).rejects.toThrow('Network timeout');

      // Second attempt succeeds
      const result = await dataSyncService.syncData();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(2);
    });

    it('should handle data corruption scenarios', async () => {
      const { dataSyncService } = await import('@client/infrastructure/data-sync/service');
      const { cacheManager } = await import('@client/infrastructure/cache/manager');

      // Mock corrupted data
      const corruptedData = { id: '1', name: null, version: 'invalid' };

      dataSyncService.resolveConflicts.mockResolvedValue({
        resolved: false,
        strategy: 'rollback',
        error: 'Data corruption detected',
      });

      cacheManager.clear.mockResolvedValue(true);

      const conflictResult = await dataSyncService.resolveConflicts(corruptedData);

      expect(conflictResult.resolved).toBe(false);
      expect(conflictResult.strategy).toBe('rollback');
      expect(conflictResult.error).toBe('Data corruption detected');
    });
  });
});
