import { Err,Ok, Result } from '@shared/core';
import { Bill, BillNumber, BillSummary,BillTitle } from '@shared/domain/entities/bill';
import { BillServiceError } from '@shared/domain/errors/bill-errors';
import { DomainEventPublisher } from '@shared/domain/events/bill-events';
import { BillDomainService } from '@shared/domain/services/bill-domain-service';
import { BillNotificationService } from '@shared/domain/services/bill-notification-service';
import { BillStatus, BillVoteType } from '@server/infrastructure/schema';
import { bills } from '@server/infrastructure/schema';
import { and, eq, sql } from 'drizzle-orm';

import { withTransaction } from '@server/infrastructure/database';
import { NotificationChannelService } from '@/infrastructure/notifications/notification-channels';

import type { IBillRepository } from '@server/domain/interfaces/bill-repository.interface';
import { UserService } from '../../users/application/user-service-direct';

/**
 * Application service for bill operations
 * Provides clean API for controllers with proper error handling
 * Uses dependency injection and domain services for business logic
 */
export class BillsApplicationService {
  constructor(
    private readonly userService: UserService,
    private readonly notificationChannelService: NotificationChannelService,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly databaseService: DatabaseService,
    private readonly billRepository?: IBillRepository
  ) { }

  private get db() {
    return databaseService.getDatabase();
  }

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
      // If BillNumber doesn't have a create method, instantiate directly
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
      // The transaction returns a DatabaseResult, so we need to await it and extract the value
      const databaseResult = await this.withTransaction(async () => {
        // Build the params object conditionally to satisfy exactOptionalPropertyTypes
        const createParams: {
          billNumber: BillNumber;
          title: BillTitle;
          summary?: BillSummary;
          sponsor_id: string;
          tags?: string[];
          affectedCounties?: string[];
        } = {
          billNumber,
          title,
          sponsor_id: params.sponsor_id
        };

        // Only add optional properties if they're actually defined
        if (summary !== undefined) {
          createParams.summary = summary;
        }
        if (params.tags !== undefined) {
          createParams.tags = params.tags;
        }
        if (params.affectedCounties !== undefined) {
          createParams.affectedCounties = params.affectedCounties;
        }

        return await domainService.createBill(createParams);
      });

      // Extract the Bill entity from the database result
      // The withTransaction returns a DatabaseResult, we need to unwrap it
      return new Ok(databaseResult.data);

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
      const domainService = new BillDomainService(
        this.userService,
        new BillNotificationService(this.notificationChannelService, this.userService),
        this.domainEventPublisher
      );

      // Execute the domain operation within a transaction
      // The result needs to be unwrapped from DatabaseResult to Bill
      const databaseResult = await this.withTransaction(async () => {
        return await domainService.updateBillStatus(bill_id, newStatus, updatedBy);
      });

      // Return the unwrapped Bill entity
      return new Ok(databaseResult.data);

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
      const domainService = new BillDomainService(
        this.userService,
        new BillNotificationService(this.notificationChannelService, this.userService),
        this.domainEventPublisher
      );

      // Execute the vote recording within a transaction
      const databaseResult = await this.withTransaction(async () => {
        return await domainService.recordVote(bill_id, user_id, voteType);
      });

      // Unwrap and return the Bill entity
      return new Ok(databaseResult.data);

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
      const updateParams: {
        title?: BillTitle;
        summary?: BillSummary;
        tags?: string[];
      } = {};

      // Only add properties if they're actually defined
      if (updates.title !== undefined) {
        updateParams.title = new BillTitle(updates.title);
      }

      if (updates.summary !== undefined) {
        updateParams.summary = new BillSummary(updates.summary);
      }

      if (updates.tags !== undefined) {
        updateParams.tags = updates.tags;
      }

      const domainService = new BillDomainService(
        this.userService,
        new BillNotificationService(this.notificationChannelService, this.userService),
        this.domainEventPublisher
      );

      // Execute content update within transaction
      const databaseResult = await this.withTransaction(async () => {
        return await domainService.updateBillContent(bill_id, updateParams, updatedBy);
      });

      // Unwrap the database result to get the Bill entity
      return new Ok(databaseResult.data);

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
      const domainService = new BillDomainService(
        this.userService,
        new BillNotificationService(this.notificationChannelService, this.userService),
        this.domainEventPublisher
      );

