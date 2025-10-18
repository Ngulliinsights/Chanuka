import { billStorage as storage } from '../infrastructure/bill-storage.js';
import type { Bill, InsertBill, BillComment, InsertBillComment } from '@shared/schema';
import { logger } from '@shared/core/src/logging';

// Type-safe wrapper for optional storage methods with better type inference
const storageAny: any = storage;

/**
 * Authorization context for secure operations.
 * Pass this to methods that need to verify user permissions.
 */
export interface AuthContext {
  userId: number;
  roles?: string[];
  permissions?: string[];
}

/**
 * Configuration for authorization behavior.
 * Allows flexible security policies across different environments.
 */
export interface AuthorizationConfig {
  enabled: boolean;
  checkBillAccess?: (bill: Bill, auth: AuthContext) => boolean;
  checkCommentAccess?: (comment: BillComment, auth: AuthContext) => boolean;
  allowPublicRead?: boolean;
}

// Custom error classes for precise error handling and debugging
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

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Converts any error type into a structured format suitable for logging.
 * This prevents logger crashes when handling non-standard error objects.
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
 * Public interface defining all bill and comment operations.
 * Extended with optional authorization context for secure operations.
 */
export interface BillsService {
  getBills(auth?: AuthContext): Promise<Bill[]>;
  getBill(id: number, auth?: AuthContext): Promise<Bill>;
  createBill(bill: InsertBill, auth?: AuthContext): Promise<Bill>;
  getBillsByTags(tags: string[], auth?: AuthContext): Promise<Bill[]>;
  incrementBillViews(billId: number, auth?: AuthContext): Promise<Bill>;
  incrementBillShares(billId: number, auth?: AuthContext): Promise<Bill>;
  getBillComments(billId: number, auth?: AuthContext): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment, auth?: AuthContext): Promise<BillComment>;
  updateBillCommentEndorsements(commentId: number, endorsements: number, auth?: AuthContext): Promise<BillComment>;
  getCommentReplies(parentId: number, auth?: AuthContext): Promise<BillComment[]>;
  highlightComment(commentId: number, auth?: AuthContext): Promise<BillComment>;
  unhighlightComment(commentId: number, auth?: AuthContext): Promise<BillComment>;
}

/**
 * Strongly-typed cache entry that tracks both data and metadata
 * for intelligent cache management and LRU eviction strategies.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Configuration constants for cache behavior tuning.
 * Optimized based on typical usage patterns.
 */
const CACHE_CONFIG = {
  TTL_MS: 5 * 60 * 1000,           // 5 minute expiration for cache freshness
  MAX_SIZE: 100,                    // Prevent unbounded memory consumption
  EVICTION_BATCH_SIZE: 10,          // Remove multiple stale entries at once
  HOT_DATA_THRESHOLD: 5,            // Access count to consider data "hot"
  STALE_CHECK_INTERVAL: 60 * 1000   // Check for stale entries every minute
} as const;

/**
 * Validation constraints for input sanitization.
 * Centralized to maintain consistency across all validation logic.
 */
const VALIDATION_LIMITS = {
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 500,
  COMMENT_MAX_LENGTH: 1000,
  TAG_MAX_LENGTH: 50,
  MAX_TAGS: 10
} as const;

/**
 * Default authorization configuration that maintains backward compatibility.
 * Authorization is disabled by default to preserve existing behavior.
 */
const DEFAULT_AUTH_CONFIG: AuthorizationConfig = {
  enabled: false,
  allowPublicRead: true
};

/**
 * Core service implementation providing bill and comment management
 * with intelligent caching, comprehensive validation, authorization support,
 * and performance monitoring.
 */
class BillsServiceImpl implements BillsService {
  // Dual-layer cache system for bills and their associated comments
  private readonly billCache = new Map<number, CacheEntry<Bill>>();
  private readonly commentCache = new Map<number, CacheEntry<BillComment[]>>();
  
  // Real-time performance metrics for cache effectiveness analysis
  private cacheHits = 0;
  private cacheMisses = 0;
  private authConfig: AuthorizationConfig;
  
  // Timer for periodic stale entry cleanup
  private cleanupTimer?: NodeJS.Timeout;

  constructor(authConfig: AuthorizationConfig = DEFAULT_AUTH_CONFIG) {
    this.authConfig = authConfig;
    this.startPeriodicCleanup();
  }

