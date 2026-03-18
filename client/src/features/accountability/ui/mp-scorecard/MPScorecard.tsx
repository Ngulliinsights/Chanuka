/**
 * MP Scorecard Component
 *
 * Comprehensive MP accountability metrics display
 */

import { useMPScorecard } from '../../hooks/useElectoralAccountability';
import { AccountabilityMetricCard } from '../shared/AccountabilityMetricCard';
import { GapSeverityBadge } from '../shared/GapSeverityBadge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Loader2,
} from 'lucide-react';
import type { MPScorecardProps } from '../../types';

export function MPScorecard({
  sponsorId,
  constituency,
  onViewDetails,
  onCreateCampaign,
  className = '',
}: MPScorecardProps) {
  const { data: scorecard, isLoading, isError, error } = useMPScorecard(sponsorId, constituency);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading accountability scorecard...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`rounded-lg border-2 border-red-200 bg-red-50 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load scorecard</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!scorecard) {
    return null;
  }

  const getRiskSeverity = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  };

  const getAlignmentColor = (percentage: number): string => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">MP Accountability Scorecard</h2>
          <p className="text-sm text-gray-600 mt-1">{constituency} Constituency</p>
        </div>

        {scorecard.criticalGaps > 0 && <GapSeverityBadge severity="critical" size="lg" />}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Alignment Percentage */}
        <AccountabilityMetricCard
          title="Alignment with Constituents"
          value={`${scorecard.alignmentPercentage.toFixed(1)}%`}
          subtitle={`${scorecard.alignedVotes} of ${scorecard.totalVotes} votes aligned`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={scorecard.alignmentPercentage >= 60 ? 'up' : 'down'}
          severity={scorecard.alignmentPercentage >= 60 ? 'low' : 'high'}
        />

        {/* Misaligned Votes */}
        <AccountabilityMetricCard
          title="Misaligned Votes"
          value={scorecard.misalignedVotes}
          subtitle={`${((scorecard.misalignedVotes / scorecard.totalVotes) * 100).toFixed(1)}% of total votes`}
          icon={<XCircle className="w-5 h-5" />}
          severity={scorecard.misalignedVotes > 10 ? 'high' : 'low'}
        />

        {/* Critical Gaps */}
        <AccountabilityMetricCard
          title="Critical Gaps"
          value={scorecard.criticalGaps}
          subtitle="High-risk misalignments"
          icon={<AlertTriangle className="w-5 h-5" />}
          severity={scorecard.criticalGaps > 0 ? 'critical' : 'low'}
          onClick={scorecard.criticalGaps > 0 ? onViewDetails : undefined}
        />

        {/* Active Campaigns */}
        <AccountabilityMetricCard
          title="Active Campaigns"
          value={scorecard.activeCampaigns}
          subtitle="Ongoing accountability actions"
          icon={<Users className="w-5 h-5" />}
          severity={scorecard.activeCampaigns > 0 ? 'medium' : 'low'}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Gap */}
        <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Average Alignment Gap</h3>
            <Target className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {scorecard.averageGap.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-600">gap</span>
          </div>

          {/* Gap Visualization Bar */}
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  scorecard.averageGap >= 50
                    ? 'bg-red-500'
                    : scorecard.averageGap >= 25
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(scorecard.averageGap, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Electoral Risk Score */}
        <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Electoral Risk Score</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${getAlignmentColor(100 - scorecard.electoralRiskScore)}`}
            >
              {scorecard.electoralRiskScore.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">/ 100</span>
          </div>

          {/* Risk Level Badge */}
          <div className="mt-4">
            <GapSeverityBadge severity={getRiskSeverity(scorecard.electoralRiskScore)} size="md" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Detailed Analysis
          </button>
        )}

        {onCreateCampaign && scorecard.criticalGaps > 0 && (
          <button
            onClick={onCreateCampaign}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Create Accountability Campaign
          </button>
        )}
      </div>

      {/* Summary Text */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-700">
          <strong>Summary:</strong> This MP has voted {scorecard.totalVotes} times in {constituency}
          , with an alignment rate of {scorecard.alignmentPercentage.toFixed(1)}%.
          {scorecard.criticalGaps > 0 && (
            <span className="text-red-700 font-medium">
              {' '}
              There {scorecard.criticalGaps === 1 ? 'is' : 'are'} {scorecard.criticalGaps} critical
              misalignment{scorecard.criticalGaps === 1 ? '' : 's'} requiring immediate attention.
            </span>
          )}
          {scorecard.activeCampaigns > 0 && (
            <span className="text-blue-700 font-medium">
              {' '}
              {scorecard.activeCampaigns} accountability campaign
              {scorecard.activeCampaigns === 1 ? ' is' : 's are'} currently active.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
