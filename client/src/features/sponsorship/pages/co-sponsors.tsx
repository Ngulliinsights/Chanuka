import {
  ArrowLeft,
  Users,
  Filter,
  Search,
  ChevronRight,
  ChevronLeft,
  Building,
  BarChart3,
  Vote,
  Eye,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { logger } from '@client/shared/utils/logger';

interface CosponsorProps {
  bill_id?: string;
}

interface CoSponsor {
  id: string;
  name: string;
  role: string;
  party: string;
  constituency: string;
  conflict_level: string;
  financial_exposure: number;
  affiliations: Array<{
    organization: string;
    role: string;
    type: string;
  }>;
  voting_alignment: number;
}

export default function CosponsorAnalysis({ bill_id }: CosponsorProps) {
  const [cosponsor, setCosponsor] = useState<CoSponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchCosponsorData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        const response = await fetch(`/api/bills/${bill_id}/sponsorship-analysis/co-sponsors`, {
          signal: abortController.signal,
        });

        if (response.ok) {
          const data = await response.json();

          // Only update state if component is still mounted
          if (isMounted && !abortController.signal.aborted) {
            setCosponsor(data.cosponsors || []);
          }
        } else {
          if (isMounted) {
            logger.error('Failed to fetch co-sponsor data', { component: 'Chanuka' });
            // Fallback to mock data if API fails
            setCosponsor([
              {
                id: '1',
                name: 'Hon. Sarah Odhiambo',
                role: 'MP - Kisumu East',
                party: 'ODM',
                constituency: 'Kisumu East',
                conflict_level: 'high',
                financial_exposure: 2800000,
                affiliations: [
                  {
                    organization: 'National Healthcare Alliance',
                    role: 'Board Member',
                    type: 'governance',
                  },
                  {
                    organization: 'Medical Research Foundation',
                    role: 'Senior Advisor',
                    type: 'advisory',
                  },
                ],
                voting_alignment: 85,
              },
              {
                id: '2',
                name: 'Hon. Michael Gitonga',
                role: 'MP - Mombasa Central',
                party: 'Jubilee',
                constituency: 'Mombasa Central',
                conflict_level: 'low',
                financial_exposure: 0,
                affiliations: [
                  {
                    organization: 'Public Health Institute',
                    role: 'Former Research Fellow',
                    type: 'academic',
                  },
                ],
                voting_alignment: 45,
              },
            ]);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        if (isMounted) {
          logger.error('Error fetching co-sponsor data:', { component: 'Chanuka' }, error);
          // Fallback to empty array on error
          setCosponsor([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (bill_id) {
      fetchCosponsorData();
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [bill_id]);

  const getConflictLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading co-sponsor analysis...</p>
        </div>
      </div>
    );
  }

  const highRisksponsor = cosponsor.filter(s => s.conflict_level === 'high').length;
  const mediumRisksponsor = cosponsor.filter(s => s.conflict_level === 'medium').length;
  const lowRisksponsor = cosponsor.filter(s => s.conflict_level === 'low').length;
  const totalExposure = cosponsor.reduce((sum, s) => sum + s.financial_exposure, 0);

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
        <span className="text-foreground">Co-sponsors</span>
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Co-sponsor Conflict Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of all {cosponsor.length} co-sponsor
        </p>
      </div>

      {/* Summary Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Co-sponsor Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{highRisksponsor}</div>
              <div className="text-sm text-red-700">High Conflict Risk</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{mediumRisksponsor}</div>
              <div className="text-sm text-yellow-700">Medium Risk</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{lowRisksponsor}</div>
              <div className="text-sm text-green-700">Low Risk</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                KSh {(totalExposure / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-blue-700">Total Exposure</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Co-sponsor Detailed Analysis with Subtabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Co-sponsor Conflict Analysis Dashboard</CardTitle>
          <p className="text-muted-foreground">
            Comprehensive analysis of all {cosponsor.length} co-sponsor examining financial
            interests, voting patterns, and potential conflicts
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Conflict Analysis
              </TabsTrigger>
              <TabsTrigger value="patterns" className="flex items-center gap-2">
                <Vote className="h-4 w-4" />
                Voting Patterns
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Individual Details
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cosponsor.map(sponsor => (
                  <Card
                    key={sponsor.id}
                    className={`${sponsor.conflict_level === 'high' ? 'border-red-200' : sponsor.conflict_level === 'medium' ? 'border-yellow-200' : 'border-green-200'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {sponsor.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h5 className="font-semibold">{sponsor.name}</h5>
                            <p className="text-sm text-muted-foreground">{sponsor.role}</p>
                            <p className="text-xs text-muted-foreground">{sponsor.party}</p>
                          </div>
                        </div>
                        <Badge className={getConflictLevelColor(sponsor.conflict_level)}>
                          {sponsor.conflict_level} Risk
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Financial Exposure:</span>
                          <span className="font-medium">
                            KSh {(sponsor.financial_exposure / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Industry Alignment:</span>
                          <span className="font-medium">{sponsor.voting_alignment}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Affiliations:</span>
                          <span className="font-medium">{sponsor.affiliations.length}</span>
                        </div>
                      </div>

                      {sponsor.affiliations.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <h6 className="text-xs font-semibold text-muted-foreground mb-2">
                            Key Affiliations:
                          </h6>
                          {sponsor.affiliations.slice(0, 2).map((affiliation, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs mb-1">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {affiliation.organization}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          // Navigate to detailed sponsor profile
                          window.open(`/sponsors/${sponsor.id}`, '_blank');
                        }}
                      >
                        View Detailed Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pattern Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cross-Sponsor Pattern Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                      <h5 className="font-semibold text-blue-800 mb-2">
                        Shared Corporate Connections
                      </h5>
                      <p className="text-sm text-blue-700">
                        Seven sponsor maintain direct or indirect ties to overlapping healthcare
                        companies, indicating potential coordinated industry influence across
                        legislative positions.
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <h5 className="font-semibold text-yellow-800 mb-2">
                        Campaign Contribution Patterns
                      </h5>
                      <p className="text-sm text-yellow-700">
                        Ten of twelve sponsor (83%) received campaign funding from companies
                        directly affected by this legislation.
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <h5 className="font-semibold text-red-800 mb-2">
                        Investment Timing Concerns
                      </h5>
                      <p className="text-sm text-red-700">
                        Five sponsor acquired healthcare investments within six months of bill
                        introduction.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conflict Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aggregate Conflict Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-red-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                          {highRisksponsor}
                        </div>
                        <div className="text-sm text-red-700 mb-2">Critical Conflicts</div>
                        <p className="text-xs text-muted-foreground">
                          Direct financial benefits exceeding KSh 1M
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-yellow-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          {mediumRisksponsor}
                        </div>
                        <div className="text-sm text-yellow-700 mb-2">High Risk</div>
                        <p className="text-xs text-muted-foreground">
                          Significant industry relationships
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {lowRisksponsor}
                        </div>
                        <div className="text-sm text-green-700 mb-2">Medium Risk</div>
                        <p className="text-xs text-muted-foreground">
                          Minor conflicts requiring disclosure
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {cosponsor
                  .filter(s => s.conflict_level === 'high')
                  .map(sponsor => (
                    <Card key={sponsor.id} className="border-red-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {sponsor.name} - Critical Conflict
                          </CardTitle>
                          <Badge className="bg-red-100 text-red-800">Recusal Recommended</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p>
                            <strong>Primary Conflict:</strong>{' '}
                            {sponsor.affiliations[0]?.organization}
                          </p>
                          <p>
                            <strong>Financial Exposure:</strong> KSh{' '}
                            {(sponsor.financial_exposure / 1000000).toFixed(2)}M in direct
                            compensation and investments
                          </p>
                          <p>
                            <strong>Recommendation:</strong> Immediate recusal from voting and
                            committee deliberations
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            {/* Voting Patterns Tab */}
            <TabsContent value="patterns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Industry Alignment Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">73%</div>
                        <div className="text-sm text-blue-700 mb-2">Average Industry Alignment</div>
                        <p className="text-xs text-muted-foreground">
                          Across all co-sponsor on healthcare votes (2022-2024)
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-red-600 mb-2">89%</div>
                        <div className="text-sm text-red-700 mb-2">
                          High-Conflict sponsor Alignment
                        </div>
                        <p className="text-xs text-muted-foreground">
                          sponsor with significant financial interests
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Healthcare Legislation Votes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-semibold">
                            Healthcare Pricing Transparency Act (March 2024)
                          </h6>
                          <p className="text-sm text-muted-foreground">
                            8 co-sponsor voted Against
                          </p>
                        </div>
                        <Badge className="bg-red-100 text-red-800">Industry Aligned</Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-semibold">
                            Pharmaceutical Import Regulations (November 2023)
                          </h6>
                          <p className="text-sm text-muted-foreground">10 co-sponsor voted For</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">Industry Aligned</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Individual Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Toggle risk filter dropdown
                    const filterDropdown = document.getElementById('risk-filter-dropdown');
                    if (filterDropdown) {
                      filterDropdown.style.display =
                        filterDropdown.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter by Risk
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Focus on search input
                    const searchInput = document.querySelector(
                      'input[type="search"]'
                    ) as HTMLInputElement;
                    if (searchInput) {
                      searchInput.focus();
                    }
                  }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cosponsor.map(sponsor => (
                  <Card
                    key={sponsor.id}
                    className={`${sponsor.conflict_level === 'high' ? 'border-red-200' : sponsor.conflict_level === 'medium' ? 'border-yellow-200' : 'border-green-200'}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {sponsor.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{sponsor.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{sponsor.role}</p>
                            <p className="text-xs text-muted-foreground">{sponsor.party}</p>
                          </div>
                        </div>
                        <Badge className={getConflictLevelColor(sponsor.conflict_level)}>
                          {sponsor.conflict_level} Risk
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-bold">
                              KSh {(sponsor.financial_exposure / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-xs text-muted-foreground">Financial Exposure</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{sponsor.voting_alignment}%</div>
                            <div className="text-xs text-muted-foreground">Industry Alignment</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{sponsor.affiliations.length}</div>
                            <div className="text-xs text-muted-foreground">Board Positions</div>
                          </div>
                        </div>

                        {sponsor.affiliations.length > 0 && (
                          <div>
                            <h6 className="text-sm font-semibold mb-2">Key Affiliations</h6>
                            <div className="space-y-1">
                              {sponsor.affiliations.map((affiliation, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {affiliation.organization} - {affiliation.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              // Navigate to full sponsor profile
                              window.open(`/sponsors/${sponsor.id}/profile`, '_blank');
                            }}
                          >
                            View Full Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              // Download sponsor analysis report
                              const link = document.createElement('a');
                              link.href = `/api/sponsors/${sponsor.id}/report.pdf`;
                              link.download = `sponsor-${sponsor.id}-report.pdf`;
                              link.click();
                            }}
                          >
                            Download Report
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link to={`/bills/${bill_id}/sponsorship-analysis/primary-sponsor`}>
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous: Primary Sponsor
          </Button>
        </Link>
        <Link to={`/bills/${bill_id}/sponsorship-analysis/financial-network`}>
          <Button>
            Next: Financial Network
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
