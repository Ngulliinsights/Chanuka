/**
 * PersonaIndicator Widget
 *
 * Displays the user's current persona classification with confidence level
 * and provides insights into how the classification was determined.
 */

import type { PersonaClassification } from '@client/infrastructure/personalization/types';
import { User, TrendingUp, Award, HelpCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/lib/design-system';

interface PersonaIndicatorProps {
  classification: PersonaClassification;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function PersonaIndicator({
  classification,
  showDetails = false,
  compact = false,
  className = '',
}: PersonaIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPersonaIcon = () => {
    switch (classification.type) {
      case 'novice':
        return <User className="h-4 w-4" />;
      case 'intermediate':
        return <TrendingUp className="h-4 w-4" />;
      case 'expert':
        return <Award className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getPersonaColor = () => {
    switch (classification.type) {
      case 'novice':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expert':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPersonaLabel = () => {
    switch (classification.type) {
      case 'novice':
        return 'Civic Newcomer';
      case 'intermediate':
        return 'Active Citizen';
      case 'expert':
        return 'Civic Expert';
      default:
        return 'Citizen';
    }
  };

  const getConfidenceLevel = () => {
    if (classification.confidence >= 0.8) return 'High';
    if (classification.confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = () => {
    if (classification.confidence >= 0.8) return 'text-green-600';
    if (classification.confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`${getPersonaColor()} ${className}`}>
              {getPersonaIcon()}
              <span className="ml-1">{getPersonaLabel()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p className="font-medium">Experience Level: {getPersonaLabel()}</p>
              <p className="text-sm">Confidence: {Math.round(classification.confidence * 100)}%</p>
              {classification.reasons.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Based on:</p>
                  <ul className="text-xs space-y-1">
                    {classification.reasons.slice(0, 3).map((reason, index) => (
                      <li key={index}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getPersonaIcon()}
            Your Experience Level
          </span>
          {showDetails && (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Persona Display */}
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="outline" className={`${getPersonaColor()} text-base px-3 py-1`}>
              {getPersonaLabel()}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Based on your civic engagement activity
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${getConfidenceColor()}`}>
              {getConfidenceLevel()} Confidence
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(classification.confidence * 100)}% match
            </div>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Classification Confidence</span>
            <span>{Math.round(classification.confidence * 100)}%</span>
          </div>
          <Progress value={classification.confidence * 100} className="h-2" />
        </div>

        {/* Expanded Details */}
        {isExpanded && showDetails && (
          <div className="space-y-4 pt-4 border-t">
            {/* Classification Reasons */}
            {classification.reasons.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Why this classification?
                </h4>
                <ul className="space-y-1">
                  {classification.reasons.map((reason, index) => (
                    <li
                      key={index}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Features */}
            {classification.suggestedFeatures.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Recommended features for you:</h4>
                <div className="flex flex-wrap gap-1">
                  {classification.suggestedFeatures.slice(0, 4).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Next Level Requirements */}
            {classification.nextLevelRequirements &&
              classification.nextLevelRequirements.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-800">
                    To reach the next level:
                  </h4>
                  <ul className="space-y-1">
                    {classification.nextLevelRequirements.map((requirement, index) => (
                      <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Help Link */}
            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href="/help/persona-classification">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Learn about experience levels
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
