import { logger } from '@server/infrastructure/observability';
import { Bill, bills } from '@server/infrastructure/schema';
import { bill_engagement, comments } from '@server/infrastructure/schema';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

import type { AsyncServiceResult } from '@server/infrastructure/error-handling';
import { safeAsync } from '@server/infrastructure/error-handling';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { cacheKeys, CACHE_TTL, createCacheInvalidation } from '@server/infrastructure/cache/cache-keys';
import { cacheService } from '@server/infrastructure/cache';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { db } from '@server/infrastructure/database';
import {
  CreateBillSchema,
  UpdateBillSchema,
  SearchBillsSchema,
  GetAllBillsSchema,
  RecordEngagementSchema,
} from './bill-validation.schemas';
import { billLifecycleHooks } from './bill-lifecycle-hooks';
import { getBillDataSource } from '../infrastructure/data-sources/bill-data-source-factory';

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

// Typed aliases that bypass Drizzle's overly-strict projection overload.
// All actual query safety is enforced at the SQL/schema layer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = readDatabase as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wdb = writeDatabase as any;

// ============================================================================
// Enhanced Bill Service with Integrated Caching
// ============================================================================

/**
 * Enhanced BillService with comprehensive caching, error handling, and
 * performance optimisation. Provides a multi-layer caching strategy with
 * automatic invalidation and fallback support.
 */
export class CachedBillService {

  // --------------------------------------------------------------------------
  // Core CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Retrieves a bill by ID with multi-layer caching and intelligent data source selection.
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
        // Use intelligent data source (database with mock fallback)
        const dataSource = await getBillDataSource();
        const bill = await dataSource.findById(sanitizedId);

        if (!bill) return null;

