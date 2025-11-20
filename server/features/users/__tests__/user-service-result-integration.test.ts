/**
 * Integration Tests for User Domain Service Result Types
 * 
 * Tests the integration of neverthrow Result types with the UserDomainService,
 * ensuring proper error handling and business rule validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserDomainService, UserRegistrationData, ProfileUpdateData } from '../application/users.js';
import { ResultAdapter } from '../../../infrastructure/errors/result-adapter.js';

// Mock dependencies
const mockUserRepository = {
  findByEmail: vi.fn(),
  findUserAggregateById: vi.fn(),
  save: vi.fn(),
  saveProfile: vi.fn(),
  updateProfile: vi.fn(),
  saveInterest: vi.fn(),
  deleteAllInterests: vi.fn(),
  countUsers: vi.fn().mockResolvedValue(0),
  countUsersByRole: vi.fn().mockResolvedValue({}),
  countUsersByVerificationStatus: vi.fn().mockResolvedValue({})
};

const mockVerificationRepository = {
  save: vi.fn(),
  findByUserId: vi.fn(),
  findByBillId: vi.fn()
};

vi.mock('../../../infrastructure/database/database-service', () => ({
  databaseService: {
    withTransaction: vi.fn((callback) => callback({}))
  }
}));

describe('UserDomainService Result Integration', () => {
  let userService: UserDomainService;

  beforeEach(() => {
    userService = new UserDomainService(
      mockUserRepository as any,
      mockVerificationRepository as any
    );
    vi.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should return Ok result for valid registration', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null); // No existing user
      mockUserRepository.save.mockResolvedValue(undefined);
      mockUserRepository.saveProfile.mockResolvedValue(undefined);

      const registrationData: UserRegistrationData = {
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password'
      };

      const result = await userService.registerUser(registrationData);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.email.value).toBe('test@example.com');
        expect(result.value.user.name.value).toBe('Test User');
      }
    });

    it('should return validation error for missing required fields', async () => {
      const registrationData: UserRegistrationData = {
        email: '',
        name: '',
        password_hash: ''
      };

      const result = await userService.registerUser(registrationData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('validation');
        expect(result.error.message).toContain('Email is required');
      }
    });

    it('should return business logic error for duplicate email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: '123', email: 'test@example.com' });

      const registrationData: UserRegistrationData = {
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password'
      };

      const result = await userService.registerUser(registrationData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('business_logic');
        expect(result.error.message).toContain('User with this email already exists');
      }
    });
  });

  describe('Profile Updates', () => {
    const mockAggregate = {
      user: { id: '123', isEligibleForVerification: () => true },
      profile: null,
      interests: [],
      verifications: [],
      reputation_score: 15,
      profileCompleteness: 60
    };

    it('should return Ok result for valid profile update', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(mockAggregate);
      mockUserRepository.saveProfile.mockResolvedValue(undefined);

      const updateData: ProfileUpdateData = {
        bio: 'Updated bio',
        expertise: ['technology', 'policy'],
        is_public: true
      };

      const result = await userService.updateUserProfile('123', updateData);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.profile).toBeDefined();
      }
    });

    it('should return not found error for non-existent user', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(null);

      const result = await userService.updateUserProfile('999', {});
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('not_found');
        expect(result.error.message).toContain('User not found');
      }
    });

    it('should enforce business rules for public profiles', async () => {
      const lowReputationAggregate = {
        ...mockAggregate,
        reputation_score: 5 // Below minimum
      };
      mockUserRepository.findUserAggregateById.mockResolvedValue(lowReputationAggregate);

      const updateData: ProfileUpdateData = {
        is_public: true
      };

      const result = await userService.updateUserProfile('123', updateData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('business_logic');
        expect(result.error.message).toContain('at least 10 reputation points');
      }
    });

    it('should enforce profile completeness rules', async () => {
      const incompleteProfileAggregate = {
        ...mockAggregate,
        profileCompleteness: 30 // Below minimum
      };
      mockUserRepository.findUserAggregateById.mockResolvedValue(incompleteProfileAggregate);

      const updateData: ProfileUpdateData = {
        is_public: true
      };

      const result = await userService.updateUserProfile('123', updateData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('business_logic');
        expect(result.error.message).toContain('at least 50% complete');
      }
    });
  });

  describe('Interest Management', () => {
    const mockAggregate = {
      user: { id: '123' },
      profile: null,
      interests: [],
      verifications: [],
      reputation_score: 15,
      profileCompleteness: 60
    };

    it('should return Ok result for valid interests update', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(mockAggregate);
      mockUserRepository.deleteAllInterests.mockResolvedValue(undefined);
      mockUserRepository.saveInterest.mockResolvedValue(undefined);

      const interests = ['technology', 'environment', 'healthcare'];
      const result = await userService.updateUserInterests('123', interests);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.interests).toHaveLength(3);
      }
    });

    it('should validate maximum interest limit', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(mockAggregate);

      const tooManyInterests = Array.from({ length: 25 }, (_, i) => `interest-${i}`);
      const result = await userService.updateUserInterests('123', tooManyInterests);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('validation');
        expect(result.error.message).toContain('Maximum 20 interests allowed');
      }
    });

    it('should validate duplicate interests', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(mockAggregate);

      const duplicateInterests = ['technology', 'technology', 'environment'];
      const result = await userService.updateUserInterests('123', duplicateInterests);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('validation');
        expect(result.error.message).toContain('Duplicate interests are not allowed');
      }
    });
  });

  describe('Verification Submission', () => {
    const mockAggregate = {
      user: { 
        id: '123', 
        isEligibleForVerification: () => true 
      },
      profile: null,
      interests: [],
      verifications: [],
      reputation_score: 15,
      profileCompleteness: 60
    };

    it('should return Ok result for valid verification', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(mockAggregate);
      mockVerificationRepository.save.mockResolvedValue(undefined);

      const verificationData = {
        bill_id: 1,
        verification_type: 'fact_check' as const,
        claim: 'Test claim',
        evidence: [{ type: 'document', url: 'http://example.com/doc.pdf' }],
        expertise: 'expert' as const,
        reasoning: 'Test reasoning'
      };

      const result = await userService.submitVerification('123', verificationData);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.bill_id).toBe(1);
        expect(result.value.citizenId).toBe('123');
      }
    });

    it('should check user eligibility', async () => {
      const ineligibleAggregate = {
        ...mockAggregate,
        user: { 
          id: '123', 
          isEligibleForVerification: () => false 
        }
      };
      mockUserRepository.findUserAggregateById.mockResolvedValue(ineligibleAggregate);

      const verificationData = {
        bill_id: 1,
        verification_type: 'fact_check' as const,
        claim: 'Test claim',
        evidence: [{ type: 'document', url: 'http://example.com/doc.pdf' }],
        expertise: 'expert' as const,
        reasoning: 'Test reasoning'
      };

      const result = await userService.submitVerification('123', verificationData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('business_logic');
        expect(result.error.message).toContain('not eligible for verification');
      }
    });

    it('should prevent duplicate verifications', async () => {
      const aggregateWithVerification = {
        ...mockAggregate,
        verifications: [{ bill_id: 1, citizenId: '123' }]
      };
      mockUserRepository.findUserAggregateById.mockResolvedValue(aggregateWithVerification);

      const verificationData = {
        bill_id: 1, // Same bill ID
        verification_type: 'fact_check' as const,
        claim: 'Test claim',
        evidence: [{ type: 'document', url: 'http://example.com/doc.pdf' }],
        expertise: 'expert' as const,
        reasoning: 'Test reasoning'
      };

      const result = await userService.submitVerification('123', verificationData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('business_logic');
        expect(result.error.message).toContain('already verified this bill');
      }
    });

    it('should validate evidence requirements', async () => {
      mockUserRepository.findUserAggregateById.mockResolvedValue(mockAggregate);

      const verificationData = {
        bill_id: 1,
        verification_type: 'fact_check' as const,
        claim: 'Test claim',
        evidence: [], // Empty evidence
        expertise: 'expert' as const,
        reasoning: 'Test reasoning'
      };

      const result = await userService.submitVerification('123', verificationData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('validation');
        expect(result.error.message).toContain('At least one piece of evidence is required');
      }
    });
  });

  describe('Error Context and Monitoring', () => {
    it('should include proper error context', async () => {
      const result = await userService.registerUser({
        email: '',
        name: '',
        password_hash: ''
      });
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.context.service).toBe('UserDomainService');
        expect(result.error.context.operation).toBe('registerUser');
        expect(result.error.context.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should provide appropriate error categories for monitoring', async () => {
      const validationResult = await userService.updateUserInterests('123', Array(25).fill('interest'));
      const notFoundResult = await userService.updateUserProfile('999', {});
      
      if (validationResult.isErr()) {
        expect(validationResult.error.category).toBe('validation');
      }
      
      if (notFoundResult.isErr()) {
        expect(notFoundResult.error.category).toBe('not_found');
      }
    });

    it('should handle transaction failures gracefully', async () => {
      // Mock transaction failure
      vi.mocked(mockUserRepository.save).mockRejectedValue(new Error('Database error'));
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const registrationData: UserRegistrationData = {
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password'
      };

      const result = await userService.registerUser(registrationData);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.category).toBe('system');
        expect(result.error.message).toContain('Database error');
      }
    });
  });
});
