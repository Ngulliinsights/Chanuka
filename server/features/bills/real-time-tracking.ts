import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError  } from '../../../shared/core/src/utils/api';
import { logger  } from '../../../shared/core/src/index.js';
import { webSocketService } from '../../infrastructure/websocket.js';
// import { billsService } from '../application/bills';
const billsService = {
  getBills: async () => [] as any[],
  getBill: async (id: number) => ({ id, title: 'Mock Bill', status: 'introduced', updatedAt: new Date(), views: 0, comments: 0 }),
  incrementBillViews: async (id: number) => ({ id, views: 1 }),
  incrementBillShares: async (id: number) => ({ id, shares: 1 })
};
import { createRateLimit } from '../../middleware/rate-limiter.js';

const router = Router();

// Rate limiting for real-time endpoints (more restrictive than regular API)
const realTimeRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many real-time requests'
});

// Higher rate limit for subscription management
const subscriptionRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 subscription changes per minute
  message: 'Too many subscription requests'
});

/**
 * Utility function to parse and validate integer parameters from route params
 */
function parseIntParam(value: string, paramName: string): { valid: true; value: number } | { valid: false; error: string } {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: `${paramName} must be a valid positive number` };
  }
  return { valid: true, value: parsed };
}

/**
 * Centralized error handler for real-time tracking endpoints
 */
function handleRouteError(res: Response, error: unknown, context: string, userId?: string): void {
  logger.error(`Error in real-time ${context}:`, {
    component: 'RealTimeTrackingRouter',
    context,
    userId,
    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
  }, error);

  if (error instanceof Error && error.message.includes('not found')) {
    ApiNotFound(res, 'Resource', error.message);
    return;
  }

  ApiError(res, { code: 'INTERNAL_ERROR', message: `Failed to ${context}` });
}

/**
 * Higher-order function that wraps async route handlers with error handling
 */
function asyncHandler(fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/real-time/bills
 * Get real-time bill updates with current status and recent activity
 *
 * Query Parameters:
 *   - limit: maximum number of bills to return (default: 50, max: 100)
 *   - offset: pagination offset (default: 0)
 *   - status: filter by bill status
 *   - includeWebSocket: include WebSocket connection info (default: false)
 */
router.get('/bills', realTimeRateLimit, asyncHandler(async (req, res) => {
  const { limit = '50', offset = '0', status, includeWebSocket = 'false' } = req.query;

  // Parse and validate pagination parameters
  const parsedLimit = parseInt(limit as string, 10);
  const parsedOffset = parseInt(offset as string, 10);

  if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
    ApiValidationError(res, [{ field: 'limit', message: 'Limit must be a positive number between 1 and 100' }]);
    return;
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    ApiValidationError(res, [{ field: 'offset', message: 'Offset must be a non-negative number' }]);
    return;
  }

  try {
    // Get bills with real-time data
    const bills = await billsService.getBills();

    // Apply status filter if provided
    let filteredBills = bills;
    if (status) {
      filteredBills = bills.filter(bill => bill.status === status);
    }

    // Apply pagination
    const paginatedBills = filteredBills.slice(parsedOffset, parsedOffset + parsedLimit);

    // Get WebSocket statistics if requested
    let webSocketInfo: any = undefined;
    if (includeWebSocket === 'true') {
      const wsStats = webSocketService.getStats();
      webSocketInfo = {
        connectedUsers: wsStats.uniqueUsers,
        activeConnections: wsStats.activeConnections,
        totalSubscriptions: wsStats.totalSubscriptions
      };
    }

    // Get real-time activity indicators (simplified - in real implementation would track recent updates)
    const billsWithRealTimeData = paginatedBills.map(bill => ({
      ...bill,
      realTimeData: {
        lastActivity: bill.updatedAt,
        isActive: new Date(bill.updatedAt).getTime() > Date.now() - (24 * 60 * 60 * 1000), // Active if updated in last 24h
        subscriberCount: webSocketService.getBillSubscribers(bill.id).length
      }
    }));

    ApiSuccess(res, {
      bills: billsWithRealTimeData,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        total: filteredBills.length,
        hasMore: parsedOffset + parsedLimit < filteredBills.length
      },
      webSocketInfo,
      timestamp: new Date().toISOString(),
      message: billsWithRealTimeData.length === 0 ? 'No bills found matching criteria' : undefined
    });

  } catch (error) {
    return handleRouteError(res, error, 'fetch real-time bills');
  }
}));

