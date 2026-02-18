import { databaseService } from '@/infrastructure/database/database-service';
import {
  AsyncServiceResult,
  toServiceResult,
  toBoomResult,
  safeAsync
} from '@/infrastructure/error-handling';

import { UserAggregate } from '../domain/aggregates/user-aggregate';
import { CitizenVerification, VerificationType } from '../domain/entities/citizen-verification';
import { User } from '../domain/entities/user';
import { UserInterest,UserProfile } from '../domain/entities/user-profile';
import { Evidence, ExpertiseLevel } from '../domain/entities/value-objects';
import { UserService } from './user-service-direct';

// Domain Events
export interface UserRegisteredEvent {
  type: 'USER_REGISTERED';
  user_id: string;
  email: string;
  timestamp: Date;
}

export interface ProfileUpdatedEvent {
  type: 'PROFILE_UPDATED';
  user_id: string;
  changes: string[];
  timestamp: Date;
}

export interface VerificationSubmittedEvent {
  type: 'VERIFICATION_SUBMITTED';
  user_id: string;
  verification_id: string;
  bill_id: number;
  timestamp: Date;
}

export type DomainEvent = UserRegisteredEvent | ProfileUpdatedEvent | VerificationSubmittedEvent;

// Legacy Service Results (kept for backward compatibility)
export interface LegacyServiceResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  events: DomainEvent[];
}

export interface UserRegistrationData {
  email: string;
  name: string;
  role?: string;
  password_hash: string;
}

export interface ProfileUpdateData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}

export interface VerificationSubmissionData {
  bill_id: number;
  verification_type: VerificationType;
  claim: string;
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
}

/**
 * UserDomainService - Domain service implementing business logic for user operations
 *
 * This service coordinates between multiple repositories within transactions,
 * implements complex business rules, and manages domain events.
 */
export class UserDomainService {
  constructor(private userService: UserService) {}

  /**
   * Register a new user with validation and profile creation
   */
  async registerUser(registrationData: UserRegistrationData): AsyncServiceResult<UserAggregate> {
    return withResultHandling(async () => {
      // Validate input
      if (!registrationData.email || !registrationData.name || !registrationData.password_hash) {
        const validationResult = ResultAdapter.validationError([
          { field: 'email', message: 'Email is required' },
          { field: 'name', message: 'Name is required' },
          { field: 'password_hash', message: 'Password is required' }
        ], { service: 'UserDomainService', operation: 'registerUser' });
        throw ResultAdapter.toBoom(validationResult._unsafeUnwrapErr());
      }

      // Check for existing user - findByEmail returns User | null directly
      const existingUser = await this.userService.findByEmail(registrationData.email);
      
      // If a user with this email already exists, reject the registration
      if (existingUser) {
        const businessLogicResult = ResultAdapter.businessLogicError(
          'unique_email',
          'User with this email already exists',
          { service: 'UserDomainService', operation: 'registerUser' }
        );
        throw ResultAdapter.toBoom(businessLogicResult._unsafeUnwrapErr());
      }

      // Execute transaction and unwrap DatabaseResult
      const txResult = await databaseService.withTransaction(async (_tx) => {
        // Create user entity
        const user = User.create({
          id: crypto.randomUUID(),
          email: registrationData.email,
          name: registrationData.name,
          ...(registrationData.role && { role: registrationData.role })
        });

        // Save user
        await this.userService.save(user, registrationData.password_hash);

        // Create initial profile
        const profile = UserProfile.create({
          user_id: user.id,
          is_public: false // New users start private
        });
        await this.userService.saveProfile(profile);

        // Create and return aggregate
        const aggregate = UserAggregate.create({
          user,
          profile,
          interests: [],
          verifications: []
        });

        return aggregate;
      }, 'user_registration');

      // Unwrap the DatabaseResult to get the actual UserAggregate
      if (!txResult.data) {
        throw new Error('Transaction failed to return data');
      }
      return txResult.data;
    }, { service: 'UserDomainService', operation: 'registerUser' });
  }

