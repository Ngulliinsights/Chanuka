import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { realMLAnalysisService } from '@client/services/real-ml.service.js';
import { MLServiceAdapter } from '@client/services/ml-adapter.service.js';

/**
 * Basic ML Service Tests
 * 
 * Simple tests to verify ML service functionality works correctly.
 */

describe('ML Service Basic Tests', () => {
  const testBillContent = `
    The Digital Privacy Protection Act establishes comprehensive data protection standards
    for technology companies. This legislation requires explicit user consent for data collection,
    mandates data portability rights, and establishes penalties for privacy violations.
    The bill is supported by consumer advocacy groups and privacy organizations, while
    facing opposition from some technology industry associations. Small businesses will
    benefit from reduced compliance costs, while large corporations may face increased
    regulatory oversight. The estimated compliance cost is $1.2 billion industry-wide,
    with consumer benefits estimated at $3.5 billion over five years.
  `;

  const testSponsorData = {
    name: 'Senator Privacy Advocate',
    committees: ['Judiciary Committee', 'Commerce Committee'],
    investments: ['Privacy Tech Fund', 'Consumer Rights Foundation']
  };

  beforeAll(async () => {
    // Initialize the real ML service
    await realMLAnalysisService.initialize();
  });

  afterAll(async () => {
    // Cleanup
    await realMLAnalysisService.cleanup();
  });

  describe('Real ML Service Direct Tests', () => {
    it('should initialize successfully', async () => {
      // Service should already be initialized from beforeAll
      expect(realMLAnalysisService).toBeDefined();
    });

    it('should analyze stakeholder influence', async () => {
      const result = await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.analysis_type).toBe('stakeholder_influence');
      expect(result.metadata?.mlTechniques).toBeDefined();
      
      // Check result structure
      expect(result.result).toHaveProperty('primaryInfluencers');
      expect(result.result).toHaveProperty('influenceMetrics');
      expect(result.result).toHaveProperty('trendAnalysis');
      
      // Verify primary influencers structure
      expect(Array.isArray(result.result.primaryInfluencers)).toBe(true);
      if (result.result.primaryInfluencers.length > 0) {
        const influencer = result.result.primaryInfluencers[0];
        expect(influencer).toHaveProperty('name');
        expect(influencer).toHaveProperty('influence');
        expect(influencer).toHaveProperty('sentiment');
        expect(influencer).toHaveProperty('engagement_score');
      }
    });

    it('should detect conflicts of interest', async () => {
      const result = await realMLAnalysisService.detectConflictsOfInterest(
        testBillContent,
        testSponsorData
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.analysis_type).toBe('conflict_detection');
      
      // Check result structure
      expect(result.result).toHaveProperty('conflicts');
      expect(result.result).toHaveProperty('riskAssessment');
      expect(result.result).toHaveProperty('complianceStatus');
      
      // Verify risk assessment structure
      expect(result.result.riskAssessment).toHaveProperty('overallRisk');
      expect(result.result.riskAssessment).toHaveProperty('recommendedActions');
      expect(Array.isArray(result.result.riskAssessment.recommendedActions)).toBe(true);
    });

    it('should analyze beneficiaries', async () => {
      const result = await realMLAnalysisService.analyzeBeneficiaries(testBillContent);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.analysis_type).toBe('beneficiary_analysis');
      
      // Check result structure
      expect(result.result).toHaveProperty('directBeneficiaries');
      expect(result.result).toHaveProperty('indirectBeneficiaries');
      expect(result.result).toHaveProperty('impactAssessment');
      
      // Verify beneficiaries are arrays
      expect(Array.isArray(result.result.directBeneficiaries)).toBe(true);
      expect(Array.isArray(result.result.indirectBeneficiaries)).toBe(true);
      
      // Verify impact assessment structure
      expect(result.result.impactAssessment).toHaveProperty('economicImpact');
      expect(result.result.impactAssessment).toHaveProperty('socialImpact');
    });

    it('should handle empty input gracefully', async () => {
      const result = await realMLAnalysisService.analyzeStakeholderInfluence('');

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0);
      expect(result.result.error).toBe(true);
      expect(result.result.fallbackAvailable).toBe(true);
    });
  });

  describe('ML Service Adapter Tests', () => {
    it('should route to real ML service when enabled', async () => {
      // Note: This test depends on feature flag configuration
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        testBillContent,
        'test-user-1'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.analysis_type).toBe('stakeholder_influence');
      
      // Should have service metadata
      expect(result.metadata?.serviceUsed).toBeDefined();
      expect(['real-ml', 'mock', 'mock-fallback']).toContain(result.metadata?.serviceUsed);
    });

    it('should provide service health information', async () => {
      const health = await MLServiceAdapter.getServiceHealth();

      expect(health).toHaveProperty('mockService');
      expect(health).toHaveProperty('realMLService');
      expect(health).toHaveProperty('featureFlagStatus');

      expect(['healthy', 'degraded', 'unavailable']).toContain(health.mockService);
      expect(['healthy', 'degraded', 'unavailable']).toContain(health.realMLService);
      expect(typeof health.featureFlagStatus).toBe('boolean');
    });
  });

  describe('Performance Tests', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);
      
      const responseTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Real ML analysis time: ${responseTime}ms`);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 3;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        realMLAnalysisService.analyzeStakeholderInfluence(testBillContent)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
      
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 3 concurrent requests
      
      console.log(`Concurrent requests completed in ${totalTime}ms`);
    });
  });

  describe('Text Processing Tests', () => {
    it('should extract entities from text', async () => {
      const result = await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);
      
      expect(result.result.primaryInfluencers).toBeDefined();
      expect(Array.isArray(result.result.primaryInfluencers)).toBe(true);
      
      // Should find some stakeholders in the test content
      expect(result.result.primaryInfluencers.length).toBeGreaterThan(0);
    });

    it('should analyze sentiment correctly', async () => {
      const positiveText = 'This bill will greatly benefit small businesses and support innovation.';
      const negativeText = 'This legislation will burden companies with excessive costs and restrictions.';
      
      const positiveResult = await realMLAnalysisService.analyzeStakeholderInfluence(positiveText);
      const negativeResult = await realMLAnalysisService.analyzeStakeholderInfluence(negativeText);
      
      expect(positiveResult).toBeDefined();
      expect(negativeResult).toBeDefined();
      
      // Both should return valid results
      expect(positiveResult.confidence).toBeGreaterThan(0);
      expect(negativeResult.confidence).toBeGreaterThan(0);
    });

    it('should handle various text lengths', async () => {
      const shortText = 'Technology bill.';
      const longText = testBillContent.repeat(5);
      
      const shortResult = await realMLAnalysisService.analyzeStakeholderInfluence(shortText);
      const longResult = await realMLAnalysisService.analyzeStakeholderInfluence(longText);
      
      expect(shortResult).toBeDefined();
      expect(longResult).toBeDefined();
      
      // Both should complete successfully
      expect(shortResult.analysis_type).toBe('stakeholder_influence');
      expect(longResult.analysis_type).toBe('stakeholder_influence');
    });
  });
});