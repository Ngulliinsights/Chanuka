/**
 * Community Feature - Validation Middleware
 * 
 * Express middleware for validating community-related requests.
 * Integrates with Zod validation schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { createValidationError } from '@server/infrastructure/error-handling';
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  GetCommentsSchema,
  GetRepliesSchema,
  SearchCommentsSchema,
  LikeCommentSchema,
  EndorseCommentSchema,
  FlagCommentSchema,
  ModerateCommentSchema,
  HighlightCommentSchema,
  CreateDiscussionSchema,
  UpdateDiscussionSchema,
  GetCommentStatsSchema,
  GetTrendingDiscussionsSchema,
} from '../../application/community-validation.schemas';

// ============================================================================
// Comment CRUD Middleware
// ============================================================================

/**
 * Validate create comment request
 */
export async function validateCreateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(CreateCommentSchema, req.body);
    
    if (!validation.success) {
      return next(createValidationError('Invalid comment data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate update comment request
 */
export async function validateUpdateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(UpdateCommentSchema, req.body);
    
    if (!validation.success) {
      return next(createValidationError('Invalid comment update data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Comment Query Middleware
// ============================================================================

/**
 * Validate get comments request
 */
export async function validateGetComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GetCommentsSchema, {
      ...req.query,
      bill_id: req.params.billId || req.query.bill_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid query parameters', validation.errors));
    }
    
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate get replies request
 */
export async function validateGetReplies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GetRepliesSchema, {
      ...req.query,
      comment_id: req.params.commentId || req.query.comment_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid query parameters', validation.errors));
    }
    
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate search comments request
 */
export async function validateSearchComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(SearchCommentsSchema, req.query);
    
    if (!validation.success) {
      return next(createValidationError('Invalid search parameters', validation.errors));
    }
    
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Comment Interaction Middleware
// ============================================================================

/**
 * Validate like comment request
 */
export async function validateLikeComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(LikeCommentSchema, {
      comment_id: req.params.commentId || req.body.comment_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid comment ID', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate endorse comment request
 */
export async function validateEndorseComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(EndorseCommentSchema, {
      ...req.body,
      comment_id: req.params.commentId || req.body.comment_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid endorsement data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate flag comment request
 */
export async function validateFlagComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(FlagCommentSchema, {
      ...req.body,
      comment_id: req.params.commentId || req.body.comment_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid flag data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Moderation Middleware
// ============================================================================

/**
 * Validate moderate comment request
 */
export async function validateModerateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(ModerateCommentSchema, {
      ...req.body,
      comment_id: req.params.commentId || req.body.comment_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid moderation data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate highlight comment request
 */
export async function validateHighlightComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(HighlightCommentSchema, {
      ...req.body,
      comment_id: req.params.commentId || req.body.comment_id,
    });
    
    if (!validation.success) {
      return next(createValidationError('Invalid highlight data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Discussion Thread Middleware
// ============================================================================

/**
 * Validate create discussion request
 */
export async function validateCreateDiscussion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(CreateDiscussionSchema, req.body);
    
    if (!validation.success) {
      return next(createValidationError('Invalid discussion data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate update discussion request
 */
export async function validateUpdateDiscussion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(UpdateDiscussionSchema, req.body);
    
    if (!validation.success) {
      return next(createValidationError('Invalid discussion update data', validation.errors));
    }
    
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Analytics Middleware
// ============================================================================

/**
 * Validate get comment stats request
 */
export async function validateGetCommentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GetCommentStatsSchema, req.query);
    
    if (!validation.success) {
      return next(createValidationError('Invalid stats query parameters', validation.errors));
    }
    
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate get trending discussions request
 */
export async function validateGetTrendingDiscussions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GetTrendingDiscussionsSchema, req.query);
    
    if (!validation.success) {
      return next(createValidationError('Invalid trending query parameters', validation.errors));
    }
    
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Export all middleware
// ============================================================================

export const communityValidationMiddleware = {
  // CRUD
  validateCreateComment,
  validateUpdateComment,
  
  // Query
  validateGetComments,
  validateGetReplies,
  validateSearchComments,
  
  // Interactions
  validateLikeComment,
  validateEndorseComment,
  validateFlagComment,
  
  // Moderation
  validateModerateComment,
  validateHighlightComment,
  
  // Discussions
  validateCreateDiscussion,
  validateUpdateDiscussion,
  
  // Analytics
  validateGetCommentStats,
  validateGetTrendingDiscussions,
};
