import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  DollarSign, 
  Building, 
  Eye, 
  TrendingUp 
} from 'lucide-react';

interface PrimarySponsorProps {
   billId: string | undefined;
}

interface SponsorData {
  sponsor: {
    id: string;
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
  };
  conflictAnalysis: {
    directConflicts: number;
    indirectConflicts: number;
    totalExposure: number;
    riskScore: number;
    conflictDetails: {
      direct: Array<{
        organization: string;
        role: string;
        type: string;
      }>;
      indirect: Array<{
        organization: string;
        role: string;
        type: string;
      }>;
    };
  };
  billImpact: {
    affectedSections: Array<{
      section: string;
      description: string;
      impact: string;
    }>;
    benefitEstimate: number;
    alignmentScore: number;
    potentialInfluence: string;
  };
  recommendations: string[];
  riskProfile: {
    overall: number;
    level: string;
    factors: {
      financial: string;
      transparency: string;
      affiliations: string;
    };
  };
}

export default function PrimarySponsorAnalysis({ billId }: PrimarySponsorProps) {
  const [sponsor, setSponsor] = useState<SponsorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrimarySponsorData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/bills/${billId}/sponsorship-analysis/primary-sponsor`);

        if (!response.ok) {
          throw new Error(`Failed to fetch primary sponsor data: ${response.status}`);
        }

        const data = await response.json();
        setSponsor(data);
      } catch (err) {
        console.error('Error fetching primary sponsor data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load primary sponsor data');
      } finally {
        setLoading(false);
      }
    };

    if (billId) {
      fetchPrimarySponsorData();
    }
  }, [billId]);

  const getConflictLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
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
    switch (level?.toLowerCase()) {
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

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading primary sponsor analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Primary sponsor analysis not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>›</span>
        <Link to={`/bills/${billId}`} className="hover:text-primary transition-colors">Bills</Link>
        <span>›</span>
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="hover:text-primary transition-colors">Sponsorship Analysis</Link>
        <span>›</span>
        <span className="text-foreground">Primary Sponsor</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Analysis Navigation
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          {sponsor.sponsor.name} - Primary Sponsor Analysis
        </h1>
        <p className="text-muted-foreground">Comprehensive analysis of potential conflicts and transparency measures</p>
      </div>

      {/* Sponsor Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sponsor Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{sponsor.sponsor.name}</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Role:</span> {sponsor.sponsor.role}</p>
                <p><span className="font-medium">Party:</span> {sponsor.sponsor.party}</p>
                <p><span className="font-medium">Constituency:</span> {sponsor.sponsor.constituency}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Risk Level:</span>
                {getRiskIndicator(sponsor.sponsor.conflictLevel)}
                <Badge className={getConflictLevelColor(sponsor.sponsor.conflictLevel)}>
                  {sponsor.sponsor.conflictLevel.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">Financial Exposure:</span>
                <span>${(sponsor.sponsor.financialExposure / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Conflict Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Direct Conflicts:</span>
                <Badge variant="destructive">{sponsor.conflictAnalysis.directConflicts}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Indirect Conflicts:</span>
                <Badge variant="secondary">{sponsor.conflictAnalysis.indirectConflicts}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Risk Score:</span>
                <Badge className={getConflictLevelColor(sponsor.riskProfile.level)}>
                  {sponsor.conflictAnalysis.riskScore}/100
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transparency Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Disclosure Level:</span>
                <Badge variant="outline">{sponsor.sponsor.transparency.disclosure}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Public Statements:</span>
                <span>{sponsor.sponsor.transparency.publicStatements}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Updated:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(sponsor.sponsor.transparency.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliations */}
      {sponsor.sponsor.affiliations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Professional Affiliations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sponsor.sponsor.affiliations.map((affiliation, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{affiliation.organization}</span>
                    <p className="text-sm text-muted-foreground">{affiliation.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{affiliation.type}</Badge>
                    <Badge className={getConflictLevelColor(affiliation.conflictType)}>
                      {affiliation.conflictType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill Impact Analysis */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Bill Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Affected Sections</h4>
              <div className="space-y-2">
                {sponsor.billImpact.affectedSections.map((section, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">Section {section.section}</span>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    <Badge className={`${getImpactColor(section.impact)} border-current`} variant="outline">
                      {section.impact.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Impact Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Benefit Estimate:</span>
                  <span className="font-medium">${sponsor.billImpact.benefitEstimate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alignment Score:</span>
                  <span className="font-medium">{sponsor.billImpact.alignmentScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Potential Influence:</span>
                  <Badge className={getConflictLevelColor(sponsor.billImpact.potentialInfluence)}>
                    {sponsor.billImpact.potentialInfluence.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {sponsor.recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Transparency Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sponsor.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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