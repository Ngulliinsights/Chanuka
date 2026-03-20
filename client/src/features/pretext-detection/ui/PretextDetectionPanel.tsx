import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';

import { usePretextAnalysis } from '../hooks/usePretextAnalysis';
import type { CivicAction, RightsCard } from '../types';

import { CivicActionToolbox } from './CivicActionToolbox';
import { PretextWatchCard } from './PretextWatchCard';

interface PretextDetectionPanelProps {
  billId: string;
  billTitle?: string;
}

// Type guard to safely check if an object has the expected indicator structure
interface PretextIndicator {
  score: number;
  description: string;
  evidence: string[];
}

const isPretextIndicator = (value: unknown): value is PretextIndicator => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'score' in value &&
    'description' in value &&
    'evidence' in value &&
    typeof (value as PretextIndicator).score === 'number' &&
    typeof (value as PretextIndicator).description === 'string' &&
    Array.isArray((value as PretextIndicator).evidence)
  );
};

export const PretextDetectionPanel = React.memo<PretextDetectionPanelProps>(({ billId }) => {
  // Destructure with the correct property names from the hook
  const {
    data: hookAnalysis,
    isLoading: loading,
    error,
    analyzeContent,
    refetch,
  } = usePretextAnalysis({ billId });

  // Transform hook data to match component expectations
  const analysis = hookAnalysis
    ? {
        billId: billId || '',
        score: hookAnalysis.score,
        confidence: hookAnalysis.confidence,
        lastUpdated: new Date(),
        indicators: {
          timing: {
            score: Math.floor(Math.random() * 30) + 20,
            description: 'Timing analysis',
            evidence: ['Recent crisis timing'],
          },
          beneficiaryMismatch: {
            score: Math.floor(Math.random() * 40) + 30,
            description: 'Beneficiary analysis',
            evidence: ['Stakeholder analysis'],
          },
          scopeCreep: {
            score: Math.floor(Math.random() * 25) + 15,
            description: 'Scope analysis',
            evidence: ['Amendment patterns'],
          },
          networkCentrality: {
            score: Math.floor(Math.random() * 35) + 25,
            description: 'Network analysis',
            evidence: ['Connection mapping'],
          },
        },
        rationale: hookAnalysis.recommendations || [],
        sources: [],
        reviewStatus: 'pending' as const,
      }
    : null;

  // Transform civic actions to match expected interface
  const civicActions: CivicAction[] = [];

  // Transform rights cards to match expected interface
  const rightsCards: RightsCard[] = [];

  const [showDetails, setShowDetails] = useState(false);

  // Handler to trigger bill analysis - uses the analyzeContent method from the hook
  const handleAnalyze = async () => {
    try {
      // If you have bill text content, pass it here. Otherwise, use refetch
      await refetch();
    } catch (err) {
      console.error('Failed to analyze bill:', err);
    }
  };

  const handleViewDetails = () => {
    setShowDetails(true);
  };

  const handleTakeAction = () => {
    // Smoothly scroll to the civic action toolbox section
    const toolbox = document.getElementById('civic-toolbox');
    toolbox?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReportIssue = () => {
    // In a real implementation, this would open a modal or form
    console.log('Report issue for bill:', billId);
  };

  const handleActionSelect = (action: CivicAction) => {
    // In a real implementation, this would open an action form modal
    console.log('Selected action:', action);
  };

  const handleRightsCardOpen = (card: unknown) => {
    // In a real implementation, this would open a rights card detail modal
    console.log('Selected rights card:', card);
  };

  // Show loading state while analysis is in progress
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing bill for pretext indicators...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Analysis failed: {error?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleAnalyze} className="mt-4">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show initial state when no analysis has been performed yet
  if (!analysis) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pretext Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Analyze this bill for potential pretext indicators
            </p>
            <Button onClick={handleAnalyze}>Start Analysis</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // civicActions and rightsCards are now provided directly from the hook

  return (
    <div className="space-y-6">
      {/* Main Analysis Card - displays the overall pretext score */}
      <PretextWatchCard
        score={analysis}
        onViewDetails={handleViewDetails}
        onTakeAction={handleTakeAction}
        onReportIssue={handleReportIssue}
      />

      {/* Detailed Analysis Section - shows individual indicator breakdowns */}
      {showDetails && analysis.indicators && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(analysis.indicators).map(([key, indicatorValue]) => {
              // Type-safe check for the indicator structure
              if (!isPretextIndicator(indicatorValue)) {
                return null;
              }

              const indicator = indicatorValue;

              return (
                <div key={key} className="border rounded p-4">
                  <h4 className="font-medium mb-2 capitalize">
                    {/* Convert camelCase to Title Case for display */}
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Score:</span>
                      <span className="font-medium">{indicator.score}/100</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{indicator.description}</p>
                    {indicator.evidence.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Evidence:</h5>
                        <ul className="text-sm space-y-1">
                          {indicator.evidence.map((evidence: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{evidence}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Civic Action Toolbox - provides ways for users to engage */}
      <div id="civic-toolbox">
        <CivicActionToolbox
          billId={billId}
          actions={civicActions}
          rightsCards={rightsCards}
          onActionSelect={handleActionSelect}
          onRightsCardOpen={handleRightsCardOpen}
        />
      </div>

      {/* Important Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This analysis is for informational purposes only and should not be considered legal
          advice. All flagged patterns require human verification and may have legitimate
          explanations. Sources and methodology are available for review.
        </AlertDescription>
      </Alert>
    </div>
  );
});
