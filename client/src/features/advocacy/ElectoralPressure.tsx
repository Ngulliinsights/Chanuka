import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@client/services/apiService';

interface RepresentationGap {
  sponsor: {
    id: string;
    name: string;
    party: string;
    constituency: string;
  };
  bills: Array<{
    bill_id: string;
    bill_title: string;
    mp_vote: 'support' | 'oppose' | 'abstain' | null;
    constituency_vote: {
      support: number;
      oppose: number;
      abstain: number;
    };
    gap_score: number; // 0-100, higher = bigger gap
  }>;
  overall_gap: number;
  trend: 'improving' | 'worsening' | 'stable';
  representation_score: number; // 0-100, higher = better representation
}

interface ElectoralPressureProps {
  sponsorId: string;
}

export function ElectoralPressure({ sponsorId }: ElectoralPressureProps) {
  const { data, isLoading, error } = useQuery<RepresentationGap>({
    queryKey: ['electoral-pressure', sponsorId],
    queryFn: async () => {
      // Calculate representation gap from existing data
      const [sponsor, billVotes] = await Promise.all([
        api.get(`/api/sponsors/${sponsorId}`),
        api.get(`/api/bills/votes/by-sponsor/${sponsorId}`),
      ]);

      // Aggregate constituency votes
      const bills = await Promise.all(
        billVotes.data.map(async (bv: any) => {
          const constituencyVotes = await api.get(
            `/api/bills/${bv.bill_id}/votes/by-constituency/${sponsor.data.constituency}`
          );

          const mpVote = bv.vote_type;
          const constVote = constituencyVotes.data;

          // Calculate gap score
          let gapScore = 0;
          if (mpVote === 'support' && constVote.oppose > constVote.support) {
            gapScore = ((constVote.oppose - constVote.support) / constVote.total) * 100;
          } else if (mpVote === 'oppose' && constVote.support > constVote.oppose) {
            gapScore = ((constVote.support - constVote.oppose) / constVote.total) * 100;
          }

          return {
            bill_id: bv.bill_id,
            bill_title: bv.bill_title,
            mp_vote: mpVote,
            constituency_vote: constVote,
            gap_score: Math.round(gapScore),
          };
        })
      );

      const overallGap = bills.reduce((sum, b) => sum + b.gap_score, 0) / bills.length;
      const representationScore = Math.max(0, 100 - overallGap);

      return {
        sponsor: sponsor.data,
        bills,
        overall_gap: Math.round(overallGap),
        trend: 'stable', // TODO: Calculate trend from historical data
        representation_score: Math.round(representationScore),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Calculating representation gap...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load electoral pressure data.</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'worsening': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{data.sponsor.name}</h2>
            <p className="text-gray-600 mt-1">
              {data.sponsor.party} • {data.sponsor.constituency}
            </p>
          </div>
          <button
            onClick={() => {
              // Share functionality
              if (navigator.share) {
                navigator.share({
                  title: `${data.sponsor.name} Accountability Card`,
                  text: `Representation Score: ${data.representation_score}/100`,
                  url: window.location.href,
                });
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Share
          </button>
        </div>
      </div>

      {/* Representation Score */}
      <div className={`rounded-lg border-2 p-6 ${getScoreColor(data.representation_score)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Representation Score</h3>
            <p className="text-sm opacity-80">
              How well this MP votes align with constituency sentiment
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{data.representation_score}/100</div>
            <div className="text-sm mt-1">
              {getTrendIcon(data.trend)} {data.trend}
            </div>
          </div>
        </div>
      </div>

      {/* Voting Record */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Voting Record vs Constituency
        </h3>
        <div className="space-y-4">
          {data.bills.map((bill) => (
            <div
              key={bill.bill_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex-1">{bill.bill_title}</h4>
                {bill.gap_score > 30 && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                    ⚠️ MISALIGNED
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* MP Vote */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">MP Voted</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {bill.mp_vote || 'Not Voted'}
                  </p>
                </div>

                {/* Constituency Vote */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Constituency Sentiment</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">
                      ✓ {bill.constituency_vote.support}
                    </span>
                    <span className="text-red-600">
                      ✗ {bill.constituency_vote.oppose}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gap Indicator */}
              {bill.gap_score > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Representation Gap</span>
                    <span className={`font-semibold ${bill.gap_score > 30 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {bill.gap_score}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bill.gap_score > 30 ? 'bg-red-500' : 'bg-yellow-500'}`}
                      style={{ width: `${bill.gap_score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Take Action</h3>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left">
            <div className="font-medium">Contact Your MP</div>
            <div className="text-sm opacity-90">
              Let them know your position on these bills
            </div>
          </button>
          <button className="w-full px-4 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-left">
            <div className="font-medium">Share This Report</div>
            <div className="text-sm opacity-90">
              Help others understand their MP's voting record
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
