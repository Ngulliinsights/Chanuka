/**
 * Standalone ML Service Tests
 * 
 * Simple tests that don't depend on complex setup files.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock the logger import at the top level
vi.mock('../../../../shared/core/src/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));
import { realMLAnalysisService } from '@server/services/real-ml.service.ts';

describe('ML Service Standalone Tests', () => {
  const testBillContent = `
    The Digital Privacy Protection Act establishes comprehensive data protection standards
    for technology companies. This legislation requires explicit user consent for data collection,
    mandates data portability rights, and establishes penalties for privacy violations.
    The bill is supported by consumer advocacy groups and privacy organizations, while
    facing opposition from some technology industry associations. Small businesses will
    benefit from reduced compliance costs, while large corporations may face increased
    regulatory oversight.
  `;

  beforeAll(async () => {
    // Initialize the real ML service
    await realMLAnalysisService.initialize();
  });

  afterAll(async () => {
    // Cleanup
    await realMLAnalysisService.cleanup();
  });

  it('should initialize successfully', async () => {
    expect(realMLAnalysisService).toBeDefined();
  });

  it('should analyze stakeholder influence', async () => {
    const result = await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.analysis_type).toBe('stakeholder_influence');
    
    // Check result structure
    expect(result.result).toHaveProperty('primaryInfluencers');
    expect(result.result).toHaveProperty('influenceMetrics');
    expect(result.result).toHaveProperty('trendAnalysis');
    
    console.log('Stakeholder analysis result:', {
      confidence: result.confidence,
      influencersCount: result.result.primaryInfluencers?.length || 0,
      serviceUsed: result.metadata?.serviceUsed
    });
  });

  it('should detect conflicts of interest', async () => {
    const testSponsorData = {
      name: 'Senator Privacy Advocate',
      committees: ['Judiciary Committee', 'Commerce Committee']
    };

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
    
    console.log('Conflict detection result:', {
      confidence: result.confidence,
      conflictsCount: result.result.conflicts?.length || 0,
      overallRisk: result.result.riskAssessment?.overallRisk,
      hasError: result.result.error,
      fullResult: result
    });
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
    
    console.log('Beneficiary analysis result:', {
      confidence: result.confidence,
      directBeneficiaries: result.result.directBeneficiaries?.length || 0,
      indirectBeneficiaries: result.result.indirectBeneficiaries?.length || 0
    });
  });

  it('should handle empty input gracefully', async () => {
    const result = await realMLAnalysisService.analyzeStakeholderInfluence('');

    expect(result).toBeDefined();
    expect(result.confidence).toBe(0);
    expect(result.result.error).toBe(true);
    expect(result.result.fallbackAvailable).toBe(true);
  });

  it('should complete analysis within reasonable time', async () => {
    const startTime = Date.now();
    
    const result = await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);
    
    const responseTime = Date.now() - startTime;
    
    expect(result).toBeDefined();
    expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    
    console.log(`Real ML analysis time: ${responseTime}ms`);
  });
});
