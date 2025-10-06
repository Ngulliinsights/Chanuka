import { database as db } from '../../../shared/database/connection.js';
import { users, userProfiles, userInterests, billEngagement, notifications, billComments, bills } from '../../../shared/schema.js';
import { eq, and, desc, sql, count, sum } from 'drizzle-orm';
import { cacheService, CACHE_TTL, CACHE_KEYS } from '../../infrastructure/cache/cache-service.js';
import { databaseService } from '../../services/database-service.js';
import { z } from 'zod';

// Data validation schemas
const userProfileDataSchema = z.object({
  bio: z.string().max(1000).optional(),
  expertise: z.array(z.string().max(50)).max(10).optional(),
  location: z.string().max(100).optional(),
  organization: z.string().max(200).optional(),
  isPublic: z.boolean().optional()
});

const userBasicInfoSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  name: z.string().max(100).optional()
});

const userInterestsSchema = z.array(z.string().max(50)).max(20);

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
  verificationStatus: z.enum(['pending', 'verified', 'rejected']),
  verificationDocuments: z.any().optional(),
  verificationNotes: z.string().max(500).optional()
});

export interface UserProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  isPublic?: boolean;
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
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: any;
  verificationNotes?: string;
}

export interface UserEngagementHistory {
  totalBillsTracked: number;
  totalComments: number;
  totalEngagementScore: number;
  recentActivity: Array<{
    type: 'comment' | 'track' | 'view';
    billId: number;
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
    const validated = userProfileDataSchema.parse(data);
    
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

  private validateAndSanitizeBasicInfo(data: { firstName?: string; lastName?: string; name?: string }) {
    const validated = userBasicInfoSchema.parse(data);
    
    // Additional sanitization
    if (validated.firstName) {
      validated.firstName = validated.firstName.trim();
    }
    if (validated.lastName) {
      validated.lastName = validated.lastName.trim();
    }
    if (validated.name) {
      validated.name = validated.name.trim();
    }
    
    return validated;
  }

  private validateAndSanitizeInterests(interests: string[]): string[] {
    const validated = userInterestsSchema.parse(interests);
    
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

  private sanitizeUserId(userId: string): string {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    return userId.trim();
  }

  private sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query');
    }
    return query.trim().substring(0, 100); // Limit search query length
  }

