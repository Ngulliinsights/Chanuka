// ============================================================================
// ENGAGEMENT PREDICTOR - ML Model for User Engagement Prediction (OPTIMIZED)
// ============================================================================
// Predicts user engagement levels and optimizes content delivery

import { z } from 'zod';

import { TextProcessor, Statistics, DateUtils, Cache } from './shared_utils';

export const EngagementInputSchema = z.object({
  contentType: z.enum(['bill', 'analysis', 'comment', 'news', 'alert']),
  contentMetadata: z.object({
    title: z.string(),
    summary: z.string().optional(),
    length: z.number(),
    complexity: z.enum(['low', 'medium', 'high']),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    topics: z.array(z.string()),
    sentiment: z.enum(['negative', 'neutral', 'positive']).optional(),
  }),
  userProfile: z.object({
    userId: z.string().uuid(),
    engagementHistory: z.object({
      totalViews: z.number(),
      totalComments: z.number(),
      totalShares: z.number(),
      avgSessionDuration: z.number(),
      lastActiveDate: z.string(),
    }),
    preferences: z.object({
      interestedTopics: z.array(z.string()),
      preferredComplexity: z.enum(['low', 'medium', 'high']),
      notificationFrequency: z.enum(['immediate', 'daily', 'weekly']),
    }),
    demographics: z.object({
      ageGroup: z.enum(['18-25', '26-35', '36-45', '46-55', '56-65', '65+']).optional(),
      education: z.enum(['primary', 'secondary', 'tertiary', 'postgraduate']).optional(),
      location: z.string().optional(),
      profession: z.string().optional(),
    }).optional(),
  }),
  contextualFactors: z.object({
    timeOfDay: z.number().min(0).max(23),
    dayOfWeek: z.number().min(0).max(6),
    isWeekend: z.boolean(),
    currentTrendingTopics: z.array(z.string()),
    platformActivity: z.enum(['low', 'medium', 'high']),
  }),
});

export const EngagementOutputSchema = z.object({
  engagementScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  predictions: z.object({
    viewProbability: z.number().min(0).max(1),
    commentProbability: z.number().min(0).max(1),
    shareProbability: z.number().min(0).max(1),
    timeSpentPrediction: z.number(),
    completionProbability: z.number().min(0).max(1),
  }),
  engagementFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
    weight: z.number().min(0).max(1),
    explanation: z.string(),
  })),
  recommendations: z.object({
    optimalDeliveryTime: z.string(),
    recommendedFormat: z.enum(['full', 'summary', 'alert', 'digest']),
    personalizationSuggestions: z.array(z.string()),
    contentOptimizations: z.array(z.string()),
  }),
  segmentAnalysis: z.object({
    userSegment: z.enum(['casual', 'engaged', 'expert', 'activist', 'professional']),
    segmentEngagementRate: z.number().min(0).max(1),
    similarUserBehavior: z.object({
      avgEngagementScore: z.number(),
      commonActions: z.array(z.string()),
    }),
  }),
});

export type EngagementInput = z.infer<typeof EngagementInputSchema>;
export type EngagementOutput = z.infer<typeof EngagementOutputSchema>;

export class EngagementPredictor {
  private modelVersion = '2.1.0';
  private cache = new Cache<EngagementOutput>(600); // 10 minute cache

  private readonly ENGAGEMENT_WEIGHTS = {
    topic_interest: 0.25,
    content_complexity: 0.15,
    urgency_level: 0.20,
    user_history: 0.20,
    timing: 0.10,
    trending: 0.10,
  };

  private readonly USER_SEGMENTS = {
    casual: {
      avgSessionDuration: 120,
      preferredComplexity: 'low',
      engagementThreshold: 30,
      commentPropensity: 0.05,
      sharePropensity: 0.02,
    },
    engaged: {
      avgSessionDuration: 300,
      preferredComplexity: 'medium',
      engagementThreshold: 50,
      commentPropensity: 0.15,
      sharePropensity: 0.08,
    },
    expert: {
      avgSessionDuration: 600,
      preferredComplexity: 'high',
      engagementThreshold: 70,
      commentPropensity: 0.25,
      sharePropensity: 0.12,
    },
    activist: {
      avgSessionDuration: 450,
      preferredComplexity: 'medium',
      engagementThreshold: 80,
      commentPropensity: 0.35,
      sharePropensity: 0.25,
    },
    professional: {
      avgSessionDuration: 900,
      preferredComplexity: 'high',
      engagementThreshold: 85,
      commentPropensity: 0.20,
      sharePropensity: 0.10,
    },
  };

