/**
 * Entity Mappings Unit Tests
 * 
 * Comprehensive test suite for all entity mappings covering:
 * - Bidirectional mapping accuracy
 * - Edge case handling
 * - Data validation
 * - Fallback mechanisms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '@client/features/users/domain/entities/user';
import { Notification } from '@client/features/notifications/domain/entities/notification';
import {
  UserEntityMapping,
  CommentEntityMapping,
  BillEntityMapping,
  NotificationEntityMapping
} from '../mappings';
import type { BillEntity } from '../mappings/bill-mapping';
// CommentWithUser type moved to direct service layer

describe('Entity Mappings', () => {
  describe('UserEntityMapping', () => {
    let mapping: UserEntityMapping;

    beforeEach(() => {
      mapping = new UserEntityMapping();
    });

    it('should map database row to User entity correctly', () => {
      const row = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'citizen' as const,
        is_verified: true,
        is_active: true,
        last_login_at: new Date('2024-01-01'),
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2024-01-01')
      };

      const user = mapping.toEntity(row);

      expect(user).toBeInstanceOf(User);
      expect(user.toJSON()).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        name: 'test', // Uses email prefix as name (cleaned for validation)
        role: 'citizen',
        verification_status: 'verified',
        is_active: true,
        last_login_at: new Date('2024-01-01'),
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2024-01-01'),
        reputation_score: 0
      });
    });

    it('should handle unverified user correctly', () => {
      const row = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'citizen' as const,
        is_verified: false,
        is_active: true,
        last_login_at: null,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2024-01-01')
      };

      const user = mapping.toEntity(row);

      expect(user.toJSON().verification_status).toBe('pending');
      expect(user.toJSON().last_login_at).toBeNull();
    });

    it('should provide fallback for corrupted data', () => {
      const corruptedRow = {
        id: null,
        email: null,
        password_hash: 'hashed_password',
        role: null,
        is_verified: false,
        is_active: null,
        last_login_at: null,
        created_at: null,
        updated_at: null
      } as any;

      const user = mapping.toEntity(corruptedRow);

      expect(user.toJSON()).toMatchObject({
        id: 'unknown',
        email: 'unknown@example.com',
        name: 'unknown', // Uses email prefix as name
        role: 'citizen',
        verification_status: 'pending',
        is_active: true,
        reputation_score: 0
      });
    });

    it('should map User entity to database row correctly', () => {
      const user = User.create({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'expert',
        verification_status: 'verified',
        is_active: true,
        last_login_at: new Date('2024-01-01'),
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2024-01-01'),
        reputation_score: 100
      });

      const row = mapping.fromEntity(user);

      expect(row).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        role: 'expert',
        is_verified: true,
        is_active: true,
        last_login_at: new Date('2024-01-01'),
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2024-01-01')
      });
      // password_hash should not be included in fromEntity
      expect(row).not.toHaveProperty('password_hash');
    });
  });

  describe('CommentEntityMapping', () => {
    let mapping: CommentEntityMapping;

    beforeEach(() => {
      mapping = new CommentEntityMapping();
    });

    it('should map database row to Comment entity correctly', () => {
      const row = {
        id: 1,
        bill_id: 123,
        user_id: 'user-123',
        content: 'This is a test comment',
        commentType: 'analysis',
        is_verified: true,
        parent_id: null,
        upvotes: 5,
        downvotes: 1,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      const comment = mapping.toEntity(row);

      expect(comment).toMatchObject({
        id: 1,
        bill_id: 123,
        user_id: 'user-123',
        content: 'This is a test comment',
        commentType: 'analysis',
        is_verified: true,
        parent_id: null,
        upvotes: 5,
        downvotes: 1,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        netVotes: 4,
        replyCount: 0,
        replies: []
      });

      expect(comment.user).toMatchObject({
        id: 'user-123',
        name: 'Unknown User',
        role: 'citizen',
        verification_status: 'pending'
      });
    });

    it('should handle corrupted comment data', () => {
      const corruptedRow = {
        id: null,
        bill_id: null,
        user_id: null,
        content: null,
        commentType: null,
        is_verified: null,
        parent_id: null,
        upvotes: null,
        downvotes: null,
        created_at: null,
        updated_at: null
      } as any;

      const comment = mapping.toEntity(corruptedRow);

      expect(comment).toMatchObject({
        id: 0,
        bill_id: 0,
        user_id: 'unknown',
        content: '',
        commentType: 'general',
        is_verified: false,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0
      });
    });

    it('should map Comment entity to database row correctly', () => {
      const comment: CommentWithUser = {
        id: 1,
        bill_id: 123,
        user_id: 'user-123',
        content: '  This is a test comment  ',
        commentType: 'analysis',
        is_verified: true,
        parent_id: 2,
        upvotes: 5,
        downvotes: 1,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        user: {
          id: 'user-123',
          name: 'Test User',
          role: 'citizen',
          verification_status: 'verified'
        },
        replies: [],
        replyCount: 0,
        netVotes: 4
      };

      const row = mapping.fromEntity(comment);

      expect(row).toMatchObject({
        id: 1,
        bill_id: 123,
        user_id: 'user-123',
        content: 'This is a test comment', // Trimmed
        commentType: 'analysis',
        is_verified: true,
        parent_id: 2,
        upvotes: 5,
        downvotes: 1,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      });
    });
  });

  describe('BillEntityMapping', () => {
    let mapping: BillEntityMapping;

    beforeEach(() => {
      mapping = new BillEntityMapping();
    });

    it('should map database row to Bill entity correctly', () => {
      const row = {
        id: 1,
        bill_number: 'HB-2024-001',
        title: 'Test Bill',
        summary: 'A test bill for testing',
        description: 'Detailed description of the test bill',
        status: 'introduced' as const,
        category: 'healthcare',
        sponsor_id: 1,
        introduced_date: new Date('2024-01-01'),
        last_action_date: new Date('2024-01-15'),
        committee_id: 1,
        view_count: 100,
        share_count: 10,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      };

      const bill = mapping.toEntity(row);

      expect(bill).toEqual(row);
    });

    it('should handle corrupted bill data', () => {
      const corruptedRow = {
        id: null,
        bill_number: null,
        title: null,
        summary: null,
        description: null,
        status: null,
        category: null,
        sponsor_id: null,
        introduced_date: null,
        last_action_date: null,
        committee_id: null,
        view_count: null,
        share_count: null,
        created_at: null,
        updated_at: null
      } as any;

      const bill = mapping.toEntity(corruptedRow);

      expect(bill).toMatchObject({
        id: 0,
        bill_number: 'UNKNOWN',
        title: 'Unknown Bill',
        summary: '',
        description: '',
        status: 'introduced',
        category: 'general',
        sponsor_id: 0,
        view_count: 0,
        share_count: 0
      });
    });

    it('should map Bill entity to database row correctly', () => {
      const bill: BillEntity = {
        id: 1,
        bill_number: '  HB-2024-001  ',
        title: '  Test Bill  ',
        summary: '  A test bill  ',
        description: '  Detailed description  ',
        status: 'introduced' as const,
        category: 'healthcare',
        sponsor_id: 1,
        introduced_date: new Date('2024-01-01'),
        last_action_date: new Date('2024-01-15'),
        committee_id: 1,
        view_count: 100,
        share_count: 10,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      };

      const row = mapping.fromEntity(bill);

      expect(row).toMatchObject({
        id: 1,
        bill_number: 'HB-2024-001', // Trimmed
        title: 'Test Bill', // Trimmed
        summary: 'A test bill', // Trimmed
        description: 'Detailed description', // Trimmed
        status: 'introduced',
        category: 'healthcare',
        sponsor_id: 1,
        view_count: 100,
        share_count: 10
      });
    });
  });

  describe('NotificationEntityMapping', () => {
    let mapping: NotificationEntityMapping;

    beforeEach(() => {
      mapping = new NotificationEntityMapping();
    });

    it('should map database row to Notification entity correctly', () => {
      const row = {
        id: 'notif-123',
        user_id: 'user-123',
        notification_type: 'bill_update' as const,
        title: 'Bill Updated',
        message: 'A bill you are following has been updated',
        related_bill_id: 'bill-123',
        related_comment_id: null,
        related_user_id: null,
        is_read: false,
        read_at: null,
        is_dismissed: false,
        delivery_method: 'email' as const,
        delivery_status: 'pending' as const,
        action_taken: false,
        action_type: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      const notification = mapping.toEntity(row);

      expect(notification).toBeInstanceOf(Notification);
      expect(notification.toJSON()).toMatchObject({
        id: 'notif-123',
        user_id: 'user-123',
        notification_type: 'bill_update',
        title: 'Bill Updated',
        message: 'A bill you are following has been updated',
        related_bill_id: 'bill-123',
        related_comment_id: undefined,
        related_user_id: undefined,
        is_read: false,
        read_at: undefined,
        is_dismissed: false,
        delivery_method: 'email',
        delivery_status: 'pending',
        action_taken: false,
        action_type: undefined,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      });
    });

    it('should handle corrupted notification data', () => {
      const corruptedRow = {
        id: null,
        user_id: null,
        notification_type: null,
        title: null,
        message: null,
        related_bill_id: null,
        related_comment_id: null,
        related_user_id: null,
        is_read: null,
        read_at: null,
        is_dismissed: null,
        delivery_method: null,
        delivery_status: null,
        action_taken: null,
        action_type: null,
        created_at: null,
        updated_at: null
      } as any;

      const notification = mapping.toEntity(corruptedRow);

      expect(notification.toJSON()).toMatchObject({
        id: 'unknown',
        user_id: 'unknown',
        notification_type: 'system',
        title: 'Notification',
        message: '',
        is_read: false,
        is_dismissed: false,
        delivery_method: 'in_app',
        delivery_status: 'pending',
        action_taken: false
      });
    });

    it('should map Notification entity to database row correctly', () => {
      const notification = Notification.create({
        id: 'notif-123',
        user_id: 'user-123',
        notification_type: 'bill_update',
        title: '  Bill Updated  ',
        message: '  A bill has been updated  ',
        related_bill_id: 'bill-123',
        is_read: true,
        read_at: new Date('2024-01-02'),
        is_dismissed: false,
        delivery_method: 'email',
        delivery_status: 'delivered',
        action_taken: true,
        action_type: 'clicked',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02')
      });

      const row = mapping.fromEntity(notification);

      expect(row).toMatchObject({
        id: 'notif-123',
        user_id: 'user-123',
        notification_type: 'bill_update',
        title: 'Bill Updated', // Trimmed
        message: 'A bill has been updated', // Trimmed
        related_bill_id: 'bill-123',
        is_read: true,
        read_at: new Date('2024-01-02'),
        is_dismissed: false,
        delivery_method: 'email',
        delivery_status: 'delivered',
        action_taken: true,
        action_type: 'clicked',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02')
      });
    });
  });
});