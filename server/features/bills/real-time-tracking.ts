import type { AuthenticatedRequest } from '@server/middleware/auth.js';
import { authenticateToken } from '@server/middleware/auth.js';
import { logger } from '@shared/core';
import { 
  ApiError, 
  ApiNotFound, 
  ApiSuccess, 
  ApiValidationError 
} from '@shared/core/utils/api-utils';
import type {
  BillUpdate,
  ConnectionMetrics,
  ConnectionQuality,
  ConnectionState,
  NotificationData,
  Priority,
  WebSocketStats as SharedWebSocketStats} from '@server/infrastructure/schema/websocket';
import { NextFunction, Request, Response, Router } from 'express';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Branded type for bill IDs to prevent mixing with other numeric IDs */
type BillId = number & { readonly __brand: 'BillId' };

/** Branded type for user IDs */
type UserId = string & { readonly __brand: 'UserId' };

/** Valid subscription event types - aligned with BillUpdate types */
type SubscriptionType = BillUpdate['updateType'];

/** Core bill data structure */
interface Bill {
  id: number;
  title: string;
  status: string;
  updated_at: Date;
  views: number;
  comments: number;
  shares?: number;
}

/** Bill with real-time activity data */
interface BillWithRealTimeData extends Bill {
  realTimeData: {
    lastActivity: Date;
    is_active: boolean;
    subscriberCount: number;
  };
}

/** Extended WebSocket statistics for API responses */
interface WebSocketApiStats extends SharedWebSocketStats {
  /** Unique connected user count */
  uniqueUsers: number;
  /** Total active subscriptions */
  totalSubscriptions: number;
  /** Service uptime in milliseconds */
  uptime: number;
}

/** System health status */
interface HealthStatus {
  isHealthy: boolean;
  connectionState?: ConnectionState;
  quality?: ConnectionQuality;
}

/** Validation error structure */
interface ValidationError {
  field: string;
  message: string;
}

/** Rate limiter configuration */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

/** Pagination parameters */
interface PaginationParams {
  limit: number;
  offset: number;
}

/** Pagination metadata in responses */
interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/** User subscription info */
interface UserSubscriptionInfo {
  billId: BillId;
  types: SubscriptionType[];
  priority: Priority;
  subscribedAt: number;
}

/** Real-time activity metrics for a bill */
interface BillActivityMetrics {
  lastUpdate: Date;
  is_active: boolean;
  recentViews: number;
  recentComments: number;
  subscriberCount: number;
  activeViewers?: number;
}

// ============================================================================
// SERVICE INTERFACES (Dependency Injection Contracts)
// ============================================================================

/** Service for bill-related operations */
interface IBillService {
  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill>;
  incrementBillViews(id: number): Promise<{ id: number; views: number }>;
  incrementBillShares(id: number): Promise<{ id: number; shares: number }>;
  getBillSubscribers?(id: number): Promise<string[]>;
}

/** Service for WebSocket operations - aligned with shared types */
interface IWebSocketService {
  /** Get aggregate WebSocket statistics */
  getStats(): WebSocketApiStats;
  
  /** Get system health status */
  getHealthStatus(): HealthStatus;
  
  /** Get list of user IDs subscribed to a specific bill */
  getBillSubscribers(billId: number): string[];
  
  /** Check if a user is currently connected */
  isUserConnected(userId: string): boolean;
  
  /** Get all bill IDs a user is subscribed to */
  getUserSubscriptions(userId: string): number[];
  
  /** Get detailed subscription info for a user */
  getUserSubscriptionDetails?(userId: string): UserSubscriptionInfo[];
  
  /** Get connection metrics for a specific user */
  getUserConnectionMetrics?(userId: string): ConnectionMetrics | null;
  
  /** Get active viewer count for a bill */
  getActiveBillViewers?(billId: number): number;
}

/** Rate limiter middleware */
interface IRateLimiter {
  (req: Request, res: Response, next: NextFunction): void;
}

