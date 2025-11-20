/**
 * Credibility Scoring Components
 * 
 * Components for displaying and managing expert credibility scores
 * with transparent methodology and community validation.
 */

import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Star, Info, TrendingUp, Users, Award } from 'lucide-react';
import { cn } from '@client/lib/utils';

interface CredibilityIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function CredibilityIndicator({
  score,
  size = 'md',
  showDetails = false,
  className
}: CredibilityIndicatorProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Highly Credible';
    if (score >= 0.6) return 'Credible';
    if (score >= 0.4) return 'Moderately Credible';
    return 'Developing Credibility';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-50';
    if (score >= 0.6) return 'bg-blue-50';
    if (score >= 0.4) return 'bg-amber-50';
    return 'bg-gray-50';
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-xs',
          progress: 'h-1',
          icon: 'h-3 w-3'
        };
      case 'lg':
        return {
          container: 'text-base',
          progress: 'h-3',
          icon: 'h-5 w-5'
        };
      default: // md
        return {
          container: 'text-sm',
          progress: 'h-2',
          icon: 'h-4 w-4'
        };
    }
  };

  const sizeClasses = getSizeClasses(size);

  if (showDetails) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <span className={cn('font-medium', sizeClasses.container)}>
            Credibility Score
          </span>
          <Badge 
            variant="secondary" 
            className={cn(
              sizeClasses.container,
              getScoreColor(score),
              getScoreBgColor(score)
            )}
          >
            {Math.round(score * 100)}%
          </Badge>
        </div>
        
        <Progress 
          value={score * 100} 
          className={cn(sizeClasses.progress, 'w-full')}
        />
        
        <div className={cn('flex items-center gap-1', sizeClasses.container, 'text-muted-foreground')}>
          <Star className={cn(sizeClasses.icon, getScoreColor(score))} />
          <span>{getScoreLabel(score)}</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full',
            sizeClasses.container,
            getScoreBgColor(score),
            className
          )}>
            <Star className={cn(sizeClasses.icon, getScoreColor(score))} />
            <span className={cn('font-medium', getScoreColor(score))}>
              {Math.round(score * 100)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-medium">{getScoreLabel(score)}</div>
            <div className="text-xs text-muted-foreground">
              Credibility Score: {Math.round(score * 100)}%
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CredibilityBreakdownProps {
  components: {
    credentialScore: number;
    affiliationScore: number;
    communityScore: number;
    contributionQuality: number;
    consensusAlignment: number;
  };
  methodology?: {
    description: string;
    factors: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
  };
  className?: string;
}

export function CredibilityBreakdown({
  components,
  methodology,
  className
}: CredibilityBreakdownProps) {
  const componentItems = [
    {
      name: 'Credentials',
      score: components.credentialScore,
      icon: Award,
      description: 'Educational background and professional certifications'
    },
    {
      name: 'Affiliations',
      score: components.affiliationScore,
      icon: Users,
      description: 'Professional and institutional associations'
    },
    {
      name: 'Community',
      score: components.communityScore,
      icon: TrendingUp,
      description: 'Community validation and peer recognition'
    },
    {
      name: 'Contribution Quality',
      score: components.contributionQuality,
      icon: Star,
      description: 'Quality and accuracy of past contributions'
    },
    {
      name: 'Consensus Alignment',
      score: components.consensusAlignment,
      icon: Users,
      description: 'Alignment with expert consensus on topics'
    }
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Credibility Breakdown</h4>
      </div>

      <div className="space-y-3">
        {componentItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <TooltipProvider key={item.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={item.score * 100} 
                        className="w-16 h-2"
                      />
                      <span className="text-sm font-medium w-8 text-right">
                        {Math.round(item.score * 100)}%
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {methodology && (
        <div className="pt-3 border-t border-border/50">
          <h5 className="font-medium text-sm mb-2">Methodology</h5>
          <p className="text-xs text-muted-foreground mb-3">
            {methodology.description}
          </p>
          
          <div className="space-y-2">
            {methodology.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{factor.name}:</span>
                <span className="font-medium">{Math.round(factor.weight * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}