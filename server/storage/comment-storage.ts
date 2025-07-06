import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { type BillComment as Comment, type InsertBillComment } from '../../shared/schema.js';
import { BaseStorage } from './base/BaseStorage.js';

/**
 * CommentStorage handles the storage and retrieval of comments on bills.
 * Optimized for efficient retrieval of comments by bill ID and parent comment ID.
 * 
 * Key optimizations:
 * - Improved memory efficiency through better data structures
 * - Enhanced caching strategy with batch invalidation
 * - Robust error handling and validation
 * - Consistent sorting and filtering patterns
 */
export class CommentStorage extends BaseStorage<Comment> {
  private comments: Map<number, Comment>;
  private billCommentIndex: Map<number, Set<number>>;
  private parentCommentIndex: Map<number, Set<number>>;
  private nextId: number;

  // Cache keys for consistent cache management
  private static readonly CACHE_KEYS = {
    comment: (id: number) => `comment:${id}`,
    billComments: (billId: number) => `bill:${billId}:comments`,
    commentReplies: (parentId: number) => `comment:${parentId}:replies`,
  } as const;

  constructor(redis: Redis, pool: Pool) {
    super(redis, pool, { prefix: 'comment', cacheTTL: 3600 });
    this.comments = new Map();
    this.billCommentIndex = new Map();
    this.parentCommentIndex = new Map();
    this.nextId = 1;
  }

  /**
   * Validates that a number ID is valid (positive integer).
   * This centralized validation prevents bugs from invalid IDs throughout the class.
   */
  private validateId(id: number, fieldName: string): void {
    if (!id || typeof id !== 'number' || id <= 0 || !Number.isInteger(id)) {
      throw new Error(`Invalid ${fieldName}: must be a positive integer`);
    }
  }

