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
  isPublic?: boolean;
}

export interface UserVerificationData {
  billId: number;
  verificationType: string;
  claim: string;
  evidence: Evidence[];
  expertise: ExpertiseLevel;
  reasoning: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  role: string;
  verificationStatus: string;
  organization?: string;
  expertise?: string[];
  reputationScore: number;
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

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  async getUserAggregate(userId: string): Promise<UserAggregate | null> {
    return await this.userRepository.findUserAggregateById(userId);
  }

  async updateUserProfile(userId: string, profileData: UserProfileData): Promise<UserProfile> {
    const result = await this.profileManagementUseCase.updateProfile({
      userId,
      bio: profileData.bio,
      expertise: profileData.expertise,
      location: profileData.location,
      organization: profileData.organization,
      isPublic: profileData.isPublic
    });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.profile!;
  }

  async updateUserInterests(userId: string, interests: string[]): Promise<void> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
    if (!userAggregate) {
      throw new Error('User not found');
    }

    // Remove existing interests
    await this.userRepository.deleteAllInterests(userId);

    // Add new interests
    const interestEntities = interests.map(interest =>
      UserInterest.create({ userId, interest })
    );

    for (const interest of interestEntities) {
      await this.userRepository.saveInterest(interest);
    }
  }

  async getUserProfileCompleteness(userId: string): Promise<ProfileCompletenessScore> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
    if (!userAggregate) {
      throw new Error('User not found');
    }

    return this.profileDomainService.calculateProfileCompleteness(userAggregate);
  }

  async validateUserProfile(userId: string): Promise<ProfileValidationResult> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
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
      id: user.id,
      name: user.name.value,
      role: user.role.value,
      verificationStatus: user.verificationStatus.value,
      reputationScore: user.reputationScore
    }));
  }

  // Verification Management
  async submitVerification(userId: string, verificationData: UserVerificationData): Promise<CitizenVerification> {
    const result = await this.verificationOperationsUseCase.submitVerification({
      userId,
      billId: verificationData.billId,
      verificationType: verificationData.verificationType as any,
      claim: verificationData.claim,
      evidence: verificationData.evidence,
      expertise: verificationData.expertise,
      reasoning: verificationData.reasoning
    });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.verification!;
  }

  async endorseVerification(userId: string, verificationId: string): Promise<void> {
    const result = await this.verificationOperationsUseCase.endorseVerification({
      userId,
      verificationId
    });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }
  }

  async disputeVerification(userId: string, verificationId: string, reason: string): Promise<void> {
    const result = await this.verificationOperationsUseCase.disputeVerification({
      userId,
      verificationId,
      reason
    });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }
  }

  async performFactCheck(billId: number, claim: string): Promise<any[]> {
    const result = await this.verificationOperationsUseCase.performFactCheck({
      billId,
      claim
    });

    if (!result.success) {
      throw new Error(result.errors.join(', '));
    }

    return result.factCheckResults || [];
  }

  // Analytics and Reporting
  async getUserEngagementStats(userId: string): Promise<{
    totalVerifications: number;
    averageConfidence: number;
    endorsementRate: number;
    expertiseAreas: string[];
    reputationScore: number;
  }> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
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
      reputationScore: userAggregate.reputationScore
    };
  }

  async getProfileSuggestions(userId: string): Promise<string[]> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
    if (!userAggregate) {
      throw new Error('User not found');
    }

    return this.profileDomainService.suggestProfileImprovements(userAggregate);
  }

  async getRecommendedInterests(userId: string): Promise<string[]> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
    if (!userAggregate) {
      throw new Error('User not found');
    }

    return this.profileDomainService.getRecommendedInterests(userAggregate);
  }
}




































