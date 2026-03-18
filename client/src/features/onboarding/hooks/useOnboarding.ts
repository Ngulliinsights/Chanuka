/**
 * useOnboarding Hook
 * Integrates onboarding service with React component lifecycle
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingService } from '../services/onboarding';

export };

export };

export 
  return useMutation({
    mutationFn: (stepId: string) => onboardingService.completeStep(stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
};

export 
  return useMutation({
    mutationFn: () => onboardingService.skipOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
};
