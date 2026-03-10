/**
 * SponsorCard Component
 * Displays sponsor information in a card format with conflict indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system/interactive';
import { Badge } from '@client/lib/design-system/feedback';
import { Button } from '@client/lib/design-system/interactive';
import { AlertTriangle, Eye, Shield, TrendingUp, Users } from 'lucide-react';

import type { Sponsor, ConflictSeverity } from '../types';

// ============================================================================
// Types
// ============================================================================

interface SponsorCardProps {
  sponsor: Sponsor;
  onViewDetails?: (sponsor: Sponsor) => void;
  onViewConflicts?: (sponsor: Sponsor) => void;
  showConflictIndicator?: boolean;
  conflictLevel?: ConflictSeverity;
  conflictCount?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getSeverityColor = (severity: ConflictSeverity): string => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSeverityIcon = (severity: ConflictSeverity) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <TrendingUp className="h-4 w-4" />;
    case 'low':
      return <Shield className="h-4 w-4" />;
    default:
      return <Users className="h-4 w-4" />;
  }
};

const formatTransparencyScore = (score?: number | null): string => {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score)}%`;
};

const formatFinancialExposure = (exposure?: number | null): string => {
  if (exposure === null || exposure === undefined) return 'N/A';
  if (exposure >= 1000000) return `KSh ${(exposure / 1000000).toFixed(1)}M`;
  if (exposure >= 1000) return `KSh ${(exposure / 1000).toFixed(0)}K`;
  return `KSh ${exposure.toLocaleString()}`;
};

// ============================================================================
// Component
// ============================================================================

export function SponsorCard({
  sponsor,
  onViewDetails,
  onViewConflicts,
  showConflictIndicator = false,
  conflictLevel = 'low',
  conflictCount = 0,
}: SponsorCardProps) {
  const handleViewDetails = () => {
    onViewDetails?.(sponsor);
  };

  const handleViewConflicts = () => {
    onViewConflicts?.(sponsor);
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {sponsor.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {sponsor.party}
              </Badge>
              {sponsor.role && (
                <Badge variant="secondary" className="text-xs">
                  {sponsor.role}
                </Badge>
              )}
              {!sponsor.is_active && (
                <Badge variant="destructive" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          
          {showConflictIndicator && conflictCount > 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getSeverityColor(conflictLevel)}`}>
              {getSeverityIcon(conflictLevel)}
              <span>{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Constituency */}
          {sponsor.constituency && (
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2" />
              <span>{sponsor.constituency}</span>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Transparency Score</span>
              <div className="font-medium text-gray-900">
                {formatTransparencyScore(sponsor.transparency_score)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Financial Exposure</span>
              <div className="font-medium text-gray-900">
                {formatFinancialExposure(sponsor.financial_exposure)}
              </div>
            </div>
          </div>

          {/* Voting Alignment */}
          {sponsor.voting_alignment !== null && sponsor.voting_alignment !== undefined && (
            <div className="text-sm">
              <span className="text-gray-500">Voting Alignment: </span>
              <span className="font-medium text-gray-900">
                {Math.round(sponsor.voting_alignment)}%
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDetails}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            
            {showConflictIndicator && (
              <Button
                variant={conflictCount > 0 ? "destructive" : "outline"}
                size="sm"
                onClick={handleViewConflicts}
                className="flex-1"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Conflicts ({conflictCount})
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SponsorCard;