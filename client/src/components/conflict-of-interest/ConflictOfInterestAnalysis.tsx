/**
 * ConflictOfInterestAnalysis - Main component integrating all conflict analysis features
 * 
 * Combines network visualization, financial tracking, transparency scoring,
 * historical patterns, and implementation workarounds into a comprehensive analysis.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Network,
  DollarSign,
  Eye,
  TrendingUp,
  FileText,
  AlertTriangle,
  Download,
  Share2
} from 'lucide-react';

import { ConflictNetworkVisualization } from './ConflictNetworkVisualization';
import { FinancialExposureTracker } from './FinancialExposureTracker';
import { TransparencyScoring } from './TransparencyScoring';
import { HistoricalPatternAnalysis } from './HistoricalPatternAnalysis';
import { ImplementationWorkaroundsTracker } from './ImplementationWorkaroundsTracker';

import { ConflictAnalysis, NetworkNode, NetworkLink } from '@client/types/conflict-of-interest';
import { Bill } from '@/core/api/types';

interface ConflictOfInterestAnalysisProps {
  bill: Bill;
}

export function ConflictOfInterestAnalysis({ bill }: ConflictOfInterestAnalysisProps) {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<NetworkLink | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Generate comprehensive conflict analysis data
  const conflictAnalysis: ConflictAnalysis = useMemo(() => {
    // Mock comprehensive data - in real implementation, this would come from API
    return {
      sponsorId: bill.sponsors[0]?.id || 1,
      sponsorName: bill.sponsors[0]?.name || 'Rep. Jane Smith',
      financialInterests: [
        {
          id: 'fi-1',
          source: 'HealthCorp Industries',
          amount: 125000,
          industry: 'Healthcare',
          category: 'investment',
          date: '2023-08-15',
          description: 'Stock holdings in healthcare technology company',
          verified: true
        },
        {
          id: 'fi-2',
          source: 'Medical Device Manufacturers Association',
          amount: 25000,
          industry: 'Healthcare',
          category: 'donation',
          date: '2023-12-01',
          description: 'Campaign contribution from industry association',
          verified: true
        },
        {
          id: 'fi-3',
          source: 'PharmaTech Solutions',
          amount: 75000,
          industry: 'Pharmaceuticals',
          category: 'contract',
          date: '2023-06-20',
          description: 'Consulting agreement for regulatory affairs',
          verified: false
        },
        {
          id: 'fi-4',
          source: 'Insurance Innovation Fund',
          amount: 50000,
          industry: 'Insurance',
          category: 'investment',
          date: '2024-01-10',
          description: 'Investment in insurance technology startup',
          verified: true
        }
      ],
      organizationalConnections: [
        {
          id: 'oc-1',
          organizationName: 'Healthcare Innovation Council',
          organizationType: 'nonprofit',
          connectionType: 'board_member',
          strength: 0.8,
          startDate: '2022-01-15',
          description: 'Board member focusing on healthcare policy',
          verified: true
        },
        {
          id: 'oc-2',
          organizationName: 'MedTech Lobbying Group',
          organizationType: 'lobbyist',
          connectionType: 'consultant',
          strength: 0.6,
          startDate: '2023-03-01',
          endDate: '2023-12-31',
          description: 'Former consulting relationship',
          verified: true
        },
        {
          id: 'oc-3',
          organizationName: 'Regional Hospital Network',
          organizationType: 'corporation',
          connectionType: 'partner',
          strength: 0.4,
          startDate: '2023-09-01',
          description: 'Partnership on healthcare access initiatives',
          verified: true
        }
      ],
      votingPatterns: [
        {
          billId: 'hb-2023-045',
          billTitle: 'Healthcare Transparency Act',
          vote: 'yes',
          date: '2023-11-15',
          relatedIndustries: ['Healthcare', 'Insurance'],
          financialCorrelation: 0.65
        },
        {
          billId: 'hb-2023-067',
          billTitle: 'Medical Device Safety Standards',
          vote: 'no',
          date: '2023-12-08',
          relatedIndustries: ['Healthcare', 'Pharmaceuticals'],
          financialCorrelation: -0.45
        },
        {
          billId: 'hb-2024-012',
          billTitle: 'Insurance Market Reform',
          vote: 'abstain',
          date: '2024-02-20',
          relatedIndustries: ['Insurance'],
          financialCorrelation: 0.25
        },
        {
          billId: 'hb-2024-023',
          billTitle: 'Pharmaceutical Pricing Controls',
          vote: 'no',
          date: '2024-03-05',
          relatedIndustries: ['Pharmaceuticals'],
          financialCorrelation: 0.75
        }
      ],
      transparencyScore: {
        overall: 72,
        financialDisclosure: 85,
        votingHistory: 68,
        industryConnections: 63,
        methodology: 'Weighted average of disclosure completeness, voting consistency, and connection transparency',
        lastUpdated: '2024-03-15'
      },
      riskLevel: 'medium',
      summary: 'Moderate conflict risk with significant healthcare industry exposure and some concerning voting correlations'
    };
  }, [bill]);

  // Calculate overall risk assessment
  const riskAssessment = useMemo(() => {
    const totalFinancialExposure = conflictAnalysis.financialInterests.reduce((sum, interest) => sum + interest.amount, 0);
    const highCorrelationVotes = conflictAnalysis.votingPatterns.filter(vote => Math.abs(vote.financialCorrelation) > 0.5).length;
    const strongConnections = conflictAnalysis.organizationalConnections.filter(conn => conn.strength > 0.6).length;

    let riskScore = 0;
    
    // Financial exposure risk (0-40 points)
    if (totalFinancialExposure > 200000) riskScore += 40;
    else if (totalFinancialExposure > 100000) riskScore += 25;
    else if (totalFinancialExposure > 50000) riskScore += 15;

    // Voting correlation risk (0-35 points)
    const correlationPercentage = (highCorrelationVotes / conflictAnalysis.votingPatterns.length) * 100;
    if (correlationPercentage > 50) riskScore += 35;
    else if (correlationPercentage > 30) riskScore += 25;
    else if (correlationPercentage > 15) riskScore += 15;

    // Connection strength risk (0-25 points)
    if (strongConnections > 2) riskScore += 25;
    else if (strongConnections > 1) riskScore += 15;
    else if (strongConnections > 0) riskScore += 10;

    return {
      score: riskScore,
      level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      factors: {
        financialExposure: totalFinancialExposure,
        votingCorrelation: correlationPercentage,
        strongConnections
      }
    };
  }, [conflictAnalysis]);

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(node);
  };

  const handleLinkClick = (link: NetworkLink) => {
    setSelectedLink(link);
  };

  const handleExportData = () => {
    const exportData = {
      bill: {
        id: bill.id,
        title: bill.title,
        billNumber: bill.billNumber
      },
      conflictAnalysis,
      riskAssessment,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conflict-analysis-${bill.billNumber}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Risk Assessment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--civic-transparency))' }} />
                Conflict of Interest Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of potential conflicts for {conflictAnalysis.sponsorName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                <Badge 
                  variant={riskAssessment.level === 'high' ? 'destructive' : 
                          riskAssessment.level === 'medium' ? 'secondary' : 'default'}
                  className="text-lg px-3 py-1"
                >
                  {riskAssessment.level.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-2">Overall Risk Level</div>
              <div className="text-xs text-muted-foreground">Score: {riskAssessment.score}/100</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                ${riskAssessment.factors.financialExposure.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Financial Exposure</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {riskAssessment.factors.votingCorrelation.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">High Correlation Votes</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {conflictAnalysis.transparencyScore.overall}
              </div>
              <div className="text-sm text-muted-foreground">Transparency Score</div>
            </div>
          </div>

          {riskAssessment.level === 'high' && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>High Risk Detected:</strong> This analysis indicates significant potential conflicts of interest. 
                Review the detailed analysis below for specific concerns and recommendations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="transparency">Transparency</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="workarounds">Workarounds</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Key Findings</h4>
                    <p className="text-sm text-muted-foreground">
                      {conflictAnalysis.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Financial Interests</div>
                      <div className="text-muted-foreground">
                        {conflictAnalysis.financialInterests.length} disclosed
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Organizations</div>
                      <div className="text-muted-foreground">
                        {conflictAnalysis.organizationalConnections.length} connections
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Voting Records</div>
                      <div className="text-muted-foreground">
                        {conflictAnalysis.votingPatterns.length} analyzed
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Risk Level</div>
                      <div className="text-muted-foreground">
                        {conflictAnalysis.riskLevel}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setActiveTab('network')}
                  >
                    <Network className="h-4 w-4 mr-2" />
                    View Network Visualization
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setActiveTab('financial')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Analyze Financial Exposure
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setActiveTab('transparency')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review Transparency Score
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setActiveTab('patterns')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Examine Voting Patterns
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => setActiveTab('workarounds')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Track Implementation Workarounds
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Node/Link Details */}
          {(selectedNode || selectedLink) && (
            <Card>
              <CardHeader>
                <CardTitle>Selection Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode && (
                  <div>
                    <h4 className="font-medium mb-2">Selected Node: {selectedNode.name}</h4>
                    <div className="text-sm text-muted-foreground">
                      Type: {selectedNode.type} • Size: {selectedNode.size}
                    </div>
                  </div>
                )}
                {selectedLink && (
                  <div>
                    <h4 className="font-medium mb-2">Selected Connection</h4>
                    <div className="text-sm text-muted-foreground">
                      Type: {selectedLink.type} • Strength: {(selectedLink.strength * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm mt-1">{selectedLink.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="network">
          <ConflictNetworkVisualization
            conflictAnalysis={conflictAnalysis}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            width={800}
            height={600}
            interactive={true}
          />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialExposureTracker conflictAnalysis={conflictAnalysis} />
        </TabsContent>

        <TabsContent value="transparency">
          <TransparencyScoring conflictAnalysis={conflictAnalysis} />
        </TabsContent>

        <TabsContent value="patterns">
          <HistoricalPatternAnalysis conflictAnalysis={conflictAnalysis} />
        </TabsContent>

        <TabsContent value="workarounds">
          <ImplementationWorkaroundsTracker conflictAnalysis={conflictAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}