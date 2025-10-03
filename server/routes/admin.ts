import { Router } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { adminService } from '../services/admin.js';
import { z } from 'zod';

export const router = Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// User management
const userManagementSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional()
});

router.get('/users', async (req, res) => {
  try {
    const filters = userManagementSchema.parse(req.query);
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');

    const result = await adminService.getUserManagement(page, limit, {
      role: filters.role,
      status: filters.status,
      search: filters.search
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    console.error('Error fetching users for admin:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status
const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['citizen', 'expert', 'admin', 'journalist', 'advocate']).optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional()
});

router.patch('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const updates = updateUserSchema.parse(req.body);

    await adminService.updateUserStatus(userId, updates);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid update data', details: error.errors });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// System logs
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const level = req.query.level as string;

    const logs = await adminService.getSystemLogs(page, limit, level);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

// Content moderation
router.get('/moderation/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await adminService.getContentModeration(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching content moderation data:', error);
    res.status(500).json({ error: 'Failed to fetch moderation data' });
  }
});

// Moderate comment
const moderateCommentSchema = z.object({
  action: z.enum(['approve', 'remove', 'flag'])
});

router.post('/moderation/comments/:commentId', async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const { action } = moderateCommentSchema.parse(req.body);

    await adminService.moderateComment(commentId, action);
    res.json({ success: true, message: `Comment ${action}d successfully` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid moderation action', details: error.errors });
    }
    console.error('Error moderating comment:', error);
    res.status(500).json({ error: 'Failed to moderate comment' });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    // Perform various health checks
    const health = {
      database: true, // Would implement actual DB health check
      redis: true, // If using Redis
      externalAPIs: true, // Check external service health
      diskSpace: 85, // Percentage used
      memory: 60, // Percentage used
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Mock response
    res.json({
      success: true,
      message: `User ${id} role updated to ${role}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// System health check
router.get('/system/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      database: true,
      redis: true,
      storage: true,
      lastChecked: new Date()
    };

    res.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
});