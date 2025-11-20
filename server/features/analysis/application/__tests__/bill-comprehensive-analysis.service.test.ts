import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { billComprehensiveAnalysisService, BillComprehensiveAnalysisService } from '../bill-comprehensive-analysis.service';
import { constitutionalAnalysisService } from '../constitutional-analysis.service';
import { stakeholderAnalysisService } from '../stakeholder-analysis.service';
import { transparencyAnalysisService } from '../transparency-analysis.service';
import { publicInterestAnalysisService } from '../public-interest-analysis.service';
import { sponsorConflictAnalysisService } from '../../../sponsors/application/sponsor-conflict-analysis.service'; // Updated path
import { analysisRepository } from '../../infrastructure/repositories/analysis-repository-impl'; // Import repo to mock save
import { readDatabase } from '@shared/database/connection'; // Mock DB for sponsor lookup
import * as schema from '@shared/schema';

// --- Mock Dependencies ---
vi.mock('../../../../db', () => ({ readDatabase: vi.fn() }));
vi.mock('../constitutional-analysis.service');
vi.mock('../stakeholder-analysis.service');
vi.mock('../transparency-analysis.service');
vi.mock('../public-interest-analysis.service');
vi.mock('../../../sponsors/application/sponsor-conflict-analysis.service'); // Updated path
vi.mock('../../infrastructure/repositories/analysis-repository-impl');

// Mock DB return for fetching sponsors
const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ sponsor_id: 10 }]), // Mock returning one sponsor
};

