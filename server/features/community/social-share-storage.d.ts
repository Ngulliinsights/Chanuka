import { Redis } from 'ioredis';
import { Pool } from 'pg';
import type { InsertSocialShare, SocialShare } from '@shared/schema';
import { BaseStorage } from './base/BaseStorage.js';
import { logger } from '@shared/core/index.js';
export declare class SocialShareStorage extends BaseStorage<SocialShare> { constructor(redis: Redis, pool: Pool);
    static initializeSchema(pool: Pool): Promise<void>;
    protected getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T>;
    protected invalidateCache(pattern: string): Promise<void>;
    trackSocialShare(share: InsertSocialShare): Promise<SocialShare>;
    getSocialShareStats(bill_id: number): Promise<{
        platform: string;
        count: number;
     }[]>;
    getSharesByPlatform(platform: string): Promise<Map<number, SocialShare[]>>;
    getBillShares(bill_id: number): Promise<SocialShare[]>;
    getRecentShares(limit?: number): Promise<SocialShare[]>;
}















































