/* eslint-disable simple-import-sort/imports */
import { eq } from 'drizzle-orm';

import { readDatabase } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import { user_profiles } from '@server/infrastructure/schema';
import type { BillTrackingPreferences } from '@shared/types';
/* eslint-enable simple-import-sort/imports */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Applied to new users or when stored preferences are incomplete / invalid.
 */
const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  billTracking: {
    statusChanges: true,
    newComments: true,
    votingSchedule: true,
    amendments: false,
    updateFrequency: 'daily',
    notificationChannels: { inApp: true, email: true, push: false, sms: false },
    // Omit timezone when unset to satisfy exactOptionalPropertyTypes
    quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
    smartFiltering: {
      enabled: false,
      interestBasedFiltering: true,
      priorityThreshold: 'medium',
      categoryFilters: [],
      keywordFilters: [],
      sponsorFilters: [],
    },
    advancedSettings: {
      digestSchedule: { enabled: true, frequency: 'daily', dayOfWeek: 1 },
    },
  },
  general: { systemUpdates: true, securityAlerts: true, weeklyDigest: false },
  privacy: { shareEngagement: false, publicProfile: true },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Manages GLOBAL user preferences stored in the `user_profiles.preferences` JSONB field.
 *
 * NOTE: This service deals *only* with user-wide default settings.
 * Per-bill notification overrides are managed separately by
 * `BillTrackingService` (storage) and `NotificationOrchestratorService` (application).
 */
export class UserPreferencesService {
  /** Use the read replica for all reads. */
  private get db() {
    return readDatabase;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Retrieves the user's global notification preferences.
   * Deep-merges the JSONB field with system defaults so the returned object
   * always conforms to {@link UserNotificationPreferences}.
   *
   * @param user_id  Target user ID, or `'default'` to receive system defaults.
   * @returns Complete global preferences. Falls back to defaults on missing user or DB error.
   */
  async getUserPreferences(user_id: string): Promise<UserNotificationPreferences> {
    if (user_id === 'default') {
      logger.debug({ component: 'UserPreferencesService' }, 'Returning default global preferences');
      return this.deepClone(DEFAULT_PREFERENCES);
    }

    const logContext = { component: 'UserPreferencesService', user_id };
    logger.debug(logContext, 'Fetching global user preferences from DB');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queryResult = await (this.db as any)
        .select({ preferences: user_profiles.preferences })
        .from(user_profiles)
        .where(eq(user_profiles.user_id, user_id))
        .limit(1);
      const userData = (queryResult as Array<{ preferences: unknown }>)[0];

      if (!userData) {
        logger.warn(logContext, 'User not found when fetching global preferences. Returning defaults.');
        return this.deepClone(DEFAULT_PREFERENCES);
      }

      const merged = this.deepMerge(
        this.deepClone(DEFAULT_PREFERENCES),
        (userData.preferences ?? {}) as Record<string, unknown>,
      ) as UserNotificationPreferences;

      logger.debug(logContext, 'Successfully fetched and merged global preferences');
      return merged;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Database error getting global preferences');
      return this.deepClone(DEFAULT_PREFERENCES);
    }
  }

  /**
   * Updates the user's global notification preferences.
   * Deep-merges partial updates onto the current DB state.
   *
   * @param user_id      Target user ID.
   * @param preferences  Partial preferences to apply.
   * @returns Fully updated global preferences.
   * @throws If the user is not found or the database update fails.
   */
  async updateUserPreferences(
    user_id: string,
    preferences: Partial<UserNotificationPreferences>,
  ): Promise<UserNotificationPreferences> {
    const logContext = { component: 'UserPreferencesService', user_id };
    logger.info(logContext, 'Updating global user preferences in DB');

    try {
      // 1. Read current state to avoid race-condition overwrites.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentQueryResult = await (this.db as any)
        .select({ preferences: user_profiles.preferences })
        .from(user_profiles)
        .where(eq(user_profiles.user_id, user_id))
        .limit(1);
      const currentUser = (currentQueryResult as Array<{ preferences: unknown }>)[0];

      if (!currentUser) {
        logger.error(logContext, 'User not found during preference update.');
        throw new Error(`User not found: ${user_id}`);
      }

      // 2. Merge defaults → current DB state → incoming partial update.
      const currentWithDefaults = this.deepMerge(
        this.deepClone(DEFAULT_PREFERENCES),
        (currentUser.preferences ?? {}) as Record<string, unknown>,
      );
      const updated = this.deepMerge(currentWithDefaults, preferences as Record<string, unknown>);

      // 3. Persist.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateResult = await (this.db as any)
        .update(user_profiles)
        .set({ preferences: updated, updated_at: new Date() })
        .where(eq(user_profiles.user_id, user_id))
        .returning({ preferences: user_profiles.preferences });
      const result = (updateResult as Array<{ preferences: unknown }>);

      if (result.length === 0) {
        logger.error(logContext, 'DB update affected 0 rows – user may have been deleted concurrently.');
        throw new Error(`Failed to update preferences for user ${user_id}.`);
      }

      logger.info(logContext, 'Successfully updated global preferences');

      const resultItem = result[0];
      return this.deepMerge(
        this.deepClone(DEFAULT_PREFERENCES),
        (resultItem?.preferences ?? {}) as Record<string, unknown>,
      ) as UserNotificationPreferences;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error updating global preferences');
      throw error;
    }
  }

