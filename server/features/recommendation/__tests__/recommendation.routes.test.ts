/**
 * Recommendation Routes Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import recommendationRouter from '../application/recommendation.routes';
import { RecommendationService } from '../application/RecommendationService';
import { integrationMonitor } from '@server/features/monitoring/domain/integration-monitor.service';

// Mock dependencies
vi.mock('../application/RecommendationService');
vi.mock('@server/features/monitoring/domain/integration-monitor.service');
vi.mock('@server/infrastructure/observability');
vi.mock('@server/infrastructure/observability/monitoring/error-tracker');

describe('Recommendation Routes', () => {
  let app: express.Application;
  let mockRecommendationService: any;
  
  beforeEach(() => {
    // Setup express app
    app = express();
    app.use(express.json());
    
    // Mock user authentication
    app.use((req: any, res, next) => {
      req.user = { id: 'test-user-123' };
      req.requestId = 'test-request-123';
      next();
    });
    
    app.use('/api/recommendation', recommendationRouter);
    
    // Setup mocks
    mockRecommendationService = {
      getPersonalizedRecommendations: vi.fn(),
      getSimilarBills: vi.fn(),
      getTrendingBills: vi.fn(),
      getCollaborativeRecommendations: vi.fn(),
      trackEngagement: vi.fn(),
      getCacheStats: vi.fn(),
    };
    
    vi.mocked(RecommendationService).mockImplementation(() => mockRecommendationService);
    
    vi.mocked(integrationMonitor.recordMetrics).mockResolvedValue(undefined);
    vi.mocked(integrationMonitor.logEvent).mockResolvedValue(undefined);
  });
  
  describe('GET /api/recommendation/personalized', () => {
    it('should return personalized recommendations for authenticated user', async () => {
      const mockRecommendations = [
        { id: 1, title: 'Bill 1', score: 0.9 },
        { id: 2, title: 'Bill 2', score: 0.8 },
      ];
      
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue(
        mockRecommendations
      );
      
      const response = await request(app)
        .get('/api/recommendation/personalized')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
      expect(response.body.count).toBe(2);
      expect(response.body.responseTime).toBeGreaterThan(0);
      
      expect(mockRecommendationService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'test-user-123',
        10
      );
    });
    
    it('should respect limit parameter', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue([]);
      
      await request(app)
        .get('/api/recommendation/personalized?limit=5')
        .expect(200);
      
      expect(mockRecommendationService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'test-user-123',
        5
      );
    });
    
    it('should cap limit at 50', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue([]);
      
      await request(app)
        .get('/api/recommendation/personalized?limit=100')
        .expect(200);
      
      expect(mockRecommendationService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'test-user-123',
        50
      );
    });
    
    it('should return 401 if user not authenticated', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use('/api/recommendation', recommendationRouter);
      
      const response = await request(unauthApp)
        .get('/api/recommendation/personalized')
        .expect(401);
      
      expect(response.body.error).toBe('Authentication required');
    });
    
    it('should handle errors gracefully', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockRejectedValue(
        new Error('Database error')
      );
      
      const response = await request(app)
        .get('/api/recommendation/personalized')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate recommendations');
    });
  });
  
  describe('GET /api/recommendation/similar/:bill_id', () => {
    it('should return similar bills', async () => {
      const mockSimilarBills = [
        { id: 2, title: 'Similar Bill 1', similarityScore: 0.85 },
        { id: 3, title: 'Similar Bill 2', similarityScore: 0.75 },
      ];
      
      mockRecommendationService.getSimilarBills.mockResolvedValue(mockSimilarBills);
      
      const response = await request(app)
        .get('/api/recommendation/similar/1')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSimilarBills);
      expect(response.body.count).toBe(2);
      
      expect(mockRecommendationService.getSimilarBills).toHaveBeenCalledWith(1, 5);
    });
    
    it('should return 400 for invalid bill ID', async () => {
      const response = await request(app)
        .get('/api/recommendation/similar/invalid')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid bill ID');
    });
    
    it('should respect limit parameter', async () => {
      mockRecommendationService.getSimilarBills.mockResolvedValue([]);
      
      await request(app)
        .get('/api/recommendation/similar/1?limit=10')
        .expect(200);
      
      expect(mockRecommendationService.getSimilarBills).toHaveBeenCalledWith(1, 10);
    });
  });
  
  describe('GET /api/recommendation/trending', () => {
    it('should return trending bills', async () => {
      const mockTrendingBills = [
        { id: 1, title: 'Trending Bill 1', trendScore: 95 },
        { id: 2, title: 'Trending Bill 2', trendScore: 85 },
      ];
      
      mockRecommendationService.getTrendingBills.mockResolvedValue(mockTrendingBills);
      
      const response = await request(app)
        .get('/api/recommendation/trending')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTrendingBills);
      expect(response.body.count).toBe(2);
      
      expect(mockRecommendationService.getTrendingBills).toHaveBeenCalledWith(7, 10);
    });
    
    it('should respect days and limit parameters', async () => {
      mockRecommendationService.getTrendingBills.mockResolvedValue([]);
      
      await request(app)
        .get('/api/recommendation/trending?days=30&limit=20')
        .expect(200);
      
      expect(mockRecommendationService.getTrendingBills).toHaveBeenCalledWith(30, 20);
    });
  });
  
  describe('GET /api/recommendation/collaborative', () => {
    it('should return collaborative recommendations', async () => {
      const mockRecommendations = [
        { id: 1, title: 'Collaborative Bill 1', score: 0.9 },
        { id: 2, title: 'Collaborative Bill 2', score: 0.8 },
      ];
      
      mockRecommendationService.getCollaborativeRecommendations.mockResolvedValue(
        mockRecommendations
      );
      
      const response = await request(app)
        .get('/api/recommendation/collaborative')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
      
      expect(mockRecommendationService.getCollaborativeRecommendations).toHaveBeenCalledWith(
        'test-user-123',
        10
      );
    });
    
    it('should return 401 if user not authenticated', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use('/api/recommendation', recommendationRouter);
      
      const response = await request(unauthApp)
        .get('/api/recommendation/collaborative')
        .expect(401);
      
      expect(response.body.error).toBe('Authentication required');
    });
  });
  
  describe('POST /api/recommendation/track-engagement', () => {
    it('should track user engagement', async () => {
      mockRecommendationService.trackEngagement.mockResolvedValue(undefined);
      
      const response = await request(app)
        .post('/api/recommendation/track-engagement')
        .send({
          bill_id: 1,
          engagement_type: 'view',
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Engagement tracked successfully');
      
      expect(mockRecommendationService.trackEngagement).toHaveBeenCalledWith(
        'test-user-123',
        1,
        'view'
      );
    });
    
    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/recommendation/track-engagement')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Missing required fields');
    });
    
    it('should return 400 for invalid engagement type', async () => {
      const response = await request(app)
        .post('/api/recommendation/track-engagement')
        .send({
          bill_id: 1,
          engagement_type: 'invalid',
        })
        .expect(400);
      
      expect(response.body.error).toBe('Invalid engagement type');
    });
    
    it('should return 401 if user not authenticated', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use('/api/recommendation', recommendationRouter);
      
      const response = await request(unauthApp)
        .post('/api/recommendation/track-engagement')
        .send({
          bill_id: 1,
          engagement_type: 'view',
        })
        .expect(401);
      
      expect(response.body.error).toBe('Authentication required');
    });
  });
  
  describe('GET /api/recommendation/health', () => {
    it('should return health status', async () => {
      mockRecommendationService.getCacheStats.mockReturnValue({
        size: 10,
        keys: ['key1', 'key2', 'key3'],
      });
      
      const response = await request(app)
        .get('/api/recommendation/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.cache.size).toBe(10);
      expect(response.body.cache.keys).toBe(3);
    });
    
    it('should return unhealthy status on error', async () => {
      mockRecommendationService.getCacheStats.mockImplementation(() => {
        throw new Error('Cache error');
      });
      
      const response = await request(app)
        .get('/api/recommendation/health')
        .expect(500);
      
      expect(response.body.status).toBe('unhealthy');
    });
  });
  
  describe('Metrics tracking', () => {
    it('should record metrics for successful requests', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue([]);
      
      await request(app)
        .get('/api/recommendation/personalized')
        .expect(200);
      
      // Wait for async metrics recording
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(integrationMonitor.recordMetrics).toHaveBeenCalled();
    });
    
    it('should log events for requests', async () => {
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue([]);
      
      await request(app)
        .get('/api/recommendation/personalized')
        .expect(200);
      
      expect(integrationMonitor.logEvent).toHaveBeenCalledWith(
        'recommendation-engine',
        'info',
        'recommendation',
        'Personalized recommendations generated',
        expect.any(Object),
        'test-user-123',
        'test-request-123'
      );
    });
  });
});
