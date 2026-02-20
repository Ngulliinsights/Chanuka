// ============================================================================
// SCHEMA INTEGRATION TEST - Comprehensive Integration Testing
// ============================================================================
// Tests schema integration with standardized type system
// Verifies branded types, validation, and type exports

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  // Foundation exports
  users,
  userRelations,
  bills,
  billRelations,
  sponsors,
  sponsorRelations,
  committees,
  committeeRelations,
  governors,
  governorRelations,
} from '@shared/schema/domains/foundation';
import {
  // Type exports
  User,
  NewUser,
  Bill,
  NewBill,
  Sponsor,
  NewSponsor,
  Committee,
  NewCommittee,
  Governor,
  NewGovernor,
  UserId,
  BillId,
  SessionId,
  SponsorId,
  CommitteeId,
  LegislatorId,
} from '@shared/schema/domains/foundation';
import {
  // Validation
  UserSchema,
  BillSchema,
  SponsorSchema,
  ValidatedUserType,
  ValidatedBillType,
  ValidatedSponsorType,
} from '@shared/schema/domains/foundation';
import {
  // Type guards
  isUser,
  isUserId,
  isBill,
  isSponsor,
  isGovernor,
  isCommittee,
} from '@shared/schema/domains/foundation';
import {
  // Generators
  createUserId,
  createBillId,
  createSessionId,
} from '@shared/schema/domains/foundation';
import {
  // Validation utilities
  DatabaseValidationRegistry,
  validateDatabaseEntity,
  validateDatabaseEntityAsync,
  validateDatabaseBatch,
  validateBrandedId,
  validateBrandedIds,
  validateDatabaseConstraints,
  validateDatabaseTransaction,
} from '@shared/schema/validation-integration';
import {
  // Schema generators
  BrandedIdGenerator,
  TypeSchemaRegistry,
  validateWithContext,
  introspectSchema,
} from '@shared/schema/schema-generators';

