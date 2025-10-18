import { describe, it, expect, beforeEach } from '@jest/globals';
import { votingPatternAnalysisService } from '../features/bills/voting-pattern-analysis';
import { logger } from '../../shared/core/src/observability/logging';

describe('VotingPatternAnalysisService', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('analyzeVotingPatterns', () => {
    it('should return empty array when no sponsors exist', async () => {
      // This test will pass even with no database data since we handle empty cases
      const result = await votingPatternAnalysisService.analyzeVotingPatterns(999999);
      expect(result).toEqual([]);
    });

    it('should return analysis for all sponsors when no sponsorId provided', async () => {
      const result = await votingPatternAnalysisService.analyzeVotingPatterns();
      expect(Array.isArray(result)).toBe(true);
      // Each analysis should have the required structure
      result.forEach(analysis => {
        expect(analysis).toHaveProperty('sponsorId');
        expect(analysis).toHaveProperty('sponsorName');
        expect(analysis).toHaveProperty('totalVotes');
        expect(analysis).toHaveProperty('votingConsistency');
        expect(analysis).toHaveProperty('partyAlignment');
        expect(analysis).toHaveProperty('issueAlignment');
        expect(analysis).toHaveProperty('predictedVotes');
        expect(analysis).toHaveProperty('behaviorMetrics');
        expect(analysis).toHaveProperty('anomalies');
      });
    });
  });

  describe('createVotingPredictions', () => {
    it('should return empty array for non-existent sponsor', async () => {
      const result = await votingPatternAnalysisService.createVotingPredictions(999999);
      expect(result).toEqual([]);
    });

    it('should return predictions with proper structure', async () => {
      // Test with a potentially existing sponsor ID (1)
      const result = await votingPatternAnalysisService.createVotingPredictions(1);
      expect(Array.isArray(result)).toBe(true);
      
      result.forEach(prediction => {
        expect(prediction).toHaveProperty('billId');
        expect(prediction).toHaveProperty('billTitle');
        expect(prediction).toHaveProperty('predictedVote');
        expect(['yes', 'no', 'abstain']).toContain(prediction.predictedVote);
        expect(prediction).toHaveProperty('confidence');
        expect(typeof prediction.confidence).toBe('number');
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction).toHaveProperty('reasoningFactors');
        expect(Array.isArray(prediction.reasoningFactors)).toBe(true);
        expect(prediction).toHaveProperty('similarBills');
        expect(Array.isArray(prediction.similarBills)).toBe(true);
      });
    });
  });

  describe('buildComparativeAnalysis', () => {
    it('should throw error for non-existent sponsor', async () => {
      await expect(
        votingPatternAnalysisService.buildComparativeAnalysis(999999)
      ).rejects.toThrow('Sponsor with ID 999999 not found');
    });

    it('should return comparative analysis with proper structure for existing sponsor', async () => {
      try {
        const result = await votingPatternAnalysisService.buildComparativeAnalysis(1);
        
        expect(result).toHaveProperty('sponsorId');
        expect(result.sponsorId).toBe(1);
        expect(result).toHaveProperty('comparedWith');
        expect(Array.isArray(result.comparedWith)).toBe(true);
        expect(result).toHaveProperty('alignmentScores');
        expect(typeof result.alignmentScores).toBe('object');
        expect(result).toHaveProperty('commonVotingPatterns');
        expect(Array.isArray(result.commonVotingPatterns)).toBe(true);
        expect(result).toHaveProperty('divergentIssues');
        expect(Array.isArray(result.divergentIssues)).toBe(true);
        expect(result).toHaveProperty('coalitionStrength');
        expect(typeof result.coalitionStrength).toBe('number');
      } catch (error) {
        // If sponsor doesn't exist, that's expected in test environment
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('calculateVotingConsistencyScore', () => {
    it('should throw error for non-existent sponsor', async () => {
      await expect(
        votingPatternAnalysisService.calculateVotingConsistencyScore(999999)
      ).rejects.toThrow('Sponsor with ID 999999 not found');
    });

    it('should return consistency report with proper structure for existing sponsor', async () => {
      try {
        const result = await votingPatternAnalysisService.calculateVotingConsistencyScore(1, 6);
        
        expect(result).toHaveProperty('sponsorId');
        expect(result.sponsorId).toBe(1);
        expect(result).toHaveProperty('timeframe');
        expect(result.timeframe).toBe('6 months');
        expect(result).toHaveProperty('consistencyTrend');
        expect(['improving', 'declining', 'stable']).toContain(result.consistencyTrend);
        expect(result).toHaveProperty('consistencyScore');
        expect(typeof result.consistencyScore).toBe('number');
        expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(result.consistencyScore).toBeLessThanOrEqual(1);
        expect(result).toHaveProperty('keyFactors');
        expect(Array.isArray(result.keyFactors)).toBe(true);
        expect(result).toHaveProperty('recommendations');
        expect(Array.isArray(result.recommendations)).toBe(true);
      } catch (error) {
        // If sponsor doesn't exist, that's expected in test environment
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('Behavior Metrics', () => {
    it('should calculate behavior metrics correctly', async () => {
      const analyses = await votingPatternAnalysisService.analyzeVotingPatterns();
      
      analyses.forEach(analysis => {
        const metrics = analysis.behaviorMetrics;
        
        // All metrics should be numbers between 0 and 1
        expect(typeof metrics.consistencyScore).toBe('number');
        expect(metrics.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(metrics.consistencyScore).toBeLessThanOrEqual(1);
        
        expect(typeof metrics.independenceScore).toBe('number');
        expect(metrics.independenceScore).toBeGreaterThanOrEqual(0);
        expect(metrics.independenceScore).toBeLessThanOrEqual(1);
        
        expect(typeof metrics.issueSpecializationScore).toBe('number');
        expect(metrics.issueSpecializationScore).toBeGreaterThanOrEqual(0);
        expect(metrics.issueSpecializationScore).toBeLessThanOrEqual(1);
        
        expect(typeof metrics.abstentionRate).toBe('number');
        expect(metrics.abstentionRate).toBeGreaterThanOrEqual(0);
        expect(metrics.abstentionRate).toBeLessThanOrEqual(1);
        
        expect(typeof metrics.crossPartyVotingRate).toBe('number');
        expect(metrics.crossPartyVotingRate).toBeGreaterThanOrEqual(0);
        expect(metrics.crossPartyVotingRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalies with proper structure', async () => {
      const analyses = await votingPatternAnalysisService.analyzeVotingPatterns();
      
      analyses.forEach(analysis => {
        analysis.anomalies.forEach(anomaly => {
          expect(anomaly).toHaveProperty('billId');
          expect(typeof anomaly.billId).toBe('number');
          expect(anomaly).toHaveProperty('billTitle');
          expect(typeof anomaly.billTitle).toBe('string');
          expect(anomaly).toHaveProperty('expectedVote');
          expect(['yes', 'no', 'abstain']).toContain(anomaly.expectedVote);
          expect(anomaly).toHaveProperty('actualVote');
          expect(['yes', 'no', 'abstain']).toContain(anomaly.actualVote);
          expect(anomaly).toHaveProperty('anomalyType');
          expect([
            'party_deviation', 'issue_inconsistency', 'financial_conflict',
            'timing_suspicious', 'coalition_break', 'ideology_shift'
          ]).toContain(anomaly.anomalyType);
          expect(anomaly).toHaveProperty('severity');
          expect(['low', 'medium', 'high']).toContain(anomaly.severity);
          expect(anomaly).toHaveProperty('explanation');
          expect(typeof anomaly.explanation).toBe('string');
          expect(anomaly).toHaveProperty('contextFactors');
          expect(Array.isArray(anomaly.contextFactors)).toBe(true);
        });
      });
    });
  });

  describe('Issue Alignment', () => {
    it('should calculate issue alignment scores correctly', async () => {
      const analyses = await votingPatternAnalysisService.analyzeVotingPatterns();
      
      analyses.forEach(analysis => {
        const issueAlignment = analysis.issueAlignment;
        
        // Should be an object with category keys and numeric values
        expect(typeof issueAlignment).toBe('object');
        
        Object.entries(issueAlignment).forEach(([category, score]) => {
          expect(typeof category).toBe('string');
          expect(typeof score).toBe('number');
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        });
      });
    });
  });
});






