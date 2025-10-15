import { database as db } from '../../../shared/database/connection.js';
import { notifications, users } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { smartNotificationFilterService, type FilterCriteria, type FilterResult } from './smart-notification-filter.js';
import { notificationChannelService, type ChannelDeliveryRequest, type DeliveryResult } from './notification-channels.js';
import { userPreferencesService, type BillTrackingPreferences } from '../../features/users/domain/user-preferences.js';
import { logger } from '@shared/utils/logger';

/**
 * Notification Orchestrator Service
 * 
 * Purpose: Coordinates the entire notification workflow by bringing together
 * filtering, batching, scheduling, and channel delivery.
 * 
 * Responsibilities:
 * - Receive notification requests from application features
 * - Use SmartFilterService to determine if notification should be sent
 * - Manage batching and scheduling based on user preferences
 * - Handle rate limiting to prevent spam
 * - Coordinate delivery across multiple channels via ChannelService
 * - Track delivery status and handle failures
 * - Provide analytics and monitoring
 * 
 * This service does NOT:
 * - Make filtering decisions (delegates to SmartFilterService)
 * - Handle channel-specific delivery (delegates to ChannelService)
 * - Store user preferences (uses UserPreferencesService)
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface NotificationRequest {
  userId: string;
  billId?: number;
  category?: string;
  tags?: string[];
  sponsorName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notificationType: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update';
  content: {
    title: string;
    message: string;
    htmlMessage?: string;
  };
  metadata?: {
    actionUrl?: string;
    relatedBillId?: number;
    [key: string]: any;
  };
  config?: {
    skipFiltering?: boolean;
    forceImmediate?: boolean;
    channels?: Array<'email' | 'inApp' | 'sms' | 'push'>;
    retryOnFailure?: boolean;
  };
}

export interface NotificationBatch {
  id: string;
  userId: string;
  notifications: NotificationRequest[];
  scheduledFor: Date;
  createdAt: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  retryCount?: number;
  lastError?: string;
}

export interface RateLimitState {
  count: number;
  urgentCount: number;
  resetTime: number;
  lastNotificationTime: number;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  filtered: boolean;
  filterReason?: string;
  batched: boolean;
  batchId?: string;
  deliveryResults?: DeliveryResult[];
  error?: string;
}

export interface BulkNotificationResult {
  total: number;
  sent: number;
  filtered: number;
  batched: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

interface OrchestratorConfig {
  rateLimiting: {
    maxPerHour: number;
    maxUrgentPerHour: number;
    windowMs: number;
  };
  batching: {
    checkIntervalMs: number;
    maxBatchSize: number;
    maxRetries: number;
  };
  processing: {
    bulkChunkSize: number;
    chunkDelayMs: number;
    maxConcurrentBatches: number;
  };
  cleanup: {
    rateLimitCleanupIntervalMs: number;
    batchCleanupIntervalMs: number;
    failedBatchRetentionMs: number;
  };
}

interface ServiceMetrics {
  totalSent: number;
  totalFiltered: number;
  totalBatched: number;
  totalFailed: number;
  totalRetried: number;
  averageDeliveryTime: number;
  lastProcessedAt?: Date;
}

// ============================================================================
// Main Service Class
// ============================================================================

export class NotificationOrchestratorService {
  // Configuration with sensible defaults
  private readonly config: OrchestratorConfig = {
    rateLimiting: {
      maxPerHour: 50,
      maxUrgentPerHour: 10,
      windowMs: 60 * 60 * 1000 // 1 hour
    },
    batching: {
      checkIntervalMs: 60000, // 1 minute
      maxBatchSize: 10,
      maxRetries: 3
    },
    processing: {
      bulkChunkSize: 50,
      chunkDelayMs: 100,
      maxConcurrentBatches: 5
    },
    cleanup: {
      rateLimitCleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
      batchCleanupIntervalMs: 60 * 60 * 1000, // 1 hour
      failedBatchRetentionMs: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  // State management
  private batches: Map<string, NotificationBatch> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private processingBatches: Set<string> = new Set(); // Track concurrent batch processing
  
  // Background tasks
  private batchProcessor: ReturnType<typeof setInterval> | null = null;
  private cleanupTasks: ReturnType<typeof setInterval>[] = [];
  
  // Metrics and observability
  private metrics: ServiceMetrics = {
    totalSent: 0,
    totalFiltered: 0,
    totalBatched: 0,
    totalFailed: 0,
    totalRetried: 0,
    averageDeliveryTime: 0
  };
  private deliveryTimes: number[] = [];
  
  // Service state
  private isShuttingDown = false;

  constructor(customConfig?: Partial<OrchestratorConfig>) {
    // Merge custom config with defaults
    if (customConfig) {
      this.config = this.mergeConfig(this.config, customConfig);
    }

    this.startBatchProcessor();
    this.startCleanupTasks();
    
    logger.info('Notification Orchestrator initialized', {
      component: 'NotificationOrchestrator',
      config: this.config
    });
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Send a notification through the complete orchestration pipeline
   * 
   * This is the main entry point for all notification requests.
   * It handles the complete workflow from filtering to delivery.
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    // Prevent new operations during shutdown
    if (this.isShuttingDown) {
      return {
        success: false,
        filtered: false,
        batched: false,
        error: 'Service is shutting down'
      };
    }

    const startTime = Date.now();

    try {
      logger.info('Processing notification request', {
        component: 'NotificationOrchestrator',
        userId: request.userId,
        type: request.notificationType,
        priority: request.priority
      });

      // Step 1: Validate request
      const validationError = this.validateRequest(request);
      if (validationError) {
        return {
          success: false,
          filtered: true,
          filterReason: validationError,
          batched: false
        };
      }

      // Step 2: Rate limiting check
      if (!request.config?.skipFiltering) {
        const rateLimitCheck = this.checkRateLimit(request.userId, request.priority);
        if (!rateLimitCheck.allowed) {
          logger.warn('Notification rate limit exceeded', {
            component: 'NotificationOrchestrator',
            userId: request.userId,
            reason: rateLimitCheck.reason
          });
          return {
            success: false,
            filtered: true,
            filterReason: rateLimitCheck.reason,
            batched: false
          };
        }
      }

      // Step 3: Smart filtering
      const filterResult = await this.applySmartFiltering(request);
      
      if (!filterResult.shouldNotify) {
        this.metrics.totalFiltered++;
        logger.info('Notification filtered', {
          component: 'NotificationOrchestrator',
          userId: request.userId,
          reasons: filterResult.reasons
        });
        return {
          success: true,
          filtered: true,
          filterReason: filterResult.reasons.join('; '),
          batched: false
        };
      }

      // Step 4: Determine delivery strategy (immediate vs batched)
      const shouldBatch = this.shouldBatchNotification(request, filterResult);

      if (shouldBatch) {
        const batchId = await this.addToBatch(request, filterResult);
        this.metrics.totalBatched++;
        
        return {
          success: true,
          filtered: false,
          batched: true,
          batchId
        };
      }

      // Step 5: Immediate delivery
      const deliveryResult = await this.deliverImmediately(request, filterResult);
      
      // Step 6: Update rate limit counter and metrics
      if (deliveryResult.success) {
        this.updateRateLimit(request.userId, request.priority);
        this.recordDeliveryTime(Date.now() - startTime);
      }
      
      return deliveryResult;

    } catch (error) {
      this.metrics.totalFailed++;
      logger.error('Error in notification orchestration:', {
        component: 'NotificationOrchestrator',
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        filtered: false,
        batched: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send notifications to multiple users (bulk operation)
   * 
   * Optimized for performance with batching and parallel processing
   */
  async sendBulkNotification(
    userIds: string[],
    notificationTemplate: Omit<NotificationRequest, 'userId'>
  ): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = {
      total: userIds.length,
      sent: 0,
      filtered: 0,
      batched: 0,
      failed: 0,
      errors: []
    };

    // Handle empty array gracefully
    if (userIds.length === 0) {
      return result;
    }

    logger.info('Starting bulk notification', {
      component: 'NotificationOrchestrator',
      totalUsers: userIds.length
    });

    // Process in chunks to avoid overwhelming the system
    const chunks = this.chunkArray(userIds, this.config.processing.bulkChunkSize);

    for (const chunk of chunks) {
      // Process chunk with Promise.allSettled for better error handling
      const promises = chunk.map(async (userId) => {
        try {
          const request: NotificationRequest = {
            ...notificationTemplate,
            userId
          };

          const notificationResult = await this.sendNotification(request);

          if (notificationResult.success) {
            if (notificationResult.filtered) {
              result.filtered++;
            } else if (notificationResult.batched) {
              result.batched++;
            } else {
              result.sent++;
            }
          } else {
            result.failed++;
            result.errors.push({
              userId,
              error: notificationResult.error || 'Unknown error'
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            userId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      await Promise.allSettled(promises);

      // Add small delay between chunks to prevent overwhelming dependent services
      if (chunks.length > 1) {
        await this.delay(this.config.processing.chunkDelayMs);
      }
    }

    logger.info('Bulk notification completed', {
      component: 'NotificationOrchestrator',
      ...result
    });

    return result;
  }

  /**
   * Get service status and metrics
   */
  getStatus(): {
    batchesQueued: number;
    batchesProcessing: number;
    rateLimitsActive: number;
    metrics: ServiceMetrics;
    isShuttingDown: boolean;
  } {
    return {
      batchesQueued: this.batches.size,
      batchesProcessing: this.processingBatches.size,
      rateLimitsActive: this.rateLimits.size,
      metrics: { ...this.metrics },
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Cleanup resources and shutdown gracefully
   */
  async cleanup(): Promise<void> {
    logger.info('Starting Notification Orchestrator cleanup', {
      component: 'NotificationOrchestrator'
    });

    this.isShuttingDown = true;

    // Stop accepting new batches
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }

    // Stop cleanup tasks
    this.cleanupTasks.forEach(task => clearInterval(task));
    this.cleanupTasks = [];

    // Process any remaining pending batches
    await this.processPendingBatches();

    // Clear state
    this.batches.clear();
    this.rateLimits.clear();
    this.processingBatches.clear();

    logger.info('Notification Orchestrator cleanup completed', {
      component: 'NotificationOrchestrator',
      finalMetrics: this.metrics
    });
  }

  // ============================================================================
  // Private Methods - Request Validation
  // ============================================================================

  /**
   * Validate notification request for required fields and data integrity
   */
  private validateRequest(request: NotificationRequest): string | null {
    if (!request.userId || typeof request.userId !== 'string') {
      return 'Invalid or missing userId';
    }

    if (!request.notificationType) {
      return 'Missing notification type';
    }

    if (!request.priority) {
      return 'Missing priority';
    }

    if (!request.content || !request.content.title || !request.content.message) {
      return 'Invalid or missing content';
    }

    return null;
  }

  // ============================================================================
  // Private Methods - Filtering
  // ============================================================================

  /**
   * Apply smart filtering using the filter service
   */
  private async applySmartFiltering(request: NotificationRequest): Promise<FilterResult> {
    // Skip filtering for critical notifications if configured
    if (request.config?.skipFiltering) {
      return {
        shouldNotify: true,
        confidence: 1.0,
        reasons: ['Filtering bypassed'],
        suggestedPriority: request.priority,
        recommendedChannels: request.config.channels || ['inApp', 'email'],
        shouldBatch: false
      };
    }

    const filterCriteria: FilterCriteria = {
      userId: request.userId,
      billId: request.billId,
      category: request.category,
      tags: request.tags,
      sponsorName: request.sponsorName,
      priority: request.priority,
      notificationType: request.notificationType,
      subType: request.subType,
      content: request.content
    };

    try {
      return await smartNotificationFilterService.shouldSendNotification(filterCriteria);
    } catch (error) {
      // If filtering service fails, default to allowing notification but log error
      logger.error('Smart filtering service error, allowing notification:', {
        component: 'NotificationOrchestrator',
        userId: request.userId
      }, error);
      
      return {
        shouldNotify: true,
        confidence: 0.5,
        reasons: ['Filtering service unavailable'],
        suggestedPriority: request.priority,
        recommendedChannels: ['inApp'],
        shouldBatch: false
      };
    }
  }

  // ============================================================================
  // Private Methods - Delivery Strategy
  // ============================================================================

  /**
   * Determine if notification should be batched or sent immediately
   */
  private shouldBatchNotification(
    request: NotificationRequest,
    filterResult: FilterResult
  ): boolean {
    // Never batch urgent notifications or forced immediate
    if (request.priority === 'urgent' || request.config?.forceImmediate) {
      return false;
    }

    // Never batch digest notifications (they're already batched)
    if (request.notificationType === 'digest') {
      return false;
    }

    // Use filter service recommendation
    return filterResult.shouldBatch;
  }

  /**
   * Deliver notification immediately across appropriate channels
   */
  private async deliverImmediately(
    request: NotificationRequest,
    filterResult: FilterResult
  ): Promise<NotificationResult> {
    try {
      // Determine channels to use
      const channels = request.config?.channels || filterResult.recommendedChannels;

      if (channels.length === 0) {
        return {
          success: false,
          filtered: true,
          filterReason: 'No delivery channels available',
          batched: false
        };
      }

      // Create channel delivery requests with retry logic
      const deliveryResults: DeliveryResult[] = [];
      const maxRetries = request.config?.retryOnFailure ? 2 : 0;

      for (const channel of channels) {
        const channelRequest: ChannelDeliveryRequest = {
          userId: request.userId,
          channel,
          content: request.content,
          metadata: {
            priority: request.priority,
            relatedBillId: request.metadata?.relatedBillId,
            category: request.category,
            actionUrl: request.metadata?.actionUrl,
            ...request.metadata
          }
        };

        // Attempt delivery with retries
        let result = await notificationChannelService.sendToChannel(channelRequest);
        let retryCount = 0;

        while (!result.success && retryCount < maxRetries) {
          retryCount++;
          this.metrics.totalRetried++;
          logger.warn('Retrying channel delivery', {
            component: 'NotificationOrchestrator',
            channel,
            attempt: retryCount + 1
          });
          
          await this.delay(1000 * retryCount); // Exponential backoff
          result = await notificationChannelService.sendToChannel(channelRequest);
        }

        deliveryResults.push(result);
      }

      // Determine overall success
      const allSucceeded = deliveryResults.every(r => r.success);
      const anySucceeded = deliveryResults.some(r => r.success);

      if (allSucceeded) {
        this.metrics.totalSent++;
      } else if (!anySucceeded) {
        this.metrics.totalFailed++;
      }

      logger.info('Immediate delivery completed', {
        component: 'NotificationOrchestrator',
        userId: request.userId,
        channels: deliveryResults.map(r => ({ channel: r.channel, success: r.success })),
        overallSuccess: allSucceeded
      });

      return {
        success: anySucceeded,
        filtered: false,
        batched: false,
        deliveryResults,
        notificationId: deliveryResults.find(r => r.success)?.messageId
      };

    } catch (error) {
      logger.error('Error in immediate delivery:', {
        component: 'NotificationOrchestrator',
        userId: request.userId
      }, error);

      return {
        success: false,
        filtered: false,
        batched: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ============================================================================
  // Private Methods - Batching
  // ============================================================================

  /**
   * Add notification to batch for later delivery
   */
  private async addToBatch(
    request: NotificationRequest,
    filterResult: FilterResult
  ): Promise<string> {
    // Get user preferences to determine batch schedule
    const preferences = await this.getUserPreferences(request.userId);
    const batchKey = this.getBatchKey(request.userId, preferences);

    let batch = this.batches.get(batchKey);

    if (!batch) {
      batch = {
        id: batchKey,
        userId: request.userId,
        notifications: [],
        scheduledFor: this.calculateBatchSchedule(preferences),
        createdAt: new Date(),
        status: 'pending',
        retryCount: 0
      };
      this.batches.set(batchKey, batch);
    }

    // Add to batch
    batch.notifications.push(request);

    logger.info('Added notification to batch', {
      component: 'NotificationOrchestrator',
      batchId: batch.id,
      batchSize: batch.notifications.length,
      scheduledFor: batch.scheduledFor
    });

    // Check if batch should be sent early (e.g., reached max size)
    const maxBatchSize = preferences.billTracking.advancedSettings?.batchingRules?.maxBatchSize 
      || this.config.batching.maxBatchSize;
    
    if (batch.notifications.length >= maxBatchSize) {
      // Process batch asynchronously without blocking
      this.processBatch(batch).catch(error => {
        logger.error('Background batch processing failed:', {
          component: 'NotificationOrchestrator',
          batchId: batch.id
        }, error);
      });
    }

    return batch.id;
  }

  /**
   * Process a batch by creating and sending a digest notification
   */
  private async processBatch(batch: NotificationBatch): Promise<void> {
    // Check if already processing or completed
    if (batch.status !== 'pending' || this.processingBatches.has(batch.id)) {
      return;
    }

    // Respect concurrent batch processing limit
    if (this.processingBatches.size >= this.config.processing.maxConcurrentBatches) {
      logger.warn('Max concurrent batch processing limit reached, deferring', {
        component: 'NotificationOrchestrator',
        batchId: batch.id
      });
      return;
    }

    batch.status = 'processing';
    this.processingBatches.add(batch.id);

    try {
      logger.info('Processing notification batch', {
        component: 'NotificationOrchestrator',
        batchId: batch.id,
        notificationCount: batch.notifications.length
      });

      // Create digest content
      const digestContent = this.createDigestContent(batch.notifications);

      // Create digest notification request
      const digestRequest: NotificationRequest = {
        userId: batch.userId,
        notificationType: 'digest',
        priority: 'medium',
        content: digestContent,
        metadata: {
          batchId: batch.id,
          notificationCount: batch.notifications.length,
          hasUrgent: batch.notifications.some(n => n.priority === 'urgent')
        },
        config: {
          forceImmediate: true,
          skipFiltering: true
        }
      };

      // Send digest
      const result = await this.sendNotification(digestRequest);

      if (result.success) {
        batch.status = 'sent';
        this.batches.delete(batch.id);
        logger.info('Batch processed successfully', {
          component: 'NotificationOrchestrator',
          batchId: batch.id
        });
      } else {
        batch.status = 'failed';
        batch.lastError = result.error;
        batch.retryCount = (batch.retryCount || 0) + 1;
        
        // Retry logic for failed batches
        if (batch.retryCount < this.config.batching.maxRetries) {
          batch.status = 'pending';
          batch.scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
          logger.warn('Batch processing failed, scheduled for retry', {
            component: 'NotificationOrchestrator',
            batchId: batch.id,
            retryCount: batch.retryCount
          });
        } else {
          logger.error('Batch processing failed after max retries', {
            component: 'NotificationOrchestrator',
            batchId: batch.id,
            error: result.error
          });
        }
      }

    } catch (error) {
      batch.status = 'failed';
      batch.lastError = error instanceof Error ? error.message : String(error);
      logger.error('Error processing batch:', {
        component: 'NotificationOrchestrator',
        batchId: batch.id
      }, error);
    } finally {
      this.processingBatches.delete(batch.id);
    }
  }

  /**
   * Create digest content from multiple notifications
   */
  private createDigestContent(notifications: NotificationRequest[]): {
    title: string;
    message: string;
    htmlMessage?: string;
  } {
    const count = notifications.length;
    const categories = this.groupBy(notifications, 'notificationType');

    // Text message
    let message = `You have ${count} new ${count === 1 ? 'notification' : 'notifications'}:\n\n`;
    
    for (const [type, items] of Object.entries(categories)) {
      message += `${this.getTypeLabel(type)} (${items.length}):\n`;
      items.slice(0, 5).forEach((n: NotificationRequest) => {
        message += `• ${n.content.title}\n`;
      });
      if (items.length > 5) {
        message += `• ...and ${items.length - 5} more\n`;
      }
      message += '\n';
    }

    // HTML message
    let htmlMessage = `<h2>Your Notification Digest</h2>`;
    htmlMessage += `<p>You have ${count} new ${count === 1 ? 'notification' : 'notifications'}:</p>`;
    
    for (const [type, items] of Object.entries(categories)) {
      htmlMessage += `<h3>${this.getTypeLabel(type)} (${items.length})</h3><ul>`;
      items.slice(0, 5).forEach((n: NotificationRequest) => {
        const actionLink = n.metadata?.actionUrl 
          ? `<br><a href="${n.metadata.actionUrl}">View Details</a>` 
          : '';
        htmlMessage += `<li><strong>${n.content.title}</strong><br>${n.content.message}${actionLink}</li>`;
      });
      if (items.length > 5) {
        htmlMessage += `<li><em>...and ${items.length - 5} more</em></li>`;
      }
      htmlMessage += '</ul>';
    }

    return {
      title: `Legislative Update Digest (${count} ${count === 1 ? 'update' : 'updates'})`,
      message: message.trim(),
      htmlMessage
    };
  }

  // ============================================================================
  // Private Methods - Rate Limiting
  // ============================================================================

  /**
   * Check if notification would exceed rate limits
   */
  private checkRateLimit(userId: string, priority: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    let limitState = this.rateLimits.get(userId);

    // Initialize or reset if window expired
    if (!limitState || now > limitState.resetTime) {
      limitState = {
        count: 0,
        urgentCount: 0,
        resetTime: now + this.config.rateLimiting.windowMs,
        lastNotificationTime: now
      };
      this.rateLimits.set(userId, limitState);
    }

    // Check general limit
    if (limitState.count >= this.config.rateLimiting.maxPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.rateLimiting.maxPerHour} notifications per hour`
      };
    }

    // Check urgent limit
    if (priority === 'urgent' && limitState.urgentCount >= this.config.rateLimiting.maxUrgentPerHour) {
      return {
        allowed: false,
        reason: `Urgent notification limit exceeded: ${this.config.rateLimiting.maxUrgentPerHour} per hour`
      };
    }

    return { allowed: true };
  }

  /**
   * Update rate limit counters after successful delivery
   */
  private updateRateLimit(userId: string, priority: string): void {
    const limitState = this.rateLimits.get(userId);
    if (limitState) {
      limitState.count++;
      limitState.lastNotificationTime = Date.now();
      if (priority === 'urgent') {
        limitState.urgentCount++;
      }
    }
  }

  // ============================================================================
  // Private Methods - Background Processing
  // ============================================================================

  /**
   * Start batch processor that checks for due batches periodically
   */
  private startBatchProcessor(): void {
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
    }

    this.batchProcessor = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.processScheduledBatches();
      }
    }, this.config.batching.checkIntervalMs);

    logger.info('Batch processor started', {
      component: 'NotificationOrchestrator',
      intervalMs: this.config.batching.checkIntervalMs
    });
  }

  /**
   * Process all batches that are due for delivery
   */
  private async processScheduledBatches(): Promise<void> {
    const now = new Date();
    const dueBatches = Array.from(this.batches.values()).filter(
      batch => batch.status === 'pending' && 
               batch.scheduledFor <= now &&
               !this.processingBatches.has(batch.id)
    );

    if (dueBatches.length === 0) {
      return;
    }

    logger.info('Processing scheduled batches', {
      component: 'NotificationOrchestrator',
      count: dueBatches.length
    });

    // Process batches respecting concurrency limit
    for (const batch of dueBatches) {
      // Wait if at concurrent processing limit
      while (this.processingBatches.size >= this.config.processing.maxConcurrentBatches) {
        await this.delay(1000);
      }
      
      // Process batch asynchronously
      this.processBatch(batch).catch(error => {
        logger.error('Scheduled batch processing failed:', {
          component: 'NotificationOrchestrator',
          batchId: batch.id
        }, error);
      });
    }
  }

  /**
   * Process all pending batches during shutdown
   */
  private async processPendingBatches(): Promise<void> {
    const pendingBatches = Array.from(this.batches.values()).filter(
      batch => batch.status === 'pending'
    );

    if (pendingBatches.length === 0) {
      return;
    }

    logger.info('Processing pending batches during shutdown', {
      component: 'NotificationOrchestrator',
      count: pendingBatches.length
    });

    // Process all pending batches
    await Promise.allSettled(
      pendingBatches.map(batch => this.processBatch(batch))
    );
  }

  /**
   * Start cleanup tasks for expired data
   */
  private startCleanupTasks(): void {
    // Clean expired rate limits
    const rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [userId, state] of this.rateLimits.entries()) {
        if (now > state.resetTime) {
          this.rateLimits.delete(userId);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug('Cleaned expired rate limits', {
          component: 'NotificationOrchestrator',
          count: cleaned
        });
      }
    }, this.config.cleanup.rateLimitCleanupIntervalMs);

    // Clean failed batches
    const batchCleanup = setInterval(() => {
      const cutoffTime = new Date(Date.now() - this.config.cleanup.failedBatchRetentionMs);
      let cleaned = 0;
      
      for (const [batchId, batch] of this.batches.entries()) {
        if (batch.status === 'failed' && batch.createdAt < cutoffTime) {
          this.batches.delete(batchId);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug('Cleaned old failed batches', {
          component: 'NotificationOrchestrator',
          count: cleaned
        });
      }
    }, this.config.cleanup.batchCleanupIntervalMs);

    this.cleanupTasks.push(rateLimitCleanup, batchCleanup);
  }

  // ============================================================================
  // Private Methods - Utility Functions
  // ============================================================================

  /**
   * Get user preferences with fallback defaults
   */
  private async getUserPreferences(userId: string): Promise<{ billTracking: BillTrackingPreferences }> {
    try {
      return await userPreferencesService.getUserPreferences(userId);
    } catch (error) {
      logger.warn('Error getting user preferences, using defaults:', {
        component: 'NotificationOrchestrator',
        userId
      });
      
      // Return sensible defaults if preferences service fails
      return {
        billTracking: {
          statusChanges: true,
          newComments: true,
          votingSchedule: true,
          amendments: true,
          updateFrequency: 'daily',
          notificationChannels: { inApp: true, email: false, push: false, sms: false },
          smartFiltering: { enabled: false, priorityThreshold: 'low' },
          advancedSettings: {
            batchingRules: { 
              similarUpdatesGrouping: true, 
              maxBatchSize: this.config.batching.maxBatchSize, 
              batchTimeWindow: 30 
            }
          }
        } as BillTrackingPreferences
      };
    }
  }

  /**
   * Generate unique batch key based on user and frequency
   */
  private getBatchKey(userId: string, preferences: { billTracking: BillTrackingPreferences }): string {
    const frequency = preferences.billTracking.updateFrequency;
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return `${userId}-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      case 'weekly':
        const weekNum = Math.floor(now.getDate() / 7);
        return `${userId}-${now.getFullYear()}-${now.getMonth()}-week${weekNum}`;
      default: // hourly or immediate
        return `${userId}-${now.getHours()}`;
    }
  }

  /**
   * Calculate when a batch should be sent based on user preferences
   */
  private calculateBatchSchedule(preferences: { billTracking: BillTrackingPreferences }): Date {
    const now = new Date();
    const frequency = preferences.billTracking.updateFrequency;

    switch (frequency) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // Send at 9 AM
        return tomorrow;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay())); // Next Sunday
        nextWeek.setHours(9, 0, 0, 0);
        return nextWeek;
      default: // hourly
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    }
  }

  /**
   * Record delivery time for metrics
   */
  private recordDeliveryTime(timeMs: number): void {
    this.deliveryTimes.push(timeMs);
    
    // Keep only last 1000 delivery times to prevent unbounded growth
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes.shift();
    }
    
    // Calculate rolling average
    const sum = this.deliveryTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageDeliveryTime = Math.round(sum / this.deliveryTimes.length);
    this.metrics.lastProcessedAt = new Date();
  }

  /**
   * Merge custom configuration with defaults
   */
  private mergeConfig(
    defaults: OrchestratorConfig,
    custom: Partial<OrchestratorConfig>
  ): OrchestratorConfig {
    return {
      rateLimiting: { ...defaults.rateLimiting, ...custom.rateLimiting },
      batching: { ...defaults.batching, ...custom.batching },
      processing: { ...defaults.processing, ...custom.processing },
      cleanup: { ...defaults.cleanup, ...custom.cleanup }
    };
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Group array elements by a key
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Get human-readable label for notification type
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      bill_update: '📜 Bill Updates',
      comment_reply: '💬 Comment Replies',
      verification_status: '✅ Verification Updates',
      system_alert: '⚠️ System Alerts',
      digest: '📰 Digest'
    };
    return labels[type] || type;
  }

  /**
   * Delay utility for rate limiting and backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const notificationOrchestratorService = new NotificationOrchestratorService();