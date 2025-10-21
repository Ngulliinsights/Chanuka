import request from 'supertest';
import express, { Express } from 'express';
import { analysisRouter } from '../analysis.routes'; // Import the NEW router
// Mock the NEW comprehensive analysis service
import { billComprehensiveAnalysisService } from '../../application/bill-comprehensive-analysis.service';
// Mock the repository for history endpoint
import { analysisRepository } from '../../infrastructure/repositories/analysis-repository-impl';
import { authenticateToken } from '../../../../middleware/auth'; // Import or mock auth
import * as schema from '../../../../../shared/schema'; // For mock types

// --- Mock Dependencies ---
jest.mock('../../application/bill-comprehensive-analysis.service');
jest.mock('../../infrastructure/repositories/analysis-repository-impl');
// Mock Auth Middleware - Assume admin for POST /run, allow others for GET
jest.mock('../../../../middleware/auth', () => ({
    authenticateToken: jest.fn((req: any, res: any, next: any) => {
        // Simple mock: Allow if GET, require admin if POST
        if (req.method === 'POST') {
             // Simulate different users for testing permissions
             if (req.headers['x-mock-role'] === 'admin') {
                 req.user = { id: 'mock-admin-id', role: 'admin' };
                 next();
             } else if (req.headers['x-mock-role'] === 'citizen') {
                 req.user = { id: 'mock-citizen-id', role: 'citizen' };
                  // Let the route handler check the role
                 next();
                 // Alternatively, block directly in middleware:
                 // res.status(403).json(ApiError("Permission denied.", 403));
             } else {
                 // Simulate unauthenticated
                 res.status(401).json({ status: 'error', message: 'Unauthorized' });
             }
        } else {
            // Allow GET requests without strict auth for this test setup,
            // or add mock user if needed for GET endpoints too.
             req.user = { id: 'mock-viewer-id', role: 'citizen' }; // Example mock user for GET
            next();
        }
    }),
    AuthenticatedRequest: jest.fn(), // Mock type if needed elsewhere
}));

// --- Setup Express App ---
const app: Express = express();
app.use(express.json());
app.use('/api/analysis', analysisRouter); // Mount the new router

// --- Test Data ---
const mockBillId = 1;
const mockAnalysisId = `comp_analysis_${mockBillId}_${Date.now()}`;
const mockComprehensiveResult = {
    billId: mockBillId, analysisId: mockAnalysisId, timestamp: new Date(),
    constitutionalAnalysis: { constitutionalityScore: 70, concerns: [], precedents: [], riskAssessment: 'low' as const },
    conflictAnalysisSummary: { overallRisk: 'low' as const, affectedSponsorsCount: 0, totalFinancialExposureEstimate: 0, directConflictCount: 0, indirectConflictCount: 0 },
    stakeholderImpact: { primaryBeneficiaries: [], negativelyAffected: [], affectedPopulations: [], economicImpact: { estimatedCost: 0, estimatedBenefit: 0, netImpact: 0, timeframe: 'N/A', confidence: 50 }, socialImpact: { equityEffect: 0, accessibilityEffect: 0, publicHealthEffect: 0, environmentalEffect: 0 } },
    transparencyScore: { overall: 80, grade: 'B' as const, breakdown: { sponsorDisclosure: 80, legislativeProcess: 80, financialConflicts: 80, publicAccessibility: 80 } },
    publicInterestScore: { score: 75, assessment: 'High' as const, factors: { economicScoreNormalized: 70, socialScoreNormalized: 80, transparencyScore: 80 } },
    recommendedActions: ['Recommendation 1'], overallConfidence: 85, version: '1.0', status: 'completed' as const
};
const mockHistoryDbRecord: schema.Analysis = {
    id: 101, billId: mockBillId, analysisType: 'comprehensive_v1.0',
    results: { analysisId: 'old_id_123', version: '1.0', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'completed', publicInterestScore: { score: 70 } /* other results data */ },
    confidence: '80.0000', createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000),
    isApproved: false, approvedBy: null, modelVersion: null, metadata: null
};

