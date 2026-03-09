import { NextFunction, Request, Response, Router } from 'express';

import type { AuthenticatedRequest } from '@server/middleware/auth';
import { authenticateToken } from '@server/middleware/auth';
import { logger } from '@server/infrastructure/observability';
import type {
  BillUpdate,
  ConnectionMetrics,
  ConnectionQuality,
  ConnectionState,
} from '@server/infrastructure/schema/websocket';
import { Priority } from '@server/infrastructure/schema/websocket';

// ─── Domain types ─────────────────────────────────────────────────────────────

/** Branded type for bill IDs to prevent mixing with other numeric IDs */
type BillId = number & { readonly __brand: 'BillId' };

/** Valid subscription event types — aligned with BillUpdate */
type SubscriptionType = BillUpdate['updateType'];

interface Bill {
  id: number;
  title: string;
  status: string;
  updated_at: Date;
  views: number;
  comments: number;
  shares?: number;
}

interface BillWithRealTimeData extends Bill {
  realTimeData: {
    lastActivity: Date;
    is_active: boolean;
    subscriberCount: number;
  };
}

interface WebSocketStats {
  uniqueUsers: number;
  totalSubscriptions: number;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  averageLatency: number;
  connectionQuality: ConnectionQuality['level'];
}

interface HealthStatus {
  isHealthy: boolean;
  connectionState?: ConnectionState;
  quality?: ConnectionQuality;
}

interface ValidationError {
  field: string;
  message: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

interface PaginationParams {
  limit: number;
  offset: number;
}

interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

interface UserSubscriptionInfo {
  billId: BillId;
  types: SubscriptionType[];
  priority: Priority;
  subscribedAt: number;
}

interface BillActivityMetrics {
  lastUpdate: Date;
  is_active: boolean;
  recentViews: number;
  recentComments: number;
  subscriberCount: number;
  activeViewers?: number;
}

// ─── Service interfaces (DI contracts) ───────────────────────────────────────

interface IBillService {
  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill>;
  incrementBillViews(id: number): Promise<{ id: number; views: number }>;
  incrementBillShares(id: number): Promise<{ id: number; shares: number }>;
  getBillSubscribers?(id: number): Promise<string[]>;
}

interface IWebSocketService {
  getStats(): WebSocketStats;
  getHealthStatus(): HealthStatus;
  getBillSubscribers(billId: number): string[];
  isUserConnected(userId: string): boolean;
  getUserSubscriptions(userId: string): number[];
  getUserSubscriptionDetails?(userId: string): UserSubscriptionInfo[];
  getUserConnectionMetrics?(userId: string): ConnectionMetrics | null;
  getActiveBillViewers?(billId: number): number;
}

interface IRateLimiter {
  (req: Request, res: Response, next: NextFunction): void;
}

interface IRateLimiterFactory {
  createRateLimit(config: RateLimitConfig): IRateLimiter;
}

export interface RealTimeTrackingDependencies {
  billService: IBillService;
  webSocketService: IWebSocketService;
  rateLimiterFactory: IRateLimiterFactory;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_SUBSCRIPTION_TYPES: readonly SubscriptionType[] = [
  'status_change',
  'engagement_change',
  'amendment',
  'voting_scheduled',
] as const;

const RATE_LIMITS = {
  REAL_TIME:    { windowMs: 60_000, max: 30, message: 'Too many real-time requests' },
  SUBSCRIPTION: { windowMs: 60_000, max: 10, message: 'Too many subscription requests' },
  STATUS:       { windowMs: 60_000, max: 60, message: 'Too many status requests' },
} as const;

const PAGINATION = {
  MIN_LIMIT:      1,
  MAX_LIMIT:      100,
  DEFAULT_LIMIT:  50,
  DEFAULT_OFFSET: 0,
} as const;

const ACTIVITY_THRESHOLD = {
  ACTIVE_24H: 24 * 60 * 60 * 1000,
  ACTIVE_1H:       60 * 60 * 1000,
  ACTIVE_15M:      15 * 60 * 1000,
} as const;

const DEFAULT_SUBSCRIPTION_PRIORITY = Priority.NORMAL;

// ─── Response helpers ─────────────────────────────────────────────────────────
// Inline helpers used while @shared/types/api does not export standalone
// response functions. Replace with the shared equivalents once available.

function sendSuccess(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data });
}

function sendNotFound(res: Response, resource: string, message: string): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `${resource}: ${message}` } });
}

