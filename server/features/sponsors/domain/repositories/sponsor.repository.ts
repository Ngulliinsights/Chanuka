// ============================================================================
// SPONSOR REPOSITORY - Domain-Specific Repository
// ============================================================================
// Provides data access operations for sponsors with domain-specific methods.
// Extends BaseRepository for infrastructure (caching, logging, error handling).

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';
import { sponsors } from '@server/infrastructure/schema';
import { eq, and, or, inArray, desc, asc, sql, like } from 'drizzle-orm';

/**
 * Sponsor entity type (inferred from schema)
 */
export type Sponsor = typeof sponsors.$inferSelect;

/**
 * New sponsor data type (for inserts)
 */
export type InsertSponsor = typeof sponsors.$inferInsert;

/**
 * Query options for sponsor searches
 */
export interface SponsorQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Sponsor search options
 */
export interface SponsorSearchOptions extends SponsorQueryOptions {
  party?: string | string[];
  county?: string;
  constituency?: string;
  isActive?: boolean;
}

/**
 * Sponsor repository providing domain-specific data access methods.
 * 
 * DESIGN PRINCIPLES:
 * - Domain-specific methods (NOT generic CRUD)
 * - Methods reflect business operations
 * - Example: findByParty(), findByConstituency()
 * - NOT: findById(), findAll()
 * 
 * @example Basic Usage
 * ```typescript
 * const repository = new SponsorRepository();
 * 
 * // Find by party
 * const result = await repository.findByParty('Jubilee');
 * if (result.isOk) {
 *   console.log('Found', result.value.length, 'sponsors');
 * }
 * 
 * // Find by constituency
 * const sponsorResult = await repository.findByConstituency('Westlands');
 * ```
 */
export class SponsorRepository extends BaseRepository<Sponsor> {
  constructor() {
    super({
      entityName: 'Sponsor',
      enableCache: true,
      cacheTTL: 600, // 10 minutes (sponsors change less frequently)
      enableLogging: true,
    });
  }

  /**
   * Find sponsor by name (unique identifier)
   * 
   * @param name - Sponsor name
   * @returns Result containing Maybe<Sponsor>
   */
  async findByName(name: string): Promise<Result<Maybe<Sponsor>, Error>> {
    return this.executeRead(
      async (db: any) => {
        const results = await db
          .select()
          .from(sponsors)
          .where(eq(sponsors.name, name))
          .limit(1);
        return results[0] ?? null;
      },
      `sponsor:name:${name}`
    );
  }

  /**
   * Find sponsors by party
   * 
   * @param party - Party name or array of parties
   * @param options - Query options
   * @returns Result containing array of sponsors
   */
  async findByParty(
    party: string | string[],
    options?: SponsorQueryOptions
  ): Promise<Result<Sponsor[], Error>> {
    const parties = Array.isArray(party) ? party : [party];
    
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(sponsors)
          .where(inArray(sponsors.party, parties));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = sponsors[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(asc(sponsors.name));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `sponsor:party:${parties.sort().join(',')}`
    );
  }

  /**
   * Find sponsors by constituency
   * 
   * @param constituency - Constituency name
   * @param options - Query options
   * @returns Result containing array of sponsors
   */
  async findByConstituency(
    constituency: string,
    options?: SponsorQueryOptions
  ): Promise<Result<Sponsor[], Error>> {
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(sponsors)
          .where(eq(sponsors.constituency, constituency));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = sponsors[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(asc(sponsors.name));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `sponsor:constituency:${constituency}`
    );
  }

  /**
   * Find sponsors by county
   * 
   * @param county - County name
   * @param options - Query options
   * @returns Result containing array of sponsors
   */
  async findByCounty(
    county: string,
    options?: SponsorQueryOptions
  ): Promise<Result<Sponsor[], Error>> {
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(sponsors)
          .where(eq(sponsors.county, county));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = sponsors[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(asc(sponsors.name));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `sponsor:county:${county}`
    );
  }

