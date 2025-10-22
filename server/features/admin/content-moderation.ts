import { database as db } from '../../../shared/database/connection';
import { bill, billComment, user, moderationFlag, moderationAction, sponsor } from '../../../shared/schema';

// Alias for backward compatibility
const bills = bill;
const billComments = billComment;
const users = user;
const moderationFlags = moderationFlag;
const moderationActions = moderationAction;
const sponsors = sponsor;
import { eq, count, desc, sql, and, gte, like, or, inArray, isNull, SQL } from 'drizzle-orm';
import { logger } from '../../../shared/core/index.js';

// Type definitions for better type safety
export interface ContentModerationFilters {
  contentType?: 'bill' | 'comment';
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  dateRange?: {
    start: Date;
    end: Date;
  };
  moderator?: string;
}

export interface ModerationItem {
  id: number;
  contentType: 'bill' | 'comment';
  contentId: number;
  content: {
    title?: string;
    text: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: Date;
  };
  flagType: string;
  severity: string;
  reason: string;
  reportedBy: string;
  autoDetected: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  resolution?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationAction {
  id: number;
  contentType: string;
  contentId: number;
  actionType: string;
  reason: string;
  moderatorId: string;
  moderatorName: string;
  createdAt: Date;
}

export interface ContentAnalytics {
  totalContent: number;
  pendingModeration: number;
  approvedContent: number;
  rejectedContent: number;
  flaggedContent: number;
  averageReviewTime: number;
  topModerators: {
    id: string;
    name: string;
    actionsCount: number;
  }[];
  contentQualityScore: number;
  flagReasons: {
    reason: string;
    count: number;
  }[];
}

export interface BulkModerationOperation {
  itemIds: number[];
  action: 'approve' | 'reject' | 'flag' | 'delete';
  reason: string;
  moderatorId: string;
}

export class ContentModerationService {
  private static instance: ContentModerationService;

  public static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  /**
   * Retrieves the moderation queue with filtering and pagination.
   * This method is the heart of the moderation workflow, providing moderators
   * with a filtered, paginated view of content that needs review.
   */
  async getModerationQueue(
    page = 1,
    limit = 20,
    filters?: ContentModerationFilters
  ): Promise<{
    items: ModerationItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;
      
      // Build filter conditions as an array, filtering out undefined values
      const conditions: SQL[] = [];

      if (filters?.contentType) {
        conditions.push(eq(moderationFlags.contentType, filters.contentType));
      }

      if (filters?.status) {
        conditions.push(eq(moderationFlags.status, filters.status));
      }

      if (filters?.severity) {
        conditions.push(eq(moderationFlags.severity, filters.severity));
      }

      if (filters?.moderator) {
        conditions.push(eq(moderationFlags.reviewedBy, filters.moderator));
      }

      if (filters?.dateRange) {
        conditions.push(gte(moderationFlags.createdAt, filters.dateRange.start));
        conditions.push(sql`${moderationFlags.createdAt} <= ${filters.dateRange.end}`);
      }

      const queueItems = await db
        .select({
          id: moderationFlags.id,
          contentType: moderationFlags.contentType,
          contentId: moderationFlags.contentId,
          flagType: moderationFlags.flagType,
          severity: moderationFlags.severity,
          reason: moderationFlags.reason,
          reportedBy: moderationFlags.reportedBy,
          autoDetected: moderationFlags.autoDetected,
          status: moderationFlags.status,
          reviewedBy: moderationFlags.reviewedBy,
          reviewedAt: moderationFlags.reviewedAt,
          resolution: moderationFlags.resolution,
          createdAt: moderationFlags.createdAt,
          updatedAt: moderationFlags.updatedAt
        })
        .from(moderationFlags)
        .$dynamic()
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderationFlags.severity), desc(moderationFlags.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: count() })
        .from(moderationFlags)
        .$dynamic()
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const total = countResult[0]?.count ?? 0;

