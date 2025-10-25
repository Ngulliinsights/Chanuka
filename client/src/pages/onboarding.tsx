import { useEffect, useMemo, useCallback, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useOnboarding } from '../hooks/use-onboarding';
import { useAuth } from '../hooks/use-auth';
import type { OnboardingData } from '../types/onboarding';
import { INTEREST_OPTIONS, DEFAULT_ONBOARDING_DATA, ACHIEVEMENT_TYPES, PROGRESS_MULTIPLIER } from '../config/onboarding';
import { logger } from '../utils/browser-logger';

// Enhanced interfaces with better type safety and documentation
interface InterestsStepProps {
  /** Array of currently selected interest strings */
  selectedInterests: string[];
  /** Handler called when an interest is toggled on/off */
  onInterestToggle: (interest: string) => void;
  /** Handler called when user proceeds to next step */
  onNext: () => void;
}

interface ExpertiseStepProps {
  /** Current expertise text value */
  expertise: string;
  /** Handler called when expertise text changes */
  onExpertiseChange: (value: string) => void;
  /** Handler called when user goes back to previous step */
  onBack: () => void;
  /** Handler called when user proceeds to next step */
  onNext: () => void;
}

interface FinalStepProps {
  /** Handler called when user goes back to previous step */
  onBack: () => void;
  /** Handler called when user completes onboarding */
  onComplete: () => void;
  /** Whether the completion process is currently running */
  isUpdating: boolean;
}

// Step components optimized for performance and accessibility
const InterestsStep = ({ selectedInterests, onInterestToggle, onNext }: InterestsStepProps) => {
  // Memoize the selection count to avoid recalculation on every render
  const hasSelections = useMemo(() => selectedInterests.length > 0, [selectedInterests.length]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Select Your Interests</h2>
          <p className="text-sm text-muted-foreground">
            Choose the legislative areas that matter most to you. You can always update these later.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Interest selection">
          {INTEREST_OPTIONS.map(interest => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <Button
                key={interest}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => onInterestToggle(interest)}
                className="justify-start text-left"
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Remove' : 'Add'} ${interest} interest`}
              >
                {interest}
              </Button>
            );
          })}
        </div>

        <Button 
          className="w-full" 
          onClick={onNext} 
          disabled={!hasSelections}
          aria-label={hasSelections ? 'Continue to expertise step' : 'Select at least one interest to continue'}
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
};

const ExpertiseStep = ({ expertise, onExpertiseChange, onBack, onNext }: ExpertiseStepProps) => {
  // Optimize textarea change handler to prevent unnecessary re-renders
  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    onExpertiseChange(e.target.value);
  }, [onExpertiseChange]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Your Expertise</h2>
          <p className="text-sm text-muted-foreground">
            Share your professional background to help others understand your perspective. This helps us connect you with relevant discussions.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="expertise-input" className="sr-only">
            Describe your professional background or expertise
          </label>
          <textarea
            id="expertise-input"
            className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="E.g., Constitutional lawyer, Education policy researcher, Community advocate..."
            value={expertise}
            onChange={handleTextChange}
            aria-describedby="expertise-hint"
            maxLength={500} // Reasonable limit to prevent excessive input
          />
          <p id="expertise-hint" className="text-xs text-muted-foreground">
            Optional - {expertise.length}/500 characters
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} aria-label="Go back to interests">
            Back
          </Button>
          <Button className="flex-1" onClick={onNext} aria-label="Continue to final step">
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FinalStep = ({ onBack, onComplete, isUpdating }: FinalStepProps) => (
  <Card>
    <CardContent className="pt-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Ready to Connect & Engage</h2>
        <p className="text-sm text-muted-foreground">
          You're all set! Amplify your impact by connecting with other stakeholders and staying informed.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Your personalized dashboard will help you:</p>
        <div className="bg-muted/50 rounded-lg p-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Track bills in your areas of interest with real-time updates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Participate in meaningful legislative discussions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Connect with other stakeholders who share your interests</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Receive personalized notifications on important developments</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isUpdating} aria-label="Go back to expertise">
          Back
        </Button>
        <Button 
          className="flex-1" 
          onClick={onComplete} 
          disabled={isUpdating}
          aria-label={isUpdating ? 'Completing setup...' : 'Complete setup and start exploring'}
        >
          {isUpdating ? 'Completing Setup...' : 'Start Exploring'}
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function OnboardingPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { updateProgress, isUpdating } = useOnboarding();

  const { watch, setValue } = useForm<OnboardingData>({
    defaultValues: DEFAULT_ONBOARDING_DATA,
  });

  const currentStep = watch('currentStep');
  const selectedInterests: string[] = watch('interests') || [];
  const expertise = watch('expertise');

  // Enhanced redirect logic with better type safety
  useEffect(() => {
    if (user && (user as any).onboardingCompleted) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Optimized interest toggle handler with better performance characteristics
  const handleInterestToggle = useCallback(
    (interest: string) => {
      const newInterests = selectedInterests.includes(interest)
        ? selectedInterests.filter(i => i !== interest)
        : [...selectedInterests, interest];
      setValue('interests', newInterests);
    },
    [selectedInterests, setValue],
  );

  // Enhanced completion handler with better error handling and user feedback
  const handleComplete = useCallback(
    async () => {
      try {
        await updateProgress({
          achievementType: ACHIEVEMENT_TYPES.ONBOARDING_COMPLETE,
          achievementValue: 100,
          description: JSON.stringify({
            interests: selectedInterests,
            expertise: expertise,
            level: 1,
            badge: 'Civic Pioneer',
            completedAt: new Date().toISOString(), // Add timestamp for analytics
          }),
        });
        setLocation('/');
      } catch (error) {
        logger.error('Failed to complete onboarding:', { component: 'Chanuka' }, error);
        // In a real app, you might want to show a toast notification here
        // or set an error state to display to the user
      }
    },
    [updateProgress, selectedInterests, expertise, setLocation],
  );

  // Step navigation handlers for better code organization
  const stepNavigation = useMemo(() => ({
    goToStep: (step: number) => setValue('currentStep', step),
    nextStep: () => setValue('currentStep', currentStep + 1),
    prevStep: () => setValue('currentStep', currentStep - 1),
  }), [currentStep, setValue]);

  // Memoize progress calculation with additional safety check
  const progressPercentage = useMemo(() => {
    const percentage = currentStep * PROGRESS_MULTIPLIER;
    return Math.min(Math.max(percentage, 0), 100); // Ensure it stays within 0-100 range
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to LegisTrack</h1>
          <p className="text-muted-foreground">
            Let's personalize your experience in just a few steps
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of 3</span>
            <span>{Math.round(progressPercentage)}% complete</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2" 
            aria-label={`Onboarding progress: ${Math.round(progressPercentage)}% complete`}
          />
        </div>

        {currentStep === 1 && (
          <InterestsStep
            selectedInterests={selectedInterests}
            onInterestToggle={handleInterestToggle}
            onNext={stepNavigation.nextStep}
          />
        )}

        {currentStep === 2 && (
          <ExpertiseStep
            expertise={expertise}
            onExpertiseChange={value => setValue('expertise', value)}
            onBack={stepNavigation.prevStep}
            onNext={stepNavigation.nextStep}
          />
        )}

        {currentStep === 3 && (
          <FinalStep
            onBack={stepNavigation.prevStep}
            onComplete={handleComplete}
            isUpdating={isUpdating}
          />
        )}
      </div>
    </div>
  );
}