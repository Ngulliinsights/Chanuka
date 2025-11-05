import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { UserProfile, OAuthProvider, SocialProfile } from '@shared/core/types/auth.types.js';
import { BaseStorage } from './base/BaseStorage.js';
import type { StorageOptions } from './StorageTypes.js';
import { logger } from '@shared/core';
export interface CreateUserData {
    username: string;
    email: string;
    password: string;
    role?: 'user' | 'admin' | 'expert';
    socialProfiles?: SocialProfile[];
}
export declare class UserStorage extends BaseStorage<UserProfile> { private redis;
    private pool;
    constructor(redis: Redis, pool: Pool, options?: StorageOptions);
    getUser(id: number): Promise<UserProfile | null>;
    getUserByUsername(username: string): Promise<UserProfile | null>;
    createUser(data: CreateUserData): Promise<UserProfile>;
    getUserBySocialProfile(provider: OAuthProvider, profileId: string): Promise<UserProfile | null>;
    linkSocialProfile(user_id: number, profile: SocialProfile): Promise<UserProfile>;
 }















































