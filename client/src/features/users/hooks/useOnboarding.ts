/**
 * Hook for managing onboarding flow and redirects
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@client/core/auth';

import type { OnboardingStatus } from '@client/features/users/types';
import { OnboardingService } from '../services/onboarding-service';

export function useOnboardingRedirect() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // If user is authenticated but hasn't completed onboarding, redirect to onboarding
    if (!OnboardingService.isOnboardingComplete()) {
      navigate('/onboarding', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
}

export function useOnboardingStatus(): OnboardingStatus {
  return {
    isCompleted: OnboardingService.isOnboardingComplete(),
    persona: OnboardingService.getPersona(),
    clearOnboarding: OnboardingService.clearOnboarding
  };
}