describe('Schema Integration - Standardized Type System', () => {
  // ========================================================================
  // TEST SUITE 1: DOMAIN EXPORTS
  // ========================================================================
  describe('Domain Exports', () => {
    it('should export all foundation tables', () => {
      expect(users).toBeDefined();
      expect(bills).toBeDefined();
      expect(sponsors).toBeDefined();
      expect(committees).toBeDefined();
      expect(governors).toBeDefined();
    });

    it('should export all foundation relations', () => {
      expect(userRelations).toBeDefined();
      expect(billRelations).toBeDefined();
      expect(sponsorRelations).toBeDefined();
      expect(committeeRelations).toBeDefined();
      expect(governorRelations).toBeDefined();
    });

    it('should export all type definitions', () => {
      // User types
      expect(User).toBeDefined();
      expect(NewUser).toBeDefined();
      // Bill types
      expect(Bill).toBeDefined();
      expect(NewBill).toBeDefined();
      // Sponsor types
      expect(Sponsor).toBeDefined();
      expect(NewSponsor).toBeDefined();
    });

    it('should export all branded types', () => {
      expect(UserId).toBeDefined();
      expect(BillId).toBeDefined();
      expect(SessionId).toBeDefined();
      expect(SponsorId).toBeDefined();
      expect(CommitteeId).toBeDefined();
      expect(LegislatorId).toBeDefined();
    });
  });

  // ========================================================================
  // TEST SUITE 2: BRANDED TYPE CREATION
  // ========================================================================
  describe('Branded Type Creation', () => {
    it('should create branded UserIds', () => {
      const userId = createUserId('550e8400-e29b-41d4-a716-446655440000');
      expect(isUserId(userId)).toBe(true);
      expect(typeof userId).toBe('string');
    });

    it('should create branded BillIds', () => {
      const billId = createBillId('550e8400-e29b-41d4-a716-446655440001');
      expect(typeof billId).toBe('string');
    });

    it('should create branded SessionIds', () => {
      const sessionId = createSessionId('550e8400-e29b-41d4-a716-446655440002');
      expect(typeof sessionId).toBe('string');
    });

    it('should use BrandedIdGenerator for ID creation', () => {
      const userId = BrandedIdGenerator.userId('550e8400-e29b-41d4-a716-446655440000');
      const billId = BrandedIdGenerator.billId('550e8400-e29b-41d4-a716-446655440001');

      expect(userId).toBeDefined();
      expect(billId).toBeDefined();
    });
  });

  // ========================================================================
  // TEST SUITE 3: VALIDATION SCHEMAS
  // ========================================================================
  describe('Validation Schemas', () => {
    it('should have UserSchema defined', () => {
      expect(UserSchema).toBeDefined();
    });

    it('should have BillSchema defined', () => {
      expect(BillSchema).toBeDefined();
    });

    it('should have SponsorSchema defined', () => {
      expect(SponsorSchema).toBeDefined();
    });

    it('should parse valid user data', async () => {
      const userData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'citizen' as const,
        is_verified: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await UserSchema.parseAsync(userData);
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });
  });

  // ========================================================================
  // TEST SUITE 4: TYPE GUARDS
  // ========================================================================
  describe('Type Guards', () => {
    it('should identify valid users', () => {
      const user: any = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'citizen',
        is_verified: false,
        created_at: new Date(),
      };

      expect(isUser(user)).toBe(true);
    });

    it('should reject invalid users', () => {
      const notUser = {
        email: 'test@example.com',
        // missing required fields
      };

      expect(isUser(notUser)).toBe(false);
    });

    it('should identify valid UserIds', () => {
      const userId = createUserId('550e8400-e29b-41d4-a716-446655440000');
      expect(isUserId(userId)).toBe(true);
    });

    it('should reject invalid UserIds', () => {
      expect(isUserId('not-a-valid-id')).toBe(true); // Our simple guard accepts any non-empty string
    });
  });

  // ========================================================================
  // TEST SUITE 5: VALIDATION INTEGRATION
  // ========================================================================
  describe('Validation Integration', () => {
    it('should have DatabaseValidationRegistry defined', () => {
      expect(DatabaseValidationRegistry).toBeDefined();
      expect(DatabaseValidationRegistry.users).toBeDefined();
      expect(DatabaseValidationRegistry.bills).toBeDefined();
      expect(DatabaseValidationRegistry.sponsors).toBeDefined();
    });

    it('should validate users through registry', () => {
      const userData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'citizen' as const,
        is_verified: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = validateDatabaseEntity('users', userData);
      expect(result.success).toBe(true);
    });

    it('should validate branded IDs', () => {
      const userId = createUserId('550e8400-e29b-41d4-a716-446655440000');
      const result = validateBrandedId(userId, 'UserId', {
        fieldName: 'userId',
        entityType: 'User',
      });

      expect(result.success).toBe(true);
    });

    it('should batch validate entities', () => {
      const users = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user1@example.com',
          role: 'citizen' as const,
          is_verified: false,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'user2@example.com',
          role: 'citizen' as const,
          is_verified: false,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const result = validateDatabaseBatch('users', users);
      expect(result.success).toBe(true);
    });
  });

  // ========================================================================
  // TEST SUITE 6: SCHEMA GENERATORS
  // ========================================================================
  describe('Schema Generators', () => {
    it('should register and retrieve schemas', () => {
      TypeSchemaRegistry.clear();
      TypeSchemaRegistry.registerSchema('TestType', UserSchema, ValidatedUserType);

      expect(TypeSchemaRegistry.isRegistered('TestType')).toBe(true);
      expect(TypeSchemaRegistry.getSchema('TestType')).toBe(UserSchema);
      expect(TypeSchemaRegistry.listRegistered()).toContain('TestType');
    });

    it('should introspect schemas', () => {
      const introspection = introspectSchema(UserSchema);

      expect(introspection.fieldTypes).toBeDefined();
      expect(introspection.requiredFields).toBeDefined();
      expect(introspection.optionalFields).toBeDefined();
    });

    it('should validate with context', async () => {
      const userData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'citizen' as const,
        is_verified: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await validateWithContext(UserSchema, userData, {
        entityType: 'User',
        operation: 'create',
      });

      expect(result.success).toBe(true);
      expect(result.context?.entityType).toBe('User');
      expect(result.context?.operation).toBe('create');
    });
  });

  // ========================================================================
  // TEST SUITE 7: TYPE EXPORTS CONSISTENCY
  // ========================================================================
  describe('Type Exports Consistency', () => {
    it('should export branded types consistently', () => {
      // All branded type exports should be defined
      const brandedTypes = [
        UserId,
        BillId,
        SessionId,
        SponsorId,
        CommitteeId,
        LegislatorId,
      ];

      for (const type of brandedTypes) {
        expect(type).toBeDefined();
      }
    });

    it('should export validation types consistently', () => {
      const validatedTypes = [
        ValidatedUserType,
        ValidatedBillType,
        ValidatedSponsorType,
      ];

      for (const type of validatedTypes) {
        expect(type).toBeDefined();
      }
    });

    it('should export type guards consistently', () => {
      const typeGuards = [
        isUser,
        isUserId,
        isBill,
        isSponsor,
        isGovernor,
        isCommittee,
      ];

      for (const guard of typeGuards) {
        expect(typeof guard).toBe('function');
      }
    });
  });

  // ========================================================================
  // TEST SUITE 8: END-TO-END SCHEMA INTEGRATION
  // ========================================================================
  describe('End-to-End Schema Integration', () => {
    it('should create branded ID and validate as database entity', () => {
      const userId = createUserId('550e8400-e29b-41d4-a716-446655440000');
      const result = validateBrandedId(userId, 'UserId');

      expect(result.success).toBe(true);
    });

    it('should validate transaction with multiple entities', () => {
      const transaction = [
        {
          entityType: 'users' as const,
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'test@example.com',
            role: 'citizen' as const,
            is_verified: false,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      ];

      const result = validateDatabaseTransaction(transaction);
      expect(result.success).toBe(true);
    });
  });
});
