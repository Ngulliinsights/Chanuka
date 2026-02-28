import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { UserAggregate } from '@shared/domain/aggregates/user-aggregate';
import { CitizenVerification } from '@shared/domain/entities/citizen-verification';
import { User } from '@shared/domain/entities/user';
import { UserInterest,UserProfile } from '@shared/domain/entities/user-profile';
import { user_profiles,users } from '@server/infrastructure/schema';
import { and, eq, like, or,sql } from 'drizzle-orm';
import { inputSanitizationService, queryValidationService, securityAuditService } from '@server/features/security';

/**
 * UserService - Direct Drizzle implementation replacing UserRepository
 * 
 * This service uses direct Drizzle ORM queries instead of the repository pattern,
 * maintaining the same interface compatibility for the service layer.
 */
export class UserService {
  /**
   * Maps database row to User domain entity with proper type safety
   */
  private mapToUser(row: typeof users.$inferSelect): User {
    return User.create({
      id: row.id,
      email: row.email,
      name: row.email, // Use email as name since display_name/first_name/last_name not in users table
      role: row.role,
      verification_status: row.is_verified ? 'verified' : 'pending',
      is_active: row.is_active,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reputation_score: 0 // Calculated field, not stored in users table
    });
  }

  /**
   * Maps database row to UserProfile domain entity
   */
  private mapToUserProfile(row: typeof user_profiles.$inferSelect): UserProfile {
    return UserProfile.create({
      id: row.id,
      user_id: row.user_id,
      first_name: row.first_name || undefined,
      last_name: row.last_name || undefined,
      display_name: row.display_name || undefined,
      bio: row.bio || undefined,
      county: row.county || undefined,
      constituency: row.constituency || undefined,
      ward: row.ward || undefined,
      avatar_url: row.avatar_url || undefined,
      website: row.website || undefined,
      preferences: (row.preferences as Record<string, unknown>) || {},
      privacy_settings: (row.privacy_settings as Record<string, unknown>) || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async findById(id: string): Promise<User | null> {
    try {
      // 1. Validate input
      const validation = queryValidationService.validateInputs([id]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid user ID: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize input
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      const result = await readDatabase
        .select()
        .from(users)
        .where(eq(users.id, sanitizedId))
        .limit(1);

      const user = result[0] ? this.mapToUser(result[0]) : null;

      // 3. Audit log
      if (user) {
        await securityAuditService.logSecurityEvent({
          eventType: 'user_accessed',
          userId: sanitizedId,
          ipAddress: 'internal',
          userAgent: 'user-service',
          resource: `user:${sanitizedId}`,
          action: 'read',
          timestamp: new Date(),
          metadata: { operation: 'findById' }
        });
      }

      return user;
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      // 1. Validate input
      const validation = queryValidationService.validateInputs([email]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid email: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize input
      const sanitizedEmail = inputSanitizationService.sanitizeString(email);

      const result = await readDatabase
        .select()
        .from(users)
        .where(eq(users.email, sanitizedEmail))
        .limit(1);

      const user = result[0] ? this.mapToUser(result[0]) : null;

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'user_lookup',
        userId: undefined,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: 'users',
        action: 'search',
        timestamp: new Date(),
        metadata: { operation: 'findByEmail', found: !!user }
      });

      return user;
    } catch (error) {
      logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  async save(user: User, password_hash?: string): Promise<void> {
    try {
      const userData = user.toJSON();

      // 1. Validate inputs
      const validation = queryValidationService.validateInputs([
        userData.id,
        userData.email
      ]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid user data: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize inputs
      const sanitizedEmail = inputSanitizationService.sanitizeString(userData.email);

      const insertPayload = {
        id: userData.id,
        email: sanitizedEmail,
        password_hash: password_hash || '',
        role: userData.role,
        is_verified: userData.verification_status === 'verified',
        is_active: userData.is_active,
        last_login_at: userData.last_login_at,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };

      await withTransaction(async (tx) => {
        await tx.insert(users).values(insertPayload);
      });
      
      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'user_created',
        userId: userData.id,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: `user:${userData.id}`,
        action: 'create',
        timestamp: new Date(),
        metadata: { 
          operation: 'save',
          email: sanitizedEmail,
          role: userData.role
        }
      });

      logger.info('User saved successfully', { user_id: userData.id });
    } catch (error) {
      logger.error('Error saving user', { user_id: user.id, error });
      throw error;
    }
  }

  async update(user: User): Promise<void> {
    try {
      const userData = user.toJSON();

      // 1. Validate inputs
      const validation = queryValidationService.validateInputs([
        userData.id,
        userData.email
      ]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid user data: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize inputs
      const sanitizedEmail = inputSanitizationService.sanitizeString(userData.email);

      await withTransaction(async (tx) => {
        await tx
          .update(users)
          .set({
            email: sanitizedEmail,
            role: userData.role,
            is_verified: userData.verification_status === 'verified',
            is_active: userData.is_active,
            last_login_at: userData.last_login_at,
            updated_at: userData.updated_at
          })
          .where(eq(users.id, userData.id));
      });

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'user_updated',
        userId: userData.id,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: `user:${userData.id}`,
        action: 'update',
        timestamp: new Date(),
        metadata: { 
          operation: 'update',
          email: sanitizedEmail
        }
      });

      logger.info('User updated successfully', { user_id: userData.id });
    } catch (error) {
      logger.error('Error updating user', { user_id: user.id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // 1. Validate input
      const validation = queryValidationService.validateInputs([id]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid user ID: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize input
      const sanitizedId = inputSanitizationService.sanitizeString(id);

      await withTransaction(async (tx) => {
        await tx.delete(users).where(eq(users.id, sanitizedId));
      });

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'user_deleted',
        userId: sanitizedId,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: `user:${sanitizedId}`,
        action: 'delete',
        timestamp: new Date(),
        metadata: { operation: 'delete' }
      });

      logger.info('User deleted successfully', { user_id: sanitizedId });
    } catch (error) {
      logger.error('Error deleting user', { user_id: id, error });
      throw error;
    }
  }

  // ============================================================================
  // PROFILE OPERATIONS
  // ============================================================================

  async findProfileByUserId(user_id: string): Promise<UserProfile | null> {
    try {
      const result = await readDatabase
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, user_id))
        .limit(1);

      return result[0] ? this.mapToUserProfile(result[0]) : null;
    } catch (error) {
      logger.error('Error finding user profile', { user_id, error });
      throw error;
    }
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      const profileData = profile.toJSON();

      // 1. Validate inputs
      const validation = queryValidationService.validateInputs([
        profileData.id,
        profileData.user_id
      ]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid profile data: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize inputs
      const sanitizedData = {
        id: profileData.id,
        user_id: profileData.user_id,
        first_name: profileData.first_name ? inputSanitizationService.sanitizeString(profileData.first_name) : undefined,
        last_name: profileData.last_name ? inputSanitizationService.sanitizeString(profileData.last_name) : undefined,
        display_name: profileData.display_name ? inputSanitizationService.sanitizeString(profileData.display_name) : undefined,
        bio: profileData.bio ? inputSanitizationService.sanitizeHtml(profileData.bio) : undefined,
        county: profileData.county ? inputSanitizationService.sanitizeString(profileData.county) : undefined,
        constituency: profileData.constituency ? inputSanitizationService.sanitizeString(profileData.constituency) : undefined,
        ward: profileData.ward ? inputSanitizationService.sanitizeString(profileData.ward) : undefined,
        avatar_url: profileData.avatar_url,
        website: profileData.website,
        preferences: profileData.preferences,
        privacy_settings: profileData.privacy_settings,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };

      await withTransaction(async (tx) => {
        await tx.insert(user_profiles).values(sanitizedData);
      });
      
      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'profile_created',
        userId: profileData.user_id,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: `profile:${profileData.user_id}`,
        action: 'create',
        timestamp: new Date(),
        metadata: { operation: 'saveProfile' }
      });

      logger.info('User profile saved successfully', { user_id: profileData.user_id });
    } catch (error) {
      logger.error('Error saving user profile', { user_id: profile.user_id, error });
      throw error;
    }
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    try {
      const profileData = profile.toJSON();

      // 1. Validate inputs
      const validation = queryValidationService.validateInputs([profileData.user_id]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid profile data: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize inputs
      const sanitizedData = {
        first_name: profileData.first_name ? inputSanitizationService.sanitizeString(profileData.first_name) : undefined,
        last_name: profileData.last_name ? inputSanitizationService.sanitizeString(profileData.last_name) : undefined,
        display_name: profileData.display_name ? inputSanitizationService.sanitizeString(profileData.display_name) : undefined,
        bio: profileData.bio ? inputSanitizationService.sanitizeHtml(profileData.bio) : undefined,
        county: profileData.county ? inputSanitizationService.sanitizeString(profileData.county) : undefined,
        constituency: profileData.constituency ? inputSanitizationService.sanitizeString(profileData.constituency) : undefined,
        ward: profileData.ward ? inputSanitizationService.sanitizeString(profileData.ward) : undefined,
        avatar_url: profileData.avatar_url,
        website: profileData.website,
        preferences: profileData.preferences,
        privacy_settings: profileData.privacy_settings,
        updated_at: profileData.updated_at
      };

      await withTransaction(async (tx) => {
        await tx
          .update(user_profiles)
          .set(sanitizedData)
          .where(eq(user_profiles.user_id, profileData.user_id));
      });

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'profile_updated',
        userId: profileData.user_id,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: `profile:${profileData.user_id}`,
        action: 'update',
        timestamp: new Date(),
        metadata: { operation: 'updateProfile' }
      });

      logger.info('User profile updated successfully', { user_id: profileData.user_id });
    } catch (error) {
      logger.error('Error updating user profile', { user_id: profile.user_id, error });
      throw error;
    }
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  async findUsersByRole(role: string): Promise<User[]> {
    try {
      const results = await readDatabase
        .select()
        .from(users)
        .where(eq(users.role, role));

      return results.map(result => this.mapToUser(result));
    } catch (error) {
      logger.error('Error finding users by role', { role, error });
      throw error;
    }
  }

