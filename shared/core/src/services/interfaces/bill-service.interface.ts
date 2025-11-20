/**
 * Bill Service Interface
 *
 * Defines the contract for bill business logic operations, abstracting away
 * direct repository usage while maintaining the same functionality.
 */

import type { Result, Maybe } from '../../primitives';
import type { Bill, NewBill } from '@/schema/foundation';
import type { IBillRepository } from '../../repositories/interfaces/bill-repository.interface';

export interface IBillService {
  /**
   * Creates a new bill with business logic validation
   * @param bill The bill data to create
   * @returns Promise resolving to the created bill or error
   */
  create(bill: NewBill): Promise<Result<Bill, Error>>;

  /**
   * Retrieves a bill by its ID with business logic
   * @param id The bill ID
   * @returns Promise resolving to the bill or null if not found
   */
  findById(id: string): Promise<Result<Maybe<Bill>, Error>>;

  /**
   * Retrieves a bill by its bill number with validation
   * @param billNumber The bill number (e.g., "Bill 15 of 2024")
   * @returns Promise resolving to the bill or null if not found
   */
  findByBillNumber(billNumber: string): Promise<Result<Maybe<Bill>, Error>>;

  /**
   * Retrieves bills by sponsor ID with pagination
   * @param sponsorId The sponsor ID
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of bills
   */
  findBySponsorId(
    sponsor_id: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<Result<Bill[], Error>>;

  /**
   * Retrieves bills by status with chamber filtering
   * @param status The bill status
   * @param options Query options for pagination
   * @returns Promise resolving to array of bills
   */
  findByStatus(
    status: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
    }
  ): Promise<Result<Bill[], Error>>;

  /**
   * Retrieves bills affecting specific counties
   * @param counties Array of county names
   * @param options Query options for pagination
   * @returns Promise resolving to array of bills
   */
  findByAffectedCounties(
    counties: string[],
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<Result<Bill[], Error>>;

  /**
   * Searches bills by title or summary with business logic
   * @param query Search query string
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of bills
   */
  search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      chamber?: string;
    }
  ): Promise<Result<Bill[], Error>>;

  /**
   * Updates an existing bill with validation
   * @param id The bill ID
   * @param updates The fields to update
   * @returns Promise resolving to the updated bill or error
   */
  update(id: string, updates: Partial<NewBill>): Promise<Result<Bill, Error>>;

  /**
   * Updates bill engagement metrics
   * @param id The bill ID
   * @param metrics The metrics to update
   * @returns Promise resolving to success result
   */
  updateEngagementMetrics(
    id: string,
    metrics: {
      view_count?: number;
      comment_count?: number;
      share_count?: number;
      vote_count_for?: number;
      vote_count_against?: number;
      engagement_score?: number;
    }
  ): Promise<Result<void, Error>>;

  /**
   * Deletes a bill by ID with cascade logic
   * @param id The bill ID
   * @returns Promise resolving to success result
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Gets the total count of bills matching criteria
   * @param criteria Optional filtering criteria
   * @returns Promise resolving to the count
   */
  count(criteria?: {
    status?: string;
    sponsor_id?: string;
    chamber?: string;
    affected_counties?: string[];
  }): Promise<Result<number, Error>>;
}


