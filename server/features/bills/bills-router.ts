import { Router, Request, Response, NextFunction } from 'express';
import { billsService, BillNotFoundError, CommentNotFoundError, ValidationError } from './bills.js';
import { authenticateToken } from '../../middleware/auth.js';
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger';
import { securityAuditService } from '../../features/security/security-audit-service.js';

const router = Router();

/**
 * Utility function to parse and validate integer parameters from route params
 * This reduces code duplication and provides consistent validation across all endpoints
 */
function parseIntParam(value: string, paramName: string): { valid: true; value: number } | { valid: false; error: string } {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: `${paramName} must be a valid positive number` };
  }
  return { valid: true, value: parsed };
}

/**
 * Centralized error handler that maps domain errors to appropriate HTTP responses
 * This approach keeps our route handlers clean and maintains consistent error responses
 */
function handleRouteError(res: Response, error: unknown, context: string, userId?: number): Response {
  // Log the error with full context for debugging and monitoring
  logger.error(`Error in ${context}:`, { 
    component: 'BillsRouter',
    context,
    userId,
    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
  }, error);

  // Map domain-specific errors to appropriate HTTP responses
  if (error instanceof BillNotFoundError || error instanceof CommentNotFoundError) {
    return ApiNotFound(res, error.message);
  }
  
  if (error instanceof ValidationError) {
    return ApiValidationError(res, error.message);
  }

  // Generic fallback for unexpected errors
  return ApiError(res, `Failed to ${context.toLowerCase()}`, 500);
}

/**
 * Higher-order function that wraps async route handlers with error handling
 * This eliminates the need for try-catch blocks in every route handler
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/bills
 * Retrieve all bills with optional filtering by tags
 * 
 * Query Parameters:
 *   - tags: comma-separated string or array of tag names
 *   - limit: maximum number of results (optional)
 *   - offset: pagination offset (optional)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { tags, limit, offset } = req.query;
  
  // Parse pagination parameters with sensible defaults
  const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
  const parsedOffset = offset ? parseInt(offset as string, 10) : undefined;

  // Validate pagination parameters if provided
  if (parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100)) {
    return ApiValidationError(res, 'Limit must be a positive number between 1 and 100');
  }

  if (parsedOffset !== undefined && (isNaN(parsedOffset) || parsedOffset < 0)) {
    return ApiValidationError(res, 'Offset must be a non-negative number');
  }
  
  let bills;
  if (tags) {
    // Normalize tags input to always work with an array, handling both formats gracefully
    const tagArray = Array.isArray(tags) 
      ? tags.filter(tag => typeof tag === 'string' && tag.trim()) as string[]
      : (tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
    
    if (tagArray.length === 0) {
      return ApiValidationError(res, 'At least one valid tag must be provided');
    }
    
    bills = await billsService.getBillsByTags(tagArray, parsedLimit, parsedOffset);
  } else {
    bills = await billsService.getBills(parsedLimit, parsedOffset);
  }

  // Log data access for bill listing
  await securityAuditService.logDataAccess(
    'bills:list',
    'read',
    req,
    (req as any).user?.id,
    bills.length,
    true
  );

  return ApiSuccess(res, {
    bills,
    count: bills.length,
    hasMore: parsedLimit ? bills.length === parsedLimit : false,
    pagination: parsedLimit ? {
      limit: parsedLimit,
      offset: parsedOffset || 0,
      next: parsedLimit && bills.length === parsedLimit ? (parsedOffset || 0) + parsedLimit : null
    } : undefined,
    message: bills.length === 0 ? 'No bills found matching criteria' : undefined
  });
}));

/**
 * GET /api/bills/:id
 * Retrieve a specific bill by ID and increment its view count
 * 
 * The view count is incremented asynchronously to minimize response latency
 * View count failures are logged but don't affect the primary response
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Bill ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  const bill = await billsService.getBill(idResult.value);

  // Log data access
  await securityAuditService.logDataAccess(
    `bill:${idResult.value}`,
    'read',
    req,
    (req as any).user?.id,
    1,
    true
  );

  // Fire-and-forget pattern for view count: improves performance without sacrificing reliability
  // If the increment fails, we log it but don't block the user's request
  billsService.incrementBillViews(idResult.value).catch(err =>
    logger.error('Failed to increment bill views:', {
      billId: idResult.value,
      component: 'BillsRouter'
    }, err)
  );

  return ApiSuccess(res, { bill });
}));

/**
 * POST /api/bills
 * Create a new bill (requires authentication)
 * 
 * The authenticated user is automatically set as the sponsor unless explicitly overridden
 * This ensures proper attribution while allowing flexibility for administrative actions
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const billData = {
    ...req.body,
    // Default to authenticated user as sponsor, but allow override for admin actions
    sponsorId: req.body.sponsorId || req.user!.id
  };

  const newBill = await billsService.createBill(billData);

  // Log successful bill creation for audit trail
  logger.info('Bill created successfully', {
    component: 'BillsRouter',
    billId: newBill.id,
    userId: req.user!.id,
    sponsorId: billData.sponsorId
  });

  // Log data access for bill creation
  await securityAuditService.logDataAccess(
    `bill:${newBill.id}`,
    'create',
    req,
    req.user!.id,
    1,
    true
  );

  return ApiSuccess(res, {
    bill: newBill,
    message: 'Bill created successfully'
  }, {}, 201);
}));

/**
 * POST /api/bills/:id/share
 * Increment share count for a bill
 * 
 * This is a public endpoint to support social sharing without authentication
 * Consider implementing rate limiting to prevent abuse
 */
