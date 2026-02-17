import { logger } from '@server/infrastructure/observability';
import { Analysis, Bill, BillComment, BillEngagement, BillSectionConflict,BillSponsorship, InsertAnalysis, InsertBill, InsertBillComment, InsertSponsor, InsertUser, InsertUserProfile, Notification, Sponsor, SponsorAffiliation, SponsorTransparency, User, UserProfile } from '@server/infrastructure/schema';
import { QueryResult, QueryResultRow } from 'pg';

export interface TransactionClient {
  query<T extends QueryResultRow>(queryText: string, values?: unknown[]): Promise<QueryResult<T>>;
  release(): void;
}

export interface StorageConfig {
  cacheTTL?: number;
}

// Legislative platform storage interface
export interface LegislativeStorage { // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // User profiles
  getUserProfile(user_id: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(user_id: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Bills
  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillsByCategory(category: string): Promise<Bill[]>;
  getBillsByStatus(status: string): Promise<Bill[]>;
  searchBills(query: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;

  // Comments
  getBillComments(bill_id: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;

  // Sponsors
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(bill_id: number): Promise<(Sponsor & { sponsorshipType: string   })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;

  // Analysis
  getBillAnalysis(bill_id: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // Engagement
  recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'created_at'>): Promise<BillEngagement>;
  getBillEngagementStats(bill_id: number): Promise<{ views: number; comments: number; bookmarks: number }>;

  // Notifications
  getUserNotifications(user_id: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  // Transparency
  getSponsorTransparency(sponsor_id: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(bill_id: number): Promise<BillSectionConflict[]>;
}

















