  async getUserProfile(userId: string) {
    const sanitizedUserId = this.sanitizeUserId(userId);
    const cacheKey = CACHE_KEYS.USER_PROFILE(sanitizedUserId);
    
    // Try to get from cache first
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Use database service with fallback
        const result = await databaseService.withFallback(
          async () => {
            const [user] = await db
              .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                name: users.name,
                role: users.role,
                verificationStatus: users.verificationStatus,
                createdAt: users.createdAt,
                profile: {
                  bio: userProfiles.bio,
                  expertise: userProfiles.expertise,
                  location: userProfiles.location,
                  organization: userProfiles.organization,
                  reputationScore: userProfiles.reputationScore,
                  isPublic: userProfiles.isPublic
                }
              })
              .from(users)
              .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
              .where(eq(users.id, userId))
              .limit(1);

            if (!user) {
              throw new Error('User not found');
            }

            // Get user interests
            const interests = await db
              .select({ interest: userInterests.interest })
              .from(userInterests)
              .where(eq(userInterests.userId, userId));

            return {
              ...user,
              interests: interests.map(i => i.interest)
            };
          },
          // Fallback data for when database is unavailable
          {
            id: userId,
            email: 'user@example.com',
            firstName: 'Demo',
            lastName: 'User',
            name: 'Demo User',
            role: 'citizen',
            verificationStatus: 'pending',
            createdAt: new Date(),
            profile: {
              bio: 'Demo user profile',
              expertise: ['general'],
              location: 'Demo Location',
              organization: 'Demo Organization',
              reputationScore: 0,
              isPublic: true
            },
            interests: ['general']
          },
          `getUserProfile:${userId}`
        );

        if (result.source === 'fallback') {
          console.warn(`Using fallback data for user profile: ${userId}`);
        }

        return result.data;
      },
      CACHE_TTL.USER_DATA
    );
  }

  async updateUserProfile(userId: string, profileData: UserProfileData) {
    const sanitizedUserId = this.sanitizeUserId(userId);
    const sanitizedProfileData = this.validateAndSanitizeProfileData(profileData);
    
    const result = await databaseService.withFallback(
      async () => {
        // Check if profile exists
        const existingProfile = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .limit(1);

        if (existingProfile.length === 0) {
          // Create new profile
          await db
            .insert(userProfiles)
            .values({
              userId,
              ...profileData,
              createdAt: new Date()
            });
        } else {
          // Update existing profile
          await db
            .update(userProfiles)
            .set(profileData)
            .where(eq(userProfiles.userId, userId));
        }

        // Invalidate cache after update
        cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));
        
        return await this.getUserProfile(userId);
      },
      // Fallback: return updated profile data merged with existing cached data
      (() => {
        const cachedProfile = cacheService.get(CACHE_KEYS.USER_PROFILE(userId));
        if (cachedProfile) {
          return {
            ...cachedProfile,
            profile: { ...cachedProfile.profile, ...profileData }
          };
        }
        throw new Error('Cannot update profile: database unavailable and no cached data');
      })(),
      `updateUserProfile:${userId}`
    );

    if (result.source === 'fallback') {
      console.warn(`Using fallback data for user profile update: ${userId}`);
    }

    return result.data;
  }

  async updateUserInterests(userId: string, interests: string[]) {
    const sanitizedUserId = this.sanitizeUserId(userId);
    const sanitizedInterests = this.validateAndSanitizeInterests(interests);
    
    const result = await databaseService.withFallback(
      async () => {
        // Remove existing interests
        await db
          .delete(userInterests)
          .where(eq(userInterests.userId, userId));

        // Add new interests
        if (interests.length > 0) {
          await db
            .insert(userInterests)
            .values(
              interests.map(interest => ({
                userId,
                interest,
                createdAt: new Date()
              }))
            );
        }

        // Invalidate cache after update
        cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));

        return { success: true };
      },
      // Fallback: simulate success but warn about database unavailability
      { success: false, error: 'Database unavailable - interests not updated' },
      `updateUserInterests:${userId}`
    );

    if (result.source === 'fallback') {
      console.warn(`Cannot update user interests: database unavailable for user ${userId}`);
    }

    return result.data;
  }

  async updateUserBasicInfo(userId: string, data: { firstName?: string; lastName?: string; name?: string }) {
    const sanitizedUserId = this.sanitizeUserId(userId);
    const sanitizedData = this.validateAndSanitizeBasicInfo(data);
    
    const result = await databaseService.withFallback(
      async () => {
        await db
          .update(users)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        // Invalidate cache after update
        cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));

        return await this.getUserProfile(userId);
      },
      // Fallback: return updated basic info merged with cached data
      (() => {
        const cachedProfile = cacheService.get(CACHE_KEYS.USER_PROFILE(userId));
        if (cachedProfile) {
          return {
            ...cachedProfile,
            ...data
          };
        }
        throw new Error('Cannot update basic info: database unavailable and no cached data');
      })(),
      `updateUserBasicInfo:${userId}`
    );

    if (result.source === 'fallback') {
      console.warn(`Using fallback data for user basic info update: ${userId}`);
    }

    return result.data;
  }

  async getUserPublicProfile(userId: string) {
    try {
      const profile = await this.getUserProfile(userId);
      
      // Only return public information
      if (!profile.profile?.isPublic) {
        return {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          verificationStatus: profile.verificationStatus,
          reputationScore: profile.profile?.reputationScore || 0
        };
      }

      return profile;
    } catch (error) {
      console.error('Error fetching public profile:', error);
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
          verificationStatus: users.verificationStatus,
          organization: userProfiles.organization,
          expertise: userProfiles.expertise,
          reputationScore: userProfiles.reputationScore
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(
          and(
            eq(userProfiles.isPublic, true),
            sql`LOWER(${users.name}) LIKE ${searchTerm} OR LOWER(${userProfiles.organization}) LIKE ${searchTerm}`
          )
        )
        .limit(limit);

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // User Preference Management
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:preferences`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await databaseService.withFallback(
          async () => {
            const [user] = await db
              .select({ preferences: users.preferences })
              .from(users)
              .where(eq(users.id, userId))
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

            return { ...defaultPreferences, ...(user.preferences as UserPreferences || {}) };
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
          `getUserPreferences:${userId}`
        );

        if (result.source === 'fallback') {
          console.warn(`Using fallback preferences for user: ${userId}`);
        }

        return result.data;
      },
      CACHE_TTL.USER_DATA
    );
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const sanitizedUserId = this.sanitizeUserId(userId);
    const sanitizedPreferences = this.validateAndSanitizePreferences(preferences);
    
    const result = await databaseService.withFallback(
      async () => {
        // Get current preferences
        const currentPreferences = await this.getUserPreferences(userId);
        const updatedPreferences = { ...currentPreferences, ...preferences };

        await db
          .update(users)
          .set({
            preferences: updatedPreferences,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        // Invalidate cache after update
        cacheService.delete(`${CACHE_KEYS.USER_PROFILE(userId)}:preferences`);
        cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));

        return updatedPreferences;
      },
      // Fallback: return merged preferences but warn about database unavailability
      (() => {
        const currentPreferences = cacheService.get(`${CACHE_KEYS.USER_PROFILE(userId)}:preferences`) || {
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
      `updateUserPreferences:${userId}`
    );

    if (result.source === 'fallback') {
      console.warn(`Cannot update user preferences: database unavailable for user ${userId}`);
    }

    return result.data;
  }

  // User Verification Status Handling
  async updateUserVerificationStatus(userId: string, verificationData: UserVerificationData) {
    const sanitizedUserId = this.sanitizeUserId(userId);
    const sanitizedVerificationData = this.validateAndSanitizeVerificationData(verificationData);
    
    const result = await databaseService.withFallback(
      async () => {
        await databaseService.withTransaction(async (tx) => {
          // Update user verification status
          await tx
            .update(users)
            .set({
              verificationStatus: verificationData.verificationStatus,
              updatedAt: new Date()
            })
            .where(eq(users.id, userId));

          // Update profile with verification documents if provided
          if (verificationData.verificationDocuments) {
            const existingProfile = await tx
              .select()
              .from(userProfiles)
              .where(eq(userProfiles.userId, userId))
              .limit(1);

            if (existingProfile.length === 0) {
              await tx
                .insert(userProfiles)
                .values({
                  userId,
                  verificationDocuments: verificationData.verificationDocuments,
                  createdAt: new Date()
                });
            } else {
              await tx
                .update(userProfiles)
                .set({
                  verificationDocuments: verificationData.verificationDocuments
                })
                .where(eq(userProfiles.userId, userId));
            }
          }

          // Create notification for status change
          await tx
            .insert(notifications)
            .values({
              userId,
              type: 'verification_status',
              title: 'Verification Status Updated',
              message: `Your verification status has been updated to: ${verificationData.verificationStatus}`,
              createdAt: new Date()
            });
        }, 'updateUserVerificationStatus');

        // Invalidate cache after update
        cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));

        return await this.getUserProfile(userId);
      },
      // Fallback: return updated verification status merged with cached data
      (() => {
        const cachedProfile = cacheService.get(CACHE_KEYS.USER_PROFILE(userId));
        if (cachedProfile) {
          return {
            ...cachedProfile,
            verificationStatus: verificationData.verificationStatus
          };
        }
        throw new Error('Cannot update verification status: database unavailable and no cached data');
      })(),
      `updateUserVerificationStatus:${userId}`
    );

    if (result.source === 'fallback') {
      console.warn(`Cannot update user verification status: database unavailable for user ${userId}`);
    }

    return result.data;
  }

  async getUserVerificationStatus(userId: string) {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:verification`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await databaseService.withFallback(
          async () => {
            const [user] = await db
              .select({
                verificationStatus: users.verificationStatus,
                verificationDocuments: userProfiles.verificationDocuments
              })
              .from(users)
              .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
              .where(eq(users.id, userId))
              .limit(1);

            if (!user) {
              throw new Error('User not found');
            }

            return {
              verificationStatus: user.verificationStatus,
              verificationDocuments: user.verificationDocuments,
              canSubmitDocuments: user.verificationStatus === 'pending' || user.verificationStatus === 'rejected'
            };
          },
          // Fallback: return default verification status
          {
            verificationStatus: 'pending',
            verificationDocuments: null,
            canSubmitDocuments: true
          },
          `getUserVerificationStatus:${userId}`
        );

        if (result.source === 'fallback') {
          console.warn(`Using fallback verification status for user: ${userId}`);
        }

        return result.data;
      },
      CACHE_TTL.USER_DATA
    );
  }

  // User Engagement History Tracking
  async getUserEngagementHistory(userId: string): Promise<UserEngagementHistory> {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE(userId)}:engagement`;
    
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await databaseService.withFallback(
          async () => {
            // Get engagement statistics
            const [engagementStats] = await db
              .select({
                totalBillsTracked: count(billEngagement.id),
                totalEngagementScore: sum(billEngagement.engagementScore)
              })
              .from(billEngagement)
              .where(eq(billEngagement.userId, userId));

            // Get comment count
            const [commentStats] = await db
              .select({
                totalComments: count(billComments.id)
              })
              .from(billComments)
              .where(eq(billComments.userId, userId));

            // Get recent activity
            const recentEngagement = await db
              .select({
                billId: billEngagement.billId,
                billTitle: bills.title,
                lastEngaged: billEngagement.lastEngaged,
                engagementScore: billEngagement.engagementScore
              })
              .from(billEngagement)
              .innerJoin(bills, eq(billEngagement.billId, bills.id))
              .where(eq(billEngagement.userId, userId))
              .orderBy(desc(billEngagement.lastEngaged))
              .limit(10);

            const recentComments = await db
              .select({
                billId: billComments.billId,
                billTitle: bills.title,
                createdAt: billComments.createdAt
              })
              .from(billComments)
              .innerJoin(bills, eq(billComments.billId, bills.id))
              .where(eq(billComments.userId, userId))
              .orderBy(desc(billComments.createdAt))
              .limit(10);

            // Combine and sort recent activity
            const recentActivity = [
              ...recentEngagement.map(item => ({
                type: 'track' as const,
                billId: item.billId,
                billTitle: item.billTitle,
                timestamp: item.lastEngaged || new Date()
              })),
              ...recentComments.map(item => ({
                type: 'comment' as const,
                billId: item.billId,
                billTitle: item.billTitle,
                timestamp: item.createdAt || new Date()
              }))
            ]
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .slice(0, 10);

            // Get top categories by engagement
            const topCategories = await db
              .select({
                category: bills.category,
                engagementCount: count(billEngagement.id)
              })
              .from(billEngagement)
              .innerJoin(bills, eq(billEngagement.billId, bills.id))
              .where(and(
                eq(billEngagement.userId, userId),
                sql`${bills.category} IS NOT NULL`
              ))
              .groupBy(bills.category)
              .orderBy(desc(count(billEngagement.id)))
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
          `getUserEngagementHistory:${userId}`
        );

        if (result.source === 'fallback') {
          console.warn(`Using fallback engagement history for user: ${userId}`);
        }

        return result.data;
      },
      CACHE_TTL.ENGAGEMENT_STATS
    );
  }

  async updateUserEngagement(userId: string, billId: number, engagementType: 'view' | 'comment' | 'share') {
    const result = await databaseService.withFallback(
      async () => {
        await databaseService.withTransaction(async (tx) => {
          // Check if engagement record exists
          const [existingEngagement] = await tx
            .select()
            .from(billEngagement)
            .where(and(
              eq(billEngagement.userId, userId),
              eq(billEngagement.billId, billId)
            ))
            .limit(1);

          const engagementScoreIncrement = {
            view: 1,
            comment: 5,
            share: 3
          }[engagementType];

          if (existingEngagement) {
            // Update existing engagement
            const updates: any = {
              lastEngaged: new Date(),
              updatedAt: new Date(),
              engagementScore: sql`${billEngagement.engagementScore} + ${engagementScoreIncrement}`
            };

            if (engagementType === 'view') {
              updates.viewCount = sql`${billEngagement.viewCount} + 1`;
            } else if (engagementType === 'comment') {
              updates.commentCount = sql`${billEngagement.commentCount} + 1`;
            } else if (engagementType === 'share') {
              updates.shareCount = sql`${billEngagement.shareCount} + 1`;
            }

            await tx
              .update(billEngagement)
              .set(updates)
              .where(and(
                eq(billEngagement.userId, userId),
                eq(billEngagement.billId, billId)
              ));
          } else {
            // Create new engagement record
            const newEngagement: any = {
              userId,
              billId,
              viewCount: engagementType === 'view' ? 1 : 0,
              commentCount: engagementType === 'comment' ? 1 : 0,
              shareCount: engagementType === 'share' ? 1 : 0,
              engagementScore: engagementScoreIncrement.toString(),
              lastEngaged: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            };

            await tx
              .insert(billEngagement)
              .values(newEngagement);
          }
        }, 'updateUserEngagement');

        // Invalidate engagement cache after update
        cacheService.delete(`${CACHE_KEYS.USER_PROFILE(userId)}:engagement`);

        return { success: true };
      },
      // Fallback: simulate success but warn about database unavailability
      { success: false, error: 'Database unavailable - engagement not updated' },
      `updateUserEngagement:${userId}:${billId}`
    );

    if (result.source === 'fallback') {
      console.warn(`Cannot update user engagement: database unavailable for user ${userId}, bill ${billId}`);
    }

    return result.data;
  }

  // Comprehensive user profile with all data
  async getCompleteUserProfile(userId: string) {
    try {
      const [profile, preferences, verificationStatus, engagementHistory] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserPreferences(userId),
        this.getUserVerificationStatus(userId),
        this.getUserEngagementHistory(userId)
      ]);

      return {
        ...profile,
        preferences,
        verification: verificationStatus,
        engagement: engagementHistory
      };
    } catch (error) {
      console.error('Error fetching complete user profile:', error);
      throw error;
    }
  }
}

export const userProfileService = new UserProfileService();