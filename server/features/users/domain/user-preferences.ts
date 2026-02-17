import { logger   } from '@shared/core';
import { readDatabase } from '@server/infrastructure/database';
import { user_profiles } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

// --- Interface Definitions ---
// Defines the structure of GLOBAL bill tracking preferences stored within users.preferences.
// These serve as defaults unless overridden by per-bill settings in userBillTrackingPreference table.
export interface BillTrackingPreferences {
  // Global defaults for which event types trigger notifications
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  // Global default notification frequency
  updateFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  // Global default enabled notification channels
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  // Global quiet hours settings
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone?: string; // IANA timezone string (e.g., "Africa/Nairobi")
  };
  // Global smart filtering settings
  smartFiltering: {
    enabled: boolean;
    interestBasedFiltering: boolean; // Filter based on user_interest table?
    priorityThreshold: 'low' | 'medium' | 'high'; // Minimum priority to receive
    categoryFilters: string[]; // Global list of allowed categories
    keywordFilters: string[]; // Global list of keywords
    sponsorFilters: string[]; // Global list of followed sponsors
  };
  // Global advanced settings
  advancedSettings?: { // Make optional for backward compatibility
    digestSchedule?: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number; // 0=Sun, 6=Sat for weekly
      dayOfMonth?: number; // 1-31 for monthly
      timeOfDay: string; // HH:MM format
    };
    escalationRules?: {
      enabled: boolean;
      urgentBillsImmediate: boolean; // Bypass frequency/quiet hours for urgent
      importantSponsorsImmediate: boolean; // Bypass for specific sponsors
      highEngagementImmediate: boolean; // Bypass for highly engaged bills
    };
    batchingRules?: {
      maxBatchSize: number;
      batchTimeWindow: number; // minutes
      similarUpdatesGrouping: boolean; // Group similar updates in digests
    };
  };
   // Add potential aliases used elsewhere for consistency checks, although primary fields should be used
   alert_frequency?: BillTrackingPreferences['updateFrequency'];
   alert_channels?: Array<'in_app' | 'email' | 'push' | 'sms'>;
   tracking_types?: string[];
}

// Defines the overall structure expected within the users.preferences JSONB column.
export interface UserNotificationPreferences {
  billTracking: BillTrackingPreferences; // Global bill tracking defaults
  general: {
    systemUpdates: boolean; // e.g., maintenance, new features
    securityAlerts: boolean; // e.g., password changes, suspicious logins
    weeklyDigest: boolean; // General platform activity digest
  };
  privacy: {
    shareEngagement: boolean; // Allow platform to use engagement data (anonymized)
    publicProfile: boolean; // Make user profile visible to others
  };
}

// Default preferences applied to new users or when stored preferences are incomplete/invalid.
const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  billTracking: {
    statusChanges: true, newComments: true, votingSchedule: true, amendments: false,
    updateFrequency: 'daily',
    notificationChannels: { inApp: true, email: true, push: false, sms: false },
  // Omit timezone when unset to satisfy exactOptionalPropertyTypes
  quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
    smartFiltering: { enabled: false, interestBasedFiltering: true, priorityThreshold: 'medium', categoryFilters: [], keywordFilters: [], sponsorFilters: [] },
    advancedSettings: {
      digestSchedule: { enabled: true, frequency: 'daily', timeOfDay: '08:00' },
      escalationRules: { enabled: true, urgentBillsImmediate: true, importantSponsorsImmediate: false, highEngagementImmediate: false },
      batchingRules: { maxBatchSize: 10, batchTimeWindow: 60, similarUpdatesGrouping: true }
    }
  },
  general: { systemUpdates: true, securityAlerts: true, weeklyDigest: false },
  privacy: { shareEngagement: false, publicProfile: true }
};


/**
 * Service for managing GLOBAL user preferences stored in the users.preferences JSONB field.
 *
 * NOTE: This service deals *only* with the user-wide default settings.
 * Per-bill notification preferences override these global settings and are managed
 * separately by BillTrackingService (storage) and NotificationOrchestratorService (application).
 */
export class UserPreferencesService {
  // Use read replica if available for preference fetching
  private get db() { return readDatabase; }

