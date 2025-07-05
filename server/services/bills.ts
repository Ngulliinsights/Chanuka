import { storage } from '../../storage/index';
import { Bill, InsertBill, BillComment, InsertBillComment } from "@shared/schema";

// Define error classes for better error handling
export class BillNotFoundError extends Error {
  constructor(billId: number) {
    super(`Bill with id ${billId} not found`);
    this.name = 'BillNotFoundError';
  }
}

export class CommentNotFoundError extends Error {
  constructor(commentId: number) {
    super(`Comment with id ${commentId} not found`);
    this.name = 'CommentNotFoundError';
  }
}

/**
 * Interface defining the contract for bill-related operations
 */
export interface BillsService {
  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill>;
  createBill(bill: InsertBill): Promise<Bill>;
  getBillsByTags(tags: string[]): Promise<Bill[]>;
  incrementBillViews(billId: number): Promise<Bill>;
  incrementBillShares(billId: number): Promise<Bill>;
  getBillComments(billId: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateBillCommentEndorsements(commentId: number, endorsements: number): Promise<BillComment>;
  getCommentReplies(parentId: number): Promise<BillComment[]>;
  highlightComment(commentId: number): Promise<BillComment>;
}

/**
 * Implementation of the BillsService interface
 * Provides methods to interact with bill and comment data
 */
class BillsServiceImpl implements BillsService {
  // Cache for frequently accessed bills
  private billCache: Map<number, { bill: Bill; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
  
  /**
   * Retrieves all bills from storage
   * @returns Promise resolving to an array of bills
   */
  async getBills(): Promise<Bill[]> {
    try {
      return await storage.getBills();
    } catch (error) {
      console.error('Failed to get bills:', error);
      throw new Error('Failed to retrieve bills');
    }
  }

  /**
   * Retrieves a specific bill by ID
   * @param id The bill ID to retrieve
   * @returns Promise resolving to the bill
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async getBill(id: number): Promise<Bill> {
    try {
      // Check cache first
      const cachedEntry = this.billCache.get(id);
      const now = Date.now();
      
      if (cachedEntry && (now - cachedEntry.timestamp) < this.CACHE_TTL_MS) {
        return cachedEntry.bill;
      }
      
      const bill = await storage.getBill(id);
      
      if (!bill) {
        throw new BillNotFoundError(id);
      }
      
      // Update cache
      this.billCache.set(id, { bill, timestamp: now });
      
      return bill;
    } catch (error) {
      if (error instanceof BillNotFoundError) {
        throw error;
      }
      console.error(`Failed to get bill ${id}:`, error);
      throw new Error(`Failed to retrieve bill ${id}`);
    }
  }

  /**
   * Creates a new bill
   * @param bill The bill data to insert
   * @returns Promise resolving to the created bill
   */
  async createBill(bill: InsertBill): Promise<Bill> {
    try {
      // Validate required fields
      if (!bill.title || !bill.content || !bill.description) {
        throw new Error('Bill must have a title, content and description');
      }
      
      // Set default values for optional fields
      const billWithDefaults: InsertBill = {
        ...bill,
        requiresAction: bill.requiresAction || false,
        status: bill.status || 'draft',
        createdAt: bill.createdAt || new Date(),
        updatedAt: bill.updatedAt || new Date()
      };
      
      const createdBill = await storage.createBill(billWithDefaults);
      return {
        ...createdBill,
        requiresAction: createdBill.requiresAction || false,
        createdAt: createdBill.createdAt || new Date(),
        updatedAt: createdBill.updatedAt || new Date(),
        description: createdBill.description
      };
    } catch (error) {
      console.error('Failed to create bill:', error);
      throw new Error('Failed to create bill');
    }
  }

  /**
   * Retrieves bills that match any of the provided tags
   * @param tags Array of tags to filter by
   * @returns Promise resolving to matching bills
   */
  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    try {
      if (!tags.length) {
        return [];
      }
      
      // Normalize tags to lowercase for consistent matching
      const normalizedTags = tags.map(tag => tag.toLowerCase());
      return await storage.getBillsByTags(normalizedTags);
    } catch (error) {
      console.error('Failed to get bills by tags:', error);
      throw new Error('Failed to retrieve bills by tags');
    }
  }

