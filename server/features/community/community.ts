import { Router, Response } from 'express';
import { z } from 'zod';

import { commentService } from '@server/features/community/comment-voting.ts';
import { commentVotingService } from '@server/features/community/comment-voting.ts';
import { authenticateToken as requireAuth } from '@server/middleware/auth.js';
import { contentModerationService } from '@shared/admin/content-moderation.js';
import { logger } from '@shared/core';
import { asyncHandler } from '@/middleware/error-management';
import { BaseError, ValidationError } from '@shared/core/observability/error-management';
import { ERROR_CODES, ErrorDomain, ErrorSeverity } from '@shared/constants';
import { createErrorContext } from '@shared/core/observability/distributed-tracing';

export const router = Router();

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const createCommentSchema = z.object({
  bill_id: z.coerce.number().int().positive(),
  content: z.string().min(10).max(2000),
  commentType: z.enum(['general', 'expert_analysis', 'concern', 'support']).optional(),
  parent_id: z.coerce.number().int().positive().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(10).max(2000).optional(),
  commentType: z.enum(['general', 'expert_analysis', 'concern', 'support']).optional(),
});

const voteSchema = z.object({
  type: z.enum(['up', 'down']),
});

const flagContentSchema = z.object({
  flagType: z.enum(['spam', 'harassment', 'misinformation', 'inappropriate', 'off_topic', 'hate_speech']),
  reason: z.string().min(10).max(500),
});

const createPollSchema = z.object({
  bill_id: z.string(),
  question: z.string().min(5).max(200),
  options: z.array(z.string()).min(2).max(6),
  section: z.string().optional(),
});

const pollVoteSchema = z.object({
  optionIndex: z.number().min(0),
});

// ============================================================================
// COMMENT ENDPOINTS
// ============================================================================

/**
 * GET /comments/:bill_id - Retrieve all comments for a bill with filtering
 */
router.get('/comments/:bill_id', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/community/comments/:bill_id');

  try {
    const bill_id = parseInt(req.params.bill_id);
    const sort = (req.query.sort as string) || 'recent';
    const expertOnly = req.query.expert === 'true';
    const commentType = req.query.commentType as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate bill ID parameter
    if (isNaN(bill_id)) {
      throw new ValidationError('Invalid bill ID', [
        { field: 'bill_id', message: 'Bill ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    // Fetch comments with applied filters
    const result = await commentService.getBillComments(bill_id, {
      sort: sort as unknown,
      expertOnly,
      commentType,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to fetch comments', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch comments', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', billId: req.params.bill_id }
    });
  }
}));

/**
 * POST /comments - Create a new comment on a bill (requires authentication)
 */
router.post('/comments', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/community/comments');

  try {
    const data = req.body;
    const user_id = (req as any).user?.id;

    // Verify user authentication
    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'community-routes' }
      });
    }

    // Validate input against schema
    const result = createCommentSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid comment data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    // Create the comment
    const comment = await commentService.createComment({
      bill_id: result.data.bill_id,
      user_id,
      content: result.data.content,
      commentType: result.data.commentType,
      parent_id: result.data.parent_id
    });

    // Analyze content for moderation (async, don't block response)
    if (comment && typeof comment === 'object' && 'id' in comment) {
      contentModerationService.flagContent(
        'comment',
        comment.id as number,
        'spam',
        'Automated content analysis',
        user_id
      ).catch(err => logger.error('Content moderation failed:', { component: 'community-routes' }, err));
    }

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to create comment', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to create comment', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', userId: (req as any).user?.id }
    });
  }
}));

/**
 * GET /comments/:id/replies - Retrieve all replies to a specific comment
 */
router.get('/comments/:id/replies', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/community/comments/:id/replies');

  try {
    const parent_id = parseInt(req.params.id);
    const sort = (req.query.sort as string) || 'recent';
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(parent_id)) {
      throw new ValidationError('Invalid comment ID', [
        { field: 'id', message: 'Comment ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    const replies = await commentService.getCommentReplies(parent_id, {
      sort: sort as unknown,
      limit,
      offset
    });

    res.json(replies);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to fetch replies', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch replies', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', commentId: req.params.id }
    });
  }
}));

