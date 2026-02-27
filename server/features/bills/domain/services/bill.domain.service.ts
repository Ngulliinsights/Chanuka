// ============================================================================
// BILL DOMAIN SERVICE
// ============================================================================
// Implements business logic for bills using repositories through dependency injection.
// NO direct database access - all data access through repositories.

import type { BillRepository } from '../repositories/bill.repository';
import type { SponsorRepository } from '@server/features/sponsors/domain/repositories/sponsor.repository';
import type { Result } from '@shared/core/result';
import { Ok, Err } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import type { Bill, InsertBill, BillStatus } from '../repositories/bill.repository';
import type { Sponsor } from '@server/features/sponsors/domain/repositories/sponsor.repository';

/**
 * Bill engagement data
 */
export interface BillEngagement {
  views: number;
  comments: number;
  shares: number;
  supports: number;
  opposes: number;
}

/**
 * Bill with engagement score
 */
export interface BillWithScore extends Bill {
  engagementScore: number;
  controversyScore: number;
}

/**
 * Bill creation data with validation
 */
export interface CreateBillData {
  billNumber: string;
  title: string;
  description: string;
  sponsorId: string;
  affectedCounties: string[];
  status?: BillStatus;
}

/**
 * Bill domain service implementing business logic.
 * 
 * DESIGN PRINCIPLES:
 * - Consumes repositories through dependency injection
 * - Implements business logic (validation, scoring, orchestration)
 * - NO direct database access
 * - Returns Result<T, Error> for explicit error handling
 * 
 * @example Basic Usage
 * ```typescript
 * const service = new BillDomainService(billRepository, sponsorRepository);
 * 
 * // Create bill with validation
 * const result = await service.createBill({
 *   billNumber: 'BILL-2024-001',
 *   title: 'Test Bill',
 *   description: 'Test description',
 *   sponsorId: 'sponsor-123',
 *   affectedCounties: ['Nairobi']
 * });
 * 
 * if (result.isOk) {
 *   console.log('Bill created:', result.value.billNumber);
 * }
 * ```
 */
export class BillDomainService {
  constructor(
    private readonly billRepository: BillRepository,
    private readonly sponsorRepository: SponsorRepository
  ) {}

