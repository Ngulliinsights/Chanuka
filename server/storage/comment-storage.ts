import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { type BillComment as Comment, type InsertBillComment } from '../../shared/schema.js';
import { BaseStorage } from './base/BaseStorage.js';

/**
 * CommentStorage handles the storage and retrieval of comments on bills.
 * Optimized for efficient retrieval of comments by bill ID and parent comment ID.
 */
export class CommentStorage extends BaseStorage<Comment> {
  private comments: Map<number, Comment>;
  private billCommentIndex: Map<number, Set<number>>;
  private parentCommentIndex: Map<number, Set<number>>;
  private nextId: number;

  constructor(redis: Redis, pool: Pool) {
    super(redis, pool, { prefix: 'comment', cacheTTL: 3600 });
    this.comments = new Map();
    this.billCommentIndex = new Map();
    this.parentCommentIndex = new Map();
    this.nextId = 1;
  }

  /**
   * Retrieves all comments for a specific bill, sorted by creation date (newest first).
   *
   * @param billId - The ID of the bill to get comments for
   * @returns An array of comments for the specified bill
   */
  async getBillComments(billId: number): Promise<Comment[]> {
    return this.getCached(`bill:${billId}:comments`, async () => {
      const commentIds = Array.from(this.billCommentIndex.get(billId) || []);
      return commentIds
        .map(id => this.comments.get(id))
        .filter((c): c is Comment => c !== undefined);
    });
  }

  /**
   * Creates a new comment on a bill.
   *
   * @param comment - The comment data to insert
   * @returns The created comment with additional metadata
   */
  async addComment(comment: InsertBillComment): Promise<Comment> {
    const id = this.nextId++;
    const newComment: Comment = {
      ...comment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: comment.parentId || null,
      verifiedClaims: 0,
      endorsements: 0,
      upvotes: comment.upvotes || 0,
      downvotes: comment.downvotes || 0,
      isHighlighted: false,
      pollData: comment.pollData || null,
      section: comment.section || null,
    };

    this.comments.set(id, newComment);

    // Update bill index
    const billComments = this.billCommentIndex.get(comment.billId) || new Set();
    billComments.add(id);
    this.billCommentIndex.set(comment.billId, billComments);

    // Update parent index if needed
    if (comment.parentId) {
      const children = this.parentCommentIndex.get(comment.parentId) || new Set();
      children.add(id);
      this.parentCommentIndex.set(comment.parentId, children);
    }

    // Invalidate relevant caches
    await Promise.all([
      this.invalidateCache(`comment:${id}`),
      this.invalidateCache(`bill:${comment.billId}:comments`),
      comment.parentId
        ? this.invalidateCache(`comment:${comment.parentId}:replies`)
        : Promise.resolve(),
    ]);

    return newComment;
  }

  /**
   * Updates the endorsement count for a specific comment.
   *
   * @param commentId - The ID of the comment to update
   * @param endorsements - The new endorsement count
   * @returns The updated comment
   */
  async updateComment(id: number, updates: Partial<Comment>): Promise<Comment | null> {
    const comment = this.comments.get(id);
    if (!comment) return null;

    const updatedComment = {
      ...comment,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.comments.set(id, updatedComment);

    // Invalidate relevant caches
    await Promise.all([
      this.invalidateCache(`comment:${id}`),
      this.invalidateCache(`bill:${comment.billId}:comments`),
      comment.parentId
        ? this.invalidateCache(`comment:${comment.parentId}:replies`)
        : Promise.resolve(),
    ]);

    return updatedComment;
  }

  /**
   * Retrieves all replies to a specific comment, sorted by creation date (newest first).
   *
   * @param parentId - The ID of the parent comment
   * @returns An array of reply comments
   */
  async getCommentReplies(parentId: number): Promise<Comment[]> {
    if (!parentId || typeof parentId !== 'number') {
      throw new Error('Invalid parent comment ID');
    }

    if (!this.comments.has(parentId)) {
      throw new Error(`Parent comment with ID ${parentId} not found`);
    }

    const replyIds = this.parentCommentIndex.get(parentId) || new Set();
    const replies = Array.from(replyIds)
      .map(id => this.comments.get(id))
      .filter((comment): comment is Comment => comment !== undefined);

    // Sort replies by creation date, newest first
    return replies.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Marks a comment as highlighted.
   *
   * @param commentId - The ID of the comment to highlight
   * @returns The updated comment
   */
  async highlightComment(commentId: number): Promise<Comment> {
    if (!commentId || typeof commentId !== 'number') {
      throw new Error('Invalid comment ID');
    }

    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    comment.isHighlighted = true;
    comment.updatedAt = new Date();

    return comment;
  }

  /**
   * Removes highlighting from a comment.
   *
   * @param commentId - The ID of the comment to unhighlight
   * @returns The updated comment
   */
  async unhighlightComment(commentId: number): Promise<Comment> {
    if (!commentId || typeof commentId !== 'number') {
      throw new Error('Invalid comment ID');
    }

    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    comment.isHighlighted = false;
    comment.updatedAt = new Date();

    return comment;
  }

  /**
   * Deletes a comment by ID. If the comment has replies, they will be preserved
   * but will no longer be accessible through the parent-child relationship.
   *
   * @param commentId - The ID of the comment to delete
   * @returns Boolean indicating success
   */
  async deleteComment(id: number): Promise<boolean> {
    const comment = await this.getComment(id);
    if (!comment) return false;

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

    // Remove from parent index
    if (comment.parentId) {
      const siblings = this.parentCommentIndex.get(comment.parentId);
      if (siblings) {
        siblings.delete(id);
        if (siblings.size === 0) {
          this.parentCommentIndex.delete(comment.parentId);
        }
      }
    }

    // Remove any child comments
    const children = this.parentCommentIndex.get(id);
    if (children) {
      await Promise.all(Array.from(children).map(childId => this.deleteComment(childId)));
      this.parentCommentIndex.delete(id);
    }

    // Invalidate relevant caches
    await Promise.all([
      this.invalidateCache(`comment:${id}`),
      this.invalidateCache(`bill:${comment.billId}:comments`),
      comment.parentId
        ? this.invalidateCache(`comment:${comment.parentId}:replies`)
        : Promise.resolve(),
    ]);

    return true;
  }

  /**
   * Retrieves a single comment by its ID.
   *
   * @param commentId - The ID of the comment to retrieve
   * @returns The requested comment or undefined if not found
   */
  async getComment(id: number): Promise<Comment | null> {
    return this.getCached(`comment:${id}`, async () => {
      const comment = this.comments.get(id) || null;
      return comment;
    });
  }

  /**
   * Retrieves all highlighted comments for a specific bill.
   *
   * @param billId - The ID of the bill to get highlighted comments for
   * @returns An array of highlighted comments for the specified bill
   */
  async getHighlightedComments(billId: number): Promise<Comment[]> {
    if (!billId || typeof billId !== 'number') {
      throw new Error('Invalid bill ID');
    }

    const comments = await this.getBillComments(billId);
    return comments.filter(comment => comment.isHighlighted);
  }
}
