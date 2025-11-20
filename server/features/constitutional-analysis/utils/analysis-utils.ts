// ============================================================================
// CONSTITUTIONAL ANALYSIS - Utility Functions
// ============================================================================
// Common utility functions for constitutional analysis

import { ConstitutionalAnalysis, LegalPrecedent } from '@shared/schema/index.js';

/**
 * Text processing utilities
 */
export class TextAnalysisUtils {
  /**
   * Extract keywords from text using simple NLP techniques
   */
  static extractKeywords(text: string, minLength: number = 3): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length >= minLength && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .sort();
  }

  /**
   * Calculate text similarity using Jaccard similarity
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const keywords1 = new Set(this.extractKeywords(text1));
    const keywords2 = new Set(this.extractKeywords(text2));

    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Find text snippets containing specific keywords
   */
  static findContextSnippets(text: string, keywords: string[], contextLength: number = 100): string[] {
    const snippets: string[] = [];
    const lowerText = text.toLowerCase();

    keywords.forEach(keyword => {
      const index = lowerText.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + keyword.length + contextLength);
        const snippet = text.substring(start, end).trim();
        
        if (snippet && !snippets.includes(snippet)) {
          snippets.push(snippet);
        }
      }
    });

    return snippets;
  }

  /**
   * Identify legal concepts in text
   */
  static identifyLegalConcepts(text: string): string[] {
    const legalTerms = [
      'constitutional', 'unconstitutional', 'fundamental rights', 'bill of rights',
      'due process', 'equal protection', 'freedom of expression', 'freedom of religion',
      'privacy rights', 'property rights', 'procedural fairness', 'natural justice',
      'separation of powers', 'checks and balances', 'judicial review',
      'legislative authority', 'executive power', 'devolution', 'public participation'
    ];

    const lowerText = text.toLowerCase();
    return legalTerms.filter(term => lowerText.includes(term.toLowerCase()));
  }
}

/**
 * Risk assessment utilities
 */
export class RiskAssessmentUtils {
  /**
   * Calculate composite risk score from multiple factors
   */
  static calculateCompositeRisk(factors: {
    rightsImpact: number;
    precedentConflict: number;
    confidenceLevel: number;
    complexityScore: number;
  }): number {
    const weights = {
      rightsImpact: 0.35,
      precedentConflict: 0.25,
      confidenceLevel: -0.25, // Negative because higher confidence = lower risk
      complexityScore: 0.15
    };

    return Math.max(0, Math.min(100,
      factors.rightsImpact * weights.rightsImpact +
      factors.precedentConflict * weights.precedentConflict +
      factors.confidenceLevel * weights.confidenceLevel +
      factors.complexityScore * weights.complexityScore
    ));
  }

  /**
   * Categorize risk level based on numeric score
   */
  static categorizeRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Identify risk factors from analysis
   */
  static identifyRiskFactors(analysis: ConstitutionalAnalysis): string[] {
    const factors: string[] = [];

    if (analysis.confidence_percentage < 70) {
      factors.push('Low confidence analysis');
    }

    if (analysis.constitutional_risk === 'critical' || analysis.constitutional_risk === 'high') {
      factors.push('High constitutional risk identified');
    }

    if (analysis.impact_severity_percentage > 80) {
      factors.push('High impact severity');
    }

    if (analysis.analysis_type === 'potential_conflict') {
      factors.push('Potential constitutional conflict');
    }

    return factors;
  }
}

/**
 * Precedent analysis utilities
 */
export class PrecedentAnalysisUtils {
  /**
   * Weight precedents by court hierarchy
   */
  static weightByCourtHierarchy(precedents: LegalPrecedent[]): LegalPrecedent[] {
    const hierarchyWeights = {
      'supreme_court': 1.0,
      'court_of_appeal': 0.8,
      'high_court': 0.6,
      'subordinate_court': 0.4
    };

    return precedents.map(precedent => ({
      ...precedent,
      relevance_score_percentage: Math.min(100,
        precedent.relevance_score_percentage * 
        (hierarchyWeights[precedent.court_level as keyof typeof hierarchyWeights] || 0.5)
      )
    })).sort((a, b) => b.relevance_score_percentage - a.relevance_score_percentage);
  }

