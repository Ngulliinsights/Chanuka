import { database as db } from '../../../shared/database/connection.js';
import { 
  users, 
  bills, 
  billEngagement, 
  userInterests,
  billComments,
  sponsors,
  billSponsorships
} from '../../../shared/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { userPreferencesService } from '../../features/users/user-preferences.js';
import type { BillTrackingPreferences } from '../../features/users/user-preferences.js';
import { logger } from '@shared/utils/logger';

/**
 * Smart Notification Filter Service
 * 
 * Purpose: Determines whether a notification should be sent based on:
 * - User preferences and settings
 * - Smart filtering rules (categories, keywords, sponsors)
 * - User engagement patterns and history
 * - Timing preferences (quiet hours, active periods)
 * 
 * This service is PURELY about decision-making. It doesn't send notifications,
 * manage channels, or handle batching. It simply answers: "Should this user
 * receive this notification?"
 */

export interface FilterCriteria {
  userId: string;
  billId?: number;
  category?: string;
  tags?: string[];
  sponsorName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notificationType: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update';
  content?: {
    title: string;
    message: string;
  };
}

export interface FilterResult {
  shouldNotify: boolean;
  confidence: number; // 0-1 score indicating how confident the filter is
  reasons: string[]; // Human-readable explanations for the decision
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
  recommendedChannels: Array<'email' | 'inApp' | 'sms' | 'push'>;
  shouldBatch: boolean; // Whether this notification should be batched
}

export interface UserEngagementProfile {
  userId: string;
  topCategories: Array<{ category: string; score: number }>;
  topSponsors: Array<{ sponsorId: number; name: string; score: number }>;
  engagementLevel: 'low' | 'medium' | 'high';
  preferredNotificationTimes: Array<{ hour: number; frequency: number }>;
  averageResponseTime: number; // in hours
}

export class SmartNotificationFilterService {
  // Cache for engagement profiles to avoid repeated database queries
  private engagementProfiles: Map<string, UserEngagementProfile> = new Map();
  private profileCacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Main filtering method - determines if notification should be sent
   * 
   * This is the primary entry point for the filtering service. It evaluates
   * multiple criteria and returns a comprehensive decision with reasoning.
   */
  async shouldSendNotification(criteria: FilterCriteria): Promise<FilterResult> {
    try {
      // Get user preferences with error handling
      const userPrefs = await this.getUserPreferences(criteria.userId);
      const smartFiltering = userPrefs.billTracking.smartFiltering;

      // If smart filtering is disabled, allow everything with basic checks
      if (!smartFiltering.enabled) {
        return this.createBasicFilterResult(criteria, userPrefs.billTracking);
      }

      // Get user engagement profile for intelligent filtering
      const engagementProfile = await this.getUserEngagementProfile(criteria.userId);
      
      // Run all filter checks in parallel for performance
      const filterResults = await Promise.all([
        this.checkNotificationTypeEnabled(criteria, userPrefs.billTracking),
        this.checkPriorityThreshold(criteria, smartFiltering),
        this.checkQuietHours(userPrefs.billTracking),
        this.checkCategoryRelevance(criteria, smartFiltering, engagementProfile),
        this.checkKeywordRelevance(criteria, smartFiltering),
        this.checkSponsorRelevance(criteria, smartFiltering, engagementProfile),
        this.checkEngagementHistory(criteria, engagementProfile),
        this.checkTimingRelevance(engagementProfile),
        this.checkInterestBasedRelevance(criteria, smartFiltering)
      ]);

      // Combine all filter results into final decision
      return this.combineFilterResults(filterResults, criteria, engagementProfile);

    } catch (error) {
      logger.error('Error in smart filtering:', { component: 'SmartFilter' }, error);
      
      // Fail open - if filtering fails, allow notification but with low confidence
      // This ensures notifications aren't lost due to filtering errors
      return {
        shouldNotify: true,
        confidence: 0.3,
        reasons: ['Filtering error - defaulting to allow'],
        suggestedPriority: criteria.priority,
        recommendedChannels: ['inApp'],
        shouldBatch: false
      };
    }
  }

