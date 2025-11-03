export interface OnboardingData {
  currentStep: number;
  interests: string[];
  expertise: string;
}

export interface OnboardingAchievement { id: number;
  user_id: number;
  achievement_type: string;
  achievement_value: number;
  description: string;
  created_at: Date;
 }

export interface OnboardingProgress {
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  lastCompletedStep: number;
}













































