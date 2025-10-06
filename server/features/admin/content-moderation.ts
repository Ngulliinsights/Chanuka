import { database as db } from '../../../shared/database/connection.js';
import { bills, billComments, users, moderationFlags, moderationActions } from '../../../shared/schema.js';
import { eq, count, desc, sql, and, gte, like, or, inArray, isNull } from 'drizzle-orm';

export interface ContentModerationFilters {
  contentType?: 'bill' | 'comment';
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
  priority?: 'low' | 'medium' | 'high' | 'critical';
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
  flags: {
    type: string;
    reason: string;
    reportedBy: string;
    reportedAt: Date;
  }[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  metadata?: any;
}

export interface ModerationAction {
  id: number;
  moderationItemId: number;
  action: 'approve' | 'reject' | 'flag' | 'edit' | 'delete';
  reason: string;
  moderatorId: string;
  moderatorName: string;
  timestamp: Date;
  metadata?: any;
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
      const conditions = [];

      // Apply filters
      if (filters?.contentType) {
        conditions.push(eq(moderationFlags.contentType, filters.contentType));
      }

      if (filters?.status) {
        conditions.push(eq(moderationFlags.status, filters.status));
      }

      if (filters?.priority) {
        conditions.push(eq(moderationFlags.priority, filters.priority));
      }

      if (filters?.moderator) {
        conditions.push(eq(moderationFlags.reviewedBy, filters.moderator));
      }

      if (filters?.dateRange) {
        conditions.push(
          and(
            gte(moderationFlags.createdAt, filters.dateRange.start),
            sql`${moderationFlags.createdAt} <= ${filters.dateRange.end}`
          )
        );
      }

      // Build query
      let query = db
        .select({
          id: moderationFlags.id,
          contentType: moderationFlags.contentType,
          contentId: moderationFlags.contentId,
          flags: moderationFlags.reason,
          priority: moderationFlags.priority,
          status: moderationFlags.status,
          assignedTo: moderationFlags.assignedTo,
          reviewedBy: moderationFlags.reviewedBy,
          reviewedAt: moderationFlags.reviewedAt,
          createdAt: moderationFlags.createdAt,
          metadata: moderationFlags.metadata
        })
        .from(moderationFlags);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const queueItems = await query
        .orderBy(desc(moderationFlags.priority), desc(moderationFlags.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db.select({ count: count() }).from(moderationFlags);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [{ count: total }] = await countQuery;

      // Enhance items with content details
      const enhancedItems = await Promise.all(
        queueItems.map(async (item) => {
          const contentDetails = await this.getContentDetails(item.contentType, item.contentId);
          return {
            ...item,
            content: contentDetails,
            flags: Array.isArray(item.flags) ? item.flags : []
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
      console.error('Error fetching moderation queue:', error);
      throw error;
    }
  }

  async moderateContent(
    itemId: number,
    action: 'approve' | 'reject' | 'flag' | 'edit' | 'delete',
    reason: string,
    moderatorId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get the moderation item
      const [item] = await db
        .select()
        .from(moderationFlags)
        .where(eq(moderationFlags.id, itemId));

      if (!item) {
        return { success: false, message: 'Moderation item not found' };
      }

      // Update the moderation flags item
      await db
        .update(moderationFlags)
        .set({
          status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
          reviewedBy: moderatorId,
          reviewedAt: new Date()
        })
        .where(eq(moderationFlags.id, itemId));

      // Record the moderation action
      await db.insert(moderationActions).values({
        moderationItemId: itemId,
        action,
        reason,
        moderatorId,
        timestamp: new Date(),
        metadata: { originalStatus: item.status }
      });

      // Apply the action to the actual content
      await this.applyModerationAction(item.contentType, item.contentId, action);

      return { success: true, message: `Content ${action}ed successfully` };
    } catch (error) {
      console.error('Error moderating content:', error);
      return { success: false, message: 'Failed to moderate content' };
    }
  }

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
      console.error('Error performing bulk moderation:', error);
      return {
        success: false,
        message: 'Failed to perform bulk moderation',
        processedCount: 0
      };
    }
  }

  async flagContent(
    contentType: 'bill' | 'comment',
    contentId: number,
    flagType: string,
    reason: string,
    reportedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if item already exists in moderation flags
      const [existingItem] = await db
        .select()
        .from(moderationFlags)
        .where(
          and(
            eq(moderationFlags.contentType, contentType),
            eq(moderationFlags.contentId, contentId)
          )
        );

      const flagData = {
        type: flagType,
        reason,
        reportedBy,
        reportedAt: new Date()
      };

      if (existingItem) {
        // Add flag to existing item
        const existingFlags = Array.isArray(existingItem.flags) ? existingItem.flags : [];
        const updatedFlags = [...existingFlags, flagData];

        await db
          .update(moderationFlags)
          .set({
            reason: updatedFlags.map(f => f.reason).join(', '),
            priority: this.calculatePriority(updatedFlags.length, flagType)
          })
          .where(eq(moderationFlags.id, existingItem.id));
      } else {
        // Create new moderation flags item
        await db.insert(moderationFlags).values({
          contentType,
          contentId,
          reason: flagData.reason,
          priority: this.calculatePriority(1, flagType),
          status: 'pending',
          reportedBy: reportedBy,
          reportedAt: new Date()
        });
      }

      return { success: true, message: 'Content flagged successfully' };
    } catch (error) {
      console.error('Error flagging content:', error);
      return { success: false, message: 'Failed to flag content' };
    }
  }

