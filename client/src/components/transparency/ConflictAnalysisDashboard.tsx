import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Network, 
  DollarSign,
  Users,
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';
import { logger } from '../../utils/browser-logger';

interface ConflictData {
  conflicts: ConflictDetectionResult[];
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    totalFinancialImpact: number;
  };
}

interface ConflictDetectionResult {
  conflictId: string;
  sponsor_id: number;
  conflictType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedBills: number[];
  financialImpact: number;
  detectedAt: string;
  confidence: number;
}

interface DashboardData {
  overview: {
    totalConflicts: number;
    totalSponsors: number;
    totalFinancialImpact: number;
    averageRiskScore: number;
  };
  severityDistribution: Record<string, number>;
  conflictTypeDistribution: Record<string, number>;
  topRiskSponsors: Array<{
    sponsor_id: number;
    risk_score: number;
    conflictCount: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  networkMetrics: {
    totalNodes: number;
    totalEdges: number;
    density: number;
    clustering: number;
  };
  recentTrends: {
    increasingRisk: number;
    decreasingRisk: number;
    stableRisk: number;
  };
  predictions: Array<{ bill_id: number;
    billTitle: string;
    predictedConflictType: string;
    probability: number;
    riskFactors: string[];
   }>;
}

const ConflictAnalysisDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [dashboardResponse, conflictsResponse] = await Promise.all([
        fetch('/api/sponsor-conflict-analysis/dashboard'),
        fetch('/api/sponsor-conflict-analysis/detect')
      ]);

      if (!dashboardResponse.ok || !conflictsResponse.ok) {
        throw new Error('Failed to fetch conflict analysis data');
      }

      const dashboardResult = await dashboardResponse.json();
      const conflictsResult = await conflictsResponse.json();

      setDashboardData(dashboardResult.data);
      setConflictData(conflictsResult.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getConflictTypeLabel = (type: string) => {
    const labels = {
      financial_direct: 'Direct Financial',
      financial_indirect: 'Indirect Financial',
      organizational: 'Organizational',
      family_business: 'Family/Business',
      voting_pattern: 'Voting Pattern',
      timing_suspicious: 'Suspicious Timing',
      disclosure_incomplete: 'Incomplete Disclosure'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading conflict analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading conflict analysis: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={fetchDashboardData}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData || !conflictData) {
    return <div>No data available</div>;
  }

  const filteredConflicts = selectedSeverity === 'all' 
    ? conflictData.conflicts 
    : conflictData.conflicts.filter(c => c.severity === selectedSeverity);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sponsor Conflict Analysis</h1>
          <p className="text-gray-600 mt-1">
            Advanced conflict detection and transparency monitoring
          </p>
        </div>
        <Button 
          onClick={fetchDashboardData} 
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalConflicts}</div>
            <p className="text-xs text-gray-600">
              Across {dashboardData.overview.totalSponsors} sponsors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.overview.totalFinancialImpact)}
            </div>
            <p className="text-xs text-gray-600">
              Potential conflict value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Density</CardTitle>
            <Network className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(dashboardData.networkMetrics.density * 100)}%
            </div>
            <p className="text-xs text-gray-600">
              {dashboardData.networkMetrics.totalNodes} nodes, {dashboardData.networkMetrics.totalEdges} connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(dashboardData.overview.averageRiskScore)}
            </div>
            <p className="text-xs text-gray-600">
              Out of 100 points
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conflicts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conflicts">Detected Conflicts</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="network">Network Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts" className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm font-medium">Filter by severity:</span>
            <div className="flex space-x-2">
              {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
                <Button
                  key={severity}
                  variant={selectedSeverity === severity ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSeverity(severity)}
                >
                  {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
                  {severity !== 'all' && (
                    <Badge variant="secondary" className="ml-1">
                      {dashboardData.severityDistribution[severity] || 0}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredConflicts.map((conflict) => (
              <Card key={conflict.conflictId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Sponsor ID: {conflict.sponsor_id}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(conflict.severity)}>
                        {conflict.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {getConflictTypeLabel(conflict.conflictType)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Confidence: {Math.round(conflict.confidence * 100)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">
                    {conflict.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Financial Impact: {formatCurrency(conflict.financialImpact)}
                    </span>
                    <span>
                      Affects {conflict.affectedBills.length} bill(s)
                    </span>
                    <span>
                      Detected: {new Date(conflict.detectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Trend Distribution</CardTitle>
                <CardDescription>
                  How sponsor risk levels are changing over time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <span>Increasing Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{dashboardData.recentTrends.increasingRisk}</span>
                    <span className="text-sm text-gray-600">sponsors</span>
                  </div>
                </div>
                <Progress 
                  value={(dashboardData.recentTrends.increasingRisk / dashboardData.overview.totalSponsors) * 100} 
                  className="h-2"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span>Decreasing Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{dashboardData.recentTrends.decreasingRisk}</span>
                    <span className="text-sm text-gray-600">sponsors</span>
                  </div>
                </div>
                <Progress 
                  value={(dashboardData.recentTrends.decreasingRisk / dashboardData.overview.totalSponsors) * 100} 
                  className="h-2"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Minus className="h-4 w-4 text-gray-500" />
                    <span>Stable Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{dashboardData.recentTrends.stableRisk}</span>
                    <span className="text-sm text-gray-600">sponsors</span>
                  </div>
                </div>
                <Progress 
                  value={(dashboardData.recentTrends.stableRisk / dashboardData.overview.totalSponsors) * 100} 
                  className="h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Risk Sponsors</CardTitle>
                <CardDescription>
                  Sponsors with highest conflict risk scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.topRiskSponsors.slice(0, 5).map((sponsor, index) => (
                    <div key={sponsor.sponsor_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">Sponsor {sponsor.sponsor_id}</div>
                          <div className="text-sm text-gray-600">
                            {sponsor.conflictCount} conflicts
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(sponsor.trend)}
                        <span className="font-semibold">{sponsor.risk_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conflict Predictions</CardTitle>
              <CardDescription>
                AI-powered predictions of potential future conflicts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                { dashboardData.predictions.map((prediction, index) => (
                  <div key={prediction.bill_id } className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{prediction.billTitle}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {getConflictTypeLabel(prediction.predictedConflictType)}
                        </Badge>
                        <Badge 
                          className={
                            prediction.probability > 0.7 ? 'bg-red-100 text-red-800' :
                            prediction.probability > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }
                        >
                          {Math.round(prediction.probability * 100)}% probability
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Bill ID: { prediction.bill_id }
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Risk Factors:</span>
                      <ul className="list-disc list-inside mt-1 text-gray-700">
                        {prediction.riskFactors.map((factor, idx) => (
                          <li key={idx}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Metrics</CardTitle>
                <CardDescription>
                  Analysis of conflict relationship networks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Entities</span>
                  <span className="font-semibold">{dashboardData.networkMetrics.totalNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Connections</span>
                  <span className="font-semibold">{dashboardData.networkMetrics.totalEdges}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Density</span>
                  <span className="font-semibold">
                    {Math.round(dashboardData.networkMetrics.density * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clustering Coefficient</span>
                  <span className="font-semibold">
                    {Math.round(dashboardData.networkMetrics.clustering * 100)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conflict Type Distribution</CardTitle>
                <CardDescription>
                  Breakdown of detected conflict types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboardData.conflictTypeDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{getConflictTypeLabel(type)}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(count / Math.max(...Object.values(dashboardData.conflictTypeDistribution))) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConflictAnalysisDashboard;

