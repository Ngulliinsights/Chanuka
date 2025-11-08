import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { analysisService } from '../analysis';

// Mock dependencies
vi.mock('../utils/browser-logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../apiService', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

// Mock the analysis service module to avoid import issues
vi.mock('../analysis', () => ({
  analysisService: {
    analyzeBill: vi.fn(),
    getConflictAnalysis: vi.fn(),
    analyzeBills: vi.fn(),
  },
}));

describe('AnalysisService', () => {
  let mockApiService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Access the mocked apiService
    mockApiService = vi.mocked(require('../apiService').apiService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeBill', () => {
    it('should throw error for invalid bill ID', async () => {
      await expect(analysisService.analyzeBill(0)).rejects.toThrow('Invalid bill ID: must be a positive integer');
      await expect(analysisService.analyzeBill(-1)).rejects.toThrow('Invalid bill ID: must be a positive integer');
      await expect(analysisService.analyzeBill(1.5)).rejects.toThrow('Invalid bill ID: must be a positive integer');
    });

    it('should return successful analysis data', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        bill_id: 123,
        conflictScore: 50,
        transparencyRating: 80,
        stakeholderAnalysis: [],
        constitutionalConcerns: [],
        publicBenefit: 70,
        corporateInfluence: [],
        timestamp: new Date().toISOString(),
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockAnalysis,
      });

      const result = await analysisService.analyzeBill(123);

      expect(result).toEqual({
        ...mockAnalysis,
        timestamp: expect.any(Date),
      });
      expect(mockApiService.get).toHaveBeenCalledWith('/api/bills/123/analysis', {
        fallbackData: expect.any(Object),
      });
    });

    it('should use fallback data when API fails', async () => {
      const { logger } = require('../utils/browser-logger');

      mockApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
        data: null,
      });

      const result = await analysisService.analyzeBill(123);

      expect(result).toHaveProperty('id', 'analysis-123-123'); // Mock data based on bill_id
      expect(result).toHaveProperty('bill_id', 123);
      expect(logger.warn).toHaveBeenCalledWith(
        'Using fallback analysis for bill 123',
        expect.objectContaining({
          error: 'API Error',
          status: undefined,
        })
      );
    });

    it('should validate analysis data structure', async () => {
      const invalidData = {
        bill_id: 123,
        // Missing required fields
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(analysisService.analyzeBill(123)).rejects.toThrow(
        'Invalid analysis data from API: missing fields id, conflictScore, transparencyRating'
      );
    });

    it('should handle API response without success field', async () => {
      mockApiService.get.mockResolvedValue({
        data: null,
      });

      await expect(analysisService.analyzeBill(123)).rejects.toThrow('No analysis data available');
    });

    it('should generate consistent mock data', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
        data: null,
      });

      const result1 = await analysisService.analyzeBill(456);
      const result2 = await analysisService.analyzeBill(456);

      expect(result1.id).toBe(result2.id);
      expect(result1.conflictScore).toBe(result2.conflictScore);
    });
  });

  describe('getConflictAnalysis', () => {
    it('should return conflict analysis with risk assessment', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        bill_id: 123,
        conflictScore: 85, // High conflict
        transparencyRating: 60,
        stakeholderAnalysis: [],
        constitutionalConcerns: [],
        publicBenefit: 40,
        corporateInfluence: [
          { organization: 'Corp A', connectionType: 'financial', influenceLevel: 9, potentialConflict: true },
        ],
        timestamp: new Date(),
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockAnalysis,
      });

      const result = await analysisService.getConflictAnalysis(123);

      expect(result).toEqual({
        overallRisk: 'high',
        conflicts: [{ organization: 'Corp A', connectionType: 'financial', influenceLevel: 9, potentialConflict: true }],
        recommendations: expect.arrayContaining([
          'Recommend independent ethics review before proceeding with vote',
          'Require additional disclosure documentation and public comment period',
          'Consider recusal from voting by sponsors with direct financial ties',
        ]),
        analysisDate: mockAnalysis.timestamp,
      });
    });

    it('should calculate medium risk correctly', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        bill_id: 123,
        conflictScore: 50,
        transparencyRating: 80,
        stakeholderAnalysis: [],
        constitutionalConcerns: [],
        publicBenefit: 70,
        corporateInfluence: [],
        timestamp: new Date(),
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockAnalysis,
      });

      const result = await analysisService.getConflictAnalysis(123);

      expect(result.overallRisk).toBe('medium');
    });

    it('should generate recommendations based on analysis', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        bill_id: 123,
        conflictScore: 30,
        transparencyRating: 30, // Low transparency
        stakeholderAnalysis: [
          { group: 'Test Group', impactLevel: 'high' as const, description: 'High impact', affectedPopulation: 1000 },
        ],
        constitutionalConcerns: [],
        publicBenefit: 20,
        corporateInfluence: [],
        timestamp: new Date(),
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockAnalysis,
      });

      const result = await analysisService.getConflictAnalysis(123);

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          'Require additional disclosure documentation and public comment period',
          'Conduct public hearings with affected stakeholder groups',
          'Re-evaluate bill provisions: low public benefit with high conflict risk',
        ])
      );
    });
  });

  describe('analyzeBills', () => {
    it('should analyze multiple bills in parallel', async () => {
      const mockAnalysis1 = {
        id: 'analysis-1',
        bill_id: 1,
        conflictScore: 50,
        transparencyRating: 80,
        stakeholderAnalysis: [],
        constitutionalConcerns: [],
        publicBenefit: 70,
        corporateInfluence: [],
        timestamp: new Date().toISOString(),
      };

      const mockAnalysis2 = {
        id: 'analysis-2',
        bill_id: 2,
        conflictScore: 40,
        transparencyRating: 90,
        stakeholderAnalysis: [],
        constitutionalConcerns: [],
        publicBenefit: 80,
        corporateInfluence: [],
        timestamp: new Date().toISOString(),
      };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockAnalysis1,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockAnalysis2,
        });

      const result = await analysisService.analyzeBills([1, 2]);

      expect(result.size).toBe(2);
      expect(result.get(1)).toEqual({
        ...mockAnalysis1,
        timestamp: expect.any(Date),
      });
      expect(result.get(2)).toEqual({
        ...mockAnalysis2,
        timestamp: expect.any(Date),
      });
    });

    it('should handle partial failures gracefully', async () => {
      const { logger } = require('../utils/browser-logger');

      const mockAnalysis = {
        id: 'analysis-1',
        bill_id: 1,
        conflictScore: 50,
        transparencyRating: 80,
        stakeholderAnalysis: [],
        constitutionalConcerns: [],
        publicBenefit: 70,
        corporateInfluence: [],
        timestamp: new Date().toISOString(),
      };

      mockApiService.get
        .mockResolvedValueOnce({
          success: true,
          data: mockAnalysis,
        })
        .mockRejectedValueOnce(new Error('API Error for bill 2'));

      const result = await analysisService.analyzeBills([1, 2]);

      expect(result.size).toBe(1);
      expect(result.get(1)).toBeDefined();
      expect(result.get(2)).toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to analyze bill 2 in batch',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should return empty map for empty input', async () => {
      const result = await analysisService.analyzeBills([]);

      expect(result.size).toBe(0);
    });

    it('should handle all failures', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      const result = await analysisService.analyzeBills([1, 2]);

      expect(result.size).toBe(0);
    });
  });

  describe('mock data generation', () => {
    it('should generate valid stakeholder analysis', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
        data: null,
      });

      const result = await analysisService.analyzeBill(1);

      expect(result.stakeholderAnalysis).toBeDefined();
      expect(Array.isArray(result.stakeholderAnalysis)).toBe(true);
      expect(result.stakeholderAnalysis.length).toBeGreaterThan(0);

      const stakeholder = result.stakeholderAnalysis[0];
      expect(stakeholder).toHaveProperty('group');
      expect(stakeholder).toHaveProperty('impactLevel');
      expect(stakeholder).toHaveProperty('description');
      expect(stakeholder).toHaveProperty('affectedPopulation');
    });

    it('should generate constitutional concerns', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
        data: null,
      });

      const result = await analysisService.analyzeBill(2);

      expect(result.constitutionalConcerns).toBeDefined();
      expect(Array.isArray(result.constitutionalConcerns)).toBe(true);
    });

    it('should generate corporate influence data', async () => {
      mockApiService.get.mockResolvedValue({
        success: false,
        error: { message: 'API Error' },
        data: null,
      });

      const result = await analysisService.analyzeBill(3);

      expect(result.corporateInfluence).toBeDefined();
      expect(Array.isArray(result.corporateInfluence)).toBe(true);
    });
  });
});