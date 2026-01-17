 import { cacheService } from '@shared/core/caching';
import { CACHE_TTL } from '@server/infrastructure/cache/cache-service';

const hash = (obj: any): string => Buffer.from(JSON.stringify(obj)).toString('base64url');

export class RecommendationCache {
  private readonly KEY = {
    PERSONAL: (u: string) => `rec:personal:${hash(u)}`,
    SIMILAR: (b: number) => `rec:similar:${b}`,
    TRENDING: (d: number) => `rec:trending:${d}`,
    COLLAB: (u: string) => `rec:collab:${hash(u)}`,
  } as const;

  async getPersonal<T>(user_id: string): Promise<T | null> { return cacheService.get<T>(this.KEY.PERSONAL(user_id));
   }
  async setPersonal<T>(user_id: string, data: T): Promise<void> { await cacheService.set(this.KEY.PERSONAL(user_id), data, CACHE_TTL.RECOMMENDATIONS);
   }

  async getSimilar<T>(bill_id: number): Promise<T | null> { return cacheService.get<T>(this.KEY.SIMILAR(bill_id));
   }
  async setSimilar<T>(bill_id: number, data: T): Promise<void> { await cacheService.set(this.KEY.SIMILAR(bill_id), data, CACHE_TTL.RECOMMENDATIONS);
   }

  async getTrending<T>(days: number): Promise<T | null> {
    return cacheService.get<T>(this.KEY.TRENDING(days));
  }
  async setTrending<T>(days: number, data: T): Promise<void> {
    await cacheService.set(this.KEY.TRENDING(days), data, CACHE_TTL.RECOMMENDATIONS);
  }

  async getCollaborative<T>(user_id: string): Promise<T | null> { return cacheService.get<T>(this.KEY.COLLAB(user_id));
   }
  async setCollaborative<T>(user_id: string, data: T): Promise<void> { await cacheService.set(this.KEY.COLLAB(user_id), data, CACHE_TTL.RECOMMENDATIONS);
   }

  async invalidateUser(user_id: string): Promise<void> { await Promise.all([
      cacheService.delete(this.KEY.PERSONAL(user_id)),
      cacheService.delete(this.KEY.COLLAB(user_id)),
    ]);
   }
}









































