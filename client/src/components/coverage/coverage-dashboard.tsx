import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface CoverageReport {
  lines: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
  uncoveredFiles: string[];
  uncoveredFunctions: string[];
  uncoveredLines: { file: string; lines: number[] }[];
}

interface CoverageGap {
  type: 'function' | 'branch' | 'statement' | 'integration';
  file: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestedTest: string;
}

interface ComprehensiveCoverageReport {
  timestamp: Date;
  serverCoverage: CoverageReport;
  clientCoverage: CoverageReport;
  integrationCoverage: CoverageReport;
  overallCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  gaps: CoverageGap[];
  recommendations: string[];
}

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  covered: '#10b981',
  uncovered: '#ef4444'
};

export const CoverageDashboard: React.FC = () => {
  const [coverageData, setCoverageData] = useState<ComprehensiveCoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCoverageData();
  }, []);

  const fetchCoverageData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/coverage/comprehensive-report');
      if (!response.ok) {
        throw new Error('Failed to fetch coverage data');
      }
      const data = await response.json();
      setCoverageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (percentage: number): string => {
    if (percentage >= 80) return COLORS.covered;
    if (percentage >= 60) return COLORS.medium;
    return COLORS.uncovered;
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const renderCoverageMetrics = (coverage: CoverageReport, title: string) => {
    const metrics = [
      { name: 'Lines', ...coverage.lines },
      { name: 'Functions', ...coverage.functions },
      { name: 'Branches', ...coverage.branches },
      { name: 'Statements', ...coverage.statements }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title} Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {metric.covered}/{metric.total} ({metric.percentage}%)
                  </span>
                </div>
                <Progress 
                  value={metric.percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': getCoverageColor(metric.percentage)
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOverallCoverageChart = () => {
    if (!coverageData) return null;

    const chartData = [
      { name: 'Lines', percentage: coverageData.overallCoverage.lines },
      { name: 'Functions', percentage: coverageData.overallCoverage.functions },
      { name: 'Branches', percentage: coverageData.overallCoverage.branches },
      { name: 'Statements', percentage: coverageData.overallCoverage.statements }
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Overall Coverage Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Coverage']} />
              <Bar 
                dataKey="percentage" 
                fill={COLORS.covered}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderCoverageGapsChart = () => {
    if (!coverageData) return null;

    const gapsBySeverity = coverageData.gaps.reduce((acc, gap) => {
      acc[gap.severity] = (acc[gap.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(gapsBySeverity).map(([severity, count]) => ({
      name: severity,
      value: count,
      color: COLORS[severity as keyof typeof COLORS]
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Coverage Gaps by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderCoverageGapsList = () => {
    if (!coverageData) return null;

    const sortedGaps = [...coverageData.gaps].sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Coverage Gaps Details</CardTitle>
          <CardDescription>
            {coverageData.gaps.length} gaps identified across the codebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedGaps.slice(0, 20).map((gap, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={getSeverityBadgeVariant(gap.severity)}>
                    {gap.severity.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{gap.type}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{gap.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Location: {gap.location}
                  </p>
                  <p className="text-xs text-blue-600">
                    Suggestion: {gap.suggestedTest}
                  </p>
                </div>
              </div>
            ))}
            {sortedGaps.length > 20 && (
              <p className="text-sm text-muted-foreground text-center">
                ... and {sortedGaps.length - 20} more gaps
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecommendations = () => {
    if (!coverageData || !coverageData.recommendations.length) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {coverageData.recommendations.map((recommendation, index) => (
              <Alert key={index}>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Improvement Opportunity</AlertTitle>
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!coverageData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No coverage data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Coverage Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date(coverageData.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={fetchCoverageData}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverageData.overallCoverage.lines}%</div>
            <Progress value={coverageData.overallCoverage.lines} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Functions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverageData.overallCoverage.functions}%</div>
            <Progress value={coverageData.overallCoverage.functions} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coverageData.overallCoverage.branches}%</div>
            <Progress value={coverageData.overallCoverage.branches} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {coverageData.gaps.filter(gap => gap.severity === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="server">Server Coverage</TabsTrigger>
          <TabsTrigger value="client">Client Coverage</TabsTrigger>
          <TabsTrigger value="gaps">Coverage Gaps</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderOverallCoverageChart()}
            {renderCoverageGapsChart()}
          </div>
        </TabsContent>

        <TabsContent value="server" className="space-y-4">
          {renderCoverageMetrics(coverageData.serverCoverage, 'Server')}
        </TabsContent>

        <TabsContent value="client" className="space-y-4">
          {renderCoverageMetrics(coverageData.clientCoverage, 'Client')}
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          {renderCoverageGapsList()}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {renderRecommendations()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoverageDashboard;

