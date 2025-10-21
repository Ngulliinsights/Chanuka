import { database as db, readDatabase } from '../../../shared/database/connection';
import {
  user, bill, billEngagement, userInterest, billComment, sponsor, billSponsorship, billTag // Added billTag
} from '../../../shared/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
// Import the *combined* preference type, NOT the global one directly
import type { CombinedBillTrackingPreferences } from './notification-orchestrator.js'; // Adjust path if needed
import { logger } from '@shared/core/src/observability/logging';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cache-service.js'; // Assuming cache service is here

/**
 * Smart Notification Filter Service
 *
 * Determines if a notification should be sent based on combined user preferences,
 * content relevance, and user engagement history. It provides reasons for its decision.
 */

// Interface for the input criteria, now expecting combined preferences
export interface FilterCriteria {
  userId: string;
  billId?: number;
  category?: string;
  tags?: string[]; // Tags associated with the bill/event
  sponsorName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notificationType: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update';
  content?: { title: string; message: string; };
  // *** Expects the fully merged preferences from the orchestrator ***
  userPreferences: CombinedBillTrackingPreferences;
}

// Interface for the filtering result
export interface FilterResult {
  shouldNotify: boolean; // Final decision
  confidence: number; // Confidence score (0-1)
  reasons: string[]; // Explanations for the decision
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent'; // Can adjust priority
  recommendedChannels: Array<'inApp' | 'email' | 'sms' | 'push'>; // Suggested delivery channels
  shouldBatch: boolean; // Recommendation on batching (based on non-immediate frequency)
}

// Interface for the cached user engagement profile
export interface UserEngagementProfile {
  userId: string;
  topCategories: Array<{ category: string; score: number }>;
  topSponsors: Array<{ sponsorId: number; name: string; score: number }>;
  topTags: Array<{ tag: string; score: number }>; // Added tags
  engagementLevel: 'low' | 'medium' | 'high';
  // Note: Preferred times/response time might be less relevant for pure filtering decision
}

export class SmartNotificationFilterService {
  private get db() { return readDatabase(); }
  private readonly CACHE_DURATION_PROFILE = CACHE_TTL.USER_DATA_LONG; // Cache profile for a day

  /**
   * Main filtering method: Determines if a notification should proceed based on various checks.
   */
  async shouldSendNotification(criteria: FilterCriteria): Promise<FilterResult> {
    const logContext = { component: 'SmartFilter', userId: criteria.userId, type: criteria.notificationType, billId: criteria.billId };
    logger.debug('Starting smart filtering', logContext);

    try {
      // Preferences are now passed directly in criteria
      const preferences = criteria.userPreferences;
      const smartFiltering = preferences.smartFiltering;

      // 1. Basic Preference Checks (Type Enabled, Quiet Hours)
      const typeCheck = this.checkNotificationTypeEnabled(criteria, preferences);
      if (!typeCheck.shouldNotify) {
        return { ...this.createDefaultResult(criteria), ...typeCheck, confidence: 1.0, shouldNotify: false };
      }

      const quietHoursCheck = this.checkQuietHours(preferences);
      if (!quietHoursCheck.shouldNotify && criteria.priority !== 'urgent') { // Urgent bypasses quiet hours
        return { ...this.createDefaultResult(criteria), ...quietHoursCheck, confidence: 1.0, shouldNotify: false };
      }

      // 2. If Smart Filtering is disabled, return basic positive result
      if (!smartFiltering.enabled) {
        logger.debug('Smart filtering disabled, allowing notification', logContext);
        return {
            shouldNotify: true, confidence: 1.0, reasons: ['Smart filtering disabled'],
            suggestedPriority: criteria.priority,
            // Use explicitly enabled channels from combined prefs
            recommendedChannels: this.getEnabledChannels(preferences),
            // Batch based purely on frequency preference
            shouldBatch: preferences.alertFrequency !== 'immediate' && criteria.priority !== 'urgent'
        };
      }

      // 3. Smart Filtering Checks (run concurrently)
      // Get engagement profile (cached)
      const engagementProfile = await this.getUserEngagementProfile(criteria.userId);

      const filterChecks = await Promise.all([
        this.checkPriorityThreshold(criteria, smartFiltering),
        // Relevance checks become more important with smart filtering
        this.checkCategoryRelevance(criteria, smartFiltering, engagementProfile),
        this.checkKeywordRelevance(criteria, smartFiltering),
        this.checkSponsorRelevance(criteria, smartFiltering, engagementProfile),
        this.checkTagRelevance(criteria, smartFiltering, engagementProfile), // Added tag check
        this.checkInterestBasedRelevance(criteria, smartFiltering) // Check against user's declared interests
        // Removed checkEngagementHistory & checkTimingRelevance as they mainly influence *how* rather than *if*
      ]);

      // 4. Combine Results
      return this.combineFilterResults(filterChecks, criteria, preferences, engagementProfile);

    } catch (error) {
      logger.error('Error during smart filtering:', logContext, error);
      // Fail open: Allow notification but log error, use basic channels/priority
      return {
        shouldNotify: true, confidence: 0.3, reasons: ['Filtering error occurred - allowing notification'],
        suggestedPriority: criteria.priority, recommendedChannels: this.getEnabledChannels(criteria.userPreferences), shouldBatch: false
      };
    }
  }

