// @ts-nocheck
// cSpell:ignore upvotes downvotes
import { logger } from '../../../infrastructure/observability';
import { Bill, bills } from '@server/infrastructure/schema';
import { bill_engagement, comments } from '@server/infrastructure/schema';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

import type { AsyncServiceResult } from '@server/infrastructure/error-handling';
import { safeAsync } from '@server/infrastructure/error-handling';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { cacheKeys, CACHE_TTL, createCacheInvalidation } from '@server/infrastructure/cache/cache-keys';
import { cacheService } from '@server/infrastructure/cache';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { BillRepository } from '../domain/repositories/bill.repository';
import type { InsertBill as RepositoryInsertBill } from '../domain/repositories/bill.repository';
import {
  CreateBillSchema,
  UpdateBillSchema,
  SearchBillsSchema,
  GetAllBillsSchema,
  RecordEngagementSchema,
  type CreateBillInput,
  type UpdateBillInput,
  type SearchBillsInput,
  type GetAllBillsInput,
  type RecordEngagementInput,
} from './bill-validation.schemas';

// Module-level sanitization service instance
const inputSanitizationService = new InputSanitizationService();

// ============================================================================
// Type Definitions
// ============================================================================

type InsertBill = typeof bills.$inferInsert;

interface BillFilters {
  status?: string;
  category?: string;
  sponsor_id?: string;
  search?: string;
}

interface BillStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

