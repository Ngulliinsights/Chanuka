/**
 * Moderation Queue Manager Service
 * 
 * Handles queue management, filtering, pagination, and report creation.
 */

import { database as db } from '../../../../shared/database/connection';
import { 
  bill, 
  billComment, 
  user, 
  contentReport, 
  sponsor 
} from '../../../../shared/schema';
import { eq, count, desc, sql, and, gte, SQL } from 'drizzle-orm';
import { logger } from '../../../../shared/core/index.js';
import { ContentModerationFilters, ModerationItem, PaginationInfo } from './types.js';
import { contentAnalysisService } from './content-analysis.service.js';

export class ModerationQueueService {
  private static instance: ModerationQueueService;

  public static getInstance(): ModerationQueueService {
    if (!ModerationQueueService.instance) {
      ModerationQueueService.instance = new ModerationQueueService();
    }
    return ModerationQueueService.instance;
  }

  /**
   * Retrieves the moderation queue with filtering and pagination
   */
  async getModerationQueue(
    page = 1,
    limit = 20,
    filters?: ContentModerationFilters
  ): Promise<{
    items: ModerationItem[];
    pagination: PaginationInfo;
  }> {
    try {
      const offset = (page - 1) * limit;

      // Build dynamic WHERE conditions based on filters
      const conditions = this.buildFilterConditions(filters);

      // Fetch reports with all their details
      const queueItems = await db
        .select({
          id: contentReport.id,
          contentType: contentReport.contentType,
          contentId: contentReport.contentId,
          reportType: contentReport.reportType,
          severity: contentReport.severity,
          reason: contentReport.reason,
          description: contentReport.description,
          reportedBy: contentReport.reportedBy,
          autoDetected: contentReport.autoDetected,
          status: contentReport.status,
          reviewedBy: contentReport.reviewedBy,
          reviewedAt: contentReport.reviewedAt,
          resolutionNotes: contentReport.resolutionNotes,
          createdAt: contentReport.createdAt,
          updatedAt: contentReport.updatedAt
        })
        .from(contentReport)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contentReport.severity), desc(contentReport.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: count() })
        .from(contentReport)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count ?? 0;