function sendValidationError(res: Response, errors: ValidationError[]): void {
  res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', errors } });
}

function sendInternalError(res: Response, context: string): void {
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: `Failed to ${context}` } });
}

// ─── Validation utilities ─────────────────────────────────────────────────────

type ValidationResult<T> =
  | { valid: true;  value: T }
  | { valid: false; errors: ValidationError[] };

function validatePositiveInteger(
  value: string | undefined,
  fieldName: string,
  required = true,
): ValidationResult<number> {
  if (!value) {
    return required
      ? { valid: false, errors: [{ field: fieldName, message: `${fieldName} is required` }] }
      : { valid: true, value: 0 };
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, errors: [{ field: fieldName, message: `${fieldName} must be a valid positive integer` }] };
  }
  return { valid: true, value: parsed };
}

function validatePagination(
  limit?: string,
  offset?: string,
): ValidationResult<PaginationParams> {
  const errors: ValidationError[] = [];
  const parsedLimit  = parseInt(limit  ?? String(PAGINATION.DEFAULT_LIMIT),  10);
  const parsedOffset = parseInt(offset ?? String(PAGINATION.DEFAULT_OFFSET), 10);

  if (isNaN(parsedLimit) || parsedLimit < PAGINATION.MIN_LIMIT || parsedLimit > PAGINATION.MAX_LIMIT) {
    errors.push({ field: 'limit', message: `Limit must be between ${PAGINATION.MIN_LIMIT} and ${PAGINATION.MAX_LIMIT}` });
  }
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    errors.push({ field: 'offset', message: 'Offset must be a non-negative integer' });
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true, value: { limit: parsedLimit, offset: parsedOffset } };
}

function validateBillIds(
  billIds: unknown,
  fieldName = 'bill_ids',
): ValidationResult<number[]> {
  if (!Array.isArray(billIds)) {
    return { valid: false, errors: [{ field: fieldName, message: `${fieldName} must be an array` }] };
  }
  if (billIds.length === 0) {
    return { valid: false, errors: [{ field: fieldName, message: `${fieldName} cannot be empty` }] };
  }
  const invalid = billIds.filter((id) => !Number.isInteger(id) || id <= 0);
  if (invalid.length > 0) {
    return {
      valid: false,
      errors: [{ field: fieldName, message: `All ${fieldName} must be positive integers. Invalid values: ${invalid.join(', ')}` }],
    };
  }
  return { valid: true, value: billIds as number[] };
}

function validateSubscriptionTypes(types: unknown): ValidationResult<SubscriptionType[]> {
  if (!Array.isArray(types)) {
    return { valid: false, errors: [{ field: 'subscriptionTypes', message: 'subscriptionTypes must be an array' }] };
  }
  const invalid = types.filter((t) => !VALID_SUBSCRIPTION_TYPES.includes(t as SubscriptionType));
  if (invalid.length > 0) {
    return {
      valid: false,
      errors: [{
        field: 'subscriptionTypes',
        message: `Invalid subscription types: ${invalid.join(', ')}. Valid: ${VALID_SUBSCRIPTION_TYPES.join(', ')}`,
      }],
    };
  }
  return { valid: true, value: types as SubscriptionType[] };
}

function validatePriority(priority: unknown): ValidationResult<Priority> {
  if (priority === undefined || priority === null) {
    return { valid: true, value: DEFAULT_SUBSCRIPTION_PRIORITY };
  }
  const valid = Object.values(Priority).filter((v) => typeof v === 'number') as Priority[];
  if (!valid.includes(priority as Priority)) {
    return { valid: false, errors: [{ field: 'priority', message: `Invalid priority. Valid values: ${valid.join(', ')}` }] };
  }
  return { valid: true, value: priority as Priority };
}

function validateWebSocketConnection(
  webSocketService: IWebSocketService,
  userId: string,
): ValidationResult<void> {
  if (!webSocketService.isUserConnected(userId)) {
    return {
      valid: false,
      errors: [{ field: 'connection', message: 'Active WebSocket connection required. Please connect to /ws first.' }],
    };
  }
  return { valid: true, value: undefined };
}

// ─── Error handling ───────────────────────────────────────────────────────────

function handleRouteError(
  res: Response,
  error: unknown,
  context: string,
  userId?: string,
): void {
  logger.error(
    {
      component: 'RealTimeTrackingRouter',
      context,
      userId,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    },
    `Real-time tracking error in ${context}`,
  );

  if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
    sendNotFound(res, 'Resource', error.message);
    return;
  }
  sendInternalError(res, context);
}