  /**
   * Create new bill with validation
   * 
   * Business Rules:
   * - Bill number must be unique
   * - Sponsor must exist and be active
   * - Title must be at least 10 characters
   * - Description must be at least 50 characters
   * - At least one affected county required
   * 
   * @param data - Bill creation data
   * @returns Result containing created bill
   */
  async createBill(data: CreateBillData): Promise<Result<Bill, Error>> {
    try {
      // Validate title length
      if (data.title.length < 10) {
        return Err(new Error('Bill title must be at least 10 characters'));
      }

      // Validate description length
      if (data.description.length < 50) {
        return Err(new Error('Bill description must be at least 50 characters'));
      }

      // Validate affected counties
      if (data.affectedCounties.length === 0) {
        return Err(new Error('At least one affected county is required'));
      }

      // Check if bill number already exists
      const existingBillResult = await this.billRepository.findByBillNumber(data.billNumber);
      if (!existingBillResult.isOk) {
        return Err(existingBillResult.error);
      }
      if (existingBillResult.value !== null) {
        return Err(new Error(`Bill number already exists: ${data.billNumber}`));
      }

      // Validate sponsor exists and is active
      const sponsorResult = await this.sponsorRepository.findByName(data.sponsorId);
      if (!sponsorResult.isOk) {
        return Err(sponsorResult.error);
      }
      if (sponsorResult.value === null) {
        return Err(new Error(`Sponsor not found: ${data.sponsorId}`));
      }
      if (!sponsorResult.value.is_active) {
        return Err(new Error(`Sponsor is not active: ${data.sponsorId}`));
      }

      // Create bill
      const billData: InsertBill = {
        bill_number: data.billNumber,
        title: data.title,
        description: data.description,
        sponsor_id: data.sponsorId,
        affected_counties: data.affectedCounties,
        status: data.status ?? 'draft',
        introduced_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      return await this.billRepository.create(billData);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update bill engagement metrics
   * 
   * Business Rules:
   * - Bill must exist
   * - Engagement values must be non-negative
   * - Recalculates engagement and controversy scores
   * 
   * @param billNumber - Bill number
   * @param engagement - Engagement data
   * @returns Result containing updated bill with scores
   */
  async updateEngagement(
    billNumber: string,
    engagement: BillEngagement
  ): Promise<Result<BillWithScore, Error>> {
    try {
      // Validate engagement values
      if (engagement.views < 0 || engagement.comments < 0 || engagement.shares < 0 ||
          engagement.supports < 0 || engagement.opposes < 0) {
        return Err(new Error('Engagement values must be non-negative'));
      }

      // Get existing bill
      const billResult = await this.billRepository.findByBillNumber(billNumber);
      if (!billResult.isOk) {
        return Err(billResult.error);
      }
      if (billResult.value === null) {
        return Err(new Error(`Bill not found: ${billNumber}`));
      }

      // Calculate scores
      const engagementScore = this.calculateEngagementScore(engagement);
      const controversyScore = this.calculateControversyScore(engagement);

      // Update bill (assuming engagement fields exist in schema)
      const updateResult = await this.billRepository.update(billNumber, {
        // Note: These fields would need to exist in the schema
        // For now, we'll just return the bill with calculated scores
      });

      if (!updateResult.isOk) {
        return Err(updateResult.error);
      }

      // Return bill with scores
      const billWithScore: BillWithScore = {
        ...updateResult.value,
        engagementScore,
        controversyScore,
      };

      return Ok(billWithScore);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Calculate engagement score
   * 
   * Formula: (views * 1) + (comments * 5) + (shares * 10) + (supports * 3) + (opposes * 3)
   * 
   * @param engagement - Engagement data
   * @returns Engagement score
   */
  calculateEngagementScore(engagement: BillEngagement): number {
    return (
      engagement.views * 1 +
      engagement.comments * 5 +
      engagement.shares * 10 +
      engagement.supports * 3 +
      engagement.opposes * 3
    );
  }

  /**
   * Calculate controversy score
   * 
   * Formula: abs(supports - opposes) / (supports + opposes)
   * Returns 0 if no supports or opposes
   * Returns 1 if all supports or all opposes (no controversy)
   * Returns 0 if equal supports and opposes (high controversy)
   * 
   * @param engagement - Engagement data
   * @returns Controversy score (0-1, lower = more controversial)
   */
  calculateControversyScore(engagement: BillEngagement): number {
    const total = engagement.supports + engagement.opposes;
    if (total === 0) {
      return 0;
    }
    return Math.abs(engagement.supports - engagement.opposes) / total;
  }

  /**
   * Get bill with sponsor information
   * 
   * @param billNumber - Bill number
   * @returns Result containing bill and sponsor
   */
  async getBillWithSponsor(
    billNumber: string
  ): Promise<Result<{ bill: Bill; sponsor: Maybe<Sponsor> }, Error>> {
    try {
      // Get bill
      const billResult = await this.billRepository.findByBillNumber(billNumber);
      if (!billResult.isOk) {
        return Err(billResult.error);
      }
      if (billResult.value === null) {
        return Err(new Error(`Bill not found: ${billNumber}`));
      }

      const bill = billResult.value;

      // Get sponsor
      const sponsorResult = await this.sponsorRepository.findByName(bill.sponsor_id);
      if (!sponsorResult.isOk) {
        return Err(sponsorResult.error);
      }

      return Ok({
        bill,
        sponsor: sponsorResult.value,
      });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get bills by county with sponsor information
   * 
   * @param county - County name
   * @param limit - Maximum number of bills to return
   * @returns Result containing bills with sponsors
   */
  async getBillsByCountyWithSponsors(
    county: string,
    limit: number = 10
  ): Promise<Result<Array<{ bill: Bill; sponsor: Maybe<Sponsor> }>, Error>> {
    try {
      // Get bills for county
      const billsResult = await this.billRepository.findByAffectedCounties([county], { limit });
      if (!billsResult.isOk) {
        return Err(billsResult.error);
      }

      // Get sponsors for each bill
      const billsWithSponsors = await Promise.all(
        billsResult.value.map(async (bill) => {
          const sponsorResult = await this.sponsorRepository.findByName(bill.sponsor_id);
          return {
            bill,
            sponsor: sponsorResult.isOk ? sponsorResult.value : null,
          };
        })
      );

      return Ok(billsWithSponsors);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update bill status with validation
   * 
   * Business Rules:
   * - Bill must exist
   * - Status transitions must be valid
   * - draft -> introduced -> committee -> passed/rejected -> enacted
   * 
   * @param billNumber - Bill number
   * @param newStatus - New status
   * @returns Result containing updated bill
   */
  async updateBillStatus(
    billNumber: string,
    newStatus: BillStatus
  ): Promise<Result<Bill, Error>> {
    try {
      // Get existing bill
      const billResult = await this.billRepository.findByBillNumber(billNumber);
      if (!billResult.isOk) {
        return Err(billResult.error);
      }
      if (billResult.value === null) {
        return Err(new Error(`Bill not found: ${billNumber}`));
      }

      const currentStatus = billResult.value.status;

      // Validate status transition
      const validTransitions: Record<BillStatus, BillStatus[]> = {
        draft: ['introduced'],
        introduced: ['committee', 'rejected'],
        committee: ['passed', 'rejected'],
        passed: ['enacted'],
        rejected: [],
        enacted: [],
      };

      const allowedTransitions = validTransitions[currentStatus as BillStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        return Err(
          new Error(
            `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
            `Allowed transitions: ${allowedTransitions.join(', ')}`
          )
        );
      }

      // Update status
      return await this.billRepository.update(billNumber, { status: newStatus });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Search bills with filters
   * 
   * @param keywords - Search keywords
   * @param options - Search options
   * @returns Result containing matching bills
   */
  async searchBills(
    keywords: string,
    options?: {
      status?: BillStatus | BillStatus[];
      affectedCounties?: string[];
      sponsorIds?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<Bill[], Error>> {
    return await this.billRepository.searchByKeywords(keywords, options);
  }

  /**
   * Get bill statistics
   * 
   * @returns Result containing bill statistics
   */
  async getBillStatistics(): Promise<Result<{
    total: number;
    byStatus: Record<BillStatus, number>;
  }, Error>> {
    try {
      // Get total count
      const totalResult = await this.billRepository.count();
      if (!totalResult.isOk) {
        return Err(totalResult.error);
      }

      // Get counts by status
      const statuses: BillStatus[] = ['draft', 'introduced', 'committee', 'passed', 'rejected', 'enacted'];
      const statusCounts: Record<BillStatus, number> = {} as any;

      for (const status of statuses) {
        const countResult = await this.billRepository.count({ status });
        if (!countResult.isOk) {
          return Err(countResult.error);
        }
        statusCounts[status] = countResult.value;
      }

      return Ok({
        total: totalResult.value,
        byStatus: statusCounts,
      });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
