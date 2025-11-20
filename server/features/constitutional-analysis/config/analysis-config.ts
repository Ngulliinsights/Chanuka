// ============================================================================
// CONSTITUTIONAL ANALYSIS - Configuration
// ============================================================================
// Configuration settings for the constitutional analysis feature

import { AnalysisConfiguration } from '@client/types/index.js';

/**
 * Production configuration for constitutional analysis
 */
export const PRODUCTION_CONFIG: AnalysisConfiguration = {
  provisionMatching: {
    keywordWeighting: 0.4,
    semanticWeighting: 0.4,
    structuralWeighting: 0.2,
    minRelevanceThreshold: 35
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
    minRelevanceThreshold: 45
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
 * Development configuration with more lenient thresholds
 */
export const DEVELOPMENT_CONFIG: AnalysisConfiguration = {
  provisionMatching: {
    keywordWeighting: 0.5,
    semanticWeighting: 0.3,
    structuralWeighting: 0.2,
    minRelevanceThreshold: 25
  },
  precedentAnalysis: {
    courtHierarchyWeights: {
      supreme_court: 1.0,
      court_of_appeal: 0.8,
      high_court: 0.6,
      subordinate_court: 0.4
    },
    recencyWeighting: 0.2,
    citationWeighting: 0.1,
    minRelevanceThreshold: 30
  },
  riskAssessment: {
    rightsViolationMultiplier: 1.8,
    precedentConflictMultiplier: 1.3,
    confidencePenalty: 0.9
  },
  expertReview: {
    autoFlagThresholds: {
      confidence: 70,
      risk: ['medium', 'high', 'critical'],
      complexity: 70
    },
    priorityCalculation: {
      urgencyFactors: ['critical_risk', 'fundamental_rights'],
      timeConstraints: 72 // hours
    }
  }
};

/**
 * Test configuration with minimal thresholds for testing
 */
export const TEST_CONFIG: AnalysisConfiguration = {
  provisionMatching: {
    keywordWeighting: 0.6,
    semanticWeighting: 0.2,
    structuralWeighting: 0.2,
    minRelevanceThreshold: 10
  },
  precedentAnalysis: {
    courtHierarchyWeights: {
      supreme_court: 1.0,
      court_of_appeal: 0.8,
      high_court: 0.6,
      subordinate_court: 0.4
    },
    recencyWeighting: 0.1,
    citationWeighting: 0.1,
    minRelevanceThreshold: 20
  },
  riskAssessment: {
    rightsViolationMultiplier: 1.5,
    precedentConflictMultiplier: 1.2,
    confidencePenalty: 1.0
  },
  expertReview: {
    autoFlagThresholds: {
      confidence: 60,
      risk: ['medium', 'high', 'critical'],
      complexity: 60
    },
    priorityCalculation: {
      urgencyFactors: ['critical_risk'],
      timeConstraints: 96 // hours
    }
  }
};

/**
 * Get configuration based on environment
 */
export function getAnalysisConfig(): AnalysisConfiguration {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'test':
      return TEST_CONFIG;
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Kenya-specific configuration adjustments
 */
export const KENYA_SPECIFIC_CONFIG: Partial<AnalysisConfiguration> = {
  precedentAnalysis: {
    courtHierarchyWeights: {
      supreme_court: 1.0,      // Supreme Court of Kenya
      court_of_appeal: 0.85,   // Court of Appeal
      high_court: 0.7,         // High Court
      subordinate_court: 0.5   // Magistrate Courts, etc.
    },
    recencyWeighting: 0.4,     // Higher weight for recent cases due to 2010 Constitution
    citationWeighting: 0.3,
    minRelevanceThreshold: 40
  },
  expertReview: {
    autoFlagThresholds: {
      confidence: 80,          // Higher threshold due to constitutional complexity
      risk: ['high', 'critical'],
      complexity: 85
    },
    priorityCalculation: {
      urgencyFactors: [
        'critical_risk',
        'fundamental_rights',
        'bill_of_rights',
        'devolution',
        'public_participation'
      ],
      timeConstraints: 24      // Faster review for constitutional issues
    }
  }
};

/**
 * Merge Kenya-specific configuration with base configuration
 */
export function getKenyaAnalysisConfig(): AnalysisConfiguration {
  const baseConfig = getAnalysisConfig();
  
  return {
    ...baseConfig,
    precedentAnalysis: {
      ...baseConfig.precedentAnalysis,
      ...KENYA_SPECIFIC_CONFIG.precedentAnalysis
    },
    expertReview: {
      ...baseConfig.expertReview,
      ...KENYA_SPECIFIC_CONFIG.expertReview
    }
  };
}