import { readDatabase } from '../../db.js';
// Backwards-compatible proxy so existing code using `db.select()` etc. keeps working
const db = new Proxy({}, {
  get(_target, prop: string | symbol) {
    const d = readDatabase();
    if (!d) {
      // Return a noop function for common chainable methods to avoid runtime crashes during tests
      return (..._args: any[]) => { throw new Error('Database not initialized'); };
    }
    return (d as any)[prop as any];
  }
}) as any;
import {
  sponsor as sponsors, sponsorAffiliation as sponsorAffiliations, sponsorTransparency, billSponsorship as billSponsorships, bill as bills,
  type Sponsor, type SponsorAffiliation, type SponsorTransparency, type BillSponsorship
} from '../../../shared/schema';
import { eq, and, sql, desc, gte, lte, count, avg, inArray, like, or } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * SponsorService - Pure Data Access Layer
 * 
 * This service is responsible ONLY for database operations related to sponsors.
 * It does NOT contain any business logic, conflict detection, or analysis.
 * Think of this as your database gateway - it knows how to get data efficiently,
 * but it doesn't interpret what that data means.
 */

export interface SponsorSearchOptions {
  party?: string;
  role?: string;
  constituency?: string;
  conflictLevel?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'party' | 'transparencyScore' | 'financialExposure';
  sortOrder?: 'asc' | 'desc';
}

