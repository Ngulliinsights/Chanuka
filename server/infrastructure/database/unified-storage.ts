import { 
  bills, users, comments, user_profiles, bill_engagement, 
  notifications, analysis, sponsors, sponsorAffiliations, 
  bill_sponsorships, sponsorTransparency, billSectionConflicts,
  expertVerifications, user_interests, bill_tags,
  type Bill, type InsertBill, type User, type InsertUser,
  type BillComment, type InsertBillComment, type UserProfile, type InsertUserProfile,
  type Sponsor, type InsertSponsor, type Analysis, type InsertAnalysis,
  type BillEngagement, type Notification, type SponsorAffiliation, 
} from "@shared/schema";
import { eq, desc, and, or, like, sql, count, SQL } from "drizzle-orm";
import { database as db } from "@shared/database/connection";
import { logger   } from '@shared/core/src/index.js';

export interface UnifiedStorage {
  // Bill operations
  getBills(filters?: { category?: string; status?: string; search?: string }): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<boolean>;
  
  // Bill engagement and stats
  recordBillView(bill_id: number, user_id?: string): Promise<void>;
  recordBillShare(bill_id: number, user_id?: string): Promise<void>;
  getBillEngagementStats(bill_id: number): Promise<{ views: number; comments: number; bookmarks: number }>;
  
