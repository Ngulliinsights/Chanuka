import { 
  bills, users, billComments, userProfiles, billEngagement, 
  notifications, analysis, sponsors, sponsorAffiliations, 
  billSponsorships, sponsorTransparency, billSectionConflicts,
  expertVerifications, userInterests, billTags,
  type Bill, type InsertBill, type User, type InsertUser,
  type BillComment, type InsertBillComment, type UserProfile, type InsertUserProfile,
  type Sponsor, type InsertSponsor, type Analysis, type InsertAnalysis,
  type BillEngagement, type Notification, type SponsorAffiliation, 
  type BillSponsorship, type SponsorTransparency, type BillSectionConflict,
  type UserInterest, type BillTag
} from "@shared/schema.js";
import { eq, desc, and, or, like, sql, count } from "drizzle-orm";
import { database as db } from "../../../shared/database/connection.js";
import { logger } from '@shared/utils/logger';

export interface UnifiedStorage {
  // Bill operations
  getBills(filters?: { category?: string; status?: string; search?: string }): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;
  
  // Bill engagement and stats
  recordBillView(billId: number, userId?: string): Promise<void>;
  recordBillShare(billId: number, userId?: string): Promise<void>;
  getBillEngagementStats(billId: number): Promise<{ views: number; comments: number; bookmarks: number }>;
  
  // Comment operations
  getBillComments(billId: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  voteComment(commentId: number, userId: string, voteType: 'up' | 'down'): Promise<BillComment | undefined>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // User profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Sponsor operations
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(billId: number): Promise<(Sponsor & { sponsorshipType: string })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;
  
  // Analysis operations
  getBillAnalysis(billId: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysis(id: number, analysis: Partial<Analysis>): Promise<Analysis | undefined>;
  
  // Transparency and conflict detection
  getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(billId: number): Promise<BillSectionConflict[]>;
  
  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  
  // System operations for dashboard
  getDashboardStats(): Promise<{
    totalBills: number;
    activeBills: number;
    totalComments: number;
    totalUsers: number;
  }>;
  getRecentActivity(): Promise<any[]>;
  getSystemHealth(): Promise<{
    database: boolean;
    api: boolean;
    timestamp: Date;
  }>;
}

export class DatabaseUnifiedStorage implements UnifiedStorage {
  // Bill operations
  async getBills(filters?: { category?: string; status?: string; search?: string }): Promise<Bill[]> {
    let query = db.select().from(bills);

    if (filters?.search) {
      query = query.where(
        or(
          like(bills.title, `%${filters.search}%`),
          like(bills.description, `%${filters.search}%`),
          like(bills.billNumber, `%${filters.search}%`)
        )
      );
    } else if (filters?.category) {
      query = query.where(eq(bills.category, filters.category));
    } else if (filters?.status) {
      query = query.where(eq(bills.status, filters.status));
    }

    return await query.orderBy(desc(bills.introducedDate));
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const result = await db.select().from(bills).where(eq(bills.id, id));
    return result[0];
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const result = await db.insert(bills).values(insertBill).returning();
    return result[0];
  }

  async updateBill(id: number, billUpdate: Partial<Bill>): Promise<Bill | undefined> {
    const result = await db.update(bills)
      .set({ ...billUpdate, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  async deleteBill(id: number): Promise<boolean> {
    const result = await db.delete(bills).where(eq(bills.id, id));
    return result.rowCount > 0;
  }

  // Bill engagement
  async recordBillView(billId: number, userId?: string): Promise<void> {
    await db.update(bills)
      .set({ viewCount: sql`${bills.viewCount} + 1` })
      .where(eq(bills.id, billId));
      
    if (userId) {
      await db.insert(billEngagement)
        .values({ billId, userId, viewCount: 1 })
        .onConflictDoUpdate({
          target: [billEngagement.billId, billEngagement.userId],
          set: { viewCount: sql`${billEngagement.viewCount} + 1` }
        });
    }
  }

  async recordBillShare(billId: number, userId?: string): Promise<void> {
    await db.update(bills)
      .set({ shareCount: sql`${bills.shareCount} + 1` })
      .where(eq(bills.id, billId));
  }

  async getBillEngagementStats(billId: number): Promise<{ views: number; comments: number; bookmarks: number }> {
    const [billData, commentCount, bookmarkCount] = await Promise.all([
      db.select({ viewCount: bills.viewCount }).from(bills).where(eq(bills.id, billId)),
      db.select({ count: count() }).from(billComments).where(eq(billComments.billId, billId)),
      db.select({ count: count() }).from(billEngagement)
        .where(eq(billEngagement.billId, billId)) // Note: isBookmarked property doesn't exist in our schema
    ]);

    return {
      views: billData[0]?.viewCount || 0,
      comments: commentCount[0]?.count || 0,
      bookmarks: bookmarkCount[0]?.count || 0
    };
  }

  // Comment operations
  async getBillComments(billId: number): Promise<BillComment[]> {
    return await db.select().from(billComments)
      .where(eq(billComments.billId, billId))
      .orderBy(desc(billComments.createdAt));
  }

  async createBillComment(comment: InsertBillComment): Promise<BillComment> {
    const result = await db.insert(billComments).values(comment).returning();
    return result[0];
  }

  async updateComment(id: number, commentUpdate: Partial<BillComment>): Promise<BillComment | undefined> {
    const result = await db.update(billComments)
      .set({ ...commentUpdate, updatedAt: new Date() })
      .where(eq(billComments.id, id))
      .returning();
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(billComments).where(eq(billComments.id, id));
    return result.rowCount > 0;
  }

  async voteComment(commentId: number, userId: string, voteType: 'up' | 'down'): Promise<BillComment | undefined> {
    const field = voteType === 'up' ? billComments.upvotes : billComments.downvotes;
    const result = await db.update(billComments)
      .set({ [field.name]: sql`${field} + 1` })
      .where(eq(billComments.id, commentId))
      .returning();
    return result[0];
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // User profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(userId: string, profileUpdate: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const result = await db.update(userProfiles)
      .set(profileUpdate)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result[0];
  }

  // Sponsor operations
  async getSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors).orderBy(sponsors.name);
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
    .where(eq(billSponsorships.billId, billId));
    
    return result;
  }

  async createSponsor(sponsor: InsertSponsor): Promise<Sponsor> {
    const result = await db.insert(sponsors).values(sponsor).returning();
    return result[0];
  }

  async updateSponsor(id: number, sponsorUpdate: Partial<Sponsor>): Promise<Sponsor | undefined> {
    const result = await db.update(sponsors)
      .set({ ...sponsorUpdate, updatedAt: new Date() })
      .where(eq(sponsors.id, id))
      .returning();
    return result[0];
  }

  // Analysis operations
  async getBillAnalysis(billId: number): Promise<Analysis[]> {
    return await db.select().from(analysis)
      .where(eq(analysis.billId, billId))
      .orderBy(desc(analysis.createdAt));
  }

  async createAnalysis(analysisData: InsertAnalysis): Promise<Analysis> {
    const result = await db.insert(analysis).values(analysisData).returning();
    return result[0];
  }

  async updateAnalysis(id: number, analysisUpdate: Partial<Analysis>): Promise<Analysis | undefined> {
    const result = await db.update(analysis)
      .set({ ...analysisUpdate, updatedAt: new Date() })
      .where(eq(analysis.id, id))
      .returning();
    return result[0];
  }

  // Transparency operations
  async getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]> {
    return await db.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsorId, sponsorId));
  }

