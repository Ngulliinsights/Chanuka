import { db } from '../db.js';
import { users, userProfiles, userInterests } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

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

export class UserProfileService {
  async getUserProfile(userId: string) {
    try {
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
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, profileData: UserProfileData) {
    try {
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

      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async updateUserInterests(userId: string, interests: string[]) {
    try {
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

      return { success: true };
    } catch (error) {
      console.error('Error updating user interests:', error);
      throw error;
    }
  }

  async updateUserBasicInfo(userId: string, data: { firstName?: string; lastName?: string; name?: string }) {
    try {
      await db
        .update(users)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Error updating user basic info:', error);
      throw error;
    }
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
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
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
            // Add search conditions here
          )
        )
        .limit(limit);

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
}

export const userProfileService = new UserProfileService();