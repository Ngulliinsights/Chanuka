/**
 * Sponsor Repository Interface
 *
 * Defines the contract for sponsor (MP, Senator, MCA) data access operations,
 * abstracting away direct schema usage while maintaining the same functionality.
 */

import type { Result, Maybe } from '../../primitives';
import type { Sponsor, NewSponsor } from '@/schema/foundation';

export interface ISponsorRepository {
  /**
   * Creates a new sponsor record
   * @param sponsor The sponsor data to create
   * @returns Promise resolving to the created sponsor or error
   */
  create(sponsor: NewSponsor): Promise<Result<Sponsor, Error>>;

  /**
   * Retrieves a sponsor by their ID
   * @param id The sponsor ID
   * @returns Promise resolving to the sponsor or null if not found
   */
  findById(id: string): Promise<Result<Maybe<Sponsor>, Error>>;

  /**
   * Retrieves a sponsor by their MP number
   * @param mpNumber The MP number
   * @returns Promise resolving to the sponsor or null if not found
   */
  findByMpNumber(mpNumber: string): Promise<Result<Maybe<Sponsor>, Error>>;

  /**
   * Retrieves sponsors by party affiliation
   * @param party The political party name
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of sponsors
   */
  findByParty(
    party: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>>;

  /**
   * Retrieves sponsors by county
   * @param county The county name
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of sponsors
   */
  findByCounty(
    county: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>>;

  /**
   * Retrieves sponsors by chamber (National Assembly, Senate, County Assembly)
   * @param chamber The parliamentary chamber
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of sponsors
   */
  findByChamber(
    chamber: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>>;

  /**
   * Searches sponsors by name or constituency
   * @param query Search query string
   * @param options Query options for pagination and filtering
   * @returns Promise resolving to array of sponsors
   */
  search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>>;

  /**
   * Retrieves active sponsors
   * @param options Query options for pagination
   * @returns Promise resolving to array of active sponsors
   */
  findActive(options?: {
    limit?: number;
    offset?: number;
    chamber?: string;
  }): Promise<Result<Sponsor[], Error>>;

  /**
   * Updates an existing sponsor
   * @param id The sponsor ID
   * @param updates The fields to update
   * @returns Promise resolving to the updated sponsor or error
   */
  update(id: string, updates: Partial<NewSponsor>): Promise<Result<Sponsor, Error>>;

  /**
   * Updates sponsor performance metrics
   * @param id The sponsor ID
   * @param metrics The metrics to update
   * @returns Promise resolving to success result
   */
  updatePerformanceMetrics(
    id: string,
    metrics: {
      voting_record?: Record<string, unknown>;
      attendance_rate?: number;
      last_disclosure_date?: Date;
    }
  ): Promise<Result<void, Error>>;

  /**
   * Deletes a sponsor by ID
   * @param id The sponsor ID
   * @returns Promise resolving to success result
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Gets the total count of sponsors matching criteria
   * @param criteria Optional filtering criteria
   * @returns Promise resolving to the count
   */
  count(criteria?: {
    party?: string;
    county?: string;
    chamber?: string;
    is_active?: boolean;
  }): Promise<Result<number, Error>>;
}