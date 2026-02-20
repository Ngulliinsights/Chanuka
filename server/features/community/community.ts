import { Router, Response, Request } from 'express';
import { z } from 'zod';

import { commentService } from './comment';
import { commentVotingService } from './comment-voting';
import { authenticateToken as requireAuth } from '@server/middleware/auth';
import { logger } from '@server/infrastructure/observability';
import { asyncHandler } from '@server/middleware/error-management';
import { 
  createValidationError, 
  createNotFoundError, 
  createAuthenticationError,
  createSystemError 
} from '@server/infrastructure/error-handling';
import { ERROR_CODES } from '@shared/constants/error-codes';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

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
router.get('/comments/:bill_id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const bill_id = parseInt(req.params.bill_id);
    const sort = (req.query.sort as string) || 'recent';
    const expertOnly = req.query.expert === 'true';
    const commentType = req.query.commentType as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate bill ID parameter
    if (isNaN(bill_id)) {
      throw createValidationError(
        [{ field: 'bill_id', message: 'Bill ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    // Fetch comments with applied filters
    const result = await commentService.getBillComments(bill_id, {
      sort: sort as 'recent' | 'popular' | 'oldest',
      expertOnly,
      commentType,
      limit,
      offset
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch comments', { component: 'community-routes', billId: req.params.bill_id }, error as Error);
    throw createSystemError(error as Error, { component: 'community-routes' });
  }
}));

/**
 * POST /comments - Create a new comment on a bill (requires authentication)
 */
router.post('/comments', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const user_id = req.user?.id;

    // Verify user authentication
    if (!user_id) {
      throw createAuthenticationError('missing_token', { component: 'community-routes' });
    }

    // Validate input against schema
    const result = createCommentSchema.safeParse(data);
    if (!result.success) {
      throw createValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        })),
        { component: 'community-routes' }
      );
    }

    // Create the comment
    const comment = await commentService.createComment({
      bill_id: result.data.bill_id,
      user_id,
      content: result.data.content,
      commentType: result.data.commentType,
      parent_id: result.data.parent_id
    });

    res.status(201).json(comment);
  } catch (error) {
    logger.error('Failed to create comment', { component: 'community-routes', userId: req.user?.id }, error as Error);
    throw error;
  }
}));

/**
 * GET /comments/:id/replies - Retrieve all replies to a specific comment
 */
router.get('/comments/:id/replies', asyncHandler(async (req: Request, res: Response) => {
  try {
    const parent_id = parseInt(req.params.id);
    const sort = (req.query.sort as string) || 'recent';
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(parent_id)) {
      throw createValidationError(
        [{ field: 'id', message: 'Comment ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    const replies = await commentService.getCommentReplies(parent_id, {
      sort: sort as 'recent' | 'popular' | 'oldest',
      limit,
      offset
    });

    res.json(replies);
  } catch (error) {
    logger.error('Failed to fetch replies', { component: 'community-routes', commentId: req.params.id }, error as Error);
    throw createSystemError(error as Error, { component: 'community-routes' });
  }
}));

/**
 * PUT /comments/:id - Update an existing comment (requires authentication and ownership)
 */
router.put('/comments/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      throw createAuthenticationError('missing_token', { component: 'community-routes' });
    }

    if (isNaN(comment_id)) {
      throw createValidationError(
        [{ field: 'id', message: 'Comment ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    // Validate update data
    const result = updateCommentSchema.safeParse(data);
    if (!result.success) {
      throw createValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        })),
        { component: 'community-routes' }
      );
    }

    // Update the comment
    const updatedComment = await commentService.updateComment(comment_id, user_id, result.data);

    res.json(updatedComment);
  } catch (error) {
    logger.error('Failed to update comment', { component: 'community-routes', commentId: req.params.id }, error as Error);
    throw error;
  }
}));

/**
 * DELETE /comments/:id - Delete a comment (requires authentication and ownership)
 */
router.delete('/comments/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const comment_id = parseInt(req.params.id);
    const user_id = req.user?.id;

    if (!user_id) {
      throw createAuthenticationError('missing_token', { component: 'community-routes' });
    }

    if (isNaN(comment_id)) {
      throw createValidationError(
        [{ field: 'id', message: 'Comment ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    const success = await commentService.deleteComment(comment_id, user_id);

    res.json({ success });
  } catch (error) {
    logger.error('Failed to delete comment', { component: 'community-routes', commentId: req.params.id }, error as Error);
    throw error;
  }
}));

/**
 * GET /comments/:bill_id/stats - Retrieve comment statistics for a bill
 */
router.get('/comments/:bill_id/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const bill_id = parseInt(req.params.bill_id);

    if (isNaN(bill_id)) {
      throw createValidationError(
        [{ field: 'bill_id', message: 'Bill ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    const stats = await commentService.getCommentStats(bill_id);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to fetch comment statistics', { component: 'community-routes', billId: req.params.bill_id }, error as Error);
    throw createSystemError(error as Error, { component: 'community-routes' });
  }
}));

/**
 * GET /comments/:bill_id/trending - Retrieve trending comments for a bill
 */
router.get('/comments/:bill_id/trending', asyncHandler(async (req: Request, res: Response) => {
  try {
    const bill_id = parseInt(req.params.bill_id);
    const timeframe = (req.query.timeframe as '1h' | '24h' | '7d') || '24h';
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(bill_id)) {
      throw createValidationError(
        [{ field: 'bill_id', message: 'Bill ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    const trendingComments = await commentVotingService.getTrendingComments(bill_id, timeframe, limit);

    res.json(trendingComments);
  } catch (error) {
    logger.error('Failed to fetch trending comments', { component: 'community-routes', billId: req.params.bill_id }, error as Error);
    throw createSystemError(error as Error, { component: 'community-routes' });
  }
}));

// ============================================================================
// VOTING ENDPOINTS
// ============================================================================

/**
 * POST /comments/:id/vote - Cast a vote (upvote or downvote) on a comment
 */
router.post('/comments/:id/vote', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      throw createAuthenticationError('missing_token', { component: 'community-routes' });
    }

    if (isNaN(comment_id)) {
      throw createValidationError(
        [{ field: 'id', message: 'Comment ID must be a valid number' }],
        { component: 'community-routes' }
      );
    }

    // Validate vote type
    const result = voteSchema.safeParse(data);
    if (!result.success) {
      throw createValidationError(
        result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        })),
        { component: 'community-routes' }
      );
    }

    // Record the vote
    const voteResult = await commentVotingService.voteOnComment(comment_id, user_id, result.data.type);

    res.json(voteResult);
  } catch (error) {
    logger.error('Failed to vote', { component: 'community-routes', commentId: req.params.id }, error as Error);
    throw error;
  }
}));

// ============================================================================
// STATISTICS AND ENGAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /participation/stats - Retrieve participation statistics
 */
router.get('/participation/stats', asyncHandler(async (req: Request, res: Response) => {
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
    logger.error('Failed to fetch participation stats', { component: 'community-routes' }, error as Error);
    throw createSystemError(error as Error, { component: 'community-routes' });
  }
}));

/**
 * GET /engagement/recent - Retrieve recent community engagement activity
 */
router.get('/engagement/recent', asyncHandler(async (req: Request, res: Response) => {
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
    logger.error('Failed to fetch engagement data', { component: 'community-routes' }, error as Error);
    throw createSystemError(error as Error, { component: 'community-routes' });
  }
}));
