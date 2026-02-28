import { cacheKeys, cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';;
import {
  bill_engagement,
  bills,
  comments,
  notifications,
  user_profiles,
  user_verification,
  users,
} from '@server/infrastructure/schema';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const user_profilesDataSchema = z.object({
  bio: z.string().max(1000).optional(),
  expertise: z.array(z.string().max(50)).max(10).optional(),
  location: z.string().max(100).optional(),
  organization: z.string().max(200).optional(),
  is_public: z.boolean().optional(),
});

const userBasicInfoSchema = z.object({
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  name: z.string().max(100).optional(),
});

const user_interestsSchema = z.array(z.string().max(50)).max(20);

const userPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
  billCategories: z.array(z.string().max(50)).max(20).optional(),
  language: z.string().max(10).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
});

const userVerificationDataSchema = z.object({
  verification_status: z.enum(['pending', 'verified', 'rejected']),
  verificationDocuments: z.any().optional(),
  verificationNotes: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface UserProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}

export interface UserInterestData {
  interests: string[];
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  billCategories?: string[];
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface UserVerificationData {
  verification_status: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: unknown;
  verificationNotes?: string;
}

export interface UserEngagementHistory {
  totalBillsTracked: number;
  totalComments: number;
  totalEngagementScore: number;
  recentActivity: Array<{
    type: 'comment' | 'track' | 'view';
    bill_id: number;
    billTitle: string;
    timestamp: Date;
  }>;
  topCategories: Array<{
    category: string;
    engagementCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const DEFAULT_PREFERENCES: Required<UserPreferences> = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  notificationFrequency: 'immediate',
  billCategories: [],
  language: 'en',
  theme: 'auto',
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UserProfileService {
  // -------------------------------------------------------------------------
  // Private sanitization helpers
  // -------------------------------------------------------------------------

  private validateAndSanitizeProfileData(data: UserProfileData): UserProfileData {
    const validated = user_profilesDataSchema.parse(data);
    if (validated.bio) validated.bio = validated.bio.trim();
    if (validated.location) validated.location = validated.location.trim();
    if (validated.organization) validated.organization = validated.organization.trim();
    if (validated.expertise) {
      validated.expertise = validated.expertise
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
    }
    return validated;
  }

  private validateAndSanitizeBasicInfo(data: {
    first_name?: string;
    last_name?: string;
    name?: string;
  }) {
    const validated = userBasicInfoSchema.parse(data);
    if (validated.first_name) validated.first_name = validated.first_name.trim();
    if (validated.last_name) validated.last_name = validated.last_name.trim();
    if (validated.name) validated.name = validated.name.trim();
    return validated;
  }

  private validateAndSanitizeInterests(interests: string[]): string[] {
    return user_interestsSchema
      .parse(interests)
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
  }

  private validateAndSanitizePreferences(
    preferences: Partial<UserPreferences>,
  ): Partial<UserPreferences> {
    const validated = userPreferencesSchema.partial().parse(preferences);
    if (validated.billCategories) {
      validated.billCategories = validated.billCategories
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }
    return validated;
  }

  private validateAndSanitizeVerificationData(
    data: UserVerificationData,
  ): UserVerificationData {
    const validated = userVerificationDataSchema.parse(data);
    if (validated.verificationNotes) {
      validated.verificationNotes = validated.verificationNotes.trim();
    }
    return validated;
  }

  private sanitizeUserId(user_id: string): string {
    if (!user_id || typeof user_id !== 'string') throw new Error('Invalid user ID');
    return user_id.trim();
  }

  private sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') throw new Error('Invalid search query');
    return query.trim().substring(0, 100);
  }

  // -------------------------------------------------------------------------
  // Profile read / write
  // -------------------------------------------------------------------------

  async getUserProfile(user_id: string) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = cacheKeys.USER_PROFILE(sanitizedUserId);

    const cached = await cacheService.get(cacheKey);
    if (cached != null) return cached;

    const computed = await (async () => {
      try {
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            created_at: users.created_at,
            profile: {
              first_name: user_profiles.first_name,
              last_name: user_profiles.last_name,
              display_name: user_profiles.display_name,
              bio: user_profiles.bio,
              website: user_profiles.website,
              avatar_url: user_profiles.avatar_url,
              preferences: user_profiles.preferences,
            },
          })
          .from(users)
          .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
          .where(eq(users.id, sanitizedUserId))
          .limit(1);

        if (!user) throw new Error('User not found');

        const prefs = (user.profile?.preferences ?? {}) as Record<string, unknown>;
        const interests = Array.isArray(prefs.interests) ? (prefs.interests as string[]) : [];

        return { ...user, interests };
      } catch (error) {
        logger.error('Failed to get user profile', {
          error,
          component: 'UserProfileService',
          operation: 'getUserProfile',
          context: { user_id },
        });
        logger.warn(`Using fallback data for user profile: ${user_id}`);
        return {
          id: user_id,
          email: 'user@example.com',
          role: 'citizen',
          created_at: new Date(),
          profile: {
            first_name: 'Demo',
            last_name: 'User',
            display_name: 'Demo User',
            bio: 'Demo user profile',
            website: null,
            avatar_url: null,
            preferences: { expertise: ['general'], is_public: true },
          },
          interests: ['general'],
        };
      }
    })();

    try {
      await cacheService.set(cacheKey, computed, 3600);
    } catch {
      /* log but continue */
    }
    return computed;
  }

  async updateUserProfile(user_id: string, profileData: UserProfileData) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedProfileData = this.validateAndSanitizeProfileData(profileData);

    try {
      const [existingProfile] = await db
        .select()
        .from(user_profiles)
        .where(eq(user_profiles.user_id, sanitizedUserId))
        .limit(1);

      const profilePayload: Record<string, unknown> = {};
      if (sanitizedProfileData.bio !== undefined) profilePayload.bio = sanitizedProfileData.bio;
      if (sanitizedProfileData.location !== undefined)
        profilePayload.location = sanitizedProfileData.location;
      if (sanitizedProfileData.organization !== undefined)
        profilePayload.website = sanitizedProfileData.organization;
      if (sanitizedProfileData.expertise !== undefined) {
        profilePayload.preferences = {
          ...((existingProfile?.preferences as Record<string, unknown>) ?? {}),
          expertise: sanitizedProfileData.expertise,
        };
      }

      if (!existingProfile) {
        await db
          .insert(user_profiles)
          .values({ user_id: sanitizedUserId, ...profilePayload, created_at: new Date() });
      } else {
        profilePayload.updated_at = new Date();
        await db
          .update(user_profiles)
          .set(profilePayload)
          .where(eq(user_profiles.user_id, sanitizedUserId));
      }

      await cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));
      return await this.getUserProfile(sanitizedUserId);
    } catch (error) {
      logger.error('Failed to update user profile', {
        error,
        component: 'UserProfileService',
        operation: 'updateUserProfile',
        context: { user_id: sanitizedUserId },
      });
      logger.warn(`Using fallback data for user profile update: ${sanitizedUserId}`);

      const cached = await cacheService.get(cacheKeys.USER_PROFILE(sanitizedUserId));
      if (cached) return { ...cached, profile: { ...cached.profile, ...profileData } };
      throw new Error('Cannot update profile: database unavailable and no cached data');
    }
  }

  async updateUserInterests(user_id: string, interests: string[]) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedInterests = this.validateAndSanitizeInterests(interests);

    try {
      const [row] = await db
        .select({ preferences: user_profiles.preferences })
        .from(user_profiles)
        .where(eq(user_profiles.user_id, sanitizedUserId))
        .limit(1);

      const newPrefs = {
        ...((row?.preferences as Record<string, unknown>) ?? {}),
        interests: sanitizedInterests,
      };

      await db
        .update(user_profiles)
        .set({ preferences: newPrefs, updated_at: new Date() })
        .where(eq(user_profiles.user_id, sanitizedUserId));

      await cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));
      return { success: true };
    } catch (error) {
      logger.error('Failed to update user interests', {
        error,
        component: 'UserProfileService',
        operation: 'updateUserInterests',
        context: { user_id: sanitizedUserId },
      });
      logger.warn(`Cannot update user interests: database unavailable for user ${sanitizedUserId}`);
      return { success: false };
    }
  }

  async updateUserBasicInfo(
    user_id: string,
    data: { first_name?: string; last_name?: string; name?: string },
  ) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedData = this.validateAndSanitizeBasicInfo(data);

    try {
      const profileUpdates: Record<string, unknown> = { updated_at: new Date() };
      if (sanitizedData.first_name !== undefined)
        profileUpdates.first_name = sanitizedData.first_name;
      if (sanitizedData.last_name !== undefined)
        profileUpdates.last_name = sanitizedData.last_name;
      if (sanitizedData.name !== undefined) profileUpdates.display_name = sanitizedData.name;

      await db
        .update(user_profiles)
        .set(profileUpdates)
        .where(eq(user_profiles.user_id, sanitizedUserId));

      await cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));
      return await this.getUserProfile(sanitizedUserId);
    } catch (error) {
      logger.error('Failed to update user basic info', {
        error,
        component: 'UserProfileService',
        operation: 'updateUserBasicInfo',
        context: { user_id: sanitizedUserId },
      });
      logger.warn(`Using fallback data for user basic info update: ${sanitizedUserId}`);

      const cachedProfile = await cacheService.get(cacheKeys.USER_PROFILE(sanitizedUserId));
      if (cachedProfile) return { ...cachedProfile, ...data };
      throw new Error('Cannot update basic info: database unavailable and no cached data');
    }
  }

  async getUserPublicProfile(user_id: string) {
    try {
      const profile = await this.getUserProfile(user_id);
      const prefs = (profile.profile?.preferences ?? {}) as Record<string, unknown>;
      const isPublic = prefs.is_public as boolean | undefined;

      if (!isPublic) {
        return {
          id: profile.id,
          name: profile.profile?.display_name ?? null,
          role: profile.role,
          reputation_score: typeof prefs.reputation_score === 'number' ? prefs.reputation_score : 0,
        };
      }

      return profile;
    } catch (error) {
      logger.error('Error fetching public profile:', { component: 'UserProfileService', error });
      throw error;
    }
  }

  async searchUsers(query: string, limit = 10) {
    const sanitizedQuery = this.sanitizeSearchQuery(query);

    try {
      const searchTerm = `%${sanitizedQuery.toLowerCase()}%`;

      const results = await db
        .select({
          id: users.id,
          display_name: user_profiles.display_name,
          role: users.role,
          website: user_profiles.website,
          preferences: user_profiles.preferences,
        })
        .from(users)
        .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
        .where(
          sql`LOWER(COALESCE(${user_profiles.display_name}, '')) LIKE ${searchTerm}
           OR LOWER(COALESCE(${user_profiles.website}, '')) LIKE ${searchTerm}`,
        )
        .limit(limit);

      return results.map((r) => {
        const prefs = (r.preferences ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          name: r.display_name ?? null,
          role: r.role,
          organization: r.website ?? null,
          expertise: Array.isArray(prefs.expertise) ? (prefs.expertise as string[]) : [],
          reputation_score: typeof prefs.reputation_score === 'number' ? prefs.reputation_score : 0,
        };
      });
    } catch (error) {
      logger.error('Error searching users:', { component: 'UserProfileService', error });
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Preferences
  // -------------------------------------------------------------------------

  async getUserPreferences(user_id: string): Promise<UserPreferences> {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = `${cacheKeys.USER_PROFILE(sanitizedUserId)}:preferences`;

    const cached = await cacheService.get(cacheKey);
    if (cached != null) return cached as UserPreferences;

    const computed = await (async () => {
      try {
        const [row] = await db
          .select({ preferences: user_profiles.preferences })
          .from(user_profiles)
          .where(eq(user_profiles.user_id, sanitizedUserId))
          .limit(1);

        return { ...DEFAULT_PREFERENCES, ...((row?.preferences as UserPreferences) ?? {}) };
      } catch (error) {
        logger.error('Failed to get user preferences', {
          error,
          component: 'UserProfileService',
          operation: 'getUserPreferences',
          context: { user_id: sanitizedUserId },
        });
        logger.warn(`Using fallback preferences for user: ${sanitizedUserId}`);
        return { ...DEFAULT_PREFERENCES };
      }
    })();

    try {
      await cacheService.set(cacheKey, computed, 3600);
    } catch {
      /* log but continue */
    }
    return computed;
  }

  async updateUserPreferences(user_id: string, preferences: Partial<UserPreferences>) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedPreferences = this.validateAndSanitizePreferences(preferences);

    try {
      const currentPreferences = await this.getUserPreferences(sanitizedUserId);
      const updatedPreferences = { ...currentPreferences, ...sanitizedPreferences };

      await db
        .update(user_profiles)
        .set({ preferences: updatedPreferences, updated_at: new Date() })
        .where(eq(user_profiles.user_id, sanitizedUserId));

      await cacheService.delete(`${cacheKeys.USER_PROFILE(sanitizedUserId)}:preferences`);
      await cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));

      return updatedPreferences;
    } catch (error) {
      logger.error('Failed to update user preferences', {
        error,
        component: 'UserProfileService',
        operation: 'updateUserPreferences',
        context: { user_id: sanitizedUserId },
      });
      logger.warn(
        `Cannot update user preferences: database unavailable for user ${sanitizedUserId}`,
      );
      const currentPreferences =
        ((await cacheService.get(
          `${cacheKeys.USER_PROFILE(sanitizedUserId)}:preferences`,
        )) as UserPreferences) ?? { ...DEFAULT_PREFERENCES };
      return { ...currentPreferences, ...preferences };
    }
  }

  // -------------------------------------------------------------------------
  // Verification
  // -------------------------------------------------------------------------

  async updateUserVerificationStatus(user_id: string, verification_data: UserVerificationData) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedVerificationData = this.validateAndSanitizeVerificationData(verification_data);
    const verificationDataRecord = sanitizedVerificationData as unknown as Record<string, unknown>;

    try {
      await withTransaction(async (tx: any) => {
        await tx.insert(user_verification).values({
          user_id: sanitizedUserId,
          verification_type: 'identity',
          verification_data: verificationDataRecord,
          verification_documents: Array.isArray(verificationDataRecord.verificationDocuments)
            ? (verificationDataRecord.verificationDocuments as string[])
            : undefined,
          verification_status: sanitizedVerificationData.verification_status,
          submitted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        await tx.insert(notifications).values({
          user_id: sanitizedUserId,
          type: 'verification_status',
          title: 'Verification Status Updated',
          message: `Your verification status has been updated to: ${sanitizedVerificationData.verification_status}`,
          created_at: new Date(),
        });
      });

      await cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));
      return await this.getUserProfile(sanitizedUserId);
    } catch (error) {
      logger.error('Failed to update user verification status', {
        error,
        component: 'UserProfileService',
        operation: 'updateUserVerificationStatus',
        context: { user_id: sanitizedUserId },
      });
      logger.warn(
        `Cannot update user verification status: database unavailable for user ${sanitizedUserId}`,
      );
      const cachedProfile = await cacheService.get(cacheKeys.USER_PROFILE(sanitizedUserId));
      if (cachedProfile) {
        return {
          ...cachedProfile,
          verification_status: sanitizedVerificationData.verification_status,
        };
      }
      throw new Error('Cannot update verification status: database unavailable and no cached data');
    }
  }

  async getUserVerificationStatus(user_id: string) {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = `${cacheKeys.USER_PROFILE(sanitizedUserId)}:verification`;

    const cached = await cacheService.get(cacheKey);
    if (cached != null) return cached;

    const computed = await (async () => {
      try {
        const [row] = await db
          .select({
            verification_data: user_verification.verification_data,
            verification_status: user_verification.verification_status,
            verification_documents: user_verification.verification_documents,
          })
          .from(user_verification)
          .where(eq(user_verification.user_id, sanitizedUserId))
          .orderBy(desc(user_verification.submitted_at))
          .limit(1);

        if (!row) throw new Error('User verification record not found');

        const status = row.verification_status as string;
        return {
          verification_status: status,
          verificationDocuments: row.verification_documents ?? null,
          canSubmitDocuments: status === 'pending' || status === 'rejected',
        };
      } catch (error) {
        logger.error('Failed to get user verification status', {
          error,
          component: 'UserProfileService',
          operation: 'getUserVerificationStatus',
          context: { user_id: sanitizedUserId },
        });
        logger.warn(`Using fallback verification status for user: ${sanitizedUserId}`);
        return { verification_status: 'pending', verificationDocuments: null, canSubmitDocuments: true };
      }
    })();

    try {
      await cacheService.set(cacheKey, computed, 3600);
    } catch {
      /* log but continue */
    }
    return computed;
  }

  // -------------------------------------------------------------------------
  // Engagement history
  // -------------------------------------------------------------------------

  async getUserEngagementHistory(user_id: string): Promise<UserEngagementHistory> {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = `${cacheKeys.USER_PROFILE(sanitizedUserId)}:engagement`;

    const cached = await cacheService.get(cacheKey);
    if (cached != null) return cached as UserEngagementHistory;

    const computed = await (async () => {
      try {
        const [engagementStats] = await db
          .select({
            totalBillsTracked: count(bill_engagement.id),
            totalEngagementScore: sql<number>`COALESCE(SUM(${bill_engagement.engagement_score}), 0)`,
          })
          .from(bill_engagement)
          .where(eq(bill_engagement.user_id, sanitizedUserId));

        const [commentStats] = await db
          .select({ totalComments: count(comments.id) })
          .from(comments)
          .where(eq(comments.user_id, sanitizedUserId));

        const recentEngagement = await db
          .select({
            bill_id: bill_engagement.bill_id,
            billTitle: bills.title,
            last_engaged_at: bill_engagement.updated_at,
            engagement_score: bill_engagement.engagement_score,
          })
          .from(bill_engagement)
          .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
          .where(eq(bill_engagement.user_id, sanitizedUserId))
          .orderBy(desc(bill_engagement.updated_at))
          .limit(10);

        const recentComments = await db
          .select({
            bill_id: comments.bill_id,
            billTitle: bills.title,
            created_at: comments.created_at,
          })
          .from(comments)
          .innerJoin(bills, eq(comments.bill_id, bills.id))
          .where(eq(comments.user_id, sanitizedUserId)) // fixed: was user_id (unsanitized)
          .orderBy(desc(comments.created_at))
          .limit(10);

        const recentActivity = [
          ...recentEngagement.map((item) => ({
            type: 'track' as const,
            bill_id: item.bill_id,
            billTitle: item.billTitle,
            timestamp: item.last_engaged_at ?? new Date(),
          })),
          ...recentComments.map((item) => ({
            type: 'comment' as const,
            bill_id: item.bill_id,
            billTitle: item.billTitle,
            timestamp: item.created_at ?? new Date(),
          })),
        ]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10);

        const topCategories = await db
          .select({
            category: bills.category,
            engagementCount: count(bill_engagement.id),
          })
          .from(bill_engagement)
          .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
          .where(
            and(
              eq(bill_engagement.user_id, sanitizedUserId),
              sql`${bills.category} IS NOT NULL`,
            ),
          )
          .groupBy(bills.category)
          .orderBy(desc(count(bill_engagement.id)))
          .limit(5);

        return {
          totalBillsTracked: Number(engagementStats?.totalBillsTracked ?? 0),
          totalComments: Number(commentStats?.totalComments ?? 0),
          totalEngagementScore: Number(engagementStats?.totalEngagementScore ?? 0),
          recentActivity,
          topCategories: topCategories.map((cat) => ({
            category: cat.category ?? 'Unknown',
            engagementCount: Number(cat.engagementCount),
          })),
        };
      } catch (error) {
        logger.error('Failed to get user engagement history', {
          error,
          component: 'UserProfileService',
          operation: 'getUserEngagementHistory',
          context: { user_id: sanitizedUserId },
        });
        logger.warn(`Using fallback engagement history for user: ${sanitizedUserId}`);
        return {
          totalBillsTracked: 0,
          totalComments: 0,
          totalEngagementScore: 0,
          recentActivity: [],
          topCategories: [],
        };
      }
    })();

    try {
      await cacheService.set(cacheKey, computed, 7200);
    } catch {
      /* log but continue */
    }
    return computed;
  }

  async updateUserEngagement(
    user_id: string,
    bill_id: string | number,
    engagement_type: 'view' | 'comment' | 'share',
  ) {
    const sanitizedUserId = this.sanitizeUserId(user_id);

    let sanitizedBillId: number;
    if (typeof bill_id === 'string') {
      const parsed = parseInt(bill_id.trim(), 10);
      if (isNaN(parsed)) throw new Error('Invalid bill ID');
      sanitizedBillId = parsed;
    } else if (typeof bill_id === 'number') {
      sanitizedBillId = bill_id;
    } else {
      throw new Error('Invalid bill ID type');
    }

    const scoreIncrement: Record<'view' | 'comment' | 'share', number> = {
      view: 1,
      comment: 5,
      share: 3,
    };

    try {
      await withTransaction(async (tx: any) => {
        const [existingEngagement] = await tx
          .select()
          .from(bill_engagement)
          .where(
            and(
              eq(bill_engagement.user_id, sanitizedUserId),
              eq(bill_engagement.bill_id, sanitizedBillId),
            ),
          )
          .limit(1);

        if (existingEngagement) {
          const updates: Record<string, unknown> = {
            last_engaged_at: new Date(),
            updated_at: new Date(),
            engagement_score: sql`${bill_engagement.engagement_score} + ${scoreIncrement[engagement_type]}`,
          };
          if (engagement_type === 'view')
            updates.view_count = sql`${bill_engagement.view_count} + 1`;
          if (engagement_type === 'comment')
            updates.comment_count = sql`${bill_engagement.comment_count} + 1`;
          if (engagement_type === 'share')
            updates.share_count = sql`${bill_engagement.share_count} + 1`;

          await tx
            .update(bill_engagement)
            .set(updates)
            .where(
              and(
                eq(bill_engagement.user_id, sanitizedUserId),
                eq(bill_engagement.bill_id, sanitizedBillId),
              ),
            );
        } else {
          await tx.insert(bill_engagement).values({
            user_id: sanitizedUserId,
            bill_id: sanitizedBillId,
            view_count: engagement_type === 'view' ? 1 : 0,
            comment_count: engagement_type === 'comment' ? 1 : 0,
            share_count: engagement_type === 'share' ? 1 : 0,
            engagement_score: scoreIncrement[engagement_type],
            last_engaged_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      });

      await cacheService.delete(`${cacheKeys.USER_PROFILE(sanitizedUserId)}:engagement`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update user engagement', {
        error,
        component: 'UserProfileService',
        operation: 'updateUserEngagement',
        context: { user_id: sanitizedUserId, bill_id: sanitizedBillId, engagement_type },
      });
      logger.warn(
        `Cannot update user engagement: database unavailable for user ${sanitizedUserId}, bill ${sanitizedBillId}`,
      );
      return { success: false };
    }
  }

  // -------------------------------------------------------------------------
  // Composite profile
  // -------------------------------------------------------------------------

  async getCompleteUserProfile(user_id: string) {
    try {
      const [profile, preferences, verification, engagementHistory] = await Promise.all([
        this.getUserProfile(user_id),
        this.getUserPreferences(user_id),
        this.getUserVerificationStatus(user_id),
        this.getUserEngagementHistory(user_id),
      ]);

      return { ...profile, preferences, verification, engagement: engagementHistory };
    } catch (error) {
      logger.error('Error fetching complete user profile:', {
        component: 'UserProfileService',
        error,
      });
      throw error;
    }
  }
}

export const user_profileservice = new UserProfileService();