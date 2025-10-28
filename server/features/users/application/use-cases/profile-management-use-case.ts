import { UserRepository } from '../../domain/repositories/user-repository';
import { UserManagementDomainService, ProfileUpdateResult } from '../../domain/services/user-management-domain-service';
import { ProfileDomainService, ProfileValidationResult, ProfileCompletenessScore } from '../../domain/services/profile-domain-service';
import { UserProfile } from '../../domain/entities/user-profile';

export interface UpdateProfileCommand {
  userId: string;
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  isPublic?: boolean;
}

export interface GetProfileCommand {
  userId: string;
}

export interface UpdateInterestsCommand {
  userId: string;
  interests: string[];
}

export interface ProfileManagementResult {
  success: boolean;
  profile?: UserProfile;
  errors: string[];
  warnings?: string[];
}

export interface ProfileCompletenessResult {
  success: boolean;
  completeness?: ProfileCompletenessScore;
  suggestions?: string[];
  errors: string[];
}

export class ProfileManagementUseCase {
  constructor(
    private userRepository: UserRepository,
    private userManagementService: UserManagementDomainService,
    private profileService: ProfileDomainService
  ) {}

  async updateProfile(command: UpdateProfileCommand): Promise<ProfileManagementResult> {
    try {
      // Validate input
      const validationResult = this.validateUpdateCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Update profile through domain service
      const result: ProfileUpdateResult = await this.userManagementService.updateUserProfile(
        command.userId,
        {
          bio: command.bio,
          expertise: command.expertise,
          location: command.location,
          organization: command.organization,
          isPublic: command.isPublic
        }
      );

      if (!result.success) {
        return {
          success: false,
          errors: result.errors,
          warnings: result.warnings
        };
      }

      // Log profile update (cross-cutting concern)
      this.logProfileUpdate(command.userId, 'profile_updated');

      return {
        success: true,
        profile: result.profile,
        errors: [],
        warnings: result.warnings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Profile update failed: ${errorMessage}`]
      };
    }
  }

  async getProfile(command: GetProfileCommand): Promise<ProfileManagementResult> {
    try {
      const userAggregate = await this.userRepository.findUserAggregateById(command.userId);
      if (!userAggregate) {
        return {
          success: false,
          errors: ['User not found']
        };
      }

      return {
        success: true,
        profile: userAggregate.profile || undefined,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Failed to retrieve profile: ${errorMessage}`]
      };
    }
  }

  async updateInterests(command: UpdateInterestsCommand): Promise<ProfileManagementResult> {
    try {
      // Validate input
      const validationResult = this.validateInterestsCommand(command);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Update interests through domain service
      const result = await this.userManagementService.updateUserInterests(command.userId, command.interests);

      if (!result.success) {
        return {
          success: false,
          errors: result.errors
        };
      }

      // Log interests update
      this.logProfileUpdate(command.userId, 'interests_updated');

      return {
        success: true,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Interests update failed: ${errorMessage}`]
      };
    }
  }

  async getProfileCompleteness(userId: string): Promise<ProfileCompletenessResult> {
    try {
      const userAggregate = await this.userRepository.findUserAggregateById(userId);
      if (!userAggregate) {
        return {
          success: false,
          errors: ['User not found']
        };
      }

      const completeness = this.profileService.calculateProfileCompleteness(userAggregate);
      const suggestions = this.profileService.suggestProfileImprovements(userAggregate);

      return {
        success: true,
        completeness,
        suggestions,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Failed to calculate profile completeness: ${errorMessage}`]
      };
    }
  }

  async validateProfile(userId: string): Promise<{ success: boolean; validation?: ProfileValidationResult; errors: string[] }> {
    try {
      const userAggregate = await this.userRepository.findUserAggregateById(userId);
      if (!userAggregate || !userAggregate.profile) {
        return {
          success: false,
          errors: ['Profile not found']
        };
      }

      const validation = this.profileService.validateProfile(userAggregate.profile);

      return {
        success: true,
        validation,
        errors: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [`Profile validation failed: ${errorMessage}`]
      };
    }
  }

  private validateUpdateCommand(command: UpdateProfileCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.userId || !command.userId.trim()) {
      errors.push('User ID is required');
    }

    // Validate bio length
    if (command.bio && command.bio.length > 1000) {
      errors.push('Bio must be 1000 characters or less');
    }

    // Validate expertise array
    if (command.expertise && command.expertise.length > 10) {
      errors.push('Maximum 10 expertise areas allowed');
    }

    if (command.expertise && command.expertise.some(exp => exp.length > 50)) {
      errors.push('Each expertise area must be 50 characters or less');
    }

    // Validate location length
    if (command.location && command.location.length > 100) {
      errors.push('Location must be 100 characters or less');
    }

    // Validate organization length
    if (command.organization && command.organization.length > 200) {
      errors.push('Organization must be 200 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateInterestsCommand(command: UpdateInterestsCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!command.userId || !command.userId.trim()) {
      errors.push('User ID is required');
    }

    if (!Array.isArray(command.interests)) {
      errors.push('Interests must be an array');
    }

    if (command.interests && command.interests.length > 20) {
      errors.push('Maximum 20 interests allowed');
    }

    if (command.interests && command.interests.some(interest => !interest || interest.trim().length === 0)) {
      errors.push('All interests must be non-empty strings');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private logProfileUpdate(userId: string, action: string): void {
    // This would typically use a logging service
    console.log(`Profile ${action} for user: ${userId}`);
  }
}





































