import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CoverageAnalyzer } from '../../services/coverage-analyzer';
import { exec } from 'child_process';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('../../utils/logger');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('CoverageAnalyzer', () => {
  let coverageAnalyzer: CoverageAnalyzer;

  beforeEach(() => {
    coverageAnalyzer = new CoverageAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeServerCoverage', () => {
    it('should analyze server coverage successfully', async () => {
      // Mock successful command execution
      const mockCallback = jest.fn((command: string, options: any, callback: any) => {
        callback(null, { stdout: 'Coverage complete', stderr: '' });
      });
      mockExec.mockImplementation(mockCallback as any);

      // Mock coverage file reading
      const mockCoverageData = {
        '/server/test-file.ts': {
          l: { '1': 1, '2': 0, '3': 1 }, // line coverage
          f: { 'testFunction': 1, 'uncoveredFunction': 0 }, // function coverage
          b: { '0': [1, 0] }, // branch coverage
          s: { '1': 1, '2': 0, '3': 1 } // statement coverage
        }
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageData));

      const result = await coverageAnalyzer.analyzeServerCoverage();

      expect(result).toBeDefined();
      expect(result.lines.total).toBeGreaterThan(0);
      expect(result.functions.total).toBeGreaterThan(0);
      expect(result.branches.total).toBeGreaterThan(0);
      expect(result.statements.total).toBeGreaterThan(0);
    });

    it('should handle coverage analysis errors gracefully', async () => {
      // Mock command execution failure
      const mockCallback = jest.fn((command: string, options: any, callback: any) => {
        callback(new Error('Command failed'), null);
      });
      mockExec.mockImplementation(mockCallback as any);

      const result = await coverageAnalyzer.analyzeServerCoverage();

      expect(result).toEqual({
        lines: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        statements: { total: 0, covered: 0, percentage: 0 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      });
    });
  });

  describe('analyzeClientCoverage', () => {
    it('should analyze client coverage successfully', async () => {
      // Mock successful command execution
      const mockCallback = jest.fn((command: string, options: any, callback: any) => {
        callback(null, { stdout: 'Coverage complete', stderr: '' });
      });
      mockExec.mockImplementation(mockCallback as any);

      // Mock coverage file reading
      const mockCoverageData = {
        '/client/src/test-component.tsx': {
          l: { '1': 1, '2': 1, '3': 0 },
          f: { 'TestComponent': 1, 'handleClick': 0 },
          b: { '0': [1, 1] },
          s: { '1': 1, '2': 1, '3': 0 }
        }
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockCoverageData));

      const result = await coverageAnalyzer.analyzeClientCoverage();

      expect(result).toBeDefined();
      expect(result.lines.total).toBeGreaterThan(0);
      expect(result.functions.total).toBeGreaterThan(0);
    });
  });

  describe('identifyGaps', () => {
    it('should identify coverage gaps correctly', async () => {
      const mockReport = {
        lines: { total: 100, covered: 80, percentage: 80 },
        functions: { total: 20, covered: 15, percentage: 75 },
        branches: { total: 50, covered: 30, percentage: 60 },
        statements: { total: 120, covered: 100, percentage: 83 },
        uncoveredFiles: ['/test/uncovered.ts'],
        uncoveredFunctions: ['/server/auth.ts:validateToken'],
        uncoveredLines: [
          { file: '/server/api.ts', lines: [10, 15, 20] }
        ]
      };

      const gaps = await coverageAnalyzer.identifyGaps([mockReport]);

      expect(gaps).toBeDefined();
      expect(gaps.length).toBeGreaterThan(0);
      
      // Should identify function gaps
      const functionGaps = gaps.filter(gap => gap.type === 'function');
      expect(functionGaps.length).toBeGreaterThan(0);
      
      // Should identify statement gaps
      const statementGaps = gaps.filter(gap => gap.type === 'statement');
      expect(statementGaps.length).toBeGreaterThan(0);
      
      // Should identify branch coverage gap
      const branchGaps = gaps.filter(gap => gap.type === 'branch');
      expect(branchGaps.length).toBeGreaterThan(0);
    });

    it('should assign correct severity levels', async () => {
      const mockReport = {
        lines: { total: 100, covered: 80, percentage: 80 },
        functions: { total: 20, covered: 15, percentage: 75 },
        branches: { total: 50, covered: 30, percentage: 60 },
        statements: { total: 120, covered: 100, percentage: 83 },
        uncoveredFiles: [],
        uncoveredFunctions: [
          '/server/auth/security.ts:validateAuth',
          '/server/utils/helper.ts:formatDate'
        ],
        uncoveredLines: []
      };

      const gaps = await coverageAnalyzer.identifyGaps([mockReport]);

      const criticalGaps = gaps.filter(gap => gap.severity === 'critical');
      const lowGaps = gaps.filter(gap => gap.severity === 'low');

      expect(criticalGaps.length).toBeGreaterThan(0); // auth/security functions
      expect(lowGaps.length).toBeGreaterThan(0); // utility functions
    });
  });

  describe('generateCoverageReport', () => {
    it('should generate comprehensive coverage report', async () => {
      // Mock all coverage analysis methods
      const mockServerCoverage = {
        lines: { total: 100, covered: 85, percentage: 85 },
        functions: { total: 25, covered: 20, percentage: 80 },
        branches: { total: 40, covered: 32, percentage: 80 },
        statements: { total: 120, covered: 100, percentage: 83 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      };

      const mockClientCoverage = {
        lines: { total: 80, covered: 70, percentage: 87 },
        functions: { total: 15, covered: 13, percentage: 87 },
        branches: { total: 30, covered: 25, percentage: 83 },
        statements: { total: 90, covered: 80, percentage: 89 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      };

      jest.spyOn(coverageAnalyzer, 'analyzeServerCoverage').mockResolvedValue(mockServerCoverage);
      jest.spyOn(coverageAnalyzer, 'analyzeClientCoverage').mockResolvedValue(mockClientCoverage);
      jest.spyOn(coverageAnalyzer, 'analyzeIntegrationCoverage').mockResolvedValue(mockServerCoverage);

      const report = await coverageAnalyzer.generateCoverageReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.serverCoverage).toEqual(mockServerCoverage);
      expect(report.clientCoverage).toEqual(mockClientCoverage);
      expect(report.overallCoverage).toBeDefined();
      expect(report.gaps).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should calculate overall coverage correctly', async () => {
      const mockCoverage = {
        lines: { total: 50, covered: 40, percentage: 80 },
        functions: { total: 10, covered: 8, percentage: 80 },
        branches: { total: 20, covered: 16, percentage: 80 },
        statements: { total: 60, covered: 48, percentage: 80 },
        uncoveredFiles: [],
        uncoveredFunctions: [],
        uncoveredLines: []
      };

      jest.spyOn(coverageAnalyzer, 'analyzeServerCoverage').mockResolvedValue(mockCoverage);
      jest.spyOn(coverageAnalyzer, 'analyzeClientCoverage').mockResolvedValue(mockCoverage);
      jest.spyOn(coverageAnalyzer, 'analyzeIntegrationCoverage').mockResolvedValue(mockCoverage);

      const report = await coverageAnalyzer.generateCoverageReport();

      // Overall coverage should be calculated from all three reports
      expect(report.overallCoverage.lines).toBe(80); // (40+40+40)/(50+50+50) = 80%
      expect(report.overallCoverage.functions).toBe(80);
      expect(report.overallCoverage.branches).toBe(80);
      expect(report.overallCoverage.statements).toBe(80);
    });
  });
});






