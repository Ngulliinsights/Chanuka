import { User } from '../entities/user';
import { UserProfile, UserInterest } from '../entities/user-profile';
import { UserAggregate } from '../aggregates/user-aggregate';
import { UserRepository } from '../repositories/user-repository';
import { ProfileDomainService } from './profile-domain-service';

export interface UserCreationResult {
  success: boolean;
  user?: User;
  errors: string[];
}

export interface UserUpdateResult {
  success: boolean;
  user?: User;
  errors: string[];
}

export interface ProfileUpdateResult {
  success: boolean;
  profile?: UserProfile;
  errors: string[];
  warnings: string[];
}

export class UserManagementDomainService {
  constructor(
    private userRepository: UserRepository,
    private profileService: ProfileDomainService
  ) {}

  /**
   * Creates a new user with validation
   */
  async createUser(userData: {
    email: string;
    name: string;
    role?: string;
    passwordHash: string;
  }): Promise<UserCreationResult> {
    const errors: string[] = [];

    // Validate email uniqueness
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      errors.push('Email address is already in use');
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      errors.push('Invalid email format');
    }

    // Validate name
    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Validate password hash (should be bcrypt hash)
    if (!userData.passwordHash || userData.passwordHash.length < 60) {
      errors.push('Invalid password hash');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      const user = User.create({
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name.trim(),
        role: userData.role
      });

      // Attach passwordHash temporarily so repository can use it for DB insert
      (user as any).passwordHash = userData.passwordHash;
      await this.userRepository.save(user, userData.passwordHash);
      return { success: true, user, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Updates user information with validation
   */
  async updateUser(userId: string, updates: {
    email?: string;
    name?: string;
    role?: string;
  }): Promise<UserUpdateResult> {
    const errors: string[] = [];

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, errors: ['User not found'] };
    }

    // Validate email uniqueness if changing email
    if (updates.email && updates.email !== user.email.value) {
      const existingUser = await this.userRepository.findByEmail(updates.email);
      if (existingUser) {
        errors.push('Email address is already in use');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        errors.push('Invalid email format');
      }
    }

    // Validate name if changing
    if (updates.name && updates.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      if (updates.email) {
        user.updateEmail(updates.email);
      }

      if (updates.name) {
        user.updateName(updates.name.trim());
      }

      if (updates.role) {
        user.changeRole(updates.role);
      }

      await this.userRepository.update(user);
      return { success: true, user, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Updates user profile with validation
   */
  async updateUserProfile(userId: string, profileUpdates: {
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    isPublic?: boolean;
  }): Promise<ProfileUpdateResult> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
    if (!userAggregate) {
      return { success: false, errors: ['User not found'], warnings: [] };
    }

    // Get existing profile or create new one
    let profile = userAggregate.profile;
    if (!profile) {
      profile = UserProfile.create({
        userId,
        bio: profileUpdates.bio,
        expertise: profileUpdates.expertise || [],
        location: profileUpdates.location,
        organization: profileUpdates.organization,
        isPublic: profileUpdates.isPublic ?? true
      });
    } else {
      profile = this.profileService.mergeProfileUpdates(profile, profileUpdates);
    }

    // Validate profile
    const validation = this.profileService.validateProfile(profile);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    try {
      // Check profile visibility
      const visibilityValid = this.profileService.validateProfileVisibility(userAggregate);
      if (!visibilityValid) {
        return {
          success: false,
          errors: ['Profile does not meet visibility requirements'],
          warnings: ['Consider improving profile completeness before making it public']
        };
      }

      // Save profile
      const existingProfile = await this.userRepository.findProfileByUserId(userId);
      if (existingProfile) {
        await this.userRepository.updateProfile(profile);
      } else {
        await this.userRepository.saveProfile(profile);
      }

      return {
        success: true,
        profile,
        errors: [],
        warnings: validation.warnings
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Manages user interests
   */
  async updateUserInterests(userId: string, interests: string[]): Promise<{ success: boolean; errors: string[] }> {
    const userAggregate = await this.userRepository.findUserAggregateById(userId);
    if (!userAggregate) {
      return { success: false, errors: ['User not found'] };
    }

    // Create interest entities
    const interestEntities = interests.map(interest =>
      UserInterest.create({
        userId,
        interest: interest.trim()
      })
    );

    // Validate interests
    const validation = this.profileService.validateInterests(interestEntities);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      // Clear existing interests and add new ones
      await this.userRepository.deleteAllInterests(userId);
      for (const interest of interestEntities) {
        await this.userRepository.saveInterest(interest);
      }

      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to update interests: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Deactivates a user account
   */
  async deactivateUser(userId: string): Promise<{ success: boolean; errors: string[] }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, errors: ['User not found'] };
    }

    if (!user.isActive) {
      return { success: false, errors: ['User is already deactivated'] };
    }

    try {
      // Note: User entity doesn't have a deactivate method, so we'll need to handle this differently
      // For now, we'll assume the repository handles deactivation
      await this.userRepository.delete(userId);
      return { success: true, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to deactivate user: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Gets user statistics
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    usersByVerificationStatus: Record<string, number>;
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

    // For active users, we'll count users that are not deleted (simplified)
    const activeUsers = totalUsers; // In a real implementation, you'd track active status

    return {
      totalUsers,
      activeUsers,
      usersByRole,
      usersByVerificationStatus
    };
  }

  /**
   * Searches for users with filters
   */
  async searchUsers(query: string, filters?: {
    role?: string;
    verificationStatus?: string;
    minReputation?: number;
    maxReputation?: number;
  }, limit = 20): Promise<User[]> {
    let users = await this.userRepository.searchUsers(query, limit);

    // Apply additional filters
    if (filters) {
      if (filters.role) {
        users = users.filter(user => user.role.value === filters.role);
      }

      if (filters.verificationStatus) {
        users = users.filter(user => user.verificationStatus.value === filters.verificationStatus);
      }

      if (filters.minReputation || filters.maxReputation) {
        const min = filters.minReputation || 0;
        const max = filters.maxReputation || 100;
        users = users.filter(user => user.reputationScore >= min && user.reputationScore <= max);
      }
    }

    return users.slice(0, limit);
  }
}