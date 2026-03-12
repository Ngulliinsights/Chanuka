/**
 * Bills Router - Complete Migration to New Error System
 * 
 * This is a fully migrated version using:
 * - BaseError, ValidationError from @shared/types/core/errors
 * - ERROR_CODES from @shared/constants
 * - Unified error middleware for handling all errors
 * - asyncHandler() for automatic error propagation
 * - createErrorContext() for distributed tracing
 */

import { NextFunction, Response, Router } from 'express';
import { sql } from 'drizzle-orm';

import type { AuthenticatedRequest } from '@server/middleware/auth';
import { authenticateToken } from '@server/middleware/auth';
import { securityAuditService } from '@server/features/security';
import { BillStorage } from '@server/features/bills/infrastructure/bill-storage';
import { legislativeStorage } from '@server/features/bills/infrastructure/legislative-storage';
import { billTrackingService } from '@server/features/bills/bill.factory';
import { cacheService } from '@server/infrastructure/cache';
import { ERROR_CODES } from '@shared/constants';
import { BaseError, ErrorDomain, ErrorSeverity, ValidationError } from '@shared/types/core/errors';
import { createErrorContext } from '@server/utils/createErrorContext';
import { logger } from '@server/infrastructure/observability/core/logger';
import { db } from '@server/infrastructure/database';
import { bills } from '@server/infrastructure/schema';
import { sponsors } from '@server/infrastructure/schema';

// Initialize storage services
const billStorage = BillStorage.getInstance();

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
  try {
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
      
      const all = await billStorage.getBillsByTags(tagArray);
      const start = parsedOffset || 0;
      const end = parsedLimit ? start + parsedLimit : undefined;
      bills = typeof end === 'number' ? all.slice(start, end) : all.slice(start);
    } else {
      const all = await billStorage.getBills();
      const start = parsedOffset || 0;
      const end = parsedLimit ? start + parsedLimit : undefined;
      bills = typeof end === 'number' ? all.slice(start, end) : all.slice(start);
    }
  } catch (error) {
    // Return empty array if database is not available (development mode)
    logger.warn({
      component: 'BillsRouter',
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to fetch bills from database, returning empty array');
    bills = [];
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

  const bill = await billStorage.getBill(billId);
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

  billStorage.incrementBillViews(billId).catch((err: Error) =>
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

  const newBill = await billStorage.createBill(billData);

  logger.info({ 
    component: 'BillsRouter',
    bill_id: newBill.id,
    user_id: req.user!.id,
    sponsor_id: billData.sponsor_id
  }, 'Bill created successfully');

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

  const updatedBill = await billStorage.incrementBillShares(billId);
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
    shares: updatedBill.share_count,
    message: 'Share count updated'
  });
}));

/**
 * POST /api/bills/:id/track
 * Track a bill for the authenticated user
 */
router.post('/:id/track', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  const userId = req.user!.id;
  
  const preferences = await billTrackingService.trackBill(userId, billId, req.body);
  
  logger.info({ 
    component: 'BillsRouter',
    bill_id: billId,
    user_id: userId
  }, 'Bill tracked successfully');

  res.json({ 
    success: true, 
    message: 'Bill tracked successfully',
    preferences
  });
}));

/**
 * POST /api/bills/:id/untrack
 * Untrack a bill for the authenticated user
 */
router.post('/:id/untrack', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  const userId = req.user!.id;
  
  await billTrackingService.untrackBill(userId, billId);
  
  logger.info({ 
    component: 'BillsRouter',
    bill_id: billId,
    user_id: userId
  }, 'Bill untracked successfully');

  res.json({ 
    success: true, 
    message: 'Bill untracked successfully' 
  });
}));

/**
 * GET /api/bills/:id/sponsors
 * Get all sponsors for a specific bill
 */
router.get('/:id/sponsors', asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  
  const sponsors = await legislativeStorage.getBillSponsors(billId);
  
  res.json({ 
    success: true, 
    data: sponsors,
    count: sponsors.length
  });
}));

/**
 * GET /api/bills/:id/analysis
 * Get comprehensive analysis for a bill
 */
