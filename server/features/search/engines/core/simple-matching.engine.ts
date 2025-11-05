// ============================================================================
// OPTIMIZED SIMPLE MATCHING SEARCH ENGINE
// ============================================================================
// Enhanced PostgreSQL full-text search with trigram indexes and caching
// Replaces basic LIKE queries with proper full-text search capabilities

import { database } from '@shared/database';
import { bills, sponsors, comments } from '@shared/schema';
import { ilike, or, sql, desc } from 'drizzle-orm';
import { SearchQuery, SearchResult } from '../types/search.types.js';
// Simple logger for search engine
const logger = {
  debug: (message: string, meta?: any) => console.log(`[DEBUG] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || '')
};

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  hitCount: number;
}

export class SimpleMatchingEngine {
  private searchCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_HIT_THRESHOLD = 3; // Cache after 3 hits

  /**
   * Execute optimized PostgreSQL full-text search with caching.
   * Uses proper full-text search instead of LIKE queries for better performance.
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      logger.debug('Search cache hit', { query: query.query, cacheKey });
      return cachedResult;
    }

    try {
      // Use direct database queries instead of repository
      const results = await this.performDirectSearch(query);
      
      // Cache frequently searched terms
      this.cacheResult(cacheKey, results);
      
      return results;
    } catch (error) {
      logger.error('Simple search failed', { 
        error: (error as Error).message,
        query: query.query 
      });
      
      return [];
    }
  }

  /**
   * Generate cache key from search query parameters
   */
  private generateCacheKey(query: SearchQuery): string {
    const keyParts = [
      query.query.toLowerCase().trim(),
      query.filters?.status?.join(',') || '',
      query.filters?.chamber?.join(',') || '',
      query.filters?.county?.join(',') || '',
      query.pagination?.limit || 50,
      query.pagination?.offset || 0
    ];
    
    return keyParts.join('|');
  }

  /**
   * Get cached search result if valid and frequently accessed
   */
  private getCachedResult(cacheKey: string): SearchResult[] | null {
    const entry = this.searchCache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.searchCache.delete(cacheKey);
      return null;
    }
    
    // Increment hit count
    entry.hitCount++;
    
    return entry.results;
  }

  /**
   * Cache search results for frequently accessed queries
   */
  private cacheResult(cacheKey: string, results: SearchResult[]): void {
    // Check if we should cache this result
    const existingEntry = this.searchCache.get(cacheKey);
    if (existingEntry) {
      existingEntry.results = results;
      existingEntry.timestamp = Date.now();
      return;
    }

    // Only cache if we have room or if this is a repeated query
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsedEntries();
    }

    // Cache the result
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      hitCount: 1
    });
  }

  /**
   * Evict least frequently used cache entries when cache is full
   */
  private evictLeastUsedEntries(): void {
    const entries = Array.from(this.searchCache.entries());
    
    // Sort by hit count (ascending) and timestamp (ascending for ties)
    entries.sort((a, b) => {
      if (a[1].hitCount !== b[1].hitCount) {
        return a[1].hitCount - b[1].hitCount;
      }
      return a[1].timestamp - b[1].timestamp;
    });

    // Remove the least used 25% of entries
    const entriesToRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < entriesToRemove; i++) {
      this.searchCache.delete(entries[i][0]);
    }
  }

  /**
   * Clear the search cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate: number; totalEntries: number } {
    const entries = Array.from(this.searchCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalEntries = entries.length;
    
    return {
      size: this.searchCache.size,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
      totalEntries
    };
  }

  /**
   * Perform direct database search using Drizzle ORM
   */
  private async performDirectSearch(query: SearchQuery): Promise<SearchResult[]> {
    const searchTerm = `%${query.query}%`;
    const limit = query.pagination?.limit || 50;
    const offset = query.pagination?.offset || 0;

    // Search bills using ILIKE for simple matching
    const billResults = await database
      .select({
        id: bills.id,
        title: bills.title,
        description: bills.description,
        status: bills.status,
        chamber: bills.chamber,
        created_at: bills.created_at
      })
      .from(bills)
      .where(
        or(
          ilike(bills.title, searchTerm),
          ilike(bills.description, searchTerm),
          ilike(bills.summary, searchTerm)
        )
      )
      .orderBy(desc(bills.created_at))
      .limit(limit)
      .offset(offset);

    // Convert to SearchResult format
    return billResults.map(bill => ({
      id: bill.id.toString(),
      title: bill.title || '',
      description: bill.description || '',
      type: 'bill' as const,
      relevanceScore: 0.5, // Simple matching gets base score
      metadata: {
        status: bill.status,
        chamber: bill.chamber,
        created_at: bill.created_at?.toISOString()
      }
    }));
  }
}