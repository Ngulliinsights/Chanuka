import { constitutionalAnalysisService, ConstitutionalAnalysisService } from '../constitutional-analysis.service';
import { readDatabase } from '../../../../db';
import * as schema from '../../../../../shared/schema';

// --- Mock Dependencies ---
jest.mock('../../../../db', () => ({ readDatabase: jest.fn() }));

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
};
const mockBill = { id: 1, content: 'This bill discusses commerce clause and due process.' } as schema.Bill;

describe('ConstitutionalAnalysisService', () => {
  let service: ConstitutionalAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    (readDatabase as jest.Mock).mockReturnValue(mockDb);
    // Setup mock to return the bill when fetching content
     mockDb.limit.mockImplementationOnce(() => ({ // Specific mock for getBillContent
         limit: jest.fn().mockResolvedValue([mockBill])
     }));

    service = constitutionalAnalysisService; // Or new ConstitutionalAnalysisService()
  });

  it('should identify concerns based on keywords', async () => {
    const result = await service.analyzeBill(mockBill.id);

    expect(result.concerns).toHaveLength(2);
    expect(result.concerns).toEqual(expect.arrayContaining([
      expect.objectContaining({ concern: 'Federal authority and commerce regulation', article: 'Article I, Section 8' }),
      expect.objectContaining({ concern: 'Due process and equal protection rights', article: 'Amendment XIV' }),
    ]));
  });

  it('should calculate score based on severity of concerns', async () => {
    // Mock identifyConstitutionalConcerns if needed for specific severities
    const result = await service.analyzeBill(mockBill.id);

    // Score = 100 - penalty(moderate) - penalty(major) = 100 - 15 - 30 = 55 (based on updated weights)
    expect(result.constitutionalityScore).toBe(55); // Adjust based on final weights in service
  });

   it('should assess risk based on score and severity', async () => {
      // Test different scenarios
      const highRiskResult = await service.analyzeBill(mockBill.id); // Score 55, has major -> medium risk
      expect(highRiskResult.riskAssessment).toBe('medium');

      // TODO: Add tests for 'high' and 'low' risk scenarios by mocking concerns/score
  });


  it('should return placeholder precedents', async () => {
    const result = await service.analyzeBill(mockBill.id);
    expect(result.precedents.length).toBeGreaterThan(0); // Check that precedents are returned
     expect(result.precedents[0]).toHaveProperty('caseName');
  });

   it('should throw error if bill not found', async () => {
        mockDb.limit.mockImplementationOnce(() => ({ // Specific mock for getBillContent returning empty
            limit: jest.fn().mockResolvedValue([])
        }));
        await expect(service.analyzeBill(999)).rejects.toThrow('Bill 999 not found');
    });

});