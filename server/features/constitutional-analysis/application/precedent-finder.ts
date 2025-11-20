// ============================================================================
// PRECEDENT FINDER - Legal Precedent Discovery
// ============================================================================
// Service that finds relevant legal precedents for constitutional analysis

import { logger  } from '@shared/core/src/index.js';
import { LegalPrecedent } from '@shared/schema/index.js';
import { LegalPrecedentsRepository } from '../infrastructure/repositories/legal-precedents-repository.js';

export interface PrecedentMatch {
  precedent: LegalPrecedent;
  relevanceScore: number; // 0-100
  matchReasons: string[];
  applicabilityNotes: string;
}

export class PrecedentFinderService {
  constructor(
    private readonly precedentsRepo: LegalPrecedentsRepository
  ) {}

  /**
   * Finds legal precedents relevant to a constitutional provision and bill content
   */
  async findRelevantPrecedents(
    provisionId: string,
    billContent: string,
    maxResults: number = 5
  ): Promise<LegalPrecedent[]> {
    try {
      logger.info('⚖️ Finding relevant legal precedents', {
        component: 'PrecedentFinder',
        provisionId,
        contentLength: billContent.length,
        maxResults
      });

      // Find precedents that reference this constitutional provision
      const provisionPrecedents = await this.precedentsRepo.findByConstitutionalProvisions([provisionId]);
      
      // Find high-relevance binding precedents
      const bindingPrecedents = await this.precedentsRepo.findHighRelevanceBinding(70);
      
      // Combine and deduplicate
      const allPrecedents = this.deduplicatePrecedents([...provisionPrecedents, ...bindingPrecedents]);
      
      // Analyze relevance to bill content
      const matches: PrecedentMatch[] = [];
      
      for (const precedent of allPrecedents) {
        const match = this.analyzePrecedentRelevance(precedent, billContent, provisionId);
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
      
      logger.info(`📚 Found ${topMatches.length} relevant legal precedents`, {
        component: 'PrecedentFinder',
        provisionId,
        totalAnalyzed: allPrecedents.length,
        relevantFound: topMatches.length,
        topCases: topMatches.slice(0, 3).map(m => ({
          case: m.precedent.case_name,
          year: m.precedent.judgment_date.getFullYear(),
          court: m.precedent.court_level,
          score: m.relevanceScore
        }))
      });

      return topMatches.map(m => m.precedent);

    } catch (error) {
      logger.error('❌ Failed to find relevant legal precedents', {
        component: 'PrecedentFinder',
        provisionId,
        error: error instanceof Error ? error.message : String(error)
      });
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
    const caseSummary = precedent.case_summary.toLowerCase();
    const holding = precedent.holding.toLowerCase();
    
    let relevanceScore = 0;
    const matchReasons: string[] = [];

    // 1. Base score from stored relevance
    relevanceScore += precedent.relevance_score_percentage * 0.3; // 30% weight
    
    // 2. Constitutional provision match (highest weight)
    if (precedent.constitutional_provisions.includes(provisionId)) {
      relevanceScore += 25;
      matchReasons.push('Directly interprets the same constitutional provision');
    }

    // 3. Court hierarchy weight
    const courtWeight = this.getCourtWeight(precedent.court_level);
    relevanceScore += courtWeight;
    matchReasons.push(`${this.getCourtDisplayName(precedent.court_level)} decision`);

    // 4. Binding status
    if (precedent.is_binding && !precedent.is_overruled) {
      relevanceScore += 15;
      matchReasons.push('Binding precedent');
    } else if (precedent.is_overruled) {
      relevanceScore -= 10;
      matchReasons.push('Overruled precedent (limited value)');
    }

    // 5. Recency factor (more recent cases may be more relevant)
    const yearsSinceJudgment = new Date().getFullYear() - precedent.judgment_date.getFullYear();
    if (yearsSinceJudgment <= 5) {
      relevanceScore += 10;
      matchReasons.push('Recent decision');
    } else if (yearsSinceJudgment <= 15) {
      relevanceScore += 5;
      matchReasons.push('Moderately recent decision');
    }

    // 6. Content similarity analysis
    const contentScore = this.analyzeContentSimilarity(content, caseSummary, holding);
    relevanceScore += contentScore;
    if (contentScore > 5) {
      matchReasons.push('Similar legal issues identified');
    }

    // 7. Legal outcome analysis
    const outcomeScore = this.analyzeOutcomeRelevance(holding, content);
    relevanceScore += outcomeScore;
    if (outcomeScore > 0) {
      matchReasons.push('Relevant legal outcome');
    }

    // 8. Citation frequency (if available)
    if (precedent.citation_count > 10) {
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
  private generateApplicabilityNotes(precedent: LegalPrecedent, billContent: string): string {
    const notes: string[] = [];

    // Court level note
    notes.push(`${this.getCourtDisplayName(precedent.court_level)} decision from ${precedent.judgment_date.getFullYear()}`);

    // Binding status
    if (precedent.is_binding && !precedent.is_overruled) {
      notes.push('This is binding precedent that must be followed');
    } else if (precedent.is_overruled) {
      notes.push('This precedent has been overruled and has limited current value');
    } else {
      notes.push('This is persuasive authority that may influence decisions');
    }

    // Relevance note
    if (precedent.relevance_score_percentage > 80) {
      notes.push('Highly relevant to constitutional analysis');
    } else if (precedent.relevance_score_percentage > 60) {
      notes.push('Moderately relevant to constitutional analysis');
    } else {
      notes.push('Tangentially relevant to constitutional analysis');
    }

    // Citation frequency
    if (precedent.citation_count > 50) {
      notes.push('Frequently cited landmark case');
    } else if (precedent.citation_count > 10) {
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
   * Removes duplicate precedents
   */
  private deduplicatePrecedents(precedents: LegalPrecedent[]): LegalPrecedent[] {
    const seen = new Set<string>();
    return precedents.filter(precedent => {
      const key = `${precedent.case_citation}-${precedent.judgment_date.getTime()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Searches precedents by case name or citation
   */
  async searchPrecedents(searchTerm: string): Promise<LegalPrecedent[]> {
    try {
      return await this.precedentsRepo.searchByCaseNameOrCitation(searchTerm);
    } catch (error) {
      logger.error(`Failed to search precedents: ${searchTerm}`, {
        component: 'PrecedentFinder',
        error: error instanceof Error ? error.message : String(error)
      });
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
      return await this.precedentsRepo.findByCourtLevel(courtLevel);
    } catch (error) {
      logger.error(`Failed to find precedents by court level: ${courtLevel}`, {
        component: 'PrecedentFinder',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Finds binding precedents with high relevance
   */
  async findHighRelevanceBindingPrecedents(minRelevance: number = 70): Promise<LegalPrecedent[]> {
    try {
      return await this.precedentsRepo.findHighRelevanceBinding(minRelevance);
    } catch (error) {
      logger.error(`Failed to find high relevance binding precedents`, {
        component: 'PrecedentFinder',
        minRelevance,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
}