  /**
   * Update user profile with business rule validation
   */
  async updateUserProfile(user_id: string, updateData: ProfileUpdateData): AsyncServiceResult<UserAggregate> {
    return withResultHandling(async () => {
      // Get current aggregate
      const aggregateResult = await this.userService.findUserAggregateById(user_id);
      
      // Check if the result is an error or null
      if (!aggregateResult) {
        const notFoundResult = ResultAdapter.notFoundError('User', user_id, {
          service: 'UserDomainService',
          operation: 'updateUserProfile'
        });
        throw ResultAdapter.toBoom(notFoundResult._unsafeUnwrapErr());
      }

      const aggregate = aggregateResult;

      // Validate business rules
      if (updateData.is_public && aggregate.reputation_score < 10) {
        const businessLogicResult = ResultAdapter.businessLogicError(
          'minimum_reputation',
          'Users must have at least 10 reputation points to make their profile public',
          { service: 'UserDomainService', operation: 'updateUserProfile' }
        );
        throw ResultAdapter.toBoom(businessLogicResult._unsafeUnwrapErr());
      }

      if (updateData.is_public && aggregate.profileCompleteness < 50) {
        const businessLogicResult = ResultAdapter.businessLogicError(
          'profile_completeness',
          'Profile must be at least 50% complete to be made public',
          { service: 'UserDomainService', operation: 'updateUserProfile' }
        );
        throw ResultAdapter.toBoom(businessLogicResult._unsafeUnwrapErr());
      }

      const txResult = await databaseService.withTransaction(async (_tx) => {
        let profile = aggregate.profile;

        // Create profile if it doesn't exist
        if (!profile) {
          // Only include properties that have actual values (not undefined)
          profile = UserProfile.create({
            user_id: user_id,
            ...(updateData.bio && { bio: updateData.bio }),
            ...(updateData.expertise && { expertise: updateData.expertise }),
            ...(updateData.location && { location: updateData.location }),
            ...(updateData.organization && { organization: updateData.organization }),
            is_public: updateData.is_public ?? false
          });
          await this.userService.saveProfile(profile);
        } else {
          // Update existing profile
          if (updateData.bio !== undefined) {
            profile.updateBio(updateData.bio);
          }
          if (updateData.expertise !== undefined) {
            profile.updateExpertise(updateData.expertise);
          }
          if (updateData.location !== undefined) {
            if (updateData.location) {
              profile.updateLocation(updateData.location);
            } else {
              profile.clearLocation();
            }
          }
          if (updateData.organization !== undefined) {
            if (updateData.organization) {
              profile.updateOrganization(updateData.organization);
            } else {
              profile.clearOrganization();
            }
          }
          if (updateData.is_public !== undefined) {
            profile.setVisibility(updateData.is_public);
          }

          await this.userService.updateProfile(profile);
        }

        // Create updated aggregate
        const updatedAggregate = UserAggregate.create({
          user: aggregate.user,
          profile: profile || undefined,
          interests: aggregate.interests,
          verifications: aggregate.verifications
        });

        return updatedAggregate;
      }, 'profile_update');

      // Unwrap the DatabaseResult
      if (!txResult.data) {
        throw new Error('Transaction failed to return data');
      }
      return txResult.data;
    }, { service: 'UserDomainService', operation: 'updateUserProfile' });
  }

  /**
   * Update user interests with validation
   */
  async updateUserInterests(user_id: string, interests: string[]): AsyncServiceResult<UserAggregate> {
    return withResultHandling(async () => {
      // Get current aggregate
      const aggregateResult = await this.userService.findUserAggregateById(user_id);
      if (!aggregateResult) {
        const notFoundResult = ResultAdapter.notFoundError('User', user_id, {
          service: 'UserDomainService',
          operation: 'updateUserInterests'
        });
        throw ResultAdapter.toBoom(notFoundResult._unsafeUnwrapErr());
      }
      const aggregate = aggregateResult;

      // Validate interests
      if (interests.length > 20) {
        const validationResult = ResultAdapter.validationError([
          { field: 'interests', message: 'Maximum 20 interests allowed', value: interests.length }
        ], { service: 'UserDomainService', operation: 'updateUserInterests' });
        throw ResultAdapter.toBoom(validationResult._unsafeUnwrapErr());
      }

      if (new Set(interests).size !== interests.length) {
        const validationResult = ResultAdapter.validationError([
          { field: 'interests', message: 'Duplicate interests are not allowed' }
        ], { service: 'UserDomainService', operation: 'updateUserInterests' });
        throw ResultAdapter.toBoom(validationResult._unsafeUnwrapErr());
      }

      const txResult = await databaseService.withTransaction(async (_tx) => {
        // Clear existing interests
        await this.userService.deleteAllInterests(user_id);

        // Create and save new interests
        const interestEntities = interests.map(interest =>
          UserInterest.create({ user_id: user_id, interest })
        );

        for (const interest of interestEntities) {
          await this.userService.saveInterest(interest);
        }

        // Create updated aggregate
        const updatedAggregate = UserAggregate.create({
          user: aggregate.user,
          profile: aggregate.profile || undefined,
          interests: interestEntities,
          verifications: aggregate.verifications
        });

        return updatedAggregate;
      }, 'interests_update');

      // Unwrap the DatabaseResult
      if (!txResult.data) {
        throw new Error('Transaction failed to return data');
      }
      return txResult.data;
    }, { service: 'UserDomainService', operation: 'updateUserInterests' });
  }

