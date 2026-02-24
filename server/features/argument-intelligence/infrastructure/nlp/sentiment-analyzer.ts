// ============================================================================
// ARGUMENT INTELLIGENCE - Sentiment Analyzer
// ============================================================================
// Analyzes sentiment of text using rule-based and lexicon-based approaches

import { logger } from '@server/infrastructure/observability';

export interface SentimentResult {
  score: number; // -1.0 (very negative) to 1.0 (very positive)
  magnitude: number; // 0.0 to infinity (strength of sentiment)
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number; // 0.0 to 1.0
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions?: {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
  };
  details?: {
    positiveWords: string[];
    negativeWords: string[];
    intensifiers: string[];
    negations: string[];
  };
}

export interface SentimentConfig {
  includeEmotions: boolean;
  includeDetails: boolean;
  contextWindow: number; // Number of words to consider for context
  negationHandling: boolean;
  intensifierHandling: boolean;
}

export class SentimentAnalyzer {
  private readonly defaultConfig: SentimentConfig = {
    includeEmotions: false,
    includeDetails: false,
    contextWindow: 3,
    negationHandling: true,
    intensifierHandling: true
  };

  // Sentiment lexicons
  private readonly positiveWords = new Set([
    'good', 'great', 'excellent', 'wonderful', 'fantastic', 'amazing', 'outstanding',
    'beneficial', 'positive', 'helpful', 'useful', 'valuable', 'important', 'necessary',
    'support', 'agree', 'approve', 'favor', 'endorse', 'recommend', 'praise',
    'improve', 'enhance', 'strengthen', 'advance', 'progress', 'develop', 'grow',
    'success', 'achievement', 'victory', 'win', 'gain', 'benefit', 'advantage',
    'fair', 'just', 'right', 'proper', 'appropriate', 'reasonable', 'balanced',
    'transparent', 'accountable', 'responsible', 'ethical', 'honest', 'trustworthy',
    'effective', 'efficient', 'productive', 'successful', 'prosperous', 'thriving',
    'protect', 'safeguard', 'secure', 'defend', 'preserve', 'maintain', 'sustain',
    'empower', 'enable', 'facilitate', 'promote', 'encourage', 'foster', 'nurture',
    'innovative', 'creative', 'progressive', 'forward', 'modern', 'advanced',
    'inclusive', 'diverse', 'equitable', 'accessible', 'universal', 'comprehensive'
  ]);

  private readonly negativeWords = new Set([
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'inadequate', 'insufficient',
    'harmful', 'damaging', 'destructive', 'detrimental', 'adverse', 'negative',
    'oppose', 'disagree', 'reject', 'condemn', 'criticize', 'denounce', 'protest',
    'fail', 'failure', 'defeat', 'loss', 'decline', 'deteriorate', 'worsen',
    'unfair', 'unjust', 'wrong', 'improper', 'inappropriate', 'unreasonable',
    'corrupt', 'dishonest', 'unethical', 'fraudulent', 'deceptive', 'misleading',
    'ineffective', 'inefficient', 'unproductive', 'wasteful', 'costly', 'expensive',
    'threaten', 'endanger', 'risk', 'jeopardize', 'undermine', 'weaken', 'damage',
    'discriminate', 'exclude', 'marginalize', 'oppress', 'exploit', 'abuse',
    'regressive', 'backward', 'outdated', 'obsolete', 'archaic', 'primitive',
    'problem', 'issue', 'concern', 'challenge', 'difficulty', 'obstacle', 'barrier',
    'crisis', 'emergency', 'disaster', 'catastrophe', 'tragedy', 'calamity'
  ]);

  private readonly intensifiers = new Set([
    'very', 'extremely', 'highly', 'incredibly', 'exceptionally', 'remarkably',
    'particularly', 'especially', 'significantly', 'substantially', 'considerably',
    'absolutely', 'completely', 'totally', 'entirely', 'utterly', 'thoroughly',
    'deeply', 'profoundly', 'intensely', 'strongly', 'powerfully', 'greatly'
  ]);

  private readonly negations = new Set([
    'not', 'no', 'never', 'neither', 'nor', 'none', 'nobody', 'nothing', 'nowhere',
    'hardly', 'scarcely', 'barely', 'rarely', 'seldom', 'without', 'lack', 'lacking'
  ]);

  // Emotion lexicons
  private readonly joyWords = new Set([
    'happy', 'joy', 'delight', 'pleased', 'glad', 'cheerful', 'excited', 'thrilled',
    'celebrate', 'celebration', 'festive', 'jubilant', 'elated', 'ecstatic'
  ]);

  private readonly angerWords = new Set([
    'angry', 'anger', 'furious', 'outraged', 'enraged', 'mad', 'irritated', 'annoyed',
    'frustrated', 'resentful', 'hostile', 'aggressive', 'violent', 'rage'
  ]);

  private readonly fearWords = new Set([
    'fear', 'afraid', 'scared', 'frightened', 'terrified', 'anxious', 'worried',
    'nervous', 'concerned', 'alarmed', 'panic', 'dread', 'horror', 'terror'
  ]);

