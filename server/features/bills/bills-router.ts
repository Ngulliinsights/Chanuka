/**
 * Bills Router - Complete Migration to New Error System
 * 
 * This is a fully migrated version using:
 * - BaseError, ValidationError from @shared/core/observability/error-management
 * - ERROR_CODES from @shared/constants
 * - Unified error middleware for handling all errors
 * - asyncHandler() for automatic error propagation
 * - createErrorContext() for distributed tracing
 */

import { NextFunction, Response, Router } from 'express';

import type { AuthenticatedRequest } from '../../../../AuthAlert';
import { authenticateToken } from '../../../../AuthAlert';
import { securityAuditService } from '../../../../security-audit-service';
import { billService } from '@shared/application/bills';
import { ERROR_CODES } from '@shared/constants';
import { BaseError, ErrorDomain, ErrorSeverity, ValidationError } from '@shared/core/observability/error-management';
import { createErrorContext } from '@server/infrastructure/error-handling';

const logger = {
  error: (message: string, context?: Record<string, unknown>, error?: Error) => {
    console.error(`[ERROR] ${message}`, context || '', error || '');
  },
  info: (message: string, context?: Record<string, unknown>, meta?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, context || '', meta || '');
  }
};

const router: Router = Router();

/**
 * Utility function to parse and validate integer parameters from route params
 * Throws ValidationError for invalid values (caught by unified middleware)
 */
function parseIntParam(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new ValidationError(`${paramName} must be a valid positive number`, [
      {
        field: paramName,
        message: `${paramName} must be a valid positive number`,
        value,
      },
    ]);
  }
  return parsed;
}

/**
 * Higher-order function that wraps async route handlers with error handling
 * Errors are automatically caught and passed to the unified error middleware
 */
function asyncHandler(fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/bills
 * Retrieve all bills with optional filtering by tags
 */
router.get('/', asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'GET /api/bills');
  const { tags, limit, offset } = req.query;
  
  // Parse pagination parameters with sensible defaults
  const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
  const parsedOffset = offset ? parseInt(offset as string, 10) : undefined;

  // Validate pagination parameters if provided
  if (parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100)) {
    throw new ValidationError('Invalid limit parameter', [
      {
        field: 'limit',
        message: 'Limit must be a positive number between 1 and 100',
        value: parsedLimit,
      },
    ]);
  }

  if (parsedOffset !== undefined && (isNaN(parsedOffset) || parsedOffset < 0)) {
    throw new ValidationError('Invalid offset parameter', [
      {
        field: 'offset',
        message: 'Offset must be a non-negative number',
        value: parsedOffset,
      },
    ]);
  }
  
  let bills;
  if (tags) {
    const tagArray = Array.isArray(tags) 
      ? tags.filter(tag => typeof tag === 'string' && tag.trim()) as string[]
      : (tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
    
    if (tagArray.length === 0) {
      throw new ValidationError('At least one valid tag must be provided', [
        {
          field: 'tags',
          message: 'At least one valid tag must be provided',
          value: tags,
        },
      ]);
    }
    
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

  await securityAuditService.logDataAccess(
    'bills:list',
    'read',
    req,
    String((req as AuthenticatedRequest).user?.id || ''),
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
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'GET /api/bills/:id');
  const billId = parseIntParam(req.params.id, 'Bill ID');

  const bill = await billService.getBill(billId);
  if (!bill) {
    throw new BaseError('Bill not found', {
      statusCode: 404,
      code: ERROR_CODES.BILL_NOT_FOUND,
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.LOW,
      details: { billId },
      context,
    });
  }

  await securityAuditService.logDataAccess(
    `bill:${billId}`,
    'read',
    req,
    (req as AuthenticatedRequest).user?.id,
    1,
    true
  );

  billService.incrementBillViews(billId).catch((err: Error) =>
    logger.error('Failed to increment bill views:', { 
      bill_id: billId,
      component: 'BillsRouter'
    }, err)
  );

  res.json({ bill });
}));

/**
 * POST /api/bills
 * Create a new bill (requires authentication)
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const billData = {
    ...req.body,
    sponsor_id: req.body.sponsor_id || req.user!.id
  };

  const newBill = await billService.createBill(billData);

  logger.info('Bill created successfully', { 
    component: 'BillsRouter',
    bill_id: newBill.id,
    user_id: req.user!.id,
    sponsor_id: billData.sponsor_id
  });

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
 */
router.post('/:id/share', asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'POST /api/bills/:id/share');
  const billId = parseIntParam(req.params.id, 'Bill ID');

  const updatedBill = await billService.incrementBillShares(billId);
  if (!updatedBill) {
    throw new BaseError('Failed to update bill shares', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { billId },
      context,
    });
  }

  res.json({
    bill: updatedBill,
    shares: updatedBill.shares,
    message: 'Share count updated'
  });
}));

/**
 * GET /api/bills/:id/comments
 * Retrieve all comments for a specific bill with optional filtering
 */