router.post('/:id/share', asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Bill ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  const updatedBill = await billsService.incrementBillShares(idResult.value);

  return ApiSuccess(res, { 
    bill: updatedBill,
    shares: updatedBill.shares,
    message: 'Share count updated'
  });
}));

/**
 * GET /api/bills/:id/comments
 * Retrieve all comments for a specific bill with optional filtering
 * 
 * Query Parameters:
 *   - highlighted: if 'true', returns only highlighted comments
 *   - sortBy: 'recent', 'popular', or 'endorsements' (default: 'recent')
 */
router.get('/:id/comments', asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Bill ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  const { highlighted, sortBy } = req.query;
  
  // Validate query parameters
  if (sortBy && !['recent', 'popular', 'endorsements'].includes(sortBy as string)) {
    return ApiValidationError(res, 'sortBy must be one of: recent, popular, endorsements');
  }

  const options = {
    highlightedOnly: highlighted === 'true',
    sortBy: (sortBy as 'recent' | 'popular' | 'endorsements') || 'recent'
  };

  const comments = await billsService.getBillComments(idResult.value, options);

  return ApiSuccess(res, {
    comments,
    count: comments.length,
    billId: idResult.value,
    filters: options
  });
}));

/**
 * POST /api/bills/:id/comments
 * Create a new comment on a bill (requires authentication)
 * 
 * Supports both top-level comments and replies to existing comments
 * The parentCommentId field determines whether this is a reply
 */
router.post('/:id/comments', authenticateToken, asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.id, 'Bill ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  // Validate parent comment ID if this is a reply
  if (req.body.parentCommentId !== undefined) {
    const parentIdResult = parseIntParam(req.body.parentCommentId.toString(), 'Parent Comment ID');
    if (!parentIdResult.valid) {
      return ApiValidationError(res, parentIdResult.error);
    }
  }

  const commentData = {
    ...req.body,
    billId: idResult.value,
    userId: req.user!.id
  };

  const newComment = await billsService.createBillComment(commentData);

  // Log comment creation for moderation and analytics
  logger.info('Comment created', {
    component: 'BillsRouter',
    commentId: newComment.id,
    billId: idResult.value,
    userId: req.user!.id,
    isReply: !!req.body.parentCommentId
  });

  return ApiSuccess(res, {
    comment: newComment,
    message: 'Comment created successfully'
  }, {}, 201);
}));