  // --- Private Filter Check Methods ---

  /** Creates a default negative result structure */
  private createDefaultResult(criteria: FilterCriteria): Omit<FilterResult, 'shouldNotify' | 'confidence' | 'reasons'> {
      return {
          suggestedPriority: criteria.priority,
          recommendedChannels: [], // No channels if filtered out
          shouldBatch: false,
      };
  }

  /** Gets currently enabled channels from combined preferences */
  private getEnabledChannels(preferences: CombinedBillTrackingPreferences): FilterResult['recommendedChannels'] {
       return Object.entries(preferences.notificationChannels)
           .filter(([, enabled]) => enabled)
           .map(([channel]) => channel as FilterResult['recommendedChannels'][number]);
   }


  /** Check 1: Is this notification type globally enabled by the user? */
  private checkNotificationTypeEnabled(criteria: FilterCriteria, preferences: CombinedBillTrackingPreferences): Partial<FilterResult> & { shouldNotify: boolean } {
    let enabled = false;
    let typeKey: keyof Omit<CombinedBillTrackingPreferences, 'quietHours' | 'smartFiltering' | 'advancedSettings' | '_perBillSettingsApplied' | 'updateFrequency' | 'notificationChannels' | 'alertFrequency' | 'alertChannels'> | null = null;

    switch (criteria.notificationType) {
      case 'bill_update':
        if (criteria.subType === 'status_change') typeKey = 'statusChanges';
        else if (criteria.subType === 'new_comment') typeKey = 'newComments';
        else if (criteria.subType === 'amendment') typeKey = 'amendments';
        else if (criteria.subType === 'voting_scheduled') typeKey = 'votingSchedule';
        break;
      case 'comment_reply': typeKey = 'newComments'; break; // Assuming replies fall under new comments
      // System alerts, verification status, digests are usually implicitly enabled if channels are configured
      case 'verification_status':
      case 'system_alert':
      case 'digest': enabled = true; break;
    }

    if (typeKey) {
        // Check if the specific tracking type is enabled in the combined preferences
        enabled = preferences.trackingTypes?.includes(typeKey as any) ?? false; // Check the array
    }


    const reason = enabled ? `Notification type '${criteria.subType || criteria.notificationType}' enabled by user.` : `Notification type '${criteria.subType || criteria.notificationType}' disabled by user.`;
    return { shouldNotify: enabled, confidence: 1.0, reasons: [reason] };
  }

  /** Check 2: Is the user currently in their defined quiet hours? (Urgent bypasses) */
  private checkQuietHours(preferences: CombinedBillTrackingPreferences): Partial<FilterResult> & { shouldNotify: boolean } {
    const quietHours = preferences.quietHours;
    if (!quietHours?.enabled) {
      return { shouldNotify: true, confidence: 1.0, reasons: ['Quiet hours not enabled'] };
    }

    try {
        const now = new Date();
        // TODO: Implement proper timezone handling using user's timezone if available
        const currentHour = now.getHours(); // Use local server time for now
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;

        const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
        const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMin;
        const endTimeMinutes = endHour * 60 + endMin;

        let inQuietHours = false;
        if (startTimeMinutes <= endTimeMinutes) { // Quiet hours within the same day (e.g., 09:00 - 17:00)
            inQuietHours = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
        } else { // Quiet hours span midnight (e.g., 22:00 - 08:00)
            inQuietHours = currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
        }

        const reason = inQuietHours ? `Currently within quiet hours (${quietHours.startTime}-${quietHours.endTime})` : 'Outside quiet hours';
        return { shouldNotify: !inQuietHours, confidence: 1.0, reasons: [reason] };
    } catch(e) {
         logger.error('Error parsing quiet hours', { component: 'SmartFilter', quietHours }, e);
         return { shouldNotify: true, confidence: 0.5, reasons: ['Could not determine quiet hours status'] }; // Fail open
    }
  }

