/**
 * Bill Data Source Factory Tests
 * 
 * Unit tests for the data source factory and intelligent fallback logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BillDataSourceFactory } from '../bill-data-source-factory';
import { DatabaseBillDataSource } from '../database-bill-data-source';
import { MockBillDataSource } from '../mock-bill-data-source';

// Mock the data source classes
vi.mock('../database-bill-data-source');
vi.mock('../mock-bill-data-source');

// Mock logger
vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('BillDataSourceFactory', () => {
  let factory: BillDataSourceFactory;
  let mockDatabaseSource: any;
  let mockMockSource: any;

  beforeEach(async () => {
    // Create mock instances first
    mockDatabaseSource = {
      isAvailable: vi.fn(),
      getStatus: vi.fn(() => ({
        type: 'database',
        available: true,
        lastCheck: new Date(),
      })),
    };
    
    mockMockSource = {
      isAvailable: vi.fn(() => Promise.resolve(true)),
      getStatus: vi.fn(() => ({
        type: 'mock',
        available: true,
        lastCheck: new Date(),
      })),
    };

    // Mock constructors to return our mock instances
    vi.mocked(DatabaseBillDataSource).mockImplementation(() => mockDatabaseSource);
    vi.mocked(MockBillDataSource).mockImplementation(() => mockMockSource);
    
    // Now get the factory and reset its state
    factory = BillDataSourceFactory.getInstance();
    factory.setDataSourceType('auto'); // This will set currentDataSource to null
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = BillDataSourceFactory.getInstance();
      const instance2 = BillDataSourceFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getDataSource - database mode', () => {
    beforeEach(() => {
      factory.setDataSourceType('database');
    });

    it('should return database source when available', async () => {
      mockDatabaseSource.isAvailable.mockResolvedValue(true);

      const dataSource = await factory.getDataSource();

      expect(dataSource).toBe(mockDatabaseSource);
      expect(DatabaseBillDataSource).toHaveBeenCalled();
      expect(mockDatabaseSource.isAvailable).toHaveBeenCalled();
    });

    it('should throw error when database unavailable in database mode', async () => {
      mockDatabaseSource.isAvailable.mockResolvedValue(false);

      await expect(factory.getDataSource()).rejects.toThrow('Database health check failed');
    });

    it('should throw error when database connection fails', async () => {
      const error = new Error('Connection failed');
      mockDatabaseSource.isAvailable.mockRejectedValue(error);

      await expect(factory.getDataSource()).rejects.toThrow('Connection failed');
    });
  });

  describe('getDataSource - mock mode', () => {
    beforeEach(() => {
      factory.setDataSourceType('mock');
    });

    it('should return mock source', async () => {
      const dataSource = await factory.getDataSource();

      expect(dataSource).toBe(mockMockSource);
      expect(MockBillDataSource).toHaveBeenCalled();
    });
  });

  describe('getDataSource - auto mode', () => {
    beforeEach(() => {
      factory.setDataSourceType('auto');
    });

    it('should prefer database when available', async () => {
      mockDatabaseSource.isAvailable.mockResolvedValue(true);

      const dataSource = await factory.getDataSource();

      // Test behavior instead of object identity
      expect(DatabaseBillDataSource).toHaveBeenCalled();
      expect(mockDatabaseSource.isAvailable).toHaveBeenCalled();
      expect(dataSource.getStatus().type).toBe('database');
    });

    it('should fallback to mock when database unavailable', async () => {
      mockDatabaseSource.isAvailable.mockResolvedValue(false);
      
      // Force factory to re-initialize by changing type
      factory.setDataSourceType('database');
      factory.setDataSourceType('auto');

      const dataSource = await factory.getDataSource();

      // Test behavior instead of object identity
      expect(DatabaseBillDataSource).toHaveBeenCalled();
      expect(MockBillDataSource).toHaveBeenCalled();
      expect(dataSource.getStatus().type).toBe('mock');
    });

    it('should fallback to mock when database throws error', async () => {
      const error = new Error('Database connection failed');
      mockDatabaseSource.isAvailable.mockRejectedValue(error);
      
      // Force factory to re-initialize by changing type
      factory.setDataSourceType('database');
      factory.setDataSourceType('auto');

      const dataSource = await factory.getDataSource();

      // Test behavior instead of object identity
      expect(MockBillDataSource).toHaveBeenCalled();
      expect(dataSource.getStatus().type).toBe('mock');
    });
  });

  describe('setDataSourceType', () => {
    it('should change data source type and force re-initialization', async () => {
      // First get a data source
      factory.setDataSourceType('mock');
      const mockSource = await factory.getDataSource();
      expect(mockSource).toBe(mockMockSource);

      // Change to database
      factory.setDataSourceType('database');
      mockDatabaseSource.isAvailable.mockResolvedValue(true);
      
      const databaseSource = await factory.getDataSource();
      expect(databaseSource).toBe(mockDatabaseSource);
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      factory.setDataSourceType('mock');
      await factory.getDataSource(); // Initialize

      const status = await factory.getStatus();

      expect(status.current).toBe('mock');
      expect(status.preferred).toBe('mock');
      expect(status.status).toBeDefined();
      expect(status.lastHealthCheck).toBeInstanceOf(Date);
    });
  });

  describe('forceHealthCheck', () => {
    it('should force re-initialization', async () => {
      factory.setDataSourceType('database');
      mockDatabaseSource.isAvailable.mockResolvedValue(true);
      
      // Get initial data source
      await factory.getDataSource();
      expect(DatabaseBillDataSource).toHaveBeenCalledTimes(1);

      // Force health check
      await factory.forceHealthCheck();
      
      // Should create new instance
      await factory.getDataSource();
      expect(DatabaseBillDataSource).toHaveBeenCalledTimes(2);
    });
  });

  describe('health check interval', () => {
    it('should not re-initialize within health check interval', async () => {
      factory.setDataSourceType('mock');
      
      // Get data source twice quickly
      await factory.getDataSource();
      await factory.getDataSource();
      
      // Should only create one instance
      expect(MockBillDataSource).toHaveBeenCalledTimes(1);
    });

    it('should re-initialize after health check interval', async () => {
      factory.setDataSourceType('mock');
      
      // Get initial data source
      await factory.getDataSource();
      expect(MockBillDataSource).toHaveBeenCalledTimes(1);

      // Mock time passing (simulate interval passing)
      const originalDate = Date.now;
      Date.now = vi.fn(() => originalDate() + 35000); // 35 seconds later

      try {
        // Get data source again - should re-initialize
        await factory.getDataSource();
        expect(MockBillDataSource).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = originalDate;
      }
    });
  });
});