/**
 * Wraps an async route handler so unhandled rejections are forwarded to
 * Express's error middleware instead of crashing the process.
 */
function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

function isBillActive(updatedAt: Date, thresholdMs = ACTIVITY_THRESHOLD.ACTIVE_24H): boolean {
  return new Date(updatedAt).getTime() > Date.now() - thresholdMs;
}

function createPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  return { ...params, total, hasMore: params.offset + params.limit < total };
}

function enrichBillWithRealTimeData(
  bill: Bill,
  webSocketService: IWebSocketService,
): BillWithRealTimeData {
  return {
    ...bill,
    realTimeData: {
      lastActivity: bill.updated_at,
      is_active: isBillActive(bill.updated_at),
      subscriberCount: webSocketService.getBillSubscribers(bill.id).length,
    },
  };
}

function createBillActivityMetrics(
  bill: Bill,
  webSocketService: IWebSocketService,
  includeActiveViewers = false,
): BillActivityMetrics {
  return {
    lastUpdate: bill.updated_at,
    is_active: isBillActive(bill.updated_at, ACTIVITY_THRESHOLD.ACTIVE_1H),
    recentViews: bill.views ?? 0,
    recentComments: bill.comments ?? 0,
    subscriberCount: webSocketService.getBillSubscribers(bill.id).length,
    activeViewers:
      includeActiveViewers && webSocketService.getActiveBillViewers
        ? webSocketService.getActiveBillViewers(bill.id)
        : undefined,
  };
}

function formatWebSocketStats(stats: WebSocketStats): Record<string, unknown> {
  const totalMessages = stats.messagesSent + stats.messagesReceived;
  return {
    status: stats.connectionQuality === 'disconnected' ? 'degraded' : 'healthy',
    connectedUsers: stats.uniqueUsers,
    totalSubscriptions: stats.totalSubscriptions,
    uptime: stats.uptime,
    messageSuccessRate: totalMessages > 0
      ? `${((stats.messagesSent / totalMessages) * 100).toFixed(2)}%`
      : '0.00%',
    performance: {
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      bytesSent: stats.bytesSent,
      bytesReceived: stats.bytesReceived,
      averageLatency: stats.averageLatency,
      connectionQuality: stats.connectionQuality,
    },
  };
}

// ─── Router factory ───────────────────────────────────────────────────────────

/**
 * Factory function to create the real-time tracking router with injected
 * dependencies, enabling clean unit testing with mock services.
 */
