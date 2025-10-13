import { cacheService } from '@/infrastructure/cache/cache-service';
import { CACHE_TTL } from '@/infrastructure/cache/cache-ttl';

const hash = (obj: any): string => Buffer.from(JSON.stringify(obj)).toString('base64url');

export class SearchCache {
  /*  Keys mirror original search-service.ts namespaces  */
  private readonly KEY = {
    RESULTS: (q: string, f: any, p: any) => `search:results:${hash(q)}:${hash(f)}:${hash(p)}`,
    SUGGESTIONS: (q: string, l: number) => `search:suggestions:${hash(q)}:${l}`,
    POPULAR: 'search:popular',
    INDEX_HEALTH: 'search:index_health',
  } as const;

  /*  Low-level accessors  */
  async getResults<T>(query: string, filters: any, pagination: any): Promise<T | null> {
    return cacheService.get<T>(this.KEY.RESULTS(query, filters, pagination));
  }
  async setResults<T>(query: string, filters: any, pagination: any, data: T): Promise<void> {
    await cacheService.set(this.KEY.RESULTS(query, filters, pagination), data, CACHE_TTL.SEARCH_RESULTS);
  }

  async getSuggestions<T>(query: string, limit: number): Promise<T | null> {
    return cacheService.get<T>(this.KEY.SUGGESTIONS(query, limit));
  }
  async setSuggestions<T>(query: string, limit: number, data: T): Promise<void> {
    await cacheService.set(this.KEY.SUGGESTIONS(query, limit), data, CACHE_TTL.SUGGESTIONS);
  }

  async getPopular<T>(): Promise<T | null> {
    return cacheService.get<T>(this.KEY.POPULAR);
  }
  async setPopular<T>(data: T): Promise<void> {
    await cacheService.set(this.KEY.POPULAR, data, CACHE_TTL.LONG);
  }

  async getIndexHealth<T>(): Promise<T | null> {
    return cacheService.get<T>(this.KEY.INDEX_HEALTH);
  }
  async setIndexHealth<T>(data: T): Promise<void> {
    await cacheService.set(this.KEY.INDEX_HEALTH, data, CACHE_TTL.LONG);
  }

  /*  Bulk invalidation – used by index manager & engagement tracker  */
  async invalidateResults(): Promise<void> {
    await cacheService.deletePattern('search:results:*');
  }
  async invalidateSuggestions(): Promise<void> {
    await cacheService.deletePattern('search:suggestions:*');
  }
  async invalidateAll(): Promise<void> {
    await Promise.all([
      cacheService.deletePattern('search:results:*'),
      cacheService.deletePattern('search:suggestions:*'),
      cacheService.delete(this.KEY.POPULAR),
      cacheService.delete(this.KEY.INDEX_HEALTH),
    ]);
  }
}