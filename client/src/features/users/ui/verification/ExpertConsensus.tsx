import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import { cn } from '@lib/utils';
import { ExpertConsensus as ExpertConsensusType } from '@client/lib/types';

interface ExpertConsensusProps {
  consensus: ExpertConsensusType;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const getAgreementColor = (level: number) => {
  if (level >= 0.8) return 'text-green-600';
  if (level >= 0.6) return 'text-blue-600';
  if (level >= 0.4) return 'text-amber-600';
  return 'text-red-600';
};

const getAgreementLabel = (level: number) => {
  if (level >= 0.8) return 'Strong Consensus';
  if (level >= 0.6) return 'Moderate Consensus';
  if (level >= 0.4) return 'Mixed Views';
  return 'High Disagreement';
};

const getControversyConfig = (level: string) => {
  switch (level) {
    case 'low':
      return {
        icon: CheckCircle,
        label: 'Low Controversy',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Experts generally agree on this topic',
      };
    case 'medium':
      return {
        icon: AlertTriangle,
        label: 'Moderate Controversy',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        description: 'Some disagreement among experts',
      };
    case 'high':
      return {
        icon: XCircle,
        label: 'High Controversy',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        description: 'Significant disagreement among experts',
      };
    default:
      return {
        icon: Info,
        label: 'Unknown',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        description: 'Controversy level not determined',
      };
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * ExpertConsensus - Displays expert consensus tracking and disagreement analysis
 *
 * Features:
 * - Agreement level visualization with progress bars
 * - Majority and minority position breakdown
 * - Controversy level indicators
 * - Expert participation tracking
 * - Expandable position details
 */
export function ExpertConsensus({
  consensus,
  showDetails = false,
  compact = false,
  className,
}: ExpertConsensusProps) {
  const [showPositionDetails, setShowPositionDetails] = useState(showDetails);

  const controversyConfig = getControversyConfig(consensus.controversyLevel);
  const ControversyIcon = controversyConfig.icon;
  const agreementPercentage = Math.round(consensus.agreementLevel * 100);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{consensus.totalExperts}</span>
        </div>

        <div className="flex items-center gap-1">
          <TrendingUp className={cn('h-4 w-4', getAgreementColor(consensus.agreementLevel))} />
          <span className={cn('text-sm font-medium', getAgreementColor(consensus.agreementLevel))}>
            {agreementPercentage}% agree
          </span>
        </div>

        <Badge
          variant="secondary"
          className={cn('text-xs', controversyConfig.color, controversyConfig.bgColor)}
        >
          <ControversyIcon className="h-3 w-3 mr-1" />
          {controversyConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Expert Consensus
          </CardTitle>
          <Badge
            variant="secondary"
            className={cn(
              'flex items-center gap-1 px-3 py-1',
              controversyConfig.color,
              controversyConfig.bgColor
            )}
          >
            <ControversyIcon className="h-3 w-3" />
            {controversyConfig.label}
          </Badge>
        </div>
        <CardDescription>
          {consensus.topic} • {consensus.totalExperts} experts participating • Updated{' '}
          {formatDate(consensus.lastUpdated)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Agreement Level Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Agreement Level
            </h4>
            <div className="text-right">
              <div className={cn('text-xl font-bold', getAgreementColor(consensus.agreementLevel))}>
                {agreementPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">
                {getAgreementLabel(consensus.agreementLevel)}
              </div>
            </div>
          </div>

          <Progress value={consensus.agreementLevel * 100} className="h-3" />

          <p className="text-sm text-muted-foreground">{controversyConfig.description}</p>
        </div>

        {/* Majority Position */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Majority Position</h4>
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Primary Consensus</span>
              <Badge variant="secondary" className="text-xs">
                {Math.round(
                  ((consensus.totalExperts -
                    consensus.minorityPositions.reduce((sum, pos) => sum + pos.expertCount, 0)) /
                    consensus.totalExperts) *
                    100
                )}
                % of experts
              </Badge>
            </div>
            <p className="text-sm text-green-800 leading-relaxed">{consensus.majorityPosition}</p>
          </div>
        </div>

        {/* Minority Positions */}
        {consensus.minorityPositions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Alternative Positions</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPositionDetails(!showPositionDetails)}
                className="text-xs h-auto p-1"
              >
                {showPositionDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {consensus.minorityPositions.map((position, index) => {
                const percentage = Math.round(
                  (position.expertCount / consensus.totalExperts) * 100
                );

                return (
                  <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-900">
                        Alternative View {index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {position.expertCount} experts ({percentage}%)
                      </Badge>
                    </div>

                    <p className="text-sm text-amber-800 leading-relaxed mb-2">
                      {position.position}
                    </p>

                    {showPositionDetails && (
                      <div className="pt-2 border-t border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-3 w-3 text-amber-600" />
                          <span className="text-xs font-medium text-amber-900">
                            Supporting Experts
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {position.experts.slice(0, 5).map((expertId, expertIndex) => (
                            <Avatar key={expertIndex} className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {expertId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {position.experts.length > 5 && (
                            <div className="flex items-center justify-center h-6 w-6 bg-amber-100 rounded-full text-xs font-medium text-amber-700">
                              +{position.experts.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Consensus Metrics */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-muted-foreground">
                {consensus.totalExperts}
              </div>
              <div className="text-xs text-muted-foreground">Total Experts</div>
            </div>

            <div>
              <div className={cn('text-lg font-bold', getAgreementColor(consensus.agreementLevel))}>
                {agreementPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">Agreement</div>
            </div>

            <div>
              <div className="text-lg font-bold text-muted-foreground">
                {consensus.minorityPositions.length + 1}
              </div>
              <div className="text-xs text-muted-foreground">Positions</div>
            </div>

            <div>
              <div className={cn('text-lg font-bold', controversyConfig.color)}>
                {consensus.controversyLevel.toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground">Controversy</div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Clock className="h-3 w-3" />
          <span>Last updated: {formatDate(consensus.lastUpdated)}</span>
          <Zap className="h-3 w-3 ml-auto" />
          <span>Updates in real-time as experts contribute</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ConsensusIndicator - Compact consensus indicator for use in lists
 */
interface ConsensusIndicatorProps {
  agreementLevel: number;
  totalExperts: number;
  controversyLevel: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ConsensusIndicator({
  agreementLevel,
  totalExperts,
  controversyLevel,
  size = 'md',
  showLabel = true,
  className,
}: ConsensusIndicatorProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'gap-1',
          icon: 'h-3 w-3',
          text: 'text-xs',
        };
      case 'lg':
        return {
          container: 'gap-2',
          icon: 'h-5 w-5',
          text: 'text-sm',
        };
      default:
        return {
          container: 'gap-1.5',
          icon: 'h-4 w-4',
          text: 'text-sm',
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const controversyConfig = getControversyConfig(controversyLevel);
  const ControversyIcon = controversyConfig.icon;

  return (
    <div className={cn('flex items-center', sizeClasses.container, className)}>
      <div className="flex items-center gap-1">
        <Users className={cn(sizeClasses.icon, 'text-muted-foreground')} />
        <span className={cn(sizeClasses.text, 'font-medium')}>{totalExperts}</span>
      </div>

      <div className="flex items-center gap-1">
        <TrendingUp className={cn(sizeClasses.icon, getAgreementColor(agreementLevel))} />
        <span className={cn(sizeClasses.text, 'font-medium', getAgreementColor(agreementLevel))}>
          {Math.round(agreementLevel * 100)}%
        </span>
      </div>

      <ControversyIcon className={cn(sizeClasses.icon, controversyConfig.color)} />

      {showLabel && (
        <span className={cn(sizeClasses.text, 'text-muted-foreground')}>
          {getAgreementLabel(agreementLevel)}
        </span>
      )}
    </div>
  );
}
