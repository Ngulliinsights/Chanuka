// ============================================================================
// MACHINE LEARNING MODELS INDEX
// ============================================================================
// Central registry for all ML models with optimization and lazy loading support

// Export shared utilities
export * from './shared_utils';

// Export all model types and schemas
export * from './trojan-bill-detector';
export * from './constitutional-analyzer';
export * from './conflict-detector';
export * from './sentiment-analyzer';
export * from './engagement-predictor';
export * from './transparency-scorer';
export * from './influence-mapper';
export * from './real-time-classifier';

// Model metadata interface
export interface ModelMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: readonly string[];
  category: 'analysis' | 'detection' | 'prediction' | 'scoring';
  complexity: 'low' | 'medium' | 'high';
  estimatedLatency: string;
}

// Model registry with lazy loading
export const MODEL_REGISTRY = {
  'trojan-bill-detector': {
    loader: async () => {
      try {
        return await import('./trojan-bill-detector');
      } catch (error) {
        console.warn('Trojan bill detector module not found, using fallback');
        return { trojanBillDetector: null };
      }
    },
    metadata: {
      name: 'Trojan Bill Detector',
      version: '2.0.0',
      description: 'Detects hidden provisions and deceptive techniques in legislation',
      capabilities: [
        'Hidden provision detection',
        'Deception technique identification',
        'Risk scoring',
        'Constitutional impact assessment'
      ] as const,
      category: 'detection' as const,
      complexity: 'high' as const,
      estimatedLatency: '500-1000ms'
    }
  },
  'constitutional-analyzer': {
    loader: () => import('./constitutional-analyzer'),
    metadata: {
      name: 'Constitutional Analyzer',
      version: '2.0.0',
      description: 'Analyzes legislation for constitutional compliance and violations',
      capabilities: [
        'Constitutional violation detection',
        'Bill of Rights analysis',
        'Separation of powers assessment',
        'Legal precedent matching',
        'Compliance scoring'
      ] as const,
      category: 'analysis' as const,
      complexity: 'high' as const,
      estimatedLatency: '300-800ms'
    }
  },
  'conflict-detector': {
    loader: async () => {
      try {
        return await import('./conflict-detector');
      } catch (error) {
        console.warn('Conflict detector module not found, using fallback');
        return { conflictDetector: null };
      }
    },
    metadata: {
      name: 'Conflict Detector',
      version: '2.0.0',
      description: 'Detects conflicts of interest between bill sponsors and legislation',
      capabilities: [
        'Financial conflict detection',
        'Employment history analysis',
        'Family connection assessment',
        'Organizational conflict identification',
        'Disclosure quality evaluation'
      ] as const,
      category: 'detection' as const,
      complexity: 'medium' as const,
      estimatedLatency: '200-500ms'
    }
  },
  'sentiment-analyzer': {
    loader: () => import('./sentiment-analyzer'),
    metadata: {
      name: 'Sentiment Analyzer',
      version: '2.1.0',
      description: 'Advanced sentiment analysis with emotion detection and political lean',
      capabilities: [
        'Sentiment scoring with negation handling',
        'Emotion detection (8 emotions)',
        'Aspect-based sentiment analysis',
        'Key phrase extraction',
        'Toxicity detection',
        'Political lean detection',
        'Multi-language support'
      ] as const,
      category: 'analysis' as const,
      complexity: 'medium' as const,
      estimatedLatency: '100-300ms'
    }
  },
  'engagement-predictor': {
    loader: () => import('./engagement-predictor'),
    metadata: {
      name: 'Engagement Predictor',
      version: '2.0.0',
      description: 'Predicts user engagement and optimizes content delivery',
      capabilities: [
        'Engagement score prediction',
        'User segmentation',
        'Optimal timing recommendations',
        'Content format optimization',
        'Personalization suggestions',
        'Behavioral prediction'
      ] as const,
      category: 'prediction' as const,
      complexity: 'medium' as const,
      estimatedLatency: '150-400ms'
    }
  },
  'transparency-scorer': {
    loader: () => import('./transparency-scorer'),
    metadata: {
      name: 'Transparency Scorer',
      version: '2.0.0',
      description: 'Multi-dimensional transparency assessment and scoring',
      capabilities: [
        'Multi-dimensional scoring',
        'Entity-specific assessment',
        'Benchmarking and comparison',
        'Actionable recommendations',
        'Grade assignment',
        'Trend analysis'
      ] as const,
      category: 'scoring' as const,
      complexity: 'medium' as const,
      estimatedLatency: '200-500ms'
    }
  },
  'influence-mapper': {
    loader: () => import('./influence-mapper'),
    metadata: {
      name: 'Influence Mapper',
      version: '2.1.0',
      description: 'Maps political influence networks with real graph algorithms',
      capabilities: [
        'Network analysis with real metrics',
        'Centrality measures (betweenness, closeness, eigenvector)',
        'Power cluster identification',
        'Influence flow analysis',
        'Lobbying pattern detection',
        'Risk assessment'
      ] as const,
      category: 'analysis' as const,
      complexity: 'high' as const,
      estimatedLatency: '800-2000ms'
    }
  },
  'real-time-classifier': {
    loader: () => import('./real-time-classifier'),
    metadata: {
      name: 'Real-Time Classifier',
      version: '2.1.0',
      description: 'Optimized real-time content classification with caching',
      capabilities: [
        'Urgency level classification',
        'Multi-topic categorization',
        'Sentiment analysis',
        'Engagement potential prediction',
        'Misinformation risk assessment',
        'Constitutional relevance detection',
        'Public interest assessment',
        'Actionable recommendations'
      ] as const,
      category: 'analysis' as const,
      complexity: 'low' as const,
      estimatedLatency: '50-150ms'
    }
  }
} as const;

