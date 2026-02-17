import { cacheService } from '@shared/core/caching';
import { cacheKeys } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { database as db } from '@server/infrastructure/database';
import { bill_engagement, bills, comments, notifications, user_profiles, user_verification,users } from '@server/infrastructure/schema';
import { and, count,desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { databaseService } from '@/infrastructure/database/database-service';

// Data validation schemas
const user_profilesDataSchema = z.object({
  bio: z.string().max(1000).optional(),
  expertise: z.array(z.string().max(50)).max(10).optional(),
  location: z.string().max(100).optional(),
  organization: z.string().max(200).optional(),
  is_public: z.boolean().optional()
});

const userBasicInfoSchema = z.object({
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  name: z.string().max(100).optional()
});

const user_interestsSchema = z.array(z.string().max(50)).max(20);

const userPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
  billCategories: z.array(z.string().max(50)).max(20).optional(),
  language: z.string().max(10).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional()
});

const userVerificationDataSchema = z.object({
  verification_status: z.enum(['pending', 'verified', 'rejected']),
  verificationDocuments: z.any().optional(),
  verificationNotes: z.string().max(500).optional()
});

export interface UserProfileData {
  bio?: string | undefined;
  expertise?: string[] | undefined;
  location?: string | undefined;
  organization?: string | undefined;
  is_public?: boolean | undefined;
}

export interface UserInterestData {
  interests: string[];
}

export interface UserPreferences {
  emailNotifications?: boolean | undefined;
  pushNotifications?: boolean | undefined;
  smsNotifications?: boolean | undefined;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly' | undefined;
  billCategories?: string[] | undefined;
  language?: string | undefined;
  theme?: 'light' | 'dark' | 'auto' | undefined;
}

export interface UserVerificationData {
  verification_status: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: any | undefined;
  verificationNotes?: string | undefined;
}

export interface UserEngagementHistory { totalBillsTracked: number;
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

export class UserProfileService {
  // Data validation and sanitization methods
  private validateAndSanitizeProfileData(data: UserProfileData): UserProfileData {
  const validated = user_profilesDataSchema.parse(data);
    
    // Additional sanitization
    if (validated.bio) {
      validated.bio = validated.bio.trim();
    }
    if (validated.location) {
      validated.location = validated.location.trim();
    }
    if (validated.organization) {
      validated.organization = validated.organization.trim();
    }
    if (validated.expertise) {
      validated.expertise = validated.expertise.map(exp => exp.trim()).filter(exp => exp.length > 0);
    }
    
  return validated;
  }

  private validateAndSanitizeBasicInfo(data: { first_name?: string; last_name?: string; name?: string }) {
    const validated = userBasicInfoSchema.parse(data);
    
    // Additional sanitization
    if (validated.first_name) {
      validated.first_name = validated.first_name.trim();
    }
    if (validated.last_name) {
      validated.last_name = validated.last_name.trim();
    }
    if (validated.name) {
      validated.name = validated.name.trim();
    }
    
    return validated;
  }

  private validateAndSanitizeInterests(interests: string[]): string[] {
    const validated = user_interestsSchema.parse(interests);
    
    // Additional sanitization
    return validated.map(interest => interest.trim()).filter(interest => interest.length > 0);
  }

  private validateAndSanitizePreferences(preferences: Partial<UserPreferences>): Partial<UserPreferences> {
    const validated = userPreferencesSchema.partial().parse(preferences);
    
    // Additional sanitization for bill categories
    if (validated.billCategories) {
      validated.billCategories = validated.billCategories.map(cat => cat.trim()).filter(cat => cat.length > 0);
    }
    
    return validated;
  }

  private validateAndSanitizeVerificationData(data: UserVerificationData): UserVerificationData {
    const validated = userVerificationDataSchema.parse(data);
    
    // Additional sanitization
    if (validated.verificationNotes) {
      validated.verificationNotes = validated.verificationNotes.trim();
    }
    
    return validated;
  }

  private sanitizeUserId(user_id: string): string { if (!user_id || typeof user_id !== 'string') {
      throw new Error('Invalid user ID');
     }
    return user_id.trim();
  }

