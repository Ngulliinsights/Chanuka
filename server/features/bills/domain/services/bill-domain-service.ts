import { Bill, BillNumber, BillTitle, BillSummary } from '../entities/bill';
import { BillRepository } from '../repositories/bill-repository';
import { UserRepository } from '../../../users/domain/repositories/user-repository';
import { NotificationService } from '../../../notifications/domain/services/notification-service';
import { BillCreatedEvent, BillStatusChangedEvent, BillUpdatedEvent } from '../events/bill-events';
import { DomainEventPublisher } from '../../../../infrastructure/events/domain-event-publisher';
import { databaseService } from '../../../../infrastructure/database/database-service';
import { BillStatus, BillVoteType } from '@shared/schema';

/**
 * Business rules and validation logic for bill operations
 * Coordinates complex operations across multiple repositories
 */
export class BillDomainService {
  constructor(
    private readonly billRepository: BillRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly databaseService: DatabaseService
  ) { }

  /**
   * Creates a new bill with business rule validation and transaction coordination
   */
  async createBill(params: {
    billNumber: BillNumber;
    title: BillTitle;
    summary?: BillSummary;
    sponsorId: string;
    tags?: string[];
    affectedCounties?: string[];
  }): Promise<Bill> {
    return databaseService.withTransaction(async (tx) => {
      // Business Rule: Validate sponsor exists and is authorized
      const sponsor = await this.userRepository.findById(params.sponsorId);
      if (!sponsor) {
        throw new Error('Sponsor not found');
      }

      // Business Rule: Only legislators can sponsor bills
      if (!['senator', 'mp', 'governor'].includes(sponsor.role)) {
        throw new Error('Only legislators can sponsor bills');
      }

      // Business Rule: Check for duplicate bill numbers
      const existingBill = await this.billRepository.findByBillNumber(params.billNumber.getValue());
      if (existingBill) {
        throw new Error('Bill number already exists');
      }

      // Create the bill
      const bill = Bill.create({
        billNumber: params.billNumber,
        title: params.title,
        summary: params.summary,
        sponsorId: params.sponsorId,
        tags: params.tags,
        affectedCounties: params.affectedCounties
      });

      // Save to repository within transaction
      const savedBill = await this.billRepository.save(bill);

      // Publish domain event
      await this.eventPublisher.publish(new BillCreatedEvent(
        savedBill.getId(),
        savedBill.getBillNumber().getValue(),
        savedBill.getTitle().getValue(),
        savedBill.getSponsorId()!
      ));

      // Send notifications to stakeholders (outside transaction for performance)
      setImmediate(() => this.notifyStakeholders(savedBill, 'created'));

      return savedBill;
    }, 'create_bill');
  }

  /**
   * Updates bill status with business rule validation and transaction coordination
   */
  async updateBillStatus(billId: string, newStatus: BillStatus, updatedBy: string): Promise<Bill> {
    return databaseService.withTransaction(async (tx) => {
      const bill = await this.billRepository.findById(billId);
      if (!bill) {
        throw new Error('Bill not found');
      }

      // Business Rule: Only active bills can have status changes
      if (!bill.isActive()) {
        throw new Error('Cannot update status of inactive bill');
      }

      // Business Rule: Validate user permissions for status changes
      await this.validateStatusChangePermission(bill, newStatus, updatedBy);

      const oldStatus = bill.getStatus();
      bill.updateStatus(newStatus);

      // Save updated bill within transaction
      const updatedBill = await this.billRepository.save(bill);

      // Publish domain event
      await this.eventPublisher.publish(new BillStatusChangedEvent(
        billId,
        oldStatus,
        newStatus,
        updatedBy
      ));

      // Send notifications (outside transaction for performance)
      setImmediate(() => this.notifyStakeholders(updatedBill, 'status_changed', { oldStatus, newStatus }));

      return updatedBill;
    }, 'update_bill_status');
  }