/** Factory for creating rate limiters */
interface IRateLimiterFactory {
  createRateLimit(config: RateLimitConfig): IRateLimiter;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Valid subscription event types */
const VALID_SUBSCRIPTION_TYPES: readonly SubscriptionType[] = [
  'status_change',
  'engagement_change', 
  'amendment', 
  'voting_scheduled'
] as const;

/** Rate limiting configurations */
const RATE_LIMITS = {
  REAL_TIME: { windowMs: 60 * 1000, max: 30, message: 'Too many real-time requests' },
  SUBSCRIPTION: { windowMs: 60 * 1000, max: 10, message: 'Too many subscription requests' },
  STATUS: { windowMs: 60 * 1000, max: 60, message: 'Too many status requests' }
} as const;

/** Pagination constraints */
const PAGINATION = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0
} as const;

/** Activity threshold windows */
const ACTIVITY_THRESHOLD = {
  ACTIVE_24H: 24 * 60 * 60 * 1000,
  ACTIVE_1H: 60 * 60 * 1000,
  ACTIVE_15M: 15 * 60 * 1000
} as const;

/** Default subscription priority */
const DEFAULT_SUBSCRIPTION_PRIORITY: Priority = Priority.NORMAL;

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/** Result type for validation operations */
type ValidationResult<T> = 
  | { valid: true; value: T }
  | { valid: false; errors: ValidationError[] };

/**
 * Validates and parses a positive integer parameter
 */
function validatePositiveInteger(
  value: string | undefined,
  fieldName: string,
  required: boolean = true
): ValidationResult<number> {
  if (!value) {
    return required 
      ? { valid: false, errors: [{ field: fieldName, message: `${fieldName} is required` }] }
      : { valid: true, value: 0 };
  }

  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    return { 
      valid: false, 
      errors: [{ field: fieldName, message: `${fieldName} must be a valid positive integer` }]
    };
  }

  return { valid: true, value: parsed };
}

/**
 * Validates pagination parameters
 */
