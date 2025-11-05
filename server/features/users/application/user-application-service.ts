import { UserService } from './user-service-direct';
// Repository pattern removed - using direct service calls
import { UserVerificationDomainService } from '../domain/services/user-verification-domain-service';
import { ProfileDomainService, ProfileValidationResult, ProfileCompletenessScore } from '../domain/services/profile-domain-service';
import { UserAggregate } from '../domain/aggregates/user-aggregate';
import { User } from '../domain/entities/user';
import { UserProfile, UserInterest } from '../domain/entities/user-profile';
import { CitizenVerification } from '../domain/entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '../domain/entities/value-objects';
import { UserManagementDomainService } from '../domain/services/user-management-domain-service';

// Import use cases
import {
  UserRegistrationUseCase,
  ProfileManagementUseCase,
  VerificationOperationsUseCase
} from './use-cases';
import type {
  RegisterUserCommand,
  UpdateProfileCommand
} from './use-cases';

export interface UserProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}

export interface UserVerificationData { bill_id: number;
  verification_type: string;
  claim: string;
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
 }

export interface UserSearchResult {
  id: string;
  name: string;
  role: string;
  verification_status: string;
  organization?: string;
  expertise?: string[];
  reputation_score: number;
}

export class UserApplicationService {
  constructor(
    private userService: UserService,
    // Repository pattern removed - using direct service calls
    private userVerificationDomainService: UserVerificationDomainService,
    private profileDomainService: ProfileDomainService
  ) {
    // Initialize use cases
    // UserRegistrationUseCase expects a UserManagementDomainService instance
    this.userRegistrationUseCase = new UserRegistrationUseCase(
      new UserManagementDomainService(this.profileDomainService, this.userService)
    );

    // ProfileManagementUseCase expects (userManagementService, profileService, userService)
    this.profileManagementUseCase = new ProfileManagementUseCase(
      new UserManagementDomainService(this.profileDomainService, this.userService),
      this.profileDomainService,
      this.userService
    );

    // VerificationOperationsUseCase updated to use direct service calls instead of repository pattern
    this.verificationOperationsUseCase = new VerificationOperationsUseCase(
      this.userService,
      this.userVerificationDomainService as any
    );
  }

  private userRegistrationUseCase: UserRegistrationUseCase;
  private profileManagementUseCase: ProfileManagementUseCase;
  private verificationOperationsUseCase: VerificationOperationsUseCase;

  // User Management
  async registerUser(command: RegisterUserCommand) {
    return await this.userRegistrationUseCase.execute(command);
  }

  async getUserById(user_id: string): Promise<User | null> { return await this.userService.findById(user_id);
   }

  async getUserAggregate(user_id: string): Promise<UserAggregate | null> { return await this.userService.findUserAggregateById(user_id);
   }

  async updateUserProfile(user_id: string, profileData: UserProfileData): Promise<UserProfile> {
    const cmd: Partial<UpdateProfileCommand> & { user_id: string } = { user_id };
    if (profileData.bio !== undefined) cmd.bio = profileData.bio;
    if (profileData.expertise !== undefined) cmd.expertise = profileData.expertise;
    if (profileData.location !== undefined) cmd.location = profileData.location;
    if (profileData.organization !== undefined) cmd.organization = profileData.organization;
    if (profileData.is_public !== undefined) cmd.is_public = profileData.is_public;

    const result = await this.profileManagementUseCase.updateProfile(cmd as UpdateProfileCommand);

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.profile!;
  }

  async updateUserInterests(user_id: string, interests: string[]): Promise<void> { const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    // Remove existing interests
    await this.userService.deleteAllInterests(user_id);

    // Add new interests
    const interestEntities = interests.map(interest =>
      UserInterest.create({ user_id, interest  })
    );

    for (const interest of interestEntities) {
      await this.userService.saveInterest(interest);
    }
  }

  async getUserProfileCompleteness(user_id: string): Promise<ProfileCompletenessScore> { const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    return this.profileDomainService.calculateProfileCompleteness(userAggregate);
  }

  async validateUserProfile(user_id: string): Promise<ProfileValidationResult> { const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate || !userAggregate.profile) {
      return {
        isValid: false,
        errors: ['Profile not found'],
        warnings: []
       };
    }

    return this.profileDomainService.validateProfile(userAggregate.profile);
  }

  async searchUsers(query: string, limit = 10): Promise<UserSearchResult[]> {
    const users = await this.userService.searchUsers(query, limit);

    return users.map(user => ({
      id: user.id,
      name: typeof user.name === 'string' ? user.name : (user.name as any).toString(),
      role: typeof user.role === 'string' ? user.role : (user.role as any).toString(),
      verification_status: typeof user.verification_status === 'string' ? user.verification_status : (user.verification_status as any).toString(),
      reputation_score: user.reputation_score
    }));
  }

  // Verification Management
  async submitVerification(user_id: string, verification_data: UserVerificationData): Promise<CitizenVerification> { const result = await this.verificationOperationsUseCase.submitVerification({
      user_id,
      bill_id: verification_data.bill_id,
      verification_type: verification_data.verification_type as any,
      claim: verification_data.claim,
      evidence: verification_data.evidence,
      expertise: verification_data.expertise,
      reasoning: verification_data.reasoning
      });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.verification!;
  }

  async endorseVerification(user_id: string, verificationId: string): Promise<void> { const result = await this.verificationOperationsUseCase.endorseVerification({
      user_id,
      verificationId
     });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }
  }

  async disputeVerification(user_id: string, verificationId: string, reason: string): Promise<void> { const result = await this.verificationOperationsUseCase.disputeVerification({
      user_id,
      verificationId,
      reason
     });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }
  }

  async performFactCheck(bill_id: number, claim: string): Promise<any[]> { const result = await this.verificationOperationsUseCase.performFactCheck({
      bill_id,
      claim
     });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.factCheckResults || [];
  }

  // Analytics and Reporting
  async getUserEngagementStats(user_id: string): Promise<{
    totalVerifications: number;
    averageConfidence: number;
    endorsementRate: number;
    expertiseAreas: string[];
    reputation_score: number;
  }> { const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    const verifications = userAggregate.verifications;
    const totalEndorsements = verifications.reduce((sum, v) => sum + v.endorsements, 0);
    const totalDisputes = verifications.reduce((sum, v) => sum + v.disputes, 0);
    const totalInteractions = totalEndorsements + totalDisputes;

    return {
      totalVerifications: verifications.length,
      averageConfidence: userAggregate.averageVerificationConfidence,
      endorsementRate: totalInteractions > 0 ? totalEndorsements / totalInteractions : 0,
      expertiseAreas: userAggregate.expertiseAreas,
      reputation_score: userAggregate.reputation_score
    };
  }

  async getProfileSuggestions(user_id: string): Promise<string[]> { const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    return this.profileDomainService.suggestProfileImprovements(userAggregate);
  }

  async getRecommendedInterests(user_id: string): Promise<string[]> { const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    return this.profileDomainService.getRecommendedInterests(userAggregate);
  }
}





































