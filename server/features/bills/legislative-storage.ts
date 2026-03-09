import { readDatabase, writeDatabase } from '@server/infrastructure/database';
import {
  type Bill, bills,
  type Sponsor, sponsors,
  type User, users,
  analysis,
  bill_engagement,
  bill_sponsorships,
  comments,
  user_profiles,
  notifications,
  sponsorAffiliations,
  sponsorTransparency,
} from '@server/infrastructure/schema';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';

// ============================================================================
// Derived types — these are not exported from the schema barrel, so we infer
// them from the Drizzle table objects directly.
// ============================================================================

type Analysis        = typeof analysis.$inferSelect;
type InsertAnalysis  = typeof analysis.$inferInsert;
type InsertBill      = typeof bills.$inferInsert;
type BillComment     = typeof comments.$inferSelect;
type InsertBillComment = typeof comments.$inferInsert;
type BillEngagement  = typeof bill_engagement.$inferSelect;
type InsertSponsor   = typeof sponsors.$inferInsert;
type InsertUser      = typeof users.$inferInsert;
type UserProfile     = typeof user_profiles.$inferSelect;
type InsertUserProfile = typeof user_profiles.$inferInsert;
type Notification    = typeof notifications.$inferSelect;
type SponsorAffiliation = typeof sponsorAffiliations.$inferSelect;
type SponsorTransparency = typeof sponsorTransparency.$inferSelect;

// BillSectionConflict table is not yet exported from the schema barrel.
// Defined locally until the schema re-exports it.
interface BillSectionConflict {
  id: number;
  bill_id: number;
  sectionNumber: number;
  [key: string]: unknown;
}

// ============================================================================
// Typed database aliases — bypasses Drizzle's overly-strict .select({})
// overload without scattering @ts-ignore throughout the file.
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db  = readDatabase  as any;  // reads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wdb = writeDatabase as any;  // writes (inserts / updates / deletes)

// ============================================================================
// Interfaces
// ============================================================================

export interface BillEngagementStats {
  views: number;
  comments: number;
  bookmarks: number;
  shares?: number;
  likes?: number;
  totalEngagement: number;
}

export interface BillSearchOptions {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'introduced_date' | 'last_action_date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface LegislativeStorage {
  // Bill methods
  getBills(options?: BillSearchOptions): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillsByCategory(category: string): Promise<Bill[]>;
  getBillsByStatus(status: string): Promise<Bill[]>;
  searchBills(query: string, options?: BillSearchOptions): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;

  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deactivateUser(id: string): Promise<boolean>;

