import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@client/services/apiService';

interface Argument {
  id: string;
  argument_text: string;
  argument_summary: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  argument_type: string;
  strength_score: number;
  support_count: number;
  opposition_count: number;
  citizen_endorsements: number;
  is_verified: boolean;
}

interface LegislativeBrief {
  bill_id: string;
  bill_title: string;
  executive_summary: string;
  key_arguments: {
    support: Argument[];
    oppose: Argument[];
    neutral: Argument[];
  };
  citizen_statistics: {
    total_comments: number;
    total_participants: number;
    geographic_distribution: Record<string, number>;
  };
  recommendations: string[];
  generated_at: string;
}

interface BriefViewerProps {
  billId: string;
}

export function BriefViewer({ billId }: BriefViewerProps) {
  const [selectedPosition, setSelectedPosition] = useState<'all' | 'support' | 'oppose' | 'neutral'>('all');
  const [sortBy, setSortBy] = useState<'strength' | 'endorsements'>('strength');

  const { data: brief, isLoading, error } = useQuery<LegislativeBrief>({
    queryKey: ['legislative-brief', billId],
    queryFn: async () => {
      const response = await api.post(`/api/argument-intelligence/generate-brief`, {
        billId,
        audience: 'committee',
        includeStatistics: true,
      });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Generating legislative brief...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load legislative brief. Please try again.</p>
      </div>
    );
  }

  if (!brief) return null;

  const getArgumentsByPosition = () => {
    if (selectedPosition === 'all') {
      return [
        ...brief.key_arguments.support,
        ...brief.key_arguments.oppose,
        ...brief.key_arguments.neutral,
      ];
    }
    return brief.key_arguments[selectedPosition] || [];
  };

  const sortedArguments = getArgumentsByPosition().sort((a, b) => {
    if (sortBy === 'strength') {
      return b.strength_score - a.strength_score;
    }
    return b.citizen_endorsements - a.citizen_endorsements;
  });

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'support': return 'bg-green-100 text-green-800 border-green-300';
      case 'oppose': return 'bg-red-100 text-red-800 border-red-300';
      case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'conditional': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Legislative Brief</h2>
            <p className="text-sm text-gray-500 mt-1">
              Generated {new Date(brief.generated_at).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Executive Summary</h3>
        <p className="text-blue-800 leading-relaxed">{brief.executive_summary}</p>
      </div>

      {/* Citizen Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Citizen Participation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900">
              {brief.citizen_statistics.total_comments.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Unique Participants</p>
            <p className="text-2xl font-bold text-gray-900">
              {brief.citizen_statistics.total_participants.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Counties Represented</p>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(brief.citizen_statistics.geographic_distribution).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Position:</label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Positions</option>
              <option value="support">Support</option>
              <option value="oppose">Oppose</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="strength">Argument Strength</option>
              <option value="endorsements">Citizen Endorsements</option>
            </select>
          </div>
        </div>
      </div>

      {/* Arguments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Key Arguments ({sortedArguments.length})
        </h3>
        {sortedArguments.map((argument) => (
          <div
            key={argument.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPositionColor(argument.position)}`}>
                  {argument.position.toUpperCase()}
                </span>
                {argument.is_verified && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                    ✓ VERIFIED
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {argument.argument_type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span title="Argument Strength">
                  💪 {(argument.strength_score * 100).toFixed(0)}%
                </span>
                <span title="Citizen Endorsements">
                  👥 {argument.citizen_endorsements}
                </span>
              </div>
            </div>

            <p className="text-gray-900 font-medium mb-2">{argument.argument_summary}</p>
            <p className="text-gray-700 leading-relaxed">{argument.argument_text}</p>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 text-sm">
              <span className="text-green-600">
                ↑ {argument.support_count} support
              </span>
              <span className="text-red-600">
                ↓ {argument.opposition_count} oppose
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {brief.recommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {brief.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-amber-800">
                <span className="text-amber-600 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
