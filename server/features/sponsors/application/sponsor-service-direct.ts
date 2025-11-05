import { db } from '@shared/database/pool.js';
import {
  sponsors, bill_cosponsors, bills, sponsor_affiliations, sponsor_transparency,
  type Sponsor, type InsertSponsor, type Bill
} from '@shared/schema';
import { eq, and, sql, desc, asc, count, inArray, like, or, isNull, isNotNull } from 'drizzle-orm';
import { logger } from '@shared/core/observability/logging/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Search options for filtering and paginating sponsor queries.
 * All fields are optional to allow flexible querying.
 */
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

/**
 * Input structure for creating or updating sponsor affiliations.
 * This represents relationships between sponsors and organizations.
 */
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

/**
 * Input structure for transparency and disclosure records.
 * These records track financial disclosures and conflict of interest declarations.
 */
export interface SponsorTransparencyInput {
  sponsor_id: number;
  disclosureType: string;
  description: string;
  amount?: string | number | null;
  source?: string | null;
  dateReported?: Date | null;
  is_verified?: boolean;
}

/**
 * Extended sponsor data that includes related records.
 * Used when fetching complete sponsor profiles with relationships.
 */
export interface SponsorWithRelations extends Sponsor {
  affiliations: any[];
  transparency: any[];
  sponsorships: any[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * SponsorService - Primary service for managing parliamentary sponsor data.
 * 
 * This service provides a comprehensive interface for CRUD operations on sponsors,
 * their affiliations, transparency records, and legislative activities. It uses
 * Drizzle ORM for type-safe database interactions and includes detailed logging
 * for observability.
 * 
 * Key responsibilities:
 * - Basic sponsor CRUD operations
 * - Advanced search and filtering capabilities
 * - Metadata aggregation (parties, constituencies, statistics)
 * - Bill sponsorship tracking
 * - Affiliation management (to be implemented)
 * - Transparency record management (to be implemented)
 */
export class SponsorService {
  private get database() {
    return db;
  }

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  /**
   * Retrieves a single sponsor by their unique identifier.
   * Returns null if the sponsor doesn't exist rather than throwing an error.
   * 
   * @param id - The unique sponsor identifier
   * @returns The sponsor record or null if not found
   */
  async findById(id: number): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorService', operation: 'findById', sponsor_id: id };
    logger.debug("Fetching sponsor by ID", logContext);

    try {
      const [sponsor] = await this.database
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, id))
        .limit(1);

      if (!sponsor) {
        logger.debug("Sponsor not found", logContext);
      }

      return sponsor || null;
    } catch (error) {
      logger.error("Failed to fetch sponsor by ID", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Creates a new sponsor record with automatic timestamp management.
   * 
   * @param sponsorData - The sponsor data to insert (excluding auto-generated fields)
   * @returns The newly created sponsor with all generated fields populated
   */
  async create(sponsorData: InsertSponsor): Promise<Sponsor> {
    const logContext = { component: 'SponsorService', operation: 'create' };
    logger.debug("Creating new sponsor", { ...logContext, name: sponsorData.name });

    try {
      const now = new Date();
      const [newSponsor] = await this.database
        .insert(sponsors)
        .values({
          ...sponsorData,
          created_at: now,
          updated_at: now
        })
        .returning();

      logger.info("✅ Sponsor created successfully", { 
        ...logContext, 
        sponsor_id: newSponsor.id,
        name: newSponsor.name 
      });

      return newSponsor;
    } catch (error) {
      logger.error("Failed to create sponsor", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Updates an existing sponsor record with partial data.
   * Only the fields provided in updateData will be modified.
   * 
   * @param id - The unique sponsor identifier
   * @param updateData - Partial sponsor data containing only fields to update
   * @returns The updated sponsor record or null if the sponsor doesn't exist
   */
  async update(id: number, updateData: Partial<InsertSponsor>): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorService', operation: 'update', sponsor_id: id };
    logger.debug("Updating sponsor", logContext);

    try {
      const [updatedSponsor] = await this.database
        .update(sponsors)
        .set({
          ...updateData,
          updated_at: new Date()
        })
        .where(eq(sponsors.id, id))
        .returning();

      if (updatedSponsor) {
        logger.info("✅ Sponsor updated successfully", { 
          ...logContext, 
          name: updatedSponsor.name 
        });
      } else {
        logger.debug("Sponsor not found for update", logContext);
      }

      return updatedSponsor || null;
    } catch (error) {
      logger.error("Failed to update sponsor", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Convenience method to toggle a sponsor's active status.
   * This is commonly used when sponsors leave office or return.
   * 
   * @param id - The unique sponsor identifier
   * @param is_active - The new active status
   * @returns The updated sponsor record
   */
  async setActiveStatus(id: number, is_active: boolean): Promise<Sponsor | null> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'setActiveStatus', 
      sponsor_id: id, 
      status: is_active 
    };
    logger.info(`Setting sponsor active status`, logContext);

    return this.update(id, { is_active });
  }

  // ============================================================================
  // SEARCH AND LISTING OPERATIONS
  // ============================================================================

  /**
   * Lists sponsors with optional filtering, sorting, and pagination.
   * This is the primary method for building sponsor directories and filtered views.
   * 
   * The method builds a dynamic query based on the provided options, allowing for
   * flexible filtering combinations without requiring separate methods for each case.
   * 
   * @param options - Search options for filtering, sorting, and pagination
   * @returns Array of sponsors matching the criteria
   */
  async list(options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorService', operation: 'list', options };
    logger.debug("Listing sponsors", logContext);

    try {
      // Start building the query - we'll progressively add clauses
      let query = this.database.select().from(sponsors);

      // Build filter conditions dynamically based on provided options
      const conditions = [];
      if (options.party) conditions.push(eq(sponsors.party, options.party));
      if (options.role) conditions.push(eq(sponsors.role, options.role));
      if (options.constituency) conditions.push(eq(sponsors.constituency, options.constituency));
      if (options.is_active !== undefined) conditions.push(eq(sponsors.is_active, options.is_active));

      // Apply all conditions together using AND logic
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting with defaults to ensure consistent ordering
      const sortBy = options.sortBy || 'name';
      const sortOrder = options.sortOrder || 'asc';
      const sortColumn = sponsors[sortBy as keyof typeof sponsors];
      
      if (sortColumn) {
        query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      }

      // Apply pagination for large result sets
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.offset(options.offset);

      const results = await query;
      
      logger.debug("✅ Sponsors listed successfully", { 
        ...logContext, 
        count: results.length 
      });

      return results;
    } catch (error) {
      logger.error("Failed to list sponsors", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Searches sponsors using text matching across multiple fields.
   * Combines free-text search with optional structured filters.
   * 
   * The search uses LIKE patterns for fuzzy matching, searching across name,
   * party, and constituency fields simultaneously.
   * 
   * @param query - The search text to match
   * @param options - Additional filters and pagination options
   * @returns Array of sponsors matching the search criteria
   */
  async search(query: string, options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorService', operation: 'search', query, options };
    logger.debug("Searching sponsors", logContext);

    try {
      // Create search conditions for text matching across multiple fields
      const searchPattern = `%${query}%`;
      const searchConditions = [
        like(sponsors.name, searchPattern),
        like(sponsors.party, searchPattern),
        like(sponsors.constituency, searchPattern)
      ];

      // Start with the search conditions using OR (match any field)
      let dbQuery = this.database
        .select()
        .from(sponsors)
        .where(or(...searchConditions));

      // Layer on additional structured filters using AND logic
      const additionalConditions = [];
      if (options.party) additionalConditions.push(eq(sponsors.party, options.party));
      if (options.role) additionalConditions.push(eq(sponsors.role, options.role));
      if (options.constituency) additionalConditions.push(eq(sponsors.constituency, options.constituency));
      if (options.is_active !== undefined) additionalConditions.push(eq(sponsors.is_active, options.is_active));

      // Combine search with filters: (search OR conditions) AND (additional filters)
      if (additionalConditions.length > 0) {
        dbQuery = dbQuery.where(and(or(...searchConditions), ...additionalConditions));
      }

      // Apply sorting and pagination
      const sortBy = options.sortBy || 'name';
      const sortOrder = options.sortOrder || 'asc';
      const sortColumn = sponsors[sortBy as keyof typeof sponsors];
      
      if (sortColumn) {
        dbQuery = dbQuery.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      }

      if (options.limit) dbQuery = dbQuery.limit(options.limit);
      if (options.offset) dbQuery = dbQuery.offset(options.offset);

      const results = await dbQuery;

      logger.debug("✅ Sponsor search completed", { 
        ...logContext, 
        count: results.length 
      });

      return results;
    } catch (error) {
      logger.error("Failed to search sponsors", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Efficiently retrieves multiple sponsors by their IDs in a single query.
   * Useful for bulk operations and relationship resolution.
   * 
   * @param ids - Array of sponsor IDs to fetch
   * @returns Array of matching sponsors (may be fewer than requested if some don't exist)
   */
  async findByIds(ids: number[]): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorService', operation: 'findByIds', count: ids.length };
    logger.debug("Fetching sponsors by IDs", logContext);

    // Short-circuit for empty input to avoid unnecessary database calls
    if (ids.length === 0) {
      logger.debug("No IDs provided, returning empty array", logContext);
      return [];
    }

    try {
      const results = await this.database
        .select()
        .from(sponsors)
        .where(inArray(sponsors.id, ids));

      logger.debug("✅ Sponsors fetched by IDs", { ...logContext, found: results.length });

      return results;
    } catch (error) {
      logger.error("Failed to fetch sponsors by IDs", { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // METADATA AND STATISTICS OPERATIONS
  // ============================================================================

  /**
   * Returns the count of currently active sponsors.
   * Useful for dashboard statistics and capacity planning.
   * 
   * @returns Number of active sponsors
   */
  async getActiveSponsorCount(): Promise<number> {
    const logContext = { component: 'SponsorService', operation: 'getActiveSponsorCount' };
    logger.debug("Counting active sponsors", logContext);

    try {
      const [result] = await this.database
        .select({ count: count() })
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      const totalCount = result.count;
      logger.debug("✅ Active sponsor count retrieved", { ...logContext, count: totalCount });

      return totalCount;
    } catch (error) {
      logger.error("Failed to count active sponsors", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Retrieves all unique party affiliations from active sponsors.
   * This is useful for building filter dropdowns and understanding party distribution.
   * 
   * @returns Array of unique party names
   */
  async getUniqueParties(): Promise<string[]> {
    const logContext = { component: 'SponsorService', operation: 'getUniqueParties' };
    logger.debug("Fetching unique parties", logContext);

    try {
      const results = await this.database
        .selectDistinct({ party: sponsors.party })
        .from(sponsors)
        .where(and(
          eq(sponsors.is_active, true),
          isNotNull(sponsors.party)
        ))
        .orderBy(asc(sponsors.party));

      // Filter out any null/empty values and extract just the party names
      const parties = results
        .map(r => r.party)
        .filter((party): party is string => Boolean(party));

      logger.debug("✅ Unique parties retrieved", { ...logContext, count: parties.length });

      return parties;
    } catch (error) {
      logger.error("Failed to fetch unique parties", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Retrieves all unique constituencies from active sponsors.
   * This is useful for geographical filtering and constituency-based analysis.
   * 
   * @returns Array of unique constituency names
   */
  async getUniqueConstituencies(): Promise<string[]> {
    const logContext = { component: 'SponsorService', operation: 'getUniqueConstituencies' };
    logger.debug("Fetching unique constituencies", logContext);

    try {
      const results = await this.database
        .selectDistinct({ constituency: sponsors.constituency })
        .from(sponsors)
        .where(and(
          eq(sponsors.is_active, true),
          isNotNull(sponsors.constituency)
        ))
        .orderBy(asc(sponsors.constituency));

      // Filter out any null/empty values and extract constituency names
      const constituencies = results
        .map(r => r.constituency)
        .filter((constituency): constituency is string => Boolean(constituency));

      logger.debug("✅ Unique constituencies retrieved", { 
        ...logContext, 
        count: constituencies.length 
      });

      return constituencies;
    } catch (error) {
      logger.error("Failed to fetch unique constituencies", { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // BILL RELATIONSHIP OPERATIONS
  // ============================================================================

  /**
   * Efficiently retrieves multiple bills by their IDs.
   * This is optimized for bulk fetching when displaying a sponsor's legislative portfolio.
   * 
   * @param bill_ids - Array of bill IDs to fetch
   * @returns Array of matching bill records
   */
  async getBillsByIds(bill_ids: number[]): Promise<Bill[]> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'getBillsByIds', 
      count: bill_ids.length 
    };
    logger.debug("Fetching multiple bills by IDs", logContext);

    // Avoid unnecessary database calls for empty input
    if (bill_ids.length === 0) {
      logger.debug("No bill IDs provided, returning empty array", logContext);
      return [];
    }

    try {
      const results = await this.database
        .select()
        .from(bills)
        .where(inArray(bills.id, bill_ids));

      logger.debug("✅ Bills fetched by IDs", { ...logContext, found: results.length });

      return results;
    } catch (error) {
      logger.error("Failed to fetch bills by IDs", { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // COMPLEX QUERIES WITH RELATIONS
  // ============================================================================

  /**
   * Retrieves a sponsor with all related records (affiliations, transparency, sponsorships).
   * 
   * NOTE: This is currently a simplified implementation that returns empty relations.
   * Full implementation will require JOIN queries or separate fetches for related data.
   * 
   * @param id - The unique sponsor identifier
   * @returns Sponsor with relations or null if not found
   */
  async findByIdWithRelations(id: number): Promise<SponsorWithRelations | null> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'findByIdWithRelations', 
      sponsor_id: id 
    };
    logger.debug("Fetching sponsor with relations", logContext);

    try {
      const sponsor = await this.findById(id);
      
      if (!sponsor) {
        logger.debug("Sponsor not found", logContext);
        return null;
      }

      // TODO: Implement actual relation fetching
      // For now, return sponsor with empty relation arrays
      const sponsorWithRelations: SponsorWithRelations = {
        ...sponsor,
        affiliations: [],
        transparency: [],
        sponsorships: []
      };

      logger.debug("✅ Sponsor with relations retrieved (simplified)", logContext);

      return sponsorWithRelations;
    } catch (error) {
      logger.error("Failed to fetch sponsor with relations", { ...logContext, error });
      throw error;
    }
  }

  // ============================================================================
  // AFFILIATION MANAGEMENT
  // ============================================================================

  /**
   * Lists all affiliations for a sponsor with optional filtering by active status.
   * 
   * @param sponsor_id - The sponsor whose affiliations to fetch
   * @param activeOnly - Whether to filter to only active affiliations
   * @returns Array of affiliation records
   */
  async listAffiliations(sponsor_id: number, activeOnly: boolean = true): Promise<any[]> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'listAffiliations', 
      sponsor_id, 
      activeOnly 
    };
    logger.debug("Fetching sponsor affiliations", logContext);
    
    try {
      let query = this.database
        .select()
        .from(sponsor_affiliations)
        .where(eq(sponsor_affiliations.sponsor_id, sponsor_id));

      if (activeOnly) {
        query = query.where(eq(sponsor_affiliations.is_active, true));
      }

      const results = await query.orderBy(desc(sponsor_affiliations.start_date));
      
      logger.debug("✅ Sponsor affiliations retrieved", { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error("Failed to fetch sponsor affiliations", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Creates a new affiliation record linking a sponsor to an organization.
   * 
   * @param affiliationData - The affiliation data to insert
   * @returns The newly created affiliation record
   */
  async addAffiliation(affiliationData: SponsorAffiliationInput): Promise<any> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'addAffiliation', 
      sponsor_id: affiliationData.sponsor_id 
    };
    logger.debug("Adding sponsor affiliation", logContext);
    
    try {
      const now = new Date();
      const [newAffiliation] = await this.database
        .insert(sponsor_affiliations)
        .values({
          ...affiliationData,
          start_date: affiliationData.start_date || now,
          end_date: affiliationData.end_date,
          created_at: now,
          updated_at: now
        })
        .returning();

      logger.info("✅ Sponsor affiliation created", { 
        ...logContext, 
        affiliation_id: newAffiliation.id,
        organization: newAffiliation.organization 
      });

      return newAffiliation;
    } catch (error) {
      logger.error("Failed to create sponsor affiliation", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Updates an existing affiliation record.
   * 
   * TODO: Implement affiliation updates
   * 
   * @param id - The affiliation record ID
   * @param updateData - Partial affiliation data to update
   * @returns The updated affiliation record
   */
  async updateAffiliation(
    id: number, 
    updateData: Partial<SponsorAffiliationInput>
  ): Promise<any | null> {
    const logContext = { component: 'SponsorService', operation: 'updateAffiliation', id };
    logger.debug("Updating affiliation (placeholder)", logContext);
    
    throw new Error("Affiliation functionality not yet implemented");
  }

  /**
   * Toggles an affiliation's active status, optionally setting an end date.
   * 
   * TODO: Implement affiliation status management
   * 
   * @param id - The affiliation record ID
   * @param is_active - The new active status
   * @param endDate - Optional end date when deactivating
   * @returns The updated affiliation record
   */
  async setAffiliationActiveStatus(
    id: number, 
    is_active: boolean, 
    end_date?: Date
  ): Promise<any | null> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'setAffiliationActiveStatus', 
      id, 
      is_active 
    };
    logger.debug("Setting affiliation status (placeholder)", logContext);
    
    throw new Error("Affiliation functionality not yet implemented");
  }

  // ============================================================================
  // TRANSPARENCY MANAGEMENT
  // ============================================================================

  /**
   * Lists all transparency and disclosure records for a sponsor.
   * 
   * @param sponsor_id - The sponsor whose records to fetch
   * @returns Array of transparency records
   */
  async listTransparencyRecords(sponsor_id: number): Promise<any[]> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'listTransparencyRecords', 
      sponsor_id 
    };
    logger.debug("Fetching sponsor transparency records", logContext);
    
    try {
      const results = await this.database
        .select()
        .from(sponsor_transparency)
        .where(eq(sponsor_transparency.sponsor_id, sponsor_id))
        .orderBy(desc(sponsor_transparency.date_reported));

      logger.debug("✅ Transparency records retrieved", { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error("Failed to fetch transparency records", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Creates a new transparency or disclosure record.
   * 
   * @param transparencyData - The transparency record data
   * @returns The newly created record
   */
  async addTransparencyRecord(transparencyData: SponsorTransparencyInput): Promise<any> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'addTransparencyRecord', 
      sponsor_id: transparencyData.sponsor_id 
    };
    logger.debug("Adding sponsor transparency record", logContext);
    
    try {
      const now = new Date();
      const [newRecord] = await this.database
        .insert(sponsor_transparency)
        .values({
          ...transparencyData,
          amount: typeof transparencyData.amount === 'number' 
            ? transparencyData.amount.toString() 
            : transparencyData.amount,
          date_reported: transparencyData.dateReported || now,
          created_at: now,
          updated_at: now
        })
        .returning();

      logger.info("✅ Transparency record created", { 
        ...logContext, 
        record_id: newRecord.id,
        disclosure_type: newRecord.disclosure_type 
      });

      return newRecord;
    } catch (error) {
      logger.error("Failed to create transparency record", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Updates an existing transparency record.
   * 
   * TODO: Implement transparency record updates
   * 
   * @param id - The transparency record ID
   * @param updateData - Partial data to update
   * @returns The updated record
   */
  async updateTransparencyRecord(
    id: number, 
    updateData: Partial<SponsorTransparencyInput>
  ): Promise<any | null> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'updateTransparencyRecord', 
      id 
    };
    logger.debug("Updating transparency record (placeholder)", logContext);
    
    throw new Error("Transparency functionality not yet implemented");
  }

  /**
   * Marks a transparency record as verified after review.
   * 
   * TODO: Implement verification functionality
   * 
   * @param id - The transparency record ID
   * @returns The updated record
   */
  async verifyTransparencyRecord(id: number): Promise<any | null> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'verifyTransparencyRecord', 
      id 
    };
    logger.debug("Verifying transparency record (placeholder)", logContext);
    
    throw new Error("Transparency functionality not yet implemented");
  }

  // ============================================================================
  // BILL SPONSORSHIP MANAGEMENT
  // ============================================================================

  /**
   * Lists all bill sponsorships initiated by a specific sponsor.
   * 
   * @param sponsor_id - The sponsor whose sponsorships to fetch
   * @param activeOnly - Whether to filter to only active sponsorships
   * @returns Array of sponsorship records
   */
  async listBillSponsorshipsBySponsor(sponsor_id: number, activeOnly: boolean = true): Promise<any[]> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'listBillSponsorshipsBySponsor', 
      sponsor_id, 
      activeOnly 
    };
    logger.debug("Fetching bill sponsorships initiated by sponsor", logContext);
    
    try {
      let query = this.database
        .select()
        .from(bill_cosponsors)
        .where(eq(bill_cosponsors.sponsor_id, sponsor_id));

      if (activeOnly) {
        query = query.where(eq(bill_cosponsors.is_active, true));
      }

      const results = await query.orderBy(desc(bill_cosponsors.sponsorship_date));
      
      logger.debug("✅ Bill sponsorships retrieved", { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error("Failed to fetch bill sponsorships", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Lists all sponsors (primary and co-sponsors) for a specific bill.
   * 
   * @param bill_id - The bill whose sponsors to fetch
   * @param activeOnly - Whether to filter to only active sponsorships
   * @returns Array of sponsorship records
   */
  async listSponsorsForBill(bill_id: number, activeOnly: boolean = true): Promise<any[]> {
    const logContext = { 
      component: 'SponsorService', 
      operation: 'listSponsorsForBill', 
      bill_id, 
      activeOnly 
    };
    logger.debug("Fetching all sponsors for a bill", logContext);
    
    try {
      let query = this.database
        .select()
        .from(bill_cosponsors)
        .where(eq(bill_cosponsors.bill_id, bill_id));

      if (activeOnly) {
        query = query.where(eq(bill_cosponsors.is_active, true));
      }

      const results = await query.orderBy(asc(bill_cosponsors.sponsorship_date));
      
      logger.debug("✅ Bill sponsors retrieved", { ...logContext, count: results.length });
      return results;
    } catch (error) {
      logger.error("Failed to fetch bill sponsors", { ...logContext, error });
      throw error;
    }
  }

  /**
   * Creates a link showing a sponsor sponsors a bill.
   * 
   * @param sponsor_id - The sponsor ID
   * @param bill_id - The bill ID
   * @param sponsorshipType - Type of sponsorship (primary, co-sponsor, etc.)
   * @param sponsorshipDate - Date of sponsorship (defaults to now)
   * @returns The newly created sponsorship record
   */
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
    logger.info("Creating bill sponsorship link", logContext);
    
    try {
      const now = new Date();
      const [newSponsorship] = await this.database
        .insert(bill_cosponsors)
        .values({
          sponsor_id,
          bill_id,
          sponsorship_type: sponsorshipType,
          sponsorship_date: sponsorshipDate || now,
          is_active: true,
          created_at: now,
          updated_at: now
        })
        .returning();

      logger.info("✅ Bill sponsorship created", { 
        ...logContext, 
        sponsorship_id: newSponsorship.id 
      });

      return newSponsorship;
    } catch (error) {
      logger.error("Failed to create bill sponsorship", { ...logContext, error });
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of SponsorService for application-wide use.
 * This ensures consistent database connection pooling and caching behavior.
 */
export const sponsorService = new SponsorService();