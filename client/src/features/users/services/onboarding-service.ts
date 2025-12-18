/**
 * Onboarding Service
 * Manages user persona selection and onboarding persistence
 */

import type { UserPersona } from '../ui/onboarding/UserJourneyOptimizer';

const PERSONA_STORAGE_KEY = 'chanuka_user_persona';
const ONBOARDING_COMPLETED_KEY = 'chanuka_onboarding_completed';

export class OnboardingService {
  /**
   * Save selected persona to localStorage
   */
  static savePersona(persona: UserPersona): void {
    try {
      localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(persona));
    } catch (error) {
      console.error('Failed to save persona:', error);
    }
  }

  /**
   * Retrieve saved persona from localStorage
   */
  static getPersona(): UserPersona | null {
    try {
      const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to retrieve persona:', error);
      return null;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static markOnboardingComplete(): void {
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
    }
  }

  /**
   * Check if onboarding is completed
   */
  static isOnboardingComplete(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  }

  /**
   * Clear all onboarding data
   */
  static clearOnboarding(): void {
    try {
      localStorage.removeItem(PERSONA_STORAGE_KEY);
      localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    } catch (error) {
      console.error('Failed to clear onboarding data:', error);
    }
  }
}
