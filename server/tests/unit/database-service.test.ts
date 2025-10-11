import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseService } from '../../../infrastructure/database/database-service.js';
import pg from 'pg';
import { logger } from '../../utils/logger';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0
  }))
}));

// Mock drizzle-orm
jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn().mockReturnValue({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  })
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0
    };

    (pg.Pool as jest.MockedClass<typeof pg.Pool>).mockImplementation(() => mockPool);
    databaseService = new DatabaseService();
  });

  afterEach(async () => {
    if (databaseService) {
      await databaseService.close();
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
      const mockOperation = jest.fn().mockResolvedValue({ id: 1, name: 'test' });
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
      const mockOperation = jest.fn().mockRejectedValue(new Error('Database error'));
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

      const mockCallback = jest.fn().mockResolvedValue({ success: true });

      const result = await databaseService.withTransaction(mockCallback, 'test-transaction');

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

      const mockCallback = jest.fn().mockRejectedValue(new Error('Transaction error'));

      await expect(
        databaseService.withTransaction(mockCallback, 'test-transaction')
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






