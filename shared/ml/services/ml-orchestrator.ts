// ============================================================================
// ML ORCHESTRATOR - Central ML Model Management Service
// ============================================================================
// Coordinates and manages all ML models with enhanced performance and reliability

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

// ============================================================================
// SCHEMAS
// ============================================================================

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
  input: z.any(),
  options: z.object({
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    timeout: z.number().min(1000).max(300000).default(30000),
    cacheResults: z.boolean().default(true),
    async: z.boolean().default(false),
    retryOnFailure: z.boolean().default(false),
    maxRetries: z.number().min(0).max(3).default(1),
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
    retryCount: z.number().optional(),
  }),
});

export type MLRequest = z.infer<typeof MLRequestSchema>;
export type MLResponse = z.infer<typeof MLResponseSchema>;
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// INTERFACES
// ============================================================================

interface CacheEntry {
  result: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface QueuedRequest {
  promise: Promise<any>;
  priority: Priority;
  timestamp: number;
}

interface ModelMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgProcessingTime: number;
  cacheHitRate: number;
  lastError?: string;
  lastErrorTime?: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  evictionCount: number;
  byModel: Record<string, {
    entries: number;
    hits: number;
    misses: number;
  }>;
}

// ============================================================================
// ML ORCHESTRATOR
// ============================================================================

export class MLOrchestrator {
  private cache = new Map<string, CacheEntry>();
  private requestQueue = new Map<string, QueuedRequest>();
  private modelInstances = new Map<ModelType, any>();
  private metrics = new Map<ModelType, ModelMetrics>();
  
  // Cache configuration
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_CACHE_MEMORY_MB = 100;
  private cacheEvictionCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // Cache TTL by model type (in milliseconds)
  private readonly CACHE_TTL: Record<ModelType, number> = {
    'trojan-bill-detector': 60 * 60 * 1000, // 1 hour
    'constitutional-analyzer': 60 * 60 * 1000, // 1 hour
    'conflict-detector': 30 * 60 * 1000, // 30 minutes
    'sentiment-analyzer': 15 * 60 * 1000, // 15 minutes
    'engagement-predictor': 10 * 60 * 1000, // 10 minutes
    'transparency-scorer': 60 * 60 * 1000, // 1 hour
    'influence-mapper': 2 * 60 * 60 * 1000, // 2 hours
    'real-time-classifier': 5 * 60 * 1000, // 5 minutes
  };

  // Cleanup intervals
  private cacheCleanupInterval?: NodeJS.Timeout;
  private metricsResetInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeModels();
    this.startBackgroundTasks();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeModels(): void {
    const models: [ModelType, any][] = [
      ['trojan-bill-detector', trojanBillDetector],
      ['constitutional-analyzer', constitutionalAnalyzer],
      ['conflict-detector', conflictDetector],
      ['sentiment-analyzer', sentimentAnalyzer],
      ['engagement-predictor', engagementPredictor],
      ['transparency-scorer', transparencyScorer],
      ['influence-mapper', influenceMapper],
      ['real-time-classifier', realTimeClassifier],
    ];

    for (const [type, model] of models) {
      this.modelInstances.set(type, model);
      this.metrics.set(type, this.createEmptyMetrics());
    }
  }

