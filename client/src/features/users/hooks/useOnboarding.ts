/**
 * User-specific onboarding hooks
 *
 * These hooks provide user-context-specific onboarding behavior
 * (redirect logic, status checking) built on top of the onboarding feature.
 *
 * For core onboarding operations (progress, steps, completion),
 * import from '@client/features/onboarding/hooks/useOnboarding'
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@client/infrastructure/auth';
import { OnboardingService } from '../services/onboarding-service';

// Re-export core onboarding hooks for convenience
export {
  useOnboardingProgress,
  useOnboardingSteps,
  useCompleteOnboardingStep,
  useSkipOnboarding,
} from '@client/features/onboarding/hooks/useOnboarding';

/** Redirects unauthenticated or un-onboarded users to the onboarding flow */
export function useOnboardingRedirect() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (!OnboardingService.isOnboardingComplete()) {
      navigate('/onboarding', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
}

export interface OnboardingStatus {
  isCompleted: boolean;
  persona: import('../ui/onboarding/UserJourneyOptimizer').UserPersona | null;
  clearOnboarding: () => void;
}

/** Returns the current onboarding completion status and persona */
export function useOnboardingStatus(): OnboardingStatus {
  return {
    isCompleted: OnboardingService.isOnboardingComplete(),
    persona: OnboardingService.getPersona(),
    clearOnboarding: OnboardingService.clearOnboarding,
  };
}
