import { QueryResult, QueryResultRow } from 'pg';
import { InsertUser, InsertUserProgress, User, UserProgress } from '../../shared/schema.js';
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
    getUserProgress(userId: number): Promise<UserProgress[]>;
    updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
    getProgressByType(userId: number, achievementType: string): Promise<UserProgress[]>;
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    getUserBySocialProfile(provider: string, profileId: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    linkSocialProfile(userId: number, profile: {
        platform: string;
        profileId: string;
        username: string;
    }): Promise<User>;
    unlinkSocialProfile(userId: number, platform: string): Promise<User>;
    updateUserReputation(userId: number, change: number): Promise<User>;
    updateUserLastActive(userId: number): Promise<User>;
}
