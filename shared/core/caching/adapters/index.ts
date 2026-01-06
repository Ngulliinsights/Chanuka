/**
 * Caching Adapters Module
 *
 * Concrete cache adapter implementations
 */

// Memory adapter
export { MemoryAdapter, type MemoryAdapterConfig } from './memory-adapter';

// Multi-tier adapter (placeholder for now)
export { MultiTierAdapter, type MultiTierAdapterConfig } from './multi-tier-adapter';

// Browser adapter
export { BrowserAdapter, type BrowserAdapterConfig } from './browser-adapter';

// AI cache adapter
export { AICache, createAICache, getDefaultAICache, setDefaultAICache, type AICacheOptions, type AICacheEntry, type AICacheMetrics } from './ai-cache';








