/**
 * PUT /comments/:id - Update an existing comment (requires authentication and ownership)
 */
router.put('/comments/:id', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /api/community/comments/:id');

  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'community-routes' }
      });
    }

    if (isNaN(comment_id)) {
      throw new ValidationError('Invalid comment ID', [
        { field: 'id', message: 'Comment ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    // Validate update data
    const result = updateCommentSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid comment data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    // Update the comment
    const updatedComment = await commentService.updateComment(comment_id, user_id, result.data);

    res.json(updatedComment);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to update comment', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to update comment', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', commentId: req.params.id }
    });
  }
}));

/**
 * DELETE /comments/:id - Delete a comment (requires authentication and ownership)
 */
router.delete('/comments/:id', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'DELETE /api/community/comments/:id');

  try {
    const comment_id = parseInt(req.params.id);
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'community-routes' }
      });
    }

    if (isNaN(comment_id)) {
      throw new ValidationError('Invalid comment ID', [
        { field: 'id', message: 'Comment ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    const success = await commentService.deleteComment(comment_id, user_id);

    res.json({ success });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to delete comment', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to delete comment', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', commentId: req.params.id }
    });
  }
}));

/**
 * GET /comments/:bill_id/stats - Retrieve comment statistics for a bill
 */
router.get('/comments/:bill_id/stats', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/community/comments/:bill_id/stats');

  try {
    const bill_id = parseInt(req.params.bill_id);

    if (isNaN(bill_id)) {
      throw new ValidationError('Invalid bill ID', [
        { field: 'bill_id', message: 'Bill ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    const stats = await commentService.getCommentStats(bill_id);

    res.json(stats);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to fetch comment statistics', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch comment statistics', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', billId: req.params.bill_id }
    });
  }
}));

/**
 * GET /comments/:bill_id/trending - Retrieve trending comments for a bill
 */
router.get('/comments/:bill_id/trending', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/community/comments/:bill_id/trending');

  try {
    const bill_id = parseInt(req.params.bill_id);
    const timeframe = (req.query.timeframe as '1h' | '24h' | '7d') || '24h';
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(bill_id)) {
      throw new ValidationError('Invalid bill ID', [
        { field: 'bill_id', message: 'Bill ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    const trendingComments = await commentVotingService.getTrendingComments(bill_id, timeframe, limit);

    res.json(trendingComments);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to fetch trending comments', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch trending comments', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', billId: req.params.bill_id }
    });
  }
}));

// ============================================================================
// VOTING ENDPOINTS
// ============================================================================

/**
 * POST /comments/:id/vote - Cast a vote (upvote or downvote) on a comment
 */
router.post('/comments/:id/vote', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/community/comments/:id/vote');

  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'community-routes' }
      });
    }

    if (isNaN(comment_id)) {
      throw new ValidationError('Invalid comment ID', [
        { field: 'id', message: 'Comment ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    // Validate vote type
    const result = voteSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid vote data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    // Record the vote
    const voteResult = await commentVotingService.voteOnComment(comment_id, user_id, result.data.type);

    res.json(voteResult);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to vote', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to vote', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', commentId: req.params.id }
    });
  }
}));

// ============================================================================
// MODERATION ENDPOINTS
// ============================================================================

/**
 * POST /comments/:id/flag - Flag a comment for moderation review
 */
router.post('/comments/:id/flag', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/community/comments/:id/flag');

  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      throw new BaseError('Authentication required', {
        statusCode: 401,
        code: ERROR_CODES.NOT_AUTHENTICATED,
        domain: ErrorDomain.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        details: { component: 'community-routes' }
      });
    }

    if (isNaN(comment_id)) {
      throw new ValidationError('Invalid comment ID', [
        { field: 'id', message: 'Comment ID must be a valid number', code: 'INVALID_FORMAT' }
      ]);
    }

    // Validate flag data
    const result = flagContentSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid flag data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    // Submit the flag
    const flag = await contentModerationService.flagContent(
      'comment',
      comment_id,
      result.data.flagType,
      result.data.reason,
      user_id
    );

    const flagId = flag && typeof flag === 'object' && 'id' in flag ? flag.id : undefined;

    res.json({ success: true, flagId });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) {
      throw error;
    }

    logger.error('Failed to flag comment', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to flag comment', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', commentId: req.params.id }
    });
  }
}));

