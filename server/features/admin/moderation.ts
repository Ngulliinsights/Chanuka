import { Router } from "express";
import { z } from "zod";
import { ApiSuccess, ApiErrorResponse, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { contentModerationService } from "./content-moderation.js";
import { authenticateToken, requireRole } from "../../middleware/auth.js";

export const router = Router();

// Input schemas
const reviewFlagSchema = z.object({
  resolution: z.enum(['dismiss', 'warn', 'hide', 'delete', 'ban_user']),
  reason: z.string().min(10).max(500),
});

const moderationFiltersSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  contentType: z.enum(['comment', 'bill', 'user_profile']).optional(),
  flagType: z.enum(['spam', 'harassment', 'misinformation', 'inappropriate', 'off_topic', 'hate_speech']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// All moderation routes require authentication and admin/moderator role
router.use(authenticateToken);
router.use(requireRole(['admin', 'moderator']));

// Get moderation queue
router.get("/queue", async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate query parameters
    const result = moderationFiltersSchema.safeParse(req.query);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const queue = await contentModerationService.getModerationQueue(result.data);
    
    return ApiSuccess(res, queue, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error fetching moderation queue:", error);
    return ApiError(res, "Failed to fetch moderation queue", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Review and resolve a moderation flag
router.post("/flags/:flagId/review", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const flagId = parseInt(req.params.flagId);
    const data = req.body;
    const moderatorId = (req as any).user?.id;

    if (!moderatorId) {
      return ApiError(res, "Authentication required", 401, 
        ApiResponseWrapper.createMetadata(startTime, 'auth'));
    }

    if (isNaN(flagId)) {
      return ApiError(res, "Invalid flag ID", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }
    
    // Validate input
    const result = reviewFlagSchema.safeParse(data);
    if (!result.success) {
      return ApiValidationError(res, result.error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    // Review flag
    const reviewResult = await contentModerationService.reviewFlag(
      flagId,
      moderatorId,
      result.data.resolution,
      result.data.reason
    );
    
    return ApiSuccess(res, reviewResult, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error reviewing flag:", error);
    return ApiError(res, "Failed to review flag", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get moderation statistics
router.get("/stats", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const timeframe = req.query.timeframe as '24h' | '7d' | '30d' || '7d';
    
    const stats = await contentModerationService.getModerationStats(timeframe);
    
    return ApiSuccess(res, stats, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error fetching moderation stats:", error);
    return ApiError(res, "Failed to fetch moderation statistics", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Analyze content (for testing/debugging)
router.post("/analyze", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { content, contentType = 'comment' } = req.body;
    
    if (!content || typeof content !== 'string') {
      return ApiError(res, "Content is required", 400, 
        ApiResponseWrapper.createMetadata(startTime, 'validation'));
    }

    const analysis = await contentModerationService.analyzeContent(
      0, // Dummy ID for analysis
      contentType,
      content
    );
    
    return ApiSuccess(res, analysis, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error("Error analyzing content:", error);
    return ApiError(res, "Failed to analyze content", 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});