  private readonly sadnessWords = new Set([
    'sad', 'sadness', 'unhappy', 'depressed', 'miserable', 'sorrowful', 'grief',
    'mourning', 'disappointed', 'discouraged', 'hopeless', 'despair', 'tragic'
  ]);

  private readonly surpriseWords = new Set([
    'surprise', 'surprised', 'shocked', 'astonished', 'amazed', 'astounded',
    'unexpected', 'sudden', 'startled', 'stunned', 'bewildered', 'confused'
  ]);

  constructor() {}

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(
    text: string,
    config: Partial<SentimentConfig> = {}
  ): Promise<SentimentResult> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      logger.debug('Analyzing sentiment', {
        component: 'SentimentAnalyzer',
        textLength: text.length,
        config: finalConfig
      });

      // Preprocess text
      const words = this.preprocessText(text);

      // Analyze sentiment
      const sentimentScores = this.calculateSentimentScores(words, finalConfig);

      // Calculate overall score and magnitude
      const score = this.calculateOverallScore(sentimentScores);
      const magnitude = this.calculateMagnitude(sentimentScores);
      const label = this.getSentimentLabel(score);
      const confidence = this.calculateConfidence(sentimentScores, words.length);

      // Calculate breakdown
      const breakdown = {
        positive: sentimentScores.positive / Math.max(1, sentimentScores.total),
        negative: sentimentScores.negative / Math.max(1, sentimentScores.total),
        neutral: sentimentScores.neutral / Math.max(1, sentimentScores.total)
      };

      const result: SentimentResult = {
        score,
        magnitude,
        label,
        confidence,
        breakdown
      };

      // Add emotions if requested
      if (finalConfig.includeEmotions) {
        result.emotions = this.analyzeEmotions(words);
      }

      // Add details if requested
      if (finalConfig.includeDetails) {
        result.details = sentimentScores.details;
      }

      logger.debug('Sentiment analysis completed', {
        component: 'SentimentAnalyzer',
        score,
        label,
        confidence
      });

