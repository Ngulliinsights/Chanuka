import { QueryResult, QueryResultRow } from 'pg';
import { InsertUser, User, UserProgress, InsertUserProgress } from './types';
import { logger } from '../../shared/core/src/utils/logger';

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
  // Note: UserProgress types don't exist in our schema, commenting out for now
  // getUserProgress(userId: string): Promise<UserProgress[]>;
  // updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  // getProgressByType(userId: string, achievementType: string): Promise<UserProgress[]>;

  // Additional methods from IStorage interface
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySocialProfile(provider: string, profileId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  linkSocialProfile(
    userId: string,
    profile: { platform: string; profileId: string; username: string },
  ): Promise<User>;
  unlinkSocialProfile(userId: string, platform: string): Promise<User>;
  updateUserReputation(userId: string, change: number): Promise<User>;
  updateUserLastActive(userId: string): Promise<User>;
}