        const result: BillWithEngagement = bill as BillWithEngagement;

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
          details: { 
            bill_id: sanitizedId,
            data_source: dataSource.getStatus().type,
          },
        });

        return result;

      } catch (error) {
        logger.error({ 
          error, 
          id: sanitizedId,
          operation: 'getBillById' 
        }, 'Failed to retrieve bill - no fallback available');
        
        // Don't return fake data - let the error propagate
        throw new Error(`Failed to retrieve bill ${sanitizedId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, { service: 'CachedBillService', operation: 'getBillById' });
  }

  /**
   * Creates a new bill and invalidates relevant caches.
   */
  async createBill(billData: InsertBill): Promise<AsyncServiceResult<Bill>> {
    return safeAsync(async () => {
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

      const newBillResults = (await withTransaction(async (tx: any) => {
        return (await tx
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

      billLifecycleHooks.onBillCreated(newBill).catch(error => {
        logger.warn({ error, billId: newBill.id }, 'Bill creation hook failed (non-blocking)');
      });

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

      const skipKeys = new Set<string>(['title', 'summary', 'full_text', 'bill_number']);
      for (const key of Object.keys(validatedUpdates)) {
        if (!skipKeys.has(key)) {
          (sanitizedUpdates as Record<string, unknown>)[key] =
            (validatedUpdates as Record<string, unknown>)[key];
        }
      }

      const updatedBillResults = (await wdb
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

        billLifecycleHooks.onBillUpdated(updatedBill, sanitizedUpdates).catch(error => {
          logger.warn({ error, billId: sanitizedId }, 'Bill update hook failed (non-blocking)');
        });
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
      const billResult = await this.getBillById(id);
      const oldStatus = billResult.isOk() ? (billResult.value?.status ?? 'unknown') : 'unknown';

      await withTransaction(async (tx: any) => {
        await tx
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

      const updatedBillResult = await this.getBillById(id);
      if (updatedBillResult.isOk() && updatedBillResult.value) {
        billLifecycleHooks.onBillStatusChanged(
          updatedBillResult.value as Bill,
          oldStatus,
          newStatus,
        ).catch(error => {
          logger.warn({ error, billId: id }, 'Bill status change hook failed (non-blocking)');
        });
      }
    }, { service: 'CachedBillService', operation: 'updateBillStatus' });
  }

  /**
   * Deletes a bill and cleans up all related caches.
   */
  async deleteBill(id: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const deleted = (await withTransaction(async (tx: any) => {
        await tx.delete(bill_engagement).where(eq(bill_engagement.bill_id, id));
        const deletedBillResults = (await tx
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
   * Searches bills with caching support and intelligent data source selection.
   */
  async searchBills(
    query: string,
    filters: BillFilters = {},
  ): Promise<AsyncServiceResult<Bill[]>> {
    return safeAsync(async () => {
      const validation = await validateData(SearchBillsSchema, { query, filters });
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedInput = validation.data!;

      const sanitizedQuery = inputSanitizationService.sanitizeString(validatedInput.query);
      validateStringInputs([sanitizedQuery]);

      const cacheKey = cacheKeys.search(sanitizedQuery, validatedInput.filters || {});
      const cached = await cacheService.get<Bill[]>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bill search');
        return cached;
      }

      try {
        // Use intelligent data source (database with mock fallback)
        const dataSource = await getBillDataSource();
        const searchFilters = {
          ...validatedInput.filters,
          search: sanitizedQuery,
        };
        
        const results = await dataSource.findAll(searchFilters);

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
            filters: validatedInput.filters,
            result_count: results.length,
            data_source: dataSource.getStatus().type,
          },
        });

        return results as Bill[];
      } catch (error) {
        logger.error({ 
          error, 
          query: sanitizedQuery,
          filters: validatedInput.filters,
          operation: 'searchBills' 
        }, 'Failed to search bills');
        
        throw new Error(`Failed to search bills: ${error instanceof Error ? error.message : String(error)}`);
      }
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

      const results = (await db
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

      const results = (await db
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

      const results = (await db
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

      const results = (await db
        .select()
        .from(bills)
        .where(inArray(bills.id, ids))
        .orderBy(desc(bills.created_at))) as any[];

      return results;
    }, { service: 'CachedBillService', operation: 'getBillsByIds' });
  }

  /**
   * Gets paginated bills with comprehensive caching.
   *
   * Note: GetAllBillsSchema accepts string-typed page/limit from query params;
   * the validated output is coerced to numbers before use.
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<AsyncServiceResult<PaginatedBills>> {
    return safeAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validation = await validateData(GetAllBillsSchema as any, { filters, pagination });
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      // Cast to any — schema output type mismatches string page/limit from HTTP query params
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validatedInput = validation.data as any;
      const validatedFilters: BillFilters = validatedInput?.filters ?? {};
      const rawPagination = validatedInput?.pagination ?? { page: 1, limit: 10 };

      // Coerce page/limit to numbers in case schema emits strings from query params
      const validatedPagination: PaginationOptions = {
        ...rawPagination,
        page: Number(rawPagination.page) || 1,
        limit: Number(rawPagination.limit) || 10,
      };

      const cacheKey = cacheKeys.list('bill', {
        ...validatedFilters,
        page: validatedPagination.page,
        limit: validatedPagination.limit,
      });
      const cached = await cacheService.get<PaginatedBills>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for paginated bills');
        return cached;
      }

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

      const totalResults = (await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .where(whereClause)) as any[];

      const total = totalResults[0]?.count ?? 0;

      const offset = (validatedPagination.page - 1) * validatedPagination.limit;
      const sortColumn = this.getSortColumn(validatedPagination.sortBy);
      const orderExpr = validatedPagination.sortOrder === 'asc' ? sortColumn : desc(sortColumn);

      const billResults = (await db
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
          (billItem: (typeof billResults)[0]): BillWithEngagement =>
            ({ ...billItem, complexity_score: 5 } as BillWithEngagement),
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
   * Gets bill statistics with extended caching and intelligent data source selection.
   */
  async getBillStats(): Promise<AsyncServiceResult<BillStats>> {
    return safeAsync(async () => {
      const cacheKey = cacheKeys.analytics('bill-stats');
      const cached = await cacheService.get<BillStats>(cacheKey);
      if (cached) {
        logger.debug({ cacheKey }, 'Cache hit for bill stats');
        return cached;
      }

      try {
        // Use intelligent data source (database with mock fallback)
        const dataSource = await getBillDataSource();
        const result = await dataSource.getStats();

        await cacheService.set(cacheKey, result, CACHE_TTL.HOUR);
        
        logger.debug({ 
          stats: result,
          dataSource: dataSource.getStatus().type 
        }, 'Bill stats retrieved successfully');
        
        return result;
      } catch (error) {
        logger.error({ 
          error,
          operation: 'getBillStats' 
        }, 'Failed to retrieve bill statistics');
        
        throw new Error(`Failed to retrieve bill statistics: ${error instanceof Error ? error.message : String(error)}`);
      }
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

      const countResults = (await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(bills)
        .where(conditions.length > 0 ? and(...conditions) : undefined)) as any[];

      return countResults[0]?.count ?? 0;
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
      const validation = await validateData(RecordEngagementSchema, {
        bill_id,
        user_id,
        engagement_type,
      });
      if (!validation.success) {
        const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
      }

      const validatedInput = validation.data!;

      await withTransaction(async (tx: any) => {
        const existingResults = (await tx
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

          await tx
            .update(bill_engagement)
            .set(updates)
            .where(eq(bill_engagement.id, existing.id));
        } else {
          await tx.insert(bill_engagement).values({
            bill_id:       validatedInput.bill_id,
            user_id:       validatedInput.user_id,
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

      const popularBillsResult = await this.getAllBills({}, { page: 1, limit: 20 });
      if (popularBillsResult.isOk()) {
        const billIds = popularBillsResult.value.bills.map((b: BillWithEngagement) => b.id);
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