export type ModelType = keyof typeof MODEL_REGISTRY;

/**
 * Model manager for loading and caching models
 */
export class ModelManager {
  private static instance: ModelManager;
  private loadedModels = new Map<ModelType, any>();
  private loadingPromises = new Map<ModelType, Promise<any>>();

  private constructor() {}

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  /**
   * Load a model by type
   */
  async loadModel(type: ModelType): Promise<any> {
    // Return cached model if already loaded
    if (this.loadedModels.has(type)) {
      return this.loadedModels.get(type);
    }

    // Return existing loading promise if model is being loaded
    if (this.loadingPromises.has(type)) {
      return this.loadingPromises.get(type);
    }

    // Load the model
    const loadPromise = (async () => {
      const registry = MODEL_REGISTRY[type];
      if (!registry) {
        throw new Error(`Unknown model type: ${type}`);
      }

      const module = await registry.loader();
      const modelInstance = this.getModelInstance(type, module);
      
      this.loadedModels.set(type, modelInstance);
      this.loadingPromises.delete(type);
      
      return modelInstance;
    })();

    this.loadingPromises.set(type, loadPromise);
    return loadPromise;
  }

  /**
   * Get model instance from loaded module
   */
  private getModelInstance(type: ModelType, module: unknown): unknown {
    const instanceMap: Record<string, string> = {
      'trojan-bill-detector': 'trojanBillDetector',
      'constitutional-analyzer': 'constitutionalAnalyzer',
      'conflict-detector': 'conflictDetector',
      'sentiment-analyzer': 'sentimentAnalyzer',
      'engagement-predictor': 'engagementPredictor',
      'transparency-scorer': 'transparencyScorer',
      'influence-mapper': 'influenceMapper',
      'real-time-classifier': 'realTimeClassifier',
    };

    const instanceName = instanceMap[type];
    if (!instanceName) {
      throw new Error(`No instance mapping found for model type: ${type}`);
    }
    return module[instanceName];
  }

  /**
   * Get model metadata without loading the model
   */
  getMetadata(type: ModelType): ModelMetadata {
    return MODEL_REGISTRY[type].metadata;
  }

  /**
   * Get all model metadata
   */
  getAllMetadata(): Record<ModelType, ModelMetadata> {
    const metadata: any = {};
    for (const [type, config] of Object.entries(MODEL_REGISTRY)) {
      metadata[type] = config.metadata;
    }
    return metadata;
  }

  /**
   * Preload models for better performance
   */
  async preloadModels(types: ModelType[]): Promise<void> {
    await Promise.all(types.map(type => this.loadModel(type)));
  }

  /**
   * Clear model cache
   */
  clearCache(type?: ModelType): void {
    if (type) {
      this.loadedModels.delete(type);
      this.loadingPromises.delete(type);
    } else {
      this.loadedModels.clear();
      this.loadingPromises.clear();
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    loaded: ModelType[];
    loading: ModelType[];
    available: ModelType[];
  } {
    return {
      loaded: Array.from(this.loadedModels.keys()),
      loading: Array.from(this.loadingPromises.keys()),
      available: Object.keys(MODEL_REGISTRY) as ModelType[],
    };
  }
}

/**
 * Convenience function to get model manager instance
 */
export function getModelManager(): ModelManager {
  return ModelManager.getInstance();
}

/**
 * Helper function to load and use a model
 */
export async function useModel<T = any>(
  type: ModelType,
  operation: (model: unknown) => Promise<T> | T
): Promise<T> {
  const manager = getModelManager();
  const model = await manager.loadModel(type);
  return operation(model);
}

/**
 * Batch process using multiple models
 */
export async function batchProcess<T = any>(
  operations: Array<{
    modelType: ModelType;
    operation: (model: unknown) => Promise<T> | T;
  }>
): Promise<T[]> {
  const manager = getModelManager();
  
  // Preload all needed models
  const modelTypes = Array.from(new Set(operations.map(op => op.modelType)));
  await manager.preloadModels(modelTypes);
  
  // Execute all operations
  return Promise.all(
    operations.map(async ({ modelType, operation }) => {
      const model = await manager.loadModel(modelType);
      return operation(model);
    })
  );
}

/**
 * Get model recommendations based on use case
 */
export function getRecommendedModels(useCase: string): ModelType[] {
  const recommendations: Record<string, ModelType[]> = {
    'bill_analysis': [
      'constitutional-analyzer',
      'trojan-bill-detector',
      'transparency-scorer'
    ],
    'sponsor_vetting': [
      'conflict-detector',
      'transparency-scorer'
    ],
    'content_moderation': [
      'real-time-classifier',
      'sentiment-analyzer'
    ],
    'engagement_optimization': [
      'engagement-predictor',
      'real-time-classifier'
    ],
    'network_analysis': [
      'influence-mapper'
    ],
    'comprehensive_analysis': [
      'constitutional-analyzer',
      'trojan-bill-detector',
      'conflict-detector',
      'sentiment-analyzer',
      'transparency-scorer',
      'influence-mapper'
    ]
  };

  return recommendations[useCase] || [];
}

/**
 * Export model manager as default
 */
export default ModelManager;