  /** Check 3: Does notification priority meet the user's smart filter threshold? */
  private checkPriorityThreshold(criteria: FilterCriteria, smartFiltering: CombinedBillTrackingPreferences['smartFiltering']): Partial<FilterResult> & { shouldNotify: boolean } {
    const priorityValues = { low: 1, medium: 2, high: 3, urgent: 4 };
    const thresholdValue = priorityValues[smartFiltering.priorityThreshold ?? 'low']; // Default to low if unset
    const notificationPriorityValue = priorityValues[criteria.priority];

    const meetsThreshold = notificationPriorityValue >= thresholdValue;
    const reason = meetsThreshold ? `Priority '${criteria.priority}' meets threshold '${smartFiltering.priorityThreshold}'.` : `Priority '${criteria.priority}' is below threshold '${smartFiltering.priorityThreshold}'.`;
    return { shouldNotify: meetsThreshold, confidence: 1.0, reasons: [reason] };
  }

  /** Check 4: Is the bill's category relevant based on filters or engagement? */
  private checkCategoryRelevance(criteria: FilterCriteria, smartFiltering: CombinedBillTrackingPreferences['smartFiltering'], profile: UserEngagementProfile): Partial<FilterResult> & { shouldNotify: boolean } {
    const category = criteria.category?.toLowerCase();
    if (!category) return { shouldNotify: true, confidence: 0.5, reasons: ['Notification has no category'] };

    // Explicit Filter Check
    const categoryFilters = smartFiltering.categoryFilters?.map(f => f.toLowerCase()) || [];
    if (categoryFilters.length > 0) {
      const isAllowed = categoryFilters.includes(category);
      const reason = isAllowed ? `Category '${criteria.category}' matches user filter list.` : `Category '${criteria.category}' blocked by user filter list.`;
      return { shouldNotify: isAllowed, confidence: 1.0, reasons: [reason] };
    }

    // Engagement Check (if no explicit filters)
    const categoryScore = profile.topCategories.find(c => c.category.toLowerCase() === category);
    if (categoryScore) {
      // Allow if engagement score is decent (e.g., > 20)
      const isRelevant = categoryScore.score > 20; // Tunable threshold
      const confidence = Math.min(1.0, categoryScore.score / 50); // Confidence based on engagement score
      const reason = isRelevant ? `Category '${criteria.category}' relevant based on engagement (Score: ${categoryScore.score.toFixed(0)}).` : `Category '${criteria.category}' has low engagement score (${categoryScore.score.toFixed(0)}).`;
      return { shouldNotify: isRelevant, confidence, reasons: [reason] };
    }

    // No explicit filter, no significant engagement -> Allow but lower confidence
    return { shouldNotify: true, confidence: 0.4, reasons: [`Category '${criteria.category}' not explicitly filtered or engaged with.`] };
  }

  /** Check 5: Does notification content match user's keyword filters? */
  private checkKeywordRelevance(criteria: FilterCriteria, smartFiltering: CombinedBillTrackingPreferences['smartFiltering']): Partial<FilterResult> & { shouldNotify: boolean } {
    const keywordFilters = smartFiltering.keywordFilters?.map(f => f.toLowerCase()) || [];
    if (keywordFilters.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No keyword filters set'] };
    }
    if (!criteria.content) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No content to check keywords against'] };
    }

    const searchText = `${criteria.content.title} ${criteria.content.message}`.toLowerCase();
    const matchedKeywords = keywordFilters.filter(keyword => searchText.includes(keyword));

