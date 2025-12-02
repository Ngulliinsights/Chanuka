import { readDatabase } from '@shared/database';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger  } from '@shared/core';
import { constitutionalAnalysisServiceComplete } from '../../constitutional-analysis/application/constitutional-analysis-service-complete.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ConstitutionalConcern {
  section: string;
  concern: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  article: string;
  explanation: string;
  provisionId?: string; // Link to actual constitutional provision if found
}

export interface LegalPrecedent {
  id?: string; // Database ID if from real precedents
  caseName: string;
  year: number;
  relevance: number; // Score 0-100
  outcome: string;
  applicability: string;
  citation?: string;
}

export interface ConstitutionalAnalysisResult {
  constitutionalityScore: number; // Score 0-100
  concerns: ConstitutionalConcern[];
  precedents: LegalPrecedent[];
  riskAssessment: 'low' | 'medium' | 'high';
  confidenceLevel: number; // How confident we are in this analysis (0-100)
  requiresExpertReview: boolean; // Whether this should be queued for human review
  metadata: {
    analysisTimestamp: Date;
    billContentLength: number;
    patternsMatched: number;
    precedentsFound: number;
  };
}

/**
 * Configuration for constitutional pattern matching.
 * Each pattern represents a potential constitutional concern area.
 */
interface ConstitutionalCheckPattern {
  pattern: RegExp;
  article: string;
  concern: string;
  defaultSeverity: 'minor' | 'moderate' | 'major' | 'critical';
  keywords: string[]; // Keywords to search for related precedents
}

// ============================================================================
// CONSTITUTIONAL ANALYSIS SERVICE
// ============================================================================

/**
 * ConstitutionalAnalysisService - Core analysis logic for constitutional review
 * 
 * This service performs the actual constitutional analysis of bills by:
 * 1. Scanning bill content for constitutional concern patterns
 * 2. Retrieving relevant legal precedents from the database
 * 3. Calculating constitutionality scores and risk assessments
 * 4. Determining if expert human review is needed
 * 
 * It delegates all data access to ConstitutionalAnalysisServiceComplete,
 * maintaining a clean separation between analysis logic and data persistence.
 */
export class ConstitutionalAnalysisService {
  private get db() { 
    return readDatabase; 
  }