      await domainService.recordEngagement(bill_id, user_id, engagementType);
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
  async getBillById(bill_id: string): Promise<Result<any | null, BillServiceError>> {
    try {
      if (this.billRepository) {
        // Use repository pattern
        const result = await this.billRepository.findById(bill_id);
        if (result.isErr()) {
          return new Err(new BillServiceError('BILL_NOT_FOUND', result.error.message));
        }
        return new Ok(result.value);
      } else {
        // Fallback to direct database access
        const [bill] = await this.db
          .select()
          .from(bills)
          .where(eq(bills.id, bill_id))
          .limit(1);

        return new Ok(bill || null);
      }

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
  }): Promise<Result<unknown[], BillServiceError>> {
    try {
      if (this.billRepository) {
        // Use repository pattern
        let result: Result<unknown[], Error>;

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
          result = await this.billRepository.findByStatus('introduced', {
            limit: params.limit || 50,
            offset: params.offset || 0
          });
        }

        if (result.isErr()) {
          return new Err(new BillServiceError('BILLS_FETCH_FAILED', result.error.message));
        }

        return new Ok(result.value);
      } else {
        // Fallback to direct database access
        const conditions: unknown[] = [];

        if (params.status) {
          conditions.push(eq(bills.status, params.status));
        }

        if (params.sponsor_id) {
          conditions.push(eq(bills.sponsor_id, params.sponsor_id));
        }

        let query = this.db.select().from(bills);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as unknown;
        }

        const result = await query
          .limit(params.limit || 20)
          .offset(params.offset || 0)
          .orderBy(sql`${bills.updated_at} DESC`);

        return new Ok(result);
      }

    } catch (error) {
      return new Err(new BillServiceError('BILLS_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch bills'));
    }
  }

  /**
   * Gets bill with stakeholders and comments (aggregate operation)
   * Note: This version works without bill_engagement, bill_votes, and bill_trackers tables
   */
  async getBillAggregate(bill_id: string): Promise<Result<{
    bill: any;
    stakeholders: Array<{ id: string, role: string }>;
    comments: Array<{ id: string, content: string, user_id: string, created_at: Date }>;
    votes: Array<{ user_id: string, voteType: BillVoteType, created_at: Date }>;
  }, BillServiceError>> {
    try {
      const [bill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id))
        .limit(1);

      if (!bill) {
        return new Err(new BillServiceError('BILL_NOT_FOUND', 'Bill not found'));
      }

      // Build stakeholders list from available data
      const stakeholders: Array<{ id: string, role: string }> = [];

      if (bill.sponsor_id) {
        stakeholders.push({ id: bill.sponsor_id, role: 'sponsor' });
      }

      // Return the aggregate with empty arrays for features not yet implemented
      return new Ok({
        bill,
        stakeholders,
        comments: [], // Will be populated when comments table is available
        votes: [] // Will be populated when bill_votes table is available
      });

    } catch (error) {
      return new Err(new BillServiceError('AGGREGATE_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch bill aggregate'));
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
      const [totalResult] = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills);

      // Get bills by status
      const statusResults = await this.db
        .select({
          status: bills.status,
          count: sql<number>`COUNT(*)`
        })
        .from(bills)
        .groupBy(bills.status);

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentActivityResult] = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills)
        .where(sql`${bills.updated_at} >= ${sevenDaysAgo}`);

      const stats = {
        totalBills: Number(totalResult.count),
        billsByStatus: statusResults.map((r: { status: BillStatus; count: number }) => ({
          status: r.status,
          count: Number(r.count)
        })),
        recentActivity: Number(recentActivityResult.count)
      };

      return new Ok(stats);

    } catch (error) {
      return new Err(new BillServiceError('STATISTICS_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch statistics'));
    }
  }
}

// Export singleton instance with dependencies
import { InMemoryDomainEventPublisher } from '@shared/domain/events/bill-events';

import { notificationChannelService } from '@/infrastructure/notifications/notification-channels';

import { UserService as UserServiceClass } from '../../users/application/user-service-direct';

// Create the user service instance
const userServiceInstance = new UserServiceClass();

// Create the domain event publisher
const domainEventPublisher = new InMemoryDomainEventPublisher();

// Create and export the singleton instance
export const billsApplicationService = new BillsApplicationService(
  userServiceInstance,
  notificationChannelService,
  domainEventPublisher,
  databaseService
);

// Legacy compatibility - export the new service as the default export
export default billsApplicationService;


