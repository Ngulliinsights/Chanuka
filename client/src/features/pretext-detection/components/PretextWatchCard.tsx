import { AlertTriangle, Clock, Users, FileText, ExternalLink } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { PretextScore } from '../types';

interface PretextWatchCardProps {
  score: PretextScore;
  onViewDetails: () => void;
  onTakeAction: () => void;
  onReportIssue: () => void;
}

export const PretextWatchCard: React.FC<PretextWatchCardProps> = ({
  score,
  onViewDetails,
  onTakeAction,
  onReportIssue
}) => {
  const getRiskLevel = (scoreValue: number) => {
    if (scoreValue >= 70) return { level: 'High', color: 'destructive' };
    if (scoreValue >= 40) return { level: 'Medium', color: 'warning' };
    return { level: 'Low', color: 'secondary' };
  };

  const risk = getRiskLevel(score.score);

  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Clock className="h-4 w-4" />;
      case 'beneficiaryMismatch': return <Users className="h-4 w-4" />;
      case 'scopeCreep': return <FileText className="h-4 w-4" />;
      case 'networkCentrality': return <Users className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Pretext Watch
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={risk.color as any}>
              {risk.level} Risk
            </Badge>
            <span className="text-2xl font-bold">{score.score}/100</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Confidence Indicator */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Confidence: {Math.round(score.confidence * 100)}%</span>
          <span>Status: {score.reviewStatus}</span>
        </div>

        {/* Key Indicators */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(score.indicators).map(([key, indicator]) => (
            <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
              {getIndicatorIcon(key)}
              <div className="flex-1">
                <div className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Score: {indicator.score}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rationale */}
        {score.rationale.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Why flagged:</h4>
            <ul className="text-sm space-y-1">
              {score.rationale.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        {score.sources.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Sources ({score.sources.length}):</h4>
            <div className="flex flex-wrap gap-2">
              {score.sources.slice(0, 3).map((source, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => window.open(source.url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {source.type}
                </Button>
              ))}
              {score.sources.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onViewDetails}
                >
                  +{score.sources.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={onViewDetails} variant="outline" className="flex-1">
            View Details
          </Button>
          <Button onClick={onTakeAction} className="flex-1">
            Take Action
          </Button>
          <Button onClick={onReportIssue} variant="ghost" size="sm">
            Report Issue
          </Button>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {score.lastUpdated.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};