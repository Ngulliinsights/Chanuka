import { type Store } from 'express-session';
import { type Redis } from 'ioredis';
import { type Pool } from 'pg';
import type { Bill } from '@shared/schema';
import { CommentStorage } from './comment-storage.js';
import { ProgressStorage } from '../../features/analytics/storage/progress.storage.js';
import { SocialShareStorage } from './social-share-storage.js';
import { UserStorage } from './user-storage.js';
import { logger } from '@shared/core';
export interface CacheProvider {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}
// Repository interfaces and classes removed - using direct Drizzle ORM
export interface Storage {
    redis: Redis;
    pool: Pool;
    users: UserStorage;
    comments: CommentStorage;
    progress: ProgressStorage;
    social_share: SocialShareStorage;
    sessionStore: Store;
    cache: CacheProvider;
}
export declare const storage: Storage;
export { CommentStorage } from './comment-storage.js';
export { ProgressStorage } from '../../features/analytics/storage/progress.storage.js';
export { SocialShareStorage } from './social-share-storage.js';
export { UserStorage } from './user-storage.js';
export declare function isError(err: unknown): err is Error;













