  /**
   * Check if notification type is enabled in user preferences
   */
  private async checkNotificationTypeEnabled(
    criteria: FilterCriteria,
    preferences: BillTrackingPreferences
  ): Promise<Partial<FilterResult>> {
    let enabled = false;
    let reason = '';

    switch (criteria.notificationType) {
      case 'bill_update':
        if (criteria.subType === 'status_change') {
          enabled = preferences.statusChanges;
          reason = enabled ? 'Status change notifications enabled' : 'Status change notifications disabled';
        } else if (criteria.subType === 'new_comment') {
          enabled = preferences.newComments;
          reason = enabled ? 'Comment notifications enabled' : 'Comment notifications disabled';
        } else if (criteria.subType === 'amendment') {
          enabled = preferences.amendments;
          reason = enabled ? 'Amendment notifications enabled' : 'Amendment notifications disabled';
        } else if (criteria.subType === 'voting_scheduled') {
          enabled = preferences.votingSchedule;
          reason = enabled ? 'Voting schedule notifications enabled' : 'Voting schedule notifications disabled';
        }
        break;
      case 'comment_reply':
        enabled = preferences.newComments;
        reason = enabled ? 'Comment reply notifications enabled' : 'Comment reply notifications disabled';
        break;
      case 'verification_status':
      case 'system_alert':
      case 'digest':
        enabled = true; // Always enabled for system notifications
        reason = 'System notification - always enabled';
        break;
    }

    return {
      shouldNotify: enabled,
      confidence: 1.0,
      reasons: [reason]
    };
  }

  /**
   * Check if notification priority meets user's threshold
   */
  private async checkPriorityThreshold(
    criteria: FilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering']
  ): Promise<Partial<FilterResult>> {
    const priorityLevels = { low: 1, medium: 2, high: 3, urgent: 4 };
    const thresholdLevels = { low: 1, medium: 2, high: 3 };
    
    const meetsThreshold = priorityLevels[criteria.priority] >= thresholdLevels[smartFiltering.priorityThreshold];
    
    return {
      shouldNotify: meetsThreshold,
      confidence: 1.0,
      reasons: meetsThreshold ? 
        [`Priority ${criteria.priority} meets threshold ${smartFiltering.priorityThreshold}`] :
        [`Priority ${criteria.priority} below threshold ${smartFiltering.priorityThreshold}`]
    };
  }

  /**
   * Check if current time is within quiet hours
   */
  private async checkQuietHours(
    preferences: BillTrackingPreferences
  ): Promise<Partial<FilterResult>> {
    if (!preferences.quietHours?.enabled) {
      return { shouldNotify: true, confidence: 1.0, reasons: ['Quiet hours not enabled'] };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    let inQuietHours = false;
    if (startTime < endTime) {
      inQuietHours = currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      inQuietHours = currentTime >= startTime || currentTime <= endTime;
    }

    return {
      shouldNotify: !inQuietHours,
      confidence: 1.0,
      reasons: inQuietHours ? ['Currently in quiet hours'] : ['Not in quiet hours']
    };
  }

  /**
   * Check if notification category matches user interests
   */
  private async checkCategoryRelevance(
    criteria: FilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering'],
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    if (!criteria.category) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No category specified'] };
    }

    // First check explicit category filters
    if (smartFiltering.categoryFilters && smartFiltering.categoryFilters.length > 0) {
      const isInFilter = smartFiltering.categoryFilters.includes(criteria.category);
      if (!isInFilter) {
        return {
          shouldNotify: false,
          confidence: 1.0,
          reasons: [`Category ${criteria.category} not in user's filter list`]
        };
      }
    }

    // Then check engagement-based relevance
    const categoryScore = profile.topCategories.find(c => c.category === criteria.category);
    if (categoryScore) {
      const confidence = Math.min(categoryScore.score / 100, 1.0);
      return {
        shouldNotify: true,
        confidence,
        reasons: [`High engagement with ${criteria.category} category (score: ${categoryScore.score.toFixed(1)})`]
      };
    }

    return {
      shouldNotify: true,
      confidence: 0.3,
      reasons: [`No previous engagement with ${criteria.category} category`]
    };
  }

  /**
   * Check if notification content matches keyword filters
   */
  private async checkKeywordRelevance(
    criteria: FilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering']
  ): Promise<Partial<FilterResult>> {
    if (!smartFiltering.keywordFilters || smartFiltering.keywordFilters.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No keyword filters set'] };
    }

    if (!criteria.content) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No content to check keywords'] };
    }