/**
 * GET /api/bills/comments/:commentId/replies
 * Get all replies to a specific comment (supports nested discussions)
 * 
 * This enables threaded conversations and improves discussion organization
 */
router.get('/comments/:commentId/replies', asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.commentId, 'Comment ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  const replies = await billsService.getCommentReplies(idResult.value);

  return ApiSuccess(res, {
    replies,
    count: replies.length,
    parentCommentId: idResult.value
  });
}));

/**
 * PUT /api/bills/comments/:commentId/endorsements
 * Update endorsement count for a comment (requires authentication)
 * 
 * This endpoint should be idempotent - calling it multiple times with the same
 * endorsement value should not create duplicate endorsements
 */
router.put('/comments/:commentId/endorsements', authenticateToken, asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.commentId, 'Comment ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  const { endorsements } = req.body;

  // Validate endorsements is a non-negative integer
  if (typeof endorsements !== 'number' || !Number.isInteger(endorsements) || endorsements < 0) {
    return ApiValidationError(res, 'Endorsements must be a non-negative integer');
  }

  const updatedComment = await billsService.updateBillCommentEndorsements(
    idResult.value, 
    endorsements,
    req.user!.id // Pass user ID for potential duplicate endorsement checking
  );

  return ApiSuccess(res, {
    comment: updatedComment,
    message: 'Endorsements updated successfully'
  });
}));

/**
 * PUT /api/bills/comments/:commentId/highlight
 * Highlight a comment (requires authentication and appropriate permissions)
 * 
 * Highlighted comments are featured prominently in the UI
 * This is typically restricted to moderators and administrators
 */
router.put('/comments/:commentId/highlight', authenticateToken, asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.commentId, 'Comment ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  // Check if user has permission to highlight comments
  // This could be expanded to check for moderator role as well
  if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
    return ApiError(res, 'Insufficient permissions to highlight comments', 403);
  }

  const updatedComment = await billsService.highlightComment(idResult.value, req.user!.id);

  // Log highlight action for audit trail
  logger.info('Comment highlighted', {
    component: 'BillsRouter',
    commentId: idResult.value,
    userId: req.user!.id,
    userRole: req.user!.role
  });

  return ApiSuccess(res, {
    comment: updatedComment,
    message: 'Comment highlighted successfully'
  });
}));

/**
 * DELETE /api/bills/comments/:commentId/highlight
 * Remove highlight from a comment (requires authentication and appropriate permissions)
 */
router.delete('/comments/:commentId/highlight', authenticateToken, asyncHandler(async (req, res) => {
  const idResult = parseIntParam(req.params.commentId, 'Comment ID');
  if (!idResult.valid) {
    return ApiValidationError(res, idResult.error);
  }

  if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
    return ApiError(res, 'Insufficient permissions to unhighlight comments', 403);
  }

  const updatedComment = await billsService.unhighlightComment(idResult.value, req.user!.id);

  logger.info('Comment unhighlighted', {
    component: 'BillsRouter',
    commentId: idResult.value,
    userId: req.user!.id
  });

  return ApiSuccess(res, {
    comment: updatedComment,
    message: 'Comment highlight removed successfully'
  });
}));

/**
 * GET /api/bills/cache/stats
 * Get cache performance statistics (admin only)
 * 
 * This endpoint provides insights into cache hit rates, memory usage,
 * and other performance metrics useful for optimization
 */
router.get('/cache/stats', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user!.role !== 'admin') {
    return ApiError(res, 'Insufficient permissions', 403);
  }

  const stats = billsService.getCacheStats();

  return ApiSuccess(res, {
    cacheStats: stats,
    timestamp: new Date().toISOString(),
    message: 'Cache statistics retrieved successfully'
  });
}));

/**
 * Global error handler for this router
 * Catches any errors that weren't handled by individual route handlers
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  return handleRouteError(res, err, 'handle request', (req as any).user?.id);
});

export { router };








