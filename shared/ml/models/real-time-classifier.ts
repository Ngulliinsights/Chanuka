// ============================================================================
// REAL-TIME CLASSIFIER - ML Model for Real-Time Content Classification
// ============================================================================
// Classifies content in real-time for engagement, alerts, and recommendations

import { z } from 'zod';

export const ClassificationInputSchema = z.object({
  content: z.object({
    text: z.string().min(1),
    title: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    source: z.enum(['bill', 'comment', 'news', 'social_media', 'official_statement']),
    timestamp: z.string(),
  }),
  classificationTasks: z.array(z.enum([
    'urgency_level',
    'topic_category',
    'sentiment_polarity',
    'engagement_potential',
    'misinformation_risk',
    'constitutional_relevance',
    'public_interest_level',
    'action_required'
  ])),
  userContext: z.object({
    userId: z.string().uuid().optional(),
    userSegment: z.enum(['casual', 'engaged', 'expert', 'activist', 'professional']).optional(),
    preferences: z.object({
      topics: z.array(z.string()),
      urgencyThreshold: z.enum(['low', 'medium', 'high']),
    }).optional(),
  }).optional(),
});

export const ClassificationOutputSchema = z.object({
  classifications: z.object({
    urgencyLevel: z.object({
      level: z.enum(['routine', 'normal', 'urgent', 'critical', 'emergency']),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }).optional(),
    
    topicCategory: z.object({
      primary: z.string(),
      secondary: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      tags: z.array(z.string()),
    }).optional(),
    
    sentimentPolarity: z.object({
      polarity: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
      intensity: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
    }).optional(),
    
    engagementPotential: z.object({
      score: z.number().min(0).max(100),
      factors: z.array(z.string()),
      predictedActions: z.array(z.enum(['view', 'comment', 'share', 'save', 'ignore'])),
    }).optional(),
    
    misinformationRisk: z.object({
      riskLevel: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
      riskFactors: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      requiresFactCheck: z.boolean(),
    }).optional(),
    
    constitutionalRelevance: z.object({
      isRelevant: z.boolean(),
      relevanceScore: z.number().min(0).max(100),
      affectedArticles: z.array(z.string()),
      impactType: z.enum(['rights', 'structure', 'process', 'values']).optional(),
    }).optional(),
    
    publicInterestLevel: z.object({
      level: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
      score: z.number().min(0).max(100),
      interestFactors: z.array(z.string()),
    }).optional(),
    
    actionRequired: z.object({
      requiresAction: z.boolean(),
      actionType: z.enum(['alert', 'investigation', 'fact_check', 'expert_review', 'public_notice']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      timeline: z.string().optional(),
    }).optional(),
  }),
  
  processingMetadata: z.object({
    processingTime: z.number(), // milliseconds
    modelVersions: z.record(z.string()),
    confidence: z.number().min(0).max(1),
    flags: z.array(z.string()),
  }),
  
  recommendations: z.object({
    userRecommendations: z.array(z.object({
      type: z.enum(['notify', 'highlight', 'summarize', 'defer', 'filter']),
      reason: z.string(),
      confidence: z.number().min(0).max(1),
    })),
    systemRecommendations: z.array(z.object({
      type: z.enum(['escalate', 'monitor', 'archive', 'flag', 'distribute']),
      reason: z.string(),
      targetSystem: z.string(),
    })),
  }),
});

export type ClassificationInput = z.infer<typeof ClassificationInputSchema>;
export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

export class RealTimeClassifier {
  private modelVersion = '2.0.0';

  // Topic categories and their keywords
  private readonly TOPIC_CATEGORIES = {
    'governance': ['government', 'administration', 'policy', 'serikali', 'utawala'],
    'economy': ['economic', 'finance', 'budget', 'tax', 'uchumi', 'fedha'],
    'healthcare': ['health', 'medical', 'hospital', 'afya', 'daktari'],
    'education': ['education', 'school', 'university', 'elimu', 'shule'],
    'security': ['security', 'police', 'military', 'usalama', 'polisi'],
    'corruption': ['corruption', 'bribe', 'fraud', 'rushwa', 'ufisadi'],
    'human_rights': ['rights', 'freedom', 'liberty', 'haki', 'uhuru'],
    'environment': ['environment', 'climate', 'pollution', 'mazingira'],
    'infrastructure': ['infrastructure', 'roads', 'transport', 'miundombinu'],
    'agriculture': ['agriculture', 'farming', 'kilimo', 'mazao'],
  };

  // Urgency indicators
  private readonly URGENCY_INDICATORS = {
    emergency: ['emergency', 'crisis', 'disaster', 'urgent', 'immediate', 'dharura'],
    critical: ['critical', 'severe', 'serious', 'breaking', 'muhimu'],
    urgent: ['urgent', 'important', 'pressing', 'haraka', 'muhimu'],
    normal: ['normal', 'regular', 'standard', 'kawaida'],
    routine: ['routine', 'scheduled', 'planned', 'ratiba'],
  };

  // Constitutional articles and keywords
  private readonly CONSTITUTIONAL_KEYWORDS = {
    'Article 2': ['constitution', 'supremacy', 'katiba'],
    'Article 10': ['values', 'principles', 'maadili'],
    'Article 31': ['privacy', 'personal', 'faragha'],
    'Article 33': ['expression', 'speech', 'media', 'uhuru wa kujieleza'],
    'Article 47': ['fair', 'administrative', 'haki'],
    'Article 94': ['parliament', 'bunge', 'legislative'],
    'Article 165': ['court', 'judicial', 'mahakama'],
    'Article 174': ['devolution', 'county', 'kaunti'],
  };

  // Misinformation risk factors
  private readonly MISINFORMATION_INDICATORS = [
    'unverified', 'rumor', 'alleged', 'claims without evidence',
    'conspiracy', 'fake news', 'misleading', 'false information'
  ];

  async classify(input: ClassificationInput): Promise<ClassificationOutput> {
    const startTime = Date.now();
    const validatedInput = ClassificationInputSchema.parse(input);
    
    const classifications: any = {};
    const flags: string[] = [];
    
    // Process each requested classification task
    for (const task of validatedInput.classificationTasks) {
      try {
        switch (task) {
          case 'urgency_level':
            classifications.urgencyLevel = this.classifyUrgency(validatedInput.content);
            break;
          case 'topic_category':
            classifications.topicCategory = this.classifyTopic(validatedInput.content);
            break;
          case 'sentiment_polarity':
            classifications.sentimentPolarity = this.classifySentiment(validatedInput.content);
            break;
          case 'engagement_potential':
            classifications.engagementPotential = this.classifyEngagement(validatedInput.content, validatedInput.userContext);
            break;
          case 'misinformation_risk':
            classifications.misinformationRisk = this.classifyMisinformationRisk(validatedInput.content);
            break;
          case 'constitutional_relevance':
            classifications.constitutionalRelevance = this.classifyConstitutionalRelevance(validatedInput.content);
            break;
          case 'public_interest_level':
            classifications.publicInterestLevel = this.classifyPublicInterest(validatedInput.content);
            break;
          case 'action_required':
            classifications.actionRequired = this.classifyActionRequired(validatedInput.content, classifications);
            break;
        }
      } catch (error) {
        flags.push(`Error in ${task}: ${error}`);
      }
    }
    
    const processingTime = Date.now() - startTime;
    const overallConfidence = this.calculateOverallConfidence(classifications);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(validatedInput, classifications);
    
    return {
      classifications,
      processingMetadata: {
        processingTime,
        modelVersions: { classifier: this.modelVersion },
        confidence: overallConfidence,
        flags,
      },
      recommendations,
    };
  }

  private classifyUrgency(content: any) {
    const text = (content.text + ' ' + (content.title || '')).toLowerCase();
    let maxScore = 0;
    let detectedLevel: 'routine' | 'normal' | 'urgent' | 'critical' | 'emergency' = 'routine';
    
    for (const [level, indicators] of Object.entries(this.URGENCY_INDICATORS)) {
      let score = 0;
      for (const indicator of indicators) {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        detectedLevel = level as typeof detectedLevel;
      }
    }
    
    // Additional urgency signals
    if (text.includes('breaking') || text.includes('alert')) {
      detectedLevel = 'critical';
      maxScore += 2;
    }
    
    const confidence = Math.min(1, maxScore * 0.3);
    
    return {
      level: detectedLevel,
      confidence,
      reasoning: `Detected ${maxScore} urgency indicators for ${detectedLevel} level`,
    };
  }

  private classifyTopic(content: any) {
    const text = (content.text + ' ' + (content.title || '')).toLowerCase();
    const topicScores: Record<string, number> = {};
    
    // Calculate scores for each topic
    for (const [topic, keywords] of Object.entries(this.TOPIC_CATEGORIES)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      topicScores[topic] = score;
    }
    
    // Find primary and secondary topics
    const sortedTopics = Object.entries(topicScores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);
    
    const primary = sortedTopics[0]?.[0] || 'general';
    const secondary = sortedTopics.slice(1, 4).map(([topic]) => topic);
    
    const totalScore = Object.values(topicScores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? Math.min(1, topicScores[primary] / totalScore) : 0.5;
    
    // Generate tags
    const tags = this.extractTopicTags(text, primary);
    
    return {
      primary,
      secondary,
      confidence,
      tags,
    };
  }

  private classifySentiment(content: any) {
    const text = content.text.toLowerCase();
    
    // Simple sentiment analysis using keyword matching
    const positiveWords = ['good', 'great', 'excellent', 'support', 'agree', 'nzuri', 'vizuri'];
    const negativeWords = ['bad', 'terrible', 'oppose', 'disagree', 'hate', 'mbaya', 'vibaya'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    for (const word of positiveWords) {
      const matches = text.match(new RegExp(`\\b${word}\\b`, 'gi'));
      if (matches) positiveScore += matches.length;
    }
    
    for (const word of negativeWords) {
      const matches = text.match(new RegExp(`\\b${word}\\b`, 'gi'));
      if (matches) negativeScore += matches.length;
    }
    
    const totalScore = positiveScore + negativeScore;
    let polarity: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' = 'neutral';
    let intensity = 0;
    
    if (totalScore > 0) {
      const sentimentScore = (positiveScore - negativeScore) / totalScore;
      intensity = Math.abs(sentimentScore);
      
      if (sentimentScore > 0.6) polarity = 'very_positive';
      else if (sentimentScore > 0.2) polarity = 'positive';
      else if (sentimentScore < -0.6) polarity = 'very_negative';
      else if (sentimentScore < -0.2) polarity = 'negative';
    }
    
    const confidence = totalScore > 0 ? Math.min(1, totalScore * 0.2) : 0.3;
    
    return {
      polarity,
      intensity,
      confidence,
    };
  }

  private classifyEngagement(content: any, userContext?: any) {
    let score = 50; // Base score
    const factors = [];
    
    // Content length factor
    const wordCount = content.text.split(/\s+/).length;
    if (wordCount > 100 && wordCount < 500) {
      score += 10;
      factors.push('Optimal content length');
    } else if (wordCount > 1000) {
      score -= 15;
      factors.push('Content may be too long');
    }
    
    // Title presence
    if (content.title && content.title.length > 10) {
      score += 15;
      factors.push('Has engaging title');
    }
    
    // Question marks (engagement indicator)
    const questionCount = (content.text.match(/\?/g) || []).length;
    if (questionCount > 0) {
      score += questionCount * 5;
      factors.push('Contains questions');
    }
    
    // Urgency boost
    const urgencyClassification = this.classifyUrgency(content);
    if (urgencyClassification.level === 'urgent' || urgencyClassification.level === 'critical') {
      score += 20;
      factors.push('High urgency content');
    }
    
    // User context adjustments
    if (userContext?.userSegment) {
      const segmentMultipliers = {
        casual: 0.8,
        engaged: 1.0,
        expert: 1.1,
        activist: 1.2,
        professional: 1.0,
      };
      score *= segmentMultipliers[userContext.userSegment];
    }
    
    score = Math.max(0, Math.min(100, score));
    
    // Predict likely actions
    const predictedActions: Array<'view' | 'comment' | 'share' | 'save' | 'ignore'> = [];
    if (score > 70) predictedActions.push('view', 'comment');
    if (score > 80) predictedActions.push('share');
    if (score > 60) predictedActions.push('save');
    if (score < 30) predictedActions.push('ignore');
    
    return {
      score,
      factors,
      predictedActions,
    };
  }

  private classifyMisinformationRisk(content: any) {
    const text = content.text.toLowerCase();
    let riskScore = 0;
    const riskFactors = [];
    
    // Check for misinformation indicators
    for (const indicator of this.MISINFORMATION_INDICATORS) {
      if (text.includes(indicator.toLowerCase())) {
        riskScore += 1;
        riskFactors.push(`Contains: ${indicator}`);
      }
    }
    
    // Check for lack of sources
    if (!text.includes('source') && !text.includes('according to') && content.source !== 'official_statement') {
      riskScore += 0.5;
      riskFactors.push('No sources cited');
    }
    
    // Check for emotional language
    const emotionalWords = ['shocking', 'unbelievable', 'scandal', 'exposed'];
    for (const word of emotionalWords) {
      if (text.includes(word)) {
        riskScore += 0.3;
        riskFactors.push('Uses emotional language');
        break;
      }
    }
    
    // Determine risk level
    let riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' = 'very_low';
    if (riskScore >= 3) riskLevel = 'very_high';
    else if (riskScore >= 2) riskLevel = 'high';
    else if (riskScore >= 1) riskLevel = 'medium';
    else if (riskScore >= 0.5) riskLevel = 'low';
    
    const confidence = Math.min(1, riskScore * 0.4);
    const requiresFactCheck = riskLevel === 'high' || riskLevel === 'very_high';
    
    return {
      riskLevel,
      riskFactors,
      confidence,
      requiresFactCheck,
    };
  }

  private classifyConstitutionalRelevance(content: any) {
    const text = (content.text + ' ' + (content.title || '')).toLowerCase();
    let relevanceScore = 0;
    const affectedArticles = [];
    let impactType: 'rights' | 'structure' | 'process' | 'values' | undefined;
    
    // Check for constitutional keywords
    for (const [article, keywords] of Object.entries(this.CONSTITUTIONAL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          relevanceScore += 20;
          affectedArticles.push(article);
          
          // Determine impact type
          if (article.includes('31') || article.includes('33')) impactType = 'rights';
          else if (article.includes('94') || article.includes('165')) impactType = 'structure';
          else if (article.includes('47')) impactType = 'process';
          else if (article.includes('10')) impactType = 'values';
        }
      }
    }
    
    // General constitutional terms
    const constitutionalTerms = ['constitution', 'constitutional', 'bill of rights', 'katiba'];
    for (const term of constitutionalTerms) {
      if (text.includes(term)) {
        relevanceScore += 10;
      }
    }
    
    const isRelevant = relevanceScore > 0;
    relevanceScore = Math.min(100, relevanceScore);
    
    return {
      isRelevant,
      relevanceScore,
      affectedArticles: [...new Set(affectedArticles)], // Remove duplicates
      impactType,
    };
  }

  private classifyPublicInterest(content: any) {
    const text = content.text.toLowerCase();
    let score = 30; // Base score
    const interestFactors = [];
    
    // High-interest topics
    const highInterestTopics = ['corruption', 'tax', 'healthcare', 'education', 'security'];
    for (const topic of highInterestTopics) {
      if (text.includes(topic)) {
        score += 20;
        interestFactors.push(`High-interest topic: ${topic}`);
      }
    }
    
    // Public figures
    if (text.includes('president') || text.includes('minister') || text.includes('governor')) {
      score += 15;
      interestFactors.push('Involves public figures');
    }
    
    // Financial impact
    if (text.includes('billion') || text.includes('million') || text.includes('budget')) {
      score += 15;
      interestFactors.push('Significant financial impact');
    }
    
    // Widespread impact
    if (text.includes('all citizens') || text.includes('nationwide') || text.includes('every')) {
      score += 10;
      interestFactors.push('Widespread impact');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' = 'very_low';
    if (score >= 80) level = 'very_high';
    else if (score >= 65) level = 'high';
    else if (score >= 45) level = 'medium';
    else if (score >= 25) level = 'low';
    
    return {
      level,
      score,
      interestFactors,
    };
  }

  private classifyActionRequired(content: any, classifications: any) {
    let requiresAction = false;
    let actionType: 'alert' | 'investigation' | 'fact_check' | 'expert_review' | 'public_notice' | undefined;
    let priority: 'low' | 'medium' | 'high' | 'urgent' | undefined;
    let timeline: string | undefined;
    
    // Check urgency level
    if (classifications.urgencyLevel?.level === 'emergency' || classifications.urgencyLevel?.level === 'critical') {
      requiresAction = true;
      actionType = 'alert';
      priority = 'urgent';
      timeline = 'Immediate';
    }
    
    // Check misinformation risk
    if (classifications.misinformationRisk?.requiresFactCheck) {
      requiresAction = true;
      actionType = 'fact_check';
      priority = 'high';
      timeline = 'Within 24 hours';
    }
    
    // Check constitutional relevance
    if (classifications.constitutionalRelevance?.relevanceScore > 70) {
      requiresAction = true;
      actionType = 'expert_review';
      priority = 'medium';
      timeline = 'Within 3 days';
    }
    
    // Check public interest
    if (classifications.publicInterestLevel?.level === 'very_high') {
      requiresAction = true;
      actionType = actionType || 'public_notice';
      priority = priority || 'high';
      timeline = timeline || 'Within 48 hours';
    }
    
    return {
      requiresAction,
      actionType,
      priority,
      timeline,
    };
  }

  private extractTopicTags(text: string, primaryTopic: string): string[] {
    const tags = [];
    
    // Extract relevant keywords based on primary topic
    const topicKeywords = this.TOPIC_CATEGORIES[primaryTopic as keyof typeof this.TOPIC_CATEGORIES] || [];
    
    for (const keyword of topicKeywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    // Add general tags
    if (text.includes('policy')) tags.push('policy');
    if (text.includes('reform')) tags.push('reform');
    if (text.includes('bill')) tags.push('legislation');
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private calculateOverallConfidence(classifications: any): number {
    const confidenceValues = [];
    
    for (const classification of Object.values(classifications)) {
      if (typeof classification === 'object' && classification !== null && 'confidence' in classification) {
        confidenceValues.push((classification as any).confidence);
      }
    }
    
    if (confidenceValues.length === 0) return 0.5;
    
    return confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
  }

  private generateRecommendations(input: ClassificationInput, classifications: any) {
    const userRecommendations = [];
    const systemRecommendations = [];
    
    // User recommendations based on classifications
    if (classifications.urgencyLevel?.level === 'critical' || classifications.urgencyLevel?.level === 'emergency') {
      userRecommendations.push({
        type: 'notify' as const,
        reason: 'High urgency content requires immediate attention',
        confidence: 0.9,
      });
    }
    
    if (classifications.engagementPotential?.score > 70) {
      userRecommendations.push({
        type: 'highlight' as const,
        reason: 'High engagement potential content',
        confidence: 0.8,
      });
    }
    
    if (classifications.misinformationRisk?.riskLevel === 'high' || classifications.misinformationRisk?.riskLevel === 'very_high') {
      userRecommendations.push({
        type: 'filter' as const,
        reason: 'High misinformation risk detected',
        confidence: 0.85,
      });
    }
    
    // System recommendations
    if (classifications.actionRequired?.requiresAction) {
      systemRecommendations.push({
        type: 'escalate' as const,
        reason: `Action required: ${classifications.actionRequired.actionType}`,
        targetSystem: 'content_moderation',
      });
    }
    
    if (classifications.publicInterestLevel?.level === 'very_high') {
      systemRecommendations.push({
        type: 'distribute' as const,
        reason: 'High public interest content should be widely distributed',
        targetSystem: 'notification_service',
      });
    }
    
    return {
      userRecommendations,
      systemRecommendations,
    };
  }

  getModelInfo() {
    return {
      name: 'Real-Time Classifier',
      version: this.modelVersion,
      description: 'Real-time content classification for multiple tasks',
      capabilities: [
        'Urgency level classification',
        'Topic categorization',
        'Sentiment analysis',
        'Engagement potential prediction',
        'Misinformation risk assessment',
        'Constitutional relevance detection',
        'Public interest level assessment',
        'Action requirement determination'
      ]
    };
  }
}

export const realTimeClassifier = new RealTimeClassifier();