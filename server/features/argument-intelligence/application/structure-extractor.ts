// ============================================================================
// ARGUMENT INTELLIGENCE - Structure Extractor
// ============================================================================
// Extracts argumentative structure from informal citizen comments

import { logger } from '@shared/core/index.js';
import { SentenceClassifier } from '../infrastructure/nlp/sentence-classifier.js';
import { EntityExtractor } from '../infrastructure/nlp/entity-extractor.js';
import { SimilarityCalculator } from '../infrastructure/nlp/similarity-calculator.js';

export interface ExtractionContext {
  bill_id: string;
  userContext?: {
    county?: string;
    ageGroup?: string;
    occupation?: string;
    organizationAffiliation?: string;
  };
  submissionContext?: {
    submissionMethod: 'web' | 'ussd' | 'ambassador' | 'api';
    timestamp: Date;
    session_id?: string;
  };
}

export interface ExtractedArgument {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment';
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  text: string;
  normalizedText: string;
  confidence: number;
  topicTags: string[];
  affectedGroups: string[];
  evidenceQuality: 'none' | 'weak' | 'moderate' | 'strong';
  sentenceSpan: { start: number; end: number };
  parentArgumentId?: string;
}

export interface ArgumentChain {
  mainClaim: ExtractedArgument;
  supportingReasons: ExtractedArgument[];
  evidence: ExtractedArgument[];
  predictions: ExtractedArgument[];
  counterArguments: ExtractedArgument[];
}

export class StructureExtractorService {
  constructor(
    private readonly sentenceClassifier: SentenceClassifier,
    private readonly entityExtractor: EntityExtractor,
    private readonly similarityCalculator: SimilarityCalculator
  ) {}

  /**
   * Extract argumentative structure from a comment
   */
  async extractArguments(
    commentText: string,
    context: ExtractionContext
  ): Promise<ExtractedArgument[]> {
    try {
      logger.info(`🔍 Extracting arguments from comment`, {
        component: 'StructureExtractor',
        bill_id: context.bill_id,
        textLength: commentText.length
      });

      // Step 1: Preprocess and segment text
      const sentences = this.segmentIntoSentences(commentText);
      
      // Step 2: Classify each sentence
      const classifiedSentences = await this.classifySentences(sentences);
      
      // Step 3: Extract entities and topics
      const entities = await this.entityExtractor.extractEntities(commentText);
      
      // Step 4: Identify argumentative components
      const arguments = await this.identifyArguments(
        classifiedSentences,
        entities,
        context
      );
      
      // Step 5: Build argument chains
      const argumentChains = this.buildArgumentChains(arguments);
      
      // Step 6: Normalize and enhance arguments
      const enhancedArguments = await this.enhanceArguments(arguments, context);

      logger.info(`✅ Argument extraction completed`, {
        component: 'StructureExtractor',
        bill_id: context.bill_id,
        argumentsExtracted: enhancedArguments.length,
        chains: argumentChains.length
      });

      return enhancedArguments;

    } catch (error) {
      logger.error('Failed to extract arguments', error, {
        component: 'StructureExtractor',
        bill_id: context.bill_id
      });
      throw error;
    }
  }

  /**
   * Segment text into sentences with robust handling of informal text
   */
  private segmentIntoSentences(text: string): Array<{ text: string; start: number; end: number }> {
    // Handle informal text patterns common in citizen comments
    const sentences: Array<{ text: string; start: number; end: number }> = [];
    
    // Normalize text first
    let normalizedText = text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\.{2,}/g, '.') // Multiple dots to single dot
      .replace(/!{2,}/g, '!') // Multiple exclamations to single
      .replace(/\?{2,}/g, '?') // Multiple questions to single
      .trim();

