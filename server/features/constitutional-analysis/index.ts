// ============================================================================
// CONSTITUTIONAL ANALYSIS - Feature Index
// ============================================================================
// Main entry point for the constitutional analysis feature

// Application Services
export { ConstitutionalAnalyzer } from './application/constitutional-analyzer';
export { ProvisionMatcherService } from './application/provision-matcher';
export { PrecedentFinderService } from './application/precedent-finder';
export { ExpertFlaggingService } from './application/expert-flagging-service';

// Infrastructure
export { ConstitutionalProvisionsRepository } from './infrastructure/repositories/constitutional-provisions-repository';
export { LegalPrecedentsRepository } from './infrastructure/repositories/legal-precedents-repository';
export { ConstitutionalAnalysesRepository } from './infrastructure/repositories/constitutional-analyses-repository';
export { ExpertReviewQueueRepository } from './infrastructure/repositories/expert-review-queue-repository';
export { LegalDatabaseClient } from './infrastructure/external/legal-database-client';

// Services
export { 
  ConstitutionalAnalysisFactory,
  createConstitutionalAnalyzer,
  createAnalysisServices
} from './services/constitutional-analysis-factory';

// Presentation
export { constitutionalAnalysisRouter } from './presentation/constitutional-analysis-router';

// Configuration
export { 
  getAnalysisConfig,
  getKenyaAnalysisConfig,
  PRODUCTION_CONFIG,
  DEVELOPMENT_CONFIG,
  TEST_CONFIG
} from './config/analysis-config';

// Utilities
export {
  TextAnalysisUtils,
  RiskAssessmentUtils,
  PrecedentAnalysisUtils,
  ValidationUtils,
  PerformanceUtils
} from './utils/analysis-utils';

// Types
export type {
  AnalysisRequest,
  AnalysisResult,
  ProvisionMatch,
  PrecedentMatch,
  ExpertReviewFlag,
  AnalysisConfiguration,
  AnalysisSearchFilters,
  AnalysisStatistics,
  ConstitutionalAnalysisError,
  ProvisionMatchingError,
  PrecedentAnalysisError,
  ExpertReviewError
} from './types/index';


