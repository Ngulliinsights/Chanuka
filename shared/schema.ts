import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for platform authentication
export const users = pgTable("users", {
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
export const userProfiles = pgTable("user_profiles", {
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
export const bills = pgTable("bills", {
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
export const billComments = pgTable("bill_comments", {
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
export const billEngagement = pgTable("bill_engagement", {
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
export const notifications = pgTable("notifications", {
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
export const analysis = pgTable("analysis", {
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
export const sponsors = pgTable("sponsors", {
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
export const sponsorAffiliations = pgTable("sponsor_affiliations", {
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
export const billSponsorships = pgTable("bill_sponsorships", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  sponsorId: integer("sponsor_id").notNull(),
  sponsorshipType: text("sponsorship_type").notNull(), // primary, co-sponsor, supporter
  sponsorshipDate: timestamp("sponsorship_date").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Sponsor transparency and disclosure
export const sponsorTransparency = pgTable("sponsor_transparency", {
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
export const billSectionConflicts = pgTable("bill_section_conflicts", {
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
export const expertVerifications = pgTable("expert_verifications", {
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
export const userInterests = pgTable("user_interests", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  interest: text("interest").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bill tags table for categorization
export const billTags = pgTable("bill_tags", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull(),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for legislative platform
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBillSchema = createInsertSchema(bills).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertBillCommentSchema = createInsertSchema(billComments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertSponsorSchema = createInsertSchema(sponsors).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAnalysisSchema = createInsertSchema(analysis).omit({ 
  id: true, 
  createdAt: true 
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

// Citizen Verification System
export const citizenVerifications = pgTable('citizen_verifications', {
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
  bills,
  billComments,
  analysis,
  expertVerifications,
  billEngagement,
  notifications,
  sponsors,
  sponsorAffiliations,
  billSponsorships,
  sponsorTransparency,
  billSectionConflicts,
  userInterests,
  billTags,
  userProfiles,
  citizenVerifications
};