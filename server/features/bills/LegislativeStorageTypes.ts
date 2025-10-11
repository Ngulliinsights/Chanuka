import { QueryResult, QueryResultRow } from 'pg';
import { logger } from '../../utils/logger';
import { InsertUser, User, UserProfile, InsertUserProfile, Bill, InsertBill, BillComment, InsertBillComment, Sponsor, InsertSponsor, Analysis, InsertAnalysis, BillEngagement, Notification, SponsorAffiliation, BillSponsorship, SponsorTransparency, BillSectionConflict } from '../../../shared/schema';

export interface TransactionClient {
  query<T extends QueryResultRow>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

export interface StorageConfig {
  cacheTTL?: number;
}

// Legislative platform storage interface
export interface LegislativeStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // User profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Bills
  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillsByCategory(category: string): Promise<Bill[]>;
  getBillsByStatus(status: string): Promise<Bill[]>;
  searchBills(query: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<Bill>): Promise<Bill | undefined>;

  // Comments
  getBillComments(billId: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateComment(id: number, comment: Partial<BillComment>): Promise<BillComment | undefined>;

  // Sponsors
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: number): Promise<Sponsor | undefined>;
  getBillSponsors(billId: number): Promise<(Sponsor & { sponsorshipType: string })[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: number, sponsor: Partial<Sponsor>): Promise<Sponsor | undefined>;

  // Analysis
  getBillAnalysis(billId: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // Engagement
  recordBillEngagement(engagement: Omit<BillEngagement, 'id' | 'createdAt'>): Promise<BillEngagement>;
  getBillEngagementStats(billId: number): Promise<{ views: number; comments: number; bookmarks: number }>;

  // Notifications
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  // Transparency
  getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]>;
  getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]>;
  getBillConflicts(billId: number): Promise<BillSectionConflict[]>;
}