// --- Test Suite ---
describe('Analysis API Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    (billComprehensiveAnalysisService.analyzeBill as jest.Mock).mockClear();
    (analysisRepository.findHistoryByBillId as jest.Mock).mockClear();
  });

  describe('GET /api/analysis/bills/:billId/comprehensive', () => {
    it('should return 200 and the analysis result', async () => {
       (billComprehensiveAnalysisService.analyzeBill as jest.Mock).mockResolvedValue(mockComprehensiveResult);
      const response = await request(app).get(`/api/analysis/bills/${mockBillId}/comprehensive`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.billId).toBe(mockBillId);
      expect(response.body.data.analysisId).toEqual(mockComprehensiveResult.analysisId);
      expect(billComprehensiveAnalysisService.analyzeBill).toHaveBeenCalledWith(mockBillId);
    });

    it('should return 400 for invalid bill ID', async () => {
      const response = await request(app).get('/api/analysis/bills/invalid/comprehensive');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid Bill ID');
    });

     it('should return 404 if analysis service throws "not found"', async () => {
         (billComprehensiveAnalysisService.analyzeBill as jest.Mock).mockRejectedValue(new Error(`Bill with ID ${mockBillId} not found for analysis.`));
         const response = await request(app).get(`/api/analysis/bills/${mockBillId}/comprehensive`);
         expect(response.status).toBe(404);
         expect(response.body.message).toContain(`Bill with ID ${mockBillId} not found`);
     });

     it('should return 500 if analysis service fails', async () => {
         (billComprehensiveAnalysisService.analyzeBill as jest.Mock).mockRejectedValue(new Error("Analysis engine unavailable"));
         const response = await request(app).get(`/api/analysis/bills/${mockBillId}/comprehensive`);
         expect(response.status).toBe(500);
         expect(response.body.message).toContain("Analysis could not be completed: Analysis engine unavailable");
     });
  });

  describe('POST /api/analysis/bills/:billId/comprehensive/run', () => {
    it('should return 403 if user is not admin', async () => {
        const response = await request(app)
            .post(`/api/analysis/bills/${mockBillId}/comprehensive/run`)
            .set('x-mock-role', 'citizen'); // Simulate non-admin user via header

        expect(response.status).toBe(403);
        expect(response.body.message).toContain("Permission denied");
        expect(billComprehensiveAnalysisService.analyzeBill).not.toHaveBeenCalled();
    });

    it('should return 201 and the new analysis result when triggered by admin', async () => {
       (billComprehensiveAnalysisService.analyzeBill as jest.Mock).mockResolvedValue(mockComprehensiveResult);
      const response = await request(app)
          .post(`/api/analysis/bills/${mockBillId}/comprehensive/run`)
          .set('x-mock-role', 'admin'); // Simulate admin user

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
       expect(response.body.data.message).toContain('Analysis re-run completed successfully');
       expect(response.body.data.analysis.billId).toBe(mockBillId);
       expect(billComprehensiveAnalysisService.analyzeBill).toHaveBeenCalledWith(mockBillId);
    });

     it('should return 400 for invalid bill ID', async () => {
       const response = await request(app)
           .post('/api/analysis/bills/bad/comprehensive/run')
           .set('x-mock-role', 'admin');
       expect(response.status).toBe(400);
       expect(response.body.message).toContain('Invalid Bill ID');
   });

    it('should return 500 if analysis service fails during run', async () => {
        (billComprehensiveAnalysisService.analyzeBill as jest.Mock).mockRejectedValue(new Error("Analysis engine failure"));
        const response = await request(app)
            .post(`/api/analysis/bills/${mockBillId}/comprehensive/run`)
            .set('x-mock-role', 'admin');
        expect(response.status).toBe(500);
        expect(response.body.message).toContain("Analysis could not be completed: Analysis engine failure");
    });
  });

   describe('GET /api/analysis/bills/:billId/history', () => {
        it('should return 200 and formatted analysis history', async () => {
            // Arrange
            const historyData = [mockHistoryDbRecord, { ...mockHistoryDbRecord, id: 102, confidence: '75.0000', results: { analysisId: 'old_id_456'} }];
            (analysisRepository.findHistoryByBillId as jest.Mock).mockResolvedValue(historyData);

            // Act
            const response = await request(app).get(`/api/analysis/bills/${mockBillId}/history?limit=5`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.count).toBe(2);
            expect(response.body.data.history).toHaveLength(2);
             // Check transformation
             expect(response.body.data.history[0]).toEqual({
                 dbId: 101,
                 analysisId: 'old_id_123',
                 timestamp: historyData[0].createdAt,
                 version: 'comprehensive_v1.0',
                 overallConfidence: 80,
                 status: 'completed', // Assuming status is in results
                 scores: { publicInterest: 70, transparency: undefined, constitutional: undefined }, // Example score extraction
             });
              expect(response.body.data.history[1]).toEqual(expect.objectContaining({
                  dbId: 102,
                  analysisId: 'old_id_456',
                  overallConfidence: 75,
              }));
             expect(analysisRepository.findHistoryByBillId).toHaveBeenCalledWith(mockBillId, 5);
        });

         it('should return 400 for invalid bill ID', async () => {
            const response = await request(app).get('/api/analysis/bills/xyz/history');
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid Bill ID');
        });

         it('should return 400 for invalid limit parameter', async () => {
             const response = await request(app).get(`/api/analysis/bills/${mockBillId}/history?limit=0`);
             expect(response.status).toBe(400);
             expect(response.body.message).toContain("Invalid 'limit' query parameter");
         });

         it('should return 500 if repository fails', async () => {
            (analysisRepository.findHistoryByBillId as jest.Mock).mockRejectedValue(new Error("DB timeout"));
            const response = await request(app).get(`/api/analysis/bills/${mockBillId}/history`);
            expect(response.status).toBe(500);
            expect(response.body.message).toContain("internal server error");
        });
    });

    describe('GET /api/analysis/health', () => {
        it('should return 200 with operational status', async () => {
            const response = await request(app).get('/api/analysis/health');
            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('Analysis feature operational');
        });
    });

});