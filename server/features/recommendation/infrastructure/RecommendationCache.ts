 import { cacheService } from '@/infrastructure/cache/cache-service';
import { CACHE_TTL } from '@/infrastructure/cache/cache-ttl';

const hash = (obj: any): string => Buffer.from(JSON.stringify(obj)).toString('base64url');

export class RecommendationCache {
  private readonly KEY = {
    PERSONAL: (u: string) => `rec:personal:${hash(u)}`,
    SIMILAR: (b: number) => `rec:similar:${b}`,
    TRENDING: (d: number) => `rec:trending:${d}`,
    COLLAB: (u: string) => `rec:collab:${hash(u)}`,
  } as const;

  async getPersonal<T>(userId: string): Promise<T | null> {
    return cacheService.get<T>(this.KEY.PERSONAL(userId));
  }
  async setPersonal<T>(userId: string, data: T): Promise<void> {
    await cacheService.set(this.KEY.PERSONAL(userId), data, CACHE_TTL.RECOMMENDATIONS);
  }

  async getSimilar<T>(billId: number): Promise<T | null> {
    return cacheService.get<T>(this.KEY.SIMILAR(billId));
  }
  async setSimilar<T>(billId: number, data: T): Promise<void> {
    await cacheService.set(this.KEY.SIMILAR(billId), data, CACHE_TTL.RECOMMENDATIONS);
  }

  async getTrending<T>(days: number): Promise<T | null> {
    return cacheService.get<T>(this.KEY.TRENDING(days));
  }
  async setTrending<T>(days: number, data: T): Promise<void> {
    await cacheService.set(this.KEY.TRENDING(days), data, CACHE_TTL.RECOMMENDATIONS);
  }

  async getCollaborative<T>(userId: string): Promise<T | null> {
    return cacheService.get<T>(this.KEY.COLLAB(userId));
  }
  async setCollaborative<T>(userId: string, data: T): Promise<void> {
    await cacheService.set(this.KEY.COLLAB(userId), data, CACHE_TTL.RECOMMENDATIONS);
  }

  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      cacheService.delete(this.KEY.PERSONAL(userId)),
      cacheService.delete(this.KEY.COLLAB(userId)),
    ]);
  }
}
