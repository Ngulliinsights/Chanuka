/**
 * Personalization Module
 *
 * Exports for user persona detection and personalized experiences
 */

export type {
  PersonaType,
  PersonaMetrics,
  PersonaClassification,
  PersonaPreferences,
  PersonaDetectionConfig,
  PersonaThresholds,
  UserPersonaProfile,
} from './types';

export { PersonaDetector, personaDetector, createPersonaDetector } from './persona-detector';
