// ============================================================================
// ARGUMENT INTELLIGENCE - Sentence Classifier
// ============================================================================
// Classifies sentences by their argumentative function using NLP techniques

import { logger } from '@shared/core/index.js';

export interface ClassificationResult {
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment';
  confidence: number;
  indicators: string[];
  reasoning: string;
}

export interface SentenceFeatures {
  text: string;
  length: number;
  hasNumbers: boolean;
  hasQuestions: boolean;
  hasModalVerbs: boolean;
  hasEvidenceWords: boolean;
  hasCausalWords: boolean;
  hasOpinionWords: boolean;
  hasFutureWords: boolean;
  sentimentPolarity: number;
}

export class SentenceClassifier {
  private readonly evidenceWords = [
    'study', 'research', 'data', 'statistics', 'report', 'survey', 'analysis',
    'evidence', 'proof', 'findings', 'results', 'according to', 'shows that',
    'indicates', 'demonstrates', 'reveals', 'confirms', 'suggests'
  ];

  private readonly causalWords = [
    'because', 'since', 'due to', 'as a result', 'therefore', 'thus',
    'consequently', 'leads to', 'causes', 'results in', 'stems from',
    'owing to', 'given that', 'considering that'
  ];

  private readonly opinionWords = [
    'believe', 'think', 'feel', 'opinion', 'view', 'perspective', 'stance',
    'position', 'personally', 'in my view', 'i think', 'i believe',
    'should', 'ought to', 'must', 'need to', 'important', 'essential'
  ];

  private readonly futureWords = [
    'will', 'would', 'could', 'might', 'may', 'shall', 'going to',
    'predict', 'forecast', 'expect', 'anticipate', 'likely', 'probably',
    'future', 'tomorrow', 'next', 'upcoming', 'eventually'
  ];

  private readonly modalVerbs = [
    'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would'
  ];

  constructor() {}

  /**
   * Classify a sentence by its argumentative function
   */
  async classify(sentence: string): Promise<ClassificationResult> {
    try {
      // Extract features from the sentence
      const features = this.extractFeatures(sentence);

      // Apply classification rules
      const classifications = this.applyClassificationRules(features);

      // Select the best classification
      const bestClassification = this.selectBestClassification(classifications);

      logger.debug(`Classified sentence as ${bestClassification.type}`, {
        component: 'SentenceClassifier',
        confidence: bestClassification.confidence,
        sentence: sentence.substring(0, 100)
      });

      return bestClassification;

    } catch (error) {
      logger.error(`Sentence classification failed`, {
        component: 'SentenceClassifier',
        error: error instanceof Error ? error.message : String(error),
        sentence: sentence.substring(0, 100)
      });

      // Return default classification
      return {
        type: 'claim',
        confidence: 0.3,
        indicators: [],
        reasoning: 'Classification failed, defaulting to claim'
      };
    }
  }

  /**
   * Batch classify multiple sentences
   */
  async batchClassify(sentences: string[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (const sentence of sentences) {
      const result = await this.classify(sentence);
      results.push(result);
    }

    return results;
  }

  /**
   * Get classification confidence for a specific type
   */
  async getTypeConfidence(sentence: string, type: ClassificationResult['type']): Promise<number> {
    const features = this.extractFeatures(sentence);
    const classifications = this.applyClassificationRules(features);
    
    const typeClassification = classifications.find(c => c.type === type);
    return typeClassification?.confidence || 0;
  }

  // Private helper methods

  private extractFeatures(sentence: string): SentenceFeatures {
    const lowerText = sentence.toLowerCase();
    
    return {
      text: sentence,
      length: sentence.length,
      hasNumbers: /\d/.test(sentence),
      hasQuestions: /\?/.test(sentence),
      hasModalVerbs: this.modalVerbs.some(modal => lowerText.includes(modal)),
      hasEvidenceWords: this.evidenceWords.some(word => lowerText.includes(word)),
      hasCausalWords: this.causalWords.some(word => lowerText.includes(word)),
      hasOpinionWords: this.opinionWords.some(word => lowerText.includes(word)),
      hasFutureWords: this.futureWords.some(word => lowerText.includes(word)),
      sentimentPolarity: this.calculateSentimentPolarity(sentence)
    };
  }

  private calculateSentimentPolarity(sentence: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'beneficial', 'positive', 'support', 'agree'];
    const negativeWords = ['bad', 'terrible', 'harmful', 'negative', 'oppose', 'disagree', 'wrong'];
    
    const lowerText = sentence.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount === 0 && negativeCount === 0) return 0;
    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  private applyClassificationRules(features: SentenceFeatures): ClassificationResult[] {
    const classifications: ClassificationResult[] = [];

    // Evidence classification
    const evidenceScore = this.calculateEvidenceScore(features);
    if (evidenceScore > 0) {
      classifications.push({
        type: 'evidence',
        confidence: evidenceScore,
        indicators: this.getEvidenceIndicators(features),
        reasoning: 'Contains evidence markers and supporting information'
      });
    }

    // Reasoning classification
    const reasoningScore = this.calculateReasoningScore(features);
    if (reasoningScore > 0) {
      classifications.push({
        type: 'reasoning',
        confidence: reasoningScore,
        indicators: this.getReasoningIndicators(features),
        reasoning: 'Contains causal or logical reasoning patterns'
      });
    }

    // Prediction classification
    const predictionScore = this.calculatePredictionScore(features);
    if (predictionScore > 0) {
      classifications.push({
        type: 'prediction',
        confidence: predictionScore,
        indicators: this.getPredictionIndicators(features),
        reasoning: 'Contains future-oriented or predictive language'
      });
    }

    // Value judgment classification
    const valueScore = this.calculateValueScore(features);
    if (valueScore > 0) {
      classifications.push({
        type: 'value_judgment',
        confidence: valueScore,
        indicators: this.getValueIndicators(features),
        reasoning: 'Contains opinion or value-based language'
      });
    }

    // Claim classification (default)
    const claimScore = this.calculateClaimScore(features);
    classifications.push({
      type: 'claim',
      confidence: claimScore,
      indicators: this.getClaimIndicators(features),
      reasoning: 'Contains assertive or declarative statements'
    });

    return classifications;
  }

