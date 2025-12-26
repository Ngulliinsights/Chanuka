// ============================================================================
// ML MODULE INDEX - Central Export Point
// ============================================================================
// Exports all ML models, services, and utilities

// Models
export * from './models';

// Services
export * from './services/ml-orchestrator';
export * from './services/analysis-pipeline';

// Types and schemas
export type {
  TrojanBillInput,
  TrojanBillOutput,
  ConstitutionalInput,
  ConstitutionalOutput,
  ConflictInput,
  ConflictOutput,
  SentimentInput,
  SentimentOutput,
  EngagementInput,
  EngagementOutput,
  TransparencyInput,
  TransparencyOutput,
  InfluenceInput,
  InfluenceOutput,
  ClassificationInput,
  ClassificationOutput,
} from './models';

export type {
  MLRequest,
  MLResponse,
  PipelineConfig,
  PipelineInput,
} from './services/ml-orchestrator';

// Utility functions
export const ML_UTILS = {
  // Model validation helpers
  validateInput: (modelType: string, input: any) => {
    // Add input validation logic here
    return true;
  },
  
  // Performance monitoring
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{result: T, duration: number}> => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },
  
  // Error handling
  handleMLError: (error: any, context: string) => {
    console.error(`ML Error in ${context}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown ML error',
      context,
    };
  },
  
  // Data preprocessing
  preprocessText: (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },
  
  // Confidence scoring
  calculateConfidence: (scores: number[]) => {
    if (scores.length === 0) return 0;
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, Math.min(1, 1 - (stdDev / mean)));
  },
};

// Constants
export const ML_CONSTANTS = {
  // Model versions
  MODEL_VERSIONS: {
    TROJAN_BILL_DETECTOR: '2.0.0',
    CONSTITUTIONAL_ANALYZER: '2.0.0',
    CONFLICT_DETECTOR: '2.0.0',
    SENTIMENT_ANALYZER: '2.0.0',
    ENGAGEMENT_PREDICTOR: '2.0.0',
    TRANSPARENCY_SCORER: '2.0.0',
    INFLUENCE_MAPPER: '2.0.0',
    REAL_TIME_CLASSIFIER: '2.0.0',
  },
  
  // Thresholds
  THRESHOLDS: {
    HIGH_RISK: 70,
    MEDIUM_RISK: 40,
    LOW_RISK: 20,
    HIGH_CONFIDENCE: 0.8,
    MEDIUM_CONFIDENCE: 0.6,
    LOW_CONFIDENCE: 0.4,
  },
  
  // Cache TTL (milliseconds)
  CACHE_TTL: {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 30 * 60 * 1000,    // 30 minutes
    LONG: 60 * 60 * 1000,      // 1 hour
    EXTENDED: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // Processing limits
  LIMITS: {
    MAX_TEXT_LENGTH: 100000,
    MAX_BATCH_SIZE: 50,
    DEFAULT_TIMEOUT: 30000,
    MAX_TIMEOUT: 120000,
  },
} as const;