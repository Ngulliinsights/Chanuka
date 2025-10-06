import { Router } from 'express';
import { billsService, BillNotFoundError, CommentNotFoundError, ValidationError } from './bills.js';
import { authenticateToken } from '../../middleware/auth.js';
import { ApiSuccess, ApiErrorResponse, ApiNotFound, ApiValidationError } from '../../utils/api-response.js';

const router = Router();

/**
 * GET /api/bills
 * Retrieve all bills with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { tags } = req.query;
    
    let bills;
    if (tags) {
      // Handle tags parameter - can be comma-separated string or array
      const tagArray = Array.isArray(tags) 
        ? tags as string[]
        : (tags as string).split(',').map(tag => tag.trim());
      
      bills = await billsService.getBillsByTags(tagArray);
    } else {
      bills = await billsService.getBills();
    }

    return ApiSuccess(res, {
      bills,
      count: bills.length,
      message: bills.length === 0 ? 'No bills found' : undefined
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to fetch bills', 500);
  }
});

/**
 * GET /api/bills/:id
 * Retrieve a specific bill by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const billId = parseInt(req.params.id);
    
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Bill ID must be a valid number');
    }

    const bill = await billsService.getBill(billId);
    
    // Increment view count
    await billsService.incrementBillViews(billId);

    return ApiSuccess(res, { bill });
  } catch (error) {
    console.error(`Error fetching bill ${req.params.id}:`, error);
    if (error instanceof BillNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to fetch bill', 500);
  }
});

/**
 * POST /api/bills
 * Create a new bill (requires authentication)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const billData = req.body;
    
    // Add the authenticated user as the sponsor if not provided
    if (!billData.sponsorId && req.user) {
      billData.sponsorId = req.user.id;
    }

    const newBill = await billsService.createBill(billData);

    return ApiSuccess(res, { 
      bill: newBill,
      message: 'Bill created successfully'
    }, {}, 201);
  } catch (error) {
    console.error('Error creating bill:', error);
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to create bill', 500);
  }
});

/**
 * POST /api/bills/:id/share
 * Increment share count for a bill
 */
router.post('/:id/share', async (req, res) => {
  try {
    const billId = parseInt(req.params.id);
    
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Bill ID must be a valid number');
    }

    const updatedBill = await billsService.incrementBillShares(billId);

    return ApiSuccess(res, { 
      bill: updatedBill,
      message: 'Share count updated'
    });
  } catch (error) {
    console.error(`Error updating share count for bill ${req.params.id}:`, error);
    if (error instanceof BillNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to update share count', 500);
  }
});

/**
 * GET /api/bills/:id/comments
 * Retrieve all comments for a specific bill
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const billId = parseInt(req.params.id);
    
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Bill ID must be a valid number');
    }

    const comments = await billsService.getBillComments(billId);

    return ApiSuccess(res, {
      comments,
      count: comments.length,
      billId
    });
  } catch (error) {
    console.error(`Error fetching comments for bill ${req.params.id}:`, error);
    if (error instanceof BillNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to fetch comments', 500);
  }
});

/**
 * POST /api/bills/:id/comments
 * Create a new comment on a bill (requires authentication)
 */
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const billId = parseInt(req.params.id);
    
    if (isNaN(billId)) {
      return ApiValidationError(res, 'Bill ID must be a valid number');
    }

    const commentData = {
      ...req.body,
      billId,
      userId: req.user!.id
    };

    const newComment = await billsService.createBillComment(commentData);

    return ApiSuccess(res, {
      comment: newComment,
      message: 'Comment created successfully'
    }, {}, 201);
  } catch (error) {
    console.error(`Error creating comment for bill ${req.params.id}:`, error);
    if (error instanceof BillNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to create comment', 500);
  }
});

/**
 * GET /api/bills/comments/:commentId/replies
 * Get replies to a specific comment
 */
router.get('/comments/:commentId/replies', async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    
    if (isNaN(commentId)) {
      return ApiValidationError(res, 'Comment ID must be a valid number');
    }

    const replies = await billsService.getCommentReplies(commentId);

    return ApiSuccess(res, {
      replies,
      count: replies.length,
      parentCommentId: commentId
    });
  } catch (error) {
    console.error(`Error fetching replies for comment ${req.params.commentId}:`, error);
    if (error instanceof CommentNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to fetch replies', 500);
  }
});

/**
 * PUT /api/bills/comments/:commentId/endorsements
 * Update endorsement count for a comment (requires authentication)
 */
router.put('/comments/:commentId/endorsements', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const { endorsements } = req.body;
    
    if (isNaN(commentId)) {
      return ApiValidationError(res, 'Comment ID must be a valid number');
    }

    if (typeof endorsements !== 'number') {
      return ApiValidationError(res, 'Endorsements must be a number');
    }

    const updatedComment = await billsService.updateBillCommentEndorsements(commentId, endorsements);

    return ApiSuccess(res, {
      comment: updatedComment,
      message: 'Endorsements updated successfully'
    });
  } catch (error) {
    console.error(`Error updating endorsements for comment ${req.params.commentId}:`, error);
    if (error instanceof CommentNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to update endorsements', 500);
  }
});

/**
 * PUT /api/bills/comments/:commentId/highlight
 * Highlight a comment (requires authentication)
 */
router.put('/comments/:commentId/highlight', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    
    if (isNaN(commentId)) {
      return ApiValidationError(res, 'Comment ID must be a valid number');
    }

    const updatedComment = await billsService.highlightComment(commentId);

    return ApiSuccess(res, {
      comment: updatedComment,
      message: 'Comment highlighted successfully'
    });
  } catch (error) {
    console.error(`Error highlighting comment ${req.params.commentId}:`, error);
    if (error instanceof CommentNotFoundError) {
      return ApiNotFound(res, error.message);
    }
    if (error instanceof ValidationError) {
      return ApiValidationError(res, error.message);
    }
    return ApiError(res, 'Failed to highlight comment', 500);
  }
});

/**
 * GET /api/bills/cache/stats
 * Get cache performance statistics (development/admin only)
 */
router.get('/cache/stats', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to view cache stats
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403);
    }

    const stats = billsService.getCacheStats();

    return ApiSuccess(res, {
      cacheStats: stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return ApiError(res, 'Failed to fetch cache statistics', 500);
  }
});

export { router };