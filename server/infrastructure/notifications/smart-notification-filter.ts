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
import { eq, and, or, sql, inArray, desc } from 'drizzle-orm';
import { userPreferencesService, type BillTrackingPreferences } from '../../features/users/user-preferences.js';
import { logger } from '../utils/logger';

export interface SmartFilterCriteria {
  userId: string;
  billId?: number;
  category?: string;
  tags?: string[];
  sponsorName?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notificationType: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert';
  subType?: 'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled';
}

export interface UserEngagementProfile {
  userId: string;
  topCategories: Array<{ category: string; score: number }>;
  topSponsors: Array<{ sponsorId: number; name: string; score: number }>;
  engagementLevel: 'low' | 'medium' | 'high';
  preferredNotificationTimes: Array<{ hour: number; frequency: number }>;
  averageResponseTime: number; // in hours
}

export interface FilterResult {
  shouldNotify: boolean;
  confidence: number; // 0-1 score
  reasons: string[];
  suggestedChannels: Array<'email' | 'inApp' | 'sms' | 'push'>;
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
}

export class SmartNotificationFilterService {
  private engagementProfiles: Map<string, UserEngagementProfile> = new Map();
  private profileCacheExpiry: Map<string, Date> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Apply smart filtering to determine if notification should be sent
   */
  async applySmartFilter(criteria: SmartFilterCriteria): Promise<FilterResult> {
    try {
      // Get user preferences
      const userPrefs = await userPreferencesService.getUserPreferences(criteria.userId);
      const smartFiltering = userPrefs.billTracking.smartFiltering;

      if (!smartFiltering.enabled) {
        return {
          shouldNotify: true,
          confidence: 1.0,
          reasons: ['Smart filtering disabled'],
          suggestedChannels: ['inApp'],
          suggestedPriority: criteria.priority
        };
      }

      // Get user engagement profile
      const engagementProfile = await this.getUserEngagementProfile(criteria.userId);
      
      // Apply various filtering criteria
      const filterResults = await Promise.all([
        this.checkPriorityThreshold(criteria, smartFiltering),
        this.checkCategoryRelevance(criteria, smartFiltering, engagementProfile),
        this.checkKeywordRelevance(criteria, smartFiltering),
        this.checkSponsorRelevance(criteria, smartFiltering, engagementProfile),
        this.checkEngagementHistory(criteria, engagementProfile),
        this.checkTimingRelevance(criteria, engagementProfile),
        this.checkInterestBasedRelevance(criteria, smartFiltering)
      ]);

      // Combine results
      const combinedResult = this.combineFilterResults(filterResults, criteria);
      
      return combinedResult;

    } catch (error) {
      logger.error('Error in smart filtering:', { component: 'SimpleTool' }, error);
      // Default to allowing notification if filtering fails
      return {
        shouldNotify: true,
        confidence: 0.5,
        reasons: ['Filtering error - defaulting to allow'],
        suggestedChannels: ['inApp'],
        suggestedPriority: criteria.priority
      };
    }
  }

  /**
   * Get or build user engagement profile
   */
  private async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    // Check cache first
    const cached = this.engagementProfiles.get(userId);
    const cacheExpiry = this.profileCacheExpiry.get(userId);
    
    if (cached && cacheExpiry && cacheExpiry > new Date()) {
      return cached;
    }

    // Build new profile
    const profile = await this.buildEngagementProfile(userId);
    
    // Cache the profile
    this.engagementProfiles.set(userId, profile);
    this.profileCacheExpiry.set(userId, new Date(Date.now() + this.CACHE_DURATION));
    
