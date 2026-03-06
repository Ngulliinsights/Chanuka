/**
 * Sentiment Analyzer - MWANGA Stack
 * 
 * Three-tier sentiment analysis:
 * - Tier 1: VADER + Kenyan political lexicon (<10ms)
 * - Tier 2: HuggingFace RoBERTa (~50ms)
 * - Tier 3: Ollama + Llama 3.2 for Swahili/Sheng (~800ms)
 */

import { BaseAnalyzer } from './base-analyzer';
import type {
  SentimentAnalysisInput,
  SentimentResult,
  SentimentLabel,
  AnalysisTier,
} from './types';

// Kenyan political lexicon for Tier 1
const KENYAN_POLITICAL_LEXICON: Record<string, number> = {
  // Positive terms
  'transparency': 0.7,
  'accountability': 0.7,
  'reform': 0.6,
  'progress': 0.6,
  'development': 0.5,
  'empowerment': 0.7,
  'justice': 0.6,
  'rights': 0.6,
  'democracy': 0.6,
  'freedom': 0.7,
  
  // Negative terms
  'corruption': -0.8,
  'scandal': -0.7,
  'bribery': -0.8,
  'embezzlement': -0.8,
  'impunity': -0.7,
  'oppression': -0.8,
  'injustice': -0.7,
  'tribalism': -0.7,
  'nepotism': -0.7,
  'mismanagement': -0.6,
  
  // Kenyan-specific terms
  'harambee': 0.5,
  'uhuru': 0.4,
  'hustler': 0.3,
  'dynasty': -0.3,
  'cartels': -0.7,
  'tenderpreneurs': -0.8,
};

export class SentimentAnalyzer extends BaseAnalyzer<
  SentimentAnalysisInput,
  SentimentResult
