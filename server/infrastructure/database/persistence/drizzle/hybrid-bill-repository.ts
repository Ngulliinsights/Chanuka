/**
 * Hybrid Bill Repository Implementation
 *
 * Repository that can work with both Drizzle ORM and Neo4j during migration
 * Provides seamless transition between database systems with fallback mechanisms
 */

import type { IBillRepository } from '@server/domain/interfaces/bill-repository.interface';
import type { Result } from '@shared/core';
import { Err,Ok } from '@shared/core';
import type { Bill, NewBill } from '@server/infrastructure/schema';

import { DrizzleBillRepository } from './drizzle-bill-repository';

export enum DatabasePriority {
  DRIZZLE_FIRST = 'drizzle_first',
  DRIZZLE_ONLY = 'drizzle_only'
}

export interface HybridRepositoryConfig {
  priority: DatabasePriority;
}

/**
 * Hybrid repository that supports both Drizzle and Neo4j databases
 * Enables gradual migration with data consistency and fallback support
 */
export class HybridBillRepository implements IBillRepository {
  constructor(
    private readonly drizzleRepo: DrizzleBillRepository,
    private readonly config: HybridRepositoryConfig
  ) {}

  async create(bill: NewBill): Promise<Result<Bill, Error>> {
    try {
      // Always write to primary database first
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        const drizzleResult = await this.drizzleRepo.create(bill);
        if (drizzleResult.isErr()) {
          return drizzleResult;
        }


        return drizzleResult;
      }

      // Default to Drizzle
      return await this.drizzleRepo.create(bill);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create bill'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      // Try primary database first
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        const drizzleResult = await this.drizzleRepo.findById(id);
        if (drizzleResult.isOk()) {
          return drizzleResult;
        }

        return drizzleResult;
      }

      // Default to Drizzle
      return await this.drizzleRepo.findById(id);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find bill by ID'));
    }
  }

  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      // Try primary database first
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        const drizzleResult = await this.drizzleRepo.findByBillNumber(billNumber);
        if (drizzleResult.isOk()) {
          return drizzleResult;
        }

        return drizzleResult;
      }

      // Default to Drizzle
      return await this.drizzleRepo.findByBillNumber(billNumber);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find bill by bill number'));
    }
  }

  async findBySponsorId(
    sponsor_id: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<Result<Bill[], Error>> {
    try {
      // For read operations, prefer the database with more complete data
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        return await this.drizzleRepo.findBySponsorId(sponsor_id, options);
      }

      // Default to Drizzle
      return await this.drizzleRepo.findBySponsorId(sponsor_id, options);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find bills by sponsor ID'));
    }
  }

  async findByStatus(
    status: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
    }
  ): Promise<Result<Bill[], Error>> {
    try {
      // For read operations, prefer the database with more complete data
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        return await this.drizzleRepo.findByStatus(status, options);
      }

      // Default to Drizzle
      return await this.drizzleRepo.findByStatus(status, options);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find bills by status'));
    }
  }

  async findByAffectedCounties(
    counties: string[],
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<Result<Bill[], Error>> {
    try {
      // For read operations, prefer the database with more complete data
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        return await this.drizzleRepo.findByAffectedCounties(counties, options);
      }

      // Default to Drizzle
      return await this.drizzleRepo.findByAffectedCounties(counties, options);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find bills by affected counties'));
    }
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      chamber?: string;
    }
  ): Promise<Result<Bill[], Error>> {
    try {
      return await this.drizzleRepo.search(query, options);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to search bills'));
    }
  }

  async update(id: string, updates: Partial<NewBill>): Promise<Result<Bill, Error>> {
    try {
      // Update primary database first
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        const drizzleResult = await this.drizzleRepo.update(id, updates);
        if (drizzleResult.isErr()) {
          return drizzleResult;
        }


        return drizzleResult;
      }

      // Default to Drizzle
      return await this.drizzleRepo.update(id, updates);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update bill'));
    }
  }

  async updateEngagementMetrics(
    id: string,
    metrics: {
      view_count?: number;
      comment_count?: number;
      share_count?: number;
      vote_count_for?: number;
      vote_count_against?: number;
      engagement_score?: number;
    }
  ): Promise<Result<void, Error>> {
    try {
      // Update primary database first
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        const drizzleResult = await this.drizzleRepo.updateEngagementMetrics(id, metrics);


        return drizzleResult;
      }

      // Default to Drizzle
      return await this.drizzleRepo.updateEngagementMetrics(id, metrics);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update engagement metrics'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      // Delete from primary database first
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        const drizzleResult = await this.drizzleRepo.delete(id);
        if (drizzleResult.isErr()) {
          return drizzleResult;
        }


        return drizzleResult;
      }

      // Default to Drizzle
      return await this.drizzleRepo.delete(id);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete bill'));
    }
  }

  async count(criteria?: {
    status?: string;
    sponsor_id?: string;
    chamber?: string;
    affected_counties?: string[];
  }): Promise<Result<number, Error>> {
    try {
      // For count operations, prefer the database with more complete data
      if (this.config.priority === DatabasePriority.DRIZZLE_FIRST ||
          this.config.priority === DatabasePriority.DRIZZLE_ONLY) {
        return await this.drizzleRepo.count(criteria);
      }

      // Default to Drizzle
      return await this.drizzleRepo.count(criteria);

    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to count bills'));
    }
  }

}