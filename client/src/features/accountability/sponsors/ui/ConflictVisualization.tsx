/**
 * ConflictVisualization Component
 * Displays conflict analysis results with network visualization
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { LoadingSpinner } from '@client/lib/design-system';
import { 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Network, 
  BarChart3, 
  Clock,
  DollarSign,
  Building,
  Users,
  Eye
} from 'lucide-react';

import { useSponsorConflicts, useSponsorRiskProfile, useConflictMapping } from '../hooks';
import type { 
  ConflictDetectionResult, 
  ConflictSeverity, 
  ConflictType, 
  RiskProfile 
} from '../types';

// ============================================================================
// Types
// ============================================================================

interface ConflictVisualizationProps {
  sponsorId: string | number;
  sponsorName?: string;
  billId?: string | number;
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

const getSeverityIcon = (severity: ConflictSeverity) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <TrendingUp className="h-4 w-4" />;
    case 'low':
      return <Shield className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

const getConflictTypeIcon = (type: ConflictType) => {
  switch (type) {
    case 'financial_direct':
    case 'financial_indirect':
      return <DollarSign className="h-4 w-4" />;
    case 'organizational':
      return <Building className="h-4 w-4" />;
    case 'family_business':
      return <Users className="h-4 w-4" />;
    case 'timing_suspicious':
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getConflictTypeLabel = (type: ConflictType): string => {
  const labels: Record<ConflictType, string> = {
    financial_direct: 'Direct Financial',
    financial_indirect: 'Indirect Financial',
    organizational: 'Organizational',
    family_business: 'Family Business',
    voting_pattern: 'Voting Pattern',
    timing_suspicious: 'Suspicious Timing',
    disclosure_incomplete: 'Incomplete Disclosure'
  };
  return labels[type] || type;
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) return `KSh ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `KSh ${(amount / 1000).toFixed(0)}K`;
  return `KSh ${amount.toLocaleString()}`;
};

const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

// ============================================================================
// Sub-Components
// ============================================================================

function ConflictCard({ conflict }: { conflict: ConflictDetectionResult }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getConflictTypeIcon(conflict.conflictType)}
            <CardTitle className="text-lg">
              {getConflictTypeLabel(conflict.conflictType)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getSeverityColor(conflict.severity)}>
              {getSeverityIcon(conflict.severity)}
              <span className="ml-1">{conflict.severity.toUpperCase()}</span>
            </Badge>
            <Badge variant="outline">
              {formatConfidence(conflict.confidence)} confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <p className="text-gray-700">{conflict.description}</p>

          {conflict.financialImpact > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-gray-600">Financial Impact:</span>
              <span className="font-medium">{formatCurrency(conflict.financialImpact)}</span>
            </div>
          )}

          {conflict.affectedBills.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Affected Bills:</span>
              <span className="font-medium">{conflict.affectedBills.length}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Detected: {new Date(conflict.detectedAt).toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {showDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium text-sm mb-2">Evidence:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {conflict.evidence.map((evidence, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskProfileCard({ riskProfile }: { riskProfile: RiskProfile }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getRiskColor(riskProfile.overallScore)}`}>
            {riskProfile.overallScore}
          </div>
          <div className="text-sm text-gray-600">Overall Risk Score</div>
          <Badge className={getSeverityColor(riskProfile.level)}>
            {riskProfile.level.toUpperCase()} RISK
          </Badge>
        </div>

        {/* Risk Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium">Risk Breakdown</h4>
          
          {Object.entries(riskProfile.breakdown).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={getRiskColor(value)}>{value}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getRiskBarColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {riskProfile.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Recommendations</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {riskProfile.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConflictVisualization({ 
  sponsorId, 
  sponsorName,
  billId 
}: ConflictVisualizationProps) {
  const { data: conflicts, isLoading: conflictsLoading, error: conflictsError } = useSponsorConflicts(sponsorId);
  const { data: riskProfile, isLoading: riskLoading, error: riskError } = useSponsorRiskProfile(sponsorId);
  const { data: conflictMapping, isLoading: mappingLoading } = useConflictMapping(billId);

  const isLoading = conflictsLoading || riskLoading || mappingLoading;
  const hasError = conflictsError || riskError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading conflict analysis...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load conflict analysis. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const conflictCount = conflicts?.length || 0;
  const severityCounts: Record<ConflictSeverity, number> = conflicts?.reduce((acc, conflict) => {
    acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
    return acc;
  }, {} as Record<ConflictSeverity, number>) || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Conflict Analysis {sponsorName && `- ${sponsorName}`}
        </h2>
        <p className="text-gray-600">
          {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} detected
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as ConflictSeverity[]).map((severity) => (
          <Card key={severity}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 capitalize">{severity} Risk</p>
                  <p className="text-2xl font-bold">{severityCounts[severity] || 0}</p>
                </div>
                <div className={`p-2 rounded-full ${getSeverityColor(severity)}`}>
                  {getSeverityIcon(severity)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="conflicts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflicts ({conflictCount})
          </TabsTrigger>
          <TabsTrigger value="risk-profile">
            <Shield className="h-4 w-4 mr-2" />
            Risk Profile
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="h-4 w-4 mr-2" />
            Network View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts" className="space-y-4">
          {conflicts && conflicts.length > 0 ? (
            conflicts.map((conflict) => (
              <ConflictCard key={conflict.conflictId} conflict={conflict} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Conflicts Detected</h3>
                <p className="text-gray-600">
                  This sponsor currently has no detected conflicts of interest.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="risk-profile">
          {riskProfile ? (
            <RiskProfileCard riskProfile={riskProfile} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">Risk profile data not available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Conflict Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conflictMapping ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Nodes:</span>
                      <span className="ml-2 font-medium">{conflictMapping.metrics.totalNodes}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Connections:</span>
                      <span className="ml-2 font-medium">{conflictMapping.metrics.totalEdges}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Density:</span>
                      <span className="ml-2 font-medium">{(conflictMapping.metrics.density * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Clusters:</span>
                      <span className="ml-2 font-medium">{conflictMapping.clusters.length}</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <Network className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Network visualization would be rendered here using a graph library like D3.js or vis.js
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Network data not available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ConflictVisualization;