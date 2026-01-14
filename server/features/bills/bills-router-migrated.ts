/**
 * Migrated Bills Router - Using Boom Error System
 * 
 * This demonstrates the migration from custom error handling to Boom + neverthrow
 * while maintaining API compatibility with existing clients.
 */

import * as Boom from '@hapi/boom';
import { BillNotFoundError, billService, CommentNotFoundError, ValidationError } from '@shared/application/bills.js';
import { logger  } from '@shared/core';
import type { Bill, BillComment } from '@server/infrastructure/schema';
import { NextFunction,Request, Response, Router } from 'express';

import { errorAdapter } from '@/infrastructure/errors/error-adapter.js';

import type { AuthenticatedRequest } from '../../../../AuthAlert';
import { authenticateToken } from '../../../../AuthAlert';
import { asyncErrorHandler } from '../../../../boom-error-middleware';
import { securityAuditService } from '../../../../security-audit-service';

const router = Router();

/**
 * Utility function to parse and validate integer parameters from route params
 * Now throws Boom errors instead of returning validation objects
 */
function parseIntParam(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw Boom.badRequest(`${paramName} must be a valid positive number`);
  }
  return parsed;
}

/**
 * Utility function to validate pagination parameters
 * Throws Boom errors for invalid values
 */
function validatePagination(limit?: string, offset?: string): { limit?: number; offset?: number } {
  let parsedLimit: number | undefined;
  let parsedOffset: number | undefined;

  if (limit !== undefined) {
    parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      throw Boom.badRequest('Limit must be a positive number between 1 and 100');
    }
  }

  if (offset !== undefined) {
    parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw Boom.badRequest('Offset must be a non-negative number');
    }
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

/**
 * Convert domain errors to Boom errors
 * This maintains the same error semantics while using Boom
 */
function mapDomainErrorToBoom(error: unknown): never {
  if (error instanceof BillNotFoundError || error instanceof CommentNotFoundError) {
    throw Boom.notFound(error.message);
  }

  if (error instanceof ValidationError) {
    throw Boom.badRequest(error.message);
  }

  // For unknown errors, log and throw internal server error
  logger.error('Unexpected error in bills router', {
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error)
  });

  throw Boom.internal('An unexpected error occurred');
}

/**
 * GET /api/bills
 * Retrieve all bills with optional filtering by tags
 */
