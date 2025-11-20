/**
 * Bill Test Service Implementation
 *
 * Test-specific implementation of IBillService that uses dependency injection
 * with the new testing infrastructure. Provides business logic operations
 * for bills using the injected repository.
 */

import { ok, err, some, none } from '../../primitives';
import type { Result, Maybe } from '../../primitives';
import type { Bill, NewBill } from '@/schema/foundation';
import type { IBillRepository } from '../../repositories/interfaces/bill-repository.interface';
import type { IBillService } from '../interfaces/bill-service.interface';

export class BillTestService implements IBillService {
  constructor(private readonly billRepository: IBillRepository) {}

  async create(bill: NewBill): Promise<Result<Bill, Error>> {
    try {
      // Business logic validation
      if (!bill.title?.trim()) {
        return err(new Error('Bill title is required'));
      }

      if (!bill.chamber) {
        return err(new Error('Bill chamber is required'));
      }

      if (!bill.bill_number) {
        return err(new Error('Bill number is required'));
      }

      // Validate bill number format (basic check)
      if (!bill.bill_number.match(/^Bill \d+ of \d{4}$/)) {
        return err(new Error('Bill number must be in format "Bill X of YYYY"'));
      }

      // Additional business logic could go here
      // - Check for duplicate bill numbers
      // - Validate sponsor exists
      // - Apply default values based on chamber
      // - Calculate impact scores

      return await this.billRepository.create(bill);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create bill'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      if (!id?.trim()) {
        return err(new Error('Bill ID is required'));
      }

      return await this.billRepository.findById(id);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find bill by ID'));
    }
  }

  async findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>> {
    try {
      if (!billNumber?.trim()) {
        return err(new Error('Bill number is required'));
      }

      return await this.billRepository.findByBillNumber(billNumber);
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
      if (!sponsorId?.trim()) {
        return err(new Error('Sponsor ID is required'));
      }

      // Business logic: validate pagination parameters
      if (options?.limit && (options.limit < 1 || options.limit > 100)) {
        return err(new Error('Limit must be between 1 and 100'));
      }

      if (options?.offset && options.offset < 0) {
        return err(new Error('Offset must be non-negative'));
      }

      return await this.billRepository.findBySponsorId(sponsorId, options);
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
      if (!status?.trim()) {
        return err(new Error('Status is required'));
      }

      // Business logic: validate status values
      const validStatuses = ['drafted', 'introduced', 'committee', 'passed', 'failed', 'withdrawn'];
      if (!validStatuses.includes(status)) {
        return err(new Error(`Invalid status: ${status}`));
      }

      return await this.billRepository.findByStatus(status, options);
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
      if (!counties || counties.length === 0) {
        return err(new Error('At least one county must be specified'));
      }

      // Business logic: validate county names
      const validCounties = [
        'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
        'Thika', 'Kitale', 'Malindi', 'Garissa', 'Kakamega'
      ];

      for (const county of counties) {
        if (!validCounties.includes(county)) {
          return err(new Error(`Invalid county: ${county}`));
        }
      }

      return await this.billRepository.findByAffectedCounties(counties, options);
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
      if (!query?.trim()) {
        return err(new Error('Search query is required'));
      }

      if (query.length < 3) {
        return err(new Error('Search query must be at least 3 characters long'));
      }

      return await this.billRepository.search(query, options);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to search bills'));
    }
  }

  async update(id: string, updates: Partial<NewBill>): Promise<Result<Bill, Error>> {
    try {
      if (!id?.trim()) {
        return err(new Error('Bill ID is required'));
      }

      // Business logic validation for updates
      if (updates.bill_number && !updates.bill_number.match(/^Bill \d+ of \d{4}$/)) {
        return err(new Error('Bill number must be in format "Bill X of YYYY"'));
      }

      if (updates.title && !updates.title.trim()) {
        return err(new Error('Bill title cannot be empty'));
      }

      // Additional business logic could include:
      // - Status transition validation
      // - Permission checks
      // - Audit logging

      return await this.billRepository.update(id, updates);
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
      if (!id?.trim()) {
        return err(new Error('Bill ID is required'));
      }

      // Business logic: validate metric values
      for (const [key, value] of Object.entries(metrics)) {
        if (value !== undefined && (typeof value !== 'number' || value < 0)) {
          return err(new Error(`${key} must be a non-negative number`));
        }
      }

      return await this.billRepository.updateEngagementMetrics(id, metrics);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update engagement metrics'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      if (!id?.trim()) {
        return err(new Error('Bill ID is required'));
      }

      // Business logic could include:
      // - Check if bill can be deleted (not passed, no dependencies)
      // - Cascade delete related records
      // - Audit logging

      return await this.billRepository.delete(id);
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
      // Business logic validation
      if (criteria?.status) {
        const validStatuses = ['drafted', 'introduced', 'committee', 'passed', 'failed', 'withdrawn'];
        if (!validStatuses.includes(criteria.status)) {
          return err(new Error(`Invalid status: ${criteria.status}`));
        }
      }

      return await this.billRepository.count(criteria);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to count bills'));
    }
  }
}