describe('BillComprehensiveAnalysisService', () => {
  let service: BillComprehensiveAnalysisService;
  const mockBillId = 1;

  // Mock results from sub-services
  const mockConstitutionalResult = { constitutionalityScore: 70, concerns: [], precedents: [], riskAssessment: 'low' as const };
  const mockStakeholderResult = { primaryBeneficiaries: [], negativelyAffected: [], affectedPopulations: [], economicImpact: { estimatedCost: 100, estimatedBenefit: 150, netImpact: 50, timeframe: 'test', confidence: 80 }, socialImpact: { equityEffect: 10, accessibilityEffect: 20, publicHealthEffect: 5, environmentalEffect: -5 } };
  const mockConflictSummary = { overallRisk: 'low' as const, affectedSponsorsCount: 1, totalFinancialExposureEstimate: 1000, directConflictCount: 0, indirectConflictCount: 0 };
   // Mock conflict detection result (used internally by analyzeSponsorConflictsForBill)
   const mockConflictDetectionResult = [{ sponsor_id: 10, severity: 'low', financialImpact: 1000, conflictType: 'financial_indirect' }];
  const mockTransparencyResult = { overall: 75, grade: 'C' as const, breakdown: { sponsorDisclosure: 80, legislativeProcess: 70, financialConflicts: 90, publicAccessibility: 60 } };
  const mockPublicInterestResult = { score: 65, assessment: 'Moderate' as const, factors: { economicScoreNormalized: 60, socialScoreNormalized: 70, transparency_score: 75 } };
  const mockAnalysisRecord = { id: 1, bill_id: mockBillId, analysis_type: 'comprehensive_v1.0', results: { }, confidence: '65', created_at: new Date(), updated_at: new Date() } as schema.Analysis;


  beforeEach(() => {
    vi.clearAllMocks();
    (readDatabase as vi.Mock).mockReturnValue(mockDb);

    // Setup mocks for sub-services
    (constitutionalAnalysisService.analyzeBill as vi.Mock).mockResolvedValue(mockConstitutionalResult);
    (stakeholderAnalysisService.analyzeBill as vi.Mock).mockResolvedValue(mockStakeholderResult);
    // Mock the conflict detection specifically used within the orchestrator
     (sponsorConflictAnalysisService.detectConflicts as vi.Mock).mockResolvedValue(mockConflictDetectionResult); // Mock the underlying call
    (transparencyAnalysisService.calculateScore as vi.Mock).mockResolvedValue(mockTransparencyResult);
    (publicInterestAnalysisService.calculateScore as vi.Mock).mockResolvedValue(mockPublicInterestResult);

    // Mock the repository save method
    (analysisRepository.save as vi.Mock).mockResolvedValue(mockAnalysisRecord);

    service = billComprehensiveAnalysisService; // Or new BillComprehensiveAnalysisService()
  });

  it('should call all analysis sub-services', async () => {
    await service.analyzeBill(mockBillId);

    expect(constitutionalAnalysisService.analyzeBill).toHaveBeenCalledWith(mockBillId);
    expect(stakeholderAnalysisService.analyzeBill).toHaveBeenCalledWith(mockBillId);
    expect(sponsorConflictAnalysisService.detectConflicts).toHaveBeenCalled(); // Called internally
    expect(transparencyAnalysisService.calculateScore).toHaveBeenCalledWith(mockBillId, expect.any(Object)); // Pass conflict summary
    expect(publicInterestAnalysisService.calculateScore).toHaveBeenCalledWith(mockStakeholderResult, mockTransparencyResult);
  });

  it('should aggregate results from sub-services correctly', async () => {
    const result = await service.analyzeBill(mockBillId);

    expect(result.bill_id).toBe(mockBillId);
    expect(result.analysis_id).toMatch(/^comp_analysis_1_\d+$/);
    expect(result.constitutionalAnalysis).toBe(mockConstitutionalResult);
    expect(result.stakeholderImpact).toBe(mockStakeholderResult);
     // Check aggregated conflict summary
     expect(result.conflictAnalysisSummary.overallRisk).toBe('low');
     expect(result.conflictAnalysisSummary.affectedSponsorsCount).toBe(1);
    expect(result.transparency_score).toBe(mockTransparencyResult);
    expect(result.publicInterestScore).toBe(mockPublicInterestResult);
     expect(result.overallConfidence).toBeGreaterThanOrEqual(30);
     expect(result.overallConfidence).toBeLessThanOrEqual(95);
     expect(result.recommendedActions).toBeInstanceOf(Array);
  });

  it('should generate recommendations based on results', async () => {
    // Arrange: Mock sub-services to return values triggering specific recommendations
     (constitutionalAnalysisService.analyzeBill as vi.Mock).mockResolvedValue({ ...mockConstitutionalResult, riskAssessment: 'high' });
     (transparencyAnalysisService.calculateScore as vi.Mock).mockResolvedValue({ ...mockTransparencyResult, overall: 55, grade: 'F' });

    // Act
    const result = await service.analyzeBill(mockBillId);

    // Assert
    expect(result.recommendedActions).toContain('High constitutional risk detected. Recommend detailed legal review and possible amendment.');
    expect(result.recommendedActions).toContain('Low transparency score. Increase public access to documents and process details.');
  });

  it('should save the aggregated analysis results asynchronously', async () => { await service.analyzeBill(mockBillId);

    // Check that save was called (it runs async in background, so slight delay might be needed in some test setups)
     // Use process.nextTick or similar if save is truly detached async
     await new Promise(process.nextTick); // Allow async save call to proceed


    expect(analysisRepository.save).toHaveBeenCalledTimes(1);
    expect(analysisRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      bill_id: mockBillId,
      analysis_id: expect.stringMatching(/^comp_analysis_1_\d+$/),
      constitutionalAnalysis: mockConstitutionalResult,
       conflictAnalysisSummary: expect.objectContaining({ overallRisk: 'low'  }),
      stakeholderImpact: mockStakeholderResult,
      transparency_score: mockTransparencyResult,
      publicInterestScore: mockPublicInterestResult,
       overallConfidence: expect.any(Number),
    }));
  });

   it('should handle failure in a sub-service using Promise.allSettled', async () => {
        // Arrange: Make one service fail
        const failureReason = new Error("Constitutional analysis API failed");
        (constitutionalAnalysisService.analyzeBill as vi.Mock).mockRejectedValue(failureReason);

        // Act
        const result = await service.analyzeBill(mockBillId);

        // Assert: Check that default values were used for the failed service
        expect(result.constitutionalAnalysis).toEqual({
             constitutionalityScore: 0, concerns: [], precedents: [], riskAssessment: 'high' // Default failure state
         });
         // Check that other services were still called and included
         expect(result.stakeholderImpact).toBe(mockStakeholderResult);
         expect(result.transparency_score).toBe(mockTransparencyResult);
         expect(result.publicInterestScore).toBe(mockPublicInterestResult);
         expect(result.overallConfidence).toBeLessThan(70); // Confidence likely reduced
          expect(result.recommendedActions).toContain('High constitutional risk detected. Recommend detailed legal review and possible amendment.'); // Recommendation based on default failure state

         // Verify failed analysis recording was attempted (runs async)
         await new Promise(process.nextTick);
         expect(analysisRepository.recordFailedAnalysis).toHaveBeenCalledWith(mockBillId, failureReason);
    });

});