    const searchText = `${criteria.content.title} ${criteria.content.message}`.toLowerCase();
    const matchedKeywords = smartFiltering.keywordFilters.filter(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      const confidence = Math.min(matchedKeywords.length / smartFiltering.keywordFilters.length, 1.0);
      return {
        shouldNotify: true,
        confidence,
        reasons: [`Matched keywords: ${matchedKeywords.join(', ')}`]
      };
    }

    return {
      shouldNotify: false,
      confidence: 1.0,
      reasons: ['No keyword matches found']
    };
  }

  /**
   * Check if sponsor matches user interests
   */
  private async checkSponsorRelevance(
    criteria: FilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering'],
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    if (!criteria.sponsorName) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No sponsor information'] };
    }

    // Check explicit sponsor filters
    if (smartFiltering.sponsorFilters && smartFiltering.sponsorFilters.length > 0) {
      const isInFilter = smartFiltering.sponsorFilters.includes(criteria.sponsorName);
      if (!isInFilter) {
        return {
          shouldNotify: false,
          confidence: 1.0,
          reasons: [`Sponsor ${criteria.sponsorName} not in user's filter list`]
        };
      }
    }

    // Check engagement-based relevance
    const sponsorScore = profile.topSponsors.find(s => s.name === criteria.sponsorName);
    if (sponsorScore) {
      const confidence = Math.min(sponsorScore.score / 100, 1.0);
      return {
        shouldNotify: true,
        confidence,
        reasons: [`High engagement with sponsor ${criteria.sponsorName} (score: ${sponsorScore.score.toFixed(1)})`]
      };
    }

    return {
      shouldNotify: true,
      confidence: 0.4,
      reasons: ['No specific sponsor engagement history']
    };
  }

  /**
   * Check user's engagement history with this specific bill
   */
  private async checkEngagementHistory(
    criteria: FilterCriteria,
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    if (!criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No bill specified'] };
    }

    try {
      const engagement = await db
        .select({
          engagementScore: billEngagement.engagementScore,
          viewCount: billEngagement.viewCount,
          commentCount: billEngagement.commentCount
        })
        .from(billEngagement)
        .where(and(
          eq(billEngagement.userId, criteria.userId),
          eq(billEngagement.billId, criteria.billId)
        ))
        .limit(1);

      if (engagement.length > 0) {
        const score = Number(engagement[0].engagementScore) || 0;
        const confidence = Math.min(score / 50, 1.0);
        return {
          shouldNotify: true,
          confidence,
          reasons: [`Previous engagement with this bill (score: ${score.toFixed(1)})`]
        };
      }

      // No direct engagement, use general engagement level
      const confidenceByLevel = { high: 0.8, medium: 0.6, low: 0.3 };
      return {
        shouldNotify: true,
        confidence: confidenceByLevel[profile.engagementLevel],
        reasons: [`No previous engagement - user has ${profile.engagementLevel} overall engagement`]
      };

    } catch (error) {
      logger.error('Error checking engagement history:', { component: 'SmartFilter' }, error);
      return { shouldNotify: true, confidence: 0.5, reasons: ['Could not check engagement history'] };
    }
  }

  /**
   * Check if current time matches user's active periods
   */
  private async checkTimingRelevance(
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    const currentHour = new Date().getHours();
    
    const preferredTime = profile.preferredNotificationTimes.find(t => 
      Math.abs(t.hour - currentHour) <= 1
    );

    if (preferredTime) {
      const confidence = Math.min(preferredTime.frequency / 10, 1.0);
      return {
        shouldNotify: true,
        confidence,
        reasons: [`Current time (${currentHour}:00) matches user's active period`]
      };
    }

    return {
      shouldNotify: true,
      confidence: 0.4,
      reasons: ['Outside user\'s typical active hours']
    };
  }

  /**
   * Check if bill content matches user's configured interests
   */
  private async checkInterestBasedRelevance(
    criteria: FilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering']
  ): Promise<Partial<FilterResult>> {
    if (!smartFiltering.interestBasedFiltering || !criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Interest-based filtering not enabled'] };
    }

    try {
      // Get user's interests
      const userInterestsList = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, criteria.userId));

      if (userInterestsList.length === 0) {
        return { shouldNotify: true, confidence: 0.5, reasons: ['No interests configured'] };
      }

      // Get bill details
      const bill = await db
        .select({
          title: bills.title,
          description: bills.description,
          category: bills.category,
          tags: bills.tags
        })
        .from(bills)
        .where(eq(bills.id, criteria.billId))
        .limit(1);

      if (bill.length === 0) {
        return { shouldNotify: true, confidence: 0.5, reasons: ['Bill not found'] };
      }

      const billData = bill[0];
      const interests = userInterestsList.map(i => i.interest.toLowerCase());
      const searchText = `${billData.title} ${billData.description} ${billData.category}`.toLowerCase();
      const billTags = (billData.tags || []).map(tag => tag.toLowerCase());

      const matchedInterests = interests.filter(interest =>
        searchText.includes(interest) || billTags.some(tag => tag.includes(interest))
      );

      if (matchedInterests.length > 0) {
        const confidence = Math.min(matchedInterests.length / interests.length, 1.0);
        return {
          shouldNotify: true,
          confidence,
          reasons: [`Matches user interests: ${matchedInterests.join(', ')}`]
        };
      }

      return {
        shouldNotify: false,
        confidence: 0.8,
        reasons: ['No match with user\'s configured interests']
      };

    } catch (error) {
      logger.error('Error checking interest-based relevance:', { component: 'SmartFilter' }, error);
      return { shouldNotify: true, confidence: 0.5, reasons: ['Could not check interests'] };
    }
  }

  /**
   * Combine all filter results into final decision
   */
  private combineFilterResults(
    results: Partial<FilterResult>[],
    criteria: FilterCriteria,
    profile: UserEngagementProfile
  ): FilterResult {
    // If any filter explicitly blocks, honor that decision
    const blockingResults = results.filter(r => r.shouldNotify === false);
    
    if (blockingResults.length > 0) {
      // But allow urgent notifications to bypass most filters
      if (criteria.priority === 'urgent') {
        return {
          shouldNotify: true,
          confidence: 0.9,
          reasons: ['Urgent notification - bypassing filters', ...blockingResults.flatMap(r => r.reasons || [])],
          suggestedPriority: 'urgent',
          recommendedChannels: ['inApp', 'push', 'email', 'sms'],
          shouldBatch: false
        };
      }

      return {
        shouldNotify: false,
        confidence: Math.max(...blockingResults.map(r => r.confidence || 0)),
        reasons: blockingResults.flatMap(r => r.reasons || []),
        suggestedPriority: 'low',
        recommendedChannels: [],
        shouldBatch: false
      };
    }

    // Calculate weighted confidence from all results
    const validResults = results.filter(r => r.confidence !== undefined);
    const avgConfidence = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length
      : 0.5;

    // Determine channels based on confidence and priority
    const recommendedChannels = this.determineChannels(avgConfidence, criteria.priority);
    
    // Determine if batching is appropriate
    const shouldBatch = this.shouldBatchNotification(criteria.priority, avgConfidence);

    return {
      shouldNotify: true,
      confidence: avgConfidence,
      reasons: results.flatMap(r => r.reasons || []),
      suggestedPriority: criteria.priority,
      recommendedChannels,
      shouldBatch
    };
  }

  /**
   * Determine appropriate channels based on confidence and priority
   */
  private determineChannels(
    confidence: number, 
    priority: string
  ): Array<'email' | 'inApp' | 'sms' | 'push'> {
    const channels: Array<'email' | 'inApp' | 'sms' | 'push'> = ['inApp'];
    
    // High confidence or high priority = more channels
    if (confidence > 0.7 || priority === 'urgent' || priority === 'high') {
      channels.push('push');
    }
    
    if (confidence > 0.8 || priority === 'urgent') {
      channels.push('email');
    }
    
    if (priority === 'urgent') {
      channels.push('sms');
    }
    
    return channels;
  }

  /**
   * Determine if notification should be batched
   */
  private shouldBatchNotification(priority: string, confidence: number): boolean {
    // Never batch urgent or high priority
    if (priority === 'urgent' || priority === 'high') {
      return false;
    }

    // Low confidence notifications are good candidates for batching
    if (confidence < 0.5) {
      return true;
    }

    // Medium priority with medium confidence can be batched
    if (priority === 'medium' && confidence < 0.7) {
      return true;
    }

    return priority === 'low';
  }

  /**
   * Create basic filter result when smart filtering is disabled
   */
  private createBasicFilterResult(
    criteria: FilterCriteria,
    preferences: BillTrackingPreferences
  ): FilterResult {
    return {
      shouldNotify: true,
      confidence: 1.0,
      reasons: ['Smart filtering disabled - using basic rules'],
      suggestedPriority: criteria.priority,
      recommendedChannels: this.getBasicChannels(criteria.priority, preferences),
      shouldBatch: criteria.priority === 'low'
    };
  }

  /**
   * Get basic channels when smart filtering is off
   */
  private getBasicChannels(
    priority: string,
    preferences: BillTrackingPreferences
  ): Array<'email' | 'inApp' | 'sms' | 'push'> {
    const channels: Array<'email' | 'inApp' | 'sms' | 'push'> = ['inApp'];
    
    if (preferences.notificationChannels?.email) {
      channels.push('email');
    }
    
    if (preferences.notificationChannels?.push) {
      channels.push('push');
    }
    
    if (priority === 'urgent' && preferences.notificationChannels?.sms) {
      channels.push('sms');
    }
    
    return channels;
  }

  /**
   * Get or build user engagement profile with caching
   */
  private async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    // Check cache
    const cached = this.engagementProfiles.get(userId);
    const expiry = this.profileCacheExpiry.get(userId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Build new profile
    const profile = await this.buildEngagementProfile(userId);
    
    // Cache it
    this.engagementProfiles.set(userId, profile);
    this.profileCacheExpiry.set(userId, Date.now() + this.CACHE_DURATION);
    
    return profile;
  }

  /**
   * Build complete engagement profile from user history
   */
  private async buildEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    try {
      // Get engagement history
      const engagementHistory = await db
        .select({
          billId: billEngagement.billId,
          engagementScore: billEngagement.engagementScore,
          viewCount: billEngagement.viewCount,
          commentCount: billEngagement.commentCount,
          shareCount: billEngagement.shareCount,
          lastEngaged: billEngagement.lastEngaged,
          billCategory: bills.category
        })
        .from(billEngagement)
        .innerJoin(bills, eq(billEngagement.billId, bills.id))
        .where(eq(billEngagement.userId, userId))
        .orderBy(desc(billEngagement.lastEngaged))
        .limit(100);

      // Get comment timing data
      const commentHistory = await db
        .select({
          createdAt: billComments.createdAt,
          billId: billComments.billId
        })
        .from(billComments)
        .where(eq(billComments.userId, userId))
        .orderBy(desc(billComments.createdAt))
        .limit(50);

      // Analyze patterns
      const topCategories = this.analyzeCategoryEngagement(engagementHistory);
      const topSponsors = await this.analyzeSponsorEngagement(userId, engagementHistory);
      const engagementLevel = this.calculateEngagementLevel(engagementHistory);
      const preferredTimes = this.analyzePreferredTimes(commentHistory);
      const avgResponseTime = this.calculateAverageResponseTime(commentHistory);

      return {
        userId,
        topCategories,
        topSponsors,
        engagementLevel,
        preferredNotificationTimes: preferredTimes,
        averageResponseTime: avgResponseTime
      };

    } catch (error) {
      logger.error('Error building engagement profile:', { component: 'SmartFilter' }, error);
      
      // Return default profile
      return {
        userId,
        topCategories: [],
        topSponsors: [],
        engagementLevel: 'low',
        preferredNotificationTimes: [],
        averageResponseTime: 24
      };
    }
  }

  /**
   * Analyze which categories user engages with most
   */
  private analyzeCategoryEngagement(engagementHistory: any[]): Array<{ category: string; score: number }> {
    const categoryMap = new Map<string, number>();
    
    engagementHistory.forEach(engagement => {
      if (engagement.billCategory) {
        const currentScore = categoryMap.get(engagement.billCategory) || 0;
        const engagementScore = Number(engagement.engagementScore) || 0;
        categoryMap.set(engagement.billCategory, currentScore + engagementScore);
      }
    });

    return Array.from(categoryMap.entries())
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Analyze which sponsors user engages with most
   */
  private async analyzeSponsorEngagement(
    userId: string, 
    engagementHistory: any[]
  ): Promise<Array<{ sponsorId: number; name: string; score: number }>> {
    if (engagementHistory.length === 0) return [];

    const billIds = engagementHistory.map(e => e.billId);
    
    try {
      const sponsorData = await db
        .select({
          sponsorId: sponsors.id,
          sponsorName: sponsors.name,
          billId: billSponsorships.billId,
          sponsorshipType: billSponsorships.sponsorshipType
        })
        .from(billSponsorships)
        .innerJoin(sponsors, eq(billSponsorships.sponsorId, sponsors.id))
        .where(inArray(billSponsorships.billId, billIds));

      const sponsorScores = new Map<number, { name: string; score: number }>();
      
      sponsorData.forEach(sponsor => {
        const engagement = engagementHistory.find(e => e.billId === sponsor.billId);
        if (engagement) {
          const current = sponsorScores.get(sponsor.sponsorId) || { name: sponsor.sponsorName, score: 0 };
          const engagementScore = Number(engagement.engagementScore) || 0;
          const multiplier = sponsor.sponsorshipType === 'primary' ? 1.5 : 1.0;
          
          sponsorScores.set(sponsor.sponsorId, {
            name: sponsor.sponsorName,
            score: current.score + (engagementScore * multiplier)
          });
        }
      });

      return Array.from(sponsorScores.entries())
        .map(([sponsorId, data]) => ({ sponsorId, name: data.name, score: data.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    } catch (error) {
      logger.error('Error analyzing sponsor engagement:', { component: 'SmartFilter' }, error);
      return [];
    }
  }

  /**
   * Calculate overall engagement level
   */
  private calculateEngagementLevel(engagementHistory: any[]): 'low' | 'medium' | 'high' {
    if (engagementHistory.length === 0) return 'low';
    
    const totalEngagement = engagementHistory.reduce((sum, e) => sum + (Number(e.engagementScore) || 0), 0);
    const avgEngagement = totalEngagement / engagementHistory.length;
    
    if (avgEngagement > 50) return 'high';
    if (avgEngagement > 20) return 'medium';
    return 'low';
  }

  /**
   * Analyze when user is most active
   */
  private analyzePreferredTimes(commentHistory: any[]): Array<{ hour: number; frequency: number }> {
    const hourMap = new Map<number, number>();
    
    commentHistory.forEach(comment => {
      const hour = new Date(comment.createdAt).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from(hourMap.entries())
      .map(([hour, frequency]) => ({ hour, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(commentHistory: any[]): number {
    if (commentHistory.length < 2) return 12;
    
    const recentComments = commentHistory.slice(0, 10);
    let totalTimeDiff = 0;
    
    for (let i = 1; i < recentComments.length; i++) {
      const timeDiff = new Date(recentComments[i-1].createdAt).getTime() - 
                      new Date(recentComments[i].createdAt).getTime();
      totalTimeDiff += timeDiff;
    }
    
    const avgTimeDiff = totalTimeDiff / (recentComments.length - 1);
    return Math.min(Math.max(avgTimeDiff / (1000 * 60 * 60), 1), 48); // 1-48 hours
  }

  /**
   * Get user preferences with error handling and defaults
   */
  private async getUserPreferences(userId: string): Promise<{ billTracking: BillTrackingPreferences }> {
    try {
      return await userPreferencesService.getUserPreferences(userId);
    } catch (error) {
      logger.error('Error getting user preferences:', { component: 'SmartFilter' }, error);
      
      // Return sensible defaults
      return {
        billTracking: {
          statusChanges: true,
          newComments: true,
          votingSchedule: true,
          amendments: true,
          updateFrequency: 'daily',
          notificationChannels: { inApp: true, email: false, push: false, sms: false },
          smartFiltering: { 
            enabled: false, 
            priorityThreshold: 'low',
            categoryFilters: [],
            keywordFilters: [],
            sponsorFilters: [],
            interestBasedFiltering: false
          },
          advancedSettings: {
            digestSchedule: {
              enabled: false,
              frequency: 'daily' as const,
              timeOfDay: '09:00'
            },
            escalationRules: {
              enabled: false,
              urgentBillsImmediate: false,
              importantSponsorsImmediate: false,
              highEngagementImmediate: false
            },
            batchingRules: {
              similarUpdatesGrouping: true,
              maxBatchSize: 10,
              batchTimeWindow: 30
            }
          }
        } as BillTrackingPreferences
      };
    }
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    this.engagementProfiles.delete(userId);
    this.profileCacheExpiry.delete(userId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.engagementProfiles.clear();
    this.profileCacheExpiry.clear();
  }

  /**
   * Get engagement profile (for debugging/admin purposes)
   */
  async getEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    return this.getUserEngagementProfile(userId);
  }
}

// Export singleton instance
export const smartNotificationFilterService = new SmartNotificationFilterService();