  private createEmptyMetrics(): ModelMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgProcessingTime: 0,
      cacheHitRate: 0,
    };
  }

  private startBackgroundTasks(): void {
    // Clean up expired cache entries every 5 minutes
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);

    // Reset daily metrics at midnight
    this.metricsResetInterval = setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  // ============================================================================
  // REQUEST PROCESSING
  // ============================================================================

  async processRequest(request: MLRequest): Promise<MLResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    let retryCount = 0;
    
    try {
      const validatedRequest = MLRequestSchema.parse(request);
      const { modelType, input, options = {} } = validatedRequest;
      const maxRetries = options.retryOnFailure ? (options.maxRetries ?? 1) : 0;
      
      // Update metrics
      this.incrementMetric(modelType, 'totalRequests');
      
      // Attempt request with retries
      while (retryCount <= maxRetries) {
        try {
          const result = await this.processRequestInternal(
            modelType,
            input,
            options,
            requestId,
            startTime
          );
          
          // Update success metrics
          this.incrementMetric(modelType, 'successfulRequests');
          this.updateProcessingTime(modelType, Date.now() - startTime);
          
          return {
            ...result,
            metadata: {
              ...result.metadata,
              retryCount: retryCount > 0 ? retryCount : undefined,
            },
          };
        } catch (error) {
          retryCount++;
          
          if (retryCount > maxRetries) {
            throw error;
          }
          
          // Exponential backoff
          await this.delay(Math.min(1000 * Math.pow(2, retryCount - 1), 5000));
        }
      }
      
      throw new Error('Max retries exceeded');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update failure metrics
      this.incrementMetric(request.modelType, 'failedRequests');
      this.recordError(request.modelType, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          modelType: request.modelType,
          modelVersion: this.getModelVersion(request.modelType),
          processingTime: Date.now() - startTime,
          cached: false,
          requestId,
          timestamp: new Date().toISOString(),
          retryCount: retryCount > 0 ? retryCount : undefined,
        },
      };
    }
  }

  private async processRequestInternal(
    modelType: ModelType,
    input: any,
    options: any,
    requestId: string,
    startTime: number
  ): Promise<MLResponse> {
    // Check cache first
    if (options.cacheResults !== false) {
      const cachedResult = this.getCachedResult(modelType, input);
      if (cachedResult !== null) {
        this.cacheHits++;
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
      this.cacheMisses++;
    }
    
    // Check if request is already in progress (deduplication)
    const cacheKey = this.generateCacheKey(modelType, input);
    const queuedRequest = this.requestQueue.get(cacheKey);
    
    if (queuedRequest) {
      const result = await queuedRequest.promise;
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
    
    // Process new request
    const processingPromise = this.executeModel(modelType, input, options);
    
    this.requestQueue.set(cacheKey, {
      promise: processingPromise,
      priority: options.priority || 'normal',
      timestamp: Date.now(),
    });
    
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
  }

  private async executeModel(modelType: ModelType, input: any, options: any): Promise<any> {
    const model = this.modelInstances.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found`);
    }

    const timeout = options.timeout || 30000;
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Model execution timeout after ${timeout}ms`)), timeout);
    });

    // Execute model with timeout
    const executionPromise = this.callModelMethod(model, modelType, input);
    
    return Promise.race([executionPromise, timeoutPromise]);
  }

  private async callModelMethod(model: any, modelType: ModelType, input: any): Promise<any> {
    const methodMap: Record<ModelType, string> = {
      'trojan-bill-detector': 'analyze',
      'constitutional-analyzer': 'analyze',
      'conflict-detector': 'detect',
      'sentiment-analyzer': 'analyze',
      'engagement-predictor': 'predict',
      'transparency-scorer': 'assess',
      'influence-mapper': 'analyze',
      'real-time-classifier': 'classify',
    };

    const methodName = methodMap[modelType];
    if (!model[methodName] || typeof model[methodName] !== 'function') {
      throw new Error(`Model ${modelType} does not have method ${methodName}`);
    }

    return model[methodName](input);
  }

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  async processBatch(requests: MLRequest[]): Promise<MLResponse[]> {
    // Group requests by priority
    const priorityGroups = this.groupByPriority(requests);
    const results: MLResponse[] = [];
    
    // Process urgent requests first
    for (const priority of ['urgent', 'high', 'normal', 'low'] as Priority[]) {
      const group = priorityGroups.get(priority) || [];
      if (group.length === 0) continue;
      
      const batchResults = await Promise.all(
        group.map(request => this.processRequest(request))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  private groupByPriority(requests: MLRequest[]): Map<Priority, MLRequest[]> {
    const groups = new Map<Priority, MLRequest[]>();
    
    for (const request of requests) {
      const priority = request.options?.priority || 'normal';
      const group = groups.get(priority) || [];
      group.push(request);
      groups.set(priority, group);
    }
    
    return groups;
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  private generateCacheKey(modelType: ModelType, input: any): string {
    const inputHash = this.hashObject(input);
    return `${modelType}:${inputHash}`;
  }

  private hashObject(obj: any): string {
    try {
      const str = JSON.stringify(obj, Object.keys(obj).sort());
      let hash = 0;
      
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(36);
    } catch (error) {
      // Fallback for non-serializable objects
      return `${Date.now()}_${Math.random().toString(36)}`;
    }
  }

  private getCachedResult(modelType: ModelType, input: any): any | null {
    const cacheKey = this.generateCacheKey(modelType, input);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if cache entry is still valid
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.result;
  }

  private cacheResult(modelType: ModelType, input: any, result: any): void {
    // Check cache size limits
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRUEntries(Math.floor(this.MAX_CACHE_SIZE * 0.1)); // Evict 10%
    }
    
    const cacheKey = this.generateCacheKey(modelType, input);
    const ttl = this.CACHE_TTL[modelType] || 60 * 60 * 1000;
    const now = Date.now();
    
    this.cache.set(cacheKey, {
      result,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now,
    });
  }

  private evictLRUEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
      this.cacheEvictionCount++;
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  clearCache(modelType?: ModelType): void {
    if (modelType) {
      const prefix = `${modelType}:`;
      for (const key of Array.from(this.cache.keys())) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ============================================================================
  // METRICS & MONITORING
  // ============================================================================

  private incrementMetric(modelType: ModelType, metric: keyof ModelMetrics): void {
    const metrics = this.metrics.get(modelType);
    if (!metrics) return;
    
    if (typeof metrics[metric] === 'number') {
      (metrics[metric] as number)++;
    }
  }

  private updateProcessingTime(modelType: ModelType, time: number): void {
    const metrics = this.metrics.get(modelType);
    if (!metrics) return;
    
    const totalRequests = metrics.successfulRequests;
    metrics.avgProcessingTime = 
      (metrics.avgProcessingTime * (totalRequests - 1) + time) / totalRequests;
  }

  private recordError(modelType: ModelType, error: string): void {
    const metrics = this.metrics.get(modelType);
    if (!metrics) return;
    
    metrics.lastError = error;
    metrics.lastErrorTime = Date.now();
  }

  private resetDailyMetrics(): void {
    for (const metrics of Array.from(this.metrics.values())) {
      metrics.totalRequests = 0;
      metrics.successfulRequests = 0;
      metrics.failedRequests = 0;
    }
    
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictionCount = 0;
  }

  getMetrics(modelType?: ModelType): ModelMetrics | Record<ModelType, ModelMetrics> {
    if (modelType) {
      return this.metrics.get(modelType) || this.createEmptyMetrics();
    }
    
    const allMetrics: Record<string, ModelMetrics> = {};
    for (const [type, metrics] of Array.from(this.metrics.entries())) {
      allMetrics[type] = metrics;
    }
    return allMetrics as Record<ModelType, ModelMetrics>;
  }

  getCacheStats(): CacheStats {
    const stats: CacheStats = {
      totalEntries: this.cache.size,
      totalSize: this.estimateCacheSize(),
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      evictionCount: this.cacheEvictionCount,
      byModel: {},
    };
    
    for (const key of Array.from(this.cache.keys())) {
      const modelType = key.split(':')[0];
      if (!stats.byModel[modelType]) {
        stats.byModel[modelType] = { entries: 0, hits: 0, misses: 0 };
      }
      stats.byModel[modelType].entries++;
    }
    
    return stats;
  }

  private estimateCacheSize(): number {
    let totalSize = 0;
    for (const entry of Array.from(this.cache.values())) {
      try {
        totalSize += JSON.stringify(entry.result).length;
      } catch {
        totalSize += 1000; // Estimate for non-serializable objects
      }
    }
    return totalSize;
  }

  // ============================================================================
  // MODEL INFORMATION
  // ============================================================================

  getModelInfo(modelType: ModelType) {
    const model = this.modelInstances.get(modelType);
    return model?.getModelInfo?.() || null;
  }

  getAvailableModels() {
    return Array.from(this.modelInstances.keys()).map(modelType => ({
      type: modelType,
      info: this.getModelInfo(modelType),
      metrics: this.metrics.get(modelType),
    }));
  }

  private getModelVersion(modelType: ModelType): string {
    const model = this.modelInstances.get(modelType);
    return model?.getModelInfo?.()?.version || '1.0.0';
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<Record<ModelType, boolean>> {
    const health: Record<string, boolean> = {};
    const checks = Array.from(this.modelInstances.entries()).map(
      async ([modelType, model]) => {
        try {
          const hasRequiredMethod = this.hasRequiredMethod(model, modelType);
          health[modelType] = !!model && hasRequiredMethod;
        } catch {
          health[modelType] = false;
        }
      }
    );
    
    await Promise.allSettled(checks);
    return health as Record<ModelType, boolean>;
  }

  private hasRequiredMethod(model: any, modelType: ModelType): boolean {
    const requiredMethods: Record<ModelType, string> = {
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
    return typeof model?.[requiredMethod] === 'function';
  }

  // ============================================================================
  // WARM UP
  // ============================================================================

  async warmUp(): Promise<Map<ModelType, boolean>> {
    console.log('Warming up ML models...');
    const results = new Map<ModelType, boolean>();
    
    const warmupPromises = Array.from(this.modelInstances.entries()).map(
      async ([modelType, model]) => {
        try {
          const testInput = this.getTestInput(modelType);
          if (testInput) {
            await this.callModelMethod(model, modelType, testInput);
            results.set(modelType, true);
            console.log(`✓ ${modelType} warmed up successfully`);
          }
        } catch (error) {
          results.set(modelType, false);
          console.warn(`⚠ Failed to warm up ${modelType}:`, error);
        }
      }
    );
    
    await Promise.allSettled(warmupPromises);
    console.log('ML model warmup completed');
    
    return results;
  }

  private getTestInput(modelType: ModelType): any {
    const testInputs: Record<ModelType, any> = {
      'trojan-bill-detector': {
        billText: 'Test bill text for validation',
        billTitle: 'Test Bill',
        pageCount: 10,
        scheduleCount: 1,
        amendmentCount: 0,
        consultationPeriod: 30,
        urgencyLevel: 'normal' as const,
      },
      'constitutional-analyzer': {
        billText: 'Test bill text for constitutional analysis',
        billTitle: 'Test Constitutional Bill',
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
        text: 'This is a test text for sentiment analysis',
        context: 'bill_comment' as const,
      },
      'engagement-predictor': {
        contentType: 'bill' as const,
        contentMetadata: {
          title: 'Test Bill',
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
          text: 'Test content for classification',
          source: 'bill' as const,
          timestamp: new Date().toISOString(),
        },
        classificationTasks: ['urgency_level' as const],
      },
    };
    
    return testInputs[modelType];
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    if (this.metricsResetInterval) {
      clearInterval(this.metricsResetInterval);
    }
    this.cache.clear();
    this.requestQueue.clear();
    this.modelInstances.clear();
    this.metrics.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const mlOrchestrator = new MLOrchestrator();