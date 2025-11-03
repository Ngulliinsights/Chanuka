import { database as db } from '@shared/database/connection';
import { users, user_profiles, user_interests, bill_engagement, notifications, comments, bills } from '@shared/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys  } from '../../../../shared/core/src/index.js';
import { databaseService } from '../../../infrastructure/database/database-service';
import { z } from 'zod';
import { logger  } from '../../../../shared/core/src/index.js';
import { CACHE_KEYS  } from '../../../../shared/core/src/index.js';

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
  verificationDocuments?: any;
  verificationNotes?: string;
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
              first_name: users.first_name,
              last_name: users.last_name,
              name: users.name,
              role: users.role,
              verification_status: users.verification_status,
              created_at: users.created_at,
              profile: {
                bio: user_profiles.bio,
                expertise: user_profiles.expertise,
                location: user_profiles.location,
                organization: user_profiles.organization,
                reputation_score: user_profiles.reputation_score,
                is_public: user_profiles.is_public
               }
            })
            .from(users)
            .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
            .where(eq(users.id, user_id))
            .limit(1);

          if (!user) {
            throw new Error('User not found');
          }

          // Get user interests
          const interests = await db
            .select({ interest: user_interests.interest })
            .from(user_interests)
            .where(eq(user_interests.user_id, user_id));

          return {
            ...user,
            interests: interests.map(i => i.interest)
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
    
    const result = await databaseService.withFallback(
      async () => {
        // Check if profile exists
        const existingProfile = await db
          .select()
          .from(user_profiles)
          .where(eq(user_profiles.user_id, user_id))
          .limit(1);

        if (existingProfile.length === 0) {
          // Create new profile
          await db
            .insert(user_profiles)
            .values({
              user_id,
              ...profileData,
              created_at: new Date()
             });
        } else { // Update existing profile
          await db
            .update(user_profiles)
            .set(profileData)
            .where(eq(user_profiles.user_id, user_id));
         }

        // Invalidate cache after update
        cacheService.delete(cacheKeys.USER_PROFILE(user_id));
        
        return await this.getUserProfile(user_id);
      },
      // Fallback: return updated profile data merged with existing cached data
      (() => { const cachedProfile = cacheService.get(cacheKeys.USER_PROFILE(user_id));
        if (cachedProfile) {
          return {
            ...cachedProfile,
            profile: { ...cachedProfile.profile, ...profileData  }
          };
        }
        throw new Error('Cannot update profile: database unavailable and no cached data');
      })(),
      `updateUserProfile:${ user_id }`
    );

    if (result.source === 'fallback') { console.warn(`Using fallback data for user profile update: ${user_id }`);
    }

    return result.data;
  }

  async updateUserInterests(user_id: string, interests: string[]) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedInterests = this.validateAndSanitizeInterests(interests);
    
    const result = await databaseService.withFallback(
      async () => {
        // Remove existing interests
        await db
          .delete(user_interests)
          .where(eq(user_interests.user_id, user_id));

        // Add new interests
        if (interests.length > 0) {
          await db
            .insert(user_interests)
            .values(
              interests.map(interest => ({
                user_id,
                interest,
                created_at: new Date()
               }))
            );
        }

        // Invalidate cache after update
        cacheService.delete(cacheKeys.USER_PROFILE(user_id));

        return { success: true };
      },
      // Fallback: simulate success but warn about database unavailability
      { success: false },
      `updateUserInterests:${ user_id }`
    );

    if (result.source === 'fallback') { console.warn(`Cannot update user interests: database unavailable for user ${user_id }`);
    }

    return result.data;
  }

  async updateUserBasicInfo(user_id: string, data: { first_name?: string; last_name?: string; name?: string }) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedData = this.validateAndSanitizeBasicInfo(data);
    
    const result = await databaseService.withFallback(
      async () => {
        await db
          .update(users)
          .set({
            ...data,
            updated_at: new Date()
           })
          .where(eq(users.id, user_id));

        // Invalidate cache after update
        cacheService.delete(cacheKeys.USER_PROFILE(user_id));

        return await this.getUserProfile(user_id);
      },
      // Fallback: return updated basic info merged with cached data
      (() => { const cachedProfile = cacheService.get(cacheKeys.USER_PROFILE(user_id));
        if (cachedProfile) {
          return {
            ...cachedProfile,
            ...data
           };
        }
        throw new Error('Cannot update basic info: database unavailable and no cached data');
      })(),
      `updateUserBasicInfo:${ user_id }`
    );

    if (result.source === 'fallback') { console.warn(`Using fallback data for user basic info update: ${user_id }`);
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
          name: users.name,
          role: users.role,
          verification_status: users.verification_status,
          organization: user_profiles.organization,
          expertise: user_profiles.expertise,
          reputation_score: user_profiles.reputation_score
        })
        .from(users)
        .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
        .where(
          and(
            eq(user_profiles.is_public, true),
            sql`LOWER(${users.name}) LIKE ${searchTerm} OR LOWER(${user_profiles.organization}) LIKE ${searchTerm}`
          )
        )
        .limit(limit);

      return results;
    } catch (error) {
      logger.error('Error searching users:', { component: 'Chanuka', error });
      return [];
    }
  }

  // User Preference Management
  async getUserPreferences(user_id: string): Promise<UserPreferences> { const cacheKey = `${cacheKeys.USER_PROFILE(user_id) }:preferences`;

    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
    const computed = await (async () => {
      const result = await databaseService.withFallback(
        async () => {
          const [user] = await db
            .select({ preferences: users.preferences })
            .from(users)
            .where(eq(users.id, user_id))
            .limit(1);

          if (!user) {
            throw new Error('User not found');
          }

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

          return { ...defaultPreferences, ...(users.preferences as UserPreferences || {}) };
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
        `getUserPreferences:${ user_id }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback preferences for user: ${user_id }`);
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
        const currentPreferences = await this.getUserPreferences(user_id);
        const updatedPreferences = { ...currentPreferences, ...preferences  };

        await db
          .update(users)
          .set({
            preferences: updatedPreferences,
            updated_at: new Date()
          })
          .where(eq(users.id, user_id));

        // Invalidate cache after update
        cacheService.delete(`${ cacheKeys.USER_PROFILE(user_id) }:preferences`);
        cacheService.delete(cacheKeys.USER_PROFILE(user_id));

        return updatedPreferences;
      },
      // Fallback: return merged preferences but warn about database unavailability
      (() => { const currentPreferences = cacheService.get(`${cacheKeys.USER_PROFILE(user_id) }:preferences`) || {
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
      `updateUserPreferences:${ user_id }`
    );

    if (result.source === 'fallback') { console.warn(`Cannot update user preferences: database unavailable for user ${user_id }`);
    }

    return result.data;
  }

  // User Verification Status Handling
  async updateUserVerificationStatus(user_id: string, verification_data: UserVerificationData) { const sanitizedUserId = this.sanitizeUserId(user_id);
    const sanitizedVerificationData = this.validateAndSanitizeVerificationData(verification_data);
    
    const result = await databaseService.withFallback(
      async () => {
        await databaseService.withTransaction(async (tx) => {
          // Update user verification status
          await tx
            .update(users)
            .set({
              verification_status: verification_data.verification_status,
              updated_at: new Date()
             })
            .where(eq(users.id, user_id));

          // Update profile with verification documents if provided
          if (verification_data.verificationDocuments) { const existingProfile = await tx
              .select()
              .from(user_profiles)
              .where(eq(user_profiles.user_id, user_id))
              .limit(1);

            if (existingProfile.length === 0) {
              await tx
                .insert(user_profiles)
                .values({
                  user_id,
                  verificationDocuments: verification_data.verificationDocuments,
                  created_at: new Date()
                 });
            } else {
              await tx
                .update(user_profiles)
                .set({
                  verificationDocuments: verification_data.verificationDocuments
                })
                .where(eq(user_profiles.user_id, user_id));
            }
          }

          // Create notification for status change
          await tx
            .insert(notifications)
            .values({ user_id,
              type: 'verification_status',
              title: 'Verification Status Updated',
              message: `Your verification status has been updated to: ${verification_data.verification_status }`,
              created_at: new Date()
            });
        }, 'updateUserVerificationStatus');

        // Invalidate cache after update
        cacheService.delete(cacheKeys.USER_PROFILE(user_id));

        return await this.getUserProfile(user_id);
      },
      // Fallback: return updated verification status merged with cached data
      (() => { const cachedProfile = cacheService.get(cacheKeys.USER_PROFILE(user_id));
        if (cachedProfile) {
          return {
            ...cachedProfile,
            verification_status: verification_data.verification_status
           };
        }
        throw new Error('Cannot update verification status: database unavailable and no cached data');
      })(),
      `updateUserVerificationStatus:${ user_id }`
    );

    if (result.source === 'fallback') { console.warn(`Cannot update user verification status: database unavailable for user ${user_id }`);
    }

    return result.data;
  }

  async getUserVerificationStatus(user_id: string) { const cacheKey = `${cacheKeys.USER_PROFILE(user_id) }:verification`;

    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) return cached;
    const computed = await (async () => {
      const result = await databaseService.withFallback(
        async () => {
          const [user] = await db
            .select({
              verification_status: users.verification_status,
              verificationDocuments: user_profiles.verificationDocuments
            })
            .from(users)
            .leftJoin(user_profiles, eq(users.id, user_profiles.user_id))
            .where(eq(users.id, user_id))
            .limit(1);

          if (!user) {
            throw new Error('User not found');
          }

          return {
            verification_status: users.verification_status,
            verificationDocuments: users.verificationDocuments,
            canSubmitDocuments: users.verification_status === 'pending' || users.verification_status === 'rejected'
          };
        },
        // Fallback: return default verification status
        {
          verification_status: 'pending',
          verificationDocuments: null,
          canSubmitDocuments: true
        },
        `getUserVerificationStatus:${ user_id }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback verification status for user: ${user_id }`);
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
  async getUserEngagementHistory(user_id: string): Promise<UserEngagementHistory> { const cacheKey = `${cacheKeys.USER_PROFILE(user_id) }:engagement`;

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
            .where(eq(bill_engagement.user_id, user_id));

          // Get comment count
          const [commentStats] = await db
            .select({
              totalComments: count(comments.id)
            })
            .from(comments)
            .where(eq(comments.user_id, user_id));

          // Get recent activity
          const recentEngagement = await db
            .select({ bill_id: bill_engagement.bill_id,
              billTitle: bills.title,
              last_engaged_at: bill_engagement.last_engaged_at,
              engagement_score: bill_engagement.engagement_score
             })
            .from(bill_engagement)
            .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
            .where(eq(bill_engagement.user_id, user_id))
            .orderBy(desc(bill_engagement.last_engaged_at))
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
            ...recentEngagement.map(item => ({ type: 'track' as const,
              bill_id: item.bill_id,
              billTitle: item.billTitle,
              timestamp: item.last_engaged_at || new Date()
             })),
            ...recentComments.map(item => ({ type: 'comment' as const,
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
              eq(bill_engagement.user_id, user_id),
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
            topCategories: topCategories.map(cat => ({
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
        `getUserEngagementHistory:${ user_id }`
      );

      if (result.source === 'fallback') { console.warn(`Using fallback engagement history for user: ${user_id }`);
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

  async updateUserEngagement(user_id: string, bill_id: number, engagement_type: 'view' | 'comment' | 'share') { const result = await databaseService.withFallback(
      async () => {
        await databaseService.withTransaction(async (tx) => {
          // Check if engagement record exists
          const [existingEngagement] = await tx
            .select()
            .from(bill_engagement)
            .where(and(
              eq(bill_engagement.user_id, user_id),
              eq(bill_engagement.bill_id, bill_id)
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
                eq(bill_engagement.user_id, user_id),
                eq(bill_engagement.bill_id, bill_id)
              ));
          } else { // Create new engagement record
            const newEngagement: any = {
               user_id,
               bill_id,
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
        cacheService.delete(`${ cacheKeys.USER_PROFILE(user_id) }:engagement`);

        return { success: true };
      },
      // Fallback: simulate success but warn about database unavailability
      { success: false },
      `updateUserEngagement:${ user_id }:${ bill_id }`
    );

    if (result.source === 'fallback') { console.warn(`Cannot update user engagement: database unavailable for user ${user_id }, bill ${ bill_id }`);
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














































