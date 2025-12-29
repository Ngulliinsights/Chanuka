import { logger } from '@shared/core';
import { type InsertUserProgress, type UserProgress } from '@shared/schema/platform_operations';
import { Redis } from 'ioredis';
import { Pool } from 'pg';

import { BaseStorage } from '../../../../BaseStorage.d';
export declare class ProgressStorage extends BaseStorage<UserProgress> { constructor(redis: Redis, pool: Pool);
    protected invalidateCache(pattern: string): Promise<void>;
    getUserProgress(user_id: number): Promise<UserProgress[]>;
    updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
    getProgressStats(user_id: number): Promise<{
        type: string;
        count: number;
     }[]>;
    healthCheck(): Promise<{
        database: boolean;
        cache: boolean;
    }>;
    shutdown(): Promise<void>;
}


















