> {
  /**
   * Tier-specific analysis implementation
   */
  protected async analyzeWithTier(
    input: SentimentAnalysisInput,
    tier: AnalysisTier
  ): Promise<SentimentResult> {
    switch (tier) {
      case 'tier1':
        return this.analyzeTier1(input);
      case 'tier2':
        return this.analyzeTier2(input);
      case 'tier3':
        return this.analyzeTier3(input);
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Tier 1: VADER + Kenyan political lexicon
   * Fast rule-based sentiment analysis
   */
  private async analyzeTier1(
    input: SentimentAnalysisInput
  ): Promise<SentimentResult> {
    const text = input.text.toLowerCase();
    const words = text.split(/\s+/);
    
    let score = 0;
    let matchCount = 0;

    // Check against Kenyan political lexicon
    for (const word of words) {
      if (word in KENYAN_POLITICAL_LEXICON) {
        score += KENYAN_POLITICAL_LEXICON[word];
        matchCount++;
      }
    }

    // Simple VADER-like heuristics
    if (text.includes('!')) score += 0.1;
    if (text.includes('?')) score -= 0.05;
    if (text.toUpperCase() === text) score += 0.2; // ALL CAPS = emphasis

    // Normalize score
    const normalizedScore = matchCount > 0 ? score / matchCount : 0;

    // Determine sentiment
    let sentiment: SentimentLabel;
    if (normalizedScore > 0.1) sentiment = 'positive';
    else if (normalizedScore < -0.1) sentiment = 'negative';
    else sentiment = 'neutral';

    // Calculate confidence based on match count
    const confidence = Math.min(matchCount / 5, 0.8); // Max 0.8 for Tier 1

    // If confidence is too low, trigger fallback to Tier 2
    if (confidence < 0.3) {
      throw new Error('Tier 1 confidence too low, falling back to Tier 2');
    }

    return {
      sentiment,
      confidence,
      scores: this.normalizeScores(normalizedScore),
      language: 'en',
    };
  }

  /**
   * Tier 2: HuggingFace RoBERTa
   * Pre-trained model for nuanced political sentiment
   */
  private async analyzeTier2(
    input: SentimentAnalysisInput
  ): Promise<SentimentResult> {
    // TODO: Implement HuggingFace API call
    // Model: cardiffnlp/twitter-roberta-base-sentiment
    
    // Placeholder implementation
    console.log('Tier 2: Calling HuggingFace RoBERTa model...');
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Mock response (replace with actual API call)
    const mockScores = {
      positive: 0.15,
      neutral: 0.25,
      negative: 0.60,
    };

    const sentiment = this.getTopSentiment(mockScores);

    return {
      sentiment,
      confidence: Math.max(...Object.values(mockScores)),
      scores: mockScores,
      language: input.language || 'en',
    };
  }

  /**
   * Tier 3: Ollama + Llama 3.2
   * Local LLM for Swahili/Sheng/code-switched text
   */
  private async analyzeTier3(
    input: SentimentAnalysisInput
  ): Promise<SentimentResult> {
    // TODO: Implement Ollama API call
    console.log('Tier 3: Calling Ollama Llama 3.2...');

    const prompt = `Analyze the sentiment of this Kenyan political text. Consider Swahili, Sheng, and code-switching.

Text: "${input.text}"

Respond with JSON:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.0-1.0,
  "language": "en" | "sw" | "mixed",
  "reasoning": "brief explanation"
}`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock response (replace with actual Ollama call)
    const mockResponse = {
      sentiment: 'negative' as SentimentLabel,
      confidence: 0.85,
      language: 'mixed' as const,
      reasoning: 'Text contains strong negative political sentiment',
    };

    return {
      sentiment: mockResponse.sentiment,
      confidence: mockResponse.confidence,
      scores: this.confidenceToScores(
        mockResponse.sentiment,
        mockResponse.confidence
      ),
      language: mockResponse.language,
    };
  }

  /**
   * Calculate confidence based on tier and result
   */
  protected getConfidence(result: SentimentResult, tier: AnalysisTier): number {
    // Tier 3 (Ollama) is most confident
    if (tier === 'tier3') return Math.min(result.confidence * 1.1, 1.0);
    
    // Tier 2 (RoBERTa) is moderately confident
    if (tier === 'tier2') return result.confidence;
    
    // Tier 1 (VADER) is least confident
    return Math.min(result.confidence * 0.9, 0.8);
  }

  /**
   * Helper: Normalize score to sentiment distribution
   */
  private normalizeScores(score: number): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    if (score > 0) {
      return {
        positive: Math.min(score, 1.0),
        neutral: 1 - Math.abs(score),
        negative: 0,
      };
    } else if (score < 0) {
      return {
        positive: 0,
        neutral: 1 - Math.abs(score),
        negative: Math.min(Math.abs(score), 1.0),
      };
    } else {
      return {
        positive: 0.33,
        neutral: 0.34,
        negative: 0.33,
      };
    }
  }

  /**
   * Helper: Get top sentiment from scores
   */
  private getTopSentiment(scores: {
    positive: number;
    neutral: number;
    negative: number;
  }): SentimentLabel {
    const max = Math.max(scores.positive, scores.neutral, scores.negative);
    if (scores.positive === max) return 'positive';
    if (scores.negative === max) return 'negative';
    return 'neutral';
  }

  /**
   * Helper: Convert confidence to score distribution
   */
  private confidenceToScores(
    sentiment: SentimentLabel,
    confidence: number
  ): { positive: number; neutral: number; negative: number } {
    const remaining = (1 - confidence) / 2;
    
    if (sentiment === 'positive') {
      return { positive: confidence, neutral: remaining, negative: remaining };
    } else if (sentiment === 'negative') {
      return { positive: remaining, neutral: remaining, negative: confidence };
    } else {
      return { positive: remaining, neutral: confidence, negative: remaining };
    }
  }
}

// Export singleton instance
export const sentimentAnalyzer = new SentimentAnalyzer({
  enableCaching: true,
  cacheExpiryMs: 3600000, // 1 hour
  enableFallback: true,
});