      // Enhance each item with the actual content details
      const enhancedItems = await Promise.all(
        queueItems.map(async (item) => {
          const contentDetails = await this.getContentDetails(
            item.contentType, 
            item.contentId
          );
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
        component: 'ModerationQueue',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Creates a new content report (flag)
   */
  async createReport(
    contentType: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    contentId: number,
    reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other',
    reason: string,
    reportedBy: string,
    autoDetected = false,
    description?: string
  ): Promise<{ success: boolean; message: string; reportId?: number }> {
    try {
      // Check if there's already a pending report for this content
      const [existingReport] = await db
        .select()
        .from(contentReport)
        .where(
          and(
            eq(contentReport.contentType, contentType),
            eq(contentReport.contentId, contentId),
            eq(contentReport.status, 'pending')
          )
        );

      // Calculate severity based on report type
      const severity = contentAnalysisService.calculateSeverity(reportType);

      if (existingReport) {
        // Update existing report instead of creating duplicate
        await db
          .update(contentReport)
          .set({
            reason: `${existingReport.reason}; ${reason}`,
            description: description ? 
              `${existingReport.description || ''}; ${description}` : 
              existingReport.description,
            updatedAt: new Date()
          })
          .where(eq(contentReport.id, existingReport.id));

        return { 
          success: true, 
          message: 'Existing report updated',
          reportId: existingReport.id
        };
      } else {
        // Create new report
        const [newReport] = await db
          .insert(contentReport)
          .values({
            contentType,
            contentId,
            reportedBy,
            reportType,
            reason,
            description,
            status: 'pending',
            severity,
            autoDetected
          })
          .returning({ id: contentReport.id });

        return { 
          success: true, 
          message: 'Content reported successfully',
          reportId: newReport.id
        };
      }
    } catch (error) {
      logger.error('Error creating report:', {
        component: 'ModerationQueue',
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, message: 'Failed to report content' };
    }
  }

  /**
   * Gets a specific report by ID
   */
  async getReportById(reportId: number): Promise<ModerationItem | null> {
    try {
      const [report] = await db
        .select()
        .from(contentReport)
        .where(eq(contentReport.id, reportId));

      if (!report) {
        return null;
      }

      const contentDetails = await this.getContentDetails(
        report.contentType,
        report.contentId
      );

      return {
        ...report,
        content: contentDetails
      } as ModerationItem;
    } catch (error) {
      logger.error('Error fetching report by ID:', {
        component: 'ModerationQueue',
        reportId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // Private helper methods

  private buildFilterConditions(filters?: ContentModerationFilters): SQL[] {
    const conditions: SQL[] = [];

    if (!filters) return conditions;

    if (filters.contentType) {
      conditions.push(eq(contentReport.contentType, filters.contentType));
    }

    if (filters.status) {
      conditions.push(eq(contentReport.status, filters.status));
    }

    if (filters.severity) {
      conditions.push(eq(contentReport.severity, filters.severity));
    }

    if (filters.reportType) {
      conditions.push(eq(contentReport.reportType, filters.reportType));
    }

    if (filters.moderator) {
      conditions.push(eq(contentReport.reviewedBy, filters.moderator));
    }

    if (filters.autoDetected !== undefined) {
      conditions.push(eq(contentReport.autoDetected, filters.autoDetected));
    }

    if (filters.dateRange) {
      conditions.push(gte(contentReport.createdAt, filters.dateRange.start));
      conditions.push(sql`${contentReport.createdAt} <= ${filters.dateRange.end}`);
    }

    return conditions;
  }

  /**
   * Fetches the full details of content being moderated
   */
  private async getContentDetails(
    contentType: string, 
    contentId: number
  ): Promise<{
    title?: string;
    text: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: Date;
  }> {
    try {
      if (contentType === 'bill') {
        const [billData] = await db
          .select({
            title: bill.title,
            text: bill.summary,
            sponsorId: bill.sponsorId,
            createdAt: bill.createdAt
          })
          .from(bill)
          .where(eq(bill.id, contentId));

        if (!billData) {
          return {
            title: 'Bill not found',
            text: '',
            author: { id: '', name: 'Unknown', email: '' },
            createdAt: new Date()
          };
        }

        // Get sponsor details if available
        let sponsorData: { id: number; name: string; email: string | null } | null = null;
        if (billData.sponsorId) {
          const sponsorResult = await db
            .select({ id: sponsor.id, name: sponsor.name, email: sponsor.email })
            .from(sponsor)
            .where(eq(sponsor.id, billData.sponsorId));
          sponsorData = sponsorResult[0] || null;
        }

        return {
          title: billData.title,
          text: billData.text || '',
          author: sponsorData 
            ? { 
                id: sponsorData.id.toString(), 
                name: sponsorData.name, 
                email: sponsorData.email || '' 
              }
            : { 
                id: billData.sponsorId?.toString() || '', 
                name: 'Unknown', 
                email: '' 
              },
          createdAt: billData.createdAt
        };

      } else if (contentType === 'comment') {
        const [commentData] = await db
          .select({
            text: billComment.content,
            authorId: billComment.userId,
            createdAt: billComment.createdAt,
            authorName: user.name,
            authorEmail: user.email
          })
          .from(billComment)
          .innerJoin(user, eq(billComment.userId, user.id))
          .where(eq(billComment.id, contentId));

        if (!commentData) {
          return {
            text: 'Comment not found',
            author: { id: '', name: 'Unknown', email: '' },
            createdAt: new Date()
          };
        }

        return {
          text: commentData.text,
          author: {
            id: commentData.authorId,
            name: commentData.authorName,
            email: commentData.authorEmail
          },
          createdAt: commentData.createdAt
        };
      }

      // For other content types (user_profile, sponsor_transparency)
      return {
        text: 'Content details not available for this type',
        author: { id: '', name: 'System', email: '' },
        createdAt: new Date()
      };

    } catch (error) {
      logger.error('Error fetching content details:', {
        component: 'ModerationQueue',
        contentType,
        contentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        text: 'Error loading content',
        author: { id: '', name: 'Unknown', email: '' },
        createdAt: new Date()
      };
    }
  }
}

export const moderationQueueService = ModerationQueueService.getInstance();