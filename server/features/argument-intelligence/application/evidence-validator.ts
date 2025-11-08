// ============================================================================
// ARGUMENT INTELLIGENCE - Evidence Validator
// ============================================================================
// Validates evidence claims and assesses their credibility

import { logger  } from '../../../../shared/core/src/index.js';

export interface EvidenceValidationResult {
  evidenceId: string;
  originalClaim: string;
  validationStatus: 'verified' | 'unverified' | 'disputed' | 'false' | 'pending';
  credibilityScore: number; // 0-100
  sources: ValidatedSource[];
  factCheckResults: FactCheckResult[];
  validationMethod: 'automated' | 'expert_review' | 'crowd_sourced' | 'external_api';
  validatedAt: Date;
  validationNotes?: string;
  flaggedConcerns: string[];
}

export interface ValidatedSource {
  url?: string;
  title?: string;
  author?: string;
  publicationDate?: Date;
  sourceType: 'academic' | 'government' | 'news' | 'ngo' | 'corporate' | 'personal' | 'unknown';
  credibilityRating: number; // 0-100
  accessibilityStatus: 'accessible' | 'paywall' | 'broken' | 'restricted';
  relevanceScore: number; // 0-100
}

export interface FactCheckResult {
  claim: string;
  verdict: 'true' | 'mostly_true' | 'mixed' | 'mostly_false' | 'false' | 'unverifiable';
  confidence: number; // 0-100
  explanation: string;
  sources: string[];
  factChecker: string;
  checkedAt: Date;
}

export interface EvidenceAssessment {
  bill_id: string;
  evidenceBase: EvidenceValidationResult[];
  overallCredibility: number;
  verifiedClaimsCount: number;
  disputedClaimsCount: number;
  unverifiedClaimsCount: number;
  sourceQualityDistribution: {
    academic: number;
    government: number;
    news: number;
    ngo: number;
    other: number;
  };
  commonConcerns: string[];
  recommendedActions: string[];
}

export interface EvidenceClaim {
  id: string;
  text: string;
  claimType: 'statistical' | 'anecdotal' | 'expert_opinion' | 'legal_precedent' | 'comparative' | 'predictive';
  citedSources: string[];
  extractedFrom: string; // Original argument text
  confidence: number;
  user_id: string;
  submittedAt: Date;
}

export class EvidenceValidatorService {
  private readonly sourceCredibilityCache = new Map<string, number>();
  private readonly factCheckCache = new Map<string, FactCheckResult>();

  constructor() {}

