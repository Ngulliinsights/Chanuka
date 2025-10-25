import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { billTrackingService, BillTrackingService } from '../bill-tracking.service';
import { databaseService } from '../../../../infrastructure/database/database-service';
import { cacheService } from '../../../../infrastructure/cache/cache-service';
import { notificationService } from '../../../../infrastructure/notifications/notification-service';
import * as schema from '../../../../../shared/schema';
import { readDatabase } from '@shared/database/connection'; // Mock this

// --- Mock Dependencies ---
vi.mock('../../../../db', () => ({
  readDatabase: vi.fn(),
}));
vi.mock('../../../../infrastructure/database/database-service');
vi.mock('../../../../infrastructure/cache/cache-service');
vi.mock('../../../../infrastructure/notifications/notification-service');
// Mock the status monitor if needed for side effects
vi.mock('../bill-status-monitor', () => ({
    billStatusMonitorService: {
        getBillStatusHistory: vi.fn().mockResolvedValue([]), // Mock relevant methods
    },
}));


// Type assertion for the mocked DB
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]), // Default empty result
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]), // Default empty returning
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(), // Add groupBy if used
};

// --- Test Suite ---
describe('BillTrackingService', () => {
  let service: BillTrackingService;
  const mockUserId = 'user-uuid-123';
  const mockBillId = 101;
  const mockBill = { id: mockBillId, title: 'Test Bill' } as schema.Bill;
  const mockPreference: schema.UserBillTrackingPreference = {
      id: 1, userId: mockUserId, billId: mockBillId, trackingTypes: ['status_changes'],
      alertFrequency: 'immediate', alertChannels: ['in_app'], isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
  };


  beforeEach(() => {
    vi.clearAllMocks();
    // Configure the mock DB instance
    (readDatabase as vi.Mock).mockReturnValue(mockDb);
    // Mock databaseService transactions to execute the provided callback
     (databaseService.withTransaction as vi.Mock).mockImplementation(async (callback) => {
        const mockTx = mockDb; // Simulate transaction object being the same as db for simplicity
        try {
            const data = await callback(mockTx);
            return { data, source: 'database', timestamp: new Date() }; // Mock return structure
        } catch (error) {
            // Simulate transaction rollback/error handling if needed
            throw error;
        }
    });

    // Mock cache get to simulate cache misses by default
    (cacheService.get as vi.Mock).mockResolvedValue(null);

    service = billTrackingService; // Use the exported instance or new BillTrackingService()

    // Mock validateBillExists helper - assumes it uses the DB mock
    // Setup mockDb.select...limit for validateBillExists
     mockDb.limit.mockImplementation((limitVal) => {
        if (limitVal === 1) { // Assuming validateBillExists uses limit(1)
            // Need to chain .where() response correctly
            const self = {
                 ...mockDb,
                 where: vi.fn().mockReturnThis(), // Ensure where returns the chainable object
                 limit: vi.fn().mockResolvedValue([mockBill]) // Return the mock bill when limit(1) is called after where
            };
            self.where.mockReturnValue(self); // Make where return the modified self
            return self;
        }
        return mockDb.mockResolvedValue([]); // Default for other limit calls
    });
  });


  // --- Test Cases ---

  describe('trackBill', () => {
    it('should create a new tracking preference and engagement record if none exist', async () => {
      // Arrange: No existing preference, no existing engagement
       mockDb.returning.mockResolvedValueOnce([mockPreference]); // For preference insert
       mockDb.select.mockReturnValueOnce({ // For checking existing engagement
           from: vi.fn().mockReturnThis(),
           where: vi.fn().mockResolvedValue([]), // No existing engagement
       });
       // Setup mock for engagement insert (no returning needed usually)
       mockDb.values.mockResolvedValueOnce(undefined); // for engagement insert

      // Act
      const result = await service.trackBill(mockUserId, mockBillId);

      // Assert
       expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
       expect(mockDb.insert).toHaveBeenCalledWith(schema.userBillTrackingPreference);
       expect(mockDb.insert).toHaveBeenCalledWith(schema.billEngagement); // Verify engagement insert
       expect(mockDb.onConflictDoUpdate).toHaveBeenCalled(); // Verify upsert logic
       expect(result).toEqual(mockPreference);
       expect(cacheService.deletePattern).toHaveBeenCalled();
    });

    it('should update an existing tracking preference if user re-tracks', async () => {
       // Arrange: Existing preference exists (onConflictDoUpdate handles this), existing engagement exists
       mockDb.returning.mockResolvedValueOnce([mockPreference]); // onConflictDoUpdate returns updated pref
       mockDb.select.mockReturnValueOnce({ // For checking existing engagement
           from: vi.fn().mockReturnThis(),
           where: vi.fn().mockResolvedValue([{ id: 5 }]), // Existing engagement found
       });
       // Setup mock for engagement update
        mockDb.update.mockReturnValueOnce({ // for engagement update
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
        });

      // Act
      const result = await service.trackBill(mockUserId, mockBillId, { alertFrequency: 'daily' });

      // Assert
      expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.userBillTrackingPreference); // Still called insert (upsert)
       expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
           set: expect.objectContaining({ alertFrequency: 'daily', isActive: true }), // Verify update data
       }));
       expect(mockDb.update).toHaveBeenCalledWith(schema.billEngagement); // Verify engagement UPDATE
       expect(result).toEqual(mockPreference);
    });

     it('should throw an error if the bill does not exist', async () => {
      // Arrange: Mock validateBillExists to return null
      mockDb.limit.mockImplementationOnce((limitVal) => {
         const self = { ...mockDb, where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) }; // No bill found
         self.where.mockReturnValue(self);
         return self;
      });

      // Act & Assert
      await expect(service.trackBill(mockUserId, 999)).rejects.toThrow('Bill with ID 999 not found');
      expect(databaseService.withTransaction).not.toHaveBeenCalled();
    });
  });

  describe('untrackBill', () => {
    it('should set the tracking preference isActive to false', async () => {
       // Arrange
       mockDb.returning.mockResolvedValueOnce([{ id: mockPreference.id }]); // Simulate successful update

      // Act
      await service.untrackBill(mockUserId, mockBillId);

      // Assert
      expect(mockDb.update).toHaveBeenCalledWith(schema.userBillTrackingPreference);
       expect(mockDb.set).toHaveBeenCalledWith({ isActive: false, updatedAt: expect.any(Date) });
       expect(mockDb.where).toHaveBeenCalled(); // Verify where clause was applied
       expect(cacheService.deletePattern).toHaveBeenCalled();
    });

     it('should succeed silently if the preference does not exist or is already inactive', async () => {
      // Arrange: Mock update to return empty array (no rows updated)
       mockDb.returning.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.untrackBill(mockUserId, mockBillId)).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalledWith(schema.userBillTrackingPreference);
       expect(mockDb.set).toHaveBeenCalledWith({ isActive: false, updatedAt: expect.any(Date) });
       expect(cacheService.deletePattern).toHaveBeenCalled(); // Cache should still be cleared
    });
  });

  describe('isUserTrackingBill', () => {
    it('should return true if an active preference exists', async () => {
      // Arrange
       mockDb.select.mockReturnValueOnce({
           from: vi.fn().mockReturnThis(),
           where: vi.fn().mockReturnThis(),
           limit: vi.fn().mockResolvedValue([{ isActive: true }]),
       });
       (cacheService.get as vi.Mock).mockResolvedValue(null); // Cache miss


      // Act
      const result = await service.isUserTrackingBill(mockUserId, mockBillId);

      // Assert
      expect(result).toBe(true);
       expect(cacheService.set).toHaveBeenCalledWith(`is_tracking:${mockUserId}:${mockBillId}`, true, expect.any(Number));
    });

    it('should return false if preference exists but is inactive', async () => {
       // Arrange
       mockDb.select.mockReturnValueOnce({
           from: vi.fn().mockReturnThis(),
           where: vi.fn().mockReturnThis(),
           limit: vi.fn().mockResolvedValue([{ isActive: false }]),
       });
       (cacheService.get as vi.Mock).mockResolvedValue(null); // Cache miss

      // Act
      const result = await service.isUserTrackingBill(mockUserId, mockBillId);

      // Assert
      expect(result).toBe(false);
       expect(cacheService.set).toHaveBeenCalledWith(`is_tracking:${mockUserId}:${mockBillId}`, false, expect.any(Number));
    });

    it('should return false if no preference exists', async () => {
      // Arrange
       mockDb.select.mockReturnValueOnce({
           from: vi.fn().mockReturnThis(),
           where: vi.fn().mockReturnThis(),
           limit: vi.fn().mockResolvedValue([]), // No record found
       });
       (cacheService.get as vi.Mock).mockResolvedValue(null); // Cache miss

      // Act
      const result = await service.isUserTrackingBill(mockUserId, mockBillId);

      // Assert
      expect(result).toBe(false);
      expect(cacheService.set).toHaveBeenCalledWith(`is_tracking:${mockUserId}:${mockBillId}`, false, expect.any(Number));
    });

     it('should return value from cache if available', async () => {
        // Arrange
        (cacheService.get as vi.Mock).mockResolvedValue(true); // Cache hit

        // Act
        const result = await service.isUserTrackingBill(mockUserId, mockBillId);

        // Assert
        expect(result).toBe(true);
        expect(mockDb.select).not.toHaveBeenCalled(); // DB should not be called
        expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  // Add more tests for:
  // - getUserTrackedBills (mocking joins, filters, pagination, sorting)
  // - updateBillTrackingPreferences (validation, correct update)
  // - bulkTrackingOperation (calling track/untrack, error handling)
  // - getUserTrackingAnalytics (mocking aggregation queries)
  // - getRecommendedBillsForTracking (mocking interest/tracking queries)
});