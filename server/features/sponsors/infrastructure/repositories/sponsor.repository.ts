import { db } from '../../../../../shared/database/pool.js'; // Use shared connection
import {
  sponsors, bill_cosponsors, bills,
  type Sponsor, type InsertSponsor, type Bill
} from '@shared/schema';
import { eq, and, sql, desc, asc, count, avg, inArray, like, or, sql as sqlFn } from 'drizzle-orm'; // Added asc, sqlFn alias
import { logger } from '../../../../../shared/core/src/observability/logging/index.js';

// Interface defining search options for listing sponsors
export interface SponsorSearchOptions {
  party?: string;
  role?: string;
  constituency?: string;
  conflict_level?: string; // Should match severityEnum if used
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'party' | 'transparency_score' | 'financial_exposure';
  sortOrder?: 'asc' | 'desc';
}

// Input type for creating/updating affiliations
export interface SponsorAffiliationInput {
  sponsor_id: number;
  organization: string;
  role?: string | null; // Allow null
  type: string; // Should match affiliationTypeEnum
  conflictType?: string | null; // Should match affiliationConflictTypeEnum, allow null
  startDate?: Date | null;
  endDate?: Date | null;
  is_active?: boolean;
}

// Input type for creating/updating transparency records
export interface SponsorTransparencyInput {
  sponsor_id: number;
  disclosureType: string; // Should match disclosureTypeEnum
  description: string;
  amount?: string | number | null; // Allow number input, will convert to string for DB
  source?: string | null;
  dateReported?: Date | null;
  is_verified?: boolean;
}

// Combined type for returning sponsor with all related data
export interface SponsorWithRelations extends Sponsor {
  affiliations: SponsorAffiliation[];
  transparency: SponsorTransparency[];
  sponsorships: BillSponsorship[]; // Bill sponsorships associated with this sponsor
}

// Helper function to safely extract error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * SponsorRepository - Infrastructure Layer (Data Access)
 *
 * Responsible ONLY for database operations related to sponsors, affiliations,
 * transparency records, and related bill/sponsorship data retrieval.
 * Contains no business logic or complex analysis. Acts as the gateway to sponsor data.
 */
export class SponsorRepository {
  // Use getter for dynamic DB connection access
  private get database() {
    if (!db) throw new Error('Database not initialized for SponsorRepository');
    return db;
  }

  // ============================================================================
  // CORE SPONSOR CRUD OPERATIONS
  // ============================================================================