/**
 * POST /comments/:id/highlight - Highlight a comment (for moderator/admin use)
 */
router.post('/comments/:id/highlight', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/community/comments/:id/highlight');

  try {
    // TODO: Implement actual highlight functionality
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to highlight comment', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to highlight comment', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes' }
    });
  }
}));

// ============================================================================
// POLL ENDPOINTS
// ============================================================================

/**
 * POST /polls - Create a new community poll for a bill
 */
router.post('/polls', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/community/polls');

  try {
    const data = req.body;

    // Validate poll data
    const result = createPollSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid poll data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    // TODO: Implement actual poll creation in database
    const pollId = Date.now().toString();

    res.status(201).json({ success: true, id: pollId });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to create poll', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to create poll', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes', userId: (req as any).user?.id }
    });
  }
}));

/**
 * POST /comments/:id/poll-vote - Cast a vote on a poll option
 */
router.post('/comments/:id/poll-vote', requireAuth, asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /api/community/comments/:id/poll-vote');

  try {
    const data = req.body;

    // Validate vote data
    const result = pollVoteSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid poll vote data', result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: 'VALIDATION_ERROR'
      })));
    }

    // TODO: Implement actual poll voting
    res.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error('Failed to vote on poll', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to vote on poll', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes' }
    });
  }
}));

// ============================================================================
// STATISTICS AND ENGAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /participation/stats - Retrieve participation statistics
 */
router.get('/participation/stats', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/community/participation/stats');

  try {
    const bill_id = req.query.bill_id ? parseInt(req.query.bill_id as string) : undefined;

    if (bill_id && !isNaN(bill_id)) {
      // Get stats for specific bill
      const billStats = await commentService.getCommentStats(bill_id);
      const voteStats = await commentVotingService.getBillCommentVoteSummary(bill_id);

      const stats = {
        totalComments: billStats.totalComments,
        expertComments: billStats.expertComments,
        verifiedComments: billStats.verifiedComments,
        totalVotes: voteStats.totalVotes,
        averageEngagement: billStats.averageEngagement,
        topContributors: billStats.topContributors
      };

      res.json(stats);
    } else {
      // Return platform-wide statistics
      const stats = {
        totalComments: 1247,
        activeParticipants: 892,
        expertContributions: 156,
        verifiedAnalyses: 89,
        communityPolls: 23,
        impactfulFeedback: 67
      };

      res.json(stats);
    }
  } catch (error) {
    logger.error('Failed to fetch participation stats', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch participation statistics', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes' }
    });
  }
}));

/**
 * GET /engagement/recent - Retrieve recent community engagement activity
 */
router.get('/engagement/recent', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /api/community/engagement/recent');

  try {
    // TODO: Replace with actual database queries
    const recentActivity = [
      {
        type: 'comment',
        billTitle: 'Digital Economy and Data Protection Act 2024',
        contributor: 'Dr. Amina Hassan',
        action: 'provided constitutional analysis',
        timestamp: new Date('2024-01-19T16:30:00Z'),
        impact: 'high'
      },
      {
        type: 'poll_created',
        billTitle: 'Climate Change Adaptation Fund Bill 2024',
        contributor: 'Community Coalition',
        action: 'created stakeholder poll',
        timestamp: new Date('2024-01-19T15:45:00Z'),
        impact: 'medium'
      }
    ];

    res.json(recentActivity);
  } catch (error) {
    logger.error('Failed to fetch engagement data', { component: 'community-routes', context }, error as Record<string, unknown> | undefined);

    throw new BaseError('Failed to fetch engagement data', {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      details: { component: 'community-routes' }
    });
  }
}));
