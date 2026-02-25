// ============================================================================
// PRECEDENT FINDER - Legal Precedent Discovery
// ============================================================================
// Service that finds relevant legal precedents for constitutional analysis

import { logger } from '@server/infrastructure/observability';
import type { LegalPrecedent } from '@server/infrastructure/schema/index';

export interface PrecedentMatch {
  precedent: LegalPrecedent;
  relevanceScore: number; // 0-100
  matchReasons: string[];
  applicabilityNotes: string;
}

export class PrecedentFinderService {
  constructor() {}

  /**
   * Finds legal precedents relevant to a constitutional provision and bill content
   */
  async findRelevantPrecedents(
    provisionId: string,
    _billContent: string,
    maxResults: number = 5
  ): Promise<LegalPrecedent[]> {
    try {
      logger.info({
        component: 'PrecedentFinder',
        provisionId,
        contentLength: _billContent.length,
        maxResults
      }, '⚖️ Finding relevant legal precedents');

      // Note: Repository integration pending
      // For now, return empty array until repository is available
      const allPrecedents: LegalPrecedent[] = [];
      
      // Analyze relevance to bill content
      const matches: PrecedentMatch[] = [];
      
      for (const precedent of allPrecedents) {
        const match = this.analyzePrecedentRelevance(precedent, _billContent, provisionId);
        if (match.relevanceScore >= 40) { // Threshold for relevance
          matches.push(match);
        }
      }

      // Sort by relevance and court hierarchy
      matches.sort((a, b) => {
        // First sort by court level (Supreme Court > Court of Appeal > High Court)
        const courtWeight = this.getCourtWeight(a.precedent.court_level) - this.getCourtWeight(b.precedent.court_level);
        if (courtWeight !== 0) return courtWeight;
        
        // Then by relevance score
        return b.relevanceScore - a.relevanceScore;
      });

      const topMatches = matches.slice(0, maxResults);
      
      logger.info({
        component: 'PrecedentFinder',
        provisionId,
        totalAnalyzed: allPrecedents.length,
        relevantFound: topMatches.length,
        topCases: topMatches.slice(0, 3).map(m => ({
          case: m.precedent.case_name,
          year: m.precedent.judgment_date ? new Date(m.precedent.judgment_date).getFullYear() : 'unknown',
          court: m.precedent.court_level,
          score: m.relevanceScore
        }))
      }, `📚 Found ${topMatches.length} relevant legal precedents`);

      return topMatches.map(m => m.precedent);

    } catch (error) {
      logger.error({
        component: 'PrecedentFinder',
        provisionId,
        error: error instanceof Error ? error.message : String(error)
      }, '❌ Failed to find relevant legal precedents');
      return [];
    }
  }

