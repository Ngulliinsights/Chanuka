import { 
  bills, users, billComments, userProfiles, billEngagement, 
  notifications, analysis, sponsors, sponsorAffiliations, 
  billSponsorships, sponsorTransparency, billSectionConflicts,
  type Bill, type InsertBill, type User, type InsertUser,
  type BillComment, type InsertBillComment, type UserProfile, type InsertUserProfile,
  type Sponsor, type InsertSponsor, type Analysis, type InsertAnalysis,
  type BillEngagement, type Notification, type SponsorAffiliation, 
  type SponsorTransparency, type BillSectionConflict
} from "../../../shared/schema.js";
import { eq, desc, and, or, like, count, asc, sql } from "drizzle-orm";
import { readDatabase, writeDatabase } from '../../db.js';
import { logger } from '../../utils/logger';

// Enhanced engagement statistics interface with more detailed metrics
export interface BillEngagementStats {
  views: number;
  comments: number;
  bookmarks: number;
  shares?: number;
  likes?: number;
  totalEngagement: number;
}

// Enhanced search options for better query control
export interface BillSearchOptions {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'introducedDate' | 'lastActionDate' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface LegislativeStorage {
  // Bill methods - enhanced with better search capabilities
  getBills(options?: BillSearchOptions): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillsByCategory(category: string): Promise<Bill[]>;
  getBillsByStatus(status: string): Promise<Bill[]>;
  searchBills(query: string, options?: BillSearchOptions): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;

  // User methods - with better error handling
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deactivateUser(id: string): Promise<boolean>;

  // User profile methods
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Comment methods - with pagination support
  getBillComments(billId: number, limit?: number, offset?: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Sponsor methods - enhanced with relationship data
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(billId: number): Promise<(Sponsor & { sponsorshipType: string })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;

  // Analysis methods
  getBillAnalysis(billId: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // Engagement methods - fixed and enhanced
  recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'createdAt'>): Promise<BillEngagement>;
  getBillEngagementStats(billId: number): Promise<BillEngagementStats>;
  getUserEngagementHistory(userId: string, limit?: number): Promise<BillEngagement[]>;

  // Notification methods
  getUserNotifications(userId: string, includeRead?: boolean): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Transparency methods
  getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(billId: number): Promise<BillSectionConflict[]>;
}

export class DatabaseLegislativeStorage implements LegislativeStorage {
  // Enhanced bill methods with better query options
  async getBills(options: BillSearchOptions = {}): Promise<Bill[]> {
    const { limit = 50, offset = 0, sortBy = 'introducedDate', sortOrder = 'desc' } = options;
    
  let query = readDatabase().select().from(bills);
    
    // Apply filters if provided
    if (options.category) {
      query = query.where(eq(bills.category, options.category));
    }
    
    if (options.status) {
      query = query.where(eq(bills.status, options.status));
    }
    
    // Apply sorting - this creates a more flexible sorting system
    const sortColumn = bills[sortBy];
    const orderFunction = sortOrder === 'asc' ? asc : desc;
    
    return await query
      .orderBy(orderFunction(sortColumn))
      .limit(limit)
      .offset(offset);
  }

  async getBill(id: number): Promise<Bill | undefined> {
  const result = await readDatabase().select().from(bills).where(eq(bills.id, id));
    return result[0];
  }

  async getBillsByCategory(category: string): Promise<Bill[]> {
  return await readDatabase().select().from(bills)
      .where(eq(bills.category, category))
      .orderBy(desc(bills.introducedDate));
  }

  async getBillsByStatus(status: string): Promise<Bill[]> {
  return await readDatabase().select().from(bills)
      .where(eq(bills.status, status))
      .orderBy(desc(bills.lastActionDate));
  }

  async searchBills(query: string, options: BillSearchOptions = {}): Promise<Bill[]> {
    const { limit = 50, offset = 0 } = options;
    
    // Enhanced search that looks across multiple fields
    const searchCondition = or(
      like(bills.title, `%${query}%`),
      like(bills.description, `%${query}%`),
      like(bills.billNumber, `%${query}%`)
    );
    
  let dbQuery = readDatabase().select().from(bills).where(searchCondition);
    
    // Apply additional filters from options
    if (options.category) {
      dbQuery = dbQuery.where(and(searchCondition, eq(bills.category, options.category)));
    }
    
    if (options.status) {
      dbQuery = dbQuery.where(and(searchCondition, eq(bills.status, options.status)));
    }
    
    return await dbQuery
      .orderBy(desc(bills.introducedDate))
      .limit(limit)
      .offset(offset);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
  const result = await readDatabase().insert(bills).values(insertBill).returning();
  return result[0];
  }

