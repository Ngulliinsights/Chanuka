import { Bill, BillNumber, BillTitle, BillSummary } from '../domain/entities/bill';
import { BillRepository } from '../domain/repositories/bill-repository';
import { BillDomainService } from '../domain/services/bill-domain-service';
import { BillNotificationService } from '../domain/services/bill-notification-service';
import { BillEventHandler } from '../domain/services/bill-event-handler';
import { UserRepository } from '../../users/domain/repositories/user-repository';
import { NotificationChannelService } from '../../infrastructure/notifications/notification-channels';
import { DomainEventPublisher } from '../../infrastructure/events/domain-event-publisher';
import { DatabaseService } from '../../infrastructure/database/database-service';
import { BillStatus, BillVoteType } from '@shared/schema';
import { Result, Ok, Err } from '../../../shared/core/src/primitives/result';
import { BillServiceError } from '../domain/errors/bill-errors';

/**
 * Application service for bill operations
 * Provides clean API for controllers with proper error handling
 * Uses dependency injection and domain services for business logic
 */
export class BillsApplicationService {
  constructor(
    private readonly billRepository: BillRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationChannelService: NotificationChannelService,
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly databaseService: DatabaseService
  ) {}

  /**
   * Creates a new bill with business rule validation
   */
  async createBill(params: {
    billNumber: string;
    title: string;
    summary?: string;
    sponsorId: string;
    tags?: string[];
    affectedCounties?: string[];
  }): Promise<Result<Bill, BillServiceError>> {
    try {
      // Validate input parameters
      const billNumberResult = BillNumber.create(params.billNumber);
      if (billNumberResult.isErr()) {
        return Err(new BillServiceError('INVALID_BILL_NUMBER', billNumberResult.error.message));
      }

      const titleResult = BillTitle.create(params.title);
      if (titleResult.isErr()) {
        return Err(new BillServiceError('INVALID_TITLE', titleResult.error.message));
      }

      let summary: BillSummary | undefined;
      if (params.summary) {
        const summaryResult = BillSummary.create(params.summary);
        if (summaryResult.isErr()) {
          return Err(new BillServiceError('INVALID_SUMMARY', summaryResult.error.message));
        }
        summary = summaryResult.value;
      }

      // Create domain service for business logic
      const domainService = new BillDomainService(
        this.billRepository,
        this.userRepository,
        new BillNotificationService(this.notificationChannelService, this.userRepository),
        this.domainEventPublisher
      );

      // Execute business logic within transaction
      const result = await this.databaseService.withTransaction(async () => {
        return await domainService.createBill({
          billNumber: billNumberResult.value,
          title: titleResult.value,
          summary,
          sponsorId: params.sponsorId,
          tags: params.tags,
          affectedCounties: params.affectedCounties
        });
      });

      return Ok(result);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return Err(error);
      }
      return Err(new BillServiceError('CREATE_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Updates bill status with validation and notifications
   */
  async updateBillStatus(
    billId: string,
    newStatus: BillStatus,
    updatedBy: string
  ): Promise<Result<Bill, BillServiceError>> {
    try {
      const domainService = new BillDomainService(
        this.billRepository,
        this.userRepository,
        new BillNotificationService(this.notificationChannelService, this.userRepository),
        this.domainEventPublisher
      );

      const result = await this.databaseService.withTransaction(async () => {
        return await domainService.updateBillStatus(billId, newStatus, updatedBy);
      });

      return Ok(result);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return Err(error);
      }
      return Err(new BillServiceError('STATUS_UPDATE_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Records a vote on a bill
   */
  async recordVote(
    billId: string,
    userId: string,
    voteType: BillVoteType
  ): Promise<Result<Bill, BillServiceError>> {
    try {
      const domainService = new BillDomainService(
        this.billRepository,
        this.userRepository,
        new BillNotificationService(this.notificationChannelService, this.userRepository),
        this.domainEventPublisher
      );

      const result = await this.databaseService.withTransaction(async () => {
        return await domainService.recordVote(billId, userId, voteType);
      });

      return Ok(result);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return Err(error);
      }
      return Err(new BillServiceError('VOTE_RECORD_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Updates bill content with validation
   */
  async updateBillContent(
    billId: string,
    updates: {
      title?: string;
      summary?: string;
      tags?: string[];
    },
    updatedBy: string
  ): Promise<Result<Bill, BillServiceError>> {
    try {
      // Validate input parameters
      let title: BillTitle | undefined;
      if (updates.title) {
        const titleResult = BillTitle.create(updates.title);
        if (titleResult.isErr()) {
          return Err(new BillServiceError('INVALID_TITLE', titleResult.error.message));
        }
        title = titleResult.value;
      }

      let summary: BillSummary | undefined;
      if (updates.summary) {
        const summaryResult = BillSummary.create(updates.summary);
        if (summaryResult.isErr()) {
          return Err(new BillServiceError('INVALID_SUMMARY', summaryResult.error.message));
        }
        summary = summaryResult.value;
      }

      const domainService = new BillDomainService(
        this.billRepository,
        this.userRepository,
        new BillNotificationService(this.notificationChannelService, this.userRepository),
        this.domainEventPublisher
      );

      const result = await this.databaseService.withTransaction(async () => {
        return await domainService.updateBillContent(billId, {
          title,
          summary,
          tags: updates.tags
        }, updatedBy);
      });

      return Ok(result);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return Err(error);
      }
      return Err(new BillServiceError('CONTENT_UPDATE_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Records engagement on a bill
   */
  async recordEngagement(
    billId: string,
    userId: string,
    engagementType: 'view' | 'comment' | 'share'
  ): Promise<Result<void, BillServiceError>> {
    try {
      const domainService = new BillDomainService(
        this.billRepository,
        this.userRepository,
        new BillNotificationService(this.notificationChannelService, this.userRepository),
        this.domainEventPublisher
      );

      await domainService.recordEngagement(billId, userId, engagementType);
      return Ok(undefined);

    } catch (error) {
      if (error instanceof BillServiceError) {
        return Err(error);
      }
      return Err(new BillServiceError('ENGAGEMENT_RECORD_FAILED', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Gets bill by ID with aggregate data
   */
  async getBillById(billId: string): Promise<Result<Bill | null, BillServiceError>> {
    try {
      const bill = await this.billRepository.findById(billId);
      return Ok(bill);

    } catch (error) {
      return Err(new BillServiceError('BILL_NOT_FOUND', error instanceof Error ? error.message : 'Bill not found'));
    }
  }

  /**
   * Gets bills with filtering and pagination
   */
  async getBills(params: {
    status?: BillStatus;
    sponsorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Result<Bill[], BillServiceError>> {
    try {
      const bills = await this.billRepository.findMany({
        status: params.status,
        sponsorId: params.sponsorId,
        limit: params.limit || 20,
        offset: params.offset || 0
      });

      return Ok(bills);

    } catch (error) {
      return Err(new BillServiceError('BILLS_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch bills'));
    }
  }

  /**
   * Gets bill with stakeholders and comments (aggregate operation)
   */
  async getBillAggregate(billId: string): Promise<Result<{
    bill: Bill;
    stakeholders: Array<{id: string, role: string}>;
    comments: Array<{id: string, content: string, userId: string, createdAt: Date}>;
    votes: Array<{userId: string, voteType: BillVoteType, createdAt: Date}>;
  }, BillServiceError>> {
    try {
      const bill = await this.billRepository.findById(billId);
      if (!bill) {
        return Err(new BillServiceError('BILL_NOT_FOUND', 'Bill not found'));
      }

      const [stakeholders, comments, votes] = await Promise.all([
        this.billRepository.findBillStakeholders(billId),
        this.billRepository.findBillComments(billId),
        this.billRepository.findBillVotes(billId)
      ]);

      return Ok({
        bill,
        stakeholders,
        comments,
        votes
      });

    } catch (error) {
      return Err(new BillServiceError('AGGREGATE_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch bill aggregate'));
    }
  }

  /**
   * Gets bill statistics
   */
  async getBillStatistics(): Promise<Result<{
    totalBills: number;
    billsByStatus: Array<{status: BillStatus, count: number}>;
    recentActivity: number;
  }, BillServiceError>> {
    try {
      const stats = await this.billRepository.getBillStatistics();
      return Ok(stats);

    } catch (error) {
      return Err(new BillServiceError('STATISTICS_FETCH_FAILED', error instanceof Error ? error.message : 'Failed to fetch statistics'));
    }
  }
}

// Export singleton instance with dependencies
// Note: In a real application, these would be injected via DI container
import { billRepository } from '../infrastructure/repositories/bill-repository-impl';
import { userRepository } from '../../users/infrastructure/repositories/user-repository-impl';
import { notificationChannelService } from '../../infrastructure/notifications/notification-channels';
import { domainEventPublisher } from '../../infrastructure/events/domain-event-publisher';
import { databaseService } from '../../infrastructure/database/database-service';

export const billsApplicationService = new BillsApplicationService(
  billRepository,
  userRepository,
  notificationChannelService,
  domainEventPublisher,
  databaseService
);

// Legacy compatibility - export the new service as the default export
export default billsApplicationService;
