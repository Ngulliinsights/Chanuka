import { contentModerationService } from "@server/features/admin/presentation/http/content-moderation.routes";
import { authenticateToken, requireRole } from '@server/middleware/auth';
import { logger } from '@server/infrastructure/observability';
import { ApiResponseWrapper, HttpStatus } from '@server/utils/api-utils';
import { Request, Response, Router } from "express";
import { z } from "zod";

export const router = Router();

// Input validation schemas - these define the shape of incoming data
const reviewFlagSchema = z.object({
  resolution: z.enum(['approve', 'reject', 'warn', 'remove', 'ban-user']),
  reason: z.string().min(10).max(500),
});

const moderationFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  content_type: z.enum(['comment', 'bill']).optional(),
  moderator: z.string().optional(),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str)),
  }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
});

// Type definition for parsed moderation filters to ensure type safety throughout
type ModerationFilters = z.infer<typeof moderationFiltersSchema>;

// Helper function to handle errors consistently across all routes
// This centralizes error handling logic and ensures proper logging
const handleError = (res: Response, error: unknown, message: string, startTime: number) => {
  logger.error({ component: 'ModerationService', error: error instanceof Error ? error.message : String(error) }, message);

  // Create the error response wrapper with proper metadata
  const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(ApiResponseWrapper.error(message, 'MODERATION_ERROR', undefined, metadata));
};

// All moderation routes require authentication and admin/moderator role
router.use(authenticateToken);
router.use(requireRole(['admin', 'moderator']));

// Get moderation queue with optional filters
// This endpoint allows moderators to view flagged content that needs review
router.get("/queue", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Validate and parse query parameters using Zod schema
    const result = moderationFiltersSchema.safeParse(req.query);
    
    if (!result.success) {
      // If validation fails, return a structured error with details about what went wrong
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.BAD_REQUEST).json(ApiResponseWrapper.error("Validation failed", 'VALIDATION_ERROR', undefined, metadata));
    }

    // Extract the validated and typed data from the parse result
    const filters = result.data as ModerationFilters;
    
    // Fetch the moderation queue with proper pagination and filters
    const queue = await contentModerationService.getModerationQueue(
      filters.page,
      filters.limit,
      filters
    );
    
    const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
    return res.status(HttpStatus.OK).json(ApiResponseWrapper.success(queue, undefined, metadata));
  } catch (error) {
    return handleError(res, error, "Failed to fetch moderation queue", startTime);
  }
});

// Review and resolve a specific moderation flag
// This endpoint allows moderators to take action on flagged content
router.post("/flags/:flagId/review", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const flagId = parseInt(req.params.flagId);
    const moderatorId = req.user?.id?.toString();

    // Verify that the user is authenticated and has an ID
    if (!moderatorId) {
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.UNAUTHORIZED).json(ApiResponseWrapper.error("Authentication required", 'AUTH_ERROR', undefined, metadata));
    }

    // Validate that the flag ID is a valid positive integer
    if (isNaN(flagId) || flagId <= 0) {
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.BAD_REQUEST).json(ApiResponseWrapper.error("Invalid flag ID", 'INVALID_INPUT', undefined, metadata));
    }
    
    // Validate the request body against our schema to ensure it has the required fields
    const result = reviewFlagSchema.safeParse(req.body);
    if (!result.success) {
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.BAD_REQUEST).json(ApiResponseWrapper.error("Validation failed", 'VALIDATION_ERROR', undefined, metadata));
    }

    // Process the flag review through the content moderation service
    // Note: If this method doesn't exist on your service, you'll need to implement it
    // The method should handle updating the flag status and taking the appropriate action
    const reviewResult = await contentModerationService.reviewFlag(
      flagId,
      moderatorId,
      result.data.resolution,
      result.data.reason
    );
    
    const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
    return res.status(HttpStatus.OK).json(ApiResponseWrapper.success(reviewResult, undefined, metadata));
  } catch (error) {
    return handleError(res, error, "Failed to review flag", startTime);
  }
});

// Get moderation statistics for a given timeframe
// This provides insights into moderation activity and trends
router.get("/stats", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Default to 7 days if no timeframe is specified in the query
    const timeframe = (req.query.timeframe as '24h' | '7d' | '30d') || '7d';

    // Validate that the timeframe is one of our allowed values
    if (!['24h', '7d', '30d'].includes(timeframe)) {
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.BAD_REQUEST).json(ApiResponseWrapper.error("Invalid timeframe. Must be one of: 24h, 7d, 30d", 'INVALID_INPUT', undefined, metadata));
    }

    // Calculate date range based on timeframe
    const end_date = new Date();
    const start_date = new Date();

    switch (timeframe) {
      case '24h':
        start_date.setHours(start_date.getHours() - 24);
        break;
      case '7d':
        start_date.setDate(start_date.getDate() - 7);
        break;
      case '30d':
        start_date.setDate(start_date.getDate() - 30);
        break;
    }

    // Fetch statistics from the moderation service
    const stats = await contentModerationService.getModerationStats(start_date, end_date);
    
    const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
    return res.status(HttpStatus.OK).json(ApiResponseWrapper.success(stats, undefined, metadata));
  } catch (error) {
    return handleError(res, error, "Failed to fetch moderation statistics", startTime);
  }
});

// Analyze content without storing the result
// This is useful for testing moderation rules or previewing how content would be flagged
router.post("/analyze", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { content, content_type = 'comment' } = req.body;

    // Validate that content is provided and is a non-empty string
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.BAD_REQUEST).json(ApiResponseWrapper.error("Valid content string is required", 'INVALID_INPUT', undefined, metadata));
    }

    // Validate that the content type is one we support
    if (!['comment', 'bill'].includes(content_type)) {
      const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
      return res.status(HttpStatus.BAD_REQUEST).json(ApiResponseWrapper.error("Invalid content type. Must be one of: comment, bill", 'INVALID_INPUT', undefined, metadata));
    }

    // Run content analysis without persisting the result to the database
    const analysis = await contentModerationService.analyzeContent(
      content_type as 'comment' | 'bill',
      content
    );
    
    const metadata = ApiResponseWrapper.createMetadata(startTime, 'database');
    return res.status(HttpStatus.OK).json(ApiResponseWrapper.success(analysis, undefined, metadata));
  } catch (error) {
    return handleError(res, error, "Failed to analyze content", startTime);
  }
});















































