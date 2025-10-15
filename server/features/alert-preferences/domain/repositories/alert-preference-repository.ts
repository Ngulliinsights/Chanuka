import { AlertPreference } from '../entities/alert-preference';

/**
 * Repository interface for alert preferences
 */
export interface IAlertPreferenceRepository {
  /**
   * Saves an alert preference
   */
  save(preference: AlertPreference): Promise<void>;

  /**
   * Finds an alert preference by ID and user ID
   */
  findByIdAndUserId(id: string, userId: string): Promise<AlertPreference | null>;

  /**
   * Finds all alert preferences for a user
   */
  findByUserId(userId: string): Promise<AlertPreference[]>;

  /**
   * Updates an alert preference
   */
  update(preference: AlertPreference): Promise<void>;

  /**
   * Deletes an alert preference
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Checks if a preference exists
   */
  exists(id: string, userId: string): Promise<boolean>;
}