router.get('/:id/comments', asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');

  const { highlighted, sortBy } = req.query;

  if (sortBy && !['recent', 'popular', 'endorsements'].includes(sortBy as string)) {
    throw new ValidationError('Invalid sortBy parameter', [
      {
        field: 'sortBy',
        message: 'sortBy must be one of: recent, popular, endorsements',
        value: sortBy,
      },
    ]);
  }

  const commentsRaw = await billService.getBillComments(billId);

  let comments = commentsRaw.slice();
  if (highlighted === 'true') {
    comments = comments.filter((c: { isHighlighted?: boolean }) => c.isHighlighted === true);
  }

  const sortKey = (sortBy as string) || 'recent';
  if (sortKey === 'recent') {
    comments.sort((a: { created_at: string }, b: { created_at: string }) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sortKey === 'popular') {
    comments.sort((a: { likes?: number }, b: { likes?: number }) => 
      (b.likes || 0) - (a.likes || 0)
    );
  } else if (sortKey === 'endorsements') {
    comments.sort((a: { endorsements?: number }, b: { endorsements?: number }) => 
      (b.endorsements || 0) - (a.endorsements || 0)
    );
  }

  res.json({ 
    comments,
    count: comments.length,
    bill_id: billId,
    filters: { highlighted: highlighted === 'true', sortBy: sortKey }
  });
}));

/**
 * POST /api/bills/:id/comments
 * Create a new comment on a bill (requires authentication)
 */
router.post('/:id/comments', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');

  if (req.body.parent_id !== undefined) {
    parseIntParam(req.body.parent_id.toString(), 'Parent Comment ID');
  }

  const commentData = { 
    ...req.body,
    bill_id: billId,
    user_id: req.user!.id
  };

  const newComment = await billService.createBillComment(commentData);

  logger.info('Comment created', { 
    component: 'BillsRouter',
    comment_id: newComment.id,
    bill_id: billId,
    user_id: req.user!.id,
    isReply: !!req.body.parent_id
  });

  res.status(201).json({
    comment: newComment,
    message: 'Comment created successfully'
  });
}));

/**
 * GET /api/bills/comments/:comment_id/replies
 * Get all replies to a specific comment
 */
router.get('/comments/:comment_id/replies', asyncHandler(async (req, res) => {
  const commentId = parseIntParam(req.params.comment_id, 'Comment ID');

  const replies = await billService.getCommentReplies(commentId);

  res.json({
    replies,
    count: replies.length,
    parent_id: commentId
  });
}));

/**
 * PUT /api/bills/comments/:comment_id/endorsements
 * Update endorsement count for a comment (requires authentication)
 */
router.put('/comments/:comment_id/endorsements', authenticateToken, asyncHandler(async (req, res) => {
  const commentId = parseIntParam(req.params.comment_id, 'Comment ID');

  const { endorsements } = req.body;

  if (typeof endorsements !== 'number' || !Number.isInteger(endorsements) || endorsements < 0) {
    throw new ValidationError('Invalid endorsements value', [
      {
        field: 'endorsements',
        message: 'Endorsements must be a non-negative integer',
        value: endorsements,
      },
    ]);
  }

  const updatedComment = await billService.updateBillCommentEndorsements(
    commentId,
    endorsements
  );

  res.json({
    comment: updatedComment,
    message: 'Endorsements updated successfully'
  });
}));

/**
 * PUT /api/bills/comments/:comment_id/highlight
 * Highlight a comment (requires authentication and appropriate permissions)
 */
router.put('/comments/:comment_id/highlight', authenticateToken, asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'PUT /api/bills/comments/:comment_id/highlight');
  const commentId = parseIntParam(req.params.comment_id, 'Comment ID');

  if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
    throw new BaseError('Insufficient permissions to highlight comments', {
      statusCode: 403,
      code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      details: { commentId, userRole: req.user!.role },
      context,
    });
  }

  const updatedComment = await billService.highlightComment(commentId);

  logger.info('Comment highlighted', { 
    component: 'BillsRouter',
    comment_id: commentId,
    user_id: req.user!.id,
    user_role: req.user!.role
  });

  res.json({
    comment: updatedComment,
    message: 'Comment highlighted successfully'
  });
}));

/**
 * DELETE /api/bills/comments/:comment_id/highlight
 * Remove highlight from a comment (requires authentication and appropriate permissions)
 */
router.delete('/comments/:comment_id/highlight', authenticateToken, asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'DELETE /api/bills/comments/:comment_id/highlight');
  const commentId = parseIntParam(req.params.comment_id, 'Comment ID');

  if (req.user!.role !== 'admin' && req.user!.role !== 'moderator') {
    throw new BaseError('Insufficient permissions to remove highlight from comments', {
      statusCode: 403,
      code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      details: { commentId, userRole: req.user!.role },
      context,
    });
  }

  const updatedComment = await billService.unhighlightComment(commentId);

  logger.info('Comment highlight removed', { 
    component: 'BillsRouter',
    comment_id: commentId,
    user_id: req.user!.id,
    user_role: req.user!.role
  });

  res.json({
    comment: updatedComment,
    message: 'Comment highlight removed successfully'
  });
}));

/**
 * GET /api/bills/cache/stats
 * Get cache performance statistics (admin only)
 */
router.get('/cache/stats', authenticateToken, asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'GET /api/bills/cache/stats');
  
  if (req.user!.role !== 'admin') {
    throw new BaseError('Insufficient permissions', {
      statusCode: 403,
      code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      details: { userRole: req.user!.role },
      context,
    });
  }

  const stats = billService.getCacheStats();

  res.json({
    cacheStats: stats,
    timestamp: new Date().toISOString(),
    message: 'Cache statistics retrieved successfully'
  });
}));

/**
 * All errors are now handled by the unified error middleware
 * (createUnifiedErrorMiddleware) which is registered in server/index.ts
 */

export { router };