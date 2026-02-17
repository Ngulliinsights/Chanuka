import { BillTrackingPreferences as GlobalBillTrackingPreferences } from '@server/features/users/domain/user-preferences';

/**
 * Combined preference type that merges global and per-bill settings.
 * Per-bill settings take precedence when available and active.
 */
export interface CombinedBillTrackingPreferences extends GlobalBillTrackingPreferences {
  _perBillSettingsApplied?: boolean; // Internal flag indicating per-bill override was used
  alert_frequency?: GlobalBillTrackingPreferences['updateFrequency']; // Alias for compatibility
  alert_channels?: Array<'in_app' | 'email' | 'push' | 'sms'>; // Per-bill channel format
}
