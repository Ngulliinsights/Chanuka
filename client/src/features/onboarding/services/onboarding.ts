/**
 * Onboarding Service
 * Manages user onboarding flow and progress tracking
 */
import { globalApiClient } from '@client/infrastructure/api/client';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  requiredActions: string[];
  completed: boolean;
  order: number;
}

export interface OnboardingProgress {
  userId: string;
  completedSteps: string[];
  currentStep: string;
  progressPercentage: number;
}

export const onboardingService = {
  async fetchProgress(): Promise<OnboardingProgress> {
    const response = await globalApiClient.get('/api/onboarding/progress');
    return response.data;
  },

  async getSteps(): Promise<OnboardingStep[]> {
    const response = await globalApiClient.get('/api/onboarding/steps');
    return response.data;
  },

  async completeStep(stepId: string): Promise<void> {
    await globalApiClient.post(`/api/onboarding/steps/${stepId}/complete`);
  },

  async skipOnboarding(): Promise<void> {
    await globalApiClient.post('/api/onboarding/skip');
  },
};