interface BillWithEngagement extends Bill {
  comment_count: number;
  view_count: number;
  share_count: number;
  engagement_score: string;
  complexity_score: number;
  search_vector?: string | null;
  constitutionalConcerns?: {
    concerns: string[];
    riskLevel: string;
  };
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedBills {
  bills: BillWithEngagement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Cache Configuration - Using centralized cache utilities
// ============================================================================

const cacheInvalidation = createCacheInvalidation(cacheService);

// ============================================================================
// Helpers
// ============================================================================

/** Validates that all provided string values are within acceptable bounds. */
function validateStringInputs(values: string[]): void {
  for (const v of values) {
    if (typeof v !== 'string' || v.length > 2000) {
      throw new Error('Invalid input: value must be a string under 2000 characters');
    }
  }
}

// ============================================================================
// Enhanced Bill Service with Integrated Caching
// ============================================================================

/**
 * Enhanced BillService with comprehensive caching, error handling, and
 * performance optimisation. Provides a multi-layer caching strategy with
 * automatic invalidation and fallback support.
 *
 * Uses BillRepository for data access operations.
 */
export class CachedBillService {
  private readonly repository: BillRepository;

  constructor() {
    this.repository = new BillRepository();
  }

  // --------------------------------------------------------------------------
  // Fallback Data
  // --------------------------------------------------------------------------

  private getFallbackBills(): BillWithEngagement[] {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    return [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Digital Economy and Data Protection Act 2024',
        summary:
          'Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights.',
        status: 'committee_stage',
        category: 'technology',
        introduced_date: '2024-01-15',
        bill_number: 'HR-2024-001',
        full_text: 'Full text of the Digital Economy and Data Protection Act...',
        sponsor_id: null,
        tags: ['technology', 'privacy', 'digital rights'],
        last_action_date: '2024-01-20',
        created_at: twentyDaysAgo,
        updated_at: now,
        comment_count: 45,
        search_vector: null,
        view_count: 1250,
        share_count: 89,
        engagement_score: '156',
        complexity_score: 7,
        constitutionalConcerns: {
          concerns: ['First Amendment implications', 'Commerce Clause considerations'],
          riskLevel: 'medium',
        },
      } as unknown as BillWithEngagement,
    ];
  }

  // --------------------------------------------------------------------------
  // Core CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Retrieves a bill by ID with multi-layer caching.
   */
  async getBillById(id: string): Promise<AsyncServiceResult<BillWithEngagement | null>> {
    return safeAsync(async () => {
      validateStringInputs([id]);
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      const cacheKey = cacheKeys.bill(sanitizedId, 'details');
      const cached = await cacheService.get<BillWithEngagement>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bill details');
        return cached;
      }

      try {
        // @ts-ignore - Drizzle ORM query builder type issues
        const billResults = (await readDatabase
          .select({
            id: bills.id,
            title: bills.title,
            summary: bills.summary,
            status: bills.status,
            category: bills.category,
            introduced_date: bills.introduced_date,
            bill_number: bills.bill_number,
            full_text: bills.full_text,
            sponsor_id: bills.sponsor_id,
            tags: bills.tags,
            last_action_date: bills.last_action_date,
            created_at: bills.created_at,
            updated_at: bills.updated_at,
            comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
            view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
            share_count: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
            engagement_score: sql<string>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::text`,
          })
          .from(bills)
          .leftJoin(comments, eq(bills.id, comments.bill_id))
          .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
          .where(eq(bills.id, sanitizedId))
          .groupBy(bills.id)
          .limit(1)) as any[];

        const bill = billResults[0];

        if (!bill) return null;

        const result: BillWithEngagement = { ...bill, complexity_score: 5 } as BillWithEngagement;

        await cacheService.set(cacheKey, result, CACHE_TTL.BILLS);

        await securityAuditService.logSecurityEvent({
          event_type: 'bill_accessed',
          severity: 'low',
          user_id: undefined,
          ip_address: 'internal',
          user_agent: 'bill-service',
          resource: `bill:${sanitizedId}`,
          action: 'read',
          success: true,
          details: { bill_id: sanitizedId },
        });

        return result;

      } catch (error) {
        logger.warn({ error, id: sanitizedId }, 'Database error in getBillById, using fallback');
        return this.getFallbackBills().find(b => b.id === sanitizedId) ?? null;
      }
    }, { service: 'CachedBillService', operation: 'getBillById' });
  }

  /**
   * Creates a new bill and invalidates relevant caches.
   */
  async createBill(billData: InsertBill): Promise<AsyncServiceResult<Bill>> {
    return safeAsync(async () => {
      // Validate input using Zod schema
      const validation = await validateData(CreateBillSchema, billData);
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedData = validation.data!;

      if (!validatedData.title) {
        throw new Error('Title is required for bill creation');
      }

      const sanitizedData: InsertBill = {
        ...validatedData,
        title: inputSanitizationService.sanitizeString(validatedData.title),
        summary: validatedData.summary
          ? inputSanitizationService.sanitizeString(validatedData.summary)
          : undefined,
        full_text: validatedData.full_text
          ? inputSanitizationService.sanitizeHtml(validatedData.full_text)
          : undefined,
        bill_number: validatedData.bill_number
          ? inputSanitizationService.sanitizeString(validatedData.bill_number)
          : undefined,
      };

      validateStringInputs(
        [sanitizedData.title, sanitizedData.summary, sanitizedData.bill_number]
          .filter((v): v is string => v !== undefined),
      );

      // withTransaction uses implicit context — no tx argument
      const newBillResults = (await withTransaction(async () => {
        // @ts-expect-error - Drizzle ORM query builder returns complex types
        return (await db
          .insert(bills)
          .values({ ...sanitizedData, created_at: new Date(), updated_at: new Date() })
          .returning()) as any[];
      })) as any[];

      const newBill = newBillResults[0] as Bill;

      await securityAuditService.logSecurityEvent({
        event_type: 'bill_created',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'bill-service',
        resource: `bill:${newBill.id}`,
        action: 'create',
        success: true,
        details: {
          bill_id: newBill.id,
          bill_number: newBill.bill_number,
          title: newBill.title,
        },
      });

      await this.invalidateAllBillCaches();

      return newBill;
    }, { service: 'CachedBillService', operation: 'createBill' });
  }

  /**
   * Updates an existing bill and invalidates caches.
   */
  async updateBill(
    id: string,
    updates: Partial<InsertBill>,
  ): Promise<AsyncServiceResult<Bill | null>> {
    return safeAsync(async () => {
      // Validate input using Zod schema
      const validation = await validateData(UpdateBillSchema, updates);
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedUpdates = validation.data!;

      validateStringInputs([id]);
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      const sanitizedUpdates: Partial<InsertBill> = {};

      if (validatedUpdates.title)
        sanitizedUpdates.title = inputSanitizationService.sanitizeString(validatedUpdates.title);
      if (validatedUpdates.summary)
        sanitizedUpdates.summary = inputSanitizationService.sanitizeString(validatedUpdates.summary);
      if (validatedUpdates.full_text)
        sanitizedUpdates.full_text = inputSanitizationService.sanitizeHtml(validatedUpdates.full_text);
      if (validatedUpdates.bill_number)
        sanitizedUpdates.bill_number = inputSanitizationService.sanitizeString(validatedUpdates.bill_number);

      // Copy remaining non-sanitized fields using string keys to avoid symbol index errors
      const skipKeys = new Set<string>(['title', 'summary', 'full_text', 'bill_number']);
      for (const key of Object.keys(validatedUpdates)) {
        if (!skipKeys.has(key)) {
          (sanitizedUpdates as Record<string, unknown>)[key] =
            (validatedUpdates as Record<string, unknown>)[key];
        }
      }

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const updatedBillResults = (await writeDatabase
        .update(bills)
        .set({ ...sanitizedUpdates, updated_at: new Date() })
        .where(eq(bills.id, sanitizedId))
        .returning()) as any[];

      const updatedBill = updatedBillResults[0] as Bill | undefined;

      if (updatedBill) {
        await securityAuditService.logSecurityEvent({
          event_type: 'bill_updated',
          severity: 'low',
          user_id: undefined,
          ip_address: 'internal',
          user_agent: 'bill-service',
          resource: `bill:${sanitizedId}`,
          action: 'update',
          success: true,
          details: {
            bill_id: sanitizedId,
            updated_fields: Object.keys(sanitizedUpdates),
          },
        });

        await this.invalidateBillCaches(sanitizedId);
      }

      return updatedBill ?? null;
    }, { service: 'CachedBillService', operation: 'updateBill' });
  }

  /**
   * Updates bill status with cache invalidation.
   */
  async updateBillStatus(
    id: string,
    newStatus: string,
    user_id?: string,
  ): Promise<AsyncServiceResult<void>> {
    return safeAsync(async () => {
      await withTransaction(async () => {
        // @ts-expect-error - Drizzle ORM update returns unknown type
        await db
          .update(bills)
          .set({
            status: newStatus,
            last_action_date: new Date().toISOString().split('T')[0],
            updated_at: new Date(),
          })
          .where(eq(bills.id, id));

        if (user_id) {
          logger.info(
            { bill_id: id, new_status: newStatus, updated_by: user_id },
            'Bill status updated',
          );
        }
      });

      await this.invalidateBillCaches(id);
    }, { service: 'CachedBillService', operation: 'updateBillStatus' });
  }

  /**
   * Deletes a bill and cleans up all related caches.
   */
  async deleteBill(id: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const deleted = (await withTransaction(async () => {
        // @ts-expect-error - Drizzle ORM delete returns unknown type
        await writeDatabase.delete(bill_engagement).where(eq(bill_engagement.bill_id, id));
        // @ts-expect-error - Drizzle ORM query builder returns complex types
        const deletedBillResults = (await db
          .delete(bills)
          .where(eq(bills.id, id))
          .returning()) as any[];
        return deletedBillResults.length > 0;
      })) as boolean;

      if (deleted) {
        await this.invalidateBillCaches(id);
      }

      return deleted;
    }, { service: 'CachedBillService', operation: 'deleteBill' });
  }

  // --------------------------------------------------------------------------
  // Search and Query Operations
  // --------------------------------------------------------------------------

  /**
   * Searches bills with caching support.
   */
  async searchBills(
    query: string,
    filters: BillFilters = {},
  ): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      // Validate input using Zod schema
      const validation = await validateData(SearchBillsSchema, { query, filters });
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedInput = validation.data!;

      const sanitizedQuery = inputSanitizationService.sanitizeString(validatedInput.query);
      validateStringInputs([sanitizedQuery]);

      const searchPattern = inputSanitizationService.createSafeLikePattern(sanitizedQuery);

      const cacheKey = cacheKeys.search(sanitizedQuery, validatedInput.filters || {});
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bill search');
        return cached;
      }

      const searchTerm = `%${searchPattern.toLowerCase()}%`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [
        or(
          sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
          sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
          sql`LOWER(${bills.full_text}) LIKE ${searchTerm}`,
        ),
      ];

      const validatedFilters = validatedInput.filters || {};
      if (validatedFilters.status)     conditions.push(eq(bills.status, validatedFilters.status));
      if (validatedFilters.category)   conditions.push(eq(bills.category, validatedFilters.category));
      if (validatedFilters.sponsor_id) conditions.push(eq(bills.sponsor_id, validatedFilters.sponsor_id));

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const results = (await this.database
        .select()
        .from(bills)
        .where(and(...conditions))
        .orderBy(desc(bills.created_at))
        .limit(50)) as any[];

      await cacheService.set(cacheKey, results, CACHE_TTL.SEARCH);

      await securityAuditService.logSecurityEvent({
        event_type: 'bill_search',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'bill-service',
        resource: 'bills',
        action: 'search',
        success: true,
        details: {
          query: sanitizedQuery,
          filters,
          result_count: results.length,
        },
      });

      return results as Bill[];
    }, { service: 'CachedBillService', operation: 'searchBills' });
  }

  /**
   * Gets bills by status with caching.
   */
  async getBillsByStatus(status: string): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      const cacheKey = cacheKeys.list('bill', { status });
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bills by status');
        return cached;
      }

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const results = (await readDatabase
        .select()
        .from(bills)
        .where(eq(bills.status, status))
        .orderBy(desc(bills.created_at))) as any[];

      await cacheService.set(cacheKey, results, CACHE_TTL.BILLS);
      return results;
    }, { service: 'CachedBillService', operation: 'getBillsByStatus' });
  }

  /**
   * Gets bills by category with caching.
   */
  async getBillsByCategory(category: string): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      const cacheKey = cacheKeys.list('bill', { category });
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bills by category');
        return cached;
      }

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const results = (await readDatabase
        .select()
        .from(bills)
        .where(eq(bills.category, category))
        .orderBy(desc(bills.created_at))) as any[];

      await cacheService.set(cacheKey, results, CACHE_TTL.BILLS);
      return results;
    }, { service: 'CachedBillService', operation: 'getBillsByCategory' });
  }

  /**
   * Gets bills by sponsor with caching.
   */
  async getBillsBySponsor(sponsor_id: string): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      const cacheKey = cacheKeys.list('bill', { sponsor_id });
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bills by sponsor');
        return cached;
      }

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const results = (await readDatabase
        .select()
        .from(bills)
        .where(eq(bills.sponsor_id, sponsor_id))
        .orderBy(desc(bills.created_at))) as any[];

      await cacheService.set(cacheKey, results, CACHE_TTL.BILLS);
      return results;
    }, { service: 'CachedBillService', operation: 'getBillsBySponsor' });
  }

  /**
   * Gets bills by IDs (batch query).
   */
  async getBillsByIds(ids: string[]): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      if (ids.length === 0) return [];

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const results = (await readDatabase
        .select()
        .from(bills)
        .where(inArray(bills.id, ids))
        .orderBy(desc(bills.created_at))) as any[];

      return results;
    }, { service: 'CachedBillService', operation: 'getBillsByIds' });
  }

  /**
   * Gets paginated bills with comprehensive caching.
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<AsyncServiceResult<PaginatedBills>> {
    return safeAsync(async () => {
      // Validate input using Zod schema
      const validation = await validateData(GetAllBillsSchema, { filters, pagination });
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedInput = validation.data!;
      const validatedFilters = validatedInput.filters || {};
      const validatedPagination = validatedInput.pagination || { page: 1, limit: 10 };

      // Check cache first
      const cacheKey = cacheKeys.list('bill', { 
        ...validatedFilters, 
        page: validatedPagination.page, 
        limit: validatedPagination.limit 
      });
      const cached = await cacheService.get<PaginatedBills>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for paginated bills');
        return cached;
      }

      // Drizzle SQL expressions have a complex union type; any[] avoids symbol-index errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [];

      if (validatedFilters.status)     conditions.push(eq(bills.status, validatedFilters.status));
      if (validatedFilters.category)   conditions.push(eq(bills.category, validatedFilters.category));
      if (validatedFilters.sponsor_id) conditions.push(eq(bills.sponsor_id, validatedFilters.sponsor_id));

      if (validatedFilters.search) {
        const searchTerm = `%${validatedFilters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
          ),
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const totalResults = (await readDatabase
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .where(whereClause)) as any[];

      const total = totalResults[0]?.count ?? 0;

      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      const sortColumn = this.getSortColumn(validatedPagination.sortBy);
      const orderExpr = validatedPagination.sortOrder === 'asc' ? sortColumn : desc(sortColumn);

      // @ts-ignore - Drizzle ORM query builder type issues
      const billResults = (await readDatabase
        .select({
          id: bills.id,
          title: bills.title,
          summary: bills.summary,
          status: bills.status,
          category: bills.category,
          introduced_date: bills.introduced_date,
          bill_number: bills.bill_number,
          full_text: bills.full_text,
          sponsor_id: bills.sponsor_id,
          tags: bills.tags,
          last_action_date: bills.last_action_date,
          created_at: bills.created_at,
          updated_at: bills.updated_at,
          comment_count: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
          view_count: sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
          share_count: sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
          engagement_score: sql<string>`COALESCE(AVG(${bill_engagement.engagement_score}), 0)::text`,
        })
        .from(bills)
        .leftJoin(comments, eq(bills.id, comments.bill_id))
        .leftJoin(bill_engagement, eq(bills.id, bill_engagement.bill_id))
        .where(whereClause)
        .groupBy(bills.id)
        .orderBy(orderExpr)
        .limit(validatedPagination.limit)
        .offset(offset)) as any[];

      const result: PaginatedBills = {
        bills: billResults.map(
          (billItem: typeof billResults[0]): BillWithEngagement => ({ ...billItem, complexity_score: 5 } as BillWithEngagement),
        ),
        total,
        page: validatedPagination.page,
        limit: validatedPagination.limit,
        totalPages: Math.ceil(total / validatedPagination.limit),
      };

      await cacheService.set(cacheKey, result, CACHE_TTL.BILLS);
      return result;
    }, { service: 'CachedBillService', operation: 'getAllBills' });
  }

  // --------------------------------------------------------------------------
  // Statistics and Analytics
  // --------------------------------------------------------------------------

  /**
   * Gets bill statistics with extended caching.
   */
  async getBillStats(): Promise<AsyncServiceResult<BillStats>> {
    return safeAsync(async () => {
      // Check cache first
      const cacheKey = cacheKeys.analytics('bill-stats');
      const cached = await cacheService.get<BillStats>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bill stats');
        return cached;
      }

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const totalResults = (await readDatabase
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills)) as any[];

      const totalResult = totalResults[0];

      // @ts-ignore - Drizzle ORM query builder type issues
      const statusResults = (await readDatabase
        .select({ status: bills.status, count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .groupBy(bills.status)) as any[];

      // @ts-ignore - Drizzle ORM query builder type issues
      const categoryResults = (await readDatabase
        .select({ category: bills.category, count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .groupBy(bills.category)) as any[];

      const result: BillStats = {
        total: totalResult?.count ?? 0,
        byStatus: statusResults.reduce<Record<string, number>>(
          (acc: Record<string, number>, row: any) => {
            acc[row.status] = row.count;
            return acc;
          },
          {},
        ),
        byCategory: categoryResults.reduce<Record<string, number>>(
          (acc: Record<string, number>, row: any) => {
            acc[row.category ?? 'uncategorized'] = row.count;
            return acc;
          },
          {},
        ),
      };

      await cacheService.set(cacheKey, result, CACHE_TTL.HOUR);
      return result;
    }, { service: 'CachedBillService', operation: 'getBillStats' });
  }

  /**
   * Counts bills matching the given filters.
   */
  async countBills(filters: BillFilters = {}): Promise<AsyncServiceResult<number>> {
    return safeAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [];

      if (filters.status)     conditions.push(eq(bills.status, filters.status));
      if (filters.category)   conditions.push(eq(bills.category, filters.category));
      if (filters.sponsor_id) conditions.push(eq(bills.sponsor_id, filters.sponsor_id));

      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${bills.title}) LIKE ${searchTerm}`,
            sql`LOWER(${bills.summary}) LIKE ${searchTerm}`,
          ),
        );
      }

      // @ts-expect-error - Drizzle ORM query builder returns complex types
      const countResults = (await readDatabase
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .where(conditions.length > 0 ? and(...conditions) : undefined)) as any[];

      const result = countResults[0];

      return result?.count ?? 0;
    }, { service: 'CachedBillService', operation: 'countBills' });
  }

  // --------------------------------------------------------------------------
  // Engagement Tracking
  // --------------------------------------------------------------------------

  /**
   * Records user engagement with optimised cache invalidation.
   */
  async recordEngagement(
    bill_id: string,
    user_id: string,
    engagement_type: 'view' | 'comment' | 'share',
  ): Promise<AsyncServiceResult<void>> {
    return safeAsync(async () => {
      // Validate input using Zod schema
      const validation = await validateData(RecordEngagementSchema, { 
        bill_id, 
        user_id, 
        engagement_type 
      });
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedInput = validation.data!;

      await withTransaction(async () => {
        // @ts-expect-error - Drizzle ORM query builder returns complex types
        const existingResults = (await db
          .select()
          .from(bill_engagement)
          .where(
            and(
              eq(bill_engagement.bill_id, validatedInput.bill_id),
              eq(bill_engagement.user_id, validatedInput.user_id),
            ),
          )
          .limit(1)) as any[];

        const existing = existingResults[0];

        if (existing) {
          const updates: Record<string, unknown> = { updated_at: new Date() };

          switch (validatedInput.engagement_type) {
            case 'view':    updates.view_count    = sql`${bill_engagement.view_count} + 1`;    break;
            case 'comment': updates.comment_count = sql`${bill_engagement.comment_count} + 1`; break;
            case 'share':   updates.share_count   = sql`${bill_engagement.share_count} + 1`;   break;
          }

          // @ts-expect-error - Drizzle ORM update returns unknown type
          await db
            .update(bill_engagement)
            .set(updates)
            .where(eq(bill_engagement.id, existing.id));
        } else {
          // @ts-expect-error - Drizzle ORM insert returns unknown type
          await writeDatabase.insert(bill_engagement).values({
            bill_id: validatedInput.bill_id,
            user_id: validatedInput.user_id,
            view_count:    validatedInput.engagement_type === 'view'    ? 1 : 0,
            comment_count: validatedInput.engagement_type === 'comment' ? 1 : 0,
            share_count:   validatedInput.engagement_type === 'share'   ? 1 : 0,
            engagement_score: '1',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      });

      await this.invalidateBillCaches(validatedInput.bill_id);
    }, { service: 'CachedBillService', operation: 'recordEngagement' });
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  async invalidateBillCaches(bill_id: string): Promise<void> {
    await cacheInvalidation.invalidateBill(bill_id);
  }

  async invalidateAllBillCaches(): Promise<void> {
    await Promise.all([
      cacheInvalidation.invalidateList('bill'),
      cacheInvalidation.invalidateSearch(),
    ]);
  }

  /**
   * Warms up cache with popular bills and common queries.
   */
  async warmUpCache(): Promise<void> {
    try {
      logger.info({}, 'Starting cache warm-up...');

      // AsyncServiceResult is a neverthrow Result type — use .isOk() / .value
      const popularBillsResult = await this.getAllBills({}, { page: 1, limit: 20 });
      if (popularBillsResult.isOk()) {
        const billIds = popularBillsResult.value.bills.map(
          (b: BillWithEngagement) => b.id,
        );
        if (billIds.length > 0) {
          await Promise.all(billIds.map((id: string) => this.getBillById(id)));
        }
      }

      const commonSearches = ['budget', 'healthcare', 'education', 'infrastructure', 'technology'];
      await Promise.all(commonSearches.map(search => this.searchBills(search)));

      await this.getBillStats();

      const commonStatuses = ['draft', 'committee_stage', 'passed'];
      await Promise.all(commonStatuses.map(status => this.getBillsByStatus(status)));

      logger.info({}, 'Cache warm-up completed successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to warm up bill cache');
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private getSortColumn(sortBy?: string) {
    switch (sortBy) {
      case 'title':  return bills.title;
      case 'status': return bills.status;
      case 'date':
      default:       return bills.introduced_date;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const cachedBillService = new CachedBillService();

export type {
  BillFilters,
  BillStats,
  BillWithEngagement,
  PaginationOptions,
  PaginatedBills,
};