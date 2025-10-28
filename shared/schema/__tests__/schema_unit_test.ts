import { describe, it, expect } from 'vitest';
import {
  insertUserSchema,
  insertUserProfileSchema,
  insertBillSchema,
  insertBillCommentSchema,
  insertSponsorSchema,
  insertAnalysisSchema,
  insertStakeholderSchema,
  insertNotificationSchema,
  insertComplianceCheckSchema,
  insertContentReportSchema // <-- REFINED: Added new schema
} from '../validation'; // <-- REFINED: Imports from validation.ts

// Tests for insertUserSchema
describe('insertUserSchema', () => {
  it('should validate a correct user object', () => {
    const user = {
      email: 'test@example.com',
      passwordHash: 'a_very_long_and_secure_password_hash_that_is_at_least_60_chars',
      name: 'Test User',
    };
    const result = insertUserSchema.safeParse(user);
    expect(result.success).toBe(true);
  });

  it('should invalidate a user with an invalid email', () => {
    const user = {
      email: 'invalid-email',
      passwordHash: 'a_very_long_and_secure_password_hash_that_is_at_least_60_chars',
      name: 'Test User',
    };
    const result = insertUserSchema.safeParse(user);
    expect(result.success).toBe(false);
  });

  it('should invalidate a user with a short password hash', () => {
    const user = {
      email: 'test@example.com',
      passwordHash: 'short',
      name: 'Test User',
    };
    const result = insertUserSchema.safeParse(user);
    expect(result.success).toBe(false);
  });

  it('should invalidate a user without a name', () => {
    const user = {
      email: 'test@example.com',
      passwordHash: 'a_very_long_and_secure_password_hash_that_is_at_least_60_chars',
      role: 'citizen' // <-- REFINED: Added role to satisfy schema if required
    };
    // Note: 'name' is required by the schema, so safeParse will correctly fail.
    const result = insertUserSchema.safeParse(user);
    expect(result.success).toBe(false);
  });
});

// Tests for insertUserProfileSchema
describe('insertUserProfileSchema', () => {
  it('should validate a correct user profile object', () => {
    const profile = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // drizzle-zod doesn't validate UUID format by default, DB does
      bio: 'This is a test bio.',
      avatarUrl: 'https://example.com/avatar.png' // <-- REFINED: Added new field
    };
    const result = insertUserProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it('should invalidate a profile with an invalid avatarUrl', () => {
    const profile = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      avatarUrl: 'not-a-valid-url', // <-- REFINED: Testing new constraint
    };
    const result = insertUserProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });
});

// Tests for insertBillSchema
describe('insertBillSchema', () => {
  it('should validate a correct bill object', () => {
    const bill = {
      title: 'Test Bill',
      description: 'A bill for testing purposes.',
      status: 'introduced', // <-- This value is in the enum
    };
    const result = insertBillSchema.safeParse(bill);
    expect(result.success).toBe(true);
  });

  it('should invalidate a bill with an empty title', () => {
    const bill = {
      title: '', // <-- Fails min(1)
      description: 'A bill for testing purposes.',
      status: 'introduced'
    };
    const result = insertBillSchema.safeParse(bill);
    expect(result.success).toBe(false);
  });

  it('should invalidate a bill with an invalid status', () => {
    const bill = {
      title: 'Test Bill',
      status: 'invalid-status', // <-- This value is not in the enum
    };
    const result = insertBillSchema.safeParse(bill);
    expect(result.success).toBe(false);
  });
});

// Tests for insertBillCommentSchema
describe('insertBillCommentSchema', () => {
  it('should validate a correct bill comment object', () => {
    const comment = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      content: 'This is a test comment.',
      billId: 1,
    };
    const result = insertBillCommentSchema.safeParse(comment);
    expect(result.success).toBe(true);
  });

  it('should invalidate a comment with empty content', () => {
    const comment = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      content: '', // <-- Fails min(1)
      billId: 1,
    };
    const result = insertBillCommentSchema.safeParse(comment);
    expect(result.success).toBe(false);
  });
});