  /**
   * Records a vote on a bill with validation
   */
  async recordVote(billId: string, userId: string, voteType: BillVoteType): Promise<Bill> {
    const bill = await this.billRepository.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Business Rule: Only active bills can receive votes
    if (!bill.isActive()) {
      throw new Error('Cannot vote on inactive bill');
    }

    // Business Rule: Validate user can vote
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Business Rule: Check if user has already voted
    const existingVote = await this.billRepository.findVote(billId, userId);
    if (existingVote) {
      throw new Error('User has already voted on this bill');
    }

    // Record the vote
    bill.recordVote(voteType);
    const updatedBill = await this.billRepository.save(bill);

    // Save the vote
    await this.billRepository.saveVote(billId, userId, voteType);

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      billId,
      'vote_recorded',
      { voteType, userId }
    ));

    return updatedBill;
  }

  /**
   * Updates bill content with validation
   */
  async updateBillContent(
    billId: string,
    updates: {
      title?: BillTitle;
      summary?: BillSummary;
      tags?: string[];
    },
    updatedBy: string
  ): Promise<Bill> {
    const bill = await this.billRepository.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Business Rule: Only modifiable bills can be updated
    if (!bill.canBeModified()) {
      throw new Error('Bill cannot be modified');
    }

    // Business Rule: Validate update permissions
    await this.validateUpdatePermission(bill, updatedBy);

    // Apply updates
    if (updates.title) {
      bill.updateTitle(updates.title);
    }
    if (updates.summary) {
      bill.updateSummary(updates.summary);
    }
    if (updates.tags) {
      // Remove existing tags and add new ones
      bill.getTags().forEach(tag => bill.removeTag(tag));
      updates.tags.forEach(tag => bill.addTag(tag));
    }

    const updatedBill = await this.billRepository.save(bill);

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      billId,
      'content_updated',
      { updates, updatedBy }
    ));

    return updatedBill;
  }

  /**
   * Records engagement (view, comment, share) on a bill
   */
  async recordEngagement(billId: string, userId: string, engagementType: 'view' | 'comment' | 'share'): Promise<void> {
    const bill = await this.billRepository.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Record engagement
    bill.recordEngagement(engagementType);
    await this.billRepository.save(bill);

    // Save engagement record
    await this.billRepository.saveEngagement(billId, userId, engagementType);
  }

  /**
   * Gets bill with full aggregate data (comments, votes, stakeholders)
   */
  async getBillAggregate(billId: string) {
    return await this.billRepository.findBillAggregate(billId);
  }

  /**
   * Gets bills with aggregate data for a user (tracked, voted, sponsored, commented)
   */
  async getUserBillsAggregate(userId: string) {
    return await this.billRepository.findUserBillsAggregate(userId);
  }

  /**
   * Adds a user as a bill tracker
   */
  async addBillTracker(billId: string, userId: string): Promise<void> {
    const bill = await this.billRepository.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Business Rule: Only active bills can be tracked
    if (!bill.isActive()) {
      throw new Error('Cannot track inactive bill');
    }

    await this.billRepository.addBillTracker(billId, userId);

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      billId,
      'tracker_added',
      { userId }
    ));
  }

  /**
   * Removes a user from bill tracking
   */
  async removeBillTracker(billId: string, userId: string): Promise<void> {
    await this.billRepository.removeBillTracker(billId, userId);

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      billId,
      'tracker_removed',
      { userId }
    ));
  }

  /**
   * Gets comprehensive bill analytics
   */
  async getBillAnalytics(billId: string) {
    const aggregate = await this.getBillAggregate(billId);
    if (!aggregate) {
      throw new Error('Bill not found');
    }

    const { bill, comments, votes, engagement } = aggregate;

    // Calculate engagement rate
    const totalUsers = await this.userRepository.count();
    const engagementRate = totalUsers > 0 ? (engagement.totalEngagedUsers / totalUsers) * 100 : 0;

    // Calculate support ratio
    const supportVotes = votes.filter(v => v.voteType === 'support').length;
    const opposeVotes = votes.filter(v => v.voteType === 'oppose').length;
    const totalVotes = supportVotes + opposeVotes;
    const supportRatio = totalVotes > 0 ? (supportVotes / totalVotes) * 100 : 0;

    // Calculate comment sentiment distribution
    const sentimentStats = comments.reduce((acc, comment) => {
      if (comment.position === 'support') acc.support++;
      else if (comment.position === 'oppose') acc.oppose++;
      else if (comment.position === 'neutral') acc.neutral++;
      else acc.questions++;
      return acc;
    }, { support: 0, oppose: 0, neutral: 0, questions: 0 });

    return {
      billId,
      billNumber: bill.getBillNumber().getValue(),
      title: bill.getTitle().getValue(),
      status: bill.getStatus(),
      sponsorId: bill.getSponsorId(),

      // Engagement metrics
      engagement: {
        views: engagement.views,
        comments: engagement.comments,
        shares: engagement.shares,
        totalEngagedUsers: engagement.totalEngagedUsers,
        engagementRate: Math.round(engagementRate * 100) / 100
      },

      // Voting analytics
      voting: {
        totalVotes,
        supportVotes,
        opposeVotes,
        abstainVotes: votes.filter(v => v.voteType === 'abstain').length,
        supportRatio: Math.round(supportRatio * 100) / 100
      },

      // Comment analytics
      comments: {
        totalComments: comments.length,
        sentimentDistribution: sentimentStats,
        averageCommentLength: comments.length > 0
          ? Math.round(comments.reduce((sum, c) => sum + c.content.length, 0) / comments.length)
          : 0
      },

      // Geographic distribution
      geographic: {
        counties: this.getUniqueCountiesFromVotesAndComments(votes, comments),
        constituencies: this.getUniqueConstituenciesFromVotesAndComments(votes, comments)
      },

      // Time-based metrics
      timeline: {
        createdAt: bill.getCreatedAt(),
        lastActivity: this.getLastActivityDate(comments, votes),
        daysActive: Math.floor((Date.now() - bill.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24))
      }
    };
  }

  /**
   * Gets bills requiring stakeholder attention based on business rules
   */
  async getBillsRequiringAttention(): Promise<Bill[]> {
    return await this.billRepository.findRequiringAttention();
  }

  /**
   * Performs bulk operations on bills with proper validation
   */
  async bulkUpdateBillStatuses(billIds: string[], newStatus: BillStatus, updatedBy: string): Promise<void> {
    // Business Rule: Validate user permissions for bulk operations
    const user = await this.userRepository.findById(updatedBy);
    if (!user || !['admin', 'clerk'].includes(user.role)) {
      throw new Error('Insufficient permissions for bulk operations');
    }

    // Business Rule: Validate status transitions for each bill
    for (const billId of billIds) {
      const bill = await this.billRepository.findById(billId);
      if (!bill) {
        throw new Error(`Bill ${billId} not found`);
      }

      // Validate the status change
      await this.validateStatusChangePermission(bill, newStatus, updatedBy);
    }

    // Perform bulk update
    await this.billRepository.bulkUpdateStatus(billIds, newStatus);

    // Publish events for each bill
    for (const billId of billIds) {
      await this.eventPublisher.publish(new BillStatusChangedEvent(
        billId,
        'unknown' as any, // We don't know the old status in bulk operations
        newStatus,
        updatedBy
      ));
    }
  }

  // Helper methods for analytics

  private getUniqueCountiesFromVotesAndComments(votes: any[], comments: any[]): string[] {
    const counties = new Set<string>();

    votes.forEach(vote => {
      if (vote.user_county) counties.add(vote.user_county);
    });

    comments.forEach(comment => {
      if (comment.user_county) counties.add(comment.user_county);
    });

    return Array.from(counties);
  }

  private getUniqueConstituenciesFromVotesAndComments(votes: any[], comments: any[]): string[] {
    const constituencies = new Set<string>();

    votes.forEach(vote => {
      if (vote.user_constituency) constituencies.add(vote.user_constituency);
    });

    comments.forEach(comment => {
      if (comment.user_constituency) constituencies.add(comment.user_constituency);
    });

    return Array.from(constituencies);
  }

  private getLastActivityDate(comments: any[], votes: any[]): Date | null {
    const dates = [
      ...comments.map(c => new Date(c.created_at)),
      ...votes.map(v => new Date(v.voted_at))
    ];

    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  }

  /**
   * Validates permissions for status changes
   */
  private async validateStatusChangePermission(bill: Bill, newStatus: BillStatus, userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Business rules for status transitions
    const statusRules: Record<BillStatus, string[]> = {
      'drafted': ['senator', 'mp', 'governor', 'admin'],
      'introduced': ['senator', 'mp', 'governor', 'clerk', 'admin'],
      'committee': ['senator', 'mp', 'committee_chair', 'clerk', 'admin'],
      'second_reading': ['senator', 'mp', 'speaker', 'clerk', 'admin'],
      'third_reading': ['senator', 'mp', 'speaker', 'clerk', 'admin'],
      'passed': ['speaker', 'president', 'clerk', 'admin'],
      'assented': ['president', 'clerk', 'admin'],
      'failed': ['speaker', 'president', 'clerk', 'admin'],
      'withdrawn': ['senator', 'mp', 'governor', 'sponsor']
    };

    const allowedRoles = statusRules[newStatus] || [];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`User role '${user.role}' cannot change bill status to '${newStatus}'`);
    }

    // Additional rule: Only the sponsor can withdraw a bill
    if (newStatus === 'withdrawn' && bill.getSponsorId() !== userId) {
      throw new Error('Only the bill sponsor can withdraw the bill');
    }
  }

  /**
   * Validates permissions for content updates
   */
  private async validateUpdatePermission(bill: Bill, userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Business Rule: Only sponsor or authorized personnel can update bill content
    const allowedRoles = ['senator', 'mp', 'governor', 'clerk', 'admin'];
    const isSponsor = bill.getSponsorId() === userId;
    const hasPermission = allowedRoles.includes(user.role) || isSponsor;

    if (!hasPermission) {
      throw new Error('User does not have permission to update bill content');
    }
  }

  /**
   * Notifies stakeholders about bill events
   */
  private async notifyStakeholders(
    bill: Bill,
    eventType: string,
    additionalData?: any
  ): Promise<void> {
    try {
      const stakeholders = await this.getBillStakeholders(bill);

      for (const stakeholder of stakeholders) {
        await this.notificationService.sendNotification({
          userId: stakeholder.id,
          type: this.mapEventToNotificationType(eventType),
          title: this.generateNotificationTitle(bill, eventType),
          message: this.generateNotificationMessage(bill, eventType, additionalData),
          relatedBillId: bill.getId(),
          metadata: {
            billNumber: bill.getBillNumber().getValue(),
            billTitle: bill.getTitle().getValue(),
            eventType,
            ...additionalData
          }
        });
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to send stakeholder notifications:', error);
    }
  }

  /**
   * Gets all stakeholders for a bill (sponsor, trackers, interested parties)
   */
  private async getBillStakeholders(bill: Bill): Promise<Array<{ id: string, role: string }>> {
    const stakeholders = new Map<string, { id: string, role: string }>();

    // Add sponsor
    if (bill.getSponsorId()) {
      const sponsor = await this.userRepository.findById(bill.getSponsorId()!);
      if (sponsor) {
        stakeholders.set(sponsor.id, { id: sponsor.id, role: 'sponsor' });
      }
    }

    // Add users tracking this bill
    const trackers = await this.billRepository.findBillTrackers(bill.getId());
    for (const tracker of trackers) {
      stakeholders.set(tracker.id, { id: tracker.id, role: 'tracker' });
    }

    // Add users who have engaged with the bill
    const engagedUsers = await this.billRepository.findEngagedUsers(bill.getId());
    for (const user of engagedUsers) {
      stakeholders.set(user.id, { id: user.id, role: 'engaged' });
    }

    return Array.from(stakeholders.values());
  }

  private mapEventToNotificationType(eventType: string): string {
    const mapping: Record<string, string> = {
      'created': 'bill_created',
      'status_changed': 'bill_status_changed',
      'content_updated': 'bill_updated',
      'vote_recorded': 'bill_vote_recorded'
    };
    return mapping[eventType] || 'bill_notification';
  }

  private generateNotificationTitle(bill: Bill, eventType: string): string {
    const billNumber = bill.getBillNumber().getValue();
    const titles: Record<string, string> = {
      'created': `New Bill Introduced: ${billNumber}`,
      'status_changed': `Bill Status Changed: ${billNumber}`,
      'content_updated': `Bill Updated: ${billNumber}`,
      'vote_recorded': `New Vote on Bill: ${billNumber}`
    };
    return titles[eventType] || `Bill Notification: ${billNumber}`;
  }

  private generateNotificationMessage(bill: Bill, eventType: string, additionalData?: any): string {
    const billTitle = bill.getTitle().getValue();

    switch (eventType) {
      case 'created':
        return `A new bill "${billTitle}" has been introduced.`;
      case 'status_changed':
        return `Bill "${billTitle}" status changed from ${additionalData?.oldStatus} to ${additionalData?.newStatus}.`;
      case 'content_updated':
        return `Bill "${billTitle}" has been updated.`;
      case 'vote_recorded':
        return `A new ${additionalData?.voteType} vote has been recorded on "${billTitle}".`;
      default:
        return `Bill "${billTitle}" has an update.`;
    }
  }
}