export interface SponsorAffiliationInput {
  sponsorId: number;
  organization: string;
  role?: string;
  type: string;
  conflictType?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface SponsorTransparencyInput {
  sponsorId: number;
  disclosureType: string;
  description: string;
  amount?: string; // Changed to string to match schema
  source?: string;
  dateReported?: Date;
  isVerified?: boolean;
}

export interface SponsorWithRelations extends Sponsor {
  affiliations: SponsorAffiliation[];
  transparency: SponsorTransparency[];
  sponsorships: BillSponsorship[];
}

/**
 * Helper function to safely extract error messages
 * This ensures we handle unknown error types properly
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class SponsorService {
  
  // ============================================================================
  // CORE SPONSOR OPERATIONS
  // ============================================================================

  async getSponsor(id: number): Promise<Sponsor | null> {
    try {
      const result = await db.select().from(sponsors).where(eq(sponsors.id, id));
      return result[0] || null;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsor', { sponsorId: id, error: errorMsg });
      throw new Error(`Failed to retrieve sponsor ${id}: ${errorMsg}`);
    }
  }

  async createSponsor(sponsorData: typeof sponsors.$inferInsert): Promise<Sponsor> {
    try {
      // Convert numeric values to strings to match schema
      const dataToInsert = {
        ...sponsorData,
        isActive: sponsorData.isActive ?? true,
        conflictLevel: sponsorData.conflictLevel || 'low',
        financialExposure: String(sponsorData.financialExposure || 0),
        votingAlignment: String(sponsorData.votingAlignment || 0),
        transparencyScore: String(sponsorData.transparencyScore || 0),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(sponsors)
        .values(dataToInsert)
        .returning();
      
      return result[0];
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error creating sponsor', { sponsorData, error: errorMsg });
      throw new Error(`Failed to create sponsor: ${errorMsg}`);
    }
  }

  async updateSponsor(
    id: number, 
    updateData: Partial<typeof sponsors.$inferInsert>
  ): Promise<Sponsor | null> {
    try {
      // Convert numeric fields to strings if they exist in updateData
      const dataToUpdate: any = {
        ...updateData,
        updatedAt: new Date()
      };

      // Handle numeric to string conversions
      if ('financialExposure' in updateData && typeof updateData.financialExposure === 'number') {
        dataToUpdate.financialExposure = String(updateData.financialExposure);
      }
      if ('votingAlignment' in updateData && typeof updateData.votingAlignment === 'number') {
        dataToUpdate.votingAlignment = String(updateData.votingAlignment);
      }
      if ('transparencyScore' in updateData && typeof updateData.transparencyScore === 'number') {
        dataToUpdate.transparencyScore = String(updateData.transparencyScore);
      }

      const result = await db.update(sponsors)
        .set(dataToUpdate)
        .where(eq(sponsors.id, id))
        .returning();
      
      return result[0] || null;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error updating sponsor', { id, updateData, error: errorMsg });
      throw new Error(`Failed to update sponsor: ${errorMsg}`);
    }
  }

  async deactivateSponsor(id: number): Promise<Sponsor | null> {
    try {
      return await this.updateSponsor(id, { 
        isActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deactivating sponsor', { id, error: errorMsg });
      throw new Error(`Failed to deactivate sponsor: ${errorMsg}`);
    }
  }

  async reactivateSponsor(id: number): Promise<Sponsor | null> {
    try {
      return await this.updateSponsor(id, { 
        isActive: true,
        updatedAt: new Date()
      });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error reactivating sponsor', { id, error: errorMsg });
      throw new Error(`Failed to reactivate sponsor: ${errorMsg}`);
    }
  }

  async deleteSponsor(id: number): Promise<boolean> {
    try {
      const result = await db.delete(sponsors)
        .where(eq(sponsors.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deleting sponsor', { id, error: errorMsg });
      throw new Error(`Failed to delete sponsor: ${errorMsg}`);
    }
  }

  async getSponsors(options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        sortBy = 'name', 
        sortOrder = 'asc',
        isActive = true 
      } = options;
      
      // Build WHERE clause conditions
      const conditions: any[] = [];
      
      if (isActive !== undefined) {
        conditions.push(eq(sponsors.isActive, isActive));
      }
      
      if (options.party) {
        conditions.push(eq(sponsors.party, options.party));
      }
      
      if (options.role) {
        conditions.push(eq(sponsors.role, options.role));
      }
      
      if (options.constituency) {
        conditions.push(eq(sponsors.constituency, options.constituency));
      }
      
      if (options.conflictLevel) {
        conditions.push(eq(sponsors.conflictLevel, options.conflictLevel));
      }
      
      // Build and execute query
      let query = db.select().from(sponsors);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      // Apply sorting
      const sortColumn = sponsors[sortBy];
      if (sortColumn) {
        query = (sortOrder === 'asc' 
          ? query.orderBy(sortColumn) 
          : query.orderBy(desc(sortColumn))) as any;
      }
      
      return await query.limit(limit).offset(offset);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsors', { options, error: errorMsg });
      throw new Error(`Failed to retrieve sponsors: ${errorMsg}`);
    }
  }

  async searchSponsors(query: string, options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const searchCondition = or(
        like(sponsors.name, `%${query}%`),
        like(sponsors.party, `%${query}%`),
        like(sponsors.constituency, `%${query}%`),
        like(sponsors.role, `%${query}%`)
      );
      
      const conditions = [searchCondition];
      
      if (options.party) {
        conditions.push(eq(sponsors.party, options.party));
      }
      
      if (options.isActive !== undefined) {
        conditions.push(eq(sponsors.isActive, options.isActive));
      }
      
      let dbQuery = db.select().from(sponsors);
      
      if (conditions.length > 0) {
        dbQuery = dbQuery.where(and(...conditions)) as any;
      }
      
      return await dbQuery
        .orderBy(sponsors.name)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error searching sponsors', { query, options, error: errorMsg });
      throw new Error(`Failed to search sponsors: ${errorMsg}`);
    }
  }

  async getSponsorWithRelations(id: number): Promise<SponsorWithRelations | null> {
    try {
      const sponsor = await this.getSponsor(id);
      if (!sponsor) return null;

      const [affiliations, transparency, sponsorships] = await Promise.all([
        this.getSponsorAffiliations(id),
        this.getSponsorTransparency(id),
        this.getSponsorBillSponsorships(id)
      ]);

      return {
        ...sponsor,
        affiliations,
        transparency,
        sponsorships
      };
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsor with relations', { sponsorId: id, error: errorMsg });
      throw new Error(`Failed to retrieve sponsor with relations: ${errorMsg}`);
    }
  }

  async getSponsorsByIds(ids: number[]): Promise<Sponsor[]> {
    try {
      if (ids.length === 0) return [];
      
      return await db.select()
        .from(sponsors)
        .where(inArray(sponsors.id, ids));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsors by IDs', { ids, error: errorMsg });
      throw new Error(`Failed to retrieve sponsors: ${errorMsg}`);
    }
  }

  // ============================================================================
  // AFFILIATION OPERATIONS
  // ============================================================================

  async getSponsorAffiliations(
    sponsorId: number, 
    activeOnly: boolean = true
  ): Promise<SponsorAffiliation[]> {
    try {
      const conditions = [eq(sponsorAffiliations.sponsorId, sponsorId)];
      
      if (activeOnly) {
        conditions.push(eq(sponsorAffiliations.isActive, true));
      }
      
      let query = db.select().from(sponsorAffiliations);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query.orderBy(desc(sponsorAffiliations.startDate));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsor affiliations', { sponsorId, error: errorMsg });
      throw new Error(`Failed to retrieve affiliations: ${errorMsg}`);
    }
  }

  async getAffiliationsBySponsorIds(
    sponsorIds: number[],
    activeOnly: boolean = true
  ): Promise<Map<number, SponsorAffiliation[]>> {
    try {
      if (sponsorIds.length === 0) return new Map();

      const conditions = [inArray(sponsorAffiliations.sponsorId, sponsorIds)];
      
      if (activeOnly) {
        conditions.push(eq(sponsorAffiliations.isActive, true));
      }

      let query = db.select().from(sponsorAffiliations);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const affiliations = await query.orderBy(desc(sponsorAffiliations.startDate));

      const affiliationMap = new Map<number, SponsorAffiliation[]>();
      affiliations.forEach(affiliation => {
        if (!affiliationMap.has(affiliation.sponsorId)) {
          affiliationMap.set(affiliation.sponsorId, []);
        }
        affiliationMap.get(affiliation.sponsorId)!.push(affiliation);
      });

      return affiliationMap;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching affiliations by sponsor IDs', { sponsorIds, error: errorMsg });
      throw new Error(`Failed to retrieve affiliations: ${errorMsg}`);
    }
  }

  async addSponsorAffiliation(
    affiliationData: SponsorAffiliationInput
  ): Promise<SponsorAffiliation> {
    try {
      const result = await db.insert(sponsorAffiliations).values({
        ...affiliationData,
        isActive: affiliationData.isActive ?? true,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error adding sponsor affiliation', { affiliationData, error: errorMsg });
      throw new Error(`Failed to add affiliation: ${errorMsg}`);
    }
  }

  async updateSponsorAffiliation(
    id: number, 
    updateData: Partial<SponsorAffiliationInput>
  ): Promise<SponsorAffiliation | null> {
    try {
      const result = await db.update(sponsorAffiliations)
        .set(updateData)
        .where(eq(sponsorAffiliations.id, id))
        .returning();
      
      return result[0] || null;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error updating sponsor affiliation', { id, updateData, error: errorMsg });
      throw new Error(`Failed to update affiliation: ${errorMsg}`);
    }
  }

  async deactivateAffiliation(id: number, endDate?: Date): Promise<SponsorAffiliation | null> {
    try {
      return await this.updateSponsorAffiliation(id, {
        isActive: false,
        endDate: endDate || new Date()
      });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deactivating affiliation', { id, error: errorMsg });
      throw new Error(`Failed to deactivate affiliation: ${errorMsg}`);
    }
  }

  async deleteAffiliation(id: number): Promise<boolean> {
    try {
      const result = await db.delete(sponsorAffiliations)
        .where(eq(sponsorAffiliations.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deleting affiliation', { id, error: errorMsg });
      throw new Error(`Failed to delete affiliation: ${errorMsg}`);
    }
  }

  // ============================================================================
  // TRANSPARENCY OPERATIONS
  // ============================================================================

  async getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]> {
    try {
      return await db.select()
        .from(sponsorTransparency)
        .where(eq(sponsorTransparency.sponsorId, sponsorId))
        .orderBy(desc(sponsorTransparency.dateReported));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsor transparency', { sponsorId, error: errorMsg });
      throw new Error(`Failed to retrieve transparency records: ${errorMsg}`);
    }
  }

  async getTransparencyBySponsorIds(
    sponsorIds: number[]
  ): Promise<Map<number, SponsorTransparency[]>> {
    try {
      if (sponsorIds.length === 0) return new Map();

      const records = await db.select()
        .from(sponsorTransparency)
        .where(inArray(sponsorTransparency.sponsorId, sponsorIds))
        .orderBy(desc(sponsorTransparency.dateReported));

      const transparencyMap = new Map<number, SponsorTransparency[]>();
      records.forEach(record => {
        if (!transparencyMap.has(record.sponsorId)) {
          transparencyMap.set(record.sponsorId, []);
        }
        transparencyMap.get(record.sponsorId)!.push(record);
      });

      return transparencyMap;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching transparency by sponsor IDs', { sponsorIds, error: errorMsg });
      throw new Error(`Failed to retrieve transparency records: ${errorMsg}`);
    }
  }

  async addSponsorTransparency(
    transparencyData: SponsorTransparencyInput
  ): Promise<SponsorTransparency> {
    try {
      // Ensure amount is a string if provided
      const dataToInsert = {
        ...transparencyData,
        amount: transparencyData.amount ? String(transparencyData.amount) : undefined,
        isVerified: transparencyData.isVerified ?? false,
        createdAt: new Date()
      };

      const result = await db.insert(sponsorTransparency).values(dataToInsert).returning();
      
      return result[0];
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error adding sponsor transparency', { transparencyData, error: errorMsg });
      throw new Error(`Failed to add transparency record: ${errorMsg}`);
    }
  }

  async updateSponsorTransparency(
    id: number, 
    updateData: Partial<SponsorTransparencyInput>
  ): Promise<SponsorTransparency | null> {
    try {
      // Convert amount to string if it's a number
      const dataToUpdate: any = { ...updateData };
      if ('amount' in updateData && typeof updateData.amount === 'number') {
        dataToUpdate.amount = String(updateData.amount);
      }

      const result = await db.update(sponsorTransparency)
        .set(dataToUpdate)
        .where(eq(sponsorTransparency.id, id))
        .returning();
      
      return result[0] || null;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error updating sponsor transparency', { id, updateData, error: errorMsg });
      throw new Error(`Failed to update transparency record: ${errorMsg}`);
    }
  }

  async verifyTransparencyRecord(id: number): Promise<SponsorTransparency | null> {
    try {
      return await this.updateSponsorTransparency(id, { isVerified: true });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error verifying transparency record', { id, error: errorMsg });
      throw new Error(`Failed to verify transparency record: ${errorMsg}`);
    }
  }

  async deleteTransparencyRecord(id: number): Promise<boolean> {
    try {
      const result = await db.delete(sponsorTransparency)
        .where(eq(sponsorTransparency.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deleting transparency record', { id, error: errorMsg });
      throw new Error(`Failed to delete transparency record: ${errorMsg}`);
    }
  }

  // ============================================================================
  // SPONSORSHIP OPERATIONS
  // ============================================================================

  async getSponsorBillSponsorships(
    sponsorId: number, 
    activeOnly: boolean = true
  ): Promise<BillSponsorship[]> {
    try {
      const conditions = [eq(billSponsorships.sponsorId, sponsorId)];
      
      if (activeOnly) {
        conditions.push(eq(billSponsorships.isActive, true));
      }
      
      let query = db.select().from(billSponsorships);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query.orderBy(desc(billSponsorships.sponsorshipDate));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsor bill sponsorships', { sponsorId, error: errorMsg });
      throw new Error(`Failed to retrieve sponsorships: ${errorMsg}`);
    }
  }

  async getBillSponsorships(billId: number, activeOnly: boolean = true): Promise<BillSponsorship[]> {
    try {
      const conditions = [eq(billSponsorships.billId, billId)];
      
      if (activeOnly) {
        conditions.push(eq(billSponsorships.isActive, true));
      }
      
      let query = db.select().from(billSponsorships);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query.orderBy(desc(billSponsorships.sponsorshipDate));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching bill sponsorships', { billId, error: errorMsg });
      throw new Error(`Failed to retrieve sponsorships: ${errorMsg}`);
    }
  }

  async getSponsorshipsByBillIds(
    billIds: number[],
    activeOnly: boolean = true
  ): Promise<Map<number, BillSponsorship[]>> {
    try {
      if (billIds.length === 0) return new Map();

      const conditions = [inArray(billSponsorships.billId, billIds)];
      
      if (activeOnly) {
        conditions.push(eq(billSponsorships.isActive, true));
      }

      let query = db.select().from(billSponsorships);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const sponsorships = await query.orderBy(desc(billSponsorships.sponsorshipDate));

      const sponsorshipMap = new Map<number, BillSponsorship[]>();
      sponsorships.forEach(sponsorship => {
        if (!sponsorshipMap.has(sponsorship.billId)) {
          sponsorshipMap.set(sponsorship.billId, []);
        }
        sponsorshipMap.get(sponsorship.billId)!.push(sponsorship);
      });

      return sponsorshipMap;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsorships by bill IDs', { billIds, error: errorMsg });
      throw new Error(`Failed to retrieve sponsorships: ${errorMsg}`);
    }
  }

  async createBillSponsorship(
    sponsorId: number,
    billId: number,
    sponsorshipType: string,
    sponsorshipDate?: Date
  ): Promise<BillSponsorship> {
    try {
      const result = await db.insert(billSponsorships)
        .values({
          sponsorId,
          billId,
          sponsorshipType,
          sponsorshipDate: sponsorshipDate || new Date(),
          isActive: true,
          createdAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error creating bill sponsorship', { sponsorId, billId, error: errorMsg });
      throw new Error(`Failed to create bill sponsorship: ${errorMsg}`);
    }
  }

  async updateBillSponsorship(
    id: number,
    updateData: Partial<typeof billSponsorships.$inferInsert>
  ): Promise<BillSponsorship | null> {
    try {
      const result = await db.update(billSponsorships)
        .set(updateData)
        .where(eq(billSponsorships.id, id))
        .returning();
      
      return result[0] || null;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error updating bill sponsorship', { id, updateData, error: errorMsg });
      throw new Error(`Failed to update bill sponsorship: ${errorMsg}`);
    }
  }

  async deactivateBillSponsorship(id: number): Promise<BillSponsorship | null> {
    try {
      return await this.updateBillSponsorship(id, { isActive: false });
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deactivating bill sponsorship', { id, error: errorMsg });
      throw new Error(`Failed to deactivate bill sponsorship: ${errorMsg}`);
    }
  }

  async deleteBillSponsorship(id: number): Promise<boolean> {
    try {
      const result = await db.delete(billSponsorships)
        .where(eq(billSponsorships.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error deleting bill sponsorship', { id, error: errorMsg });
      throw new Error(`Failed to delete bill sponsorship: ${errorMsg}`);
    }
  }

  async getSponsorshipDataForBill(billId: number, sponsorshipType?: string) {
    try {
      const query = db
        .select({
          sponsorship: billSponsorships,
          sponsor: sponsors,
          transparency: sponsorTransparency,
          affiliations: sql`json_agg(json_build_object(
            'id', ${sponsorAffiliations.id},
            'organization', ${sponsorAffiliations.organization},
            'role', ${sponsorAffiliations.role},
            'type', ${sponsorAffiliations.type},
            'conflictType', ${sponsorAffiliations.conflictType},
            'startDate', ${sponsorAffiliations.startDate},
            'endDate', ${sponsorAffiliations.endDate},
            'isActive', ${sponsorAffiliations.isActive}
          )) FILTER (WHERE ${sponsorAffiliations.id} IS NOT NULL)`
        })
        .from(billSponsorships)
        .leftJoin(sponsors, eq(billSponsorships.sponsorId, sponsors.id))
        .leftJoin(sponsorTransparency, eq(sponsors.id, sponsorTransparency.sponsorId))
        .leftJoin(sponsorAffiliations, eq(sponsors.id, sponsorAffiliations.sponsorId));

      const conditions = [
        eq(billSponsorships.billId, billId),
        eq(billSponsorships.isActive, true)
      ];

      if (sponsorshipType) {
        conditions.push(eq(billSponsorships.sponsorshipType, sponsorshipType));
      }

      return await query
        .where(and(...conditions))
        .groupBy(billSponsorships.id, sponsors.id, sponsorTransparency.id);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching sponsorship data for bill', { billId, sponsorshipType, error: errorMsg });
      throw new Error(`Failed to retrieve sponsorship data: ${errorMsg}`);
    }
  }

  // ============================================================================
  // BILL OPERATIONS
  // ============================================================================

  async getBill(billId: number) {
    try {
      const result = await db.select().from(bills).where(eq(bills.id, billId));
      return result[0] || null;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching bill', { billId, error: errorMsg });
      throw new Error(`Failed to retrieve bill: ${errorMsg}`);
    }
  }

  async getBillsByIds(billIds: number[]) {
    try {
      if (billIds.length === 0) return [];
      
      return await db.select()
        .from(bills)
        .where(inArray(bills.id, billIds));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching bills by IDs', { billIds, error: errorMsg });
      throw new Error(`Failed to retrieve bills: ${errorMsg}`);
    }
  }

  async findBillsMentioningOrganization(organization: string, billIds?: number[]) {
    try {
      const searchPattern = `%${organization}%`;
      
      const searchConditions = or(
        sql`${bills.content} ILIKE ${searchPattern}`,
        sql`${bills.title} ILIKE ${searchPattern}`,
        sql`${bills.description} ILIKE ${searchPattern}`
      );

      let query = db.select().from(bills);

      if (billIds && billIds.length > 0) {
        query = query.where(and(
          inArray(bills.id, billIds),
          searchConditions
        )) as any;
      } else {
        query = query.where(searchConditions) as any;
      }

      return await query;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error finding bills mentioning organization', { organization, error: errorMsg });
      throw new Error(`Failed to find bills: ${errorMsg}`);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getActiveSponsorCount(): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));
      
      return result[0]?.count || 0;
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error counting active sponsors', { error: errorMsg });
      throw new Error(`Failed to count sponsors: ${errorMsg}`);
    }
  }

  async getUniqueParties(): Promise<string[]> {
    try {
      const result = await db.selectDistinct({ party: sponsors.party })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));
      
      return result
        .map(r => r.party)
        .filter((p): p is string => p !== null && p !== undefined);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching unique parties', { error: errorMsg });
      throw new Error(`Failed to retrieve parties: ${errorMsg}`);
    }
  }

  async getUniqueConstituencies(): Promise<string[]> {
    try {
      const result = await db.selectDistinct({ constituency: sponsors.constituency })
        .from(sponsors)
        .where(eq(sponsors.isActive, true));
      
      return result
        .map(r => r.constituency)
        .filter((c): c is string => c !== null && c !== undefined);
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logger.error('Error fetching unique constituencies', { error: errorMsg });
      throw new Error(`Failed to retrieve constituencies: ${errorMsg}`);
    }
  }
}

export const sponsorService = new SponsorService();





































