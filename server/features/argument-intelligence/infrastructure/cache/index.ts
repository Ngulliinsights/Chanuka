/**
 * Evidence Cache Infrastructure
 *
 * Re-exports the evidence cache manager using the unified caching infrastructure.
 */

export { EvidenceCacheManager, evidenceCacheManager } from './evidence-cache';
export type { ICachingService } from '@server/infrastructure/cache';