/**
 * GET /api/real-time/bills/:id
 * Get real-time updates for a specific bill
 *
 * Query Parameters:
 *   - includeSubscribers: include subscriber information (default: false)
 *   - includeActivity: include recent activity data (default: true)
 */
router.get('/bills/:id', realTimeRateLimit, asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Bill ID');
  if (!idResult.valid) {
    ApiValidationError(res, [{ field: 'id', message: idResult.error }]);
    return;
  }

  const { includeSubscribers = 'false', includeActivity = 'true' } = req.query;

  try {
    const bill = await billsService.getBill(idResult.value);

    // Get real-time specific data
    const subscribers = includeSubscribers === 'true' ? webSocketService.getBillSubscribers(bill.id) : [];
    const subscriberCount = webSocketService.getBillSubscribers(bill.id).length;

    // Get activity data (simplified - would track actual real-time events)
    let activityData: any = undefined;
    if (includeActivity === 'true') {
      activityData = {
        lastUpdate: bill.updatedAt,
        isActive: new Date(bill.updatedAt).getTime() > Date.now() - (60 * 60 * 1000), // Active if updated in last hour
        recentViews: bill.views || 0,
        recentComments: bill.comments || 0,
        subscriberCount
      };
    }

    ApiSuccess(res, {
      bill: {
        ...bill,
        realTimeData: {
          subscribers: subscribers.length > 0 ? subscribers : undefined,
          subscriberCount,
          activity: activityData,
          webSocketChannel: `bill-${bill.id}`
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      ApiNotFound(res, 'Bill', 'Bill not found');
      return;
    }
    handleRouteError(res, error, 'fetch real-time bill data', req.user?.id?.toString());
  }
}));

/**
 * POST /api/real-time/subscribe
 * Subscribe to real-time updates for bills
 *
 * Body:
 *   - billIds: array of bill IDs to subscribe to
 *   - subscriptionTypes: array of subscription types (optional, defaults to all)
 */
router.post('/subscribe', authenticateToken, subscriptionRateLimit, asyncHandler(async (req, res) => {
  const { billIds, subscriptionTypes = ['status_change', 'new_comment', 'amendment', 'voting_scheduled'] } = req.body;

  if (!Array.isArray(billIds) || billIds.length === 0) {
    ApiValidationError(res, [{ field: 'billIds', message: 'billIds must be a non-empty array of bill IDs' }]);
    return;
  }

  if (!Array.isArray(subscriptionTypes)) {
    ApiValidationError(res, [{ field: 'subscriptionTypes', message: 'subscriptionTypes must be an array' }]);
    return;
  }

  // Validate bill IDs
  const invalidIds = billIds.filter(id => !Number.isInteger(id) || id <= 0);
  if (invalidIds.length > 0) {
    ApiValidationError(res, [{ field: 'billIds', message: 'All bill IDs must be positive integers' }]);
    return;
  }

  // Validate subscription types
  const validTypes = ['status_change', 'new_comment', 'amendment', 'voting_scheduled'];
  const invalidTypes = subscriptionTypes.filter(type => !validTypes.includes(type));
  if (invalidTypes.length > 0) {
    ApiValidationError(res, [{ field: 'subscriptionTypes', message: `Invalid subscription types: ${invalidTypes.join(', ')}` }]);
    return;
  }

  try {
    // Check if user has active WebSocket connection
    const hasWebSocketConnection = webSocketService.isUserConnected(req.user!.id.toString());

    if (!hasWebSocketConnection) {
      ApiValidationError(res, [{ field: 'connection', message: 'WebSocket connection required for real-time subscriptions. Please connect to /ws first.' }]);
      return;
    }

    // Get current subscriptions
    const currentSubscriptions = webSocketService.getUserSubscriptions(req.user!.id.toString());

    // Subscribe to new bills (WebSocket service handles deduplication)
    const newSubscriptions = billIds.filter(id => !currentSubscriptions.includes(id));

    // Note: Actual subscription happens via WebSocket, this endpoint just validates and confirms
    // In a full implementation, this might send a subscription command via WebSocket

    logger.info('Real-time subscription request', {
      component: 'RealTimeTrackingRouter',
      userId: req.user!.id,
      billIds: newSubscriptions,
      subscriptionTypes
    });

    ApiSuccess(res, {
      subscribed: newSubscriptions,
      alreadySubscribed: billIds.filter(id => currentSubscriptions.includes(id)),
      subscriptionTypes,
      message: `Subscribed to ${newSubscriptions.length} new bills`,
      webSocketRequired: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleRouteError(res, error, 'subscribe to real-time updates', req.user!.id.toString());
  }
}));

/**
 * DELETE /api/real-time/unsubscribe
 * Unsubscribe from real-time updates
 *
 * Body:
 *   - billIds: array of bill IDs to unsubscribe from (optional - if not provided, unsubscribes from all)
 */
router.delete('/unsubscribe', authenticateToken, subscriptionRateLimit, asyncHandler(async (req, res) => {
  const { billIds } = req.body;

  // If no billIds provided, unsubscribe from all
  const targetBillIds = billIds || webSocketService.getUserSubscriptions(req.user!.id.toString());

  if (!Array.isArray(targetBillIds)) {
    ApiValidationError(res, [{ field: 'billIds', message: 'billIds must be an array of bill IDs' }]);
    return;
  }

  // Validate bill IDs
  const invalidIds = targetBillIds.filter(id => !Number.isInteger(id) || id <= 0);
  if (invalidIds.length > 0) {
    ApiValidationError(res, [{ field: 'billIds', message: 'All bill IDs must be positive integers' }]);
    return;
  }

  try {
    // Check if user has active WebSocket connection
    const hasWebSocketConnection = webSocketService.isUserConnected(req.user!.id.toString());

    if (!hasWebSocketConnection) {
      ApiValidationError(res, [{ field: 'connection', message: 'WebSocket connection required for real-time subscriptions. Please connect to /ws first.' }]);
      return;
    }

    // Get current subscriptions
    const currentSubscriptions = webSocketService.getUserSubscriptions(req.user!.id.toString());

    // Find subscriptions to remove
    const subscriptionsToRemove = targetBillIds.filter(id => currentSubscriptions.includes(id));

    // Note: Actual unsubscription happens via WebSocket, this endpoint just validates and confirms
    // In a full implementation, this might send an unsubscription command via WebSocket

    logger.info('Real-time unsubscription request', {
      component: 'RealTimeTrackingRouter',
      userId: req.user!.id,
      billIds: subscriptionsToRemove
    });

    ApiSuccess(res, {
      unsubscribed: subscriptionsToRemove,
      notSubscribed: targetBillIds.filter(id => !currentSubscriptions.includes(id)),
      message: `Unsubscribed from ${subscriptionsToRemove.length} bills`,
      webSocketRequired: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleRouteError(res, error, 'unsubscribe from real-time updates', req.user!.id.toString());
  }
}));

/**
 * GET /api/real-time/status
 * Get real-time system status and connection information
 */
router.get('/status', realTimeRateLimit, asyncHandler(async (req, res) => {
  try {
    const wsStats = webSocketService.getStats();
    const healthStatus = webSocketService.getHealthStatus();

    ApiSuccess(res, {
      webSocket: {
        status: healthStatus.isHealthy ? 'healthy' : 'degraded',
        activeConnections: wsStats.activeConnections,
        connectedUsers: wsStats.uniqueUsers,
        totalSubscriptions: wsStats.totalSubscriptions,
        uptime: wsStats.uptime,
        messageSuccessRate: wsStats.messageSuccessRate
      },
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    return handleRouteError(res, error, 'fetch real-time status');
  }
}));

/**
 * Global error handler for this router
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  return handleRouteError(res, err, 'handle real-time request', (req as any).user?.id?.toString());
});

export { router as realTimeTrackingRouter };






