import { Shield, Award, CheckCircle, User, Star, Building } from 'lucide-react';
import React from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { cn } from '@lib/utils';
import { ExpertVerificationType } from '@client/lib/types';

import { GraduationCap } from '../icons/ChanukaIcons';

interface ExpertBadgeProps {
  verificationType?: ExpertVerificationType;
  credibilityScore?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

/**
 * ExpertBadge - Displays expert verification status using existing .chanuka-status-badge classes
 *
 * Features:
 * - Three verification types: Official, Domain, Identity
 * - Uses existing Chanuka design system classes
 * - Optional credibility score display
 * - Accessible tooltips with verification details
 * - Responsive sizing options
 */
export function ExpertBadge({
  verificationType,
  credibilityScore,
  showScore = false,
  size = 'md',
  className,
  showTooltip = true,
}: ExpertBadgeProps) {
  const getVerificationConfig = (type: ExpertVerificationType) => {
    switch (type) {
      case 'official':
        return {
          icon: Shield,
          label: 'Official Expert',
          description:
            'Government-verified expert with official credentials and institutional backing',
          badgeClass: 'chanuka-status-badge chanuka-status-success',
          iconColor: 'text-green-600',
          priority: 'high',
        };
      case 'domain':
        return {
          icon: Award,
          label: 'Domain Expert',
          description:
            'Recognized expert in this specific domain with verified credentials and peer recognition',
          badgeClass: 'chanuka-status-badge chanuka-status-info',
          iconColor: 'text-blue-600',
          priority: 'medium',
        };
      case 'identity':
        return {
          icon: CheckCircle,
          label: 'Verified Identity',
          description:
            'Identity verified through official channels with confirmed professional background',
          badgeClass: 'chanuka-status-badge chanuka-status-warning',
          iconColor: 'text-amber-600',
          priority: 'low',
        };
      default:
        return {
          icon: User,
          label: 'Contributor',
          description: 'Community contributor with unverified status',
          badgeClass: 'chanuka-status-badge',
          iconColor: 'text-gray-500',
          priority: 'none',
        };
    }
  };

  const getCredibilityConfig = (score?: number) => {
    if (!score) return null;

    if (score >= 0.8) {
      return {
        label: 'Highly Credible',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: Star,
      };
    }
    if (score >= 0.6) {
      return {
        label: 'Credible',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: Star,
      };
    }
    if (score >= 0.4) {
      return {
        label: 'Moderately Credible',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        icon: Star,
      };
    }
    return {
      label: 'Developing Credibility',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: Star,
    };
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          badge: 'text-xs px-1.5 py-0.5',
          icon: 'h-3 w-3',
          score: 'text-xs ml-1',
        };
      case 'lg':
        return {
          badge: 'text-sm px-3 py-1',
          icon: 'h-4 w-4',
          score: 'text-sm ml-2',
        };
      default: // md
        return {
          badge: 'text-xs px-2 py-0.5',
          icon: 'h-3.5 w-3.5',
          score: 'text-xs ml-1.5',
        };
    }
  };

  const verificationConfig = getVerificationConfig(verificationType ?? 'identity');
  const credibilityConfig = getCredibilityConfig(credibilityScore);
  const sizeClasses = getSizeClasses(size);
  const IconComponent = verificationConfig.icon;

  const badgeContent = (
    <div
      className={cn(
        verificationConfig.badgeClass,
        sizeClasses.badge,
        'inline-flex items-center gap-1 font-medium transition-all duration-200',
        className
      )}
    >
      <IconComponent className={cn(sizeClasses.icon, verificationConfig.iconColor)} />
      <span>{verificationConfig.label}</span>

      {showScore && credibilityConfig && (
        <span className={cn(sizeClasses.score, credibilityConfig.color, 'font-semibold')}>
          {Math.round((credibilityScore || 0) * 100)}%
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <IconComponent className={cn('h-4 w-4', verificationConfig.iconColor)} />
              <span className="font-semibold text-sm">{verificationConfig.label}</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {verificationConfig.description}
            </p>

            {showScore && credibilityConfig && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Credibility Score</span>
                  <div className="flex items-center gap-1">
                    <Star className={cn('h-3 w-3', credibilityConfig.color)} />
                    <span className={cn('text-xs font-semibold', credibilityConfig.color)}>
                      {Math.round((credibilityScore || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{credibilityConfig.label}</p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Verification ensures expertise and reduces misinformation
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ExpertBadgeGroup - Display multiple badges for an expert
 */
interface ExpertBadgeGroupProps {
  verificationType?: ExpertVerificationType;
  credibilityScore?: number;
  specializations?: string[];
  affiliationType?: 'academic' | 'government' | 'ngo' | 'private' | 'judicial';
  size?: 'sm' | 'md' | 'lg';
  maxSpecializations?: number;
  className?: string;
}

export function ExpertBadgeGroup({
  verificationType,
  credibilityScore,
  specializations = [],
  affiliationType,
  size = 'md',
  maxSpecializations = 2,
  className,
}: ExpertBadgeGroupProps) {
  const getAffiliationIcon = (type?: string) => {
    switch (type) {
      case 'academic':
        return GraduationCap;
      case 'government':
        return Building;
      case 'judicial':
        return Shield;
      default:
        return Building;
    }
  };

  const AffiliationIcon = getAffiliationIcon(affiliationType);

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {/* Primary verification badge */}
      <ExpertBadge
        verificationType={verificationType}
        credibilityScore={credibilityScore}
        showScore={true}
        size={size}
      />

      {/* Affiliation badge */}
      {affiliationType && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <AffiliationIcon className="h-3 w-3" />
          {affiliationType.charAt(0).toUpperCase() + affiliationType.slice(1)}
        </Badge>
      )}

      {/* Specialization badges */}
      {specializations.slice(0, maxSpecializations).map((spec, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {spec}
        </Badge>
      ))}

      {/* Show remaining count */}
      {specializations.length > maxSpecializations && (
        <Badge variant="outline" className="text-xs">
          +{specializations.length - maxSpecializations}
        </Badge>
      )}
    </div>
  );
}
