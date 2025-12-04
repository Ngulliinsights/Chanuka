import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  BookOpen,
  Clock
} from 'lucide-react';
import React, { useState } from 'react';

import { Expert } from '@client/types/expert';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ExpertBadge } from '../verification/ExpertBadge';


interface ExpertAnalysisData {
  id: string;
  expert: Expert;
  analysis: string;
  confidence: number;
  methodology: string;
  sources: string[];
  lastUpdated: string;
  communityValidation: {
    upvotes: number;
    downvotes: number;
    comments: number;
    userVote?: 'up' | 'down' | null;
  };
  tags: string[];
}

interface ExpertAnalysisCardProps {
  analysis: ExpertAnalysisData;
  showCommunityValidation?: boolean;
  compact?: boolean;
}

/**
 * ExpertAnalysisCard - Expert constitutional analysis with credentials and community validation
 * Features: Expert verification badges, community validation, methodology transparency
 */
export function ExpertAnalysisCard({ 
  analysis, 
  showCommunityValidation = true, 
  compact = false 
}: ExpertAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showMethodology, setShowMethodology] = useState(false);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'hsl(var(--civic-expert))';
    if (confidence >= 0.6) return 'hsl(var(--status-moderate))';
    return 'hsl(var(--status-high))';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Moderate';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="chanuka-card">
      <CardHeader className="chanuka-card-header">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Expert Badge */}
            <ExpertBadge 
              expert={analysis.expert}
              showCredibilityScore={true}
              size="md"
            />
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{analysis.expert.name}</CardTitle>
                <Badge 
                  className="chanuka-status-badge"
                  style={{ 
                    backgroundColor: getConfidenceColor(analysis.confidence),
                    color: 'white'
                  }}
                >
                  {getConfidenceLabel(analysis.confidence)} Confidence
                </Badge>
              </div>
              
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(analysis.lastUpdated)}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {Math.round(analysis.confidence * 100)}% confidence
                </span>
              </CardDescription>
            </div>
          </div>
          
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="chanuka-card-content space-y-4">
          {/* Expert Analysis */}
          <div className="space-y-3">
            <h4 className="font-semibold">Constitutional Analysis</h4>
            <div className="p-4 rounded-lg bg-muted/50 border-l-4" 
                 style={{ borderLeftColor: 'hsl(var(--civic-constitutional))' }}>
              <p className="text-sm leading-relaxed">
                {analysis.analysis}
              </p>
            </div>
          </div>

          {/* Methodology Section */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMethodology(!showMethodology)}
              className="p-0 h-auto font-semibold text-left justify-start"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Methodology & Sources
              {showMethodology ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>
            
            {showMethodology && (
              <div className="space-y-3 pl-6">
                <div>
                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Analytical Methodology
                  </h6>
                  <p className="text-sm text-muted-foreground">
                    {analysis.methodology}
                  </p>
                </div>
                
                <div>
                  <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Sources & References
                  </h6>
                  <ul className="space-y-1">
                    {analysis.sources.map((source, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span>{source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {analysis.tags.length > 0 && (
            <div className="space-y-2">
              <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Analysis Tags
              </h6>
              <div className="flex flex-wrap gap-1">
                {analysis.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Community Validation */}
          {showCommunityValidation && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <h6 className="text-sm font-medium">Community Validation</h6>
                <div className="flex items-center gap-4">
                  <Button
                    variant={analysis.communityValidation.userVote === 'up' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span className="text-xs">{analysis.communityValidation.upvotes}</span>
                  </Button>
                  
                  <Button
                    variant={analysis.communityValidation.userVote === 'down' ? 'destructive' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    <span className="text-xs">{analysis.communityValidation.downvotes}</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span className="text-xs">{analysis.communityValidation.comments}</span>
                  </Button>
                </div>
              </div>
              
              {/* Validation Score */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Community Agreement</span>
                  <span>
                    {Math.round(
                      (analysis.communityValidation.upvotes / 
                       (analysis.communityValidation.upvotes + analysis.communityValidation.downvotes)) * 100
                    )}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(analysis.communityValidation.upvotes / 
                               (analysis.communityValidation.upvotes + analysis.communityValidation.downvotes)) * 100}%`,
                      backgroundColor: 'hsl(var(--civic-expert))'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}