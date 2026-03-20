/**
 * Constitutional Intelligence Tab Component
 * 
 * Tab content for displaying constitutional analysis on bill detail pages
 */

import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { useConstitutionalAnalysis, useAnalyzeBill } from '../hooks/use-constitutional-analysis';
import { ConstitutionalAnalysisDisplay } from './ConstitutionalAnalysisDisplay';
import type { Bill } from '@client/features/bills/types';

interface ConstitutionalIntelligenceTabProps {
  bill: Bill;
}

export function ConstitutionalIntelligenceTab({ bill }: ConstitutionalIntelligenceTabProps) {
  const { data: analysis, isLoading, isError, error } = useConstitutionalAnalysis(String(bill.id));
  const analyzeMutation = useAnalyzeBill();

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      billId: String(bill.id),
      billText: bill.full_text || bill.summary || '',
      billTitle: bill.title,
      billType: 'public', // Default, could be determined from bill data
      affectedInstitutions: [],
      proposedChanges: [],
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading constitutional analysis...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load constitutional analysis: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  // No analysis available
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            No Constitutional Analysis Available
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            This bill has not been analyzed for constitutional compliance yet. 
            Click the button below to run an analysis.
          </p>
          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="mt-4"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Analyze Bill
              </>
            )}
          </Button>
          {analyzeMutation.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                Analysis failed: {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : 'Unknown error'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  // Display analysis
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Constitutional Intelligence</h2>
          <p className="text-gray-600 mt-1">
            AI-powered analysis of constitutional compliance and potential concerns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-analyze
            </>
          )}
        </Button>
      </div>

      <ConstitutionalAnalysisDisplay analysis={analysis} />
    </div>
  );
}
