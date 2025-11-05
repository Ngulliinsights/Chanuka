/**
 * Bill Test Repository Implementation
 *
 * Test-specific implementation of IBillRepository that uses the new testing infrastructure
 * created in Phase 1. Provides in-memory storage and schema-agnostic operations for testing.
 */

import { ok, err, some, none } from '../../primitives';
import type { Result, Maybe } from '../../primitives';
import type { Bill, NewBill } from '@/schema/foundation';
import type { IBillRepository } from '../interfaces/bill-repository.interface';
import type { ITestDataFactory } from '../../testing/test-data-factory';

export class BillTestRepository implements IBillRepository {
  private bills = new Map<string, Bill>();

  constructor(private readonly testDataFactory: ITestDataFactory) {}

  async create(bill: NewBill): Promise<Result<Bill, Error>> {
    try {
      // Generate a unique ID for the bill
      const id = `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newBill: Bill = {
        ...bill,
        id,
        status: bill.status ?? 'drafted',
        summary: bill.summary ?? null,
        full_text: bill.full_text ?? null,
        bill_type: bill.bill_type ?? null,
        introduced_date: bill.introduced_date ?? null,
        last_action_date: bill.last_action_date ?? null,
        parliament_session: bill.parliament_session ?? null,
        sponsor_id: bill.sponsor_id ?? null,
        committee: bill.committee ?? null,
        committee_report_url: bill.committee_report_url ?? null,
        affected_counties: bill.affected_counties ?? [],
        impact_areas: bill.impact_areas ?? [],
        public_participation_date: bill.public_participation_date ?? null,
        public_participation_venue: bill.public_participation_venue ?? null,
        public_participation_status: bill.public_participation_status ?? null,
        view_count: bill.view_count ?? 0,
        comment_count: bill.comment_count ?? 0,
        share_count: bill.share_count ?? 0,
        vote_count_for: bill.vote_count_for ?? 0,
        vote_count_against: bill.vote_count_against ?? 0,
        engagement_score: bill.engagement_score ?? '0',
        category: bill.category ?? null,
        tags: bill.tags ?? [],
        external_urls: bill.external_urls ?? [],
        metadata: bill.metadata ?? {},
        constitutional_analysis_status: bill.constitutional_analysis_status ?? 'pending',
        argument_synthesis_status: bill.argument_synthesis_status ?? 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      this.bills.set(id, newBill);
      return ok(newBill);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create bill'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      const bill = this.bills.get(id);
      return ok(bill ? some(bill) : none);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find bill by ID'));
    }
  }

  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      const bill = Array.from(this.bills.values()).find(b => b.bill_number === billNumber);
      return ok(bill ? some(bill) : none);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find bill by bill number'));
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
      let bills = Array.from(this.bills.values()).filter(b => b.sponsor_id === sponsor_id);

      if (options?.status) {
        bills = bills.filter(b => b.status === options.status);
      }

      if (options?.offset) {
        bills = bills.slice(options.offset);
      }

      if (options?.limit) {
        bills = bills.slice(0, options.limit);
      }

      return ok(bills);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find bills by sponsor ID'));
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
      let bills = Array.from(this.bills.values()).filter(b => b.status === status);

      if (options?.chamber) {
        bills = bills.filter(b => b.chamber === options.chamber);
      }

      if (options?.offset) {
        bills = bills.slice(options.offset);
      }

      if (options?.limit) {
        bills = bills.slice(0, options.limit);
      }

      return ok(bills);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find bills by status'));
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
      let bills = Array.from(this.bills.values()).filter(b =>
        b.affected_counties?.some(county => counties.includes(county))
      );

      if (options?.status) {
        bills = bills.filter(b => b.status === options.status);
      }

      if (options?.offset) {
        bills = bills.slice(options.offset);
      }

      if (options?.limit) {
        bills = bills.slice(0, options.limit);
      }

      return ok(bills);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find bills by affected counties'));
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
      const lowerQuery = query.toLowerCase();
      let bills = Array.from(this.bills.values()).filter(b =>
        b.title?.toLowerCase().includes(lowerQuery) ||
        b.summary?.toLowerCase().includes(lowerQuery)
      );

      if (options?.status) {
        bills = bills.filter(b => b.status === options.status);
      }

      if (options?.chamber) {
        bills = bills.filter(b => b.chamber === options.chamber);
      }

      if (options?.offset) {
        bills = bills.slice(options.offset);
      }

      if (options?.limit) {
        bills = bills.slice(0, options.limit);
      }

      return ok(bills);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to search bills'));
    }
  }

  async update(id: string, updates: Partial<NewBill>): Promise<Result<Bill, Error>> {
    try {
      const existingBill = this.bills.get(id);
      if (!existingBill) {
        return err(new Error(`Bill with ID ${id} not found`));
      }

      const updatedBill: Bill = {
        ...existingBill,
        ...updates,
        chamber: updates.chamber ?? existingBill.chamber,
        bill_number: updates.bill_number ?? existingBill.bill_number,
        title: updates.title ?? existingBill.title,
        status: updates.status ?? existingBill.status,
        summary: updates.summary ?? existingBill.summary,
        full_text: updates.full_text ?? existingBill.full_text,
        bill_type: updates.bill_type ?? existingBill.bill_type,
        introduced_date: updates.introduced_date ?? existingBill.introduced_date,
        last_action_date: updates.last_action_date ?? existingBill.last_action_date,
        parliament_session: updates.parliament_session ?? existingBill.parliament_session,
        sponsor_id: updates.sponsor_id ?? existingBill.sponsor_id,
        committee: updates.committee ?? existingBill.committee,
        committee_report_url: updates.committee_report_url ?? existingBill.committee_report_url,
        affected_counties: updates.affected_counties ?? existingBill.affected_counties,
        impact_areas: updates.impact_areas ?? existingBill.impact_areas,
        public_participation_date: updates.public_participation_date ?? existingBill.public_participation_date,
        public_participation_venue: updates.public_participation_venue ?? existingBill.public_participation_venue,
        public_participation_status: updates.public_participation_status ?? existingBill.public_participation_status,
        view_count: updates.view_count ?? existingBill.view_count,
        comment_count: updates.comment_count ?? existingBill.comment_count,
        share_count: updates.share_count ?? existingBill.share_count,
        vote_count_for: updates.vote_count_for ?? existingBill.vote_count_for,
        vote_count_against: updates.vote_count_against ?? existingBill.vote_count_against,
        engagement_score: updates.engagement_score ?? existingBill.engagement_score,
        category: updates.category ?? existingBill.category,
        tags: updates.tags ?? existingBill.tags,
        external_urls: updates.external_urls ?? existingBill.external_urls,
        metadata: updates.metadata ?? existingBill.metadata,
        constitutional_analysis_status: updates.constitutional_analysis_status ?? existingBill.constitutional_analysis_status,
        argument_synthesis_status: updates.argument_synthesis_status ?? existingBill.argument_synthesis_status,
        id: existingBill.id,
        created_at: existingBill.created_at,
        updated_at: new Date(),
      };

      this.bills.set(id, updatedBill);
      return ok(updatedBill);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update bill'));
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
      const existingBill = this.bills.get(id);
      if (!existingBill) {
        return err(new Error(`Bill with ID ${id} not found`));
      }

      const updatedBill: Bill = {
        ...existingBill,
        ...metrics,
        engagement_score: metrics.engagement_score?.toString() ?? existingBill.engagement_score,
        updated_at: new Date(),
      };

      this.bills.set(id, updatedBill);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update engagement metrics'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      const deleted = this.bills.delete(id);
      if (!deleted) {
        return err(new Error(`Bill with ID ${id} not found`));
      }
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete bill'));
    }
  }

  async count(criteria?: {
    status?: string;
    sponsor_id?: string;
    chamber?: string;
    affected_counties?: string[];
  }): Promise<Result<number, Error>> {
    try {
      let bills = Array.from(this.bills.values());

      if (criteria?.status) {
        bills = bills.filter(b => b.status === criteria.status);
      }

      if (criteria?.sponsor_id) {
        bills = bills.filter(b => b.sponsor_id === criteria.sponsor_id);
      }

      if (criteria?.chamber) {
        bills = bills.filter(b => b.chamber === criteria.chamber);
      }

      if (criteria?.affected_counties) {
        bills = bills.filter(b =>
          b.affected_counties?.some(county => criteria.affected_counties!.includes(county))
        );
      }

      return ok(bills.length);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to count bills'));
    }
  }

  /**
   * Clears all bills from the test repository
   */
  clear(): void {
    this.bills.clear();
  }

  /**
   * Gets all bills in the repository (for testing purposes)
   */
  getAll(): Bill[] {
    return Array.from(this.bills.values());
  }
}