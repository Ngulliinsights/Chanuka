// Financial Disclosure Workflow Integration Tests
// Tests the complete workflow of the decomposed financial disclosure services

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  disclosureProcessingService,
  financialAnalysisService,
  disclosureValidationService,
  anomalyDetectionService
} from '../services/index.js';
import { financialDisclosureAnalyticsService } from '../financial-disclosure-orchestrator.service.js';

// Mock the database and cache dependencies
vi.mock('@shared/database/connection');
vi.mock('@shared/core');

describe('Financial Disclosure Workflow Integration Tests', () => {
  const mockSponsorId = 123;
  const mockSponsorInfo = {
    id: mockSponsorId,
    name: 'Test Sponsor',
    isActive: true
  };

  const mockDisclosures = [
    {
      id: 1,
      sponsorId: mockSponsorId,
      disclosureType: 'financial',
      description: 'Investment in tech company',
      amount: 500000,
      source: 'TechCorp Inc',
      dateReported: new Date('2024-01-15'),
      isVerified: true,
      completenessScore: 85,
      riskLevel: 'medium' as const,
      lastUpdated: new Date('2024-01-15')
    },
    {
      id: 2,
      sponsorId: mockSponsorId,
      disclosureType: 'business',
      description: 'Board membership',
      amount: 100000,
      source: 'BusinessCorp Ltd',
      dateReported: new Date('2024-02-01'),
      isVerified: false,
      completenessScore: 60,
      riskLevel: 'high' as const,
      lastUpdated: new Date('2024-02-01')
    }
  ];

  const mockAffiliations = [
    {
      id: 1,
      sponsorId: mockSponsorId,
      organization: 'Professional Association',
      type: 'professional' as const,
      isActive: true,
      startDate: '2023-01-01',
      conflictType: null
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock the cache to return null (cache miss)
    const mockCache = {
      getOrSetCache: vi.fn().mockImplementation(async (key, ttl, fn) => await fn())
    };
    
    // Mock database responses
    const mockReadDatabase = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis()
    };

    // Setup specific mock implementations
    require('@shared/core').cache = mockCache;
    require('@shared/database/connection').readDatabase = mockReadDatabase;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Disclosure Processing Service', () => {
    it('should retrieve and enrich disclosure data', async () => {
      // Mock database response
      const mockDb = require('@shared/database/connection').readDatabase;
      mockDb.select.mockReturnValue(mockDisclosures.map(d => ({
        id: d.id,
        sponsorId: d.sponsorId,
        disclosureType: d.disclosureType,
        description: d.description,
        amount: d.amount,
        source: d.source,
        dateReported: d.dateReported,
        isVerified: d.isVerified,
        createdAt: d.lastUpdated
      })));

      const result = await disclosureProcessingService.getDisclosureData(mockSponsorId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        sponsorId: mockSponsorId,
        disclosureType: 'financial',
        amount: 500000,
        source: 'TechCorp Inc'
      });
      expect(result[0].completenessScore).toBeGreaterThan(0);
      expect(result[0].riskLevel).toBeDefined();
    });

    it('should retrieve sponsor basic information', async () => {
      const mockDb = require('@shared/database/connection').readDatabase;
      mockDb.select.mockReturnValue([mockSponsorInfo]);

      const result = await disclosureProcessingService.getSponsorBasicInfo(mockSponsorId);

      expect(result).toEqual(mockSponsorInfo);
    });

    it('should handle sponsor not found error', async () => {
      const mockDb = require('@shared/database/connection').readDatabase;
      mockDb.select.mockReturnValue([]);

      await expect(
        disclosureProcessingService.getSponsorBasicInfo(999)
      ).rejects.toThrow('Sponsor with ID 999 not found');
    });
  });

  describe('Disclosure Validation Service', () => {
    it('should calculate completeness score with all metrics', async () => {
      // Mock the processing service methods
      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockResolvedValue(mockSponsorInfo);
      vi.spyOn(disclosureProcessingService, 'getDisclosureData')
        .mockResolvedValue(mockDisclosures);
      vi.spyOn(disclosureProcessingService, 'getLatestDisclosureDate')
        .mockReturnValue(new Date('2024-02-01'));

      const result = await disclosureValidationService.calculateCompletenessScore(mockSponsorId);

      expect(result).toMatchObject({
        sponsorId: mockSponsorId,
        sponsorName: 'Test Sponsor',
        overallScore: expect.any(Number),
        riskAssessment: expect.stringMatching(/^(low|medium|high|critical)$/),
        temporalTrend: expect.stringMatching(/^(improving|declining|stable)$/),
        recommendations: expect.any(Array)
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.detailedMetrics).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations based on data quality', async () => {
      const lowQualityDisclosures = [
        {
          ...mockDisclosures[0],
          isVerified: false,
          amount: undefined,
          source: undefined
        }
      ];

      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockResolvedValue(mockSponsorInfo);
      vi.spyOn(disclosureProcessingService, 'getDisclosureData')
        .mockResolvedValue(lowQualityDisclosures);
      vi.spyOn(disclosureProcessingService, 'getLatestDisclosureDate')
        .mockReturnValue(new Date('2023-01-01')); // Old data

      const result = await disclosureValidationService.calculateCompletenessScore(mockSponsorId);

      expect(result.overallScore).toBeLessThan(50);
      expect(result.riskAssessment).toBe('critical');
      expect(result.recommendations).toContain(
        expect.stringContaining('missing disclosure types')
      );
    });
  });

  describe('Financial Analysis Service', () => {
    it('should build comprehensive relationship map', async () => {
      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockResolvedValue(mockSponsorInfo);
      vi.spyOn(disclosureProcessingService, 'getDisclosureData')
        .mockResolvedValue(mockDisclosures);
      vi.spyOn(disclosureProcessingService, 'getAffiliations')
        .mockResolvedValue(mockAffiliations);

      const result = await financialAnalysisService.buildRelationshipMap(mockSponsorId);

      expect(result).toMatchObject({
        sponsorId: mockSponsorId,
        sponsorName: 'Test Sponsor',
        relationships: expect.any(Array),
        totalFinancialExposure: expect.any(Number),
        riskAssessment: expect.stringMatching(/^(low|medium|high|critical)$/),
        detectedConflicts: expect.any(Array),
        networkMetrics: expect.objectContaining({
          centralityScore: expect.any(Number),
          clusteringCoefficient: expect.any(Number),
          riskPropagation: expect.any(Number),
          riskConcentration: expect.any(Number)
        })
      });

      expect(result.relationships.length).toBeGreaterThan(0);
      expect(result.totalFinancialExposure).toBe(600000); // Sum of amounts
    });

    it('should detect conflicts of interest', async () => {
      const conflictingDisclosures = [
        {
          ...mockDisclosures[0],
          disclosureType: 'investment',
          source: 'ConflictCorp'
        },
        {
          ...mockDisclosures[1],
          disclosureType: 'business',
          source: 'ConflictCorp' // Same entity, different relationship type
        }
      ];

      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockResolvedValue(mockSponsorInfo);
      vi.spyOn(disclosureProcessingService, 'getDisclosureData')
        .mockResolvedValue(conflictingDisclosures);
      vi.spyOn(disclosureProcessingService, 'getAffiliations')
        .mockResolvedValue([]);

      const result = await financialAnalysisService.buildRelationshipMap(mockSponsorId);

      expect(result.detectedConflicts.length).toBeGreaterThan(0);
      expect(result.detectedConflicts[0]).toMatchObject({
        entity: expect.any(String),
        severity: expect.stringMatching(/^(low|medium|high|critical)$/),
        description: expect.stringContaining('conflict'),
        relatedRelationships: expect.any(Array),
        potentialImpact: expect.any(String)
      });
    });
  });

  describe('Anomaly Detection Service', () => {
    it('should detect amount spikes in disclosure data', async () => {
      const spikeDisclosures = [
        { ...mockDisclosures[0], amount: 100000 },
        { ...mockDisclosures[1], amount: 150000 },
        { id: 3, ...mockDisclosures[0], amount: 5000000 } // Spike
      ];

      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockResolvedValue(mockSponsorInfo);
      vi.spyOn(disclosureProcessingService, 'getDisclosureData')
        .mockResolvedValue(spikeDisclosures);

      const result = await anomalyDetectionService.detectAnomalies(mockSponsorId);

      expect(result).toMatchObject({
        sponsorId: mockSponsorId,
        sponsorName: 'Test Sponsor',
        anomalies: expect.any(Array),
        riskScore: expect.any(Number),
        detectionDate: expect.any(Date)
      });

      const amountSpikeAnomalies = result.anomalies.filter(a => a.type === 'amount_spike');
      expect(amountSpikeAnomalies.length).toBeGreaterThan(0);
      expect(amountSpikeAnomalies[0].severity).toMatch(/^(medium|high|critical)$/);
    });

    it('should detect verification gaps', async () => {
      const unverifiedDisclosures = mockDisclosures.map(d => ({
        ...d,
        isVerified: false,
        amount: 1500000 // High value
      }));

      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockResolvedValue(mockSponsorInfo);
      vi.spyOn(disclosureProcessingService, 'getDisclosureData')
        .mockResolvedValue(unverifiedDisclosures);

      const result = await anomalyDetectionService.detectAnomalies(mockSponsorId);

      const verificationGaps = result.anomalies.filter(a => a.type === 'verification_gap');
      expect(verificationGaps.length).toBeGreaterThan(0);
      expect(verificationGaps[0].severity).toMatch(/^(high|critical)$/);
    });

    it('should calculate system-wide anomaly statistics', async () => {
      // Mock database to return active sponsors
      const mockDb = require('@shared/database/connection').readDatabase;
      mockDb.select.mockReturnValue([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);

      // Mock anomaly detection for each sponsor
      vi.spyOn(anomalyDetectionService, 'detectAnomalies')
        .mockResolvedValueOnce({
          sponsorId: 1,
          sponsorName: 'Sponsor 1',
          anomalies: [
            {
              type: 'amount_spike',
              severity: 'high',
              description: 'Test anomaly',
              affectedDisclosures: [1],
              detectedValue: 1000000,
              expectedRange: { min: 0, max: 500000 },
              recommendation: 'Review'
            }
          ],
          riskScore: 75,
          detectionDate: new Date()
        })
        .mockResolvedValueOnce({
          sponsorId: 2,
          sponsorName: 'Sponsor 2',
          anomalies: [],
          riskScore: 0,
          detectionDate: new Date()
        })
        .mockResolvedValueOnce({
          sponsorId: 3,
          sponsorName: 'Sponsor 3',
          anomalies: [
            {
              type: 'verification_gap',
              severity: 'medium',
              description: 'Test gap',
              affectedDisclosures: [2],
              detectedValue: 2,
              expectedRange: { min: 0, max: 0 },
              recommendation: 'Verify'
            }
          ],
          riskScore: 45,
          detectionDate: new Date()
        });

      const result = await anomalyDetectionService.getSystemAnomalyStats();

      expect(result).toMatchObject({
        totalSponsorsWithAnomalies: 2,
        anomaliesBySeverity: expect.objectContaining({
          low: expect.any(Number),
          medium: expect.any(Number),
          high: expect.any(Number),
          critical: expect.any(Number)
        }),
        anomaliesByType: expect.any(Object),
        averageRiskScore: expect.any(Number)
      });

      expect(result.anomaliesBySeverity.high).toBe(1);
      expect(result.anomaliesBySeverity.medium).toBe(1);
      expect(result.averageRiskScore).toBe(60); // (75 + 45) / 2
    });
  });

  describe('Financial Disclosure Orchestrator Service', () => {
    it('should perform comprehensive analysis combining all services', async () => {
      // Mock all service dependencies
      vi.spyOn(disclosureValidationService, 'calculateCompletenessScore')
        .mockResolvedValue({
          sponsorId: mockSponsorId,
          sponsorName: 'Test Sponsor',
          overallScore: 75,
          requiredDisclosures: 6,
          completedDisclosures: 4,
          missingDisclosures: ['income', 'real_estate'],
          lastUpdateDate: new Date('2024-02-01'),
          riskAssessment: 'medium',
          temporalTrend: 'stable',
          recommendations: ['Complete missing disclosures'],
          detailedMetrics: {
            requiredDisclosureScore: 0.67,
            verificationScore: 0.5,
            recencyScore: 0.8,
            detailScore: 0.9
          }
        });

      vi.spyOn(financialAnalysisService, 'buildRelationshipMap')
        .mockResolvedValue({
          sponsorId: mockSponsorId,
          sponsorName: 'Test Sponsor',
          relationships: [],
          totalFinancialExposure: 600000,
          riskAssessment: 'medium',
          detectedConflicts: [],
          networkMetrics: {
            centralityScore: 45,
            clusteringCoefficient: 30,
            riskPropagation: 20,
            riskConcentration: 40
          },
          lastMappingUpdate: new Date()
        });

      vi.spyOn(anomalyDetectionService, 'detectAnomalies')
        .mockResolvedValue({
          sponsorId: mockSponsorId,
          sponsorName: 'Test Sponsor',
          anomalies: [],
          riskScore: 25,
          detectionDate: new Date()
        });

      const result = await financialDisclosureAnalyticsService.performComprehensiveAnalysis(mockSponsorId);

      expect(result).toMatchObject({
        sponsorId: mockSponsorId,
        completenessReport: expect.any(Object),
        relationshipMapping: expect.any(Object),
        anomalyDetection: expect.any(Object),
        overallRiskAssessment: expect.stringMatching(/^(low|medium|high|critical)$/),
        analysisDate: expect.any(Date)
      });

      expect(result.overallRiskAssessment).toBe('medium');
    });

    it('should generate enhanced dashboard with anomaly statistics', async () => {
      // Mock all required service methods
      vi.spyOn(disclosureProcessingService, 'getSponsorStatistics')
        .mockResolvedValue({ total: 10 });
      vi.spyOn(disclosureProcessingService, 'getDisclosureStatistics')
        .mockResolvedValue({
          total: 100,
          verified: 80,
          pending: 20,
          byType: { financial: 40, business: 30, investment: 30 }
        });
      vi.spyOn(anomalyDetectionService, 'getSystemAnomalyStats')
        .mockResolvedValue({
          totalSponsorsWithAnomalies: 3,
          anomaliesBySeverity: { low: 2, medium: 3, high: 1, critical: 0 },
          anomaliesByType: { amount_spike: 2, verification_gap: 4 },
          averageRiskScore: 35
        });

      // Mock database for risk distribution and performance metrics
      const mockDb = require('@shared/database/connection').readDatabase;
      mockDb.select.mockReturnValue([
        { id: 1, name: 'Sponsor 1' },
        { id: 2, name: 'Sponsor 2' }
      ]);

      vi.spyOn(disclosureValidationService, 'calculateCompletenessScore')
        .mockResolvedValue({
          sponsorId: 1,
          sponsorName: 'Sponsor 1',
          overallScore: 85,
          requiredDisclosures: 6,
          completedDisclosures: 5,
          missingDisclosures: ['income'],
          lastUpdateDate: new Date(),
          riskAssessment: 'low',
          temporalTrend: 'improving',
          recommendations: [],
          detailedMetrics: {
            requiredDisclosureScore: 0.83,
            verificationScore: 0.9,
            recencyScore: 0.95,
            detailScore: 0.8
          }
        });

      const result = await financialDisclosureAnalyticsService.generateDashboard();

      expect(result).toMatchObject({
        generatedAt: expect.any(Date),
        totalSponsors: 10,
        averageCompletenessScore: expect.any(Number),
        disclosureStatistics: expect.any(Object),
        riskDistribution: expect.any(Object),
        topPerformers: expect.any(Array),
        needsAttention: expect.any(Array),
        anomalyStatistics: expect.objectContaining({
          sponsorsWithAnomalies: 3,
          anomaliesBySeverity: expect.any(Object),
          anomaliesByType: expect.any(Object),
          averageRiskScore: 35
        })
      });
    });

    it('should maintain backward compatibility with original API', async () => {
      // Test that all original methods are still available
      expect(typeof financialDisclosureAnalyticsService.getDisclosureData).toBe('function');
      expect(typeof financialDisclosureAnalyticsService.calculateCompletenessScore).toBe('function');
      expect(typeof financialDisclosureAnalyticsService.buildRelationshipMap).toBe('function');
      expect(typeof financialDisclosureAnalyticsService.generateDashboard).toBe('function');

      // Test that new enhanced methods are available
      expect(typeof financialDisclosureAnalyticsService.performComprehensiveAnalysis).toBe('function');
      expect(typeof financialDisclosureAnalyticsService.getSponsorInsights).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDb = require('@shared/database/connection').readDatabase;
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        disclosureProcessingService.getDisclosureData(mockSponsorId)
      ).rejects.toThrow('Failed to retrieve disclosure data for analysis');
    });

    it('should handle cache failures gracefully', async () => {
      const mockCache = require('@shared/core').cache;
      mockCache.getOrSetCache.mockRejectedValue(new Error('Cache unavailable'));

      await expect(
        disclosureValidationService.calculateCompletenessScore(mockSponsorId)
      ).rejects.toThrow('Failed to calculate disclosure completeness');
    });

    it('should handle missing sponsor data gracefully', async () => {
      vi.spyOn(disclosureProcessingService, 'getSponsorBasicInfo')
        .mockRejectedValue(new Error('Sponsor not found'));

      await expect(
        financialDisclosureAnalyticsService.performComprehensiveAnalysis(999)
      ).rejects.toThrow('Failed to perform comprehensive financial analysis');
    });
  });
});