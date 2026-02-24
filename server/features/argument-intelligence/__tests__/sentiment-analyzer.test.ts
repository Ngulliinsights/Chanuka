// ============================================================================
// ARGUMENT INTELLIGENCE - Sentiment Analyzer Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { SentimentAnalyzer } from '../infrastructure/nlp/sentiment-analyzer';

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe('analyzeSentiment', () => {
    it('should identify positive sentiment', async () => {
      const text = 'This bill is excellent and will greatly benefit our community. It is a wonderful initiative that will improve lives.';
      const result = await analyzer.analyzeSentiment(text);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.label).toMatch(/positive/);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.breakdown.positive).toBeGreaterThan(result.breakdown.negative);
    });

    it('should identify negative sentiment', async () => {
      const text = 'This bill is terrible and harmful. It will damage our economy and hurt citizens. This is a bad policy.';
      const result = await analyzer.analyzeSentiment(text);

      expect(result.score).toBeLessThan(-0.3);
      expect(result.label).toMatch(/negative/);
      expect(result.breakdown.negative).toBeGreaterThan(result.breakdown.positive);
    });

    it('should identify neutral sentiment', async () => {
      const text = 'The bill proposes changes to the tax code. It includes several provisions. The implementation date is next year.';
      const result = await analyzer.analyzeSentiment(text);

      expect(result.score).toBeGreaterThanOrEqual(-0.3);
      expect(result.score).toBeLessThanOrEqual(0.3);
      expect(result.label).toBe('neutral');
    });

    it('should handle intensifiers correctly', async () => {
      const text1 = 'This is good.';
      const text2 = 'This is very good.';

      const result1 = await analyzer.analyzeSentiment(text1);
      const result2 = await analyzer.analyzeSentiment(text2, {
        includeDetails: true,
        intensifierHandling: true
      });

      expect(result2.score).toBeGreaterThan(result1.score);
      expect(result2.details?.intensifiers).toContain('very');
    });

    it('should handle negations correctly', async () => {
      const text1 = 'This is good.';
      const text2 = 'This is not good.';

      const result1 = await analyzer.analyzeSentiment(text1);
      const result2 = await analyzer.analyzeSentiment(text2, {
        includeDetails: true,
        negationHandling: true
      });

      expect(result2.score).toBeLessThan(result1.score);
      expect(result2.details?.negations).toContain('not');
    });

    it('should include emotion analysis when requested', async () => {
      const text = 'I am very happy and excited about this wonderful bill!';
      const result = await analyzer.analyzeSentiment(text, {
        includeEmotions: true
      });

      expect(result.emotions).toBeDefined();
      expect(result.emotions?.joy).toBeGreaterThan(0);
    });

    it('should include details when requested', async () => {
      const text = 'This excellent bill will greatly improve our community.';
      const result = await analyzer.analyzeSentiment(text, {
        includeDetails: true
      });

      expect(result.details).toBeDefined();
      expect(result.details?.positiveWords).toContain('excellent');
      expect(result.details?.positiveWords).toContain('improve');
    });

    it('should handle empty text', async () => {
      const result = await analyzer.analyzeSentiment('');

      expect(result.score).toBe(0);
      expect(result.label).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('should calculate magnitude correctly', async () => {
      const text1 = 'This is good.';
      const text2 = 'This is excellent, wonderful, amazing, and fantastic!';

      const result1 = await analyzer.analyzeSentiment(text1);
      const result2 = await analyzer.analyzeSentiment(text2);

      expect(result2.magnitude).toBeGreaterThan(result1.magnitude);
    });
  });

  describe('batchAnalyzeSentiment', () => {
    it('should analyze multiple texts', async () => {
      const texts = [
        'This is excellent.',
        'This is terrible.',
        'This is neutral.'
      ];

      const results = await analyzer.batchAnalyzeSentiment(texts);

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[1].score).toBeLessThan(0);
      expect(Math.abs(results[2].score)).toBeLessThan(0.3);
    });

    it('should handle empty array', async () => {
      const results = await analyzer.batchAnalyzeSentiment([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('compareSentiment', () => {
    it('should compare sentiment between two texts', async () => {
      const text1 = 'This bill is excellent and beneficial.';
      const text2 = 'This bill is terrible and harmful.';

      const comparison = await analyzer.compareSentiment(text1, text2);

      expect(comparison.text1.score).toBeGreaterThan(0);
      expect(comparison.text2.score).toBeLessThan(0);
      expect(comparison.difference).toBeGreaterThan(0);
      expect(comparison.agreement).toBe(false);
    });

    it('should detect agreement in sentiment', async () => {
      const text1 = 'This bill is good.';
      const text2 = 'This bill is excellent.';

      const comparison = await analyzer.compareSentiment(text1, text2);

      expect(comparison.agreement).toBe(true);
    });
  });

  describe('analyzeSentimentTrend', () => {
    it('should detect improving trend', async () => {
      const texts = [
        { text: 'This is bad.', timestamp: new Date('2024-01-01') },
        { text: 'This is okay.', timestamp: new Date('2024-01-02') },
        { text: 'This is good.', timestamp: new Date('2024-01-03') },
        { text: 'This is excellent.', timestamp: new Date('2024-01-04') }
      ];

      const trend = await analyzer.analyzeSentimentTrend(texts);

      expect(trend.trend).toBe('improving');
      expect(trend.scores).toHaveLength(4);
    });

    it('should detect declining trend', async () => {
      const texts = [
        { text: 'This is excellent.', timestamp: new Date('2024-01-01') },
        { text: 'This is good.', timestamp: new Date('2024-01-02') },
        { text: 'This is okay.', timestamp: new Date('2024-01-03') },
        { text: 'This is bad.', timestamp: new Date('2024-01-04') }
      ];

      const trend = await analyzer.analyzeSentimentTrend(texts);

      expect(trend.trend).toBe('declining');
    });

    it('should detect stable trend', async () => {
      const texts = [
        { text: 'This is okay.', timestamp: new Date('2024-01-01') },
        { text: 'This is fine.', timestamp: new Date('2024-01-02') },
        { text: 'This is acceptable.', timestamp: new Date('2024-01-03') }
      ];

      const trend = await analyzer.analyzeSentimentTrend(texts);

      expect(trend.trend).toBe('stable');
    });

    it('should calculate volatility', async () => {
      const texts = [
        { text: 'This is excellent.', timestamp: new Date('2024-01-01') },
        { text: 'This is terrible.', timestamp: new Date('2024-01-02') },
        { text: 'This is excellent.', timestamp: new Date('2024-01-03') },
        { text: 'This is terrible.', timestamp: new Date('2024-01-04') }
      ];

      const trend = await analyzer.analyzeSentimentTrend(texts);

      expect(trend.volatility).toBeGreaterThan(0.5);
    });
  });

  describe('calculateSentimentStatistics', () => {
    it('should calculate statistics for multiple results', async () => {
      const texts = [
        'This is excellent.',
        'This is good.',
        'This is okay.',
        'This is bad.',
        'This is terrible.'
      ];

      const results = await analyzer.batchAnalyzeSentiment(texts);
      const stats = analyzer.calculateSentimentStatistics(results);

      expect(stats.averageScore).toBeDefined();
      expect(stats.averageMagnitude).toBeDefined();
      expect(stats.distribution).toBeDefined();
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.polarization).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const stats = analyzer.calculateSentimentStatistics([]);

      expect(stats.averageScore).toBe(0);
      expect(stats.averageMagnitude).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.polarization).toBe(0);
    });

    it('should calculate distribution correctly', async () => {
      const texts = [
        'This is excellent.',
        'This is excellent.',
        'This is terrible.',
        'This is okay.'
      ];

      const results = await analyzer.batchAnalyzeSentiment(texts);
      const stats = analyzer.calculateSentimentStatistics(results);

      expect(stats.distribution.positive + stats.distribution.very_positive).toBeGreaterThan(0);
      expect(stats.distribution.negative + stats.distribution.very_negative).toBeGreaterThan(0);
      expect(stats.distribution.neutral).toBeGreaterThan(0);
    });
  });

  describe('accuracy requirements', () => {
    it('should achieve >80% accuracy on positive sentiment', async () => {
      const positiveTexts = [
        'This bill is excellent and will benefit everyone.',
        'I strongly support this wonderful initiative.',
        'This is a great policy that will improve lives.',
        'Outstanding work on this beneficial legislation.',
        'This positive change is necessary and important.'
      ];

      const results = await analyzer.batchAnalyzeSentiment(positiveTexts);
      const correctPredictions = results.filter(r => r.score > 0).length;
      const accuracy = correctPredictions / results.length;

      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });

    it('should achieve >80% accuracy on negative sentiment', async () => {
      const negativeTexts = [
        'This bill is terrible and will harm citizens.',
        'I strongly oppose this harmful legislation.',
        'This is a bad policy that will damage our economy.',
        'This destructive bill threatens our community.',
        'This negative change is unnecessary and dangerous.'
      ];

      const results = await analyzer.batchAnalyzeSentiment(negativeTexts);
      const correctPredictions = results.filter(r => r.score < 0).length;
      const accuracy = correctPredictions / results.length;

      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });
});
