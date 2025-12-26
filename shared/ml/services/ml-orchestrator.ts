// ============================================================================
// ML ORCHESTRATOR - Central ML Model Management Service
// ============================================================================
// Coordinates and manages all ML models, handles model loading, caching, and execution

import { z } from 'zod';
import {
  trojanBillDetector,
  constitutionalAnalyzer,
  conflictDetector,
  sentimentAnalyzer,
  engagementPredictor,
  transparencyScorer,
  influenceMapper,
  realTimeClassifier,
  MODEL_REGISTRY,
  type ModelType,
} from '../models';

export const MLRequestSchema = z.object({
  modelType: z.enum([
    'trojan-bill-detector',
    'constitutional-analyzer',
    'conflict-detector',
    'sentiment-analyzer',
    'engagement-predictor',
    'transparency-scorer',
    'influence-mapper',
    'real-time-classifier',
  ]),
  input: z.any(), // Will be validated by individual models
  options: z.object({
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    timeout: z.number().default(30000), // 30 seconds
    cacheResults: z.boolean().default(true),
    async: z.boolean().default(false),
  }).optional(),
});

export const MLResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  metadata: z.object({
    modelType: z.string(),
    modelVersion: z.string(),
    processingTime: z.number(),
    cached: z.boolean(),
    requestId: z.string(),
    timestamp: z.string(),
  }),
});

export type MLRequest = z.infer<typeof MLRequestSchema>;
export type MLResponse = z.infer<typeof MLResponseSchema>;

interface CacheEntry {
  result: any;
  timestamp: number;
  ttl: number;
}

export class MLOrchestrator {
  private cache = new Map<string, CacheEntry>();
  private requestQueue = new Map<string, Promise<any>>();
  private modelInstances = new Map<ModelType, any>();
  
  // Cache TTL by model type (in milliseconds)
  private readonly CACHE_TTL = {
    'trojan-bill-detector': 60 * 60 * 1000, // 1 hour
    'constitutional-analyzer': 60 * 60 * 1000, // 1 hour
    'conflict-detector': 30 * 60 * 1000, // 30 minutes
    'sentiment-analyzer': 15 * 60 * 1000, // 15 minutes
    'engagement-predictor': 10 * 60 * 1000, // 10 minutes
    'transparency-scorer': 60 * 60 * 1000, // 1 hour
    'influence-mapper': 2 * 60 * 60 * 1000, // 2 hours
    'real-time-classifier': 5 * 60 * 1000, // 5 minutes
  };

  constructor() {
    this.initializeModels();
    this.startCacheCleanup();
  }

  private initializeModels() {
    // Initialize all model instances
    this.modelInstances.set('trojan-bill-detector', trojanBillDetector);
    this.modelInstances.set('constitutional-analyzer', constitutionalAnalyzer);
    this.modelInstances.set('conflict-detector', conflictDetector);
    this.modelInstances.set('sentiment-analyzer', sentimentAnalyzer);
    this.modelInstances.set('engagement-predictor', engagementPredictor);
    this.modelInstances.set('transparency-scorer', transparencyScorer);
    this.modelInstances.set('influence-mapper', influenceMapper);
    this.modelInstances.set('real-time-classifier', realTimeClassifier);
  }

  async processRequest(request: MLRequest): Promise<MLResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      const validatedRequest = MLRequestSchema.parse(request);
      const { modelType, input, options = {} } = validatedRequest;
      
