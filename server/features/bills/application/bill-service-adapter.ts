/**
 * Bill Service Adapter
 *
 * Maintains API compatibility by wrapping the Result-based BillService
 * and converting Results back to the original Promise-based interface.
 * This allows gradual migration while preserving existing API contracts.
 */

import {
  BillFilters,
  BillStats,
  BillWithEngagement,
  CachedBillService,
  PaginatedBills,
  PaginationOptions,
} from '@server/features/bills/application/bill-service';

import { boomFromStandardized } from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';

export class BillServiceAdapter {
  private billService: CachedBillService;

  constructor() {
    this.billService = new CachedBillService();
  }

  /**
   * Legacy-compatible getAllBills method
   */
  async getAllBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedBills> {
    const result = await this.billService.getAllBills(filters, pagination);

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }

    return result.value;
  }

  /**
   * Legacy-compatible getBills method (alias for getAllBills)
   */
  async getBills(
    filters: BillFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<any[]> {
    try {
      const result = await this.getAllBills(filters, pagination);
      return result.bills;
    } catch (error) {
      logger.warn(
        { component: 'BillServiceAdapter', error: error instanceof Error ? error.message : String(error) },
        'getBills failed, returning empty array',
      );
      return [];
    }
  }

  /**
   * Legacy-compatible getBillsByTags method.
   * Note: BillFilters does not include a `tags` field — filters by search term instead.
   * Replace with a dedicated tag-query method if tag filtering is required.
   */
  async getBillsByTags(tags: string[]): Promise<any[]> {
    try {
      // BillFilters has no `tags` key; fall back to a broad fetch and filter client-side
      const result = await this.getAllBills({}, { page: 1, limit: 1000 });
      return result.bills.filter(
        (bill: BillWithEngagement) =>
          Array.isArray(bill.tags) && tags.some(tag => (bill.tags as string[]).includes(tag)),
      );
    } catch (error) {
      logger.warn(
        { component: 'BillServiceAdapter', error: error instanceof Error ? error.message : String(error) },
        'getBillsByTags failed, returning empty array',
      );
      return [];
    }
  }

  /**
   * Legacy-compatible getBillById method
   */
  async getBillById(id: string): Promise<BillWithEngagement | null> {
    const result = await this.billService.getBillById(id);

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }

    return result.value;
  }

  /**
   * Legacy-compatible createBill method
   */
  async createBill(billData: unknown): Promise<any> {
    const result = await this.billService.createBill(billData as any);

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }

    return result.value;
  }

  /**
   * Legacy-compatible updateBill method
   */
  async updateBill(id: string, updates: Partial<any>): Promise<any | null> {
    const result = await this.billService.updateBill(id, updates);

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }

    return result.value;
  }

  /**
   * Legacy-compatible updateBillStatus method
   */
  async updateBillStatus(id: string, newStatus: string, user_id?: string): Promise<void> {
    const result = await this.billService.updateBillStatus(id, newStatus, user_id);

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }
  }

  /**
   * Legacy-compatible getBillStats method
   */
  async getBillStats(): Promise<BillStats> {
    const result = await this.billService.getBillStats();

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }

    return result.value;
  }

  /**
   * Legacy-compatible recordEngagement method
   */
  async recordEngagement(
    bill_id: string,
    user_id: string,
    engagement_type: 'view' | 'comment' | 'share',
  ): Promise<void> {
    const result = await this.billService.recordEngagement(bill_id, user_id, engagement_type);

    if (result.isErr()) {
      throw boomFromStandardized(result.error);
    }
  }

  /**
   * Get the underlying Result-based service for new code
   */
  getResultBasedService(): CachedBillService {
    return this.billService;
  }
}

// Export both the adapter and the original service
export const billServiceAdapter = new BillServiceAdapter();

// For backward compatibility, export the adapter as the default billService
export const billService = billServiceAdapter;