export function createRealTimeTrackingRouter(
  deps: RealTimeTrackingDependencies,
): Router {
  const router = Router();
  const { billService, webSocketService, rateLimiterFactory } = deps;

  const realTimeRateLimit    = rateLimiterFactory.createRateLimit(RATE_LIMITS.REAL_TIME);
  const subscriptionRateLimit = rateLimiterFactory.createRateLimit(RATE_LIMITS.SUBSCRIPTION);
  const statusRateLimit       = rateLimiterFactory.createRateLimit(RATE_LIMITS.STATUS);

  // ── GET /bills ─────────────────────────────────────────────────────────────
  // Returns paginated bills enriched with real-time activity data.
  //
  // Query params:
  //   limit           – results per page (1–100, default 50)
  //   offset          – pagination offset (default 0)
  //   status          – filter by bill status (optional)
  //   includeWebSocket – include aggregate WS stats (default false)
  //   activeOnly      – only bills with recent activity (default false)

  router.get(
    '/bills',
    realTimeRateLimit,
    asyncHandler(async (req, res) => {
      const { limit, offset, status, includeWebSocket = 'false', activeOnly = 'false' } = req.query;

      const paginationResult = validatePagination(limit as string, offset as string);
      if (!paginationResult.valid) { sendValidationError(res, paginationResult.errors); return; }

      const { limit: validLimit, offset: validOffset } = paginationResult.value;

      try {
        let bills = await billService.getBills();

        if (status && typeof status === 'string') {
          bills = bills.filter((b) => b.status === status);
        }
        if (activeOnly === 'true') {
          bills = bills.filter((b) => isBillActive(b.updated_at, ACTIVITY_THRESHOLD.ACTIVE_24H));
        }

        const page = bills.slice(validOffset, validOffset + validLimit);
        const enriched = page.map((b) => enrichBillWithRealTimeData(b, webSocketService));

        const wsStats = webSocketService.getStats();
        const webSocketInfo = includeWebSocket === 'true'
          ? {
              connectedUsers:   wsStats.uniqueUsers,
              totalSubscriptions: wsStats.totalSubscriptions,
              connectionQuality: wsStats.connectionQuality,
            }
          : undefined;

        sendSuccess(res, {
          bills: enriched,
          pagination: createPaginationMeta({ limit: validLimit, offset: validOffset }, bills.length),
          webSocketInfo,
          timestamp: new Date().toISOString(),
          message: enriched.length === 0 ? 'No bills found matching criteria' : undefined,
        });
      } catch (error) {
        handleRouteError(res, error, 'fetch real-time bills');
      }
    }),
  );

  // ── GET /bills/:id ─────────────────────────────────────────────────────────
  // Returns real-time data for a single bill.
  //
  // Query params:
  //   includeSubscribers – include subscriber ID list (default false)
  //   includeActivity    – include activity metrics (default true)
  //   includeViewers     – include active viewer count (default false)

  router.get(
    '/bills/:id',
    realTimeRateLimit,
    asyncHandler(async (req, res) => {
      const idResult = validatePositiveInteger(req.params.id, 'id');
      if (!idResult.valid) { sendValidationError(res, idResult.errors); return; }

      const {
        includeSubscribers = 'false',
        includeActivity = 'true',
        includeViewers = 'false',
      } = req.query;

      try {
        const bill = await billService.getBill(idResult.value);
        const subscribers = webSocketService.getBillSubscribers(bill.id);

        sendSuccess(res, {
          bill: {
            ...bill,
            realTimeData: {
              subscribers: includeSubscribers === 'true' ? subscribers : undefined,
              subscriberCount: subscribers.length,
              activity: includeActivity === 'true'
                ? createBillActivityMetrics(bill, webSocketService, includeViewers === 'true')
                : undefined,
              webSocketChannel: `bill-${bill.id}`,
              connectionQuality: webSocketService.getHealthStatus().quality?.level,
            },
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
          sendNotFound(res, 'Bill', `Bill with ID ${idResult.value} not found`);
          return;
        }
        handleRouteError(res, error, 'fetch real-time bill data');
      }
    }),
  );

  // ── POST /subscribe ────────────────────────────────────────────────────────
  // Subscribes the authenticated user to real-time updates for specified bills.
  //
  // Body:
  //   bill_ids           – bill IDs to subscribe to (required)
  //   subscriptionTypes  – event types (optional, defaults to all)
  //   priority           – subscription priority 0–3 (optional, default NORMAL)

  router.post(
    '/subscribe',
    authenticateToken,
    subscriptionRateLimit,
    asyncHandler(async (req, res) => {
      const { bill_ids, subscriptionTypes = VALID_SUBSCRIPTION_TYPES, priority } = req.body;

      const billIdsResult = validateBillIds(bill_ids);
      if (!billIdsResult.valid)  { sendValidationError(res, billIdsResult.errors);  return; }

      const typesResult = validateSubscriptionTypes(subscriptionTypes);
      if (!typesResult.valid)    { sendValidationError(res, typesResult.errors);    return; }

      const priorityResult = validatePriority(priority);
      if (!priorityResult.valid) { sendValidationError(res, priorityResult.errors); return; }

      const userId = String(req.user!.id);

      const connResult = validateWebSocketConnection(webSocketService, userId);
      if (!connResult.valid) { sendValidationError(res, connResult.errors); return; }

      try {
        const current = webSocketService.getUserSubscriptions(userId);
        const toAdd   = billIdsResult.value.filter((id) => !current.includes(id));
        const already = billIdsResult.value.filter((id) =>  current.includes(id));

        logger.info(
          { component: 'RealTimeTrackingRouter', userId, bill_ids: toAdd, subscriptionTypes: typesResult.value, priority: priorityResult.value },
          'Real-time subscription request',
        );

        sendSuccess(res, {
          subscribed: toAdd,
          alreadySubscribed: already,
          subscriptionTypes: typesResult.value,
          priority: priorityResult.value,
          message: toAdd.length > 0
            ? `Successfully subscribed to ${toAdd.length} bill(s)`
            : 'Already subscribed to all specified bills',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleRouteError(res, error, 'subscribe to real-time updates', userId);
      }
    }),
  );

  // ── DELETE /unsubscribe ────────────────────────────────────────────────────
  // Unsubscribes the authenticated user from real-time updates.
  //
  // Body:
  //   bill_ids – IDs to unsubscribe from (optional, defaults to all)

  router.delete(
    '/unsubscribe',
    authenticateToken,
    subscriptionRateLimit,
    asyncHandler(async (req, res) => {
      const userId = String(req.user!.id);

      const connResult = validateWebSocketConnection(webSocketService, userId);
      if (!connResult.valid) { sendValidationError(res, connResult.errors); return; }

      const { bill_ids } = req.body;
      const current = webSocketService.getUserSubscriptions(userId);
      const target: unknown = bill_ids ?? current;

      if (bill_ids) {
        const billIdsResult = validateBillIds(target);
        if (!billIdsResult.valid) { sendValidationError(res, billIdsResult.errors); return; }
      }

      try {
        const targetIds = Array.isArray(target) ? (target as number[]) : [];
        const toRemove  = targetIds.filter((id) =>  current.includes(id));
        const missing   = targetIds.filter((id) => !current.includes(id));

        logger.info(
          { component: 'RealTimeTrackingRouter', userId, bill_ids: toRemove },
          'Real-time unsubscription request',
        );

        sendSuccess(res, {
          unsubscribed: toRemove,
          notSubscribed: missing,
          message: toRemove.length > 0
            ? `Successfully unsubscribed from ${toRemove.length} bill(s)`
            : 'No active subscriptions to remove',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleRouteError(res, error, 'unsubscribe from real-time updates', userId);
      }
    }),
  );

  // ── GET /subscriptions ─────────────────────────────────────────────────────
  // Returns the authenticated user's active subscriptions.

  router.get(
    '/subscriptions',
    authenticateToken,
    realTimeRateLimit,
    asyncHandler(async (req, res) => {
      const userId = String(req.user!.id);

      const connResult = validateWebSocketConnection(webSocketService, userId);
      if (!connResult.valid) { sendValidationError(res, connResult.errors); return; }

      try {
        const subscriptionIds = webSocketService.getUserSubscriptions(userId);
        const details: UserSubscriptionInfo[] = webSocketService.getUserSubscriptionDetails
          ? webSocketService.getUserSubscriptionDetails(userId)
          : subscriptionIds.map((billId) => ({
              billId: billId as BillId,
              types: [...VALID_SUBSCRIPTION_TYPES],
              priority: DEFAULT_SUBSCRIPTION_PRIORITY,
              subscribedAt: Date.now(),
            }));

        sendSuccess(res, {
          subscriptions: details,
          totalCount: subscriptionIds.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleRouteError(res, error, 'fetch user subscriptions', userId);
      }
    }),
  );

  // ── GET /status ────────────────────────────────────────────────────────────
  // Returns aggregate WebSocket system status (public, no auth required).

  router.get(
    '/status',
    statusRateLimit,
    asyncHandler(async (_req, res) => {
      try {
        const stats  = webSocketService.getStats();
        const health = webSocketService.getHealthStatus();

        sendSuccess(res, {
          webSocket: formatWebSocketStats(stats),
          health: {
            isHealthy:        health.isHealthy,
            connectionState:  health.connectionState,
            connectionQuality: health.quality,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleRouteError(res, error, 'fetch real-time status');
      }
    }),
  );

  // ── GET /connection ────────────────────────────────────────────────────────
  // Returns the authenticated user's WebSocket connection details.

  router.get(
    '/connection',
    authenticateToken,
    realTimeRateLimit,
    asyncHandler(async (req, res) => {
      const userId = String(req.user!.id);

      try {
        const isConnected = webSocketService.isUserConnected(userId);
        const metrics = webSocketService.getUserConnectionMetrics
          ? webSocketService.getUserConnectionMetrics(userId)
          : null;

        sendSuccess(res, {
          connected: isConnected,
          metrics,
          userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleRouteError(res, error, 'fetch connection info', userId);
      }
    }),
  );

  // ── Global error handler ───────────────────────────────────────────────────

  router.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    handleRouteError(
      res,
      err,
      'handle real-time request',
      (req as AuthenticatedRequest).user?.id
        ? String((req as AuthenticatedRequest).user!.id)
        : undefined,
    );
  });

  return router;
}

// ─── Type exports ─────────────────────────────────────────────────────────────

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
  WebSocketStats,
  HealthStatus,
};

export type { BillUpdate, ConnectionMetrics, ConnectionQuality, ConnectionState } from '@server/infrastructure/schema/websocket';