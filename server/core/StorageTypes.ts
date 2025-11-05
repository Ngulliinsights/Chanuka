import { QueryResult, QueryResultRow } from 'pg';
import { InsertUser, User, UserProgress, InsertUserProgress } from './types';
import { logger  } from '@shared/core/index.js';

export interface TransactionClient {
  query<T extends QueryResultRow>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

export interface SocialProfile {
  platform: string;
  profile_id: string;
  username: string;
}

export interface StorageConfig {
  cacheTTL?: number;
}

export interface Storage { // Progress-related methods (now aligned with shared/schema types)
  getUserProgress(user_id: string): Promise<UserProgress[]>;
  updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  getProgressByType(user_id: string, achievement_type: string): Promise<UserProgress[]>;

  // Additional methods from IStorage interface
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySocialProfile(provider: string, profile_id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  linkSocialProfile(
    user_id: string,
    profile: { platform: string; profile_id: string; username: string  },
  ): Promise<User>;
  unlinkSocialProfile(user_id: string, platform: string): Promise<User>;
  updateUserReputation(user_id: string, change: number): Promise<User>;
  updateUserLastActive(user_id: string): Promise<User>;
}













