    const matches = matchedKeywords.length > 0;
    const reason = matches ? `Content matched keywords: [${matchedKeywords.join(', ')}].` : 'Content did not match any keyword filters.';
    return { shouldNotify: matches, confidence: 1.0, reasons: [reason] };
  }

  /** Check 6: Is the bill's sponsor relevant based on filters or engagement? */
  private checkSponsorRelevance(criteria: FilterCriteria, smartFiltering: CombinedBillTrackingPreferences['smartFiltering'], profile: UserEngagementProfile): Partial<FilterResult> & { shouldNotify: boolean } {
    const sponsorName = criteria.sponsorName?.toLowerCase();
    if (!sponsorName) return { shouldNotify: true, confidence: 0.5, reasons: ['Notification has no sponsor info'] };

    // Explicit Filter Check
    const sponsorFilters = smartFiltering.sponsorFilters?.map(f => f.toLowerCase()) || [];
    if (sponsorFilters.length > 0) {
      const isAllowed = sponsorFilters.includes(sponsorName);
      const reason = isAllowed ? `Sponsor '${criteria.sponsorName}' matches user filter list.` : `Sponsor '${criteria.sponsorName}' blocked by user filter list.`;
      return { shouldNotify: isAllowed, confidence: 1.0, reasons: [reason] };
    }

    // Engagement Check
    const sponsorScore = profile.topSponsors.find(s => s.name.toLowerCase() === sponsorName);
    if (sponsorScore) {
      const isRelevant = sponsorScore.score > 15; // Tunable threshold
      const confidence = Math.min(1.0, sponsorScore.score / 40);
      const reason = isRelevant ? `Sponsor '${criteria.sponsorName}' relevant based on engagement (Score: ${sponsorScore.score.toFixed(0)}).` : `Sponsor '${criteria.sponsorName}' has low engagement score (${sponsorScore.score.toFixed(0)}).`;
      return { shouldNotify: isRelevant, confidence, reasons: [reason] };
    }

    // No explicit filter, no significant engagement -> Allow but lower confidence
    return { shouldNotify: true, confidence: 0.4, reasons: [`Sponsor '${criteria.sponsorName}' not explicitly filtered or engaged with.`] };
  }

  /** Check 7: Is the bill's tag relevant based on filters or engagement? */
  private checkTagRelevance(criteria: FilterCriteria, smartFiltering: CombinedBillTrackingPreferences['smartFiltering'], profile: UserEngagementProfile): Partial<FilterResult> & { shouldNotify: boolean } {
      const billTags = criteria.tags?.map(t => t.toLowerCase()) || [];
      if (billTags.length === 0) return { shouldNotify: true, confidence: 0.5, reasons: ['Notification has no tags'] };

      // Explicit Filter Check (Assuming keywords might act as tag filters, or add a dedicated tag filter preference)
      const keywordFilters = smartFiltering.keywordFilters?.map(f => f.toLowerCase()) || [];
      if (keywordFilters.length > 0) {
          const matchedByKeywords = billTags.some(tag => keywordFilters.includes(tag));
          if (matchedByKeywords) {
              const matchedTags = billTags.filter(tag => keywordFilters.includes(tag));
              return { shouldNotify: true, confidence: 0.9, reasons: [`Bill tags match keyword filters: [${matchedTags.join(', ')}]`] };
              // Note: This logic assumes keywords *allow* tags. If keywords *block* non-matching, the logic flips.
              // If keywords are ONLY for content, this check is different. Let's assume keywords can apply to tags.
          }
           // If keyword filters exist but none match the tags, should we block? Depends on intent.
           // For now, let's say keyword filter matching tags ALLOWS, otherwise continue evaluation.
      }


      // Engagement Check
      const tagScores = profile.topTags.filter(t => billTags.includes(t.tag.toLowerCase()));
      if (tagScores.length > 0) {
          const maxScore = Math.max(...tagScores.map(t => t.score));
          const isRelevant = maxScore > 25; // Tunable threshold
          const confidence = Math.min(1.0, maxScore / 60);
          const relevantTags = tagScores.filter(t => t.score > 25).map(t => t.tag);
          const reason = isRelevant ? `Bill tags relevant based on engagement (Matched: [${relevantTags.join(', ')}], Max Score: ${maxScore.toFixed(0)}).` : `Bill tags have low engagement scores (Max Score: ${maxScore.toFixed(0)}).`;
          return { shouldNotify: isRelevant, confidence, reasons: [reason] };
      }

      // No explicit filter match, no significant engagement -> Allow but lower confidence
      return { shouldNotify: true, confidence: 0.4, reasons: ['Bill tags not explicitly filtered or highly engaged with.'] };
  }


  /** Check 8: Does the bill match the user's declared interests? */
  private async checkInterestBasedRelevance(criteria: FilterCriteria, smartFiltering: CombinedBillTrackingPreferences['smartFiltering']): Promise<Partial<FilterResult> & { shouldNotify: boolean }> {
    if (!smartFiltering.interestBasedFiltering || !criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Interest-based filtering disabled or no bill ID'] };
    }

    try {
      // Get user's interests (could cache this per user)
      const userInterestsList = await this.db
        .select({ interest: userInterest.interest })
        .from(userInterest)
        .where(eq(userInterest.userId, criteria.userId));
      const interests = userInterestsList.map(i => i.interest.toLowerCase());

      if (interests.length === 0) {
        return { shouldNotify: true, confidence: 0.5, reasons: ['User has no configured interests'] };
      }

      // Get relevant bill data (category, tags - could cache this)
      const billData = await this.getBillCategoryAndTags(criteria.billId);
      if (!billData) {
        return { shouldNotify: true, confidence: 0.5, reasons: ['Could not retrieve bill data for interest check'] };
      }

      const billCategoryLower = billData.category?.toLowerCase();
      const billTagsLower = billData.tags.map(t => t.toLowerCase());

      // Check for matches
      const categoryMatch = billCategoryLower && interests.includes(billCategoryLower);
      const tagMatches = billTagsLower.filter(tag => interests.includes(tag));

      if (categoryMatch || tagMatches.length > 0) {
          const matchedItems = [
              ...(categoryMatch ? [`category: ${billData.category}`] : []),
              ...(tagMatches.length > 0 ? [`tags: ${tagMatches.join(', ')}`] : [])
          ];
        return { shouldNotify: true, confidence: 0.9, reasons: [`Bill matches user interests (${matchedItems.join('; ')})`] };
      } else {
        // If interest filtering is ON and there's NO match, block the notification
        return { shouldNotify: false, confidence: 1.0, reasons: ['Bill does not match user\'s configured interests'] };
      }
    } catch (error) {
      logger.error('Error checking interest-based relevance:', { component: 'SmartFilter', userId: criteria.userId, billId: criteria.billId }, error);
      return { shouldNotify: true, confidence: 0.5, reasons: ['Error during interest check - allowing notification'] }; // Fail open
    }
  }

  // --- Combining Logic ---

  /** Combines results from individual checks into a final decision */
  private combineFilterResults(
    checkResults: (Partial<FilterResult> & { shouldNotify: boolean })[],
    criteria: FilterCriteria,
    preferences: CombinedBillTrackingPreferences,
    profile: UserEngagementProfile
  ): FilterResult {
    const blockingCheck = checkResults.find(r => r.shouldNotify === false);

    // If any check explicitly blocks (and not bypassed by urgency), block the notification
    if (blockingCheck) {
         // Allow urgent notifications to bypass non-essential filters (e.g., relevance, but maybe not quiet hours or type disabled)
         const canBypass = criteria.priority === 'urgent' && !blockingCheck.reasons?.some(r => r.includes('disabled by user') || r.includes('quiet hours'));
         if (!canBypass) {
            logger.debug(`Notification blocked`, { component: 'SmartFilter', userId: criteria.userId, reasons: blockingCheck.reasons });
            return {
                shouldNotify: false,
                confidence: blockingCheck.confidence ?? 1.0, // Confidence of the blocking reason
                reasons: blockingCheck.reasons ?? ['Blocked by filter rule'],
                suggestedPriority: 'low',
                recommendedChannels: [],
                shouldBatch: false,
            };
         } else {
              logger.debug(`Urgent notification bypassing filter: ${blockingCheck.reasons?.join('; ')}`, { component: 'SmartFilter', userId: criteria.userId });
              // Continue processing as if it passed, but note the bypass
         }
    }


    // If all checks pass, calculate overall confidence and recommendations
    const contributingChecks = checkResults.filter(r => r.shouldNotify); // All checks passed or were bypassed
    const avgConfidence = contributingChecks.length > 0
        ? contributingChecks.reduce((sum, r) => sum + (r.confidence ?? 0.5), 0) / contributingChecks.length
        : 0.5; // Default confidence if no checks contributed positively

    const combinedReasons = [...new Set(contributingChecks.flatMap(r => r.reasons ?? []))]; // Unique reasons

    // Adjust priority based on relevance? (e.g., boost if highly relevant)
    let suggestedPriority = criteria.priority;
    if (avgConfidence > 0.8 && criteria.priority === 'medium') suggestedPriority = 'high';
    else if (avgConfidence < 0.4 && criteria.priority === 'medium') suggestedPriority = 'low';

    // Determine channels based on final confidence, suggested priority, and *enabled* user channels
    const recommendedChannels = this.determineRecommendedChannels(avgConfidence, suggestedPriority, preferences);

    // Determine batching based on frequency and priority
    const shouldBatch = preferences.alertFrequency !== 'immediate'
                       && suggestedPriority !== 'urgent'
                       && suggestedPriority !== 'high'; // Maybe don't batch high? Configurable.


     logger.debug(`Notification allowed`, { component: 'SmartFilter', userId: criteria.userId, confidence: avgConfidence, priority: suggestedPriority, channels: recommendedChannels, batch: shouldBatch });
    return {
        shouldNotify: true,
        confidence: parseFloat(avgConfidence.toFixed(2)),
        reasons: combinedReasons,
        suggestedPriority,
        recommendedChannels,
        shouldBatch
    };
  }

  // --- Channel & Batching Recommendations ---

  /** Determines recommended channels based on confidence, priority, and USER ENABLED channels */
  private determineRecommendedChannels(
    confidence: number,
    priority: FilterResult['suggestedPriority'],
    preferences: CombinedBillTrackingPreferences
  ): FilterResult['recommendedChannels'] {
      const allowed: FilterResult['recommendedChannels'] = [];
      const enabledChannels = preferences.notificationChannels; // The merged { inApp: bool, email: bool, ... }

      // Always include inApp if enabled
      if (enabledChannels.inApp) allowed.push('inApp');

      // Add push for medium+ confidence OR high+ priority, if enabled
      if (enabledChannels.push && (confidence > 0.6 || priority === 'high' || priority === 'urgent')) {
          allowed.push('push');
      }
      // Add email for high+ confidence OR high+ priority, if enabled
      if (enabledChannels.email && (confidence > 0.75 || priority === 'high' || priority === 'urgent')) {
          allowed.push('email');
      }
      // Add SMS only for urgent priority, if enabled
      if (enabledChannels.sms && priority === 'urgent') {
          allowed.push('sms');
      }

      // Ensure at least one channel if any were enabled globally/per-bill, default to inApp
      if (allowed.length === 0 && this.getEnabledChannels(preferences).length > 0 && enabledChannels.inApp) {
          return ['inApp'];
      }
      if (allowed.length === 0 && this.getEnabledChannels(preferences).length > 0) {
          // If inApp wasn't enabled but others were, pick the first enabled one as fallback
          const firstEnabled = this.getEnabledChannels(preferences)[0];
          if (firstEnabled) return [firstEnabled];
      }

      return allowed;
  }


  // --- Engagement Profile Methods ---

  /** Gets or builds user engagement profile with caching */
  private async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    const cacheKey = CACHE_KEYS.USER_ENGAGEMENT_PROFILE(userId);
    try {
        const cachedProfile = await cacheService.get(cacheKey);
        if (cachedProfile) {
            logger.debug(`Cache hit for engagement profile: ${cacheKey}`);
            return cachedProfile;
        }
        logger.debug(`Cache miss for engagement profile: ${cacheKey}`);

        const profile = await this.buildEngagementProfile(userId);
        await cacheService.set(cacheKey, profile, this.CACHE_DURATION_PROFILE);
        return profile;
    } catch(error) {
         logger.error(`Error getting/building engagement profile for user ${userId}:`, { component: 'SmartFilter' }, error);
         return this.getDefaultEngagementProfile(userId); // Return default on error
    }
  }

  /** Builds the engagement profile by querying DB */
  private async buildEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    logger.debug(`Building engagement profile for user ${userId}`);
    try {
        // Run queries concurrently
        const [engagementHistory, commentHistory, interestData] = await Promise.all([
            // Query 1: Engagement History (last N engagements)
            this.db.select({
                    billId: billEngagement.billId,
                    engagementScore: billEngagement.engagementScore,
                    // viewCount: billEngagement.viewCount, commentCount: billEngagement.commentCount, shareCount: billEngagement.shareCount,
                    lastEngaged: billEngagement.lastEngagedAt,
                    billCategory: bill.category // Include category
                })
                .from(billEngagement)
                .innerJoin(bill, eq(billEngagement.billId, bill.id))
                .where(eq(billEngagement.userId, userId))
                .orderBy(desc(billEngagement.lastEngagedAt))
                .limit(100), // Limit history size

            // Query 2: Comment History (for timing analysis - optional for filtering)
            // this.db.select({ createdAt: billComment.createdAt, billId: billComment.billId })
            //     .from(billComment)
            //     .where(eq(billComment.userId, userId))
            //     .orderBy(desc(billComment.createdAt))
            //     .limit(50),
            Promise.resolve([]), // Skip comment history for now if not used in filtering logic

             // Query 3: User Interests (already fetched, potentially refactor)
             this.db.select({ interest: userInterest.interest })
                 .from(userInterest)
                 .where(eq(userInterest.userId, userId))

        ]);

        // Analyze patterns
        const topCategories = this.analyzeCategoryEngagement(engagementHistory);
        const topSponsors = await this.analyzeSponsorEngagement(userId, engagementHistory);
        const topTags = await this.analyzeTagEngagement(userId, engagementHistory); // Added tag analysis
        const engagementLevel = this.calculateEngagementLevel(engagementHistory);
        // const preferredTimes = this.analyzePreferredTimes(commentHistory);
        // const avgResponseTime = this.calculateAverageResponseTime(commentHistory);

        return {
            userId,
            topCategories,
            topSponsors,
            topTags, // Include tags
            engagementLevel,
            // preferredNotificationTimes: preferredTimes, // Omit if not used
            // averageResponseTime: avgResponseTime // Omit if not used
        };
    } catch (error) {
      logger.error(`Error building engagement profile for user ${userId}:`, { component: 'SmartFilter' }, error);
      return this.getDefaultEngagementProfile(userId); // Return default profile on error
    }
  }

   /** Provides a default engagement profile structure */
   private getDefaultEngagementProfile(userId: string): UserEngagementProfile {
       return { userId, topCategories: [], topSponsors: [], topTags: [], engagementLevel: 'low' };
   }

  /** Analyzes category engagement from history */
  private analyzeCategoryEngagement(engagementHistory: Array<{ billCategory: string | null, engagementScore: string | null }>): UserEngagementProfile['topCategories'] {
    const categoryMap = new Map<string, number>();
    engagementHistory.forEach(e => {
      const category = e.billCategory || 'Uncategorized';
      const score = parseFloat(e.engagementScore || '0') || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + Math.max(1, score)); // Add score, min 1 per interaction
    });
    return Array.from(categoryMap.entries())
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score).slice(0, 5); // Top 5
  }

  /** Analyzes sponsor engagement from history */
  private async analyzeSponsorEngagement(userId: string, engagementHistory: Array<{ billId: number, engagementScore: string | null }>): Promise<UserEngagementProfile['topSponsors']> {
    if (engagementHistory.length === 0) return [];
    const billIds = [...new Set(engagementHistory.map(e => e.billId))]; // Unique bill IDs

    try {
      // Find sponsors for the bills the user engaged with
      const sponsorData = await this.db.select({
          sponsorId: sponsor.id, sponsorName: sponsor.name, billId: billSponsorship.billId, sponsorshipType: billSponsorship.sponsorshipType
        })
        .from(billSponsorship)
        .innerJoin(sponsor, eq(billSponsorship.sponsorId, sponsor.id))
        .where(and(inArray(billSponsorship.billId, billIds), eq(billSponsorship.isActive, true))); // Active sponsorships

      const sponsorScores = new Map<number, { name: string; score: number }>();
      const engagementMap = new Map(engagementHistory.map(e => [e.billId, parseFloat(e.engagementScore || '0') || 0]));

      sponsorData.forEach(sp => {
        const engagementScore = engagementMap.get(sp.billId) || 0;
        if (engagementScore > 0) {
          const current = sponsorScores.get(sp.sponsorId) || { name: sp.sponsorName, score: 0 };
          const multiplier = sp.sponsorshipType === 'primary' ? 1.5 : 1.0; // Weight primary sponsors higher
          sponsorScores.set(sp.sponsorId, { name: sp.sponsorName, score: current.score + Math.max(1, engagementScore) * multiplier });
        }
      });

      return Array.from(sponsorScores.entries())
        .map(([sponsorId, data]) => ({ sponsorId, name: data.name, score: data.score }))
        .sort((a, b) => b.score - a.score).slice(0, 5); // Top 5
    } catch (error) {
      logger.error('Error analyzing sponsor engagement:', { component: 'SmartFilter', userId }, error);
      return [];
    }
  }

  /** Analyzes tag engagement from history */
  private async analyzeTagEngagement(userId: string, engagementHistory: Array<{ billId: number, engagementScore: string | null }>): Promise<UserEngagementProfile['topTags']> {
      if (engagementHistory.length === 0) return [];
      const billIds = [...new Set(engagementHistory.map(e => e.billId))];

      try {
          // Find tags for the bills the user engaged with
          const tagData = await this.db.select({
                  tag: billTag.tag,
                  billId: billTag.billId
              })
              .from(billTag)
              .where(inArray(billTag.billId, billIds));

          const tagScores = new Map<string, number>();
          const engagementMap = new Map(engagementHistory.map(e => [e.billId, parseFloat(e.engagementScore || '0') || 0]));

          tagData.forEach(t => {
              const engagementScore = engagementMap.get(t.billId) || 0;
              if (engagementScore > 0) {
                  const tagName = t.tag.toLowerCase(); // Normalize tag
                  tagScores.set(tagName, (tagScores.get(tagName) || 0) + Math.max(1, engagementScore));
              }
          });

          return Array.from(tagScores.entries())
              .map(([tag, score]) => ({ tag, score }))
              .sort((a, b) => b.score - a.score).slice(0, 10); // Top 10 tags

      } catch (error) {
          logger.error('Error analyzing tag engagement:', { component: 'SmartFilter', userId }, error);
          return [];
      }
  }


  /** Calculates overall engagement level */
  private calculateEngagementLevel(engagementHistory: Array<{ engagementScore: string | null }>): 'low' | 'medium' | 'high' {
    if (engagementHistory.length < 3) return 'low'; // Need a few interactions
    const totalScore = engagementHistory.reduce((sum, e) => sum + (parseFloat(e.engagementScore || '0') || 0), 0);
    const avgScore = totalScore / engagementHistory.length;
    // Define thresholds for levels (tunable)
    if (avgScore > 40) return 'high';
    if (avgScore > 15) return 'medium';
    return 'low';
  }

  /** Helper to get bill category and tags */
  private async getBillCategoryAndTags(billId: number): Promise<{ category: string | null, tags: string[] } | null> {
    try {
        const [billData] = await this.db.select({ category: bill.category }).from(bill).where(eq(bill.id, billId));
        if (!billData) return null;

        const tagData = await this.db.select({ tag: billTag.tag }).from(billTag).where(eq(billTag.billId, billId));

        return {
            category: billData.category,
            tags: tagData.map(t => t.tag)
        };
    } catch(error) {
         logger.error(`Error fetching category/tags for bill ${billId}:`, { component: 'SmartFilter' }, error);
         return null;
    }
  }

  // --- Cache Management ---
  /** Clears the engagement profile cache for a specific user */
  clearUserCache(userId: string): void {
      const cacheKey = CACHE_KEYS.USER_ENGAGEMENT_PROFILE(userId);
      cacheService.delete(cacheKey)
          .then(() => logger.debug(`Cleared engagement profile cache for user ${userId}`, { component: 'SmartFilter' }))
          .catch(err => logger.error(`Error clearing engagement profile cache for user ${userId}:`, { component: 'SmartFilter' }, err));
  }

}

// Export singleton instance
export const smartNotificationFilterService = new SmartNotificationFilterService();