  /**
   * Analyzes how relevant a precedent is to the bill content
   */
  private analyzePrecedentRelevance(
    precedent: LegalPrecedent,
    billContent: string,
    provisionId: string
  ): PrecedentMatch {
    const content = billContent.toLowerCase();
    const caseSummary = (precedent.case_summary || '').toLowerCase();
    const legalPrinciple = (precedent.legal_principle || '').toLowerCase();
    
    let relevanceScore = 0;
    const matchReasons: string[] = [];

    // 1. Base score (placeholder since relevance_score_percentage doesn't exist in schema)
    relevanceScore += 30; // Base relevance
    
    // 2. Constitutional provision match (highest weight)
    const constitutionalProvisionsInvolved = precedent.constitutional_provisions_involved || [];
    if (constitutionalProvisionsInvolved.includes(provisionId)) {
      relevanceScore += 25;
      matchReasons.push('Directly interprets the same constitutional provision');
    }

    // 3. Court hierarchy weight
    const courtWeight = this.getCourtWeight(precedent.court_level);
    relevanceScore += courtWeight;
    matchReasons.push(`${this.getCourtDisplayName(precedent.court_level)} decision`);

    // 4. Binding status (using precedent_strength from schema)
    const isBinding = precedent.precedent_strength === 'binding';
    const isOverruled = precedent.overruled_by !== null;
    
    if (isBinding && !isOverruled) {
      relevanceScore += 15;
      matchReasons.push('Binding precedent');
    } else if (isOverruled) {
      relevanceScore -= 10;
      matchReasons.push('Overruled precedent (limited value)');
    }

    // 5. Recency factor (more recent cases may be more relevant)
    if (precedent.judgment_date) {
      const yearsSinceJudgment = new Date().getFullYear() - new Date(precedent.judgment_date).getFullYear();
      if (yearsSinceJudgment <= 5) {
        relevanceScore += 10;
        matchReasons.push('Recent decision');
      } else if (yearsSinceJudgment <= 15) {
        relevanceScore += 5;
        matchReasons.push('Moderately recent decision');
      }
    }

    // 6. Content similarity analysis
    const contentScore = this.analyzeContentSimilarity(content, caseSummary, legalPrinciple);
    relevanceScore += contentScore;
    if (contentScore > 5) {
      matchReasons.push('Similar legal issues identified');
    }

    // 7. Legal outcome analysis
    const outcomeScore = this.analyzeOutcomeRelevance(legalPrinciple, content);
    relevanceScore += outcomeScore;
    if (outcomeScore > 0) {
      matchReasons.push('Relevant legal outcome');
    }

    // 8. Citation frequency (using cited_by_count from schema)
    if (precedent.cited_by_count > 10) {
      relevanceScore += 5;
      matchReasons.push('Frequently cited case');
    }

    const applicabilityNotes = this.generateApplicabilityNotes(precedent, content);

    return {
      precedent,
      relevanceScore: Math.min(relevanceScore, 100), // Cap at 100
      matchReasons,
      applicabilityNotes
    };
  }

  /**
   * Analyzes content similarity between bill and precedent
   */
  private analyzeContentSimilarity(
    billContent: string,
    caseSummary: string,
    holding: string
  ): number {
    let score = 0;

    // Key legal concepts that might indicate similarity
    const legalConcepts = [
      'constitutional', 'unconstitutional', 'rights', 'freedom', 'liberty',
      'due process', 'equal protection', 'fundamental', 'compelling interest',
      'strict scrutiny', 'rational basis', 'intermediate scrutiny',
      'government interest', 'public interest', 'state power', 'federal power'
    ];

    const billWords = new Set(billContent.split(/\s+/).map(w => w.toLowerCase()));
    const caseWords = new Set([...caseSummary.split(/\s+/), ...holding.split(/\s+/)].map(w => w.toLowerCase()));

    // Check for shared legal concepts
    for (const concept of legalConcepts) {
      if (billWords.has(concept) && caseWords.has(concept)) {
        score += 2;
      }
    }

    // Check for shared significant terms (longer than 4 characters)
    const significantBillWords = [...billWords].filter(w => w.length > 4);
    const significantCaseWords = [...caseWords].filter(w => w.length > 4);
    
    const sharedSignificantWords = significantBillWords.filter(w => significantCaseWords.includes(w));
    score += Math.min(sharedSignificantWords.length, 10); // Cap at 10 points

    return Math.min(score, 20); // Cap total content similarity score
  }