      return result;

    } catch (error) {
      logger.error('Sentiment analysis failed', {
        component: 'SentimentAnalyzer',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0,
        breakdown: { positive: 0, negative: 0, neutral: 1 }
      };
    }
  }

  /**
   * Batch analyze sentiment for multiple texts
   */
  async batchAnalyzeSentiment(
    texts: string[],
    config: Partial<SentimentConfig> = {}
  ): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];

    for (const text of texts) {
      const result = await this.analyzeSentiment(text, config);
      results.push(result);
    }

    return results;
  }

  /**
   * Compare sentiment between two texts
   */
  async compareSentiment(
    text1: string,
    text2: string,
    config: Partial<SentimentConfig> = {}
  ): Promise<{
    text1: SentimentResult;
    text2: SentimentResult;
    difference: number;
    agreement: boolean;
  }> {
    const result1 = await this.analyzeSentiment(text1, config);
    const result2 = await this.analyzeSentiment(text2, config);

    const difference = Math.abs(result1.score - result2.score);
    const agreement = (result1.score >= 0 && result2.score >= 0) || 
                     (result1.score < 0 && result2.score < 0);

    return {
      text1: result1,
      text2: result2,
      difference,
      agreement
    };
  }

  /**
   * Get sentiment trend over time
   */
  async analyzeSentimentTrend(
    texts: Array<{ text: string; timestamp: Date }>,
    config: Partial<SentimentConfig> = {}
  ): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
    scores: Array<{ score: number; timestamp: Date }>;
    volatility: number;
  }> {
    const results = await this.batchAnalyzeSentiment(
      texts.map(t => t.text),
      config
    );

    const scores = results.map((result, index) => ({
      score: result.score,
      timestamp: texts[index].timestamp
    }));

    const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    // Calculate trend using linear regression
    const trend = this.calculateTrend(scores);

    // Calculate volatility (standard deviation)
    const variance = scores.reduce((sum, s) => sum + Math.pow(s.score - averageScore, 2), 0) / scores.length;
    const volatility = Math.sqrt(variance);

    return {
      trend,
      averageScore,
      scores,
      volatility
    };
  }

  // Private helper methods

  private preprocessText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0);
  }

  private calculateSentimentScores(
    words: string[],
    config: SentimentConfig
  ): {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    details: {
      positiveWords: string[];
      negativeWords: string[];
      intensifiers: string[];
      negations: string[];
    };
  } {
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    const positiveWords: string[] = [];
    const negativeWords: string[] = [];
    const intensifiers: string[] = [];
    const negations: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let score = 0;
      let multiplier = 1.0;

      // Check for intensifiers in context window
      if (config.intensifierHandling) {
        for (let j = Math.max(0, i - config.contextWindow); j < i; j++) {
          if (this.intensifiers.has(words[j])) {
            multiplier = 1.5;
            intensifiers.push(words[j]);
          }
        }
      }

      // Check for negations in context window
      let isNegated = false;
      if (config.negationHandling) {
        for (let j = Math.max(0, i - config.contextWindow); j < i; j++) {
          if (this.negations.has(words[j])) {
            isNegated = true;
            negations.push(words[j]);
          }
        }
      }

      // Calculate base score
      if (this.positiveWords.has(word)) {
        score = 1.0 * multiplier;
        positiveWords.push(word);
      } else if (this.negativeWords.has(word)) {
        score = -1.0 * multiplier;
        negativeWords.push(word);
      }

      // Apply negation
      if (isNegated && score !== 0) {
        score = -score;
      }

      // Accumulate scores
      if (score > 0) {
        positive += score;
      } else if (score < 0) {
        negative += Math.abs(score);
      } else {
        neutral += 1;
      }
    }

    return {
      positive,
      negative,
      neutral,
      total: positive + negative + neutral,
      details: {
        positiveWords,
        negativeWords,
        intensifiers,
        negations
      }
    };
  }

  private calculateOverallScore(scores: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  }): number {
    if (scores.total === 0) return 0;

    const netSentiment = scores.positive - scores.negative;
    const totalSentiment = scores.positive + scores.negative;

    if (totalSentiment === 0) return 0;

    // Normalize to -1.0 to 1.0 range
    return netSentiment / totalSentiment;
  }

  private calculateMagnitude(scores: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  }): number {
    // Magnitude represents the strength of sentiment
    return scores.positive + scores.negative;
  }

  private getSentimentLabel(score: number): SentimentResult['label'] {
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    return 'neutral';
  }

  private calculateConfidence(
    scores: { positive: number; negative: number; neutral: number; total: number },
    wordCount: number
  ): number {
    // Confidence based on:
    // 1. Number of sentiment-bearing words
    // 2. Clarity of sentiment (not mixed)
    // 3. Text length

    const sentimentWordCount = scores.positive + scores.negative;
    const sentimentRatio = sentimentWordCount / Math.max(1, wordCount);

    // Higher ratio of sentiment words = higher confidence
    const ratioConfidence = Math.min(1.0, sentimentRatio * 2);

    // Less mixing of positive/negative = higher confidence
    const mixingPenalty = Math.min(scores.positive, scores.negative) / 
                         Math.max(1, scores.positive + scores.negative);
    const clarityConfidence = 1.0 - mixingPenalty;

    // More words = higher confidence (up to a point)
    const lengthConfidence = Math.min(1.0, wordCount / 50);

    // Combine factors
    return (ratioConfidence * 0.4 + clarityConfidence * 0.4 + lengthConfidence * 0.2);
  }

  private analyzeEmotions(words: string[]): SentimentResult['emotions'] {
    const emotions = {
      joy: 0,
      anger: 0,
      fear: 0,
      sadness: 0,
      surprise: 0
    };

    words.forEach(word => {
      if (this.joyWords.has(word)) emotions.joy++;
      if (this.angerWords.has(word)) emotions.anger++;
      if (this.fearWords.has(word)) emotions.fear++;
      if (this.sadnessWords.has(word)) emotions.sadness++;
      if (this.surpriseWords.has(word)) emotions.surprise++;
    });

    // Normalize to 0-1 range
    const total = Object.values(emotions).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      Object.keys(emotions).forEach(key => {
        emotions[key as keyof typeof emotions] /= total;
      });
    }

    return emotions;
  }

  private calculateTrend(
    scores: Array<{ score: number; timestamp: Date }>
  ): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';

    // Simple linear regression
    const n = scores.length;
    const x = scores.map((_, i) => i);
    const y = scores.map(s => s.score);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Determine trend based on slope
    if (slope > 0.1) return 'improving';
    if (slope < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Get sentiment statistics for a collection of results
   */
  calculateSentimentStatistics(results: SentimentResult[]): {
    averageScore: number;
    averageMagnitude: number;
    distribution: {
      very_negative: number;
      negative: number;
      neutral: number;
      positive: number;
      very_positive: number;
    };
    averageConfidence: number;
    polarization: number; // How divided the sentiment is
  } {
    if (results.length === 0) {
      return {
        averageScore: 0,
        averageMagnitude: 0,
        distribution: {
          very_negative: 0,
          negative: 0,
          neutral: 0,
          positive: 0,
          very_positive: 0
        },
        averageConfidence: 0,
        polarization: 0
      };
    }

    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const averageMagnitude = results.reduce((sum, r) => sum + r.magnitude, 0) / results.length;
    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    const distribution = {
      very_negative: results.filter(r => r.label === 'very_negative').length,
      negative: results.filter(r => r.label === 'negative').length,
      neutral: results.filter(r => r.label === 'neutral').length,
      positive: results.filter(r => r.label === 'positive').length,
      very_positive: results.filter(r => r.label === 'very_positive').length
    };

    // Calculate polarization (variance in scores)
    const variance = results.reduce((sum, r) => sum + Math.pow(r.score - averageScore, 2), 0) / results.length;
    const polarization = Math.sqrt(variance);

    return {
      averageScore,
      averageMagnitude,
      distribution,
      averageConfidence,
      polarization
    };
  }
}