  async updateBill(id: number, updateData: Partial<Bill>): Promise<Bill | undefined> {
    const result = await readDatabase().update(bills)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  async deleteBill(id: number): Promise<boolean> {
  const result = await readDatabase().delete(bills).where(eq(bills.id, id)).returning();
  return result.length > 0;
  }

  // Enhanced user methods
  async getUser(id: string): Promise<User | undefined> {
  const result = await readDatabase().select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
  const result = await readDatabase().select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
  const result = await readDatabase().insert(users).values(insertUser).returning();
  return result[0];
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
    const result = await readDatabase().update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deactivateUser(id: string): Promise<boolean> {
    const result = await readDatabase().update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  // User profile methods
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
  const result = await readDatabase().select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
  const result = await readDatabase().insert(userProfiles).values(insertProfile).returning();
  return result[0];
  }

  async updateUserProfile(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const result = await readDatabase().update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result[0];
  }

  // Enhanced comment methods with pagination
  async getBillComments(billId: number, limit: number = 50, offset: number = 0): Promise<BillComment[]> {
  return await readDatabase().select().from(billComments)
      .where(eq(billComments.billId, billId))
      .orderBy(desc(billComments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createBillComment(insertComment: InsertBillComment): Promise<BillComment> {
  const result = await readDatabase().insert(billComments).values(insertComment).returning();
  return result[0];
  }

  async updateComment(id: number, updateData: Partial<BillComment>): Promise<BillComment | undefined> {
    const result = await readDatabase().update(billComments)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(billComments.id, id))
      .returning();
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
  const result = await readDatabase().delete(billComments).where(eq(billComments.id, id)).returning();
  return result.length > 0;
  }

  // Sponsor methods
  async getSponsors(): Promise<Sponsor[]> {
  return await readDatabase().select().from(sponsors)
      .where(eq(sponsors.isActive, true))
      .orderBy(sponsors.name);
  }

  async getSponsor(id: number): Promise<Sponsor | undefined> {
  const result = await readDatabase().select().from(sponsors).where(eq(sponsors.id, id));
    return result[0];
  }

  async getBillSponsors(billId: number): Promise<(Sponsor & { sponsorshipType: string })[]> {
  const result = await readDatabase().select({
      id: sponsors.id,
      name: sponsors.name,
      role: sponsors.role,
      party: sponsors.party,
      constituency: sponsors.constituency,
      email: sponsors.email,
      phone: sponsors.phone,
      bio: sponsors.bio,
      photoUrl: sponsors.photoUrl,
      conflictLevel: sponsors.conflictLevel,
      financialExposure: sponsors.financialExposure,
      votingAlignment: sponsors.votingAlignment,
      transparencyScore: sponsors.transparencyScore,
      isActive: sponsors.isActive,
      createdAt: sponsors.createdAt,
      sponsorshipType: billSponsorships.sponsorshipType
    })
    .from(sponsors)
    .innerJoin(billSponsorships, eq(sponsors.id, billSponsorships.sponsorId))
    .where(and(
      eq(billSponsorships.billId, billId),
      eq(billSponsorships.isActive, true)
    ));

    return result as (Sponsor & { sponsorshipType: string })[];
  }

  async createSponsor(insertSponsor: InsertSponsor): Promise<Sponsor> {
    const result = await writeDatabase.insert(sponsors).values(insertSponsor).returning();
    return result[0];
  }

  async updateSponsor(id: number, updateData: Partial<Sponsor>): Promise<Sponsor | undefined> {
    const result = await writeDatabase.update(sponsors)
      .set(updateData)
      .where(eq(sponsors.id, id))
      .returning();
    return result[0];
  }

  // Analysis methods
  async getBillAnalysis(billId: number): Promise<Analysis[]> {
  return await readDatabase().select().from(analysis)
      .where(eq(analysis.billId, billId))
      .orderBy(desc(analysis.createdAt));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
  const result = await readDatabase().insert(analysis).values(insertAnalysis).returning();
  return result[0];
  }

  // Fixed engagement methods - addressing the TypeScript errors
  async recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'createdAt'>): Promise<BillEngagement> {
  const result = await readDatabase().insert(billEngagement).values(engagement).returning();
  return result[0];
  }

  async getBillEngagementStats(billId: number): Promise<BillEngagementStats> {
    // Optimized query using single aggregation query as per design.md recommendations
    const stats = await readDatabase()
      .select({
        totalViews: sql<number>`SUM(${billEngagement.viewCount})`,
        totalComments: sql<number>`COUNT(DISTINCT ${billComments.id})`,
        totalShares: sql<number>`SUM(${billEngagement.shareCount})`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${billEngagement.userId})`
      })
      .from(billEngagement)
      .leftJoin(billComments, eq(billEngagement.billId, billComments.billId))
      .where(eq(billEngagement.billId, billId));

    const result = stats[0];
    const views = Number(result?.totalViews) || 0;
    const comments = Number(result?.totalComments) || 0;
    const shares = Number(result?.totalShares) || 0;

    return {
      views,
      comments,
      bookmarks: 0, // Not tracked in current schema
      shares,
      totalEngagement: views + comments + shares
    };
  }

  async getUserEngagementHistory(userId: string, limit: number = 50): Promise<BillEngagement[]> {
  return await readDatabase().select().from(billEngagement)
      .where(eq(billEngagement.userId, userId))
      .orderBy(desc(billEngagement.lastEngaged))
      .limit(limit);
  }

  // Enhanced notification methods
  async getUserNotifications(userId: string, includeRead: boolean = false): Promise<Notification[]> {
  let query = readDatabase().select().from(notifications)
      .where(eq(notifications.userId, userId));
    
    if (!includeRead) {
      query = query.where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    }
    
  return await query.orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await readDatabase().update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await readDatabase().update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Transparency methods
  async getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]> {
  return await readDatabase().select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsorId, sponsorId))
      .orderBy(desc(sponsorTransparency.dateReported));
  }

  async getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
  return await readDatabase().select().from(sponsorAffiliations)
      .where(and(
        eq(sponsorAffiliations.sponsorId, sponsorId),
        eq(sponsorAffiliations.isActive, true)
      ))
      .orderBy(desc(sponsorAffiliations.startDate));
  }

  async getBillConflicts(billId: number): Promise<BillSectionConflict[]> {
  return await readDatabase().select().from(billSectionConflicts)
      .where(eq(billSectionConflicts.billId, billId))
      .orderBy(billSectionConflicts.sectionNumber);
  }
}

export const legislativeStorage = new DatabaseLegislativeStorage();








