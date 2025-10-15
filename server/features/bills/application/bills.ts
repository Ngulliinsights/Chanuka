import { billStorage as storage } from '../infrastructure/bill-storage.js';
import type { Bill, InsertBill, BillComment, InsertBillComment } from '@shared/schema';
import { logger } from '@shared/utils/logger';

// Some storage implementations expose comment-related methods while
// others don't have them typed on the concrete BillStorage class.
// Create a typed-any alias to call optional storage methods without
// TypeScript complaints in this application layer.
const storageAny: any = storage;

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

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Helper function to safely serialize errors for logging
 * Converts unknown error types into a Record format the logger can handle
 */
function serializeError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    return { error: String(error) };
  }
  
  return { error: String(error) };
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
  unhighlightComment(commentId: number): Promise<BillComment>;
}

/**
 * Enhanced cache entry interface for better type safety
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

/**
 * Implementation of the BillsService interface
 * Provides methods to interact with bill and comment data with enhanced caching and validation
 */
class BillsServiceImpl implements BillsService {
  // Enhanced cache for frequently accessed bills with access tracking
  private billCache: Map<number, CacheEntry<Bill>> = new Map();
  private commentCache: Map<number, CacheEntry<BillComment[]>> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
  private readonly MAX_CACHE_SIZE = 100; // Prevent unbounded memory growth

