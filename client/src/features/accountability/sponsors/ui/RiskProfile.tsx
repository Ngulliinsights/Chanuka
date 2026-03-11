/**
 * RiskProfile Component
 * Displays detailed risk assessment for a sponsor
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system/interactive';
import { Badge } from '@client/lib/design-system/feedback';
import { Progress } from '@client/lib/design-system/feedback';
import { Alert, AlertDescription } from '@client/lib/design-system/feedback';
import { LoadingSpinner } from '@client/lib/design-system/feedback';
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Building, 
  Eye, 
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { useSponsorRiskProfile } from '../hooks';
import type { RiskProfile as RiskProfileType, ConflictSeverity } from '../types';

// ============================================================================
// Types
// ============================================================================

interface RiskProfileProps {
  sponsorId: string | number;
  sponsorName?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getSeverityColor = (severity: ConflictSeverity): string => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRiskColor = (score: number): string => {
  if (score >= 75) return 'text-red-600';
  if (score >= 55) return 'text-orange-600';
  if (score >= 35) return 'text-yellow-600';
  return 'text-green-600';
};

const getRiskBarColor = (score: number): string => {
  if (score >= 75) return 'bg-red-500';
  if (score >= 55) return 'bg-orange-500';
  if (score >= 35) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getRiskIcon = (score: number) => {
  if (score >= 75) return <XCircle className="h-5 w-5 text-red-500" />;
  if (score >= 55) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
  if (score >= 35) return <TrendingUp className="h-5 w-5 text-yellow-500" />;
  return <CheckCircle className="h-5 w-5 text-green-500" />;
};

const getRiskDescription = (score: number): string => {
  if (score >= 75) return 'Critical risk level requiring immediate attention';
  if (score >= 55) return 'High risk level requiring monitoring and action';
  if (score >= 35) return 'Medium risk level requiring periodic review';
  return 'Low risk level with minimal concerns';
};

const getRiskCategoryIcon = (category: string) => {
  switch (category) {
    case 'financialRisk': return <DollarSign className="h-4 w-4" />;
    case 'affiliationRisk': return <Building className="h-4 w-4" />;
    case 'transparencyRisk': return <Eye className="h-4 w-4" />;
    case 'behavioralRisk': return <Users className="h-4 w-4" />;
    default: return <Shield className="h-4 w-4" />;
  }
};

const getRiskCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    financialRisk: 'Financial Risk',
    affiliationRisk: 'Affiliation Risk',
    transparencyRisk: 'Transparency Risk',
    behavioralRisk: 'Behavioral Risk'
  };
  return labels[category] || category;
};

const getRiskCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    financialRisk: 'Risk from financial interests and monetary conflicts',
    affiliationRisk: 'Risk from organizational affiliations and relationships',
    transparencyRisk: 'Risk from incomplete or missing disclosure records',
    behavioralRisk: 'Risk from voting patterns and behavioral indicators'
  };
  return descriptions[category] || '';
};

// ============================================================================
// Sub-Components
// ============================================================================

function RiskScoreCard({ 
  riskProfile 
}: { 
  riskProfile: RiskProfileType 
}) {
  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Shield className="h-5 w-5" />
          Overall Risk Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          {getRiskIcon(riskProfile.overallScore)}
          <div className={`text-4xl font-bold ml-2 ${getRiskColor(riskProfile.overallScore)}`}>
            {riskProfile.overallScore}
          </div>
        </div>
        
        <Badge className={getSeverityColor(riskProfile.level)}>
          {riskProfile.level.toUpperCase()} RISK
        </Badge>
        
        <p className="text-sm text-gray-600">
          {getRiskDescription(riskProfile.overallScore)}
        </p>
      </CardContent>
    </Card>
  );
}

function RiskBreakdownCard({ 
  breakdown 
}: { 
  breakdown: RiskProfileType['breakdown'] 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(breakdown).map(([category, score]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRiskCategoryIcon(category)}
                <span className="font-medium">{getRiskCategoryLabel(category)}</span>
              </div>
              <span className={`font-bold ${getRiskColor(score)}`}>
                {score}%
              </span>
            </div>
            
            <Progress 
              value={score} 
              className="h-2"
              // Note: You may need to customize the Progress component to accept color props
            />
            
            <p className="text-xs text-gray-600">
              {getRiskCategoryDescription(category)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationsCard({ 
  recommendations 
}: { 
  recommendations: string[] 
}) {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No specific recommendations at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RiskProfile({ 
  sponsorId, 
  sponsorName 
}: RiskProfileProps) {
  const { data: riskProfile, isLoading, error } = useSponsorRiskProfile(sponsorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading risk profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load risk profile. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!riskProfile) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Risk profile data is not available for this sponsor.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Risk Profile {sponsorName && `- ${sponsorName}`}
        </h2>
        <p className="text-gray-600">
          Comprehensive risk assessment based on financial, organizational, and behavioral factors
        </p>
      </div>

      {/* Risk Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskScoreCard riskProfile={riskProfile} />
        <div className="lg:col-span-2">
          <RiskBreakdownCard breakdown={riskProfile.breakdown} />
        </div>
      </div>

      {/* Recommendations */}
      <RecommendationsCard recommendations={riskProfile.recommendations} />

      {/* Risk Level Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Level Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { level: 'low', range: '0-34', color: 'text-green-600', description: 'Minimal risk, routine monitoring' },
              { level: 'medium', range: '35-54', color: 'text-yellow-600', description: 'Moderate risk, periodic review' },
              { level: 'high', range: '55-74', color: 'text-orange-600', description: 'High risk, active monitoring' },
              { level: 'critical', range: '75-100', color: 'text-red-600', description: 'Critical risk, immediate action' }
            ].map((item) => (
              <div key={item.level} className="text-center p-3 border rounded-lg">
                <div className={`text-lg font-bold ${item.color} capitalize`}>
                  {item.level}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {item.range}
                </div>
                <div className="text-xs text-gray-500">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RiskProfile;