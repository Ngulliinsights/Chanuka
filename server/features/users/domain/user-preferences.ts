import { database as db } from '../../../../shared/database/connection';
import { user, billEngagement } from '../../../../shared/schema';

// Alias for backward compatibility
const users = user;
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../../shared/core/src/observability/logging';

export interface BillTrackingPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  updateFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone?: string; // User's timezone
  };
  smartFiltering: {
    enabled: boolean;
    interestBasedFiltering: boolean;
    priorityThreshold: 'low' | 'medium' | 'high';
    categoryFilters: string[]; // Categories user is interested in
    keywordFilters: string[]; // Keywords to watch for
    sponsorFilters: string[]; // Specific sponsors to follow
  };
  advancedSettings: {
    digestSchedule: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number; // 0-6 for weekly
      dayOfMonth?: number; // 1-31 for monthly
      timeOfDay: string; // HH:MM format
    };
    escalationRules: {
      enabled: boolean;
      urgentBillsImmediate: boolean;
      importantSponsorsImmediate: boolean;
      highEngagementImmediate: boolean;
    };
    batchingRules: {
      maxBatchSize: number;
      batchTimeWindow: number; // minutes
      similarUpdatesGrouping: boolean;
    };
  };
}

export interface UserNotificationPreferences {
  billTracking: BillTrackingPreferences;
  general: {
    systemUpdates: boolean;
    securityAlerts: boolean;
    weeklyDigest: boolean;
  };
  privacy: {
    shareEngagement: boolean;
    publicProfile: boolean;
  };
}

const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  billTracking: {
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true,
    updateFrequency: 'immediate',
    notificationChannels: {
      inApp: true,
      email: false,
      push: false,
      sms: false
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC'
    },
    smartFiltering: {
      enabled: false,
      interestBasedFiltering: false,
      priorityThreshold: 'medium',
      categoryFilters: [],
      keywordFilters: [],
      sponsorFilters: []
    },
    advancedSettings: {
      digestSchedule: {
        enabled: false,
        frequency: 'daily',
        timeOfDay: '09:00'
      },
      escalationRules: {
        enabled: false,
        urgentBillsImmediate: true,
        importantSponsorsImmediate: false,
        highEngagementImmediate: false
      },
      batchingRules: {
        maxBatchSize: 10,
        batchTimeWindow: 30,
        similarUpdatesGrouping: true
      }
    }
  },
  general: {
    systemUpdates: true,
    securityAlerts: true,
    weeklyDigest: false
  },
  privacy: {
    shareEngagement: true,
    publicProfile: true
  }
};

export class UserPreferencesService {
  // Get user's notification preferences
  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    try {
      const user = await db
        .select({
          preferences: users.preferences
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Merge with defaults to ensure all properties exist
      const userPrefs = user[0].preferences as Partial<UserNotificationPreferences> || {};
      return this.mergeWithDefaults(userPrefs);
    } catch (error) {
  logger.error(`Error getting preferences for user ${userId}:`, { component: 'Chanuka' }, error);
      return DEFAULT_PREFERENCES;
    }
  }

  // Update user's notification preferences
  async updateUserPreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> {
    try {
      // Get current preferences
      const currentPrefs = await this.getUserPreferences(userId);
      
      // Deep merge with current preferences
      const updatedPrefs = this.deepMerge(currentPrefs, preferences);

      // Update in database
      await db
        .update(users)
        .set({
          preferences: updatedPrefs,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`Updated preferences for user ${userId}`);
      return updatedPrefs;
    } catch (error) {
      console.error(`Error updating preferences for user ${userId}:`, error);
      throw error;
    }
  }

  // Update specific bill tracking preferences
  async updateBillTrackingPreferences(userId: string, preferences: Partial<BillTrackingPreferences>): Promise<BillTrackingPreferences> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedBillPrefs = { ...currentPrefs.billTracking, ...preferences };
      
      await this.updateUserPreferences(userId, {
        billTracking: updatedBillPrefs
      });

      return updatedBillPrefs;
    } catch (error) {
      console.error(`Error updating bill tracking preferences for user ${userId}:`, error);
      throw error;
    }
  }

  // Check if user should receive notification based on preferences and timing
  async shouldNotifyUser(userId: string, notificationType: keyof BillTrackingPreferences, channel: keyof BillTrackingPreferences['notificationChannels'] = 'inApp'): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const billPrefs = preferences.billTracking;

      // Check if notification type is enabled
      if (!billPrefs[notificationType]) {
        return false;
      }

      // Check if notification channel is enabled
      if (!billPrefs.notificationChannels[channel]) {
        return false;
      }

