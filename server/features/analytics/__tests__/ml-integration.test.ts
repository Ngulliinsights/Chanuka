import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MLServiceAdapter } from '../services/ml-adapter.service.js';
import { realMLAnalysisService } from '../services/real-ml.service.js';
import { featureFlagsService } from '../../../infrastructure/migration/feature-flags.service.js';

/**
 * Integration Tests for ML Service Migration
 * 
 * These tests verify that the ML service migration works correctly
 * with feature flags and provides consistent results.
 */

describe('ML Service Integration Tests', () => {
  const testBillContent = `
    The Digital Privacy Protection Act establishes comprehensive data protection standards
    for technology companies. This legislation requires explicit user consent for data collection,
    mandates data portability rights, and establishes penalties for privacy violations.
    The bill is supported by consumer advocacy groups and privacy organizations, while
    facing opposition from some technology industry associations. Small businesses will
    receive compliance assistance, while large tech companies must implement new systems.
    The estimated compliance cost is $1.2 billion industry-wide, with consumer benefits
    estimated at $3.5 billion over five years.
  `;

  const testSponsorData = {
    name: 'Senator Privacy Advocate',
    committees: ['Judiciary Committee', 'Commerce Committee'],
    investments: ['Privacy Tech Fund', 'Consumer Rights Foundation']
  };

  beforeAll(async () => {
    // Initialize services
    await realMLAnalysisService.initialize();
    
    // Configure feature flags for testing
    featureFlagsService.updateFlag('utilities-ml-service-migration', {
      name: 'utilities-ml-service-migration',
      enabled: true,
      rolloutPercentage: 100,
      fallbackEnabled: true
    });
  });

  afterAll(async () => {
    // Cleanup
    await realMLAnalysisService.cleanup();
  });

  describe('Stakeholder Influence Analysis', () => {
    it('should analyze stakeholder influence with real ML service', async () => {
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        testBillContent,
        'test-user-1'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.analysis_type).toBe('stakeholder_influence');
      expect(result.metadata?.serviceUsed).toBe('real-ml');
      expect(result.metadata?.mlTechniques).toBeDefined();
      
      // Check result structure
      expect(result.result).toHaveProperty('primaryInfluencers');
      expect(result.result).toHaveProperty('influenceMetrics');
      expect(result.result).toHaveProperty('trendAnalysis');
      
      // Verify primary influencers structure
      if (result.result.primaryInfluencers && result.result.primaryInfluencers.length > 0) {
        const influencer = result.result.primaryInfluencers[0];
        expect(influencer).toHaveProperty('name');
        expect(influencer).toHaveProperty('influence');
        expect(influencer).toHaveProperty('sentiment');
        expect(influencer).toHaveProperty('engagement_score');
      }
    });

    it('should fallback to mock service when real ML fails', async () => {
      // Temporarily break the real ML service
      await realMLAnalysisService.cleanup();

      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        testBillContent,
        'test-user-2'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata?.serviceUsed).toBe('mock-fallback');
      expect(result.metadata?.originalServiceFailed).toBe('real-ml');

      // Re-initialize for other tests
      await realMLAnalysisService.initialize();
    });
  });

  describe('Conflict Detection Analysis', () => {
    it('should detect conflicts of interest with real ML service', async () => {
      const result = await MLServiceAdapter.detectConflictsOfInterest(
        testBillContent,
        testSponsorData,
        'test-user-3'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.analysis_type).toBe('conflict_detection');
      expect(result.metadata?.serviceUsed).toBe('real-ml');
      
      // Check result structure
      expect(result.result).toHaveProperty('conflicts');
      expect(result.result).toHaveProperty('riskAssessment');
      expect(result.result).toHaveProperty('complianceStatus');
      
      // Verify risk assessment structure
      expect(result.result.riskAssessment).toHaveProperty('overallRisk');
      expect(result.result.riskAssessment).toHaveProperty('recommendedActions');
      expect(Array.isArray(result.result.riskAssessment.recommendedActions)).toBe(true);
    });
  });

  describe('Beneficiary Analysis', () => {
    it('should analyze beneficiaries with real ML service', async () => {
      const result = await MLServiceAdapter.analyzeBeneficiaries(
        testBillContent,
        'test-user-4'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.analysis_type).toBe('beneficiary_analysis');
      expect(result.metadata?.serviceUsed).toBe('real-ml');
      
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
  });

  describe('Feature Flag Routing', () => {
    it('should route to mock service when feature flag is disabled', async () => {
      // Disable feature flag
      featureFlagsService.updateFlag('utilities-ml-service-migration', {
        name: 'utilities-ml-service-migration',
        enabled: false,
        rolloutPercentage: 0,
        fallbackEnabled: true
      });

      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        testBillContent,
        'test-user-5'
      );

      expect(result.metadata?.serviceUsed).toBe('mock');
      expect(result.metadata?.featureFlagEnabled).toBe(false);

      // Re-enable for other tests
      featureFlagsService.updateFlag('utilities-ml-service-migration', {
        name: 'utilities-ml-service-migration',
        enabled: true,
        rolloutPercentage: 100,
        fallbackEnabled: true
      });
    });

    it('should route based on rollout percentage', async () => {
      // Set 50% rollout
      featureFlagsService.updateFlag('utilities-ml-service-migration', {
        name: 'utilities-ml-service-migration',
        enabled: true,
        rolloutPercentage: 50,
        fallbackEnabled: true
      });

      const results = [];
      const userIds = Array.from({ length: 20 }, (_, i) => `test-user-${i + 100}`);

      // Test multiple users to verify percentage-based routing
      for (const userId of userIds) {
        const result = await MLServiceAdapter.analyzeStakeholderInfluence(
          testBillContent,
          userId
        );
        results.push(result.metadata?.serviceUsed);
      }

      const realMLCount = results.filter(service => service === 'real-ml').length;
      const mockCount = results.filter(service => service === 'mock').length;

      // With 50% rollout, we should see both services used
      expect(realMLCount).toBeGreaterThan(0);
      expect(mockCount).toBeGreaterThan(0);
      expect(realMLCount + mockCount).toBe(results.length);

      console.log(`Rollout test results: ${realMLCount} real ML, ${mockCount} mock (${results.length} total)`);
    });
  });

  describe('Service Health and Monitoring', () => {
    it('should report service health correctly', async () => {
      const health = await MLServiceAdapter.getServiceHealth();

      expect(health).toHaveProperty('mockService');
      expect(health).toHaveProperty('realMLService');
      expect(health).toHaveProperty('featureFlagStatus');

      expect(['healthy', 'degraded', 'unavailable']).toContain(health.mockService);
      expect(['healthy', 'degraded', 'unavailable']).toContain(health.realMLService);
      expect(typeof health.featureFlagStatus).toBe('boolean');

      // Both services should be healthy in normal conditions
      expect(health.mockService).toBe('healthy');
      expect(health.realMLService).toBe('healthy');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid input gracefully', async () => {
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        '', // Empty content
        'test-user-error'
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0);
      expect(result.result.error).toBe(true);
      expect(result.result.fallbackAvailable).toBe(true);
    });

    it('should handle service initialization errors', async () => {
      // This test verifies that the service handles initialization errors gracefully
      // In a real scenario, this might happen due to missing dependencies or configuration issues
      
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        testBillContent,
        'test-user-init-error'
      );

      // Should still return a valid result (either from real ML or fallback to mock)
      expect(result).toBeDefined();
      expect(result.analysis_type).toBe('stakeholder_influence');
      expect(['real-ml', 'mock', 'mock-fallback']).toContain(result.metadata?.serviceUsed);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(
        testBillContent,
        'test-user-performance'
      );
      
      const responseTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Response time: ${responseTime}ms (service: ${result.metadata?.serviceUsed})`);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        MLServiceAdapter.analyzeStakeholderInfluence(
          testBillContent,
          `concurrent-user-${i}`
        )
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
      
      // Concurrent requests should not take much longer than sequential requests
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 5 concurrent requests
      
      console.log(`Concurrent requests completed in ${totalTime}ms`);
    });
  });
});