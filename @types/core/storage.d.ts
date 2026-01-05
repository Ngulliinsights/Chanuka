/**
 * Core storage type declarations
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageConfig {
  prefix?: string;
  encryption?: boolean;
  compression?: boolean;
  ttl?: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl?: number;
  tags?: string[];
}