  /**
   * Starts a background process that periodically removes expired cache entries.
   * This prevents memory bloat from accumulating stale data.
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleEntries();
    }, CACHE_CONFIG.STALE_CHECK_INTERVAL);
  }

  /**
   * Removes all expired entries from both caches in a single sweep.
   * More efficient than checking expiration on every access.
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.billCache.entries()) {
      if ((now - entry.timestamp) >= CACHE_CONFIG.TTL_MS) {
        this.billCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.commentCache.entries()) {
      if ((now - entry.timestamp) >= CACHE_CONFIG.TTL_MS) {
        this.commentCache.delete(key);
      }
    }
  }

  /**
   * Determines if a cache entry remains valid based on time-to-live.
   * Also considers access patterns for hot data that should be kept longer.
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    
    // Hot data (frequently accessed) gets extended TTL
    if (entry.accessCount >= CACHE_CONFIG.HOT_DATA_THRESHOLD) {
      return age < (CACHE_CONFIG.TTL_MS * 2);
    }
    
    return age < CACHE_CONFIG.TTL_MS;
  }

  /**
   * Retrieves data from cache with automatic expiration handling.
   * Updates access patterns for LRU tracking when entries are hit.
   */
  private getCachedData<T>(cache: Map<number, CacheEntry<T>>, key: number): T | null {
    const entry = cache.get(key);
    
    if (!entry || !this.isCacheValid(entry)) {
      if (entry) cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    // Update access metadata for both LRU and hot data detection
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.cacheHits++;
    
    return entry.data;
  }

  /**
   * Stores data in cache with intelligent size management.
   * Implements enhanced LRU eviction considering both age and access patterns.
   */
  private setCachedData<T>(cache: Map<number, CacheEntry<T>>, key: number, data: T): void {
    if (cache.size >= CACHE_CONFIG.MAX_SIZE) {
      this.evictLeastValuable(cache);
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  /**
   * Evicts the least valuable entry based on a scoring algorithm.
   * Considers both recency and frequency of access for optimal cache retention.
   */
  private evictLeastValuable<T>(cache: Map<number, CacheEntry<T>>): void {
    let targetKey: number | null = null;
    let lowestScore = Infinity;
    const now = Date.now();

    for (const [key, entry] of cache.entries()) {
      // Calculate value score: more recent and frequent access = higher score
      const recencyScore = 1 / (now - entry.lastAccessed + 1);
      const frequencyScore = entry.accessCount;
      const valueScore = recencyScore * frequencyScore;

      if (valueScore < lowestScore) {
        lowestScore = valueScore;
        targetKey = key;
      }
    }

    if (targetKey !== null) {
      cache.delete(targetKey);
    }
  }

  /**
   * Checks if a user is authorized to access a bill.
   * Returns true if authorization is disabled or user has access.
   */
  private async checkBillAuthorization(bill: Bill, auth?: AuthContext): Promise<void> {
    if (!this.authConfig.enabled) {
      return;
    }

    // Allow public read if configured
    if (this.authConfig.allowPublicRead && !auth) {
      return;
    }

    if (!auth) {
      throw new UnauthorizedError('Authentication required');
    }

    // Use custom authorization logic if provided
    if (this.authConfig.checkBillAccess) {
      if (!this.authConfig.checkBillAccess(bill, auth)) {
        throw new UnauthorizedError('Insufficient permissions to access this bill');
      }
      return;
    }

    // Default authorization: users can access their own bills or public ones
    // This is a placeholder - implement your actual authorization logic
    const isPublic = (bill as any).isPublic !== false;
    const isOwner = (bill as any).authorId === auth.userId;
    
    if (!isPublic && !isOwner) {
      throw new UnauthorizedError('Insufficient permissions to access this bill');
    }
  }

  /**
   * Validates bill creation input against business rules.
   * Throws descriptive ValidationError for any constraint violations.
   */
  private validateBillInput(bill: InsertBill): void {
    if (!bill || typeof bill !== 'object') {
      throw new ValidationError('Bill data must be a valid object');
    }

    const trimmedTitle = bill.title?.trim();
    const trimmedContent = bill.content?.trim();
    const trimmedDescription = bill.description?.trim();

    if (!trimmedTitle) {
      throw new ValidationError('Bill title is required and cannot be empty');
    }

    if (!trimmedContent) {
      throw new ValidationError('Bill content is required and cannot be empty');
    }

    if (!trimmedDescription) {
      throw new ValidationError('Bill description is required and cannot be empty');
    }

    if (trimmedTitle.length > VALIDATION_LIMITS.TITLE_MAX_LENGTH) {
      throw new ValidationError(
        `Bill title must be ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} characters or less (got ${trimmedTitle.length})`
      );
    }

    if (trimmedDescription.length > VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH) {
      throw new ValidationError(
        `Bill description must be ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters or less (got ${trimmedDescription.length})`
      );
    }

    // Validate tags if present
    if (bill.tags) {
      if (!Array.isArray(bill.tags)) {
        throw new ValidationError('Bill tags must be an array');
      }

      if (bill.tags.length > VALIDATION_LIMITS.MAX_TAGS) {
        throw new ValidationError(`Bill cannot have more than ${VALIDATION_LIMITS.MAX_TAGS} tags`);
      }

      for (const tag of bill.tags) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          throw new ValidationError('All tags must be non-empty strings');
        }

        if (tag.length > VALIDATION_LIMITS.TAG_MAX_LENGTH) {
          throw new ValidationError(
            `Tag "${tag}" exceeds maximum length of ${VALIDATION_LIMITS.TAG_MAX_LENGTH} characters`
          );
        }
      }
    }
  }

  /**
   * Validates comment content against length and emptiness constraints.
   * Ensures comments meet minimum quality standards before persistence.
   */
  private validateCommentInput(comment: InsertBillComment): void {
    if (!comment || typeof comment !== 'object') {
      throw new ValidationError('Comment data must be a valid object');
    }

    const trimmedContent = comment.content?.trim();

    if (!trimmedContent) {
      throw new ValidationError('Comment content is required and cannot be empty');
    }

    if (trimmedContent.length > VALIDATION_LIMITS.COMMENT_MAX_LENGTH) {
      throw new ValidationError(
        `Comment content must be ${VALIDATION_LIMITS.COMMENT_MAX_LENGTH} characters or less (got ${trimmedContent.length})`
      );
    }

    if (!comment.billId) {
      throw new ValidationError('Comment must be associated with a bill');
    }

    if (!comment.authorId) {
      throw new ValidationError('Comment must have an author');
    }
  }

  /**
   * Validates that an ID is a positive integer suitable for database operations.
   * Prevents injection attempts and invalid database queries.
   */
  private validatePositiveInteger(value: number, fieldName: string): void {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive integer (got ${value})`);
    }
  }

  /**
   * Retrieves all bills from persistent storage with optional authorization.
   * Filters results based on user permissions when auth is enabled.
   */
  async getBills(auth?: AuthContext): Promise<Bill[]> {
    try {
      const bills = await storage.getBills();

      // Apply authorization filtering if enabled
      if (this.authConfig.enabled && auth) {
        const authorizedBills: Bill[] = [];
        
        for (const bill of bills) {
          try {
            await this.checkBillAuthorization(bill, auth);
            authorizedBills.push(bill);
          } catch (error) {
            // Skip bills user cannot access
            if (!(error instanceof UnauthorizedError)) {
              throw error;
            }
          }
        }
        
        return authorizedBills;
      }

      return bills;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to get bills:', { component: 'BillsService' }, serializeError(error));
      throw new Error('Failed to retrieve bills from storage');
    }
  }

  /**
   * Fetches a single bill by ID with aggressive caching and authorization.
   * Cache-first strategy dramatically reduces database load for popular bills.
   */
  async getBill(id: number, auth?: AuthContext): Promise<Bill> {
    try {
      this.validatePositiveInteger(id, 'Bill ID');

      const cachedBill = this.getCachedData(this.billCache, id);
      if (cachedBill) {
        await this.checkBillAuthorization(cachedBill, auth);
        return cachedBill;
      }

      const bill = await storage.getBill(id);

      if (!bill) {
        throw new BillNotFoundError(id);
      }

      await this.checkBillAuthorization(bill, auth);

      this.setCachedData(this.billCache, id, bill);
      return bill;
    } catch (error) {
      if (error instanceof BillNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to get bill ${id}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to retrieve bill ${id} from storage`);
    }
  }

  /**
   * Creates a new bill after thorough validation and normalization.
   * Automatically caches the created bill to optimize immediate follow-up reads.
   * Associates bill with authenticated user if authorization is enabled.
   */
  async createBill(bill: InsertBill, auth?: AuthContext): Promise<Bill> {
    try {
      this.validateBillInput(bill);

      // Require authentication for bill creation if auth is enabled
      if (this.authConfig.enabled && !auth) {
        throw new UnauthorizedError('Authentication required to create bills');
      }

      const normalizedBill: InsertBill = {
        ...bill,
        title: bill.title.trim(),
        content: bill.content.trim(),
        description: bill.description.trim(),
        status: bill.status ?? 'introduced',
        tags: bill.tags?.map(tag => tag.trim().toLowerCase())
      };

      // Associate bill with authenticated user if auth is provided
      if (auth) {
        (normalizedBill as any).authorId = auth.userId;
      }

      const createdBill = await storage.createBill(normalizedBill);

      this.setCachedData(this.billCache, createdBill.id, createdBill);

      return createdBill;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to create bill:', { component: 'BillsService' }, serializeError(error));
      throw new Error('Failed to create bill in storage');
    }
  }

  /**
   * Queries bills matching any provided tag with case-insensitive comparison.
   * Returns empty array for invalid or empty tag lists rather than erroring.
   * Applies authorization filtering to results.
   */
  async getBillsByTags(tags: string[], auth?: AuthContext): Promise<Bill[]> {
    try {
      if (!Array.isArray(tags)) {
        throw new ValidationError('Tags must be provided as an array');
      }

      if (tags.length === 0) {
        return [];
      }

      const normalizedTags = tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase())
        .filter((tag, index, self) => self.indexOf(tag) === index); // Remove duplicates

      if (normalizedTags.length === 0) {
        return [];
      }

      const bills = await storage.getBillsByTags(normalizedTags);

      // Apply authorization filtering if enabled
      if (this.authConfig.enabled && auth) {
        const authorizedBills: Bill[] = [];
        
        for (const bill of bills) {
          try {
            await this.checkBillAuthorization(bill, auth);
            authorizedBills.push(bill);
          } catch (error) {
            if (!(error instanceof UnauthorizedError)) {
              throw error;
            }
          }
        }
        
        return authorizedBills;
      }

      return bills;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to get bills by tags:', { component: 'BillsService' }, serializeError(error));
      throw new Error('Failed to retrieve bills by tags from storage');
    }
  }

  /**
   * Atomically increments view counter for analytics tracking.
   * Invalidates cache to ensure subsequent reads reflect updated counts.
   * Requires read authorization but not write authorization.
   */
  async incrementBillViews(billId: number, auth?: AuthContext): Promise<Bill> {
    try {
      this.validatePositiveInteger(billId, 'Bill ID');

      const bill = await this.getBill(billId, auth);

      const updatedBill = await storage.incrementBillViews(billId);

      this.billCache.delete(billId);

      return updatedBill;
    } catch (error) {
      if (error instanceof BillNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to increment views for bill ${billId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to update view count for bill ${billId}`);
    }
  }

  /**
   * Increments share counter for social engagement metrics.
   * Follows same cache invalidation pattern as view increment.
   */
  async incrementBillShares(billId: number, auth?: AuthContext): Promise<Bill> {
    try {
      this.validatePositiveInteger(billId, 'Bill ID');

      const bill = await this.getBill(billId, auth);

      const updatedBill = await storage.incrementBillShares(billId);

      this.billCache.delete(billId);

      return updatedBill;
    } catch (error) {
      if (error instanceof BillNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to increment shares for bill ${billId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to update share count for bill ${billId}`);
    }
  }

  /**
   * Retrieves all comments for a bill with two-level caching.
   * Validates bill existence and authorization before retrieving comments.
   */
  async getBillComments(billId: number, auth?: AuthContext): Promise<BillComment[]> {
    try {
      this.validatePositiveInteger(billId, 'Bill ID');

      const cachedComments = this.getCachedData(this.commentCache, billId);
      if (cachedComments) {
        await this.getBill(billId, auth); // Verify authorization
        return cachedComments;
      }

      await this.getBill(billId, auth);

      if (typeof storageAny.getBillComments !== 'function') {
        throw new Error('getBillComments method not implemented in storage layer');
      }

      const comments = await storageAny.getBillComments(billId);

      this.setCachedData(this.commentCache, billId, comments);

      return comments;
    } catch (error) {
      if (error instanceof BillNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to get comments for bill ${billId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to retrieve comments for bill ${billId}`);
    }
  }

  /**
   * Creates a new comment with extensive validation including parent verification.
   * Ensures referential integrity for threaded comment hierarchies.
   * Requires authorization to comment on bills.
   */
  async createBillComment(comment: InsertBillComment, auth?: AuthContext): Promise<BillComment> {
    try {
      this.validateCommentInput(comment);

      // Verify authorization to access the bill
      await this.getBill(comment.billId, auth);

      // Require authentication for comment creation if auth is enabled
      if (this.authConfig.enabled && !auth) {
        throw new UnauthorizedError('Authentication required to create comments');
      }

      const normalizedComment: InsertBillComment = {
        ...comment,
        content: comment.content.trim(),
        parentCommentId: comment.parentCommentId ?? undefined
      };

      // Ensure comment author matches authenticated user if auth is enabled
      if (auth && normalizedComment.authorId !== auth.userId) {
        throw new UnauthorizedError('Cannot create comments on behalf of other users');
      }

      if (normalizedComment.parentCommentId) {
        const existingComments = await this.getBillComments(comment.billId, auth);
        const parentExists = existingComments.some(c => c.id === normalizedComment.parentCommentId);
        
        if (!parentExists) {
          throw new ValidationError(
            `Parent comment ${normalizedComment.parentCommentId} does not exist for this bill`
          );
        }
      }

      if (typeof storageAny.createBillComment !== 'function') {
        throw new Error('createBillComment method not implemented in storage layer');
      }

      const createdComment = await storageAny.createBillComment(normalizedComment);

      this.commentCache.delete(comment.billId);

      return createdComment;
    } catch (error) {
      if (error instanceof BillNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to create comment:', { component: 'BillsService' }, serializeError(error));
      throw new Error('Failed to create comment in storage');
    }
  }

  /**
   * Updates endorsement count with validation for non-negative integers.
   * Invalidates cache to reflect updated engagement metrics.
   */
  async updateBillCommentEndorsements(commentId: number, endorsements: number, auth?: AuthContext): Promise<BillComment> {
    try {
      this.validatePositiveInteger(commentId, 'Comment ID');

      if (typeof endorsements !== 'number' || endorsements < 0 || !Number.isInteger(endorsements)) {
        throw new ValidationError('Endorsements must be a non-negative integer');
      }

      if (typeof storageAny.updateBillCommentEndorsements !== 'function') {
        throw new Error('updateBillCommentEndorsements method not implemented in storage layer');
      }

      const updatedComment = await storageAny.updateBillCommentEndorsements(commentId, endorsements);

      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }

      // Verify authorization to access parent bill
      await this.getBill(updatedComment.billId, auth);

      this.commentCache.delete(updatedComment.billId);

      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to update endorsements for comment ${commentId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to update endorsements for comment ${commentId}`);
    }
  }

  /**
   * Fetches all replies to a parent comment for threaded discussions.
   * Enables nested comment UI rendering.
   */
  async getCommentReplies(parentId: number, auth?: AuthContext): Promise<BillComment[]> {
    try {
      this.validatePositiveInteger(parentId, 'Parent comment ID');

      if (typeof storageAny.getCommentReplies !== 'function') {
        throw new Error('getCommentReplies method not implemented in storage layer');
      }

      const replies = await storageAny.getCommentReplies(parentId);

      // Verify authorization for each reply's parent bill
      if (replies.length > 0 && this.authConfig.enabled) {
        const billId = replies[0].billId;
        await this.getBill(billId, auth);
      }

      return replies;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to get replies for comment ${parentId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to retrieve replies for comment ${parentId}`);
    }
  }

  /**
   * Marks a comment as highlighted for editorial curation.
   * Useful for featuring particularly insightful community contributions.
   * Requires elevated permissions (admin/moderator roles).
   */
  async highlightComment(commentId: number, auth?: AuthContext): Promise<BillComment> {
    try {
      this.validatePositiveInteger(commentId, 'Comment ID');

      // Require admin/moderator role for highlighting
      if (this.authConfig.enabled) {
        if (!auth) {
          throw new UnauthorizedError('Authentication required to highlight comments');
        }
        
        if (!auth.roles?.includes('admin') && !auth.roles?.includes('moderator')) {
          throw new UnauthorizedError('Insufficient permissions: admin or moderator role required');
        }
      }

      if (typeof storageAny.highlightComment !== 'function') {
        throw new Error('highlightComment method not implemented in storage layer');
      }

      const updatedComment = await storageAny.highlightComment(commentId);

      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }

      this.commentCache.delete(updatedComment.billId);

      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to highlight comment ${commentId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to highlight comment ${commentId}`);
    }
  }

  /**
   * Removes highlight status from a comment.
   * Allows moderators to un-feature previously highlighted content.
   * Requires elevated permissions (admin/moderator roles).
   */
  async unhighlightComment(commentId: number, auth?: AuthContext): Promise<BillComment> {
    try {
      this.validatePositiveInteger(commentId, 'Comment ID');

      // Require admin/moderator role for unhighlighting
      if (this.authConfig.enabled) {
        if (!auth) {
          throw new UnauthorizedError('Authentication required to unhighlight comments');
        }
        
        if (!auth.roles?.includes('admin') && !auth.roles?.includes('moderator')) {
          throw new UnauthorizedError('Insufficient permissions: admin or moderator role required');
        }
      }

      if (typeof storageAny.unhighlightComment !== 'function') {
        throw new Error('unhighlightComment method not implemented in storage layer');
      }

      const updatedComment = await storageAny.unhighlightComment(commentId);

      if (!updatedComment) {
        throw new CommentNotFoundError(commentId);
      }

      this.commentCache.delete(updatedComment.billId);

      return updatedComment;
    } catch (error) {
      if (error instanceof CommentNotFoundError || 
          error instanceof ValidationError || 
          error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error(`Failed to unhighlight comment ${commentId}:`, { component: 'BillsService' }, serializeError(error));
      throw new Error(`Failed to unhighlight comment ${commentId}`);
    }
  }

  /**
   * Updates the authorization configuration at runtime.
   * Allows dynamic security policy changes without service restart.
   */
  setAuthorizationConfig(config: Partial<AuthorizationConfig>): void {
    this.authConfig = {
      ...this.authConfig,
      ...config
    };
  }

  /**
   * Gets the current authorization configuration.
   * Useful for debugging and monitoring security settings.
   */
  getAuthorizationConfig(): AuthorizationConfig {
    return { ...this.authConfig };
  }

  /**
   * Purges all cached data and resets performance counters.
   * Essential for testing and manual cache management scenarios.
   */
  clearCache(): void {
    this.billCache.clear();
    this.commentCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Invalidates cache entries for a specific bill and its comments.
   * Useful when external updates occur that bypass the service layer.
   */
  invalidateBillCache(billId: number): void {
    this.billCache.delete(billId);
    this.commentCache.delete(billId);
  }

  /**
   * Provides real-time cache performance metrics for monitoring dashboards.
   * Helps identify cache tuning opportunities and effectiveness.
   */
  getCacheStats(): { 
    hits: number; 
    misses: number; 
    hitRate: number; 
    billCacheSize: number; 
    commentCacheSize: number;
    totalSize: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) : 0,
      billCacheSize: this.billCache.size,
      commentCacheSize: this.commentCache.size,
      totalSize: this.billCache.size + this.commentCache.size
    };
  }

  /**
   * Gracefully shuts down the service by stopping background tasks.
   * Call this before application termination to prevent memory leaks.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clearCache();
  }
}

/**
 * Export singleton instance for application-wide use.
 * Use the default instance with authorization disabled for backward compatibility.
 */
export const billsService = new BillsServiceImpl();

/**
 * Factory function to create a service instance with custom configuration.
 * Use this when you need authorization enabled or custom auth logic.
 * 
 * Example usage:
 * ```typescript
 * const secureService = createBillsService({
 *   enabled: true,
 *   allowPublicRead: false,
 *   checkBillAccess: (bill, auth) => {
 *     return bill.isPublic || bill.authorId === auth.userId;
 *   }
 * });
 * ```
 */
export function createBillsService(authConfig?: AuthorizationConfig): BillsService {
  return new BillsServiceImpl(authConfig);
}
