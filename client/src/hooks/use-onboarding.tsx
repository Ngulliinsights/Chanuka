import { useMutation } from '@tanstack/react-query';

import { useToast } from '@client/hooks/use-toast';
import { apiRequest, queryClient } from '@client/lib/queryClient';


import type { OnboardingProgressUpdate } from '../types/onboarding';

export function useOnboarding() {
  const { toast } = useToast();

  // Update onboarding progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (progress: OnboardingProgressUpdate) => {
      const res = await apiRequest('POST', '/api/user/onboarding', progress);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Progress saved',
        description: 'Your onboarding progress has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      return data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update onboarding progress',
        variant: 'destructive',
      });
    },
  });

  // Reset onboarding progress mutation
  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/user/onboarding');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Progress reset',
        description: 'Your onboarding progress has been reset.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset onboarding progress',
        variant: 'destructive',
      });
    },
  });

  return {
    updateProgress: updateProgressMutation.mutateAsync,
    resetProgress: resetProgressMutation.mutateAsync,
    isUpdating: updateProgressMutation.isPending,
    isResetting: resetProgressMutation.isPending,
  };
}

