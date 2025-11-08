import { bill as bills, users as users, comments as comments, user_profiles as user_profiles, bill_engagement,
  notification as notifications, analysis, sponsor as sponsors, sponsorAffiliation as sponsorAffiliations,
  bill_sponsorship as bill_sponsorships, sponsorTransparency, billSectionConflict as billSectionConflicts,
  type Bill, type InsertBill, type User, type InsertUser,
  type BillComment, type InsertBillComment, type UserProfile, type InsertUserProfile,
  type Sponsor, type InsertSponsor, type Analysis, type InsertAnalysis,
  type BillEngagement, type Notification, type SponsorAffiliation, 
  type SponsorTransparency, type BillSectionConflict
 } from '../shared/schema';
import { eq, desc, and, or, like, count, asc, sql } from "drizzle-orm";
import { readDatabase } from '@shared/database';
import { logger   } from '../../../shared/core/src/index.js';

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
  sortBy?: 'introduced_date' | 'last_action_date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface LegislativeStorage { // Bill methods - enhanced with better search capabilities
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
  getUserProfile(user_id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(user_id: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Comment methods - with pagination support
  getBillComments(bill_id: number, limit?: number, offset?: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Sponsor methods - enhanced with relationship data
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string   })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;

  // Analysis methods
  getBillAnalysis(bill_id: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // Engagement methods - fixed and enhanced
  recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'created_at'>): Promise<BillEngagement>;
  getBillEngagementStats(bill_id: number): Promise<BillEngagementStats>;
  getUserEngagementHistory(user_id: string, limit?: number): Promise<BillEngagement[]>;

  // Notification methods
  getUserNotifications(user_id: string, includeRead?: boolean): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(user_id: string): Promise<void>;

  // Transparency methods
  getSponsorTransparency(sponsor_id: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(bill_id: number): Promise<BillSectionConflict[]>;
}

export class DatabaseLegislativeStorage implements LegislativeStorage {
  // Enhanced bill methods with better query options
  async getBills(options: BillSearchOptions = {}): Promise<Bill[]> {
    const { limit = 50, offset = 0, sortBy = 'introduced_date', sortOrder = 'desc' } = options;
    
  let query = readDatabase.select().from(bills);
    
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
  const result = await readDatabase.select().from(bills).where(eq(bills.id, id));
    return result[0];
  }

  async getBillsByCategory(category: string): Promise<Bill[]> {
  return await readDatabase.select().from(bills)
      .where(eq(bills.category, category))
      .orderBy(desc(bills.introduced_date));
  }

  async getBillsByStatus(status: string): Promise<Bill[]> {
  return await readDatabase.select().from(bills)
      .where(eq(bills.status, status))
      .orderBy(desc(bills.last_action_date));
  }

  async searchBills(query: string, options: BillSearchOptions = {}): Promise<Bill[]> {
    const { limit = 50, offset = 0 } = options;
    
    // Enhanced search that looks across multiple fields
    const searchCondition = or(
      like(bills.title, `%${query}%`),
      like(bills.description, `%${query}%`),
      like(bills.bill_number, `%${query}%`)
    );
    
  let dbQuery = readDatabase.select().from(bills).where(searchCondition);
    
    // Apply additional filters from options
    if (options.category) {
      dbQuery = dbQuery.where(and(searchCondition, eq(bills.category, options.category)));
    }
    
    if (options.status) {
      dbQuery = dbQuery.where(and(searchCondition, eq(bills.status, options.status)));
    }
    
    return await dbQuery
      .orderBy(desc(bills.introduced_date))
      .limit(limit)
      .offset(offset);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
  const result = await readDatabase.insert(bills).values(insertBill).returning();
  return result[0];
  }

  async updateBill(id: number, updateData: Partial<Bill>): Promise<Bill | undefined> {
  const result = await readDatabase.update(bills)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  async deleteBill(id: number): Promise<boolean> {
  const result = await readDatabase.delete(bills).where(eq(bills.id, id)).returning();
  return result.length > 0;
  }

  // Enhanced user methods
  async getUser(id: string): Promise<User | undefined> {
  const result = await readDatabase.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
  const result = await readDatabase.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
  const result = await readDatabase.insert(users).values(insertUser).returning();
  return result[0];
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
  const result = await readDatabase.update(users)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deactivateUser(id: string): Promise<boolean> {
  const result = await readDatabase.update(users)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  // User profile methods
  async getUserProfile(user_id: string): Promise<UserProfile | undefined> { const result = await readDatabase.select().from(user_profiles).where(eq(user_profiles.user_id, user_id));
    return result[0];
   }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
  const result = await readDatabase.insert(user_profiles).values(insertProfile).returning();
  return result[0];
  }

  async updateUserProfile(user_id: string, updateData: Partial<UserProfile>): Promise<UserProfile | undefined> { const result = await readDatabase.update(user_profiles)
      .set(updateData)
      .where(eq(user_profiles.user_id, user_id))
      .returning();
    return result[0];
   }

  // Enhanced comment methods with pagination
  async getBillComments(bill_id: number, limit: number = 50, offset: number = 0): Promise<BillComment[]> { return await readDatabase.select().from(comments)
      .where(eq(comments.bill_id, bill_id))
      .orderBy(desc(comments.created_at))
      .limit(limit)
      .offset(offset);
   }

  async createBillComment(insertComment: InsertBillComment): Promise<BillComment> {
  const result = await readDatabase.insert(comments).values(insertComment).returning();
  return result[0];
  }

  async updateComment(id: number, updateData: Partial<BillComment>): Promise<BillComment | undefined> {
  const result = await readDatabase.update(comments)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
  const result = await readDatabase.delete(comments).where(eq(comments.id, id)).returning();
  return result.length > 0;
  }

  // Sponsor methods
  async getSponsors(): Promise<Sponsor[]> {
  return await readDatabase.select().from(sponsors)
      .where(eq(sponsors.is_active, true))
      .orderBy(sponsors.name);
  }

  async getSponsor(id: number): Promise<Sponsor | undefined> {
  const result = await readDatabase.select().from(sponsors).where(eq(sponsors.id, id));
    return result[0];
  }

  async getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string })[]> {
  const result = await readDatabase.select({
      id: sponsors.id,
      name: sponsors.name,
      role: sponsors.role,
      party: sponsors.party,
      constituency: sponsors.constituency,
      email: sponsors.email,
      phone: sponsors.phone,
      bio: sponsors.bio,
      photo_url: sponsors.photo_url,
      conflict_level: sponsors.conflict_level,
      financial_exposure: sponsors.financial_exposure,
      voting_alignment: sponsors.voting_alignment,
      transparency_score: sponsors.transparency_score,
      is_active: sponsors.is_active,
      created_at: sponsors.created_at,
      sponsorshipType: bill_sponsorships.sponsorshipType
    })
    .from(sponsors)
    .innerJoin(bill_sponsorships, eq(sponsors.id, bill_sponsorships.sponsor_id))
    .where(and(
      eq(bill_sponsorships.bill_id, bill_id),
      eq(bill_sponsorships.is_active, true)
    ));

    return result as (Sponsor & { sponsorshipType: string })[];
  }

  async createSponsor(insertSponsor: InsertSponsor): Promise<Sponsor> {
  const result = await readDatabase.insert(sponsors).values(insertSponsor).returning();
    return result[0];
  }

  async updateSponsor(id: number, updateData: Partial<Sponsor>): Promise<Sponsor | undefined> {
  const result = await readDatabase.update(sponsors)
      .set(updateData)
      .where(eq(sponsors.id, id))
      .returning();
    return result[0];
  }

  // Analysis methods
  async getBillAnalysis(bill_id: number): Promise<Analysis[]> { return await readDatabase.select().from(analysis)
      .where(eq(analysis.bill_id, bill_id))
      .orderBy(desc(analysis.created_at));
   }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
  const result = await readDatabase.insert(analysis).values(insertAnalysis).returning();
  return result[0];
  }

  // Fixed engagement methods - addressing the TypeScript errors
  async recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'created_at'>): Promise<BillEngagement> {
  const result = await readDatabase.insert(bill_engagement).values(engagement).returning();
  return result[0];
  }

  async getBillEngagementStats(bill_id: number): Promise<BillEngagementStats> {
    // Optimized query using single aggregation query as per design.md recommendations
  const stats = await readDatabase
      .select({
        totalViews: sql<number>`SUM(${bill_engagement.view_count})`,
        totalComments: sql<number>`COUNT(DISTINCT ${comments.id})`,
        totalShares: sql<number>`SUM(${bill_engagement.share_count})`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${bill_engagement.user_id})`
      })
      .from(bill_engagement)
      .leftJoin(comments, eq(bill_engagement.bill_id, comments.bill_id))
      .where(eq(bill_engagement.bill_id, bill_id));

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

  async getUserEngagementHistory(user_id: string, limit: number = 50): Promise<BillEngagement[]> { return await readDatabase.select().from(bill_engagement)
      .where(eq(bill_engagement.user_id, user_id))
      .orderBy(desc(bill_engagement.lastEngaged))
      .limit(limit);
   }

  // Enhanced notification methods
  async getUserNotifications(user_id: string, includeRead: boolean = false): Promise<Notification[]> { let query = readDatabase.select().from(notifications)
      .where(eq(notifications.user_id, user_id));
    
    if (!includeRead) {
      query = query.where(and(
        eq(notifications.user_id, user_id),
        eq(notifications.is_read, false)
      ));
     }
    
  return await query.orderBy(desc(notifications.created_at));
  }

  async markNotificationRead(id: number): Promise<void> {
  await readDatabase.update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(user_id: string): Promise<void> {
  await readDatabase.update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.user_id, user_id));
  }

  // Transparency methods
  async getSponsorTransparency(sponsor_id: number): Promise<SponsorTransparency[]> {
  return await readDatabase.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsor_id, sponsor_id))
      .orderBy(desc(sponsorTransparency.dateReported));
  }

  async getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
  return await readDatabase.select().from(sponsorAffiliations)
      .where(and(
        eq(sponsorAffiliations.sponsor_id, sponsor_id),
        eq(sponsorAffiliations.is_active, true)
      ))
      .orderBy(desc(sponsorAffiliations.start_date));
  }

  async getBillConflicts(bill_id: number): Promise<BillSectionConflict[]> { return await readDatabase.select().from(billSectionConflicts)
      .where(eq(billSectionConflicts.bill_id, bill_id))
      .orderBy(billSectionConflicts.sectionNumber);
   }
}

export const legislativeStorage = new DatabaseLegislativeStorage();














































