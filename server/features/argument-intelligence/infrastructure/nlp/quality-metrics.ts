// ============================================================================
// ARGUMENT INTELLIGENCE - Quality Metrics Calculator
// ============================================================================
// Calculates quality metrics for arguments and debates

import { logger } from '@server/infrastructure/observability';

export interface QualityMetrics {
  overallScore: number; // 0.0 to 1.0
  dimensions: {
    clarity: number;
    evidence: number;
    reasoning: number;
    relevance: number;
    constructiveness: number;
  };
  confidence: number;
  details?: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    readabilityScore: number;
    evidenceCount: number;
    logicalConnectors: number;
    specificityScore: number;
  };
}

export interface DebateQualityMetrics {
  overallQuality: number; // 0.0 to 1.0
  diversity: number; // Variety of perspectives
  depth: number; // Level of engagement and detail
  civility: number; // Respectfulness of discourse
  evidenceQuality: number; // Quality of evidence provided
  participationBalance: number; // How balanced participation is
  details?: {
    totalArguments: number;
    uniqueParticipants: number;
    averageArgumentQuality: number;
    perspectiveDiversity: number;
    threadDepth: number;
    civilityViolations: number;
  };
}

export interface QualityConfig {
  includeDetails: boolean;
  strictMode: boolean; // Higher standards for quality
  contextAware: boolean; // Consider context in quality assessment
}

export class QualityMetricsCalculator {
  private readonly defaultConfig: QualityConfig = {
    includeDetails: false,
    strictMode: false,
    contextAware: true
  };

  // Quality indicators
  private readonly evidenceIndicators = new Set([
    'study', 'research', 'data', 'statistics', 'report', 'survey', 'analysis',
    'evidence', 'proof', 'fact', 'figure', 'number', 'percent', 'according to',
    'source', 'citation', 'reference', 'document', 'published', 'journal'
  ]);

  private readonly logicalConnectors = new Set([
    'therefore', 'thus', 'hence', 'consequently', 'as a result', 'because',
    'since', 'due to', 'owing to', 'given that', 'considering', 'whereas',
    'however', 'although', 'despite', 'nevertheless', 'furthermore', 'moreover',
    'additionally', 'in addition', 'similarly', 'likewise', 'conversely',
    'on the other hand', 'in contrast', 'alternatively', 'specifically',
    'for example', 'for instance', 'such as', 'namely', 'in particular'
  ]);

  private readonly vagueWords = new Set([
    'thing', 'stuff', 'something', 'someone', 'somewhere', 'somehow',
    'maybe', 'perhaps', 'possibly', 'probably', 'might', 'could',
    'some', 'many', 'few', 'several', 'various', 'different', 'certain'
  ]);

  private readonly civilityViolations = new Set([
    'stupid', 'idiot', 'fool', 'moron', 'dumb', 'ignorant', 'pathetic',
    'ridiculous', 'absurd', 'nonsense', 'garbage', 'trash', 'worthless',
    'shut up', 'shut your', 'you\'re wrong', 'you don\'t know', 'you have no idea'
  ]);

  constructor() {}

  /**
   * Calculate quality metrics for a single argument
   */
  async calculateArgumentQuality(
    text: string,
    config: Partial<QualityConfig> = {}
  ): Promise<QualityMetrics> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      logger.debug('Calculating argument quality', {
        component: 'QualityMetricsCalculator',
        textLength: text.length
      });

      // Calculate individual dimensions
      const clarity = this.calculateClarity(text);
      const evidence = this.calculateEvidenceQuality(text);
      const reasoning = this.calculateReasoningQuality(text);
      const relevance = this.calculateRelevance(text);
      const constructiveness = this.calculateConstructiveness(text);

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore({
        clarity,
        evidence,
        reasoning,
        relevance,
        constructiveness
      }, finalConfig.strictMode);

      // Calculate confidence
      const confidence = this.calculateQualityConfidence(text);

      const result: QualityMetrics = {
        overallScore,
        dimensions: {
          clarity,
          evidence,
          reasoning,
          relevance,
          constructiveness
        },
        confidence
      };

      // Add details if requested
      if (finalConfig.includeDetails) {
        result.details = this.calculateDetailedMetrics(text);
      }

      logger.debug('Quality metrics calculated', {
        component: 'QualityMetricsCalculator',
        overallScore,
        confidence
      });

