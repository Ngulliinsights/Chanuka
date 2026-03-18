import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import {
  FileText,
  Search,
  Bell,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { logger } from '@client/lib/utils/logger';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  personaFit?: string[];
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Chanuka',
    description:
      'Your gateway to legislative transparency in Kenya. Track bills, understand their impact, and engage with the democratic process.',
    icon: <CheckCircle className="h-16 w-16 text-blue-600" />,
    features: [
      'Track bills that matter to you',
      'Get plain language summaries',
      'Receive timely notifications',
      'Engage with your community',
    ],
  },
  {
    id: 'bills',
    title: 'Discover Bills',
    description:
      'Browse and search through current and historical bills. Filter by topic, status, and urgency to find what matters most.',
    icon: <FileText className="h-16 w-16 text-blue-600" />,
    features: [
      'Advanced search and filtering',
      'Plain language summaries',
      'Impact analysis for your sector',
      'Track bill progress in real-time',
    ],
    personaFit: ['Casual Citizen', 'Active Advocate', 'Policy Expert'],
  },
  {
    id: 'search',
    title: 'Powerful Search',
    description:
      'Find exactly what you need with our intelligent search. Search by keywords, topics, sponsors, or even ask questions in plain language.',
    icon: <Search className="h-16 w-16 text-blue-600" />,
    features: [
      'Natural language queries',
      'Smart suggestions',
      'Filter by multiple criteria',
      'Save searches for later',
    ],
    personaFit: ['Active Advocate', 'Policy Expert', 'Journalist'],
  },
  {
    id: 'notifications',
    title: 'Stay Informed',
    description:
      'Never miss important updates. Get notified when bills you care about progress, when MPs vote, or when new relevant bills are introduced.',
    icon: <Bell className="h-16 w-16 text-blue-600" />,
    features: [
      'Customizable alert preferences',
      'Real-time bill updates',
      'MP voting notifications',
      'Weekly digest summaries',
    ],
    personaFit: ['Casual Citizen', 'Active Advocate', 'Journalist'],
  },
  {
    id: 'community',
    title: 'Join the Conversation',
    description:
      'Connect with other citizens, share insights, and collaborate on advocacy campaigns. Your voice matters.',
    icon: <Users className="h-16 w-16 text-blue-600" />,
    features: [
      'Community discussions',
      'Expert insights',
      'Advocacy campaigns',
      'Share and collaborate',
    ],
    personaFit: ['Active Advocate', 'Casual Citizen'],
  },
  {
    id: 'analytics',
    title: 'Track Impact',
    description:
      'See how bills affect different sectors, track MP accountability, and understand voting patterns with our analysis tools.',
    icon: <TrendingUp className="h-16 w-16 text-blue-600" />,
    features: [
      'Electoral accountability tracking',
      'Voting pattern analysis',
      'Sector impact reports',
      'Data export for research',
    ],
    personaFit: ['Policy Expert', 'Journalist', 'Active Advocate'],
  },
];

/**
 * Welcome Tour Component
 * 
 * Interactive onboarding experience for first-time users.
 * Introduces key features and helps users understand how to use the platform.
 * 
 * Adapts messaging based on user persona (if available).
 */
export function WelcomeTour() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      logger.info('Onboarding: Next step', { 
        component: 'WelcomeTour',
        step: currentStep + 1,
        stepName: tourSteps[currentStep + 1].id
      });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      logger.info('Onboarding: Previous step', {
        component: 'WelcomeTour',
        step: currentStep - 1
      });
    }
  };

  const handleSkip = () => {
    const timeSpent = Date.now() - startTime;
    logger.info('Onboarding: Skipped', { 
      component: 'WelcomeTour',
      step: currentStep,
      timeSpent: Math.round(timeSpent / 1000)
    });
    navigate('/');
  };

      
    // Save onboarding completion to localStorage
    localStorage.setItem('chanuka_onboarding_completed', 'true');
    localStorage.setItem('chanuka_onboarding_version', '2.0.0');
    if (selectedPersona) {
      localStorage.setItem('chanuka_user_persona', selectedPersona);
    }

    logger.info('Onboarding: Completed', {
      component: 'WelcomeTour',
      persona: selectedPersona,
      stepsCompleted: tourSteps.length,
      completionTime: Math.round(completionTime / 1000)
    });

    // Navigate to dashboard or home
    navigate('/');
  };

  // Track step views
  useEffect(() => {
    logger.info('Onboarding: Step viewed', {
      component: 'WelcomeTour',
      step: currentStep + 1,
      stepName: tourSteps[currentStep].id
    });
  }, [currentStep]);

  // Track tour start
  useEffect(() => {
    logger.info('Onboarding: Started', {
      component: 'WelcomeTour',
      timestamp: new Date().toISOString()
    });
  }, []);

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {tourSteps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Skip tour
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-xl">
          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">{step.icon}</div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {step.title}
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{step.description}</p>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {step.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg"
                >
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Persona Fit (if applicable) */}
            {step.personaFit && step.personaFit.length > 0 && (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Perfect for:</p>
                <div className="flex flex-wrap gap-2">
                  {step.personaFit.map((persona) => (
                    <Badge
                      key={persona}
                      variant={selectedPersona === persona ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => setSelectedPersona(persona)}
                    >
                      {persona}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Persona Selection (first step only) */}
            {currentStep === 0 && (
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Which best describes you?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Casual Citizen',
                    'Active Advocate',
                    'Policy Expert',
                    'Journalist',
                    'Other',
                  ].map((persona) => (
                    <button
                      key={persona}
                      onClick={() => setSelectedPersona(persona)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedPersona === persona
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      {persona}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  This helps us personalize your experience. You can change this later.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-blue-600'
                        : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>

              <Button onClick={handleNext} className="flex items-center gap-2">
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    Get Started
                    <CheckCircle className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Visit our{' '}
            <a href="/support" className="text-blue-600 hover:underline">
              support center
            </a>{' '}
            or{' '}
            <a href="/documentation" className="text-blue-600 hover:underline">
              documentation
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default WelcomeTour;