  private calculateEvidenceScore(features: SentenceFeatures): number {
    let score = 0;

    if (features.hasEvidenceWords) score += 40;
    if (features.hasNumbers) score += 20;
    if (features.text.includes('according to') || features.text.includes('study shows')) score += 30;
    if (features.text.includes('%') || features.text.includes('percent')) score += 15;
    if (features.length > 100) score += 10; // Longer sentences often contain evidence

    // Reduce score for opinion markers
    if (features.hasOpinionWords) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  private calculateReasoningScore(features: SentenceFeatures): number {
    let score = 0;

    if (features.hasCausalWords) score += 50;
    if (features.text.toLowerCase().includes('therefore') || 
        features.text.toLowerCase().includes('thus')) score += 30;
    if (features.text.toLowerCase().includes('if') || 
        features.text.toLowerCase().includes('when')) score += 20;
    if (features.length > 80) score += 10; // Reasoning often requires longer explanations

    return Math.max(0, Math.min(100, score));
  }

  private calculatePredictionScore(features: SentenceFeatures): number {
    let score = 0;

    if (features.hasFutureWords) score += 40;
    if (features.hasModalVerbs) score += 20;
    if (features.text.toLowerCase().includes('will lead to') || 
        features.text.toLowerCase().includes('will result in')) score += 30;
    if (features.text.toLowerCase().includes('predict') || 
        features.text.toLowerCase().includes('forecast')) score += 25;

    return Math.max(0, Math.min(100, score));
  }

  private calculateValueScore(features: SentenceFeatures): number {
    let score = 0;

    if (features.hasOpinionWords) score += 35;
    if (Math.abs(features.sentimentPolarity) > 0.3) score += 25; // Strong sentiment
    if (features.text.toLowerCase().includes('should') || 
        features.text.toLowerCase().includes('ought')) score += 30;
    if (features.text.toLowerCase().includes('important') || 
        features.text.toLowerCase().includes('essential')) score += 20;

    return Math.max(0, Math.min(100, score));
  }

  private calculateClaimScore(features: SentenceFeatures): number {
    let score = 50; // Base score for claims

    // Boost for assertive language
    if (features.text.includes('is') || features.text.includes('are')) score += 10;
    if (!features.hasQuestions) score += 10; // Statements vs questions
    if (features.length > 50 && features.length < 150) score += 10; // Optimal claim length

    // Reduce for other types
    if (features.hasEvidenceWords) score -= 20;
    if (features.hasCausalWords) score -= 15;
    if (features.hasFutureWords) score -= 10;

    return Math.max(30, Math.min(100, score)); // Minimum 30% for default classification
  }

  private getEvidenceIndicators(features: SentenceFeatures): string[] {
    const indicators: string[] = [];
    
    if (features.hasEvidenceWords) indicators.push('evidence_words');
    if (features.hasNumbers) indicators.push('numerical_data');
    if (features.text.includes('%')) indicators.push('statistical_data');
    
    return indicators;
  }

  private getReasoningIndicators(features: SentenceFeatures): string[] {
    const indicators: string[] = [];
    
    if (features.hasCausalWords) indicators.push('causal_language');
    if (features.text.toLowerCase().includes('therefore')) indicators.push('logical_conclusion');
    if (features.text.toLowerCase().includes('if')) indicators.push('conditional_reasoning');
    
    return indicators;
  }

  private getPredictionIndicators(features: SentenceFeatures): string[] {
    const indicators: string[] = [];
    
    if (features.hasFutureWords) indicators.push('future_tense');
    if (features.hasModalVerbs) indicators.push('modal_verbs');
    if (features.text.toLowerCase().includes('predict')) indicators.push('prediction_language');
    
    return indicators;
  }

  private getValueIndicators(features: SentenceFeatures): string[] {
    const indicators: string[] = [];
    
    if (features.hasOpinionWords) indicators.push('opinion_language');
    if (Math.abs(features.sentimentPolarity) > 0.3) indicators.push('strong_sentiment');
    if (features.text.toLowerCase().includes('should')) indicators.push('normative_language');
    
    return indicators;
  }

  private getClaimIndicators(features: SentenceFeatures): string[] {
    const indicators: string[] = [];
    
    if (!features.hasQuestions) indicators.push('declarative_statement');
    if (features.text.includes('is') || features.text.includes('are')) indicators.push('assertive_language');
    
    return indicators;
  }

  private selectBestClassification(classifications: ClassificationResult[]): ClassificationResult {
    if (classifications.length === 0) {
      return {
        type: 'claim',
        confidence: 0.3,
        indicators: [],
        reasoning: 'No classifications found, defaulting to claim'
      };
    }

    // Sort by confidence and return the highest
    return classifications.sort((a, b) => b.confidence - a.confidence)[0];
  }

  /**
   * Train classifier with labeled examples (simplified version)
   */
  async trainWithExamples(examples: Array<{
    sentence: string;
    type: ClassificationResult['type'];
  }>): Promise<void> {
    // In a real implementation, this would update model weights
    // For now, we'll just log the training data
    logger.info(`Training classifier with ${examples.length} examples`, {
      component: 'SentenceClassifier'
    });

    // Analyze training examples to improve classification rules
    const typeStats = new Map<string, { count: number; avgLength: number; commonWords: string[] }>();
    
    examples.forEach(example => {
      const features = this.extractFeatures(example.sentence);
      const stats = typeStats.get(example.type) || { count: 0, avgLength: 0, commonWords: [] };
      
      stats.count++;
      stats.avgLength = (stats.avgLength * (stats.count - 1) + features.length) / stats.count;
      
      typeStats.set(example.type, stats);
    });

    logger.info(`Training analysis completed`, {
      component: 'SentenceClassifier',
      typeStats: Object.fromEntries(typeStats)
    });
  }

  /**
   * Evaluate classifier performance on test data
   */
  async evaluate(testData: Array<{
    sentence: string;
    expectedType: ClassificationResult['type'];
  }>): Promise<{
    accuracy: number;
    precisionByType: Map<string, number>;
    recallByType: Map<string, number>;
    confusionMatrix: Map<string, Map<string, number>>;
  }> {
    let correct = 0;
    const confusionMatrix = new Map<string, Map<string, number>>();
    const typeStats = new Map<string, { truePositives: number; falsePositives: number; falseNegatives: number }>();

    for (const test of testData) {
      const result = await this.classify(test.sentence);
      const predicted = result.type;
      const actual = test.expectedType;

      if (predicted === actual) correct++;

      // Update confusion matrix
      if (!confusionMatrix.has(actual)) {
        confusionMatrix.set(actual, new Map());
      }
      const actualRow = confusionMatrix.get(actual)!;
      actualRow.set(predicted, (actualRow.get(predicted) || 0) + 1);

      // Update type statistics
      if (!typeStats.has(actual)) {
        typeStats.set(actual, { truePositives: 0, falsePositives: 0, falseNegatives: 0 });
      }
      if (!typeStats.has(predicted)) {
        typeStats.set(predicted, { truePositives: 0, falsePositives: 0, falseNegatives: 0 });
      }

      if (predicted === actual) {
        typeStats.get(actual)!.truePositives++;
      } else {
        typeStats.get(actual)!.falseNegatives++;
        typeStats.get(predicted)!.falsePositives++;
      }
    }

    const accuracy = correct / testData.length;
    const precisionByType = new Map<string, number>();
    const recallByType = new Map<string, number>();

    typeStats.forEach((stats, type) => {
      const precision = stats.truePositives / (stats.truePositives + stats.falsePositives) || 0;
      const recall = stats.truePositives / (stats.truePositives + stats.falseNegatives) || 0;
      
      precisionByType.set(type, precision);
      recallByType.set(type, recall);
    });

    return {
      accuracy,
      precisionByType,
      recallByType,
      confusionMatrix
    };
  }
}