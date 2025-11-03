import { Bill, InsertBill, BillEngagement, InsertBillEngagement } from '@shared/schema';
import { BillFilters, PaginationOptions } from '../../application/bill-service';

export interface IBillRepository {
  // Bill CRUD operations
  findById(id: number): Promise<Bill | null>;
  findAll(filters: BillFilters, pagination: PaginationOptions): Promise<Bill[]>;
  create(bill: InsertBill): Promise<Bill>;
  update(id: number, updates: Partial<InsertBill>): Promise<Bill | null>;
  delete(id: number): Promise<boolean>;

  // Bill engagement operations
  recordEngagement(billId: number, userId: string, type: 'view' | 'comment' | 'share'): Promise<void>;
  getEngagementStats(billId: number): Promise<{
    totalViews: number;
    totalComments: number;
    totalShares: number;
    uniqueViewers: number;
    totalEngagements: number;
  }>;

  // Bill statistics
  getStats(): Promise<{
    totalBills: number;
    billsByStatus: Array<{ status: string; count: number }>;
    billsByCategory: Array<{ category: string; count: number }>;
    recentActivity: number;
  }>;

  // Bill search and filtering
  search(query: string, filters?: BillFilters): Promise<Bill[]>;
  getByStatus(status: string): Promise<Bill[]>;
  getByCategory(category: string): Promise<Bill[]>;
  getBySponsor(sponsorId: number): Promise<Bill[]>;
}