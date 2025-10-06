
import { Router } from "express";
import { z } from "zod";
import { ApiSuccess, ApiErrorResponse, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { commentService } from "./comment.js";
import { commentVotingService } from "./comment-voting.js";
import { contentModerationService } from "../admin/content-moderation.js";
import { authenticateToken as requireAuth } from "../../middleware/auth.js";

export const router = Router();

// Input schemas
const createCommentSchema = z.object({
  billId: z.coerce.number().int().positive(),
  content: z.string().min(10).max(2000),
  commentType: z.enum(['general', 'expert_analysis', 'concern', 'support']).optional(),
  parentCommentId: z.coerce.number().int().positive().optional(),
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
  billId: z.string(),
  question: z.string().min(5).max(200),
  options: z.array(z.string()).min(2).max(6),
  section: z.string().optional(),
});

const pollVoteSchema = z.object({
  optionIndex: z.number().min(0),
});

// Sample polls for fallback
const samplePolls = [
  {
    id: "1",
    billId: "1",
    question: "Should the data protection provisions apply to all businesses or only those with over 1000 users?",
    options: [
      { text: "All businesses", votes: 156 },
      { text: "Only large businesses (1000+ users)", votes: 89 },
      { text: "Tiered approach based on business size", votes: 234 },
      { text: "Only tech companies", votes: 23 }
    ],
    totalVotes: 502,
    userVote: undefined
  }
];

// Community input endpoints
router.get("/comments/:billId", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    const sort = req.query.sort as string || "recent";
    const expertOnly = req.query.expert === "true";
    const commentType = req.query.commentType as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(billId)) {
      return ApiError(res, "Invalid bill ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const result = await commentService.getBillComments(billId, {
      sort: sort as any,
      expertOnly,
      commentType,
      limit,
      offset
    });

    return ApiSuccess(res, result, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error fetching comments:", error);
    return ApiError(res, "Failed to fetch comments", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

router.post("/comments", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const data = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return ApiError(res, "Authentication required", 401, 
        ApiResponseWrapper.createMetadata(startTime, 'auth'));
    }
    
    // Validate input
    const result = createCommentSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    // Analyze content for moderation
    await contentModerationService.analyzeContent(
      0, // Will be updated with actual comment ID after creation
      'comment',
      result.data.content
    );

    // Create comment
    const comment = await commentService.createComment({
      billId: result.data.billId,
      userId,
      content: result.data.content,
      commentType: result.data.commentType,
      parentCommentId: result.data.parentCommentId
    });
    
    return ApiSuccess(res, comment, 
      ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
  } catch (error) {
    console.error("Error creating comment:", error);
    return ApiError(res, "Failed to create comment", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

router.post("/polls", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const data = req.body;
    
    // Validate input
    const result = createPollSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // For now, return success - real implementation would save to database
    return ApiSuccess(res, { success: true, id: Date.now().toString() }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
  } catch (error) {
    console.error("Error creating poll:", error);
    return ApiError(res, "Failed to create poll", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

router.post("/comments/:id/vote", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const commentId = parseInt(req.params.id);
    const data = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return ApiError(res, "Authentication required", 401, 
        ApiResponseWrapper.createMetadata(startTime, 'auth'));
    }

    if (isNaN(commentId)) {
      return ApiError(res, "Invalid comment ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }
    
    // Validate input
    const result = voteSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }
    
    // Vote on comment
    const voteResult = await commentVotingService.voteOnComment(
      commentId,
      userId,
      result.data.type
    );
    
    return ApiSuccess(res, voteResult, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error voting on comment:", error);
    return ApiError(res, "Failed to vote", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

router.post("/comments/:id/poll-vote", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const commentId = req.params.id;
    const data = req.body;
    
    // Validate input
    const result = pollVoteSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // For now, return success - real implementation would update poll votes
    return ApiSuccess(res, { success: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error voting on poll:", error);
    return ApiError(res, "Failed to vote on poll", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get replies for a specific comment
router.get("/comments/:id/replies", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const parentCommentId = parseInt(req.params.id);
    const sort = req.query.sort as string || "recent";
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(parentCommentId)) {
      return ApiError(res, "Invalid comment ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const replies = await commentService.getCommentReplies(parentCommentId, {
      sort: sort as any,
      limit,
      offset
    });

    return ApiSuccess(res, replies, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error fetching comment replies:", error);
    return ApiError(res, "Failed to fetch replies", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Update a comment
router.put("/comments/:id", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const commentId = parseInt(req.params.id);
    const data = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return ApiError(res, "Authentication required", 401, 
        ApiResponseWrapper.createMetadata(startTime, 'auth'));
    }

    if (isNaN(commentId)) {
      return ApiError(res, "Invalid comment ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }
    
    // Validate input
    const result = updateCommentSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    // Update comment
    const updatedComment = await commentService.updateComment(
      commentId,
      userId,
      result.data
    );
    
    return ApiSuccess(res, updatedComment, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error updating comment:", error);
    return ApiError(res, "Failed to update comment", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Delete a comment
router.delete("/comments/:id", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const commentId = parseInt(req.params.id);
    const userId = (req as any).user?.id;

    if (!userId) {
      return ApiError(res, "Authentication required", 401, 
        ApiResponseWrapper.createMetadata(startTime, 'auth'));
    }

    if (isNaN(commentId)) {
      return ApiError(res, "Invalid comment ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const success = await commentService.deleteComment(commentId, userId);
    
    return ApiSuccess(res, { success }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error deleting comment:", error);
    return ApiError(res, "Failed to delete comment", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Flag content for moderation
router.post("/comments/:id/flag", requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const commentId = parseInt(req.params.id);
    const data = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return ApiError(res, "Authentication required", 401, 
        ApiResponseWrapper.createMetadata(startTime, 'auth'));
    }

    if (isNaN(commentId)) {
      return ApiError(res, "Invalid comment ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }
    
    // Validate input
    const result = flagContentSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    // Flag content
    const flag = await contentModerationService.flagContent(
      'comment',
      commentId,
      result.data.flagType,
      result.data.reason,
      userId
    );
    
    return ApiSuccess(res, { success: true, flagId: flag.id }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error flagging comment:", error);
    return ApiError(res, "Failed to flag comment", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get comment statistics for a bill
router.get("/comments/:billId/stats", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);

    if (isNaN(billId)) {
      return ApiError(res, "Invalid bill ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const stats = await commentService.getCommentStats(billId);
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error fetching comment stats:", error);
    return ApiError(res, "Failed to fetch comment statistics", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get trending comments
router.get("/comments/:billId/trending", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    const timeframe = req.query.timeframe as '1h' | '24h' | '7d' || '24h';
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(billId)) {
      return ApiError(res, "Invalid bill ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const trendingComments = await commentVotingService.getTrendingComments(
      billId,
      timeframe,
      limit
    );
    
    return ApiSuccess(res, trendingComments, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error fetching trending comments:", error);
    return ApiError(res, "Failed to fetch trending comments", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

router.post("/comments/:id/highlight", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const commentId = req.params.id;
    
    // For now, return success - real implementation would highlight comment
    return ApiSuccess(res, { success: true }, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error highlighting comment:", error);
    return ApiError(res, "Failed to highlight comment", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Public participation metrics
router.get("/participation/stats", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = req.query.billId ? parseInt(req.query.billId as string) : undefined;
    
    if (billId) {
      // Get stats for specific bill
      const billStats = await commentService.getCommentStats(billId);
      const voteStats = await commentVotingService.getBillCommentVoteSummary(billId);
      
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
      // Get platform-wide stats (fallback to sample data for now)
      const stats = {
        totalComments: 1247,
        activeParticipants: 892,
        expertContributions: 156,
        verifiedAnalyses: 89,
        communityPolls: 23,
        impactfulFeedback: 67 // Comments that led to bill amendments
      };

      return ApiSuccess(res, stats, 
        ApiResponseWrapper.createMetadata(startTime, 'static'));
    }
  } catch (error) {
    console.error("Error fetching participation stats:", error);
    return ApiError(res, "Failed to fetch stats", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Community engagement features
router.get("/engagement/recent", async (req, res) => {
  const startTime = Date.now();
  
  try {
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
    console.error("Error fetching recent engagement:", error);
    return ApiError(res, "Failed to fetch engagement data", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  }
});