  async getContentAnalytics(): Promise<ContentAnalytics> {
    try {
      // Get total content counts
      const [totalBills] = await db.select({ count: count() }).from(bills);
      const [totalComments] = await db.select({ count: count() }).from(billComments);
      const totalContent = Number(totalBills.count) + Number(totalComments.count);

      // Get moderation queue statistics
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

      // Calculate average review time
      const reviewedItems = await db
        .select({
          createdAt: moderationFlags.reportedAt,
          reviewedAt: moderationFlags.reviewedAt
        })
        .from(moderationFlags)
        .where(sql`${moderationFlags.reviewedAt} IS NOT NULL`);

      const averageReviewTime = reviewedItems.length > 0
        ? reviewedItems.reduce((sum, item) => {
            const reviewTime = item.reviewedAt!.getTime() - item.createdAt.getTime();
            return sum + reviewTime;
          }, 0) / reviewedItems.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // Get top moderators
      const topModerators = await db
        .select({
          moderatorId: moderationActions.moderatorId,
          count: count()
        })
        .from(moderationActions)
        .groupBy(moderationActions.moderatorId)
        .orderBy(desc(count()))
        .limit(5);

      // Get moderator names
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
          actionsCount: Number(mod.count)
        };
      });

      // Calculate content quality score (simplified)
      const qualityScore = totalContent > 0
        ? ((Number(approvedItems.count) / totalContent) * 100)
        : 100;

      // Get flag reasons (mock data - would be extracted from actual flags)
      const flagReasons = [
        { reason: 'Inappropriate Content', count: 15 },
        { reason: 'Spam', count: 8 },
        { reason: 'Misinformation', count: 12 },
        { reason: 'Harassment', count: 5 },
        { reason: 'Off-topic', count: 10 }
      ];

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
      console.error('Error fetching content analytics:', error);
      throw error;
    }
  }

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
      const conditions = [];

      if (contentType && contentId) {
        // Get moderation queue item first
        const [queueItem] = await db
          .select({ id: moderationQueue.id })
          .from(moderationQueue)
          .where(
            and(
              eq(moderationQueue.contentType, contentType),
              eq(moderationQueue.contentId, contentId)
            )
          );

        if (queueItem) {
          conditions.push(eq(moderationActions.moderationItemId, queueItem.id));
        }
      }

      let query = db
        .select({
          id: moderationActions.id,
          moderationItemId: moderationActions.moderationItemId,
          action: moderationActions.action,
          reason: moderationActions.reason,
          moderatorId: moderationActions.moderatorId,
          timestamp: moderationActions.timestamp,
          metadata: moderationActions.metadata,
          moderatorName: users.name
        })
        .from(moderationActions)
        .innerJoin(users, eq(moderationActions.moderatorId, users.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const actions = await query
        .orderBy(desc(moderationActions.timestamp))
        .limit(limit)
        .offset(offset);

      // Get total count
      let countQuery = db.select({ count: count() }).from(moderationActions);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [{ count: total }] = await countQuery;

      return {
        actions: actions.map(action => ({
          id: action.id,
          moderationItemId: action.moderationItemId,
          action: action.action as any,
          reason: action.reason,
          moderatorId: action.moderatorId,
          moderatorName: action.moderatorName,
          timestamp: action.timestamp,
          metadata: action.metadata
        })),
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching moderation history:', error);
      throw error;
    }
  }

  private async getContentDetails(contentType: string, contentId: number) {
    try {
      if (contentType === 'bill') {
        const [bill] = await db
          .select({
            title: bills.title,
            text: bills.summary,
            authorId: bills.sponsorId,
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

        // Get sponsor details (simplified - assuming sponsorId is a user ID)
        const [sponsor] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, bill.authorId));

        return {
          title: bill.title,
          text: bill.text || '',
          author: sponsor || { id: bill.authorId, name: 'Unknown', email: '' },
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
      console.error('Error fetching content details:', error);
      return {
        text: 'Error loading content',
        author: { id: '', name: 'Unknown', email: '' },
        createdAt: new Date()
      };
    }
  }

  private calculatePriority(flagCount: number, flagType: string): 'low' | 'medium' | 'high' | 'critical' {
    // High priority flag types
    const highPriorityFlags = ['harassment', 'hate-speech', 'threats', 'doxxing'];
    
    if (highPriorityFlags.includes(flagType.toLowerCase())) {
      return 'critical';
    }

    if (flagCount >= 5) {
      return 'critical';
    } else if (flagCount >= 3) {
      return 'high';
    } else if (flagCount >= 2) {
      return 'medium';
    }

    return 'low';
  }

  private async applyModerationAction(
    contentType: string,
    contentId: number,
    action: string
  ): Promise<void> {
    try {
      if (action === 'delete') {
        if (contentType === 'comment') {
          // Soft delete comment
          await db
            .update(billComments)
            .set({ 
              content: '[Content removed by moderator]',
              isDeleted: true 
            })
            .where(eq(billComments.id, contentId));
        }
        // Bills typically wouldn't be deleted, just flagged
      } else if (action === 'reject') {
        if (contentType === 'comment') {
          // Hide rejected comment
          await db
            .update(billComments)
            .set({ isHidden: true })
            .where(eq(billComments.id, contentId));
        }
      }
      // For 'approve' and 'flag', no direct action needed on content
    } catch (error) {
      console.error('Error applying moderation action:', error);
    }
  }
}

export const contentModerationService = ContentModerationService.getInstance();