import React from 'react';

import { ConflictOfInterestAnalysis } from '@client/features/bills/ui/analysis/conflict-of-interest';
import { Alert, AlertDescription } from '@client/shared/design-system';
import type { Bill } from '@client/shared/types';

import { useConflictAnalysis } from '../../model/hooks/useConflictAnalysis';

interface AnalysisDashboardProps {
  bill: Bill;
}

/**
 * Dashboard component orchestrating all analysis visualizations
 * Wraps ConflictOfInterestAnalysis with data fetching and error handling
 */
export function AnalysisDashboard({ bill }: AnalysisDashboardProps) {
  const sponsorId = bill.sponsors?.[0]?.id;
  const primarySponsorId = typeof sponsorId === 'string' ? parseInt(sponsorId, 10) : sponsorId || 0;

  const {
    data: conflictAnalysis,
    loading,
    error,
  } = useConflictAnalysis(
    typeof bill.id === 'string' ? parseInt(bill.id, 10) : bill.id,
    primarySponsorId
  );

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertDescription className="text-red-800">
          Error loading analysis: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">Loading analysis...</AlertDescription>
        </Alert>
        <div className="h-96 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!conflictAnalysis) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertDescription className="text-yellow-800">
          No analysis available for this bill.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informational alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Advanced analysis of potential conflicts of interest, financial exposure, and voting
          patterns. This analysis uses publicly available data sources and algorithmic scoring.
        </AlertDescription>
      </Alert>

      {/* Main analysis component */}
      <ConflictOfInterestAnalysis bill={bill} />
    </div>
  );
}

export default AnalysisDashboard;
