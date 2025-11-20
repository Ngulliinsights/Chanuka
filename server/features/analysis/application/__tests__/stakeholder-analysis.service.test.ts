import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stakeholderAnalysisService, StakeholderAnalysisService } from '../stakeholder-analysis.service';
import { readDatabase } from '@shared/database/connection';
import * as schema from '@shared/schema';
import { MLAnalysisService } from '../../../analytics/services/ml.service'; // Adjust path

// --- Mock Dependencies ---
vi.mock('../../../../db', () => ({ readDatabase: vi.fn() }));
// Mock the ML service adapter or the service itself
vi.mock('../../../analytics/services/ml.service', () => ({
  MLAnalysisService: {
    analyzeStakeholderInfluence: vi.fn(),
    analyzeBeneficiaries: vi.fn(),
  },
}));


const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};
const mockBill = {
    id: 1,
    title: 'New Tech Regulation Act',
    content: 'This bill imposes new regulations on large tech corporations, aiming to benefit small businesses and consumers. Estimated cost $1.5 billion.'
} as schema.Bill;

// Mock ML Responses
const mockBeneficiaryResponse = {
    result: { directBeneficiaries: ['small businesses', 'consumers'], potentialLosers: ['large corporations'] },
    confidence: 90
};
const mockStakeholderResponse = { // Assuming a structure
    result: { /* ... ML stakeholder data ... */ },
    confidence: 85
};


describe('StakeholderAnalysisService', () => {
  let service: StakeholderAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    (readDatabase as vi.Mock).mockReturnValue(mockDb);
    // Mock DB to return the bill
     mockDb.limit.mockImplementationOnce(() => ({ limit: vi.fn().mockResolvedValue([mockBill]) }));

     // Setup ML mocks
     (MLAnalysisService.analyzeBeneficiaries as vi.Mock).mockResolvedValue(mockBeneficiaryResponse);
     (MLAnalysisService.analyzeStakeholderInfluence as vi.Mock).mockResolvedValue(mockStakeholderResponse);


    service = stakeholderAnalysisService; // Or new StakeholderAnalysisService()
  });

  it('should extract beneficiaries and losers from ML response', async () => {
    const result = await service.analyzeBill(mockBill.id);

    expect(MLAnalysisService.analyzeBeneficiaries).toHaveBeenCalled();
    expect(result.primaryBeneficiaries).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'small businesses', impactLevel: 'positive' }),
      expect.objectContaining({ name: 'consumers', impactLevel: 'positive' }),
    ]));
     expect(result.negativelyAffected).toEqual(expect.arrayContaining([
       expect.objectContaining({ name: 'large corporations', impactLevel: 'negative' }),
     ]));
  });

  it('should estimate population impact based on keywords', async () => {
     // Arrange - Modify mockBill content if needed for different demographics
     const billWithDifferentContent = { ...mockBill, content: "Support for rural communities and students." };
      mockDb.limit.mockImplementationOnce(() => ({ limit: vi.fn().mockResolvedValue([billWithDifferentContent]) }));


    const result = await service.analyzeBill(billWithDifferentContent.id);

    expect(result.affectedPopulations).toEqual(expect.arrayContaining([
      expect.objectContaining({ demographic: 'Rural Communities' }),
      expect.objectContaining({ demographic: 'Students' }),
    ]));
  });

  it('should calculate economic impact based on monetary values and keywords', async () => {
    const result = await service.analyzeBill(mockBill.id);

    expect(result.economicImpact.estimatedCost).toBe(1_500_000_000);
    // Benefit is calculated using multiplier (default 1.5 in this case)
    expect(result.economicImpact.estimatedBenefit).toBe(1_500_000_000 * 1.5);
     expect(result.economicImpact.netImpact).toBe(1_500_000_000 * 0.5);
     expect(result.economicImpact.confidence).toBeGreaterThan(30); // Check confidence calculation
  });

  it('should assess social impact based on keywords', async () => {
     // Arrange - Add content triggering social impact scores
     const billWithSocialContent = { ...mockBill, content: "This improves access for disadvantaged groups but increases pollution." };
      mockDb.limit.mockImplementationOnce(() => ({ limit: vi.fn().mockResolvedValue([billWithSocialContent]) }));


    const result = await service.analyzeBill(billWithSocialContent.id);

    expect(result.socialImpact.equityEffect).toBeGreaterThan(0); // 'disadvantaged'
    expect(result.socialImpact.accessibilityEffect).toBeGreaterThan(0); // 'improves access'
     expect(result.socialImpact.environmentalEffect).toBeLessThan(0); // 'pollution'
     expect(result.socialImpact.publicHealthEffect).toBe(0); // No keywords hit
  });

   it('should handle ML service failure gracefully', async () => {
      // Arrange: Make ML service throw an error
      (MLAnalysisService.analyzeBeneficiaries as vi.Mock).mockRejectedValue(new Error("ML API timeout"));
      (MLAnalysisService.analyzeStakeholderInfluence as vi.Mock).mockRejectedValue(new Error("ML API timeout"));


      // Act: Should still complete using fallback/defaults
      const result = await service.analyzeBill(mockBill.id);

      // Assert: Check that results are present but likely defaults/fallback based
      expect(result).toBeDefined();
       expect(result.primaryBeneficiaries).toEqual([]); // Expect empty if fallback doesn't add any
       expect(result.negativelyAffected).toEqual([]);
       // Economic/Social impact might still be calculated from content
       expect(result.economicImpact.estimatedCost).toBe(1_500_000_000); // Should still parse content
   });

});
