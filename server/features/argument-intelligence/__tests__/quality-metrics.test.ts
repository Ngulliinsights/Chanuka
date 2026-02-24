// ============================================================================
// ARGUMENT INTELLIGENCE - Quality Metrics Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { QualityMetricsCalculator } from '../infrastructure/nlp/quality-metrics';

describe('QualityMetricsCalculator', () => {
  let calculator: QualityMetricsCalculator;

  beforeEach(() => {
    calculator = new QualityMetricsCalculator();
  });

  describe('calculateArgumentQuality', () => {
    it('should calculate quality for high-quality argument', async () => {
      const text = `According to recent research published in 2023, this bill will significantly improve healthcare access.
        The evidence shows that similar policies in other countries have reduced costs by 30%.
        Therefore, we should support this legislation because it addresses a critical need.`;

      const result = await calculator.calculateArgumentQuality(text);

      expect(result.overallScore).toBeGreaterThan(0.5);
      expect(result.dimensions.clarity).toBeGreaterThan(0.4);
      expect(result.dimensions.evidence).toBeGreaterThan(0.4);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should calculate quality for low-quality argument', async () => {
      const text = 'This is bad. I dont like it.';

      const result = await calculator.calculateArgumentQuality(text);

      expect(result.overallScore).toBeLessThan(0.6);
      expect(result.dimensions.evidence).toBeLessThan(0.4);
    });

    it('should detect evidence quality', async () => {
      const text = `According to a study by the Ministry of Health, 65% of citizens support this bill.
        Research data from 2023 shows significant benefits.`;

      const result = await calculator.calculateArgumentQuality(text);

      expect(result.dimensions.evidence).toBeGreaterThan(0.5);
    });

    it('should include details when requested', async () => {
      const text = 'This bill will improve healthcare according to research data.';

      const result = await calculator.calculateArgumentQuality(text, {
        includeDetails: true
      });

      expect(result.details).toBeDefined();
      expect(result.details?.wordCount).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const result = await calculator.calculateArgumentQuality('');

      expect(result.overallScore).toBe(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('calculateDebateQuality', () => {
    it('should calculate quality for debate', async () => {
      const arguments = [
        {
          text: 'According to research, this bill will improve healthcare access.',
          userId: 'user1',
          timestamp: new Date('2024-01-01')
        },
        {
          text: 'However, we must consider the implementation costs.',
          userId: 'user2',
          timestamp: new Date('2024-01-02')
        }
      ];

      const result = await calculator.calculateDebateQuality(arguments);

      expect(result.overallQuality).toBeGreaterThan(0);
      expect(result.diversity).toBeGreaterThan(0);
      expect(result.civility).toBeGreaterThan(0.5);
    });

    it('should handle empty arguments array', async () => {
      const result = await calculator.calculateDebateQuality([]);

      expect(result.overallQuality).toBe(0);
      expect(result.diversity).toBe(0);
    });
  });

  describe('quality metrics accuracy', () => {
    it('should correctly identify high-quality arguments', async () => {
      const highQualityTexts = [
        'According to a 2023 study, this bill will reduce costs by 25%. The evidence shows success in other countries.',
        'Research data indicates 70% support. Surveys show strong approval in three counties.',
        'This bill proposes three improvements with evidence showing 30% better outcomes.'
      ];

      const results = await calculator.batchCalculateQuality(highQualityTexts);
      const highQualityCount = results.filter(r => r.overallScore > 0.5).length;
      const accuracy = highQualityCount / results.length;

      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });
});