      // Check cache first
      if (options.cacheResults !== false) {
        const cachedResult = this.getCachedResult(modelType, input);
        if (cachedResult) {
          return {
            success: true,
            result: cachedResult,
            metadata: {
              modelType,
              modelVersion: this.getModelVersion(modelType),
              processingTime: Date.now() - startTime,
              cached: true,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
        }
      }
      
      // Check if request is already in progress (deduplication)
      const cacheKey = this.generateCacheKey(modelType, input);
      if (this.requestQueue.has(cacheKey)) {
        const result = await this.requestQueue.get(cacheKey)!;
        return {
          success: true,
          result,
          metadata: {
            modelType,
            modelVersion: this.getModelVersion(modelType),
            processingTime: Date.now() - startTime,
            cached: false,
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }
      
      // Process request
      const processingPromise = this.executeModel(modelType, input, options);
      this.requestQueue.set(cacheKey, processingPromise);
      
      try {
        const result = await processingPromise;
        
        // Cache result if enabled
        if (options.cacheResults !== false) {
          this.cacheResult(modelType, input, result);
        }
        
        return {
          success: true,
          result,
          metadata: {
            modelType,
            modelVersion: this.getModelVersion(modelType),
            processingTime: Date.now() - startTime,
            cached: false,
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      } finally {
        this.requestQueue.delete(cacheKey);
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          modelType: request.modelType,
          modelVersion: this.getModelVersion(request.modelType),
          processingTime: Date.now() - startTime,
          cached: false,
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async executeModel(modelType: ModelType, input: any, options: any): Promise<any> {
    const model = this.modelInstances.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found`);
    }

    // Set timeout
    const timeout = options.timeout || 30000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Model execution timeout')), timeout);
    });

    // Execute model with timeout
    const executionPromise = this.callModelMethod(model, modelType, input);
    
    return Promise.race([executionPromise, timeoutPromise]);
  }

  private async callModelMethod(model: any, modelType: ModelType, input: any): Promise<any> {
    switch (modelType) {
      case 'trojan-bill-detector':
        return model.analyze(input);
      case 'constitutional-analyzer':
        return model.analyze(input);
      case 'conflict-detector':
        return model.detect(input);
      case 'sentiment-analyzer':
        return model.analyze(input);
      case 'engagement-predictor':
        return model.predict(input);
      case 'transparency-scorer':
        return model.assess(input);
      case 'influence-mapper':
        return model.analyze(input);
      case 'real-time-classifier':
        return model.classify(input);
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
  }

  private generateCacheKey(modelType: ModelType, input: any): string {
    // Create a deterministic cache key from model type and input
    const inputHash = this.hashObject(input);
    return `${modelType}:${inputHash}`;
  }

  private hashObject(obj: any): string {
    // Simple hash function for objects
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private getCachedResult(modelType: ModelType, input: any): any | null {
    const cacheKey = this.generateCacheKey(modelType, input);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }

  private cacheResult(modelType: ModelType, input: any, result: any): void {
    const cacheKey = this.generateCacheKey(modelType, input);
    const ttl = this.CACHE_TTL[modelType] || 60 * 60 * 1000; // Default 1 hour
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  private getModelVersion(modelType: ModelType): string {
    const model = this.modelInstances.get(modelType);
    return model?.getModelInfo?.()?.version || '1.0.0';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  // Batch processing for multiple requests
  async processBatch(requests: MLRequest[]): Promise<MLResponse[]> {
    const promises = requests.map(request => this.processRequest(request));
    return Promise.all(promises);
  }

  // Get model information
  getModelInfo(modelType: ModelType) {
    const model = this.modelInstances.get(modelType);
    return model?.getModelInfo?.() || null;
  }

  // Get all available models
  getAvailableModels() {
    return Array.from(this.modelInstances.keys()).map(modelType => ({
      type: modelType,
      info: this.getModelInfo(modelType),
    }));
  }

  // Health check for models
  async healthCheck(): Promise<Record<ModelType, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const modelType of this.modelInstances.keys()) {
      try {
        // Simple health check - verify model instance exists and has required methods
        const model = this.modelInstances.get(modelType);
        const hasRequiredMethod = this.hasRequiredMethod(model, modelType);
        health[modelType] = !!model && hasRequiredMethod;
      } catch (error) {
        health[modelType] = false;
      }
    }
    
    return health as Record<ModelType, boolean>;
  }

  private hasRequiredMethod(model: any, modelType: ModelType): boolean {
    const requiredMethods = {
      'trojan-bill-detector': 'analyze',
      'constitutional-analyzer': 'analyze',
      'conflict-detector': 'detect',
      'sentiment-analyzer': 'analyze',
      'engagement-predictor': 'predict',
      'transparency-scorer': 'assess',
      'influence-mapper': 'analyze',
      'real-time-classifier': 'classify',
    };
    
    const requiredMethod = requiredMethods[modelType];
    return typeof model[requiredMethod] === 'function';
  }

  // Cache statistics
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      activeRequests: this.requestQueue.size,
      cacheByModel: {} as Record<string, number>,
    };
    
    for (const key of this.cache.keys()) {
      const modelType = key.split(':')[0];
      stats.cacheByModel[modelType] = (stats.cacheByModel[modelType] || 0) + 1;
    }
    
    return stats;
  }

  // Clear cache
  clearCache(modelType?: ModelType): void {
    if (modelType) {
      // Clear cache for specific model
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${modelType}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  // Warm up models (pre-load and test)
  async warmUp(): Promise<void> {
    console.log('Warming up ML models...');
    
    const warmupPromises = Array.from(this.modelInstances.entries()).map(async ([modelType, model]) => {
      try {
        // Test each model with minimal input
        const testInput = this.getTestInput(modelType);
        if (testInput) {
          await this.callModelMethod(model, modelType, testInput);
          console.log(`✓ ${modelType} warmed up successfully`);
        }
      } catch (error) {
        console.warn(`⚠ Failed to warm up ${modelType}:`, error);
      }
    });
    
    await Promise.allSettled(warmupPromises);
    console.log('ML model warmup completed');
  }

  private getTestInput(modelType: ModelType): any {
    const testInputs = {
      'trojan-bill-detector': {
        billText: 'Test bill text',
        billTitle: 'Test Bill',
        pageCount: 10,
        scheduleCount: 1,
        amendmentCount: 0,
        consultationPeriod: 30,
        urgencyLevel: 'normal' as const,
      },
      'constitutional-analyzer': {
        billText: 'Test bill text',
        billTitle: 'Test Bill',
        billType: 'public' as const,
      },
      'conflict-detector': {
        billId: '00000000-0000-0000-0000-000000000000',
        billText: 'Test bill text',
        billTitle: 'Test Bill',
        sponsorId: '00000000-0000-0000-0000-000000000000',
        sponsorFinancialInterests: [],
      },
      'sentiment-analyzer': {
        text: 'Test text',
        context: 'bill_comment' as const,
      },
      'engagement-predictor': {
        contentType: 'bill' as const,
        contentMetadata: {
          title: 'Test',
          length: 100,
          complexity: 'medium' as const,
          urgency: 'medium' as const,
          topics: ['test'],
        },
        userProfile: {
          userId: '00000000-0000-0000-0000-000000000000',
          engagementHistory: {
            totalViews: 10,
            totalComments: 1,
            totalShares: 0,
            avgSessionDuration: 120,
            lastActiveDate: new Date().toISOString(),
          },
          preferences: {
            interestedTopics: ['test'],
            preferredComplexity: 'medium' as const,
            notificationFrequency: 'daily' as const,
          },
        },
        contextualFactors: {
          timeOfDay: 12,
          dayOfWeek: 1,
          isWeekend: false,
          currentTrendingTopics: [],
          platformActivity: 'medium' as const,
        },
      },
      'transparency-scorer': {
        entityType: 'bill' as const,
        entityId: '00000000-0000-0000-0000-000000000000',
        assessmentData: {
          billData: {
            hasPublicDrafts: true,
            consultationPeriod: 30,
            publicHearings: 1,
            amendmentHistory: [],
            votingRecord: { isPublic: true, individualVotes: true },
            impactAssessment: { exists: true, isPublic: true },
          },
        },
        contextualFactors: {
          urgencyLevel: 'normal' as const,
          publicInterest: 'medium' as const,
          mediaAttention: 'minimal' as const,
          stakeholderCount: 10,
        },
      },
      'influence-mapper': {
        analysisType: 'network_analysis' as const,
        entities: [],
        relationships: [],
        contextualData: {
          timeframe: {
            start: '2024-01-01',
            end: '2024-12-31',
          },
        },
      },
      'real-time-classifier': {
        content: {
          text: 'Test content',
          source: 'bill' as const,
          timestamp: new Date().toISOString(),
        },
        classificationTasks: ['urgency_level' as const],
      },
    };
    
    return testInputs[modelType];
  }
}

// Singleton instance
export const mlOrchestrator = new MLOrchestrator();