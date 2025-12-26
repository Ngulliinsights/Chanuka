/**
 * Drizzle Sponsor Repository Implementation
 *
 * Concrete implementation of ISponsorRepository using Drizzle ORM
 * Provides data access operations for sponsors with proper error handling and Result types
 */

import type { ISponsorRepository } from '@server/domain/interfaces/sponsor-repository.interface';
import { databaseService } from '@server/infrastructure/database/database-service';
import {
  newSponsorSchema,
  sponsorSearchOptionsSchema,
  updateSponsorSchema,
  uuidParamSchema,
  validateRepositoryInput,
  validateSearchParams
} from '@server/infrastructure/validation/repository-validation';
import type { Maybe,Result } from '@shared/core';
import { Err, none,Ok, some } from '@shared/core';
import type { NewSponsor,Sponsor } from '@shared/schema';
import { sponsors } from '@shared/schema';
import { and, desc, eq, or, sql, SQLWrapper } from 'drizzle-orm';


export class DrizzleSponsorRepository implements ISponsorRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Private method to build common query conditions for sponsor filtering methods
   */
  private buildSponsorQueryConditions(
    baseCondition: SQLWrapper,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ) {
    const conditions = [baseCondition];

    if (options?.chamber) {
      conditions.push(eq(sponsors.chamber, options.chamber));
    }

    if (options?.is_active !== undefined) {
      conditions.push(eq(sponsors.is_active, options.is_active));
    }

    return this.db
      .select()
      .from(sponsors)
      .where(and(...conditions))
      .orderBy(desc(sponsors.created_at))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  /**
   * Private method to build common conditions for sponsor count queries
   */
  private buildSponsorCountConditions(criteria?: {
    party?: string;
    county?: string;
    chamber?: string;
    is_active?: boolean;
  }): SQLWrapper[] {
    const conditions: SQLWrapper[] = [];

    if (criteria?.party) {
      conditions.push(eq(sponsors.party, criteria.party));
    }

    if (criteria?.county) {
      conditions.push(eq(sponsors.county, criteria.county));
    }

    if (criteria?.chamber) {
      conditions.push(eq(sponsors.chamber, criteria.chamber));
    }

    if (criteria?.is_active !== undefined) {
      conditions.push(eq(sponsors.is_active, criteria.is_active));
    }

    return conditions;
  }

  /**
   * Private method to build search query for sponsors
   */
  private buildSponsorSearchQuery(
    searchTerm: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ) {
    const searchCondition = or(
      sql`${sponsors.name} ILIKE ${searchTerm}`,
      sql`${sponsors.constituency} ILIKE ${searchTerm}`,
      sql`${sponsors.party} ILIKE ${searchTerm}`
    );

    const conditions = [searchCondition];

    if (options?.chamber) {
      conditions.push(eq(sponsors.chamber, options.chamber));
    }

    if (options?.is_active !== undefined) {
      conditions.push(eq(sponsors.is_active, options.is_active));
    }

    return this.db
      .select()
      .from(sponsors)
      .where(and(...conditions))
      .orderBy(desc(sponsors.created_at))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async create(sponsor: NewSponsor): Promise<Result<Sponsor, Error>> {
    try {
      // Validate input data
      const validation = await validateRepositoryInput(newSponsorSchema, sponsor, 'sponsor creation');
      if (!validation.success) {
        return new Err(validation.error);
      }

      const result = await databaseService.withTransaction(async (tx: any) => {
        const [newSponsor] = await tx
          .insert(sponsors)
          .values(validation.data)
          .returning();

        return newSponsor;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create sponsor'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<Sponsor>, Error>> {
    try {
      const [sponsor] = await this.db
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, id))
        .limit(1);

      return new Ok(sponsor ? some(sponsor) : none);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find sponsor by ID'));
    }
  }

  async findByMpNumber(mpNumber: string): Promise<Result<Maybe<Sponsor>, Error>> {
    try {
      const [sponsor] = await this.db
        .select()
        .from(sponsors)
        .where(eq(sponsors.mp_number, mpNumber))
        .limit(1);

      return new Ok(sponsor ? some(sponsor) : none);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find sponsor by MP number'));
    }
  }

  async findByParty(
    party: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      const result = await this.buildSponsorQueryConditions(eq(sponsors.party, party), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find sponsors by party'));
    }
  }

  async findByCounty(
    county: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      const result = await this.buildSponsorQueryConditions(eq(sponsors.county, county), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find sponsors by county'));
    }
  }

  async findByChamber(
    chamber: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      const result = await this.buildSponsorQueryConditions(eq(sponsors.chamber, chamber), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find sponsors by chamber'));
    }
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      // Validate search parameters
      const searchValidation = await validateSearchParams(query, options, sponsorSearchOptionsSchema);
      if (!searchValidation.success) {
        return new Err(searchValidation.error);
      }

      const searchTerm = `%${searchValidation.query.toLowerCase()}%`;
      const result = await this.buildSponsorSearchQuery(searchTerm, searchValidation.options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to search sponsors'));
    }
  }

  async findActive(options?: {
    limit?: number;
    offset?: number;
    chamber?: string;
  }): Promise<Result<Sponsor[], Error>> {
    try {
      const result = await this.buildSponsorQueryConditions(eq(sponsors.is_active, true), options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find active sponsors'));
    }
  }

  async update(id: string, updates: Partial<NewSponsor>): Promise<Result<Sponsor, Error>> {
    try {
      // Validate ID parameter
      const idValidation = await validateRepositoryInput(uuidParamSchema, id, 'sponsor ID');
      if (!idValidation.success) {
        return new Err(idValidation.error);
      }

      // Validate update data
      const updateValidation = await validateRepositoryInput(updateSponsorSchema, updates, 'sponsor update');
      if (!updateValidation.success) {
        return new Err(updateValidation.error);
      }

      const result = await databaseService.withTransaction(async (tx: any) => {
        const [updatedSponsor] = await tx
          .update(sponsors)
          .set({
            ...updateValidation.data,
            updated_at: new Date()
          })
          .where(eq(sponsors.id, idValidation.data))
          .returning();

        if (!updatedSponsor) {
          throw new Error('Sponsor not found');
        }

        return updatedSponsor;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update sponsor'));
    }
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      voting_record?: Record<string, unknown>;
      attendance_rate?: number;
      last_disclosure_date?: Date;
    }
  ): Promise<Result<void, Error>> {
    try {
      await databaseService.withTransaction(async (tx: any) => {
        await tx
          .update(sponsors)
          .set({
            ...metrics,
            updated_at: new Date()
          })
          .where(eq(sponsors.id, id));
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update performance metrics'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      await databaseService.withTransaction(async (tx: unknown) => {
        await tx
          .delete(sponsors)
          .where(eq(sponsors.id, id));
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete sponsor'));
    }
  }

  async count(criteria?: {
    party?: string;
    county?: string;
    chamber?: string;
    is_active?: boolean;
  }): Promise<Result<number, Error>> {
    try {
      const conditions = this.buildSponsorCountConditions(criteria);

      const query = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sponsors);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      const [result] = await query;
      return new Ok(Number(result.count));
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to count sponsors'));
    }
  }
}