import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExpertVerificationService, VerificationStatus } from './ExpertVerificationService.ts';
import { logger } from '../../utils/logger';

describe('ExpertVerificationService', () => {
  let service: ExpertVerificationService;

  beforeEach(() => {
    service = new ExpertVerificationService();
  });

  describe('submitForReview', () => {
    it('should successfully submit an analysis for review', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        topic: 'constitutional law',
        content: 'Test analysis content',
        billId: 1,
        analysisType: 'legal',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.submitForReview(mockAnalysis);
      expect(result).toBeTruthy();
      expect(result).toBe('verification-analysis-123');
    });

    it('should handle submission with no qualified experts', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        topic: 'unknown topic',
        content: 'Test analysis content',
        billId: 1,
        analysisType: 'legal',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.submitForReview(mockAnalysis);
      expect(result).toBe('');
    });

    it('should throw error for invalid analysis', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        topic: '',
        content: '',
        billId: 1,
        analysisType: 'legal',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(service.submitForReview(mockAnalysis)).rejects.toThrow('Invalid analysis data');
    });
  });

  describe('processVerification', () => {
    it('should process expert verification successfully', async () => {
      const analysisId = 'analysis-123';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.APPROVED;

      await expect(
        service.processVerification(analysisId, expertId, verdict),
      ).resolves.not.toThrow();
    });

    it('should throw error for invalid analysis ID', async () => {
      const analysisId = 'invalid-id';
      const expertId = 'expert-123';
      const verdict = VerificationStatus.APPROVED;

      await expect(service.processVerification(analysisId, expertId, verdict)).rejects.toThrow(
        'Analysis not found',
      );
    });

    it('should throw error for missing expert ID', async () => {
      const analysisId = 'analysis-123';
      const expertId = '';
      const verdict = VerificationStatus.APPROVED;

      await expect(service.processVerification(analysisId, expertId, verdict)).rejects.toThrow(
        'Invalid verification data',
      );
    });
  });
});









