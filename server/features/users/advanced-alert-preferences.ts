import { database as db, users, bills, billEngagement, userInterests } from '../../../shared/database/connection.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { userPreferencesService, type BillTrackingPreferences } from './user-preferences.js';

export interface GranularAlertSettings {
  billStatusChanges: {
    enabled: boolean;
    priorities: ('low' | 'medium' | 'high' | 'urgent')[];
    categories: string[];
    sponsors: string[];
    customKeywords: string[];
  };
  votingAlerts: {
    enabled: boolean;
    advanceNotice: number; // hours before voting
    reminderFrequency: 'once' | 'daily' | 'hourly';
    includeVotingHistory: boolean;
  };
  amendmentTracking: {
    enabled: boolean;
    significantChangesOnly: boolean;
    trackSpecificSections: string[];
    notifyOnWithdrawal: boolean;
  };
  sponsorshipChanges: {
    enabled: boolean;
    newSponsors: boolean;
    withdrawnSponsors: boolean;
    sponsorConflictAlerts: boolean;
  };
  engagementThresholds: {
    enabled: boolean;
    commentThreshold: number;
    viewThreshold: number;
    shareThreshold: number;
    notifyOnTrending: boolean;
  };
}

export interface NotificationChannelConfig {
  inApp: {
    enabled: boolean;
    showDesktopNotifications: boolean;
    soundEnabled: boolean;
    badgeCount: boolean;
  };
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    digestFormat: 'summary' | 'detailed' | 'custom';
    includeAnalytics: boolean;
    customTemplate?: string;
  };
  sms: {
    enabled: boolean;
    urgentOnly: boolean;
    phoneNumber?: string;
    verified: boolean;
    maxPerDay: number;
  };
  push: {
    enabled: boolean;
    deviceTokens: string[];
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM
      end: string;   // HH:MM
      timezone: string;
    };
    categories: {
      urgent: boolean;
      bills: boolean;
      comments: boolean;
      voting: boolean;
    };
  };
  webhook: {
    enabled: boolean;
    url?: string;
    secret?: string;
    events: string[];
    retryPolicy: {
      maxRetries: number;
      backoffMultiplier: number;
    };
  };
}

export interface SmartFilteringConfig {
  interestBasedFiltering: {
    enabled: boolean;
    useEngagementHistory: boolean;
    useExplicitInterests: boolean;
    learningEnabled: boolean;
    confidenceThreshold: number; // 0-1
  };
  contentFiltering: {
    enabled: boolean;
    keywordMatching: {
      includeKeywords: string[];
      excludeKeywords: string[];
      caseSensitive: boolean;
      wholeWordsOnly: boolean;
    };
    categoryFiltering: {
      includedCategories: string[];
      excludedCategories: string[];
      subcategorySupport: boolean;
    };
    complexityFiltering: {
      enabled: boolean;
      minComplexity: number; // 1-10
      maxComplexity: number; // 1-10
    };
  };
  temporalFiltering: {
    enabled: boolean;
    recentActivityWeight: number; // 0-1
    timeDecayFactor: number; // 0-1
    seasonalAdjustments: boolean;
  };
  socialFiltering: {
    enabled: boolean;
    followedSponsors: string[];
    trustedExperts: string[];
    communityEngagement: boolean;
    viralityThreshold: number;
  };
}

export interface NotificationSchedulingConfig {
  batchingRules: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeWindow: number; // minutes
    priorityOverride: boolean; // urgent notifications bypass batching
    similarContentGrouping: boolean;
    crossChannelDeduplication: boolean;
  };
  schedulingRules: {
    respectQuietHours: boolean;
    workingHoursOnly: boolean;
    customSchedule: {
      enabled: boolean;
      allowedHours: number[]; // 0-23
      allowedDays: number[];  // 0-6 (Sunday-Saturday)
      timezone: string;
    };
    delayRules: {
      minDelayBetweenNotifications: number; // minutes
      exponentialBackoff: boolean;
      maxDelayTime: number; // minutes
    };
  };
  digestScheduling: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    preferredTime: string; // HH:MM
    dayOfWeek?: number; // for weekly
    dayOfMonth?: number; // for monthly
    includeAnalytics: boolean;
    customSections: string[];
  };
}

export interface AdvancedAlertPreferences {
  userId: string;
  granularSettings: GranularAlertSettings;
  channelConfigs: NotificationChannelConfig;
  smartFiltering: SmartFilteringConfig;
  scheduling: NotificationSchedulingConfig;
  metadata: {
    version: string;
    lastUpdated: Date;
    migrationStatus: string;
    experimentalFeatures: string[];
  };
}

