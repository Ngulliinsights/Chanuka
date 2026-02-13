/**
 * Tests for Generated Database Types
 * 
 * Verifies that generated types work correctly with Drizzle's type inference
 */

import { describe, it, expect } from 'vitest';
import type { UsersTable, UsersTableInsert } from '../generated-tables';

describe('Generated Database Types', () => {
  describe('Table Types ($inferSelect)', () => {
    it('should have correct structure for UsersTable', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const user: UsersTable = {
        id: '123',
        email: 'test@example.com',
        password_hash: 'hashed',
        role: 'citizen',
        county: null,
        constituency: null,
        is_verified: false,
        verification_token: null,
        verification_expires_at: null,
        password_reset_token: null,
        password_reset_expires_at: null,
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
        failed_login_attempts: 0,
        account_locked_until: null,
        last_password_change: null,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
        updated_by: null,
        last_login_at: null,
        last_login_ip: null,
        is_active: true,
        deactivation_reason: null,
        deactivated_at: null,
      };

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Insert Types ($inferInsert)', () => {
    it('should allow creating insert objects without auto-generated fields', () => {
      // Insert type should not require id, created_at, updated_at
      const newUser: UsersTableInsert = {
        email: 'new@example.com',
        password_hash: 'hashed',
        role: 'citizen',
      };

      expect(newUser.email).toBe('new@example.com');
    });

    it('should allow optional fields in insert type', () => {
      const newUser: UsersTableInsert = {
        email: 'new@example.com',
        password_hash: 'hashed',
        role: 'citizen',
        county: 'nairobi',
        is_verified: true,
      };

      expect(newUser.county).toBe('nairobi');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for fields', () => {
      // This test verifies compile-time type safety
      const user: Partial<UsersTable> = {
        email: 'test@example.com',
        is_verified: true,
        failed_login_attempts: 0,
      };

      // These should be the correct types
      expect(typeof user.email).toBe('string');
      expect(typeof user.is_verified).toBe('boolean');
      expect(typeof user.failed_login_attempts).toBe('number');
    });
  });
});