      const enhancedItems = await Promise.all(
        queueItems.map(async (item) => {
          const contentDetails = await this.getContentDetails(item.contentType, item.contentId);
          return {
            ...item,
            content: contentDetails
          } as ModerationItem;
        })
      );

      return {
        items: enhancedItems,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching moderation queue:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Processes a moderation decision on a specific piece of content.
   */
  async moderateContent(
    itemId: number,
    action: 'approve' | 'reject' | 'flag' | 'edit' | 'delete',
    reason: string,
    moderatorId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const [item] = await db
        .select()
        .from(moderationFlags)
        .where(eq(moderationFlags.id, itemId));

      if (!item) {
        return { success: false, message: 'Moderation item not found' };
      }

      const newStatus = action === 'approve' ? 'approved' : 
                       action === 'reject' ? 'rejected' : 'flagged';

      await db
        .update(moderationFlags)
        .set({
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          resolution: reason
        })
        .where(eq(moderationFlags.id, itemId));

      await db.insert(moderationActions).values({
        contentType: item.contentType,
        contentId: item.contentId,
        actionType: action,
        reason: reason,
        moderatorId: moderatorId
      } as any);

      await this.applyModerationAction(item.contentType, item.contentId, action);

      return { success: true, message: `Content ${action}ed successfully` };
    } catch (error) {
      logger.error('Error moderating content:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, message: 'Failed to moderate content' };
    }
  }

  /**
   * Performs bulk moderation operations on multiple items.
   */
  async bulkModerateContent(
    operation: BulkModerationOperation
  ): Promise<{ success: boolean; message: string; processedCount: number }> {
    try {
      let processedCount = 0;

      for (const itemId of operation.itemIds) {
        const result = await this.moderateContent(
          itemId,
          operation.action,
          operation.reason,
          operation.moderatorId
        );

        if (result.success) {
          processedCount++;
        }
      }

      return {
        success: true,
        message: `Bulk moderation completed. ${processedCount}/${operation.itemIds.length} items processed.`,
        processedCount
      };
    } catch (error) {
      logger.error('Error performing bulk moderation:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        message: 'Failed to perform bulk moderation',
        processedCount: 0
      };
    }
  }

  /**
   * Reviews a specific flag and applies a resolution decision.
   */
  async reviewFlag(
    flagId: number,
    moderatorId: string,
    resolutionType: 'approve' | 'reject' | 'warn' | 'remove' | 'ban-user',
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
    flag?: ModerationItem;
  }> {
    try {
      const [flag] = await db
        .select()
        .from(moderationFlags)
        .where(eq(moderationFlags.id, flagId));

      if (!flag) {
        return {
          success: false,
          message: 'Flag not found'
        };
      }

      let newStatus: string;
      switch (resolutionType) {
        case 'approve':
          newStatus = 'approved';
          break;
        case 'reject':
        case 'warn':
          newStatus = 'flagged';
          break;
        case 'remove':
        case 'ban-user':
          newStatus = 'rejected';
          break;
        default:
          newStatus = 'pending';
      }

      await db
        .update(moderationFlags)
        .set({
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          resolution: reason
        })
        .where(eq(moderationFlags.id, flagId));

      await db.insert(moderationActions).values({
        contentType: flag.contentType,
        contentId: flag.contentId,
        actionType: resolutionType,
        reason: reason,
        moderatorId: moderatorId
      } as any);

      await this.applyResolution(
        flag.contentType,
        flag.contentId,
        flag.reportedBy,
        resolutionType
      );

      const [updatedFlag] = await db
        .select()
        .from(moderationFlags)
        .where(eq(moderationFlags.id, flagId));

      const contentDetails = await this.getContentDetails(
        updatedFlag.contentType,
        updatedFlag.contentId
      );

      return {
        success: true,
        message: `Flag reviewed successfully with resolution: ${resolutionType}`,
        flag: {
          ...updatedFlag,
          content: contentDetails
        } as ModerationItem
      };
    } catch (error) {
      logger.error('Error reviewing flag:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        message: 'Failed to review flag'
      };
    }
  }

  /**
   * Retrieves comprehensive moderation statistics for a specified timeframe.
   */
  async getModerationStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    flagsCreated: number;
    flagsResolved: number;
    flagsPending: number;
    averageResolutionTime: number;
    violationsByType: { type: string; count: number }[];
    resolutionsByType: { type: string; count: number }[];
    moderatorActivity: {
      moderatorId: string;
      moderatorName: string;
      reviewCount: number;
      averageReviewTime: number;
    }[];
    contentTypeBreakdown: { contentType: string; count: number }[];
    severityBreakdown: { severity: string; count: number }[];
  }> {
    try {
      const [flagsCreatedResult] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(
          and(
            gte(moderationFlags.createdAt, startDate),
            sql`${moderationFlags.createdAt} <= ${endDate}`
          )
        );

      const [flagsResolvedResult] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(
          and(
            sql`${moderationFlags.reviewedAt} IS NOT NULL`,
            gte(moderationFlags.reviewedAt, startDate),
            sql`${moderationFlags.reviewedAt} <= ${endDate}`
          )
        );

      const [flagsPendingResult] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(eq(moderationFlags.status, 'pending'));

      const resolvedFlags = await db
        .select({
          createdAt: moderationFlags.createdAt,
          reviewedAt: moderationFlags.reviewedAt
        })
        .from(moderationFlags)
        .where(
          and(
            sql`${moderationFlags.reviewedAt} IS NOT NULL`,
            gte(moderationFlags.reviewedAt, startDate),
            sql`${moderationFlags.reviewedAt} <= ${endDate}`
          )
        );

      const averageResolutionTime = resolvedFlags.length > 0
        ? resolvedFlags.reduce((sum, flag) => {
            if (!flag.reviewedAt) return sum;
            const resolutionTime = flag.reviewedAt.getTime() - flag.createdAt.getTime();
            return sum + resolutionTime;
          }, 0) / resolvedFlags.length / (1000 * 60 * 60)
        : 0;

      const violationsByTypeData = await db
        .select({
          type: moderationFlags.flagType,
          count: count()
        })
        .from(moderationFlags)
        .where(
          and(
            gte(moderationFlags.createdAt, startDate),
            sql`${moderationFlags.createdAt} <= ${endDate}`
          )
        )
        .groupBy(moderationFlags.flagType)
        .orderBy(desc(sql`count(*)`));

      const violationsByType = violationsByTypeData.map(item => ({
        type: item.type,
        count: Number(item.count)
      }));

      const resolutionsByTypeData = await db
        .select({
          type: moderationActions.actionType,
          count: count()
        })
        .from(moderationActions)
        .where(
          and(
            gte(moderationActions.createdAt, startDate),
            sql`${moderationActions.createdAt} <= ${endDate}`
          )
        )
        .groupBy(moderationActions.actionType)
        .orderBy(desc(sql`count(*)`));

      const resolutionsByType = resolutionsByTypeData.map(item => ({
        type: item.type,
        count: Number(item.count)
      }));

      const moderatorActivityData = await db
        .select({
          moderatorId: moderationActions.moderatorId,
          reviewCount: count()
        })
        .from(moderationActions)
        .where(
          and(
            gte(moderationActions.createdAt, startDate),
            sql`${moderationActions.createdAt} <= ${endDate}`
          )
        )
        .groupBy(moderationActions.moderatorId)
        .orderBy(desc(sql`count(*)`));

      const moderatorIds = moderatorActivityData.map(m => m.moderatorId);
      const moderatorDetails = moderatorIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, moderatorIds))
        : [];

