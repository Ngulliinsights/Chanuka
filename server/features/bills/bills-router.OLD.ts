import { BillNotFoundError, billService, CommentNotFoundError, ValidationError } from '@shared/application/bills.js';
import { BaseError, ValidationError as SharedValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES } from '@shared/constants';
import { NextFunction, Request, Response, Router } from 'express';
import { createErrorContext } from '@server/infrastructure/error-handling';

import type { AuthenticatedRequest } from '../../../../AuthAlert';
import { authenticateToken } from '../../../../AuthAlert';
// Temporary logger import - will be fixed when shared/core is properly configured
const logger = {
  error: (message: string, context?: any, error?: any) => {
    console.error(`[ERROR] ${message}`, context || '', error || '');
  },
  info: (message: string, context?: any, meta?: any) => {
    console.info(`[INFO] ${message}`, context || '', meta || '');
  }
};
import type { Bill, BillComment } from '@server/infrastructure/schema/index.js';

import { securityAuditService } from '../../../../security-audit-service';

const router = Router();

/**
 * Utility function to parse and validate integer parameters from route params
 * Throws ValidationError for invalid values
 */
function parseIntParam(value: string, paramName: string, context: any): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new SharedValidationError(`${paramName} must be a valid positive number`, {
      fields: { [paramName]: `${paramName} must be a valid positive number` },
      context,
    });
  }
  return parsed;
}

/**
 * Higher-order function that wraps async route handlers with error handling
 * Errors are automatically caught and passed to the unified error middleware
 */
function asyncHandler(fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  const context = createErrorContext(req, 'GET /api/bills');
  const { tags, limit, offset } = req.query;
  
  // Parse pagination parameters with sensible defaults
  const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
  const parsedOffset = offset ? parseInt(offset as string, 10) : undefined;

  // Validate pagination parameters if provided
  if (parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100)) {
    throw new SharedValidationError('Invalid limit parameter', {
      fields: { limit: 'Limit must be a positive number between 1 and 100' },
      context,
    });
  }

  if (parsedOffset !== undefined && (isNaN(parsedOffset) || parsedOffset < 0)) {
    throw new SharedValidationError('Invalid offset parameter', {
      fields: { offset: 'Offset must be a non-negative number' },
      context,
    });
  }
  
  let bills;
  if (tags) {
    // Normalize tags input to always work with an array, handling both formats gracefully
    const tagArray = Array.isArray(tags) 
      ? tags.filter(tag => typeof tag === 'string' && tag.trim()) as string[]
      : (tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
    
    if (tagArray.length === 0) {
      throw new SharedValidationError('At least one valid tag must be provided', {
        fields: { tags: 'At least one valid tag must be provided' },
        context,
      });
    }
    
    // billService currently returns the full set; apply pagination here
    const all = await billService.getBillsByTags(tagArray);
    const start = parsedOffset || 0;
    const end = parsedLimit ? start + parsedLimit : undefined;
    bills = typeof end === 'number' ? all.slice(start, end) : all.slice(start);
  } else {
    const all = await billService.getBills();
    const start = parsedOffset || 0;
    const end = parsedLimit ? start + parsedLimit : undefined;
    bills = typeof end === 'number' ? all.slice(start, end) : all.slice(start);
  }

  // Log data access for bill listing
  await securityAuditService.logDataAccess(
    'bills:list',
    'read',
    req,
    String((req as any).user?.id || ''),
    bills.length,
    true
  );

  res.json({
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
  const context = createErrorContext(req, 'GET /api/bills/:id');
  const billId = parseIntParam(req.params.id, 'Bill ID', context);

  const bill = await billService.getBill(billId);
  if (!bill) {
    throw new BaseError('Bill not found', {
      statusCode: 404,
      code: ERROR_CODES.BILL_NOT_FOUND,
      domain: 'BUSINESS',
      severity: 'LOW',
      details: { billId },
      context,
    });
  }

  // Log data access
  await securityAuditService.logDataAccess(
    `bill:${billId}`,
    'read',
    req,
    (req as any).user?.id,
    1,
    true
  );

  // Fire-and-forget pattern for view count: improves performance without sacrificing reliability
  // If the increment fails, we log it but don't block the user's request
  billService.incrementBillViews(billId).catch(err =>
    logger.error('Failed to increment bill views:', { bill_id: billId,
      component: 'BillsRouter'
     }, err)
  );

  res.json({ bill });
}));