  /**
   * Submit citizen verification with eligibility checks
   */
  async submitVerification(user_id: string, verificationData: VerificationSubmissionData): AsyncServiceResult<CitizenVerification> {
    return withResultHandling(async () => {
      // Get user aggregate for eligibility check
      const aggregateResult = await this.userService.findUserAggregateById(user_id);
      if (!aggregateResult) {
        const notFoundResult = ResultAdapter.notFoundError('User', user_id, {
          service: 'UserDomainService',
          operation: 'submitVerification'
        });
        throw ResultAdapter.toBoom(notFoundResult._unsafeUnwrapErr());
      }
      const aggregate = aggregateResult;

      // Check verification eligibility
      if (!aggregate.user.isEligibleForVerification()) {
        const businessLogicResult = ResultAdapter.businessLogicError(
          'verification_eligibility',
          'User is not eligible for verification',
          { service: 'UserDomainService', operation: 'submitVerification' }
        );
        throw ResultAdapter.toBoom(businessLogicResult._unsafeUnwrapErr());
      }

      // Check if user already verified this bill
      const existingVerification = aggregate.verifications.find(v => v.bill_id === verificationData.bill_id);
      if (existingVerification) {
        const businessLogicResult = ResultAdapter.businessLogicError(
          'duplicate_verification',
          'User has already verified this bill',
          { service: 'UserDomainService', operation: 'submitVerification' }
        );
        throw ResultAdapter.toBoom(businessLogicResult._unsafeUnwrapErr());
      }

      // Validate evidence
      if (verificationData.evidence.length === 0) {
        const validationResult = ResultAdapter.validationError([
          { field: 'evidence', message: 'At least one piece of evidence is required' }
        ], { service: 'UserDomainService', operation: 'submitVerification' });
        throw ResultAdapter.toBoom(validationResult._unsafeUnwrapErr());
      }

      const txResult = await databaseService.withTransaction(async (_tx) => {
        // Create verification entity
        const verification = CitizenVerification.create({
          id: crypto.randomUUID(),
          bill_id: verificationData.bill_id,
          citizenId: user_id,
          verification_type: verificationData.verification_type,
          evidence: verificationData.evidence,
          expertise: verificationData.expertise,
          reasoning: verificationData.reasoning
        });

        // TODO: Implement saveVerification in userService
        // await this.userService.saveVerification(verification);

        return verification;
      }, 'verification_submission');

      // Unwrap the DatabaseResult
      if (!txResult.data) {
        throw new Error('Transaction failed to return data');
      }
      return txResult.data;
    }, { service: 'UserDomainService', operation: 'submitVerification' });
  }

  /**
   * Get user aggregate with all related data
   */
  async getUserAggregate(user_id: string): Promise<UserAggregate | null> {
    return await this.userService.findUserAggregateById(user_id);
  }

  /**
   * Check user verification eligibility
   */
  async checkVerificationEligibility(user_id: string): Promise<{
    eligible: boolean;
    reasons: string[];
    reputation_score: number;
  }> {
    const aggregate = await this.userService.findUserAggregateById(user_id);
    if (!aggregate) {
      return { eligible: false, reasons: ['User not found'], reputation_score: 0 };
    }

    const reasons: string[] = [];
    let eligible = true;

    if (!aggregate.user.is_active) {
      eligible = false;
      reasons.push('User account is not active');
    }

    if (aggregate.reputation_score < 10) {
      eligible = false;
      reasons.push('User must have at least 10 reputation points');
    }

    return {
      eligible,
      reasons,
      reputation_score: aggregate.reputation_score
    };
  }

  /**
   * Get aggregate statistics across users
   */
  async getAggregateStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    totalVerifications: number;
    averageReputation: number;
  }> {
    const [
      totalUsers,
      usersByVerificationStatus
    ] = await Promise.all([
      this.userService.countUsers(),
      this.userService.countUsersByVerificationStatus()
    ]);

    // This is a simplified implementation - in a real system you'd aggregate
    // verification counts across all users
    const totalVerifications = 0; // Would need to implement in service layer
    const averageReputation = 0; // Would need to implement in service layer

    return {
      totalUsers,
      activeUsers: totalUsers, // Simplified
      verifiedUsers: usersByVerificationStatus.verified || 0,
      totalVerifications,
      averageReputation
    };
  }
}

// Factory function for dependency injection
export function createUserDomainService(userService: UserService): UserDomainService {
  return new UserDomainService(userService);
}