  /**
   * Validate a single evidence claim
   */
  async validateEvidenceClaim(claim: EvidenceClaim): Promise<EvidenceValidationResult> {
    try {
      logger.info(`🔍 Validating evidence claim`, {
        component: 'EvidenceValidator',
        claimId: claim.id,
        claimType: claim.claimType
      });

      // Step 1: Extract and validate sources
      const sources = await this.validateSources(claim.citedSources);

      // Step 2: Perform fact-checking
      const factCheckResults = await this.performFactCheck(claim);

      // Step 3: Calculate credibility score
      const credibilityScore = this.calculateCredibilityScore(sources, factCheckResults, claim);

      // Step 4: Determine validation status
      const validationStatus = this.determineValidationStatus(factCheckResults, sources);

      // Step 5: Identify concerns
      const flaggedConcerns = this.identifyValidationConcerns(sources, factCheckResults, claim);

      const result: EvidenceValidationResult = {
        evidenceId: claim.id,
        originalClaim: claim.text,
        validationStatus,
        credibilityScore,
        sources,
        factCheckResults,
        validationMethod: 'automated',
        validatedAt: new Date(),
        flaggedConcerns
      };

      logger.info(`✅ Evidence validation completed`, {
        component: 'EvidenceValidator',
        claimId: claim.id,
        validationStatus,
        credibilityScore
      });

      return result;

    } catch (error) {
      logger.error(`❌ Evidence validation failed`, {
        component: 'EvidenceValidator',
        claimId: claim.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return failed validation result
      return {
        evidenceId: claim.id,
        originalClaim: claim.text,
        validationStatus: 'pending',
        credibilityScore: 0,
        sources: [],
        factCheckResults: [],
        validationMethod: 'automated',
        validatedAt: new Date(),
        flaggedConcerns: ['Validation process failed']
      };
    }
  }

  /**
   * Assess evidence base for an entire bill
   */
  async assessEvidenceBase(arguments: any[]): Promise<EvidenceAssessment> {
    try {
      logger.info(`📊 Assessing evidence base`, {
        component: 'EvidenceValidator',
        argumentCount: arguments.length
      });

      // Extract evidence claims from arguments
      const evidenceClaims = this.extractEvidenceClaims(arguments);

      // Validate all evidence claims
      const validationResults: EvidenceValidationResult[] = [];
      for (const claim of evidenceClaims) {
        const result = await this.validateEvidenceClaim(claim);
        validationResults.push(result);
      }

      // Calculate overall assessment
      const assessment = this.calculateEvidenceAssessment(validationResults);

      logger.info(`✅ Evidence base assessment completed`, {
        component: 'EvidenceValidator',
        overallCredibility: assessment.overallCredibility,
        verifiedClaims: assessment.verifiedClaimsCount
      });

      return assessment;

    } catch (error) {
      logger.error(`❌ Evidence base assessment failed`, {
        component: 'EvidenceValidator',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Batch validate multiple evidence claims
   */
  async batchValidateEvidence(claims: EvidenceClaim[]): Promise<EvidenceValidationResult[]> {
    const results: EvidenceValidationResult[] = [];
    
    // Process in batches to avoid overwhelming external services
    const batchSize = 5;
    for (let i = 0; i < claims.length; i += batchSize) {
      const batch = claims.slice(i, i + batchSize);
      const batchPromises = batch.map(claim => this.validateEvidenceClaim(claim));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < claims.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get credibility rating for a source
   */
  async getSourceCredibility(sourceUrl: string): Promise<number> {
    if (this.sourceCredibilityCache.has(sourceUrl)) {
      return this.sourceCredibilityCache.get(sourceUrl)!;
    }

    const credibility = await this.assessSourceCredibility(sourceUrl);
    this.sourceCredibilityCache.set(sourceUrl, credibility);
    return credibility;
  }

  // Private helper methods

  private async validateSources(citedSources: string[]): Promise<ValidatedSource[]> {
    const validatedSources: ValidatedSource[] = [];

    for (const source of citedSources) {
      try {
        const validatedSource = await this.validateSingleSource(source);
        validatedSources.push(validatedSource);
      } catch (error) {
        // Add failed source with low credibility
        validatedSources.push({
          url: source,
          sourceType: 'unknown',
          credibilityRating: 0,
          accessibilityStatus: 'broken',
          relevanceScore: 0
        });
      }
    }

    return validatedSources;
  }

  private async validateSingleSource(source: string): Promise<ValidatedSource> {
    // Check if it's a URL
    if (this.isValidUrl(source)) {
      return await this.validateUrlSource(source);
    } else {
      // Handle non-URL citations (books, reports, etc.)
      return await this.validateTextualSource(source);
    }
  }

  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  private async validateUrlSource(url: string): Promise<ValidatedSource> {
    try {
      // In a real implementation, this would fetch the URL and analyze it
      const domain = new URL(url).hostname;
      const sourceType = this.categorizeSourceByDomain(domain);
      const credibilityRating = await this.getSourceCredibility(url);
      
      return {
        url,
        sourceType,
        credibilityRating,
        accessibilityStatus: 'accessible', // Would check actual accessibility
        relevanceScore: 70, // Would calculate based on content analysis
        title: `Source from ${domain}`, // Would extract actual title
        publicationDate: new Date() // Would extract actual date
      };
    } catch (error) {
      return {
        url,
        sourceType: 'unknown',
        credibilityRating: 0,
        accessibilityStatus: 'broken',
        relevanceScore: 0
      };
    }
  }

  private async validateTextualSource(citation: string): Promise<ValidatedSource> {
    // Analyze textual citation for credibility indicators
    const sourceType = this.categorizeTextualSource(citation);
    const credibilityRating = this.assessTextualSourceCredibility(citation, sourceType);

    return {
      title: citation,
      sourceType,
      credibilityRating,
      accessibilityStatus: 'unknown',
      relevanceScore: 60 // Default relevance for textual sources
    };
  }

  private categorizeSourceByDomain(domain: string): ValidatedSource['sourceType'] {
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('gov.') || domainLower.includes('.gov')) {
      return 'government';
    }
    if (domainLower.includes('edu') || domainLower.includes('ac.')) {
      return 'academic';
    }
    if (domainLower.includes('news') || domainLower.includes('times') || 
        domainLower.includes('post') || domainLower.includes('guardian')) {
      return 'news';
    }
    if (domainLower.includes('org')) {
      return 'ngo';
    }
    if (domainLower.includes('com') || domainLower.includes('co.')) {
      return 'corporate';
    }
    
    return 'unknown';
  }

  private categorizeTextualSource(citation: string): ValidatedSource['sourceType'] {
    const citationLower = citation.toLowerCase();
    
    if (citationLower.includes('journal') || citationLower.includes('study') || 
        citationLower.includes('research') || citationLower.includes('university')) {
      return 'academic';
    }
    if (citationLower.includes('government') || citationLower.includes('ministry') || 
        citationLower.includes('department') || citationLower.includes('bureau')) {
      return 'government';
    }
    if (citationLower.includes('report') || citationLower.includes('survey')) {
      return 'ngo';
    }
    
    return 'unknown';
  }

  private async assessSourceCredibility(url: string): Promise<number> {
    // Simplified credibility assessment
    const domain = new URL(url).hostname.toLowerCase();
    
    // High credibility domains
    const highCredibilityDomains = [
      'who.int', 'worldbank.org', 'un.org', 'oecd.org',
      'gov.ke', 'treasury.go.ke', 'knbs.or.ke'
    ];
    
    // Medium credibility domains
    const mediumCredibilityDomains = [
      'reuters.com', 'bbc.com', 'standardmedia.co.ke',
      'nation.co.ke', 'thestar.co.ke'
    ];
    
    if (highCredibilityDomains.some(d => domain.includes(d))) {
      return 90;
    }
    if (mediumCredibilityDomains.some(d => domain.includes(d))) {
      return 70;
    }
    if (domain.includes('.edu') || domain.includes('.ac.')) {
      return 85;
    }
    if (domain.includes('.gov')) {
      return 80;
    }
    if (domain.includes('.org')) {
      return 60;
    }
    
    return 40; // Default for unknown sources
  }

  private assessTextualSourceCredibility(citation: string, sourceType: ValidatedSource['sourceType']): number {
    let baseScore = 40;
    
    switch (sourceType) {
      case 'academic':
        baseScore = 85;
        break;
      case 'government':
        baseScore = 80;
        break;
      case 'ngo':
        baseScore = 65;
        break;
      case 'news':
        baseScore = 60;
        break;
      default:
        baseScore = 40;
    }

    // Adjust based on citation quality indicators
    const citationLower = citation.toLowerCase();
    
    if (citationLower.includes('peer-reviewed') || citationLower.includes('peer reviewed')) {
      baseScore += 10;
    }
    if (citationLower.includes('official') || citationLower.includes('published')) {
      baseScore += 5;
    }
    if (citationLower.match(/\d{4}/)) { // Contains year
      baseScore += 5;
    }

    return Math.min(100, baseScore);
  }

  private async performFactCheck(claim: EvidenceClaim): Promise<FactCheckResult[]> {
    // In a real implementation, this would integrate with fact-checking APIs
    // For now, return a simplified fact-check result
    
    const cacheKey = this.generateFactCheckCacheKey(claim.text);
    if (this.factCheckCache.has(cacheKey)) {
      return [this.factCheckCache.get(cacheKey)!];
    }

    const result: FactCheckResult = {
      claim: claim.text,
      verdict: this.assessClaimVerdict(claim),
      confidence: this.assessFactCheckConfidence(claim),
      explanation: this.generateFactCheckExplanation(claim),
      sources: claim.citedSources,
      factChecker: 'automated_system',
      checkedAt: new Date()
    };

    this.factCheckCache.set(cacheKey, result);
    return [result];
  }

  private generateFactCheckCacheKey(claimText: string): string {
    // Simple hash of claim text for caching
    return claimText.toLowerCase().replace(/[^\w]/g, '').substring(0, 50);
  }

  private assessClaimVerdict(claim: EvidenceClaim): FactCheckResult['verdict'] {
    // Simplified verdict assessment based on claim characteristics
    const text = claim.text.toLowerCase();
    
    if (claim.claimType === 'statistical' && claim.citedSources.length > 0) {
      return 'mostly_true';
    }
    if (claim.claimType === 'anecdotal') {
      return 'unverifiable';
    }
    if (claim.claimType === 'predictive') {
      return 'unverifiable';
    }
    if (text.includes('always') || text.includes('never') || text.includes('all')) {
      return 'mostly_false'; // Absolute claims are often problematic
    }
    
    return 'mixed'; // Default for uncertain cases
  }

  private assessFactCheckConfidence(claim: EvidenceClaim): number {
    let confidence = 50; // Base confidence
    
    // Adjust based on claim type
    switch (claim.claimType) {
      case 'statistical':
        confidence += 20;
        break;
      case 'legal_precedent':
        confidence += 15;
        break;
      case 'expert_opinion':
        confidence += 10;
        break;
      case 'anecdotal':
        confidence -= 10;
        break;
      case 'predictive':
        confidence -= 20;
        break;
    }

    // Adjust based on sources
    confidence += Math.min(20, claim.citedSources.length * 5);

    // Adjust based on claim confidence
    confidence += (claim.confidence - 0.5) * 20;

    return Math.max(0, Math.min(100, confidence));
  }

  private generateFactCheckExplanation(claim: EvidenceClaim): string {
    const verdict = this.assessClaimVerdict(claim);
    
    switch (verdict) {
      case 'mostly_true':
        return `This ${claim.claimType} claim appears to be supported by the provided sources, though some details may require verification.`;
      case 'mixed':
        return `This claim contains elements that may be accurate, but requires additional verification and context.`;
      case 'mostly_false':
        return `This claim contains problematic absolute statements that are difficult to verify and may be misleading.`;
      case 'unverifiable':
        return `This ${claim.claimType} claim cannot be independently verified with available information.`;
      default:
        return `This claim requires further investigation to determine its accuracy.`;
    }
  }

  private calculateCredibilityScore(
    sources: ValidatedSource[],
    factCheckResults: FactCheckResult[],
    claim: EvidenceClaim
  ): number {
    let score = 0;
    let factors = 0;

    // Source credibility (40% weight)
    if (sources.length > 0) {
      const avgSourceCredibility = sources.reduce((sum, s) => sum + s.credibilityRating, 0) / sources.length;
      score += avgSourceCredibility * 0.4;
      factors += 0.4;
    }

    // Fact-check results (35% weight)
    if (factCheckResults.length > 0) {
      const factCheckScore = this.convertVerdictToScore(factCheckResults[0].verdict);
      score += factCheckScore * 0.35;
      factors += 0.35;
    }

    // Claim characteristics (25% weight)
    const claimScore = this.assessClaimCharacteristics(claim);
    score += claimScore * 0.25;
    factors += 0.25;

    return factors > 0 ? score / factors : 0;
  }

  private convertVerdictToScore(verdict: FactCheckResult['verdict']): number {
    switch (verdict) {
      case 'true': return 100;
      case 'mostly_true': return 80;
      case 'mixed': return 50;
      case 'mostly_false': return 20;
      case 'false': return 0;
      case 'unverifiable': return 40;
      default: return 30;
    }
  }

  private assessClaimCharacteristics(claim: EvidenceClaim): number {
    let score = 50; // Base score

    // Claim type scoring
    switch (claim.claimType) {
      case 'statistical':
        score += 20;
        break;
      case 'legal_precedent':
        score += 15;
        break;
      case 'expert_opinion':
        score += 10;
        break;
      case 'comparative':
        score += 5;
        break;
      case 'anecdotal':
        score -= 10;
        break;
      case 'predictive':
        score -= 15;
        break;
    }

    // Source count bonus
    score += Math.min(15, claim.citedSources.length * 3);

    // Confidence bonus
    score += (claim.confidence - 0.5) * 20;

    return Math.max(0, Math.min(100, score));
  }

  private determineValidationStatus(
    factCheckResults: FactCheckResult[],
    sources: ValidatedSource[]
  ): EvidenceValidationResult['validationStatus'] {
    if (factCheckResults.length === 0 && sources.length === 0) {
      return 'unverified';
    }

    if (factCheckResults.length > 0) {
      const verdict = factCheckResults[0].verdict;
      switch (verdict) {
        case 'true':
        case 'mostly_true':
          return 'verified';
        case 'false':
        case 'mostly_false':
          return 'false';
        case 'mixed':
          return 'disputed';
        default:
          return 'unverified';
      }
    }

    // Base on source quality if no fact-check results
    const avgSourceCredibility = sources.reduce((sum, s) => sum + s.credibilityRating, 0) / sources.length;
    if (avgSourceCredibility > 80) return 'verified';
    if (avgSourceCredibility > 60) return 'unverified';
    return 'disputed';
  }

  private identifyValidationConcerns(
    sources: ValidatedSource[],
    factCheckResults: FactCheckResult[],
    claim: EvidenceClaim
  ): string[] {
    const concerns: string[] = [];

    // Source-related concerns
    const brokenSources = sources.filter(s => s.accessibilityStatus === 'broken');
    if (brokenSources.length > 0) {
      concerns.push(`${brokenSources.length} source(s) are inaccessible`);
    }

    const lowCredibilitySources = sources.filter(s => s.credibilityRating < 40);
    if (lowCredibilitySources.length > 0) {
      concerns.push(`${lowCredibilitySources.length} source(s) have low credibility ratings`);
    }

    // Fact-check concerns
    if (factCheckResults.some(r => r.verdict === 'false' || r.verdict === 'mostly_false')) {
      concerns.push('Claim contradicts established facts');
    }

    // Claim-specific concerns
    if (claim.claimType === 'predictive') {
      concerns.push('Predictive claims cannot be verified');
    }

    if (claim.citedSources.length === 0) {
      concerns.push('No sources provided for verification');
    }

    return concerns;
  }

  private extractEvidenceClaims(arguments: any[]): EvidenceClaim[] {
    const claims: EvidenceClaim[] = [];

    arguments.forEach(arg => {
      if (arg.type === 'evidence' || arg.evidenceQuality !== 'none') {
        claims.push({
          id: crypto.randomUUID(),
          text: arg.text,
          claimType: this.inferClaimType(arg.text),
          citedSources: this.extractCitedSources(arg.text),
          extractedFrom: arg.text,
          confidence: arg.confidence || 0.5,
          user_id: arg.user_id,
          submittedAt: new Date()
        });
      }
    });

    return claims;
  }

  private inferClaimType(text: string): EvidenceClaim['claimType'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('study') || lowerText.includes('research') || 
        lowerText.includes('data') || lowerText.includes('%')) {
      return 'statistical';
    }
    if (lowerText.includes('expert') || lowerText.includes('professor') || 
        lowerText.includes('specialist')) {
      return 'expert_opinion';
    }
    if (lowerText.includes('case') || lowerText.includes('court') || 
        lowerText.includes('ruling')) {
      return 'legal_precedent';
    }
    if (lowerText.includes('compared to') || lowerText.includes('unlike') || 
        lowerText.includes('similar to')) {
      return 'comparative';
    }
    if (lowerText.includes('will') || lowerText.includes('predict') || 
        lowerText.includes('future')) {
      return 'predictive';
    }
    
    return 'anecdotal';
  }

  private extractCitedSources(text: string): string[] {
    const sources: string[] = [];
    
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex);
    if (urls) {
      sources.push(...urls);
    }

    // Extract citation patterns (simplified)
    const citationRegex = /\([^)]*\d{4}[^)]*\)/g;
    const citations = text.match(citationRegex);
    if (citations) {
      sources.push(...citations);
    }

    return sources;
  }

  private calculateEvidenceAssessment(validationResults: EvidenceValidationResult[]): EvidenceAssessment {
    const verifiedCount = validationResults.filter(r => r.validationStatus === 'verified').length;
    const disputedCount = validationResults.filter(r => r.validationStatus === 'disputed').length;
    const unverifiedCount = validationResults.filter(r => r.validationStatus === 'unverified').length;

    const overallCredibility = validationResults.length === 0 ? 0 :
      validationResults.reduce((sum, r) => sum + r.credibilityScore, 0) / validationResults.length;

    // Calculate source quality distribution
    const allSources = validationResults.flatMap(r => r.sources);
    const sourceQualityDistribution = {
      academic: allSources.filter(s => s.sourceType === 'academic').length,
      government: allSources.filter(s => s.sourceType === 'government').length,
      news: allSources.filter(s => s.sourceType === 'news').length,
      ngo: allSources.filter(s => s.sourceType === 'ngo').length,
      other: allSources.filter(s => !['academic', 'government', 'news', 'ngo'].includes(s.sourceType)).length
    };

    // Identify common concerns
    const allConcerns = validationResults.flatMap(r => r.flaggedConcerns);
    const concernCounts = new Map<string, number>();
    allConcerns.forEach(concern => {
      concernCounts.set(concern, (concernCounts.get(concern) || 0) + 1);
    });
    const commonConcerns = Array.from(concernCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([concern]) => concern);

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(validationResults, overallCredibility);

    return {
      bill_id: '', // Would be set by caller
      evidenceBase: validationResults,
      overallCredibility,
      verifiedClaimsCount: verifiedCount,
      disputedClaimsCount: disputedCount,
      unverifiedClaimsCount: unverifiedCount,
      sourceQualityDistribution,
      commonConcerns,
      recommendedActions
    };
  }

  private generateRecommendations(
    validationResults: EvidenceValidationResult[],
    overallCredibility: number
  ): string[] {
    const recommendations: string[] = [];

    if (overallCredibility < 50) {
      recommendations.push('Seek additional high-quality sources to support claims');
    }

    const brokenSourceCount = validationResults.reduce((count, r) => 
      count + r.sources.filter(s => s.accessibilityStatus === 'broken').length, 0);
    if (brokenSourceCount > 0) {
      recommendations.push('Update or replace inaccessible source links');
    }

    const unverifiedCount = validationResults.filter(r => r.validationStatus === 'unverified').length;
    if (unverifiedCount > validationResults.length * 0.5) {
      recommendations.push('Consider expert review for unverified claims');
    }

    const disputedCount = validationResults.filter(r => r.validationStatus === 'disputed').length;
    if (disputedCount > 0) {
      recommendations.push('Address disputed claims with additional evidence or clarification');
    }

    return recommendations;
  }
}