/**
 * POST /api/bills
 * Create a new bill (requires authentication)
 * 
 * The authenticated user is automatically set as the sponsor unless explicitly overridden
 * This ensures proper attribution while allowing flexibility for administrative actions
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'POST /api/bills');
  const billData = {
    ...req.body,
    // Default to authenticated user as sponsor, but allow override for admin actions
    sponsor_id: req.body.sponsor_id || req.user!.id
  };

  const newBill = await billService.createBill(billData);

  // Log successful bill creation for audit trail
  logger.info('Bill created successfully', { component: 'BillsRouter',
    bill_id: newBill.id,
    user_id: req.user!.id,
    sponsor_id: billData.sponsor_id
    });

  // Log data access for bill creation
  await securityAuditService.logDataAccess(
    `bill:${newBill.id}`,
    'write',
    req,
    String(req.user!.id),
    1,
    true
  );

  res.status(201).json({
    bill: newBill,
    message: 'Bill created successfully'
  });
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
     return ApiValidationError(res, [{ field: 'id', message: (idResult as any).error }]);
   }

  const updatedBill = await billService.incrementBillShares(idResult.value);

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
     return ApiValidationError(res, [{ field: 'id', message: (idResult as any).error }]);
   }

  const { highlighted, sortBy } = req.query;

  // Validate query parameters
  if (sortBy && !['recent', 'popular', 'endorsements'].includes(sortBy as string)) {
    return ApiValidationError(res, [{ field: 'sortBy', message: 'sortBy must be one of: recent, popular, endorsements' }]);
  }

  const commentsRaw = await billService.getBillComments(idResult.value);

  // Apply filtering and sorting at the router level since service returns raw comments
  let comments = commentsRaw.slice();
  if (highlighted === 'true') {
    comments = comments.filter(c => (c as any).isHighlighted === true);
  }

  const sortKey = (sortBy as string) || 'recent';
  if (sortKey === 'recent') {
    comments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sortKey === 'popular') {
    comments.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0));
  } else if (sortKey === 'endorsements') {
    comments.sort((a: any, b: any) => (b.endorsements || 0) - (a.endorsements || 0));
  }

  return ApiSuccess(res, { comments,
    count: comments.length,
    bill_id: idResult.value,
    filters: { highlighted: highlighted === 'true', sortBy: sortKey  }
  });
}));

/**
 * POST /api/bills/:id/comments
 * Create a new comment on a bill (requires authentication)
 * 
 * Supports both top-level comments and replies to existing comments
 * The parent_id field determines whether this is a reply
 */
router.post('/:id/comments', authenticateToken, asyncHandler(async (req, res) => {
   const idResult = parseIntParam(req.params.id, 'Bill ID');
   if (!idResult.valid) {
     return ApiValidationError(res, [{ field: 'id', message: (idResult as any).error }]);
   }

   // Validate parent comment ID if this is a reply
   if (req.body.parent_id !== undefined) {
     const parent_idResult = parseIntParam(req.body.parent_id.toString(), 'Parent Comment ID');
     if (!parent_idResult.valid) {
       return ApiValidationError(res, [{ field: 'parent_id', message: (parent_idResult as any).error }]);
     }
   }

  const commentData = { ...req.body,
    bill_id: idResult.value,
    user_id: req.user!.id
    };

  const newComment = await billService.createBillComment(commentData);

  // Log comment creation for moderation and analytics
  logger.info('Comment created', { component: 'BillsRouter',
    comment_id: newComment.id,
    bill_id: idResult.value,
    user_id: req.user!.id,
    isReply: !!req.body.parent_id
    });

  return ApiSuccess(res, {
    comment: newComment,
    message: 'Comment created successfully'
  }, undefined, 201);
}));

