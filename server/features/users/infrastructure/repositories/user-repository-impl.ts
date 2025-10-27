import { database as db } from '@shared/database/connection';
import { users, userProfiles, userInterests, verifications } from '@shared/schema/schema';
import { eq, and, sql, or } from 'drizzle-orm';
import { UserRepository } from '../../domain/repositories/user-repository';
import { User } from '../../domain/entities/user';
import { UserProfile, UserInterest } from '../../domain/entities/user-profile';
import { CitizenVerification } from '../../domain/entities/citizen-verification';
import { UserAggregate } from '../../domain/aggregates/user-aggregate';

export class UserRepositoryImpl implements UserRepository {
  /**
   * Maps database row to User domain entity
   * Handles fields that may exist in domain but not in DB schema
   */
  private mapToUser(row: any): User {
    return User.create({
      id: row.id,
      email: row.email,
      name: row.name || `${row.firstName} ${row.lastName}`,
      role: row.role,
      verificationStatus: row.verificationStatus,
      isActive: row.isActive ?? true,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // reputationScore may be calculated from userProfiles or other sources
      reputationScore: row.reputationScore ?? 0
    });
  }

  /**
   * Maps database row to UserProfile domain entity
   * Handles default values for optional fields
   */
  private mapToUserProfile(row: any): UserProfile {
    return UserProfile.create({
      userId: row.userId,
      bio: row.bio,
      expertise: row.expertise || [],
      location: row.location,
      organization: row.organization,
      reputationScore: row.reputationScore,
      isPublic: row.isPublic ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  /**
   * Maps database row to CitizenVerification domain entity
   * Properly transforms nested structures like evidence and expertise
   */
  private mapToVerification(row: any): CitizenVerification {
    const evidence = Array.isArray(row.evidence) 
      ? row.evidence.map((e: any) => ({
          type: e.type,
          source: e.source,
          url: e.url,
          credibility: e.credibility,
          relevance: e.relevance,
          description: e.description,
          datePublished: e.datePublished
        })) 
      : [];

    const expertise = row.expertise ? {
      domain: row.expertise.domain,
      level: row.expertise.level,
      credentials: row.expertise.credentials,
      verifiedCredentials: row.expertise.verifiedCredentials,
      reputationScore: row.expertise.reputationScore
    } : {};

    return CitizenVerification.create({
      id: row.id,
      billId: row.billId,
      citizenId: row.userId, // Map userId to citizenId for domain compatibility
      verificationType: row.verificationType as any,
      verificationStatus: row.verificationStatus as any,
      confidence: Number(row.confidence),
      evidence: evidence as any,
      expertise: expertise as any,
      reasoning: row.reasoning,
      endorsements: row.endorsements,
      disputes: row.disputes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ? this.mapToUser(result[0]) : null;
  }

  async save(user: User, passwordHash?: string): Promise<void> {
    const userData = user.toJSON();
    // Build insert payload matching the `users` table schema.
    // passwordHash is required by the DB; accept it optionally from caller.
    const insertPayload: any = {
      email: userData.email,
      name: userData.name,
      role: userData.role as "citizen" | "expert" | "admin" | "journalist" | "advocate",
      verificationStatus: userData.verificationStatus as "pending" | "verified" | "disputed" | "rejected",
      isActive: userData.isActive,
      lastLoginAt: userData.lastLoginAt,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };

    // If caller provided a passwordHash on the User domain or via optional arg, include it.
    // Note: Users table requires passwordHash; repository save should be called with it when creating.
    // prefer explicit parameter; fallback to property on the domain object
    insertPayload.passwordHash = passwordHash ?? (user as any).passwordHash;

    await db.insert(users).values(insertPayload);
  }

  async update(user: User): Promise<void> {
    const userData = user.toJSON();
    // Update only fields that exist in the database schema
    await db
      .update(users)
      .set({
        email: userData.email,
        name: userData.name,
        role: userData.role as "citizen" | "expert" | "admin" | "journalist" | "advocate",
        verificationStatus: userData.verificationStatus as "pending" | "verified" | "disputed" | "rejected",
        isActive: userData.isActive,
        lastLoginAt: userData.lastLoginAt,
        updatedAt: userData.updatedAt
        // Note: reputationScore is not stored in users table
      })
      .where(eq(users.id, userData.id));
  }

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async findProfileByUserId(userId: string): Promise<UserProfile | null> {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return result[0] ? this.mapToUserProfile(result[0]) : null;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const profileData = profile.toJSON();
    await db.insert(userProfiles).values({
      userId: profileData.userId,
      bio: profileData.bio,
      expertise: profileData.expertise,
      location: profileData.location,
      organization: profileData.organization,
      reputationScore: profileData.reputationScore,
      isPublic: profileData.isPublic,
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt
    });
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    const profileData = profile.toJSON();
    await db
      .update(userProfiles)
      .set({
        bio: profileData.bio,
        expertise: profileData.expertise,
        location: profileData.location,
        organization: profileData.organization,
        reputationScore: profileData.reputationScore,
        isPublic: profileData.isPublic,
        updatedAt: profileData.updatedAt
      })
      .where(eq(userProfiles.userId, profileData.userId));
  }

  async findInterestsByUserId(userId: string): Promise<UserInterest[]> {
    const results = await db
      .select()
      .from(userInterests)
      .where(eq(userInterests.userId, userId));

    return results.map(result =>
      UserInterest.create({
        userId: result.userId,
        interest: result.interest,
        createdAt: result.createdAt
      })
    );
  }

  async saveInterest(interest: UserInterest): Promise<void> {
    const interestData = interest.toJSON();
    await db.insert(userInterests).values({
      userId: interestData.userId,
      interest: interestData.interest,
      createdAt: interestData.createdAt
    });
  }

  async deleteInterest(userId: string, interest: string): Promise<void> {
    await db
      .delete(userInterests)
      .where(and(
        eq(userInterests.userId, userId),
        eq(userInterests.interest, interest)
      ));
  }

  async deleteAllInterests(userId: string): Promise<void> {
    await db.delete(userInterests).where(eq(userInterests.userId, userId));
  }

  async findVerificationsByUserId(userId: string): Promise<CitizenVerification[]> {
    const results = await db
      .select()
      .from(verifications)
      .where(eq(verifications.userId, userId));

    return results.map(result => this.mapToVerification(result));
  }

  async findVerificationById(id: string): Promise<CitizenVerification | null> {
    const result = await db
      .select()
      .from(verifications)
      .where(eq(verifications.id, id))
      .limit(1);

    return result[0] ? this.mapToVerification(result[0]) : null;
  }

  async saveVerification(verification: CitizenVerification): Promise<void> {
    const verificationData = verification.toJSON();
    // Include the id field as it's required by the schema
    await db.insert(verifications).values({
      id: verificationData.id,
      billId: verificationData.billId,
      userId: verificationData.citizenId,
      userRole: 'citizen' as const,
      verificationType: verificationData.verificationType,
      verificationStatus: verificationData.verificationStatus,
      confidence: verificationData.confidence,
      evidence: verificationData.evidence,
      expertise: verificationData.expertise,
      reasoning: verificationData.reasoning,
      endorsements: verificationData.endorsements,
      disputes: verificationData.disputes,
      createdAt: verificationData.createdAt,
      updatedAt: verificationData.updatedAt
    });
  }

  async updateVerification(verification: CitizenVerification): Promise<void> {
    const verificationData = verification.toJSON();
    await db
      .update(verifications)
      .set({
        verificationStatus: verificationData.verificationStatus,
        confidence: verificationData.confidence,
        evidence: verificationData.evidence,
        expertise: verificationData.expertise,
        reasoning: verificationData.reasoning,
        endorsements: verificationData.endorsements,
        disputes: verificationData.disputes,
        updatedAt: verificationData.updatedAt
      })
      .where(eq(verifications.id, verificationData.id));
  }

  /**
   * Loads complete user aggregate with all related entities
   * This is more efficient than loading each piece separately in application code
   */
  async findUserAggregateById(id: string): Promise<UserAggregate | null> {
    const user = await this.findById(id);
    if (!user) return null;

    // Parallel loading of related entities for better performance
    const [profile, interests, verifications] = await Promise.all([
      this.findProfileByUserId(id),
      this.findInterestsByUserId(id),
      this.findVerificationsByUserId(id)
    ]);

    return UserAggregate.create({
      user,
      profile: profile || undefined,
      interests,
      verifications
    });
  }

  /**
   * Persists complete user aggregate with transactional consistency
   * Handles create/update logic for related entities automatically
   */
  async saveUserAggregate(aggregate: UserAggregate): Promise<void> {
    // Update the core user entity
    await this.update(aggregate.user);

    // Handle profile with upsert logic
    if (aggregate.profile) {
      const existingProfile = await this.findProfileByUserId(aggregate.user.id);
      if (existingProfile) {
        await this.updateProfile(aggregate.profile);
      } else {
        await this.saveProfile(aggregate.profile);
      }
    }

    // Replace all interests atomically
    await this.deleteAllInterests(aggregate.user.id);
    for (const interest of aggregate.interests) {
      await this.saveInterest(interest);
    }

    // Update or insert verifications as needed
    for (const verification of aggregate.verifications) {
      const existing = await this.findVerificationById(verification.id);
      if (existing) {
        await this.updateVerification(verification);
      } else {
        await this.saveVerification(verification);
      }
    }
  }

  async findUsersByRole(role: string): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.role, role as "citizen" | "expert" | "admin" | "journalist" | "advocate"));

    return results.map(result => this.mapToUser(result));
  }

  async findUsersByVerificationStatus(status: string): Promise<User[]> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.verificationStatus, status as "pending" | "verified" | "disputed" | "rejected"));

