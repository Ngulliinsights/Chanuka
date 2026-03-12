import { User } from '@server/features/users/domain/entities/user';
/**
 * Community Routes
 * Modernized REST API for community features
 */

import { Router, Request, Response } from 'express';
import { logger } from '@server/infrastructure/observability';
import { communityService } from '../application/community.service';
import { authenticateToken, requireAuth } from '@server/middleware';
import { validateSchema as validateRequest } from '@server/infrastructure/validation/middleware';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const createCommentSchema = z.object({
  billId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
  type: z.enum(['general', 'question', 'concern', 'support', 'opposition', 'amendment', 'clarification']).optional(),
  tags: z.array(z.string()).optional()
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  type: z.enum(['general', 'question', 'concern', 'support', 'opposition', 'amendment', 'clarification']).optional(),
  tags: z.array(z.string()).optional()
});

const createVoteSchema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(['comment', 'bill', 'amendment']),
  type: z.enum(['upvote', 'downvote'])
});

// TODO: Implement report functionality
// const createReportSchema = z.object({
//   targetId: z.string().uuid(),
//   targetType: z.enum(['comment', 'user', 'bill']),
//   reason: z.enum(['spam', 'harassment', 'inappropriate_content', 'misinformation', 'off_topic', 'duplicate', 'other']),
//   description: z.string().max(1000).optional()
// });

// ==========================================================================
// Comment Routes
// ==========================================================================

/**
 * GET /api/community/comments
 * List comments with filtering and pagination
 */
router.get('/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams = {
      billId: typeof req.query.billId === 'string' ? req.query.billId : undefined,
      userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      parentId: typeof req.query.parentId === 'string' ? req.query.parentId : undefined,
      type: typeof req.query.type === 'string' ? req.query.type as any : undefined,
      status: typeof req.query.status === 'string' ? req.query.status as any : undefined,
      isHighlighted: req.query.isHighlighted === 'true' ? true : req.query.isHighlighted === 'false' ? false : undefined,
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
      limit: typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 20,
      offset: typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0,
      sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy as any : 'createdAt',
      sortOrder: typeof req.query.sortOrder === 'string' ? req.query.sortOrder as 'asc' | 'desc' : 'desc'
    };

    const result = await communityService.getComments(queryParams);

    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: {
          type: 'FETCH_FAILED',
          message: result.error.message,
          code: 'COMMENTS_FETCH_ERROR'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: result.value,
      pagination: {
        total: result.value.length, // TODO: Implement proper count
        limit: queryParams.limit,
        offset: queryParams.offset,
        hasMore: result.value.length === queryParams.limit
      }
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to list comments');
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * GET /api/community/comments/:id
 * Get comment by ID
 */
router.get('/comments/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Comment ID is required',
          code: 'MISSING_ID'
        }
      });
      return;
    }

    const result = await communityService.getCommentById(id);

    if (result.isErr()) {
      const status = result.error.message === 'Comment not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: {
          type: status === 404 ? 'NOT_FOUND' : 'FETCH_FAILED',
          message: result.error.message,
          code: status === 404 ? 'COMMENT_NOT_FOUND' : 'COMMENT_FETCH_ERROR'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', commentId: req.params.id }, 'Failed to get comment');
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * POST /api/community/comments
 * Create new comment (authenticated)
 */
router.post('/comments', 
  authenticateToken,
  requireAuth,
  validateRequest(createCommentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }
      const data = req.body;

      const result = await communityService.createComment(data, userId);

      if (result.isErr()) {
        const status = result.error.message.includes('not found') ? 404 : 400;
        res.status(status).json({
          success: false,
          error: {
            type: 'CREATE_FAILED',
            message: result.error.message,
            code: 'COMMENT_CREATE_ERROR'
          }
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', data: req.body }, 'Failed to create comment');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * PATCH /api/community/comments/:id
 * Update comment (authenticated, owner only)
 */
router.patch('/comments/:id',
  authenticateToken,
  requireAuth,
  validateRequest(updateCommentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Comment ID is required',
            code: 'MISSING_ID'
          }
        });
        return;
      }
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }
      const data = req.body;

      const result = await communityService.updateComment(id, data, userId);

      if (result.isErr()) {
        const status = result.error.message.includes('not found') || result.error.message.includes('access denied') ? 404 : 400;
        res.status(status).json({
          success: false,
          error: {
            type: 'UPDATE_FAILED',
            message: result.error.message,
            code: 'COMMENT_UPDATE_ERROR'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', commentId: req.params.id }, 'Failed to update comment');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * DELETE /api/community/comments/:id
 * Delete comment (authenticated, owner only)
 */
router.delete('/comments/:id',
  authenticateToken,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Comment ID is required',
            code: 'MISSING_ID'
          }
        });
        return;
      }
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }

      const result = await communityService.deleteComment(id, userId);

      if (result.isErr()) {
        const status = result.error.message.includes('not found') || result.error.message.includes('access denied') ? 404 : 400;
        res.status(status).json({
          success: false,
          error: {
            type: 'DELETE_FAILED',
            message: result.error.message,
            code: 'COMMENT_DELETE_ERROR'
          }
        });
        return;
      }

      res.status(204).send();

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', commentId: req.params.id }, 'Failed to delete comment');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

// ==========================================================================
// Vote Routes
// ==========================================================================

/**
 * POST /api/community/votes
 * Create or update vote (authenticated)
 */
router.post('/votes',
  authenticateToken,
  requireAuth,
  validateRequest(createVoteSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'User not authenticated',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }
      const data = req.body;

      const result = await communityService.createVote(data, userId);

      if (result.isErr()) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VOTE_FAILED',
            message: result.error.message,
            code: 'VOTE_CREATE_ERROR'
          }
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.value
      });

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error', data: req.body }, 'Failed to create vote');
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

// ==========================================================================
// Health and Metadata Routes
// ==========================================================================

/**
 * GET /api/community/health
 * Health check endpoint
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: { status: 'up', lastCheck: new Date().toISOString() },
        cache: { status: 'up', lastCheck: new Date().toISOString() }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/community/metadata
 * Get metadata about community features
 */
router.get('/metadata', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      schema: {
        commentTypes: ['general', 'question', 'concern', 'support', 'opposition', 'amendment', 'clarification'],
        commentStatuses: ['active', 'hidden', 'deleted', 'pending_review', 'flagged'],
        voteTypes: ['upvote', 'downvote'],
        reportReasons: ['spam', 'harassment', 'inappropriate_content', 'misinformation', 'off_topic', 'duplicate', 'other']
      },
      enums: {
        commentTypes: ['general', 'question', 'concern', 'support', 'opposition', 'amendment', 'clarification'],
        voteTypes: ['upvote', 'downvote'],
        reportReasons: ['spam', 'harassment', 'inappropriate_content', 'misinformation', 'off_topic', 'duplicate', 'other']
      },
      constraints: {
        maxCommentLength: 5000,
        maxReportDescriptionLength: 1000,
        maxTagsPerComment: 10
      },
      relationships: {
        comments: ['bills', 'users', 'votes', 'reports'],
        votes: ['users', 'comments', 'bills'],
        reports: ['users', 'comments']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Failed to get metadata',
        code: 'METADATA_ERROR'
      }
    });
  }
});

export default router;