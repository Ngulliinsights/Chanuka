/**
 * useOnboarding Hook
 * Integrates onboarding service with React component lifecycle
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingService } from '../services/onboarding';

export const useOnboardingProgress = () => {
  return useQuery({
    queryKey: ['onboarding-progress'],
    queryFn: () => onboardingService.fetchProgress(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useOnboardingSteps = () => {
  return useQuery({
    queryKey: ['onboarding-steps'],
    queryFn: () => onboardingService.getSteps(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useCompleteOnboardingStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stepId: string) => onboardingService.completeStep(stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
};

export const useSkipOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => onboardingService.skipOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
};
