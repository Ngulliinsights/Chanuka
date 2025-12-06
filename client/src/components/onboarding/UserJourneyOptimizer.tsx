/**
 * User Journey Optimizer Component
 * 
 * Provides personalized onboarding and progressive disclosure
 * based on user civic engagement experience level
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { 
  BookOpen, 
  Target, 
  Users, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Lightbulb,
  Shield
} from 'lucide-react';

interface UserPersona {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  primaryGoals: string[];
  recommendedFeatures: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

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

interface UserJourneyOptimizerProps {
  onPersonaSelected: (persona: UserPersona) => void;
  onSkip: () => void;
}

export function UserJourneyOptimizer({ onPersonaSelected, onSkip }: UserJourneyOptimizerProps) {
  const [selectedPersona, setSelectedPersona] = useState<UserPersona | null>(null);
  const [currentStep, setCurrentStep] = useState<'persona' | 'goals' | 'features'>('persona');

  const handlePersonaSelect = (persona: UserPersona) => {
    setSelectedPersona(persona);
    setCurrentStep('goals');
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">
          Welcome to Chanuka Platform
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          Let's personalize your civic engagement experience
        </p>
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${currentStep === 'persona' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'goals' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'features' ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>

      {currentStep === 'persona' && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Which describes you best?</h2>
            <p className="text-muted-foreground">
              This helps us show you the most relevant features first
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {USER_PERSONAS.map((persona) => {
              const Icon = persona.icon;
              return (
                <Card 
                  key={persona.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                    selectedPersona?.id === persona.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handlePersonaSelect(persona)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{persona.title}</CardTitle>
                    <Badge variant="outline" className="mx-auto">
                      {persona.complexity}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground leading-relaxed">
                      {persona.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={onSkip}>
              Skip personalization
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'goals' && selectedPersona && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Your Goals</h2>
            <p className="text-muted-foreground">
              Based on your selection, here's what you can accomplish
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <selectedPersona.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>{selectedPersona.title}</CardTitle>
                  <p className="text-muted-foreground">{selectedPersona.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Your Primary Goals
              </h3>
              <div className="space-y-3">
                {selectedPersona.primaryGoals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>{goal}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={handleContinue} size="lg">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'features' && selectedPersona && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Recommended Features</h2>
            <p className="text-muted-foreground">
              We've customized your dashboard with these features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {selectedPersona.recommendedFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">{feature}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tailored for {selectedPersona.complexity} users
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center space-y-4">
            <Button onClick={handleContinue} size="lg" className="px-8">
              Start Using Chanuka Platform
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground">
              You can always customize these settings later in your profile
            </p>
          </div>
        </div>
      )}
    </div>
  );
}