router.get('/:id/analysis', asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  
  const analysis = await legislativeStorage.getBillAnalysis(billId);
  
  res.json({ 
    success: true, 
    data: analysis,
    count: analysis.length
  });
}));

/**
 * POST /api/bills/:id/engagement
 * Record user engagement with a bill (view, share, save, vote)
 */
router.post('/:id/engagement', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  const userId = req.user!.id;
  const { type, metadata } = req.body;

  if (!type || !['view', 'share', 'save', 'vote'].includes(type)) {
    throw new ValidationError('Invalid engagement type', [
      {
        field: 'type',
        message: 'Engagement type must be one of: view, share, save, vote',
        value: type,
      },
    ]);
  }

  // Record engagement
  const engagement = await legislativeStorage.recordBillEngagement({
    bill_id: billId,
    user_id: userId,
    engagement_type: type,
    metadata: metadata || null,
  });

  logger.info({ 
    component: 'BillsRouter',
    bill_id: billId,
    user_id: userId,
    engagement_type: type
  }, 'Engagement recorded');

  res.json({ 
    success: true, 
    message: 'Engagement recorded successfully',
    data: engagement
  });
}));

/**
 * POST /api/comments/:id/endorse
 * Endorse a comment (expert feature)
 */
router.post('/comments/:id/endorse', authenticateToken, asyncHandler(async (req, res) => {
  const context = createErrorContext(req, 'POST /api/comments/:id/endorse');
  const commentId = parseIntParam(req.params.id, 'Comment ID');
  const userId = req.user!.id;

  // Check if user has expert role
  if (req.user!.role !== 'expert' && req.user!.role !== 'admin') {
    throw new BaseError('Only experts can endorse comments', {
      statusCode: 403,
      code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      domain: ErrorDomain.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      details: { commentId, userRole: req.user!.role },
      context,
    });
  }

  // Update endorsement count using updateComment method
  // The method will handle fetching current comment and incrementing
  const updatedComment = await legislativeStorage.updateComment(commentId, {
    endorsements: sql`COALESCE(endorsements, 0) + 1`,
  });

  if (!updatedComment) {
    throw new BaseError('Comment not found', {
      statusCode: 404,
      code: ERROR_CODES.COMMENT_NOT_FOUND,
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.LOW,
      details: { commentId },
      context,
    });
  }

  logger.info({ 
    component: 'BillsRouter',
    comment_id: commentId,
    user_id: userId,
    user_role: req.user!.role
  }, 'Comment endorsed');

  res.json({
    success: true,
    data: updatedComment,
    message: 'Comment endorsed successfully'
  });
}));

/**
 * GET /api/bills/meta/categories
 * Get all available bill categories
 */
router.get('/meta/categories', asyncHandler(async (req, res) => {
  // Define standard Kenyan bill categories
  const categories = [
    { id: 'finance', name: 'Finance & Taxation', description: 'Bills related to taxation, budgets, and financial regulations' },
    { id: 'health', name: 'Health & Medical', description: 'Healthcare, medical services, and public health bills' },
    { id: 'education', name: 'Education', description: 'Education policy, schools, and learning institutions' },
    { id: 'agriculture', name: 'Agriculture', description: 'Farming, livestock, and agricultural development' },
    { id: 'infrastructure', name: 'Infrastructure', description: 'Roads, buildings, and public works' },
    { id: 'security', name: 'Security & Defense', description: 'National security, police, and defense matters' },
    { id: 'environment', name: 'Environment', description: 'Environmental protection and conservation' },
    { id: 'labor', name: 'Labor & Employment', description: 'Workers rights, employment, and labor relations' },
    { id: 'technology', name: 'Technology & ICT', description: 'Digital services, telecommunications, and technology' },
    { id: 'governance', name: 'Governance', description: 'Government operations and public administration' },
    { id: 'justice', name: 'Justice & Legal', description: 'Legal system, courts, and justice administration' },
    { id: 'social', name: 'Social Services', description: 'Social welfare and community services' },
    { id: 'housing', name: 'Housing', description: 'Housing development and urban planning' },
    { id: 'energy', name: 'Energy', description: 'Power generation and energy policy' },
    { id: 'transport', name: 'Transport', description: 'Transportation and mobility' },
  ];

  res.json({ 
    success: true, 
    data: categories,
    count: categories.length
  });
}));

