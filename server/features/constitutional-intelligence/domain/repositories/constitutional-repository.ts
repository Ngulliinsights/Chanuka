// ============================================================================
// CONSTITUTIONAL INTELLIGENCE - DOMAIN REPOSITORIES
// ============================================================================
// Repository interfaces following DDD patterns

import { ConstitutionalProvision, LegalPrecedent, ConstitutionalAnalysis, ConstitutionalAnalysisAggregate } from '../entities/constitutional-provision';

export interface IConstitutionalProvisionRepository {
  /**
   * Find constitutional provisions by article number
   */
  findByArticleNumber(articleNumber: number): Promise<ConstitutionalProvision[]>;

  /**
   * Find provisions by rights category (e.g., 'expression', 'religion', 'due_process')
   */
  findByRightsCategory(category: string): Promise<ConstitutionalProvision[]>;

  /**
   * Search provisions by keywords
   */
  searchByKeywords(keywords: string[]): Promise<ConstitutionalProvision[]>;

  /**
   * Find provision by ID
   */
  findById(id: string): Promise<ConstitutionalProvision | null>;

  /**
   * Get all active provisions
   */
  findAllActive(): Promise<ConstitutionalProvision[]>;
}

export interface ILegalPrecedentRepository {
  /**
   * Find precedents that reference specific constitutional provisions
   */
  findByConstitutionalProvisions(provisionIds: string[]): Promise<LegalPrecedent[]>;

  /**
   * Find precedents by court level
   */
  findByCourtLevel(courtLevel: 'supreme_court' | 'court_of_appeal' | 'high_court'): Promise<LegalPrecedent[]>;

  /**
   * Find binding precedents with high relevance scores
   */
  findHighRelevanceBinding(minRelevanceScore: number): Promise<LegalPrecedent[]>;

  /**
   * Search precedents by case name or citation
   */
  searchByCaseNameOrCitation(searchTerm: string): Promise<LegalPrecedent[]>;

  /**
   * Find precedent by ID
   */
  findById(id: string): Promise<LegalPrecedent | null>;
}

export interface IConstitutionalAnalysisRepository {
  /**
   * Save a constitutional analysis
   */
  save(analysis: ConstitutionalAnalysis): Promise<ConstitutionalAnalysis>;

  /**
   * Find all analyses for a specific bill
   */
  findByBillId(billId: string): Promise<ConstitutionalAnalysis[]>;

  /**
   * Find analyses that require expert review
   */
  findRequiringExpertReview(): Promise<ConstitutionalAnalysis[]>;

  /**
   * Find analyses by risk level
   */
  findByRiskLevel(riskLevel: 'low' | 'medium' | 'high' | 'critical'): Promise<ConstitutionalAnalysis[]>;

  /**
   * Find analyses with low confidence scores
   */
  findLowConfidence(maxConfidence: number): Promise<ConstitutionalAnalysis[]>;

  /**
   * Update analysis after expert review
   */
  updateAfterExpertReview(
    analysisId: string, 
    expertReviewerId: string, 
    expertNotes: string,
    confidenceAdjustment?: number
  ): Promise<ConstitutionalAnalysis>;

  /**
   * Find analysis by ID
   */
  findById(id: string): Promise<ConstitutionalAnalysis | null>;

  /**
   * Delete superseded analyses
   */
  markAsSuperseded(analysisId: string, supersededById: string): Promise<void>;
}

export interface IConstitutionalAnalysisAggregateRepository {
  /**
   * Save a complete constitutional analysis aggregate for a bill
   */
  saveAggregate(aggregate: ConstitutionalAnalysisAggregate): Promise<ConstitutionalAnalysisAggregate>;

  /**
   * Find the latest constitutional analysis aggregate for a bill
   */
  findLatestByBillId(billId: string): Promise<ConstitutionalAnalysisAggregate | null>;

  /**
   * Find aggregates that need urgent review
   */
  findNeedingUrgentReview(): Promise<ConstitutionalAnalysisAggregate[]>;
}