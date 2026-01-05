/**
 * Shared database type declarations
 */

export interface DatabaseConnection {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  transaction: <T = any>(callback: (trx: any) => Promise<T>) => Promise<T>;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
  };
}

export interface Migration {
  id: string;
  name: string;
  up: (db: DatabaseConnection) => Promise<void>;
  down: (db: DatabaseConnection) => Promise<void>;
}

export interface QueryBuilder {
  select: (columns?: string[]) => QueryBuilder;
  from: (table: string) => QueryBuilder;
  where: (condition: string, value?: any) => QueryBuilder;
  orderBy: (column: string, direction?: 'asc' | 'desc') => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  execute: <T = any>() => Promise<T[]>;
}
