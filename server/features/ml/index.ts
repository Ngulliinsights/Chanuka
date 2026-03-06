// ============================================================================
// ML MODULE INDEX - MWANGA Stack
// ============================================================================
// Zero-training-first ML/AI architecture for Chanuka Platform
// See: docs/architecture/ML_AI_ARCHITECTURE.md

// ============================================================================
// MWANGA Stack Models (New Architecture)
// ============================================================================
export * from './models';

// Configuration
export * from './config/mwanga-config';

// ============================================================================
// Legacy Services (To be migrated)
// ============================================================================
// TODO: Migrate these to MWANGA Stack architecture
// export * from './services/ml-orchestrator';
// export * from './services/analysis-pipeline';

// ============================================================================
// MWANGA Stack Utilities
// ============================================================================
export const MWANGA_UTILS = {
  // Performance monitoring
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{result: T, duration: number}> => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },
  
  // Error handling
  handleMLError: (error: unknown, context: string) => {
    console.error(`MWANGA Error in ${context}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown ML error',
      context,
    };
  },
  
  // Text preprocessing
  preprocessText: (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },
};

// ============================================================================
// MWANGA Stack Constants
// ============================================================================
export const MWANGA_CONSTANTS = {
  // Stack version
  VERSION: '1.0.0',
  
  // Tier names
  TIERS: {
    TIER1: 'tier1' as const,
    TIER2: 'tier2' as const,
    TIER3: 'tier3' as const,
  },
  
  // Risk thresholds
  RISK_THRESHOLDS: {
    CRITICAL: 0.8,
    HIGH: 0.6,
    MEDIUM: 0.4,
    LOW: 0.2,
  },
  
  // Confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
  },
  
  // Cache TTL (milliseconds)
  CACHE_TTL: {
    SHORT: 5 * 60 * 1000,         // 5 minutes
    MEDIUM: 30 * 60 * 1000,       // 30 minutes
    LONG: 60 * 60 * 1000,         // 1 hour
    EXTENDED: 2 * 60 * 60 * 1000, // 2 hours
    CONSTITUTIONAL: 7200000,       // 2 hours (Constitution doesn't change)
  },
  
  // Processing limits
  LIMITS: {
    MAX_TEXT_LENGTH: 100000,
    MAX_BATCH_SIZE: 50,
    DEFAULT_TIMEOUT: 30000,
    MAX_TIMEOUT: 120000,
    MAX_CACHE_SIZE: 1000,
  },
  
  // Model identifiers
  MODELS: {
    OLLAMA_DEFAULT: 'llama3.2',
    OLLAMA_FALLBACK: 'mistral',
    HUGGINGFACE_SENTIMENT: 'cardiffnlp/twitter-roberta-base-sentiment',
    SENTENCE_TRANSFORMER: 'all-MiniLM-L6-v2',
    SPACY_MODEL: 'en_core_web_sm',
  },
} as const;