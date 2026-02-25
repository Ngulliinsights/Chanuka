/**
 * Advocacy Coordination Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '@server/app';

describe('Advocacy Coordination Integration Tests', () => {
  const testUserId = 'test-user-123';
  const testBillId = 'test-bill-456';
  let testCampaignId: string;
  let testActionId: string;

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Campaign Management', () => {
    describe('POST /api/advocacy/campaigns', () => {
      it('should create a campaign successfully', async () => {
        const response = await request(app)
          .post('/api/advocacy/campaigns')
          .send({
            title: 'Test Campaign',
            description: 'Test campaign description',
            bill_id: testBillId,
            goals: ['Goal 1', 'Goal 2'],
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_public: true,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.campaign).toBeDefined();
        expect(response.body.campaign.title).toBe('Test Campaign');
        
        testCampaignId = response.body.campaign.id;
      });

      it('should return 400 for invalid campaign data', async () => {
        const response = await request(app)
          .post('/api/advocacy/campaigns')
          .send({
            // Missing required fields
            title: 'Test Campaign',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/advocacy/campaigns', () => {
      it('should get campaigns list', async () => {
        const response = await request(app)
          .get('/api/advocacy/campaigns')
          .query({ page: 1, limit: 20 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.campaigns)).toBe(true);
      });

      it('should filter campaigns by status', async () => {
        const response = await request(app)
          .get('/api/advocacy/campaigns')
          .query({ status: 'active' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/advocacy/campaigns/:id', () => {
      it('should get single campaign', async () => {
        const response = await request(app)
          .get(`/api/advocacy/campaigns/${testCampaignId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.campaign).toBeDefined();
        expect(response.body.campaign.id).toBe(testCampaignId);
      });

      it('should return 404 for non-existent campaign', async () => {
        const response = await request(app)
          .get('/api/advocacy/campaigns/non-existent-id');

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/advocacy/campaigns/:id', () => {
      it('should update campaign', async () => {
        const response = await request(app)
          .put(`/api/advocacy/campaigns/${testCampaignId}`)
          .send({
            description: 'Updated description',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.campaign.description).toBe('Updated description');
      });
    });

    describe('POST /api/advocacy/campaigns/:id/join', () => {
      it('should join campaign', async () => {
        const response = await request(app)
          .post(`/api/advocacy/campaigns/${testCampaignId}/join`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/advocacy/campaigns/:id/metrics', () => {
      it('should get campaign metrics', async () => {
        const response = await request(app)
          .get(`/api/advocacy/campaigns/${testCampaignId}/metrics`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.metrics).toBeDefined();
      });
    });
  });

  describe('Action Coordination', () => {
    describe('POST /api/advocacy/actions', () => {
      it('should create action successfully', async () => {
        const response = await request(app)
          .post('/api/advocacy/actions')
          .send({
            campaign_id: testCampaignId,
            user_id: testUserId,
            actionType: 'contact_representative',
            title: 'Contact your MP',
            description: 'Send an email to your MP',
            priority: 'high',
            estimatedTimeMinutes: 15,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.action).toBeDefined();
        
        testActionId = response.body.action.id;
      });
    });

    describe('GET /api/advocacy/users/:userId/actions', () => {
      it('should get user actions', async () => {
        const response = await request(app)
          .get(`/api/advocacy/users/${testUserId}/actions`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.actions)).toBe(true);
      });
    });

    describe('POST /api/advocacy/actions/:id/start', () => {
      it('should start action', async () => {
        const response = await request(app)
          .post(`/api/advocacy/actions/${testActionId}/start`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.action.status).toBe('in_progress');
      });
    });

    describe('POST /api/advocacy/actions/:id/complete', () => {
      it('should complete action', async () => {
        const response = await request(app)
          .post(`/api/advocacy/actions/${testActionId}/complete`)
          .send({
            outcome: {
              successful: true,
              impactNotes: 'MP responded positively',
            },
            actualTimeMinutes: 20,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.action.status).toBe('completed');
      });
    });

    describe('GET /api/advocacy/action-templates', () => {
      it('should get action templates', async () => {
        const response = await request(app)
          .get('/api/advocacy/action-templates');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.templates)).toBe(true);
      });
    });
  });

  describe('Impact Tracking', () => {
    describe('POST /api/advocacy/campaigns/:id/impact', () => {
      it('should record impact', async () => {
        const response = await request(app)
          .post(`/api/advocacy/campaigns/${testCampaignId}/impact`)
          .send({
            impactType: 'media_attention',
            value: 85,
            description: 'Featured in national newspaper',
            evidenceLinks: ['https://example.com/article'],
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.impact).toBeDefined();
      });
    });

    describe('GET /api/advocacy/campaigns/:id/impact', () => {
      it('should get campaign impact metrics', async () => {
        const response = await request(app)
          .get(`/api/advocacy/campaigns/${testCampaignId}/impact`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.metrics)).toBe(true);
      });
    });

    describe('GET /api/advocacy/campaigns/:id/impact/assessment', () => {
      it('should generate impact assessment', async () => {
        const response = await request(app)
          .get(`/api/advocacy/campaigns/${testCampaignId}/impact/assessment`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.assessment).toBeDefined();
        expect(response.body.assessment.outcomes).toBeDefined();
        expect(response.body.assessment.attribution).toBeDefined();
      });
    });

    describe('GET /api/advocacy/impact/statistics', () => {
      it('should get impact statistics', async () => {
        const response = await request(app)
          .get('/api/advocacy/impact/statistics');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statistics).toBeDefined();
      });
    });
  });

  describe('Coalition Building', () => {
    describe('GET /api/advocacy/users/:userId/coalition-opportunities', () => {
      it('should find coalition opportunities', async () => {
        const response = await request(app)
          .get(`/api/advocacy/users/${testUserId}/coalition-opportunities`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.opportunities)).toBe(true);
      });
    });

    describe('GET /api/advocacy/campaigns/:id/coalition-recommendations', () => {
      it('should get coalition recommendations', async () => {
        const response = await request(app)
          .get(`/api/advocacy/campaigns/${testCampaignId}/coalition-recommendations`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.recommendations)).toBe(true);
      });
    });
  });

  describe('Statistics and Analytics', () => {
    describe('GET /api/advocacy/statistics/campaigns', () => {
      it('should get campaign statistics', async () => {
        const response = await request(app)
          .get('/api/advocacy/statistics/campaigns');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statistics).toBeDefined();
      });
    });

    describe('GET /api/advocacy/analytics/actions', () => {
      it('should get action analytics', async () => {
        const response = await request(app)
          .get('/api/advocacy/analytics/actions');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.analytics).toBeDefined();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle campaign creation within performance target', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/advocacy/campaigns')
        .send({
          title: 'Performance Test Campaign',
          description: 'Testing performance',
          bill_id: testBillId,
          goals: ['Test goal'],
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_public: true,
        });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(500); // < 500ms
    });

    it('should handle campaign list retrieval within performance target', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/advocacy/campaigns')
        .query({ page: 1, limit: 20 });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // < 500ms
    });
  });
});
