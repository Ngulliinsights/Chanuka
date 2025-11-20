/**
 * Moderation Queue Manager Service
 * 
 * Handles queue management, filtering, pagination, and report creation.
 */

import { database as db } from '@shared/database';
import { bill, 
  comments, 
  users, 
  content_report, 
  sponsor 
 } from '../shared/schema';
import { eq, count, desc, sql, and, gte, SQL } from 'drizzle-orm';
import { logger  } from '@shared/core/src/index.js';
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
          id: content_report.id,
          content_type: content_report.content_type,
          content_id: content_report.content_id,
          reportType: content_report.reportType,
          severity: content_report.severity,
          reason: content_report.reason,
          description: content_report.description,
          reportedBy: content_report.reportedBy,
          autoDetected: content_report.autoDetected,
          status: content_report.status,
          reviewedBy: content_report.reviewedBy,
          reviewedAt: content_report.reviewedAt,
          resolutionNotes: content_report.resolutionNotes,
          created_at: content_report.created_at,
          updated_at: content_report.updated_at
        })
        .from(content_report)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(content_report.severity), desc(content_report.created_at))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: count() })
        .from(content_report)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult[0]?.count ?? 0;

      // Enhance each item with the actual content details
      const enhancedItems = await Promise.all(
        queueItems.map(async (item) => {
          const contentDetails = await this.getContentDetails(
            item.content_type, 
            item.content_id
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
    content_type: 'bill' | 'comment' | 'user_profile' | 'sponsor_transparency',
    content_id: number,
    reportType: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other',
    reason: string,
    reportedBy: string,
    autoDetected = false,
    description?: string
  ): Promise<{ success: boolean; message: string; report_id?: number }> {
    try {
      // Check if there's already a pending report for this content
      const [existingReport] = await db
        .select()
        .from(content_report)
        .where(
          and(
            eq(content_report.content_type, content_type),
            eq(content_report.content_id, content_id),
            eq(content_report.status, 'pending')
          )
        );

      // Calculate severity based on report type
      const severity = contentAnalysisService.calculateSeverity(reportType);

      if (existingReport) {
        // Update existing report instead of creating duplicate
        await db
          .update(content_report)
          .set({
            reason: `${existingReport.reason}; ${reason}`,
            description: description ? 
              `${existingReport.description || ''}; ${description}` : 
              existingReport.description,
            updated_at: new Date()
          })
          .where(eq(content_report.id, existingReport.id));

        return { 
          success: true, 
          message: 'Existing report updated',
          report_id: existingReport.id
        };
      } else {
        // Create new report
        const [newReport] = await db
          .insert(content_report)
          .values({
            content_type,
            content_id,
            reportedBy,
            reportType,
            reason,
            description,
            status: 'pending',
            severity,
            autoDetected
          })
          .returning({ id: content_report.id });

        return { 
          success: true, 
          message: 'Content reported successfully',
          report_id: newReport.id
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
  async getReportById(report_id: number): Promise<ModerationItem | null> {
    try {
      const [report] = await db
        .select()
        .from(content_report)
        .where(eq(content_report.id, report_id));

      if (!report) {
        return null;
      }

      const contentDetails = await this.getContentDetails(
        report.content_type,
        report.content_id
      );

      return {
        ...report,
        content: contentDetails
      } as ModerationItem;
    } catch (error) {
      logger.error('Error fetching report by ID:', {
        component: 'ModerationQueue',
        report_id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // Private helper methods

  private buildFilterConditions(filters?: ContentModerationFilters): SQL[] {
    const conditions: SQL[] = [];

    if (!filters) return conditions;

    if (filters.content_type) {
      conditions.push(eq(content_report.content_type, filters.content_type));
    }

    if (filters.status) {
      conditions.push(eq(content_report.status, filters.status));
    }

    if (filters.severity) {
      conditions.push(eq(content_report.severity, filters.severity));
    }

    if (filters.reportType) {
      conditions.push(eq(content_report.reportType, filters.reportType));
    }

    if (filters.moderator) {
      conditions.push(eq(content_report.reviewedBy, filters.moderator));
    }

    if (filters.autoDetected !== undefined) {
      conditions.push(eq(content_report.autoDetected, filters.autoDetected));
    }

    if (filters.dateRange) {
      conditions.push(gte(content_report.created_at, filters.dateRange.start));
      conditions.push(sql`${content_report.created_at} <= ${filters.dateRange.end}`);
    }

    return conditions;
  }

  /**
   * Fetches the full details of content being moderated
   */
  private async getContentDetails(
    content_type: string, 
    content_id: number
  ): Promise<{
    title?: string;
    text: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    created_at: Date;
  }> {
    try {
      if (content_type === 'bill') {
        const [billData] = await db
          .select({
            title: bills.title,
            text: bills.summary,
            sponsor_id: bills.sponsor_id,
            created_at: bills.created_at
          })
          .from(bill)
          .where(eq(bills.id, content_id));

        if (!billData) {
          return {
            title: 'Bill not found',
            text: '',
            author: { id: '', name: 'Unknown', email: '' },
            created_at: new Date()
          };
        }

        // Get sponsor details if available
        let sponsorData: { id: number; name: string; email: string | null } | null = null;
        if (billData.sponsor_id) {
          const sponsorResult = await db
            .select({ id: sponsors.id, name: sponsors.name, email: sponsors.email })
            .from(sponsor)
            .where(eq(sponsors.id, billData.sponsor_id));
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
                id: billData.sponsor_id?.toString() || '', 
                name: 'Unknown', 
                email: '' 
              },
          created_at: billData.created_at
        };

      } else if (content_type === 'comment') {
        const [commentData] = await db
          .select({
            text: comments.content,
            authorId: comments.user_id,
            created_at: comments.created_at,
            authorName: users.name,
            authorEmail: users.email
          })
          .from(comments)
          .innerJoin(user, eq(comments.user_id, users.id))
          .where(eq(comments.id, content_id));

        if (!commentData) {
          return {
            text: 'Comment not found',
            author: { id: '', name: 'Unknown', email: '' },
            created_at: new Date()
          };
        }

        return {
          text: commentData.text,
          author: {
            id: commentData.authorId,
            name: commentData.authorName,
            email: commentData.authorEmail
          },
          created_at: commentData.created_at
        };
      }

      // For other content types (user_profile, sponsor_transparency)
      return {
        text: 'Content details not available for this type',
        author: { id: '', name: 'System', email: '' },
        created_at: new Date()
      };

    } catch (error) {
      logger.error('Error fetching content details:', {
        component: 'ModerationQueue',
        content_type,
        content_id,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        text: 'Error loading content',
        author: { id: '', name: 'Unknown', email: '' },
        created_at: new Date()
      };
    }
  }
}

export const moderationQueueService = ModerationQueueService.getInstance();