import { DatabaseTransaction } from '@shared/database/connection';

/**
 * Base entity interface that all domain entities should implement
 */
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Base repository interface providing common CRUD operations
 */
export interface IBaseRepository<T extends BaseEntity> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities with optional pagination
   */
  findAll(options?: { limit?: number; offset?: number }): Promise<T[]>;

  /**
   * Create a new entity
   */
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, entity: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count total entities
   */
  count(): Promise<number>;

  /**
   * Check if entity exists by ID
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Extended repository interface with additional query capabilities
 */
export interface IRepository<T extends BaseEntity> extends IBaseRepository<T> {
  /**
   * Find entities by multiple IDs
   */
  findByIds(ids: string[]): Promise<T[]>;

  /**
   * Find entities with custom where conditions
   */
  findWhere(conditions: Partial<T>): Promise<T[]>;

  /**
   * Execute within a transaction
   */
  withTransaction<R>(callback: (tx: DatabaseTransaction) => Promise<R>): Promise<R>;
}

/**
 * Repository factory interface for creating repository instances
 */
export interface IRepositoryFactory {
  /**
   * Get repository for a specific entity type
   */
  getRepository<T extends BaseEntity>(entityType: string): IRepository<T>;

  /**
   * Create a new repository instance
   */
  createRepository<T extends BaseEntity>(
    entityType: string,
    table: any,
    mapToEntity: (row: any) => T,
    mapToRow: (entity: T) => any
  ): IRepository<T>;
}