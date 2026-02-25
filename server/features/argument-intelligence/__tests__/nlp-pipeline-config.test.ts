/**
 * NLP Pipeline Configuration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NLPPipelineConfigService } from '../application/nlp-pipeline-config';

describe('NLPPipelineConfigService', () => {
  let service: NLPPipelineConfigService;

  beforeEach(() => {
    service = new NLPPipelineConfigService();
  });

  describe('Configuration Management', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig();

      expect(config.clustering.enabled).toBe(true);
      expect(config.sentiment.enabled).toBe(true);
      expect(config.quality.enabled).toBe(true);
      expect(config.caching.enabled).toBe(true);
    });

    it('should update configuration', () => {
      service.updateConfig({
        clustering: {
          enabled: false,
          similarityThreshold: 0.8,
          minClusterSize: 5,
          maxClusters: 30,
          useSemanticSimilarity: false,
        },
      });

      const config = service.getConfig();
      expect(config.clustering.enabled).toBe(false);
      expect(config.clustering.similarityThreshold).toBe(0.8);
      expect(config.clustering.minClusterSize).toBe(5);
    });

    it('should partially update configuration', () => {
      service.updateConfig({
        sentiment: {
          includeEmotions: true,
        },
      });

      const config = service.getConfig();
      expect(config.sentiment.includeEmotions).toBe(true);
      expect(config.sentiment.enabled).toBe(true); // Should preserve other values
    });
  });

  describe('Sentiment Analysis', () => {
    it('should analyze sentiment', async () => {
      const text = 'This is a great bill that will benefit everyone.';
      const result = await service.analyzeSentiment(text);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('confidence');
      expect(result.score).toBeGreaterThan(0); // Positive sentiment
    });

    it('should throw error when sentiment analysis is disabled', async () => {
      service.updateConfig({
        sentiment: { enabled: false },
      });

      await expect(
        service.analyzeSentiment('Test text')
      ).rejects.toThrow('Sentiment analysis is disabled');
    });

    it('should cache sentiment results', async () => {
      const text = 'This is a test.';
      
      // First call
      const result1 = await service.analyzeSentiment(text);
      
      // Second call should use cache
      const result2 = await service.analyzeSentiment(text);

      expect(result1).toEqual(result2);
    });
  });

  describe('Quality Metrics', () => {
    it('should calculate quality metrics', async () => {
      const text = 'This bill addresses important issues with clear evidence and reasoning.';
      const result = await service.calculateQuality(text);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('dimensions');
      expect(result).toHaveProperty('confidence');
      expect(result.dimensions).toHaveProperty('clarity');
      expect(result.dimensions).toHaveProperty('evidence');
      expect(result.dimensions).toHaveProperty('reasoning');
    });

    it('should throw error when quality calculation is disabled', async () => {
      service.updateConfig({
        quality: { enabled: false },
      });

      await expect(
        service.calculateQuality('Test text')
      ).rejects.toThrow('Quality metrics calculation is disabled');
    });

    it('should cache quality results', async () => {
      const text = 'This is a test.';
      
      // First call
      const result1 = await service.calculateQuality(text);
      
      // Second call should use cache
      const result2 = await service.calculateQuality(text);

      expect(result1).toEqual(result2);
    });
  });

  describe('Clustering', () => {
    it('should cluster arguments', async () => {
      const arguments = [
        {
          id: '1',
          text: 'I support this bill because it helps education.',
          normalizedText: 'i support this bill because it helps education',
          confidence: 0.9,
          user_id: 'user1',
          similarityScore: 0,
          isRepresentative: false,
        },
        {
          id: '2',
          text: 'This bill will improve our schools.',
          normalizedText: 'this bill will improve our schools',
          confidence: 0.85,
          user_id: 'user2',
          similarityScore: 0,
          isRepresentative: false,
        },
        {
          id: '3',
          text: 'I oppose this bill due to cost concerns.',
          normalizedText: 'i oppose this bill due to cost concerns',
          confidence: 0.8,
          user_id: 'user3',
          similarityScore: 0,
          isRepresentative: false,
        },
      ];

      const result = await service.clusterArguments(arguments);

      expect(result).toHaveProperty('clusters');
      expect(result).toHaveProperty('outliers');
      expect(result).toHaveProperty('clusteringMetrics');
      expect(Array.isArray(result.clusters)).toBe(true);
    });

    it('should throw error when clustering is disabled', async () => {
      service.updateConfig({
        clustering: { enabled: false },
      });

      await expect(
        service.clusterArguments([])
      ).rejects.toThrow('Clustering is disabled');
    });
  });

  describe('Statistics', () => {
    it('should track processing statistics', async () => {
      await service.analyzeSentiment('Test text 1');
      await service.calculateQuality('Test text 2');

      const stats = service.getStats();

      expect(stats.sentiment.totalProcessed).toBeGreaterThan(0);
      expect(stats.quality.totalProcessed).toBeGreaterThan(0);
      expect(stats.cache).toHaveProperty('totalHits');
      expect(stats.cache).toHaveProperty('totalMisses');
    });

    it('should calculate average processing time', async () => {
      await service.analyzeSentiment('Test text');
      
      const stats = service.getStats();

      expect(stats.sentiment.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should track cache hit rate', async () => {
      const text = 'Test text';
      
      // First call - cache miss
      await service.analyzeSentiment(text);
      
      // Second call - cache hit
      await service.analyzeSentiment(text);

      const stats = service.getStats();

      expect(stats.cache.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      await service.analyzeSentiment('Test text');
      
      service.clearCaches();

      const stats = service.getStats();
      expect(stats.cache.totalItems).toBe(0);
    });

    it('should prune expired cache entries', async () => {
      await service.analyzeSentiment('Test text');
      
      const pruned = service.pruneExpiredCaches();

      expect(pruned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when all services enabled', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.clustering).toBe(true);
      expect(health.details.sentiment).toBe(true);
      expect(health.details.quality).toBe(true);
      expect(health.details.caching).toBe(true);
    });

    it('should return degraded status when some services disabled', async () => {
      service.updateConfig({
        clustering: { enabled: false },
        sentiment: { enabled: false },
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.clustering).toBe(false);
      expect(health.details.sentiment).toBe(false);
    });

    it('should return unhealthy status when most services disabled', async () => {
      service.updateConfig({
        clustering: { enabled: false },
        sentiment: { enabled: false },
        quality: { enabled: false },
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Service Access', () => {
    it('should provide access to clustering service', () => {
      const clusteringService = service.getClusteringService();
      expect(clusteringService).toBeDefined();
    });

    it('should provide access to sentiment analyzer', () => {
      const sentimentAnalyzer = service.getSentimentAnalyzer();
      expect(sentimentAnalyzer).toBeDefined();
    });

    it('should provide access to quality calculator', () => {
      const qualityCalculator = service.getQualityCalculator();
      expect(qualityCalculator).toBeDefined();
    });
  });
});