  /**
   * Retrieves the user's GLOBAL notification preferences.
   * Fetches the JSONB field from the user table and merges it deeply with
   * system defaults to ensure a complete and valid preference object is always returned.
   * @param user_id The ID of the user whose preferences are being fetched. Use 'default' to get system defaults.
   * @returns The user's complete global preferences object. Returns defaults if user not found or on DB error.
   */
  async getUserPreferences(user_id: string): Promise<UserNotificationPreferences> { // Handle request for default preferences explicitly
    if (user_id === 'default') {
      logger.debug("Returning default global preferences", { component: 'UserPreferencesService'  });
      return this.deepClone(DEFAULT_PREFERENCES); // Return a clone
    }

    const logContext = { component: 'UserPreferencesService', user_id  };
    logger.debug("Fetching global user preferences from DB", logContext);

    try {
      // Select only the preferences column for efficiency
      const [userData] = await this.db
        .select({ preferences: user_profiles.preferences })
        .from(user_profiles)
        .where(eq(user_profiles.user_id, user_id))
        .limit(1);

      if (!userData) {
        logger.warn(`User not found when fetching global preferences. Returning defaults.`, logContext);
        // It's safer to return defaults than throw an error here, allows services using this to proceed.
        return this.deepClone(DEFAULT_PREFERENCES);
      }

      // Deep merge the potentially partial/null data from DB with defaults
      // This ensures the returned object always conforms to UserNotificationPreferences structure
      const mergedPrefs = this.deepMerge(this.deepClone(DEFAULT_PREFERENCES), userData.preferences || {});
      logger.debug("Successfully fetched and merged global preferences", logContext);
      return mergedPrefs;

    } catch (error) {
      logger.error(`Database error getting global preferences:`, logContext, error);
      // Return defaults as a fallback to ensure calling services don't break
      return this.deepClone(DEFAULT_PREFERENCES);
    }
  }

