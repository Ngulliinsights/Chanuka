import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExpertVerificationService, VerificationStatus } from '../domain/ExpertVerificationService';
import { logger } from '../../../shared/core/src/observability/logging';

describe('ExpertVerificationService', () => {
  let service: ExpertVerificationService;

  // Helper function to create consistent mock analysis objects
  // This centralizes our test data creation and makes tests more maintainable
  const createMockAnalysis = (overrides = {}) => ({
    id: 'analysis-123',
    topic: 'constitutional law',
    content: 'Detailed analysis of constitutional implications for proposed legislation',
    billId: 1,
    analysisType: 'legal' as const,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    // Create a fresh instance before each test to ensure test isolation
    service = new ExpertVerificationService();
  });

  describe('submitForReview', () => {
    it('should successfully submit an analysis for review with qualified experts', async () => {
      const mockAnalysis = createMockAnalysis();

      const result = await service.submitForReview(mockAnalysis);
      
      // Verify that we received a verification ID in the expected format
      expect(result).toBeTruthy();
      expect(result).toBe('verification-analysis-123');
      expect(typeof result).toBe('string');
    });

    it('should return empty string when no qualified experts are available for the topic', async () => {
      // This simulates a scenario where the system cannot find experts
      // with expertise matching the analysis topic
      const mockAnalysis = createMockAnalysis({
        topic: 'unknown topic',
      });

      const result = await service.submitForReview(mockAnalysis);
      
      expect(result).toBe('');
    });

    it('should handle specialized topics appropriately', async () => {
      // Testing with a more specific topic to ensure the system
      // can handle various subject matter categories
      const mockAnalysis = createMockAnalysis({
        topic: 'environmental law',
      });

      const result = await service.submitForReview(mockAnalysis);
      
      // The result should either be a valid verification ID or empty string
      expect(typeof result).toBe('string');
    });

    it('should throw error when analysis has empty topic', async () => {
      const mockAnalysis = createMockAnalysis({
        topic: '',
      });

      await expect(service.submitForReview(mockAnalysis)).rejects.toThrow('Invalid analysis data');
    });

    it('should throw error when analysis has empty content', async () => {
      const mockAnalysis = createMockAnalysis({
        content: '',
      });

      await expect(service.submitForReview(mockAnalysis)).rejects.toThrow('Invalid analysis data');
    });

    it('should throw error when both topic and content are empty', async () => {
      // This tests the most severe validation failure case
      const mockAnalysis = createMockAnalysis({
        topic: '',
        content: '',
      });

      await expect(service.submitForReview(mockAnalysis)).rejects.toThrow('Invalid analysis data');
    });

    it('should handle analysis with minimum valid content length', async () => {
      // Edge case: testing the boundary of what constitutes valid content
      const mockAnalysis = createMockAnalysis({
        content: 'Valid content',
      });

      const result = await service.submitForReview(mockAnalysis);
      
      expect(result).toBeTruthy();
    });
  });

  describe('processVerification', () => {
    it('should process expert approval successfully', async () => {
      const analysisId = 'analysis-123';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.APPROVED;

      // This should complete without throwing any errors
      await expect(
        service.processVerification(analysisId, expertId, verdict),
      ).resolves.not.toThrow();
    });

    it('should process expert rejection successfully', async () => {
      // It's important to test that rejections are handled just as gracefully as approvals
      const analysisId = 'analysis-123';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.REJECTED;

      await expect(
        service.processVerification(analysisId, expertId, verdict),
      ).resolves.not.toThrow();
    });

    it('should handle pending status during verification process', async () => {
      // Testing the intermediate state where verification is in progress
      const analysisId = 'analysis-123';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.PENDING;

      await expect(
        service.processVerification(analysisId, expertId, verdict),
      ).resolves.not.toThrow();
    });

    it('should throw error when analysis ID does not exist', async () => {
      const analysisId = 'nonexistent-analysis-id';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.APPROVED;

      await expect(
        service.processVerification(analysisId, expertId, verdict)
      ).rejects.toThrow('Analysis not found');
    });

    it('should throw error when expert ID is empty string', async () => {
      const analysisId = 'analysis-123';
      const expertId = '';
      const verdict = VerificationStatus.APPROVED;

      await expect(
        service.processVerification(analysisId, expertId, verdict)
      ).rejects.toThrow('Invalid verification data');
    });

    it('should throw error when expert ID is missing (undefined)', async () => {
      // Testing a slightly different edge case where the ID is undefined rather than empty
      const analysisId = 'analysis-123';
      const expertId = undefined as any;
      const verdict = VerificationStatus.APPROVED;

      await expect(
        service.processVerification(analysisId, expertId, verdict)
      ).rejects.toThrow('Invalid verification data');
    });

    it('should throw error when analysis ID is empty string', async () => {
      const analysisId = '';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.APPROVED;

      await expect(
        service.processVerification(analysisId, expertId, verdict)
      ).rejects.toThrow('Invalid verification data');
    });

    it('should handle verification from different experts on same analysis', async () => {
      // This tests whether the system can handle multiple expert opinions
      // which is common in peer review processes
      const analysisId = 'analysis-123';
      const expertId1 = 'expert-123';
      const expertId2 = 'expert-456';
      const verdict = VerificationStatus.APPROVED;

      await expect(
        service.processVerification(analysisId, expertId1, verdict),
      ).resolves.not.toThrow();

      await expect(
        service.processVerification(analysisId, expertId2, verdict),
      ).resolves.not.toThrow();
    });
  });
});





































