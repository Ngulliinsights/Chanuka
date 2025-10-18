import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { demoDataService } from '../../infrastructure/demo-data.js';
import { DatabaseFallbackService } from '../../infrastructure/database/database-fallback.js';
import { logger } from '../../../shared/core/src/observability/logging';

// Mock database connection
const mockDatabase = {
  execute: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
};

// Mock pool connection
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
};

// Mock the database connection module
jest.mock('../../../shared/database/connection.js', () => ({
  database: mockDatabase,
  pool: mockPool,
  withTransaction: jest.fn(),
}));

describe('Database Fallback Integration Tests', () => {
  let databaseFallbackService: DatabaseFallbackService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset demo data service
    demoDataService.setDemoMode(false);
    
    // Create fresh instance
    databaseFallbackService = new DatabaseFallbackService();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Reset demo mode
    demoDataService.setDemoMode(false);
  });

  describe('Database Connection Testing', () => {
    it('should detect healthy database connection', async () => {
      mockDatabase.execute.mockResolvedValueOnce([{ result: 1 }]);
      
      const isHealthy = await databaseFallbackService.testConnection();
      
      expect(isHealthy).toBe(true);
      expect(mockDatabase.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1')
      );
    });

    it('should detect database connection failure', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Connection refused'));
      
      const isHealthy = await databaseFallbackService.testConnection();
      
      expect(isHealthy).toBe(false);
    });

    it('should handle database timeout', async () => {
      mockDatabase.execute.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      );
      
      const isHealthy = await databaseFallbackService.testConnection();
      
      expect(isHealthy).toBe(false);
    });

    it('should handle malformed database responses', async () => {
      mockDatabase.execute.mockResolvedValueOnce(null);
      
      const isHealthy = await databaseFallbackService.testConnection();
      
      expect(isHealthy).toBe(false);
    });
  });

  describe('Demo Mode Activation', () => {
    it('should activate demo mode on database failure', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database unavailable'));
      
      const result = await databaseFallbackService.initialize();
      
      expect(result.demoModeEnabled).toBe(true);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should not activate demo mode on successful connection', async () => {
      mockDatabase.execute.mockResolvedValueOnce([{ result: 1 }]);
      
      const result = await databaseFallbackService.initialize();
      
      expect(result.demoModeEnabled).toBe(false);
      expect(demoDataService.isDemoMode()).toBe(false);
    });

    it('should activate demo mode when DEMO_MODE environment variable is set', async () => {
      process.env.DEMO_MODE = 'true';
      
      const result = await databaseFallbackService.initialize();
      
      expect(result.demoModeEnabled).toBe(true);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should activate demo mode in demo environment', async () => {
      process.env.NODE_ENV = 'demo';
      
      const result = await databaseFallbackService.initialize();
      
      expect(result.demoModeEnabled).toBe(true);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should activate demo mode when DATABASE_UNAVAILABLE is set', async () => {
      process.env.DATABASE_UNAVAILABLE = 'true';
      
      const result = await databaseFallbackService.initialize();
      
      expect(result.demoModeEnabled).toBe(true);
      expect(demoDataService.isDemoMode()).toBe(true);
    });
  });

  describe('Connection Retry Logic', () => {
    it('should retry connection on transient failures', async () => {
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(false) // Second attempt fails
        .mockResolvedValueOnce(true); // Third attempt succeeds

      const result = await databaseFallbackService.initializeWithRetry({
        maxRetries: 3,
        retryDelay: 100,
      });

      expect(testConnectionSpy).toHaveBeenCalledTimes(3);
      expect(result.demoModeEnabled).toBe(false);
      expect(result.connectionEstablished).toBe(true);
    });

    it('should enable demo mode after max retries exceeded', async () => {
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValue(false); // Always fails

      const result = await databaseFallbackService.initializeWithRetry({
        maxRetries: 2,
        retryDelay: 50,
      });

      expect(testConnectionSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.demoModeEnabled).toBe(true);
      expect(result.connectionEstablished).toBe(false);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should use exponential backoff for retries', async () => {
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValue(false);

      const startTime = Date.now();
      
      await databaseFallbackService.initializeWithRetry({
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: true,
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should take at least 100ms + 200ms = 300ms with exponential backoff
      expect(totalTime).toBeGreaterThan(250);
      expect(testConnectionSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Health Monitoring', () => {
    it('should provide comprehensive health status', async () => {
      mockDatabase.execute.mockResolvedValueOnce([{ result: 1 }]);
      
      await databaseFallbackService.initialize();
      const health = await databaseFallbackService.getHealthStatus();

      expect(health).toMatchObject({
        database: {
          connected: true,
          lastChecked: expect.any(String),
        },
        demoMode: {
          enabled: false,
          reason: null,
        },
        fallback: {
          available: true,
          dataConsistency: expect.any(Boolean),
        },
      });
    });

    it('should report unhealthy status when database is down', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database down'));
      
      await databaseFallbackService.initialize();
      const health = await databaseFallbackService.getHealthStatus();

      expect(health.database.connected).toBe(false);
      expect(health.demoMode.enabled).toBe(true);
      expect(health.demoMode.reason).toContain('database');
    });

    it('should validate demo data consistency', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database unavailable'));
      
      await databaseFallbackService.initialize();
      const health = await databaseFallbackService.getHealthStatus();

      expect(health.fallback.available).toBe(true);
      expect(health.fallback.dataConsistency).toBe(true);
    });
  });

  describe('Recovery Scenarios', () => {
    it('should recover when database comes back online', async () => {
      // Start with database failure
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValueOnce(false) // Initial failure
        .mockResolvedValueOnce(true); // Recovery

      // Initialize with failure
      let result = await databaseFallbackService.initialize();
      expect(result.demoModeEnabled).toBe(true);

      // Simulate recovery check
      const recoveryResult = await databaseFallbackService.checkRecovery();
      expect(recoveryResult.recovered).toBe(true);
      expect(demoDataService.isDemoMode()).toBe(false);
    });

    it('should maintain demo mode after max retries', async () => {
      const testConnectionSpy = jest.spyOn(databaseFallbackService, 'testConnection')
        .mockResolvedValue(false); // Always fails

      await databaseFallbackService.initializeWithRetry({
        maxRetries: 1,
        retryDelay: 50,
      });

      expect(demoDataService.isDemoMode()).toBe(true);

      // Even after recovery attempts, should stay in demo mode until explicit recovery
      const recoveryResult = await databaseFallbackService.checkRecovery();
      expect(recoveryResult.recovered).toBe(false);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should handle partial database recovery', async () => {
      // Simulate read-only database access
      mockDatabase.execute
        .mockResolvedValueOnce([{ result: 1 }]) // Health check passes
        .mockRejectedValueOnce(new Error('Read-only mode')); // Write fails

      const result = await databaseFallbackService.testDatabaseCapabilities();

      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(false);
      expect(result.recommendDemoMode).toBe(true);
    });
  });

  describe('Data Consistency Validation', () => {
    it('should validate demo data integrity', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database unavailable'));
      
      await databaseFallbackService.initialize();
      
      const validation = await databaseFallbackService.validateDemoData();
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.dataSetCounts).toMatchObject({
        bills: expect.any(Number),
        sponsors: expect.any(Number),
        comments: expect.any(Number),
      });
    });

    it('should detect demo data inconsistencies', async () => {
      // Mock inconsistent demo data
      const originalGetBills = demoDataService.getBills;
      demoDataService.getBills = jest.fn().mockReturnValue([
        { id: 1, sponsorId: 999 }, // Non-existent sponsor
      ]);

      mockDatabase.execute.mockRejectedValueOnce(new Error('Database unavailable'));
      
      await databaseFallbackService.initialize();
      
      const validation = await databaseFallbackService.validateDemoData();
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('sponsor');

      // Restore original method
      demoDataService.getBills = originalGetBills;
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent initialization attempts', async () => {
      mockDatabase.execute.mockResolvedValue([{ result: 1 }]);

      // Start multiple initialization attempts concurrently
      const promises = Array.from({ length: 5 }, () => 
        databaseFallbackService.initialize()
      );

      const results = await Promise.all(promises);

      // All should succeed and return consistent results
      results.forEach(result => {
        expect(result.demoModeEnabled).toBe(false);
        expect(result.connectionEstablished).toBe(true);
      });

      // Database should only be tested once due to internal locking
      expect(mockDatabase.execute).toHaveBeenCalledTimes(1);
    });

    it('should cleanup resources properly', async () => {
      mockDatabase.execute.mockResolvedValueOnce([{ result: 1 }]);
      
      await databaseFallbackService.initialize();
      
      // Should cleanup without errors
      expect(() => databaseFallbackService.cleanup()).not.toThrow();
    });

    it('should handle memory pressure during demo mode', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database unavailable'));
      
      await databaseFallbackService.initialize();
      
      // Simulate high memory usage
      const largeDataRequests = Array.from({ length: 100 }, () => 
        demoDataService.getComprehensiveBillData(1)
      );

      // Should handle without crashing
      expect(() => {
        largeDataRequests.forEach(data => {
          expect(data).toBeDefined();
        });
      }).not.toThrow();
    });
  });

  describe('Error Recovery Flows', () => {
    it('should handle database connection pool exhaustion', async () => {
      mockDatabase.execute.mockRejectedValueOnce(
        new Error('Connection pool exhausted')
      );

      const result = await databaseFallbackService.initialize();

      expect(result.demoModeEnabled).toBe(true);
      expect(result.fallbackReason).toContain('pool');
    });

    it('should handle database authentication failures', async () => {
      mockDatabase.execute.mockRejectedValueOnce(
        new Error('Authentication failed')
      );

      const result = await databaseFallbackService.initialize();

      expect(result.demoModeEnabled).toBe(true);
      expect(result.fallbackReason).toContain('authentication');
    });

    it('should handle database schema mismatches', async () => {
      mockDatabase.execute.mockRejectedValueOnce(
        new Error('Table does not exist')
      );

      const result = await databaseFallbackService.initialize();

      expect(result.demoModeEnabled).toBe(true);
      expect(result.fallbackReason).toContain('schema');
    });

    it('should provide detailed error context for debugging', async () => {
      const originalError = new Error('Specific database error');
      originalError.stack = 'Error stack trace...';
      
      mockDatabase.execute.mockRejectedValueOnce(originalError);

      const result = await databaseFallbackService.initialize();

      expect(result.errorDetails).toMatchObject({
        message: 'Specific database error',
        timestamp: expect.any(String),
        context: 'database_initialization',
      });
    });
  });

  describe('Integration with Demo Data Service', () => {
    it('should seamlessly switch between database and demo data', async () => {
      // Start with working database
      mockDatabase.execute.mockResolvedValueOnce([{ result: 1 }]);
      
      let result = await databaseFallbackService.initialize();
      expect(result.demoModeEnabled).toBe(false);

      // Simulate database failure
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database down'));
      
      await databaseFallbackService.handleDatabaseFailure();
      expect(demoDataService.isDemoMode()).toBe(true);

      // Verify demo data is accessible
      const bills = demoDataService.getBills();
      expect(bills).toHaveLength(3);
      expect(bills[0]).toHaveProperty('title');
    });

    it('should maintain data format consistency between database and demo', async () => {
      mockDatabase.execute.mockRejectedValueOnce(new Error('Database unavailable'));
      
      await databaseFallbackService.initialize();
      
      const demoBill = demoDataService.getBill(1);
      const demoSponsor = demoDataService.getSponsor(1);
      const demoComments = demoDataService.getBillComments(1);

      // Verify data structure matches expected API format
      expect(demoBill).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        description: expect.any(String),
        status: expect.any(String),
        sponsorId: expect.any(Number),
      });

      expect(demoSponsor).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        role: expect.any(String),
        party: expect.any(String),
      });

      expect(demoComments).toBeInstanceOf(Array);
      if (demoComments.length > 0) {
        expect(demoComments[0]).toMatchObject({
          id: expect.any(Number),
          billId: expect.any(Number),
          content: expect.any(String),
          userId: expect.any(String),
        });
      }
    });
  });
});