  async findById(id: number): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorRepository', operation: 'findById', sponsor_id: id };
    logger.debug("Fetching sponsor by ID", logContext);
    try {
      const result = await this.database.select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
      if (result.length === 0) {
          logger.warn("Sponsor not found", logContext);
          return null;
      }
      return result[0];
    } catch (error) {
      logger.error('Error fetching sponsor', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving sponsor ${id}: ${getErrorMessage(error)}`);
    }
  }

  async create(sponsorData: InsertSponsor): Promise<Sponsor> {
    const logContext = { component: 'SponsorRepository', operation: 'create' };
    logger.debug("Creating new sponsor", { ...logContext, name: sponsorData.name });
    try {
      // Ensure required fields and defaults are set, convert numerics to strings for DB
      const dataToInsert = {
        ...sponsorData,
        is_active: sponsorData.is_active ?? true, // Default to active
        conflict_level: sponsorData.conflict_level || undefined, // Allow null/undefined if not provided
        financial_exposure: String(sponsorData.financial_exposure || 0),
        voting_alignment: String(sponsorData.voting_alignment || 0),
        transparency_score: String(sponsorData.transparency_score || 0),
        created_at: new Date(), // Set creation timestamp
        updated_at: new Date()  // Set update timestamp
      };

      const [newSponsor] = await this.database.insert(sponsors)
        .values(dataToInsert)
        .returning();

      if (!newSponsor) throw new Error("Sponsor creation failed, no record returned.");

      logger.info(`Sponsor created successfully`, { ...logContext, sponsor_id: newSponsor.id });
      return newSponsor;
    } catch (error) {
      logger.error('Error creating sponsor', { ...logContext, sponsorName: sponsorData.name, error: getErrorMessage(error) });
      throw new Error(`Database error creating sponsor: ${getErrorMessage(error)}`);
    }
  }

  async update(id: number, updateData: Partial<InsertSponsor>): Promise<Sponsor | null> {
     const logContext = { component: 'SponsorRepository', operation: 'update', sponsor_id: id };
     logger.debug("Updating sponsor", logContext);
    try {
      // Prepare data, converting numerics expected by schema to strings
      const dataToUpdate: Record<string, any> = { ...updateData, updated_at: new Date() };

      if (updateData.financial_exposure !== undefined) dataToUpdate.financial_exposure = String(updateData.financial_exposure);
      if (updateData.voting_alignment !== undefined) dataToUpdate.voting_alignment = String(updateData.voting_alignment);
      if (updateData.transparency_score !== undefined) dataToUpdate.transparency_score = String(updateData.transparency_score);

      // Remove undefined keys to avoid accidentally setting columns to null
      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);


      const [updatedSponsor] = await this.database.update(sponsors)
        .set(dataToUpdate)
        .where(eq(sponsors.id, id))
        .returning();

      if (!updatedSponsor) {
         logger.warn("Sponsor not found for update", logContext);
         return null;
      }
      logger.info(`Sponsor updated successfully`, logContext);
      return updatedSponsor;
    } catch (error) {
      logger.error('Error updating sponsor', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error updating sponsor ${id}: ${getErrorMessage(error)}`);
    }
  }

  async setActiveStatus(id: number, is_active: boolean): Promise<Sponsor | null> {
    const logContext = { component: 'SponsorRepository', operation: 'setActiveStatus', sponsor_id: id, status: is_active };
    logger.info(`Setting sponsor active status`, logContext);
    try {
      return await this.update(id, { is_active }); // Delegate to update method
    } catch (error) {
       // Error already logged by update method
      throw error; // Re-throw
    }
  }

  // ============================================================================
  // SPONSOR LISTING AND SEARCH OPERATIONS
  // ============================================================================

  async list(options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorRepository', operation: 'list', options };
    logger.debug("Listing sponsors", logContext);
    try {
      const { limit = 50, offset = 0, sortBy = 'name', sortOrder = 'asc', is_active = true } = options;
      const conditions: ReturnType<typeof sqlFn>[] = []; // Use explicit type for conditions array

      // Apply defined filters only
      if (is_active !== undefined) conditions.push(eq(sponsors.is_active, is_active));
      if (options.party) conditions.push(eq(sponsors.party, options.party));
      if (options.role) conditions.push(eq(sponsors.role, options.role));
      if (options.constituency) conditions.push(eq(sponsors.constituency, options.constituency));
      if (options.conflict_level) conditions.push(eq(sponsors.conflict_level, options.conflict_level as any));

      // Build query
      let query = this.database.select().from(sponsors);
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      query = query.limit(limit).offset(offset);

      // Apply sorting
      const sortColumnMap = {
          name: sponsors.name,
          party: sponsors.party,
          transparency_score: sponsors.transparency_score, // Note: DB stores as numeric string
          financial_exposure: sponsors.financial_exposure // Note: DB stores as numeric string
      };
      const sortColumn = sortColumnMap[sortBy];

      if (sortColumn) {
          // If sorting numeric strings, cast them if needed for correct sorting
           const orderExpression = (sortBy === 'transparency_score' || sortBy === 'financial_exposure')
               ? sqlFn`CAST(${sortColumn} AS DECIMAL)` // Cast to numeric for sorting
               : sortColumn;

           const orderFunction = sortOrder === 'asc' ? asc : desc;
           query = query.orderBy(orderFunction(orderExpression));
      } else {
           query = query.orderBy(asc(sponsors.name)); // Default sort by name
      }


      const result = await query;
      logger.debug(`Found ${result.length} sponsors`, logContext);
      return result;

    } catch (error) {
      logger.error('Error listing sponsors', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error listing sponsors: ${getErrorMessage(error)}`);
    }
  }

  async search(query: string, options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorRepository', operation: 'search', query, options };
     logger.debug("Searching sponsors", logContext);
    try {
      const { limit = 25, offset = 0, is_active = true } = options; // Default limit smaller for search
      const searchTerm = `%${query}%`;

      // Search across relevant text fields
      const searchCondition = or(
        like(sponsors.name, searchTerm),
        like(sponsors.party, searchTerm),
        like(sponsors.constituency, searchTerm),
        like(sponsors.role, searchTerm)
      );

      const conditions: ReturnType<typeof sqlFn>[] = [searchCondition];
      if (is_active !== undefined) conditions.push(eq(sponsors.is_active, is_active));
      if (options.party) conditions.push(eq(sponsors.party, options.party));
      // Add other filters from options if needed

      let dbQuery = this.database.select().from(sponsors).where(and(...conditions));

      // Simple sort by name for search results
      dbQuery = dbQuery.orderBy(asc(sponsors.name)).limit(limit).offset(offset);

      const results = await dbQuery;
      logger.debug(`Found ${results.length} sponsors matching search`, logContext);
      return results;

    } catch (error) {
      logger.error('Error searching sponsors', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error searching sponsors: ${getErrorMessage(error)}`);
    }
  }

  async findByIds(ids: number[]): Promise<Sponsor[]> {
    const logContext = { component: 'SponsorRepository', operation: 'findByIds', count: ids.length };
    logger.debug("Fetching sponsors by IDs", logContext);
    try {
      if (ids.length === 0) return [];
      return await this.database.select().from(sponsors).where(inArray(sponsors.id, ids));
    } catch (error) {
      logger.error('Error fetching sponsors by IDs', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving sponsors: ${getErrorMessage(error)}`);
    }
  }

  /** Fetches a sponsor with all related affiliations, transparency records, and sponsorships. */
  async findByIdWithRelations(id: number): Promise<SponsorWithRelations | null> {
    const logContext = { component: 'SponsorRepository', operation: 'findByIdWithRelations', sponsor_id: id };
     logger.debug("Fetching sponsor with relations", logContext);
    try {
      const sponsor = await this.findById(id);
      if (!sponsor) return null;

      // Fetch related data concurrently
      const [affiliations, transparency, sponsorships] = await Promise.all([
        this.listAffiliations(id),
        this.listTransparencyRecords(id),
        this.listBillSponsorshipsBySponsor(id) // Fetch bills sponsored *by* this sponsor
      ]);

      return { ...sponsor, affiliations, transparency, sponsorships };
    } catch (error) {
       // Error already logged by individual methods
      throw new Error(`Database error retrieving sponsor relations for ${id}: ${getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // AFFILIATION OPERATIONS
  // ============================================================================

  async listAffiliations(sponsor_id: number, activeOnly: boolean = true): Promise<SponsorAffiliation[]> {
    const logContext = { component: 'SponsorRepository', operation: 'listAffiliations', sponsor_id, activeOnly };
     logger.debug("Fetching sponsor affiliations", logContext);
    try {
      const conditions = [eq(sponsorAffiliations.sponsor_id, sponsor_id)];
      if (activeOnly) conditions.push(eq(sponsorAffiliations.is_active, true));

      return await this.database.select()
        .from(sponsorAffiliations)
        .where(and(...conditions))
        .orderBy(desc(sponsorAffiliations.startDate), desc(sponsorAffiliations.created_at)); // Sort by start date then creation
    } catch (error) {
      logger.error('Error fetching affiliations', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving affiliations: ${getErrorMessage(error)}`);
    }
  }

  async findAffiliationsBySponsorIds(sponsor_ids: number[], activeOnly: boolean = true): Promise<Map<number, SponsorAffiliation[]>> {
      const logContext = { component: 'SponsorRepository', operation: 'findAffiliationsBySponsorIds', count: sponsor_ids.length, activeOnly };
       logger.debug("Fetching affiliations for multiple sponsors", logContext);
      const affiliationMap = new Map<number, SponsorAffiliation[]>();
      if (sponsor_ids.length === 0) return affiliationMap;

      try {
          const conditions = [inArray(sponsorAffiliations.sponsor_id, sponsor_ids)];
          if (activeOnly) conditions.push(eq(sponsorAffiliations.is_active, true));

          const affiliations = await this.database.select()
              .from(sponsorAffiliations)
              .where(and(...conditions))
              .orderBy(desc(sponsorAffiliations.startDate));

          // Group affiliations by sponsor_id
          affiliations.forEach(aff => {
              if (!affiliationMap.has(aff.sponsor_id)) {
                  affiliationMap.set(aff.sponsor_id, []);
              }
              affiliationMap.get(aff.sponsor_id)!.push(aff);
          });
          logger.debug(`Fetched affiliations for ${affiliationMap.size} sponsors`, logContext);
          return affiliationMap;
      } catch (error) {
           logger.error('Error fetching affiliations by sponsor IDs', { ...logContext, error: getErrorMessage(error) });
           throw new Error(`Database error retrieving affiliations: ${getErrorMessage(error)}`);
      }
  }


  async addAffiliation(affiliationData: SponsorAffiliationInput): Promise<SponsorAffiliation> {
     const logContext = { component: 'SponsorRepository', operation: 'addAffiliation', sponsor_id: affiliationData.sponsor_id };
     logger.debug("Adding sponsor affiliation", logContext);
    try {
       // Explicitly set is_active default if not provided
       const dataToInsert = { ...affiliationData, is_active: affiliationData.is_active ?? true, created_at: new Date() } as any;

      const [newAffiliation] = await this.database.insert(sponsorAffiliations)
        .values(dataToInsert)
        .returning();

       if (!newAffiliation) throw new Error("Affiliation creation failed, no record returned.");

      logger.info("Affiliation added successfully", { ...logContext, affiliationId: newAffiliation.id });
      return newAffiliation;
    } catch (error) {
      logger.error('Error adding affiliation', { ...logContext, org: affiliationData.organization, error: getErrorMessage(error) });
      throw new Error(`Database error adding affiliation: ${getErrorMessage(error)}`);
    }
  }

  async updateAffiliation(id: number, updateData: Partial<SponsorAffiliationInput>): Promise<SponsorAffiliation | null> {
     const logContext = { component: 'SponsorRepository', operation: 'updateAffiliation', affiliationId: id };
     logger.debug("Updating sponsor affiliation", logContext);
    try {
       const dataToUpdate = { ...updateData, updated_at: new Date() } as any;
         // Remove undefined keys
        Object.keys(dataToUpdate).forEach(key => (dataToUpdate as any)[key] === undefined && delete (dataToUpdate as any)[key]);

      const [updatedAffiliation] = await this.database.update(sponsorAffiliations)
        .set(dataToUpdate)
        .where(eq(sponsorAffiliations.id, id))
        .returning();

       if (!updatedAffiliation) {
           logger.warn("Affiliation not found for update", logContext);
           return null;
       }
       logger.info("Affiliation updated successfully", logContext);
      return updatedAffiliation;
    } catch (error) {
      logger.error('Error updating affiliation', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error updating affiliation ${id}: ${getErrorMessage(error)}`);
    }
  }

  async setAffiliationActiveStatus(id: number, is_active: boolean, endDate?: Date): Promise<SponsorAffiliation | null> {
    const logContext = { component: 'SponsorRepository', operation: 'setAffiliationActiveStatus', affiliationId: id, status: is_active };
     logger.info("Setting affiliation active status", logContext);
    try {
        const updateData: Partial<SponsorAffiliationInput> & { updated_at: Date } = {
             is_active,
             updated_at: new Date()
        };
        // Set end date only when deactivating, if provided or not already set
        if (!is_active) {
             const [currentAff] = await this.database.select({ endDate: sponsorAffiliations.endDate }).from(sponsorAffiliations).where(eq(sponsorAffiliations.id, id));
             if (!currentAff?.endDate) { // Only set end date if not already set
                 updateData.endDate = endDate || new Date();
             }
        }

      return await this.updateAffiliation(id, updateData);
    } catch (error) {
      // Error logged by updateAffiliation
      throw error; // Re-throw
    }
  }

  // ============================================================================
  // TRANSPARENCY OPERATIONS
  // ============================================================================

  async listTransparencyRecords(sponsor_id: number): Promise<SponsorTransparency[]> {
     const logContext = { component: 'SponsorRepository', operation: 'listTransparencyRecords', sponsor_id };
     logger.debug("Fetching sponsor transparency records", logContext);
    try {
      return await this.database.select()
        .from(sponsorTransparency)
        .where(eq(sponsorTransparency.sponsor_id, sponsor_id))
        .orderBy(desc(sponsorTransparency.dateReported), desc(sponsorTransparency.created_at)); // Sort by report date, then creation
    } catch (error) {
      logger.error('Error fetching transparency records', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving transparency records: ${getErrorMessage(error)}`);
    }
  }

   async findTransparencyBySponsorIds(sponsor_ids: number[]): Promise<Map<number, SponsorTransparency[]>> {
       const logContext = { component: 'SponsorRepository', operation: 'findTransparencyBySponsorIds', count: sponsor_ids.length };
       logger.debug("Fetching transparency records for multiple sponsors", logContext);
       const transparencyMap = new Map<number, SponsorTransparency[]>();
       if (sponsor_ids.length === 0) return transparencyMap;

       try {
           const records = await this.database.select()
               .from(sponsorTransparency)
               .where(inArray(sponsorTransparency.sponsor_id, sponsor_ids))
               .orderBy(desc(sponsorTransparency.dateReported));

           records.forEach(rec => {
               if (!transparencyMap.has(rec.sponsor_id)) {
                   transparencyMap.set(rec.sponsor_id, []);
               }
               transparencyMap.get(rec.sponsor_id)!.push(rec);
           });
            logger.debug(`Fetched transparency records for ${transparencyMap.size} sponsors`, logContext);
           return transparencyMap;
       } catch (error) {
            logger.error('Error fetching transparency by sponsor IDs', { ...logContext, error: getErrorMessage(error) });
            throw new Error(`Database error retrieving transparency records: ${getErrorMessage(error)}`);
       }
   }


  async addTransparencyRecord(transparencyData: SponsorTransparencyInput): Promise<SponsorTransparency> {
    const logContext = { component: 'SponsorRepository', operation: 'addTransparencyRecord', sponsor_id: transparencyData.sponsor_id };
     logger.debug("Adding sponsor transparency record", logContext);
    try {
      const dataToInsert = {
        ...transparencyData,
        // Convert amount to string, handle null/undefined
        amount: transparencyData.amount !== null && transparencyData.amount !== undefined ? String(transparencyData.amount) : null,
        is_verified: transparencyData.is_verified ?? false, // Default to false
        created_at: new Date(),
        updated_at: new Date()
      };
      // Remove null/undefined keys before insert if DB schema requires NOT NULL without defaults
      Object.keys(dataToInsert).forEach(key => (dataToInsert as any)[key] === undefined && delete (dataToInsert as any)[key]);


      const [newRecord] = await this.database.insert(sponsorTransparency)
          .values(dataToInsert)
          .returning();

       if (!newRecord) throw new Error("Transparency record creation failed, no record returned.");
       logger.info("Transparency record added successfully", { ...logContext, recordId: newRecord.id });
      return newRecord;
    } catch (error) {
      logger.error('Error adding transparency record', { ...logContext, type: transparencyData.disclosureType, error: getErrorMessage(error) });
      throw new Error(`Database error adding transparency record: ${getErrorMessage(error)}`);
    }
  }

  async updateTransparencyRecord(id: number, updateData: Partial<SponsorTransparencyInput>): Promise<SponsorTransparency | null> {
     const logContext = { component: 'SponsorRepository', operation: 'updateTransparencyRecord', recordId: id };
     logger.debug("Updating sponsor transparency record", logContext);
    try {
       const dataToUpdate: Record<string, any> = { ...updateData, updated_at: new Date() };
       if (updateData.amount !== undefined) dataToUpdate.amount = updateData.amount !== null ? String(updateData.amount) : null;
        // Remove undefined keys
       Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);


      const [updatedRecord] = await this.database.update(sponsorTransparency)
        .set(dataToUpdate)
        .where(eq(sponsorTransparency.id, id))
        .returning();

        if (!updatedRecord) {
           logger.warn("Transparency record not found for update", logContext);
           return null;
       }
       logger.info("Transparency record updated successfully", logContext);
      return updatedRecord;
    } catch (error) {
      logger.error('Error updating transparency record', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error updating transparency record ${id}: ${getErrorMessage(error)}`);
    }
  }

  async verifyTransparencyRecord(id: number): Promise<SponsorTransparency | null> {
    const logContext = { component: 'SponsorRepository', operation: 'verifyTransparencyRecord', recordId: id };
     logger.info("Verifying transparency record", logContext);
    try {
      return await this.updateTransparencyRecord(id, { is_verified: true });
    } catch (error) {
      // Error logged by update method
      throw error;
    }
  }

  // ============================================================================
  // SPONSORSHIP OPERATIONS (Linking Sponsors to Bills)
  // ============================================================================

  /** Lists sponsorships initiated *by* a specific sponsors. */
  async listBillSponsorshipsBySponsor(sponsor_id: number, activeOnly: boolean = true): Promise<BillSponsorship[]> {
     const logContext = { component: 'SponsorRepository', operation: 'listBillSponsorshipsBySponsor', sponsor_id, activeOnly };
     logger.debug("Fetching bill sponsorships initiated by sponsor", logContext);
    try {
      const conditions = [eq(bill_sponsorships.sponsor_id, sponsor_id)];
      if (activeOnly) conditions.push(eq(bill_sponsorships.is_active, true));

      return await this.database.select()
        .from(bill_sponsorships)
        .where(and(...conditions))
        .orderBy(desc(bill_sponsorships.sponsorshipDate));
    } catch (error) {
      logger.error('Error fetching sponsor bill sponsorships', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving sponsorships: ${getErrorMessage(error)}`);
    }
  }

  /** Lists all sponsors (primary and co-sponsors) for a specific bills. */
  async listSponsorsForBill(bill_id: number, activeOnly: boolean = true): Promise<BillSponsorship[]> { const logContext = { component: 'SponsorRepository', operation: 'listSponsorsForBill', bill_id, activeOnly  };
     logger.debug("Fetching all sponsors for a bill", logContext);
    try { const conditions = [eq(bill_sponsorships.bill_id, bill_id)];
      if (activeOnly) conditions.push(eq(bill_sponsorships.is_active, true));

      return await this.database.select()
        .from(bill_sponsorships)
        .where(and(...conditions))
         // Order by type (primary first), then by date
         .orderBy(asc(bill_sponsorships.sponsorshipType), desc(bill_sponsorships.sponsorshipDate));
     } catch (error) {
      logger.error('Error fetching bill sponsorships', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving sponsorships: ${getErrorMessage(error)}`);
    }
  }

  /** Creates a link showing a sponsor sponsors a bills. */
  async createBillSponsorship(sponsor_id: number, bill_id: number, sponsorshipType: string, sponsorshipDate?: Date): Promise<BillSponsorship> { const logContext = { component: 'SponsorRepository', operation: 'createBillSponsorship', sponsor_id, bill_id, type: sponsorshipType  };
     logger.info("Creating bill sponsorship link", logContext);
    try {
       // Validate sponsorshipType if using text column
       const validTypes = ['primary', 'co_sponsor', 'supporter']; // Match enum values
       if (!validTypes.includes(sponsorshipType)) {
           throw new Error(`Invalid sponsorshipType: ${sponsorshipType}. Must be one of ${validTypes.join(', ')}`);
       }

      const [newSponsorship] = await this.database.insert(bill_sponsorships)
        .values({ sponsor_id, bill_id, sponsorshipType,
          sponsorshipDate: sponsorshipDate || new Date(),
          is_active: true, created_at: new Date()
         })
        .returning();

       if (!newSponsorship) throw new Error("Bill sponsorship creation failed, no record returned.");
       logger.info("Bill sponsorship created successfully", { ...logContext, sponsorshipId: newSponsorship.id });
      return newSponsorship;
    } catch (error) {
      logger.error('Error creating bill sponsorship', { ...logContext, error: getErrorMessage(error) });
      // Handle potential unique constraint violation (sponsor already sponsors this bill)
      if (getErrorMessage(error).includes('duplicate key value violates unique constraint')) {
          throw new Error(`Sponsor ${sponsor_id} already has a sponsorship record for bill ${ bill_id }. Update existing record instead.`);
      }
      throw new Error(`Database error creating bill sponsorship: ${getErrorMessage(error)}`);
    }
  }

   /** Updates an existing sponsorship record. */
  async updateBillSponsorship(id: number, updateData: Partial<InsertBillSponsorship>): Promise<BillSponsorship | null> {
       const logContext = { component: 'SponsorRepository', operation: 'updateBillSponsorship', sponsorshipId: id };
       logger.debug("Updating bill sponsorship", logContext);
       try {
            const dataToUpdate: Record<string, any> = { ...updateData, updated_at: new Date() };
            // Remove undefined keys
            Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

            const [updatedSponsorship] = await this.database.update(bill_sponsorships)
                .set(dataToUpdate)
                .where(eq(bill_sponsorships.id, id))
                .returning();

            if (!updatedSponsorship) {
                 logger.warn("Bill sponsorship not found for update", logContext);
                 return null;
            }
            logger.info("Bill sponsorship updated successfully", logContext);
            return updatedSponsorship;
       } catch (error) {
            logger.error('Error updating bill sponsorship', { ...logContext, error: getErrorMessage(error) });
            throw new Error(`Database error updating bill sponsorship ${id}: ${getErrorMessage(error)}`);
       }
   }


  /** Marks a specific sponsorship link as inactive. */
  async deactivateBillSponsorship(id: number): Promise<BillSponsorship | null> {
    const logContext = { component: 'SponsorRepository', operation: 'deactivateBillSponsorship', sponsorshipId: id };
     logger.info("Deactivating bill sponsorship", logContext);
    try {
      // Use the update method for consistency
      return await this.updateBillSponsorship(id, { is_active: false });
    } catch (error) {
      // Error logged by update method
      throw error;
    }
  }

  // ============================================================================
  // BILL DATA ACCESS (Needed for context)
  // ============================================================================

  async getBill(bill_id: number): Promise<Bill | null> { const logContext = { component: 'SponsorRepository', operation: 'getBill', bill_id  };
     logger.debug("Fetching bill details", logContext);
    try { const [bill] = await this.database.select().from(bills).where(eq(bills.id, bill_id)).limit(1);
      if (!bill) logger.warn("Bill not found", logContext);
      return bill || null;
     } catch (error) {
      logger.error('Error fetching bill', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving bill ${ bill_id }: ${getErrorMessage(error)}`);
    }
  }

  async getBillsByIds(bill_ids: number[]): Promise<Bill[]> {
     const logContext = { component: 'SponsorRepository', operation: 'getBillsByIds', count: bill_ids.length };
     logger.debug("Fetching multiple bills by IDs", logContext);
    try {
      if (bill_ids.length === 0) return [];
      return await this.database.select().from(bills).where(inArray(bills.id, bill_ids));
    } catch (error) {
      logger.error('Error fetching bills by IDs', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving bills: ${getErrorMessage(error)}`);
    }
  }

   /** Finds bills whose content/title/description mention an organization. */
   async findBillsMentioningOrganization(organization: string, bill_ids?: number[]): Promise<Bill[]> {
       const logContext = { component: 'SponsorRepository', operation: 'findBillsMentioningOrganization', organization };
       logger.debug("Finding bills mentioning organization", logContext);
       try {
           const searchPattern = `%${organization}%`;
           // Case-insensitive search using ILIKE
           const searchConditions = or(
               sql`${bills.content} ILIKE ${searchPattern}`,
               sql`${bills.title} ILIKE ${searchPattern}`,
               sql`${bills.description} ILIKE ${searchPattern}`
           );

           let query = this.database.select().from(bills);
           const conditions: ReturnType<typeof sqlFn>[] = [searchConditions];

           // Filter by specific bill IDs if provided
           if (bill_ids && bill_ids.length > 0) {
                conditions.push(inArray(bills.id, bill_ids));
           }

           query = query.where(and(...conditions));

           const results = await query.orderBy(desc(bills.introduced_date)); // Order by most recent
           logger.debug(`Found ${results.length} bills mentioning organization`, logContext);
           return results;

       } catch (error) {
           logger.error('Error finding bills mentioning organization', { ...logContext, error: getErrorMessage(error) });
           throw new Error(`Database error finding bills: ${getErrorMessage(error)}`);
       }
   }


  // ============================================================================
  // UTILITY METHODS (Metadata)
  // ============================================================================

  async getActiveSponsorCount(): Promise<number> {
    const logContext = { component: 'SponsorRepository', operation: 'getActiveSponsorCount' };
    logger.debug("Counting active sponsors", logContext);
    try {
      const [result] = await this.database.select({ count: count() }).from(sponsors).where(eq(sponsors.is_active, true));
      return result?.count ?? 0;
    } catch (error) {
      logger.error('Error counting active sponsors', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error counting sponsors: ${getErrorMessage(error)}`);
    }
  }

  async getUniqueParties(): Promise<string[]> {
    const logContext = { component: 'SponsorRepository', operation: 'getUniqueParties' };
     logger.debug("Fetching unique parties", logContext);
    try {
      const result = await this.database.selectDistinct({ party: sponsors.party }).from(sponsors).where(eq(sponsors.is_active, true));
      // Filter out null/undefined and return unique strings
      return result.map(r => r.party).filter((p): p is string => !!p);
    } catch (error) {
      logger.error('Error fetching unique parties', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving parties: ${getErrorMessage(error)}`);
    }
  }

  async getUniqueConstituencies(): Promise<string[]> {
     const logContext = { component: 'SponsorRepository', operation: 'getUniqueConstituencies' };
     logger.debug("Fetching unique constituencies", logContext);
    try {
      const result = await this.database.selectDistinct({ constituency: sponsors.constituency }).from(sponsors).where(eq(sponsors.is_active, true));
      return result.map(r => r.constituency).filter((c): c is string => !!c);
    } catch (error) {
      logger.error('Error fetching unique constituencies', { ...logContext, error: getErrorMessage(error) });
      throw new Error(`Database error retrieving constituencies: ${getErrorMessage(error)}`);
    }
  }
}

// Export singleton instance
export const sponsorRepository = new SponsorRepository();
// Alias for backward compatibility if needed during transition
export { sponsorRepository as sponsorService };
