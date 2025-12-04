import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  Users,
  ExternalLink
} from 'lucide-react';
import React, { useState } from 'react';

import { ConstitutionalFlag, SeverityLevel } from '@client/types/constitutional';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';


interface ConstitutionalFlagCardProps {
  flag: ConstitutionalFlag;
  expandable?: boolean;
  showExpertAnalysis?: boolean;
}

/**
 * ConstitutionalFlagCard - Detailed constitutional flag analysis
 * Features: Expandable sections, expert analysis, constitutional references
 */
export function ConstitutionalFlagCard({ 
  flag, 
  expandable = true, 
  showExpertAnalysis = true 
}: ConstitutionalFlagCardProps) {
  const [isExpanded, setIsExpanded] = useState(!expandable);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const getSeverityColor = (severity: SeverityLevel): string => {
    switch (severity) {
      case 'critical':
        return 'hsl(var(--status-critical))';
      case 'high':
        return 'hsl(var(--status-high))';
      case 'moderate':
        return 'hsl(var(--status-moderate))';
      case 'low':
        return 'hsl(var(--status-low))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      case 'moderate':
        return <Info className="h-5 w-5" />;
      case 'low':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <Card 
      className="chanuka-card"
      style={{ 
        borderLeft: `4px solid ${getSeverityColor(flag.severity)}`,
        borderColor: getSeverityColor(flag.severity) + '20'
      }}
    >
      <CardHeader 
        className={`chanuka-card-header ${expandable ? 'cursor-pointer' : ''}`}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ color: getSeverityColor(flag.severity) }}>
              {getSeverityIcon(flag.severity)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{flag.category}</CardTitle>
              <CardDescription className="mt-1">
                {flag.description}
              </CardDescription>
            </div>
            <Badge 
              className="chanuka-status-badge"
              style={{ 
                backgroundColor: getSeverityColor(flag.severity),
                color: 'white'
              }}
            >
              {flag.severity}
            </Badge>
          </div>
          {expandable && (
            <div className="ml-4">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="chanuka-card-content space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: getSeverityColor(flag.severity) + '10' }}>
            <h5 className="font-medium mb-2">Constitutional Analysis</h5>
            <p className="text-sm text-muted-foreground">
              This {flag.severity}-severity constitutional concern requires careful review to ensure 
              compliance with fundamental constitutional principles.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}