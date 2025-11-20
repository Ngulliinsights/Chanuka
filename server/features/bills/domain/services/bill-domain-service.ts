import { Bill, BillNumber, BillTitle, BillSummary } from '../entities/bill';
// Repository pattern removed - using direct service calls
import { UserService } from '@/users/application/user-service-direct';
import { NotificationService } from '@/notifications/domain/services/notification-service';
import { BillCreatedEvent, BillStatusChangedEvent, BillUpdatedEvent } from '../events/bill-events';
import { DomainEventPublisher } from '../events/bill-events';
import { databaseService } from '@/infrastructure/database/database-service';
import { BillStatus, BillVoteType } from '@shared/schema';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { bills, bill_engagement, sponsors, users } from '@shared/schema/foundation';
import { bill_votes, bill_trackers } from '@shared/schema/citizen_participation';

/**
 * Business rules and validation logic for bill operations
 * Uses direct Drizzle ORM queries for improved performance
 */
export class BillDomainService {
  constructor(
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly eventPublisher: DomainEventPublisher
  ) { }

  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Creates a new bill with business rule validation and transaction coordination
   */
  async createBill(params: {
    billNumber: BillNumber;
    title: BillTitle;
    summary?: BillSummary;
    sponsor_id: string;
    tags?: string[];
    affectedCounties?: string[];
  }): Promise<Bill> {
    return databaseService.withTransaction(async (tx) => {
      // Business Rule: Validate sponsor exists and is authorized
      const sponsor = await this.userService.findById(params.sponsor_id);
      if (!sponsor) {
        throw new Error('Sponsor not found');
      }

      // Business Rule: Only legislators can sponsor bills
      if (!['senator', 'mp', 'governor'].includes(sponsor.role)) {
        throw new Error('Only legislators can sponsor bills');
      }

      // Business Rule: Check for duplicate bill numbers using direct Drizzle query
      const [existingBill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.bill_number, params.billNumber.getValue()))
        .limit(1);
      
      if (existingBill) {
        throw new Error('Bill number already exists');
      }

      // Create the bill using direct Drizzle insert
      const [savedBill] = await this.db
        .insert(bills)
        .values({
          bill_number: params.billNumber.getValue(),
          title: params.title.getValue(),
          summary: params.summary?.getValue(),
          sponsor_id: params.sponsor_id,
          tags: params.tags,
          affected_counties: params.affectedCounties,
          status: 'drafted',
          chamber: 'national_assembly', // Default chamber
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();

      // Publish domain event
      await this.eventPublisher.publish(new BillCreatedEvent(
        savedBill.id,
        savedBill.bill_number,
        savedBill.title,
        savedBill.sponsor_id!
      ));

      // Send notifications to stakeholders (outside transaction for performance)
      setImmediate(() => this.notifyStakeholders(savedBill, 'created'));

      return savedBill;
    }, 'create_bill');
  }

  /**
   * Updates bill status with business rule validation and transaction coordination
   */
  async updateBillStatus(bill_id: string, newStatus: BillStatus, updatedBy: string): Promise<any> {
    return databaseService.withTransaction(async (tx) => {
      // Get bill using direct Drizzle query
      const [bill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id))
        .limit(1);
      
      if (!bill) {
        throw new Error('Bill not found');
      }

      // Business Rule: Validate user permissions for status changes
      await this.validateStatusChangePermission(bill, newStatus, updatedBy);

      const oldStatus = bill.status;

      // Update bill status using direct Drizzle query
      const [updatedBill] = await this.db
        .update(bills)
        .set({
          status: newStatus,
          last_action_date: new Date(),
          updated_at: new Date()
        })
        .where(eq(bills.id, bill_id))
        .returning();

      // Publish domain event
      await this.eventPublisher.publish(new BillStatusChangedEvent(
        bill_id,
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
  async recordVote(bill_id: string, user_id: string, voteType: BillVoteType): Promise<any> {
    // Get bill using direct Drizzle query
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(eq(bills.id, bill_id))
      .limit(1);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Business Rule: Validate user can vote
    const user = await this.userService.findById(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // Business Rule: Check if user has already voted using direct query
    const [existingVote] = await this.db
      .select()
      .from(bill_votes)
      .where(and(
        eq(bill_votes.bill_id, bill_id),
        eq(bill_votes.user_id, user_id)
      ))
      .limit(1);
    
    if (existingVote) {
      throw new Error('User has already voted on this bill');
    }

    // Save the vote using direct Drizzle insert
    await this.db.insert(bill_votes).values({
      bill_id: bill_id,
      user_id: user_id,
      vote_type: voteType,
      voted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    // Update bill vote counts
    const voteCountField = voteType === 'support' ? 'vote_count_for' : 'vote_count_against';
    const [updatedBill] = await this.db
      .update(bills)
      .set({
        [voteCountField]: sql`${bills[voteCountField]} + 1`,
        updated_at: new Date()
      })
      .where(eq(bills.id, bill_id))
      .returning();

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      bill_id,
      'vote_recorded',
      { voteType, user_id }
    ));

    return updatedBill;
  }

  /**
   * Updates bill content with validation
   */
  async updateBillContent(
    bill_id: string,
    updates: {
      title?: BillTitle;
      summary?: BillSummary;
      tags?: string[];
    },
    updatedBy: string
  ): Promise<any> {
    // Get bill using direct Drizzle query
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(eq(bills.id, bill_id))
      .limit(1);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Business Rule: Only modifiable bills can be updated (drafted or introduced)
    if (!['drafted', 'introduced'].includes(bill.status)) {
      throw new Error('Bill cannot be modified');
    }

    // Business Rule: Validate update permissions
    await this.validateUpdatePermission(bill, updatedBy);

    // Prepare updates
    const updateData: any = {
      updated_at: new Date()
    };

    if (updates.title) {
      updateData.title = updates.title.getValue();
    }
    if (updates.summary) {
      updateData.summary = updates.summary.getValue();
    }
    if (updates.tags) {
      updateData.tags = updates.tags;
    }

    // Update bill using direct Drizzle query
    const [updatedBill] = await this.db
      .update(bills)
      .set(updateData)
      .where(eq(bills.id, bill_id))
      .returning();

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      bill_id,
      'content_updated',
      { updates, updatedBy }
    ));

    return updatedBill;
  }

  /**
   * Records engagement (view, comment, share) on a bill
   */
  async recordEngagement(bill_id: string, user_id: string, engagementType: 'view' | 'comment' | 'share'): Promise<void> {
    // Check if bill exists using direct Drizzle query
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(eq(bills.id, bill_id))
      .limit(1);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Check if engagement already exists
    const [existingEngagement] = await this.db
      .select()
      .from(bill_engagement)
      .where(and(
        eq(bill_engagement.bill_id, bill_id),
        eq(bill_engagement.user_id, user_id)
      ))
      .limit(1);

    if (existingEngagement) {
      // Update existing engagement
      const updates: any = {
        lastEngaged: new Date(),
        updated_at: new Date()
      };

      switch (engagementType) {
        case 'view':
          updates.view_count = sql`${bill_engagement.view_count} + 1`;
          break;
        case 'comment':
          updates.comment_count = sql`${bill_engagement.comment_count} + 1`;
          break;
        case 'share':
          updates.share_count = sql`${bill_engagement.share_count} + 1`;
          break;
      }

      await this.db
        .update(bill_engagement)
        .set(updates)
        .where(eq(bill_engagement.id, existingEngagement.id));
    } else {
      // Create new engagement
      const engagement_data: any = {
        bill_id: bill_id,
        user_id: user_id,
        view_count: engagementType === 'view' ? 1 : 0,
        comment_count: engagementType === 'comment' ? 1 : 0,
        share_count: engagementType === 'share' ? 1 : 0,
        engagement_score: "1",
        lastEngaged: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.db.insert(bill_engagement).values(engagement_data);
    }

    // Update bill-level counters
    if (engagementType === 'view' || engagementType === 'share') {
      const updateField = engagementType === 'view' ? 'view_count' : 'share_count';
      await this.db
        .update(bills)
        .set({
          [updateField]: sql`${bills[updateField]} + 1`,
          updated_at: new Date()
        })
        .where(eq(bills.id, bill_id));
    }
  }

  /**
   * Gets bill with full aggregate data (comments, votes, stakeholders)
   */
  async getBillAggregate(bill_id: string) {
    // Get bill using direct Drizzle query
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(eq(bills.id, bill_id))
      .limit(1);
    
    if (!bill) {
      return null;
    }

    // Get related data in parallel
    const [votes, engagement, trackers] = await Promise.all([
      this.db
        .select()
        .from(bill_votes)
        .where(eq(bill_votes.bill_id, bill_id)),
      
      this.db
        .select()
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill_id)),
      
      this.db
        .select()
        .from(bill_trackers)
        .where(eq(bill_trackers.bill_id, bill_id))
    ]);

    return {
      bill,
      votes,
      engagement,
      trackers
    };
  }

  /**
   * Gets bills with aggregate data for a user (tracked, voted, sponsored, commented)
   */
  async getUserBillsAggregate(user_id: string) {
    // Get bills the user has interacted with
    const [trackedBills, votedBills, sponsoredBills] = await Promise.all([
      this.db
        .select({ bill: bills })
        .from(bills)
        .innerJoin(bill_trackers, eq(bills.id, bill_trackers.bill_id))
        .where(eq(bill_trackers.user_id, user_id)),
      
      this.db
        .select({ bill: bills })
        .from(bills)
        .innerJoin(bill_votes, eq(bills.id, bill_votes.bill_id))
        .where(eq(bill_votes.user_id, user_id)),
      
      this.db
        .select()
        .from(bills)
        .where(eq(bills.sponsor_id, user_id))
    ]);

    return {
      tracked: trackedBills.map(b => b.bill),
      voted: votedBills.map(b => b.bill),
      sponsored: sponsoredBills
    };
  }

  /**
   * Adds a user as a bill tracker
   */
  async addBillTracker(bill_id: string, user_id: string): Promise<void> {
    // Check if bill exists using direct Drizzle query
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(eq(bills.id, bill_id))
      .limit(1);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    // Check if already tracking
    const [existingTracker] = await this.db
      .select()
      .from(bill_trackers)
      .where(and(
        eq(bill_trackers.bill_id, bill_id),
        eq(bill_trackers.user_id, user_id)
      ))
      .limit(1);

    if (!existingTracker) {
      await this.db.insert(bill_trackers).values({
        bill_id: bill_id,
        user_id: user_id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      bill_id,
      'tracker_added',
      { user_id }
    ));
  }

  /**
   * Removes a user from bill tracking
   */
  async removeBillTracker(bill_id: string, user_id: string): Promise<void> {
    await this.db
      .delete(bill_trackers)
      .where(and(
        eq(bill_trackers.bill_id, bill_id),
        eq(bill_trackers.user_id, user_id)
      ));

    // Publish domain event
    await this.eventPublisher.publish(new BillUpdatedEvent(
      bill_id,
      'tracker_removed',
      { user_id }
    ));
  }

  /**
   * Gets comprehensive bill analytics
   */
  async getBillAnalytics(bill_id: string) {
    const aggregate = await this.getBillAggregate(bill_id);
    if (!aggregate) {
      throw new Error('Bill not found');
    }

    const { bill, comments, votes, engagement } = aggregate;

    // Calculate engagement rate
    const totalUsers = await this.userService.countUsers();
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
      bill_id,
      billNumber: bill.getBillNumber().getValue(),
      title: bill.getTitle().getValue(),
      status: bill.getStatus(),
      sponsor_id: bill.getSponsorId(),

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
        created_at: bill.getCreatedAt(),
        lastActivity: this.getLastActivityDate(comments, votes),
        daysActive: Math.floor((Date.now() - bill.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24))
      }
    };
  }

  /**
   * Gets bills requiring stakeholder attention based on business rules
   */
  async getBillsRequiringAttention(): Promise<any[]> {
    // Bills requiring attention: stalled for >30 days, high engagement but no recent action
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.db
      .select()
      .from(bills)
      .where(and(
        sql`${bills.last_action_date} < ${thirtyDaysAgo}`,
        sql`${bills.engagement_score} > 100`,
        sql`${bills.status} IN ('committee', 'second_reading')`
      ))
      .orderBy(desc(bills.engagement_score));
  }

  /**
   * Performs bulk operations on bills with proper validation
   */
  async bulkUpdateBillStatuses(billIds: string[], newStatus: BillStatus, updatedBy: string): Promise<void> {
    // Business Rule: Validate user permissions for bulk operations
    const user = await this.userService.findById(updatedBy);
    if (!user || !['admin', 'clerk'].includes(user.role)) {
      throw new Error('Insufficient permissions for bulk operations');
    }

    // Business Rule: Validate status transitions for each bill
    for (const bill_id of billIds) {
      const [bill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.id, bill_id))
        .limit(1);
      
      if (!bill) {
        throw new Error(`Bill ${bill_id} not found`);
      }

      // Validate the status change
      await this.validateStatusChangePermission(bill, newStatus, updatedBy);
    }

    // Perform bulk update using direct Drizzle query
    await this.db
      .update(bills)
      .set({
        status: newStatus,
        last_action_date: new Date(),
        updated_at: new Date()
      })
      .where(sql`${bills.id} = ANY(${billIds})`);

    // Publish events for each bill
    for (const bill_id of billIds) {
      await this.eventPublisher.publish(new BillStatusChangedEvent(
        bill_id,
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
  private async validateStatusChangePermission(bill: any, newStatus: BillStatus, user_id: string): Promise<void> {
    const user = await this.userService.findById(user_id);
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
    if (newStatus === 'withdrawn' && bill.sponsor_id !== user_id) {
      throw new Error('Only the bill sponsor can withdraw the bill');
    }
  }

  /**
   * Validates permissions for content updates
   */
  private async validateUpdatePermission(bill: any, user_id: string): Promise<void> {
    const user = await this.userService.findById(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // Business Rule: Only sponsor or authorized personnel can update bill content
    const allowedRoles = ['senator', 'mp', 'governor', 'clerk', 'admin'];
    const isSponsor = bill.sponsor_id === userId;
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
          user_id: stakeholder.id,
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
  private async getBillStakeholders(bill: any): Promise<Array<{ id: string, role: string }>> {
    const stakeholders = new Map<string, { id: string, role: string }>();

    // Add sponsor
    if (bill.sponsor_id) {
      const sponsor = await this.userService.findById(bill.sponsor_id);
      if (sponsor) {
        stakeholders.set(sponsor.id, { id: sponsor.id, role: 'sponsor' });
      }
    }

    // Add users tracking this bill using direct Drizzle query
    const trackers = await this.db
      .select({ user_id: bill_trackers.user_id })
      .from(bill_trackers)
      .where(eq(bill_trackers.bill_id, bill.id));
    
    for (const tracker of trackers) {
      stakeholders.set(tracker.user_id, { id: tracker.user_id, role: 'tracker' });
    }

    // Add users who have engaged with the bill using direct Drizzle query
    const engagedUsers = await this.db
      .select({ user_id: bill_engagement.user_id })
      .from(bill_engagement)
      .where(eq(bill_engagement.bill_id, bill.id));
    
    for (const user of engagedUsers) {
      stakeholders.set(user.user_id, { id: user.user_id, role: 'engaged' });
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

  private generateNotificationTitle(bill: any, eventType: string): string {
    const billNumber = bill.bill_number;
    const titles: Record<string, string> = {
      'created': `New Bill Introduced: ${billNumber}`,
      'status_changed': `Bill Status Changed: ${billNumber}`,
      'content_updated': `Bill Updated: ${billNumber}`,
      'vote_recorded': `New Vote on Bill: ${billNumber}`
    };
    return titles[eventType] || `Bill Notification: ${billNumber}`;
  }

  private generateNotificationMessage(bill: any, eventType: string, additionalData?: any): string {
    const billTitle = bill.title;

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
