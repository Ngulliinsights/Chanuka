import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import {
  bill_sponsorships,
  type Sponsor,
  sponsors
} from '@server/infrastructure/schema';
import { and, asc, count, desc, eq, inArray, isNotNull, like, or } from 'drizzle-orm';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SponsorSearchOptions {
  party?: string;
  role?: string;
  constituency?: string;
  conflict_level?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'party' | 'transparency_score' | 'financial_exposure';
  sortOrder?: 'asc' | 'desc';
}

export interface SponsorAffiliationInput {
  sponsor_id: number;
  organization: string;
  role?: string | null;
  type: string;
  conflictType?: string | null;
  start_date?: Date | null;
  end_date?: Date | null;
  is_active?: boolean;
}

export interface SponsorTransparencyInput {
  sponsor_id: number;
  disclosureType: string;
  description: string;
  amount?: string | number | null;
  source?: string | null;
  dateReported?: Date | null;
  is_verified?: boolean;
}

export interface SponsorWithRelations extends Sponsor {
  affiliations: unknown[];
  transparency: unknown[];
  sponsorships: unknown[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SponsorService {
  // No need for database getter - use readDatabase/writeDatabase directly

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findById(id: number): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorService', operation: 'findById', sponsor_id: id };
    logger.debug(logContext, "Fetching sponsor by ID");

    try {
      const result = await readDatabase
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, id))
        .limit(1);

      const sponsor = Array.isArray(result) ? result[0] : undefined;

      if (!sponsor) {
        logger.debug(logContext, "Sponsor not found");
      }

      return sponsor || null;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to fetch sponsor by ID");
      throw error;
    }
  }

  async create(sponsorData: Partial<Sponsor>): Promise<Sponsor> {
    const logContext = { component: 'SponsorService', operation: 'create' };
    logger.debug({ ...logContext, name: sponsorData.name }, "Creating new sponsor");

    try {
      const now = new Date();
      const result = await withTransaction(async (tx) => {
        return await tx
          .insert(sponsors)
          .values({
            ...sponsorData,
            created_at: now,
            updated_at: now
          } as any)
          .returning();
      });

      const newSponsor = Array.isArray(result) ? result[0] : result;

      logger.info({
        ...logContext,
        sponsor_id: newSponsor.id,
        name: newSponsor.name
      }, "✅ Sponsor created successfully");

      return newSponsor;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to create sponsor");
      throw error;
    }
  }

  async update(id: number, updateData: Partial<Sponsor>): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorService', operation: 'update', sponsor_id: id };
    logger.debug(logContext, "Updating sponsor");

    try {
      const result = await withTransaction(async (tx) => {
        return await tx
          .update(sponsors)
          .set({
            ...updateData,
            updated_at: new Date()
          } as any)
          .where(eq(sponsors.id, id))
          .returning();
      });

      const updatedSponsor = Array.isArray(result) ? result[0] : undefined;

      if (updatedSponsor) {
        logger.info({
          ...logContext,
          name: updatedSponsor.name
        }, "✅ Sponsor updated successfully");
      } else {
        logger.debug(logContext, "Sponsor not found for update");
      }

      return updatedSponsor || null;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to update sponsor");
      throw error;
    }
  }

  async setActiveStatus(id: number, is_active: boolean): Promise<Sponsor | null> {
    const logContext = {
      component: 'SponsorService',
      operation: 'setActiveStatus',
      sponsor_id: id,
      status: is_active
    };
    logger.info(logContext, "Setting sponsor active status");

    return this.update(id, { is_active } as any);
  }

  async deactivate(id: number): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorService', operation: 'deactivate', sponsor_id: id };
    logger.info(logContext, "Deactivating sponsor");

    return this.setActiveStatus(id, false);
  }

  // ============================================================================
  // SEARCH AND LISTING OPERATIONS
  // ============================================================================

  async list(options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorService', operation: 'list', options };
    logger.debug(logContext, "Listing sponsors");

    try {
      let query = readDatabase.select().from(sponsors) as any;

      const conditions = [];
      if (options.party) conditions.push(eq(sponsors.party, options.party));
      if (options.role) conditions.push(eq(sponsors.role, options.role));
      if (options.constituency) conditions.push(eq(sponsors.constituency, options.constituency));
      if (options.is_active !== undefined) conditions.push(eq(sponsors.is_active, options.is_active));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const sortBy = options.sortBy || 'name';
      const sortOrder = options.sortOrder || 'asc';
      const sortColumn = sponsors[sortBy as keyof typeof sponsors];

      if (sortColumn) {
        query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      }

      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.offset(options.offset);

      const results = await query;

      logger.debug({ ...logContext, count: results.length }, "✅ Sponsors listed successfully");

      return results;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to list sponsors");
      throw error;
    }
  }

  async search(query: string, options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorService', operation: 'search', query, options };
    logger.debug(logContext, "Searching sponsors");

    try {
      const searchPattern = `%${query}%`;
      const searchConditions = [
        like(sponsors.name, searchPattern),
        like(sponsors.party, searchPattern),
        like(sponsors.constituency, searchPattern)
      ];

      let dbQuery = readDatabase
        .select()
        .from(sponsors)
        .where(or(...searchConditions)) as any;

      const additionalConditions = [];
      if (options.party) additionalConditions.push(eq(sponsors.party, options.party));
      if (options.role) additionalConditions.push(eq(sponsors.role, options.role));
      if (options.constituency) additionalConditions.push(eq(sponsors.constituency, options.constituency));
      if (options.is_active !== undefined) additionalConditions.push(eq(sponsors.is_active, options.is_active));

      if (additionalConditions.length > 0) {
        dbQuery = dbQuery.where(and(or(...searchConditions), ...additionalConditions));
      }

      const sortBy = options.sortBy || 'name';
      const sortOrder = options.sortOrder || 'asc';
      const sortColumn = sponsors[sortBy as keyof typeof sponsors];

      if (sortColumn) {
        dbQuery = dbQuery.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      }

      if (options.limit) dbQuery = dbQuery.limit(options.limit);
      if (options.offset) dbQuery = dbQuery.offset(options.offset);

      const results = await dbQuery;

      logger.debug({ ...logContext, count: results.length }, "✅ Sponsor search completed");

      return results;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to search sponsors");
      throw error;
    }
  }

  async findByIds(ids: number[]): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorService', operation: 'findByIds', count: ids.length };
    logger.debug(logContext, "Fetching sponsors by IDs");

    if (ids.length === 0) {
      logger.debug(logContext, "No IDs provided, returning empty array");
      return [];
    }

    try {
      const results = await readDatabase
        .select()
        .from(sponsors)
        .where(inArray(sponsors.id, ids));

      logger.debug({ ...logContext, found: results.length }, "✅ Sponsors fetched by IDs");

      return results;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to fetch sponsors by IDs");
      throw error;
    }
  }

  // ============================================================================
  // METADATA AND STATISTICS OPERATIONS
  // ============================================================================

  async getActiveSponsorCount(): Promise<number> {
    const logContext = { component: 'SponsorService', operation: 'getActiveSponsorCount' };
    logger.debug(logContext, "Counting active sponsors");

    try {
      const result = await readDatabase
        .select({ count: count() })
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      const totalCount = result[0]?.count || 0;
      logger.debug({ ...logContext, count: totalCount }, "✅ Active sponsor count retrieved");

      return totalCount;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to count active sponsors");
      throw error;
    }
  }

  async getUniqueParties(): Promise<string[]> {
    const logContext = { component: 'SponsorService', operation: 'getUniqueParties' };
    logger.debug(logContext, "Fetching unique parties");

    try {
      const results = await readDatabase
        .selectDistinct({ party: sponsors.party })
        .from(sponsors)
        .where(and(
          eq(sponsors.is_active, true),
          isNotNull(sponsors.party)
        ))
        .orderBy(asc(sponsors.party));

      const parties = results
        .map(r => r.party)
        .filter((party): party is string => Boolean(party));

      logger.debug({ ...logContext, count: parties.length }, "✅ Unique parties retrieved");

      return parties;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to fetch unique parties");
      throw error;
    }
  }

  async getUniqueConstituencies(): Promise<string[]> {
    const logContext = { component: 'SponsorService', operation: 'getUniqueConstituencies' };
    logger.debug(logContext, "Fetching unique constituencies");

    try {
      const results = await this.database
        .selectDistinct({ constituency: sponsors.constituency })
        .from(sponsors)
        .where(and(
          eq(sponsors.is_active, true),
          isNotNull(sponsors.constituency)
        ))
        .orderBy(asc(sponsors.constituency));

      const constituencies = results
        .map(r => r.constituency)
        .filter((constituency): constituency is string => Boolean(constituency));

      logger.debug({ ...logContext, count: constituencies.length }, "✅ Unique constituencies retrieved");

      return constituencies;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to fetch unique constituencies");
      throw error;
    }
  }

  async listParties(): Promise<string[]> {
    return this.getUniqueParties();
  }

  async listConstituencies(): Promise<string[]> {
    return this.getUniqueConstituencies();
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    parties: number;
    constituencies: number;
  }> {
    const logContext = { component: 'SponsorService', operation: 'getStatistics' };
    logger.debug(logContext, "Getting sponsor statistics");

    try {
      const totalResult = await readDatabase
        .select({ count: count() })
        .from(sponsors);

      const activeCount = await this.getActiveSponsorCount();
      const parties = await this.getUniqueParties();
      const constituencies = await this.getUniqueConstituencies();

      const stats = {
        total: totalResult[0]?.count || 0,
        active: activeCount,
        parties: parties.length,
        constituencies: constituencies.length
      };

      logger.debug({ ...logContext, stats }, "✅ Statistics retrieved");
      return stats;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to get statistics");
      throw error;
    }
  }

  // ============================================================================
  // BILL SPONSORSHIP MANAGEMENT
  // ============================================================================

  async listBillSponsorshipsBySponsor(sponsor_id: number, activeOnly: boolean = true): Promise<unknown[]> {
    const logContext = {
      component: 'SponsorService',
      operation: 'listBillSponsorshipsBySponsor',
      sponsor_id,
      activeOnly
    };
    logger.debug(logContext, "Fetching bill sponsorships initiated by sponsor");

    try {
      let query = readDatabase
        .select()
        .from(bill_sponsorships)
        .where(eq(bill_sponsorships.sponsor_id, sponsor_id)) as any;

      if (activeOnly) {
        query = query.where(eq(bill_sponsorships.is_active, true));
      }

      const results = await query.orderBy(desc(bill_sponsorships.sponsorship_date));

      logger.debug({ ...logContext, count: results.length }, "✅ Bill sponsorships retrieved");
      return results;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to fetch bill sponsorships");
      throw error;
    }
  }

  async listSponsorsForBill(bill_id: number, activeOnly: boolean = true): Promise<unknown[]> {
    const logContext = {
      component: 'SponsorService',
      operation: 'listSponsorsForBill',
      bill_id,
      activeOnly
    };
    logger.debug(logContext, "Fetching all sponsors for a bill");

    try {
      let query = readDatabase
        .select()
        .from(bill_sponsorships)
        .where(eq(bill_sponsorships.bill_id, bill_id)) as any;

      if (activeOnly) {
        query = query.where(eq(bill_sponsorships.is_active, true));
      }

      const results = await query.orderBy(asc(bill_sponsorships.sponsorship_date));

      logger.debug({ ...logContext, count: results.length }, "✅ Bill sponsors retrieved");
      return results;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to fetch bill sponsors");
      throw error;
    }
  }

  async createBillSponsorship(
    sponsor_id: number,
    bill_id: number,
    sponsorshipType: string,
    sponsorshipDate?: Date
  ): Promise<any> {
    const logContext = {
      component: 'SponsorService',
      operation: 'createBillSponsorship',
      sponsor_id,
      bill_id,
      type: sponsorshipType
    };
    logger.info(logContext, "Creating bill sponsorship link");

    try {
      const now = new Date();
      const result = await withTransaction(async (tx) => {
        return await tx
          .insert(bill_sponsorships)
          .values({
            sponsor_id,
            bill_id,
            sponsorship_type: sponsorshipType,
            sponsorship_date: sponsorshipDate || now,
            is_active: true,
            created_at: now,
            updated_at: now
          } as any)
          .returning();
      });

      const newSponsorship = Array.isArray(result) ? result[0] : result;

      logger.info({ ...logContext, sponsorship_id: newSponsorship.id }, "✅ Bill sponsorship created");

      return newSponsorship;
    } catch (error) {
      logger.error({ ...logContext, error }, "Failed to create bill sponsorship");
      throw error;
    }
  }

  // ============================================================================
  // AFFILIATION MANAGEMENT (Placeholder - tables don't exist yet)
  // ============================================================================

  async listAffiliations(sponsor_id: number, activeOnly: boolean = true): Promise<unknown[]> {
    const logContext = {
      component: 'SponsorService',
      operation: 'listAffiliations',
      sponsor_id,
      activeOnly
    };
    logger.debug(logContext, "Fetching sponsor affiliations (placeholder)");

    // TODO: Implement when affiliation tables are added to schema
    return [];
  }

  async addAffiliation(affiliationData: SponsorAffiliationInput): Promise<any> {
    const logContext = {
      component: 'SponsorService',
      operation: 'addAffiliation',
      sponsor_id: affiliationData.sponsor_id
    };
    logger.debug(logContext, "Adding sponsor affiliation (placeholder)");

    // TODO: Implement when affiliation tables are added to schema
    throw new Error("Affiliation functionality not yet implemented - tables don't exist in schema");
  }

  // ============================================================================
  // TRANSPARENCY MANAGEMENT (Placeholder - tables don't exist yet)
  // ============================================================================

  async listTransparencyRecords(sponsor_id: number): Promise<unknown[]> {
    const logContext = {
      component: 'SponsorService',
      operation: 'listTransparencyRecords',
      sponsor_id
    };
    logger.debug(logContext, "Fetching sponsor transparency records (placeholder)");

    // TODO: Implement when transparency tables are added to schema
    return [];
  }

  async addTransparencyRecord(transparencyData: SponsorTransparencyInput): Promise<any> {
    const logContext = {
      component: 'SponsorService',
      operation: 'addTransparencyRecord',
      sponsor_id: transparencyData.sponsor_id
    };
    logger.debug(logContext, "Adding sponsor transparency record (placeholder)");

    // TODO: Implement when transparency tables are added to schema
    throw new Error("Transparency functionality not yet implemented - tables don't exist in schema");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const sponsorService = new SponsorService();