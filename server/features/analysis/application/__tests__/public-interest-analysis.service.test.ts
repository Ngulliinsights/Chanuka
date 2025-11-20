import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publicInterestAnalysisService, PublicInterestAnalysisService } from '../public-interest-analysis.service';
import { StakeholderAnalysisResult, EconomicImpact, SocialImpact } from '../stakeholder-analysis.service';
import { TransparencyScoreResult } from '../transparency-analysis.service';

describe('PublicInterestAnalysisService', () => {
  let service: PublicInterestAnalysisService;

  beforeEach(() => {
    service = publicInterestAnalysisService; // Or new PublicInterestAnalysisService()
  });

  // Helper to create mock inputs
  const createMockInputs = (
    netImpact: number, confidence: number, equity: number, transparency: number
  ): [StakeholderAnalysisResult, TransparencyScoreResult] => {
    const mockStakeholder: StakeholderAnalysisResult = {
      primaryBeneficiaries: [], negativelyAffected: [], affectedPopulations: [],
      economicImpact: { estimatedCost: 0, estimatedBenefit: netImpact, netImpact, timeframe: 'test', confidence },
      socialImpact: { equityEffect: equity, accessibilityEffect: 50, publicHealthEffect: 50, environmentalEffect: 50 } // Assume others neutral
    };
    const mockTransparency: TransparencyScoreResult = {
      overall: transparency, grade: 'C', breakdown: { sponsorDisclosure: 50, legislativeProcess: 50, financialConflicts: 50, publicAccessibility: 50 }
    };
    return [mockStakeholder, mockTransparency];
  };

  it('should calculate score based on weighted factors', () => {
     // Arrange: Neutral inputs, 50% confidence, 50 transparency -> score around 50
     const [stakeholder, transparency] = createMockInputs(0, 50, 0, 50);

     // Act
     const result = service.calculateScore(stakeholder, transparency);

      // Assert
      // economicNorm ~ 50 * 0.5 = 25
      // socialNorm ~ ( (0+100)/2 + (50+100)/2 + (50+100)/2 + (50+100)/2 ) / 4 = (50+75+75+75)/4 = 68.75
      // transparency = 50
      // Score = (25*0.3) + (68.75*0.4) + (50*0.3) = 7.5 + 27.5 + 15 = 50
      expect(result.score).toBe(50);
      expect(result.assessment).toBe('Moderate');
      expect(result.factors.economicScoreNormalized).toBeCloseTo(25);
      expect(result.factors.socialScoreNormalized).toBeCloseTo(69); // Rounded
      expect(result.factors.transparency_score).toBe(50);
  });


  it('should result in higher score for positive impacts and high transparency', () => {
    const [stakeholder, transparency] = createMockInputs(1_000_000_000, 90, 80, 90); // +$1B net, high confidence, progressive, high transparency
    const result = service.calculateScore(stakeholder, transparency);

    // economicNorm ~ (50 + 50) * 0.9 = 90
    // socialNorm ~ ( (80+100)/2 + 75 + 75 + 75) / 4 = (90+75+75+75)/4 = 78.75
    // transparency = 90
    // Score = (90*0.3) + (78.75*0.4) + (90*0.3) = 27 + 31.5 + 27 = 85.5 -> 86
    expect(result.score).toBe(86);
    expect(result.assessment).toBe('Very High');
  });

  it('should result in lower score for negative impacts and low transparency', () => {
     const [stakeholder, transparency] = createMockInputs(-500_000_000, 40, -50, 30); // -$0.5B net, low confidence, regressive, low transparency
    const result = service.calculateScore(stakeholder, transparency);

     // economicNorm ~ (50 - 25) * 0.4 = 25 * 0.4 = 10
     // socialNorm ~ ( (-50+100)/2 + 75 + 75 + 75) / 4 = (25+75+75+75)/4 = 62.5
     // transparency = 30
     // Score = (10*0.3) + (62.5*0.4) + (30*0.3) = 3 + 25 + 9 = 37
    expect(result.score).toBe(37);
    expect(result.assessment).toBe('Low');
  });

   it('should handle zero net economic impact', () => {
        const [stakeholder, transparency] = createMockInputs(0, 70, 20, 60);
        const result = service.calculateScore(stakeholder, transparency);

        // economicNorm ~ 50 * 0.7 = 35
        // socialNorm ~ ( (20+100)/2 + 75 + 75 + 75) / 4 = (60+75+75+75)/4 = 71.25
        // transparency = 60
        // Score = (35*0.3) + (71.25*0.4) + (60*0.3) = 10.5 + 28.5 + 18 = 57
        expect(result.score).toBe(57);
        expect(result.assessment).toBe('Moderate');
        expect(result.factors.economicScoreNormalized).toBeCloseTo(35);
    });

});

