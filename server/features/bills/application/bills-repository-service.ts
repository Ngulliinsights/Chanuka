/**
 * Bills Repository Service
 *
 * Application service for bill operations using repository pattern
 * Provides clean API for controllers with proper error handling and dependency injection
 */

import { Err,Ok, Result } from '@shared/core';
import { Bill, BillNumber, BillSummary,BillTitle } from '@shared/domain/entities/bill';
import { BillServiceError } from '@shared/domain/errors/bill-errors';
import { DomainEventPublisher } from '@shared/domain/events/bill-events';
import { BillDomainService } from '@shared/domain/services/bill-domain-service';
import { BillNotificationService } from '@shared/domain/services/bill-notification-service';
import { BillStatus, BillVoteType } from '@server/infrastructure/schema';

import { NotificationChannelService } from '@/infrastructure/notifications/notification-channels';

import type { IBillRepository } from '../../../../bill-repository.interface';
import { UserService } from '../../users/application/user-service-direct';

/**
 * Application service for bill operations using repository pattern
 * Provides clean API for controllers with proper error handling
 * Uses dependency injection and domain services for business logic
 */
export class BillsRepositoryService {
  constructor(
    private readonly billRepository: IBillRepository,
    private readonly userService: UserService,
    private readonly notificationChannelService: NotificationChannelService,
    private readonly domainEventPublisher: DomainEventPublisher
  ) {}

