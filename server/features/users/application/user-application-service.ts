import { UserRepository } from '../domain/repositories/user-repository';
import { VerificationRepository } from '../domain/repositories/verification-repository';
import { VerificationDomainService } from '../domain/services/verification-domain-service';
import { ProfileDomainService, ProfileValidationResult, ProfileCompletenessScore } from '../domain/services/profile-domain-service';
import { UserAggregate } from '../domain/aggregates/user-aggregate';
import { User } from '../domain/entities/user';
import { UserProfile, UserInterest } from '../domain/entities/user-profile';
import { CitizenVerification } from '../domain/entities/citizen-verification';
import { Evidence, ExpertiseLevel } from '../domain/entities/value-objects';

// Import use cases
import {
  UserRegistrationUseCase,
  ProfileManagementUseCase,
  VerificationOperationsUseCase,
  RegisterUserCommand,
  UpdateProfileCommand,
  SubmitVerificationCommand,
  EndorseVerificationCommand,
  DisputeVerificationCommand,
  PerformFactCheckCommand
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
    private userRepository: UserRepository,
    private verificationRepository: VerificationRepository,
    private verificationDomainService: VerificationDomainService,
    private profileDomainService: ProfileDomainService
  ) {
    // Initialize use cases
    this.userRegistrationUseCase = new UserRegistrationUseCase(
      this.userRepository,
      new (require('../domain/services/user-management-domain-service').UserManagementDomainService)(
        this.userRepository,
        this.profileDomainService
      )
    );

    this.profileManagementUseCase = new ProfileManagementUseCase(
      this.userRepository,
      new (require('../domain/services/user-management-domain-service').UserManagementDomainService)(
        this.userRepository,
        this.profileDomainService
      ),
      this.profileDomainService
    );

    this.verificationOperationsUseCase = new VerificationOperationsUseCase(
      this.userRepository,
      this.verificationRepository,
      this.verificationDomainService
    );
  }

  private userRegistrationUseCase: UserRegistrationUseCase;
  private profileManagementUseCase: ProfileManagementUseCase;
  private verificationOperationsUseCase: VerificationOperationsUseCase;

  // User Management
  async registerUser(command: RegisterUserCommand) {
    return await this.userRegistrationUseCase.execute(command);
  }

  async getUserById(user_id: string): Promise<User | null> { return await this.userRepository.findById(user_id);
   }

  async getUserAggregate(user_id: string): Promise<UserAggregate | null> { return await this.userRepository.findUserAggregateById(user_id);
   }

  async updateUserProfile(user_id: string, profileData: UserProfileData): Promise<UserProfile> { const result = await this.profileManagementUseCase.updateProfile({
      user_id,
      bio: profileData.bio,
      expertise: profileData.expertise,
      location: profileData.location,
      organization: profileData.organization,
      is_public: profileData.is_public
     });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.profile!;
  }

  async updateUserInterests(user_id: string, interests: string[]): Promise<void> { const userAggregate = await this.userRepository.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    // Remove existing interests
    await this.userRepository.deleteAllInterests(user_id);

    // Add new interests
    const interestEntities = interests.map(interest =>
      UserInterest.create({ user_id, interest  })
    );

    for (const interest of interestEntities) {
      await this.userRepository.saveInterest(interest);
    }
  }

  async getUserProfileCompleteness(user_id: string): Promise<ProfileCompletenessScore> { const userAggregate = await this.userRepository.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    return this.profileDomainService.calculateProfileCompleteness(userAggregate);
  }

  async validateUserProfile(user_id: string): Promise<ProfileValidationResult> { const userAggregate = await this.userRepository.findUserAggregateById(user_id);
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
    const users = await this.userRepository.searchUsers(query, limit);

    return users.map(user => ({
      id: users.id,
      name: users.name.value,
      role: users.role.value,
      verification_status: users.verification_status.value,
      reputation_score: users.reputation_score
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
  }> { const userAggregate = await this.userRepository.findUserAggregateById(user_id);
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

  async getProfileSuggestions(user_id: string): Promise<string[]> { const userAggregate = await this.userRepository.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    return this.profileDomainService.suggestProfileImprovements(userAggregate);
  }

  async getRecommendedInterests(user_id: string): Promise<string[]> { const userAggregate = await this.userRepository.findUserAggregateById(user_id);
    if (!userAggregate) {
      throw new Error('User not found');
     }

    return this.profileDomainService.getRecommendedInterests(userAggregate);
  }
}





































