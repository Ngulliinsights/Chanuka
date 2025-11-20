// ============================================================================
// ARGUMENT INTELLIGENCE - Feature Index
// ============================================================================
// Main entry point for the argument intelligence feature

// Application Services
export { ArgumentProcessor } from './application/argument-processor.js';
export { StructureExtractorService } from './application/structure-extractor.js';
export { ClusteringService } from './application/clustering-service.js';
export { CoalitionFinderService } from './application/coalition-finder.js';
export { EvidenceValidatorService } from './application/evidence-validator.js';
export { BriefGeneratorService } from './application/brief-generator.js';
export { PowerBalancerService } from './application/power-balancer.js';

// Application - Consolidated Service
export { argumentIntelligenceService } from './application/argument-intelligence-service.js';

// Infrastructure - NLP
export { SentenceClassifier } from './infrastructure/nlp/sentence-classifier.js';
export { EntityExtractor } from './infrastructure/nlp/entity-extractor.js';
export { SimilarityCalculator } from './infrastructure/nlp/similarity-calculator.js';

// Presentation
export { argumentIntelligenceRouter } from './presentation/argument-intelligence-router.js';

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
} from './application/argument-processor.js';

export type {
  ExtractionContext,
  ArgumentChain
} from './application/structure-extractor.js';

export type {
  ArgumentCluster,
  ClusteredArgument,
  ClusteringResult,
  ClusteringConfig
} from './application/clustering-service.js';

export type {
  CoalitionOpportunity,
  CoalitionStrategy,
  CompatibilityFactor
} from './application/coalition-finder.js';

export type {
  EvidenceValidationResult,
  ValidatedSource,
  FactCheckResult,
  EvidenceClaim
} from './application/evidence-validator.js';

export type {
  GeneratedBrief,
  BriefGenerationRequest,
  KeyFinding,
  StakeholderAnalysisSection,
  EvidenceAssessmentSection,
  RecommendationsSection
} from './application/brief-generator.js';

export type {
  PowerBalancingResult,
  BalancedStakeholderPosition,
  DetectedCampaign,
  MinorityVoice,
  EquityMetrics
} from './application/power-balancer.js';

export type {
  BillArgumentSynthesis,
  SynthesizedClaim,
  EvidenceAssessment,
  StakeholderPosition,
  StoredBrief
} from './application/argument-intelligence-service.js';

export type {
  ClassificationResult,
  SentenceFeatures
} from './infrastructure/nlp/sentence-classifier.js';

export type {
  ExtractedEntity,
  EntityType,
  EntityExtractionResult
} from './infrastructure/nlp/entity-extractor.js';

export type {
  SimilarityResult,
  SimilarityConfig
} from './infrastructure/nlp/similarity-calculator.js';
