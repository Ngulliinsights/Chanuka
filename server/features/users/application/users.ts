import { UserRepository } from '../domain/repositories/user-repository';
import { VerificationRepository } from '../domain/repositories/verification-repository';
import { UserAggregate } from '../domain/aggregates/user-aggregate';
import { User } from '../domain/entities/user';
import { UserProfile, UserInterest } from '../domain/entities/user-profile';
import { CitizenVerification, VerificationType } from '../domain/entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '../domain/entities/value-objects';
import { databaseService } from '../../../infrastructure/database/database-service';
import { logger } from '../../../../shared/core/src/index.js';

// Domain Events
export interface UserRegisteredEvent {
  type: 'USER_REGISTERED';
  userId: string;
  email: string;
  timestamp: Date;
}

export interface ProfileUpdatedEvent {
  type: 'PROFILE_UPDATED';
  userId: string;
  changes: string[];
  timestamp: Date;
}

export interface VerificationSubmittedEvent {
  type: 'VERIFICATION_SUBMITTED';
  userId: string;
  verificationId: string;
  billId: number;
  timestamp: Date;
}

export type DomainEvent = UserRegisteredEvent | ProfileUpdatedEvent | VerificationSubmittedEvent;

// Service Results
export interface ServiceResult<T> {
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
  constructor(
    private userRepository: UserRepository,
    private verificationRepository: VerificationRepository
  ) {}

  /**
   * Register a new user with validation and profile creation
   */
  async registerUser(registrationData: UserRegistrationData): Promise<ServiceResult<UserAggregate>> {
    const errors: string[] = [];
    const events: DomainEvent[] = [];

    // Validate input
    if (!registrationData.email || !registrationData.name || !registrationData.password_hash) {
      errors.push('Email, name, and password are required');
      return { success: false, errors, events };
    }

    // Check for existing user
    const existingUser = await this.userRepository.findByEmail(registrationData.email);
    if (existingUser) {
      errors.push('User with this email already exists');
      return { success: false, errors, events };
    }

    try {
      return await databaseService.withTransaction(async (tx) => {
        // Create user entity
        const user = User.create({
          id: crypto.randomUUID(),
          email: registrationData.email,
          name: registrationData.name,
          role: registrationData.role
        });

        // Save user
        await this.userRepository.save(user, registrationData.password_hash);

        // Create initial profile
        const profile = UserProfile.create({
          user_id: user.id,
          is_public: false // New users start private
        });
        await this.userRepository.saveProfile(profile);

        // Create aggregate
        const aggregate = UserAggregate.create({
          user,
          profile: [profile],
          interests: [],
          verifications: []
        });

        // Emit domain event
        events.push({
          type: 'USER_REGISTERED',
          userId: user.id,
          email: user.email.value,
          timestamp: new Date()
        });

        return { success: true, data: aggregate, errors: [], events };
      }, 'user_registration');
    } catch (error) {
      logger.error('Error registering user:', { component: 'UserDomainService' }, error);
      errors.push('Failed to register user');
      return { success: false, errors, events };
    }
  }

  /**
   * Update user profile with business rule validation
   */
  async updateUserProfile(userId: string, updateData: ProfileUpdateData): Promise<ServiceResult<UserAggregate>> {
    const errors: string[] = [];
    const events: DomainEvent[] = [];
    const changes: string[] = [];

    // Get current aggregate
    const aggregate = await this.userRepository.findUserAggregateById(userId);
    if (!aggregate) {
      errors.push('User not found');
      return { success: false, errors, events };
    }

    // Validate business rules
    if (updateData.is_public && aggregate.reputation_score < 10) {
      errors.push('Users must have at least 10 reputation points to make their profile public');
      return { success: false, errors, events };
    }

    if (updateData.is_public && aggregate.profileCompleteness < 50) {
      errors.push('Profile must be at least 50% complete to be made public');
      return { success: false, errors, events };
    }

    try {
      return await databaseService.withTransaction(async (tx) => {
        let profile = aggregate.profile;

        // Create profile if it doesn't exist
        if (!profile) {
          profile = UserProfile.create({
            user_id: userId,
            bio: updateData.bio,
            expertise: updateData.expertise || [],
            location: updateData.location,
            organization: updateData.organization,
            is_public: updateData.is_public ?? false
          });
          await this.userRepository.saveProfile(profile);
          changes.push('profile_created');
        } else {
          // Update existing profile
          if (updateData.bio !== undefined) {
            profile.updateBio(updateData.bio);
            changes.push('bio_updated');
          }
          if (updateData.expertise !== undefined) {
            profile.updateExpertise(updateData.expertise);
            changes.push('expertise_updated');
          }
          if (updateData.location !== undefined) {
            if (updateData.location) {
              profile.updateLocation(updateData.location);
            } else {
              profile.clearLocation();
            }
            changes.push('location_updated');
          }
          if (updateData.organization !== undefined) {
            if (updateData.organization) {
              profile.updateOrganization(updateData.organization);
            } else {
              profile.clearOrganization();
            }
            changes.push('organization_updated');
          }
          if (updateData.is_public !== undefined) {
            profile.setVisibility(updateData.is_public);
            changes.push('visibility_updated');
          }

          await this.userRepository.updateProfile(profile);
        }

        // Update aggregate
        const updatedAggregate = UserAggregate.create({
          user: aggregate.user,
          profile,
          interests: aggregate.interests,
          verifications: aggregate.verifications
        });

        // Emit domain event
        if (changes.length > 0) {
          events.push({
            type: 'PROFILE_UPDATED',
            userId,
            changes,
            timestamp: new Date()
          });
        }

        return { success: true, data: updatedAggregate, errors: [], events };
      }, 'profile_update');
    } catch (error) {
      logger.error('Error updating user profile:', { component: 'UserDomainService' }, error);
      errors.push('Failed to update profile');
      return { success: false, errors, events };
    }
  }

