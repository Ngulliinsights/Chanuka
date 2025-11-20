/**
 * Caching Adapters Module
 *
 * Concrete cache adapter implementations
 */

// Memory adapter
export { MemoryAdapter, type MemoryAdapterConfig } from './memory-adapter';

// Redis adapter (placeholder for now)
export { RedisAdapter, type RedisAdapterConfig } from './redis-adapter';

// Multi-tier adapter (placeholder for now)
export { MultiTierAdapter, type MultiTierAdapterConfig } from './multi-tier-adapter';

// AI cache adapter
export { AICache, createAICache, getDefaultAICache, setDefaultAICache, type AICacheOptions, type AICacheEntry, type AICacheMetrics } from './ai-cache';








































