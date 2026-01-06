import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  Network,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useBillSponsorshipAnalysis as useSponsorshipAnalysis } from '@client/features/bills';
import { ImplementationWorkarounds } from '@client/features/bills/ui/implementation-workarounds';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

// Define proper TypeScript interfaces for our data structures
// This gives TypeScript complete knowledge of what properties exist and their types
interface Sponsor {
  id: string;
  name: string;
  constituency: string;
  party: string;
  position?: string;
}

interface FinancialBreakdown {
  directInvestments: number;
  indirectHoldings: number;
  familyInterests: number;
}

interface SponsorshipData {
  bill_id: string;
  title: string;
  number: string;
  introduced: string;
  status: string;
  primarySponsor: Sponsor;
  coSponsors: Sponsor[];
  totalFinancialExposure: number;
  industryAlignment: number;
  transparencyScore: number;
  conflictRisk: 'high' | 'medium' | 'low';
  financialBreakdown: FinancialBreakdown;
}

export default function BillSponsorshipAnalysis() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch data with proper typing - cast the unknown type to our defined interface
  // This tells TypeScript exactly what shape the data should have
  const { data: sponsorshipData } = useSponsorshipAnalysis(id || '');
  const apiData = sponsorshipData as SponsorshipData | undefined;

  // Mock data with proper typing for demonstration
  const mockSponsorshipData: SponsorshipData = {
    bill_id: id || '1',
    title: 'Climate Action Framework Bill 2024',
    number: 'Bill No. 15 of 2024',
    introduced: '2024-03-15',
    status: 'Second Reading',
    primarySponsor: {
      id: 'mp-001',
      name: 'Hon. Sarah Wanjiku',
      constituency: 'Nairobi Central',
      party: 'Green Alliance',
      position: 'Chairperson, Environment Committee',
    },
    coSponsors: [
      {
        id: 'mp-002',
        name: 'Hon. James Mwangi',
        constituency: 'Kiambu East',
        party: 'Progressive Party',
      },
      {
        id: 'mp-003',
        name: 'Hon. Mary Achieng',
        constituency: 'Kisumu West',
        party: 'Democratic Union',
      },
    ],
    totalFinancialExposure: 28700000,
    industryAlignment: 73,
    transparencyScore: 85,
    conflictRisk: 'medium',
    financialBreakdown: {
      directInvestments: 15200000,
      indirectHoldings: 8900000,
      familyInterests: 4600000,
    },
  };

  // Use API data if available, otherwise fall back to mock data
  // This ensures we always have properly typed data to work with
  const data: SponsorshipData = apiData || mockSponsorshipData;

  // Helper function to format currency values consistently
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to determine styling based on risk level
  const getConflictRiskColor = (risk: string): string => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Sponsorship & Financial Analysis
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analysis of sponsor financial interests and potential conflicts
          </p>
        </div>
        {id && (
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Bill #{id}
          </Button>
        )}
      </div>

      {/* Bill Overview Card - displays key metrics at a glance */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{data.title}</CardTitle>
              <CardDescription>
                {data.number} • Introduced {data.introduced}
              </CardDescription>
            </div>
            <Badge className={getConflictRiskColor(data.conflictRisk)}>
              {data.conflictRisk.toUpperCase()} CONFLICT RISK
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(data.totalFinancialExposure)}
              </div>
              <div className="text-sm text-gray-600">Total Financial Exposure</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{data.industryAlignment}%</div>
              <div className="text-sm text-gray-600">Industry Alignment</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{data.transparencyScore}%</div>
              <div className="text-sm text-gray-600">Transparency Score</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{data.coSponsors.length + 1}</div>
              <div className="text-sm text-gray-600">Total Sponsors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analysis Tabs - organizes different aspects of the analysis */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="primary">Primary Sponsor</TabsTrigger>
          <TabsTrigger value="cosponsors">Co-Sponsors</TabsTrigger>
          <TabsTrigger value="financial">Financial Network</TabsTrigger>
          <TabsTrigger value="workarounds">Workarounds</TabsTrigger>
        </TabsList>

        {/* Overview Tab - shows financial breakdown and risk assessment */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Breakdown
                </CardTitle>
                <CardDescription>Detailed analysis of financial interests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">Direct Investments</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(data.financialBreakdown.directInvestments)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium">Indirect Holdings</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(data.financialBreakdown.indirectHoldings)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium">Family Interests</span>
                  <span className="font-bold text-yellow-600">
                    {formatCurrency(data.financialBreakdown.familyInterests)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Assessment
                </CardTitle>
                <CardDescription>Potential conflict of interest indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Financial Exposure Level</span>
                    <Badge className="bg-red-100 text-red-800">HIGH</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Industry Alignment</span>
                    <Badge className="bg-orange-100 text-orange-800">MODERATE</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disclosure Completeness</span>
                    <Badge className="bg-green-100 text-green-800">GOOD</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Historical Voting Pattern</span>
                    <Badge className="bg-orange-100 text-orange-800">CONSISTENT</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Primary Sponsor Tab - detailed analysis of the main sponsor */}
        <TabsContent value="primary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Sponsor Analysis</CardTitle>
              <CardDescription>Detailed analysis of the primary bill sponsor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {data.primarySponsor.name}
                    </h3>
                    <p className="text-gray-600">
                      {data.primarySponsor.constituency} • {data.primarySponsor.party}
                    </p>
                    {data.primarySponsor.position && (
                      <p className="text-sm text-gray-500 mt-1">{data.primarySponsor.position}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Voting History
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Financial Interests</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Clean Energy Investments</span>
                        <span className="font-medium">KSh 12.3M</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Environmental Consulting</span>
                        <span className="font-medium">KSh 3.2M</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Green Technology Shares</span>
                        <span className="font-medium">KSh 8.7M</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Committee Positions</h4>
                    <div className="space-y-2">
                      <Badge variant="secondary">Environment Committee (Chair)</Badge>
                      <Badge variant="secondary">Energy Committee (Member)</Badge>
                      <Badge variant="secondary">Climate Change Caucus (Founder)</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Co-Sponsors Tab - displays all co-sponsors with their details */}
        <TabsContent value="cosponsors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Co-Sponsors Analysis</CardTitle>
              <CardDescription>Analysis of co-sponsors and their relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.coSponsors.map((sponsor: Sponsor) => (
                  <div
                    key={sponsor.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{sponsor.name}</h4>
                        <p className="text-sm text-gray-600">
                          {sponsor.constituency} • {sponsor.party}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Environmental Advocate</Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Network Tab - shows corporate connections and lobbying */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Financial Network Analysis
              </CardTitle>
              <CardDescription>
                Mapping of financial connections and influence networks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Interactive Network Visualization
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Explore the complex web of financial relationships, corporate connections, and
                    influence pathways
                  </p>
                  <Button>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Launch Network Viewer
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Key Corporate Connections</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm">GreenTech Industries Ltd</span>
                        <Badge variant="secondary">Board Member</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Renewable Energy Consortium</span>
                        <Badge variant="secondary">Shareholder</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <span className="text-sm">Climate Solutions Fund</span>
                        <Badge variant="secondary">Advisor</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Lobbying Activities</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                        <span className="text-sm">Environmental Lobby Group</span>
                        <Badge variant="secondary">KSh 2.1M</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="text-sm">Clean Energy Alliance</span>
                        <Badge variant="secondary">KSh 1.8M</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workarounds Tab - displays implementation workaround detection */}
        <TabsContent value="workarounds" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Implementation Workaround Detection
            </h2>
            <p className="text-gray-600">
              Analysis of potential workarounds and constitutional bypass mechanisms related to this
              legislation
            </p>
          </div>

          {id && <ImplementationWorkarounds bill_id={id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Wrapper components for different routing scenarios
// These provide isolated views of specific analysis aspects

export const SponsorshipOverviewWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sponsorship Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle>Overview {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>High-level sponsorship analysis summary</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Overview analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const PrimarySponsorWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Primary Sponsor Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Primary Sponsor {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Analysis of the primary bill sponsor</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Primary sponsor analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const CoSponsorsWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Co-Sponsors Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Co-Sponsors {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Analysis of co-sponsors and their relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Co-sponsors analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const FinancialNetworkWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Financial Network Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Financial Network {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Analysis of financial connections and funding</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Financial network analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const MethodologyWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Analysis Methodology</h1>

      <Card>
        <CardHeader>
          <CardTitle>Methodology {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>How the sponsorship analysis is conducted</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Methodology explanation...</p>
        </CardContent>
      </Card>
    </div>
  );
};
