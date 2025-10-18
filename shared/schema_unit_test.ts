
import { describe, it, expect } from 'vitest';
import {
import { logger } from './core/src/observability/logging';
  insertUserSchema,
  insertUserProfileSchema,
  insertBillSchema,
  insertBillCommentSchema,
  insertSponsorSchema,
  insertAnalysisSchema,
  insertStakeholderSchema,
  insertNotificationSchema,
  insertComplianceCheckSchema,
} from './schema';

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
    };
    const result = insertUserSchema.safeParse(user);
    expect(result.success).toBe(false);
  });
});

// Tests for insertUserProfileSchema
describe('insertUserProfileSchema', () => {
    it('should validate a correct user profile object', () => {
        const profile = {
            userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            bio: 'This is a test bio.',
            reputationScore: 100,
        };
        const result = insertUserProfileSchema.safeParse(profile);
        expect(result.success).toBe(true);
    });

    it('should invalidate a profile with an invalid userId', () => {
        const profile = {
            userId: 'invalid-uuid',
            bio: 'This is a test bio.',
        };
        const result = insertUserProfileSchema.safeParse(profile);
        expect(result.success).toBe(false);
    });

    it('should invalidate a profile with a negative reputation score', () => {
        const profile = {
            userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            reputationScore: -10,
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
            status: 'introduced',
        };
        const result = insertBillSchema.safeParse(bill);
        expect(result.success).toBe(true);
    });

    it('should invalidate a bill with an empty title', () => {
        const bill = {
            title: '',
            description: 'A bill for testing purposes.',
        };
        const result = insertBillSchema.safeParse(bill);
        expect(result.success).toBe(false);
    });

    it('should invalidate a bill with an invalid status', () => {
        const bill = {
            title: 'Test Bill',
            status: 'invalid-status',
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

    it('should invalidate a comment with an invalid userId', () => {
        const comment = {
            userId: 'invalid-uuid',
            content: 'This is a test comment.',
            billId: 1,
        };
        const result = insertBillCommentSchema.safeParse(comment);
        expect(result.success).toBe(false);
    });

    it('should invalidate a comment with empty content', () => {
        const comment = {
            userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            content: '',
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
        };
        const result = insertSponsorSchema.safeParse(sponsor);
        expect(result.success).toBe(true);
    });

    it('should invalidate a sponsor with an empty name', () => {
        const sponsor = {
            name: '',
            role: 'Senator',
        };
        const result = insertSponsorSchema.safeParse(sponsor);
        expect(result.success).toBe(false);
    });

    it('should invalidate a sponsor with an invalid email', () => {
        const sponsor = {
            name: 'Test Sponsor',
            role: 'Senator',
            email: 'invalid-email',
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
            analysisType: 'constitutional',
        };
        const result = insertAnalysisSchema.safeParse(analysis);
        expect(result.success).toBe(true);
    });

    it('should invalidate an analysis with a non-positive billId', () => {
        const analysis = {
            billId: 0,
            analysisType: 'constitutional',
        };
        const result = insertAnalysisSchema.safeParse(analysis);
        expect(result.success).toBe(false);
    });

    it('should invalidate an analysis with an invalid analysisType', () => {
        const analysis = {
            billId: 1,
            analysisType: 'invalid-type',
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
            type: 'business',
        };
        const result = insertStakeholderSchema.safeParse(stakeholder);
        expect(result.success).toBe(true);
    });

    it('should invalidate a stakeholder with an empty name', () => {
        const stakeholder = {
            name: '',
            type: 'business',
        };
        const result = insertStakeholderSchema.safeParse(stakeholder);
        expect(result.success).toBe(false);
    });

    it('should invalidate a stakeholder with an invalid type', () => {
        const stakeholder = {
            name: 'Test Stakeholder',
            type: 'invalid-type',
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
            type: 'test-notification',
            title: 'Test Notification',
            message: 'This is a test notification.',
        };
        const result = insertNotificationSchema.safeParse(notification);
        expect(result.success).toBe(true);
    });

    it('should invalidate a notification with an invalid userId', () => {
        const notification = {
            userId: 'invalid-uuid',
            type: 'test-notification',
            title: 'Test Notification',
            message: 'This is a test notification.',
        };
        const result = insertNotificationSchema.safeParse(notification);
        expect(result.success).toBe(false);
    });

    it('should invalidate a notification with an empty title', () => {
        const notification = {
            userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            type: 'test-notification',
            title: '',
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
            checkType: 'gdpr',
        };
        const result = insertComplianceCheckSchema.safeParse(check);
        expect(result.success).toBe(true);
    });

    it('should invalidate a check with an empty name', () => {
        const check = {
            checkName: '',
            checkType: 'gdpr',
        };
        const result = insertComplianceCheckSchema.safeParse(check);
        expect(result.success).toBe(false);
    });

    it('should invalidate a check with an invalid type', () => {
        const check = {
            checkName: 'Test Check',
            checkType: 'invalid-type',
        };
        const result = insertComplianceCheckSchema.safeParse(check);
        expect(result.success).toBe(false);
    });
});






