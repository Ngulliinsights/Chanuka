import { 
  bills, users, billComments, userProfiles, billEngagement, 
  notifications, analysis, sponsors, sponsorAffiliations, 
  billSponsorships, sponsorTransparency, billSectionConflicts,
  type Bill, type InsertBill, type User, type InsertUser,
  type BillComment, type InsertBillComment, type UserProfile, type InsertUserProfile,
  type Sponsor, type InsertSponsor, type Analysis, type InsertAnalysis,
  type BillEngagement, type Notification, type SponsorAffiliation, 
  type BillSponsorship, type SponsorTransparency, type BillSectionConflict
} from "@shared/schema";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";
import { db } from "../db";

export interface LegislativeStorage {
  // Bill methods
  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillsByCategory(category: string): Promise<Bill[]>;
  getBillsByStatus(status: string): Promise<Bill[]>;
  searchBills(query: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;

  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // User profile methods
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Comment methods
  getBillComments(billId: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;

  // Sponsor methods
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(billId: number): Promise<(Sponsor & { sponsorshipType: string })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;

  // Analysis methods
  getBillAnalysis(billId: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // Engagement methods
  recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'createdAt'>): Promise<BillEngagement>;
  getBillEngagementStats(billId: number): Promise<{ views: number; comments: number; bookmarks: number }>;

  // Notification methods
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  // Transparency methods
  getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(billId: number): Promise<BillSectionConflict[]>;
}

export class DatabaseLegislativeStorage implements LegislativeStorage {
  // Bill methods
  async getBills(): Promise<Bill[]> {
    return await db.select().from(bills).orderBy(desc(bills.introducedDate));
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const result = await db.select().from(bills).where(eq(bills.id, id));
    return result[0];
  }

  async getBillsByCategory(category: string): Promise<Bill[]> {
    return await db.select().from(bills)
      .where(eq(bills.category, category))
      .orderBy(desc(bills.introducedDate));
  }

  async getBillsByStatus(status: string): Promise<Bill[]> {
    return await db.select().from(bills)
      .where(eq(bills.status, status))
      .orderBy(desc(bills.lastActionDate));
  }

  async searchBills(query: string): Promise<Bill[]> {
    return await db.select().from(bills)
      .where(
        or(
          like(bills.title, `%${query}%`),
          like(bills.description, `%${query}%`),
          like(bills.billNumber, `%${query}%`)
        )
      )
      .orderBy(desc(bills.introducedDate));
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const result = await db.insert(bills).values(insertBill).returning();
    return result[0];
  }

  async updateBill(id: number, updateData: Partial<Bill>): Promise<Bill | undefined> {
    const result = await db.update(bills)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // User profile methods
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values(insertProfile).returning();
    return result[0];
  }

  async updateUserProfile(userId: string, updateData: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const result = await db.update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result[0];
  }

  // Comment methods
  async getBillComments(billId: number): Promise<BillComment[]> {
    return await db.select().from(billComments)
      .where(eq(billComments.billId, billId))
      .orderBy(desc(billComments.createdAt));
  }

  async createBillComment(insertComment: InsertBillComment): Promise<BillComment> {
    const result = await db.insert(billComments).values(insertComment).returning();
    return result[0];
  }

  async updateComment(id: number, updateData: Partial<BillComment>): Promise<BillComment | undefined> {
    const result = await db.update(billComments)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(billComments.id, id))
      .returning();
    return result[0];
  }

  // Sponsor methods
  async getSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors)
      .where(eq(sponsors.isActive, true))
      .orderBy(sponsors.name);
  }

  async getSponsor(id: number): Promise<Sponsor | undefined> {
    const result = await db.select().from(sponsors).where(eq(sponsors.id, id));
    return result[0];
  }

  async getBillSponsors(billId: number): Promise<(Sponsor & { sponsorshipType: string })[]> {
    const result = await db.select({
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
    const result = await db.insert(sponsors).values(insertSponsor).returning();
    return result[0];
  }

  async updateSponsor(id: number, updateData: Partial<Sponsor>): Promise<Sponsor | undefined> {
    const result = await db.update(sponsors)
      .set(updateData)
      .where(eq(sponsors.id, id))
      .returning();
    return result[0];
  }

  // Analysis methods
  async getBillAnalysis(billId: number): Promise<Analysis[]> {
    return await db.select().from(analysis)
      .where(eq(analysis.billId, billId))
      .orderBy(desc(analysis.createdAt));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const result = await db.insert(analysis).values(insertAnalysis).returning();
    return result[0];
  }

  // Engagement methods
  async recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'createdAt'>): Promise<BillEngagement> {
    const result = await db.insert(billEngagement).values(engagement).returning();
    return result[0];
  }

  async getBillEngagementStats(billId: number): Promise<{ views: number; comments: number; bookmarks: number }> {
    const viewsResult = await db.select({ count: count() })
      .from(billEngagement)
      .where(and(
        eq(billEngagement.billId, billId),
        eq(billEngagement.engagementType, 'view')
      ));

    const commentsResult = await db.select({ count: count() })
      .from(billComments)
      .where(eq(billComments.billId, billId));

    const bookmarksResult = await db.select({ count: count() })
      .from(billEngagement)
      .where(and(
        eq(billEngagement.billId, billId),
        eq(billEngagement.engagementType, 'bookmark')
      ));

    return {
      views: viewsResult[0]?.count || 0,
      comments: commentsResult[0]?.count || 0,
      bookmarks: bookmarksResult[0]?.count || 0
    };
  }

  // Notification methods
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Transparency methods
  async getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]> {
    return await db.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsorId, sponsorId))
      .orderBy(desc(sponsorTransparency.dateReported));
  }

  async getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    return await db.select().from(sponsorAffiliations)
      .where(and(
        eq(sponsorAffiliations.sponsorId, sponsorId),
        eq(sponsorAffiliations.isActive, true)
      ))
      .orderBy(desc(sponsorAffiliations.startDate));
  }

  async getBillConflicts(billId: number): Promise<BillSectionConflict[]> {
    return await db.select().from(billSectionConflicts)
      .where(eq(billSectionConflicts.billId, billId))
      .orderBy(billSectionConflicts.sectionNumber);
  }
}

export const legislativeStorage = new DatabaseLegislativeStorage();