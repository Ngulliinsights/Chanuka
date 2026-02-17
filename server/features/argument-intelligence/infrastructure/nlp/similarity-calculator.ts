// ============================================================================
// ARGUMENT INTELLIGENCE - Similarity Calculator
// ============================================================================
// Calculates semantic similarity between texts using various methods

import { logger } from '@server/infrastructure/observability';

export interface SimilarityResult {
  similarity: number;
  method: 'jaccard' | 'cosine' | 'levenshtein' | 'semantic' | 'hybrid';
  confidence: number;
  details?: {
    sharedTerms?: string[];
    uniqueTerms1?: string[];
    uniqueTerms2?: string[];
    editDistance?: number;
    vectorSimilarity?: number;
  };
}

export interface SimilarityConfig {
  method: 'jaccard' | 'cosine' | 'levenshtein' | 'semantic' | 'hybrid';
  preprocessing: {
    lowercase: boolean;
    removeStopwords: boolean;
    stemming: boolean;
    removePunctuation: boolean;
  };
  weights?: {
    lexical: number;
    semantic: number;
    structural: number;
  };
}

export class SimilarityCalculator {
  private readonly defaultConfig: SimilarityConfig = {
    method: 'hybrid',
    preprocessing: {
      lowercase: true,
      removeStopwords: true,
      stemming: false,
      removePunctuation: true
    },
    weights: {
      lexical: 0.4,
      semantic: 0.4,
      structural: 0.2
    }
  };

  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);

  constructor() {}

  /**
   * Calculate similarity between two texts
   */
  async calculateSimilarity(
    text1: string,
    text2: string,
    config: Partial<SimilarityConfig> = {}
  ): Promise<number> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      const result = await this.calculateDetailedSimilarity(text1, text2, finalConfig);
      return result.similarity;
    } catch (error) {
      logger.error(`Similarity calculation failed`, {
        component: 'SimilarityCalculator',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Calculate detailed similarity with method information
   */
  async calculateDetailedSimilarity(
    text1: string,
    text2: string,
    config: Partial<SimilarityConfig> = {}
  ): Promise<SimilarityResult> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Preprocess texts
      const processed1 = this.preprocessText(text1, finalConfig.preprocessing);
      const processed2 = this.preprocessText(text2, finalConfig.preprocessing);

      // Calculate similarity based on method
      switch (finalConfig.method) {
        case 'jaccard':
          return this.calculateJaccardSimilarity(processed1, processed2);
        case 'cosine':
          return this.calculateCosineSimilarity(processed1, processed2);
        case 'levenshtein':
          return this.calculateLevenshteinSimilarity(processed1, processed2);
        case 'semantic':
          return await this.calculateSemanticSimilarity(processed1, processed2);
        case 'hybrid':
          return await this.calculateHybridSimilarity(processed1, processed2, finalConfig.weights!);
        default:
          throw new Error(`Unknown similarity method: ${finalConfig.method}`);
      }
    } catch (error) {
      logger.error(`Detailed similarity calculation failed`, {
        component: 'SimilarityCalculator',
        method: finalConfig.method,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        similarity: 0,
        method: finalConfig.method,
        confidence: 0
      };
    }
  }

  /**
   * Batch calculate similarities between one text and multiple others
   */
  async batchCalculateSimilarity(
    queryText: string,
    texts: string[],
    config: Partial<SimilarityConfig> = {}
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    const results: Array<{ text: string; similarity: number; index: number }> = [];

    for (let i = 0; i < texts.length; i++) {
      const similarity = await this.calculateSimilarity(queryText, texts[i], config);
      results.push({
        text: texts[i],
        similarity,
        index: i
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Find most similar texts above a threshold
   */
  async findSimilarTexts(
    queryText: string,
    candidateTexts: string[],
    threshold: number = 0.5,
    config: Partial<SimilarityConfig> = {}
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    const results = await this.batchCalculateSimilarity(queryText, candidateTexts, config);
    return results.filter(result => result.similarity >= threshold);
  }

  // Private similarity calculation methods

  private calculateJaccardSimilarity(text1: string, text2: string): SimilarityResult {
    const tokens1 = new Set(text1.split(/\s+/));
    const tokens2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    const similarity = union.size === 0 ? 0 : intersection.size / union.size;

    return {
      similarity,
      method: 'jaccard',
      confidence: 0.8,
      details: {
        sharedTerms: Array.from(intersection),
        uniqueTerms1: Array.from(new Set([...tokens1].filter(x => !tokens2.has(x)))),
        uniqueTerms2: Array.from(new Set([...tokens2].filter(x => !tokens1.has(x))))
      }
    };
  }

  private calculateCosineSimilarity(text1: string, text2: string): SimilarityResult {
    const tokens1 = text1.split(/\s+/);
    const tokens2 = text2.split(/\s+/);

    // Create term frequency vectors
    const allTerms = new Set([...tokens1, ...tokens2]);
    const vector1 = this.createTfVector(tokens1, allTerms);
    const vector2 = this.createTfVector(tokens2, allTerms);

    // Calculate cosine similarity
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    const similarity = (magnitude1 === 0 || magnitude2 === 0) ? 0 : dotProduct / (magnitude1 * magnitude2);

    return {
      similarity,
      method: 'cosine',
      confidence: 0.85,
      details: {
        vectorSimilarity: similarity
      }
    };
  }

  private calculateLevenshteinSimilarity(text1: string, text2: string): SimilarityResult {
    const editDistance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    const similarity = maxLength === 0 ? 1 : 1 - (editDistance / maxLength);

    return {
      similarity,
      method: 'levenshtein',
      confidence: 0.7,
      details: {
        editDistance
      }
    };
  }

  private async calculateSemanticSimilarity(text1: string, text2: string): Promise<SimilarityResult> {
    // Simplified semantic similarity using word overlap and context
    // In a real implementation, this would use word embeddings or transformer models
    
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);

    // Calculate semantic overlap using synonyms and related terms
    const semanticOverlap = this.calculateSemanticOverlap(words1, words2);
    
    // Calculate contextual similarity
    const contextualSimilarity = this.calculateContextualSimilarity(text1, text2);
    
    const similarity = (semanticOverlap + contextualSimilarity) / 2;

    return {
      similarity,
      method: 'semantic',
      confidence: 0.75,
      details: {
        vectorSimilarity: similarity
      }
    };
  }

  private async calculateHybridSimilarity(
    text1: string,
    text2: string,
    weights: { lexical: number; semantic: number; structural: number }
  ): Promise<SimilarityResult> {
    // Calculate different similarity measures
    const jaccardResult = this.calculateJaccardSimilarity(text1, text2);
    const cosineResult = this.calculateCosineSimilarity(text1, text2);
    const semanticResult = await this.calculateSemanticSimilarity(text1, text2);
    const structuralSimilarity = this.calculateStructuralSimilarity(text1, text2);

    // Combine similarities using weights
    const hybridSimilarity = 
      (jaccardResult.similarity * weights.lexical * 0.5) +
      (cosineResult.similarity * weights.lexical * 0.5) +
      (semanticResult.similarity * weights.semantic) +
      (structuralSimilarity * weights.structural);

    // Calculate confidence based on agreement between methods
    const similarities = [jaccardResult.similarity, cosineResult.similarity, semanticResult.similarity];
    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    const variance = similarities.reduce((sum, sim) => sum + Math.pow(sim - avgSimilarity, 2), 0) / similarities.length;
    const confidence = Math.max(0.5, 1 - variance); // Higher agreement = higher confidence

    return {
      similarity: hybridSimilarity,
      method: 'hybrid',
      confidence,
      details: {
        sharedTerms: jaccardResult.details?.sharedTerms,
        vectorSimilarity: cosineResult.details?.vectorSimilarity
      }
    };
  }

  // Helper methods

  private preprocessText(text: string, config: SimilarityConfig['preprocessing']): string {
    let processed = text;

    if (config.lowercase) {
      processed = processed.toLowerCase();
    }

    if (config.removePunctuation) {
      processed = processed.replace(/[^\w\s]/g, ' ');
    }

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    if (config.removeStopwords) {
      const words = processed.split(/\s+/);
      const filteredWords = words.filter(word => !this.stopWords.has(word));
      processed = filteredWords.join(' ');
    }

    if (config.stemming) {
      processed = this.applyStemming(processed);
    }

    return processed;
  }

  private applyStemming(text: string): string {
    // Simplified stemming - remove common suffixes
    const words = text.split(/\s+/);
    const stemmed = words.map(word => {
      // Remove common English suffixes
      return word
        .replace(/ing$/, '')
        .replace(/ed$/, '')
        .replace(/er$/, '')
        .replace(/est$/, '')
        .replace(/ly$/, '')
        .replace(/tion$/, '')
        .replace(/ness$/, '')
        .replace(/ment$/, '');
    });
    
    return stemmed.join(' ');
  }

  private createTfVector(tokens: string[], allTerms: Set<string>): number[] {
    const termCounts = new Map<string, number>();
    
    // Count term frequencies
    tokens.forEach(token => {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    });

    // Create vector
    return Array.from(allTerms).map(term => termCounts.get(term) || 0);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateSemanticOverlap(words1: string[], words2: string[]): number {
    // Simplified semantic overlap using word relationships
    const synonymGroups = new Map<string, Set<string>>();
    
    // Add some basic synonym groups (in practice, would use a proper thesaurus)
    synonymGroups.set('good', new Set(['good', 'great', 'excellent', 'positive', 'beneficial']));
    synonymGroups.set('bad', new Set(['bad', 'terrible', 'negative', 'harmful', 'poor']));
    synonymGroups.set('big', new Set(['big', 'large', 'huge', 'massive', 'enormous']));
    synonymGroups.set('small', new Set(['small', 'tiny', 'little', 'minor', 'minimal']));

    let semanticMatches = 0;
    let totalComparisons = 0;

    words1.forEach(word1 => {
      words2.forEach(word2 => {
        totalComparisons++;
        
        // Direct match
        if (word1 === word2) {
          semanticMatches += 1;
          return;
        }

        // Synonym match
        for (const [key, synonyms] of synonymGroups.entries()) {
          if (synonyms.has(word1) && synonyms.has(word2)) {
            semanticMatches += 0.8; // Slightly lower weight for synonyms
            return;
          }
        }

        // Partial match (shared prefix/suffix)
        if (word1.length > 3 && word2.length > 3) {
          if (word1.startsWith(word2.substring(0, 3)) || word2.startsWith(word1.substring(0, 3))) {
            semanticMatches += 0.3;
          }
        }
      });
    });

    return totalComparisons === 0 ? 0 : semanticMatches / totalComparisons;
  }

  private calculateContextualSimilarity(text1: string, text2: string): number {
    // Analyze sentence structure and patterns
    const sentences1 = text1.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentences2 = text2.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences1.length === 0 || sentences2.length === 0) return 0;

    // Compare sentence structures
    let structuralSimilarity = 0;
    const maxSentences = Math.max(sentences1.length, sentences2.length);

    for (let i = 0; i < Math.min(sentences1.length, sentences2.length); i++) {
      const structure1 = this.extractSentenceStructure(sentences1[i]);
      const structure2 = this.extractSentenceStructure(sentences2[i]);
      
      if (structure1 === structure2) {
        structuralSimilarity += 1;
      }
    }

    return structuralSimilarity / maxSentences;
  }

  private calculateStructuralSimilarity(text1: string, text2: string): number {
    // Compare structural features
    const features1 = this.extractStructuralFeatures(text1);
    const features2 = this.extractStructuralFeatures(text2);

    let similarity = 0;
    let featureCount = 0;

    // Compare sentence count similarity
    const sentenceRatio = Math.min(features1.sentenceCount, features2.sentenceCount) / 
                         Math.max(features1.sentenceCount, features2.sentenceCount);
    similarity += sentenceRatio;
    featureCount++;

    // Compare average sentence length similarity
    const lengthRatio = Math.min(features1.avgSentenceLength, features2.avgSentenceLength) / 
                       Math.max(features1.avgSentenceLength, features2.avgSentenceLength);
    similarity += lengthRatio;
    featureCount++;

    // Compare punctuation patterns
    const punctuationSimilarity = this.comparePunctuationPatterns(features1.punctuation, features2.punctuation);
    similarity += punctuationSimilarity;
    featureCount++;

    return featureCount === 0 ? 0 : similarity / featureCount;
  }

  private extractSentenceStructure(sentence: string): string {
    // Simplified structure extraction
    const words = sentence.trim().split(/\s+/);
    
    if (words.length === 0) return '';
    
    // Create a pattern based on word types
    return words.slice(0, 5).map(word => {
      if (/^\d+$/.test(word)) return 'NUM';
      if (word.length <= 3) return 'SHORT';
      if (word.endsWith('ing')) return 'GERUND';
      if (word.endsWith('ed')) return 'PAST';
      return 'WORD';
    }).join('-');
  }

  private extractStructuralFeatures(text: string): {
    sentenceCount: number;
    avgSentenceLength: number;
    punctuation: Map<string, number>;
  } {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalLength = sentences.reduce((sum, s) => sum + s.length, 0);
    
    const punctuation = new Map<string, number>();
    const punctuationMarks = ['.', '!', '?', ',', ';', ':', '-', '(', ')'];
    
    punctuationMarks.forEach(mark => {
      const count = (text.match(new RegExp('\\' + mark, 'g')) || []).length;
      punctuation.set(mark, count);
    });

    return {
      sentenceCount: sentences.length,
      avgSentenceLength: sentences.length === 0 ? 0 : totalLength / sentences.length,
      punctuation
    };
  }

  private comparePunctuationPatterns(
    punct1: Map<string, number>,
    punct2: Map<string, number>
  ): number {
    const allMarks = new Set([...punct1.keys(), ...punct2.keys()]);
    let similarity = 0;
    
    allMarks.forEach(mark => {
      const count1 = punct1.get(mark) || 0;
      const count2 = punct2.get(mark) || 0;
      const maxCount = Math.max(count1, count2);
      
      if (maxCount > 0) {
        similarity += Math.min(count1, count2) / maxCount;
      }
    });

    return allMarks.size === 0 ? 0 : similarity / allMarks.size;
  }

  /**
   * Get similarity statistics for a set of text comparisons
   */
  calculateSimilarityStatistics(similarities: number[]): {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
    distribution: { low: number; medium: number; high: number };
  } {
    if (similarities.length === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        min: 0,
        max: 0,
        distribution: { low: 0, medium: 0, high: 0 }
      };
    }

    const sorted = [...similarities].sort((a, b) => a - b);
    const mean = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = similarities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / similarities.length;
    const standardDeviation = Math.sqrt(variance);

    const distribution = {
      low: similarities.filter(s => s < 0.3).length,
      medium: similarities.filter(s => s >= 0.3 && s < 0.7).length,
      high: similarities.filter(s => s >= 0.7).length
    };

    return {
      mean,
      median,
      standardDeviation,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      distribution
    };
  }
}