      // Check quiet hours
      if (billPrefs.quietHours?.enabled && this.isInQuietHours(billPrefs.quietHours)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error checking notification eligibility for user ${userId}:`, error);
      return false;
    }
  }

  // Get users who should be notified for a specific bill update
  async getUsersToNotify(billId: number, notificationType: keyof BillTrackingPreferences): Promise<Array<{ userId: string; preferences: BillTrackingPreferences }>> {
    try {
      // Get all users tracking this bill
      const trackers = await db
        .select({
          userId: billEngagement.userId,
          userPreferences: users.preferences
        })
        .from(billEngagement)
        .innerJoin(users, eq(billEngagement.userId, users.id))
        .where(eq(billEngagement.billId, billId));

      const eligibleUsers: Array<{ userId: string; preferences: BillTrackingPreferences }> = [];

      for (const tracker of trackers) {
        const userPrefs = this.mergeWithDefaults(tracker.userPreferences as Partial<UserNotificationPreferences> || {});
        
        if (await this.shouldNotifyUser(tracker.userId, notificationType)) {
          eligibleUsers.push({
            userId: tracker.userId,
            preferences: userPrefs.billTracking
          });
        }
      }

      return eligibleUsers;
    } catch (error) {
      console.error(`Error getting users to notify for bill ${billId}:`, error);
      return [];
    }
  }

  // Batch update preferences for multiple users (admin function)
  async batchUpdatePreferences(updates: Array<{ userId: string; preferences: Partial<UserNotificationPreferences> }>): Promise<void> {
    try {
      const updatePromises = updates.map(update => 
        this.updateUserPreferences(update.userId, update.preferences)
      );

      await Promise.allSettled(updatePromises);
      console.log(`Batch updated preferences for ${updates.length} users`);
    } catch (error) {
      logger.error('Error in batch preference update:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  // Get preference statistics (for admin dashboard)
  async getPreferenceStats(): Promise<{
    totalUsers: number;
    immediateNotifications: number;
    emailEnabled: number;
    pushEnabled: number;
    quietHoursEnabled: number;
  }> {
    try {
      const allUsers = await db
        .select({
          preferences: users.preferences
        })
        .from(users);

      let immediateNotifications = 0;
      let emailEnabled = 0;
      let pushEnabled = 0;
      let quietHoursEnabled = 0;

      for (const user of allUsers) {
        const prefs = this.mergeWithDefaults(user.preferences as Partial<UserNotificationPreferences> || {});
        
        if (prefs.billTracking.updateFrequency === 'immediate') {
          immediateNotifications++;
        }
        if (prefs.billTracking.notificationChannels.email) {
          emailEnabled++;
        }
        if (prefs.billTracking.notificationChannels.push) {
          pushEnabled++;
        }
        if (prefs.billTracking.quietHours?.enabled) {
          quietHoursEnabled++;
        }
      }

      return {
        totalUsers: allUsers.length,
        immediateNotifications,
        emailEnabled,
        pushEnabled,
        quietHoursEnabled
      };
    } catch (error) {
      logger.error('Error getting preference stats:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  // Helper method to check if current time is in quiet hours
  private isInQuietHours(quietHours: { startTime: string; endTime: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  // Helper method to merge preferences with defaults
  private mergeWithDefaults(userPrefs: Partial<UserNotificationPreferences>): UserNotificationPreferences {
    return {
      billTracking: {
        ...DEFAULT_PREFERENCES.billTracking,
        ...userPrefs.billTracking,
        notificationChannels: {
          ...DEFAULT_PREFERENCES.billTracking.notificationChannels,
          ...userPrefs.billTracking?.notificationChannels
        },
        quietHours: {
          ...DEFAULT_PREFERENCES.billTracking.quietHours,
          ...(userPrefs.billTracking?.quietHours || {})
        },
        smartFiltering: {
          ...DEFAULT_PREFERENCES.billTracking.smartFiltering,
          ...userPrefs.billTracking?.smartFiltering
        },
        advancedSettings: {
          ...DEFAULT_PREFERENCES.billTracking.advancedSettings,
          ...userPrefs.billTracking?.advancedSettings,
          digestSchedule: {
            ...DEFAULT_PREFERENCES.billTracking.advancedSettings.digestSchedule,
            ...userPrefs.billTracking?.advancedSettings?.digestSchedule
          },
          escalationRules: {
            ...DEFAULT_PREFERENCES.billTracking.advancedSettings.escalationRules,
            ...userPrefs.billTracking?.advancedSettings?.escalationRules
          },
          batchingRules: {
            ...DEFAULT_PREFERENCES.billTracking.advancedSettings.batchingRules,
            ...userPrefs.billTracking?.advancedSettings?.batchingRules
          }
        }
      },
      general: {
        ...DEFAULT_PREFERENCES.general,
        ...userPrefs.general
      },
      privacy: {
        ...DEFAULT_PREFERENCES.privacy,
        ...userPrefs.privacy
      }
    };
  }

  // Helper method for deep merging objects
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

export const userPreferencesService = new UserPreferencesService();













































