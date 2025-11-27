// ============================================================================
// CITIZEN PARTICIPATION SCHEMA TESTS
// ============================================================================
// Tests for public-facing interaction layer: comments, votes, engagement tracking

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  sessions,
  comments,
  comment_votes,
  bill_votes,
  bill_engagement,
  bill_tracking_preferences,
  notifications,
  alert_preferences
} from '../citizen_participation';
import { users, bills } from './foundation';
import { eq, and, or, sql, count, sum } from 'drizzle-orm';

describe('Citizen Participation Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('citizen_participation');
  });

  describe('Sessions Table', () => {
    it('should create and manage user sessions', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const sessionData = {
        id: 'session_123',
        user_id: user.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        data: { theme: 'dark', language: 'en' }
      };

      const [session] = await testDb
        .insert(sessions)
        .values(sessionData)
        .returning();

      expect(session.id).toBe(sessionData.id);
      expect(session.user_id).toBe(user.id);
      expect(session.data.theme).toBe('dark');
    });

    it('should handle expired sessions', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const expiredSession = {
        id: 'expired_session',
        user_id: user.id,
        expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
        data: {}
      };

      await testDb.insert(sessions).values(expiredSession);

      const activeSessions = await testDb
        .select()
        .from(sessions)
        .where(sql`${sessions.expires_at} > NOW()`);

      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('Comments Table', () => {
    it('should create a comment on a bill', async () => {
      // Create user and bill
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id,
        position: 'support'
      });

      const [comment] = await testDb
        .insert(comments)
        .values(testComment)
        .returning();

      expect(comment.bill_id).toBe(bill.id);
      expect(comment.user_id).toBe(user.id);
      expect(comment.position).toBe('support');
      expect(comment.upvote_count).toBe(0);
      expect(comment.moderation_status).toBe('pending');
    });

    it('should handle comment threads and replies', async () => {
      const testUser1 = generateTestData.user();
      const testUser2 = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Create parent comment
      const parentComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user1.id,
        thread_depth: 0
      });
      const [parent] = await testDb.insert(comments).values(parentComment).returning();

      // Create reply
      const replyComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user2.id,
        parent_comment_id: parent.id,
        thread_depth: 1
      });
      const [reply] = await testDb.insert(comments).values(replyComment).returning();

      expect(reply.parent_comment_id).toBe(parent.id);
      expect(reply.thread_depth).toBe(1);
      expect(parent.thread_depth).toBe(0);
    });

    it('should update comment engagement metrics', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id,
        upvote_count: 10,
        downvote_count: 2,
        reply_count: 3
      });

      const [comment] = await testDb
        .insert(comments)
        .values(testComment)
        .returning();

      expect(comment.upvote_count).toBe(10);
      expect(comment.downvote_count).toBe(2);
      expect(comment.reply_count).toBe(3);
    });

    it('should filter comments by moderation status', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const commentsData = [
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          moderation_status: 'approved'
        }),
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          moderation_status: 'rejected'
        }),
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          moderation_status: 'pending'
        })
      ];

      await testDb.insert(comments).values(commentsData);

      const approvedComments = await testDb
        .select()
        .from(comments)
        .where(eq(comments.moderation_status, 'approved'));

      expect(approvedComments).toHaveLength(1);
      expect(approvedComments[0].moderation_status).toBe('approved');
    });

    it('should query comments by geographic context', async () => {
      const testUser1 = generateTestData.user({ county: 'nairobi' });
      const testUser2 = generateTestData.user({ county: 'kiambu' });
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const commentsData = [
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user1.id,
          user_county: 'nairobi'
        }),
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user2.id,
          user_county: 'kiambu'
        })
      ];

      await testDb.insert(comments).values(commentsData);

      const nairobiComments = await testDb
        .select()
        .from(comments)
        .where(eq(comments.user_county, 'nairobi'));

      expect(nairobiComments).toHaveLength(1);
      expect(nairobiComments[0].user_county).toBe('nairobi');
    });
  });

  describe('Comment Votes Table', () => {
    it('should create comment votes with unique constraint', async () => {
      const testUser1 = generateTestData.user();
      const testUser2 = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user1.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      // User 1 votes up
      const vote1 = {
        comment_id: comment.id,
        user_id: user1.id,
        vote_type: 'upvote'
      };

      // User 2 votes down
      const vote2 = {
        comment_id: comment.id,
        user_id: user2.id,
        vote_type: 'downvote'
      };

      await testDb.insert(comment_votes).values([vote1, vote2]);

      const commentVotes = await testDb
        .select()
        .from(comment_votes)
        .where(eq(comment_votes.comment_id, comment.id));

      expect(commentVotes).toHaveLength(2);
      expect(commentVotes.some(v => v.vote_type === 'upvote')).toBe(true);
      expect(commentVotes.some(v => v.vote_type === 'downvote')).toBe(true);
    });

    it('should enforce one vote per user per comment', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      const vote1 = {
        comment_id: comment.id,
        user_id: user.id,
        vote_type: 'upvote'
      };

      const vote2 = {
        comment_id: comment.id,
        user_id: user.id,
        vote_type: 'downvote'
      };

      await testDb.insert(comment_votes).values(vote1);

      await expect(
        testDb.insert(comment_votes).values(vote2)
      ).rejects.toThrow();
    });
  });

  describe('Bill Votes Table', () => {
    it('should create bill votes with positions', async () => {
      const testUser1 = generateTestData.user();
      const testUser2 = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const votesData = [
        {
          bill_id: bill.id,
          user_id: user1.id,
          vote_type: 'for',
          voting_reason: 'Supports the bill objectives'
        },
        {
          bill_id: bill.id,
          user_id: user2.id,
          vote_type: 'against',
          voting_reason: 'Opposes specific provisions'
        }
      ];

      await testDb.insert(bill_votes).values(votesData);

      const billVotes = await testDb
        .select()
        .from(bill_votes)
        .where(eq(bill_votes.bill_id, bill.id));

      expect(billVotes).toHaveLength(2);
      expect(billVotes.some(v => v.vote_type === 'for')).toBe(true);
      expect(billVotes.some(v => v.vote_type === 'against')).toBe(true);
    });

    it('should handle public vs private votes', async () => {
      const testUser1 = generateTestData.user();
      const testUser2 = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const votesData = [
        {
          bill_id: bill.id,
          user_id: user1.id,
          vote_type: 'for',
          public_vote: true
        },
        {
          bill_id: bill.id,
          user_id: user2.id,
          vote_type: 'against',
          public_vote: false
        }
      ];

      await testDb.insert(bill_votes).values(votesData);

      const publicVotes = await testDb
        .select()
        .from(bill_votes)
        .where(and(
          eq(bill_votes.bill_id, bill.id),
          eq(bill_votes.public_vote, true)
        ));

      expect(publicVotes).toHaveLength(1);
      expect(publicVotes[0].public_vote).toBe(true);
    });

    it('should query votes by geographic context', async () => {
      const testUser1 = generateTestData.user({ county: 'nairobi' });
      const testUser2 = generateTestData.user({ county: 'kiambu' });
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const votesData = [
        {
          bill_id: bill.id,
          user_id: user1.id,
          vote_type: 'for',
          user_county: 'nairobi'
        },
        {
          bill_id: bill.id,
          user_id: user2.id,
          vote_type: 'against',
          user_county: 'kiambu'
        }
      ];

      await testDb.insert(bill_votes).values(votesData);

      const nairobiVotes = await testDb
        .select()
        .from(bill_votes)
        .where(eq(bill_votes.user_county, 'nairobi'));

      expect(nairobiVotes).toHaveLength(1);
      expect(nairobiVotes[0].user_county).toBe('nairobi');
    });
  });

  describe('Bill Engagement Table', () => {
    it('should track various engagement types', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const engagementData = [
        {
          bill_id: bill.id,
          user_id: user.id,
          engagement_type: 'view',
          session_duration_seconds: 300
        },
        {
          bill_id: bill.id,
          user_id: user.id,
          engagement_type: 'share',
          engagement_value: { platform: 'twitter' }
        },
        {
          bill_id: bill.id,
          user_id: user.id,
          engagement_type: 'track'
        }
      ];

      await testDb.insert(bill_engagement).values(engagementData);

      const userEngagement = await testDb
        .select()
        .from(bill_engagement)
        .where(eq(bill_engagement.user_id, user.id));

      expect(userEngagement).toHaveLength(3);
      expect(userEngagement.some(e => e.engagement_type === 'view')).toBe(true);
      expect(userEngagement.some(e => e.engagement_type === 'share')).toBe(true);
      expect(userEngagement.some(e => e.engagement_type === 'track')).toBe(true);
    });

    it('should enforce unique engagement per user per bill per type', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const engagement1 = {
        bill_id: bill.id,
        user_id: user.id,
        engagement_type: 'view'
      };

      const engagement2 = {
        bill_id: bill.id,
        user_id: user.id,
        engagement_type: 'view' // Same type
      };

      await testDb.insert(bill_engagement).values(engagement1);

      await expect(
        testDb.insert(bill_engagement).values(engagement2)
      ).rejects.toThrow();
    });
  });

  describe('Bill Tracking Preferences Table', () => {
    it('should create tracking preferences for users', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const trackingPref = {
        user_id: user.id,
        bill_id: bill.id,
        notify_on_status_change: true,
        notify_on_new_comments: false,
        notify_on_hearing_scheduled: true,
        notification_frequency: 'daily'
      };

      const [insertedPref] = await testDb
        .insert(bill_tracking_preferences)
        .values(trackingPref)
        .returning();

      expect(insertedPref.user_id).toBe(user.id);
      expect(insertedPref.bill_id).toBe(bill.id);
      expect(insertedPref.notify_on_status_change).toBe(true);
      expect(insertedPref.notify_on_new_comments).toBe(false);
      expect(insertedPref.notification_frequency).toBe('daily');
    });

    it('should handle multiple bills per user', async () => {
      const testUser = generateTestData.user();
      const testBill1 = generateTestData.bill();
      const testBill2 = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill1] = await testDb.insert(bills).values(testBill1).returning();
      const [bill2] = await testDb.insert(bills).values(testBill2).returning();

      const trackingPrefs = [
        {
          user_id: user.id,
          bill_id: bill1.id,
          notify_on_status_change: true
        },
        {
          user_id: user.id,
          bill_id: bill2.id,
          notify_on_status_change: false
        }
      ];

      await testDb.insert(bill_tracking_preferences).values(trackingPrefs);

      const userTracking = await testDb
        .select()
        .from(bill_tracking_preferences)
        .where(eq(bill_tracking_preferences.user_id, user.id));

      expect(userTracking).toHaveLength(2);
    });
  });

  describe('Notifications Table', () => {
    it('should create notifications for users', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const notificationData = {
        user_id: user.id,
        notification_type: 'bill_update',
        title: 'Bill Status Updated',
        message: 'The bill you are tracking has been updated',
        related_bill_id: bill.id,
        delivery_method: 'email'
      };

      const [notification] = await testDb
        .insert(notifications)
        .values(notificationData)
        .returning();

      expect(notification.user_id).toBe(user.id);
      expect(notification.title).toBe('Bill Status Updated');
      expect(notification.related_bill_id).toBe(bill.id);
      expect(notification.is_read).toBe(false);
      expect(notification.delivery_method).toBe('email');
    });

    it('should update notification read status', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const notificationData = {
        user_id: user.id,
        notification_type: 'system_alert',
        title: 'System Update',
        message: 'System will be updated tonight'
      };

      const [notification] = await testDb
        .insert(notifications)
        .values(notificationData)
        .returning();

      // Mark as read
      const [updatedNotification] = await testDb
        .update(notifications)
        .set({ is_read: true, read_at: new Date() })
        .where(eq(notifications.id, notification.id))
        .returning();

      expect(updatedNotification.is_read).toBe(true);
      expect(updatedNotification.read_at).toBeDefined();
    });

    it('should query unread notifications', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const notificationsData = [
        {
          user_id: user.id,
          notification_type: 'bill_update',
          title: 'Update 1',
          is_read: false
        },
        {
          user_id: user.id,
          notification_type: 'bill_update',
          title: 'Update 2',
          is_read: true
        },
        {
          user_id: user.id,
          notification_type: 'bill_update',
          title: 'Update 3',
          is_read: false
        }
      ];

      await testDb.insert(notifications).values(notificationsData);

      const unreadNotifications = await testDb
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.user_id, user.id),
          eq(notifications.is_read, false)
        ));

      expect(unreadNotifications).toHaveLength(2);
    });
  });

  describe('Alert Preferences Table', () => {
    it('should create user alert preferences', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const alertPrefs = {
        user_id: user.id,
        bill_alerts: true,
        comment_alerts: false,
        campaign_alerts: true,
        system_alerts: false,
        email_notifications: true,
        sms_notifications: false,
        digest_frequency: 'weekly',
        quiet_hours: { start: '22:00', end: '08:00' },
        county_alerts: ['nairobi', 'kiambu']
      };

      const [insertedPrefs] = await testDb
        .insert(alert_preferences)
        .values(alertPrefs)
        .returning();

      expect(insertedPrefs.user_id).toBe(user.id);
      expect(insertedPrefs.bill_alerts).toBe(true);
      expect(insertedPrefs.comment_alerts).toBe(false);
      expect(insertedPrefs.digest_frequency).toBe('weekly');
      expect(insertedPrefs.quiet_hours.start).toBe('22:00');
      expect(insertedPrefs.county_alerts).toEqual(['nairobi', 'kiambu']);
    });

    it('should enforce one preference record per user', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const prefs1 = {
        user_id: user.id,
        bill_alerts: true
      };

      const prefs2 = {
        user_id: user.id,
        bill_alerts: false
      };

      await testDb.insert(alert_preferences).values(prefs1);

      await expect(
        testDb.insert(alert_preferences).values(prefs2)
      ).rejects.toThrow();
    });
  });

  describe('Cross-Table Relationships and Aggregations', () => {
    it('should calculate bill engagement metrics', async () => {
      // Create test data
      const testUser1 = generateTestData.user({ county: 'nairobi' });
      const testUser2 = generateTestData.user({ county: 'kiambu' });
      const testBill = generateTestData.bill();

      const [user1] = await testDb.insert(users).values(testUser1).returning();
      const [user2] = await testDb.insert(users).values(testUser2).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Create comments
      const commentsData = [
        generateTestData.comment({ bill_id: bill.id, user_id: user1.id, upvote_count: 5 }),
        generateTestData.comment({ bill_id: bill.id, user_id: user2.id, upvote_count: 3 })
      ];
      await testDb.insert(comments).values(commentsData);

      // Create votes
      const votesData = [
        generateTestData.bill({ bill_id: bill.id, user_id: user1.id, vote_type: 'for' }),
        generateTestData.bill({ bill_id: bill.id, user_id: user2.id, vote_type: 'against' })
      ];
      await testDb.insert(bill_votes).values(votesData);

      // Create engagement records
      const engagementData = [
        generateTestData.bill({ bill_id: bill.id, user_id: user1.id, engagement_type: 'view' }),
        generateTestData.bill({ bill_id: bill.id, user_id: user2.id, engagement_type: 'share' }),
        generateTestData.bill({ bill_id: bill.id, user_id: user1.id, engagement_type: 'track' })
      ];
      await testDb.insert(bill_engagement).values(engagementData);

      // Calculate engagement metrics
      const engagementMetrics = await testDb
        .select({
          bill_id: bills.id,
          bill_title: bills.title,
          comment_count: count(comments.id),
          vote_count: count(bill_votes.id),
          engagement_count: count(bill_engagement.id),
          total_upvotes: sum(comments.upvote_count)
        })
        .from(bills)
        .leftJoin(comments, eq(bills.id, comments.bill_id))
        .leftJoin(bill_votes, eq(bills.id, bill_votes.bill_id))
        .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
        .where(eq(bills.id, bill.id))
        .groupBy(bills.id, bills.title);

      expect(engagementMetrics).toHaveLength(1);
      expect(engagementMetrics[0].comment_count).toBe('2');
      expect(engagementMetrics[0].vote_count).toBe('2');
      expect(engagementMetrics[0].engagement_count).toBe('3');
      expect(engagementMetrics[0].total_upvotes).toBe('8');
    });

    it('should handle comment moderation workflow', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Create comments in different moderation states
      const commentsData = [
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          moderation_status: 'pending'
        }),
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          moderation_status: 'approved'
        }),
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          moderation_status: 'rejected'
        })
      ];

      await testDb.insert(comments).values(commentsData);

      // Moderator approves pending comment
      const pendingComments = await testDb
        .select()
        .from(comments)
        .where(eq(comments.moderation_status, 'pending'));

      expect(pendingComments).toHaveLength(1);

      // Update moderation status
      await testDb
        .update(comments)
        .set({ 
          moderation_status: 'approved',
          moderated_at: new Date()
        })
        .where(eq(comments.id, pendingComments[0].id));

      const updatedPending = await testDb
        .select()
        .from(comments)
        .where(eq(comments.moderation_status, 'pending'));

      expect(updatedPending).toHaveLength(0);

      const approvedComments = await testDb
        .select()
        .from(comments)
        .where(eq(comments.moderation_status, 'approved'));

      expect(approvedComments).toHaveLength(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume comment operations', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Create 100 comments
      const commentsData = Array.from({ length: 100 }, (_, i) => 
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          comment_text: `Comment ${i} about the bill`
        })
      );

      const startTime = Date.now();
      await testDb.insert(comments).values(commentsData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(5000); // Should insert 100 comments quickly

      // Query comments with pagination
      const page1 = await testDb
        .select()
        .from(comments)
        .where(eq(comments.bill_id, bill.id))
        .limit(20)
        .offset(0);

      expect(page1).toHaveLength(20);

      const page2 = await testDb
        .select()
        .from(comments)
        .where(eq(comments.bill_id, bill.id))
        .limit(20)
        .offset(20);

      expect(page2).toHaveLength(20);
    });

    it('should efficiently aggregate engagement metrics', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Create engagement data
      const engagementData = Array.from({ length: 1000 }, (_, i) => ({
        bill_id: bill.id,
        user_id: user.id,
        engagement_type: i % 4 === 0 ? 'view' : 
                        i % 4 === 1 ? 'comment' :
                        i % 4 === 2 ? 'vote' : 'share',
        session_duration_seconds: Math.floor(Math.random() * 600) + 1
      }));

      await testDb.insert(bill_engagement).values(engagementData);

      const startTime = Date.now();
      const engagementStats = await testDb
        .select({
          engagement_type: bill_engagement.engagement_type,
          count: count(bill_engagement.id),
          avg_duration: sql`avg(${bill_engagement.session_duration_seconds})`
        })
        .from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill.id))
        .groupBy(bill_engagement.engagement_type);
      const queryTime = Date.now() - startTime;

      expect(engagementStats).toHaveLength(4);
      expect(queryTime).toBeLessThan(1000); // Should aggregate 1000 records quickly
    });
  });
});