  /**
   * Identify conflicting precedents
   */
  static identifyConflicts(precedents: LegalPrecedent[]): {
    conflicting: LegalPrecedent[];
    supporting: LegalPrecedent[];
  } {
    const conflicting: LegalPrecedent[] = [];
    const supporting: LegalPrecedent[] = [];

    precedents.forEach(precedent => {
      const holding = precedent.holding.toLowerCase();
      if (holding.includes('unconstitutional') || 
          holding.includes('violation') || 
          holding.includes('invalid')) {
        conflicting.push(precedent);
      } else {
        supporting.push(precedent);
      }
    });

    return { conflicting, supporting };
  }

  /**
   * Calculate precedent authority score
   */
  static calculateAuthorityScore(precedent: LegalPrecedent): number {
    let score = 50; // Base score

    // Court hierarchy bonus
    const courtBonuses = {
      'supreme_court': 30,
      'court_of_appeal': 20,
      'high_court': 10,
      'subordinate_court': 0
    };
    score += courtBonuses[precedent.court_level as keyof typeof courtBonuses] || 0;

    // Recency bonus (cases from last 10 years get bonus)
    const yearsOld = new Date().getFullYear() - precedent.judgment_date.getFullYear();
    if (yearsOld <= 10) {
      score += Math.max(0, 20 - yearsOld * 2);
    }

    // Citation frequency bonus
    if (precedent.citation_count > 10) {
      score += Math.min(20, Math.log10(precedent.citation_count) * 5);
    }

    return Math.min(100, score);
  }
}

/**
 * Analysis validation utilities
 */
export class ValidationUtils {
  /**
   * Validate analysis completeness
   */
  static validateAnalysis(analysis: ConstitutionalAnalysis): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!analysis.bill_id) errors.push('Bill ID is required');
    if (!analysis.provision_id) errors.push('Provision ID is required');
    if (!analysis.analysis_text) errors.push('Analysis text is required');

    // Range validations
    if (analysis.confidence_percentage < 0 || analysis.confidence_percentage > 100) {
      errors.push('Confidence percentage must be between 0 and 100');
    }

    if (analysis.impact_severity_percentage < 0 || analysis.impact_severity_percentage > 100) {
      errors.push('Impact severity percentage must be between 0 and 100');
    }

    // Logic validations
    if (analysis.constitutional_risk === 'critical' && analysis.confidence_percentage > 90) {
      warnings.push('High confidence with critical risk may need review');
    }

    if (analysis.constitutional_risk === 'low' && analysis.requires_expert_review) {
      warnings.push('Low risk analysis flagged for expert review');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate analysis consistency across multiple analyses
   */
  static validateConsistency(analyses: ConstitutionalAnalysis[]): {
    isConsistent: boolean;
    inconsistencies: string[];
  } {
    const inconsistencies: string[] = [];

    if (analyses.length < 2) {
      return { isConsistent: true, inconsistencies: [] };
    }

    // Check for conflicting risk assessments on same provision
    const provisionRisks = new Map<string, string[]>();
    analyses.forEach(analysis => {
      const risks = provisionRisks.get(analysis.provision_id) || [];
      risks.push(analysis.constitutional_risk);
      provisionRisks.set(analysis.provision_id, risks);
    });

    provisionRisks.forEach((risks, provisionId) => {
      const uniqueRisks = [...new Set(risks)];
      if (uniqueRisks.length > 1 && uniqueRisks.includes('critical') && uniqueRisks.includes('low')) {
        inconsistencies.push(`Conflicting risk assessments for provision ${provisionId}`);
      }
    });

    // Check for confidence vs risk consistency
    analyses.forEach(analysis => {
      if (analysis.constitutional_risk === 'critical' && analysis.confidence_percentage < 60) {
        inconsistencies.push(`Low confidence critical risk analysis: ${analysis.id}`);
      }
    });

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies
    };
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceUtils {
  private static timers = new Map<string, number>();

  /**
   * Start timing an operation
   */
  static startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  /**
   * End timing and get duration
   */
  static endTimer(operationId: string): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);
    return duration;
  }

  /**
   * Create performance metrics for analysis
   */
  static createMetrics(operationId: string, additionalData?: Record<string, any>) {
    return {
      operationId,
      duration: this.endTimer(operationId),
      timestamp: new Date(),
      ...additionalData
    };
  }
}
