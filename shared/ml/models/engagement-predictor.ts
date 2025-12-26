// ============================================================================
// ENGAGEMENT PREDICTOR - ML Model for Predicting User Engagement
// ============================================================================
// Predicts user engagement levels and optimizes content delivery

import { z } from 'zod';

export const EngagementInputSchema = z.object({
  contentType: z.enum(['bill', 'analysis', 'comment', 'news', 'alert']),
  contentMetadata: z.object({
    title: z.string(),
    summary: z.string().optional(),
    length: z.number(), // Content length in words
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
      avgSessionDuration: z.number(), // seconds
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
    timeOfDay: z.number().min(0).max(23), // Hour of day
    dayOfWeek: z.number().min(0).max(6), // 0 = Sunday
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
    timeSpentPrediction: z.number(), // seconds
    completionProbability: z.number().min(0).max(1), // Will user read/view completely
  }),
  engagementFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
    weight: z.number().min(0).max(1),
    explanation: z.string(),
  })),
  recommendations: z.object({
    optimalDeliveryTime: z.string(), // ISO datetime
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
  private modelVersion = '2.0.0';

  // Engagement weights for different factors
  private readonly ENGAGEMENT_WEIGHTS = {
    topic_interest: 0.25,
    content_complexity: 0.15,
    urgency_level: 0.20,
    user_history: 0.20,
    timing: 0.10,
    trending: 0.10,
  };

  // User segments and their characteristics
  private readonly USER_SEGMENTS = {
    casual: {
      avgSessionDuration: 120, // 2 minutes
      preferredComplexity: 'low',
      engagementThreshold: 30,
    },
    engaged: {
      avgSessionDuration: 300, // 5 minutes
      preferredComplexity: 'medium',
      engagementThreshold: 50,
    },
    expert: {
      avgSessionDuration: 600, // 10 minutes
      preferredComplexity: 'high',
      engagementThreshold: 70,
    },
    activist: {
      avgSessionDuration: 450, // 7.5 minutes
      preferredComplexity: 'medium',
      engagementThreshold: 80,
    },
    professional: {
      avgSessionDuration: 900, // 15 minutes
      preferredComplexity: 'high',
      engagementThreshold: 85,
    },
  };

  async predict(input: EngagementInput): Promise<EngagementOutput> {
    const validatedInput = EngagementInputSchema.parse(input);
    
    // Classify user segment
    const userSegment = this.classifyUserSegment(validatedInput.userProfile);
    
    // Calculate engagement factors
    const engagementFactors = this.calculateEngagementFactors(validatedInput);
    
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

    return {
      engagementScore,
      confidence,
      predictions,
      engagementFactors,
      recommendations,
      segmentAnalysis,
    };
  }

  private classifyUserSegment(userProfile: any): keyof typeof this.USER_SEGMENTS {
    const history = userProfile.engagementHistory;
    const preferences = userProfile.preferences;
    
    // Calculate engagement metrics
    const totalEngagements = history.totalViews + history.totalComments + history.totalShares;
    const avgSessionDuration = history.avgSessionDuration;
    
    // Classify based on activity level and preferences
    if (totalEngagements > 1000 && avgSessionDuration > 600) {
      return preferences.preferredComplexity === 'high' ? 'professional' : 'expert';
    } else if (totalEngagements > 500 && avgSessionDuration > 300) {
      return history.totalComments > history.totalViews * 0.1 ? 'activist' : 'engaged';
    } else {
      return 'casual';
    }
  }

  private calculateEngagementFactors(input: EngagementInput) {
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
      explanation: `User has ${topicInterest > 0.7 ? 'high' : topicInterest > 0.3 ? 'medium' : 'low'} interest in these topics`,
    });

    // Content complexity match
    const complexityMatch = this.calculateComplexityMatch(
      input.contentMetadata.complexity,
      input.userProfile.preferences.preferredComplexity
    );
    factors.push({
      factor: 'Content Complexity Match',
      impact: this.scoreToImpact(complexityMatch),
      weight: this.ENGAGEMENT_WEIGHTS.content_complexity,
      explanation: `Content complexity ${complexityMatch > 0.5 ? 'matches' : 'mismatches'} user preference`,
    });

    // Urgency factor
    const urgencyScore = this.calculateUrgencyScore(input.contentMetadata.urgency);
    factors.push({
      factor: 'Content Urgency',
      impact: this.scoreToImpact(urgencyScore),
      weight: this.ENGAGEMENT_WEIGHTS.urgency_level,
      explanation: `${input.contentMetadata.urgency} urgency content tends to drive engagement`,
    });

    // User history factor
    const historyScore = this.calculateHistoryScore(input.userProfile.engagementHistory);
    factors.push({
      factor: 'User Engagement History',
      impact: this.scoreToImpact(historyScore),
      weight: this.ENGAGEMENT_WEIGHTS.user_history,
      explanation: `User has ${historyScore > 0.7 ? 'high' : historyScore > 0.3 ? 'medium' : 'low'} historical engagement`,
    });

    // Timing factor
    const timingScore = this.calculateTimingScore(input.contextualFactors);
    factors.push({
      factor: 'Timing Optimization',
      impact: this.scoreToImpact(timingScore),
      weight: this.ENGAGEMENT_WEIGHTS.timing,
      explanation: `Current time is ${timingScore > 0.5 ? 'optimal' : 'suboptimal'} for user engagement`,
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
      explanation: `Content ${trendingScore > 0.5 ? 'aligns with' : 'does not align with'} current trends`,
    });

    return factors;
  }

  private calculateEngagementScore(factors: any[], userSegment: keyof typeof this.USER_SEGMENTS): number {
    let weightedScore = 0;
    
    for (const factor of factors) {
      const impactScore = this.impactToScore(factor.impact);
      weightedScore += impactScore * factor.weight;
    }
    
    // Apply segment-specific adjustments
    const segmentMultiplier = this.getSegmentMultiplier(userSegment);
    const finalScore = weightedScore * 100 * segmentMultiplier;
    
    return Math.max(0, Math.min(100, finalScore));
  }

  private makePredictions(input: EngagementInput, engagementScore: number, userSegment: keyof typeof this.USER_SEGMENTS) {
    const baseViewProb = Math.min(1, engagementScore / 100);
    const segmentCharacteristics = this.USER_SEGMENTS[userSegment];
    
    return {
      viewProbability: baseViewProb,
      commentProbability: baseViewProb * this.getCommentPropensity(userSegment, input.contentMetadata.complexity),
      shareProbability: baseViewProb * this.getSharePropensity(userSegment, input.contentMetadata.urgency),
      timeSpentPrediction: this.predictTimeSpent(engagementScore, segmentCharacteristics, input.contentMetadata.length),
      completionProbability: this.predictCompletion(engagementScore, input.contentMetadata.complexity, userSegment),
    };
  }

  private generateRecommendations(input: EngagementInput, engagementScore: number, userSegment: keyof typeof this.USER_SEGMENTS) {
    const optimalTime = this.calculateOptimalDeliveryTime(input.userProfile, input.contextualFactors);
    const format = this.recommendFormat(userSegment, input.contentMetadata);
    
    return {
      optimalDeliveryTime: optimalTime,
      recommendedFormat: format,
      personalizationSuggestions: this.generatePersonalizationSuggestions(input.userProfile, userSegment),
      contentOptimizations: this.generateContentOptimizations(input.contentMetadata, userSegment),
    };
  }

  private analyzeSegment(userSegment: keyof typeof this.USER_SEGMENTS, userProfile: any) {
    const segmentData = this.USER_SEGMENTS[userSegment];
    
    return {
      userSegment,
      segmentEngagementRate: this.getSegmentEngagementRate(userSegment),
      similarUserBehavior: {
        avgEngagementScore: segmentData.engagementThreshold,
        commonActions: this.getCommonActions(userSegment),
      },
    };
  }

  private calculateConfidence(input: EngagementInput, factors: any[]): number {
    let confidence = 0.6; // Base confidence
    
    // Increase confidence with more user history
    const historyPoints = input.userProfile.engagementHistory.totalViews + 
                         input.userProfile.engagementHistory.totalComments;
    confidence += Math.min(0.3, historyPoints / 1000);
    
    // Increase confidence with strong factors
    const strongFactors = factors.filter(f => f.impact === 'very_positive' || f.impact === 'very_negative');
    confidence += strongFactors.length * 0.05;
    
    return Math.min(1.0, confidence);
  }

  // Helper methods
  private calculateTopicInterest(contentTopics: string[], userInterests: string[]): number {
    if (userInterests.length === 0) return 0.5; // Neutral if no preferences
    
    const matches = contentTopics.filter(topic => 
      userInterests.some(interest => 
        interest.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    return matches.length / Math.max(contentTopics.length, 1);
  }

  private calculateComplexityMatch(contentComplexity: string, userPreference: string): number {
    const complexityMap = { low: 1, medium: 2, high: 3 };
    const contentLevel = complexityMap[contentComplexity as keyof typeof complexityMap];
    const preferredLevel = complexityMap[userPreference as keyof typeof complexityMap];
    
    const difference = Math.abs(contentLevel - preferredLevel);
    return Math.max(0, 1 - (difference / 2));
  }

  private calculateUrgencyScore(urgency: string): number {
    const urgencyScores = { low: 0.3, medium: 0.6, high: 0.8, critical: 1.0 };
    return urgencyScores[urgency as keyof typeof urgencyScores] || 0.5;
  }

  private calculateHistoryScore(history: any): number {
    const totalActivity = history.totalViews + history.totalComments + history.totalShares;
    const recencyBonus = this.calculateRecencyBonus(history.lastActiveDate);
    
    // Normalize activity (log scale to handle wide ranges)
    const activityScore = Math.min(1, Math.log10(totalActivity + 1) / 3);
    
    return (activityScore + recencyBonus) / 2;
  }

  private calculateRecencyBonus(lastActiveDate: string): number {
    const lastActive = new Date(lastActiveDate);
    const now = new Date();
    const daysSince = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince <= 1) return 1.0;
    if (daysSince <= 7) return 0.8;
    if (daysSince <= 30) return 0.6;
    return 0.3;
  }

  private calculateTimingScore(contextualFactors: any): number {
    const { timeOfDay, isWeekend, platformActivity } = contextualFactors;
    
    // Peak hours: 7-9 AM, 12-2 PM, 6-9 PM
    let timeScore = 0.5;
    if ((timeOfDay >= 7 && timeOfDay <= 9) || 
        (timeOfDay >= 12 && timeOfDay <= 14) || 
        (timeOfDay >= 18 && timeOfDay <= 21)) {
      timeScore = 0.8;
    }
    
    // Weekend adjustment
    const weekendMultiplier = isWeekend ? 0.7 : 1.0;
    
    // Platform activity adjustment
    const activityMultiplier = platformActivity === 'high' ? 1.2 : 
                              platformActivity === 'medium' ? 1.0 : 0.8;
    
    return Math.min(1, timeScore * weekendMultiplier * activityMultiplier);
  }

  private calculateTrendingScore(contentTopics: string[], trendingTopics: string[]): number {
    const matches = contentTopics.filter(topic => 
      trendingTopics.some(trending => 
        trending.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(trending.toLowerCase())
      )
    );
    
    return matches.length / Math.max(contentTopics.length, 1);
  }

  private scoreToImpact(score: number): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score >= 0.8) return 'very_positive';
    if (score >= 0.6) return 'positive';
    if (score >= 0.4) return 'neutral';
    if (score >= 0.2) return 'negative';
    return 'very_negative';
  }

  private impactToScore(impact: string): number {
    const impactScores = {
      very_negative: 0.1,
      negative: 0.3,
      neutral: 0.5,
      positive: 0.7,
      very_positive: 0.9,
    };
    return impactScores[impact as keyof typeof impactScores] || 0.5;
  }

  private getSegmentMultiplier(segment: keyof typeof this.USER_SEGMENTS): number {
    const multipliers = {
      casual: 0.8,
      engaged: 1.0,
      expert: 1.1,
      activist: 1.2,
      professional: 1.1,
    };
    return multipliers[segment];
  }

  private getCommentPropensity(segment: keyof typeof this.USER_SEGMENTS, complexity: string): number {
    const basePropensity = {
      casual: 0.05,
      engaged: 0.15,
      expert: 0.25,
      activist: 0.35,
      professional: 0.20,
    };
    
    const complexityMultiplier = complexity === 'high' ? 1.2 : complexity === 'low' ? 0.8 : 1.0;
    return basePropensity[segment] * complexityMultiplier;
  }

  private getSharePropensity(segment: keyof typeof this.USER_SEGMENTS, urgency: string): number {
    const basePropensity = {
      casual: 0.02,
      engaged: 0.08,
      expert: 0.12,
      activist: 0.25,
      professional: 0.10,
    };
    
    const urgencyMultiplier = urgency === 'critical' ? 2.0 : urgency === 'high' ? 1.5 : 1.0;
    return Math.min(1, basePropensity[segment] * urgencyMultiplier);
  }

  private predictTimeSpent(engagementScore: number, segmentCharacteristics: any, contentLength: number): number {
    const baseTime = segmentCharacteristics.avgSessionDuration;
    const engagementMultiplier = engagementScore / 100;
    const lengthFactor = Math.min(2, contentLength / 500); // Longer content = more time, capped at 2x
    
    return baseTime * engagementMultiplier * lengthFactor;
  }

  private predictCompletion(engagementScore: number, complexity: string, segment: keyof typeof this.USER_SEGMENTS): number {
    let baseCompletion = engagementScore / 100;
    
    // Adjust for complexity mismatch
    const segmentData = this.USER_SEGMENTS[segment];
    if (complexity !== segmentData.preferredComplexity) {
      baseCompletion *= 0.8;
    }
    
    return Math.min(1, baseCompletion);
  }

  private calculateOptimalDeliveryTime(userProfile: any, contextualFactors: any): string {
    // Simple heuristic: add 2 hours to current time if not optimal
    const now = new Date();
    const currentHour = now.getHours();
    
    // If current time is not optimal, suggest next peak time
    if (currentHour < 7 || (currentHour > 9 && currentHour < 12) || 
        (currentHour > 14 && currentHour < 18) || currentHour > 21) {
      
      let optimalHour = 7; // Default to morning peak
      if (currentHour >= 10 && currentHour < 16) optimalHour = 12; // Lunch peak
      else if (currentHour >= 16) optimalHour = 18; // Evening peak
      
      const optimalTime = new Date(now);
      optimalTime.setHours(optimalHour, 0, 0, 0);
      
      // If optimal time is in the past, move to next day
      if (optimalTime <= now) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
      
      return optimalTime.toISOString();
    }
    
    return now.toISOString(); // Current time is optimal
  }

  private recommendFormat(segment: keyof typeof this.USER_SEGMENTS, contentMetadata: any): 'full' | 'summary' | 'alert' | 'digest' {
    if (contentMetadata.urgency === 'critical') return 'alert';
    
    const segmentFormats = {
      casual: 'summary',
      engaged: 'full',
      expert: 'full',
      activist: 'alert',
      professional: 'digest',
    };
    
    return segmentFormats[segment];
  }

  private generatePersonalizationSuggestions(userProfile: any, segment: keyof typeof this.USER_SEGMENTS): string[] {
    const suggestions = [];
    
    if (userProfile.preferences.interestedTopics.length < 3) {
      suggestions.push('Add more topic interests to improve content relevance');
    }
    
    if (segment === 'casual') {
      suggestions.push('Consider enabling summary mode for easier consumption');
    }
    
    if (userProfile.engagementHistory.avgSessionDuration < 60) {
      suggestions.push('Try shorter content formats to match your reading style');
    }
    
    return suggestions;
  }

  private generateContentOptimizations(contentMetadata: any, segment: keyof typeof this.USER_SEGMENTS): string[] {
    const optimizations = [];
    
    if (contentMetadata.length > 1000 && segment === 'casual') {
      optimizations.push('Consider providing a shorter summary for casual readers');
    }
    
    if (contentMetadata.complexity === 'high' && segment !== 'expert' && segment !== 'professional') {
      optimizations.push('Simplify language and add explanations for broader appeal');
    }
    
    if (contentMetadata.urgency === 'low') {
      optimizations.push('Add compelling hooks to increase engagement');
    }
    
    return optimizations;
  }

  private getSegmentEngagementRate(segment: keyof typeof this.USER_SEGMENTS): number {
    const rates = {
      casual: 0.15,
      engaged: 0.45,
      expert: 0.65,
      activist: 0.75,
      professional: 0.60,
    };
    return rates[segment];
  }

  private getCommonActions(segment: keyof typeof this.USER_SEGMENTS): string[] {
    const actions = {
      casual: ['view', 'quick_scan'],
      engaged: ['view', 'comment', 'share'],
      expert: ['view', 'detailed_read', 'comment', 'analyze'],
      activist: ['view', 'comment', 'share', 'advocate'],
      professional: ['view', 'detailed_read', 'save', 'reference'],
    };
    return actions[segment];
  }

  getModelInfo() {
    return {
      name: 'Engagement Predictor',
      version: this.modelVersion,
      description: 'Predicts user engagement and optimizes content delivery',
      capabilities: [
        'Engagement score prediction',
        'User segmentation',
        'Optimal timing recommendations',
        'Content format optimization',
        'Personalization suggestions',
        'Behavioral prediction'
      ]
    };
  }
}

export const engagementPredictor = new EngagementPredictor();