  /**
   * Updates the user's GLOBAL notification preferences in the database.
   * Performs a deep merge of the provided partial updates onto the current settings.
   * @param user_id The ID of the users.
   * @param preferences Partial preferences object containing only the fields to update.
   * @returns The fully updated and saved global preferences object.
   * @throws Error if the user is not found or the database update fails.
   */
  async updateUserPreferences(user_id: string, preferences: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> { const logContext = { component: 'UserPreferencesService', user_id  };
    logger.info("Updating global user preferences in DB", logContext);

    try {
      // 1. Fetch current preferences directly from DB to avoid race conditions.
      const [currentUser] = await this.db
        .select({ preferences: user_profiles.preferences })
        .from(user_profiles)
        .where(eq(user_profiles.user_id, user_id))
        .limit(1);

      if (!currentUser) { logger.error("User not found during preference update.", logContext);
        throw new Error(`User not found: ${user_id }`);
      }

      // 2. Merge current DB state (merged with defaults) with the provided partial updates.
      const currentPrefsWithDefaults = this.deepMerge(this.deepClone(DEFAULT_PREFERENCES), currentUser.preferences || {});
      const updatedPrefsObject = this.deepMerge(currentPrefsWithDefaults, preferences);

      // 3. (Optional but recommended) Validate the final structure before saving.
      //    e.g., using a Zod schema for UserNotificationPreferences.

      // 4. Perform the database update.
      const result = await this.db
        .update(user_profiles)
        .set({
          preferences: updatedPrefsObject, // Save the fully merged object
          updated_at: new Date()           // Update modification timestamp
        })
        .where(eq(user_profiles.user_id, user_id))
        .returning({ preferences: user_profiles.preferences }); // Return the updated data from DB

      if (result.length === 0) { // Should not happen if user was found earlier, but handle defensively.
        logger.error("DB update affected 0 rows, possible issue.", logContext);
        throw new Error(`Failed to update preferences for user ${user_id } (user might have been deleted concurrently).`);
      }

      logger.info(`Successfully updated global preferences`, logContext);
      // Return the updated, fully merged preferences structure
      // Re-merge with defaults just in case DB returns something unexpected (though returning() should be reliable)
      return this.deepMerge(this.deepClone(DEFAULT_PREFERENCES), result[0].preferences || {});

    } catch (error) {
      logger.error(`Error updating global preferences:`, logContext, error);
      // Re-throw the original error after logging
      throw error;
    }
  }

  /**
   * Updates only the GLOBAL bill tracking part (`billTracking` key) of the user's preferences.
   * Note: This does NOT affect per-bill preferences stored in `userBillTrackingPreference` table.
   * @param user_id The ID of the users.
   * @param preferences Partial global bill tracking preferences to update.
   * @returns The updated global bill tracking preferences object.
   * @throws Error if the update fails.
   */
  async updateBillTrackingPreferences(user_id: string, preferences: Partial<BillTrackingPreferences>): Promise<BillTrackingPreferences> { const logContext = { component: 'UserPreferencesService', user_id  };
    logger.info("Updating global bill tracking preferences specifically", logContext);
    try { // Delegate to the main update function, nesting the partial update correctly
      // Merge the provided partial bill-tracking prefs onto system defaults
      const mergedBillTracking = this.deepMerge(this.deepClone(DEFAULT_PREFERENCES.billTracking), preferences);
      const fullUpdatedPrefs = await this.updateUserPreferences(user_id, {
        billTracking: mergedBillTracking
      });
      // Return just the updated billTracking portion
      return fullUpdatedPrefs.billTracking;
    } catch (error) {
      // Error already logged by updateUserPreferences
      throw error; // Re-throw
    }
  }

  // --- Helper Methods ---

  /** Creates a deep clone of an object (simple JSON approach). */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    // Basic deep clone for JSON-serializable objects
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        logger.error("Failed to deep clone object", { component: 'UserPreferencesService' }, e);
        return obj; // Fallback to shallow copy on error
    }
  }

  /** Helper to check if a value is a plain JavaScript object. */
  private isObject(item: unknown): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
  }

  /**
   * Deeply merges properties from the source object into the target object.
   * Overwrites primitives and arrays in target with values from source.
   * Recursively merges nested plain objects.
   * @param target The base object.
   * @param source The object with properties to merge in.
   * @returns A new object representing the merged result.
   */
  private deepMerge(target: unknown, source: unknown): unknown {
    // Start with a shallow clone of the target
    const output = { ...target };

    // Ensure both are objects before attempting merge
    if (this.isObject(target) && this.isObject(source)) {
      // Iterate over keys in the source object
      Object.keys(source).forEach(key => {
        const targetValue = target[key];
        const sourceValue = source[key];

        // If source value is an object and target value is also an object, recurse
        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          output[key] = this.deepMerge(targetValue, sourceValue);
        }
        // Otherwise, overwrite target value with source value (primitives, arrays, or replacing non-object with object)
        else {
          // Assign the source value (could be primitive, array, object, null, undefined)
          output[key] = sourceValue;
        }
      });
    } else if (this.isObject(source)) {
      // If target wasn't an object, just return a clone of the source
      return this.deepClone(source);
    }
    // If source isn't an object, return the original target (or its clone)
    return output;
  }

  // --- Admin/Stat Methods (Keep implementations if needed) ---

  /** Batch updates preferences for multiple users (Admin functionality). */
  async batchUpdatePreferences(updates: Array<{ user_id: string; preferences: Partial<UserNotificationPreferences>  }>): Promise<{ success: number; failed: number; errors: unknown[] }> {
    const logContext = { component: 'UserPreferencesService' };
    logger.info(`Starting batch preference update for ${updates.length} users.`, logContext);
    let success = 0;
    let failed = 0;
    const errors: unknown[] = [];

    // Process updates sequentially or in parallel batches
    for (const update of updates) {
        try {
            await this.updateUserPreferences(update.user_id, update.preferences);
            success++;
        } catch(error) { failed++;
            errors.push({ user_id: update.user_id, error: error instanceof Error ? error.message : String(error)  });
            logger.error(`Batch update failed for user ${update.user_id}`, logContext, error);
        }
    }
    logger.info(`Batch update completed. Success: ${success}, Failed: ${failed}`, logContext);
    return { success, failed, errors };
  }

  /** Retrieves statistics about global user preference settings (Admin functionality). */
  async getPreferenceStats(): Promise<{
    totalUsers: number;
    immediateBillNotifications: number; // Renamed for clarity
    emailBillChannelEnabled: number; // Renamed
    pushBillChannelEnabled: number; // Renamed
    quietHoursEnabled: number;
    smartFilteringEnabled: number; // Added stat
  }> {
    const logContext = { component: 'UserPreferencesService' };
    logger.info("Calculating global preference statistics.", logContext);
    try {
      // Fetch preferences for all users (consider performance for very large user bases)
  const allUsersPrefs = await this.db.select({ preferences: user_profiles.preferences }).from(user_profiles);

      let immediateBillNotifications = 0;
      let emailBillChannelEnabled = 0;
      let pushBillChannelEnabled = 0;
      let quietHoursEnabled = 0;
      let smartFilteringEnabled = 0;

      for (const userData of allUsersPrefs) {
        // Ensure defaults are applied before checking
        const prefs = this.deepMerge(this.deepClone(DEFAULT_PREFERENCES), userData.preferences || {});

        if (prefs.billTracking.updateFrequency === 'immediate') immediateBillNotifications++;
        if (prefs.billTracking.notificationChannels.email) emailBillChannelEnabled++;
        if (prefs.billTracking.notificationChannels.push) pushBillChannelEnabled++;
        if (prefs.billTracking.quietHours?.enabled) quietHoursEnabled++;
        if (prefs.billTracking.smartFiltering.enabled) smartFilteringEnabled++;
      }

      logger.info("Preference statistics calculated.", logContext);
      return {
        totalUsers: allUsersPrefs.length,
        immediateBillNotifications,
        emailBillChannelEnabled,
        pushBillChannelEnabled,
        quietHoursEnabled,
        smartFilteringEnabled
      };
    } catch (error) {
      logger.error('Error getting preference stats:', logContext, error);
      // Return zeros or throw depending on desired error handling
      return { totalUsers: 0, immediateBillNotifications: 0, emailBillChannelEnabled: 0, pushBillChannelEnabled: 0, quietHoursEnabled: 0, smartFilteringEnabled: 0 };
    }
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();