// Tests for insertSponsorSchema
describe('insertSponsorSchema', () => {
  it('should validate a correct sponsor object', () => {
    const sponsor = {
      name: 'Test Sponsor',
      role: 'Senator',
      email: 'sponsor@example.com' // <-- Valid email
    };
    const result = insertSponsorSchema.safeParse(sponsor);
    expect(result.success).toBe(true);
  });

  it('should invalidate a sponsor with an empty name', () => {
    const sponsor = {
      name: '', // <-- Fails min(1)
      role: 'Senator',
    };
    const result = insertSponsorSchema.safeParse(sponsor);
    expect(result.success).toBe(false);
  });

  it('should invalidate a sponsor with an invalid email', () => {
    const sponsor = {
      name: 'Test Sponsor',
      role: 'Senator',
      email: 'invalid-email', // <-- Fails email()
    };
    const result = insertSponsorSchema.safeParse(sponsor);
    expect(result.success).toBe(false);
  });
});

// Tests for insertAnalysisSchema
describe('insertAnalysisSchema', () => {
  it('should validate a correct analysis object', () => {
    const analysis = {
      billId: 1,
      analysisType: 'constitutional', // <-- This value is in the enum
    };
    const result = insertAnalysisSchema.safeParse(analysis);
    expect(result.success).toBe(true);
  });

  it('should invalidate an analysis with an invalid analysisType', () => {
    const analysis = {
      billId: 1,
      analysisType: 'invalid-type', // <-- This value is not in the enum
    };
    const result = insertAnalysisSchema.safeParse(analysis);
    expect(result.success).toBe(false);
  });
});

// Tests for insertStakeholderSchema
describe('insertStakeholderSchema', () => {
  it('should validate a correct stakeholder object', () => {
    const stakeholder = {
      name: 'Test Stakeholder',
      type: 'business', // <-- This value is in the enum
    };
    const result = insertStakeholderSchema.safeParse(stakeholder);
    expect(result.success).toBe(true);
  });

  it('should invalidate a stakeholder with an invalid type', () => {
    const stakeholder = {
      name: 'Test Stakeholder',
      type: 'invalid-type', // <-- This value is not in the enum
    };
    const result = insertStakeholderSchema.safeParse(stakeholder);
    expect(result.success).toBe(false);
  });
});

// Tests for insertNotificationSchema
describe('insertNotificationSchema', () => {
  it('should validate a correct notification object', () => {
    const notification = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      type: 'bill_update', // <-- REFINED: Used a valid enum value
      title: 'Test Notification',
      message: 'This is a test notification.',
    };
    const result = insertNotificationSchema.safeParse(notification);
    expect(result.success).toBe(true);
  });

  it('should invalidate a notification with an invalid type', () => {
    const notification = {
      userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      type: 'test-notification', // <-- This value is not in the enum
      title: 'Test Notification',
      message: 'This is a test notification.',
    };
    const result = insertNotificationSchema.safeParse(notification);
    expect(result.success).toBe(false);
  });
});

// Tests for insertComplianceCheckSchema
describe('insertComplianceCheckSchema', () => {
  it('should validate a correct compliance check object', () => {
    const check = {
      checkName: 'Test Check',
      checkType: 'gdpr', // <-- This value is in the enum
      status: 'compliant' // <-- REFINED: Used value from new complianceStatusEnum
    };
    const result = insertComplianceCheckSchema.safeParse(check);
    expect(result.success).toBe(true);
  });

  it('should invalidate a check with an invalid type', () => {
    const check = {
      checkName: 'Test Check',
      checkType: 'invalid-type', // <-- This value is not in the enum
    };
    const result = insertComplianceCheckSchema.safeParse(check);
    expect(result.success).toBe(false);
  });
});

// --- REFINED: Added new test suite for contentReport ---
describe('insertContentReportSchema', () => {
  it('should validate a correct content report object', () => {
    const report = {
      contentType: 'comment',
      contentId: 123,
      reportedBy: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      reportType: 'spam',
      reason: 'This is clearly spam.',
    };
    const result = insertContentReportSchema.safeParse(report);
    expect(result.success).toBe(true);
  });

  it('should invalidate a report with an empty reason', () => {
    const report = {
      contentType: 'comment',
      contentId: 123,
      reportedBy: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      reportType: 'spam',
      reason: '', // <-- Fails min(1)
    };
    const result = insertContentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });

  it('should invalidate a report with an invalid reportType', () => {
    const report = {
      contentType: 'comment',
      contentId: 123,
      reportedBy: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      reportType: 'not_a_real_type', // <-- This value is not in the enum
      reason: 'This is clearly spam.',
    };
    const result = insertContentReportSchema.safeParse(report);
    expect(result.success).toBe(false);
  });
});
