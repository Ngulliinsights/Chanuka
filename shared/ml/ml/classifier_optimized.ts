// ============================================================================
// REAL-TIME CLASSIFIER - ML Model for Real-Time Content Classification
// ============================================================================
// Classifies content in real-time for engagement, alerts, and recommendations

import { z } from 'zod';
import { TextProcessor, Statistics, Cache } from './shared-utils';

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
    processingTime: z.number(),
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
  private modelVersion = '2.1.0';
  private cache = new Cache<any>(300); // 5 minute cache

  private readonly TOPIC_CATEGORIES = {
    'governance': {
      keywords: ['government', 'administration', 'policy', 'serikali', 'utawala', 'governance'],
      weight: 1.0
    },
    'economy': {
      keywords: ['economic', 'finance', 'budget', 'tax', 'uchumi', 'fedha', 'trade', 'investment'],
      weight: 1.0
    },
    'healthcare': {
      keywords: ['health', 'medical', 'hospital', 'afya', 'daktari', 'treatment', 'disease'],
      weight: 1.0
    },
    'education': {
      keywords: ['education', 'school', 'university', 'elimu', 'shule', 'student', 'teacher'],
      weight: 1.0
    },
    'security': {
      keywords: ['security', 'police', 'military', 'usalama', 'polisi', 'defense', 'safety'],
      weight: 1.0
    },
    'corruption': {
      keywords: ['corruption', 'bribe', 'fraud', 'rushwa', 'ufisadi', 'embezzlement', 'graft'],
      weight: 1.2
    },
    'human_rights': {
      keywords: ['rights', 'freedom', 'liberty', 'haki', 'uhuru', 'justice', 'equality'],
      weight: 1.0
    },
    'environment': {
      keywords: ['environment', 'climate', 'pollution', 'mazingira', 'conservation', 'wildlife'],
      weight: 1.0
    },
    'infrastructure': {
      keywords: ['infrastructure', 'roads', 'transport', 'miundombinu', 'construction', 'railway'],
      weight: 1.0
    },
    'agriculture': {
      keywords: ['agriculture', 'farming', 'kilimo', 'mazao', 'livestock', 'crop'],
      weight: 1.0
    },
  };

  private readonly URGENCY_PATTERNS = [
    { pattern: /\b(emergency|crisis|disaster|urgent|immediate|dharura)\b/gi, level: 'emergency', weight: 5 },
    { pattern: /\b(critical|severe|serious|breaking|breaking news|muhimu sana)\b/gi, level: 'critical', weight: 4 },
    { pattern: /\b(urgent|important|pressing|haraka|priority)\b/gi, level: 'urgent', weight: 3 },
    { pattern: /\b(alert|warning|attention|notice)\b/gi, level: 'urgent', weight: 2 },
  ];

  private readonly SENTIMENT_LEXICON = {
    positive: {
      english: ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'brilliant', 'support', 'agree', 'approve', 'beneficial', 'progress', 'success', 'effective', 'improved', 'better'],
      swahili: ['nzuri', 'bora', 'vizuri', 'mzuri', 'faida', 'maendeleo', 'mafanikio'],
      weight: 1.0
    },
    negative: {
      english: ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'oppose', 'disagree', 'harmful', 'failure', 'corrupt', 'ineffective', 'wasteful', 'worse', 'decline'],
      swahili: ['mbaya', 'vibaya', 'hatari', 'kasoro', 'rushwa', 'upuuzi'],
      weight: 1.0
    }
  };

  private readonly CONSTITUTIONAL_ARTICLES = {
    'Article 2': { keywords: ['constitution', 'supremacy', 'katiba'], type: 'structure' },
    'Article 10': { keywords: ['values', 'principles', 'maadili', 'governance'], type: 'values' },
    'Article 31': { keywords: ['privacy', 'personal', 'faragha', 'data'], type: 'rights' },
    'Article 33': { keywords: ['expression', 'speech', 'media', 'uhuru wa kujieleza'], type: 'rights' },
    'Article 47': { keywords: ['fair', 'administrative', 'haki', 'procedure'], type: 'process' },
    'Article 94': { keywords: ['parliament', 'bunge', 'legislative'], type: 'structure' },
    'Article 165': { keywords: ['court', 'judicial', 'mahakama', 'justice'], type: 'structure' },
    'Article 174': { keywords: ['devolution', 'county', 'kaunti', 'local'], type: 'structure' },
  };

  private readonly MISINFORMATION_INDICATORS = [
    'unverified', 'rumor', 'rumour', 'alleged', 'claims without', 'conspiracy',
    'fake news', 'misleading', 'false information', 'hoax', 'fabricated'
  ];

  async classify(input: ClassificationInput): Promise<ClassificationOutput> {
    const startTime = Date.now();
    const validatedInput = ClassificationInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    const classifications: any = {};
    const flags: string[] = [];
    
    // Preprocess text once
    const normalizedText = TextProcessor.normalize(
      validatedInput.content.text + ' ' + (validatedInput.content.title || '')
    );
    const tokens = TextProcessor.tokenize(normalizedText);
    
    // Process classifications
    const taskHandlers: Record<string, () => any> = {
      'urgency_level': () => this.classifyUrgency(normalizedText, tokens),
      'topic_category': () => this.classifyTopic(normalizedText, tokens),
      'sentiment_polarity': () => this.classifySentiment(normalizedText, tokens),
      'engagement_potential': () => this.classifyEngagement(validatedInput.content, tokens, validatedInput.userContext),
      'misinformation_risk': () => this.classifyMisinformationRisk(normalizedText, tokens),
      'constitutional_relevance': () => this.classifyConstitutionalRelevance(normalizedText, tokens),
      'public_interest_level': () => this.classifyPublicInterest(normalizedText, tokens),
      'action_required': () => null, // Computed last
    };
    
    for (const task of validatedInput.classificationTasks) {
      try {
        if (task === 'action_required') continue; // Handle after others
        const handler = taskHandlers[task];
        if (handler) {
          classifications[this.toCamelCase(task)] = handler();
        }
      } catch (error) {
        flags.push(`Error in ${task}: ${error}`);
      }
    }
    
    // Compute action required based on other classifications
    if (validatedInput.classificationTasks.includes('action_required')) {
      classifications.actionRequired = this.classifyActionRequired(validatedInput.content, classifications);
    }
    
    const processingTime = Date.now() - startTime;
    const overallConfidence = this.calculateOverallConfidence(classifications);
    const recommendations = this.generateRecommendations(validatedInput, classifications);
    
    const result = {
      classifications,
      processingMetadata: {
        processingTime,
        modelVersions: { classifier: this.modelVersion },
        confidence: overallConfidence,
        flags,
      },
      recommendations,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private classifyUrgency(text: string, tokens: string[]) {
    const scores = new Map<string, number>();
    let maxScore = 0;
    let detectedLevel: 'routine' | 'normal' | 'urgent' | 'critical' | 'emergency' = 'normal';
    
    for (const { pattern, level, weight } of this.URGENCY_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        const score = matches.length * weight;
        scores.set(level, (scores.get(level) || 0) + score);
        
        if (score > maxScore) {
          maxScore = score;
          detectedLevel = level as typeof detectedLevel;
        }
      }
    }
    
    // Context clues
    if (text.includes('now') && text.includes('action')) maxScore += 1;
    if (text.includes('deadline') || text.includes('expires')) maxScore += 1;
    
    const confidence = Math.min(1, Math.max(0.3, maxScore * 0.15));
    
    return {
      level: maxScore === 0 ? 'normal' : detectedLevel,
      confidence,
      reasoning: maxScore > 0 
        ? `Detected ${maxScore.toFixed(1)} urgency signals for ${detectedLevel} level`
        : 'No significant urgency indicators found',
    };
  }

  private classifyTopic(text: string, tokens: string[]) {
    const topicScores = new Map<string, number>();
    
    // Use TF-IDF-like scoring
    for (const [topic, { keywords, weight }] of Object.entries(this.TOPIC_CATEGORIES)) {
      let score = 0;
      
      for (const keyword of keywords) {
        const keywordTokens = keyword.split(/\s+/);
        
        if (keywordTokens.length === 1) {
          // Single word
          const count = tokens.filter(t => t === keyword).length;
          score += count * weight;
        } else {
          // Phrase
          if (text.includes(keyword)) {
            score += weight * 2; // Phrases are more significant
          }
        }
      }
      
      topicScores.set(topic, score);
    }
    
    // Sort and get top topics
    const sortedTopics = Array.from(topicScores.entries())
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);
    
    const primary = sortedTopics[0]?.[0] || 'general';
    const secondary = sortedTopics.slice(1, 4).map(([topic]) => topic);
    
    const totalScore = Array.from(topicScores.values()).reduce((sum, s) => sum + s, 0);
    const primaryScore = topicScores.get(primary) || 0;
    const confidence = totalScore > 0 ? Math.min(1, primaryScore / totalScore) : 0.4;
    
    // Generate tags
    const tags = this.extractTopicTags(tokens, primary);
    
    return { primary, secondary, confidence, tags };
  }

  private classifySentiment(text: string, tokens: string[]) {
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Score positive sentiment
    for (const word of [...this.SENTIMENT_LEXICON.positive.english, ...this.SENTIMENT_LEXICON.positive.swahili]) {
      const count = tokens.filter(t => t === word).length;
      positiveScore += count * this.SENTIMENT_LEXICON.positive.weight;
    }
    
    // Score negative sentiment
    for (const word of [...this.SENTIMENT_LEXICON.negative.english, ...this.SENTIMENT_LEXICON.negative.swahili]) {
      const count = tokens.filter(t => t === word).length;
      negativeScore += count * this.SENTIMENT_LEXICON.negative.weight;
    }
    
    // Handle negations
    const negationPattern = /\b(not|no|never|nothing|si|hapana)\s+(\w+)/g;
    let match;
    while ((match = negationPattern.exec(text)) !== null) {
      const negatedWord = match[2];
      if (this.SENTIMENT_LEXICON.positive.english.includes(negatedWord) ||
          this.SENTIMENT_LEXICON.positive.swahili.includes(negatedWord)) {
        positiveScore -= 2;
        negativeScore += 2;
      }
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
    
    const confidence = Math.min(1, Math.max(0.3, totalScore * 0.15));
    
    return { polarity, intensity, confidence };
  }

  private classifyEngagement(content: any, tokens: string[], userContext?: any) {
    let score = 50; // Base score
    const factors = [];
    
    // Content length factor
    const wordCount = tokens.length;
    if (wordCount > 100 && wordCount < 500) {
      score += 10;
      factors.push('Optimal content length');
    } else if (wordCount > 1000) {
      score -= 15;
      factors.push('Content may be too long');
    } else if (wordCount < 50) {
      score -= 10;
      factors.push('Content may be too brief');
    }
    
    // Title quality
    if (content.title && content.title.length > 10) {
      score += 15;
      factors.push('Has engaging title');
      
      // Title with numbers or questions
      if (/\d+/.test(content.title) || content.title.includes('?')) {
        score += 5;
        factors.push('Title uses engagement techniques');
      }
    }
    
    // Question engagement
    const questionCount = (content.text.match(/\?/g) || []).length;
    if (questionCount > 0 && questionCount <= 3) {
      score += questionCount * 5;
      factors.push('Contains engaging questions');
    }
    
    // Readability (Flesch-like heuristic)
    const avgWordLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
    if (avgWordLength < 6) {
      score += 5;
      factors.push('Good readability');
    } else if (avgWordLength > 8) {
      score -= 5;
      factors.push('Complex vocabulary may reduce engagement');
    }
    
    // User context adjustments
    if (userContext?.userSegment) {
      const multipliers = {
        casual: 0.9,
        engaged: 1.0,
        expert: 1.1,
        activist: 1.2,
        professional: 1.05,
      };
      score *= multipliers[userContext.userSegment];
    }
    
    // Topic relevance
    if (userContext?.preferences?.topics && userContext.preferences.topics.length > 0) {
      const topicMatch = this.classifyTopic(content.text, tokens);
      const hasRelevantTopic = userContext.preferences.topics.some((t: string) => 
        t.toLowerCase() === topicMatch.primary.toLowerCase() ||
        topicMatch.secondary.some(s => s.toLowerCase() === t.toLowerCase())
      );
      
      if (hasRelevantTopic) {
        score += 20;
        factors.push('Matches user interests');
      }
    }
    
    score = Math.max(0, Math.min(100, score));
    
    // Predict actions
    const predictedActions: Array<'view' | 'comment' | 'share' | 'save' | 'ignore'> = [];
    if (score > 70) predictedActions.push('view', 'comment');
    if (score > 80) predictedActions.push('share');
    if (score > 60) predictedActions.push('save');
    if (score < 30) predictedActions.push('ignore');
    
    return { score, factors, predictedActions };
  }

  private classifyMisinformationRisk(text: string, tokens: string[]) {
    let riskScore = 0;
    const riskFactors = [];
    
    // Check indicators
    for (const indicator of this.MISINFORMATION_INDICATORS) {
      if (text.includes(indicator)) {
        riskScore += 1;
        riskFactors.push(`Contains: "${indicator}"`);
      }
    }
    
    // Lack of attribution
    const hasSource = text.includes('source') || text.includes('according to') || 
                     text.includes('reported by') || text.includes('said');
    if (!hasSource) {
      riskScore += 0.5;
      riskFactors.push('No clear source attribution');
    }
    
    // Emotional language
    const emotionalWords = ['shocking', 'unbelievable', 'scandal', 'exposed', 'revealed', 'bombshell'];
    const emotionalCount = emotionalWords.filter(w => text.includes(w)).length;
    if (emotionalCount > 2) {
      riskScore += 0.5;
      riskFactors.push('High use of emotional language');
    }
    
    // All caps sections (shouting)
    const capsRatio = (text.match(/\b[A-Z]{4,}\b/g) || []).length / Math.max(1, tokens.length / 50);
    if (capsRatio > 0.2) {
      riskScore += 0.3;
      riskFactors.push('Excessive use of capital letters');
    }
    
    // Clickbait patterns
    const clickbaitPatterns = ['you won\'t believe', 'shocking truth', 'they don\'t want you to know'];
    if (clickbaitPatterns.some(p => text.includes(p))) {
      riskScore += 0.5;
      riskFactors.push('Clickbait language detected');
    }
    
    // Determine risk level
    let riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' = 'very_low';
    if (riskScore >= 3) riskLevel = 'very_high';
    else if (riskScore >= 2) riskLevel = 'high';
    else if (riskScore >= 1) riskLevel = 'medium';
    else if (riskScore >= 0.5) riskLevel = 'low';
    
    const confidence = Math.min(1, Math.max(0.4, riskScore * 0.3));
    const requiresFactCheck = riskLevel === 'high' || riskLevel === 'very_high';
    
    return { riskLevel, riskFactors, confidence, requiresFactCheck };
  }

  private classifyConstitutionalRelevance(text: string, tokens: string[]) {
    let relevanceScore = 0;
    const affectedArticles = new Set<string>();
    let impactType: 'rights' | 'structure' | 'process' | 'values' | undefined;
    
    for (const [article, { keywords, type }] of Object.entries(this.CONSTITUTIONAL_ARTICLES)) {
      let articleScore = 0;
      
      for (const keyword of keywords) {
        if (tokens.includes(keyword) || text.includes(keyword)) {
          articleScore += 20;
          affectedArticles.add(article);
          impactType = impactType || type;
        }
      }
      
      relevanceScore += articleScore;
    }
    
    // General constitutional terms
    const constitutionalTerms = ['constitution', 'constitutional', 'bill of rights', 'katiba', 'amendment'];
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
      affectedArticles: Array.from(affectedArticles),
      impactType,
    };
  }

  private classifyPublicInterest(text: string, tokens: string[]) {
    let score = 30; // Base score
    const interestFactors = [];
    
    // High-interest topics
    const highInterestTopics = ['corruption', 'tax', 'healthcare', 'education', 'security', 'police', 'scandal'];
    for (const topic of highInterestTopics) {
      if (tokens.includes(topic)) {
        score += 15;
        interestFactors.push(`High-interest topic: ${topic}`);
      }
    }
    
    // Public figures
    const publicFigureTitles = ['president', 'minister', 'governor', 'senator', 'mp', 'judge'];
    if (publicFigureTitles.some(title => tokens.includes(title))) {
      score += 15;
      interestFactors.push('Involves public figures');
    }
    
    // Financial impact
    if (/\d+\s*(billion|million|trillion)/i.test(text)) {
      score += 20;
      interestFactors.push('Significant financial impact');
    }
    
    // Widespread impact
    const wideImpact = ['all citizens', 'nationwide', 'every', 'entire country', 'whole nation'];
    if (wideImpact.some(term => text.includes(term))) {
      score += 15;
      interestFactors.push('Widespread impact');
    }
    
    // Controversial keywords
    const controversial = ['protest', 'strike', 'riot', 'conflict', 'dispute', 'controversy'];
    if (controversial.some(word => tokens.includes(word))) {
      score += 10;
      interestFactors.push('Potentially controversial');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' = 'very_low';
    if (score >= 80) level = 'very_high';
    else if (score >= 65) level = 'high';
    else if (score >= 45) level = 'medium';
    else if (score >= 25) level = 'low';
    
    return { level, score, interestFactors };
  }

  private classifyActionRequired(content: any, classifications: any) {
    let requiresAction = false;
    let actionType: 'alert' | 'investigation' | 'fact_check' | 'expert_review' | 'public_notice' | undefined;
    let priority: 'low' | 'medium' | 'high' | 'urgent' | undefined;
    let timeline: string | undefined;
    
    // Check urgency
    if (classifications.urgencyLevel) {
      const level = classifications.urgencyLevel.level;
      if (level === 'emergency' || level === 'critical') {
        requiresAction = true;
        actionType = 'alert';
        priority = 'urgent';
        timeline = 'Immediate';
      } else if (level === 'urgent') {
        requiresAction = true;
        actionType = 'alert';
        priority = 'high';
        timeline = 'Within 24 hours';
      }
    }
    
    // Check misinformation
    if (classifications.misinformationRisk?.requiresFactCheck) {
      requiresAction = true;
      actionType = actionType || 'fact_check';
      priority = priority || 'high';
      timeline = timeline || 'Within 24 hours';
    }
    
    // Check constitutional relevance
    if (classifications.constitutionalRelevance?.relevanceScore > 70) {
      requiresAction = true;
      actionType = actionType || 'expert_review';
      priority = priority || 'medium';
      timeline = timeline || 'Within 3 days';
    }
    
    // Check public interest
    if (classifications.publicInterestLevel?.level === 'very_high') {
      requiresAction = true;
      actionType = actionType || 'public_notice';
      priority = priority || 'high';
      timeline = timeline || 'Within 48 hours';
    }
    
    return { requiresAction, actionType, priority, timeline };
  }

  private extractTopicTags(tokens: string[], primaryTopic: string): string[] {
    const tags = new Set<string>();
    
    // Add relevant tokens as tags
    const categoryKeywords = this.TOPIC_CATEGORIES[primaryTopic as keyof typeof this.TOPIC_CATEGORIES]?.keywords || [];
    
    for (const keyword of categoryKeywords) {
      if (tokens.includes(keyword)) {
        tags.add(keyword);
      }
    }
    
    // Add common action words if present
    const actionWords = ['reform', 'policy', 'legislation', 'bill', 'amendment', 'proposal'];
    for (const word of actionWords) {
      if (tokens.includes(word)) {
        tags.add(word);
      }
    }
    
    return Array.from(tags).slice(0, 10);
  }

  private calculateOverallConfidence(classifications: any): number {
    const confidenceValues = [];
    
    for (const classification of Object.values(classifications)) {
      if (typeof classification === 'object' && classification !== null && 'confidence' in classification) {
        confidenceValues.push((classification as any).confidence);
      }
    }
    
    return confidenceValues.length > 0 
      ? Statistics.mean(confidenceValues)
      : 0.5;
  }

  private generateRecommendations(input: ClassificationInput, classifications: any) {
    const userRecommendations = [];
    const systemRecommendations = [];
    
    // User recommendations
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
    } else if (classifications.engagementPotential?.score < 30) {
      userRecommendations.push({
        type: 'defer' as const,
        reason: 'Low engagement potential - consider reviewing later',
        confidence: 0.7,
      });
    }
    
    if (classifications.misinformationRisk?.riskLevel === 'high' || 
        classifications.misinformationRisk?.riskLevel === 'very_high') {
      userRecommendations.push({
        type: 'filter' as const,
        reason: 'High misinformation risk detected',
        confidence: 0.85,
      });
    }
    
    if (classifications.topicCategory && input.userContext?.preferences?.topics) {
      const matchesInterest = input.userContext.preferences.topics.includes(classifications.topicCategory.primary);
      if (matchesInterest) {
        userRecommendations.push({
          type: 'highlight' as const,
          reason: 'Matches your topic interests',
          confidence: 0.9,
        });
      }
    }
    
    // System recommendations
    if (classifications.actionRequired?.requiresAction) {
      systemRecommendations.push({
        type: 'escalate' as const,
        reason: `Action required: ${classifications.actionRequired.actionType}`,
        targetSystem: 'content_moderation',
      });
    }
    
    if (classifications.publicInterestLevel?.level === 'very_high' || 
        classifications.publicInterestLevel?.level === 'high') {
      systemRecommendations.push({
        type: 'distribute' as const,
        reason: 'High public interest content should be widely distributed',
        targetSystem: 'notification_service',
      });
    }
    
    if (classifications.constitutionalRelevance?.isRelevant) {
      systemRecommendations.push({
        type: 'flag' as const,
        reason: 'Constitutional implications detected',
        targetSystem: 'legal_review',
      });
    }
    
    return { userRecommendations, systemRecommendations };
  }

  private generateCacheKey(input: ClassificationInput): string {
    const contentHash = input.content.text.substring(0, 100);
    const tasks = input.classificationTasks.sort().join(',');
    return `${contentHash}-${tasks}`;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  getModelInfo() {
    return {
      name: 'Real-Time Classifier',
      version: this.modelVersion,
      description: 'Optimized real-time content classification with caching',
      capabilities: [
        'Urgency level classification with pattern matching',
        'Multi-topic categorization with TF-IDF',
        'Sentiment analysis with negation handling',
        'Engagement potential prediction',
        'Misinformation risk assessment',
        'Constitutional relevance detection',
        'Public interest level assessment',
        'Actionable recommendations',
        'Performance optimization with caching'
      ]
    };
  }
}

export const realTimeClassifier = new RealTimeClassifier();
