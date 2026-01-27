/**
 * ProgressiveDisclosure Widget
 *
 * Shows users what they can do to advance to the next persona level
 * and provides contextual guidance for their civic engagement journey.
 */

import type { PersonaType, PersonaClassification } from '@client/core/personalization/types';
import {
  TrendingUp,
  Target,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  Award,
  X,
  Info,
} from 'lucide-react';
import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';

interface ProgressiveDisclosureProps {
  currentPersona: PersonaType;
  classification: PersonaClassification;
  className?: string;
  onDismiss?: () => void;
}

interface NextLevelInfo {
  title: string;
  description: string;
  benefits: string[];
  icon: React.ReactNode;
  color: string;
}

const NEXT_LEVEL_INFO: Record<PersonaType, NextLevelInfo | null> = {
  novice: {
    title: 'Active Citizen',
    description: 'Become a regular participant in civic discussions and bill tracking',
    benefits: [
      'Advanced search and filtering tools',
      'Personalized bill recommendations',
      'Community discussion participation',
      'Bill tracking and notifications',
      'Civic engagement analytics',
    ],
    icon: <Users className="h-5 w-5" />,
    color: 'blue',
  },
  intermediate: {
    title: 'Civic Expert',
    description: 'Contribute your expertise to help others understand complex legislation',
    benefits: [
      'Expert verification tools',
      'Constitutional analysis access',
      'Professional network access',
      'Advanced analytics dashboard',
      'API access for data export',
      'Workaround detection system',
    ],
    icon: <Award className="h-5 w-5" />,
    color: 'purple',
  },
  expert: null, // Already at the highest level
};

export function ProgressiveDisclosure({
  currentPersona,
  classification,
  className = '',
  onDismiss,
}: ProgressiveDisclosureProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const nextLevelInfo = NEXT_LEVEL_INFO[currentPersona];

  // Don't show if already at expert level or if dismissed
  if (!nextLevelInfo || isDismissed) {
    return null;
  }

  // Don't show if no next level requirements
  if (!classification.nextLevelRequirements || classification.nextLevelRequirements.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          card: 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'purple':
        return {
          card: 'border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100',
          text: 'text-purple-800',
          badge: 'bg-purple-100 text-purple-800',
          button: 'bg-purple-600 hover:bg-purple-700',
        };
      default:
        return {
          card: 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100',
          text: 'text-gray-800',
          badge: 'bg-gray-100 text-gray-800',
          button: 'bg-gray-600 hover:bg-gray-700',
        };
    }
  };

  const colors = getColorClasses(nextLevelInfo.color);

  // Calculate progress based on confidence (higher confidence = closer to next level)
  const progressPercentage = Math.min(95, classification.confidence * 100);

  return (
    <Card className={`${colors.card} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${colors.text}`}>
            <TrendingUp className="h-5 w-5" />
            Ready for the Next Level?
          </CardTitle>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Level Preview */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colors.badge}`}>{nextLevelInfo.icon}</div>
          <div className="flex-1">
            <h4 className={`font-semibold ${colors.text}`}>Become a {nextLevelInfo.title}</h4>
            <p className={`text-sm ${colors.text} opacity-90`}>{nextLevelInfo.description}</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${colors.text}`}>Progress to Next Level</span>
            <Badge variant="secondary" className={colors.badge}>
              {Math.round(progressPercentage)}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className={`text-xs ${colors.text} opacity-75`}>
            You're {Math.round(progressPercentage)}% of the way to {nextLevelInfo.title} status
          </p>
        </div>

        {/* Requirements Checklist */}
        <div>
          <h5 className={`font-medium text-sm mb-2 ${colors.text} flex items-center gap-2`}>
            <Target className="h-4 w-4" />
            Complete these actions:
          </h5>
          <div className="space-y-2">
            {classification.nextLevelRequirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                <div className="w-5 h-5 rounded-full border-2 border-current opacity-50 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-current opacity-0" />
                </div>
                <span className={`text-sm ${colors.text}`}>{requirement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Preview */}
        <div>
          <h5 className={`font-medium text-sm mb-2 ${colors.text} flex items-center gap-2`}>
            <Star className="h-4 w-4" />
            What you'll unlock:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nextLevelInfo.benefits.slice(0, 4).map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className={`h-3 w-3 ${colors.text}`} />
                <span className={colors.text}>{benefit}</span>
              </div>
            ))}
          </div>
          {nextLevelInfo.benefits.length > 4 && (
            <p className={`text-xs ${colors.text} opacity-75 mt-2`}>
              +{nextLevelInfo.benefits.length - 4} more features
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button className={`flex-1 ${colors.button} text-white`} asChild>
            <a href={currentPersona === 'novice' ? '/bills' : '/expert/getting-started'}>
              Start Your Journey
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/help/persona-levels">
              <Info className="h-4 w-4 mr-2" />
              Learn More
            </a>
          </Button>
        </div>

        {/* Motivational Message */}
        <div className="bg-white/50 p-3 rounded-lg">
          <p className={`text-sm ${colors.text} text-center`}>
            {currentPersona === 'novice'
              ? 'Every expert was once a beginner. Your civic engagement journey starts with small steps!'
              : 'Your expertise can help thousands of citizens better understand complex legislation.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
