import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analysisRepository, AnalysisRepositoryImpl } from '../analysis-repository-impl';
import { readDatabase } from '@shared/database/connection';
import * as schema from '../../../../../../shared/schema';
import { ComprehensiveAnalysis } from '../../../domain/entities/analysis-result'; // Import domain entity

// --- Mock Dependencies ---
vi.mock('../../../../../db', () => ({ readDatabase: vi.fn() }));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
};

// Mock ComprehensiveAnalysis instance
const mockAnalysisEntity = new ComprehensiveAnalysis(
    1, // bill_id
    `comp_analysis_1_${Date.now()}`, // analysisId
    new Date(), // timestamp
    { constitutionalityScore: 70, concerns: [], precedents: [], riskAssessment: 'low' }, // constitutionalAnalysis
    { overallRisk: 'low', affectedSponsorsCount: 0, totalFinancialExposureEstimate: 0, directConflictCount: 0, indirectConflictCount: 0 }, // conflictAnalysisSummary
    { primaryBeneficiaries: [], negativelyAffected: [], affectedPopulations: [], economicImpact: { estimatedCost: 0, estimatedBenefit: 0, netImpact: 0, timeframe: 'N/A', confidence: 50 }, socialImpact: { equityEffect: 0, accessibilityEffect: 0, publicHealthEffect: 0, environmentalEffect: 0 } }, // stakeholderImpact
    { overall: 80, grade: 'B', breakdown: { sponsorDisclosure: 80, legislativeProcess: 80, financialConflicts: 80, publicAccessibility: 80 } }, // transparency_score
    { score: 75, assessment: 'High', factors: { economicScoreNormalized: 70, socialScoreNormalized: 80, transparency_score: 80 } }, // publicInterestScore
    ['Recommendation 1'], // recommendedActions
    85 // overallConfidence
);

const mockDbRecord = { id: 101, bill_id: 1, analysis_type: 'comprehensive_v1.0',
    results: { analysis_id: mockAnalysisEntity.analysis_id, /* ... other results */  },
    confidence: '85', created_at: new Date(), updated_at: new Date(), is_approved: false, approved_by: null
} as schema.Analysis;


describe('AnalysisRepositoryImpl', () => {
  let repository: AnalysisRepositoryImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    (readDatabase as vi.Mock).mockReturnValue(mockDb);
    repository = analysisRepository; // Or new AnalysisRepositoryImpl()
  });

  describe('save', () => { it('should insert a new analysis record', async () => {
       // Arrange
       mockDb.returning.mockResolvedValueOnce([mockDbRecord]);

      // Act
      const result = await repository.save(mockAnalysisEntity);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(schema.analysis);
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        bill_id: mockAnalysisEntity.bill_id,
        analysis_type: `comprehensive_v${mockAnalysisEntity.version }`,
        results: expect.objectContaining({ analysis_id: mockAnalysisEntity.analysis_id }),
        confidence: mockAnalysisEntity.overallConfidence.toString(),
      }));
       expect(mockDb.onConflictDoUpdate).toHaveBeenCalled(); // Verify upsert logic is called
       expect(result).toEqual(mockDbRecord);
    });

     it('should update an existing analysis record on conflict', async () => {
        // Arrange: Simulate onConflictDoUpdate returning the updated record
        mockDb.returning.mockResolvedValueOnce([{...mockDbRecord, updated_at: new Date() }]);

        // Act
        const result = await repository.save(mockAnalysisEntity); // Same entity, should trigger update path

        // Assert
        expect(mockDb.insert).toHaveBeenCalledTimes(1); // Still uses INSERT ... ON CONFLICT
        expect(mockDb.onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
            target: [schema.analysis.bill_id, schema.analysis.analysis_type], // Check target columns
            set: expect.objectContaining({ // Check fields being set on update
                results: expect.any(Object),
                confidence: mockAnalysisEntity.overallConfidence.toString(),
                updated_at: expect.any(Date),
            }),
        }));
        expect(result).toHaveProperty('updated_at'); // Check if it looks like an updated record
    });

  });

  describe('findLatestByBillId', () => {
    it('should retrieve the latest comprehensive analysis for a bill', async () => {
      // Arrange
       mockDb.limit.mockResolvedValueOnce([mockDbRecord]);

      // Act
      const result = await repository.findLatestByBillId(mockBillId);

      // Assert
      expect(mockDb.select).toHaveBeenCalled();
       expect(mockDb.from).toHaveBeenCalledWith(schema.analysis);
       expect(mockDb.where).toHaveBeenCalled(); // Check that where clause was applied
       expect(mockDb.orderBy).toHaveBeenCalledWith(expect.any(Object)); // Check ordering
       expect(mockDb.limit).toHaveBeenCalledWith(1);
       expect(result).toEqual(mockDbRecord);
    });

    it('should return null if no analysis found', async () => {
      // Arrange
       mockDb.limit.mockResolvedValueOnce([]); // No records found

      // Act
      const result = await repository.findLatestByBillId(mockBillId);

      // Assert
      expect(result).toBeNull();
    });
  });

   describe('recordFailedAnalysis', () => { it('should insert a record with analysis_type "comprehensive_failed"', async () => {
            // Arrange
            const error = new Error("ML service timeout");

            // Act
            await repository.recordFailedAnalysis(mockBillId, error);

            // Assert
            expect(mockDb.insert).toHaveBeenCalledWith(schema.analysis);
            expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
                bill_id: mockBillId,
                analysis_type: 'comprehensive_failed',
                results: expect.objectContaining({ error: error.message, stack: error.stack  }),
                confidence: "0",
                is_approved: false,
            }));
        });
    });

  // Add tests for findByAnalysisId and findHistoryByBillId if needed
});
