/**
 * Sponsor Test Repository Implementation
 *
 * Test-specific implementation of ISponsorRepository that uses the new testing infrastructure
 * created in Phase 1. Provides in-memory storage and schema-agnostic operations for testing.
 */

import { ok, err, some, none } from '../../primitives';
import type { Result, Maybe } from '../../primitives';
import type { Sponsor, NewSponsor } from '@/schema/foundation';
import type { ISponsorRepository } from '../interfaces/sponsor-repository.interface';
import type { ITestDataFactory } from '../../testing/test-data-factory';

export class SponsorTestRepository implements ISponsorRepository {
  private sponsors = new Map<string, Sponsor>();

  constructor(private readonly testDataFactory: ITestDataFactory) {}

  async create(sponsor: NewSponsor): Promise<Result<Sponsor, Error>> {
    try {
      // Generate a unique ID for the sponsor
      const id = `sponsor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newSponsor: Sponsor = {
        ...sponsor,
        id,
        party: sponsor.party ?? null,
        county: sponsor.county ?? null,
        constituency: sponsor.constituency ?? null,
        ward: sponsor.ward ?? null,
        mp_number: sponsor.mp_number ?? null,
        position: sponsor.position ?? null,
        role: sponsor.role ?? null,
        is_active: sponsor.is_active ?? true,
        bio: sponsor.bio ?? null,
        photo_url: sponsor.photo_url ?? null,
        website: sponsor.website ?? null,
        email: sponsor.email ?? null,
        phone: sponsor.phone ?? null,
        office_location: sponsor.office_location ?? null,
        social_media: sponsor.social_media ?? {},
        financial_disclosures: sponsor.financial_disclosures ?? {},
        last_disclosure_date: sponsor.last_disclosure_date ?? null,
        voting_record: sponsor.voting_record ?? {},
        attendance_rate: sponsor.attendance_rate ?? null,
        term_start: sponsor.term_start ?? null,
        term_end: sponsor.term_end ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      this.sponsors.set(id, newSponsor);
      return ok(newSponsor);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to create sponsor'));
    }
  }

  async findById(id: string): Promise<Result<Maybe<Sponsor>, Error>> {
    try {
      const sponsor = this.sponsors.get(id);
      return ok(sponsor ? some(sponsor) : none);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find sponsor by ID'));
    }
  }

  async findByMpNumber(mpNumber: string): Promise<Result<Maybe<Sponsor>, Error>> {
    try {
      const sponsor = Array.from(this.sponsors.values()).find(s => s.mp_number === mpNumber);
      return ok(sponsor ? some(sponsor) : none);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find sponsor by MP number'));
    }
  }

  async findByParty(
    party: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      let sponsors = Array.from(this.sponsors.values()).filter(s => s.party === party);

      if (options?.chamber) {
        sponsors = sponsors.filter(s => s.chamber === options.chamber);
      }

      if (options?.is_active !== undefined) {
        sponsors = sponsors.filter(s => s.is_active === options.is_active);
      }

      if (options?.offset) {
        sponsors = sponsors.slice(options.offset);
      }

      if (options?.limit) {
        sponsors = sponsors.slice(0, options.limit);
      }

      return ok(sponsors);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find sponsors by party'));
    }
  }

  async findByCounty(
    county: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      let sponsors = Array.from(this.sponsors.values()).filter(s => s.county === county);

      if (options?.chamber) {
        sponsors = sponsors.filter(s => s.chamber === options.chamber);
      }

      if (options?.is_active !== undefined) {
        sponsors = sponsors.filter(s => s.is_active === options.is_active);
      }

      if (options?.offset) {
        sponsors = sponsors.slice(options.offset);
      }

      if (options?.limit) {
        sponsors = sponsors.slice(0, options.limit);
      }

      return ok(sponsors);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find sponsors by county'));
    }
  }

  async findByChamber(
    chamber: string,
    options?: {
      limit?: number;
      offset?: number;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      let sponsors = Array.from(this.sponsors.values()).filter(s => s.chamber === chamber);

      if (options?.is_active !== undefined) {
        sponsors = sponsors.filter(s => s.is_active === options.is_active);
      }

      if (options?.offset) {
        sponsors = sponsors.slice(options.offset);
      }

      if (options?.limit) {
        sponsors = sponsors.slice(0, options.limit);
      }

      return ok(sponsors);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find sponsors by chamber'));
    }
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      chamber?: string;
      is_active?: boolean;
    }
  ): Promise<Result<Sponsor[], Error>> {
    try {
      const lowerQuery = query.toLowerCase();
      let sponsors = Array.from(this.sponsors.values()).filter(s =>
        s.name?.toLowerCase().includes(lowerQuery) ||
        s.constituency?.toLowerCase().includes(lowerQuery)
      );

      if (options?.chamber) {
        sponsors = sponsors.filter(s => s.chamber === options.chamber);
      }

      if (options?.is_active !== undefined) {
        sponsors = sponsors.filter(s => s.is_active === options.is_active);
      }

      if (options?.offset) {
        sponsors = sponsors.slice(options.offset);
      }

      if (options?.limit) {
        sponsors = sponsors.slice(0, options.limit);
      }

      return ok(sponsors);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to search sponsors'));
    }
  }

  async findActive(options?: {
    limit?: number;
    offset?: number;
    chamber?: string;
  }): Promise<Result<Sponsor[], Error>> {
    try {
      let sponsors = Array.from(this.sponsors.values()).filter(s => s.is_active);

      if (options?.chamber) {
        sponsors = sponsors.filter(s => s.chamber === options.chamber);
      }

      if (options?.offset) {
        sponsors = sponsors.slice(options.offset);
      }

      if (options?.limit) {
        sponsors = sponsors.slice(0, options.limit);
      }

      return ok(sponsors);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to find active sponsors'));
    }
  }

  async update(id: string, updates: Partial<NewSponsor>): Promise<Result<Sponsor, Error>> {
    try {
      const existingSponsor = this.sponsors.get(id);
      if (!existingSponsor) {
        return err(new Error(`Sponsor with ID ${id} not found`));
      }

      const updatedSponsor: Sponsor = {
        ...existingSponsor,
        ...updates,
        party: updates.party ?? existingSponsor.party,
        county: updates.county ?? existingSponsor.county,
        constituency: updates.constituency ?? existingSponsor.constituency,
        ward: updates.ward ?? existingSponsor.ward,
        mp_number: updates.mp_number ?? existingSponsor.mp_number,
        position: updates.position ?? existingSponsor.position,
        role: updates.role ?? existingSponsor.role,
        bio: updates.bio ?? existingSponsor.bio,
        photo_url: updates.photo_url ?? existingSponsor.photo_url,
        website: updates.website ?? existingSponsor.website,
        email: updates.email ?? existingSponsor.email,
        phone: updates.phone ?? existingSponsor.phone,
        office_location: updates.office_location ?? existingSponsor.office_location,
        social_media: updates.social_media ?? existingSponsor.social_media,
        financial_disclosures: updates.financial_disclosures ?? existingSponsor.financial_disclosures,
        last_disclosure_date: updates.last_disclosure_date ?? existingSponsor.last_disclosure_date,
        voting_record: updates.voting_record ?? existingSponsor.voting_record,
        attendance_rate: updates.attendance_rate ?? existingSponsor.attendance_rate,
        term_start: updates.term_start ?? existingSponsor.term_start,
        term_end: updates.term_end ?? existingSponsor.term_end,
        is_active: updates.is_active ?? existingSponsor.is_active,
        id: existingSponsor.id,
        created_at: existingSponsor.created_at,
        updated_at: new Date(),
      };

      this.sponsors.set(id, updatedSponsor);
      return ok(updatedSponsor);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update sponsor'));
    }
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      voting_record?: Record<string, unknown>;
      attendance_rate?: number;
      last_disclosure_date?: Date;
    }
  ): Promise<Result<void, Error>> {
    try {
      const existingSponsor = this.sponsors.get(id);
      if (!existingSponsor) {
        return err(new Error(`Sponsor with ID ${id} not found`));
      }

      const updatedSponsor: Sponsor = {
        ...existingSponsor,
        voting_record: metrics.voting_record ?? existingSponsor.voting_record,
        attendance_rate: metrics.attendance_rate ?? existingSponsor.attendance_rate,
        last_disclosure_date: metrics.last_disclosure_date ? metrics.last_disclosure_date.toISOString() : existingSponsor.last_disclosure_date,
        updated_at: new Date(),
      };

      this.sponsors.set(id, updatedSponsor);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to update performance metrics'));
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      const deleted = this.sponsors.delete(id);
      if (!deleted) {
        return err(new Error(`Sponsor with ID ${id} not found`));
      }
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to delete sponsor'));
    }
  }

  async count(criteria?: {
    party?: string;
    county?: string;
    chamber?: string;
    is_active?: boolean;
  }): Promise<Result<number, Error>> {
    try {
      let sponsors = Array.from(this.sponsors.values());

      if (criteria?.party) {
        sponsors = sponsors.filter(s => s.party === criteria.party);
      }

      if (criteria?.county) {
        sponsors = sponsors.filter(s => s.county === criteria.county);
      }

      if (criteria?.chamber) {
        sponsors = sponsors.filter(s => s.chamber === criteria.chamber);
      }

      if (criteria?.is_active !== undefined) {
        sponsors = sponsors.filter(s => s.is_active === criteria.is_active);
      }

      return ok(sponsors.length);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Failed to count sponsors'));
    }
  }

  /**
   * Clears all sponsors from the test repository
   */
  clear(): void {
    this.sponsors.clear();
  }

  /**
   * Gets all sponsors in the repository (for testing purposes)
   */
  getAll(): Sponsor[] {
    return Array.from(this.sponsors.values());
  }
}

