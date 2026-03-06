/**
 * Onboarding Service
 * Manages user persona selection and onboarding persistence
 */

import { ErrorFactory, errorHandler } from '@client/infrastructure/error';
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
      const clientError = ErrorFactory.createSystemError(
        'Failed to save persona to localStorage',
        error as Error,
        {
          component: 'OnboardingService',
          operation: 'savePersona',
        }
      );
      errorHandler.handleError(clientError);
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
      const clientError = ErrorFactory.createSystemError(
        'Failed to retrieve persona from localStorage',
        error as Error,
        {
          component: 'OnboardingService',
          operation: 'getPersona',
        }
      );
      errorHandler.handleError(clientError);
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
      const clientError = ErrorFactory.createSystemError(
        'Failed to mark onboarding complete in localStorage',
        error as Error,
        {
          component: 'OnboardingService',
          operation: 'markOnboardingComplete',
        }
      );
      errorHandler.handleError(clientError);
    }
  }

  /**
   * Check if onboarding is completed
   */
  static isOnboardingComplete(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch (error) {
      const clientError = ErrorFactory.createSystemError(
        'Failed to check onboarding status in localStorage',
        error as Error,
        {
          component: 'OnboardingService',
          operation: 'isOnboardingComplete',
        }
      );
      errorHandler.handleError(clientError);
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
      const clientError = ErrorFactory.createSystemError(
        'Failed to clear onboarding data from localStorage',
        error as Error,
        {
          component: 'OnboardingService',
          operation: 'clearOnboarding',
        }
      );
      errorHandler.handleError(clientError);
    }
  }
}
