import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  user, userProfile, bill, sponsor, analysis, stakeholder, notification,
  complianceCheck, socialShare, verification, userProgress, billComment
} from "./schema";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Select Schemas
export const selectUserSchema = createSelectSchema(user);
export const selectUserProfileSchema = createSelectSchema(userProfile);
export const selectBillSchema = createSelectSchema(bill);
export const selectSponsorSchema = createSelectSchema(sponsor);
export const selectAnalysisSchema = createSelectSchema(analysis);
export const selectStakeholderSchema = createSelectSchema(stakeholder);
export const selectNotificationSchema = createSelectSchema(notification);
export const selectComplianceCheckSchema = createSelectSchema(complianceCheck);
export const selectSocialShareSchema = createSelectSchema(socialShare);
export const selectVerificationSchema = createSelectSchema(verification);

// Insert Schemas
export const insertUserSchema = createInsertSchema(user, {
  email: z.string().email("Invalid email format"),
  passwordHash: z.string().min(60, "Password hash must be at least 60 characters"),
  name: z.string().min(1, "Name is required"),
});

export const insertUserProfileSchema = createInsertSchema(userProfile, {
  bio: z.string().max(1000, "Bio must be 1000 characters or less").optional().nullable(),
  location: z.string().max(255, "Location must be 255 characters or less").optional().nullable(),
  organization: z.string().max(255, "Organization must be 255 characters or less").optional().nullable(),
});

export const insertUserProgressSchema = createInsertSchema(userProgress);

export const insertBillSchema = createInsertSchema(bill, {
  title: z.string().min(1, "Title is required").max(500, "Title must be 500 characters or less"),
  summary: z.string().max(2000, "Summary must be 2000 characters or less").optional().nullable(),
  complexityScore: z.number().min(1).max(10).optional().nullable(),
});

export const insertBillCommentSchema = createInsertSchema(billComment, {
  content: z.string().min(1, "Content is required").max(5000, "Content must be 5000 characters or less"),
});

export const insertSponsorSchema = createInsertSchema(sponsor, {
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  role: z.string().min(1, "Role is required").max(100, "Role must be 100 characters or less"),
  email: z.string().email("Invalid email format").optional().nullable(),
});

export const insertAnalysisSchema = createInsertSchema(analysis);
export const insertStakeholderSchema = createInsertSchema(stakeholder);
export const insertNotificationSchema = createInsertSchema(notification);
export const insertComplianceCheckSchema = createInsertSchema(complianceCheck);
export const insertSocialShareSchema = createInsertSchema(socialShare);
export const insertVerificationSchema = createInsertSchema(verification);