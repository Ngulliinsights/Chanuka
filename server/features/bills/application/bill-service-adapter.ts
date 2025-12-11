/**
 * Bill Service Adapter
 * 
 * Maintains API compatibility by wrapping the Result-based BillService
 * and converting Results back to the original Promise-based interface.
 * This allows gradual migration while preserving existing API contracts.
 */

import { CachedBillService, BillFilters, PaginationOptions, PaginatedBills, BillWithEngagement, BillStats } from '@server/features/bills/application/bill-service-adapter.ts';
import { ResultAdapter } from '@/infrastructure/errors/result-adapter.js';

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
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedBills> {
    const result = await this.billService.getAllBills(filters, pagination);
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
  }

  /**
   * Legacy-compatible getBillById method
   */
  async getBillById(id: string): Promise<BillWithEngagement | null> {
    const result = await this.billService.getBillById(id);
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
  }

  /**
   * Legacy-compatible createBill method
   */
  async createBill(billData: any): Promise<any> {
    const result = await this.billService.createBill(billData);
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
  }

  /**
   * Legacy-compatible updateBill method
   */
  async updateBill(id: string, updates: Partial<any>): Promise<any | null> {
    const result = await this.billService.updateBill(id, updates);
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
  }

  /**
   * Legacy-compatible updateBillStatus method
   */
  async updateBillStatus(id: string, newStatus: string, user_id?: string): Promise<void> {
    const result = await this.billService.updateBillStatus(id, newStatus, user_id);
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
  }

  /**
   * Legacy-compatible getBillStats method
   */
  async getBillStats(): Promise<BillStats> {
    const result = await this.billService.getBillStats();
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
  }

  /**
   * Legacy-compatible recordEngagement method
   */
  async recordEngagement(
    bill_id: string,
    user_id: string,
    engagement_type: 'view' | 'comment' | 'share'
  ): Promise<void> {
    const result = await this.billService.recordEngagement(bill_id, user_id, engagement_type);
    
    if (result.isErr()) {
      const boomError = ResultAdapter.toBoom(result.error);
      throw boomError;
    }
    
    return result.value;
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