  /**
   * Constitutional check patterns used to identify potential concerns.
   * These patterns are based on common constitutional issues that arise in legislation.
   */
  private readonly constitutionalChecks: ConstitutionalCheckPattern[] = [
    { 
      pattern: /\b(?:federal\s+(?:power|authority|jurisdiction)|commerce\s+clause|interstate\s+commerce)\b/gi,
      article: 'Article I, Section 8',
      concern: 'Federal authority and commerce regulation',
      defaultSeverity: 'moderate',
      keywords: ['commerce', 'federal power', 'interstate']
    },
    { 
      pattern: /\b(?:due\s+process|equal\s+protection|fundamental\s+right|strict\s+scrutiny)\b/gi,
      article: 'Amendment XIV',
      concern: 'Due process and equal protection rights',
      defaultSeverity: 'major',
      keywords: ['due process', 'equal protection', 'fourteenth amendment']
    },
    { 
      pattern: /\b(?:freedom\s+of\s+speech|first\s+amendment|free\s+expression|press\s+freedom|religious\s+freedom)\b/gi,
      article: 'Amendment I',
      concern: 'First Amendment protections',
      defaultSeverity: 'major',
      keywords: ['first amendment', 'speech', 'expression', 'religion']
    },
    { 
      pattern: /\b(?:search(?:es)?\s+(?:and|&)\s+seizure|fourth\s+amendment|warrant(?:less)?|probable\s+cause|privacy\s+right)\b/gi,
      article: 'Amendment IV',
      concern: 'Fourth Amendment protections',
      defaultSeverity: 'major',
      keywords: ['fourth amendment', 'search', 'seizure', 'privacy']
    },
    { 
      pattern: /\b(?:state(?:s)?(?:'s)?\s+rights?|tenth\s+amendment|federal\s+overreach|commandeer(?:ing)?)\b/gi,
      article: 'Amendment X',
      concern: 'States rights and federal overreach',
      defaultSeverity: 'moderate',
      keywords: ['tenth amendment', 'states rights', 'federalism']
    },
    { 
      pattern: /\b(?:second\s+amendment|right\s+to\s+bear\s+arms|gun\s+rights?|firearm\s+regulation)\b/gi,
      article: 'Amendment II',
      concern: 'Second Amendment gun rights',
      defaultSeverity: 'major',
      keywords: ['second amendment', 'gun', 'firearm', 'bear arms']
    },
    { 
      pattern: /\b(?:establishment\s+clause|free\s+exercise|separation\s+of\s+church\s+and\s+state|religious\s+liberty)\b/gi,
      article: 'Amendment I',
      concern: 'Religious establishment and free exercise',
      defaultSeverity: 'major',
      keywords: ['establishment clause', 'religion', 'free exercise']
    },
    {
      pattern: /\b(?:cruel\s+(?:and|&)\s+unusual|eighth\s+amendment|capital\s+punishment|excessive\s+(?:fines?|bail))\b/gi,
      article: 'Amendment VIII',
      concern: 'Eighth Amendment protections against cruel punishment',
      defaultSeverity: 'major',
      keywords: ['eighth amendment', 'cruel', 'punishment', 'excessive']
    }
  ];

  /**
   * Performs comprehensive constitutional analysis on a bill.
   * This is the main entry point for constitutional review.
   * 
   * The analysis process:
   * 1. Retrieves bill content from database
   * 2. Scans for constitutional concern patterns
   * 3. Fetches relevant legal precedents
   * 4. Calculates scores and risk levels
   * 5. Determines if expert review is needed
   */
  async analyzeBill(bill_id: string): Promise<ConstitutionalAnalysisResult> {
    const logContext = { 
      component: 'ConstitutionalAnalysisService', 
      operation: 'analyzeBill', 
      bill_id 
    };
    logger.info(`🏛️ Performing constitutional analysis for bill ${bill_id}`, logContext);

    try {
      const bill = await this.getBillContent(bill_id);
      const billText = bill?.full_text ?? '';

      if (!billText.trim()) {
        logger.warn('Bill has no content for constitutional analysis', logContext);
        return this.createEmptyAnalysisResult();
      }

      // Step 1: Identify potential constitutional concerns
      const concerns = await this.identifyConstitutionalConcerns(billText);
      logger.debug(`Identified ${concerns.length} constitutional concerns`, logContext);

      // Step 2: Find relevant legal precedents from database
      const precedents = await this.findRelevantPrecedents(billText, concerns);
      logger.debug(`Found ${precedents.length} relevant precedents`, logContext);

      // Step 3: Calculate scores and risk assessment
      const score = this.calculateConstitutionalityScore(concerns, precedents);
      const risk = this.assessConstitutionalRisk(score, concerns);
      const confidence = this.calculateConfidenceLevel(concerns, precedents);

      // Step 4: Determine if expert review is needed
      const requiresExpertReview = this.shouldQueueForExpertReview(
        score,
        risk,
        confidence,
        concerns
      );

      const result: ConstitutionalAnalysisResult = {
        constitutionalityScore: score,
        concerns,
        precedents,
        riskAssessment: risk,
        confidenceLevel: confidence,
        requiresExpertReview,
        metadata: {
          analysisTimestamp: new Date(),
          billContentLength: billText.length,
          patternsMatched: concerns.length,
          precedentsFound: precedents.length
        }
      };

      logger.info(`✅ Constitutional analysis completed for bill ${bill_id}`, {
        ...logContext,
        score,
        risk,
        confidence,
        requiresExpertReview,
        concernCount: concerns.length
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error during constitutional analysis for bill ${bill_id}`, logContext, error);
      throw new Error(`Constitutional analysis failed for bill ${bill_id}: ${errorMessage}`);
    }
  }

  // ============================================================================
  // PRIVATE ANALYSIS METHODS
  // ============================================================================

  /**
   * Fetches the required bill content from the database.
   */
  private async getBillContent(bill_id: string): Promise<Pick<typeof schema.bills.$inferSelect, 'id' | 'full_text'> | null> {
    const [bill] = await this.db
      .select({ 
        id: schema.bills.id, 
        full_text: schema.bills.full_text 
      })
      .from(schema.bills)
      .where(eq(schema.bills.id, bill_id))
      .limit(1);

    if (!bill) {
      throw new Error(`Bill ${bill_id} not found for constitutional analysis.`);
    }

    return bill;
  }

  /**
   * Identifies potential constitutional concerns by scanning bill content
   * against predefined patterns and linking to actual constitutional provisions.
   */
  private async identifyConstitutionalConcerns(billText: string): Promise<ConstitutionalConcern[]> {
    logger.debug('Identifying constitutional concerns based on content patterns');
    const concerns: ConstitutionalConcern[] = [];

    for (const check of this.constitutionalChecks) {
      const matches = billText.match(check.pattern);
      
      if (matches && matches.length > 0) {
        // Try to find the actual constitutional provision from the database
        const provisions = await constitutionalAnalysisServiceComplete.searchProvisions({
          article: check.article,
          limit: 5
        });

  // Use optional chaining to safely access the first provision's id
  const provisionId = provisions[0]?.id;

        // Calculate severity based on match frequency and context
        const adjustedSeverity = this.adjustSeverityByContext(
          check.defaultSeverity,
          matches.length,
          billText
        );

        concerns.push({
          section: this.findRelevantSection(billText, check.pattern),
          concern: check.concern,
          severity: adjustedSeverity,
          article: check.article,
          explanation: this.generateExplanation(check, matches.length, adjustedSeverity),
          // Only include provisionId property when it is defined to satisfy exactOptionalPropertyTypes
          ...(provisionId ? { provisionId } : {})
        });

        logger.debug(`Matched pattern: ${check.concern}`, {
          article: check.article,
          matchCount: matches.length,
          severity: adjustedSeverity
        });
      }
    }

    return concerns;
  }

  /**
   * Adjusts concern severity based on how frequently the pattern appears
   * and the surrounding context in the bill.
   */
  private adjustSeverityByContext(
    baseSeverity: ConstitutionalConcern['severity'],
    matchCount: number,
    _billText: string
  ): ConstitutionalConcern['severity'] {
    // If the pattern appears many times, it might indicate a more significant concern
    if (matchCount > 5) {
      const severityLevels: ConstitutionalConcern['severity'][] = ['minor', 'moderate', 'major', 'critical'];
      const currentIndex = severityLevels.indexOf(baseSeverity);
      
      // Escalate by one level if possible
      if (currentIndex >= 0 && currentIndex < severityLevels.length - 1) {
        const escalated = severityLevels[currentIndex + 1] ?? baseSeverity;
        return escalated;
      }
    }

    return baseSeverity;
  }

  /**
   * Generates a contextual explanation for a constitutional concern.
   */
  private generateExplanation(
    check: ConstitutionalCheckPattern,
    matchCount: number,
    severity: ConstitutionalConcern['severity']
  ): string {
    const frequency = matchCount > 3 ? 'frequently' : matchCount > 1 ? 'multiple times' : 'once';
    const concern = severity === 'critical' || severity === 'major' 
      ? 'requires careful constitutional review'
      : 'should be reviewed for constitutional implications';

    return `This provision ${frequency} references matters related to ${check.concern} under ${check.article}. This ${concern} to ensure compliance with constitutional requirements and relevant precedent.`;
  }

  /**
   * Extracts a relevant section snippet around a pattern match for context.
   */
  private findRelevantSection(content: string, pattern: RegExp): string {
    const match = content.match(pattern);
    if (!match || match.index === undefined) {
      return 'Section not identified';
    }

    // Extract context around the match (200 chars before and after)
    const contextRadius = 200;
    const start = Math.max(0, match.index - contextRadius);
    const end = Math.min(content.length, match.index + match[0].length + contextRadius);
    
    // Try to break at sentence boundaries for cleaner snippets
    let snippet = content.substring(start, end).trim();
    
    // Clean up partial sentences at the boundaries
    if (start > 0) {
      const firstPeriod = snippet.indexOf('. ');
      if (firstPeriod > 0 && firstPeriod < 50) {
        snippet = snippet.substring(firstPeriod + 2);
      }
    }

    return `...${snippet}...`;
  }

  /**
   * Finds relevant legal precedents from the database based on bill content
   * and identified constitutional concerns.
   * 
   * This replaces the placeholder implementation with real database queries.
   */
  private async findRelevantPrecedents(
    billText: string,
    concerns: ConstitutionalConcern[]
  ): Promise<LegalPrecedent[]> {
    logger.debug('Finding relevant legal precedents from database');

    try {
      // Collect all keywords from matched patterns
      const keywords: string[] = [];
      for (const check of this.constitutionalChecks) {
        if (check.pattern.test(billText)) {
          keywords.push(...check.keywords);
        }
      }

      // Get provision IDs from identified concerns
      const provisionIds = concerns
        .map(c => c.provisionId)
        .filter((id): id is string => id !== undefined);

      // Search for precedents using the complete service
      const dbPrecedents = await constitutionalAnalysisServiceComplete.searchPrecedents({
        // Avoid passing properties with an explicit `undefined` value when exactOptionalPropertyTypes is enabled
        ...(provisionIds.length > 0 ? { provisionIds } : {}),
        minRelevanceScore: 0.6, // 60% relevance threshold
        isBinding: true,
        ...(keywords.length > 0 ? { keywords } : {}),
        limit: 20
      });

      // Transform database precedents to our interface format
      const precedents: LegalPrecedent[] = dbPrecedents.map(p => ({
        id: p.id,
        caseName: p.case_name,
        // Use available judgment_date to infer year; fall back to 0 when missing
        year: p.judgment_date ? new Date(p.judgment_date).getFullYear() : 0,
        // The schema exposes `precedent_strength` rather than a numeric relevance score.
        // Map common strength values to a numeric proxy for relevance.
        relevance: ((): number => {
          const strength = (p as any).precedent_strength as string | undefined;
          if (!strength) return 50;
          if (strength === 'binding') return 90;
          if (strength === 'persuasive') return 65;
          if (strength === 'distinguishable') return 40;
          return 50;
        })(),
        outcome: p.legal_principle || p.case_summary || 'Holding not available',
        applicability: Array.isArray((p as any).constitutional_provisions_involved) && (p as any).constitutional_provisions_involved.length > 0
          ? 'Cites constitutional provisions'
          : 'Summary not available',
        // Only include citation when non-null/defined to satisfy the target type
        ...(p.citation ? { citation: p.citation } : {})
      }));

      logger.debug(`Retrieved ${precedents.length} precedents from database`, {
        provisionCount: provisionIds.length,
        keywordCount: keywords.length
      });

      return precedents;
    } catch (error) {
      logger.error('Failed to retrieve precedents from database', { error });
      
      // Fall back to empty array rather than failing the entire analysis
      return [];
    }
  }

  /**
   * Calculates a constitutionality score based on identified concerns
   * and supporting precedents.
   * 
   * The score ranges from 0-100, where:
   * - 90-100: Very likely constitutional
   * - 70-89: Likely constitutional with minor concerns
   * - 50-69: Uncertain constitutionality, review recommended
   * - 30-49: Likely constitutional issues
   * - 0-29: Serious constitutional problems
   */
  private calculateConstitutionalityScore(
    concerns: ConstitutionalConcern[],
    precedents: LegalPrecedent[]
  ): number {
    logger.debug(`Calculating constitutionality score based on ${concerns.length} concerns and ${precedents.length} precedents`);

    // Start with a baseline score
    let score = 85;

    // Penalize based on concern severity
    const severityWeights = { 
      minor: 3, 
      moderate: 8, 
      major: 18, 
      critical: 35 
    };

    for (const concern of concerns) {
      score -= severityWeights[concern.severity];
    }

    // Adjust based on precedent support
    // High relevance precedents can either increase confidence (if favorable)
    // or decrease it (if they show constitutional problems)
    const highRelevancePrecedents = precedents.filter(p => p.relevance >= 75);
    
    if (highRelevancePrecedents.length > 0) {
      // If we have strong precedents and concerns, it's more uncertain
      if (concerns.length > 0) {
        score -= 5; // Precedents exist but concerns remain
      } else {
        score += 5; // Precedents exist and no concerns found
      }
    }

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculates confidence level in the analysis based on the quality
   * and quantity of available information.
   */
  private calculateConfidenceLevel(
    concerns: ConstitutionalConcern[],
    precedents: LegalPrecedent[]
  ): number {
    let confidence = 70; // Start with moderate confidence

    // Decrease confidence if we have concerns but no precedents
    if (concerns.length > 0 && precedents.length === 0) {
      confidence -= 20;
    }

    // Increase confidence with high-relevance precedents
    const highRelevancePrecedents = precedents.filter(p => p.relevance >= 80);
    confidence += Math.min(20, highRelevancePrecedents.length * 5);

    // Decrease confidence if multiple critical concerns
    const criticalConcerns = concerns.filter(c => c.severity === 'critical');
    confidence -= criticalConcerns.length * 10;

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Assesses overall constitutional risk based on score and concern severity.
   */
  private assessConstitutionalRisk(
    score: number,
    concerns: ConstitutionalConcern[]
  ): 'low' | 'medium' | 'high' {
    logger.debug(`Assessing constitutional risk based on score ${score} and ${concerns.length} concerns`);

    const hasCritical = concerns.some(c => c.severity === 'critical');
    const hasMajor = concerns.some(c => c.severity === 'major');
    const majorCount = concerns.filter(c => c.severity === 'major').length;

    // Critical concerns or very low score always means high risk
    if (hasCritical || score < 40) {
      return 'high';
    }

    // Multiple major concerns or moderate score means medium risk
    if (majorCount >= 2 || hasMajor || score < 70) {
      return 'medium';
    }

    // Otherwise, risk is low
    return 'low';
  }

  /**
   * Determines whether this analysis should be queued for expert human review.
   * 
   * Review is recommended when:
   * - Risk is high or confidence is low
   * - Multiple major or critical concerns exist
   * - Conflicting precedents are found
   * - The constitutionality score is in an uncertain range
   */
  private shouldQueueForExpertReview(
    score: number,
    risk: 'low' | 'medium' | 'high',
    confidence: number,
    concerns: ConstitutionalConcern[]
  ): boolean {
    // Always review high risk cases
    if (risk === 'high') {
      return true;
    }

    // Review if confidence is low (below 60%)
    if (confidence < 60) {
      return true;
    }

    // Review if score is in the uncertain range (40-70)
    if (score >= 40 && score <= 70) {
      return true;
    }

    // Review if there are multiple major concerns
    const majorOrCritical = concerns.filter(
      c => c.severity === 'major' || c.severity === 'critical'
    );
    if (majorOrCritical.length >= 2) {
      return true;
    }

    // Otherwise, automated analysis is sufficient
    return false;
  }

  /**
   * Creates an empty analysis result for bills with no content.
   */
  private createEmptyAnalysisResult(): ConstitutionalAnalysisResult {
    return {
      constitutionalityScore: 95, // No content means no concerns
      concerns: [],
      precedents: [],
      riskAssessment: 'low',
      confidenceLevel: 100,
      requiresExpertReview: false,
      metadata: {
        analysisTimestamp: new Date(),
        billContentLength: 0,
        patternsMatched: 0,
        precedentsFound: 0
      }
    };
  }
}

// Export singleton instance for use throughout the application
export const constitutionalAnalysisService = new ConstitutionalAnalysisService();