  /**
   * Analyzes outcome relevance
   */
  private analyzeOutcomeRelevance(holding: string, billContent: string): number {
    let score = 0;

    // Positive indicators (case supports constitutionality)
    const positiveIndicators = [
      'constitutional', 'valid', 'upheld', 'affirmed', 'legitimate',
      'permissible', 'authorized', 'within power'
    ];

    // Negative indicators (case finds constitutional problems)
    const negativeIndicators = [
      'unconstitutional', 'invalid', 'violated', 'exceeded', 'overturned',
      'impermissible', 'unauthorized', 'beyond power'
    ];

    const hasPositive = positiveIndicators.some(indicator => holding.includes(indicator));
    const hasNegative = negativeIndicators.some(indicator => holding.includes(indicator));

    if (hasPositive || hasNegative) {
      score += 8; // Relevant outcome identified
    }

    // Check if bill content suggests similar legal questions
    const billHasRestrictions = billContent.includes('restrict') || billContent.includes('prohibit') || billContent.includes('limit');
    const caseDealsWithRestrictions = holding.includes('restrict') || holding.includes('prohibit') || holding.includes('limit');

    if (billHasRestrictions && caseDealsWithRestrictions) {
      score += 5;
    }

    return Math.min(score, 15); // Cap outcome relevance score
  }

  /**
   * Generates applicability notes for the precedent
   */
  private generateApplicabilityNotes(precedent: LegalPrecedent, _billContent: string): string {
    const notes: string[] = [];

    // Court level note
    const year = precedent.judgment_date ? new Date(precedent.judgment_date).getFullYear() : 'unknown';
    notes.push(`${this.getCourtDisplayName(precedent.court_level)} decision from ${year}`);

    // Binding status
    const isBinding = precedent.precedent_strength === 'binding';
    const isOverruled = precedent.overruled_by !== null;
    
    if (isBinding && !isOverruled) {
      notes.push('This is binding precedent that must be followed');
    } else if (isOverruled) {
      notes.push('This precedent has been overruled and has limited current value');
    } else {
      notes.push('This is persuasive authority that may influence decisions');
    }

    // Citation frequency
    if (precedent.cited_by_count > 50) {
      notes.push('Frequently cited landmark case');
    } else if (precedent.cited_by_count > 10) {
      notes.push('Well-established precedent');
    }

    return notes.join('. ') + '.';
  }

  /**
   * Gets weight for court hierarchy
   */
  private getCourtWeight(courtLevel: string): number {
    switch (courtLevel) {
      case 'supreme_court': return 20;
      case 'court_of_appeal': return 15;
      case 'high_court': return 10;
      default: return 5;
    }
  }

  /**
   * Gets display name for court
   */
  private getCourtDisplayName(courtLevel: string): string {
    switch (courtLevel) {
      case 'supreme_court': return 'Supreme Court';
      case 'court_of_appeal': return 'Court of Appeal';
      case 'high_court': return 'High Court';
      default: return 'Court';
    }
  }

  /**
   * Searches precedents by case name or citation
   */
  async searchPrecedents(searchTerm: string): Promise<LegalPrecedent[]> {
    try {
      // Note: Repository integration pending
      console.log('Searching precedents:', searchTerm);
      return [];
    } catch (error) {
      logger.error({
        component: 'PrecedentFinder',
        error: error instanceof Error ? error.message : String(error)
      }, `Failed to search precedents: ${searchTerm}`);
      return [];
    }
  }

  /**
   * Finds precedents by court level
   */
  async findPrecedentsByCourtLevel(
    courtLevel: 'supreme_court' | 'court_of_appeal' | 'high_court'
  ): Promise<LegalPrecedent[]> {
    try {
      // Note: Repository integration pending
      console.log('Finding precedents by court level:', courtLevel);
      return [];
    } catch (error) {
      logger.error({
        component: 'PrecedentFinder',
        error: error instanceof Error ? error.message : String(error)
      }, `Failed to find precedents by court level: ${courtLevel}`);
      return [];
    }
  }

  /**
   * Finds binding precedents with high relevance
   */
  async findHighRelevanceBindingPrecedents(minRelevance: number = 70): Promise<LegalPrecedent[]> {
    try {
      // Note: Repository integration pending
      console.log('Finding high relevance binding precedents:', minRelevance);
      return [];
    } catch (error) {
      logger.error({
        component: 'PrecedentFinder',
        minRelevance,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to find high relevance binding precedents');
      return [];
    }
  }
}


