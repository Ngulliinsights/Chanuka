import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock all dependencies before importing the module
vi.mock('pg');
vi.mock('drizzle-orm/node-postgres');
vi.mock('../../../shared/schema.ts', () => ({}), { virtual: true });
vi.mock('../../utils/logger');
vi.mock('../../core/errors/error-tracker.ts');
vi.mock('../../config/index.ts');

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseService } from '@server/infrastructure/database/database-service';
import * as pg from 'pg';
import { logger  } from '@shared/core/src/index.js';

// Mock pg module
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn() as vi.MockedFunction<() => Promise<any>>,
    query: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0
  }))
}));

// Mock drizzle-orm
vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: vi.fn().mockReturnValue({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  })
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    mockPool = {
      connect: vi.fn() as vi.MockedFunction<() => Promise<any>>,
      query: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0
    };

    (pg.Pool as vi.MockedClass<typeof pg.Pool>).mockImplementation(() => mockPool);
    databaseService = new DatabaseService();
  });

  afterEach(async () => {
    if (databaseService) {
      await databaseService.close();

      // Force cleanup of any remaining timers to prevent hanging
      if (databaseService.forceCleanupTimers) {
        databaseService.forceCleanupTimers();
      }
    }
  });

  describe('constructor', () => {
    it('should initialize with DATABASE_URL when provided', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      
      const service = new DatabaseService();
      
      expect(pg.Pool).toHaveBeenCalledWith(expect.objectContaining({
        connectionString: 'postgresql://test:test@localhost:5432/test'
      }));
      
      delete process.env.DATABASE_URL;
    });

    it('should set up connection event handlers', () => {
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
    });
  });

  describe('withFallback', () => {
    it('should return database data when connection is available', async () => {
      const mockOperation = vi.fn<() => Promise<{ id: number; name: string; }>>().mockResolvedValue({ id: 1, name: 'test' });
      const fallbackData = { id: 0, name: 'fallback' };

      mockClient.query.mockResolvedValue({ rows: [{ now: new Date() }] });

      const result = await databaseService.withFallback(
        mockOperation,
        fallbackData,
        'test-operation'
      );

      expect(result.source).toBe('database');
      expect(result.data).toEqual({ id: 1, name: 'test' });
      expect(result.error).toBeUndefined();
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should return fallback data when database operation fails', async () => {
      const mockOperation = vi.fn<() => Promise<{ id: number; name: string; }>>().mockRejectedValue(new Error('Database error'));
      const fallbackData = { id: 0, name: 'fallback' };

      const result = await databaseService.withFallback(
        mockOperation,
        fallbackData,
        'test-operation'
      );

      expect(result.source).toBe('fallback');
      expect(result.data).toEqual(fallbackData);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Database error');
    });
  });

  describe('withTransaction', () => {
    it('should execute transaction successfully and commit', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const mockCallback = vi.fn() as vi.MockedFunction<() => Promise<{ success: boolean }>>;
      mockCallback.mockResolvedValue({ success: true });

      const result = await databaseService.withTransaction(mockCallback as any, 'test-transaction');

      expect(result.source).toBe('database');
      expect(result.data).toEqual({ success: true });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const mockCallback = vi.fn() as vi.MockedFunction<() => Promise<{ success: boolean }>>;
      mockCallback.mockRejectedValue(new Error('Transaction error'));

      await expect(
        databaseService.withTransaction(mockCallback as any, 'test-transaction')
      ).rejects.toThrow('Transaction error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status information', () => {
      const status = databaseService.getConnectionStatus();

      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('lastHealthCheck');
      expect(status).toHaveProperty('connectionAttempts');
      expect(status).toHaveProperty('poolStats');
      expect(status.poolStats).toHaveProperty('totalCount', 10);
      expect(status.poolStats).toHaveProperty('idleCount', 5);
      expect(status.poolStats).toHaveProperty('waitingCount', 0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when database is accessible', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ result: 1 }] });

      const health = await databaseService.getHealthStatus();

      expect(health.isHealthy).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
    });

    it('should return unhealthy status when database is not accessible', async () => {
      mockPool.connect.mockRejectedValue(new Error('Health check failed'));

      const health = await databaseService.getHealthStatus();

      expect(health.isHealthy).toBe(false);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.error).toBeInstanceOf(Error);
    });
  });
});













































