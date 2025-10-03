import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for platform authentication
const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name").notNull(),
  role: text("role").notNull().default("citizen"), // citizen, expert, admin, journalist, advocate
  verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, rejected
  preferences: jsonb("preferences"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profiles for expertise and reputation
const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  bio: text("bio"),
  expertise: text("expertise").array(), // areas of expertise
  location: text("location"),
  organization: text("organization"),
  verificationDocuments: jsonb("verification_documents"),
  reputationScore: integer("reputation_score").default(0),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bills table for legislative documents
const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // full bill text
  summary: text("summary"), // AI-generated summary
  status: text("status").notNull().default("introduced"), // introduced, committee, passed, failed, signed
  billNumber: text("bill_number"),
  sponsorId: uuid("sponsor_id"),
  category: text("category"), // healthcare, education, etc.
  tags: text("tags").array(),
  viewCount: integer("view_count").default(0),
  shareCount: integer("share_count").default(0),
  complexityScore: integer("complexity_score"), // 1-10 scale
  constitutionalConcerns: jsonb("constitutional_concerns"),
  stakeholderAnalysis: jsonb("stakeholder_analysis"),
  introducedDate: timestamp("introduced_date"),
  lastActionDate: timestamp("last_action_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments and discussions on bills
const billComments = pgTable("bill_comments", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  userId: uuid("user_id").notNull(),
  content: text("content").notNull(),
  commentType: text("comment_type").notNull().default("general"), // general, expert_analysis, concern, support
  isVerified: boolean("is_verified").default(false),
  parentCommentId: integer("parent_comment_id"), // for threaded discussions
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User engagement tracking
const billEngagement = pgTable("bill_engagement", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  userId: uuid("user_id").notNull(),
  viewCount: integer("view_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),
  engagementScore: numeric("engagement_score", { precision: 10, scale: 2 }).default("0"),
  lastEngaged: timestamp("last_engaged").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications system
const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // bill_update, comment_reply, verification_status
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedBillId: integer("related_bill_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analysis results from ML models
const analysis = pgTable("analysis", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  analysisType: text("analysis_type").notNull(), // constitutional, stakeholder, impact, complexity
  results: jsonb("results"), // ML model outputs
  confidence: numeric("confidence", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  modelVersion: text("model_version"),
  isApproved: boolean("is_approved").default(false),
  approvedBy: uuid("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sponsors/legislators information
const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // MP, Senator, etc.
  party: text("party"),
  constituency: text("constituency"),
  email: text("email"),
  phone: text("phone"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  conflictLevel: text("conflict_level"), // low, medium, high
  financialExposure: numeric("financial_exposure", { precision: 12, scale: 2 }),
  votingAlignment: numeric("voting_alignment", { precision: 5, scale: 2 }), // percentage
  transparencyScore: numeric("transparency_score", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sponsor affiliations and connections
const sponsorAffiliations = pgTable("sponsor_affiliations", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull(),
  organization: text("organization").notNull(),
  role: text("role"),
  type: text("type").notNull(), // economic, professional, advocacy, cultural
  conflictType: text("conflict_type"), // financial, ownership, influence, representation
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bill sponsorship tracking
const billSponsorships = pgTable("bill_sponsorships", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  sponsorId: integer("sponsor_id").notNull(),
  sponsorshipType: text("sponsorship_type").notNull(), // primary, co-sponsor, supporter
  sponsorshipDate: timestamp("sponsorship_date").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Sponsor transparency and disclosure
const sponsorTransparency = pgTable("sponsor_transparency", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull(),
  disclosureType: text("disclosure_type").notNull(), // financial, business, family
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  source: text("source"),
  dateReported: timestamp("date_reported"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bill section conflicts analysis
const billSectionConflicts = pgTable("bill_section_conflicts", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  sectionNumber: text("section_number").notNull(),
  conflictType: text("conflict_type").notNull(), // constitutional, procedural, contradictory
  severity: text("severity").notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expert verifications table
const expertVerifications = pgTable("expert_verifications", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  expertId: uuid("expert_id").notNull(),
  verificationStatus: text("verification_status").notNull(), // verified, disputed, pending
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User interests table for recommendation system
const userInterests = pgTable("user_interests", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  interest: text("interest").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bill tags table for categorization
const billTags = pgTable("bill_tags", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for legislative platform - simplified approach
export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string(),
  role: z.string().default("citizen"),
  verificationStatus: z.string().default("pending"),
  preferences: z.any().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.date().optional(),
});

export const insertUserProfileSchema = z.object({
  userId: z.string(),
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  location: z.string().optional(),
  organization: z.string().optional(),
  verificationDocuments: z.any().optional(),
  reputationScore: z.number().default(0),
  isPublic: z.boolean().default(true),
});

export const insertBillSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  status: z.string().default("introduced"),
  billNumber: z.string().optional(),
  sponsorId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  viewCount: z.number().default(0),
  shareCount: z.number().default(0),
  complexityScore: z.number().optional(),
});

export const insertBillCommentSchema = z.object({
  userId: z.string(),
  content: z.string(),
  billId: z.number(),
  commentType: z.string().default("general"),
  isVerified: z.boolean().default(false),
  parentCommentId: z.number().optional(),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
});

export const insertSponsorSchema = z.object({
  name: z.string(),
  role: z.string(),
  party: z.string().optional(),
  district: z.string().optional(),
  contact: z.any().optional(),
});

export const insertAnalysisSchema = z.object({
  billId: z.number(),
  analysisType: z.string(),
  content: z.any(),
  confidence: z.number().optional(),
  metadata: z.any().optional(),
});

// Types for legislative platform
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type BillComment = typeof billComments.$inferSelect;
export type InsertBillComment = z.infer<typeof insertBillCommentSchema>;
export type BillEngagement = typeof billEngagement.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Analysis = typeof analysis.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type SponsorAffiliation = typeof sponsorAffiliations.$inferSelect;
export type BillSponsorship = typeof billSponsorships.$inferSelect;
export type SponsorTransparency = typeof sponsorTransparency.$inferSelect;
export type BillSectionConflict = typeof billSectionConflicts.$inferSelect;
export type UserInterest = typeof userInterests.$inferSelect;
export type BillTag = typeof billTags.$inferSelect;

// Additional types needed by storage services
export type Stakeholder = {
  id: number;
  name: string;
  email?: string;
  organization?: string;
  sector?: string;
  type: string;
  influence: number;
  votingHistory: any[];
  createdAt: Date;
  updatedAt: Date;
};

export type InsertStakeholder = {
  name: string;
  email?: string;
  organization?: string;
  sector?: string;
  type: string;
  influence?: number;
  votingHistory?: any[];
};

// Update types to match actual table schemas
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;
export type SocialShare = typeof socialShares.$inferSelect;
export type InsertSocialShare = typeof socialShares.$inferInsert;

export type SocialProfile = {
  id: number;
  userId: number;
  platform: string;
  profileId: string;
  username: string;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Comment = typeof billComments.$inferSelect & {
  endorsements?: number;
  isHighlighted?: boolean;
};

// Dashboard-specific types
export type Candidate = {
  id: number;
  candidateName: string;
  departmentId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DepartmentStat = {
  name: string;
  relationHires: number;
  totalHires: number;
  score: number;
};

export type RadarDatum = {
  subject: string;
  candidate: number;
  department: number;
  expected: number;
};

export type EvaluationData = {
  candidateName: string;
  departmentId: number;
  status?: string;
};

// Password reset tokens
const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Evaluations table for dashboard functionality
const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  candidateName: text("candidate_name").notNull(),
  departmentId: integer("department_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Departments table for dashboard functionality
const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table for authentication
const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  token: text("token"),
  refreshTokenHash: text("refresh_token_hash"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User social profiles table
const userSocialProfiles = pgTable("user_social_profiles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(), // google, facebook, twitter, etc.
  providerId: text("provider_id").notNull(),
  username: text("username"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Progress tracking for gamification
const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  achievementType: text("achievement_type").notNull(),
  achievementValue: integer("achievement_value").notNull(),
  level: integer("level"),
  badge: text("badge"),
  description: text("description"),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social sharing tracking
const socialShares = pgTable("social_shares", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => bills.id),
  platform: text("platform").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id),
  metadata: jsonb("metadata"),
  shareDate: timestamp("share_date").defaultNow(),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Citizen Verification System
const citizenVerifications = pgTable('citizen_verifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  billId: integer('bill_id').notNull().references(() => bills.id),
  citizenId: varchar('citizen_id', { length: 255 }).notNull().references(() => users.id),
  verificationType: varchar('verification_type', { length: 50 }).notNull(),
  verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('pending'),
  confidence: integer('confidence').notNull().default(0),
  evidence: jsonb('evidence').notNull().default('[]'),
  expertise: jsonb('expertise').notNull(),
  reasoning: text('reasoning').notNull(),
  endorsements: integer('endorsements').notNull().default(0),
  disputes: integer('disputes').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Export all tables and types
export {
  users,
  userProfiles,
  bills,
  billComments,
  billEngagement,
  notifications,
  analysis,
  sponsors,
  sponsorAffiliations,
  billSponsorships,
  sponsorTransparency,
  billSectionConflicts,
  expertVerifications,
  userInterests,
  billTags,
  passwordResets,
  evaluations,
  departments,
  sessions,
  userSocialProfiles,
  userProgress,
  socialShares,
  citizenVerifications
};