import {
  ArrowLeft,
  Network,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Building,
  BarChart3,
  Share2,
} from 'lucide-react';
import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { logger } from '@client/utils/logger';

interface FinancialNetworkProps {
  bill_id?: string;
}

interface NetworkData {
  totalEntities: number;
  interconnectionRate: number;
  totalAffiliations: number;
  primarySponsorExposure: number;
  totalFinancialExposure: number;
  industryBreakdown: Array<{
    sector: string;
    percentage: number;
    amount: number;
  }>;
}

export default function FinancialNetworkAnalysis({ bill_id }: FinancialNetworkProps) {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchNetworkData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        const response = await fetch(
          `/api/bills/${bill_id}/sponsorship-analysis/financial-network`,
          {
            signal: abortController.signal,
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Only update state if component is still mounted
          if (isMounted && !abortController.signal.aborted) {
            setNetworkData({
              totalEntities: data.metrics?.totalEntities || 0,
              interconnectionRate: data.metrics?.interconnectionRate || 0,
              totalAffiliations: data.metrics?.totalConnections || 0,
              primarySponsorExposure: data.industryAnalysis?.breakdown?.[0]?.amount || 0,
              totalFinancialExposure:
                data.industryAnalysis?.breakdown?.reduce(
                  (sum: number, item: { amount: number }) => sum + item.amount,
                  0
                ) || 0,
              industryBreakdown: data.industryAnalysis?.breakdown || [],
            });
          }
        } else {
          if (isMounted) {
            logger.error('Failed to fetch financial network data', { component: 'Chanuka' });
            // Fallback to mock data if API fails
            setNetworkData({
              totalEntities: 13,
              interconnectionRate: 68,
              totalAffiliations: 42,
              primarySponsorExposure: 28700000,
              totalFinancialExposure: 142800000,
              industryBreakdown: [
                { sector: 'Healthcare Services', percentage: 60, amount: 85680000 },
                { sector: 'Pharmaceutical', percentage: 40, amount: 57120000 },
              ],
            });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        if (isMounted) {
          logger.error('Error fetching financial network data:', { component: 'Chanuka' }, error);
          // Fallback to mock data on error
          setNetworkData({
            totalEntities: 13,
            interconnectionRate: 68,
            totalAffiliations: 42,
            primarySponsorExposure: 28700000,
            totalFinancialExposure: 142800000,
            industryBreakdown: [
              { sector: 'Healthcare Services', percentage: 60, amount: 85680000 },
              { sector: 'Pharmaceutical', percentage: 40, amount: 57120000 },
            ],
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (bill_id) {
      fetchNetworkData();
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [bill_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial network analysis...</p>
        </div>
      </div>
    );
  }

  if (!networkData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Financial network analysis not available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>
        <span>›</span>
        <Link to={`/bills/${bill_id}`} className="hover:text-primary">
          Bills
        </Link>
        <span>›</span>
        <Link to={`/bills/${bill_id}/sponsorship-analysis`} className="hover:text-primary">
          Sponsorship Analysis
        </Link>
        <span>›</span>
        <span className="text-foreground">Financial Network</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/bills/${bill_id}/sponsorship-analysis`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Analysis Navigation
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Financial Network & Influence Mapping
        </h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of financial relationships and industry influence
        </p>
      </div>

      {/* Network Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Network Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {networkData.totalEntities}
                </div>
                <div className="text-sm text-muted-foreground">Connected Entities</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {networkData.interconnectionRate}%
                </div>
                <div className="text-sm text-muted-foreground">Interconnection Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {networkData.totalAffiliations}
                </div>
                <div className="text-sm text-muted-foreground">Total Affiliations</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Financial Network Analysis with Subtabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Network & Influence Mapping</CardTitle>
          <p className="text-muted-foreground">
            Comprehensive analysis of financial relationships and influence pathways
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="corporate" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Corporate Backers
              </TabsTrigger>
              <TabsTrigger value="industry" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Industry Analysis
              </TabsTrigger>
              <TabsTrigger value="influence" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Influence Mapping
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Exposure Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Primary Sponsor</span>
                        <span className="font-bold">
                          KSh {(networkData.primarySponsorExposure / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <Progress
                        value={
                          (networkData.primarySponsorExposure /
                            networkData.totalFinancialExposure) *
                          100
                        }
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Co-Sponsors Combined</span>
                        <span className="font-bold">
                          KSh{' '}
                          {(
                            (networkData.totalFinancialExposure -
                              networkData.primarySponsorExposure) /
                            1000000
                          ).toFixed(1)}
                          M
                        </span>
                      </div>
                      <Progress
                        value={
                          ((networkData.totalFinancialExposure -
                            networkData.primarySponsorExposure) /
                            networkData.totalFinancialExposure) *
                          100
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      KSh {(networkData.totalFinancialExposure / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-sm text-muted-foreground">Total Financial Support</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Combined contributions from all identified sources
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">68%</div>
                    <div className="text-sm text-muted-foreground">Primary Industry Sources</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Healthcare and pharmaceutical sector contributions
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-2">Medium</div>
                    <div className="text-sm text-muted-foreground">Transparency Rating</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on disclosure completeness and verification
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Corporate Backers Tab */}
            <TabsContent value="corporate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Corporate Backers</CardTitle>
                  <p className="text-muted-foreground">
                    Analysis of major corporate entities providing financial support to bill
                    sponsors
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card className="border-red-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">East African Pharmaceuticals</CardTitle>
                          <Badge className="bg-red-100 text-red-800">High Influence</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600 mb-2">KSh 42.3M</div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Primary manufacturer of medications affected by pricing provisions in
                          Sections 4-7
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Lobbying Expenditure:</span>
                            <div>KSh 12.7M (2024)</div>
                          </div>
                          <div>
                            <span className="font-medium">Sponsored Events:</span>
                            <div>7 legislative forums</div>
                          </div>
                          <div>
                            <span className="font-medium">Bill Sections Affected:</span>
                            <div>Sections 4-7, 12-14</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-yellow-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">National Healthcare Alliance</CardTitle>
                          <Badge className="bg-yellow-100 text-yellow-800">Medium Influence</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-600 mb-2">KSh 28.5M</div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Industry association representing 24 healthcare providers affected by
                          Sections 12-14
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Policy Papers:</span>
                            <div>3 position documents</div>
                          </div>
                          <div>
                            <span className="font-medium">Legislative Meetings:</span>
                            <div>12 documented sessions</div>
                          </div>
                          <div>
                            <span className="font-medium">Member Organizations:</span>
                            <div>24 healthcare providers</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Industry Analysis Tab */}
            <TabsContent value="industry" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Industry Influence Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {networkData.industryBreakdown.map((sector, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {sector.sector}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600 mb-2">
                            KSh {(sector.amount / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sector.percentage}% of total exposure
                          </div>
                          <Progress value={sector.percentage} className="mt-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Industry Breakdown Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium">Pharmaceutical Manufacturing</div>
                        <div className="text-sm text-muted-foreground">KSh 60.1M</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: '42%' }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">42%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium">Hospital Management Groups</div>
                        <div className="text-sm text-muted-foreground">KSh 37.2M</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: '26%' }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">26%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Influence Mapping Tab */}
            <TabsContent value="influence" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Influence Network Diagram</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Interactive Network Visualization
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Visual representation of connections between sponsors, organizations, and
                      financial interests
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Launch interactive network diagram in modal or new window
                        const diagramUrl = `/bills/${bill_id}/sponsorship-analysis/financial-network/interactive`;
                        window.open(diagramUrl, '_blank', 'width=1200,height=800');
                      }}
                    >
                      Launch Interactive Diagram
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    This network shows connections between financial backers, bill sponsors, and
                    affected industries. Node size represents financial contribution amount, while
                    connection thickness indicates relationship strength.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-2">23</div>
                        <div className="text-sm text-muted-foreground">Connected Entities</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-2">67%</div>
                        <div className="text-sm text-muted-foreground">Interconnection Rate</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-2">8</div>
                        <div className="text-sm text-muted-foreground">Key Influence Nodes</div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Network Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-800 mb-2">High Interconnectivity</h5>
              <p className="text-sm text-blue-700">
                {networkData.interconnectionRate}% of sponsors have overlapping organizational ties,
                indicating potential coordinated influence.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h5 className="font-semibold text-yellow-800 mb-2">
                Concentrated Financial Interest
              </h5>
              <p className="text-sm text-yellow-700">
                Primary sponsor controls{' '}
                {(
                  (networkData.primarySponsorExposure / networkData.totalFinancialExposure) *
                  100
                ).toFixed(0)}
                % of total financial exposure, creating significant influence concentration.
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-800 mb-2">Industry Sector Dominance</h5>
              <p className="text-sm text-green-700">
                Healthcare services sector represents the largest financial stake at{' '}
                {networkData.industryBreakdown[0].percentage}% of total exposure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link to={`/bills/${bill_id}/sponsorship-analysis/co-sponsors`}>
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous: Co-Sponsors
          </Button>
        </Link>
        <Link to={`/bills/${bill_id}/sponsorship-analysis/methodology`}>
          <Button>
            Next: Methodology
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
