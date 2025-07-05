import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Users, 
  Building,
  BookOpen,
  ChevronRight
} from 'lucide-react';

interface OverviewProps {
  billId?: string;
}

interface AnalysisData {
  title: string;
  primarySponsor: {
    name: string;
    conflictLevel: string;
    financialExposure: number;
  };
  coSponsors: Array<{
    conflictLevel: string;
  }>;
  totalFinancialExposure: number;
  industryAlignment: number;
  sections: Array<{
    number: string;
    title: string;
  }>;
}

export default function SponsorshipOverview({ billId }: OverviewProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - replace with actual API call
    setTimeout(() => {
      setAnalysis({
        title: "National Healthcare Reform Act of 2025",
        primarySponsor: {
          name: "Hon. James Mwangi",
          conflictLevel: "high",
          financialExposure: 28700000
        },
        coSponsors: [
          { conflictLevel: "high" },
          { conflictLevel: "high" },
          { conflictLevel: "high" },
          { conflictLevel: "high" },
          { conflictLevel: "medium" },
          { conflictLevel: "medium" },
          { conflictLevel: "medium" },
          { conflictLevel: "medium" },
          { conflictLevel: "medium" },
          { conflictLevel: "medium" },
          { conflictLevel: "low" },
          { conflictLevel: "low" }
        ],
        totalFinancialExposure: 142800000,
        industryAlignment: 68,
        sections: [
          { number: "4-7", title: "Pharmaceutical Pricing" },
          { number: "12-14", title: "Market Access Expansion" },
          { number: "18", title: "Insurance Requirements" }
        ]
      });
      setLoading(false);
    }, 1000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analysis overview...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Analysis overview not available</p>
      </div>
    );
  }

  const highRiskSponsors = analysis.coSponsors.filter(s => s.conflictLevel === 'high').length;
  const mediumRiskSponsors = analysis.coSponsors.filter(s => s.conflictLevel === 'medium').length;
  const lowRiskSponsors = analysis.coSponsors.filter(s => s.conflictLevel === 'low').length;

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
        <span className="text-foreground">Overview</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <Link to={`/bills/${billId}/sponsorship-analysis`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Analysis Navigation
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Bill Analysis at a Glance</h1>
        <p className="text-muted-foreground">Essential insights about the {analysis.title}</p>
      </div>

      {/* Critical Insights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Key Transparency Concerns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="h-8 w-8 text-red-600" />
                  <div>
                    <h4 className="font-semibold">KSh {(analysis.primarySponsor.financialExposure / 1000000).toFixed(1)}M Financial Exposure</h4>
                    <p className="text-sm text-muted-foreground">Primary sponsor has significant investments directly affected by this bill</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h4 className="font-semibold">{highRiskSponsors} High-Risk Co-Sponsors</h4>
                    <p className="text-sm text-muted-foreground">Significant portion of co-sponsors have conflicts of interest</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Building className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-semibold">KSh {(analysis.totalFinancialExposure / 1000000).toFixed(1)}M Industry Backing</h4>
                    <p className="text-sm text-muted-foreground">Substantial financial support from affected industries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">1</div>
              <div className="text-sm text-muted-foreground">Primary Sponsor</div>
              <Badge className={`mt-2 ${getConflictLevelColor(analysis.primarySponsor.conflictLevel)}`}>
                {analysis.primarySponsor.conflictLevel} Risk
              </Badge>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{analysis.coSponsors.length}</div>
              <div className="text-sm text-muted-foreground">Co-Sponsors</div>
              <div className="text-xs mt-2">
                {highRiskSponsors} High, {mediumRiskSponsors} Medium, {lowRiskSponsors} Low Risk
              </div>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{analysis.industryAlignment}%</div>
              <div className="text-sm text-muted-foreground">Industry Funding</div>
              <div className="text-xs mt-2">Healthcare & Related</div>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{analysis.sections.length}</div>
              <div className="text-sm text-muted-foreground">Affected Sections</div>
              <div className="text-xs mt-2">Direct regulatory impact</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reading Path */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Recommended Reading Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" size="sm" disabled>
              1. Overview (Current)
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link to={`/bills/${billId}/sponsorship-analysis/primary-sponsor`}>
              <Button variant="outline" size="sm">
                2. Primary Sponsor
              </Button>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link to={`/bills/${billId}/sponsorship-analysis/co-sponsors`}>
              <Button variant="outline" size="sm">
                3. Co-Sponsors
              </Button>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link to={`/bills/${billId}/sponsorship-analysis/financial-network`}>
              <Button variant="outline" size="sm">
                4. Financial Network
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link to={`/bills/${billId}/sponsorship-analysis`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Navigation
          </Button>
        </Link>
        <Link to={`/bills/${billId}/sponsorship-analysis/primary-sponsor`}>
          <Button>
            Next: Primary Sponsor
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}