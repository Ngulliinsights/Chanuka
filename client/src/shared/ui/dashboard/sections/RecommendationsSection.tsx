/**
 * Recommendations Section Component
 * * Displays ML-powered bill recommendations with relevance scoring and reasoning.
 */

import {
import React from 'react';

  X,
  ExternalLink,
  Target,
  TrendingUp,
  Users,
  Star,
  RefreshCw,
  Info,
  CheckCircle,
  Sparkles,
  Zap,
  Settings as Cpu // Using Settings as Cpu replacement
} from 'lucide-react';

import { Badge } from '@/shared/design-system/feedback/Badge';
import { Progress } from '@/shared/design-system/feedback/Progress';
import { Button } from '@/shared/design-system/interactive/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';
import { BillRecommendation } from '@/shared/types/user-dashboard';

import styles from './DashboardSections.module.css';

interface RecommendationsSectionProps {
  recommendations: BillRecommendation[];
  loading?: boolean;
  compact?: boolean;
}

export function RecommendationsSection({
  recommendations,
  loading = false,
  compact = false
}: RecommendationsSectionProps) {
  // Mock store functions since userDashboardSlice doesn't exist yet
  const acceptRecommendation = (id: string) => {
    console.log('Accept recommendation:', id);
  };

  const dismissRecommendation = (id: string) => {
    console.log('Dismiss recommendation:', id);
  };

  const refreshRecommendations = () => {
    console.log('Refresh recommendations');
  };

  const getReasonIcon = (type: BillRecommendation['reasons'][0]['type']) => {
    switch (type) {
      case 'interest_match':
        return <Target className="h-3 w-3" />;
      case 'activity_pattern':
        return <TrendingUp className="h-3 w-3" />;
      case 'expert_recommendation':
        return <Star className="h-3 w-3" />;
      case 'trending':
        return <Users className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  // Removed unused getReasonColor function to satisfy linter
  // CSS modules are handling the colors via getReasonClass

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.8) return styles.confidenceHigh;
    if (confidence >= 0.6) return styles.confidenceMedium;
    return styles.confidenceLow;
  };

  const getReasonClass = (type: string) => {
    switch (type) {
      case 'interest_match': return styles.reasonInterestMatch;
      case 'activity_pattern': return styles.reasonActivityPattern;
      case 'expert_recommendation': return styles.reasonExpertRecommendation;
      case 'trending': return styles.reasonTrending;
      default: return styles.reasonInterestMatch;
    }
  };

  // Removed unused getConfidenceColor function to satisfy linter
  // CSS modules are handling the colors via getConfidenceClass

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  // Fixed type mismatch: id should be string to match recommendation.bill.id
  const handleAcceptRecommendation = (billId: string | number) => {
    acceptRecommendation(String(billId));
  };

  const handleDismissRecommendation = (billId: string | number) => {
    dismissRecommendation(String(billId));
  };

  const handleRefreshRecommendations = () => {
    refreshRecommendations();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No recommendations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Engage with more bills to get personalized recommendations.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshRecommendations}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recommendations
            <Badge variant="secondary">{recommendations.length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshRecommendations}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {!compact && (
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.bill.id}
              className="chanuka-card p-4 hover:shadow-md transition-shadow"
            >
              {/* Bill Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">
                      {recommendation.bill.billNumber}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getConfidenceClass(recommendation.confidence)}
                    >
                      {Math.round(recommendation.confidence * 100)}% match
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm mb-2 line-clamp-2">
                    {recommendation.bill.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {recommendation.bill.summary}
                  </p>
                </div>
              </div>

              {/* Policy Areas */}
              <div className="flex flex-wrap gap-1 mb-3">
                {recommendation.bill.policyAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>

              {/* Relevance Score */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">Relevance Score</span>
                  <span className="font-mono">
                    {Math.round(recommendation.relevanceScore * 100)}%
                  </span>
                </div>
                <Progress
                  value={recommendation.relevanceScore * 100}
                  className="h-2"
                />
              </div>

              {/* Recommendation Reasons */}
              <div className="mb-4">
                <h5 className="text-xs font-medium mb-2">Why we recommend this:</h5>
                <div className="space-y-2">
                  {recommendation.reasons.slice(0, compact ? 2 : 4).map((reason, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className={`${styles.iconContainer} ${getReasonClass(reason.type)}`}>
                        {getReasonIcon(reason.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs">{reason.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs text-muted-foreground">
                            Weight: {Math.round(reason.weight * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Indicator */}
              <div className="mb-4 p-2 bg-muted/30 rounded">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    AI Confidence
                  </span>
                  <span className={`font-medium ${getConfidenceClass(recommendation.confidence)}`}>
                    {getConfidenceLabel(recommendation.confidence)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAcceptRecommendation(recommendation.bill.id)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Track Bill
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismissRecommendation(recommendation.bill.id)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* ML Explanation */}
        {!compact && (
          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
              <Sparkles className="h-4 w-4 mt-0.5 text-civic-expert" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">How recommendations work:</p>
                <p>
                  Our AI analyzes your engagement patterns, interests, and similar users&apos;
                  behavior to suggest relevant legislation. Confidence scores reflect
                  the algorithm&apos;s certainty in the match.
                </p>
              </div>
            </div>
          </div>
        )}

        {compact && recommendations.length > 3 && (
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View All {recommendations.length} Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
