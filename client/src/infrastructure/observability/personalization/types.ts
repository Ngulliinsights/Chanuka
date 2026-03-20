/**
 * Personalization Types Re-export
 * 
 * Re-exports personalization types from the central types library.
 * This file exists for backwards compatibility with imports from './types'.
 */

export {
  type PersonaType,
  type PersonaMetrics,
  type PersonaClassification,
  type PersonaPreferences,
  type PersonaThresholds,
  type PersonaDetectionConfig,
  type UserPersonaProfile,
  type PersonaView,
  type NotificationFrequency,
  type ContentComplexity,
  type DashboardLayout,
} from '@client/lib/types/core';
