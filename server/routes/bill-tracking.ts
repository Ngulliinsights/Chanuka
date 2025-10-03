import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { billTrackingService } from '../services/bill-tracking.js';
import { z } from 'zod';

export const router = Router();

const trackBillSchema = z.object({
  trackingType: z.enum(['follow', 'watch', 'urgent']).optional().default('follow'),
  alertPreferences: z.object({
    statusChanges: z.boolean().default(true),
    newComments: z.boolean().default(false),
    votingSchedule: z.boolean().default(true),
    amendments: z.boolean().default(true)
  }).optional()
});

// Track a bill
router.post('/:billId/track', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const billId = parseInt(req.params.billId);
    const userId = req.user!.id;
    const trackingData = trackBillSchema.parse(req.body);

    await billTrackingService.trackBill({
      userId,
      billId,
      ...trackingData
    });

    res.json({ success: true, message: 'Bill tracking enabled' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid tracking data', details: error.errors });
    }
    console.error('Error tracking bill:', error);
    res.status(500).json({ error: 'Failed to track bill' });
  }
});

// Untrack a bill
router.delete('/:billId/track', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const billId = parseInt(req.params.billId);
    const userId = req.user!.id;

    await billTrackingService.untrackBill(userId, billId);
    res.json({ success: true, message: 'Bill tracking disabled' });
  } catch (error) {
    console.error('Error untracking bill:', error);
    res.status(500).json({ error: 'Failed to untrack bill' });
  }
});

// Get user's tracked bills
router.get('/tracked', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const trackedBills = await billTrackingService.getUserTrackedBills(userId, limit, offset);

    res.json({
      bills: trackedBills,
      pagination: {
        page,
        limit,
        hasMore: trackedBills.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching tracked bills:', error);
    res.status(500).json({ error: 'Failed to fetch tracked bills' });
  }
});

// Check if user is tracking a specific bill
router.get('/:billId/tracking-status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const billId = parseInt(req.params.billId);
    const userId = req.user!.id;

    const isTracking = await billTrackingService.isUserTrackingBill(userId, billId);
    res.json({ isTracking });
  } catch (error) {
    console.error('Error checking tracking status:', error);
    res.status(500).json({ error: 'Failed to check tracking status' });
  }
});

// Record bill view (for analytics)
router.post('/:billId/view', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const billId = parseInt(req.params.billId);
    const userId = req.user!.id;

    await billTrackingService.recordBillView(userId, billId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording bill view:', error);
    // Don't return error for view tracking
    res.json({ success: true });
  }
});

// Get bill engagement statistics
router.get('/:billId/engagement', async (req, res) => {
  try {
    const billId = parseInt(req.params.billId);
    const stats = await billTrackingService.getBillEngagementStats(billId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    res.status(500).json({ error: 'Failed to fetch engagement stats' });
  }
});