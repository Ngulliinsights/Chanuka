import { QueryResult, QueryResultRow } from 'pg';
import { InsertUser, InsertUserProgress, User, UserProgress } from '../../shared/schema';
import { logger } from '../../shared/core/src/observability/logging';
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
export interface Storage {
    getUserProgress(userId: string): Promise<UserProgress[]>;
    updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
    getProgressByType(userId: string, achievementType: string): Promise<UserProgress[]>;
    getUser(id: string): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    getUserBySocialProfile(provider: string, profileId: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    linkSocialProfile(userId: string, profile: {
        platform: string;
        profileId: string;
        username: string;
    }): Promise<User>;
    unlinkSocialProfile(userId: string, platform: string): Promise<User>;
    updateUserReputation(userId: string, change: number): Promise<User>;
    updateUserLastActive(userId: string): Promise<User>;
}












































