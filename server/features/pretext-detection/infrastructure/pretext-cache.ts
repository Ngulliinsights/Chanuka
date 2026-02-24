/**
 * Pretext Cache
 * 
 * Caching layer for pretext detection results
 */

import { logger } from '@server/infrastructure/observability';
import type { PretextAnalysisResult } from '../domain/types';

export class PretextCache {
  private cache: Map<string, { data: PretextAnalysisResult; expiresAt: number }>;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = new Map();
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get cached analysis
   */
  async get(billId: string): Promise<PretextAnalysisResult | null> {
    const cached = this.cache.get(billId);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(billId);
      return null;
    }

    logger.debug({
      component: 'PretextCache',
      billId
    }, 'Cache hit');

    return cached.data;
  }

  /**
   * Set cached analysis
   */
  async set(billId: string, data: PretextAnalysisResult): Promise<void> {
    this.cache.set(billId, {
      data,
      expiresAt: Date.now() + this.TTL
    });

    logger.debug({
      component: 'PretextCache',
      billId
    }, 'Cache set');
  }

  /**
   * Invalidate cache for a bill
   */
  async invalidate(billId: string): Promise<void> {
    this.cache.delete(billId);
    
    logger.debug({
      component: 'PretextCache',
      billId
    }, 'Cache invalidated');
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({
        component: 'PretextCache',
        cleaned
      }, 'Cache cleanup completed');
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.TTL
    };
  }
}