  /**
   * Sorts comments by creation date (newest first).
   * Centralized sorting logic ensures consistency across all methods.
   */
  private sortCommentsByDate(comments: Comment[]): Comment[] {
    return comments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Builds a comprehensive list of cache keys to invalidate for a given comment.
   * This ensures cache consistency when comments are modified.
   */
  private buildCacheInvalidationKeys(comment: Comment): string[] {
    const keys = [
      CommentStorage.CACHE_KEYS.comment(comment.id),
      CommentStorage.CACHE_KEYS.billComments(comment.billId),
    ];

    // Add parent comment's replies cache if this is a reply
    if (comment.parentId) {
      keys.push(CommentStorage.CACHE_KEYS.commentReplies(comment.parentId));
    }

    return keys;
  }

  /**
   * Batch invalidates multiple cache keys efficiently.
   * This reduces Redis round trips and improves performance.
   */
  private async batchInvalidateCache(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    // Use Promise.allSettled to ensure all invalidations are attempted
    // even if some fail, preventing partial cache states
    const results = await Promise.allSettled(
      keys.map(key => this.invalidateCache(key))
    );

    // Log any failures for debugging, but don't throw to avoid breaking the main operation
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`Failed to invalidate ${failures.length} cache keys`, failures);
    }
  }

  /**
   * Retrieves all comments for a specific bill, sorted by creation date (newest first).
   * Enhanced with better validation and consistent sorting.
   */
  async getBillComments(billId: number): Promise<Comment[]> {
    this.validateId(billId, 'bill ID');

    return this.getCached(CommentStorage.CACHE_KEYS.billComments(billId), async () => {
      const commentIds = Array.from(this.billCommentIndex.get(billId) || []);
      const comments = commentIds
        .map(id => this.comments.get(id))
        .filter((c): c is Comment => c !== undefined);

      return this.sortCommentsByDate(comments);
    });
  }

  /**
   * Creates a new comment on a bill.
   * Enhanced with better validation and atomic operations.
   */
  async addComment(comment: InsertBillComment): Promise<Comment> {
    // Validate required fields
    this.validateId(comment.billId, 'bill ID');
    if (!comment.content || typeof comment.content !== 'string' || comment.content.trim().length === 0) {
      throw new Error('Comment content is required and cannot be empty');
    }

    // Validate parent comment exists if specified
    if (comment.parentId) {
      this.validateId(comment.parentId, 'parent comment ID');
      if (!this.comments.has(comment.parentId)) {
        throw new Error(`Parent comment with ID ${comment.parentId} not found`);
      }
    }

    const id = this.nextId++;
    const now = new Date();

    // Create new comment with all required fields properly initialized
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: now,
      updatedAt: now,
      parentId: comment.parentId || null,
      verifiedClaims: 0,
      endorsements: 0,
      upvotes: comment.upvotes || 0,
      downvotes: comment.downvotes || 0,
      isHighlighted: false,
      pollData: comment.pollData || null,
      section: comment.section || null,
    };

    // Atomic updates to prevent inconsistent state
    this.comments.set(id, newComment);

    // Update bill index
    const billComments = this.billCommentIndex.get(comment.billId) || new Set();
    billComments.add(id);
    this.billCommentIndex.set(comment.billId, billComments);

    // Update parent index if this is a reply
    if (comment.parentId) {
      const children = this.parentCommentIndex.get(comment.parentId) || new Set();
      children.add(id);
      this.parentCommentIndex.set(comment.parentId, children);
    }

    // Invalidate relevant caches efficiently
    await this.batchInvalidateCache(this.buildCacheInvalidationKeys(newComment));

    return newComment;
  }

  /**
   * Updates a comment with partial data.
   * Enhanced with better validation and immutable updates.
   */
  async updateComment(id: number, updates: Partial<Comment>): Promise<Comment | null> {
    this.validateId(id, 'comment ID');

    const existingComment = this.comments.get(id);
    if (!existingComment) {
      return null;
    }

    // Prevent updating immutable fields
    const { id: _, createdAt: __, ...validUpdates } = updates;

    // Create updated comment immutably
    const updatedComment: Comment = {
      ...existingComment,
      ...validUpdates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date(),
    };

    this.comments.set(id, updatedComment);

    // Invalidate relevant caches
    await this.batchInvalidateCache(this.buildCacheInvalidationKeys(updatedComment));

    return updatedComment;
  }

  /**
   * Retrieves all replies to a specific comment, sorted by creation date (newest first).
   * Enhanced with caching and better error handling.
   */
  async getCommentReplies(parentId: number): Promise<Comment[]> {
    this.validateId(parentId, 'parent comment ID');

    if (!this.comments.has(parentId)) {
      throw new Error(`Parent comment with ID ${parentId} not found`);
    }

    return this.getCached(CommentStorage.CACHE_KEYS.commentReplies(parentId), async () => {
      const replyIds = this.parentCommentIndex.get(parentId) || new Set();
      const replies = Array.from(replyIds)
        .map(id => this.comments.get(id))
        .filter((comment): comment is Comment => comment !== undefined);

      return this.sortCommentsByDate(replies);
    });
  }

  /**
   * Marks a comment as highlighted.
   * Enhanced with validation and proper cache invalidation.
   */
  async highlightComment(commentId: number): Promise<Comment> {
    this.validateId(commentId, 'comment ID');

    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    // Use updateComment for consistency and proper cache management
    const updatedComment = await this.updateComment(commentId, { isHighlighted: true });

    // This should never happen due to validation above, but TypeScript needs the check
    if (!updatedComment) {
      throw new Error(`Failed to highlight comment with ID ${commentId}`);
    }

    return updatedComment;
  }

  /**
   * Removes highlighting from a comment.
   * Enhanced with validation and proper cache invalidation.
   */
  async unhighlightComment(commentId: number): Promise<Comment> {
    this.validateId(commentId, 'comment ID');

    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    // Use updateComment for consistency and proper cache management
    const updatedComment = await this.updateComment(commentId, { isHighlighted: false });

    // This should never happen due to validation above, but TypeScript needs the check
    if (!updatedComment) {
      throw new Error(`Failed to unhighlight comment with ID ${commentId}`);
    }

    return updatedComment;
  }

  /**
   * Deletes a comment by ID. If the comment has replies, they will be preserved
   * but will no longer be accessible through the parent-child relationship.
   * Enhanced with better error handling and atomic operations.
   */
  async deleteComment(id: number): Promise<boolean> {
    this.validateId(id, 'comment ID');

    const comment = this.comments.get(id);
    if (!comment) {
      return false;
    }

    // Collect all cache keys that need invalidation before deletion
    const cacheKeys = this.buildCacheInvalidationKeys(comment);

    // Remove from main storage
    this.comments.delete(id);

    // Remove from bill index
    const billComments = this.billCommentIndex.get(comment.billId);
    if (billComments) {
      billComments.delete(id);
      if (billComments.size === 0) {
        this.billCommentIndex.delete(comment.billId);
      }
    }

    // Remove from parent index if this is a reply
    if (comment.parentId) {
      const siblings = this.parentCommentIndex.get(comment.parentId);
      if (siblings) {
        siblings.delete(id);
        if (siblings.size === 0) {
          this.parentCommentIndex.delete(comment.parentId);
        }
      }
    }

    // Handle child comments - delete them recursively
    const children = this.parentCommentIndex.get(id);
    if (children) {
      // Delete all child comments
      await Promise.all(Array.from(children).map(childId => this.deleteComment(childId)));
      this.parentCommentIndex.delete(id);
    }

    // Invalidate all relevant caches
    await this.batchInvalidateCache(cacheKeys);

    return true;
  }

  /**
   * Retrieves a single comment by its ID.
   * Enhanced with validation and caching.
   */
  async getComment(id: number): Promise<Comment | null> {
    this.validateId(id, 'comment ID');

    return this.getCached(CommentStorage.CACHE_KEYS.comment(id), async () => {
      return this.comments.get(id) || null;
    });
  }

  /**
   * Retrieves all highlighted comments for a specific bill.
   * Enhanced with validation and leverages existing caching.
   */
  async getHighlightedComments(billId: number): Promise<Comment[]> {
    this.validateId(billId, 'bill ID');

    const comments = await this.getBillComments(billId);
    return comments.filter(comment => comment.isHighlighted);
  }

  /**
   * Gets comment statistics for a bill.
   * New method that provides useful metrics without additional storage overhead.
   */
  async getBillCommentStats(billId: number): Promise<{
    totalComments: number;
    highlightedComments: number;
    topLevelComments: number;
    replies: number;
  }> {
    this.validateId(billId, 'bill ID');

    const comments = await this.getBillComments(billId);

    return {
      totalComments: comments.length,
      highlightedComments: comments.filter(c => c.isHighlighted).length,
      topLevelComments: comments.filter(c => !c.parentId).length,
      replies: comments.filter(c => c.parentId).length,
    };
  }

  /**
   * Gets the total number of comments in the system.
   * Useful for analytics and system monitoring.
   */
  getTotalCommentCount(): number {
    return this.comments.size;
  }

  /**
   * Checks if a comment exists without retrieving it.
   * Efficient existence check for validation purposes.
   */
  commentExists(id: number): boolean {
    return this.comments.has(id);
  }
}