function validatePagination(
  limit?: string,
  offset?: string
): ValidationResult<PaginationParams> {
  const errors: ValidationError[] = [];

  const parsedLimit = parseInt(limit || PAGINATION.DEFAULT_LIMIT.toString(), 10);
  const parsedOffset = parseInt(offset || PAGINATION.DEFAULT_OFFSET.toString(), 10);

  if (isNaN(parsedLimit) || parsedLimit < PAGINATION.MIN_LIMIT || parsedLimit > PAGINATION.MAX_LIMIT) {
    errors.push({
      field: 'limit',
      message: `Limit must be between ${PAGINATION.MIN_LIMIT} and ${PAGINATION.MAX_LIMIT}`
    });
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    errors.push({
      field: 'offset',
      message: 'Offset must be a non-negative integer'
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { 
    valid: true, 
    value: { limit: parsedLimit, offset: parsedOffset }
  };
}

/**
 * Validates an array of bill IDs
 */
function validateBillIds(billIds: unknown, fieldName: string = 'bill_ids'): ValidationResult<number[]> {
  if (!Array.isArray(billIds)) {
    return {
      valid: false,
      errors: [{ field: fieldName, message: `${fieldName} must be an array` }]
    };
  }

  if (billIds.length === 0) {
    return {
      valid: false,
      errors: [{ field: fieldName, message: `${fieldName} cannot be empty` }]
    };
  }

  const invalidIds = billIds.filter(id => !Number.isInteger(id) || id <= 0);
  
  if (invalidIds.length > 0) {
    return {
      valid: false,
      errors: [{ 
        field: fieldName, 
        message: `All ${fieldName} must be positive integers. Invalid values: ${invalidIds.join(', ')}` 
      }]
    };
  }

  return { valid: true, value: billIds as number[] };
}

/**
 * Validates subscription types against shared schema
 */
function validateSubscriptionTypes(types: unknown): ValidationResult<SubscriptionType[]> {
  if (!Array.isArray(types)) {
    return {
      valid: false,
      errors: [{ field: 'subscriptionTypes', message: 'subscriptionTypes must be an array' }]
    };
  }

  const invalidTypes = types.filter(
    type => !VALID_SUBSCRIPTION_TYPES.includes(type as SubscriptionType)
  );

  if (invalidTypes.length > 0) {
    return {
      valid: false,
      errors: [{
        field: 'subscriptionTypes',
        message: `Invalid subscription types: ${invalidTypes.join(', ')}. Valid types: ${VALID_SUBSCRIPTION_TYPES.join(', ')}`
      }]
    };
  }

  return { valid: true, value: types as SubscriptionType[] };
}

/**
 * Validates priority level
 */
function validatePriority(priority: unknown): ValidationResult<Priority> {
  if (priority === undefined || priority === null) {
    return { valid: true, value: DEFAULT_SUBSCRIPTION_PRIORITY };
  }

  const validPriorities = Object.values(Priority).filter(v => typeof v === 'number') as Priority[];
  
  if (!validPriorities.includes(priority as Priority)) {
    return {
      valid: false,
      errors: [{
        field: 'priority',
        message: `Invalid priority. Valid values: ${validPriorities.join(', ')}`
      }]
    };
  }

  return { valid: true, value: priority as Priority };
}

/**
 * Validates WebSocket connection requirement
 */
function validateWebSocketConnection(
  webSocketService: IWebSocketService,
  userId: string
): ValidationResult<void> {
  if (!webSocketService.isUserConnected(userId)) {
    return {
      valid: false,
      errors: [{
        field: 'connection',
        message: 'Active WebSocket connection required. Please connect to /ws first.'
      }]
    };
  }

  return { valid: true, value: undefined };
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Centralized error handler for route operations
 */
function handleRouteError(
  res: Response, 
  error: unknown, 
  context: string, 
  userId?: string
): void {
  logger.error(`Real-time tracking error in ${context}:`, {
    component: 'RealTimeTrackingRouter',
    context,
    user_id: userId,
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });

  if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
    ApiNotFound(res, 'Resource', error.message);
    return;
  }

  ApiError(res, { 
    code: 'INTERNAL_ERROR', 
    message: `Failed to ${context}` 
  });
}

/**
 * Higher-order function that wraps async route handlers with error handling
 */
function asyncHandler<T extends AuthenticatedRequest = AuthenticatedRequest>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates whether a bill is currently active based on last update
 */
function isBillActive(updatedAt: Date, thresholdMs: number = ACTIVITY_THRESHOLD.ACTIVE_24H): boolean {
  return new Date(updatedAt).getTime() > Date.now() - thresholdMs;
}

/**
 * Creates pagination metadata
 */
function createPaginationMeta(
  params: PaginationParams,
  totalCount: number
): PaginationMeta {
  return {
    limit: params.limit,
    offset: params.offset,
    total: totalCount,
    hasMore: params.offset + params.limit < totalCount
  };
}

/**
 * Enriches bills with real-time data
 */
function enrichBillWithRealTimeData(
  bill: Bill,
  webSocketService: IWebSocketService
): BillWithRealTimeData {
  return {
    ...bill,
    realTimeData: {
      lastActivity: bill.updated_at,
      is_active: isBillActive(bill.updated_at),
      subscriberCount: webSocketService.getBillSubscribers(bill.id).length
    }
  };
}

/**
 * Creates activity metrics for a bill
 */
function createBillActivityMetrics(
  bill: Bill,
  webSocketService: IWebSocketService,
  includeActiveViewers: boolean = false
): BillActivityMetrics {
  const subscriberCount = webSocketService.getBillSubscribers(bill.id).length;
  const activeViewers = includeActiveViewers && webSocketService.getActiveBillViewers
    ? webSocketService.getActiveBillViewers(bill.id)
    : undefined;

  return {
    lastUpdate: bill.updated_at,
    is_active: isBillActive(bill.updated_at, ACTIVITY_THRESHOLD.ACTIVE_1H),
    recentViews: bill.views || 0,
    recentComments: bill.comments || 0,
    subscriberCount,
    activeViewers
  };
}

/**
 * Formats WebSocket stats for API response
 */
function formatWebSocketStats(stats: WebSocketApiStats): Record<string, unknown> {
  return {
    status: stats.connectionQuality === 'disconnected' ? 'degraded' : 'healthy',
    activeConnections: stats.activeConnections,
    connectedUsers: stats.uniqueUsers,
    totalSubscriptions: stats.totalSubscriptions,
    uptime: stats.uptime,
    messageSuccessRate: `${((stats.messagesSent / (stats.messagesSent + 1)) * 100).toFixed(2)}%`,
    performance: {
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      bytesSent: stats.bytesSent,
      bytesReceived: stats.bytesReceived,
      averageLatency: stats.averageLatency,
      connectionQuality: stats.connectionQuality
    }
  };
}

// ============================================================================
// ROUTER FACTORY (Dependency Injection Implementation)
// ============================================================================

interface RealTimeTrackingDependencies {
  billService: IBillService;
  webSocketService: IWebSocketService;
  rateLimiterFactory: IRateLimiterFactory;
}

/**
 * Factory function to create the real-time tracking router with injected dependencies.
 * This enables testing with mock services and better separation of concerns.
 * 
 * @param deps - Service dependencies for the router
 * @returns Configured Express router
 */
export function createRealTimeTrackingRouter(
  deps: RealTimeTrackingDependencies
): Router {
  const router = Router();
  const { billService, webSocketService, rateLimiterFactory } = deps;

  // Create rate limiters
  const realTimeRateLimit = rateLimiterFactory.createRateLimit(RATE_LIMITS.REAL_TIME);
  const subscriptionRateLimit = rateLimiterFactory.createRateLimit(RATE_LIMITS.SUBSCRIPTION);
  const statusRateLimit = rateLimiterFactory.createRateLimit(RATE_LIMITS.STATUS);

  // ============================================================================
  // ROUTE HANDLERS
  // ============================================================================

  /**
   * GET /api/real-time/bills
   * Retrieves bills with real-time activity data and optional WebSocket statistics
   * 
   * Query params:
   * - limit: Number of bills to return (1-100, default: 50)
   * - offset: Pagination offset (default: 0)
   * - status: Filter by bill status (optional)
   * - includeWebSocket: Include WebSocket stats (default: false)
   * - activeOnly: Only return bills with recent activity (default: false)
   */
  router.get('/bills', realTimeRateLimit, asyncHandler(async (req, res) => {
    const { 
      limit, 
      offset, 
      status, 
      includeWebSocket = 'false',
      activeOnly = 'false'
    } = req.query;

    // Validate pagination
    const paginationResult = validatePagination(limit as string, offset as string);
    if (!paginationResult.valid) {
      ApiValidationError(res, paginationResult.errors);
      return;
    }

    const { limit: validLimit, offset: validOffset } = paginationResult.value;

    try {
      // Fetch and filter bills
      let bills = await billService.getBills();
      
      // Filter by status if provided
      if (status && typeof status === 'string') {
        bills = bills.filter(bill => bill.status === status);
      }

      // Filter by activity if requested
      if (activeOnly === 'true') {
        bills = bills.filter(bill => isBillActive(bill.updated_at, ACTIVITY_THRESHOLD.ACTIVE_24H));
      }

      // Apply pagination
      const paginatedBills = bills.slice(validOffset, validOffset + validLimit);

      // Enrich with real-time data
      const billsWithRealTimeData = paginatedBills.map(bill => 
        enrichBillWithRealTimeData(bill, webSocketService)
      );

      // Get WebSocket statistics if requested
      const webSocketInfo = includeWebSocket === 'true' 
        ? {
            connectedUsers: webSocketService.getStats().uniqueUsers,
            activeConnections: webSocketService.getStats().activeConnections,
            totalSubscriptions: webSocketService.getStats().totalSubscriptions,
            connectionQuality: webSocketService.getStats().connectionQuality
          }
        : undefined;

      ApiSuccess(res, {
        bills: billsWithRealTimeData,
        pagination: createPaginationMeta(
          { limit: validLimit, offset: validOffset },
          bills.length
        ),
        webSocketInfo,
        timestamp: new Date().toISOString(),
        message: billsWithRealTimeData.length === 0 
          ? 'No bills found matching criteria' 
          : undefined
      });
    } catch (error) {
      handleRouteError(res, error, 'fetch real-time bills');
    }
  }));

  /**
   * GET /api/real-time/bills/:id
   * Retrieves real-time data for a specific bill
   * 
   * Query params:
   * - includeSubscribers: Include list of subscriber IDs (default: false)
   * - includeActivity: Include activity metrics (default: true)
   * - includeViewers: Include active viewer count (default: false)
   */
  router.get('/bills/:id', realTimeRateLimit, asyncHandler(async (req, res) => {
    const idValidation = validatePositiveInteger(req.params.id, 'id');
    if (!idValidation.valid) {
      ApiValidationError(res, idValidation.errors);
      return;
    }

    const { 
      includeSubscribers = 'false', 
      includeActivity = 'true',
      includeViewers = 'false'
    } = req.query;

    try {
      const bill = await billService.getBill(idValidation.value);
      const billSubscribers = webSocketService.getBillSubscribers(bill.id);
      const subscriberCount = billSubscribers.length;

      const activityData = includeActivity === 'true'
        ? createBillActivityMetrics(bill, webSocketService, includeViewers === 'true')
        : undefined;

      ApiSuccess(res, {
        bill: {
          ...bill,
          realTimeData: {
            subscribers: includeSubscribers === 'true' ? billSubscribers : undefined,
            subscriberCount,
            activity: activityData,
            webSocketChannel: `bill-${bill.id}`,
            connectionQuality: webSocketService.getHealthStatus().quality?.level
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        ApiNotFound(res, 'Bill', `Bill with ID ${idValidation.value} not found`);
        return;
      }
      handleRouteError(res, error, 'fetch real-time bill data');
    }
  }));

  /**
   * POST /api/real-time/subscribe
   * Subscribes authenticated user to real-time updates for specified bills
   * 
   * Body:
   * - bill_ids: Array of bill IDs to subscribe to (required)
   * - subscriptionTypes: Array of event types to subscribe to (optional)
   * - priority: Subscription priority level (0-3, default: 1)
   */
  router.post(
    '/subscribe', 
    authenticateToken, 
    subscriptionRateLimit, 
    asyncHandler(async (req, res) => {
      const { 
        bill_ids, 
        subscriptionTypes = VALID_SUBSCRIPTION_TYPES,
        priority 
      } = req.body;

      // Validate inputs
      const billIdsValidation = validateBillIds(bill_ids);
      if (!billIdsValidation.valid) {
        ApiValidationError(res, billIdsValidation.errors);
        return;
      }

      const typesValidation = validateSubscriptionTypes(subscriptionTypes);
      if (!typesValidation.valid) {
        ApiValidationError(res, typesValidation.errors);
        return;
      }

      const priorityValidation = validatePriority(priority);
      if (!priorityValidation.valid) {
        ApiValidationError(res, priorityValidation.errors);
        return;
      }

      const userId = req.user!.id.toString();

      // Validate WebSocket connection
      const connectionValidation = validateWebSocketConnection(webSocketService, userId);
      if (!connectionValidation.valid) {
        ApiValidationError(res, connectionValidation.errors);
        return;
      }

      try {
        const currentSubscriptions = webSocketService.getUserSubscriptions(userId);
        const newSubscriptions = billIdsValidation.value.filter(
          id => !currentSubscriptions.includes(id)
        );
        const alreadySubscribed = billIdsValidation.value.filter(
          id => currentSubscriptions.includes(id)
        );

        logger.info('Real-time subscription request', {
          component: 'RealTimeTrackingRouter',
          user_id: req.user!.id,
          bill_ids: newSubscriptions,
          subscriptionTypes: typesValidation.value,
          priority: priorityValidation.value
        });

        ApiSuccess(res, {
          subscribed: newSubscriptions,
          alreadySubscribed,
          subscriptionTypes: typesValidation.value,
          priority: priorityValidation.value,
          message: newSubscriptions.length > 0
            ? `Successfully subscribed to ${newSubscriptions.length} bill(s)`
            : 'Already subscribed to all specified bills',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleRouteError(res, error, 'subscribe to real-time updates', userId);
      }
    })
  );

  /**
   * DELETE /api/real-time/unsubscribe
   * Unsubscribes authenticated user from real-time updates
   * 
   * Body:
   * - bill_ids: Array of bill IDs to unsubscribe from (optional, defaults to all)
   */
  router.delete(
    '/unsubscribe', 
    authenticateToken, 
    subscriptionRateLimit, 
    asyncHandler(async (req, res) => {
      const userId = req.user!.id.toString();
      const { bill_ids } = req.body;

      // Validate WebSocket connection
      const connectionValidation = validateWebSocketConnection(webSocketService, userId);
      if (!connectionValidation.valid) {
        ApiValidationError(res, connectionValidation.errors);
        return;
      }

      // If no bill_ids provided, unsubscribe from all
      const currentSubscriptions = webSocketService.getUserSubscriptions(userId);
      const targetBillIds = bill_ids || currentSubscriptions;

      // Validate bill IDs if provided
      if (bill_ids) {
        const billIdsValidation = validateBillIds(targetBillIds);
        if (!billIdsValidation.valid) {
          ApiValidationError(res, billIdsValidation.errors);
          return;
        }
      }

      try {
        const subscriptionsToRemove = Array.isArray(targetBillIds)
          ? targetBillIds.filter(id => currentSubscriptions.includes(id))
          : [];
        
        const notSubscribed = Array.isArray(targetBillIds)
          ? targetBillIds.filter(id => !currentSubscriptions.includes(id))
          : [];

        logger.info('Real-time unsubscription request', {
          component: 'RealTimeTrackingRouter',
          user_id: req.user!.id,
          bill_ids: subscriptionsToRemove
        });

        ApiSuccess(res, {
          unsubscribed: subscriptionsToRemove,
          notSubscribed,
          message: subscriptionsToRemove.length > 0
            ? `Successfully unsubscribed from ${subscriptionsToRemove.length} bill(s)`
            : 'No active subscriptions to remove',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleRouteError(res, error, 'unsubscribe from real-time updates', userId);
      }
    })
  );

  /**
   * GET /api/real-time/subscriptions
   * Retrieves authenticated user's active subscriptions
   */
  router.get(
    '/subscriptions',
    authenticateToken,
    realTimeRateLimit,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id.toString();

      // Validate WebSocket connection
      const connectionValidation = validateWebSocketConnection(webSocketService, userId);
      if (!connectionValidation.valid) {
        ApiValidationError(res, connectionValidation.errors);
        return;
      }

      try {
        const subscriptions = webSocketService.getUserSubscriptions(userId);
        const subscriptionDetails = webSocketService.getUserSubscriptionDetails
          ? webSocketService.getUserSubscriptionDetails(userId)
          : subscriptions.map(billId => ({
              billId: billId as BillId,
              types: [...VALID_SUBSCRIPTION_TYPES],
              priority: DEFAULT_SUBSCRIPTION_PRIORITY,
              subscribedAt: Date.now()
            }));

        ApiSuccess(res, {
          subscriptions: subscriptionDetails,
          totalCount: subscriptions.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleRouteError(res, error, 'fetch user subscriptions', userId);
      }
    })
  );

  /**
   * GET /api/real-time/status
   * Retrieves real-time system status and WebSocket connection information
   */
  router.get('/status', statusRateLimit, asyncHandler(async (req, res) => {
    try {
      const wsStats = webSocketService.getStats();
      const healthStatus = webSocketService.getHealthStatus();

      ApiSuccess(res, {
        webSocket: formatWebSocketStats(wsStats),
        health: {
          isHealthy: healthStatus.isHealthy,
          connectionState: healthStatus.connectionState,
          connectionQuality: healthStatus.quality
        },
        timestamp: new Date().toISOString(),
        serverTime: new Date().toISOString()
      });
    } catch (error) {
      handleRouteError(res, error, 'fetch real-time status');
    }
  }));

  /**
   * GET /api/real-time/connection
   * Retrieves authenticated user's WebSocket connection information
   */
  router.get(
    '/connection',
    authenticateToken,
    realTimeRateLimit,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id.toString();

      try {
        const isConnected = webSocketService.isUserConnected(userId);
        const metrics = webSocketService.getUserConnectionMetrics
          ? webSocketService.getUserConnectionMetrics(userId)
          : null;

        ApiSuccess(res, {
          connected: isConnected,
          metrics,
          userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        handleRouteError(res, error, 'fetch connection info', userId);
      }
    })
  );

  /**
   * Global error handler for this router
   */
  router.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    handleRouteError(
      res, 
      err, 
      'handle real-time request', 
      (req as AuthenticatedRequest).user?.id?.toString()
    );
  });

  return router;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  Bill,
  BillWithRealTimeData,
  BillActivityMetrics,
  SubscriptionType,
  UserSubscriptionInfo,
  ValidationError,
  PaginationParams,
  PaginationMeta,
  IBillService,
  IWebSocketService,
  IRateLimiter,
  IRateLimiterFactory,
  RealTimeTrackingDependencies,
  WebSocketApiStats,
  HealthStatus
};

// Re-export shared types for convenience
export type {
  BillUpdate,
  NotificationData,
  Priority,
  ConnectionState,
  ConnectionQuality,
  ConnectionMetrics
} from '@server/infrastructure/schema/websocket';