  // User profile methods
  getUserProfile(user_id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(user_id: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Comment methods
  getBillComments(bill_id: number, limit?: number, offset?: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Sponsor methods
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;

  // Analysis methods
  getBillAnalysis(bill_id: number): Promise<Analysis[]>;
  createAnalysis(a: InsertAnalysis): Promise<Analysis>;

  // Engagement methods
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

// ============================================================================
// Implementation
// ============================================================================

export class DatabaseLegislativeStorage implements LegislativeStorage {

  // --------------------------------------------------------------------------
  // Bills
  // --------------------------------------------------------------------------

  async getBills(options: BillSearchOptions = {}): Promise<Bill[]> {
    const { limit = 50, offset = 0, sortBy = 'introduced_date', sortOrder = 'desc' } = options;

    let query = db.select().from(bills);

    if (options.category) query = query.where(eq(bills.category, options.category));
    if (options.status)   query = query.where(eq(bills.status,   options.status));

    const sortColumn    = bills[sortBy as keyof typeof bills];
    const orderFunction = sortOrder === 'asc' ? asc : desc;

    return await query.orderBy(orderFunction(sortColumn)).limit(limit).offset(offset);
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const result = await db.select().from(bills).where(eq(bills.id, id));
    return result[0];
  }

  async getBillsByCategory(category: string): Promise<Bill[]> {
    return await db.select().from(bills)
      .where(eq(bills.category, category))
      .orderBy(desc(bills.introduced_date));
  }

  async getBillsByStatus(status: string): Promise<Bill[]> {
    return await db.select().from(bills)
      .where(eq(bills.status, status))
      .orderBy(desc(bills.last_action_date));
  }

  async searchBills(query: string, options: BillSearchOptions = {}): Promise<Bill[]> {
    const { limit = 50, offset = 0 } = options;

    const baseCondition = or(
      like(bills.title,       `%${query}%`),
      like(bills.description, `%${query}%`),
      like(bills.bill_number, `%${query}%`),
    );

    const conditions = [baseCondition];
    if (options.category) conditions.push(eq(bills.category, options.category));
    if (options.status)   conditions.push(eq(bills.status,   options.status));

    return await db.select().from(bills)
      .where(and(...conditions))
      .orderBy(desc(bills.introduced_date))
      .limit(limit)
      .offset(offset);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const result = await wdb.insert(bills).values(insertBill).returning();
    return result[0];
  }

  async updateBill(id: number, updateData: Partial<Bill>): Promise<Bill | undefined> {
    const result = await wdb.update(bills)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  async deleteBill(id: number): Promise<boolean> {
    const result = await wdb.delete(bills).where(eq(bills.id, id)).returning();
    return result.length > 0;
  }

  // --------------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------------

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await wdb.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
    const result = await wdb.update(users)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deactivateUser(id: string): Promise<boolean> {
    const result = await wdb.update(users)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  // --------------------------------------------------------------------------
  // User Profiles
  // --------------------------------------------------------------------------

  async getUserProfile(user_id: string): Promise<UserProfile | undefined> {
    const result = await db.select().from(user_profiles).where(eq(user_profiles.user_id, user_id));
    return result[0];
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const result = await wdb.insert(user_profiles).values(insertProfile).returning();
    return result[0];
  }

  async updateUserProfile(user_id: string, updateData: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const result = await wdb.update(user_profiles)
      .set(updateData)
      .where(eq(user_profiles.user_id, user_id))
      .returning();
    return result[0];
  }

  // --------------------------------------------------------------------------
  // Comments
  // --------------------------------------------------------------------------

  async getBillComments(bill_id: number, limit = 50, offset = 0): Promise<BillComment[]> {
    return await db.select().from(comments)
      .where(eq(comments.bill_id, bill_id))
      .orderBy(desc(comments.created_at))
      .limit(limit)
      .offset(offset);
  }

  async createBillComment(insertComment: InsertBillComment): Promise<BillComment> {
    const result = await wdb.insert(comments).values(insertComment).returning();
    return result[0];
  }

  async updateComment(id: number, updateData: Partial<BillComment>): Promise<BillComment | undefined> {
    const result = await wdb.update(comments)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await wdb.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }

  // --------------------------------------------------------------------------
  // Sponsors
  // --------------------------------------------------------------------------

  async getSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors)
      .where(eq(sponsors.is_active, true))
      .orderBy(sponsors.name);
  }

  async getSponsor(id: number): Promise<Sponsor | undefined> {
    const result = await db.select().from(sponsors).where(eq(sponsors.id, id));
    return result[0];
  }

  async getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string })[]> {
    const result = await db.select({
      id:                 sponsors.id,
      name:               sponsors.name,
      role:               sponsors.role,
      party:              sponsors.party,
      constituency:       sponsors.constituency,
      email:              sponsors.email,
      phone:              sponsors.phone,
      bio:                sponsors.bio,
      photo_url:          sponsors.photo_url,
      conflict_level:     sponsors.conflict_level,
      financial_exposure: sponsors.financial_exposure,
      voting_alignment:   sponsors.voting_alignment,
      transparency_score: sponsors.transparency_score,
      is_active:          sponsors.is_active,
      created_at:         sponsors.created_at,
      sponsorshipType:    bill_sponsorships.sponsorshipType,
    })
      .from(sponsors)
      .innerJoin(bill_sponsorships, eq(sponsors.id, bill_sponsorships.sponsor_id))
      .where(and(
        eq(bill_sponsorships.bill_id,    bill_id),
        eq(bill_sponsorships.is_active,  true),
      ));

    return result as (Sponsor & { sponsorshipType: string })[];
  }

  async createSponsor(insertSponsor: InsertSponsor): Promise<Sponsor> {
    const result = await wdb.insert(sponsors).values(insertSponsor).returning();
    return result[0];
  }

  async updateSponsor(id: number, updateData: Partial<Sponsor>): Promise<Sponsor | undefined> {
    const result = await wdb.update(sponsors)
      .set(updateData)
      .where(eq(sponsors.id, id))
      .returning();
    return result[0];
  }

  // --------------------------------------------------------------------------
  // Analysis
  // --------------------------------------------------------------------------

  async getBillAnalysis(bill_id: number): Promise<Analysis[]> {
    return await db.select().from(analysis)
      .where(eq(analysis.bill_id, bill_id))
      .orderBy(desc(analysis.created_at));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const result = await wdb.insert(analysis).values(insertAnalysis).returning();
    return result[0];
  }

  // --------------------------------------------------------------------------
  // Engagement
  // --------------------------------------------------------------------------

  async recordBillEngagement(
    engagement: Omit<BillEngagement, 'id' | 'created_at'>,
  ): Promise<BillEngagement> {
    const result = await wdb.insert(bill_engagement).values(engagement).returning();
    return result[0];
  }

  async getBillEngagementStats(bill_id: number): Promise<BillEngagementStats> {
    // Single aggregation query — avoids N+1 and separate count queries
    const rows: Array<{
      totalViews:    number | null;
      totalComments: number | null;
      totalShares:   number | null;
    }> = await db
      .select({
        totalViews:    sql<number>`COALESCE(SUM(${bill_engagement.view_count}), 0)::int`,
        totalComments: sql<number>`COUNT(DISTINCT ${comments.id})::int`,
        totalShares:   sql<number>`COALESCE(SUM(${bill_engagement.share_count}), 0)::int`,
      })
      .from(bill_engagement)
      .leftJoin(comments, eq(bill_engagement.bill_id, comments.bill_id))
      .where(eq(bill_engagement.bill_id, bill_id));

    const row          = rows[0];
    const views        = Number(row?.totalViews)    || 0;
    const commentCount = Number(row?.totalComments) || 0;
    const shares       = Number(row?.totalShares)   || 0;

    return {
      views,
      comments:        commentCount,
      bookmarks:       0, // not tracked in current schema
      shares,
      totalEngagement: views + commentCount + shares,
    };
  }

  async getUserEngagementHistory(user_id: string, limit = 50): Promise<BillEngagement[]> {
    return await db.select().from(bill_engagement)
      .where(eq(bill_engagement.user_id, user_id))
      .orderBy(desc(bill_engagement.lastEngaged))
      .limit(limit);
  }

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------

  async getUserNotifications(user_id: string, includeRead = false): Promise<Notification[]> {
    const conditions = [eq(notifications.user_id, user_id)];
    if (!includeRead) conditions.push(eq(notifications.is_read, false));

    return await db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.created_at));
  }

  async markNotificationRead(id: number): Promise<void> {
    await wdb.update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(user_id: string): Promise<void> {
    await wdb.update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.user_id, user_id));
  }

  // --------------------------------------------------------------------------
  // Transparency
  // --------------------------------------------------------------------------

  async getSponsorTransparency(sponsor_id: number): Promise<SponsorTransparency[]> {
    return await db.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsor_id, sponsor_id))
      .orderBy(desc(sponsorTransparency.dateReported));
  }

  async getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
    return await db.select().from(sponsorAffiliations)
      .where(and(
        eq(sponsorAffiliations.sponsor_id, sponsor_id),
        eq(sponsorAffiliations.is_active,  true),
      ))
      .orderBy(desc(sponsorAffiliations.start_date));
  }

  /**
   * TODO: `billSectionConflicts` table is not currently exported from the
   * schema barrel (`@server/infrastructure/schema`). Once the schema export
   * is added, replace this stub with the real query.
   */
  async getBillConflicts(_bill_id: number): Promise<BillSectionConflict[]> {
    return [];
  }
}

export const legislativeStorage = new DatabaseLegislativeStorage();