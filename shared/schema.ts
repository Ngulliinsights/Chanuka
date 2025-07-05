import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for platform authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("citizen"), // citizen, expert, admin, journalist, advocate
  verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, rejected
  isActive: boolean("is_active").default(true),
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
  engagementType: text("engagement_type").notNull(), // view, bookmark, share, comment, vote
  metadata: jsonb("metadata"), // additional data like share platform, vote type
  createdAt: timestamp("created_at").defaultNow(),
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

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({ id: true, createdAt: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true });
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics).omit({ id: true, recordedAt: true });
export const insertPivotDecisionSchema = createInsertSchema(pivotDecisions).omit({ id: true, createdAt: true });
export const insertArchitectureComponentSchema = createInsertSchema(architectureComponents).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetric = z.infer<typeof insertAnalyticsMetricSchema>;
export type PivotDecision = typeof pivotDecisions.$inferSelect;
export type InsertPivotDecision = z.infer<typeof insertPivotDecisionSchema>;
export type ArchitectureComponent = typeof architectureComponents.$inferSelect;
export type InsertArchitectureComponent = z.infer<typeof insertArchitectureComponentSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
