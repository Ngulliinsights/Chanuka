/**
 * Content Classifier - MWANGA Stack
 * 
 * Three-tier multi-task content classification:
 * - Tier 1: Rule-based multi-task classification (<10ms)
 * - Tier 2: HuggingFace multi-label classification (~100ms)
 * - Tier 3: Ollama comprehensive analysis (~1s)
 * 
 * Purpose: Real-time content routing, prioritization, and user experience optimization.
 * Classifies for: urgency, topics, sentiment, engagement, misinformation, constitutional relevance, public interest.
 */

import { BaseAnalyzer } from './base-analyzer';
import type { AnalysisTier } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ContentClassificationInput {
  content: {
    text: string;
    title?: string;
    source: 'bill' | 'comment' | 'news' | 'social_media' | 'official_statement';
    timestamp: string;
  };
  
  classificationTasks: Array<
    | 'urgency_level'
    | 'topic_category'
    | 'sentiment_polarity'
    | 'engagement_potential'
    | 'misinformation_risk'
    | 'constitutional_relevance'
    | 'public_interest_level'
    | 'action_required'
  >;
  
  userContext?: {
    userId?: string;
    userSegment?: 'casual' | 'engaged' | 'expert' | 'activist' | 'professional';
    preferences?: {
      topics: string[];
      urgencyThreshold: 'low' | 'medium' | 'high';
    };
  };
}

export interface ContentClassificationResult {
  classifications: {
    urgencyLevel?: {
      level: 'routine' | 'normal' | 'urgent' | 'critical' | 'emergency';
      confidence: number;
      reasoning: string;
    };
    
    topicCategory?: {
      primary: string;
      secondary: string[];
      confidence: number;
      tags: string[];
    };
    
    sentimentPolarity?: {
      polarity: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
      intensity: number;
      confidence: number;
    };
    
    engagementPotential?: {
      score: number; // 0-100
      factors: string[];
      predictedActions: Array<'view' | 'comment' | 'share' | 'save' | 'ignore'>;
    };
    
    misinformationRisk?: {
      riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
      riskFactors: string[];
      confidence: number;
      requiresFactCheck: boolean;
    };
    
    constitutionalRelevance?: {
      isRelevant: boolean;
      relevanceScore: number; // 0-100
      affectedArticles: string[];
      impactType?: 'rights' | 'structure' | 'process' | 'values';
    };
    
    publicInterestLevel?: {
      level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
      score: number; // 0-100
      interestFactors: string[];
    };
    
    actionRequired?: {
      requiresAction: boolean;
      actionType?: 'alert' | 'investigation' | 'fact_check' | 'expert_review' | 'public_notice';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      timeline?: string;
    };
  };
  
  recommendations: {
    userRecommendations: Array<{
      type: 'notify' | 'highlight' | 'summarize' | 'defer' | 'filter';
      reason: string;
      confidence: number;
    }>;
    systemRecommendations: Array<{
      type: 'escalate' | 'monitor' | 'archive' | 'flag' | 'distribute';
      reason: string;
      targetSystem: string;
    }>;
  };
}

// ============================================================================
// Analyzer Implementation
// ============================================================================

export class ContentClassifier extends BaseAnalyzer<
  ContentClassificationInput,
  ContentClassificationResult