  async getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    return await db.select().from(sponsorAffiliations)
      .where(eq(sponsorAffiliations.sponsorId, sponsorId));
  }

  async getBillConflicts(billId: number): Promise<BillSectionConflict[]> {
    return await db.select().from(billSectionConflicts)
      .where(eq(billSectionConflicts.billId, billId));
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // System operations
  async getDashboardStats(): Promise<{
    totalBills: number;
    activeBills: number;
    totalComments: number;
    totalUsers: number;
  }> {
    const [billCount, activeBillCount, commentCount, userCount] = await Promise.all([
      db.select({ count: count() }).from(bills),
      db.select({ count: count() }).from(bills).where(eq(bills.status, 'committee')),
      db.select({ count: count() }).from(billComments),
      db.select({ count: count() }).from(users)
    ]);

    return {
      totalBills: billCount[0]?.count || 0,
      activeBills: activeBillCount[0]?.count || 0,
      totalComments: commentCount[0]?.count || 0,
      totalUsers: userCount[0]?.count || 0
    };
  }

  async getRecentActivity(): Promise<any[]> {
    // Get recent bills, comments, and other activities
    const recentBills = await db.select({
      type: sql<string>`'bill'`,
      title: bills.title,
      createdAt: bills.createdAt
    }).from(bills).orderBy(desc(bills.createdAt)).limit(5);

    const recentComments = await db.select({
      type: sql<string>`'comment'`,
      title: billComments.content,
      createdAt: billComments.createdAt
    }).from(billComments).orderBy(desc(billComments.createdAt)).limit(5);

    return [...recentBills, ...recentComments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }

  async getSystemHealth(): Promise<{
    database: boolean;
    api: boolean;
    timestamp: Date;
  }> {
    try {
      await db.select({ count: count() }).from(users).limit(1);
      return {
        database: true,
        api: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        database: false,
        api: true,
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const unifiedStorage = new DatabaseUnifiedStorage();