router.get('/', asyncErrorHandler(async (req: Request, res: Response) => {
  const { tags, limit, offset } = req.query;
  
  // Validate pagination parameters - throws Boom errors if invalid
  const pagination = validatePagination(limit as string, offset as string);

  let bills;
  try {
    if (tags) {
      // Normalize tags input to always work with an array
      const tagArray = Array.isArray(tags) 
        ? tags.filter(tag => typeof tag === 'string' && tag.trim()) as string[]
        : (tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
      
      if (tagArray.length === 0) {
        throw Boom.badRequest('At least one valid tag must be provided');
      }
      
      const all = await billService.getBillsByTags(tagArray);
      const start = pagination.offset || 0;
      const end = pagination.limit ? start + pagination.limit : undefined;
      bills = typeof end === 'number' ? all.slice(start, end) : all.slice(start);
    } else {
      const all = await billService.getBills();
      const start = pagination.offset || 0;
      const end = pagination.limit ? start + pagination.limit : undefined;
      bills = typeof end === 'number' ? all.slice(start, end) : all.slice(start);
    }
  } catch (error) {
    mapDomainErrorToBoom(error);
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

  // Send success response (middleware will handle any errors)
  res.json({
    success: true,
    data: {
      bills,
      count: bills.length,
      hasMore: pagination.limit ? bills.length === pagination.limit : false,
      pagination: pagination.limit ? {
        limit: pagination.limit,
        offset: pagination.offset || 0,
        next: pagination.limit && bills.length === pagination.limit ? (pagination.offset || 0) + pagination.limit : null
      } : undefined,
      message: bills.length === 0 ? 'No bills found matching criteria' : undefined
    }
  });
}));

/**
 * GET /api/bills/:id
 * Retrieve a specific bill by ID and increment its view count
 */
router.get('/:id', asyncErrorHandler(async (req: Request, res: Response) => {
  const bill_id = parseIntParam(req.params.id, 'Bill ID');

  let bill;
  try {
    bill = await billService.getBill(bill_id);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  // Log data access
  await securityAuditService.logDataAccess(
    `bill:${bill_id}`,
    'read',
    req,
    (req as any).user?.id,
    1,
    true
  );

  // Fire-and-forget pattern for view count
  billService.incrementBillViews(bill_id).catch(err =>
    logger.error('Failed to increment bill views:', { bill_id: bill_id }, err)
  );

  res.json({
    success: true,
    data: { bill }
  });
}));

/**
 * POST /api/bills
 * Create a new bill (requires authentication)
 */
router.post('/', authenticateToken, asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw Boom.unauthorized('Authentication required');
  }

  const billData = {
    ...req.body,
    sponsor_id: req.body.sponsor_id || req.user.id
  };

  let newBill;
  try {
    newBill = await billService.createBill(billData);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  // Log successful bill creation
  logger.info('Bill created successfully', {
    bill_id: newBill.id,
    user_id: req.user.id,
    sponsor_id: billData.sponsor_id
  });

  // Log data access for bill creation
  await securityAuditService.logDataAccess(
    `bill:${newBill.id}`,
    'write',
    req,
    String(req.user.id),
    1,
    true
  );

  res.status(201).json({
    success: true,
    data: {
      bill: newBill,
      message: 'Bill created successfully'
    }
  });
}));

/**
 * POST /api/bills/:id/share
 * Increment share count for a bill
 */
router.post('/:id/share', asyncErrorHandler(async (req: Request, res: Response) => {
  const bill_id = parseIntParam(req.params.id, 'Bill ID');

  let updatedBill;
  try {
    updatedBill = await billService.incrementBillShares(bill_id);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  res.json({
    success: true,
    data: {
      bill: updatedBill,
      shares: updatedBill.shares,
      message: 'Share count updated'
    }
  });
}));

/**
 * GET /api/bills/:id/comments
 * Retrieve all comments for a specific bill with optional filtering
 */
router.get('/:id/comments', asyncErrorHandler(async (req: Request, res: Response) => {
  const bill_id = parseIntParam(req.params.id, 'Bill ID');
  const { highlighted, sortBy } = req.query;

  // Validate query parameters
  if (sortBy && !['recent', 'popular', 'endorsements'].includes(sortBy as string)) {
    throw Boom.badRequest('sortBy must be one of: recent, popular, endorsements');
  }

  let commentsRaw;
  try {
    commentsRaw = await billService.getBillComments(bill_id);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  // Apply filtering and sorting
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

  res.json({
    success: true,
    data: {
      comments,
      count: comments.length,
      bill_id: bill_id,
      filters: { highlighted: highlighted === 'true', sortBy: sortKey }
    }
  });
}));

/**
 * POST /api/bills/:id/comments
 * Create a new comment on a bill (requires authentication)
 */
router.post('/:id/comments', authenticateToken, asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw Boom.unauthorized('Authentication required');
  }

  const bill_id = parseIntParam(req.params.id, 'Bill ID');

  // Validate parent comment ID if this is a reply
  if (req.body.parent_id !== undefined) {
    parseIntParam(req.body.parent_id.toString(), 'Parent Comment ID');
  }

  const commentData = {
    ...req.body,
    bill_id: bill_id,
    user_id: req.user.id
  };

  let newComment;
  try {
    newComment = await billService.createBillComment(commentData);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  // Log comment creation
  logger.info('Comment created', {
    comment_id: newComment.id,
    bill_id: bill_id,
    user_id: req.user.id,
    isReply: !!req.body.parent_id
  });

  res.status(201).json({
    success: true,
    data: {
      comment: newComment,
      message: 'Comment created successfully'
    }
  });
}));

/**
 * GET /api/bills/comments/:comment_id/replies
 * Get all replies to a specific comment
 */
router.get('/comments/:comment_id/replies', asyncErrorHandler(async (req: Request, res: Response) => {
  const comment_id = parseIntParam(req.params.comment_id, 'Comment ID');

  let replies;
  try {
    replies = await billService.getCommentReplies(comment_id);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  res.json({
    success: true,
    data: {
      replies,
      count: replies.length,
      parent_id: comment_id
    }
  });
}));

/**
 * PUT /api/bills/comments/:comment_id/endorsements
 * Update endorsement count for a comment (requires authentication)
 */
router.put('/comments/:comment_id/endorsements', authenticateToken, asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw Boom.unauthorized('Authentication required');
  }

  const comment_id = parseIntParam(req.params.comment_id, 'Comment ID');
  const { endorsements } = req.body;

  // Validate endorsements
  if (typeof endorsements !== 'number' || !Number.isInteger(endorsements) || endorsements < 0) {
    throw Boom.badRequest('Endorsements must be a non-negative integer');
  }

  let updatedComment;
  try {
    updatedComment = await billService.updateBillCommentEndorsements(comment_id, endorsements);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  res.json({
    success: true,
    data: {
      comment: updatedComment,
      message: 'Endorsements updated successfully'
    }
  });
}));

/**
 * PUT /api/bills/comments/:comment_id/highlight
 * Highlight a comment (requires authentication and appropriate permissions)
 */
router.put('/comments/:comment_id/highlight', authenticateToken, asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw Boom.unauthorized('Authentication required');
  }

  const comment_id = parseIntParam(req.params.comment_id, 'Comment ID');

  // Check permissions
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    throw Boom.forbidden('Insufficient permissions to highlight comments');
  }

  let updatedComment;
  try {
    updatedComment = await billService.highlightComment(comment_id);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  // Log highlight action
  logger.info('Comment highlighted', {
    comment_id: comment_id,
    user_id: req.user.id,
    user_role: req.user.role
  });

  res.json({
    success: true,
    data: {
      comment: updatedComment,
      message: 'Comment highlighted successfully'
    }
  });
}));

/**
 * DELETE /api/bills/comments/:comment_id/highlight
 * Remove highlight from a comment (requires authentication and appropriate permissions)
 */
router.delete('/comments/:comment_id/highlight', authenticateToken, asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw Boom.unauthorized('Authentication required');
  }

  const comment_id = parseIntParam(req.params.comment_id, 'Comment ID');

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    throw Boom.forbidden('Insufficient permissions to unhighlight comments');
  }

  let updatedComment;
  try {
    updatedComment = await billService.unhighlightComment(comment_id);
  } catch (error) {
    mapDomainErrorToBoom(error);
  }

  logger.info('Comment unhighlighted', {
    comment_id: comment_id,
    user_id: req.user.id
  });

  res.json({
    success: true,
    data: {
      comment: updatedComment,
      message: 'Comment highlight removed successfully'
    }
  });
}));

/**
 * GET /api/bills/cache/stats
 * Get cache performance statistics (admin only)
 */
router.get('/cache/stats', authenticateToken, asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw Boom.unauthorized('Authentication required');
  }

  if (req.user.role !== 'admin') {
    throw Boom.forbidden('Insufficient permissions');
  }

  const stats = billService.getCacheStats();

  res.json({
    success: true,
    data: {
      cacheStats: stats,
      timestamp: new Date().toISOString(),
      message: 'Cache statistics retrieved successfully'
    }
  });
}));

export { router as migratedBillsRouter };


