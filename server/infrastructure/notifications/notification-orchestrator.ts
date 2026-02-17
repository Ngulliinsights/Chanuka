import { type BillTrackingPreferences as GlobalBillTrackingPreferences,type UserNotificationPreferences, userPreferencesService } from '@server/features/users/domain/user-preferences';
import { type ChannelDeliveryRequest, type DeliveryResult,notificationChannelService } from '@server/infrastructure/notifications/notification-channels';
import { type FilterCriteria, type FilterResult,smartNotificationFilterService } from '@server/infrastructure/notifications/smart-notification-filter';
import { CombinedBillTrackingPreferences } from '@server/infrastructure/notifications/types';
import { logger } from '@server/infrastructure/observability';
import { database as db, readDatabase } from '@server/infrastructure/database';
import { bill_tracking_preferences, bills,notifications, users } from '@server/infrastructure/schema';
import { and,eq } from 'drizzle-orm';

/**
 * Unified Notification Orchestrator Service
 * 
 * Purpose: Coordinates the complete notification workflow by integrating filtering,
 * batching, scheduling, rate limiting, and multi-channel delivery with support for
 * both global and per-bill user preferences.
 * 
 * Key Responsibilities:
 * - Receive notification requests from application features
 * - Apply smart filtering through SmartFilterService
 * - Manage batching and scheduling based on user preferences (global + per-bill)
 * - Handle rate limiting to prevent notification spam
 * - Coordinate multi-channel delivery via ChannelService
 * - Track delivery status and handle failures with retry logic
 * - Provide comprehensive analytics and monitoring
 * 
 * Delegation Strategy:
 * - Filtering decisions → SmartFilterService
 * - Channel-specific delivery → ChannelService
 * - User preference storage → UserPreferencesService
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface NotificationRequest { user_id: string;
  bill_id?: number; // Deprecated in favor of relatedBillId, maintained for backward compatibility
  relatedBillId?: number; // Preferred field name for bill association
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

export interface NotificationBatch { id: string;
  user_id: string;
  notifications: NotificationRequest[];
  scheduledFor: Date;
  created_at: Date;
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
  notification_id?: string;
  filtered: boolean;
  filterReason?: string;
  batched: boolean;
  batchId?: string;
  deliveryResults?: DeliveryResult[];
  error?: string;
}

export interface BulkNotificationResult { total: number;
  sent: number;
  filtered: number;
  batched: number;
  failed: number;
  errors: Array<{ user_id: string; error: string  }>;
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
  // Database accessor using read replica when available
  private get db() { return readDatabase; }

  // Configuration with sensible defaults that can be overridden
  private readonly config: OrchestratorConfig = {
    rateLimiting: {
      maxPerHour: 50, // Prevents notification fatigue
      maxUrgentPerHour: 10, // Stricter limit for urgent notifications
      windowMs: 60 * 60 * 1000 // 1 hour rolling window
    },
    batching: {
      checkIntervalMs: 60000, // Check for due batches every minute
      maxBatchSize: 10, // Group up to 10 notifications per digest
      maxRetries: 3 // Retry failed batch deliveries up to 3 times
    },
    processing: {
      bulkChunkSize: 50, // Process bulk operations in chunks of 50
      chunkDelayMs: 100, // Small delay between chunks to prevent overload
      maxConcurrentBatches: 5 // Limit concurrent batch processing
    },
    cleanup: {
      rateLimitCleanupIntervalMs: 5 * 60 * 1000, // Clean expired rate limits every 5 minutes
      batchCleanupIntervalMs: 60 * 60 * 1000, // Clean old batches every hour
      failedBatchRetentionMs: 24 * 60 * 60 * 1000 // Keep failed batches for 24 hours
    }
  };

  // In-memory state management
  private batches: Map<string, NotificationBatch> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private processingBatches: Set<string> = new Set();
  
  // Background task handles
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
  private deliveryTimes: number[] = []; // Rolling window for average calculation
  
  // Service lifecycle state
  private isShuttingDown = false;

  constructor(customConfig?: Partial<OrchestratorConfig>) {
    // Deep merge custom configuration with defaults
    if (customConfig) {
      this.config = this.mergeConfig(this.config, customConfig);
    }

    // Initialize background processors
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
   * Main entry point: Send a notification through the complete orchestration pipeline.
   * 
   * This method handles the entire notification lifecycle from validation through delivery:
   * 1. Validates the request structure
   * 2. Checks rate limits to prevent spam
   * 3. Fetches and merges global and per-bill user preferences
   * 4. Applies smart filtering based on user preferences and content relevance
   * 5. Determines delivery strategy (immediate vs batched)
   * 6. Executes delivery or adds to batch queue
   * 7. Records metrics and updates rate limits
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    // Prevent new operations during graceful shutdown
    if (this.isShuttingDown) {
      return { 
        success: false, 
        filtered: false, 
        batched: false, 
        error: 'Service shutting down' 
      };
    }

    const startTime = Date.now();

    try { logger.info('Processing notification request', {
        component: 'NotificationOrchestrator',
        user_id: request.user_id,
        type: request.notificationType,
        priority: request.priority
       });

      // Step 1: Validate request structure and required fields
      const validationError = this.validateRequest(request);
      if (validationError) {
        return {
          success: false,
          filtered: true,
          filterReason: validationError,
          batched: false
        };
      }

      // Step 2: Check rate limits (can be bypassed for critical notifications)
      if (!request.config?.skipFiltering) { const rateLimitCheck = this.checkRateLimit(request.user_id, request.priority);
        if (!rateLimitCheck.allowed) {
          logger.warn('Rate limit exceeded', {
            component: 'NotificationOrchestrator',
            user_id: request.user_id,
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

      // Step 3: Fetch combined preferences (global + per-bill with priority to per-bill)
      // This ensures we respect both user-wide settings and specific bill tracking preferences
      const bill_id = request.relatedBillId ?? request.bill_id; // Support both field names
      const combinedPreferences = await this.getCombinedPreferences(request.user_id, bill_id);

      // Step 4: Apply smart filtering using combined preferences
      // The filter service uses ML/rules to determine notification relevance
      const filterResult = await this.applySmartFiltering(request, combinedPreferences);
      
      if (!filterResult.shouldNotify) { this.metrics.totalFiltered++;
        logger.info('Notification filtered', {
          component: 'NotificationOrchestrator',
          user_id: request.user_id,
          reasons: filterResult.reasons
         });
        return {
          success: true,
          filtered: true,
          filterReason: filterResult.reasons.join('; '),
          batched: false
        };
      }

      // Step 5: Determine delivery strategy based on preferences and notification characteristics
      const shouldBatch = this.shouldBatchNotification(request, filterResult, combinedPreferences);

      if (shouldBatch) {
        // Add to batch for later digest delivery
        const batchId = await this.addToBatch(request, filterResult, combinedPreferences);
        this.metrics.totalBatched++;
        
        return {
          success: true,
          filtered: false,
          batched: true,
          batchId
        };
      }

      // Step 6: Deliver immediately across appropriate channels
      const deliveryResult = await this.deliverImmediately(request, filterResult, combinedPreferences);
      
      // Step 7: Update rate limit counters and record performance metrics
      if (deliveryResult.success) {
        this.updateRateLimit(request.user_id, request.priority);
        this.recordDeliveryTime(Date.now() - startTime);
      }
      
      return deliveryResult;

    } catch (error) { this.metrics.totalFailed++;
      logger.error('Error in notification orchestration:', {
        component: 'NotificationOrchestrator',
        user_id: request.user_id,
        error: error instanceof Error ? error.message : String(error)
       }, error);
      
      return {
        success: false,
        filtered: false,
        batched: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send notifications to multiple users efficiently.
   * 
   * Optimized for bulk operations with chunking to prevent system overload.
   * Each notification is processed through the full pipeline independently,
   * allowing for per-user filtering and preference handling.
   */
  async sendBulkNotification(
    user_ids: string[],
    notificationTemplate: Omit<NotificationRequest, 'user_id'>
  ): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = {
      total: user_ids.length,
      sent: 0,
      filtered: 0,
      batched: 0,
      failed: 0,
      errors: []
    };

    // Handle empty array gracefully
    if (user_ids.length === 0) {
      return result;
    }

    logger.info('Starting bulk notification', {
      component: 'NotificationOrchestrator',
      totalUsers: user_ids.length,
      notificationType: notificationTemplate.notificationType
    });

    // Process in chunks to avoid overwhelming the system
    const chunks = this.chunkArray(user_ids, this.config.processing.bulkChunkSize);

    for (const chunk of chunks) { // Use Promise.allSettled to continue processing even if some fail
      const promises = chunk.map(async (user_id) => {
        try {
          const request: NotificationRequest = {
            ...notificationTemplate,
            user_id
           };

          const notificationResult = await this.sendNotification(request);

          // Categorize result for summary
          if (notificationResult.success) {
            if (notificationResult.filtered) {
              result.filtered++;
            } else if (notificationResult.batched) {
              result.batched++;
            } else {
              result.sent++;
            }
          } else { result.failed++;
            result.errors.push({
              user_id,
              error: notificationResult.error || 'Unknown error'
             });
          }
        } catch (error) { result.failed++;
          result.errors.push({
            user_id,
            error: error instanceof Error ? error.message : String(error)
           });
        }
      });

      await Promise.allSettled(promises);

      // Small delay between chunks to prevent service saturation
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
   * Get current service status and performance metrics.
   * Useful for monitoring dashboards and health checks.
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
   * Gracefully shutdown the service.
   * 
   * Ensures all pending batches are processed before stopping.
   * Should be called during application shutdown to prevent data loss.
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

    // Stop all cleanup tasks
    this.cleanupTasks.forEach(task => clearInterval(task));
    this.cleanupTasks = [];

    // Process any remaining pending batches before shutdown
    await this.processPendingBatches();

    // Clear all in-memory state
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
   * Validate notification request structure and required fields.
   * Returns error message if validation fails, null if valid.
   */
  private validateRequest(request: NotificationRequest): string | null { if (!request.user_id || typeof request.user_id !== 'string') {
      return 'Invalid or missing user_id';
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
  // Private Methods - Preferences Management (Core Enhancement)
  // ============================================================================

  /**
   * Fetches and intelligently merges global and per-bill preferences.
   * 
   * Preference Priority Hierarchy:
   * 1. Active per-bill settings (highest priority)
   * 2. Global user preferences
   * 3. System defaults (fallback)
   * 
   * This ensures users can have broad notification settings while still
   * customizing behavior for specific bills they care about deeply.
   */
  private async getCombinedPreferences(
    user_id: string, 
    bill_id?: number
  ): Promise<{ billTracking: CombinedBillTrackingPreferences }> { try {
      // Fetch global preferences from the user preferences service
      const globalPrefsContainer = await userPreferencesService.getUserPreferences(user_id);
      const globalBillPrefs = globalPrefsContainer.billTracking;

      // Fetch per-bill preferences if a specific bill is referenced
      let perBillPrefs: typeof bill_tracking_preferences.$inferSelect | null = null;
      if (bill_id) {
        const [result] = await this.db.select()
          .from(bill_tracking_preferences)
          .where(and(
            eq(bill_tracking_preferences.user_id, user_id),
            eq(bill_tracking_preferences.bill_id, bill_id)
          ))
          .limit(1);
        perBillPrefs = result || null;
        }

      // Merge preferences with per-bill settings taking precedence
      if (perBillPrefs && perBillPrefs.is_active !== false) {
        // Per-bill settings exist and are active - use them to override global settings
        const combined: CombinedBillTrackingPreferences = {
          // Start with global settings as the base
          ...globalBillPrefs,
          
          // Override with per-bill specific settings where they exist
          tracking_types: perBillPrefs.tracking_types ?? globalBillPrefs.tracking_types,
          
          // Map alert frequency from per-bill to global format
          alert_frequency: (perBillPrefs.alert_frequency as GlobalBillTrackingPreferences['updateFrequency']) 
            ?? globalBillPrefs.updateFrequency,
          updateFrequency: (perBillPrefs.alert_frequency as GlobalBillTrackingPreferences['updateFrequency']) 
            ?? globalBillPrefs.updateFrequency,
          
          // Merge channel preferences intelligently
          alert_channels: perBillPrefs.alert_channels ?? [],
          notificationChannels: this.mergeChannels(
            globalBillPrefs.notificationChannels, 
            perBillPrefs.alert_channels
          ),
          
          // Keep global settings for features not typically overridden per-bill
          quietHours: globalBillPrefs.quietHours,
          smartFiltering: globalBillPrefs.smartFiltering,
          advancedSettings: globalBillPrefs.advancedSettings,
          
          // Internal flag for debugging and logging
          _perBillSettingsApplied: true
        };

        logger.debug(`Using merged preferences for user ${ user_id }, bill ${ bill_id }`, {
          component: 'NotificationOrchestrator',
          hasPerBillOverrides: true
        });
        
        return { billTracking: combined };
      } else { // No per-bill settings or they're inactive - use global preferences
        logger.debug(`Using global preferences for user ${user_id }, bill ${ bill_id }`, {
          component: 'NotificationOrchestrator',
          hasPerBillOverrides: false
        });
        
        // Create a combined object that maintains type consistency
        const globalCombined: CombinedBillTrackingPreferences = {
          ...globalBillPrefs,
          alert_frequency: globalBillPrefs.updateFrequency,
          alert_channels: Object.entries(globalBillPrefs.notificationChannels)
            .filter(([, enabled]) => enabled)
            .map(([channel]) => {
              // Map channel names to per-bill format
              const channelMap: Record<string, 'in_app' | 'email' | 'push' | 'sms'> = {
                'inApp': 'in_app',
                'email': 'email',
                'push': 'push',
                'sms': 'sms'
              };
              return channelMap[channel] || channel as unknown;
            }),
          _perBillSettingsApplied: false
        };
        
        return { billTracking: globalCombined };
      }
    } catch (error) { logger.error(`Error fetching combined preferences for user ${user_id }, bill ${ bill_id }:`, {
        component: 'NotificationOrchestrator'
      }, error);
      
      // Return sensible defaults on error to prevent notification failures
      const defaultPrefs: CombinedBillTrackingPreferences = {
        statusChanges: true,
        newComments: true,
        votingSchedule: true,
        amendments: true,
        updateFrequency: 'daily',
        alert_frequency: 'daily',
        notificationChannels: { inApp: true, email: false, push: false, sms: false },
        alert_channels: ['in_app'],
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
        smartFiltering: { enabled: true, priorityThreshold: 'low' },
        advancedSettings: {
          batchingRules: {
            similarUpdatesGrouping: true,
            maxBatchSize: this.config.batching.maxBatchSize,
            batchTimeWindow: 30
          }
        },
        _perBillSettingsApplied: false
      };
      
      return { billTracking: defaultPrefs };
    }
  }

  /**
   * Intelligently merge global and per-bill channel settings.
   * 
   * If per-bill channels are specified, they completely override global settings
   * for that bills. This gives users fine-grained control without complex merging logic.
   */
  private mergeChannels(
    globalChannels: GlobalBillTrackingPreferences['notificationChannels'],
    perBillChannels?: Array<'in_app' | 'email' | 'push' | 'sms'> | null
  ): GlobalBillTrackingPreferences['notificationChannels'] {
    if (!perBillChannels || perBillChannels.length === 0) {
      return globalChannels; // Use global settings if no per-bill override
    }

    // Create channel object from per-bill array
    const merged: GlobalBillTrackingPreferences['notificationChannels'] = {
      inApp: false,
      email: false,
      push: false,
      sms: false
    };

    // Enable channels specified in per-bill settings
    perBillChannels.forEach(channel => {
      if (channel === 'in_app') merged.inApp = true;
      else if (channel === 'email') merged.email = true;
      else if (channel === 'push') merged.push = true;
      else if (channel === 'sms') merged.sms = true;
    });

    return merged;
  }

  // ============================================================================
  // Private Methods - Filtering
  // ============================================================================

  /**
   * Apply smart filtering using the filter service with combined preferences.
   * 
   * The filter service uses ML models and business rules to determine if a
   * notification should be sent based on content relevance, user behavior patterns,
   * and explicit user preferences.
   */
  private async applySmartFiltering(
    request: NotificationRequest,
    combinedPrefs: { billTracking: CombinedBillTrackingPreferences }
  ): Promise<FilterResult> {
    // Allow critical notifications to bypass filtering
    if (request.config?.skipFiltering) {
      return {
        shouldNotify: true,
        confidence: 1.0,
        reasons: ['Filtering bypassed'],
        suggestedPriority: request.priority,
        recommendedChannels: request.config.channels || ['inApp'],
        shouldBatch: false
      };
    }

    // Prepare criteria for filter service, including merged preferences
    const bill_id = request.relatedBillId ?? request.bill_id;
    const filterCriteria: FilterCriteria = { user_id: request.user_id,
      bill_id: bill_id,
      category: request.category,
      tags: request.tags,
      sponsorName: request.sponsorName,
      priority: request.priority,
      notificationType: request.notificationType,
      subType: request.subType,
      content: request.content,
      userPreferences: combinedPrefs.billTracking // Pass merged preferences to filter
      };

    try {
      return await smartNotificationFilterService.shouldSendNotification(filterCriteria);
    } catch (error) { // Fail open: if filtering fails, allow notification but log the error
      logger.error('Smart filtering service error, allowing notification:', {
        component: 'NotificationOrchestrator',
        user_id: request.user_id
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
   * Determine if notification should be batched based on multiple factors.
   * 
   * Batching Decision Hierarchy:
   * 1. Never batch urgent or forced immediate notifications
   * 2. Never batch digest notifications (already batched)
   * 3. Check user's update frequency preference
   * 4. Consider filter service recommendations
   */
  private shouldBatchNotification(
    request: NotificationRequest,
    filterResult: FilterResult,
    combinedPrefs: { billTracking: CombinedBillTrackingPreferences }
  ): boolean {
    // Rule 1: Never batch urgent or explicitly immediate notifications
    if (request.priority === 'urgent' || request.config?.forceImmediate) {
      return false;
    }

    // Rule 2: Never batch digest notifications (they're already aggregated)
    if (request.notificationType === 'digest') {
      return false;
    }

    // Rule 3: Check user's preferred update frequency
    const frequency = combinedPrefs.billTracking.alert_frequency 
      ?? combinedPrefs.billTracking.updateFrequency;
    if (frequency === 'immediate') {
      return false;
    }

    // Rule 4: Default to batching for non-immediate frequencies
    return true;
  }

  /**
   * Deliver notification immediately across appropriate channels.
   * 
   * Channel Selection Logic:
   * 1. Start with channels enabled in user preferences
   * 2. Intersect with filter service recommendations
   * 3. Allow request config to override if specified
   * 4. Implement retry logic with exponential backoff
   */
  private async deliverImmediately(
    request: NotificationRequest,
    filterResult: FilterResult,
    combinedPrefs: { billTracking: CombinedBillTrackingPreferences }
  ): Promise<NotificationResult> {
    try {
      // Determine target channels through multi-step process
      let targetChannels: Array<keyof GlobalBillTrackingPreferences['notificationChannels']> = [];

      // Get channels enabled in user preferences
      const enabledInPrefs: Array<keyof GlobalBillTrackingPreferences['notificationChannels']> =
        Object.entries(combinedPrefs.billTracking.notificationChannels)
          .filter(([, enabled]) => enabled)
          .map(([channel]) => channel as keyof GlobalBillTrackingPreferences['notificationChannels']);

      // Get channels recommended by filter service
      const recommendedByFilter = filterResult.recommendedChannels as Array<keyof GlobalBillTrackingPreferences['notificationChannels']>;

      // Intersect user preferences with filter recommendations for optimal delivery
      if (filterResult.reasons.includes('Filtering bypassed') || 
          filterResult.reasons.includes('Filtering service unavailable')) {
        targetChannels = enabledInPrefs; // Use all enabled if filter didn't run
      } else {
        // Use channels that are BOTH enabled by user AND recommended by filter
        targetChannels = enabledInPrefs.filter(ch => recommendedByFilter.includes(ch));
      }

      // Allow request config to completely override channel selection
      if (request.config?.channels) {
        targetChannels = request.config.channels as Array<keyof GlobalBillTrackingPreferences['notificationChannels']>;
      }

      // Validate we have at least one delivery channel
      if (targetChannels.length === 0) {
        logger.warn(`No active delivery channels for user ${request.user_id}`, {
          component: 'NotificationOrchestrator'
        });
        return {
          success: false,
          filtered: true,
          filterReason: 'No active/recommended delivery channels',
          batched: false
        };
      }

      // Execute delivery across all target channels with retry logic
      const deliveryResults: DeliveryResult[] = [];
      const maxRetries = request.config?.retryOnFailure ? this.config.batching.maxRetries : 0;
      const bill_id = request.relatedBillId ?? request.bill_id;

      for (const channel of targetChannels) { const channelRequest: ChannelDeliveryRequest = {
          user_id: request.user_id,
          channel: channel,
          content: request.content,
          metadata: {
            priority: filterResult.suggestedPriority || request.priority,
            relatedBillId: bill_id,
            category: request.category,
            actionUrl: request.metadata?.actionUrl,
            ...request.metadata
            }
        };

        // Retry loop with exponential backoff
        let attempt = 0;
        let result: DeliveryResult | null = null;
        
        while (attempt <= maxRetries) {
          try {
            result = await notificationChannelService.sendToChannel(channelRequest);
            if (result.success) break; // Success - exit retry loop
          } catch (channelError) {
            logger.error(`Error sending to channel ${channel} (Attempt ${attempt + 1})`, { component: 'NotificationOrchestrator',
              user_id: request.user_id
             }, channelError);
            result = {
              success: false,
              channel: channel,
              error: channelError instanceof Error ? channelError.message : String(channelError)
            };
          }

          attempt++;
          if (attempt <= maxRetries) {
            this.metrics.totalRetried++;
            const delayMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
            logger.warn(`Retrying channel ${channel} delivery in ${delayMs}ms (${attempt}/${maxRetries})`, { component: 'NotificationOrchestrator',
              user_id: request.user_id
             });
            await this.delay(delayMs);
          }
        }

        deliveryResults.push(result ?? {
          success: false,
          channel: channel,
          error: 'Max retries exceeded'
        });
      }

      // Determine overall delivery success
      const allSucceeded = deliveryResults.every(r => r.success);
      const anySucceeded = deliveryResults.some(r => r.success);

      // Update metrics based on results
      if (anySucceeded) {
        this.metrics.totalSent++;
      } else {
        this.metrics.totalFailed++;
      }

      logger.info('Immediate delivery processed', { component: 'NotificationOrchestrator',
        user_id: request.user_id,
        results: deliveryResults.map(r => ({ channel: r.channel, success: r.success  })),
        overallSuccess: anySucceeded
      });

      return {
        success: anySucceeded,
        filtered: false,
        batched: false,
        deliveryResults,
        notification_id: deliveryResults.find(r => r.success)?.messageId
      };

    } catch (error) { logger.error('Unhandled error during immediate delivery:', {
        component: 'NotificationOrchestrator',
        user_id: request.user_id
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
   * Add notification to appropriate batch for later digest delivery.
   * 
   * Batches are organized by user and frequency to ensure notifications
   * are grouped appropriately. Batches can be triggered early if they reach
   * maximum size before the scheduled delivery time.
   */
  private async addToBatch(
    request: NotificationRequest,
    filterResult: FilterResult,
    combinedPrefs: { billTracking: CombinedBillTrackingPreferences }
  ): Promise<string> { // Determine batch frequency from merged preferences
    const frequency = combinedPrefs.billTracking.alert_frequency 
      ?? combinedPrefs.billTracking.updateFrequency;
    const batchKey = this.getBatchKey(request.user_id, frequency);

    // Get or create batch
    let batch = this.batches.get(batchKey);
    if (!batch) {
      batch = {
        id: batchKey,
        user_id: request.user_id,
        notifications: [],
        scheduledFor: this.calculateBatchSchedule(frequency),
        created_at: new Date(),
        status: 'pending',
        retryCount: 0
       };
      this.batches.set(batchKey, batch);
    }

    // Add notification to batch
    batch.notifications.push(request);

    logger.info('Added notification to batch', {
      component: 'NotificationOrchestrator',
      batchId: batch.id,
      batchSize: batch.notifications.length,
      scheduledFor: batch.scheduledFor.toISOString()
    });

    // Check if batch should be processed early due to size
    const maxBatchSize = combinedPrefs.billTracking.advancedSettings?.batchingRules?.maxBatchSize
      || this.config.batching.maxBatchSize;

    if (batch.notifications.length >= maxBatchSize) {
      logger.info(`Batch ${batch.id} reached max size, processing early`, {
        component: 'NotificationOrchestrator'
      });
      
      // Process batch asynchronously without blocking
      this.processBatch(batch).catch(err => {
        logger.error(`Error processing full batch ${batch.id}:`, {
          component: 'NotificationOrchestrator'
        }, err);
      });
    }

    return batch.id;
  }

  /**
   * Process a batch by creating and sending a digest notification.
   * 
   * Important: Fetches CURRENT preferences at delivery time to ensure
   * digest uses the latest user settings (e.g., if user disabled email
   * after batch was created).
   */
  private async processBatch(batch: NotificationBatch): Promise<void> {
    // Prevent duplicate processing
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

      // Fetch CURRENT preferences (not cached) for accurate delivery channel selection
      const currentCombinedPrefs = await this.getCombinedPreferences(batch.user_id);

      // Create digest content from all batched notifications
      const digestContent = this.createDigestContent(batch.notifications);

      // Create digest notification request
      const digestRequest: NotificationRequest = { user_id: batch.user_id,
        notificationType: 'digest',
        priority: 'medium',
        content: digestContent,
        metadata: {
          batchId: batch.id,
          notificationCount: batch.notifications.length,
          hasUrgent: batch.notifications.some(n => n.priority === 'urgent')
         },
        config: {
          forceImmediate: true, // Digests are always delivered immediately
          skipFiltering: true // Digests bypass filtering (already filtered)
        }
      };

      // Create filter result for digest delivery using current channel preferences
      const digestFilterResult: FilterResult = {
        shouldNotify: true,
        recommendedChannels: Object.entries(currentCombinedPrefs.billTracking.notificationChannels)
          .filter(([, enabled]) => enabled)
          .map(([channel]) => channel) as unknown,
        shouldBatch: false,
        reasons: ['Digest Delivery'],
        confidence: 1.0,
        suggestedPriority: 'medium'
      };

      // Send digest using current preferences
      const result = await this.deliverImmediately(
        digestRequest,
        digestFilterResult,
        currentCombinedPrefs
      );

      if (result.success) {
        batch.status = 'sent';
        this.batches.delete(batch.id);
        logger.info('Batch processed and sent successfully', {
          component: 'NotificationOrchestrator',
          batchId: batch.id
        });
      } else {
        // Handle failure with retry logic
        batch.status = 'failed';
        batch.lastError = result.error || 'Digest delivery failed';
        batch.retryCount = (batch.retryCount || 0) + 1;

        if (batch.retryCount < this.config.batching.maxRetries) {
          batch.status = 'pending';
          // Exponential backoff for retries (in minutes)
          batch.scheduledFor = new Date(
            Date.now() + Math.pow(2, batch.retryCount) * 60 * 1000
          );
          logger.warn(`Batch processing failed, scheduled for retry at ${batch.scheduledFor.toISOString()}`, {
            component: 'NotificationOrchestrator',
            batchId: batch.id,
            retryCount: batch.retryCount
          });
        } else {
          logger.error(`Batch processing failed after max retries, discarding`, {
            component: 'NotificationOrchestrator',
            batchId: batch.id,
            error: batch.lastError
          });
          this.batches.delete(batch.id);
        }
      }
    } catch (error) {
      // Handle unexpected errors during batch processing
      batch.status = 'failed';
      batch.lastError = error instanceof Error ? error.message : String(error);
      batch.retryCount = (batch.retryCount || 0) + 1;

      if (batch.retryCount < this.config.batching.maxRetries) {
        batch.status = 'pending';
        batch.scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
        logger.warn(`Unexpected error processing batch, scheduled for retry`, {
          component: 'NotificationOrchestrator',
          batchId: batch.id,
          retryCount: batch.retryCount
        }, error);
      } else {
        logger.error('Unexpected error processing batch after max retries, discarding', {
          component: 'NotificationOrchestrator',
          batchId: batch.id
        }, error);
        this.batches.delete(batch.id);
      }
    } finally {
      this.processingBatches.delete(batch.id);
    }
  }

  /**
   * Create digest content from multiple notifications.
   * 
   * Groups notifications by type and creates both plain text and HTML versions.
   * Limits individual type sections to 5 items to keep digests readable.
   */
  private createDigestContent(notification: NotificationRequest[]): {
    title: string;
    message: string;
    htmlMessage?: string;
  } {
    const count = notifications.length;
    const categories = this.groupBy(notifications, 'notificationType');

    // Build plain text message
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

    // Build HTML message with better formatting
    let htmlMessage = `<h2>Your Legislative Update Digest</h2>`;
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
   * Check if notification would exceed rate limits.
   * 
   * Implements sliding window rate limiting with separate counters for
   * urgent notifications to prevent abuse while allowing critical updates.
   */
  private checkRateLimit(user_id: string, priority: string): { allowed: boolean; reason?: string } { const now = Date.now();
    let limitState = this.rateLimits.get(user_id);

    // Initialize or reset if time window expired
    if (!limitState || now > limitState.resetTime) {
      limitState = {
        count: 0,
        urgentCount: 0,
        resetTime: now + this.config.rateLimiting.windowMs,
        lastNotificationTime: now
       };
      this.rateLimits.set(user_id, limitState);
    }

    // Check general notification limit
    if (limitState.count >= this.config.rateLimiting.maxPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.rateLimiting.maxPerHour} notifications per hour`
      };
    }

    // Check urgent notification limit (more restrictive)
    if (priority === 'urgent' && limitState.urgentCount >= this.config.rateLimiting.maxUrgentPerHour) {
      return {
        allowed: false,
        reason: `Urgent notification limit exceeded: ${this.config.rateLimiting.maxUrgentPerHour} per hour`
      };
    }

    return { allowed: true };
  }

  /**
   * Update rate limit counters after successful delivery.
   */
  private updateRateLimit(user_id: string, priority: string): void { const limitState = this.rateLimits.get(user_id);
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
   * Start periodic batch processor.
   * 
   * Runs at configured intervals to check for batches that are due for delivery.
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
   * Process all batches that are due for delivery.
   * 
   * Respects concurrent processing limits to prevent system overload.
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

    // Process batches with concurrency control
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
   * Process all pending batches during graceful shutdown.
   * 
   * Ensures no batches are lost when the service stops.
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

    // Process all pending batches in parallel
    await Promise.allSettled(
      pendingBatches.map(batch => this.processBatch(batch))
    );
  }

  /**
   * Start cleanup tasks for expired data.
   * 
   * Periodically removes expired rate limits and old failed batches
   * to prevent unbounded memory growth.
   */
  private startCleanupTasks(): void { // Clean expired rate limits
    const rateLimitCleanup = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [user_id, state] of this.rateLimits.entries()) {
        if (now > state.resetTime) {
          this.rateLimits.delete(user_id);
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

    // Clean old failed batches
    const batchCleanup = setInterval(() => {
      const cutoffTime = new Date(Date.now() - this.config.cleanup.failedBatchRetentionMs);
      let cleaned = 0;
      
      for (const [batchId, batch] of this.batches.entries()) {
        if (batch.status === 'failed' && batch.created_at < cutoffTime) {
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
   * Generate unique batch key based on user and frequency.
   * 
   * Creates time-based keys that ensure notifications are grouped
   * appropriately for the user's preferred delivery frequency.
   */
  private getBatchKey(
    user_id: string, 
    frequency: GlobalBillTrackingPreferences['updateFrequency']
  ): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hourStr = String(now.getHours()).padStart(2, '0');

    switch (frequency) { case 'daily':
        return `${user_id }-daily-${dateStr}`;
      case 'hourly':
        return `${ user_id }-hourly-${dateStr}-${hourStr}`;
      case 'immediate':
      default:
        // Create 5-minute windows for immediate notifications to enable debouncing
        const minuteWindow = Math.floor(now.getMinutes() / 5) * 5;
        return `${ user_id }-immediate-${dateStr}-${hourStr}-${String(minuteWindow).padStart(2, '0')}`;
    }
  }

  /**
   * Calculate when a batch should be sent based on frequency.
   * 
   * Schedules batches at user-friendly times (e.g., 9 AM for daily digests)
   * rather than arbitrary intervals.
   */
  private calculateBatchSchedule(
    frequency: GlobalBillTrackingPreferences['updateFrequency']
  ): Date {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        // Schedule for next 9 AM (or tomorrow if past 9 AM today)
        const scheduleDateDaily = new Date(now);
        scheduleDateDaily.setHours(9, 0, 0, 0);
        if (now.getHours() >= 9) {
          scheduleDateDaily.setDate(scheduleDateDaily.getDate() + 1);
        }
        return scheduleDateDaily;
      
      case 'hourly':
        // Schedule for the start of the next hour
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours() + 1,
          0, 0, 0
        );
      
      case 'immediate':
      default:
        // Schedule for 5 minutes from now (debouncing window)
        return new Date(now.getTime() + 5 * 60 * 1000);
    }
  }

  /**
   * Record delivery time for performance metrics.
   * 
   * Maintains a rolling window of delivery times to calculate
   * average performance without unbounded memory growth.
   */
  private recordDeliveryTime(timeMs: number): void {
    this.deliveryTimes.push(timeMs);
    
    // Keep only last 1000 measurements
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes.shift();
    }
    
    // Calculate rolling average
    const sum = this.deliveryTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageDeliveryTime = Math.round(sum / this.deliveryTimes.length);
    this.metrics.lastProcessedAt = new Date();
  }

  /**
   * Deep merge custom configuration with defaults.
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
   * Split array into chunks of specified size.
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Group array elements by a key.
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
   * Get human-readable label for notification type.
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
   * Async delay utility for rate limiting and backoff strategies.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

/**
 * Singleton instance of the notification orchestrator service.
 * 
 * Use this instance throughout the application for consistent notification
 * handling and shared state management.
 */
export const notificationOrchestratorService = new NotificationOrchestratorService();