  private readonly PEAK_HOURS = [
    { start: 7, end: 9, multiplier: 1.2 },   // Morning
    { start: 12, end: 14, multiplier: 1.3 }, // Lunch
    { start: 18, end: 21, multiplier: 1.4 }, // Evening
  ];

  private readonly COMPLEXITY_MATCH_SCORES = {
    low: { low: 1.0, medium: 0.7, high: 0.4 },
    medium: { low: 0.7, medium: 1.0, high: 0.7 },
    high: { low: 0.4, medium: 0.7, high: 1.0 },
  };

  async predict(input: EngagementInput): Promise<EngagementOutput> {
    const validatedInput = EngagementInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Classify user segment
    const userSegment = this.classifyUserSegment(validatedInput.userProfile);
    
    // Calculate engagement factors
    const engagementFactors = this.calculateEngagementFactors(validatedInput, userSegment);
    
    // Calculate overall engagement score
    const engagementScore = this.calculateEngagementScore(engagementFactors, userSegment);
    
    // Make specific predictions
    const predictions = this.makePredictions(validatedInput, engagementScore, userSegment);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(validatedInput, engagementScore, userSegment);
    
    // Analyze user segment
    const segmentAnalysis = this.analyzeSegment(userSegment, validatedInput.userProfile);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(validatedInput, engagementFactors);

    const result = {
      engagementScore,
      confidence,
      predictions,
      engagementFactors,
      recommendations,
      segmentAnalysis,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private classifyUserSegment(userProfile: any): keyof typeof this.USER_SEGMENTS {
    const history = userProfile.engagementHistory;
    const preferences = userProfile.preferences;
    
    // Calculate engagement metrics
    const totalEngagements = history.totalViews + history.totalComments + history.totalShares;
    const avgSessionDuration = history.avgSessionDuration;
    const commentRate = history.totalViews > 0 ? history.totalComments / history.totalViews : 0;
    
    // Classify based on activity level and behavior
    if (totalEngagements > 1000 && avgSessionDuration > 600) {
      return preferences.preferredComplexity === 'high' ? 'professional' : 'expert';
    } else if (totalEngagements > 500 && avgSessionDuration > 300) {
      return commentRate > 0.1 ? 'activist' : 'engaged';
    } else {
      return 'casual';
    }
  }

  private calculateEngagementFactors(input: EngagementInput, userSegment: keyof typeof this.USER_SEGMENTS) {
    const factors = [];
    
    // Topic interest factor
    const topicInterest = this.calculateTopicInterest(
      input.contentMetadata.topics,
      input.userProfile.preferences.interestedTopics
    );
    factors.push({
      factor: 'Topic Interest',
      impact: this.scoreToImpact(topicInterest),
      weight: this.ENGAGEMENT_WEIGHTS.topic_interest,
      explanation: `${Math.round(topicInterest * 100)}% match with user interests`,
    });

    // Content complexity match
    const complexityMatch = this.COMPLEXITY_MATCH_SCORES
      [input.contentMetadata.complexity as keyof typeof this.COMPLEXITY_MATCH_SCORES]
      [input.userProfile.preferences.preferredComplexity as keyof typeof this.COMPLEXITY_MATCH_SCORES.low];
    
    factors.push({
      factor: 'Content Complexity Match',
      impact: this.scoreToImpact(complexityMatch),
      weight: this.ENGAGEMENT_WEIGHTS.content_complexity,
      explanation: `Content complexity ${complexityMatch > 0.7 ? 'matches' : 'mismatches'} user preference`,
    });

    // Urgency factor
    const urgencyScores = { low: 0.3, medium: 0.6, high: 0.8, critical: 1.0 };
    const urgencyScore = urgencyScores[input.contentMetadata.urgency];
    factors.push({
      factor: 'Content Urgency',
      impact: this.scoreToImpact(urgencyScore),
      weight: this.ENGAGEMENT_WEIGHTS.urgency_level,
      explanation: `${input.contentMetadata.urgency} urgency drives ${urgencyScore > 0.6 ? 'high' : 'moderate'} engagement`,
    });

    // User history factor
    const historyScore = this.calculateHistoryScore(input.userProfile.engagementHistory);
    factors.push({
      factor: 'User Engagement History',
      impact: this.scoreToImpact(historyScore),
      weight: this.ENGAGEMENT_WEIGHTS.user_history,
      explanation: `User has ${historyScore > 0.7 ? 'high' : historyScore > 0.4 ? 'moderate' : 'low'} historical engagement`,
    });

    // Timing factor
    const timingScore = this.calculateTimingScore(input.contextualFactors);
    factors.push({
      factor: 'Timing Optimization',
      impact: this.scoreToImpact(timingScore),
      weight: this.ENGAGEMENT_WEIGHTS.timing,
      explanation: `Current time is ${timingScore > 0.6 ? 'optimal' : timingScore > 0.4 ? 'acceptable' : 'suboptimal'} for engagement`,
    });

    // Trending factor
    const trendingScore = this.calculateTrendingScore(
      input.contentMetadata.topics,
      input.contextualFactors.currentTrendingTopics
    );
    factors.push({
      factor: 'Trending Topics',
      impact: this.scoreToImpact(trendingScore),
      weight: this.ENGAGEMENT_WEIGHTS.trending,
      explanation: `Content ${trendingScore > 0.5 ? 'aligns with' : 'differs from'} current trends`,
    });

    return factors;
  }

  private calculateEngagementScore(factors: any[], userSegment: keyof typeof this.USER_SEGMENTS): number {
    // Weighted sum of factors
    const factorScores = factors.map(f => this.impactToScore(f.impact) * f.weight);
    const weightedScore = Statistics.mean(factorScores) * 100;
    
    // Apply segment-specific multiplier
    const segmentMultipliers = {
      casual: 0.8,
      engaged: 1.0,
      expert: 1.1,
      activist: 1.2,
      professional: 1.05,
    };
    
    const finalScore = weightedScore * segmentMultipliers[userSegment];
    return Math.max(0, Math.min(100, finalScore));
  }

  private makePredictions(input: EngagementInput, engagementScore: number, userSegment: keyof typeof this.USER_SEGMENTS) {
    const baseViewProb = Math.min(1, engagementScore / 100);
    const segmentData = this.USER_SEGMENTS[userSegment];
    
    // Adjust probabilities based on content complexity
    const complexityMultiplier = this.COMPLEXITY_MATCH_SCORES
      [input.contentMetadata.complexity as keyof typeof this.COMPLEXITY_MATCH_SCORES]
      [input.userProfile.preferences.preferredComplexity as keyof typeof this.COMPLEXITY_MATCH_SCORES.low];
    
    // Urgency boost
    const urgencyMultipliers = { low: 0.8, medium: 1.0, high: 1.3, critical: 1.5 };
    const urgencyMultiplier = urgencyMultipliers[input.contentMetadata.urgency];
    
    return {
      viewProbability: Math.min(1, baseViewProb * complexityMultiplier),
      commentProbability: Math.min(1, baseViewProb * segmentData.commentPropensity * urgencyMultiplier),
      shareProbability: Math.min(1, baseViewProb * segmentData.sharePropensity * urgencyMultiplier),
      timeSpentPrediction: this.predictTimeSpent(engagementScore, segmentData, input.contentMetadata.length),
      completionProbability: Math.min(1, baseViewProb * complexityMultiplier * 0.9),
    };
  }

  private generateRecommendations(input: EngagementInput, engagementScore: number, userSegment: keyof typeof this.USER_SEGMENTS) {
    const optimalTime = this.calculateOptimalDeliveryTime(input.userProfile, input.contextualFactors);
    const format = this.recommendFormat(userSegment, input.contentMetadata);
    
    return {
      optimalDeliveryTime: optimalTime,
      recommendedFormat: format,
      personalizationSuggestions: this.generatePersonalizationSuggestions(input.userProfile, userSegment, engagementScore),
      contentOptimizations: this.generateContentOptimizations(input.contentMetadata, userSegment, engagementScore),
    };
  }

  private analyzeSegment(userSegment: keyof typeof this.USER_SEGMENTS, userProfile: any) {
    const segmentData = this.USER_SEGMENTS[userSegment];
    
    return {
      userSegment,
      segmentEngagementRate: segmentData.engagementThreshold / 100,
      similarUserBehavior: {
        avgEngagementScore: segmentData.engagementThreshold,
        commonActions: this.getCommonActions(userSegment),
      },
    };
  }

  private calculateConfidence(input: EngagementInput, factors: any[]): number {
    let confidence = 0.6;
    
    // More user history = higher confidence
    const historyPoints = input.userProfile.engagementHistory.totalViews + 
                         input.userProfile.engagementHistory.totalComments;
    confidence += Math.min(0.25, Math.log10(historyPoints + 1) / 10);
    
    // Strong factors boost confidence
    const strongFactors = factors.filter(f => 
      f.impact === 'very_positive' || f.impact === 'very_negative'
    );
    confidence += Math.min(0.15, strongFactors.length * 0.05);
    
    return Math.min(1.0, confidence);
  }

  // Helper methods
  private calculateTopicInterest(contentTopics: string[], userInterests: string[]): number {
    if (userInterests.length === 0) return 0.5;
    
    const contentSet = new Set(contentTopics.map(t => t.toLowerCase()));
    const userSet = new Set(userInterests.map(t => t.toLowerCase()));
    
    // Use Jaccard similarity
    return TextProcessor.jaccardSimilarity(contentSet, userSet);
  }

  private calculateHistoryScore(history: any): number {
    const totalActivity = history.totalViews + history.totalComments + history.totalShares;
    const recencyScore = DateUtils.recencyScore(history.lastActiveDate, 30); // 30-day half-life
    
    // Log scale for activity (handles wide ranges)
    const activityScore = Math.min(1, Math.log10(totalActivity + 1) / 3);
    
    // Average session duration score (normalize to 0-1)
    const durationScore = Math.min(1, history.avgSessionDuration / 600); // 10 min = max
    
    // Weighted combination
    return Statistics.weightedAverage(
      [activityScore, recencyScore, durationScore],
      [0.4, 0.4, 0.2]
    );
  }

  private calculateTimingScore(contextualFactors: any): number {
    const { timeOfDay, isWeekend, platformActivity } = contextualFactors;
    
    // Check if current time is in peak hours
    let timeMultiplier = 0.5; // Base
    for (const peak of this.PEAK_HOURS) {
      if (timeOfDay >= peak.start && timeOfDay <= peak.end) {
        timeMultiplier = peak.multiplier;
        break;
      }
    }
    
    // Normalize to 0-1 scale
    let timeScore = (timeMultiplier - 0.5) / 0.9; // 0.5-1.4 → 0-1
    
    // Weekend adjustment (slight penalty)
    if (isWeekend) timeScore *= 0.85;
    
    // Platform activity boost
    const activityMultipliers = { low: 0.8, medium: 1.0, high: 1.2 };
    timeScore *= activityMultipliers[platformActivity];
    
    return Math.max(0, Math.min(1, timeScore));
  }

  private calculateTrendingScore(contentTopics: string[], trendingTopics: string[]): number {
    if (trendingTopics.length === 0) return 0.5;
    
    const contentSet = new Set(contentTopics.map(t => t.toLowerCase()));
    const trendingSet = new Set(trendingTopics.map(t => t.toLowerCase()));
    
    return TextProcessor.jaccardSimilarity(contentSet, trendingSet);
  }

  private predictTimeSpent(engagementScore: number, segmentData: any, contentLength: number): number {
    const baseTime = segmentData.avgSessionDuration;
    const engagementMultiplier = engagementScore / 100;
    
    // Reading speed: ~200 words per minute
    const estimatedReadTime = (contentLength / 200) * 60;
    const lengthFactor = Math.min(2, estimatedReadTime / baseTime);
    
    return baseTime * engagementMultiplier * lengthFactor;
  }

  private calculateOptimalDeliveryTime(userProfile: any, contextualFactors: any): string {
    const now = new Date();
    const currentHour = contextualFactors.timeOfDay;
    
    // Find next peak time
    let nextPeakHour = 7; // Default morning
    
    for (const peak of this.PEAK_HOURS) {
      if (currentHour < peak.start) {
        nextPeakHour = peak.start;
        break;
      }
    }
    
    // If past all peaks, suggest next morning
    if (currentHour >= 21) {
      nextPeakHour = 7;
    }
    
    const optimalTime = new Date(now);
    optimalTime.setHours(nextPeakHour, 0, 0, 0);
    
    // If optimal time is in the past today, move to tomorrow
    if (optimalTime <= now) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }
    
    return optimalTime.toISOString();
  }

  private recommendFormat(userSegment: keyof typeof this.USER_SEGMENTS, contentMetadata: any): 'full' | 'summary' | 'alert' | 'digest' {
    if (contentMetadata.urgency === 'critical') return 'alert';
    
    const formatMap: Record<string, 'full' | 'summary' | 'alert' | 'digest'> = {
      casual: 'summary',
      engaged: 'full',
      expert: 'full',
      activist: 'alert',
      professional: 'digest',
    };
    
    return formatMap[userSegment] ?? 'summary';
  }

  private generatePersonalizationSuggestions(userProfile: any, userSegment: keyof typeof this.USER_SEGMENTS, score: number): string[] {
    const suggestions = [];
    
    if (userProfile.preferences.interestedTopics.length < 3) {
      suggestions.push('Add more topic interests to improve content relevance');
    }
    
    if (userSegment === 'casual' && score < 40) {
      suggestions.push('Enable summary mode for easier content consumption');
    }
    
    if (userProfile.engagementHistory.avgSessionDuration < 60) {
      suggestions.push('Try shorter content formats to match your reading patterns');
    }
    
    const recencyDays = DateUtils.daysBetween(userProfile.engagementHistory.lastActiveDate, new Date());
    if (recencyDays > 7) {
      suggestions.push('Your engagement patterns may have changed - update your preferences');
    }
    
    return suggestions;
  }

  private generateContentOptimizations(contentMetadata: any, userSegment: keyof typeof this.USER_SEGMENTS, score: number): string[] {
    const optimizations = [];
    
    if (contentMetadata.length > 1000 && userSegment === 'casual') {
      optimizations.push('Consider providing an executive summary for broader appeal');
    }
    
    if (contentMetadata.complexity === 'high' && userSegment !== 'expert' && userSegment !== 'professional') {
      optimizations.push('Simplify language and add explanatory notes for wider reach');
    }
    
    if (contentMetadata.urgency === 'low' && score < 50) {
      optimizations.push('Add compelling hooks or relate to trending topics');
    }
    
    if (!contentMetadata.title || contentMetadata.title.length < 10) {
      optimizations.push('Create a more engaging title to improve click-through rates');
    }
    
    return optimizations;
  }

  private getCommonActions(userSegment: keyof typeof this.USER_SEGMENTS): string[] {
    const actionMap = {
      casual: ['view', 'quick_scan'],
      engaged: ['view', 'read', 'comment', 'share'],
      expert: ['view', 'detailed_read', 'comment', 'analyze'],
      activist: ['view', 'comment', 'share', 'advocate', 'mobilize'],
      professional: ['view', 'detailed_read', 'save', 'reference', 'cite'],
    };
    return actionMap[userSegment];
  }

  private scoreToImpact(score: number): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score >= 0.8) return 'very_positive';
    if (score >= 0.6) return 'positive';
    if (score >= 0.4) return 'neutral';
    if (score >= 0.2) return 'negative';
    return 'very_negative';
  }

  private impactToScore(impact: string): number {
    const scoreMap = {
      very_negative: 0.1,
      negative: 0.3,
      neutral: 0.5,
      positive: 0.7,
      very_positive: 0.9,
    };
    return scoreMap[impact as keyof typeof scoreMap] || 0.5;
  }

  private generateCacheKey(input: EngagementInput): string {
    return `${input.userProfile.userId}-${input.contentType}-${input.contentMetadata.topics.join(',')}-${input.contextualFactors.timeOfDay}`;
  }

  getModelInfo() {
    return {
      name: 'Engagement Predictor',
      version: this.modelVersion,
      description: 'Predicts user engagement and optimizes content delivery',
      capabilities: [
        'Engagement score prediction',
        'User segmentation (5 segments)',
        'Optimal timing recommendations',
        'Content format optimization',
        'Personalization suggestions',
        'Behavioral prediction',
        'Performance optimization with caching',
        'Recency scoring with DateUtils',
        'Statistical analysis with Statistics utilities'
      ]
    };
  }
}

export const engagementPredictor = new EngagementPredictor();