  /**
   * Increments the view count for a specific bill
   * @param billId The ID of the bill to update
   * @returns Promise resolving to the updated bill
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async incrementBillViews(billId: number): Promise<Bill> {
    try {
      // Validate bill exists first
      await this.getBill(billId);
      
      const updatedBill = await storage.incrementBillViews(billId);
      
      // Update cache with new view count
      this.billCache.delete(billId);
      
      return updatedBill;
    } catch (error) {
      if (error instanceof BillNotFoundError) {
        throw error;
      }
      console.error(`Failed to increment views for bill ${billId}:`, error);
      throw new Error(`Failed to update view count for bill ${billId}`);
    }
  }

  /**
   * Increments the share count for a specific bill
   * @param billId The ID of the bill to update
   * @returns Promise resolving to the updated bill
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async incrementBillShares(billId: number): Promise<Bill> {
    try {
      // Validate bill exists first
      await this.getBill(billId);
      
      const updatedBill = await storage.incrementBillShares(billId);
      
      // Update cache with new share count
      this.billCache.delete(billId);
      
      return updatedBill;
    } catch (error) {
      if (error instanceof BillNotFoundError) {
        throw error;
      }
      console.error(`Failed to increment shares for bill ${billId}:`, error);
      throw new Error(`Failed to update share count for bill ${billId}`);
    }
  }

  /**
   * Retrieves all comments for a specific bill
   * @param billId The ID of the bill to get comments for
   * @returns Promise resolving to an array of comments
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async getBillComments(billId: number): Promise<BillComment[]> {
    try {
      // Verify bill exists first
      await this.getBill(billId);
      
      return await storage.getBillComments(billId);
    } catch (error) {
      if (error instanceof BillNotFoundError) {
        throw error;
      }
      console.error(`Failed to get comments for bill ${billId}:`, error);
      throw new Error(`Failed to retrieve comments for bill ${billId}`);
    }
  }

  /**
   * Creates a new comment on a bill
   * @param comment The comment data to insert
   * @returns Promise resolving to the created comment
   * @throws BillNotFoundError if the referenced bill doesn't exist
   */
  async createBillComment(comment: InsertBillComment): Promise<BillComment> {
    try {
      // Verify bill exists
      await this.getBill(comment.billId);
      
      // Validate required fields
      if (!comment.content || comment.content.trim() === '') {
        throw new Error('Comment must have content');
      }
      
      // Set default values
      const commentWithDefaults: InsertBillComment = {
        ...comment,
        endorsements: comment.endorsements || 0,
        isHighlighted: comment.isHighlighted || false,
        parentId: comment.parentId || null,
        createdAt: comment.createdAt || new Date(),
        updatedAt: comment.updatedAt || new Date()
      };
      
      // If it's a reply, verify parent comment exists
      if (commentWithDefaults.parentId) {
        const parentComment = await storage.getBillComments(comment.billId)
          .then(comments => comments.find(c => c.id === commentWithDefaults.parentId));
        if (!parentComment) {
          throw new Error(`Parent comment ${commentWithDefaults.parentId} does not exist`);
        }
      }
      
      return await storage.createBillComment(commentWithDefaults);
    } catch (error) {
      if (error instanceof BillNotFoundError) {
        throw error;
      }
      console.error('Failed to create comment:', error);
      throw new Error('Failed to create comment');
    }
  }

  /**
   * Updates the endorsement count for a comment
   * @param commentId The ID of the comment to update
   * @param endorsements The new endorsement value
   * @returns Promise resolving to the updated comment
   * @throws CommentNotFoundError if the comment doesn't exist
   */
  async updateBillCommentEndorsements(commentId: number, endorsements: number): Promise<BillComment> {
    try {
      // Validate endorsements is a non-negative number
      if (typeof endorsements !== 'number' || endorsements < 0) {
        throw new Error('Endorsements must be a non-negative number');
      }
      
      const updatedComment = await storage.updateBillCommentEndorsements(commentId, endorsements);
      
      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }
      
      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError) {
        throw error;
      }
      console.error(`Failed to update endorsements for comment ${commentId}:`, error);
      throw new Error(`Failed to update endorsements for comment ${commentId}`);
    }
  }

  /**
   * Retrieves replies to a specific comment
   * @param parentId The ID of the parent comment
   * @returns Promise resolving to an array of reply comments
   */
  async getCommentReplies(parentId: number): Promise<BillComment[]> {
    try {
      // Validate parent comment exists
      const parentComment = await storage.getBillComment(parentId);
      if (!parentComment) {
        throw new CommentNotFoundError(parentId);
      }
      
      return await storage.getCommentReplies(parentId);
    } catch (error) {
      if (error instanceof CommentNotFoundError) {
        throw error;
      }
      console.error(`Failed to get replies for comment ${parentId}:`, error);
      throw new Error(`Failed to retrieve replies for comment ${parentId}`);
    }
  }

  /**
   * Highlights a specific comment
   * @param commentId The ID of the comment to highlight
   * @returns Promise resolving to the updated comment
   * @throws CommentNotFoundError if the comment doesn't exist
   */
  async highlightComment(commentId: number): Promise<BillComment> {
    try {
      const updatedComment = await storage.highlightComment(commentId);
      
      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }
      
      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError) {
        throw error;
      }
      console.error(`Failed to highlight comment ${commentId}:`, error);
      throw new Error(`Failed to highlight comment ${commentId}`);
    }
  }
  
  /**
   * Clears the bill cache
   * Useful for testing and when data consistency is needed
   */
  clearCache(): void {
    this.billCache.clear();
  }
}

// Export singleton instance of the service
export const billsService = new BillsServiceImpl();