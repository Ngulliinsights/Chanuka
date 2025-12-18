/**
 * Preferences Types
 * 
 * Type definitions for user preferences and settings
 */

// ============================================================================
// Bill Tracking Preferences
// ============================================================================

export type UpdateFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

export interface BillTrackingPreferences {
  readonly statusChanges: boolean;
  readonly newComments: boolean;
  readonly votingSchedule: boolean;
  readonly amendments: boolean;
  readonly updateFrequency: UpdateFrequency;
  readonly notificationChannels: NotificationChannels;
  readonly trackedBills: ReadonlyArray<number>;
}

// ============================================================================
// Notification Preferences
// ============================================================================

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationChannels {
  readonly inApp: boolean;
  readonly email: boolean;
  readonly push: boolean;
}

export interface QuietHours {
  readonly enabled: boolean;
  readonly startTime: string;
  readonly endTime: string;
  readonly timezone: string;
}

export interface NotificationPreferences {
  readonly channels: NotificationChannels;
  readonly quietHours?: QuietHours;
  readonly priority: NotificationPriority;
}

// ============================================================================
// Display Preferences
// ============================================================================

export interface DisplayPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly density: 'comfortable' | 'compact';
  readonly language: string;
}

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  readonly billTracking: BillTrackingPreferences;
  readonly notifications: NotificationPreferences;
  readonly display: DisplayPreferences;
}