    // Split on sentence boundaries, handling informal patterns
    const sentencePattern = /([.!?]+\s+|[\n\r]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = sentencePattern.exec(normalizedText)) !== null) {
      const sentenceText = normalizedText.slice(lastIndex, match.index).trim();
      if (sentenceText.length > 5) { // Minimum sentence length
        sentences.push({
          text: sentenceText,
          start: lastIndex,
          end: match.index
        });
      }
      lastIndex = sentencePattern.lastIndex;
    }

    // Handle final sentence if no ending punctuation
    const finalText = normalizedText.slice(lastIndex).trim();
    if (finalText.length > 5) {
      sentences.push({
        text: finalText,
        start: lastIndex,
        end: normalizedText.length
      });
    }

    return sentences;
  }

  /**
   * Classify sentences into argumentative types
   */
  private async classifySentences(sentences: Array<{ text: string; start: number; end: number }>): Promise<Array<{
    text: string;
    start: number;
    end: number;
    type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment' | 'other';
    confidence: number;
  }>> {
    const classified = [];

    for (const sentence of sentences) {
      const classification = await this.sentenceClassifier.classify(sentence.text);
      classified.push({
        ...sentence,
        type: classification.type,
        confidence: classification.confidence
      });
    }

    return classified;
  }

  /**
   * Identify argumentative components from classified sentences
   */
  private async identifyArguments(
    classifiedSentences: any[],
    entities: any,
    context: ExtractionContext
  ): Promise<ExtractedArgument[]> {
    const arguments: ExtractedArgument[] = [];

    for (const sentence of classifiedSentences) {
      if (sentence.type === 'other' || sentence.confidence < 0.6) {
        continue; // Skip low-confidence or non-argumentative sentences
      }

      // Determine position (support/oppose/neutral)
      const position = await this.determinePosition(sentence.text, context.bill_id);
      
      // Extract topic tags and affected groups
      const topicTags = this.extractTopicTags(sentence.text, entities);
      const affectedGroups = this.extractAffectedGroups(sentence.text, entities);
      
      // Assess evidence quality
      const evidenceQuality = this.assessEvidenceQuality(sentence.text, sentence.type);

      // Create normalized version for deduplication
      const normalizedText = this.normalizeArgumentText(sentence.text);

      const argument: ExtractedArgument = {
        id: this.generateArgumentId(),
        type: sentence.type,
        position,
        text: sentence.text,
        normalizedText,
        confidence: sentence.confidence,
        topicTags,
        affectedGroups,
        evidenceQuality,
        sentenceSpan: {
          start: sentence.start,
          end: sentence.end
        }
      };

      arguments.push(argument);
    }

    return arguments;
  }

  /**
   * Build argument chains showing relationships between arguments
   */
  private buildArgumentChains(arguments: ExtractedArgument[]): ArgumentChain[] {
    const chains: ArgumentChain[] = [];
    const processedArguments = new Set<string>();

    // Find main claims (usually the strongest, most confident arguments)
    const mainClaims = arguments
      .filter(arg => arg.type === 'claim' && arg.confidence > 0.8)
      .sort((a, b) => b.confidence - a.confidence);

    for (const mainClaim of mainClaims) {
      if (processedArguments.has(mainClaim.id)) continue;

      const chain: ArgumentChain = {
        mainClaim,
        supportingReasons: [],
        evidence: [],
        predictions: [],
        counterArguments: []
      };

      // Find supporting arguments
      for (const arg of arguments) {
        if (arg.id === mainClaim.id || processedArguments.has(arg.id)) continue;

        // Check if this argument supports the main claim
        if (this.isSupporting(arg, mainClaim)) {
          switch (arg.type) {
            case 'reasoning':
              chain.supportingReasons.push(arg);
              break;
            case 'evidence':
              chain.evidence.push(arg);
              break;
            case 'prediction':
              chain.predictions.push(arg);
              break;
          }
          processedArguments.add(arg.id);
        }
        // Check if this is a counter-argument
        else if (this.isCounterArgument(arg, mainClaim)) {
          chain.counterArguments.push(arg);
          processedArguments.add(arg.id);
        }
      }

      processedArguments.add(mainClaim.id);
      chains.push(chain);
    }

    return chains;
  }

  /**
   * Enhance arguments with additional metadata and quality scores
   */
  private async enhanceArguments(arguments: ExtractedArgument[], context: ExtractionContext): Promise<ExtractedArgument[]> {
    const enhanced = [];

    for (const argument of arguments) {
      // Calculate similarity to existing arguments for deduplication
      const similarityScore = await this.calculateSimilarityToExisting(argument, context.bill_id);
      
      // Enhance with user context
      const enhancedArgument = {
        ...argument,
        metadata: {
          userContext: context.userContext,
          submissionContext: context.submissionContext,
          similarityScore,
          extractionTimestamp: new Date(),
          qualityScore: this.calculateQualityScore(argument)
        }
      };

      enhanced.push(enhancedArgument);
    }

    return enhanced;
  }

  // Helper methods for argument processing

  private async determinePosition(text: string, bill_id: string): Promise<'support' | 'oppose' | 'neutral' | 'conditional'> {
    // Simple keyword-based position detection (would be enhanced with ML)
    const supportKeywords = ['support', 'agree', 'good', 'beneficial', 'positive', 'approve', 'favor'];
    const opposeKeywords = ['oppose', 'disagree', 'bad', 'harmful', 'negative', 'reject', 'against'];
    const conditionalKeywords = ['if', 'unless', 'provided that', 'on condition', 'depending on'];

    const lowerText = text.toLowerCase();

    if (conditionalKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'conditional';
    }

    const supportCount = supportKeywords.filter(keyword => lowerText.includes(keyword)).length;
    const opposeCount = opposeKeywords.filter(keyword => lowerText.includes(keyword)).length;

    if (supportCount > opposeCount) return 'support';
    if (opposeCount > supportCount) return 'oppose';
    return 'neutral';
  }

  private extractTopicTags(text: string, entities: any): string[] {
    const tags = [];
    
    // Extract from entities
    if (entities.topics) {
      tags.push(...entities.topics);
    }

    // Add keyword-based tags
    const topicKeywords = {
      'healthcare': ['health', 'medical', 'hospital', 'doctor', 'medicine'],
      'education': ['school', 'university', 'student', 'teacher', 'education'],
      'economy': ['economic', 'business', 'trade', 'market', 'financial'],
      'environment': ['environment', 'climate', 'pollution', 'conservation'],
      'agriculture': ['farming', 'crops', 'livestock', 'agricultural'],
      'technology': ['digital', 'internet', 'technology', 'innovation'],
      'governance': ['government', 'administration', 'policy', 'regulation']
    };

    const lowerText = text.toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        tags.push(topic);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private extractAffectedGroups(text: string, entities: any): string[] {
    const groups = [];

    // Extract from entities
    if (entities.groups) {
      groups.push(...entities.groups);
    }

    // Add keyword-based groups
    const groupKeywords = {
      'farmers': ['farmer', 'agricultural', 'rural', 'crops'],
      'students': ['student', 'learner', 'pupil', 'scholar'],
      'workers': ['worker', 'employee', 'labor', 'job'],
      'women': ['women', 'female', 'mother', 'girl'],
      'youth': ['youth', 'young', 'teenager', 'adolescent'],
      'elderly': ['elderly', 'senior', 'old', 'aged'],
      'disabled': ['disabled', 'disability', 'impaired'],
      'urban_residents': ['urban', 'city', 'town', 'metropolitan'],
      'rural_residents': ['rural', 'village', 'countryside', 'remote']
    };

    const lowerText = text.toLowerCase();
    for (const [group, keywords] of Object.entries(groupKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        groups.push(group);
      }
    }

    return [...new Set(groups)];
  }

  private assessEvidenceQuality(text: string, type: string): 'none' | 'weak' | 'moderate' | 'strong' {
    if (type !== 'evidence') return 'none';

    const lowerText = text.toLowerCase();
    
    // Strong evidence indicators
    const strongIndicators = ['research shows', 'study found', 'data indicates', 'statistics show', 'according to'];
    if (strongIndicators.some(indicator => lowerText.includes(indicator))) {
      return 'strong';
    }

    // Moderate evidence indicators
    const moderateIndicators = ['experience shows', 'example', 'case study', 'report'];
    if (moderateIndicators.some(indicator => lowerText.includes(indicator))) {
      return 'moderate';
    }

    // Weak evidence indicators
    const weakIndicators = ['i think', 'i believe', 'seems like', 'probably'];
    if (weakIndicators.some(indicator => lowerText.includes(indicator))) {
      return 'weak';
    }

    return 'moderate'; // Default for evidence type
  }

  private normalizeArgumentText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private generateArgumentId(): string {
    return `arg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isSupporting(argument: ExtractedArgument, mainClaim: ExtractedArgument): boolean {
    // Check if arguments have same position and related topics
    return argument.position === mainClaim.position &&
           argument.topicTags.some(tag => mainClaim.topicTags.includes(tag));
  }

  private isCounterArgument(argument: ExtractedArgument, mainClaim: ExtractedArgument): boolean {
    // Check if arguments have opposite positions but related topics
    const oppositePositions = {
      'support': 'oppose',
      'oppose': 'support',
      'neutral': 'neutral',
      'conditional': 'conditional'
    };

    return argument.position === oppositePositions[mainClaim.position] &&
           argument.topicTags.some(tag => mainClaim.topicTags.includes(tag));
  }

  private async calculateSimilarityToExisting(argument: ExtractedArgument, bill_id: string): Promise<number> {
    // This would use the similarity calculator to compare with existing arguments
    // For now, return a placeholder value
    return 0.5;
  }

  private calculateQualityScore(argument: ExtractedArgument): number {
    let score = 0;

    // Base score from confidence
    score += argument.confidence * 40;

    // Evidence quality bonus
    const evidenceBonus = {
      'strong': 30,
      'moderate': 20,
      'weak': 10,
      'none': 0
    };
    score += evidenceBonus[argument.evidenceQuality];

    // Topic relevance bonus
    score += Math.min(argument.topicTags.length * 5, 20);

    // Affected groups bonus (shows consideration of impact)
    score += Math.min(argument.affectedGroups.length * 3, 10);

    return Math.min(score, 100);
  }

  /**
   * Extract argument chains showing logical flow
   */
  async extractArgumentChains(
    commentText: string,
    context: ExtractionContext
  ): Promise<ArgumentChain[]> {
    const arguments = await this.extractArguments(commentText, context);
    return this.buildArgumentChains(arguments);
  }

  /**
   * Segment text into sentences using multiple heuristics
   */
  private segmentIntoSentences(text: string): string[] {
    // Handle informal text patterns common in citizen comments
    const sentences: string[] = [];
    
    // Split on sentence boundaries but preserve context
    const rawSentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Merge short fragments that are likely continuations
    let currentSentence = '';
    
    for (const sentence of rawSentences) {
      if (sentence.length < 20 && currentSentence.length > 0) {
        // Likely a continuation
        currentSentence += '. ' + sentence;
      } else {
        if (currentSentence.length > 0) {
          sentences.push(currentSentence);
        }
        currentSentence = sentence;
      }
    }
    
    if (currentSentence.length > 0) {
      sentences.push(currentSentence);
    }

    return sentences;
  }

  /**
   * Classify sentences by argumentative function
   */
  private async classifySentences(sentences: string[]): Promise<ClassifiedSentence[]> {
    const classified: ClassifiedSentence[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const classification = await this.sentenceClassifier.classify(sentence);
      
      classified.push({
        text: sentence,
        index: i,
        type: classification.type,
        confidence: classification.confidence,
        position: this.detectPosition(sentence),
        indicators: this.findArgumentativeIndicators(sentence)
      });
    }

    return classified;
  }

  /**
   * Identify discrete arguments from classified sentences
   */
  private async identifyArguments(
    sentences: ClassifiedSentence[],
    entities: ExtractedEntity[],
    context: ExtractionContext
  ): Promise<ExtractedArgument[]> {
    const arguments: ExtractedArgument[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // Skip sentences that don't contain argumentative content
      if (sentence.confidence < 0.5) continue;

      const argument: ExtractedArgument = {
        id: crypto.randomUUID(),
        type: sentence.type,
        position: sentence.position,
        text: sentence.text,
        normalizedText: this.normalizeText(sentence.text),
        confidence: sentence.confidence,
        topicTags: this.extractTopicTags(sentence.text, entities),
        affectedGroups: this.identifyAffectedGroups(sentence.text, entities),
        evidenceQuality: this.assessEvidenceQuality(sentence),
        sentenceSpan: { start: i, end: i }
      };

      // Check if this argument spans multiple sentences
      const extendedSpan = this.findArgumentSpan(sentences, i);
      if (extendedSpan.end > extendedSpan.start) {
        argument.sentenceSpan = extendedSpan;
        argument.text = sentences
          .slice(extendedSpan.start, extendedSpan.end + 1)
          .map(s => s.text)
          .join(' ');
        argument.normalizedText = this.normalizeText(argument.text);
      }

      arguments.push(argument);
    }

    return arguments;
  }

  /**
   * Build logical chains connecting related arguments
   */
  private buildArgumentChains(arguments: ExtractedArgument[]): ArgumentChain[] {
    const chains: ArgumentChain[] = [];
    const usedArguments = new Set<string>();

    // Find main claims first
    const claims = arguments.filter(arg => arg.type === 'claim');

    for (const claim of claims) {
      if (usedArguments.has(claim.id)) continue;

      const chain: ArgumentChain = {
        mainClaim: claim,
        supportingReasons: [],
        evidence: [],
        predictions: [],
        counterArguments: []
      };

      // Find supporting arguments near this claim
      const claimIndex = claim.sentenceSpan.start;
      const nearbyArguments = arguments.filter(arg => 
        !usedArguments.has(arg.id) &&
        Math.abs(arg.sentenceSpan.start - claimIndex) <= 3 &&
        arg.id !== claim.id
      );

      // Categorize nearby arguments
      for (const arg of nearbyArguments) {
        switch (arg.type) {
          case 'reasoning':
            chain.supportingReasons.push(arg);
            break;
          case 'evidence':
            chain.evidence.push(arg);
            break;
          case 'prediction':
            chain.predictions.push(arg);
            break;
          case 'claim':
            if (arg.position !== claim.position) {
              chain.counterArguments.push(arg);
            }
            break;
        }
        usedArguments.add(arg.id);
      }

      usedArguments.add(claim.id);
      chains.push(chain);
    }

    return chains;
  }

  /**
   * Enhance arguments with additional context and normalization
   */
  private async enhanceArguments(
    arguments: ExtractedArgument[],
    context: ExtractionContext
  ): Promise<ExtractedArgument[]> {
    const enhanced: ExtractedArgument[] = [];

    for (const argument of arguments) {
      const enhancedArg = { ...argument };

      // Add context-specific enhancements
      if (context.userContext?.county) {
        enhancedArg.topicTags = this.addGeographicContext(
          enhancedArg.topicTags,
          context.userContext.county
        );
      }

      if (context.userContext?.occupation) {
        enhancedArg.affectedGroups = this.addOccupationalContext(
          enhancedArg.affectedGroups,
          context.userContext.occupation
        );
      }

      // Improve confidence based on context
      enhancedArg.confidence = this.adjustConfidenceWithContext(
        enhancedArg.confidence,
        context
      );

      enhanced.push(enhancedArg);
    }

    return enhanced;
  }

  // Helper methods for text analysis

  private detectPosition(sentence: string): 'support' | 'oppose' | 'neutral' | 'conditional' {
    const lowerText = sentence.toLowerCase();
    
    // Support indicators
    const supportIndicators = [
      'support', 'agree', 'good', 'beneficial', 'necessary', 'important',
      'should pass', 'in favor', 'positive', 'helpful'
    ];
    
    // Opposition indicators
    const opposeIndicators = [
      'oppose', 'against', 'bad', 'harmful', 'unnecessary', 'dangerous',
      'should not', 'reject', 'negative', 'problematic'
    ];
    
    // Conditional indicators
    const conditionalIndicators = [
      'if', 'unless', 'provided that', 'on condition', 'depending on',
      'as long as', 'with amendments'
    ];

    if (conditionalIndicators.some(indicator => lowerText.includes(indicator))) {
      return 'conditional';
    }

    const supportScore = supportIndicators.filter(indicator => 
      lowerText.includes(indicator)
    ).length;
    
    const opposeScore = opposeIndicators.filter(indicator => 
      lowerText.includes(indicator)
    ).length;

    if (supportScore > opposeScore) return 'support';
    if (opposeScore > supportScore) return 'oppose';
    return 'neutral';
  }

  private findArgumentativeIndicators(sentence: string): string[] {
    const indicators: string[] = [];
    const lowerText = sentence.toLowerCase();

    const indicatorPatterns = {
      'causal': ['because', 'since', 'due to', 'as a result', 'therefore'],
      'evidential': ['studies show', 'research indicates', 'data suggests', 'according to'],
      'comparative': ['compared to', 'unlike', 'similar to', 'in contrast'],
      'temporal': ['will lead to', 'in the future', 'eventually', 'over time'],
      'conditional': ['if', 'unless', 'provided that', 'in case']
    };

    for (const [type, patterns] of Object.entries(indicatorPatterns)) {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        indicators.push(type);
      }
    }

    return indicators;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTopicTags(text: string, entities: ExtractedEntity[]): string[] {
    const tags: string[] = [];
    
    // Extract from entities
    entities.forEach(entity => {
      if (entity.type === 'TOPIC' || entity.type === 'POLICY_AREA') {
        tags.push(entity.text.toLowerCase());
      }
    });

    // Add common policy topics
    const policyTopics = [
      'healthcare', 'education', 'taxation', 'environment', 'security',
      'agriculture', 'technology', 'infrastructure', 'employment', 'housing'
    ];

    const lowerText = text.toLowerCase();
    policyTopics.forEach(topic => {
      if (lowerText.includes(topic)) {
        tags.push(topic);
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }

  private identifyAffectedGroups(text: string, entities: ExtractedEntity[]): string[] {
    const groups: string[] = [];
    
    // Extract from entities
    entities.forEach(entity => {
      if (entity.type === 'STAKEHOLDER' || entity.type === 'ORGANIZATION') {
        groups.push(entity.text.toLowerCase());
      }
    });

    // Common stakeholder groups
    const stakeholderGroups = [
      'farmers', 'students', 'teachers', 'workers', 'businesses', 'elderly',
      'youth', 'women', 'disabled', 'rural communities', 'urban residents',
      'small businesses', 'taxpayers', 'consumers', 'patients'
    ];

    const lowerText = text.toLowerCase();
    stakeholderGroups.forEach(group => {
      if (lowerText.includes(group)) {
        groups.push(group);
      }
    });

    return [...new Set(groups)];
  }

  private assessEvidenceQuality(sentence: ClassifiedSentence): 'none' | 'weak' | 'moderate' | 'strong' {
    if (sentence.type !== 'evidence') return 'none';

    const text = sentence.text.toLowerCase();
    
    // Strong evidence indicators
    if (text.includes('study') || text.includes('research') || 
        text.includes('data') || text.includes('statistics')) {
      return 'strong';
    }

    // Moderate evidence indicators
    if (text.includes('example') || text.includes('case') || 
        text.includes('experience') || text.includes('report')) {
      return 'moderate';
    }

    // Weak evidence indicators
    if (text.includes('heard') || text.includes('believe') || 
        text.includes('think') || text.includes('feel')) {
      return 'weak';
    }

    return 'moderate'; // Default for evidence sentences
  }

  private findArgumentSpan(sentences: ClassifiedSentence[], startIndex: number): { start: number; end: number } {
    let end = startIndex;
    
    // Look ahead for continuation indicators
    for (let i = startIndex + 1; i < sentences.length && i < startIndex + 3; i++) {
      const sentence = sentences[i];
      const text = sentence.text.toLowerCase();
      
      // Check for continuation patterns
      if (text.startsWith('this') || text.startsWith('furthermore') || 
          text.startsWith('additionally') || text.startsWith('moreover')) {
        end = i;
      } else {
        break;
      }
    }

    return { start: startIndex, end };
  }

  private addGeographicContext(tags: string[], county: string): string[] {
    const enhanced = [...tags];
    enhanced.push(`county_${county.toLowerCase()}`);
    return enhanced;
  }

  private addOccupationalContext(groups: string[], occupation: string): string[] {
    const enhanced = [...groups];
    enhanced.push(occupation.toLowerCase());
    return enhanced;
  }

  private adjustConfidenceWithContext(confidence: number, context: ExtractionContext): number {
    let adjusted = confidence;

    // Boost confidence for structured submissions
    if (context.submissionContext?.submissionMethod === 'api') {
      adjusted *= 1.1;
    }

    // Boost confidence for users with organizational affiliation
    if (context.userContext?.organizationAffiliation) {
      adjusted *= 1.05;
    }

    return Math.min(1.0, adjusted);
  }
}

interface ClassifiedSentence {
  text: string;
  index: number;
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment';
  confidence: number;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  indicators: string[];
}

interface ExtractedEntity {
  text: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}