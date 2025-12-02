import { Router } from "express";
import { z } from "zod";
import { ApiSuccess, ApiValidationError, ApiResponseWrapper  } from '@shared/core/utils/api';
import { commentService } from "./comment.js";
import { commentVotingService } from "./comment-voting.js";
import { contentModerationService } from '@shared/admin/content-moderation.js';
import { authenticateToken as requireAuth } from '@server/middleware/auth.js';
import { logger   } from '@shared/core';

export const router = Router();

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const createCommentSchema = z.object({ bill_id: z.coerce.number().int().positive(),
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

const createPollSchema = z.object({ bill_id: z.string(),
  question: z.string().min(5).max(200),
  options: z.array(z.string()).min(2).max(6),
  section: z.string().optional(),
 });

const pollVoteSchema = z.object({
  optionIndex: z.number().min(0),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to handle API errors consistently
 * Converts unknown error types to proper error responses
 */
function handleApiError(res: any, error: unknown, message: string, startTime: number) {
  // Log the full error for debugging
  logger.error(message, { component: 'Chanuka' }, error);
  
  // Extract error details safely
  const errorDetails = error instanceof Error ? { message: error.message } : undefined;
  
  // Return standardized error response
  return res.status(500).json({
    success: false,
    message,
    error: errorDetails,
    metadata: ApiResponseWrapper.createMetadata(startTime, 'database')
  });
}

/**
 * Helper to create error responses with proper typing
 */
function createErrorResponse(res: any, message: string, statusCode: number, startTime: number, source: 'database' | 'cache' | 'fallback' | 'static' = 'database') {
  return res.status(statusCode).json({
    success: false,
    message,
    metadata: ApiResponseWrapper.createMetadata(startTime, source)
  });
}

// ============================================================================
// COMMENT ENDPOINTS
// ============================================================================

/**
 * GET /comments/:bill_id
 * Retrieves all comments for a specific bill with filtering and sorting options
 */
router.get("/comments/:bill_id", async (req, res) => { const startTime = Date.now();
  
  try {
    const bill_id = parseInt(req.params.bill_id);
    const sort = req.query.sort as string || "recent";
    const expertOnly = req.query.expert === "true";
    const commentType = req.query.commentType as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate bill ID parameter
    if (isNaN(bill_id)) {
      return createErrorResponse(res, "Invalid bill ID", 400, startTime);
     }

    // Fetch comments with applied filters
    const result = await commentService.getBillComments(bill_id, {
      sort: sort as any,
      expertOnly,
      commentType,
      limit,
      offset
    });

    return ApiSuccess(res, result, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch comments", startTime);
  }
});

/**
 * POST /comments
 * Creates a new comment on a bill (requires authentication)
 */
router.post("/comments", requireAuth, async (req, res) => { const startTime = Date.now();
  
  try {
    const data = req.body;
    const user_id = (req as any).user?.id;

    // Verify user authentication
    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
     }
    
    // Validate input against schema
    const result = createCommentSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    // Create the comment
    const comment = await commentService.createComment({ bill_id: result.data.bill_id,
      user_id,
      content: result.data.content,
      commentType: result.data.commentType,
      parent_id: result.data.parent_id
      });

    // Analyze content for moderation (async, don't block response)
    // Note: Using comment.id after creation rather than before
    if (comment && typeof comment === 'object' && 'id' in comment) { contentModerationService.flagContent(
        'comment',
        comment.id as number,
        'spam', // Default flag type for analysis
        'Automated content analysis',
        user_id
      ).catch(err => logger.error('Content moderation failed:', { component: 'Chanuka'  }, err));
    }
    
    return ApiSuccess(res, comment, 
      ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
  } catch (error) {
    return handleApiError(res, error, "Failed to create comment", startTime);
  }
});

/**
 * GET /comments/:id/replies
 * Retrieves all replies to a specific comment
 */
router.get("/comments/:id/replies", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const parent_id = parseInt(req.params.id);
    const sort = req.query.sort as string || "recent";
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(parent_id)) {
      return createErrorResponse(res, "Invalid comment ID", 400, startTime);
    }

    const replies = await commentService.getCommentReplies(parent_id, {
      sort: sort as any,
      limit,
      offset
    });

    return ApiSuccess(res, replies, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch replies", startTime);
  }
});

/**
 * PUT /comments/:id
 * Updates an existing comment (requires authentication and ownership)
 */
router.put("/comments/:id", requireAuth, async (req, res) => { const startTime = Date.now();
  
  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
     }

    if (isNaN(comment_id)) {
      return createErrorResponse(res, "Invalid comment ID", 400, startTime);
    }
    
    // Validate update data
    const result = updateCommentSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    // Update the comment
    const updatedComment = await commentService.updateComment(
      comment_id,
      user_id,
      result.data
    );
    
    return ApiSuccess(res, updatedComment, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to update comment", startTime);
  }
});

/**
 * DELETE /comments/:id
 * Deletes a comment (requires authentication and ownership)
 */
router.delete("/comments/:id", requireAuth, async (req, res) => { const startTime = Date.now();
  
  try {
    const comment_id = parseInt(req.params.id);
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
     }

    if (isNaN(comment_id)) {
      return createErrorResponse(res, "Invalid comment ID", 400, startTime);
    }

    const success = await commentService.deleteComment(comment_id, user_id);
    
    return ApiSuccess(res, { success }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to delete comment", startTime);
  }
});

/**
 * GET /comments/:bill_id/stats
 * Retrieves comment statistics for a specific bill
 */
router.get("/comments/:bill_id/stats", async (req, res) => { const startTime = Date.now();
  
  try {
    const bill_id = parseInt(req.params.bill_id);

    if (isNaN(bill_id)) {
      return createErrorResponse(res, "Invalid bill ID", 400, startTime);
     }

    const stats = await commentService.getCommentStats(bill_id);
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch comment statistics", startTime);
  }
});

/**
 * GET /comments/:bill_id/trending
 * Retrieves trending comments for a bill based on engagement
 */
router.get("/comments/:bill_id/trending", async (req, res) => { const startTime = Date.now();
  
  try {
    const bill_id = parseInt(req.params.bill_id);
    const timeframe = req.query.timeframe as '1h' | '24h' | '7d' || '24h';
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(bill_id)) {
      return createErrorResponse(res, "Invalid bill ID", 400, startTime);
     }

    const trendingComments = await commentVotingService.getTrendingComments(
      bill_id,
      timeframe,
      limit
    );
    
    return ApiSuccess(res, trendingComments, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch trending comments", startTime);
  }
});

// ============================================================================
// VOTING ENDPOINTS
// ============================================================================

/**
 * POST /comments/:id/vote
 * Casts a vote (upvote or downvote) on a comment
 */
router.post("/comments/:id/vote", requireAuth, async (req, res) => { const startTime = Date.now();
  
  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
     }

    if (isNaN(comment_id)) {
      return createErrorResponse(res, "Invalid comment ID", 400, startTime);
    }
    
    // Validate vote type
    const result = voteSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // Record the vote
    const voteResult = await commentVotingService.voteOnComment(
      comment_id,
      user_id,
      result.data.type
    );
    
    return ApiSuccess(res, voteResult, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to vote", startTime);
  }
});

// ============================================================================
// MODERATION ENDPOINTS
// ============================================================================

/**
 * POST /comments/:id/flag
 * Flags a comment for moderation review
 */
router.post("/comments/:id/flag", requireAuth, async (req, res) => { const startTime = Date.now();
  
  try {
    const comment_id = parseInt(req.params.id);
    const data = req.body;
    const user_id = (req as any).user?.id;

    if (!user_id) {
      return createErrorResponse(res, "Authentication required", 401, startTime);
     }

    if (isNaN(comment_id)) {
      return createErrorResponse(res, "Invalid comment ID", 400, startTime);
    }
    
    // Validate flag data
    const result = flagContentSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    // Submit the flag
    const flag = await contentModerationService.flagContent(
      'comment',
      comment_id,
      result.data.flagType,
      result.data.reason,
      user_id
    );
    
    // Extract flag ID safely
    const flagId = flag && typeof flag === 'object' && 'id' in flag ? flag.id : undefined;
    
    return ApiSuccess(res, { success: true, flagId }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to flag comment", startTime);
  }
});

/**
 * POST /comments/:id/highlight
 * Highlights a comment (for moderator/admin use)
 */
router.post("/comments/:id/highlight", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // TODO: Implement actual highlight functionality
    return ApiSuccess(res, { success: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to highlight comment", startTime);
  }
});

// ============================================================================
// POLL ENDPOINTS
// ============================================================================

/**
 * POST /polls
 * Creates a new community poll for a bill
 */
router.post("/polls", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const data = req.body;
    
    // Validate poll data
    const result = createPollSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // TODO: Implement actual poll creation in database
    const pollId = Date.now().toString();
    
    return ApiSuccess(res, { success: true, id: pollId }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
  } catch (error) {
    return handleApiError(res, error, "Failed to create poll", startTime);
  }
});

/**
 * POST /comments/:id/poll-vote
 * Casts a vote on a poll option
 */
router.post("/comments/:id/poll-vote", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const data = req.body;
    
    // Validate vote data
    const result = pollVoteSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // TODO: Implement actual poll voting
    return ApiSuccess(res, { success: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    return handleApiError(res, error, "Failed to vote on poll", startTime);
  }
});

// ============================================================================
// STATISTICS AND ENGAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /participation/stats
 * Retrieves participation statistics (platform-wide or bill-specific)
 */
router.get("/participation/stats", async (req, res) => { const startTime = Date.now();
  
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

      return ApiSuccess(res, stats, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
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

      return ApiSuccess(res, stats, 
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch participation stats", startTime);
  }
});

/**
 * GET /engagement/recent
 * Retrieves recent community engagement activity
 */
router.get("/engagement/recent", async (req, res) => {
  const startTime = Date.now();
  
  try {
    // TODO: Replace with actual database queries
    const recentActivity = [
      {
        type: "comment",
        billTitle: "Digital Economy and Data Protection Act 2024",
        contributor: "Dr. Amina Hassan",
        action: "provided constitutional analysis",
        timestamp: new Date("2024-01-19T16:30:00Z"),
        impact: "high"
      },
      {
        type: "poll_created",
        billTitle: "Climate Change Adaptation Fund Bill 2024",
        contributor: "Community Coalition",
        action: "created stakeholder poll",
        timestamp: new Date("2024-01-19T15:45:00Z"),
        impact: "medium"
      }
    ];

    return ApiSuccess(res, recentActivity, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  } catch (error) {
    return handleApiError(res, error, "Failed to fetch engagement data", startTime);
  }
});













