  // Comment operations
  getBillComments(bill_id: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;
  deleteComment(id: number): Promise<boolean>;
  voteComment(comment_id: number, user_id: string, vote_type: 'up' | 'down'): Promise<BillComment | undefined>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // User profile operations
  getUserProfile(user_id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(user_id: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Sponsor operations
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;
  
  // Analysis operations
  getBillAnalysis(bill_id: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysis(id: number, analysis: Partial<Analysis>): Promise<Analysis | undefined>;
  
  // Transparency and conflict detection
  getSponsorTransparency(sponsor_id: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(bill_id: number): Promise<BillSectionConflict[]>;
  
  // Notification operations
  getUserNotifications(user_id: string): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification>;
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
    const conditions: SQL[] = [];

    if (filters?.search) {
      conditions.push(
        or(
          like(bills.title, `%${filters.search}%`),
          like(bills.description, `%${filters.search}%`),
          like(bills.bill_number, `%${filters.search}%`)
        )
      );
    }
    if (filters?.category) {
      conditions.push(eq(bills.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(bills.status, filters.status));
    }

    const query = conditions.length > 0
      ? db.select().from(bills).where(and(...conditions))
      : db.select().from(bills);

    return await query.orderBy(desc(bills.introduced_date));
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
      .set({ ...billUpdate, updated_at: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  async deleteBill(id: number): Promise<boolean> {
    const result = await db.delete(bills).where(eq(bills.id, id));
    return result.rowCount > 0;
  }

  // Bill engagement
  async recordBillView(bill_id: number, user_id?: string): Promise<void> {
    await db.update(bills)
      .set({ view_count: sql`${bills.view_count} + 1` })
      .where(eq(bills.id, bill_id));
      
    if (user_id) { await db.insert(bill_engagement)
        .values({ bill_id, user_id, view_count: 1   })
        .onConflictDoUpdate({
          target: [bill_engagement.bill_id, bill_engagement.user_id],
          set: { view_count: sql`${bill_engagement.view_count} + 1` }
        });
    }
  }

  async recordBillShare(bill_id: number, user_id?: string): Promise<void> {
    await db.update(bills)
      .set({ share_count: sql`${bills.share_count} + 1` })
      .where(eq(bills.id, bill_id));
  }

  async getBillEngagementStats(bill_id: number): Promise<{ views: number; comments: number; bookmarks: number }> {
    const [billData, comment_count, bookmarkCount] = await Promise.all([
      db.select({ view_count: bills.view_count }).from(bills).where(eq(bills.id, bill_id)),
      db.select({ count: count() }).from(comments).where(eq(comments.bill_id, bill_id)),
      db.select({ count: count() }).from(bill_engagement)
        .where(eq(bill_engagement.bill_id, bill_id)) // Note: isBookmarked property doesn't exist in our schema
    ]);

    return {
      views: billData[0]?.view_count || 0,
      comments: comment_count[0]?.count || 0,
      bookmarks: bookmarkCount[0]?.count || 0
    };
  }

  // Comment operations
  async getBillComments(bill_id: number): Promise<BillComment[]> { return await db.select().from(comments)
      .where(eq(comments.bill_id, bill_id))
      .orderBy(desc(comments.created_at));
   }

  async createBillComment(comment: InsertBillComment): Promise<BillComment> {
    const result = await db.insert(comments).values(comment).returning();
    return result[0];
  }

  async updateComment(id: number, commentUpdate: Partial<BillComment>): Promise<BillComment | undefined> {
    const result = await db.update(comments)
      .set({ ...commentUpdate, updated_at: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return result[0];
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.rowCount > 0;
  }

  async voteComment(comment_id: number, user_id: string, vote_type: 'up' | 'down'): Promise<BillComment | undefined> {
    const field = vote_type === 'up' ? comments.upvotes : comments.downvotes;
    const result = await db.update(comments)
      .set({ [field.name]: sql`${field} + 1` })
      .where(eq(comments.id, comment_id))
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
  async getUserProfile(user_id: string): Promise<UserProfile | undefined> { const result = await db.select().from(user_profiles).where(eq(user_profiles.user_id, user_id));
    return result[0];
   }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(user_profiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(user_id: string, profileUpdate: Partial<UserProfile>): Promise<UserProfile | undefined> { const result = await db.update(user_profiles)
      .set(profileUpdate)
      .where(eq(user_profiles.user_id, user_id))
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

  async getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string })[]> {
    const result = await db.select({
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
    .where(eq(bill_sponsorships.bill_id, bill_id));
    
    return result;
  }

  async createSponsor(sponsor: InsertSponsor): Promise<Sponsor> {
    const result = await db.insert(sponsors).values(sponsor).returning();
    return result[0];
  }

  async updateSponsor(id: number, sponsorUpdate: Partial<Sponsor>): Promise<Sponsor | undefined> {
    const result = await db.update(sponsors)
      .set({ ...sponsorUpdate, updated_at: new Date() })
      .where(eq(sponsors.id, id))
      .returning();
    return result[0];
  }

  // Analysis operations
  async getBillAnalysis(bill_id: number): Promise<Analysis[]> { return await db.select().from(analysis)
      .where(eq(analysis.bill_id, bill_id))
      .orderBy(desc(analysis.created_at));
   }

  async createAnalysis(analysisData: InsertAnalysis): Promise<Analysis> {
    const result = await db.insert(analysis).values(analysisData).returning();
    return result[0];
  }

  async updateAnalysis(id: number, analysisUpdate: Partial<Analysis>): Promise<Analysis | undefined> {
    const result = await db.update(analysis)
      .set({ ...analysisUpdate, updated_at: new Date() })
      .where(eq(analysis.id, id))
      .returning();
    return result[0];
  }

  // Transparency operations
  async getSponsorTransparency(sponsor_id: number): Promise<SponsorTransparency[]> {
    return await db.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsor_id, sponsor_id));
  }

  async getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
    return await db.select().from(sponsorAffiliations)
      .where(eq(sponsorAffiliations.sponsor_id, sponsor_id));
  }

  async getBillConflicts(bill_id: number): Promise<BillSectionConflict[]> { return await db.select().from(billSectionConflicts)
      .where(eq(billSectionConflicts.bill_id, bill_id));
   }

  // Notification operations
  async getUserNotifications(user_id: string): Promise<Notification[]> { return await db.select().from(notifications)
      .where(eq(notifications.user_id, user_id))
      .orderBy(desc(notifications.created_at));
   }

  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.id, id));
  }

  // System operations
  async getDashboardStats(): Promise<{
    totalBills: number;
    activeBills: number;
    totalComments: number;
    totalUsers: number;
  }> {
    const [billCount, activeBillCount, comment_count, userCount] = await Promise.all([
      db.select({ count: count() }).from(bills),
      db.select({ count: count() }).from(bills).where(eq(bills.status, 'committee')),
      db.select({ count: count() }).from(comments),
      db.select({ count: count() }).from(users)
    ]);

    return {
      totalBills: billCount[0]?.count || 0,
      activeBills: activeBillCount[0]?.count || 0,
      totalComments: comment_count[0]?.count || 0,
      totalUsers: userCount[0]?.count || 0
    };
  }

  async getRecentActivity(): Promise<any[]> {
    // Get recent bills, comments, and other activities
    const recentBills = await db.select({
      type: sql<string>`'bill'`,
      title: bills.title,
      created_at: bills.created_at
    }).from(bills).orderBy(desc(bills.created_at)).limit(5);

    const recentComments = await db.select({
      type: sql<string>`'comment'`,
      title: comments.content,
      created_at: comments.created_at
    }).from(comments).orderBy(desc(comments.created_at)).limit(5);

    return [...recentBills, ...recentComments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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













