  /**
   * Find active sponsors
   * 
   * @param options - Query options
   * @returns Result containing array of active sponsors
   */
  async findActive(options?: SponsorQueryOptions): Promise<Result<Sponsor[], Error>> {
    return this.executeRead(
      async (db: any) => {
        let query = db
          .select()
          .from(sponsors)
          .where(eq(sponsors.is_active, true));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = sponsors[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(asc(sponsors.name));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `sponsor:active:${options?.limit ?? 50}:${options?.offset ?? 0}`
    );
  }

  /**
   * Search sponsors by keywords
   * 
   * @param keywords - Search keywords
   * @param options - Search options
   * @returns Result containing array of sponsors
   */
  async searchSponsors(
    keywords: string,
    options?: SponsorSearchOptions
  ): Promise<Result<Sponsor[], Error>> {
    return this.executeRead(
      async (db: any) => {
        const searchPattern = `%${keywords.toLowerCase()}%`;
        
        // Build conditions
        const conditions = [
          or(
            like(sql`LOWER(${sponsors.name})`, searchPattern),
            like(sql`LOWER(${sponsors.constituency})`, searchPattern),
            like(sql`LOWER(${sponsors.county})`, searchPattern)
          )
        ];

        // Add party filter
        if (options?.party) {
          const parties = Array.isArray(options.party) ? options.party : [options.party];
          conditions.push(inArray(sponsors.party, parties));
        }

        // Add county filter
        if (options?.county) {
          conditions.push(eq(sponsors.county, options.county));
        }

        // Add constituency filter
        if (options?.constituency) {
          conditions.push(eq(sponsors.constituency, options.constituency));
        }

        // Add active filter
        if (options?.isActive !== undefined) {
          conditions.push(eq(sponsors.is_active, options.isActive));
        }

        let query = db
          .select()
          .from(sponsors)
          .where(and(...conditions));

        // Apply sorting
        if (options?.sortBy) {
          const sortColumn = sponsors[options.sortBy];
          query = options.sortOrder === 'asc'
            ? query.orderBy(asc(sortColumn))
            : query.orderBy(desc(sortColumn));
        } else {
          query = query.orderBy(asc(sponsors.name));
        }

        // Apply pagination
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      }
      // No caching for search results
    );
  }

  /**
   * Count sponsors by criteria
   * 
   * @param criteria - Count criteria
   * @returns Result containing count
   */
  async count(criteria?: {
    party?: string | string[];
    county?: string;
    constituency?: string;
    isActive?: boolean;
  }): Promise<Result<number, Error>> {
    return this.executeRead(
      async (db: any) => {
        const conditions = [];

        if (criteria?.party) {
          const parties = Array.isArray(criteria.party) ? criteria.party : [criteria.party];
          conditions.push(inArray(sponsors.party, parties));
        }

        if (criteria?.county) {
          conditions.push(eq(sponsors.county, criteria.county));
        }

        if (criteria?.constituency) {
          conditions.push(eq(sponsors.constituency, criteria.constituency));
        }

        if (criteria?.isActive !== undefined) {
          conditions.push(eq(sponsors.is_active, criteria.isActive));
        }

        const query = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(sponsors);

        if (conditions.length > 0) {
          query.where(and(...conditions));
        }

        const [result] = await query;
        return Number(result.count);
      },
      criteria ? `sponsor:count:${JSON.stringify(criteria)}` : 'sponsor:count:all'
    );
  }

  /**
   * Create new sponsor
   * 
   * @param data - Sponsor data
   * @returns Result containing created sponsor
   */
  async create(data: InsertSponsor): Promise<Result<Sponsor, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const results = await tx
          .insert(sponsors)
          .values(data)
          .returning();
        return results[0];
      },
      ['sponsor:*']
    );
  }

  /**
   * Update sponsor
   * 
   * @param name - Sponsor name
   * @param data - Partial sponsor data
   * @returns Result containing updated sponsor
   */
  async update(name: string, data: Partial<InsertSponsor>): Promise<Result<Sponsor, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const results = await tx
          .update(sponsors)
          .set({ ...data, updated_at: new Date() })
          .where(eq(sponsors.name, name))
          .returning();
        
        if (results.length === 0) {
          throw new Error(`Sponsor not found: ${name}`);
        }
        
        return results[0];
      },
      [`sponsor:name:${name}`, 'sponsor:*']
    );
  }

  /**
   * Delete sponsor
   * 
   * @param name - Sponsor name
   * @returns Result containing void
   */
  async delete(name: string): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx: any) => {
        const result = await tx
          .delete(sponsors)
          .where(eq(sponsors.name, name));
        
        if (result.rowCount === 0) {
          throw new Error(`Sponsor not found: ${name}`);
        }
      },
      [`sponsor:name:${name}`, 'sponsor:*']
    );
  }

  /**
   * Create multiple sponsors in batch
   * 
   * @param data - Array of sponsor data
   * @returns Result containing created sponsors
   */
  async createBatch(data: InsertSponsor[]): Promise<Result<Sponsor[], Error>> {
    return this.executeBatchWrite(
      async (tx: any) => {
        return await tx
          .insert(sponsors)
          .values(data)
          .returning();
      },
      'sponsor:*'
    );
  }

  /**
   * Delete multiple sponsors in batch
   * 
   * @param names - Array of sponsor names
   * @returns Result containing void
   */
  async deleteBatch(names: string[]): Promise<Result<void, Error>> {
    return this.executeBatchWrite(
      async (tx: any) => {
        await tx
          .delete(sponsors)
          .where(inArray(sponsors.name, names));
      },
      'sponsor:*'
    );
  }
}
