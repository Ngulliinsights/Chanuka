/**
 * MWANGA Stack Configuration
 * Central configuration for all ML/AI services
 */

export interface MwangaConfig {
  // Ollama Configuration
  ollama: {
    enabled: boolean;
    baseUrl: string;
    model: string; // 'llama3.2', 'mistral', 'gemma'
    timeout: number;
    maxRetries: number;
  };

  // ChromaDB Configuration
  chromadb: {
    enabled: boolean;
    host: string;
    port: number;
    collectionName: string;
    embeddingModel: string; // 'all-MiniLM-L6-v2'
  };

  // HuggingFace Configuration
  huggingface: {
    enabled: boolean;
    apiKey?: string; // Optional - free tier works without key
    sentimentModel: string; // 'cardiffnlp/twitter-roberta-base-sentiment'
    timeout: number;
  };

  // NetworkX Graph Configuration
  networkx: {
    enabled: boolean;
    refreshIntervalHours: number; // How often to rebuild graph
    maxGraphSize: number; // Max nodes to prevent memory issues
  };

  // MLflow Configuration
  mlflow: {
    enabled: boolean;
    trackingUri: string;
    experimentName: string;
  };

  // Cache Configuration
  cache: {
    enabled: boolean;
    ttlMs: number;
    maxSize: number;
  };

  // Feature Flags
  features: {
    sentiment: boolean;
    constitutional: boolean;
    trojanBill: boolean;
    conflict: boolean;
    engagement: boolean;
  };

  // Performance Settings
  performance: {
    maxConcurrentRequests: number;
    requestTimeoutMs: number;
    enableMetrics: boolean;
  };
}

/**
 * Default configuration for development
 */
export const defaultConfig: MwangaConfig = {
  ollama: {
    enabled: true,
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
    timeout: 30000,
    maxRetries: 3,
  },

  chromadb: {
    enabled: true,
    host: 'localhost',
    port: 8000,
    collectionName: 'chanuka_constitutional',
    embeddingModel: 'all-MiniLM-L6-v2',
  },

  huggingface: {
    enabled: true,
    sentimentModel: 'cardiffnlp/twitter-roberta-base-sentiment',
    timeout: 10000,
  },

  networkx: {
    enabled: true,
    refreshIntervalHours: 24,
    maxGraphSize: 100000,
  },

  mlflow: {
    enabled: true,
    trackingUri: 'file:./mlruns',
    experimentName: 'chanuka_engagement',
  },

  cache: {
    enabled: true,
    ttlMs: 3600000, // 1 hour
    maxSize: 1000,
  },

  features: {
    sentiment: true,
    constitutional: true,
    trojanBill: true,
    conflict: true,
    engagement: true,
  },

  performance: {
    maxConcurrentRequests: 10,
    requestTimeoutMs: 30000,
    enableMetrics: true,
  },
};

/**
 * Production configuration
 */
export const productionConfig: MwangaConfig = {
  ...defaultConfig,
  ollama: {
    ...defaultConfig.ollama,
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  },
  chromadb: {
    ...defaultConfig.chromadb,
    host: process.env.CHROMADB_HOST || 'localhost',
    port: parseInt(process.env.CHROMADB_PORT || '8000'),
  },
  huggingface: {
    ...defaultConfig.huggingface,
    apiKey: process.env.HUGGINGFACE_API_KEY,
  },
  mlflow: {
    ...defaultConfig.mlflow,
    trackingUri: process.env.MLFLOW_TRACKING_URI || 'file:./mlruns',
  },
  cache: {
    ...defaultConfig.cache,
    ttlMs: 7200000, // 2 hours in production
  },
};

/**
 * Test configuration
 */
export const testConfig: MwangaConfig = {
  ...defaultConfig,
  ollama: {
    ...defaultConfig.ollama,
    enabled: false, // Disable external services in tests
  },
  chromadb: {
    ...defaultConfig.chromadb,
    enabled: false,
  },
  huggingface: {
    ...defaultConfig.huggingface,
    enabled: false,
  },
  cache: {
    ...defaultConfig.cache,
    ttlMs: 1000, // Short TTL for tests
  },
};

/**
 * Get configuration based on environment
 */
export function getMwangaConfig(): MwangaConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    default:
      return defaultConfig;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: MwangaConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check Ollama configuration
  if (config.ollama.enabled) {
    if (!config.ollama.baseUrl) {
      errors.push('Ollama base URL is required when Ollama is enabled');
    }
    if (!config.ollama.model) {
      errors.push('Ollama model is required when Ollama is enabled');
    }
  }

  // Check ChromaDB configuration
  if (config.chromadb.enabled) {
    if (!config.chromadb.host) {
      errors.push('ChromaDB host is required when ChromaDB is enabled');
    }
    if (!config.chromadb.port || config.chromadb.port < 1) {
      errors.push('Valid ChromaDB port is required when ChromaDB is enabled');
    }
  }

  // Check at least one feature is enabled
  const anyFeatureEnabled = Object.values(config.features).some((f) => f);
  if (!anyFeatureEnabled) {
    errors.push('At least one feature must be enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Configuration singleton
 */
let currentConfig: MwangaConfig | null = null;

export function initializeConfig(config?: Partial<MwangaConfig>): MwangaConfig {
  const baseConfig = getMwangaConfig();
  currentConfig = config ? { ...baseConfig, ...config } : baseConfig;

  const validation = validateConfig(currentConfig);
  if (!validation.valid) {
    console.warn('MWANGA configuration validation warnings:', validation.errors);
  }

  return currentConfig;
}

export function getConfig(): MwangaConfig {
  if (!currentConfig) {
    currentConfig = getMwangaConfig();
  }
  return currentConfig;
}