> {
  private readonly TOPIC_KEYWORDS = {
    governance: ['government', 'administration', 'policy', 'serikali', 'utawala'],
    economy: ['economic', 'finance', 'budget', 'tax', 'uchumi', 'fedha'],
    healthcare: ['health', 'medical', 'hospital', 'afya', 'daktari'],
    education: ['education', 'school', 'university', 'elimu', 'shule'],
    security: ['security', 'police', 'military', 'usalama', 'polisi'],
    corruption: ['corruption', 'bribe', 'fraud', 'rushwa', 'ufisadi'],
    human_rights: ['rights', 'freedom', 'liberty', 'haki', 'uhuru'],
  };

  protected async analyzeWithTier(
    input: ContentClassificationInput,
    tier: AnalysisTier
  ): Promise<ContentClassificationResult> {
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
   * Tier 1: Rule-based multi-task classification
   */
  private async analyzeTier1(
    input: ContentClassificationInput
  ): Promise<ContentClassificationResult> {
    const text = input.content.text.toLowerCase();
    const classifications: ContentClassificationResult['classifications'] = {};

    // Urgency classification
    if (input.classificationTasks.includes('urgency_level')) {
      classifications.urgencyLevel = this.classifyUrgency(text);
    }

    // Topic classification
    if (input.classificationTasks.includes('topic_category')) {
      classifications.topicCategory = this.classifyTopic(text);
    }

    // Sentiment classification
    if (input.classificationTasks.includes('sentiment_polarity')) {
      classifications.sentimentPolarity = this.classifySentiment(text);
    }

    // Engagement potential
    if (input.classificationTasks.includes('engagement_potential')) {
      classifications.engagementPotential = this.classifyEngagement(text, input.content.source);
    }

    // Misinformation risk
    if (input.classificationTasks.includes('misinformation_risk')) {
      classifications.misinformationRisk = this.classifyMisinformation(text);
    }

    // Constitutional relevance
    if (input.classificationTasks.includes('constitutional_relevance')) {
      classifications.constitutionalRelevance = this.classifyConstitutional(text);
    }

    // Public interest
    if (input.classificationTasks.includes('public_interest_level')) {
      classifications.publicInterestLevel = this.classifyPublicInterest(text, classifications);
    }

    // Action required
    if (input.classificationTasks.includes('action_required')) {
      classifications.actionRequired = this.classifyAction(classifications);
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(classifications, input.userContext);

    // If high urgency or high risk, escalate to Tier 2
    if (
      classifications.urgencyLevel?.level === 'critical' ||
      classifications.urgencyLevel?.level === 'emergency' ||
      classifications.misinformationRisk?.riskLevel === 'high' ||
      classifications.misinformationRisk?.riskLevel === 'very_high'
    ) {
      throw new Error('High urgency/risk detected, escalating to Tier 2');
    }

    return { classifications, recommendations };
  }

  /**
   * Tier 2: HuggingFace multi-label classification
   */
  private async analyzeTier2(
    input: ContentClassificationInput
  ): Promise<ContentClassificationResult> {
    // TODO: Implement HuggingFace multi-label classification
    console.log('Tier 2: Running HuggingFace multi-label classification...');

    const tier1Results = await this.analyzeTier1(input);

    // Simulate HuggingFace call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Enhanced classifications (mock)
    return {
      ...tier1Results,
      classifications: {
        ...tier1Results.classifications,
        // Enhanced with ML confidence scores
      },
    };
  }

  /**
   * Tier 3: Ollama comprehensive analysis
   */
  private async analyzeTier3(
    input: ContentClassificationInput
  ): Promise<ContentClassificationResult> {
    // TODO: Implement Ollama integration
    console.log('Tier 3: Running Ollama comprehensive analysis...');

    const tier2Results = await this.analyzeTier2(input);

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return tier2Results;
  }

  protected getConfidence(result: ContentClassificationResult, tier: AnalysisTier): number {
    if (tier === 'tier3') return 0.95;
    if (tier === 'tier2') return 0.85;
    return 0.75;
  }

  // Helper methods for Tier 1 classification

  private classifyUrgency(text: string) {
    const urgentKeywords = ['urgent', 'emergency', 'immediate', 'crisis', 'haraka'];
    const criticalKeywords = ['critical', 'severe', 'dire', 'hatari'];
    
    const hasUrgent = urgentKeywords.some((k) => text.includes(k));
    const hasCritical = criticalKeywords.some((k) => text.includes(k));

    let level: 'routine' | 'normal' | 'urgent' | 'critical' | 'emergency' = 'normal';
    if (hasCritical) level = 'critical';
    else if (hasUrgent) level = 'urgent';

    return {
      level,
      confidence: hasUrgent || hasCritical ? 0.8 : 0.6,
      reasoning: `Detected ${level} keywords in content`,
    };
  }

  private classifyTopic(text: string) {
    const scores: Record<string, number> = {};
    
    for (const [topic, keywords] of Object.entries(this.TOPIC_KEYWORDS)) {
      scores[topic] = keywords.filter((k) => text.includes(k)).length;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0]?.[0] || 'general';
    const secondary = sorted.slice(1, 3).map((s) => s[0]);
    const confidence = (sorted[0]?.[1] ?? 0) > 0 ? 0.7 : 0.4;

    return {
      primary,
      secondary,
      confidence,
      tags: [primary, ...secondary],
    };
  }

  private classifySentiment(text: string) {
    // Simple sentiment (use SentimentAnalyzer for better results)
    const positiveWords = ['good', 'great', 'excellent', 'nzuri', 'poa'];
    const negativeWords = ['bad', 'poor', 'terrible', 'mbaya', 'vibaya'];

    const posCount = positiveWords.filter((w) => text.includes(w)).length;
    const negCount = negativeWords.filter((w) => text.includes(w)).length;

    let polarity: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' = 'neutral';
    if (posCount > negCount + 1) polarity = 'positive';
    else if (negCount > posCount + 1) polarity = 'negative';

    return {
      polarity,
      intensity: Math.abs(posCount - negCount) / 10,
      confidence: 0.6,
    };
  }

  private classifyEngagement(text: string, source: string) {
    const length = text.length;
    const hasQuestion = text.includes('?');
    const hasEmphasis = text.includes('!');

    let score = 50;
    if (length > 200 && length < 1000) score += 20;
    if (hasQuestion) score += 10;
    if (hasEmphasis) score += 10;
    if (source === 'bill') score += 15;

    return {
      score: Math.min(score, 100),
      factors: ['content_length', 'source_type'],
      predictedActions: ['view' as const, 'comment' as const],
    };
  }

  private classifyMisinformation(text: string) {
    const riskKeywords = ['fake', 'hoax', 'conspiracy', 'unverified'];
    const hasRisk = riskKeywords.some((k) => text.includes(k));

    return {
      riskLevel: hasRisk ? ('medium' as const) : ('low' as const),
      riskFactors: hasRisk ? ['suspicious_keywords'] : [],
      confidence: 0.6,
      requiresFactCheck: hasRisk,
    };
  }

  private classifyConstitutional(text: string) {
    const constitutionalKeywords = ['constitution', 'article', 'rights', 'katiba', 'haki'];
    const isRelevant = constitutionalKeywords.some((k) => text.includes(k));

    return {
      isRelevant,
      relevanceScore: isRelevant ? 70 : 20,
      affectedArticles: [],
      impactType: isRelevant ? ('rights' as const) : undefined,
    };
  }

  private classifyPublicInterest(text: string, classifications: any) {
    let score = 50;
    
    if (classifications.urgencyLevel?.level === 'urgent') score += 20;
    if (classifications.topicCategory?.primary === 'corruption') score += 25;
    if (classifications.constitutionalRelevance?.isRelevant) score += 15;

    const level = score > 80 ? 'very_high' : score > 60 ? 'high' : score > 40 ? 'medium' : 'low';

    return {
      level: level as 'very_low' | 'low' | 'medium' | 'high' | 'very_high',
      score,
      interestFactors: ['urgency', 'topic_relevance'],
    };
  }

  private classifyAction(classifications: any) {
    const requiresAction =
      classifications.urgencyLevel?.level === 'critical' ||
      classifications.misinformationRisk?.requiresFactCheck ||
      classifications.publicInterestLevel?.level === 'very_high';

    return {
      requiresAction,
      actionType: requiresAction ? ('alert' as const) : undefined,
      priority: requiresAction ? ('high' as const) : undefined,
    };
  }

  private generateRecommendations(classifications: any, userContext?: any) {
    const userRecommendations = [];
    const systemRecommendations = [];

    if (classifications.urgencyLevel?.level === 'urgent') {
      userRecommendations.push({
        type: 'notify' as const,
        reason: 'Urgent content requires immediate attention',
        confidence: 0.9,
      });
    }

    if (classifications.misinformationRisk?.requiresFactCheck) {
      systemRecommendations.push({
        type: 'flag' as const,
        reason: 'Content requires fact-checking',
        targetSystem: 'moderation',
      });
    }

    return { userRecommendations, systemRecommendations };
  }
}

// Export singleton instance
export const contentClassifier = new ContentClassifier({
  enableCaching: true,
  cacheExpiryMs: 300000, // 5 minutes (content classification changes frequently)
  enableFallback: true,
});
