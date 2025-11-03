// ============================================================================
// CONSTITUTIONAL ANALYSIS - Service Factory
// ============================================================================
// Factory for creating and configuring constitutional analysis services

import { db } from '../../../shared/core/index.js';
import { ConstitutionalAnalyzer } from '../application/constitutional-analyzer.js';
import { ProvisionMatcherService } from '../application/provision-matcher.js';
import { PrecedentFinderService } from '../application/precedent-finder.js';
import { ExpertFlaggingService } from '../application/expert-flagging-service.js';
import { ConstitutionalProvisionsRepository } from '../infrastructure/repositories/constitutional-provisions-repository.js';
import { LegalPrecedentsRepository } from '../infrastructure/repositories/legal-precedents-repository.js';
import { ConstitutionalAnalysesRepository } from '../infrastructure/repositories/constitutional-analyses-repository.js';
import { ExpertReviewQueueRepository } from '../infrastructure/repositories/expert-review-queue-repository.js';
import { LegalDatabaseClient } from '../infrastructure/external/legal-database-client.js';
import { AnalysisConfiguration } from '../types/index.js';

/**
 * Default configuration for constitutional analysis
 */
const DEFAULT_CONFIG: AnalysisConfiguration = {
  provisionMatching: {
    keywordWeighting: 0.4,
    semanticWeighting: 0.4,
    structuralWeighting: 0.2,
    minRelevanceThreshold: 30
  },
  precedentAnalysis: {
    courtHierarchyWeights: {
      supreme_court: 1.0,
      court_of_appeal: 0.8,
      high_court: 0.6,
      subordinate_court: 0.4
    },
    recencyWeighting: 0.3,
    citationWeighting: 0.2,
    minRelevanceThreshold: 40
  },
  riskAssessment: {
    rightsViolationMultiplier: 2.0,
    precedentConflictMultiplier: 1.5,
    confidencePenalty: 0.8
  },
  expertReview: {
    autoFlagThresholds: {
      confidence: 75,
      risk: ['high', 'critical'],
      complexity: 80
    },
    priorityCalculation: {
      urgencyFactors: ['critical_risk', 'fundamental_rights', 'time_sensitive'],
      timeConstraints: 48 // hours
    }
  }
};

/**
 * Factory class for creating constitutional analysis services
 */
export class ConstitutionalAnalysisFactory {
  private static instance: ConstitutionalAnalysisFactory;
  private analyzer: ConstitutionalAnalyzer | null = null;
  private config: AnalysisConfiguration;

  private constructor(config: AnalysisConfiguration = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Get singleton instance of the factory
   */
  static getInstance(config?: AnalysisConfiguration): ConstitutionalAnalysisFactory {
    if (!ConstitutionalAnalysisFactory.instance) {
      ConstitutionalAnalysisFactory.instance = new ConstitutionalAnalysisFactory(config);
    }
    return ConstitutionalAnalysisFactory.instance;
  }

  /**
   * Create and configure the main constitutional analyzer
   */
  createConstitutionalAnalyzer(): ConstitutionalAnalyzer {
    if (this.analyzer) {
      return this.analyzer;
    }

    // Create repositories
    const provisionsRepo = this.createProvisionsRepository();
    const precedentsRepo = this.createPrecedentsRepository();
    const analysesRepo = this.createAnalysesRepository();
    const expertReviewRepo = this.createExpertReviewRepository();

    // Create external services
    const legalDbClient = this.createLegalDatabaseClient();

    // Create application services
    const provisionMatcher = this.createProvisionMatcher(provisionsRepo, legalDbClient);
    const precedentFinder = this.createPrecedentFinder(precedentsRepo, legalDbClient);
    const expertFlagger = this.createExpertFlagger(expertReviewRepo);

    // Create main analyzer
    this.analyzer = new ConstitutionalAnalyzer(
      provisionMatcher,
      precedentFinder,
      expertFlagger,
      provisionsRepo,
      precedentsRepo,
      analysesRepo
    );

    return this.analyzer;
  }

  /**
   * Create provision matcher service
   */
  createProvisionMatcher(
    provisionsRepo?: ConstitutionalProvisionsRepository,
    legalDbClient?: LegalDatabaseClient
  ): ProvisionMatcherService {
    return new ProvisionMatcherService(
      provisionsRepo || this.createProvisionsRepository()
    );
  }

  /**
   * Create precedent finder service
   */
  createPrecedentFinder(
    precedentsRepo?: LegalPrecedentsRepository,
    legalDbClient?: LegalDatabaseClient
  ): PrecedentFinderService {
    return new PrecedentFinderService(
      precedentsRepo || this.createPrecedentsRepository()
    );
  }

  /**
   * Create expert flagging service
   */
  createExpertFlagger(
    expertReviewRepo?: ExpertReviewQueueRepository
  ): ExpertFlaggingService {
    return new ExpertFlaggingService(
      expertReviewRepo || this.createExpertReviewRepository()
    );
  }

  /**
   * Create constitutional provisions repository
   */
  createProvisionsRepository(): ConstitutionalProvisionsRepository {
    return new ConstitutionalProvisionsRepository();
  }

  /**
   * Create legal precedents repository
   */
  createPrecedentsRepository(): LegalPrecedentsRepository {
    return new LegalPrecedentsRepository();
  }

  /**
   * Create constitutional analyses repository
   */
  createAnalysesRepository(): ConstitutionalAnalysesRepository {
    return new ConstitutionalAnalysesRepository();
  }

  /**
   * Create expert review queue repository
   */
  createExpertReviewRepository(): ExpertReviewQueueRepository {
    return new ExpertReviewQueueRepository();
  }

  /**
   * Create legal database client
   */
  createLegalDatabaseClient(): LegalDatabaseClient {
    return new LegalDatabaseClient();
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<AnalysisConfiguration>): void {
    this.config = { ...this.config, ...config };
    // Reset analyzer to force recreation with new config
    this.analyzer = null;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): AnalysisConfiguration {
    return { ...this.config };
  }
}

/**
 * Convenience function to get a configured constitutional analyzer
 */
export function createConstitutionalAnalyzer(config?: AnalysisConfiguration): ConstitutionalAnalyzer {
  const factory = ConstitutionalAnalysisFactory.getInstance(config);
  return factory.createConstitutionalAnalyzer();
}

/**
 * Convenience function to get individual services
 */
export function createAnalysisServices(config?: AnalysisConfiguration) {
  const factory = ConstitutionalAnalysisFactory.getInstance(config);
  
  return {
    analyzer: factory.createConstitutionalAnalyzer(),
    provisionMatcher: factory.createProvisionMatcher(),
    precedentFinder: factory.createPrecedentFinder(),
    expertFlagger: factory.createExpertFlagger(),
    repositories: {
      provisions: factory.createProvisionsRepository(),
      precedents: factory.createPrecedentsRepository(),
      analyses: factory.createAnalysesRepository(),
      expertReview: factory.createExpertReviewRepository()
    },
    external: {
      legalDatabase: factory.createLegalDatabaseClient()
    }
  };
}