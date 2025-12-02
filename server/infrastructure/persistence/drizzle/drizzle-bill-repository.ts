/**
 * Drizzle Bill Repository Implementation
 *
 * Concrete implementation of IBillRepository using Drizzle ORM
 * Provides data access operations for bills with proper error handling and Result types
 */

import type { Result, Maybe } from '@shared/core';
import { Ok, Err, some, none } from '@shared/core';
import type { Bill, NewBill } from '@shared/schema';
import { bills } from '@shared/schema';
import { eq, and, desc, inArray, sql, or, SQLWrapper } from 'drizzle-orm';

import type { IBillRepository } from '@server/domain/interfaces/bill-repository.interface';
import { databaseService } from '@server/infrastructure/database/database-service';
import {
  newBillSchema,
  updateBillSchema,
  billSearchOptionsSchema,
  uuidParamSchema,
  validateRepositoryInput,
  validateSearchParams
} from '@server/infrastructure/validation/repository-validation';

export class DrizzleBillRepository implements IBillRepository {
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Private method to build common query conditions for bill filtering methods
   */
  private buildBillQueryConditions(
    baseCondition: SQLWrapper,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      chamber?: string;
    }
  ) {
    const conditions = [baseCondition];

    if (options?.status) {
      conditions.push(eq(bills.status, options.status));
    }

    if (options?.chamber) {
      conditions.push(eq(bills.chamber, options.chamber));
    }

    return this.db
      .select()
      .from(bills)
      .where(and(...conditions))
      .orderBy(desc(bills.created_at))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  /**
   * Private method to build common conditions for bill count queries
   */
  private buildBillCountConditions(criteria?: {
    status?: string;
    sponsor_id?: string;
    chamber?: string;
    affected_counties?: string[];
  }): SQLWrapper[] {
    const conditions: SQLWrapper[] = [];

    if (criteria?.status) {
      conditions.push(eq(bills.status, criteria.status));
    }

    if (criteria?.sponsor_id) {
      conditions.push(eq(bills.sponsor_id, criteria.sponsor_id));
    }

    if (criteria?.chamber) {
      conditions.push(eq(bills.chamber, criteria.chamber));
    }

    if (criteria?.affected_counties?.length) {
      conditions.push(inArray(bills.affected_counties, criteria.affected_counties));
    }

    return conditions;
  }

  /**
   * Private method to build search query for bills
   */
  private buildBillSearchQuery(
    searchTerm: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      chamber?: string;
    }
  ) {
    const searchCondition = or(
      sql`${bills.title} ILIKE ${searchTerm}`,
      sql`${bills.summary} ILIKE ${searchTerm}`,
      sql`${bills.bill_number} ILIKE ${searchTerm}`
    );

    const conditions = [searchCondition];

    if (options?.status) {
      conditions.push(eq(bills.status, options.status));
    }

    if (options?.chamber) {
      conditions.push(eq(bills.chamber, options.chamber));
    }

    return this.db
      .select()
      .from(bills)
      .where(and(...conditions))
      .orderBy(desc(bills.created_at))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async create(bill: NewBill): Promise<Result<Bill, Error>> {
    try {
      // Validate input data
      const validation = await validateRepositoryInput(newBillSchema, bill, 'bill creation');
      if (!validation.success) {
        return new Err(validation.error);
      }

      const result = await databaseService.withTransaction(async (tx: any) => {
        const [newBill] = await tx
          .insert(bills)
          .values(validation.data)
          .returning();

        return newBill;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create bill'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      const [bill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.id, id))
        .limit(1);

      return new Ok(bill ? some(bill) : none);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to find bill by ID'));
    }
  }

  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      const [bill] = await this.db
        .select()
        .from(bills)
        .where(eq(bills.bill_number, billNumber))
        .limit(1);

      return new Ok(bill ? some(bill) : none);
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
      const result = await this.buildBillQueryConditions(eq(bills.sponsor_id, sponsor_id), options);
      return new Ok(result);
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
      const result = await this.buildBillQueryConditions(eq(bills.status, status), options);
      return new Ok(result);
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
      const result = await this.buildBillQueryConditions(inArray(bills.affected_counties, counties), options);
      return new Ok(result);
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
      // Validate search parameters
      const searchValidation = await validateSearchParams(query, options, billSearchOptionsSchema);
      if (!searchValidation.success) {
        return new Err(searchValidation.error);
      }

      const searchTerm = `%${searchValidation.query.toLowerCase()}%`;
      const result = await this.buildBillSearchQuery(searchTerm, searchValidation.options);
      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to search bills'));
    }
  }

  async update(id: string, updates: Partial<NewBill>): Promise<Result<Bill, Error>> {
    try {
      // Validate ID parameter
      const idValidation = await validateRepositoryInput(uuidParamSchema, id, 'bill ID');
      if (!idValidation.success) {
        return new Err(idValidation.error);
      }

      // Validate update data
      const updateValidation = await validateRepositoryInput(updateBillSchema, updates, 'bill update');
      if (!updateValidation.success) {
        return new Err(updateValidation.error);
      }

      const result = await databaseService.withTransaction(async (tx: any) => {
        const [updatedBill] = await tx
          .update(bills)
          .set({
            ...updateValidation.data,
            updated_at: new Date()
          })
          .where(eq(bills.id, idValidation.data))
          .returning();

        if (!updatedBill) {
          throw new Error('Bill not found');
        }

        return updatedBill;
      });

      return new Ok(result);
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
      await databaseService.withTransaction(async (tx: any) => {
        await tx
          .update(bills)
          .set({
            ...metrics,
            updated_at: new Date()
          })
          .where(eq(bills.id, id));
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update engagement metrics'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      await databaseService.withTransaction(async (tx: unknown) => {
        await tx
          .delete(bills)
          .where(eq(bills.id, id));
      });

      return new Ok(undefined);
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
      const conditions = this.buildBillCountConditions(criteria);

      const query = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bills);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      const [result] = await query;
      return new Ok(Number(result.count));
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to count bills'));
    }
  }

  async createBatch(bills: NewBill[]): Promise<Result<Bill[], Error>> {
    try {
      if (!bills.length) {
        return new Ok([]);
      }

      // Validate all input data
      const validations = await Promise.all(
        bills.map((bill, index) =>
          validateRepositoryInput(newBillSchema, bill, `bill creation at index ${index}`)
        )
      );

      const validationErrors = validations.filter(v => !v.success);
      if (validationErrors.length > 0) {
        return new Err(new Error(`Validation failed for ${validationErrors.length} bills`));
      }

      const result = await databaseService.withTransaction(async (tx: any) => {
        const newBills = await tx
          .insert(bills)
          .values(validations.map(v => v.data))
          .returning();

        return newBills;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to create bills in batch'));
    }
  }

  async updateBatch(updates: Array<{ id: string; data: Partial<NewBill> }>): Promise<Result<Bill[], Error>> {
    try {
      if (!updates.length) {
        return new Ok([]);
      }

      // Validate all IDs and update data
      const validations = await Promise.all(
        updates.map(async (update, index) => {
          const idValidation = await validateRepositoryInput(uuidParamSchema, update.id, `bill ID at index ${index}`);
          const dataValidation = await validateRepositoryInput(updateBillSchema, update.data, `bill update at index ${index}`);

          return {
            id: idValidation.success ? idValidation.data : null,
            data: dataValidation.success ? dataValidation.data : null,
            idError: idValidation.success ? null : idValidation.error,
            dataError: dataValidation.success ? null : dataValidation.error
          };
        })
      );

      const validationErrors = validations.filter(v => v.idError || v.dataError);
      if (validationErrors.length > 0) {
        return new Err(new Error(`Validation failed for ${validationErrors.length} updates`));
      }

      const result = await databaseService.withTransaction(async (tx: any) => {
        const updatedBills: Bill[] = [];

        // Process updates individually to handle potential conflicts
        for (const validation of validations) {
          if (!validation.id || !validation.data) continue;

          const [updatedBill] = await tx
            .update(bills)
            .set({
              ...validation.data,
              updated_at: new Date()
            })
            .where(eq(bills.id, validation.id))
            .returning();

          if (updatedBill) {
            updatedBills.push(updatedBill);
          }
        }

        return updatedBills;
      });

      return new Ok(result);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to update bills in batch'));
    }
  }

  async deleteBatch(ids: string[]): Promise<Result<void, Error>> {
    try {
      if (!ids.length) {
        return new Ok(undefined);
      }

      // Validate all IDs
      const validations = await Promise.all(
        ids.map((id, index) =>
          validateRepositoryInput(uuidParamSchema, id, `bill ID at index ${index}`)
        )
      );

      const validationErrors = validations.filter(v => !v.success);
      if (validationErrors.length > 0) {
        return new Err(new Error(`Validation failed for ${validationErrors.length} bill IDs`));
      }

      await databaseService.withTransaction(async (tx: any) => {
        await tx
          .delete(bills)
          .where(inArray(bills.id, validations.map(v => v.data)));
      });

      return new Ok(undefined);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error('Failed to delete bills in batch'));
    }
  }
}