      return result;

    } catch (error) {
      logger.error('Quality metrics calculation failed', {
        component: 'QualityMetricsCalculator',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        overallScore: 0,
        dimensions: {
          clarity: 0,
          evidence: 0,
          reasoning: 0,
          relevance: 0,
          constructiveness: 0
        },
        confidence: 0
      };
    }
  }

  /**
   * Calculate quality metrics for a debate/discussion
   */
  async calculateDebateQuality(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>,
    config: Partial<QualityConfig> = {}
  ): Promise<DebateQualityMetrics> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      logger.debug('Calculating debate quality', {
        component: 'QualityMetricsCalculator',
        argumentCount: arguments.length
      });

      // Calculate individual argument qualities
      const argumentQualities = await Promise.all(
        arguments.map(arg => this.calculateArgumentQuality(arg.text, config))
      );

      // Calculate debate-level metrics
      const diversity = this.calculateDiversity(arguments);
      const depth = this.calculateDepth(arguments, argumentQualities);
      const civility = this.calculateCivility(arguments);
      const evidenceQuality = this.calculateAverageEvidenceQuality(argumentQualities);
      const participationBalance = this.calculateParticipationBalance(arguments);

      // Calculate overall quality
      const overallQuality = this.calculateDebateOverallQuality({
        diversity,
        depth,
        civility,
        evidenceQuality,
        participationBalance
      });

      const result: DebateQualityMetrics = {
        overallQuality,
        diversity,
        depth,
        civility,
        evidenceQuality,
        participationBalance
      };

      // Add details if requested
      if (finalConfig.includeDetails) {
        result.details = {
          totalArguments: arguments.length,
          uniqueParticipants: new Set(arguments.map(a => a.userId)).size,
          averageArgumentQuality: argumentQualities.reduce((sum, q) => sum + q.overallScore, 0) / argumentQualities.length,
          perspectiveDiversity: diversity,
          threadDepth: this.calculateThreadDepth(arguments),
          civilityViolations: this.countCivilityViolations(arguments)
        };
      }

      logger.debug('Debate quality calculated', {
        component: 'QualityMetricsCalculator',
        overallQuality,
        argumentCount: arguments.length
      });

      return result;

    } catch (error) {
      logger.error('Debate quality calculation failed', {
        component: 'QualityMetricsCalculator',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        overallQuality: 0,
        diversity: 0,
        depth: 0,
        civility: 0,
        evidenceQuality: 0,
        participationBalance: 0
      };
    }
  }

  /**
   * Batch calculate quality metrics
   */
  async batchCalculateQuality(
    texts: string[],
    config: Partial<QualityConfig> = {}
  ): Promise<QualityMetrics[]> {
    return Promise.all(
      texts.map(text => this.calculateArgumentQuality(text, config))
    );
  }

  // Private calculation methods for argument quality

  private calculateClarity(text: string): number {
    const words = this.tokenize(text);
    const sentences = this.splitSentences(text);

    if (words.length === 0 || sentences.length === 0) return 0;

    // Factors affecting clarity:
    // 1. Average sentence length (optimal: 15-20 words)
    const avgSentenceLength = words.length / sentences.length;
    const lengthScore = this.scoreSentenceLength(avgSentenceLength);

    // 2. Vocabulary specificity (fewer vague words = better)
    const vagueWordCount = words.filter(w => this.vagueWords.has(w.toLowerCase())).length;
    const specificityScore = 1.0 - Math.min(1.0, vagueWordCount / Math.max(1, words.length) * 5);

    // 3. Readability (simplified Flesch reading ease)
    const readabilityScore = this.calculateReadability(text, words.length, sentences.length);

    // 4. Structure (presence of logical connectors)
    const connectorCount = this.countLogicalConnectors(text);
    const structureScore = Math.min(1.0, connectorCount / Math.max(1, sentences.length));

    // Weighted combination
    return (
      lengthScore * 0.25 +
      specificityScore * 0.30 +
      readabilityScore * 0.25 +
      structureScore * 0.20
    );
  }

  private calculateEvidenceQuality(text: string): number {
    const lowerText = text.toLowerCase();
    const words = this.tokenize(text);

    if (words.length === 0) return 0;

    // Count evidence indicators
    let evidenceCount = 0;
    this.evidenceIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        evidenceCount++;
      }
    });

    // Check for specific numbers/statistics
    const numberMatches = text.match(/\d+(?:\.\d+)?%?/g) || [];
    const hasNumbers = numberMatches.length > 0;

    // Check for citations/sources
    const hasCitations = /\(.*\d{4}.*\)/.test(text) || /according to/i.test(text);

    // Calculate score
    const evidenceRatio = Math.min(1.0, evidenceCount / 3); // Expect at least 3 indicators for max score
    const numberBonus = hasNumbers ? 0.2 : 0;
    const citationBonus = hasCitations ? 0.2 : 0;

    return Math.min(1.0, evidenceRatio * 0.6 + numberBonus + citationBonus);
  }

  private calculateReasoningQuality(text: string): number {
    const sentences = this.splitSentences(text);
    const lowerText = text.toLowerCase();

    if (sentences.length === 0) return 0;

    // Count logical connectors
    const connectorCount = this.countLogicalConnectors(text);

    // Check for causal reasoning
    const hasCausalReasoning = /because|since|due to|as a result|therefore|thus|hence/.test(lowerText);

    // Check for comparative reasoning
    const hasComparison = /compared to|in contrast|whereas|however|on the other hand/.test(lowerText);

    // Check for examples
    const hasExamples = /for example|for instance|such as|specifically/.test(lowerText);

    // Calculate score
    const connectorScore = Math.min(1.0, connectorCount / Math.max(1, sentences.length) * 2);
    const reasoningTypeScore = (
      (hasCausalReasoning ? 0.25 : 0) +
      (hasComparison ? 0.25 : 0) +
      (hasExamples ? 0.25 : 0)
    );

    return connectorScore * 0.5 + reasoningTypeScore + 0.25; // Base score of 0.25
  }

  private calculateRelevance(text: string): number {
    // Simplified relevance calculation
    // In a real implementation, this would compare against the bill/topic context
    
    const words = this.tokenize(text);
    if (words.length === 0) return 0;

    // Check for policy-relevant terms
    const policyTerms = new Set([
      'bill', 'law', 'legislation', 'policy', 'regulation', 'government',
      'parliament', 'citizen', 'public', 'community', 'society', 'rights',
      'economy', 'education', 'health', 'security', 'environment', 'justice'
    ]);

    const relevantWordCount = words.filter(w => policyTerms.has(w.toLowerCase())).length;
    const relevanceRatio = relevantWordCount / words.length;

    // Penalize very short arguments
    const lengthPenalty = words.length < 10 ? 0.5 : 1.0;

    return Math.min(1.0, relevanceRatio * 10 * lengthPenalty);
  }

  private calculateConstructiveness(text: string): number {
    const lowerText = text.toLowerCase();

    // Check for constructive elements
    const hasProposal = /propose|suggest|recommend|should|could|would be better/.test(lowerText);
    const hasSolution = /solution|alternative|instead|improve|enhance|address/.test(lowerText);
    const hasForwardLooking = /future|long-term|sustainable|develop|build|create/.test(lowerText);

    // Check for destructive elements
    const hasPersonalAttack = this.civilityViolations.has(lowerText);
    const isOnlyNegative = /^(no|not|never|don't|doesn't|won't|can't)/.test(lowerText.trim());

    // Calculate score
    let score = 0.3; // Base score

    if (hasProposal) score += 0.25;
    if (hasSolution) score += 0.25;
    if (hasForwardLooking) score += 0.20;

    if (hasPersonalAttack) score -= 0.3;
    if (isOnlyNegative) score -= 0.1;

    return Math.max(0, Math.min(1.0, score));
  }

  private calculateOverallScore(
    dimensions: QualityMetrics['dimensions'],
    strictMode: boolean
  ): number {
    // Weights for different dimensions
    const weights = strictMode
      ? { clarity: 0.25, evidence: 0.30, reasoning: 0.25, relevance: 0.15, constructiveness: 0.05 }
      : { clarity: 0.20, evidence: 0.20, reasoning: 0.20, relevance: 0.20, constructiveness: 0.20 };

    return (
      dimensions.clarity * weights.clarity +
      dimensions.evidence * weights.evidence +
      dimensions.reasoning * weights.reasoning +
      dimensions.relevance * weights.relevance +
      dimensions.constructiveness * weights.constructiveness
    );
  }

  private calculateQualityConfidence(text: string): number {
    const words = this.tokenize(text);
    const sentences = this.splitSentences(text);

    // Confidence based on text length and structure
    const lengthConfidence = Math.min(1.0, words.length / 50);
    const structureConfidence = Math.min(1.0, sentences.length / 3);

    return (lengthConfidence * 0.6 + structureConfidence * 0.4);
  }

  private calculateDetailedMetrics(text: string): QualityMetrics['details'] {
    const words = this.tokenize(text);
    const sentences = this.splitSentences(text);
    const avgSentenceLength = words.length / Math.max(1, sentences.length);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgSentenceLength,
      readabilityScore: this.calculateReadability(text, words.length, sentences.length),
      evidenceCount: this.countEvidenceIndicators(text),
      logicalConnectors: this.countLogicalConnectors(text),
      specificityScore: this.calculateSpecificity(words)
    };
  }

  // Private calculation methods for debate quality

  private calculateDiversity(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>
  ): number {
    // Measure diversity of perspectives
    const uniqueUsers = new Set(arguments.map(a => a.userId)).size;
    const userDiversity = Math.min(1.0, uniqueUsers / Math.max(1, arguments.length));

    // Measure vocabulary diversity (simplified)
    const allWords = arguments.flatMap(a => this.tokenize(a.text));
    const uniqueWords = new Set(allWords.map(w => w.toLowerCase()));
    const vocabularyDiversity = Math.min(1.0, uniqueWords.size / Math.max(1, allWords.length) * 2);

    return (userDiversity * 0.6 + vocabularyDiversity * 0.4);
  }

  private calculateDepth(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>,
    qualities: QualityMetrics[]
  ): number {
    if (arguments.length === 0) return 0;

    // Average argument length
    const avgLength = arguments.reduce((sum, a) => sum + this.tokenize(a.text).length, 0) / arguments.length;
    const lengthScore = Math.min(1.0, avgLength / 100);

    // Average quality
    const avgQuality = qualities.reduce((sum, q) => sum + q.overallScore, 0) / qualities.length;

    // Number of arguments (more = deeper discussion)
    const volumeScore = Math.min(1.0, arguments.length / 20);

    return (lengthScore * 0.3 + avgQuality * 0.5 + volumeScore * 0.2);
  }

  private calculateCivility(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>
  ): number {
    if (arguments.length === 0) return 1.0;

    const violations = this.countCivilityViolations(arguments);
    const violationRate = violations / arguments.length;

    // Exponential penalty for violations
    return Math.max(0, 1.0 - violationRate * 2);
  }

  private calculateAverageEvidenceQuality(qualities: QualityMetrics[]): number {
    if (qualities.length === 0) return 0;
    return qualities.reduce((sum, q) => sum + q.dimensions.evidence, 0) / qualities.length;
  }

  private calculateParticipationBalance(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>
  ): number {
    if (arguments.length === 0) return 1.0;

    // Count arguments per user
    const userCounts = new Map<string, number>();
    arguments.forEach(arg => {
      userCounts.set(arg.userId, (userCounts.get(arg.userId) || 0) + 1);
    });

    // Calculate Gini coefficient (0 = perfect equality, 1 = perfect inequality)
    const counts = Array.from(userCounts.values()).sort((a, b) => a - b);
    const n = counts.length;
    const sum = counts.reduce((s, c) => s + c, 0);

    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * counts[i];
    }
    gini = gini / (n * sum);

    // Convert to balance score (1 = perfect balance, 0 = perfect imbalance)
    return 1.0 - gini;
  }

  private calculateDebateOverallQuality(metrics: {
    diversity: number;
    depth: number;
    civility: number;
    evidenceQuality: number;
    participationBalance: number;
  }): number {
    return (
      metrics.diversity * 0.20 +
      metrics.depth * 0.25 +
      metrics.civility * 0.25 +
      metrics.evidenceQuality * 0.20 +
      metrics.participationBalance * 0.10
    );
  }

  private calculateThreadDepth(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>
  ): number {
    // Simplified thread depth calculation
    // In a real implementation, would analyze reply chains
    return Math.min(10, Math.floor(arguments.length / 3));
  }

  private countCivilityViolations(
    arguments: Array<{ text: string; userId: string; timestamp: Date }>
  ): number {
    let violations = 0;
    arguments.forEach(arg => {
      const lowerText = arg.text.toLowerCase();
      this.civilityViolations.forEach(violation => {
        if (lowerText.includes(violation)) {
          violations++;
        }
      });
    });
    return violations;
  }

  // Utility methods

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0);
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private scoreSentenceLength(avgLength: number): number {
    // Optimal sentence length is 15-20 words
    const optimal = 17.5;
    const deviation = Math.abs(avgLength - optimal);
    return Math.max(0, 1.0 - deviation / 30);
  }

  private calculateReadability(text: string, wordCount: number, sentenceCount: number): number {
    if (sentenceCount === 0 || wordCount === 0) return 0;

    // Simplified Flesch Reading Ease
    const avgSentenceLength = wordCount / sentenceCount;
    const avgSyllablesPerWord = this.estimateAvgSyllables(text, wordCount);

    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    // Normalize to 0-1 range (Flesch score ranges from 0-100)
    return Math.max(0, Math.min(1.0, score / 100));
  }

  private estimateAvgSyllables(text: string, wordCount: number): number {
    // Simplified syllable estimation
    const vowels = (text.match(/[aeiou]/gi) || []).length;
    return vowels / Math.max(1, wordCount);
  }

  private countEvidenceIndicators(text: string): number {
    const lowerText = text.toLowerCase();
    let count = 0;
    this.evidenceIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) count++;
    });
    return count;
  }

  private countLogicalConnectors(text: string): number {
    const lowerText = text.toLowerCase();
    let count = 0;
    this.logicalConnectors.forEach(connector => {
      if (lowerText.includes(connector)) count++;
    });
    return count;
  }

  private calculateSpecificity(words: string[]): number {
    if (words.length === 0) return 0;
    const vagueCount = words.filter(w => this.vagueWords.has(w.toLowerCase())).length;
    return 1.0 - Math.min(1.0, vagueCount / words.length * 5);
  }
}
