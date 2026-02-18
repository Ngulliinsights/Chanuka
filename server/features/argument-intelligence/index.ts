// ============================================================================
// ARGUMENT INTELLIGENCE - Feature Index
// ============================================================================
// Main entry point for the argument intelligence feature

// Application Services
export { ArgumentProcessor } from './application/argument-processor';
export { StructureExtractorService } from './application/structure-extractor';
export { ClusteringService } from './application/clustering-service';
export { CoalitionFinderService } from './application/coalition-finder';
export { EvidenceValidatorService } from './application/evidence-validator';
export { BriefGeneratorService } from './application/brief-generator';
export { PowerBalancerService } from './application/power-balancer';

// Application - Consolidated Service
export { argumentIntelligenceService } from './application/argument-intelligence-service';

// Infrastructure - NLP
export { SentenceClassifier } from './infrastructure/nlp/sentence-classifier';
export { EntityExtractor } from './infrastructure/nlp/entity-extractor';
export { SimilarityCalculator } from './infrastructure/nlp/similarity-calculator';

// Presentation
export { argumentIntelligenceRouter } from './presentation/argument-intelligence-router';

// Types and Interfaces
export type {
  CommentProcessingRequest,
  ArgumentProcessingResult,
  ExtractedArgument,
  CoalitionMatch,
  BillArgumentSynthesis,
  SynthesizedClaim,
  EvidenceAssessment,
  StakeholderPosition
} from './application/argument-processor';

export type {
  ExtractionContext,
  ArgumentChain
} from './application/structure-extractor';

export type {
  ArgumentCluster,
  ClusteredArgument,
  ClusteringResult,
  ClusteringConfig
} from './application/clustering-service';

export type {
  CoalitionOpportunity,
  CoalitionStrategy,
  CompatibilityFactor
} from './application/coalition-finder';

export type {
  EvidenceValidationResult,
  ValidatedSource,
  FactCheckResult,
  EvidenceClaim
} from './application/evidence-validator';

export type {
  GeneratedBrief,
  BriefGenerationRequest,
  KeyFinding,
  StakeholderAnalysisSection,
  EvidenceAssessmentSection,
  RecommendationsSection
} from './application/brief-generator';

export type {
  PowerBalancingResult,
  BalancedStakeholderPosition,
  DetectedCampaign,
  MinorityVoice,
  EquityMetrics
} from './application/power-balancer';

export type {
  BillArgumentSynthesis,
  SynthesizedClaim,
  EvidenceAssessment,
  StakeholderPosition,
  StoredBrief
} from './application/argument-intelligence-service';

export type {
  ClassificationResult,
  SentenceFeatures
} from './infrastructure/nlp/sentence-classifier';

export type {
  ExtractedEntity,
  EntityType,
  EntityExtractionResult
} from './infrastructure/nlp/entity-extractor';

export type {
  SimilarityResult,
  SimilarityConfig
} from './infrastructure/nlp/similarity-calculator';


