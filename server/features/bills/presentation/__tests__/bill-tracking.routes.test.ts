import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { billTrackingRouter } from '../bill-tracking.routes'; // Import the router
import { billTrackingService } from '../../application/bill-tracking.service'; // Import the service to mock
import { authenticateToken } from '@/components/auth'; // Import or mock auth middleware

// --- Mock the Service ---
vi.mock('../../application/bill-tracking.service', () => ({
  billTrackingService: {
    trackBill: vi.fn(),
    untrackBill: vi.fn(),
    getUserTrackedBills: vi.fn(),
    updateBillTrackingPreferences: vi.fn(),
    isUserTrackingBill: vi.fn(),
    bulkTrackingOperation: vi.fn(),
    getUserTrackingAnalytics: vi.fn(),
    getRecommendedBillsForTracking: vi.fn(),
  },
}));

// --- Mock Auth Middleware ---
// Basic mock: Assumes all requests are authenticated with a mock user
vi.mock('../../../../middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'mock-user-id', role: 'citizen' }; // Attach mock user
        next();
    }
}));


// --- Setup Express App for Testing ---
const app: Express = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use('/api/bill-tracking', billTrackingRouter); // Mount the router

// --- Test Suite ---
describe('Bill Tracking API Routes', () => { const mockUserId = 'mock-user-id';
  const mockBillId = 123;
   const mockPreferenceResult = {
        id: 1, user_id: mockUserId, bill_id: mockBillId, tracking_types: ['status_changes'],
        alert_frequency: 'immediate', alert_channels: ['in_app'], is_active: true,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };


  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  // --- Test Cases ---

  describe('POST /api/bill-tracking/track/:bill_id', () => {
    it('should return 200 and tracking info on successful tracking', async () => {
       // Arrange
       (billTrackingService.trackBill as vi.Mock).mockResolvedValue(mockPreferenceResult);
       const preferences = { alert_frequency: 'daily' };

      // Act
      const response = await request(app)
        .post(`/api/bill-tracking/track/${mockBillId}`)
        .send({ preferences }); // Send preferences in body

      // Assert
      expect(response.status).toBe(200); // Expecting 200 based on route implementation
       expect(response.body.status).toBe('success');
       expect(response.body.data.message).toBe('Bill tracked successfully');
       expect(response.body.data.tracking).toEqual(mockPreferenceResult);
       expect(billTrackingService.trackBill).toHaveBeenCalledWith(mockUserId, mockBillId, preferences);
    });

    it('should return 400 if bill_id is invalid', async () => {
      // Act
      const response = await request(app).post('/api/bill-tracking/track/invalid');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
       expect(response.body.message).toContain('Invalid Bill ID');
       expect(billTrackingService.trackBill).not.toHaveBeenCalled();
    });

    it('should return 500 if service throws an error', async () => {
        // Arrange
        const errorMessage = 'Database connection failed';
        (billTrackingService.trackBill as vi.Mock).mockRejectedValue(new Error(errorMessage));

        // Act
        const response = await request(app).post(`/api/bill-tracking/track/${mockBillId}`);

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe(errorMessage); // Error handler passes message
    });

      it('should return 400 if preferences are invalid', async () => {
        // Arrange
        const invalidPreferences = { alert_frequency: 'yearly' }; // Invalid value

        // Act
        const response = await request(app)
            .post(`/api/bill-tracking/track/${mockBillId}`)
            .send({ preferences: invalidPreferences });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining("Invalid enum value. Expected 'immediate' | 'hourly' | 'daily' | 'weekly'") })
        ])); // Check Zod error structure
        expect(billTrackingService.trackBill).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/bill-tracking/track/:bill_id', () => {
    it('should return 204 No Content on successful untracking', async () => {
      // Arrange
      (billTrackingService.untrackBill as vi.Mock).mockResolvedValue(undefined);

      // Act
      const response = await request(app).delete(`/api/bill-tracking/track/${mockBillId}`);

      // Assert
      expect(response.status).toBe(204);
      expect(billTrackingService.untrackBill).toHaveBeenCalledWith(mockUserId, mockBillId);
    });

    it('should return 400 if bill_id is invalid', async () => {
       // Act
       const response = await request(app).delete('/api/bill-tracking/track/invalid');

       // Assert
       expect(response.status).toBe(400);
       expect(response.body.status).toBe('fail');
       expect(response.body.message).toContain('Invalid Bill ID');
       expect(billTrackingService.untrackBill).not.toHaveBeenCalled();
   });


    it('should return 500 if service fails', async () => {
       // Arrange
        const errorMessage = 'Failed to update database';
        (billTrackingService.untrackBill as vi.Mock).mockRejectedValue(new Error(errorMessage));

       // Act
       const response = await request(app).delete(`/api/bill-tracking/track/${mockBillId}`);

       // Assert
       expect(response.status).toBe(500);
       expect(response.body.status).toBe('error');
       expect(response.body.message).toBe(errorMessage);
    });
  });

   describe('GET /api/bill-tracking/is-tracking/:bill_id', () => {
        it('should return true if user is tracking', async () => {
            (billTrackingService.isUserTrackingBill as vi.Mock).mockResolvedValue(true);

            const response = await request(app).get(`/api/bill-tracking/is-tracking/${mockBillId}`);

            expect(response.status).toBe(200);
            expect(response.body.data.isTracking).toBe(true);
            expect(billTrackingService.isUserTrackingBill).toHaveBeenCalledWith(mockUserId, mockBillId);
        });

        it('should return false if user is not tracking', async () => {
             (billTrackingService.isUserTrackingBill as vi.Mock).mockResolvedValue(false);

             const response = await request(app).get(`/api/bill-tracking/is-tracking/${mockBillId}`);

             expect(response.status).toBe(200);
             expect(response.body.data.isTracking).toBe(false);
         });

         it('should return 400 for invalid bill ID', async () => {
             const response = await request(app).get(`/api/bill-tracking/is-tracking/abc`);
             expect(response.status).toBe(400);
             expect(response.body.message).toContain('Invalid Bill ID');
         });
    });


  // Add more integration tests for:
  // - GET /tracked (test pagination, filtering, sorting query params)
  // - PUT /preferences/:bill_id (test valid and invalid preference updates)
  // - POST /bulk (test track/untrack, validation, partial failures)
  // - GET /analytics
  // - GET /recommended
});