  async findUsersByVerificationStatus(status: string): Promise<User[]> {
    try {
      const is_verified = status === 'verified';
      const results = await readDatabase
        .select()
        .from(users)
        .where(eq(users.is_verified, is_verified));

      return results.map(result => this.mapToUser(result));
    } catch (error) {
      logger.error('Error finding users by verification status', { status, error });
      throw error;
    }
  }

  async searchUsers(query: string, limit?: number): Promise<User[]> {
    try {
      // 1. Validate input
      const validation = queryValidationService.validateInputs([query]);
      if (validation.hasErrors()) {
        throw new Error(`Invalid search query: ${validation.getErrorMessage()}`);
      }

      // 2. Sanitize input and create safe LIKE pattern
      const sanitizedQuery = inputSanitizationService.sanitizeString(query);
      const safePattern = inputSanitizationService.createSafeLikePattern(sanitizedQuery);
      const searchTerm = `%${safePattern.toLowerCase()}%`;

      const results = await readDatabase
        .select()
        .from(users)
        .where(
          sql`LOWER(${users.email}) LIKE ${searchTerm}`
        )
        .limit(limit || 10);

      // 3. Audit log
      await securityAuditService.logSecurityEvent({
        eventType: 'user_search',
        userId: undefined,
        ipAddress: 'internal',
        userAgent: 'user-service',
        resource: 'users',
        action: 'search',
        timestamp: new Date(),
        metadata: { 
          operation: 'searchUsers',
          query: sanitizedQuery,
          result_count: results.length
        }
      });

      return results.map(result => this.mapToUser(result));
    } catch (error) {
      logger.error('Error searching users', { query, error });
      throw error;
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async countUsers(): Promise<number> {
    try {
      const result = await readDatabase
        .select({ value: sql<number>`count(*)` })
        .from(users);

      return Number(result[0]?.value ?? 0);
    } catch (error) {
      logger.error('Error counting users', { error });
      throw error;
    }
  }

  async countUsersByRole(): Promise<Record<string, number>> {
    try {
      const results = await readDatabase
        .select({
          role: users.role,
          count: sql<number>`count(*)`
        })
        .from(users)
        .groupBy(users.role);

      const roleCounts: Record<string, number> = {};
      results.forEach(result => {
        roleCounts[result.role] = Number(result.count);
      });

      return roleCounts;
    } catch (error) {
      logger.error('Error counting users by role', { error });
      throw error;
    }
  }

  async countUsersByVerificationStatus(): Promise<Record<string, number>> {
    try {
      const results = await readDatabase
        .select({
          status: sql<string>`CASE WHEN ${users.is_verified} THEN 'verified' ELSE 'pending' END`,
          count: sql<number>`count(*)`
        })
        .from(users)
        .groupBy(users.is_verified);

      const statusCounts: Record<string, number> = {};
      results.forEach(result => {
        statusCounts[result.status] = Number(result.count);
      });

      return statusCounts;
    } catch (error) {
      logger.error('Error counting users by verification status', { error });
      throw error;
    }
  }

  // ============================================================================
  // AGGREGATE OPERATIONS (Simplified - not fully implemented)
  // ============================================================================

  async findUserAggregateById(id: string): Promise<UserAggregate | null> {
    try {
      // Get user
      const user = await this.findById(id);
      if (!user) return null;

      // Get profile
      const profile = await this.findProfileByUserId(id);

      // Create simplified aggregate (interests and verifications would need proper tables)
      const aggregate = UserAggregate.create({
        user,
        profile: profile || undefined,
        interests: [], // Would need user_interests table
        verifications: [] // Would need user_verifications table
      });

      return aggregate;
    } catch (error) {
      logger.error('Error finding user aggregate', { id, error });
      throw error;
    }
  }

  // ============================================================================
  // PLACEHOLDER METHODS (Not implemented - would need additional tables)
  // ============================================================================

  async findInterestsByUserId(user_id: string): Promise<UserInterest[]> {
    // Would need user_interests table
    logger.warn('findInterestsByUserId not implemented - user_interests table missing');
    return [];
  }

  async saveInterest(interest: UserInterest): Promise<void> {
    // Would need user_interests table
    logger.warn('saveInterest not implemented - user_interests table missing');
  }

  async deleteInterest(user_id: string, interest: string): Promise<void> {
    // Would need user_interests table
    logger.warn('deleteInterest not implemented - user_interests table missing');
  }

  async deleteAllInterests(user_id: string): Promise<void> {
    // Would need user_interests table
    logger.warn('deleteAllInterests not implemented - user_interests table missing');
  }

  async findVerificationsByUserId(user_id: string): Promise<CitizenVerification[]> {
    // Would need user_verifications table
    logger.warn('findVerificationsByUserId not implemented - user_verifications table missing');
    return [];
  }

  async findVerificationById(id: string): Promise<CitizenVerification | null> {
    // Would need user_verifications table
    logger.warn('findVerificationById not implemented - user_verifications table missing');
    return null;
  }

  async saveVerification(verification: CitizenVerification): Promise<void> {
    // Would need user_verifications table
    logger.warn('saveVerification not implemented - user_verifications table missing');
  }

  async updateVerification(verification: CitizenVerification): Promise<void> {
    // Would need user_verifications table
    logger.warn('updateVerification not implemented - user_verifications table missing');
  }

  async saveUserAggregate(aggregate: UserAggregate): Promise<void> {
    // Would need to coordinate multiple table operations
    logger.warn('saveUserAggregate not implemented - requires multiple table coordination');
  }

  async findUsersByReputationRange(min: number, max: number): Promise<User[]> {
    // Reputation is not stored in users table - would require domain service coordination
    logger.warn('findUsersByReputationRange not implemented - reputation not stored in users table');
    return [];
  }
}

// Factory function for dependency injection
export function createUserService(): UserService {
  return new UserService();
}


