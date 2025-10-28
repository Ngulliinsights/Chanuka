import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { type InsertUserProgress, type UserProgress } from '../../../../shared/schema';
import { BaseStorage } from './base/BaseStorage.js';
import { logger } from '../../../../shared/core/index.js';
export declare class ProgressStorage extends BaseStorage<UserProgress> {
    constructor(redis: Redis, pool: Pool);
    protected invalidateCache(pattern: string): Promise<void>;
    getUserProgress(userId: number): Promise<UserProgress[]>;
    updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
    getProgressStats(userId: number): Promise<{
        type: string;
        count: number;
    }[]>;
    healthCheck(): Promise<{
        database: boolean;
        cache: boolean;
    }>;
    shutdown(): Promise<void>;
}















































