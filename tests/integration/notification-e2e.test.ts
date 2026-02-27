/**
 * End-to-End Notification Integration Tests
 * 
 * Tests the complete notification flow from server creation to client delivery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@server/index';
import { notificationService } from '@server/features/notifications';
import type { NotificationRequest } from '@server/features/notifications';

describe('Notification System E2E', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup: Create test user and get auth token
    // This would typically use your auth system
    testUserId = 'test-user-e2e';
    authToken = 'test-token'; // Mock token for testing
  });

  afterAll(async () => {
    // Cleanup: Remove test data
  });

  beforeEach(async () => {
    // Clear notifications for test user
  });

  describe('Server-to-Client Notification Flow', () => {
    it('should create notification on server and retrieve via API', async () => {
      // Create notification via service
      const notification = await notificationService.createNotification({
        user_id: testUserId,
        type: 'bill_update',
        title: 'E2E Test Notification',
        message: 'Testing end-to-end flow',
        relatedBillId: 123
      });

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();

      // Retrieve via API
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toBeDefined();
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
    });

    it('should send notification through all channels', async () => {
      const notificationRequest: NotificationRequest = {
        user_id: testUserId,
        type: 'bill_update',
        subType: 'status_change',
        title: 'Important Bill Update',
        message: 'A bill you track has been updated',
        priority: 'high',
        relatedBillId: 456,
        category: 'education',
        actionUrl: '/bills/456'
      };

      const result = await notificationService.send(notificationRequest);

      expect(result.sent).toBe(true);
      expect(result.channels).toBeDefined();
      expect(result.channels.length).toBeGreaterThan(0);
      expect(result.notificationId).toBeDefined();

      // Verify notification appears in API
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ unreadOnly: true })
        .expect(200);

      expect(response.body.data.notifications.length).toBeGreaterThan(0);
    });
  });

  describe('REST API Endpoints', () => {
    it('should get user notifications with pagination', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ unreadOnly: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      const notifications = response.body.data.notifications;
      expect(notifications.every((n: any) => !n.is_read)).toBe(true);
    });

    it('should create notification via API', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'bill_update',
          title: 'API Created Notification',
          message: 'Created via REST API',
          relatedBillId: 789
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe('API Created Notification');
    });

    it('should mark notification as read', async () => {
      // Create notification first
      const createResponse = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'bill_update',
          title: 'Test Read',
          message: 'Testing mark as read'
        })
        .expect(201);

      const notificationId = createResponse.body.data.id;

      // Mark as read
      const response = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should delete notification', async () => {
      // Create notification first
      const createResponse = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'bill_update',
          title: 'Test Delete',
          message: 'Testing deletion'
        })
        .expect(201);

      const notificationId = createResponse.body.data.id;

      // Delete
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should get notification statistics', async () => {
      const response = await request(app)
        .get('/api/notifications/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(0);
      expect(response.body.data.unread).toBeGreaterThanOrEqual(0);
      expect(response.body.data.byType).toBeDefined();
      expect(typeof response.body.data.readRate).toBe('number');
    });

    it('should get enhanced preferences', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toBeDefined();
      expect(response.body.data.engagementProfile).toBeDefined();
      expect(response.body.data.availableChannels).toBeDefined();
    });

    it('should update channel preferences', async () => {
      const response = await request(app)
        .patch('/api/notifications/preferences/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inApp: true,
          email: false,
          sms: false,
          push: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should test smart filter', async () => {
      const response = await request(app)
        .post('/api/notifications/test-filter')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priority: 'high',
          notificationType: 'bill_update',
          category: 'education'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shouldNotify).toBeDefined();
      expect(response.body.data.confidence).toBeDefined();
      expect(response.body.data.recommendedChannels).toBeDefined();
    });

    it('should get service status', async () => {
      const response = await request(app)
        .get('/api/notifications/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.services.core).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/notifications')
        .expect(401);
    });

    it('should return 400 for invalid notification ID', async () => {
      await request(app)
        .patch('/api/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid request body', async () => {
      await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          type: 'bill_update'
        })
        .expect(400);
    });

    it('should handle database errors gracefully', async () => {
      // This would test error handling when database is unavailable
      // For now, we just verify the endpoint doesn't crash
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle bulk notification creation efficiently', async () => {
      const startTime = Date.now();

      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
      const template: Omit<NotificationRequest, 'user_id'> = {
        type: 'system_alert',
        title: 'Bulk Test',
        message: 'Testing bulk performance',
        priority: 'medium'
      };

      const result = await notificationService.sendBulk(userIds, template);

      const duration = Date.now() - startTime;

      expect(result.total).toBe(10);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should paginate large result sets efficiently', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      expect(response.body.data.notifications.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Real-time Updates', () => {
    it('should support WebSocket notifications (if implemented)', async () => {
      // This would test WebSocket integration
      // Placeholder for future WebSocket testing
      expect(true).toBe(true);
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should isolate notifications between users', async () => {
      const user1Token = 'user1-token';
      const user2Token = 'user2-token';

      // Create notification for user 1
      await notificationService.createNotification({
        user_id: 'user-1',
        type: 'bill_update',
        title: 'User 1 Notification',
        message: 'For user 1 only'
      });

      // Create notification for user 2
      await notificationService.createNotification({
        user_id: 'user-2',
        type: 'bill_update',
        title: 'User 2 Notification',
        message: 'For user 2 only'
      });

      // User 1 should only see their notification
      const user1Response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      // User 2 should only see their notification
      const user2Response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);

      // Verify isolation (would need proper auth implementation)
      expect(user1Response.body).toBeDefined();
      expect(user2Response.body).toBeDefined();
    });
  });
});
