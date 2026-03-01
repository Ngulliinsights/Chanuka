/**
 * Community API Routes
 * REST endpoints for community discussions and argument analysis
 */

import { Router } from 'express';
import { communityApplicationService } from '../../application/CommunityApplicationService';
import { logger } from '@server/infrastructure/observability';

const router = Router();

// ============================================================================
// COMMENT MANAGEMENT
// ============================================================================

/**
 * POST /api/community/comments
 * Create a new comment on a bill
 */
router.post('/comments', async (req, res) => {
  try {
    const result = await communityApplicationService.createComment(req.body);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error creating comment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/community/comments/:id
 * Get a single comment with optional enrichments
 */
router.get('/comments/:id', async (req, res) => {
  try {
    const result = await communityApplicationService.getComment({
      comment_id: req.params.id,
      include_analysis: req.query.include_analysis === 'true',
      include_related: req.query.include_related === 'true',
      include_counter_arguments: req.query.include_counter_arguments === 'true',
    });
    
    if (result.success) {
      if (result.data) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Comment not found',
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error fetching comment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/community/bills/:billId/comments
 * Get all comments for a bill with filtering and sorting
 */
router.get('/bills/:billId/comments', async (req, res) => {
  try {
    const result = await communityApplicationService.getComments({
      bill_id: req.params.billId,
      parent_id: req.query.parent_id as string | undefined,
      sort_by: (req.query.sort_by as 'recent' | 'votes' | 'quality') || 'recent',
      min_quality_score: req.query.min_quality_score 
        ? parseFloat(req.query.min_quality_score as string)
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error fetching comments', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PATCH /api/community/comments/:id
 * Update a comment
 */
router.patch('/comments/:id', async (req, res) => {
  try {
    const result = await communityApplicationService.updateComment({
      comment_id: req.params.id,
      content: req.body.content,
      reanalyze: req.body.reanalyze || false,
    });
    
    if (result.success) {
      if (result.data) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Comment not found',
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error updating comment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/community/comments/:id
 * Soft delete a comment
 */
router.delete('/comments/:id', async (req, res) => {
  try {
    const result = await communityApplicationService.deleteComment({
      comment_id: req.params.id,
    });
    
    if (result.success) {
      res.json({
        success: true,
        deleted: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error deleting comment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================================================
// VOTING
// ============================================================================

/**
 * POST /api/community/comments/:id/vote
 * Vote on a comment (up, down, or remove)
 */
router.post('/comments/:id/vote', async (req, res) => {
  try {
    const result = await communityApplicationService.voteComment({
      comment_id: req.params.id,
      vote: req.body.vote,
      reason: req.body.reason,
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error voting on comment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================================================
// ARGUMENT INTELLIGENCE
// ============================================================================

/**
 * POST /api/community/comments/:id/analyze
 * Analyze a comment's argument quality
 */
router.post('/comments/:id/analyze', async (req, res) => {
  try {
    const result = await communityApplicationService.analyzeComment({
      comment_id: req.params.id,
      force_reanalysis: req.body.force_reanalysis || false,
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error analyzing comment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/community/comments/:id/related
 * Find related arguments
 */
router.get('/comments/:id/related', async (req, res) => {
  try {
    const result = await communityApplicationService.findRelatedArguments({
      comment_id: req.params.id,
      similarity_threshold: req.query.threshold 
        ? parseFloat(req.query.threshold as string)
        : 0.7,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5,
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error finding related arguments', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/community/bills/:billId/argument-clusters
 * Get argument clusters for a bill
 */
router.get('/bills/:billId/argument-clusters', async (req, res) => {
  try {
    const result = await communityApplicationService.getArgumentClusters({
      bill_id: req.params.billId,
      min_cluster_size: req.query.min_size 
        ? parseInt(req.query.min_size as string, 10)
        : 3,
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error fetching argument clusters', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/community/bills/:billId/debate-quality
 * Get debate quality metrics for a bill
 */
router.get('/bills/:billId/debate-quality', async (req, res) => {
  try {
    const result = await communityApplicationService.getDebateQuality({
      bill_id: req.params.billId,
      time_period: (req.query.period as 'day' | 'week' | 'month' | 'all') || 'all',
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error fetching debate quality', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
