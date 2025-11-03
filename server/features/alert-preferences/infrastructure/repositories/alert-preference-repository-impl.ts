import { eq } from 'drizzle-orm';
import { databaseService } from '../../../infrastructure/database/database-service';
import { users } from '@shared/schema';
import { AlertPreference } from '../../domain/entities/alert-preference';
import { IAlertPreferenceRepository } from '../../domain/repositories/alert-preference-repository';

/**
 * Infrastructure implementation of alert preference repository
 */
export class AlertPreferenceRepositoryImpl implements IAlertPreferenceRepository { async save(preference: AlertPreference): Promise<void> {
    const user_id = preference.user_id;
    const preferenceData = this.serializePreference(preference);

    // Get current user preferences
    const [user] = await databaseService.db
      .select({ preferences: users.preferences  })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    const currentPreferences = (user?.preferences as any) || {};
    const alertPreferences = currentPreferences.alertPreferences || [];

    // Add or update the preference
    const existingIndex = alertPreferences.findIndex((p: any) => p.id === preference.id);
    if (existingIndex >= 0) {
      alertPreferences[existingIndex] = preferenceData;
    } else {
      alertPreferences.push(preferenceData);
    }

    // Update the database
    await databaseService.db
      .update(users)
      .set({
        preferences: {
          ...currentPreferences,
          alertPreferences
        },
        updated_at: new Date()
      })
      .where(eq(users.id, user_id));
  }

  async findByIdAndUserId(id: string, user_id: string): Promise<AlertPreference | null> { const preferences = await this.findByUserId(user_id);
    return preferences.find(p => p.id === id) || null;
   }

  async findByUserId(user_id: string): Promise<AlertPreference[]> {
    const [user] = await databaseService.db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    if (!user) {
      return [];
    }

    const currentPreferences = (users.preferences as any) || {};
    const alertPreferences = currentPreferences.alertPreferences || [];

    return alertPreferences.map((p: any) => this.deserializePreference(p));
  }

  async update(preference: AlertPreference): Promise<void> {
    await this.save(preference);
  }

  async delete(id: string, user_id: string): Promise<void> {
    const [user] = await databaseService.db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    const currentPreferences = (user?.preferences as any) || {};
    const alertPreferences = currentPreferences.alertPreferences || [];

    // Filter out the preference
    const updatedPreferences = alertPreferences.filter((p: any) => p.id !== id);

    // Update the database
    await databaseService.db
      .update(users)
      .set({
        preferences: {
          ...currentPreferences,
          alertPreferences: updatedPreferences
        },
        updated_at: new Date()
      })
      .where(eq(users.id, user_id));
  }

  async exists(id: string, user_id: string): Promise<boolean> { const preference = await this.findByIdAndUserId(id, user_id);
    return preference !== null;
   }

  private serializePreference(preference: AlertPreference): any { return {
      id: preference.id,
      user_id: preference.user_id,
      name: preference.name,
      description: preference.description,
      is_active: preference.is_active,
      alertTypes: preference.alertTypes.map(at => ({
        type: at.type.toString(),
        enabled: at.enabled,
        priority: at.priority.toString(),
        conditions: at.conditions ? {
          billCategories: at.conditions.billCategories,
          billStatuses: at.conditions.billStatuses,
          sponsor_ids: at.conditions.sponsor_ids,
          keywords: at.conditions.keywords,
          minimumEngagement: at.conditions.minimumEngagement,
          user_roles: at.conditions.user_roles,
          timeRange: at.conditions.timeRange,
          dayOfWeek: at.conditions.dayOfWeek
         } : undefined
      })),
      channels: preference.channels.map(ch => ({
        type: ch.type.toString(),
        enabled: ch.enabled,
        config: ch.config,
        priority: ch.priority.toString(),
        quietHours: ch.quietHours
      })),
      frequency: {
        type: preference.frequency.type,
        batchInterval: preference.frequency.batchInterval,
        batchTime: preference.frequency.batchTime,
        batchDay: preference.frequency.batchDay
      },
      smartFiltering: {
        enabled: preference.smartFiltering.enabled,
        user_interestWeight: preference.smartFiltering.user_interestWeight,
        engagementHistoryWeight: preference.smartFiltering.engagementHistoryWeight,
        trendingWeight: preference.smartFiltering.trendingWeight,
        duplicateFiltering: preference.smartFiltering.duplicateFiltering,
        spamFiltering: preference.smartFiltering.spamFiltering,
        minimumConfidence: preference.smartFiltering.minimumConfidence
      },
      created_at: preference.created_at.toISOString(),
      updated_at: preference.updated_at.toISOString()
    };
  }

  private deserializePreference(data: any): AlertPreference {
    // This would need proper deserialization logic
    // For now, return a placeholder
    throw new Error('Deserialization not implemented');
  }
}





































