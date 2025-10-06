import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import coverageRouter from '../../features/coverage/coverage-routes';
import { CoverageAnalyzer } from '../../services/coverage-analyzer';

// Mock the CoverageAnalyzer
jest.mock('../../services/coverage-analyzer');

const MockedCoverageAnalyzer = CoverageAnalyzer as jest.MockedClass<typeof CoverageAnalyzer>;

describe('Coverage Routes', () => {
  let app: express.Application;
  let mockCoverageAnalyzer: jest.Mocked<CoverageAnalyzer>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instance
    mockCoverageAnalyzer = {
      analyzeServerCoverage: jest.fn(),
      analyzeClientCoverage: jest.fn(),
      analyzeIntegrationCoverage: jest.fn(),
      identifyGaps: jest.fn(),
      generateCoverageReport: jest.fn()
    } as any;

    MockedCoverageAnalyzer.mockImplementation(() => mockCoverageAnalyzer);
    
    // Import router after mocking
    app.use('/api/coverage', coverageRouter);
  });

  describe('GET /api/coverage/report', () => {
    it('should return comprehensive coverage report', async () => {
      const mockReport = {
        timestamp: new Date(),
        serverCoverage: {
          lines: { total: 100, covered: 85, percentage: 85 },
          functions: { total: 25, covered: 20, percentage: 80 },
          branches: { total: 40, covered: 32, percentage: 80 },
          statements: { total: 120, covered: 100, percentage: 83 },
          uncoveredFiles: [],
          uncoveredFunctions: [],
          uncoveredLines: []
        },
        clientCoverage: {
          lines: { total: 80, covered: 70, percentage: 87 },
          functions: { total: 15, covered: 13, percentage: 87 },
          branches: { total: 30, covered: 25, percentage: 83 },
          statements: { total: 90, covered: 80, percentage: 89 },
          uncoveredFiles: [],
          uncoveredFunctions: [],
          uncoveredLines: []
        },
        integrationCoverage: {
          lines: { total: 50, covered: 40, percentage: 80 },
          functions: { total: 10, covered: 8, percentage: 80 },
          branches: { total: 20, covered: 16, percentage: 80 },
          statements: { total: 60, covered: 48, percentage: 80 },
          uncoveredFiles: [],
          uncoveredFunctions: [],
          uncoveredLines: []
        },
        overallCoverage: {
          lines: 84,
          functions: 82,
          branches: 81,
          statements: 85
        },
        gaps: [],
        recommendations: []
      };

      mockCoverageAnalyzer.generateCoverageReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/coverage/report')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReport);
      expect(mockCoverageAnalyzer.generateCoverageReport).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockCoverageAnalyzer.generateCoverageReport.mockRejectedValue(
        new Error('Coverage analysis failed')
      );

      const response = await request(app)
        .get('/api/coverage/report')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate coverage report');
      expect(response.body.details).toBe('Coverage analysis failed');
    });
  });

  describe('GET /api/coverage/server', () => {
    it('should return server coverage analysis', async () => {
      const mockServerCoverage = {
        lines: { total: 100, covered: 85, percentage: 85 },
        functions: { total: 25, covered: 20, percentage: 80 },
        branches: { total: 40, covered: 32, percentage: 80 },
        statements: { total: 120, covered: 100, percentage: 83 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      };

      mockCoverageAnalyzer.analyzeServerCoverage.mockResolvedValue(mockServerCoverage);

      const response = await request(app)
        .get('/api/coverage/server')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockServerCoverage);
      expect(mockCoverageAnalyzer.analyzeServerCoverage).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/coverage/client', () => {
    it('should return client coverage analysis', async () => {
      const mockClientCoverage = {
        lines: { total: 80, covered: 70, percentage: 87 },
        functions: { total: 15, covered: 13, percentage: 87 },
        branches: { total: 30, covered: 25, percentage: 83 },
        statements: { total: 90, covered: 80, percentage: 89 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      };

      mockCoverageAnalyzer.analyzeClientCoverage.mockResolvedValue(mockClientCoverage);

      const response = await request(app)
        .get('/api/coverage/client')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockClientCoverage);
      expect(mockCoverageAnalyzer.analyzeClientCoverage).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/coverage/gaps', () => {
    it('should return coverage gaps analysis', async () => {
      const mockGaps = [
        {
          type: 'function' as const,
          file: '/server/auth.ts',
          location: '/server/auth.ts:validateToken',
          severity: 'critical' as const,
          description: 'Function validateToken is not covered by tests',
          suggestedTest: 'Create unit test for function in /server/auth.ts:validateToken'
        },
        {
          type: 'statement' as const,
          file: '/client/components/test.tsx',
          location: '/client/components/test.tsx:15',
          severity: 'medium' as const,
          description: 'Line 15 in /client/components/test.tsx is not covered',
          suggestedTest: 'Add test case to cover statement at /client/components/test.tsx:15'
        }
      ];

      const mockCoverageReports = [
        {
          lines: { total: 100, covered: 85, percentage: 85 },
          functions: { total: 25, covered: 20, percentage: 80 },
          branches: { total: 40, covered: 32, percentage: 80 },
          statements: { total: 120, covered: 100, percentage: 83 },
          uncoveredFiles: [],
          uncoveredFunctions: [],
          uncoveredLines: []
        }
      ];

      mockCoverageAnalyzer.analyzeServerCoverage.mockResolvedValue(mockCoverageReports[0]);
      mockCoverageAnalyzer.analyzeClientCoverage.mockResolvedValue(mockCoverageReports[0]);
      mockCoverageAnalyzer.analyzeIntegrationCoverage.mockResolvedValue(mockCoverageReports[0]);
      mockCoverageAnalyzer.identifyGaps.mockResolvedValue(mockGaps);

      const response = await request(app)
        .get('/api/coverage/gaps')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.gaps).toEqual(mockGaps);
      expect(response.body.data.summary).toEqual({
        total: 2,
        critical: 1,
        high: 0,
        medium: 1,
        low: 0
      });
    });
  });

  describe('POST /api/coverage/analyze', () => {
    it('should trigger server coverage analysis', async () => {
      const mockServerCoverage = {
        lines: { total: 100, covered: 85, percentage: 85 },
        functions: { total: 25, covered: 20, percentage: 80 },
        branches: { total: 40, covered: 32, percentage: 80 },
        statements: { total: 120, covered: 100, percentage: 83 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      };

      mockCoverageAnalyzer.analyzeServerCoverage.mockResolvedValue(mockServerCoverage);

      const response = await request(app)
        .post('/api/coverage/analyze')
        .send({ type: 'server' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockServerCoverage);
      expect(response.body.message).toBe('Coverage analysis completed for server tests');
      expect(mockCoverageAnalyzer.analyzeServerCoverage).toHaveBeenCalledTimes(1);
    });

    it('should trigger comprehensive analysis by default', async () => {
      const mockReport = {
        timestamp: new Date(),
        serverCoverage: {},
        clientCoverage: {},
        integrationCoverage: {},
        overallCoverage: { lines: 80, functions: 75, branches: 70, statements: 85 },
        gaps: [],
        recommendations: []
      };

      mockCoverageAnalyzer.generateCoverageReport.mockResolvedValue(mockReport as any);

      const response = await request(app)
        .post('/api/coverage/analyze')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Coverage analysis completed for all tests');
      expect(mockCoverageAnalyzer.generateCoverageReport).toHaveBeenCalledTimes(1);
    });
  });
});