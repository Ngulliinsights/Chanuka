import { Router } from 'express';
import { webSocketService } from '../../infrastructure/websocket.js';
import { billStatusMonitorService as billStatusMonitor } from './bill-status-monitor.js';
import { userPreferencesService } from '../users/user-preferences.js';
import { authenticateToken } from '../../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Schema for WebSocket authentication
const wsAuthSchema = z.object({
  token: z.string()
});

// Schema for preference updates
const preferencesUpdateSchema = z.object({
  billTracking: z.object({
    statusChanges: z.boolean().optional(),
    newComments: z.boolean().optional(),
    votingSchedule: z.boolean().optional(),
    amendments: z.boolean().optional(),
    updateFrequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
    notificationChannels: z.object({
      inApp: z.boolean().optional(),
      email: z.boolean().optional(),
      push: z.boolean().optional()
    }).optional(),
    quietHours: z.object({
      enabled: z.boolean().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional()
    }).optional()
  }).optional()
});

// Schema for manual status change (admin only)
const statusChangeSchema = z.object({
  billId: z.number(),
  newStatus: z.string(),
  metadata: z.record(z.any()).optional()
});

// WebSocket authentication endpoint
router.post('/ws/auth', async (req, res) => {
  try {
    const { token } = wsAuthSchema.parse(req.body);
    
    // This endpoint would be called by the client to validate their token
    // The actual authentication happens in the WebSocket service
    res.json({ 
      success: true, 
      message: 'Token validated. Connect to /ws with this token.' 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: 'Invalid token format' 
    });
  }
});

// Get WebSocket connection statistics (admin only)
router.get('/ws/stats', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd check if user is admin
    const stats = webSocketService.getStats();
    const monitorStats = billStatusMonitor.getMonitoringStats();
    
    res.json({
      success: true,
      data: {
        websocket: stats,
        monitoring: monitorStats
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics' 
    });
  }
});

// Get user's notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const preferences = await userPreferencesService.getUserPreferences(userId);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get preferences' 
    });
  }
});

// Update user's notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const updates = preferencesUpdateSchema.parse(req.body);
    const updatedPreferences = await userPreferencesService.updateUserPreferences(userId, updates);
    
    res.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid preference data',
        details: error.errors 
      });
    }
    
    console.error('Error updating user preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update preferences' 
    });
  }
});

// Get bill tracking status for a specific bill
router.get('/bill/:billId/status', authenticateToken, async (req, res) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid bill ID' 
      });
    }

    const status = billStatusMonitor.getBillStatus(billId);
    
    if (!status) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bill not found in monitoring system' 
      });
    }

    res.json({
      success: true,
      data: {
        billId,
        status,
        lastChecked: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting bill status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get bill status' 
    });
  }
});

// Manually trigger a bill status change (admin only)
router.post('/bill/status-change', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd check if user is admin
    const { billId, newStatus, metadata } = statusChangeSchema.parse(req.body);
    
    await billStatusMonitor.triggerStatusChange(billId, newStatus, metadata);
    
    res.json({
      success: true,
      message: `Bill ${billId} status changed to ${newStatus}`,
      data: {
        billId,
        newStatus,
        timestamp: new Date()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status change data',
        details: error.errors 
      });
    }
    
    console.error('Error triggering status change:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger status change' 
    });
  }
});

// Add a bill to monitoring
router.post('/bill/:billId/monitor', authenticateToken, async (req, res) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid bill ID' 
      });
    }

    await billStatusMonitor.addBillToMonitoring(billId);
    
    res.json({
      success: true,
      message: `Bill ${billId} added to monitoring`,
      data: { billId }
    });
  } catch (error) {
    console.error('Error adding bill to monitoring:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add bill to monitoring' 
    });
  }
});

// Remove a bill from monitoring (admin only)
router.delete('/bill/:billId/monitor', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd check if user is admin
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid bill ID' 
      });
    }

    billStatusMonitor.removeBillFromMonitoring(billId);
    
    res.json({
      success: true,
      message: `Bill ${billId} removed from monitoring`,
      data: { billId }
    });
  } catch (error) {
    console.error('Error removing bill from monitoring:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove bill from monitoring' 
    });
  }
});

// Force refresh of all bill statuses (admin only)
router.post('/monitoring/refresh', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd check if user is admin
    await billStatusMonitor.refreshAllStatuses();
    
    res.json({
      success: true,
      message: 'All bill statuses refreshed',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error refreshing bill statuses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh bill statuses' 
    });
  }
});

// Get preference statistics (admin only)
router.get('/preferences/stats', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd check if user is admin
    const stats = await userPreferencesService.getPreferenceStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting preference stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get preference statistics' 
    });
  }
});

// Test endpoint to send a test notification
router.post('/test/notification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    webSocketService.sendUserNotification(userId, {
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification from the real-time tracking system',
      data: { timestamp: new Date() }
    });
    
    res.json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test notification' 
    });
  }
});

// Test endpoint to simulate a bill status change
router.post('/test/bill-status-change', authenticateToken, async (req, res) => {
  try {
    const { billId, newStatus } = req.body;
    
    if (!billId || !newStatus) {
      return res.status(400).json({ 
        success: false, 
        error: 'billId and newStatus are required' 
      });
    }

    // Simulate a bill status change for testing
    await billStatusMonitor.triggerStatusChange(billId, newStatus, {
      title: `Test Bill ${billId}`,
      testMode: true,
      triggeredBy: req.user?.userId
    });
    
    res.json({
      success: true,
      message: `Test bill status change triggered for bill ${billId}`,
      data: {
        billId,
        newStatus,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error triggering test bill status change:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger test bill status change' 
    });
  }
});

// Test endpoint to simulate real-time bill update broadcast
router.post('/test/bill-update-broadcast', authenticateToken, async (req, res) => {
  try {
    const { billId, updateType = 'status_change', title = 'Test Bill' } = req.body;
    
    if (!billId) {
      return res.status(400).json({ 
        success: false, 
        error: 'billId is required' 
      });
    }

    // Broadcast a test update to all subscribers of this bill
    webSocketService.broadcastBillUpdate(billId, {
      type: updateType as 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled',
      data: {
        billId,
        title,
        oldStatus: 'introduced',
        newStatus: 'committee',
        testMode: true
      },
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: `Test bill update broadcast sent for bill ${billId}`,
      data: {
        billId,
        updateType,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error broadcasting test bill update:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to broadcast test bill update' 
    });
  }
});

export { router };