export class AdvancedAlertPreferencesService {
  private readonly DEFAULT_PREFERENCES: Omit<AdvancedAlertPreferences, 'userId'> = {
    granularSettings: {
      billStatusChanges: {
        enabled: true,
        priorities: ['medium', 'high', 'urgent'],
        categories: [],
        sponsors: [],
        customKeywords: []
      },
      votingAlerts: {
        enabled: true,
        advanceNotice: 24,
        reminderFrequency: 'once',
        includeVotingHistory: false
      },
      amendmentTracking: {
        enabled: false,
        significantChangesOnly: true,
        trackSpecificSections: [],
        notifyOnWithdrawal: true
      },
      sponsorshipChanges: {
        enabled: false,
        newSponsors: true,
        withdrawnSponsors: true,
        sponsorConflictAlerts: false
      },
      engagementThresholds: {
        enabled: false,
        commentThreshold: 10,
        viewThreshold: 100,
        shareThreshold: 5,
        notifyOnTrending: true
      }
    },
    channelConfigs: {
      inApp: {
        enabled: true,
        showDesktopNotifications: true,
        soundEnabled: false,
        badgeCount: true
      },
      email: {
        enabled: false,
        frequency: 'daily',
        digestFormat: 'summary',
        includeAnalytics: false
      },
      sms: {
        enabled: false,
        urgentOnly: true,
        verified: false,
        maxPerDay: 3
      },
      push: {
        enabled: false,
        deviceTokens: [],
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC'
        },
        categories: {
          urgent: true,
          bills: true,
          comments: false,
          voting: true
        }
      },
      webhook: {
        enabled: false,
        events: [],
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2
        }
      }
    },
    smartFiltering: {
      interestBasedFiltering: {
        enabled: false,
        useEngagementHistory: true,
        useExplicitInterests: true,
        learningEnabled: false,
        confidenceThreshold: 0.6
      },
      contentFiltering: {
        enabled: false,
        keywordMatching: {
          includeKeywords: [],
          excludeKeywords: [],
          caseSensitive: false,
          wholeWordsOnly: true
        },
        categoryFiltering: {
          includedCategories: [],
          excludedCategories: [],
          subcategorySupport: false
        },
        complexityFiltering: {
          enabled: false,
          minComplexity: 1,
          maxComplexity: 10
        }
      },
      temporalFiltering: {
        enabled: false,
        recentActivityWeight: 0.7,
        timeDecayFactor: 0.1,
        seasonalAdjustments: false
      },
      socialFiltering: {
        enabled: false,
        followedSponsors: [],
        trustedExperts: [],
        communityEngagement: false,
        viralityThreshold: 50
      }
    },
    scheduling: {
      batchingRules: {
        enabled: true,
        maxBatchSize: 5,
        batchTimeWindow: 30,
        priorityOverride: true,
        similarContentGrouping: true,
        crossChannelDeduplication: true
      },
      schedulingRules: {
        respectQuietHours: true,
        workingHoursOnly: false,
        customSchedule: {
          enabled: false,
          allowedHours: Array.from({length: 24}, (_, i) => i),
          allowedDays: Array.from({length: 7}, (_, i) => i),
          timezone: 'UTC'
        },
        delayRules: {
          minDelayBetweenNotifications: 5,
          exponentialBackoff: false,
          maxDelayTime: 60
        }
      },
      digestScheduling: {
        enabled: false,
        frequency: 'daily',
        preferredTime: '09:00',
        includeAnalytics: true,
        customSections: []
      }
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date(),
      migrationStatus: 'current',
      experimentalFeatures: []
    }
  };

  /**
   * Get user's advanced alert preferences
   */
  async getAdvancedPreferences(userId: string): Promise<AdvancedAlertPreferences> {
    try {
      const user = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error('User not found');
      }

      const userPrefs = user[0].preferences as any;
      const advancedPrefs = userPrefs?.advancedAlerts;

      if (!advancedPrefs) {
        // Return default preferences for new users
        return {
          userId,
          ...this.DEFAULT_PREFERENCES
        };
      }

      // Merge with defaults to ensure all properties exist
      return this.mergeWithDefaults(userId, advancedPrefs);
    } catch (error) {
      console.error(`Error getting advanced preferences for user ${userId}:`, error);
      return {
        userId,
        ...this.DEFAULT_PREFERENCES
      };
    }
  }

  /**
   * Update user's advanced alert preferences
   */
  async updateAdvancedPreferences(
    userId: string, 
    updates: Partial<Omit<AdvancedAlertPreferences, 'userId'>>
  ): Promise<AdvancedAlertPreferences> {
    try {
      const currentPrefs = await this.getAdvancedPreferences(userId);
      const updatedPrefs = this.deepMerge(currentPrefs, updates);
      
      // Update metadata
      updatedPrefs.metadata.lastUpdated = new Date();
      updatedPrefs.metadata.version = '1.0.0';

      // Get current user preferences
      const user = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const currentUserPrefs = user[0]?.preferences as any || {};
      
      // Update the advancedAlerts section
      const newPreferences = {
        ...currentUserPrefs,
        advancedAlerts: updatedPrefs
      };

      await db
        .update(users)
        .set({
          preferences: newPreferences,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`Updated advanced alert preferences for user ${userId}`);
      return updatedPrefs;
    } catch (error) {
      console.error(`Error updating advanced preferences for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update specific granular settings
   */
  async updateGranularSettings(
    userId: string,
    settings: Partial<GranularAlertSettings>
  ): Promise<GranularAlertSettings> {
    const currentPrefs = await this.getAdvancedPreferences(userId);
    const updatedSettings = { ...currentPrefs.granularSettings, ...settings };
    
    await this.updateAdvancedPreferences(userId, {
      granularSettings: updatedSettings
    });

    return updatedSettings;
  }

  /**
   * Update notification channel configuration
   */
  async updateChannelConfig(
    userId: string,
    channelType: keyof NotificationChannelConfig,
    config: Partial<NotificationChannelConfig[keyof NotificationChannelConfig]>
  ): Promise<NotificationChannelConfig> {
    const currentPrefs = await this.getAdvancedPreferences(userId);
    const updatedChannels = {
      ...currentPrefs.channelConfigs,
      [channelType]: { ...currentPrefs.channelConfigs[channelType], ...config }
    };

    await this.updateAdvancedPreferences(userId, {
      channelConfigs: updatedChannels
    });

    return updatedChannels;
  }

  /**
   * Update smart filtering configuration
   */
  async updateSmartFiltering(
    userId: string,
    filtering: Partial<SmartFilteringConfig>
  ): Promise<SmartFilteringConfig> {
    const currentPrefs = await this.getAdvancedPreferences(userId);
    const updatedFiltering = this.deepMerge(currentPrefs.smartFiltering, filtering);

    await this.updateAdvancedPreferences(userId, {
      smartFiltering: updatedFiltering
    });

    return updatedFiltering;
  }

  /**
   * Update notification scheduling configuration
   */
  async updateSchedulingConfig(
    userId: string,
    scheduling: Partial<NotificationSchedulingConfig>
  ): Promise<NotificationSchedulingConfig> {
    const currentPrefs = await this.getAdvancedPreferences(userId);
    const updatedScheduling = this.deepMerge(currentPrefs.scheduling, scheduling);

    await this.updateAdvancedPreferences(userId, {
      scheduling: updatedScheduling
    });

    return updatedScheduling;
  }

  /**
   * Verify SMS phone number
   */
  async verifySMSNumber(userId: string, phoneNumber: string, verificationCode: string): Promise<boolean> {
    // TODO: Implement SMS verification logic with external service
    // For now, return true for demonstration
    console.log(`SMS verification for ${phoneNumber} with code ${verificationCode}`);
    
    // Update the SMS configuration to mark as verified
    await this.updateChannelConfig(userId, 'sms', {
      phoneNumber,
      verified: true
    });

    return true;
  }

  /**
   * Add push notification device token
   */
  async addPushDeviceToken(userId: string, deviceToken: string): Promise<void> {
    const currentPrefs = await this.getAdvancedPreferences(userId);
    const currentTokens = currentPrefs.channelConfigs.push.deviceTokens;
    
    if (!currentTokens.includes(deviceToken)) {
      await this.updateChannelConfig(userId, 'push', {
        deviceTokens: [...currentTokens, deviceToken]
      });
    }
  }

  /**
   * Remove push notification device token
   */
  async removePushDeviceToken(userId: string, deviceToken: string): Promise<void> {
    const currentPrefs = await this.getAdvancedPreferences(userId);
    const updatedTokens = currentPrefs.channelConfigs.push.deviceTokens
      .filter(token => token !== deviceToken);
    
    await this.updateChannelConfig(userId, 'push', {
      deviceTokens: updatedTokens
    });
  }

  /**
   * Get user interests for smart filtering
   */
  async getUserInterests(userId: string): Promise<string[]> {
    try {
      const interests = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      return interests.map(i => i.interest);
    } catch (error) {
      console.error(`Error getting user interests for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Update user interests
   */
  async updateUserInterests(userId: string, interests: string[]): Promise<void> {
    try {
      // Remove existing interests
      await db
        .delete(userInterests)
        .where(eq(userInterests.userId, userId));

      // Add new interests
      if (interests.length > 0) {
        const interestRecords = interests.map(interest => ({
          userId,
          interest
        }));

        await db.insert(userInterests).values(interestRecords);
      }

      console.log(`Updated interests for user ${userId}: ${interests.join(', ')}`);
    } catch (error) {
      console.error(`Error updating user interests for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get engagement-based recommendations for filtering
   */
  async getEngagementBasedRecommendations(userId: string): Promise<{
    recommendedCategories: string[];
    recommendedSponsors: string[];
    recommendedKeywords: string[];
  }> {
    try {
      // Get user's most engaged bills
      const engagedBills = await db
        .select({
          billId: billEngagement.billId,
          engagementScore: billEngagement.engagementScore,
          category: bills.category,
          tags: bills.tags
        })
        .from(billEngagement)
        .innerJoin(bills, eq(billEngagement.billId, bills.id))
        .where(eq(billEngagement.userId, userId))
        .orderBy(sql`${billEngagement.engagementScore} DESC`)
        .limit(20);

      // Extract categories and tags
      const categories = new Set<string>();
      const keywords = new Set<string>();

      engagedBills.forEach(bill => {
        if (bill.category) categories.add(bill.category);
        if (bill.tags) {
          bill.tags.forEach(tag => keywords.add(tag));
        }
      });

      // TODO: Get sponsor recommendations based on engagement
      const recommendedSponsors: string[] = [];

      return {
        recommendedCategories: Array.from(categories),
        recommendedSponsors,
        recommendedKeywords: Array.from(keywords)
      };
    } catch (error) {
      console.error(`Error getting engagement recommendations for ${userId}:`, error);
      return {
        recommendedCategories: [],
        recommendedSponsors: [],
        recommendedKeywords: []
      };
    }
  }

  /**
   * Test notification delivery for a specific channel
   */
  async testNotificationChannel(
    userId: string, 
    channelType: keyof NotificationChannelConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      const preferences = await this.getAdvancedPreferences(userId);
      const channelConfig = preferences.channelConfigs[channelType];

      if (!channelConfig.enabled) {
        return {
          success: false,
          message: `${channelType} notifications are disabled`
        };
      }

      // Import notification service dynamically
      const { enhancedNotificationService } = await import('./enhanced-notification.js');

      const testNotification = {
        userId,
        type: 'system_alert' as const,
        title: `Test ${channelType} notification`,
        message: `This is a test notification for the ${channelType} channel.`,
        priority: 'medium' as const,
        channels: [{ type: channelType, enabled: true }],
        metadata: {
          isTest: true,
          timestamp: new Date().toISOString()
        }
      };

      await enhancedNotificationService.createEnhancedNotification(testNotification);

      return {
        success: true,
        message: `Test notification sent successfully via ${channelType}`
      };
    } catch (error) {
      console.error(`Error testing ${channelType} notification for user ${userId}:`, error);
      return {
        success: false,
        message: `Failed to send test notification: ${error.message}`
      };
    }
  }

  /**
   * Get notification statistics for user
   */
  async getUserNotificationStats(userId: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalReceived: number;
    byChannel: Record<string, number>;
    byPriority: Record<string, number>;
    deliveryRate: number;
    averageResponseTime: number;
  }> {
    // TODO: Implement actual statistics from notification logs
    // For now, return mock data
    return {
      totalReceived: 45,
      byChannel: {
        inApp: 45,
        email: 12,
        push: 8,
        sms: 2
      },
      byPriority: {
        low: 20,
        medium: 18,
        high: 6,
        urgent: 1
      },
      deliveryRate: 0.96,
      averageResponseTime: 1.2
    };
  }

  /**
   * Export user preferences for backup/migration
   */
  async exportUserPreferences(userId: string): Promise<AdvancedAlertPreferences> {
    return this.getAdvancedPreferences(userId);
  }

  /**
   * Import user preferences from backup
   */
  async importUserPreferences(
    userId: string, 
    preferences: AdvancedAlertPreferences
  ): Promise<AdvancedAlertPreferences> {
    // Validate the imported preferences structure
    const validatedPrefs = this.validatePreferencesStructure(preferences);
    
    return this.updateAdvancedPreferences(userId, validatedPrefs);
  }

  // Helper methods
  private mergeWithDefaults(userId: string, userPrefs: any): AdvancedAlertPreferences {
    return {
      userId,
      ...this.deepMerge(this.DEFAULT_PREFERENCES, userPrefs)
    };
  }

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

  private validatePreferencesStructure(preferences: any): Partial<AdvancedAlertPreferences> {
    // Basic validation - in production, use a schema validation library
    const validated: any = {};
    
    if (preferences.granularSettings) {
      validated.granularSettings = preferences.granularSettings;
    }
    
    if (preferences.channelConfigs) {
      validated.channelConfigs = preferences.channelConfigs;
    }
    
    if (preferences.smartFiltering) {
      validated.smartFiltering = preferences.smartFiltering;
    }
    
    if (preferences.scheduling) {
      validated.scheduling = preferences.scheduling;
    }

    return validated;
  }
}

export const advancedAlertPreferencesService = new AdvancedAlertPreferencesService();