/**
 * GET /api/bills/comments/:comment_id/replies
 * Get all replies to a specific comment (supports nested discussions)
 * 
 * This enables threaded conversations and improves discussion organization
 */
router.get('/comments/:comment_id/replies', asyncHandler(async (req, res) => {
   const idResult = parseIntParam(req.params.comment_id, 'Comment ID');
   if (!idResult.valid) {
     return ApiValidationError(res, [{ field: 'comment_id', message: (idResult as any).error }]);
   }

  const replies = await billService.getCommentReplies(idResult.value);

  return ApiSuccess(res, {
    replies,
    count: replies.length,
    parent_id: idResult.value
  });
}));

/**
 * PUT /api/bills/comments/:comment_id/endorsements
 * Update endorsement count for a comment (requires authentication)
 * 
 * This endpoint should be idempotent - calling it multiple times with the same
 * endorsement value should not create duplicate endorsements
 */
router.put('/comments/:comment_id/endorsements', authenticateToken, asyncHandler(async (req, res) => {
   const idResult = parseIntParam(req.params.comment_id, 'Comment ID');
   if (!idResult.valid) {
     return ApiValidationError(res, [{ field: 'comment_id', message: (idResult as any).error }]);
   }

  const { endorsements } = req.body;

  // Validate endorsements is a non-negative integer
  if (typeof endorsements !== 'number' || !Number.isInteger(endorsements) || endorsements < 0) {
    return ApiValidationError(res, [{ field: 'endorsements', message: 'Endorsements must be a non-negative integer' }]);
  }

  const updatedComment = await billService.updateBillCommentEndorsements(
    idResult.value,
    endorsements
  );

  return ApiSuccess(res, {
    comment: updatedComment,
    message: 'Endorsements updated successfully'
  });
}));

/**
 * PUT /api/bills/comments/:comment_id/highlight
 * Highlight a comment (requires authentication and appropriate permissions)
 * 
 * Highlighted comments are featured prominently in the UI
 * This is typically restricted to moderators and administrators
 */
router.put('/comments/:comment_id/highlight', authenticateToken, asyncHandler(async (req, res) => {
   const idResult = parseIntParam(req.params.comment_id, 'Comment ID');
   if (!idResult.valid) {
     return ApiValidationError(res, [{ field: 'comment_id', message: (idResult as any).error }]);
   }

  // Check if user has permission to highlight comments
  // This could be expanded to check for moderator role as well
  if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
    return ApiError(res, 'Insufficient permissions to highlight comments', 403);
  }

  const updatedComment = await billService.highlightComment(idResult.value);

  // Log highlight action for audit trail
  logger.info('Comment highlighted', { component: 'BillsRouter',
    comment_id: idResult.value,
    user_id: req.user!.id,
    user_role: req.user!.role
   });

  return ApiSuccess(res, {
    comment: updatedComment,
    message: 'Comment highlighted successfully'
  });
}));

/**
 * DELETE /api/bills/comments/:comment_id/highlight
 * Remove highlight from a comment (requires authentication and appropriate permissions)
 */
router.delete('/comments/:comment_id/highlight', authenticateToken, asyncHandler(async (req, res) => {
   const idResult = parseIntParam(req.params.comment_id, 'Comment ID');
   if (!idResult.valid) {
     return ApiValidationError(res, [{ field: 'comment_id', message: (idResult as any).error }]);
   }

  if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
    return ApiError(res, 'Insufficient permissions to unhighlight comments', 403);
  }

  const updatedComment = await billService.unhighlightComment(idResult.value);

  logger.info('Comment unhighlighted', { component: 'BillsRouter',
    comment_id: idResult.value,
    user_id: req.user!.id
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

  const stats = billService.getCacheStats();

  return ApiSuccess(res, {
    cacheStats: stats,
    timestamp: new Date().toISOString(),
    message: 'Cache statistics retrieved successfully'
  });
}));

/**
 * Global error handler for this router
 * Errors are now handled by the unified error middleware (createUnifiedErrorMiddleware)
 * which automatically catches thrown errors and formats appropriate HTTP responses
 */

export { router };























































