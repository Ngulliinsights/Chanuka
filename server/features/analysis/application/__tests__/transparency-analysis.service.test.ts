import { transparencyAnalysisService, TransparencyAnalysisService } from '../transparency-analysis.service';
import { readDatabase } from '@shared/database/connection';
import * as schema from '../../../../../shared/schema';
import { ConflictSummary } from '../bill-comprehensive-analysis.service'; // Import ConflictSummary type

// --- Mock Dependencies ---
jest.mock('../../../../db', () => ({ readDatabase: jest.fn() }));

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
};
// Mock Bill and Sponsor data
const mockBill = { id: 1, sponsorId: 10, status: 'committee' } as schema.Bill;
const mockSponsor = { id: 10, transparencyScore: '85.00' } as schema.Sponsor; // String score

describe('TransparencyAnalysisService', () => {
  let service: TransparencyAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    (readDatabase as jest.Mock).mockReturnValue(mockDb);

     // Setup mocks to return bill and sponsor
     mockDb.limit
         .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockBill]) })) // For getBillDetails
         .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockSponsor]) }));// For sponsor score in calculateSponsorDisclosureScore


    service = transparencyAnalysisService; // Or new TransparencyAnalysisService()
  });

  it('should calculate overall score based on components', async () => {
    const mockConflict: ConflictSummary = { overallRisk: 'medium', affectedSponsorsCount: 1, totalFinancialExposureEstimate: 50000, directConflictCount: 0, indirectConflictCount: 1 };
    const result = await service.calculateScore(mockBill.id, mockConflict);

    // Expect score to be calculated (exact value depends on internal logic)
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(100);
     expect(result.breakdown.sponsorDisclosure).toBeGreaterThanOrEqual(0);
     expect(result.breakdown.legislativeProcess).toBeGreaterThanOrEqual(0);
     expect(result.breakdown.financialConflicts).toBeGreaterThanOrEqual(0);
     expect(result.breakdown.publicAccessibility).toBeGreaterThanOrEqual(0);
     expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
  });

   it('should calculate sponsor score based on history and current conflict', async () => {
        const highConflict: ConflictSummary = { overallRisk: 'high', affectedSponsorsCount: 1, totalFinancialExposureEstimate: 100000, directConflictCount: 1, indirectConflictCount: 0 };
        const lowConflict: ConflictSummary = { overallRisk: 'low', affectedSponsorsCount: 0, totalFinancialExposureEstimate: 0, directConflictCount: 0, indirectConflictCount: 0 };

        // Need to reset mockDb setup for sponsor score fetch within the service call
        mockDb.limit
            .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockBill]) })) // getBillDetails
            .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockSponsor]) })); // Sponsor score for highConflict test
        const resultHighConflict = await service.calculateScore(mockBill.id, highConflict);

         mockDb.limit
             .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockBill]) })) // getBillDetails
             .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockSponsor]) })); // Sponsor score for lowConflict test
        const resultLowConflict = await service.calculateScore(mockBill.id, lowConflict);


        // Sponsor score (85) penalized more for high conflict than low conflict
        expect(resultHighConflict.breakdown.sponsorDisclosure).toBeLessThan(resultLowConflict.breakdown.sponsorDisclosure);
        expect(resultHighConflict.breakdown.sponsorDisclosure).toBe(Math.round(85 - 25)); // 85 - high risk penalty
        expect(resultLowConflict.breakdown.sponsorDisclosure).toBe(Math.round(85 - 0)); // 85 - low risk penalty
    });


  it('should calculate financial conflict score based on conflict summary', async () => {
    const highConflict: ConflictSummary = { overallRisk: 'critical', affectedSponsorsCount: 2, totalFinancialExposureEstimate: 1000000, directConflictCount: 2, indirectConflictCount: 1 };
    const lowConflict: ConflictSummary = { overallRisk: 'low', affectedSponsorsCount: 0, totalFinancialExposureEstimate: 0, directConflictCount: 0, indirectConflictCount: 0 };

     mockDb.limit.mockImplementation(() => ({ limit: jest.fn().mockResolvedValue([mockBill]) })); // Mock getBillDetails consistently

    const resultHigh = await service.calculateScore(mockBill.id, highConflict);
    const resultLow = await service.calculateScore(mockBill.id, lowConflict);

    // Score should be lower when conflicts are high
    expect(resultHigh.breakdown.financialConflicts).toBeLessThan(resultLow.breakdown.financialConflicts);
     // 100 - (2 * 20) - (1 * 10) - 30 = 100 - 40 - 10 - 30 = 20
     expect(resultHigh.breakdown.financialConflicts).toBe(20);
     expect(resultLow.breakdown.financialConflicts).toBe(100); // No penalties
  });

  // Add tests for calculateProcessTransparencyScore and calculatePublicAccessibilityScore
  // These will require mocking the bill object with different fields (e.g., committeeHearingsCount)
  // returned by getBillDetails to test the scoring logic.

   it('should return F grade for very low scores', async () => {
        // Arrange: Simulate conditions leading to low scores
        const worstConflict: ConflictSummary = { overallRisk: 'critical', affectedSponsorsCount: 5, totalFinancialExposureEstimate: 10e6, directConflictCount: 5, indirectConflictCount: 5 };
        const badSponsor = { ...mockSponsor, transparencyScore: '10.00' };
         mockDb.limit
            .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([mockBill]) })) // getBillDetails
            .mockImplementationOnce(() => ({ limit: jest.fn().mockResolvedValue([badSponsor]) })); // Sponsor score

        // Act
        const result = await service.calculateScore(mockBill.id, worstConflict);

        // Assert
        expect(result.overall).toBeLessThan(60);
        expect(result.grade).toBe('F');
    });

});