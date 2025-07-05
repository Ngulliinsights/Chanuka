import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  DollarSign, 
  AlertTriangle, 
  Building,
  TrendingUp,
  FileText,
  Scale,
  ChevronRight,
  ChevronLeft,
  Target,
  Network,
  Bookmark,
  Clock
} from 'lucide-react';

interface PrimarySponsorProps {
  billId?: string;
}

interface SponsorData {
  name: string;
  role: string;
  party: string;
  constituency: string;
  conflictLevel: string;
  financialExposure: number;
  affiliations: Array<{
    organization: string;
    role: string;
    type: string;
    conflictType: string;
  }>;
  votingAlignment: number;
  transparency: {
    disclosure: string;
    lastUpdated: string;
    publicStatements: number;
  };
}

export default function PrimarySponsorAnalysis({ billId }: PrimarySponsorProps) {
  const [sponsor, setSponsor] = useState<SponsorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrimarySponsorData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/bills/${billId}/sponsorship-analysis/primary-sponsor`);

        if (response.ok) {
          const data = await response.json();
          setSponsor(data.sponsor);
        } else {
          console.error('Failed to fetch primary sponsor data');
          // Fallback to mock data if API fails
          setSponsor({
            name: "Hon. James Mwangi",
            role: "MP - Kiambu County",
            party: "Jubilee Party",
            constituency: "Kiambu County",
            conflictLevel: "high",
            financialExposure: 28700000,
            affiliations: [
              {
                organization: "East African Pharmaceuticals",
                role: "Major Shareholder",
                type: "financial",
                conflictType: "direct"
              },
              {
                organization: "National Healthcare Alliance",
                role: "Board Member",
                type: "governance",
                conflictType: "indirect"
              }
            ],
            votingAlignment: 73,
            transparency: {
              disclosure: "partial",
              lastUpdated: "2024-01-15",
              publicStatements: 3
            }
          });
        }
      } catch (error) {
        console.error('Error fetching primary sponsor data:', error);
        // Fallback to mock data on error
        setSponsor({
          name: "Hon. James Mwangi",
          role: "MP - Kiambu County",
          party: "Jubilee Party",
          constituency: "Kiambu County",
          conflictLevel: "high",
          financialExposure: 28700000,
          affiliations: [],
          votingAlignment: 73,
          transparency: {
            disclosure: "partial",
            lastUpdated: "2024-01-15",
            publicStatements: 3
          }
        });
      } finally {
        setLoading(false);
      }
    };

    if (billId) {
      fetchPrimarySponsorData();
    }
  }, [billId]);

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

  const getRiskIndicator = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading primary sponsor analysis...</p>
        </div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Primary sponsor analysis not available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span>›</span>
        <Link to={`/bills/${billId}`} className="hover:text-primary">Bills</Link>
        <span>›</span>
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="hover:text-primary">Sponsorship Analysis</Link>
        <span>›</span>
        <span className="text-foreground">Primary Sponsor</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Analysis Navigation
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          {sponsor.name} - Primary Sponsor Analysis
        </h1>
        <p className="text-muted-foreground">Comprehensive analysis of potential conflicts and transparency measures</p>
      </div>

      {/* Sponsor Header Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {sponsor.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h3 className="text-xl font-semibold">{sponsor.name}</h3>
              <p className="text-muted-foreground">{sponsor.role} | {sponsor.party}</p>
              <p className="text-sm text-muted-foreground">{sponsor.constituency}</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge className={getConflictLevelColor(sponsor.conflictLevel)}>
                  {getRiskIndicator(sponsor.conflictLevel)}
                  <span className="ml-1">{sponsor.conflictLevel} Conflict Risk</span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Financial Exposure: KSh {(sponsor.financialExposure / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Bookmark className="h-4 w-4 mr-1" />
                Bookmark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtabs Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{sponsor.name} - Primary Sponsor Analysis</CardTitle>
            <div className="flex items-center gap-2">
              <select className="text-sm border rounded px-2 py-1">
                <option value="summary">Summary View</option>
                <option value="detailed" selected>Detailed Analysis</option>
                <option value="comprehensive">Comprehensive Report</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs">Quick Summary</div>
                  <div className="text-xs text-muted-foreground">2 min</div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs">Financial Analysis</div>
                  <div className="text-xs text-muted-foreground">5 min</div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="impact" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs">Bill Impact</div>
                  <div className="text-xs text-muted-foreground">4 min</div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs">Network Analysis</div>
                  <div className="text-xs text-muted-foreground">6 min</div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="accountability" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs">Accountability</div>
                  <div className="text-xs text-muted-foreground">3 min</div>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Quick Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-6 w-6 text-red-600" />
                      <div>
                        <h5 className="font-semibold">KSh {(sponsor.financialExposure / 1000000).toFixed(1)}M Financial Exposure</h5>
                        <p className="text-sm text-muted-foreground">Direct financial interests in companies affected by this bill</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-6 w-6 text-yellow-600" />
                      <div>
                        <h5 className="font-semibold">12 Matching Provisions</h5>
                        <p className="text-sm text-muted-foreground">Bill sections align with industry policy recommendations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                      <div>
                        <h5 className="font-semibold">{sponsor.votingAlignment}% Industry Alignment</h5>
                        <p className="text-sm text-muted-foreground">Historical voting pattern favors industry interests</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Key Conflicts Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <strong>East African Pharmaceuticals (KSh 15.2M)</strong>
                      <p className="text-sm text-muted-foreground">Benefits from Section 4.2 licensing changes</p>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <strong>National Healthcare Alliance (Board Member)</strong>
                      <p className="text-sm text-muted-foreground">Influences Section 7.1 equipment standards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Analysis Tab */}
            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Interest Analysis
                  </CardTitle>
                  <div className="text-right">
                    <span className="text-2xl font-bold">KSh {(sponsor.financialExposure / 1000000).toFixed(1)}M</span>
                    <p className="text-sm text-muted-foreground">Total Exposure</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold">East African Pharmaceuticals</h5>
                          <Badge className="bg-red-100 text-red-800">High Risk</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong>Amount:</strong> KSh 15.2M (53% of total exposure)
                          </div>
                          <div>
                            <strong>Stake:</strong> 12% ownership
                          </div>
                          <div>
                            <strong>Acquired:</strong> January 2023
                          </div>
                          <div className="pt-2 border-t">
                            <strong>Bill Impact:</strong> Sections 4.2, 6.1, 7.3 directly benefit this company
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold">National Healthcare Alliance</h5>
                          <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong>Role:</strong> Board Member (Non-Executive)
                          </div>
                          <div>
                            <strong>Compensation:</strong> KSh 2.4M annually
                          </div>
                          <div>
                            <strong>Appointed:</strong> March 2023
                          </div>
                          <div className="pt-2 border-t">
                            <strong>Bill Impact:</strong> Equipment standards in Section 7.1
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bill Impact Tab */}
            <TabsContent value="impact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Direct Bill Impact Analysis
                  </CardTitle>
                  <div className="text-right">
                    <span className="text-2xl font-bold">12</span>
                    <p className="text-sm text-muted-foreground">Sections Directly Affected</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold">Section 4.2: Healthcare Provider Licensing</h5>
                          <Badge className="bg-red-100 text-red-800">Critical Impact</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Reduces licensing requirements for pharmaceutical distributors
                        </p>
                        <div className="text-sm">
                          <strong>Financial Benefit:</strong> East African Pharmaceuticals saves ~KSh 8.5M annually
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">Direct financial conflict identified</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold">Section 7.1: Medical Equipment Standards</h5>
                          <Badge className="bg-yellow-100 text-yellow-800">High Impact</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Streamlines equipment certification processes
                        </p>
                        <div className="text-sm">
                          <strong>Organizational Benefit:</strong> Aligns with National Healthcare Alliance advocacy
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Network Analysis Tab */}
            <TabsContent value="network" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Organizational Network Analysis
                  </CardTitle>
                  <div className="text-right">
                    <span className="text-2xl font-bold">15</span>
                    <p className="text-sm text-muted-foreground">Key Connections</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Financial Connections</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {sponsor.affiliations.filter(a => a.type === 'financial').map((affiliation, index) => (
                            <div key={index} className="flex items-start justify-between p-3 bg-muted rounded">
                              <div className="flex items-start gap-3">
                                <Building className="h-4 w-4 mt-1" />
                                <div>
                                  <h6 className="font-medium">{affiliation.organization}</h6>
                                  <p className="text-sm text-muted-foreground">{affiliation.role}</p>
                                </div>
                              </div>
                              <Badge className={affiliation.conflictType === 'direct' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                {affiliation.conflictType}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Governance Roles</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {sponsor.affiliations.filter(a => a.type === 'governance').map((affiliation, index) => (
                            <div key={index} className="flex items-start justify-between p-3 bg-muted rounded">
                              <div className="flex items-start gap-3">
                                <Building className="h-4 w-4 mt-1" />
                                <div>
                                  <h6 className="font-medium">{affiliation.organization}</h6>
                                  <p className="text-sm text-muted-foreground">{affiliation.role}</p>
                                </div>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Accountability Tab */}
            <TabsContent value="accountability" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Transparency & Accountability Measures
                  </CardTitle>
                  <div className="text-right">
                    <span className="text-2xl font-bold">6.2/10</span>
                    <p className="text-sm text-muted-foreground">Transparency Score</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Disclosure Status</CardTitle>
                          <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm">Financial interests declared in parliamentary register</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm">Board compensation details not publicly disclosed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm">Voting rationale not provided for conflicted bills</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Recommended Actions</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-800">High Priority</Badge>
                              <span className="font-medium">Recuse from voting on Sections 4.2 and 7.1</span>
                            </div>
                          </div>
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-yellow-100 text-yellow-800">Medium Priority</Badge>
                              <span className="font-medium">Disclose board compensation details</span>
                            </div>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800">Medium Priority</Badge>
                              <span className="font-medium">Establish independent ethics review process</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link to={`/bills/${billId}/sponsorship-analysis/overview`}>
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous: Overview
          </Button>
        </Link>
        <Link to={`/bills/${billId}/sponsorship-analysis/co-sponsors`}>
          <Button>
            Next: Co-Sponsors
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}