  /**
   * Update user interests with validation
   */
  async updateUserInterests(userId: string, interests: string[]): Promise<ServiceResult<UserAggregate>> {
    const errors: string[] = [];
    const events: DomainEvent[] = [];

    // Get current aggregate
    const aggregate = await this.userRepository.findUserAggregateById(userId);
    if (!aggregate) {
      errors.push('User not found');
      return { success: false, errors, events };
    }

    // Validate interests
    if (interests.length > 20) {
      errors.push('Maximum 20 interests allowed');
      return { success: false, errors, events };
    }

    if (new Set(interests).size !== interests.length) {
      errors.push('Duplicate interests are not allowed');
      return { success: false, errors, events };
    }

    try {
      return await databaseService.withTransaction(async (tx) => {
        // Clear existing interests
        await this.userRepository.deleteAllInterests(userId);

        // Create and save new interests
        const interestEntities = interests.map(interest =>
          UserInterest.create({ user_id: userId, interest })
        );

        for (const interest of interestEntities) {
          await this.userRepository.saveInterest(interest);
        }

        // Update aggregate
        const updatedAggregate = UserAggregate.create({
          user: aggregate.user,
          profile: aggregate.profile,
          interests: interestEntities,
          verifications: aggregate.verifications
        });

        return { success: true, data: updatedAggregate, errors: [], events };
      }, 'interests_update');
    } catch (error) {
      logger.error('Error updating user interests:', { component: 'UserDomainService' }, error);
      errors.push('Failed to update interests');
      return { success: false, errors, events };
    }
  }

  /**
   * Submit citizen verification with eligibility checks
   */
  async submitVerification(userId: string, verificationData: VerificationSubmissionData): Promise<ServiceResult<CitizenVerification>> {
    const errors: string[] = [];
    const events: DomainEvent[] = [];

    // Get user aggregate for eligibility check
    const aggregate = await this.userRepository.findUserAggregateById(userId);
    if (!aggregate) {
      errors.push('User not found');
      return { success: false, errors, events };
    }

    // Check verification eligibility
    if (!aggregate.user.isEligibleForVerification()) {
      errors.push('User is not eligible for verification');
      return { success: false, errors, events };
    }

    // Check if user already verified this bill
    const existingVerification = aggregate.verifications.find(v => v.bill_id === verificationData.bill_id);
    if (existingVerification) {
      errors.push('User has already verified this bill');
      return { success: false, errors, events };
    }

    // Validate evidence
    if (verificationData.evidence.length === 0) {
      errors.push('At least one piece of evidence is required');
      return { success: false, errors, events };
    }

    try {
      return await databaseService.withTransaction(async (tx) => {
        // Create verification entity
        const verification = CitizenVerification.create({
          id: crypto.randomUUID(),
          bill_id: verificationData.bill_id,
          citizenId: userId,
          verification_type: verificationData.verification_type,
          evidence: verificationData.evidence,
          expertise: verificationData.expertise,
          reasoning: verificationData.reasoning
        });

        // Save verification
        await this.verificationRepository.save(verification);

        // Emit domain event
        events.push({
          type: 'VERIFICATION_SUBMITTED',
          userId,
          verificationId: verification.id,
          billId: verificationData.bill_id,
          timestamp: new Date()
        });

        return { success: true, data: verification, errors: [], events };
      }, 'verification_submission');
    } catch (error) {
      logger.error('Error submitting verification:', { component: 'UserDomainService' }, error);
      errors.push('Failed to submit verification');
      return { success: false, errors, events };
    }
  }

  /**
   * Get user aggregate with all related data
   */
  async getUserAggregate(userId: string): Promise<UserAggregate | null> {
    return await this.userRepository.findUserAggregateById(userId);
  }

  /**
   * Check user verification eligibility
   */
  async checkVerificationEligibility(userId: string): Promise<{
    eligible: boolean;
    reasons: string[];
    reputation_score: number;
  }> {
    const aggregate = await this.userRepository.findUserAggregateById(userId);
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
      usersByRole,
      usersByVerificationStatus
    ] = await Promise.all([
      this.userRepository.countUsers(),
      this.userRepository.countUsersByRole(),
      this.userRepository.countUsersByVerificationStatus()
    ]);

    // This is a simplified implementation - in a real system you'd aggregate
    // verification counts across all users
    const totalVerifications = 0; // Would need to implement in repository
    const averageReputation = 0; // Would need to implement in repository

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
export function createUserDomainService(
  userRepository: UserRepository,
  verificationRepository: VerificationRepository
): UserDomainService {
  return new UserDomainService(userRepository, verificationRepository);
}