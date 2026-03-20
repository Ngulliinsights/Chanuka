/**
 * Constitutional Analysis Display Component
 * 
 * Displays constitutional analysis results with visualizations
 */

import React from 'react';
import { AlertTriangle, CheckCircle, FileText, Scale, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import type { ConstitutionalAnalysis } from '../hooks/use-constitutional-analysis';

interface ConstitutionalAnalysisDisplayProps {
  analysis: ConstitutionalAnalysis;
}

export function ConstitutionalAnalysisDisplay({ analysis }: ConstitutionalAnalysisDisplayProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlignmentStatus = (score: number) => {
    if (score >= 0.9) return { label: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (score >= 0.7) return { label: 'Good', color: 'text-blue-600', icon: TrendingUp };
    if (score >= 0.5) return { label: 'Fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { label: 'Concerns', color: 'text-red-600', icon: AlertTriangle };
  };

  const alignmentStatus = getAlignmentStatus(analysis.alignmentScore);
  const StatusIcon = alignmentStatus.icon;

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Constitutional Alignment
          </CardTitle>
          <CardDescription>
            Overall assessment of constitutional compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-6 w-6 ${alignmentStatus.color}`} />
              <span className={`text-2xl font-bold ${alignmentStatus.color}`}>
                {alignmentStatus.label}
              </span>
            </div>
            <span className="text-3xl font-bold text-gray-900">
              {(analysis.alignmentScore * 100).toFixed(0)}%
            </span>
          </div>
          <Progress value={analysis.alignmentScore * 100} className="h-3" />
          <p className="text-sm text-gray-600">
            Analyzed {new Date(analysis.analyzedAt).toLocaleDateString()} • 
            Processing time: {(analysis.processingTime / 1000).toFixed(2)}s
          </p>
        </CardContent>
      </Card>

      {/* Violations */}
      {analysis.violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Constitutional Concerns ({analysis.violations.length})
            </CardTitle>
            <CardDescription>
              Potential issues identified in the analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.violations.map((violation, index) => (
              <Alert key={index} className={getSeverityColor(violation.severity)}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {violation.severity.toUpperCase()}
                        </Badge>
                        <span className="font-semibold">{violation.violationType}</span>
                      </div>
                      <AlertDescription className="text-sm">
                        {violation.description}
                      </AlertDescription>
                    </div>
                  </div>
                  
                  {violation.affectedArticles.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Affected Articles:</span>{' '}
                      {violation.affectedArticles.join(', ')}
                    </div>
                  )}
                  
                  {violation.recommendation && (
                    <div className="text-xs bg-white/50 p-2 rounded">
                      <span className="font-medium">Recommendation:</span>{' '}
                      {violation.recommendation}
                    </div>
                  )}
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Suggested improvements and considerations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Precedents */}
      {analysis.precedents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              Relevant Precedents
            </CardTitle>
            <CardDescription>
              Legal precedents related to this bill
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.precedents.map((precedent, index) => (
              <div key={index} className="border-l-4 border-purple-200 pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">{precedent.caseName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {(precedent.relevance * 100).toFixed(0)}% relevant
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{precedent.summary}</p>
                <p className="text-xs text-gray-500 mt-1">Case ID: {precedent.caseId}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