/**
 * GET /api/bills/meta/statuses
 * Get all available bill statuses
 */
router.get('/meta/statuses', asyncHandler(async (req, res) => {
  // Define standard Kenyan legislative bill statuses
  const statuses = [
    { id: 'draft', name: 'Draft', description: 'Bill is being drafted', order: 1 },
    { id: 'introduced', name: 'Introduced', description: 'Bill has been introduced to Parliament', order: 2 },
    { id: 'first_reading', name: 'First Reading', description: 'Bill presented for first reading', order: 3 },
    { id: 'committee', name: 'In Committee', description: 'Bill is under committee review', order: 4 },
    { id: 'second_reading', name: 'Second Reading', description: 'Bill in second reading stage', order: 5 },
    { id: 'third_reading', name: 'Third Reading', description: 'Bill in final reading stage', order: 6 },
    { id: 'passed', name: 'Passed', description: 'Bill has passed Parliament', order: 7 },
    { id: 'presidential_assent', name: 'Presidential Assent', description: 'Awaiting President signature', order: 8 },
    { id: 'enacted', name: 'Enacted', description: 'Bill has become law', order: 9 },
    { id: 'rejected', name: 'Rejected', description: 'Bill was rejected', order: 10 },
    { id: 'withdrawn', name: 'Withdrawn', description: 'Bill was withdrawn', order: 11 },
  ];

  res.json({ 
    success: true, 
    data: statuses,
    count: statuses.length
  });
}));

/**
 * POST /api/bills/:id/polls
 * Create a user poll attached to a bill
 */
router.post('/:id/polls', authenticateToken, asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');
  const { question, options, endDate } = req.body;

  // Validate input
  if (!question || typeof question !== 'string' || question.trim().length < 10) {
    throw new ValidationError('Invalid poll question', [
      {
        field: 'question',
        message: 'Question must be at least 10 characters',
        value: question,
      },
    ]);
  }

  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    throw new ValidationError('Invalid poll options', [
      {
        field: 'options',
        message: 'Must provide between 2 and 10 options',
        value: options,
      },
    ]);
  }

  // Validate each option
  for (const option of options) {
    if (typeof option !== 'string' || option.trim().length === 0) {
      throw new ValidationError('Invalid poll option', [
        {
          field: 'options',
          message: 'All options must be non-empty strings',
          value: option,
        },
      ]);
    }
  }

  // Validate endDate if provided
  if (endDate) {
    const endDateTime = new Date(endDate);
    if (isNaN(endDateTime.getTime()) || endDateTime <= new Date()) {
      throw new ValidationError('Invalid end date', [
        {
          field: 'endDate',
          message: 'End date must be a valid future date',
          value: endDate,
        },
      ]);
    }
  }

  // Verify bill exists
  const bill = await billStorage.getBill(billId);
  if (!bill) {
    throw new BaseError('Bill not found', {
      statusCode: 404,
      code: ERROR_CODES.BILL_NOT_FOUND,
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.LOW,
      details: { billId },
    });
  }

  // Create poll (in-memory for now - can be migrated to database later)
  const poll = {
    id: Date.now(), // Simple ID generation
    billId,
    question: question.trim(),
    options: options.map((text: string, index: number) => ({
      id: Date.now() + index,
      text: text.trim(),
      votes: 0,
    })),
    totalVotes: 0,
    endDate: endDate || null,
    createdAt: new Date().toISOString(),
    createdBy: req.user!.id,
  };

  // Store in cache (temporary storage)
  const cacheKey = `bill:${billId}:polls`;
  const existingPolls = await cacheService.get(cacheKey) || [];
  existingPolls.push(poll);
  await cacheService.set(cacheKey, existingPolls, 86400 * 30); // 30 days

  logger.info({ 
    component: 'BillsRouter',
    bill_id: billId,
    poll_id: poll.id,
    user_id: req.user!.id
  }, 'Poll created');

  res.status(201).json({ 
    success: true, 
    data: poll,
    message: 'Poll created successfully'
  });
}));