  // Performance monitoring counters
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Validates if cache entry is still valid based on TTL
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return (Date.now() - entry.timestamp) < this.CACHE_TTL_MS;
  }

  /**
   * Generic cache retrieval with LRU eviction logic
   */
  private getCachedData<T>(cache: Map<number, CacheEntry<T>>, key: number): T | null {
    const entry = cache.get(key);
    if (!entry || !this.isCacheValid(entry)) {
      if (entry) cache.delete(key); // Remove expired entry
      this.cacheMisses++;
      return null;
    }

    // Update access count and timestamp for LRU tracking
    entry.accessCount++;
    entry.timestamp = Date.now();
    this.cacheHits++;
    return entry.data;
  }

  /**
   * Generic cache storage with size management
   */
  private setCachedData<T>(cache: Map<number, CacheEntry<T>>, key: number, data: T): void {
    // Implement LRU eviction if cache is full
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.findLeastRecentlyUsedKey(cache);
      if (oldestKey !== null) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Finds the least recently used cache entry for eviction
   */
  private findLeastRecentlyUsedKey<T>(cache: Map<number, CacheEntry<T>>): number | null {
    let oldestKey: number | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Validates bill input data with comprehensive checks
   */
  private validateBillInput(bill: InsertBill): void {
    if (!bill.title?.trim()) {
      throw new ValidationError('Bill title is required and cannot be empty');
    }

    if (!bill.content?.trim()) {
      throw new ValidationError('Bill content is required and cannot be empty');
    }

    if (!bill.description?.trim()) {
      throw new ValidationError('Bill description is required and cannot be empty');
    }

    // Validate title length constraints
    if (bill.title.length > 200) {
      throw new ValidationError('Bill title must be 200 characters or less');
    }

    // Validate description length constraints
    if (bill.description.length > 500) {
      throw new ValidationError('Bill description must be 500 characters or less');
    }
  }

  /**
   * Validates comment input data
   */
  private validateCommentInput(comment: InsertBillComment): void {
    if (!comment.content?.trim()) {
      throw new ValidationError('Comment content is required and cannot be empty');
    }

    if (comment.content.length > 1000) {
      throw new ValidationError('Comment content must be 1000 characters or less');
    }
  }

  /**
   * Retrieves all bills from storage with error boundary
   * @returns Promise resolving to an array of bills
   */
  async getBills(): Promise<Bill[]> {
    try {
      const bills = await storage.getBills();
      return bills;
    } catch (error) {
      // Use the helper function to safely serialize the error for logging
      logger.error('Failed to get bills:', { component: 'Chanuka' }, serializeError(error));
      throw new Error('Failed to retrieve bills from storage');
    }
  }

  /**
   * Retrieves a specific bill by ID with enhanced caching
   * @param id The bill ID to retrieve
   * @returns Promise resolving to the bill
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async getBill(id: number): Promise<Bill> {
    try {
      // Validate input
      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('Bill ID must be a positive integer');
      }

      // Check cache first
      const cachedBill = this.getCachedData(this.billCache, id);
      if (cachedBill) {
        return cachedBill;
      }

      const bill = await storage.getBill(id);

      if (!bill) {
        throw new BillNotFoundError(id);
      }

      // Cache and return the bill
      this.setCachedData(this.billCache, id, bill);
      return bill;
    } catch (error) {
      if (error instanceof BillNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to get bill ${id}:`, error);
      throw new Error(`Failed to retrieve bill ${id} from storage`);
    }
  }

  /**
   * Creates a new bill with enhanced validation
   * @param bill The bill data to insert
   * @returns Promise resolving to the created bill
   */
  async createBill(bill: InsertBill): Promise<Bill> {
    try {
      // Comprehensive validation
      this.validateBillInput(bill);

      // Set default values for optional fields with better defaults
      const billWithDefaults: InsertBill = {
        ...bill,
        title: bill.title.trim(),
        content: bill.content?.trim() || '',
        description: bill.description?.trim() || '',
        status: bill.status ?? 'introduced'
      };

      const createdBill = await storage.createBill(billWithDefaults);

      // Cache the newly created bill
      this.setCachedData(this.billCache, createdBill.id, createdBill);

      return createdBill;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Use the helper function to safely serialize the error for logging
      logger.error('Failed to create bill:', { component: 'Chanuka' }, serializeError(error));
      throw new Error('Failed to create bill in storage');
    }
  }

  /**
   * Retrieves bills that match any of the provided tags with input validation
   * @param tags Array of tags to filter by
   * @returns Promise resolving to matching bills
   */
  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    try {
      if (!Array.isArray(tags)) {
        throw new ValidationError('Tags must be provided as an array');
      }

      if (tags.length === 0) {
        return [];
      }

      // Enhanced tag validation and normalization
      const validTags = tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase());

      if (validTags.length === 0) {
        return [];
      }

      const bills = await storage.getBillsByTags(validTags);
      return bills;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Use the helper function to safely serialize the error for logging
      logger.error('Failed to get bills by tags:', { component: 'Chanuka' }, serializeError(error));
      throw new Error('Failed to retrieve bills by tags from storage');
    }
  }

  /**
   * Increments the view count for a specific bill with cache invalidation
   * @param billId The ID of the bill to update
   * @returns Promise resolving to the updated bill
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async incrementBillViews(billId: number): Promise<Bill> {
    try {
      // Validate input
      if (!Number.isInteger(billId) || billId <= 0) {
        throw new ValidationError('Bill ID must be a positive integer');
      }

      // Validate bill exists first
      await this.getBill(billId);

      const updatedBill = await storage.incrementBillViews(billId);

      // Invalidate cache to ensure fresh data on next access
      this.billCache.delete(billId);

      return updatedBill;
    } catch (error) {
      if (error instanceof BillNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to increment views for bill ${billId}:`, error);
      throw new Error(`Failed to update view count for bill ${billId}`);
    }
  }

  /**
   * Increments the share count for a specific bill with cache invalidation
   * @param billId The ID of the bill to update
   * @returns Promise resolving to the updated bill
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async incrementBillShares(billId: number): Promise<Bill> {
    try {
      // Validate input
      if (!Number.isInteger(billId) || billId <= 0) {
        throw new ValidationError('Bill ID must be a positive integer');
      }

      // Validate bill exists first
      await this.getBill(billId);

      const updatedBill = await storage.incrementBillShares(billId);

      // Invalidate cache to ensure fresh data on next access
      this.billCache.delete(billId);

      return updatedBill;
    } catch (error) {
      if (error instanceof BillNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to increment shares for bill ${billId}:`, error);
      throw new Error(`Failed to update share count for bill ${billId}`);
    }
  }

  /**
   * Retrieves all comments for a specific bill with enhanced caching
   * @param billId The ID of the bill to get comments for
   * @returns Promise resolving to an array of comments
   * @throws BillNotFoundError if the bill doesn't exist
   */
  async getBillComments(billId: number): Promise<BillComment[]> {
    try {
      // Validate input
      if (!Number.isInteger(billId) || billId <= 0) {
        throw new ValidationError('Bill ID must be a positive integer');
      }

      // Check comment cache first
      const cachedComments = this.getCachedData(this.commentCache, billId);
      if (cachedComments) {
        return cachedComments;
      }

      // Verify bill exists first
      await this.getBill(billId);

      // Check if the storage method exists before calling it
      if (typeof storageAny.getBillComments !== 'function') {
        throw new Error('getBillComments method not implemented in storage layer');
      }

      const comments = await storageAny.getBillComments(billId);

      // Cache the comments
      this.setCachedData(this.commentCache, billId, comments);

      return comments;
    } catch (error) {
      if (error instanceof BillNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to get comments for bill ${billId}:`, error);
      throw new Error(`Failed to retrieve comments for bill ${billId}`);
    }
  }

  /**
   * Creates a new comment on a bill with enhanced validation
   * @param comment The comment data to insert
   * @returns Promise resolving to the created comment
   * @throws BillNotFoundError if the referenced bill doesn't exist
   */
  async createBillComment(comment: InsertBillComment): Promise<BillComment> {
    try {
      // Comprehensive validation
      this.validateCommentInput(comment);

      // Verify bill exists
      await this.getBill(comment.billId);

      // Set default values with better normalization
      const commentWithDefaults: InsertBillComment = {
        ...comment,
        content: comment.content.trim(),
        parentCommentId: comment.parentCommentId ?? undefined
      };

      // If it's a reply, verify parent comment exists and belongs to the same bill
      if (commentWithDefaults.parentCommentId) {
        const existingComments = await this.getBillComments(comment.billId);
        const parentComment = existingComments.find(c => c.id === commentWithDefaults.parentCommentId);
        if (!parentComment) {
          throw new ValidationError(`Parent comment ${commentWithDefaults.parentCommentId} does not exist for this bill`);
        }
      }

      // Check if the storage method exists before calling it
      if (typeof storageAny.createBillComment !== 'function') {
        throw new Error('createBillComment method not implemented in storage layer');
      }

      const createdComment = await storageAny.createBillComment(commentWithDefaults);

      // Invalidate comment cache for this bill to ensure fresh data
      this.commentCache.delete(comment.billId);

      return createdComment;
    } catch (error) {
      if (error instanceof BillNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      // Use the helper function to safely serialize the error for logging
      logger.error('Failed to create comment:', { component: 'Chanuka' }, serializeError(error));
      throw new Error('Failed to create comment in storage');
    }
  }

  /**
   * Updates the endorsement count for a comment with enhanced validation
   * @param commentId The ID of the comment to update
   * @param endorsements The new endorsement value
   * @returns Promise resolving to the updated comment
   * @throws CommentNotFoundError if the comment doesn't exist
   */
  async updateBillCommentEndorsements(commentId: number, endorsements: number): Promise<BillComment> {
    try {
      // Enhanced validation
      if (!Number.isInteger(commentId) || commentId <= 0) {
        throw new ValidationError('Comment ID must be a positive integer');
      }

      if (typeof endorsements !== 'number' || endorsements < 0 || !Number.isInteger(endorsements)) {
        throw new ValidationError('Endorsements must be a non-negative integer');
      }

      // Check if the storage method exists before calling it
      if (typeof storageAny.updateBillCommentEndorsements !== 'function') {
        throw new Error('updateBillCommentEndorsements method not implemented in storage layer');
      }

      const updatedComment = await storageAny.updateBillCommentEndorsements(commentId, endorsements);

      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }

      // Invalidate relevant comment caches
      this.commentCache.delete(updatedComment.billId);

      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to update endorsements for comment ${commentId}:`, error);
      throw new Error(`Failed to update endorsements for comment ${commentId}`);
    }
  }

  /**
   * Retrieves replies to a specific comment with validation
   * @param parentId The ID of the parent comment
   * @returns Promise resolving to an array of reply comments
   */
  async getCommentReplies(parentId: number): Promise<BillComment[]> {
    try {
      // Validate input
      if (!Number.isInteger(parentId) || parentId <= 0) {
        throw new ValidationError('Parent comment ID must be a positive integer');
      }

      // Check if the storage method exists before calling it
      if (typeof storageAny.getCommentReplies !== 'function') {
        throw new Error('getCommentReplies method not implemented in storage layer');
      }

      const replies = await storageAny.getCommentReplies(parentId);
      return replies;
    } catch (error) {
      if (error instanceof CommentNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to get replies for comment ${parentId}:`, error);
      throw new Error(`Failed to retrieve replies for comment ${parentId}`);
    }
  }

  /**
   * Highlights a specific comment with validation
   * @param commentId The ID of the comment to highlight
   * @returns Promise resolving to the updated comment
   * @throws CommentNotFoundError if the comment doesn't exist
   */
  async highlightComment(commentId: number): Promise<BillComment> {
    try {
      // Validate input
      if (!Number.isInteger(commentId) || commentId <= 0) {
        throw new ValidationError('Comment ID must be a positive integer');
      }

      // Check if the storage method exists before calling it
      if (typeof storageAny.highlightComment !== 'function') {
        throw new Error('highlightComment method not implemented in storage layer');
      }

      const updatedComment = await storageAny.highlightComment(commentId);

      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }

      // Invalidate relevant comment caches
      this.commentCache.delete(updatedComment.billId);

      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to highlight comment ${commentId}:`, error);
      throw new Error(`Failed to highlight comment ${commentId}`);
    }
  }

  /**
   * Removes highlight flag from a specific comment
   */
  async unhighlightComment(commentId: number): Promise<BillComment> {
    try {
      if (!Number.isInteger(commentId) || commentId <= 0) {
        throw new ValidationError('Comment ID must be a positive integer');
      }

      if (typeof storageAny.unhighlightComment !== 'function') {
        throw new Error('unhighlightComment method not implemented in storage layer');
      }

      const updatedComment = await storageAny.unhighlightComment(commentId);

      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }

      // Invalidate relevant caches
      this.commentCache.delete(updatedComment.billId);

      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error(`Failed to unhighlight comment ${commentId}:`, error);
      throw new Error(`Failed to unhighlight comment ${commentId}`);
    }
  }

  /**
   * Clears all caches - useful for testing and ensuring data consistency
   */
  clearCache(): void {
    this.billCache.clear();
    this.commentCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Gets cache performance statistics for monitoring
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number; billCacheSize: number; commentCacheSize: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) : 0,
      billCacheSize: this.billCache.size,
      commentCacheSize: this.commentCache.size
    };
  }
}

// Export singleton instance of the service
export const billsService = new BillsServiceImpl();