  private sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query');
    }
    return query.trim().substring(0, 100); // Limit search query length
  }

  async getUserProfile(user_id: string) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = cacheKeys.USER_PROFILE(sanitizedUserId);

    // Try to get from cache first
    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
    const computed = await (async () => {
      // Use database service with fallback
      const result = await databaseService.withFallback(
        async () => {
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
                preferences: user_profiles.preferences
               }
            })
            .from(users)
            .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
            .where(eq(users.id, sanitizedUserId))
            .limit(1);

          if (!user) {
            throw new Error('User not found');
          }

          // Derive interests from stored preferences (if present)
          const prefs = user.profile?.preferences || {};
          const interests = Array.isArray(prefs?.interests) ? prefs.interests : [];

          return {
            ...user,
            interests
          };
        },
        // Fallback data for when database is unavailable
        { id: user_id,
          email: 'user@example.com',
          first_name: 'Demo',
          last_name: 'User',
          name: 'Demo User',
          role: 'citizen',
          verification_status: 'pending',
          created_at: new Date(),
          profile: {
            bio: 'Demo user profile',
            expertise: ['general'],
            location: 'Demo Location',
            organization: 'Demo Organization',
            reputation_score: 0,
            is_public: true
           },
          interests: ['general']
        },
        `getUserProfile:${ user_id }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback data for user profile: ${user_id }`);
      }

      return result.data;
    })();
    try {
      await cacheService.set(cacheKey, computed, 3600);
    } catch (e) {
      /* log but continue */
    }
    return computed;
  }

  async updateUserProfile(user_id: string, profileData: UserProfileData) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedProfileData = this.validateAndSanitizeProfileData(profileData);
    
    // Prepare fallback data (may use cached profile if available)
    const fallbackProfileData = await (async () => {
      const cached = await cacheService.get(cacheKeys.USER_PROFILE(sanitizedUserId));
      if (cached) {
        return {
          ...cached,
          profile: { ...cached.profile, ...profileData }
        };
      }
      throw new Error('Cannot update profile: database unavailable and no cached data');
    })();

    const result = await databaseService.withFallback(
      async () => {
        // Check if profile exists
        const existingProfile = await db
          .select()
          .from(user_profiles)
          .where(eq(user_profiles.user_id, sanitizedUserId))
          .limit(1);

        // Build a payload with only defined fields to satisfy exactOptionalPropertyTypes
        const profilePayload: Record<string, unknown> = {};
        if (sanitizedProfileData.bio !== undefined) profilePayload.bio = sanitizedProfileData.bio;
        if (sanitizedProfileData.location !== undefined) profilePayload.location = sanitizedProfileData.location;
        if (sanitizedProfileData.organization !== undefined) profilePayload.website = sanitizedProfileData.organization; // store organization in website field when present
        if (sanitizedProfileData.expertise !== undefined) {
          // Store expertise inside preferences to avoid schema mismatch
          profilePayload.preferences = { ...(existingProfile[0]?.preferences || {}), expertise: sanitizedProfileData.expertise };
        }

        if (existingProfile.length === 0) {
          // Create new profile
          await db
            .insert(user_profiles)
            .values({
              user_id: sanitizedUserId,
              ...profilePayload,
              created_at: new Date()
            });
        } else { // Update existing profile
          // Always update updated_at
          profilePayload.updated_at = new Date();
          await db
            .update(user_profiles)
            .set(profilePayload)
            .where(eq(user_profiles.user_id, sanitizedUserId));
         }

        // Invalidate cache after update
        await cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));

        return await this.getUserProfile(sanitizedUserId);
      },
      // Fallback: already computed above
      fallbackProfileData,
      `updateUserProfile:${ sanitizedUserId }`
    );

    if (result.source === 'fallback') {
      console.warn(`Using fallback data for user profile update: ${sanitizedUserId}`);
    }

    return result.data;
  }

  async updateUserInterests(user_id: string, interests: string[]) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedInterests = this.validateAndSanitizeInterests(interests);
    
    const result = await databaseService.withFallback(
      async () => {
          // Persist interests into user_profiles.preferences.interests (JSONB)
          const [row] = await db
            .select({ preferences: user_profiles.preferences })
            .from(user_profiles)
            .where(eq(user_profiles.user_id, sanitizedUserId))
            .limit(1);

          const existingPrefs = row?.preferences || {};
          const newPrefs = { ...existingPrefs, interests: sanitizedInterests };

          await db
            .update(user_profiles)
            .set({ preferences: newPrefs, updated_at: new Date() })
            .where(eq(user_profiles.user_id, sanitizedUserId));

          // Invalidate cache after update
          cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));

          return { success: true };
      },
      // Fallback: simulate success but warn about database unavailability
      { success: false },
      `updateUserInterests:${ sanitizedUserId }`
    );

  if (result.source === 'fallback') { console.warn(`Cannot update user interests: database unavailable for user ${sanitizedUserId }`);
    }

    return result.data;
  }

  async updateUserBasicInfo(user_id: string, data: { first_name?: string; last_name?: string; name?: string }) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedData = this.validateAndSanitizeBasicInfo(data);
    
    const result = await databaseService.withFallback(
      async () => {
        // Persist basic profile fields into user_profiles (name/display)
        const profileUpdates: Record<string, unknown> = {};
        if (sanitizedData.first_name !== undefined) profileUpdates.first_name = sanitizedData.first_name;
        if (sanitizedData.last_name !== undefined) profileUpdates.last_name = sanitizedData.last_name;
        if (sanitizedData.name !== undefined) profileUpdates.display_name = sanitizedData.name;

        profileUpdates.updated_at = new Date();

        await db
          .update(user_profiles)
          .set(profileUpdates)
          .where(eq(user_profiles.user_id, sanitizedUserId));

        // Invalidate cache after update
        cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));

        return await this.getUserProfile(sanitizedUserId);
      },
      // Fallback: try to use cached profile merged with provided data
      await (async () => {
        const cachedProfile = await cacheService.get(cacheKeys.USER_PROFILE(sanitizedUserId));
        if (cachedProfile) {
          return { ...cachedProfile, ...data };
        }
        throw new Error('Cannot update basic info: database unavailable and no cached data');
      })(),
      `updateUserBasicInfo:${ sanitizedUserId }`
    );

    if (result.source === 'fallback') {
      console.warn(`Using fallback data for user basic info update: ${sanitizedUserId}`);
    }

    return result.data;
  }

  async getUserPublicProfile(user_id: string) { try {
      const profile = await this.getUserProfile(user_id);
      
      // Only return public information
      if (!profile.profile?.is_public) {
        return {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          verification_status: profile.verification_status,
          reputation_score: profile.profile?.reputation_score || 0
         };
      }

      return profile;
    } catch (error) {
      logger.error('Error fetching public profile:', { component: 'Chanuka', error });
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
          preferences: user_profiles.preferences
        })
        .from(users)
        .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
        .where(
          sql`LOWER(COALESCE(${user_profiles.display_name}, '')) LIKE ${searchTerm} OR LOWER(COALESCE(${user_profiles.website}, '')) LIKE ${searchTerm}`
        )
        .limit(limit);

      return results.map((r: unknown) => ({
        id: r.id,
        name: r.display_name || null,
        role: r.role,
        organization: r.website || null,
        expertise: Array.isArray(r.preferences?.expertise) ? r.preferences.expertise : [],
        reputation_score: typeof r.preferences?.reputation_score === 'number' ? r.preferences.reputation_score : 0
      }));
    } catch (error) {
      logger.error('Error searching users:', { component: 'Chanuka', error });
      return [];
    }
  }

  // User Preference Management
  async getUserPreferences(user_id: string): Promise<UserPreferences> {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = `${cacheKeys.USER_PROFILE(sanitizedUserId)}:preferences`;

    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
    const computed = await (async () => {
      const result = await databaseService.withFallback(
        async () => {
          const [row] = await db
            .select({ preferences: user_profiles.preferences })
            .from(user_profiles)
            .where(eq(user_profiles.user_id, sanitizedUserId))
            .limit(1);

          // Return default preferences if none exist
          const defaultPreferences: UserPreferences = {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            notificationFrequency: 'immediate',
            billCategories: [],
            language: 'en',
            theme: 'auto'
          };

          return { ...defaultPreferences, ...(row?.preferences as UserPreferences || {}) };
        },
        // Fallback: return default preferences
        {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          notificationFrequency: 'immediate',
          billCategories: [],
          language: 'en',
          theme: 'auto'
        },
        `getUserPreferences:${ sanitizedUserId }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback preferences for user: ${sanitizedUserId}`);
      }

      return result.data;
    })();
    try {
      await cacheService.set(cacheKey, computed, 3600);
    } catch (e) {
      /* log but continue */
    }
    return computed;
  }

  async updateUserPreferences(user_id: string, preferences: Partial<UserPreferences>) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedPreferences = this.validateAndSanitizePreferences(preferences);
    
      const result = await databaseService.withFallback(
      async () => {
  // Get current preferences
  const currentPreferences = await this.getUserPreferences(sanitizedUserId);
  // Use sanitized preferences when merging to ensure cleaned/validated values are persisted
  const updatedPreferences = { ...currentPreferences, ...(sanitizedPreferences as Partial<UserPreferences>) };

        await db
          .update(user_profiles)
          .set({ preferences: updatedPreferences, updated_at: new Date() })
          .where(eq(user_profiles.user_id, sanitizedUserId));

        // Invalidate cache after update
        cacheService.delete(`${ cacheKeys.USER_PROFILE(sanitizedUserId) }:preferences`);
        cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));

        return updatedPreferences;
      },
      // Fallback: return merged preferences but warn about database unavailability
      await (async () => {
        const currentPreferences = (await cacheService.get(`${cacheKeys.USER_PROFILE(sanitizedUserId)}:preferences`)) || {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          notificationFrequency: 'immediate',
          billCategories: [],
          language: 'en',
          theme: 'auto'
        };
        return { ...currentPreferences, ...preferences };
      })(),
  `updateUserPreferences:${ sanitizedUserId }`
    );

  if (result.source === 'fallback') { console.warn(`Cannot update user preferences: database unavailable for user ${sanitizedUserId }`);
    }

    return result.data;
  }

  // User Verification Status Handling
  async updateUserVerificationStatus(user_id: string, verification_data: UserVerificationData) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedVerificationData = this.validateAndSanitizeVerificationData(verification_data);

    const result = await databaseService.withFallback(
      async () => {
        await databaseService.withTransaction(async (tx) => {
          // Store verification record in user_verification table (JSONB for domain data)
          await tx
            .insert(user_verification)
            .values({
              user_id: sanitizedUserId,
              verification_type: 'identity',
              verification_data: sanitizedVerificationData as Record<string, unknown>,
              verification_documents: Array.isArray((sanitizedVerificationData as Record<string, unknown>).verificationDocuments) 
                ? (sanitizedVerificationData as Record<string, unknown>).verificationDocuments as string[]
                : undefined,
              verification_status: sanitizedVerificationData.verification_status,
              submitted_at: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            });

          // Create notification for status change
          await tx
            .insert(notifications)
            .values({
              user_id: sanitizedUserId,
              type: 'verification_status',
              title: 'Verification Status Updated',
              message: `Your verification status has been updated to: ${sanitizedVerificationData.verification_status}`,
              created_at: new Date()
            });
        }, 'updateUserVerificationStatus');

        // Invalidate cache after update
        cacheService.delete(cacheKeys.USER_PROFILE(sanitizedUserId));

        return await this.getUserProfile(sanitizedUserId);
      },
      // Fallback: return updated verification status merged with cached data
      await (async () => {
        const cachedProfile = await cacheService.get(cacheKeys.USER_PROFILE(sanitizedUserId));
        if (cachedProfile) {
          return { ...cachedProfile, verification_status: sanitizedVerificationData.verification_status };
        }
        throw new Error('Cannot update verification status: database unavailable and no cached data');
      })(),
      `updateUserVerificationStatus:${ sanitizedUserId }`
    );

    if (result.source === 'fallback') { console.warn(`Cannot update user verification status: database unavailable for user ${sanitizedUserId }`);
    }

    return result.data;
  }

  async getUserVerificationStatus(user_id: string) { const sanitizedUserId = this.sanitizeUserId(user_id);

    const cacheKey = `${cacheKeys.USER_PROFILE(sanitizedUserId) }:verification`;

    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
    const computed = await (async () => {
      const result = await databaseService.withFallback(
        async () => {
          const [row] = await db
            .select({
              verification_data: user_verification.verification_data,
              verification_status: user_verification.verification_status,
              verification_documents: user_verification.verification_documents
            })
            .from(user_verification)
            .where(eq(user_verification.user_id, sanitizedUserId))
            .orderBy(desc(user_verification.submitted_at))
            .limit(1);

          if (!row) {
            throw new Error('User verification record not found');
          }

          const status = row.verification_status as string;
          return {
            verification_status: status,
            verificationDocuments: row.verification_documents || null,
            canSubmitDocuments: status === 'pending' || status === 'rejected'
          };
        },
        // Fallback: return default verification status
        {
          verification_status: 'pending',
          verificationDocuments: null,
          canSubmitDocuments: true
        },
        `getUserVerificationStatus:${ sanitizedUserId }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback verification status for user: ${sanitizedUserId }`);
      }

      return result.data;
    })();
    try {
      await cacheService.set(cacheKey, computed, 3600);
    } catch (e) {
      /* log but continue */
    }
    return computed;
  }

  // User Engagement History Tracking
  async getUserEngagementHistory(user_id: string): Promise<UserEngagementHistory> {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    const cacheKey = `${cacheKeys.USER_PROFILE(sanitizedUserId)}:engagement`;

    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
    const computed = await (async () => {
      const result = await databaseService.withFallback(
        async () => {
          // Get engagement statistics
          const [engagementStats] = await db
            .select({
              totalBillsTracked: count(bill_engagement.id),
              totalEngagementScore: sql`COALESCE(SUM(${bill_engagement.engagement_score}), 0)`
            })
            .from(bill_engagement)
            .where(eq(bill_engagement.user_id, sanitizedUserId));

          // Get comment count
          const [commentStats] = await db
            .select({
              totalComments: count(comments.id)
            })
            .from(comments)
            .where(eq(comments.user_id, sanitizedUserId));

          // Get recent activity
      const recentEngagement = await db
        .select({ bill_id: bill_engagement.bill_id,
          billTitle: bills.title,
          last_engaged_at: bill_engagement.updated_at,
          engagement_score: bill_engagement.engagement_score
         })
            .from(bill_engagement)
            .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
            .where(eq(bill_engagement.user_id, sanitizedUserId))
        .orderBy(desc(bill_engagement.updated_at))
            .limit(10);

          const recentComments = await db
            .select({ bill_id: comments.bill_id,
              billTitle: bills.title,
              created_at: comments.created_at
             })
            .from(comments)
            .innerJoin(bills, eq(comments.bill_id, bills.id))
            .where(eq(comments.user_id, user_id))
            .orderBy(desc(comments.created_at))
            .limit(10);

          // Combine and sort recent activity
          const recentActivity = [
            ...recentEngagement.map((item: unknown) => ({ type: 'track' as const,
              bill_id: item.bill_id,
              billTitle: item.billTitle,
              timestamp: item.last_engaged_at || new Date()
             })),
            ...recentComments.map((item: unknown) => ({ type: 'comment' as const,
              bill_id: item.bill_id,
              billTitle: item.billTitle,
              timestamp: item.created_at || new Date()
             }))
          ]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

          // Get top categories by engagement
          const topCategories = await db
            .select({
              category: bills.category,
              engagementCount: count(bill_engagement.id)
            })
            .from(bill_engagement)
            .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
            .where(and(
              eq(bill_engagement.user_id, sanitizedUserId),
              sql`${bills.category} IS NOT NULL`
            ))
            .groupBy(bills.category)
            .orderBy(desc(count(bill_engagement.id)))
            .limit(5);

          return {
            totalBillsTracked: Number(engagementStats?.totalBillsTracked || 0),
            totalComments: Number(commentStats?.totalComments || 0),
            totalEngagementScore: Number(engagementStats?.totalEngagementScore || 0),
            recentActivity,
            topCategories: topCategories.map((cat: unknown) => ({
              category: cat.category || 'Unknown',
              engagementCount: Number(cat.engagementCount)
            }))
          };
        },
        // Fallback: return empty engagement history
        {
          totalBillsTracked: 0,
          totalComments: 0,
          totalEngagementScore: 0,
          recentActivity: [],
          topCategories: []
        },
        `getUserEngagementHistory:${ sanitizedUserId }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback engagement history for user: ${sanitizedUserId}`);
      }

      return result.data;
    })();
    try {
      await cacheService.set(cacheKey, computed, 7200);
    } catch (e) {
      /* log but continue */
    }
    return computed;
  }

  async updateUserEngagement(user_id: string, bill_id: string, engagement_type: 'view' | 'comment' | 'share') {
    const sanitizedUserId = this.sanitizeUserId(user_id);
    
    // Validate and sanitize bill_id
    let sanitizedBillId: number;
    if (typeof bill_id === 'string') {
      const parsed = parseInt(bill_id.trim(), 10);
      if (isNaN(parsed)) {
        throw new Error('Invalid bill ID');
      }
      sanitizedBillId = parsed;
    } else if (typeof bill_id === 'number') {
      sanitizedBillId = bill_id;
    } else {
      throw new Error('Invalid bill ID type');
    }

    const result = await databaseService.withFallback(
      async () => {
        await databaseService.withTransaction(async (tx) => {
          // Check if engagement record exists
          const [existingEngagement] = await tx
            .select()
            .from(bill_engagement)
            .where(and(
              eq(bill_engagement.user_id, sanitizedUserId),
              eq(bill_engagement.bill_id, sanitizedBillId)
            ))
            .limit(1);

          const engagement_scoreIncrement = {
            view: 1,
            comment: 5,
            share: 3
            }[engagement_type];

          if (existingEngagement) {
            // Update existing engagement
            const updates: any = {
              last_engaged_at: new Date(),
              updated_at: new Date(),
              engagement_score: sql`${bill_engagement.engagement_score} + ${engagement_scoreIncrement}`
            };

            if (engagement_type === 'view') {
              updates.view_count = sql`${bill_engagement.view_count} + 1`;
            } else if (engagement_type === 'comment') {
              updates.comment_count = sql`${bill_engagement.comment_count} + 1`;
            } else if (engagement_type === 'share') {
              updates.share_count = sql`${bill_engagement.share_count} + 1`;
            }

            await tx
              .update(bill_engagement)
              .set(updates)
              .where(and(
                  eq(bill_engagement.user_id, sanitizedUserId),
                  eq(bill_engagement.bill_id, sanitizedBillId)
                ));
          } else { // Create new engagement record
            const newEngagement: any = {
                 user_id: sanitizedUserId,
                 bill_id: sanitizedBillId,
               view_count: engagement_type === 'view' ? 1 : 0,
               comment_count: engagement_type === 'comment' ? 1 : 0,
               share_count: engagement_type === 'share' ? 1 : 0,
               engagement_score: engagement_scoreIncrement,
               last_engaged_at: new Date(),
               created_at: new Date(),
               updated_at: new Date()
               };

            await tx
              .insert(bill_engagement)
              .values(newEngagement);
          }
        }, 'updateUserEngagement');

        // Invalidate engagement cache after update
        await cacheService.delete(`${ cacheKeys.USER_PROFILE(sanitizedUserId) }:engagement`);

        return { success: true };
      },
      // Fallback: simulate success but warn about database unavailability
      { success: false },
      `updateUserEngagement:${ sanitizedUserId }:${ sanitizedBillId }`
    );
    if (result.source === 'fallback') { console.warn(`Cannot update user engagement: database unavailable for user ${sanitizedUserId}, bill ${sanitizedBillId}`);
    }

    return result.data;
  }

  // Comprehensive user profile with all data
  async getCompleteUserProfile(user_id: string) { try {
      const [profile, preferences, verification_status, engagementHistory] = await Promise.all([
        this.getUserProfile(user_id),
        this.getUserPreferences(user_id),
        this.getUserVerificationStatus(user_id),
        this.getUserEngagementHistory(user_id)
      ]);

      return {
        ...profile,
        preferences,
        verification: verification_status,
        engagement: engagementHistory
       };
    } catch (error) {
      logger.error('Error fetching complete user profile:', { component: 'Chanuka', error });
      throw error;
    }
  }
}

export const user_profileservice = new UserProfileService();

















































