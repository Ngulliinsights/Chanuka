/**
 * Voting Record Timeline Component
 * 
 * Visual timeline of MP votes with alignment indicators
 */

import { useMPVotingRecord } from '../../hooks/useElectoralAccountability';
import {
  CheckCircle,
  XCircle,
  Minus,
  User,
  Calendar,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { VotingRecordTimelineProps, VotingRecord } from '../../types';
import { format } from 'date-fns';

const voteIcons = {
  yes: CheckCircle,
  no: XCircle,
  abstain: Minus,
  absent: User,
};

const voteColors = {
  yes: 'text-green-600 bg-green-50 border-green-200',
  no: 'text-red-600 bg-red-50 border-red-200',
  abstain: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  absent: 'text-gray-600 bg-gray-50 border-gray-200',
};

export function VotingRecordTimeline({
  sponsorId,
  constituency,
  startDate,
  endDate,
  includeGapAnalysis = true,
  onVoteClick,
  className = '',
}: VotingRecordTimelineProps) {
  const { data: records, isLoading, isError, error } = useMPVotingRecord({
    sponsorId,
    constituency,
    startDate,
    endDate,
    includeGapAnalysis,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading voting records...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`rounded-lg border-2 border-red-200 bg-red-50 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Failed to load voting records</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className={`rounded-lg border-2 border-gray-200 bg-gray-50 p-12 text-center ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700">No voting records found</h3>
        <p className="text-sm text-gray-600 mt-1">
          No votes recorded for this MP in {constituency || 'this constituency'}.
        </p>
      </div>
    );
  }

  const getAlignmentStatus = (record: VotingRecord): 'aligned' | 'misaligned' | 'unknown' => {
    if (record.alignmentWithConstituency === null) return 'unknown';
    return record.alignmentWithConstituency >= 60 ? 'aligned' : 'misaligned';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Voting Record Timeline</h3>
        <span className="text-sm text-gray-600">{records.length} votes</span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Voting records */}
        <div className="space-y-6">
          {records.map((record) => {
            const VoteIcon = voteIcons[record.vote];
            const alignmentStatus = getAlignmentStatus(record);

            return (
              <div
                key={record.id}
                className={`
                  relative pl-20 pr-6 py-4 rounded-lg border-2 transition-all duration-200
                  ${onVoteClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''}
                  ${alignmentStatus === 'aligned' ? 'bg-green-50 border-green-200' : 
                    alignmentStatus === 'misaligned' ? 'bg-red-50 border-red-200' : 
                    'bg-white border-gray-200'}
                `}
                onClick={() => onVoteClick?.(record)}
                role={onVoteClick ? 'button' : undefined}
                tabIndex={onVoteClick ? 0 : undefined}
              >
                {/* Timeline dot */}
                <div className="absolute left-6 top-6 w-5 h-5 rounded-full bg-white border-4 border-blue-600 z-10" />

                {/* Vote icon */}
                <div className={`absolute left-0 top-4 w-16 flex justify-center`}>
                  <div className={`p-2 rounded-full border-2 ${voteColors[record.vote]}`}>
                    <VoteIcon className="w-5 h-5" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${voteColors[record.vote]}`}>
                          Voted {record.vote.toUpperCase()}
                        </span>
                        {alignmentStatus === 'aligned' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                            ✓ Aligned
                          </span>
                        )}
                        {alignmentStatus === 'misaligned' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                            ✗ Misaligned
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-semibold text-gray-900">
                        Bill {record.billId.substring(0, 8)}...
                      </h4>
                    </div>

                    {record.alignmentWithConstituency !== null && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {record.alignmentWithConstituency.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-600">alignment</div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(record.voteDate), 'MMM d, yyyy')}</span>
                    </div>
                    
                    {record.readingStage && (
                      <div>
                        <span className="font-medium">Stage:</span> {record.readingStage}
                      </div>
                    )}

                    {record.daysUntilNextElection !== null && (
                      <div>
                        <span className="font-medium">Election:</span> {record.daysUntilNextElection} days
                      </div>
                    )}
                  </div>

                  {/* Hansard reference */}
                  {record.hansardReference && (
                    <div className="text-xs text-gray-500">
                      Hansard: {record.hansardReference}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
