import request from 'supertest';
import express from 'express';
import { router as financialDisclosureRouter } from '../features/analytics/financial-disclosure.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/financial-disclosure', financialDisclosureRouter);

describe('Financial Disclosure API Endpoints', () => {
  describe('GET /api/financial-disclosure/disclosures', () => {
    it('should return financial disclosures with pagination', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/disclosures')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('disclosures');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.disclosures)).toBe(true);
    });

    it('should filter disclosures by sponsor ID', async () => {
      const sponsorId = 1;
      const response = await request(app)
        .get('/api/financial-disclosure/disclosures')
        .query({ sponsorId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sponsorId).toBe(sponsorId);
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/disclosures')
        .query({ limit: 'invalid', offset: 'invalid' });

      // Should still work with default values
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/financial-disclosure/relationships/:sponsorId', () => {
    it('should return financial relationships for valid sponsor', async () => {
      const sponsorId = 1;
      const response = await request(app)
        .get(`/api/financial-disclosure/relationships/${sponsorId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sponsorId', sponsorId);
      expect(response.body.data).toHaveProperty('relationships');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.relationships)).toBe(true);
    });

    it('should handle invalid sponsor ID', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/relationships/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should respect cache control headers', async () => {
      const sponsorId = 1;
      const response = await request(app)
        .get(`/api/financial-disclosure/relationships/${sponsorId}`)
        .set('Cache-Control', 'no-cache')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/financial-disclosure/completeness/:sponsorId', () => {
    it('should return completeness report for valid sponsor', async () => {
      const sponsorId = 1;
      const response = await request(app)
        .get(`/api/financial-disclosure/completeness/${sponsorId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sponsorId', sponsorId);
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('calculatedAt');
    });

    it('should handle invalid sponsor ID', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/completeness/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/financial-disclosure/alerts', () => {
    it('should create new disclosure alert', async () => {
      const alertData = {
        type: 'new_disclosure',
        sponsorId: 1,
        description: 'Test alert description',
        severity: 'info'
      };

      const response = await request(app)
        .post('/api/financial-disclosure/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('type', alertData.type);
      expect(response.body.data).toHaveProperty('sponsorId', alertData.sponsorId);
    });

    it('should validate alert data', async () => {
      const invalidAlertData = {
        type: 'invalid_type',
        sponsorId: 'invalid',
        description: 'x', // Too short
        severity: 'invalid_severity'
      };

      const response = await request(app)
        .post('/api/financial-disclosure/alerts')
        .send(invalidAlertData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/financial-disclosure/alerts/:sponsorId', () => {
    it('should return alerts for valid sponsor', async () => {
      const sponsorId = 1;
      const response = await request(app)
        .get(`/api/financial-disclosure/alerts/${sponsorId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sponsorId', sponsorId);
      expect(response.body.data).toHaveProperty('alerts');
      expect(Array.isArray(response.body.data.alerts)).toBe(true);
    });

    it('should filter alerts by type and severity', async () => {
      const sponsorId = 1;
      const response = await request(app)
        .get(`/api/financial-disclosure/alerts/${sponsorId}`)
        .query({ type: 'missing_disclosure', severity: 'critical', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters).toHaveProperty('type', 'missing_disclosure');
      expect(response.body.data.filters).toHaveProperty('severity', 'critical');
    });
  });

  describe('GET /api/financial-disclosure/dashboard', () => {
    it('should return financial transparency dashboard', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalSponsors');
      expect(response.body.data).toHaveProperty('averageCompletenessScore');
      expect(response.body.data).toHaveProperty('disclosureStats');
      expect(response.body.data).toHaveProperty('generatedAt');
    });
  });

  describe('POST /api/financial-disclosure/monitoring/start', () => {
    it('should start automated monitoring', async () => {
      const response = await request(app)
        .post('/api/financial-disclosure/monitoring/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('startedAt');
    });
  });

  describe('POST /api/financial-disclosure/monitoring/stop', () => {
    it('should stop automated monitoring', async () => {
      const response = await request(app)
        .post('/api/financial-disclosure/monitoring/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('stoppedAt');
    });
  });

  describe('POST /api/financial-disclosure/monitoring/check', () => {
    it('should perform manual monitoring check', async () => {
      const response = await request(app)
        .post('/api/financial-disclosure/monitoring/check')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('alertsGenerated');
      expect(response.body.data).toHaveProperty('checkedAt');
    });
  });

  describe('GET /api/financial-disclosure/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/financial-disclosure/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('checks');
      expect(Array.isArray(response.body.data.checks)).toBe(true);
    });
  });
});