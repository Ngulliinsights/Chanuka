import React from 'react';
import { useNavigate } from 'react-router-dom';

import { OnboardingService } from '@client/features/users/services/onboarding-service';
import type { UserPersona } from '@client/features/users/ui/onboarding/UserJourneyOptimizer';
import { UserJourneyOptimizer } from '@client/features/users/ui/onboarding/UserJourneyOptimizer';
import AppLayout from '@client/shared/ui/layout/AppLayout';


export default function Onboarding() {
  const navigate = useNavigate();

  const handlePersonaSelected = (persona: UserPersona) => {
    // Save persona selection
    OnboardingService.savePersona(persona);
    OnboardingService.markOnboardingComplete();

    // Route based on complexity level
    const routeMap: Record<string, string> = {
      beginner: '/bills',
      intermediate: '/community',
      advanced: '/expert-verification'
    };

    const targetRoute = routeMap[persona.complexity] || '/dashboard';
    navigate(targetRoute);
  };

  const handleSkip = () => {
    OnboardingService.markOnboardingComplete();
    navigate('/dashboard');
  };

  return (
    <AppLayout>
      <div className="w-full">
        <UserJourneyOptimizer
          onPersonaSelected={handlePersonaSelected}
          onSkip={handleSkip}
        />
      </div>
    </AppLayout>
  );
}

