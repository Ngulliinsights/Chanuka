import { type Store } from 'express-session';
import { type Redis } from 'ioredis';
import { type Pool } from 'pg';
import { type Bill, type Stakeholder } from '../../shared/schema.js';
import { CommentStorage } from './comment-storage.js';
import { ProgressStorage } from '../../features/analytics/storage/progress.storage.js';
import { SocialShareStorage } from './social-share-storage.js';
import { UserStorage } from './user-storage.js';
import { logger } from '../utils/logger';
export interface CacheProvider {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}
interface Repository<T> {
    getById(id: number): Promise<T | null>;
    update?(entity: T): Promise<void>;
    create?(entity: Partial<T>): Promise<T>;
    delete?(id: number): Promise<void>;
}
export declare class BillRepository implements Repository<Bill> {
    private readonly db;
    constructor(pool: Pool);
    getById(id: number): Promise<Bill | null>;
    update(bill: Bill): Promise<void>;
}
export declare class StakeholderRepository implements Repository<Stakeholder> {
    private readonly db;
    constructor(pool: Pool);
    getById(id: number): Promise<Stakeholder | null>;
}
export interface Storage {
    redis: Redis;
    pool: Pool;
    users: UserStorage;
    comments: CommentStorage;
    progress: ProgressStorage;
    socialShare: SocialShareStorage;
    sessionStore: Store;
    cache: CacheProvider;
}
export declare const storage: Storage;
export { CommentStorage } from './comment-storage.js';
export { ProgressStorage } from '../../features/analytics/storage/progress.storage.js';
export { SocialShareStorage } from './social-share-storage.js';
export { UserStorage } from './user-storage.js';
export declare function isError(err: unknown): err is Error;