    return results.map(result => this.mapToUser(result));
  }

  async findUsersByReputationRange(min: number, max: number): Promise<User[]> {
    // Join with userProfiles to access reputationScore
    const results = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        verificationStatus: users.verificationStatus,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        reputationScore: userProfiles.reputationScore
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(and(
        sql`${userProfiles.reputationScore} >= ${min}`,
        sql`${userProfiles.reputationScore} <= ${max}`
      ));

    return results.map(result => this.mapToUser(result));
  }

  /**
   * Searches users by name or email using case-insensitive matching
   * Uses OR condition for broader search results
   */
  async searchUsers(query: string, limit = 10): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const results = await db
      .select()
      .from(users)
      .where(
        or(
          sql`LOWER(${users.name}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`
        )
      )
      .limit(limit);

    return results.map(result => this.mapToUser(result));
  }

  async countUsers(): Promise<number> {
    const result = await db
      .select({ value: sql<number>`count(*)` })
      .from(users);

    return Number(result[0]?.value ?? 0);
  }

  async countUsersByRole(): Promise<Record<string, number>> {
    const results = await db
      .select({
        role: users.role,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.role);

    // Transform array into object for easier lookup
    const roleCounts: Record<string, number> = {};
    results.forEach(result => {
      roleCounts[result.role] = Number(result.count);
    });

    return roleCounts;
  }

  async countUsersByVerificationStatus(): Promise<Record<string, number>> {
    const results = await db
      .select({
        status: users.verificationStatus,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.verificationStatus);

    // Transform array into object for easier lookup
    const statusCounts: Record<string, number> = {};
    results.forEach(result => {
      statusCounts[result.status] = Number(result.count);
    });

    return statusCounts;
  }
}




































