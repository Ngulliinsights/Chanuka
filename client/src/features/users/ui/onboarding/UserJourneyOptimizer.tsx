/**
 * User Journey Optimizer Component
 * * Provides personalized onboarding and progressive disclosure
 * based on user civic engagement experience level.
 * * Updates:
 * - Fixed 'Lightbulb' import error by swapping to 'Sparkles'
 * - Added 'Back' navigation capability
 * - Improved accessibility with keyboard support
 * - Extracted sub-components for readability
 */

import * as Lucide from 'lucide-react';
import React, { useState } from 'react';
const {
  Target,
  Users,
  CheckCircle,
  Shield,
  ArrowLeft,
  Sparkles,
  ArrowRight,
} = (Lucide as any) as Record<string, React.ComponentType<any>>;

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Badge 
} from '@client/shared/design-system';

// --- Types ---

// Robust type definition for Icon components to avoid 'any'
type IconComponent = React.ComponentType<{ className?: string }>;

export interface UserPersona {
  id: string;
  title: string;
  description: string;
  icon: IconComponent;
  primaryGoals: string[];
  recommendedFeatures: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

type Step = 'persona' | 'goals' | 'features';

// --- Configuration ---

const USER_PERSONAS: UserPersona[] = [
  {
    id: 'concerned-citizen',
    title: 'Concerned Citizen',
    description: 'I want to stay informed about legislation that affects my community',
    icon: Users,
    primaryGoals: [
      'Track bills relevant to my interests',
      'Understand policy impacts',
      'Get notified about important votes'
    ],
    recommendedFeatures: ['Bill Tracking', 'Notifications', 'Simple Analysis'],
    complexity: 'beginner'
  },
  {
    id: 'civic-advocate',
    title: 'Civic Advocate',
    description: 'I actively engage in policy discussions and want deep insights',
    icon: Target,
    primaryGoals: [
      'Analyze bill implications',
      'Engage in community discussions',
      'Track voting patterns'
    ],
    recommendedFeatures: ['Advanced Analysis', 'Community Forums', 'Voting Records'],
    complexity: 'intermediate'
  },
  {
    id: 'policy-expert',
    title: 'Policy Expert',
    description: 'I need comprehensive tools for professional policy analysis',
    icon: Shield,
    primaryGoals: [
      'Detect implementation workarounds',
      'Perform constitutional analysis',
      'Export detailed reports'
    ],
    recommendedFeatures: ['Workaround Detection', 'Expert Verification', 'Data Export'],
    complexity: 'advanced'
  }
];

// --- Sub-Components ---

const StepIndicator = ({ currentStep }: { currentStep: Step }) => {
  const steps: Step[] = ['persona', 'goals', 'features'];
  return (
    <div className="flex justify-center items-center gap-3 mb-8">
      {steps.map((step) => (
        <div
          key={step}
          className={`transition-all duration-300 rounded-full ${
            currentStep === step 
              ? 'w-4 h-4 bg-primary' 
              : 'w-2 h-2 bg-muted'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

interface PersonaSelectionCardProps {
  persona: UserPersona;
  isSelected: boolean;
  onSelect: (persona: UserPersona) => void;
}

const PersonaSelectionCard = ({ persona, isSelected, onSelect }: PersonaSelectionCardProps) => {
  const Icon = persona.icon;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(persona);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 h-full hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'
      }`}
      onClick={() => onSelect(persona)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="radio"
      aria-checked={isSelected}
    >
      <CardHeader className="text-center pb-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
           isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        }`}>
          <Icon className="w-8 h-8" />
        </div>
        <CardTitle className="text-xl">{persona.title}</CardTitle>
        <Badge variant={isSelected ? "default" : "outline"} className="mx-auto mt-2">
          {persona.complexity}
        </Badge>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground leading-relaxed text-sm">
          {persona.description}
        </p>
      </CardContent>
    </Card>
  );
};

// --- Main Component ---

interface UserJourneyOptimizerProps {
  onPersonaSelected: (persona: UserPersona) => void;
  onSkip: () => void;
}

export function UserJourneyOptimizer({ onPersonaSelected, onSkip }: UserJourneyOptimizerProps) {
  const [selectedPersona, setSelectedPersona] = useState<UserPersona | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('persona');

  const SelectedIcon = selectedPersona?.icon ?? Users;

  const handlePersonaSelect = (persona: UserPersona) => {
    setSelectedPersona(persona);
    setCurrentStep('goals');
  };

  const handleBack = () => {
    if (currentStep === 'goals') setCurrentStep('persona');
    if (currentStep === 'features') setCurrentStep('goals');
  };

  const handleContinue = () => {
    if (selectedPersona) {
      if (currentStep === 'goals') {
        setCurrentStep('features');
      } else if (currentStep === 'features') {
        onPersonaSelected(selectedPersona);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3 tracking-tight">
          Welcome to Chanuka Platform
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Let&apos;s personalize your civic engagement experience
        </p>
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Step 1: Persona Selection */}
      {currentStep === 'persona' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Which describes you best?</h2>
            <p className="text-muted-foreground">
              Select the profile that matches your civic engagement goals
            </p>
          </div>

          <div 
            className="grid md:grid-cols-3 gap-6" 
            role="radiogroup" 
            aria-label="User Personas"
          >
            {USER_PERSONAS.map((persona) => (
              <PersonaSelectionCard
                key={persona.id}
                persona={persona}
                isSelected={selectedPersona?.id === persona.id}
                onSelect={handlePersonaSelect}
              />
            ))}
          </div>

          <div className="text-center pt-4">
            <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
              Skip personalization
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Goals Review */}
      {currentStep === 'goals' && selectedPersona && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Your Goals</h2>
            <p className="text-muted-foreground">
              Here is what you can accomplish as a <span className="font-medium text-foreground">{selectedPersona.title}</span>
            </p>
          </div>

          <Card className="max-w-2xl mx-auto border-2 border-primary/10 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <SelectedIcon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl mb-1">{selectedPersona.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedPersona.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="my-4 h-px bg-border" />
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Target className="w-4 h-4" />
                Primary Objectives
              </h3>
              <div className="space-y-3">
                {selectedPersona.primaryGoals.map((goal, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-sm">{goal}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={handleBack} className="w-32 gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleContinue} className="w-32 gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Feature Reveal */}
      {currentStep === 'features' && selectedPersona && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Recommended Workspace</h2>
            <p className="text-muted-foreground">
              We&apos;ve customized your dashboard with these powerful tools
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {selectedPersona.recommendedFeatures.map((feature, index) => (
              <Card key={index} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                    </div>
                    <h3 className="font-semibold text-lg">{feature}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-[3.25rem]">
                    Optimized for {selectedPersona.complexity} workflows
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center space-y-6 pt-6">
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleBack} className="w-32 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleContinue} size="lg" className="px-8 gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can always customize these settings later in your profile preference center.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}