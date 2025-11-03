import { IRepository, IRepositoryFactory, BaseEntity } from './base-repository';
import { GenericRepository } from './generic-repository';
import { ISearchRepository } from './search-repository';
import { SearchRepositoryImpl } from './search-repository-impl';

/**
 * Repository factory for creating and managing repository instances
 */
export class RepositoryFactory implements IRepositoryFactory {
  private repositories = new Map<string, IRepository<any>>();
  private searchRepository: ISearchRepository | null = null;

  getRepository<T extends BaseEntity>(entityType: string): IRepository<T> {
    const repository = this.repositories.get(entityType);
    if (!repository) {
      throw new Error(`Repository for entity type '${entityType}' not found. Use createRepository() first.`);
    }
    return repository;
  }

  getSearchRepository(): ISearchRepository {
    if (!this.searchRepository) {
      this.searchRepository = new SearchRepositoryImpl();
    }
    return this.searchRepository;
  }

  createRepository<T extends BaseEntity>(
    entityType: string,
    table: any,
    mapToEntity: (row: any) => T,
    mapToRow: (entity: T) => any
  ): IRepository<T> {
    const repository = new GenericRepository<T>(table, mapToEntity, mapToRow);
    this.repositories.set(entityType, repository);
    return repository;
  }

  /**
   * Check if a repository exists for the given entity type
   */
  hasRepository(entityType: string): boolean {
    return this.repositories.has(entityType);
  }

  /**
   * Remove a repository from the factory
   */
  removeRepository(entityType: string): boolean {
    return this.repositories.delete(entityType);
  }

  /**
   * Get all registered entity types
   */
  getRegisteredEntityTypes(): string[] {
    return Array.from(this.repositories.keys());
  }

  /**
   * Clear all repositories
   */
  clear(): void {
    this.repositories.clear();
  }
}

// Export singleton instance
export const repositoryFactory = new RepositoryFactory();