  /**
   * Updates only the `billTracking` section of the user's global preferences.
   *
   * NOTE: This does **not** affect per-bill preferences stored in `userBillTrackingPreference`.
   *
   * @param user_id      Target user ID.
   * @param preferences  Partial bill-tracking preferences to apply.
   * @returns Updated global bill-tracking preferences.
   * @throws If the update fails.
   */
  async updateBillTrackingPreferences(
    user_id: string,
    preferences: Partial<BillTrackingPreferences>,
  ): Promise<BillTrackingPreferences> {
    const logContext = { component: 'UserPreferencesService', user_id };
    logger.info(logContext, 'Updating global bill tracking preferences specifically');

    const mergedBillTracking = this.deepMerge(
      this.deepClone(DEFAULT_PREFERENCES.billTracking),
      preferences,
    ) as BillTrackingPreferences;

    const fullUpdated = await this.updateUserPreferences(user_id, {
      billTracking: mergedBillTracking,
    });

    return fullUpdated.billTracking;
  }

  // -------------------------------------------------------------------------
  // Admin / stats
  // -------------------------------------------------------------------------

  /**
   * Batch-updates preferences for multiple users (admin functionality).
   */
  async batchUpdatePreferences(
    updates: Array<{ user_id: string; preferences: Partial<UserNotificationPreferences> }>,
  ): Promise<{ success: number; failed: number; errors: unknown[] }> {
    const logContext = { component: 'UserPreferencesService' };
    logger.info(logContext, `Starting batch preference update for ${updates.length} users.`);

    let success = 0;
    let failed = 0;
    const errors: unknown[] = [];

    for (const update of updates) {
      try {
        await this.updateUserPreferences(update.user_id, update.preferences);
        success++;
      } catch (error) {
        failed++;
        errors.push({
          user_id: update.user_id,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error({ ...logContext, user_id: update.user_id, error }, 'Batch update failed for user');
      }
    }

    logger.info(logContext, `Batch update completed. Success: ${success}, Failed: ${failed}`);
    return { success, failed, errors };
  }

  /**
   * Returns aggregate statistics about global user preference settings (admin functionality).
   */
  async getPreferenceStats(): Promise<{
    totalUsers: number;
    immediateBillNotifications: number;
    emailBillChannelEnabled: number;
    pushBillChannelEnabled: number;
    quietHoursEnabled: number;
    smartFilteringEnabled: number;
  }> {
    const logContext = { component: 'UserPreferencesService' };
    logger.info(logContext, 'Calculating global preference statistics.');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statsResult = await (this.db as any)
        .select({ preferences: user_profiles.preferences })
        .from(user_profiles);
      const allUsersPrefs = (statsResult as Array<{ preferences: unknown }>);

      let immediateBillNotifications = 0;
      let emailBillChannelEnabled = 0;
      let pushBillChannelEnabled = 0;
      let quietHoursEnabled = 0;
      let smartFilteringEnabled = 0;

      for (const userData of allUsersPrefs) {
        const prefs = this.deepMerge(
          this.deepClone(DEFAULT_PREFERENCES),
          (userData.preferences ?? {}) as Record<string, unknown>,
        ) as UserNotificationPreferences;

        if (prefs.billTracking.updateFrequency === 'immediate') immediateBillNotifications++;
        if (prefs.billTracking.notificationChannels.email)       emailBillChannelEnabled++;
        if (prefs.billTracking.notificationChannels.push)        pushBillChannelEnabled++;
        if (prefs.billTracking.quietHours?.enabled)              quietHoursEnabled++;
        if (prefs.billTracking.smartFiltering.enabled)           smartFilteringEnabled++;
      }

      logger.info(logContext, 'Preference statistics calculated.');
      return {
        totalUsers: allUsersPrefs.length,
        immediateBillNotifications,
        emailBillChannelEnabled,
        pushBillChannelEnabled,
        quietHoursEnabled,
        smartFilteringEnabled,
      };
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error getting preference stats');
      return {
        totalUsers: 0,
        immediateBillNotifications: 0,
        emailBillChannelEnabled: 0,
        pushBillChannelEnabled: 0,
        quietHoursEnabled: 0,
        smartFilteringEnabled: 0,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** JSON-based deep clone. Falls back to the original reference on serialization error. */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
      return JSON.parse(JSON.stringify(obj)) as T;
    } catch (e) {
      logger.error({ component: 'UserPreferencesService', error: e }, 'Failed to deep clone object');
      return obj;
    }
  }

  /**
   * Type guard: returns `true` (and narrows to `Record<string, unknown>`) when
   * `item` is a plain, non-null, non-array object.
   */
  private isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Deeply merges `source` into `target`.
   * - Plain nested objects are merged recursively.
   * - Primitives, arrays, and `null` from `source` overwrite `target`.
   * - If `target` is not an object, a clone of `source` is returned when `source` is an object.
   */
  private deepMerge(target: unknown, source: unknown): unknown {
    if (!this.isObject(target) || !this.isObject(source)) {
      return this.isObject(source) ? this.deepClone(source) : target;
    }

    const output: Record<string, unknown> = { ...target };

    for (const key of Object.keys(source)) {
      const targetVal = target[key];
      const sourceVal = source[key];

      output[key] =
        this.isObject(sourceVal) && this.isObject(targetVal)
          ? this.deepMerge(targetVal, sourceVal)
          : sourceVal;
    }

    return output;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const userPreferencesService = new UserPreferencesService();