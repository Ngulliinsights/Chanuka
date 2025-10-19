export interface OnboardingData {
  currentStep: number;
  interests: string[];
  expertise: string;
}

export interface OnboardingAchievement {
  id: number;
  userId: number;
  achievementType: string;
  achievementValue: number;
  description: string;
  createdAt: Date;
}

export interface OnboardingProgress {
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  lastCompletedStep: number;
}












































