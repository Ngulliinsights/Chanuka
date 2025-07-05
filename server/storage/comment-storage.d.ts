import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { type BillComment as Comment, type InsertBillComment } from '../../shared/schema.js';
import { BaseStorage } from './base/BaseStorage.js';
/**
 * CommentStorage handles the storage and retrieval of comments on bills.
 * Optimized for efficient retrieval of comments by bill ID and parent comment ID.
 */
export declare class CommentStorage extends BaseStorage<Comment> {
    private comments;
    private billCommentIndex;
    private parentCommentIndex;
    private nextId;
    constructor(redis: Redis, pool: Pool);
    /**
     * Retrieves all comments for a specific bill, sorted by creation date (newest first).
     *
     * @param billId - The ID of the bill to get comments for
     * @returns An array of comments for the specified bill
     */
    getBillComments(billId: number): Promise<Comment[]>;
    /**
     * Creates a new comment on a bill.
     *
     * @param comment - The comment data to insert
     * @returns The created comment with additional metadata
     */
    addComment(comment: InsertBillComment): Promise<Comment>;
    /**
     * Updates the endorsement count for a specific comment.
     *
     * @param commentId - The ID of the comment to update
     * @param endorsements - The new endorsement count
     * @returns The updated comment
     */
    updateComment(id: number, updates: Partial<Comment>): Promise<Comment | null>;
    /**
     * Retrieves all replies to a specific comment, sorted by creation date (newest first).
     *
     * @param parentId - The ID of the parent comment
     * @returns An array of reply comments
     */
    getCommentReplies(parentId: number): Promise<Comment[]>;
    /**
     * Marks a comment as highlighted.
     *
     * @param commentId - The ID of the comment to highlight
     * @returns The updated comment
     */
    highlightComment(commentId: number): Promise<Comment>;
    /**
     * Removes highlighting from a comment.
     *
     * @param commentId - The ID of the comment to unhighlight
     * @returns The updated comment
     */
    unhighlightComment(commentId: number): Promise<Comment>;
    /**
     * Deletes a comment by ID. If the comment has replies, they will be preserved
     * but will no longer be accessible through the parent-child relationship.
     *
     * @param commentId - The ID of the comment to delete
     * @returns Boolean indicating success
     */
    deleteComment(id: number): Promise<boolean>;
    /**
     * Retrieves a single comment by its ID.
     *
     * @param commentId - The ID of the comment to retrieve
     * @returns The requested comment or undefined if not found
     */
    getComment(id: number): Promise<Comment | null>;
    /**
     * Retrieves all highlighted comments for a specific bill.
     *
     * @param billId - The ID of the bill to get highlighted comments for
     * @returns An array of highlighted comments for the specified bill
     */
    getHighlightedComments(billId: number): Promise<Comment[]>;
}
