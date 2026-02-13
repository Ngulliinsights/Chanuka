/**
 * User Test Fixtures
 * Factory functions for creating test user data
 */

import { faker } from '@faker-js/faker';
import type { users, user_profiles } from '../../../server/infrastructure/schema/foundation';

export type NewUser = typeof users.$inferInsert;
export type NewUserProfile = typeof user_profiles.$inferInsert;

/**
 * Create a test user with minimal required fields
 */
export function createTestUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    email: faker.internet.email().toLowerCase(),
    password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', // Pre-hashed test password
    role: 'citizen',
    is_verified: true,
    is_active: true,
    failed_login_attempts: 0,
    two_factor_enabled: false,
    ...overrides,
  };
}

/**
 * Create a test user profile
 */
export function createTestUserProfile(userId: string, overrides: Partial<NewUserProfile> = {}): NewUserProfile {
  return {
    user_id: userId,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    display_name: faker.internet.userName(),
    bio: faker.lorem.paragraph(),
    bio_word_count: 50,
    anonymity_level: 'public',
    is_id_verified: false,
    phone_verified: false,
    email_notifications_consent: true,
    sms_notifications_consent: false,
    marketing_consent: false,
    data_processing_consent: true,
    preferred_language: 'en',
    timezone: 'Africa/Nairobi',
    completeness_score: 60,
    is_public: true,
    profile_views: 0,
    ...overrides,
  };
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number, overrides: Partial<NewUser> = {}): NewUser[] {
  return Array.from({ length: count }, () => createTestUser(overrides));
}

/**
 * Create a verified admin user
 */
export function createAdminUser(overrides: Partial<NewUser> = {}): NewUser {
  return createTestUser({
    role: 'admin',
    is_verified: true,
    ...overrides,
  });
}

/**
 * Create a moderator user
 */
export function createModeratorUser(overrides: Partial<NewUser> = {}): NewUser {
  return createTestUser({
    role: 'moderator',
    is_verified: true,
    ...overrides,
  });
}

/**
 * Create an unverified user
 */
export function createUnverifiedUser(overrides: Partial<NewUser> = {}): NewUser {
  return createTestUser({
    is_verified: false,
    verification_token: faker.string.alphanumeric(64),
    verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    ...overrides,
  });
}