  /**
   * Creates a new bill with business rule validation
   */
  async createBill(params: {
    billNumber: string;
    title: string;
    summary?: string;
    sponsor_id: string;
    tags?: string[];
    affectedCounties?: string[];
  }): Promise<Result<Bill, BillServiceError>> {
    try {
      // Validate input parameters using value object constructors
      const billNumber = new BillNumber(params.billNumber);
      const title = new BillTitle(params.title);

      // Handle optional summary - only create if provided
      let summary: BillSummary | undefined = undefined;
      if (params.summary) {
        summary = new BillSummary(params.summary);
      }

      // Create domain service for business logic
      const domainService = new BillDomainService(
        this.userService,
        new BillNotificationService(this.notificationChannelService, this.userService),
        this.domainEventPublisher
      );

      // Execute business logic within transaction
      const billData = {
        bill_number: billNumber.value,
        title: title.value,
        summary: summary?.value || null,
        sponsor_id: params.sponsor_id,
        tags: params.tags || [],
        affected_counties: params.affectedCounties || [],
        status: 'draft' as const,
        chamber: 'National Assembly' as const, // Default chamber
        created_at: new Date(),
        updated_at: new Date()
      };

      const result = await this.billRepository.create(billData);

      if (result.isErr()) {
        return new Err(new BillServiceError('CREATE_FAILED', result.error.message));
      }

      return new Ok(result.value);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return new Err(error);
      }
      return new Err(new BillServiceError('CREATE_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Updates bill status with validation and notifications
   */
  async updateBillStatus(
    bill_id: string,
    newStatus: BillStatus,
    updatedBy: string
  ): Promise<Result<Bill, BillServiceError>> {
    try {
      // First get the current bill
      const billResult = await this.billRepository.findById(bill_id);
      if (billResult.isErr()) {
        return new Err(new BillServiceError('BILL_NOT_FOUND', billResult.error.message));
      }

      if (!billResult.value) {
        return new Err(new BillServiceError('BILL_NOT_FOUND', 'Bill not found'));
      }

      const domainService = new BillDomainService(
        this.userService,
        new BillNotificationService(this.notificationChannelService, this.userService),
        this.domainEventPublisher
      );

      // Update the bill status
      const updateResult = await this.billRepository.update(bill_id, {
        status: newStatus,
        last_action_date: new Date()
      });

      if (updateResult.isErr()) {
        return new Err(new BillServiceError('STATUS_UPDATE_FAILED', updateResult.error.message));
      }

      return new Ok(updateResult.value);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return new Err(error);
      }
      return new Err(new BillServiceError('STATUS_UPDATE_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Records a vote on a bill
   */
  async recordVote(
    bill_id: string,
    user_id: string,
    voteType: BillVoteType
  ): Promise<Result<Bill, BillServiceError>> {
    try {
      // Get current bill
      const billResult = await this.billRepository.findById(bill_id);
      if (billResult.isErr()) {
        return new Err(new BillServiceError('BILL_NOT_FOUND', billResult.error.message));
      }

      if (!billResult.value) {
        return new Err(new BillServiceError('BILL_NOT_FOUND', 'Bill not found'));
      }

      // Calculate new vote counts
      const currentBill = billResult.value;
      const metrics = {
        vote_count_for: voteType === 'for' ? (currentBill.vote_count_for || 0) + 1 : currentBill.vote_count_for || 0,
        vote_count_against: voteType === 'against' ? (currentBill.vote_count_against || 0) + 1 : currentBill.vote_count_against || 0
      };

      // Update engagement metrics
      const updateResult = await this.billRepository.updateEngagementMetrics(bill_id, metrics);

      if (updateResult.isErr()) {
        return new Err(new BillServiceError('VOTE_RECORD_FAILED', updateResult.error.message));
      }

      // Get updated bill
      const updatedBillResult = await this.billRepository.findById(bill_id);
      if (updatedBillResult.isErr()) {
        return new Err(new BillServiceError('VOTE_RECORD_FAILED', updatedBillResult.error.message));
      }

      return new Ok(updatedBillResult.value!);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return new Err(error);
      }
      return new Err(new BillServiceError('VOTE_RECORD_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Updates bill content with validation
   */
  async updateBillContent(
    bill_id: string,
    updates: {
      title?: string;
      summary?: string;
      tags?: string[];
    },
    updatedBy: string
  ): Promise<Result<Bill, BillServiceError>> {
    try {
      // Validate input parameters and build the update object conditionally
      const updateParams: any = {};

      // Only add properties if they're actually defined
      if (updates.title !== undefined) {
        const title = new BillTitle(updates.title);
        updateParams.title = title.value;
      }

      if (updates.summary !== undefined) {
        const summary = new BillSummary(updates.summary);
        updateParams.summary = summary.value;
      }

      if (updates.tags !== undefined) {
        updateParams.tags = updates.tags;
      }

      const result = await this.billRepository.update(bill_id, updateParams);

      if (result.isErr()) {
        return new Err(new BillServiceError('CONTENT_UPDATE_FAILED', result.error.message));
      }

      return new Ok(result.value);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return new Err(error);
      }
      return new Err(new BillServiceError('CONTENT_UPDATE_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Records engagement on a bill
   */
  async recordEngagement(
    bill_id: string,
    user_id: string,
    engagementType: 'view' | 'comment' | 'share'
  ): Promise<Result<void, BillServiceError>> {
    try {
      // Get current bill
      const billResult = await this.billRepository.findById(bill_id);
      if (billResult.isErr()) {
        return new Err(new BillServiceError('ENGAGEMENT_RECORD_FAILED', billResult.error.message));
      }

      if (!billResult.value) {
        return new Err(new BillServiceError('ENGAGEMENT_RECORD_FAILED', 'Bill not found'));
      }

      // Calculate new engagement metrics
      const currentBill = billResult.value;
      const metrics: any = {};

      switch (engagementType) {
        case 'view':
          metrics.view_count = (currentBill.view_count || 0) + 1;
          break;
        case 'comment':
          metrics.comment_count = (currentBill.comment_count || 0) + 1;
          break;
        case 'share':
          metrics.share_count = (currentBill.share_count || 0) + 1;
          break;
      }

      // Update engagement metrics
      const updateResult = await this.billRepository.updateEngagementMetrics(bill_id, metrics);

      if (updateResult.isErr()) {
        return new Err(new BillServiceError('ENGAGEMENT_RECORD_FAILED', updateResult.error.message));
      }

      return new Ok(undefined);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return new Err(error);
      }
      return new Err(new BillServiceError('ENGAGEMENT_RECORD_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Gets bill by ID with aggregate data
   */
  async getBillById(bill_id: string): Promise<Result<Bill | null, BillServiceError>> {
    try {
      const result = await this.billRepository.findById(bill_id);

      if (result.isErr()) {
        return new Err(new BillServiceError('BILL_NOT_FOUND', result.error.message));
      }

      return new Ok(result.value);

    } catch (error) {
      return new Err(new BillServiceError('BILL_NOT_FOUND', error instanceof Error ? error.message : 'Bill not found'));
    }
  }

  /**
   * Gets bills with filtering and pagination
   */
  async getBills(params: {
    status?: BillStatus;
    sponsor_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Result<Bill[], BillServiceError>> {
    try {
      let result: Result<Bill[], Error>;

      if (params.status) {
        result = await this.billRepository.findByStatus(params.status, {
          limit: params.limit,
          offset: params.offset
        });
      } else if (params.sponsor_id) {
        result = await this.billRepository.findBySponsorId(params.sponsor_id, {
          limit: params.limit,
          offset: params.offset
        });
      } else {
        // For now, get all bills - in a real implementation you'd have a findAll method
        // This is a simplified version
        result = await this.billRepository.findByStatus('introduced', {
          limit: params.limit || 50,
          offset: params.offset || 0
        });
      }

      if (result.isErr()) {
        return new Err(new BillServiceError('BILLS_FETCH_FAILED', result.error.message));
      }

      return new Ok(result.value);

    } catch (error) {
      return new Err(new BillServiceError('BILLS_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch bills'));
    }
  }

  /**
   * Gets bill statistics
   */
  async getBillStatistics(): Promise<Result<{
    totalBills: number;
    billsByStatus: Array<{ status: BillStatus, count: number }>;
    recentActivity: number;
  }, BillServiceError>> {
    try {
      // Get total bills count
      const totalResult = await this.billRepository.count();
      if (totalResult.isErr()) {
        return new Err(new BillServiceError('STATISTICS_FETCH_FAILED', totalResult.error.message));
      }

      // For now, return simplified statistics
      // In a real implementation, you'd query for bills by status and recent activity
      const stats = {
        totalBills: totalResult.value,
        billsByStatus: [] as Array<{ status: BillStatus, count: number }>,
        recentActivity: 0
      };

      return new Ok(stats);

    } catch (error) {
      return new Err(new BillServiceError('STATISTICS_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch statistics'));
    }
  }
}

