import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { PretextWatchCard } from './PretextWatchCard';
import { CivicActionToolbox } from './CivicActionToolbox';
import { usePretextAnalysis } from '@client/hooks/usePretextAnalysis';
import { CivicAction, RightsCard } from '@client/types';

interface PretextDetectionPanelProps {
  billId: string;
  billTitle?: string;
}

export const PretextDetectionPanel: React.FC<PretextDetectionPanelProps> = ({
  billId,
  billTitle
}) => {
  const { 
    analysis, 
    loading, 
    error, 
    civicActions, 
    rightsCards, 
    analyzeBill 
  } = usePretextAnalysis(billId);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CivicAction | null>(null);
  const [selectedRightsCard, setSelectedRightsCard] = useState<RightsCard | null>(null);

  const handleAnalyze = () => {
    analyzeBill(billId);
  };

  const handleViewDetails = () => {
    setShowDetails(true);
  };

  const handleTakeAction = () => {
    // Scroll to action toolbox or open modal
    const toolbox = document.getElementById('civic-toolbox');
    toolbox?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReportIssue = () => {
    // Open issue reporting modal
    console.log('Report issue for bill:', billId);
  };

  const handleActionSelect = (action: CivicAction) => {
    setSelectedAction(action);
    // Open action form modal
    console.log('Selected action:', action);
  };

  const handleRightsCardOpen = (card: RightsCard) => {
    setSelectedRightsCard(card);
    // Open rights card modal
    console.log('Selected rights card:', card);
  };

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

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Analysis failed: {error}
            </AlertDescription>
          </Alert>
          <Button onClick={handleAnalyze} className="mt-4">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

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
            <Button onClick={handleAnalyze}>
              Start Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Analysis Card */}
      <PretextWatchCard
        score={analysis}
        onViewDetails={handleViewDetails}
        onTakeAction={handleTakeAction}
        onReportIssue={handleReportIssue}
      />

      {/* Detailed Analysis (if requested) */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(analysis.indicators).map(([key, indicator]) => (
              <div key={key} className="border rounded p-4">
                <h4 className="font-medium mb-2 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-medium">{indicator.score}/100</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {indicator.description}
                  </p>
                  {indicator.evidence.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Evidence:</h5>
                      <ul className="text-sm space-y-1">
                        {indicator.evidence.map((evidence, index) => (
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
            ))}
          </CardContent>
        </Card>
      )}

      {/* Civic Action Toolbox */}
      <div id="civic-toolbox">
        <CivicActionToolbox
          billId={billId}
          actions={civicActions}
          rightsCards={rightsCards}
          onActionSelect={handleActionSelect}
          onRightsCardOpen={handleRightsCardOpen}
        />
      </div>

      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This analysis is for informational purposes only and should not be considered 
          legal advice. All flagged patterns require human verification and may have 
          legitimate explanations. Sources and methodology are available for review.
        </AlertDescription>
      </Alert>
    </div>
  );
};