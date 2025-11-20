import { QueryResult, QueryResultRow } from 'pg';
import { InsertUser, InsertUserProgress, User, UserProgress } from '@shared/schema';
import { logger } from '@shared/core';
export interface TransactionClient {
    query<T extends QueryResultRow>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    release(): void;
}
export interface SocialProfile {
    platform: string;
    profileId: string;
    username: string;
}
export interface StorageConfig {
    cacheTTL?: number;
}
export interface Storage { getUserProgress(user_id: string): Promise<UserProgress[]>;
    updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
    getProgressByType(user_id: string, achievement_type: string): Promise<UserProgress[]>;
    getUser(id: string): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    getUserBySocialProfile(provider: string, profileId: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    linkSocialProfile(user_id: string, profile: {
        platform: string;
        profileId: string;
        username: string;
     }): Promise<User>;
    unlinkSocialProfile(user_id: string, platform: string): Promise<User>;
    updateUserReputation(user_id: string, change: number): Promise<User>;
    updateUserLastActive(user_id: string): Promise<User>;
}













































