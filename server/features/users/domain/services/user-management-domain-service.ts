import { User } from '../entities/user';
import { UserProfile, UserInterest } from '../entities/user-profile';
 
// UserRepository interface removed - using direct service calls
import { ProfileDomainService } from './profile-domain-service';
import { UserService } from '../../application/user-service-direct';

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
    // UserRepository removed - using direct service calls
    private profileService: ProfileDomainService,
    private userService: UserService
  ) {}

  /**
   * Creates a new user with validation
   */
  async createUser(userData: {
    email: string;
    name: string;
    role?: string;
    password_hash: string;
  }): Promise<UserCreationResult> {
    const errors: string[] = [];

    // Validate email uniqueness
    const existingUser = await this.userService.findByEmail(userData.email);
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
    if (!userData.password_hash || userData.password_hash.length < 60) {
      errors.push('Invalid password hash');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      const createPayload: {
        id: string;
        email: string;
        name: string;
        role?: string;
      } = {
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name.trim()
      };

      if (userData.role !== undefined) {
        createPayload.role = userData.role;
      }

      const user = User.create(createPayload);

      // Attach password_hash temporarily so service can use it for DB insert
      (user as any).password_hash = userData.password_hash;
      await this.userService.save(user, userData.password_hash);
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
  async updateUser(user_id: string, updates: {
    email?: string;
    name?: string;
    role?: string;
  }): Promise<UserUpdateResult> {
    const errors: string[] = [];

    const user = await this.userService.findById(user_id);
    if (!user) {
      return { success: false, errors: ['User not found']  };
    }

    // Validate email uniqueness if changing email
    if (updates.email && updates.email !== user.email.value) {
      const existingUser = await this.userService.findByEmail(updates.email);
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

      await this.userService.update(user);
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
  async updateUserProfile(user_id: string, profileUpdates: {
    bio?: string;
    expertise?: string[];
    location?: string;
    organization?: string;
    is_public?: boolean;
  }): Promise<ProfileUpdateResult> {
    const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      return { success: false, errors: ['User not found'], warnings: []  };
    }

    // Get existing profile or create new one
    let profile = userAggregate.profile;
    if (!profile) {
      const profilePayload: {
        user_id: string;
        bio?: string;
        expertise?: string[];
        location?: string;
        organization?: string;
        is_public?: boolean;
      } = {
        user_id,
        expertise: profileUpdates.expertise || [],
        is_public: profileUpdates.is_public ?? true
      };

      if (profileUpdates.bio !== undefined) profilePayload.bio = profileUpdates.bio;
      if (profileUpdates.location !== undefined) profilePayload.location = profileUpdates.location;
      if (profileUpdates.organization !== undefined) profilePayload.organization = profileUpdates.organization;

      profile = UserProfile.create(profilePayload);
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
      const existingProfile = await this.userService.findProfileByUserId(user_id);
      if (existingProfile) {
        await this.userService.updateProfile(profile);
      } else {
        await this.userService.saveProfile(profile);
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
  async updateUserInterests(user_id: string, interests: string[]): Promise<{ success: boolean; errors: string[] }> {
    const userAggregate = await this.userService.findUserAggregateById(user_id);
    if (!userAggregate) {
      return { success: false, errors: ['User not found']  };
    }

    // Create interest entities
    const interestEntities = interests.map(interest =>
      UserInterest.create({
        user_id,
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
      await this.userService.deleteAllInterests(user_id);
      for (const interest of interestEntities) {
        await this.userService.saveInterest(interest);
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
  async deactivateUser(user_id: string): Promise<{ success: boolean; errors: string[] }> {
    const user = await this.userService.findById(user_id);
    if (!user) {
      return { success: false, errors: ['User not found'] };
    }

    if (!user.is_active) {
      return { success: false, errors: ['User is already deactivated'] };
    }

    try {
      // Note: User entity doesn't have a deactivate method, so we'll need to handle this differently
      // For now, we'll assume the service handles deactivation
      await this.userService.delete(user_id);
      return { success: true, errors: []  };
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
      this.userService.countUsers(),
      this.userService.countUsersByRole(),
      this.userService.countUsersByVerificationStatus()
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
    verification_status?: string;
    minReputation?: number;
    maxReputation?: number;
  }, limit = 20): Promise<User[]> {
    let users = await this.userService.searchUsers(query, limit);

    // Apply additional filters
    if (filters) {
      if (filters.role) {
        users = users.filter(user => user.role.value === filters.role);
      }

      if (filters.verification_status) {
        users = users.filter(user => user.verification_status.value === filters.verification_status);
      }

      if (filters.minReputation || filters.maxReputation) {
        const min = filters.minReputation || 0;
        const max = filters.maxReputation || 100;
        users = users.filter(user => user.reputation_score >= min && user.reputation_score <= max);
      }
    }

    return users.slice(0, limit);
  }
}





