/**
 * GET /api/bills/:id/polls
 * Get all polls for a bill
 */
router.get('/:id/polls', asyncHandler(async (req, res) => {
  const billId = parseIntParam(req.params.id, 'Bill ID');

  // Verify bill exists
  const bill = await billStorage.getBill(billId);
  if (!bill) {
    throw new BaseError('Bill not found', {
      statusCode: 404,
      code: ERROR_CODES.BILL_NOT_FOUND,
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.LOW,
      details: { billId },
    });
  }

  // Get polls from cache
  const cacheKey = `bill:${billId}:polls`;
  const polls = await cacheService.get(cacheKey) || [];

  // Filter out expired polls
  const now = new Date();
  const activePolls = polls.filter((poll: any) => {
    if (!poll.endDate) return true;
    return new Date(poll.endDate) > now;
  });

  res.json({ 
    success: true, 
    data: activePolls,
    count: activePolls.length
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

  const commentsRaw = await legislativeStorage.getBillComments(billId);

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

  const newComment = await legislativeStorage.createBillComment(commentData);

  logger.info({ 
    component: 'BillsRouter',
    comment_id: newComment.id,
    bill_id: billId,
    user_id: req.user!.id,
    isReply: !!req.body.parent_id
  }, 'Comment created');

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

  const replies = await legislativeStorage.getCommentReplies(commentId);

  res.json({
    replies,
    count: replies.length,
    parent_id: commentId
  });
}));

/**
 * POST /api/comments/:id/vote
 * Vote on a comment (upvote or downvote)
 */
router.post('/comments/:id/vote', authenticateToken, asyncHandler(async (req, res) => {
  const commentId = parseIntParam(req.params.id, 'Comment ID');
  const { type } = req.body;

  if (!type || !['up', 'down'].includes(type)) {
    throw new ValidationError('Invalid vote type', [
      {
        field: 'type',
        message: 'Vote type must be either "up" or "down"',
        value: type,
      },
    ]);
  }

  // Get current comment
  const [currentComment] = await legislativeStorage.db
    .select()
    .from(legislativeStorage.schema.comments)
    .where(legislativeStorage.eq(legislativeStorage.schema.comments.id, commentId))
    .limit(1);

  if (!currentComment) {
    throw new BaseError('Comment not found', {
      statusCode: 404,
      code: ERROR_CODES.COMMENT_NOT_FOUND,
      domain: ErrorDomain.APPLICATION,
      severity: ErrorSeverity.LOW,
      details: { commentId },
    });
  }

  // Update vote counts
  const updates: any = {};
  if (type === 'up') {
    updates.upvotes = (currentComment.upvotes || 0) + 1;
  } else {
    updates.downvotes = (currentComment.downvotes || 0) + 1;
  }

  const updatedComment = await legislativeStorage.updateComment(commentId, updates);

  logger.info({ 
    component: 'BillsRouter',
    comment_id: commentId,
    user_id: req.user!.id,
    vote_type: type
  }, 'Comment vote recorded');

  res.json({
    success: true,
    data: updatedComment,
    message: 'Vote recorded successfully'
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

  const updatedComment = await legislativeStorage.updateComment(
    commentId,
    { endorsements }
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

  const updatedComment = await legislativeStorage.updateComment(commentId, { isHighlighted: true });

  logger.info({ 
    component: 'BillsRouter',
    comment_id: commentId,
    user_id: req.user!.id,
    user_role: req.user!.role
  }, 'Comment highlighted');

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

  const updatedComment = await legislativeStorage.updateComment(commentId, { isHighlighted: false });

  logger.info({ 
    component: 'BillsRouter',
    comment_id: commentId,
    user_id: req.user!.id,
    user_role: req.user!.role
  }, 'Comment highlight removed');

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

  // Cache stats are not available in BillStorage, return empty stats
  const stats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0
  };

  res.json({
    cacheStats: stats,
    timestamp: new Date().toISOString(),
    message: 'Cache statistics not available in current implementation'
  });
}));

/**
 * All errors are now handled by the unified error middleware
 * (createUnifiedErrorMiddleware) which is registered in server/index.ts
 */

export { router };