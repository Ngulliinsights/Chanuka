// ============================================================================
// CONSTITUTIONAL ANALYSIS - Feature Index
// ============================================================================
// Main entry point for the constitutional analysis feature

// Application Services
export { ConstitutionalAnalyzer } from './application/constitutional-analyzer.js';
export { ProvisionMatcherService } from './application/provision-matcher.js';
export { PrecedentFinderService } from './application/precedent-finder.js';
export { ExpertFlaggingService } from './application/expert-flagging-service.js';

// Infrastructure
export { ConstitutionalProvisionsRepository } from './infrastructure/repositories/constitutional-provisions-repository.js';
export { LegalPrecedentsRepository } from './infrastructure/repositories/legal-precedents-repository.js';
export { ConstitutionalAnalysesRepository } from './infrastructure/repositories/constitutional-analyses-repository.js';
export { ExpertReviewQueueRepository } from './infrastructure/repositories/expert-review-queue-repository.js';
export { LegalDatabaseClient } from './infrastructure/external/legal-database-client.js';

// Services
export { 
  ConstitutionalAnalysisFactory,
  createConstitutionalAnalyzer,
  createAnalysisServices
} from './services/constitutional-analysis-factory.js';

// Presentation
export { constitutionalAnalysisRouter } from './presentation/constitutional-analysis-router.js';

// Configuration
export { 
  getAnalysisConfig,
  getKenyaAnalysisConfig,
  PRODUCTION_CONFIG,
  DEVELOPMENT_CONFIG,
  TEST_CONFIG
} from './config/analysis-config.js';

// Utilities
export {
  TextAnalysisUtils,
  RiskAssessmentUtils,
  PrecedentAnalysisUtils,
  ValidationUtils,
  PerformanceUtils
} from './utils/analysis-utils.js';

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
} from './types/index.js';