      const moderatorActivity = await Promise.all(
        moderatorActivityData.map(async (mod) => {
          const moderator = moderatorDetails.find(m => m.id === mod.moderatorId);
          
          const moderatorFlags = await db
            .select({
              createdAt: moderationFlags.createdAt,
              reviewedAt: moderationFlags.reviewedAt
            })
            .from(moderationFlags)
            .where(
              and(
                eq(moderationFlags.reviewedBy, mod.moderatorId),
                sql`${moderationFlags.reviewedAt} IS NOT NULL`,
                gte(moderationFlags.reviewedAt, startDate),
                sql`${moderationFlags.reviewedAt} <= ${endDate}`
              )
            );

          const averageReviewTime = moderatorFlags.length > 0
            ? moderatorFlags.reduce((sum, flag) => {
                if (!flag.reviewedAt) return sum;
                const reviewTime = flag.reviewedAt.getTime() - flag.createdAt.getTime();
                return sum + reviewTime;
              }, 0) / moderatorFlags.length / (1000 * 60 * 60)
            : 0;

          return {
            moderatorId: mod.moderatorId,
            moderatorName: moderator?.name || 'Unknown',
            reviewCount: Number(mod.reviewCount),
            averageReviewTime
          };
        })
      );

      const contentTypeBreakdownData = await db
        .select({
          contentType: moderationFlags.contentType,
          count: count()
        })
        .from(moderationFlags)
        .where(
          and(
            gte(moderationFlags.createdAt, startDate),
            sql`${moderationFlags.createdAt} <= ${endDate}`
          )
        )
        .groupBy(moderationFlags.contentType);