    return profile;
  }

  /**
   * Build user engagement profile from historical data
   */
  private async buildEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    // Get user's bill engagement history
    const engagementHistory = await db
      .select({
        billId: billEngagement.billId,
        engagementScore: billEngagement.engagementScore,
        viewCount: billEngagement.viewCount,
        commentCount: billEngagement.commentCount,
        shareCount: billEngagement.shareCount,
        lastEngaged: billEngagement.lastEngaged,
        billCategory: bills.category,
        billTitle: bills.title
      })
      .from(billEngagement)
      .innerJoin(bills, eq(billEngagement.billId, bills.id))
      .where(eq(billEngagement.userId, userId))
      .orderBy(desc(billEngagement.lastEngaged))
      .limit(100);

    // Get user's comment history for timing analysis
    const commentHistory = await db
      .select({
        createdAt: billComments.createdAt,
        billId: billComments.billId
      })
      .from(billComments)
      .where(eq(billComments.userId, userId))
      .orderBy(desc(billComments.createdAt))
      .limit(50);

    // Analyze categories
    const categoryScores = this.analyzeCategoryEngagement(engagementHistory);
    
    // Analyze sponsors
    const sponsorScores = await this.analyzeSponsorEngagement(userId, engagementHistory);
    
    // Determine engagement level
    const engagementLevel = this.calculateEngagementLevel(engagementHistory);
    
    // Analyze preferred notification times
    const preferredTimes = this.analyzePreferredTimes(commentHistory);
    
    // Calculate average response time
    const avgResponseTime = this.calculateAverageResponseTime(commentHistory);

    return {
      userId,
      topCategories: categoryScores,
      topSponsors: sponsorScores,
      engagementLevel,
      preferredNotificationTimes: preferredTimes,
      averageResponseTime: avgResponseTime
    };
  }

  /**
   * Analyze category engagement patterns
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
   * Analyze sponsor engagement patterns
   */
  private async analyzeSponsorEngagement(
    userId: string, 
    engagementHistory: any[]
  ): Promise<Array<{ sponsorId: number; name: string; score: number }>> {
    const billIds = engagementHistory.map(e => e.billId);
    
    if (billIds.length === 0) {
      return [];
    }

    // Get sponsor information for engaged bills
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
        const currentData = sponsorScores.get(sponsor.sponsorId) || { name: sponsor.sponsorName, score: 0 };
        const engagementScore = Number(engagement.engagementScore) || 0;
        const multiplier = sponsor.sponsorshipType === 'primary' ? 1.5 : 1.0;
        
        sponsorScores.set(sponsor.sponsorId, {
          name: sponsor.sponsorName,
          score: currentData.score + (engagementScore * multiplier)
        });
      }
    });

    return Array.from(sponsorScores.entries())
      .map(([sponsorId, data]) => ({ sponsorId, name: data.name, score: data.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Calculate user's overall engagement level
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
   * Analyze preferred notification times based on user activity
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
   * Calculate average response time to notifications
   */
  private calculateAverageResponseTime(commentHistory: any[]): number {
    // This would ideally compare notification send times with user response times
    // For now, return a default based on comment frequency
    if (commentHistory.length === 0) return 24; // 24 hours default
    
    const recentComments = commentHistory.slice(0, 10);
    if (recentComments.length < 2) return 12;
    
    // Calculate average time between comments as a proxy
    let totalTimeDiff = 0;
    for (let i = 1; i < recentComments.length; i++) {
      const timeDiff = new Date(recentComments[i-1].createdAt).getTime() - 
                      new Date(recentComments[i].createdAt).getTime();
      totalTimeDiff += timeDiff;
    }
    
    const avgTimeDiff = totalTimeDiff / (recentComments.length - 1);
    return Math.min(Math.max(avgTimeDiff / (1000 * 60 * 60), 1), 48); // 1-48 hours
  }

  // Individual filter methods
  private async checkPriorityThreshold(
    criteria: SmartFilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering']
  ): Promise<Partial<FilterResult>> {
    const priorityLevels = { low: 1, medium: 2, high: 3, urgent: 4 };
    const thresholdLevels = { low: 1, medium: 2, high: 3 };
    
    const meetsThreshold = priorityLevels[criteria.priority] >= thresholdLevels[smartFiltering.priorityThreshold];
    
    return {
      shouldNotify: meetsThreshold,
      confidence: meetsThreshold ? 1.0 : 0.0,
      reasons: meetsThreshold ? 
        [`Priority ${criteria.priority} meets threshold ${smartFiltering.priorityThreshold}`] :
        [`Priority ${criteria.priority} below threshold ${smartFiltering.priorityThreshold}`]
    };
  }

  private async checkCategoryRelevance(
    criteria: SmartFilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering'],
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    if (!criteria.category) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No category specified'] };
    }

    // Check explicit category filters
    if (smartFiltering.categoryFilters.length > 0) {
      const isInFilter = smartFiltering.categoryFilters.includes(criteria.category);
      if (!isInFilter) {
        return {
          shouldNotify: false,
          confidence: 1.0,
          reasons: [`Category ${criteria.category} not in user's filter list`]
        };
      }
    }

    // Check engagement-based category relevance
    const categoryScore = profile.topCategories.find(c => c.category === criteria.category);
    if (categoryScore) {
      const confidence = Math.min(categoryScore.score / 100, 1.0);
      return {
        shouldNotify: true,
        confidence,
        reasons: [`High engagement with ${criteria.category} category (score: ${categoryScore.score})`]
      };
    }

    return {
      shouldNotify: true,
      confidence: 0.3,
      reasons: [`No previous engagement with ${criteria.category} category`]
    };
  }

  private async checkKeywordRelevance(
    criteria: SmartFilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering']
  ): Promise<Partial<FilterResult>> {
    if (smartFiltering.keywordFilters.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No keyword filters set'] };
    }

    if (!criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No bill content to check'] };
    }

    // Get bill content
    const bill = await db
      .select({
        title: bills.title,
        description: bills.description,
        content: bills.content
      })
      .from(bills)
      .where(eq(bills.id, criteria.billId))
      .limit(1);

    if (bill.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Bill not found'] };
    }

    const billText = `${bill[0].title} ${bill[0].description} ${bill[0].content}`.toLowerCase();
    const matchedKeywords = smartFiltering.keywordFilters.filter(keyword =>
      billText.includes(keyword.toLowerCase())
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

  private async checkSponsorRelevance(
    criteria: SmartFilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering'],
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    if (!criteria.sponsorName && !criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No sponsor information available'] };
    }

    // Check explicit sponsor filters
    if (smartFiltering.sponsorFilters.length > 0) {
      if (criteria.sponsorName) {
        const isInFilter = smartFiltering.sponsorFilters.includes(criteria.sponsorName);
        if (!isInFilter) {
          return {
            shouldNotify: false,
            confidence: 1.0,
            reasons: [`Sponsor ${criteria.sponsorName} not in user's filter list`]
          };
        }
      }
    }

    // Check engagement-based sponsor relevance
    if (criteria.sponsorName) {
      const sponsorScore = profile.topSponsors.find(s => s.name === criteria.sponsorName);
      if (sponsorScore) {
        const confidence = Math.min(sponsorScore.score / 100, 1.0);
        return {
          shouldNotify: true,
          confidence,
          reasons: [`High engagement with sponsor ${criteria.sponsorName} (score: ${sponsorScore.score})`]
        };
      }
    }

    return {
      shouldNotify: true,
      confidence: 0.4,
      reasons: ['No specific sponsor engagement history']
    };
  }

  private async checkEngagementHistory(
    criteria: SmartFilterCriteria,
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    if (!criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No bill specified'] };
    }

    // Check if user has previously engaged with this bill
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
        reasons: [`Previous engagement with this bill (score: ${score})`]
      };
    }

    // Adjust based on overall engagement level
    const confidenceByLevel = {
      high: 0.8,
      medium: 0.6,
      low: 0.3
    };

    return {
      shouldNotify: true,
      confidence: confidenceByLevel[profile.engagementLevel],
      reasons: [`User has ${profile.engagementLevel} overall engagement level`]
    };
  }

  private async checkTimingRelevance(
    criteria: SmartFilterCriteria,
    profile: UserEngagementProfile
  ): Promise<Partial<FilterResult>> {
    const currentHour = new Date().getHours();
    
    // Check if current time matches user's preferred notification times
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

    // For urgent notifications, timing is less important
    if (criteria.priority === 'urgent') {
      return {
        shouldNotify: true,
        confidence: 0.9,
        reasons: ['Urgent notification - timing less relevant']
      };
    }

    return {
      shouldNotify: true,
      confidence: 0.4,
      reasons: ['Outside user\'s typical active hours']
    };
  }

  private async checkInterestBasedRelevance(
    criteria: SmartFilterCriteria,
    smartFiltering: BillTrackingPreferences['smartFiltering']
  ): Promise<Partial<FilterResult>> {
    if (!smartFiltering.interestBasedFiltering || !criteria.billId) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Interest-based filtering disabled or no bill'] };
    }

    // Get user's tracked interests
    const userInterestsList = await db
      .select({ interest: userInterests.interest })
      .from(userInterests)
      .where(eq(userInterests.userId, criteria.userId));

    if (userInterestsList.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No interests configured'] };
    }

    // Get bill information
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
  }

  /**
   * Combine multiple filter results into a final decision
   */
  private combineFilterResults(
    results: Partial<FilterResult>[],
    criteria: SmartFilterCriteria
  ): FilterResult {
    // Filter out results that explicitly say not to notify
    const blockingResults = results.filter(r => r.shouldNotify === false);
    
    if (blockingResults.length > 0) {
      return {
        shouldNotify: false,
        confidence: Math.max(...blockingResults.map(r => r.confidence || 0)),
        reasons: blockingResults.flatMap(r => r.reasons || []),
        suggestedChannels: ['inApp'], // Minimal fallback
        suggestedPriority: 'low'
      };
    }

    // Calculate weighted confidence
    const validResults = results.filter(r => r.confidence !== undefined);
    const avgConfidence = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length
      : 0.5;

    // Suggest channels based on confidence and priority
    const suggestedChannels = this.suggestChannels(avgConfidence, criteria.priority);
    
    // Adjust priority based on confidence
    const suggestedPriority = this.adjustPriority(criteria.priority, avgConfidence);

    return {
      shouldNotify: true,
      confidence: avgConfidence,
      reasons: results.flatMap(r => r.reasons || []),
      suggestedChannels,
      suggestedPriority
    };
  }

  private suggestChannels(confidence: number, priority: string): Array<'email' | 'inApp' | 'sms' | 'push'> {
    const channels: Array<'email' | 'inApp' | 'sms' | 'push'> = ['inApp'];
    
    if (confidence > 0.7 || priority === 'urgent') {
      channels.push('push');
    }
    
    if (confidence > 0.8 || priority === 'high' || priority === 'urgent') {
      channels.push('email');
    }
    
    if (priority === 'urgent') {
      channels.push('sms');
    }
    
    return channels;
  }

  private adjustPriority(
    originalPriority: string, 
    confidence: number
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (originalPriority === 'urgent') return 'urgent';
    
    if (confidence > 0.8 && originalPriority === 'high') return 'high';
    if (confidence > 0.6 && originalPriority === 'medium') return 'medium';
    if (confidence < 0.3) return 'low';
    
    return originalPriority as 'low' | 'medium' | 'high' | 'urgent';
  }

  /**
   * Clear cache for a specific user (useful when preferences change)
   */
  clearUserCache(userId: string): void {
    this.engagementProfiles.delete(userId);
    this.profileCacheExpiry.delete(userId);
  }

  /**
   * Get user engagement profile for admin/debugging purposes
   */
  async getEngagementProfileForUser(userId: string): Promise<UserEngagementProfile> {
    return this.getUserEngagementProfile(userId);
  }
}

export const smartNotificationFilterService = new SmartNotificationFilterService();