      const contentTypeBreakdown = contentTypeBreakdownData.map(item => ({
        contentType: item.contentType,
        count: Number(item.count)
      }));

      const severityBreakdownData = await db
        .select({
          severity: moderationFlags.severity,
          count: count()
        })
        .from(moderationFlags)
        .where(
          and(
            gte(moderationFlags.createdAt, startDate),
            sql`${moderationFlags.createdAt} <= ${endDate}`
          )
        )
        .groupBy(moderationFlags.severity);

      const severityBreakdown = severityBreakdownData.map(item => ({
        severity: item.severity,
        count: Number(item.count)
      }));

      return {
        flagsCreated: Number(flagsCreatedResult.count),
        flagsResolved: Number(flagsResolvedResult.count),
        flagsPending: Number(flagsPendingResult.count),
        averageResolutionTime,
        violationsByType,
        resolutionsByType,
        moderatorActivity,
        contentTypeBreakdown,
        severityBreakdown
      };
    } catch (error) {
      logger.error('Error fetching moderation stats:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Analyzes content against moderation rules without creating a flag.
   */
  async analyzeContent(
    contentType: 'bill' | 'comment',
    content: string,
    additionalContext?: {
      authorId?: string;
      relatedContentId?: number;
    }
  ): Promise<{
    shouldFlag: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedIssues: {
      type: string;
      description: string;
      confidence: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }[];
    overallScore: number;
    recommendations: string[];
  }> {
    try {
      const detectedIssues: {
        type: string;
        description: string;
        confidence: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }[] = [];

      const lowerContent = content.toLowerCase();

      const profanityPatterns = [
        'fuck', 'shit', 'damn', 'bastard', 'asshole', 'bitch',
        'crap', 'piss', 'dick', 'cock', 'pussy'
      ];
      
      const profanityCount = profanityPatterns.filter(word => 
        lowerContent.includes(word)
      ).length;

      if (profanityCount > 0) {
        detectedIssues.push({
          type: 'profanity',
          description: `Detected ${profanityCount} instance(s) of explicit language`,
          confidence: Math.min(profanityCount * 0.3, 1),
          severity: profanityCount >= 3 ? 'high' : profanityCount >= 2 ? 'medium' : 'low'
        });
      }

      const hasExcessiveCaps = content.split('').filter(c => 
        c === c.toUpperCase() && c !== c.toLowerCase()
      ).length / content.length > 0.5;

      const linkCount = (content.match(/https?:\/\//g) || []).length;
      const hasExcessiveLinks = linkCount > 3;

      const words = content.split(/\s+/);
      const uniqueWords = new Set(words.map(w => w.toLowerCase()));
      const hasRepetitiveText = words.length > 10 && uniqueWords.size / words.length < 0.3;

      if (hasExcessiveCaps || hasExcessiveLinks || hasRepetitiveText) {
        const spamSignals = [hasExcessiveCaps, hasExcessiveLinks, hasRepetitiveText]
          .filter(Boolean).length;
        
        detectedIssues.push({
          type: 'spam',
          description: 'Content shows characteristics of spam (excessive caps, links, or repetition)',
          confidence: spamSignals * 0.33,
          severity: spamSignals >= 2 ? 'high' : 'medium'
        });
      }

      const hateSpeechPatterns = [
        'hate', 'kill', 'die', 'destroy', 'eliminate',
        'inferior', 'subhuman', 'vermin', 'scum'
      ];

      const hateSpeechCount = hateSpeechPatterns.filter(word =>
        lowerContent.includes(word)
      ).length;

      if (hateSpeechCount > 0) {
        detectedIssues.push({
          type: 'hate-speech',
          description: 'Content may contain hate speech or violent language',
          confidence: Math.min(hateSpeechCount * 0.4, 1),
          severity: hateSpeechCount >= 3 ? 'critical' : hateSpeechCount >= 2 ? 'high' : 'medium'
        });
      }

      const harassmentPatterns = [
        'you are', 'you\'re a', 'idiot', 'moron', 'stupid',
        'shut up', 'kill yourself', 'loser', 'pathetic'
      ];

      const harassmentCount = harassmentPatterns.filter(phrase =>
        lowerContent.includes(phrase)
      ).length;

      if (harassmentCount > 0) {
        detectedIssues.push({
          type: 'harassment',
          description: 'Content may contain personal attacks or harassment',
          confidence: Math.min(harassmentCount * 0.35, 1),
          severity: harassmentCount >= 2 ? 'high' : 'medium'
        });
      }

      if (content.length < 10) {
        detectedIssues.push({
          type: 'low-quality',
          description: 'Content is extremely short and may not be substantive',
          confidence: 0.6,
          severity: 'low'
        });
      }

      const misinformationMarkers = [
        'they don\'t want you to know', 'the truth they\'re hiding',
        'big pharma', 'wake up', 'do your own research',
        'mainstream media won\'t tell you'
      ];

      const misinformationCount = misinformationMarkers.filter(phrase =>
        lowerContent.includes(phrase)
      ).length;

      if (misinformationCount > 0) {
        detectedIssues.push({
          type: 'misinformation',
          description: 'Content contains phrases commonly associated with misinformation',
          confidence: misinformationCount * 0.3,
          severity: 'medium'
        });
      }

      const overallScore = detectedIssues.reduce((score, issue) => {
        const severityWeight = {
          low: 1,
          medium: 2,
          high: 3,
          critical: 4
        };
        return score + (issue.confidence * severityWeight[issue.severity]);
      }, 0);

      const hasCriticalIssues = detectedIssues.some(i => i.severity === 'critical');
      const shouldFlag = hasCriticalIssues || overallScore >= 3;

      let overallSeverity: 'low' | 'medium' | 'high' | 'critical';
      if (hasCriticalIssues || overallScore >= 6) {
        overallSeverity = 'critical';
      } else if (overallScore >= 4) {
        overallSeverity = 'high';
      } else if (overallScore >= 2) {
        overallSeverity = 'medium';
      } else {
        overallSeverity = 'low';
      }

      const recommendations: string[] = [];
      
      if (detectedIssues.some(i => i.type === 'profanity')) {
        recommendations.push('Consider removing explicit language to maintain a professional tone');
      }
      
      if (detectedIssues.some(i => i.type === 'spam')) {
        recommendations.push('Reduce repetition, excessive capitalization, or number of links');
      }
      
      if (detectedIssues.some(i => i.type === 'hate-speech')) {
        recommendations.push('Remove language that could be considered hateful or violent');
      }
      
      if (detectedIssues.some(i => i.type === 'harassment')) {
        recommendations.push('Focus on ideas rather than personal attacks');
      }
      
      if (detectedIssues.some(i => i.type === 'low-quality')) {
        recommendations.push('Provide more substantive content to contribute meaningfully to the discussion');
      }
      
      if (detectedIssues.some(i => i.type === 'misinformation')) {
        recommendations.push('Support claims with credible sources and avoid conspiracy language');
      }

      if (recommendations.length === 0 && !shouldFlag) {
        recommendations.push('Content appears to meet community guidelines');
      }

      return {
        shouldFlag,
        severity: overallSeverity,
        detectedIssues,
        overallScore: Math.round(overallScore * 100) / 100,
        recommendations
      };
    } catch (error) {
      logger.error('Error analyzing content:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        shouldFlag: false,
        severity: 'low',
        detectedIssues: [],
        overallScore: 0,
        recommendations: ['Content analysis temporarily unavailable']
      };
    }
  }

  /**
   * Creates or updates a flag on a piece of content.
   */
  async flagContent(
    contentType: 'bill' | 'comment',
    contentId: number,
    flagType: string,
    reason: string,
    reportedBy: string,
    autoDetected = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      const [existingFlag] = await db
        .select()
        .from(moderationFlags)
        .where(
          and(
            eq(moderationFlags.contentType, contentType),
            eq(moderationFlags.contentId, contentId),
            eq(moderationFlags.status, 'pending')
          )
        );

      const severity = this.calculateSeverity(flagType);

      if (existingFlag) {
        await db
          .update(moderationFlags)
          .set({
            reason: `${existingFlag.reason}; ${reason}`
          })
          .where(eq(moderationFlags.id, existingFlag.id));
      } else {
        await db.insert(moderationFlags).values({
          contentType,
          contentId,
          flagType,
          severity,
          reason,
          reportedBy,
          autoDetected
        } as any);
      }

      return { success: true, message: 'Content flagged successfully' };
    } catch (error) {
      logger.error('Error flagging content:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, message: 'Failed to flag content' };
    }
  }

  /**
   * Generates comprehensive analytics about content moderation.
   */
  async getContentAnalytics(): Promise<ContentAnalytics> {
    try {
      const [totalBills] = await db.select({ count: count() }).from(bills);
      const [totalComments] = await db.select({ count: count() }).from(billComments);
      const totalContent = Number(totalBills.count) + Number(totalComments.count);

      const [pendingItems] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(eq(moderationFlags.status, 'pending'));

      const [approvedItems] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(eq(moderationFlags.status, 'approved'));

      const [rejectedItems] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(eq(moderationFlags.status, 'rejected'));

      const [flaggedItems] = await db
        .select({ count: count() })
        .from(moderationFlags)
        .where(eq(moderationFlags.status, 'flagged'));

      const reviewedItems = await db
        .select({
          createdAt: moderationFlags.createdAt,
          reviewedAt: moderationFlags.reviewedAt
        })
        .from(moderationFlags)
        .where(sql`${moderationFlags.reviewedAt} IS NOT NULL`);

      const averageReviewTime = reviewedItems.length > 0
        ? reviewedItems.reduce((sum, item) => {
            if (!item.reviewedAt) return sum;
            const reviewTime = item.reviewedAt.getTime() - item.createdAt.getTime();
            return sum + reviewTime;
          }, 0) / reviewedItems.length / (1000 * 60 * 60)
        : 0;

      const topModerators = await db
        .select({
          moderatorId: moderationActions.moderatorId,
          actionCount: count()
        })
        .from(moderationActions)
        .groupBy(moderationActions.moderatorId)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      const moderatorIds = topModerators.map(m => m.moderatorId);
      const moderatorDetails = moderatorIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, moderatorIds))
        : [];

      const topModeratorsWithNames = topModerators.map(mod => {
        const moderator = moderatorDetails.find(m => m.id === mod.moderatorId);
        return {
          id: mod.moderatorId,
          name: moderator?.name || 'Unknown',
          actionsCount: Number(mod.actionCount)
        };
      });

      const qualityScore = totalContent > 0
        ? ((Number(approvedItems.count) / totalContent) * 100)
        : 100;

      const flagReasonsData = await db
        .select({
          flagType: moderationFlags.flagType,
          flagCount: count()
        })
        .from(moderationFlags)
        .groupBy(moderationFlags.flagType)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const flagReasons = flagReasonsData.map(item => ({
        reason: item.flagType,
        count: Number(item.flagCount)
      }));

      return {
        totalContent,
        pendingModeration: Number(pendingItems.count),
        approvedContent: Number(approvedItems.count),
        rejectedContent: Number(rejectedItems.count),
        flaggedContent: Number(flaggedItems.count),
        averageReviewTime,
        topModerators: topModeratorsWithNames,
        contentQualityScore: qualityScore,
        flagReasons
      };
    } catch (error) {
      logger.error('Error fetching content analytics:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Retrieves the complete moderation history for content or the entire system.
   */
  async getModerationHistory(
    contentType?: 'bill' | 'comment',
    contentId?: number,
    page = 1,
    limit = 20
  ): Promise<{
    actions: ModerationAction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;
      
      const conditions: SQL[] = [];

      if (contentType && contentId) {
        conditions.push(eq(moderationActions.contentType, contentType));
        conditions.push(eq(moderationActions.contentId, contentId));
      }

      const actions = await db
        .select({
          id: moderationActions.id,
          contentType: moderationActions.contentType,
          contentId: moderationActions.contentId,
          actionType: moderationActions.actionType,
          reason: moderationActions.reason,
          moderatorId: moderationActions.moderatorId,
          moderatorName: users.name,
          createdAt: moderationActions.createdAt
        })
        .from(moderationActions)
        .innerJoin(users, eq(moderationActions.moderatorId, users.id))
        .$dynamic()
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(moderationActions.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await db
        .select({ count: count() })
        .from(moderationActions)
        .$dynamic()
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const total = countResult[0]?.count ?? 0;

      return {
        actions: actions.map(action => ({
          id: action.id,
          contentType: action.contentType,
          contentId: action.contentId,
          actionType: action.actionType,
          reason: action.reason,
          moderatorId: action.moderatorId,
          moderatorName: action.moderatorName,
          createdAt: action.createdAt
        })),
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching moderation history:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetches the full details of content being moderated.
   */
  private async getContentDetails(contentType: string, contentId: number) {
    try {
      if (contentType === 'bill') {
        const [bill] = await db
          .select({
            title: bills.title,
            text: bills.summary,
            sponsorId: bills.sponsorId,
            createdAt: bills.createdAt
          })
          .from(bills)
          .where(eq(bills.id, contentId));

        if (!bill) {
          return {
            title: 'Bill not found',
            text: '',
            author: { id: '', name: 'Unknown', email: '' },
            createdAt: new Date()
          };
        }

        let sponsor: { id: number; name: string; email: string | null } | null = null;
        if (bill.sponsorId) {
          const sponsorResult = await db
            .select({ id: sponsors.id, name: sponsors.name, email: sponsors.email })
            .from(sponsors)
            .where(eq(sponsors.id, bill.sponsorId));
          sponsor = sponsorResult[0] || null;
        }

        return {
          title: bill.title,
          text: bill.text || '',
          author: sponsor ? { id: sponsor.id.toString(), name: sponsor.name, email: sponsor.email || '' } : { id: bill.sponsorId?.toString() || '', name: 'Unknown', email: '' },
          createdAt: bill.createdAt
        };
      } else if (contentType === 'comment') {
        const [comment] = await db
          .select({
            text: billComments.content,
            authorId: billComments.userId,
            createdAt: billComments.createdAt,
            authorName: users.name,
            authorEmail: users.email
          })
          .from(billComments)
          .innerJoin(users, eq(billComments.userId, users.id))
          .where(eq(billComments.id, contentId));

        if (!comment) {
          return {
            text: 'Comment not found',
            author: { id: '', name: 'Unknown', email: '' },
            createdAt: new Date()
          };
        }

        return {
          text: comment.text,
          author: {
            id: comment.authorId,
            name: comment.authorName,
            email: comment.authorEmail
          },
          createdAt: comment.createdAt
        };
      }

      return {
        text: 'Content not found',
        author: { id: '', name: 'Unknown', email: '' },
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error fetching content details:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        text: 'Error loading content',
        author: { id: '', name: 'Unknown', email: '' },
        createdAt: new Date()
      };
    }
  }

  /**
   * Calculates severity level based on the type of flag.
   */
  private calculateSeverity(flagType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFlags = ['harassment', 'hate-speech', 'threats', 'doxxing', 'illegal-content'];
    const highFlags = ['spam', 'misinformation', 'impersonation'];
    const mediumFlags = ['inappropriate', 'off-topic', 'low-quality'];
    
    const normalizedType = flagType.toLowerCase();
    
    if (criticalFlags.includes(normalizedType)) {
      return 'critical';
    } else if (highFlags.includes(normalizedType)) {
      return 'high';
    } else if (mediumFlags.includes(normalizedType)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Applies the moderation decision to the actual content.
   * This is where moderator decisions are translated into actual changes 
   * to the content visibility and state.
   */
  private async applyModerationAction(
    contentType: string,
    contentId: number,
    action: string
  ): Promise<void> {
    try {
      if (action === 'delete') {
        if (contentType === 'comment') {
          await db
            .update(billComments)
            .set({ 
              content: '[Content removed by moderator]'
            })
            .where(eq(billComments.id, contentId));
        }
      } else if (action === 'reject') {
        if (contentType === 'comment') {
          await db
            .update(billComments)
            .set({ content: '[Comment hidden by moderator]' })
            .where(eq(billComments.id, contentId));
        }
      }
    } catch (error) {
      logger.error('Error applying moderation action:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Applies a specific resolution type to content and potentially the user who created it.
   * This method extends beyond simple content modification to include user-level actions
   * like warnings and bans.
   */
  private async applyResolution(
    contentType: string,
    contentId: number,
    userId: string,
    resolutionType: string
  ): Promise<void> {
    try {
      switch (resolutionType) {
        case 'approve':
          break;

        case 'reject':
          if (contentType === 'comment') {
            await db
              .update(billComments)
              .set({ content: '[Comment hidden by moderator]' })
              .where(eq(billComments.id, contentId));
          }
          break;

        case 'warn':
          if (contentType === 'comment') {
            const [comment] = await db
              .select()
              .from(billComments)
              .where(eq(billComments.id, contentId));
            
            if (comment) {
              await db
                .update(billComments)
                .set({
                  content: `[Moderator Warning: This comment was flagged for policy violation]\n\n${comment.content}`
                })
                .where(eq(billComments.id, contentId));
            }
          }
          break;

        case 'remove':
          if (contentType === 'comment') {
            await db
              .update(billComments)
              .set({ content: '[Content removed by moderator for policy violation]' })
              .where(eq(billComments.id, contentId));
          }
          break;

        case 'ban-user':
          if (contentType === 'comment') {
            await db
              .update(billComments)
              .set({ content: '[Content removed - user banned for policy violations]' })
              .where(eq(billComments.id, contentId));
          }
          
          logger.info('User ban action required:', {
            component: 'Chanuka',
            userId,
            contentType,
            contentId
          });
          break;

        default:
          logger.warn('Unknown resolution type:', {
            component: 'Chanuka',
            resolutionType
          });
      }
    } catch (error) {
      logger.error('Error applying resolution:', { 
        component: 'Chanuka',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const contentModerationService = ContentModerationService.getInstance();





































